from typing import Dict, Union, Tuple, Optional, Literal
from brain.core.core.event_queue import EventQueue
from brain.core.patterns.pattern_manager import PatternManager
from brain.core.core.synapse import Synapse
from brain.core.core.neuron import Neuron
from brain.core.core.macro_neuron import MacroNeuron, create_macro_neuron
from brain.core.core.super_macro_neuron import SuperMacroNeuron

Node = Union[Neuron, MacroNeuron, SuperMacroNeuron]
NodeType = Literal["neuron", "macro", "super"]


class Brain:


# ---------------------------- Initialize Nodes ----------------------------
    def __init__(self):

        self.neurons_source: Dict[Tuple[str, int], Neuron] = {}
        self.macro_neurons_source: Dict[Tuple[str, int], MacroNeuron] = {}

        self.neurons: Dict[int, Neuron] = {}
        self.macro_neurons: Dict[int, MacroNeuron] = {}
        self.super_macro_neurons: Dict[int, SuperMacroNeuron] = {}

        self.synapses: Dict[str, Synapse] = {}
        self.pattern_manager = PatternManager()
        self.event_queue = EventQueue()

        self.user_recent_recipe_activations: Dict[int, list[int]] = {}
        self.recipe_coactivation_counts: Dict[Tuple[int, int], int] = {}


# -------------------- Canonical model name ----------------------------
    def _canonicalize_model(self, model: str) -> str:
        if model.lower() in ("recipe", "post"):
            return "post"
        return model.lower()


# ---------------------------- Add Nodes ----------------------------
    def add_neuron(self, neuron: Neuron):
        neuron.source_model = self._canonicalize_model(neuron.source_model)
        neuron.brain = self
        self.neurons[neuron.neuron_id] = neuron

        if neuron.source_model and neuron.source_id is not None:
            self.neurons_source[(neuron.source_model, neuron.source_id)] = neuron

    def add_macro_neuron(self, macro: MacroNeuron):
        macro.brain = self
        self.macro_neurons[macro.macro_neuron_id] = macro

        if getattr(macro, "source_model", None) and getattr(macro, "source_id", None) is not None:
            self.macro_neurons_source[(macro.source_model, macro.source_id)] = macro

    def add_super_macro_neuron(self, super_macro: SuperMacroNeuron):
        super_macro.brain = self
        self.super_macro_neurons[super_macro.super_macro_neuron_id] = super_macro


# ---------------------------- Get Node ----------------------------
    def get_node(self, node_type: NodeType, node_id: int) -> Optional[Node]:
        if node_type == "neuron":
            return self.neurons.get(node_id)
        if node_type == "macro":
            return self.macro_neurons.get(node_id)
        if node_type == "super":
            return self.super_macro_neurons.get(node_id)
        return None

    def get_neuron(self, neuron_id: int) -> Optional[Neuron]:
        return self.neurons.get(neuron_id)

    def get_macro_neuron(self, macro_neuron_id: int) -> Optional[MacroNeuron]:
        return self.macro_neurons.get(macro_neuron_id)

    def get_super_macro_neuron(self, super_macro_neuron_id: int) -> Optional[SuperMacroNeuron]:
        return self.super_macro_neurons.get(super_macro_neuron_id)

    def get_neuron_by_source_id(self, source_model: str, source_id: int) -> Optional[Neuron]:
        return self.neurons_source.get((source_model, source_id))

    def get_macro_neuron_by_source_id(self, source_model: str, source_id: int) -> Optional[MacroNeuron]:
        return self.macro_neurons_source.get((source_model, source_id))


# ---------------------------- Resolve Nodes ----------------------------
    def _get_node_(self, node: Node) -> Tuple[NodeType, int]:
        if hasattr(node, "neuron_id"):
            return "neuron", node.neuron_id
        if hasattr(node, "macro_neuron_id"):
            return "macro", node.macro_neuron_id
        if hasattr(node, "super_macro_neuron_id"):
            return "super", node.super_macro_neuron_id
        raise ValueError("Unknown node type passed to Brain.connect")


# ---------------------------- Connect Nodes ----------------------------
    def connect(
        self,
        source: Node,
        target: Node,
        strength: float,
        learning_rate: float,
        abstraction_level_gap: int,
    ):
        source_type, source_id = self._get_node_(source)
        target_type, target_id = self._get_node_(target)

        syn = Synapse(
            source_type=source_type,
            source_id=source_id,
            target_type=target_type,
            target_id=target_id,
            strength=strength,
            learning_rate=learning_rate,
            abstraction_level_gap=abstraction_level_gap,
        )

        self.synapses[syn.id] = syn

        source.out_synapses.append(syn.id)
        target.in_synapses.append(syn.id)

        connection = (target_type, target_id)
        if connection not in source.connections:
            source.connections.append(connection)

        return syn


