import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import torch
from brain.core.config.network import Embeddings
from utils.math_utils import compute_normalize_vector_1

# ---------- Contracts ----------
@dataclass(frozen=True)
class PreprocessedVectorEmbedding:
    id: int
    vector: np.ndarray
    dim: int

# ---------- Preprocess One Row Embedding ----------
def preprocess_embedding_to_vector(embedding_df_to_vector: Embeddings) -> PreprocessedVectorEmbedding:
    """
        Convert an embedding into a normalized processed vector.

        Converts the to_embedded_vector List[float] embedding into a float32 torch.Tensor,
        then applies L2 normalization via compute_normalize_vector_1.

        Args:
            embedding_df_to_vectors: A validated embedding matching our pydantic model.

        Returns:
            A frozen pre processed embedding dataclass with the normalized vector.
    """

    to_embedded_vector  = np.array(embedding_df_to_vector.embedding, dtype=np.float32)
    to_normalize_vector = compute_normalize_vector_1(to_embedded_vector)

    return PreprocessedVectorEmbedding (
        id=embedding_df_to_vector.id,
        vector=to_normalize_vector,
        dim=to_normalize_vector.shape[0]
    )