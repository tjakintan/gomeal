
from __future__ import annotations

import json
import os
import re
import time
from typing import Any

import torch
from PIL import Image
from transformers import AutoProcessor, Qwen3VLForConditionalGeneration


class IngredientImageDetector:

    MODEL = os.getenv(
        "VLM_MODEL",
        "Qwen/Qwen3-VL-4B-Instruct",
    )

    DEVICE = os.getenv(
        "VLM_MODEL_DEVICE",
        "cuda",   
    )

    MAX_NEW_TOKENS = 500

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
""".strip()

    def __init__(self) -> None:
        print(f"[IngredientDetector] Loading {self.MODEL}...")

        self.device = torch.device(
            self.DEVICE if torch.cuda.is_available() else "cpu"
        )

        self.dtype = (
            torch.float16
            if self.device.type == "cuda"
            else torch.float32
        )

        print(
            f"[IngredientDetector] Device={self.device}, "
            f"dtype={self.dtype}"
        )

        self._load_model()

    def _load_model(self) -> None:
        self.processor = AutoProcessor.from_pretrained(
            self.MODEL,
        )

        self.model = Qwen3VLForConditionalGeneration.from_pretrained(
            self.MODEL,
            torch_dtype=self.dtype,
            low_cpu_mem_usage=True,
        ).to(self.device)

        self.model.eval()

        print("[IngredientDetector] Model loaded.")

    @torch.inference_mode()
    def detect(self, image: Any) -> list[str]:
        print("[IngredientDetector] Analyzing image...")

        if isinstance(image, str):
            with Image.open(image) as source:
                image = source.convert("RGB")
        elif isinstance(image, Image.Image):
            image = image.convert("RGB")
        else:
            raise TypeError(
                "image must be a PIL Image or image file path"
            )

        messages = [
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
                            f"{self.SYSTEM_PROMPT}\n\n"
                            "Identify every distinct visible edible "
                            "food item in this image."
                        ),
                    },
                ],
            }
        ]

        inputs = self.processor.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
        )

        inputs = inputs.to(self.device)

        print("[IngredientDetector] Starting generation...")
        start = time.perf_counter()

        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=self.MAX_NEW_TOKENS,
            do_sample=False,
        )

        # Decode only newly generated tokens, not the prompt.
        generated_ids = output_ids[
            :, inputs["input_ids"].shape[1]:
        ]

        output_text = self.processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]

        elapsed = time.perf_counter() - start

        print(
            f"[IngredientDetector] Generation finished "
            f"in {elapsed:.2f}s"
        )
        print(f"[IngredientDetector] Raw output: {output_text}")

        items = self._parse_items(output_text)

        print(f"[IngredientDetector] Visible items: {items}")

        return items

    def _parse_items(self, output: str) -> list[str]:
        output = re.sub(
            r"<think>.*?</think>",
            "",
            output,
            flags=re.DOTALL,
        ).strip()

        match = re.search(r"\[[\s\S]*?\]", output)

        items: list[object]

        if match is not None:
            try:
                items = json.loads(match.group())
            except json.JSONDecodeError:
                print(
                    "[IngredientDetector] Invalid JSON returned."
                )
                return []
        else:
            # Recover a truncated JSON array where possible.
            start = output.find("[")

            if start == -1:
                print(
                    "[IngredientDetector] Could not find JSON array."
                )
                return []

            items = re.findall(
                r'"([^"]+)"',
                output[start:],
            )

            if not items:
                print(
                    "[IngredientDetector] "
                    "Truncated output unrecoverable."
                )
                return []

            print(
                "[IngredientDetector] "
                "Recovered items from truncated output."
            )

        if not isinstance(items, list):
            return []

        cleaned: list[str] = []
        seen: set[str] = set()

        for item in items:
            if not isinstance(item, str):
                continue

            item = item.strip().lower()

            if not item or item in seen:
                continue

            seen.add(item)
            cleaned.append(item)

        return cleaned
