from __future__ import annotations

import os
import time
from typing import Any

import torch

from transformers import (
    Owlv2ForObjectDetection,
    Owlv2Processor,
)


class BoxDetector:

    MODEL = os.getenv(
        "OWL_MODEL",
        "google/owlv2-base-patch16-ensemble",
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

    SCORE_THRESHOLD = 0.15
    NMS_IOU_THRESHOLD = 0.40


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
            "[BoxDetector] "
            f"Device: {self.device}"
        )

        print(
            "[BoxDetector] "
            f"Dtype: {self.dtype}"
        )

        self._load_model()


    def _load_model(
        self,
    ) -> None:

        print(
            "[BoxDetector] "
            f"Loading {self.MODEL}..."
        )

        start = time.perf_counter()

        self.processor = (
            Owlv2Processor.from_pretrained(
                self.MODEL,
            )
        )

        self.model = (
            Owlv2ForObjectDetection
            .from_pretrained(
                self.MODEL,
                dtype=self.dtype,
            )
            .to(
                self.device
            )
        )

        self.model.eval()

        elapsed = (
            time.perf_counter()
            - start
        )

        print(
            "[BoxDetector] "
            f"Model loaded in "
            f"{elapsed:.2f}s."
        )


    def ground(
        self,
        image: Any,
        candidates: str | list[str],
    ) -> dict[str, Any]:

        total_start = time.perf_counter()

        queries = (
            self._normalize_queries(
                candidates
            )
        )

        if not queries:

            return {
                "labels": [],
                "boxes": [],
                "scores": [],
            }

        print(
            "[BoxDetector] "
            f"Grounding {len(queries)} candidates..."
        )

        preprocess_start = time.perf_counter()

        inputs = self.processor(
            text=[
                queries
            ],
            images=image,
            return_tensors="pt",
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

        preprocess_elapsed = (
            time.perf_counter()
            - preprocess_start
        )

        print(
            "[BoxDetector] "
            f"Preprocessing finished in "
            f"{preprocess_elapsed:.2f}s."
        )

        print(
            "[BoxDetector] "
            "Starting model inference..."
        )

        inference_start = time.perf_counter()

        with torch.inference_mode():

            outputs = (
                self.model(
                    **inputs
                )
            )

        inference_elapsed = (
            time.perf_counter()
            - inference_start
        )

        print(
            "[BoxDetector] "
            f"Inference finished in "
            f"{inference_elapsed:.2f}s."
        )

        postprocess_start = time.perf_counter()

        target_sizes = torch.tensor(
            [
                (
                    image.height,
                    image.width,
                )
            ],
            device=self.device,
        )

        results = (
            self.processor
            .post_process_grounded_object_detection(
                outputs=outputs,
                target_sizes=target_sizes,
                threshold=self.SCORE_THRESHOLD,
            )[0]
        )

        label_indexes = (
            results[
                "labels"
            ]
            .detach()
            .cpu()
            .tolist()
        )

        labels = [
            queries[index]
            for index in label_indexes
        ]

        boxes = (
            results[
                "boxes"
            ]
            .detach()
            .cpu()
            .tolist()
        )

        scores = (
            results[
                "scores"
            ]
            .detach()
            .cpu()
            .tolist()
        )

        (
            labels,
            boxes,
            scores,
        ) = self._non_max_suppress(
            labels,
            boxes,
            scores,
        )

        postprocess_elapsed = (
            time.perf_counter()
            - postprocess_start
        )

        total_elapsed = (
            time.perf_counter()
            - total_start
        )

        print(
            "[BoxDetector] "
            f"Post-processing finished in "
            f"{postprocess_elapsed:.2f}s."
        )

        print(
            "[BoxDetector] "
            f"Found {len(labels)} detections."
        )

        print(
            "[BoxDetector] "
            f"Total grounding time: "
            f"{total_elapsed:.2f}s."
        )

        return {
            "labels": labels,
            "boxes": boxes,
            "scores": scores,
        }


    @staticmethod
    def _normalize_queries(
        candidates: str | list[str],
    ) -> list[str]:

        if isinstance(
            candidates,
            str,
        ):
            candidates = [
                candidates
            ]

        queries: list[str] = []
        seen: set[str] = set()

        for candidate in candidates:

            if not isinstance(
                candidate,
                str,
            ):
                continue

            candidate = (
                candidate
                .strip()
                .lower()
            )

            if (
                not candidate
                or candidate in seen
            ):
                continue

            seen.add(
                candidate
            )

            queries.append(
                candidate
            )

        return queries


    def _non_max_suppress(
        self,
        labels: list[str],
        boxes: list[list[float]],
        scores: list[float],
    ) -> tuple[
        list[str],
        list[list[float]],
        list[float],
    ]:

        by_label: dict[
            str,
            list[
                tuple[
                    list[float],
                    float,
                ]
            ],
        ] = {}

        for (
            label,
            box,
            score,
        ) in zip(
            labels,
            boxes,
            scores,
        ):

            by_label.setdefault(
                label,
                [],
            ).append(
                (
                    box,
                    score,
                )
            )

        final_labels: list[str] = []
        final_boxes: list[list[float]] = []
        final_scores: list[float] = []

        for (
            label,
            detections,
        ) in by_label.items():

            detections.sort(
                key=lambda item: item[1],
                reverse=True,
            )

            kept: list[
                tuple[
                    list[float],
                    float,
                ]
            ] = []

            for (
                box,
                score,
            ) in detections:

                overlaps = any(
                    self._iou(
                        box,
                        existing_box,
                    )
                    > self.NMS_IOU_THRESHOLD
                    for (
                        existing_box,
                        _,
                    ) in kept
                )

                if overlaps:

                    continue

                kept.append(
                    (
                        box,
                        score,
                    )
                )

            for (
                box,
                score,
            ) in kept:

                final_labels.append(
                    label
                )

                final_boxes.append(
                    box
                )

                final_scores.append(
                    score
                )

        return (
            final_labels,
            final_boxes,
            final_scores,
        )


    @staticmethod
    def _box_area(
        box: list[float],
    ) -> float:

        x1, y1, x2, y2 = box

        return (
            max(
                0.0,
                x2 - x1,
            )
            *
            max(
                0.0,
                y2 - y1,
            )
        )


    @classmethod
    def _iou(
        cls,
        box_a: list[float],
        box_b: list[float],
    ) -> float:

        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b

        inter_x1 = max(
            ax1,
            bx1,
        )

        inter_y1 = max(
            ay1,
            by1,
        )

        inter_x2 = min(
            ax2,
            bx2,
        )

        inter_y2 = min(
            ay2,
            by2,
        )

        inter_width = max(
            0.0,
            inter_x2 - inter_x1,
        )

        inter_height = max(
            0.0,
            inter_y2 - inter_y1,
        )

        intersection = (
            inter_width
            * inter_height
        )

        if intersection <= 0.0:

            return 0.0

        union = (
            cls._box_area(
                box_a
            )
            +
            cls._box_area(
                box_b
            )
            -
            intersection
        )

        if union <= 0.0:

            return 0.0

        return (
            intersection
            / union
        )