# ---------------------------- Create Macro Neuron ----------------------------
    def create_macro_neuron_from_user_neuron(
        self,
        neuron_ids: list[int],
        min_count: int = 3,
        strength: float = 1.0,
        learning_rate: float = 0.1,
    ) -> Optional[MacroNeuron]:
        pattern = self.pattern_manager.register_pattern(neuron_ids)

        if pattern.activation_count < min_count:
            return None

        macro_key = pattern.id

        # Reuse existing macro for this repeated pattern.
        for macro in self.macro_neurons.values():
            if set(macro.child_neuron_ids) == set(str(nid) for nid in pattern.neuron_ids):
                macro.strength += 0.1
                return macro

        neurons = [
            self.get_neuron(neuron_id)
            for neuron_id in pattern.neuron_ids
        ]
        neurons = [neuron for neuron in neurons if neuron is not None]

        if len(neurons) < 2:
            return None

        macro = create_macro_neuron(neurons)
        macro.strength = strength

        self.add_macro_neuron(macro)

        for neuron in neurons:
            self.connect(
                source=macro,
                target=neuron,
                strength=strength,
                learning_rate=learning_rate,
                abstraction_level_gap=1,
            )
            self.connect(
                source=neuron,
                target=macro,
                strength=strength,
                learning_rate=learning_rate,
                abstraction_level_gap=1,
            )

        print(
            f"[macro_created] pattern={macro_key} "
            f"macro_id={macro.macro_neuron_id} count={pattern.activation_count}"
        )

        return macro


# -------------------- Record recipe coactivation patterns --------------------
    def create_macro_neuron_from_recipe_neuron(
        self,
        user_neuron: Neuron,
        recipe_neuron: Neuron,
        max_recent: int = 10,
        min_count: int = 3,
        max_coactivation_count: int = 50,
        strength: float = 1.0,
        learning_rate: float = 0.1,
    ):
        """
        Track recipe-recipe co-occurrence across users and promote strong pairs
        into macro neurons.

        Args:
            max_coactivation_count: Hard cap on any pair's count to prevent
                score inflation from a single dominant pair (invariant).
        """
        user_id = user_neuron.neuron_id
        recipe_id = recipe_neuron.neuron_id

        recent = self.user_recent_recipe_activations.setdefault(user_id, [])

        for recent_recipe_id in recent:
            if recent_recipe_id == recipe_id:
                continue

            pair = tuple(sorted([recent_recipe_id, recipe_id]))

            # Invariant: cap coactivation count to prevent unbounded score inflation.
            current = self.recipe_coactivation_counts.get(pair, 0)
            if current < max_coactivation_count:
                count = current + 1
                self.recipe_coactivation_counts[pair] = count
            else:
                count = current

            if count >= min_count:
                self.create_macro_neuron_from_user_neuron(
                    neuron_ids=list(pair),
                    min_count=1,
                    strength=strength,
                    learning_rate=learning_rate,
                )

        # Invariant: deduplicate so a dominant category can't fill the whole window
        seen_ids = set()
        deduped = []
        for rid in reversed(recent):
            if rid not in seen_ids:
                seen_ids.add(rid)
                deduped.append(rid)
        self.user_recent_recipe_activations[user_id] = list(reversed(deduped))[-max_recent:]


# ---------------------------- Score ----------------------------
    def _get_score(
        self,
        user_neuron,
        post_id: int,
        config,
    ) -> float:
        if user_neuron is None:
            return 0.0

        # Single lookup — add_neuron canonicalizes all post models to "post".
        candidate_neuron = self.get_neuron_by_source_id("post", post_id)

        if candidate_neuron is None:
            return 0.0

        viewer_recent_recipe_ids = self.user_recent_recipe_activations.get(
            user_neuron.neuron_id, []
        )

        collaborative_strength = 0

        for recent_recipe_id in viewer_recent_recipe_ids:
            if recent_recipe_id == candidate_neuron.neuron_id:
                continue

            pair = tuple(sorted([recent_recipe_id, candidate_neuron.neuron_id]))
            collaborative_strength += self.recipe_coactivation_counts.get(pair, 0)

        if collaborative_strength < config.multi_user_min_coactivation:
            return 0.0

        raw = collaborative_strength * config.multi_user_boost

        # Invariant: ceiling so no post can dominate via coactivation alone
        return min(raw, getattr(config, "multi_user_max_boost"))


# --------------------------- Decay --------------------------
    def decay_coactivation_counts(self, decay_factor: float = 0.95):
        """
        Invariant: decay all pair counts each refresh cycle so stale coactivations
        lose influence and new signals can emerge. Prunes pairs that fall below 1.
        """
        for pair in list(self.recipe_coactivation_counts.keys()):
            new_val = self.recipe_coactivation_counts[pair] * decay_factor
            if new_val < 1.0:
                del self.recipe_coactivation_counts[pair]
            else:
                self.recipe_coactivation_counts[pair] = new_val