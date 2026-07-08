import faiss
import numpy as np
from typing import List, Tuple
from brain.core.config.network import Embeddings

def top_k_similar_embeddings_to_neurons(
    embeddings: List[Embeddings],
    k: int,
    index: faiss.IndexFlatIP,
) -> List[Tuple[Embeddings, float]]:
    """
    Top-K selection using FAISS (cosine similarity)
    """

    # Convert user vector to numpy and normalize for cosine similarity
    normalize_embeddings = embeddings.vector.numpy().astype(np.float32).reshape(1, -1)
    faiss.normalize_L2(normalize_embeddings)

    # Search FAISS index
    distances, indices = index.search(normalize_embeddings, k)

    top_k = []
    for i, sim in zip(indices[0], distances[0]):
        embedding = embeddings[i]
        top_k.append((embedding, float(sim)))  # sim is already in [0,1] after normalization

    return top_k