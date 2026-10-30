import os

import numpy as np
import torch

from typing import List
from PIL import Image as PILImage
from transformers import CLIPModel, CLIPProcessor
from dotenv import load_dotenv


load_dotenv()


IMAGE_MODEL_NAME = os.getenv("CLIP_MODEL")


IMAGE_DTYPE = (
    torch.float16
    if (
        torch.backends.mps.is_available()
        or torch.cuda.is_available()
    )
    else torch.float32
)


IMAGE_DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)


IMAGE_MODEL = (
    CLIPModel
    .from_pretrained(
        IMAGE_MODEL_NAME,
        dtype=IMAGE_DTYPE,
    )
    .to(IMAGE_DEVICE)
)

IMAGE_MODEL.eval()


IMAGE_PROCESSOR = CLIPProcessor.from_pretrained(
    IMAGE_MODEL_NAME
)


def generate_image_embeddings(
    images: List[PILImage.Image],
) -> np.ndarray:

    if not images:
        return np.empty(
            (0, 768),
            dtype=np.float32,
        )

    inputs = IMAGE_PROCESSOR(
        images=images,
        return_tensors="pt",
    )

    pixel_values = (
        inputs["pixel_values"]
        .to(
            device=IMAGE_DEVICE,
            dtype=IMAGE_DTYPE,
        )
    )

    with torch.inference_mode():

        output = IMAGE_MODEL.get_image_features(
            pixel_values=pixel_values
        )

    embeddings = (
        output.pooler_output
        if hasattr(output, "pooler_output")
        else output
    )

    embeddings = (
        embeddings /
        embeddings.norm(
            p=2,
            dim=-1,
            keepdim=True,
        )
    )

    return (
        embeddings
        .float()
        .cpu()
        .numpy()
        .astype(np.float32)
    )