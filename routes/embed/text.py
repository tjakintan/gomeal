import os

import numpy as np
import torch

from typing import List
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = os.getenv("MODEL_NAME")
MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")

MODEL = SentenceTransformer(
    MODEL_NAME,
    device=MODEL_DEVICE,
)

def generate_embeddings(
    texts: List[str],
    batch_size: int = 32,
) -> np.ndarray:

    return MODEL.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    ).astype(np.float32)