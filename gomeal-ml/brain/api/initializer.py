import json
from brain.core.config.network import Embeddings
from routes.post.get_post_embedding import _get_post_embeddings
from brain.api.subscriber import _set_subscription_brain, _start_thread


def initiation(limit: int = 500) -> list[Embeddings]:

    """
        Load active post embeddings from DB for brain initialization.

        Args:
            user_sub: The current user — excludes their own posts.
            limit:    Max number of posts to load into the brain.

        Returns:
            List of Embeddings ready for neuron creation.
    """

    rows = _get_post_embeddings(limit=limit)

    if not rows:
        raise Exception("no_embeddings_found")

    embeddings = []

    for row in rows:

        embedding = row["embedding"]

        if isinstance(embedding, str):
            embedding = json.loads(embedding)

        embeddings.append(Embeddings(
            id=row["post_id"],
            embedding=embedding,
        ))    

    return embeddings