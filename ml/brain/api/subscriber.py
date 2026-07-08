import json
import time
import threading
import numpy as np
from services.redis import r

from brain.debugger import Debugger
from brain.core.config.config import _load_network_config
from brain.utils.math_utils import compute_normalize_vector_1, compute_neuron_strength
from brain.core.core.neuron import EMBEDDING_DIM, create_neuron, NeuronType

from routes.user.types import SEEN_POST_ACTIONS
from routes.user.save_user_embedding import _save_user_embedding
from routes.user.get_user_embedding import _get_user_embedding

from routes.post.post_utils import _mark_post_seen
from routes.post.get_post_embedding import _get_post_embedding_by_id

_brain = None


def _set_subscription_brain(brain):
    """
        Attach the shared brain instance used by the subscriber.

        The server boots the brain once and injects it here so user action events
        can create neurons, connect user/post activity, and reinforce synapses
        against the same in-memory network used by ranking.

        Args:
            brain: The in-memory brain/network instance.
    """

    global _brain
    _brain = brain


_thread_lock = threading.Lock()


def _handle_activation(event: dict):

    """
        React to a user action published from Node.js.

        The subscriber turns an action event into three updates:
        1. mark post-level actions as seen in Redis,
        2. create or reinforce the user -> recipe neuron connection,
        3. update the user's taste vector in Redis and Postgres.

        Args:
            event (dict): User action payload containing user_sub, action_type,
                target_id, and action_weight.
    """

# ----------- load config ------------------
    config = _load_network_config()

    if _brain is None:
        print("subscriber_brain_missing")
        return

    user_sub  = event["user_sub"]
    action    = event["action_type"]
    target_id = int(event["target_id"])
    weight    = float(event["action_weight"])


# ------------- Mark post actions as seen -------------
    if action in SEEN_POST_ACTIONS:
        _mark_post_seen(
            user_sub=user_sub,
            post_id=target_id,
            config=config,
        )


# ------------ Initialize strength -------------
    neuron_strength = compute_neuron_strength(
        engagement_score=weight,
        last_interaction_timestamp=time.time(),
        reinforcement=0.0,
        recency_decay=getattr(config, "decay_rate"),
        w_recency=1.0,
        w_reinforcement=0.0,
    )

    with _thread_lock:


# ------------ User Neuron ------------
        user_neuron = _brain.get_neuron_by_source_id("user", int(user_sub))

        if user_neuron is None:
            print(f"missing_user_neuron_{user_sub}_creating")

            user_embedding = _get_user_embedding(user_sub=user_sub)

            if user_embedding is not None:
                if isinstance(user_embedding, str):
                    user_embedding = json.loads(user_embedding)
                user_vec = user_embedding
            else:
                user_vec = [0.0] * EMBEDDING_DIM  # cold start

            user_neuron = create_neuron(
                neuron_type=NeuronType.user,
                source_model="user",
                source_id=int(user_sub),
                vector=user_vec,
            )
            _brain.add_neuron(user_neuron)


# ------------ Recipe Neuron ------------
        # add_neuron canonicalizes "Recipe" -> "post", so look up with "post".
        recipe_neuron = _brain.get_neuron_by_source_id("post", target_id)

        if recipe_neuron is not None:
            embedding = recipe_neuron.vector
        else:
            print(f"missing_neuron_for_post_{target_id}_fetching_embedding")
            row = _get_post_embedding_by_id(target_id)

            if row is None:
                print(f"missing_embedding_for_post_{target_id}")
                return

            embedding = row["embedding"]

            if embedding is None:
                print(f"null_embedding_for_post_{target_id}")
                return

            if isinstance(embedding, str):
                embedding = json.loads(embedding)

            recipe_neuron = create_neuron(
                neuron_type=NeuronType.recipe,
                source_model="Recipe",   # add_neuron will canonicalize to "post"
                source_id=target_id,
                vector=embedding,
            )
            _brain.add_neuron(recipe_neuron)


# ------------ Connect user_neuron => recipe_neuron ------------
        connection = ("neuron", recipe_neuron.neuron_id)
        if connection not in user_neuron.connections:
            syn = _brain.connect(
                source=user_neuron,
                target=recipe_neuron,
                strength=neuron_strength,
                learning_rate=getattr(config, "learning_rate"),
                abstraction_level_gap=0,
            )


