import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import torch
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = os.getenv("MODEL_NAME")
MODEL_DEVICE = os.getenv("MODEL_DEVICE")

MODEL = SentenceTransformer(
    MODEL_NAME,
    device=MODEL_DEVICE if torch.cuda.is_available() else "cpu"
)

def generate_embeddings(texts: List[str], batch_size: int = 32) -> np.ndarray:
    """
    Generate embeddings for a batch of texts using BGE-base-en-v1.5.
    Args:
        texts: List of strings to embed
        batch_size: How many texts per batch
    Returns:
        np.ndarray of shape (len(texts), 768)
    """
    embeddings = MODEL.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True
    )
    return embeddings