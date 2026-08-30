from __future__ import annotations

import json
import os
import re
import time
from typing import Any

import torch

from transformers import (
    AutoModelForImageTextToText,
    AutoProcessor,
)


class IngredientDetector:

    MODEL = os.getenv(
        "INGREDIENT_DETECTOR_MODEL",
        "Qwen/Qwen2.5-VL-3B-Instruct",
    )

    DEVICE = os.getenv(
        "IMAGE_MODEL_DEVICE",
        (
            "mps"
            if torch.backends.mps.is_available()
            else (
                "cuda"
                if torch.cuda.is_available()
                else "cpu"
            )
        ),
    )

    MAX_NEW_TOKENS = 40

    SYSTEM_PROMPT = """
You analyze food images.

Return every distinct edible food item visibly present.

Rules:
- Only include food actually visible in the image.
- Do not infer hidden ingredients.
- Do not list recipe ingredients used to make another visible food.
- Do not guess.
- If uncertain, use a broader visible food category.
- Do not include duplicates.
- Use short, common food names.
- Return ONLY a valid JSON array of strings.
- Do not explain your answer.

Example:

French fries:
["french fries"]

Do not return:
["potatoes", "vegetable oil", "salt"]

Charcuterie board:
["brie cheese", "grapes", "salami", "crackers"]
""".strip()


    def __init__(
        self,
    ) -> None:

        self.device = torch.device(
            self.DEVICE
        )

        self.dtype = (
            torch.float16
            if self.device.type == "cuda"
            else torch.float32
        )

        print(
            "[IngredientDetector] "
            f"Device: {self.device}"
        )

        print(
            "[IngredientDetector] "
            f"Dtype: {self.dtype}"
        )

        self._load_model()


    def _load_model(
        self,
    ) -> None:

        print(
            "[IngredientDetector] "
            f"Loading {self.MODEL}..."
        )

        self.processor = (
            AutoProcessor.from_pretrained(
                self.MODEL,
            )
        )

        self.model = (
            AutoModelForImageTextToText
            .from_pretrained(
                self.MODEL,
                dtype=self.dtype,
            )
            .to(
                self.device
            )
        )

        self.model.eval()

        print(
            "[IngredientDetector] "
            "Model loaded."
        )


    def detect(
        self,
        image: Any,
    ) -> list[str]:

        print(
            "[IngredientDetector] "
            "Analyzing image..."
        )

        messages = [
            {
                "role": "system",
                "content": (
                    self.SYSTEM_PROMPT
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": image,
                    },
                    {
                        "type": "text",
                        "text": (
                            "Identify every distinct visible "
                            "edible food item in this image."
                        ),
                    },
                ],
            },
        ]

        prompt = (
            self.processor
            .apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        )

        inputs = (
            self.processor(
                text=[
                    prompt
                ],
                images=[
                    image
                ],
                return_tensors="pt",
            )
        )

        inputs = {
            key: (
                value.to(
                    self.device,
                    dtype=self.dtype,
                )
                if (
                    isinstance(
                        value,
                        torch.Tensor,
                    )
                    and value.is_floating_point()
                )
                else value.to(
                    self.device
                )
                if isinstance(
                    value,
                    torch.Tensor,
                )
                else value
            )
            for key, value in inputs.items()
        }

        print(
            "[IngredientDetector] "
            "Starting generation..."
        )

        start = time.perf_counter()

        with torch.inference_mode():

            generated_ids = (
                self.model.generate(
                    **inputs,
                    max_new_tokens=(
                        self.MAX_NEW_TOKENS
                    ),
                    do_sample=False,
                    use_cache=True,
                )
            )

        elapsed = (
            time.perf_counter()
            - start
        )

        print(
            "[IngredientDetector] "
            f"Generation finished in "
            f"{elapsed:.2f}s"
        )

        input_length = (
            inputs[
                "input_ids"
            ].shape[1]
        )

        generated_ids = (
            generated_ids[
                :,
                input_length:
            ]
        )

        output = (
            self.processor
            .batch_decode(
                generated_ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )[0]
            .strip()
        )

        print(
            "[IngredientDetector] "
            f"Raw output: {output}"
        )

        items = (
            self._parse_items(
                output
            )
        )

        print(
            "[IngredientDetector] "
            f"Visible items: {items}"
        )

        return items


    def _parse_items(
        self,
        output: str,
    ) -> list[str]:

        output = (
            re.sub(
                r"<think>.*?</think>",
                "",
                output,
                flags=re.DOTALL,
            )
            .strip()
        )

        match = re.search(
            r"\[[\s\S]*?\]",
            output,
        )

        if match is None:

            print(
                "[IngredientDetector] "
                "Could not find JSON array."
            )

            return []

        try:

            items = json.loads(
                match.group()
            )

        except json.JSONDecodeError:

            print(
                "[IngredientDetector] "
                "Invalid JSON returned."
            )

            return []

        if not isinstance(
            items,
            list,
        ):

            return []

        cleaned: list[str] = []
        seen: set[str] = set()

        for item in items:

            if not isinstance(
                item,
                str,
            ):
                continue

            item = (
                item
                .strip()
                .lower()
            )

            if (
                not item
                or item in seen
            ):
                continue

            seen.add(
                item
            )

            cleaned.append(
                item
            )

        return cleaned