# ------------ Register user pattern then create Macro ------------
        _user_macro_neuron = _brain.create_macro_neuron_from_user_neuron(
            neuron_ids=[
                user_neuron.neuron_id,
                recipe_neuron.neuron_id,
            ],
            min_count=getattr(config, "macro_pattern_min_count"),
            strength=neuron_strength,
            learning_rate=getattr(config, "learning_rate"),
        )


# ------------ Recipe Coactivation Learning ------------
        _recipe_macro_neuron = _brain.create_macro_neuron_from_recipe_neuron(
            user_neuron=user_neuron,
            recipe_neuron=recipe_neuron,
            max_recent=getattr(config, "multi_user_recent_window"),
            min_count=getattr(config, "multi_user_min_coactivation"),
            max_coactivation_count=getattr(config, "max_coactivation_count"),
            strength=neuron_strength,
            learning_rate=getattr(config, "learning_rate"),
        )


# ------------ Fire Event on user_neuron ------------
        _brain.event_queue.add_event(
            neuron_id=user_neuron.neuron_id,
            activation=weight,
            metadata={
                "user_sub": user_sub,
                "action_type": action,
                "target_id": target_id,
            }
        )
        _brain.event_queue.process(_brain)


# ------------ Debugger ------------
        Debugger.neuron(user_neuron, showSynapses=True)
        Debugger.neuron(recipe_neuron, showSynapses=True)

        if _user_macro_neuron is not None:
            Debugger.macro_neuron(_user_macro_neuron, showPatterns=True)

        if _recipe_macro_neuron is not None:
            Debugger.macro_neuron(_recipe_macro_neuron, showPatterns=True)


# ------------ Hebbian Reinforcement ------------
        syn = None
        for syn_id in user_neuron.out_synapses:
            syn = _brain.synapses.get(syn_id)
            if syn and syn.target_type == "neuron" and syn.target_id == recipe_neuron.neuron_id:
                syn.update_strength(
                    source_activation=neuron_strength,
                    target_activation=recipe_neuron.activation,
                )
                break

        if syn is not None:
            Debugger.synapse(syn, brain=_brain, source_activation=neuron_strength)


# ------------ Update cached user taste vector ------------
        embedding = np.array(recipe_neuron.vector, dtype="float32")
        embedding = compute_normalize_vector_1(embedding)

        raw_key = f"user_vec_{user_sub}"
        existing = r.get(raw_key)

        if existing:
            user_vec_raw = np.array(json.loads(existing), dtype="float32")
        else:
            user_vec_raw = np.zeros(len(embedding), dtype="float32")

        user_vec_raw += embedding * neuron_strength * getattr(config, "learning_rate")

        if np.linalg.norm(user_vec_raw) > 0:
            user_vec_raw = compute_normalize_vector_1(user_vec_raw)

        # Use seen_post_ttl_seconds — this is how long taste context stays warm.
        r.set(raw_key, json.dumps(user_vec_raw.tolist()), ex=getattr(config, "seen_post_ttl_seconds"))


# ------------ Update Postgres user embedding ------------
        _save_user_embedding(
            user_sub=user_sub,
            embedding=user_vec_raw,
        )


def _listen():

    """
        Listen for user action events on the Redis pub/sub channel.

        Node.js publishes serialized action payloads to `user_actions`. This
        loop decodes each message and forwards it into `_handle_activation`.
        The loop is intended to run inside a daemon thread.
    """

    pubsub = r.pubsub()
    pubsub.subscribe("user_actions")

    print("[listening] => _on_user_actions...")

    for message in pubsub.listen():

        if message["type"] != "message":
            continue

        try:
            event = json.loads(message["data"])
            _handle_activation(event)

        except Exception as e:
            print(f"subscriber_error_{e}")


def _start_thread():

    """
        Start the Redis subscription listener in a background daemon thread.

        The daemon thread keeps the ML service responsive while action events
        are processed asynchronously from the `user_actions` pub/sub channel.
    """

    thread = threading.Thread(target=_listen, daemon=True)
    thread.start()