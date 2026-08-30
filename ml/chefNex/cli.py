import argparse
import traceback
from pathlib import Path

from chefNex.agents.image import (
    ImageAgent,
)


def _print_boxes(
    boxes,
) -> None:

    print(
        "\nDetected Boxes:"
    )

    if not boxes:

        print(
            "  No boxes detected."
        )

        return

    for item in boxes:

        box = item.get(
            "box",
            [],
        )

        box_text = (
            "["
            + ", ".join(
                f"{float(coord):.1f}"
                for coord in box
            )
            + "]"
        )

        print(
            f"\n  {item.get('id')}. "
            f"{item.get('label')} "
            f"box={box_text}"
        )

        ingredients = item.get(
            "ingredients",
            [],
        )

        if not ingredients:

            print(
                "     Ingredients: none"
            )

            continue

        print(
            "     Ingredients:"
        )

        for ingredient in ingredients:

            name = (
                ingredient.get("name")
                or ingredient.get("raw")
            )

            confidence = float(
                ingredient.get(
                    "confidence",
                    0.0,
                )
            )

            print(
                f"       - {name} "
                f"({confidence:.2%})"
            )


def _print_grounding(
    result,
) -> None:

    print(
        "\nGrounded Boxes:"
    )

    print(
        "\nRaw VLM output:"
    )

    print(
        result.get(
            "raw",
            "",
        )
    )

    labels = result.get(
        "labels",
        [],
    )

    boxes = result.get(
        "boxes",
        [],
    )

    if not boxes:

        print(
            "\n  No grounded boxes detected."
        )

        return

    print(
        "\nBounding boxes:"
    )

    for index, (
        label,
        box,
    ) in enumerate(
        zip(
            labels,
            boxes,
        ),
        start=1,
    ):

        box_text = (
            "["
            + ", ".join(
                f"{float(coord):.1f}"
                for coord in box
            )
            + "]"
        )

        print(
            f"  {index}. "
            f"{label} "
            f"box={box_text}"
        )


def cli() -> None:

    parser = argparse.ArgumentParser(
        description=(
            "ChefNex Image Processing"
        )
    )

    parser.add_argument(
        "image",
        type=Path,
        help=(
            "Path to the image file."
        ),
    )

    parser.add_argument(
        "--ground",
        nargs="+",
        help=(
            "Optional phrases to ground "
            "to bounding boxes."
        ),
    )

    args = parser.parse_args()

    try:

        agent = ImageAgent()

        print(
            f"Processing image: "
            f"{args.image}"
        )

        result = agent.run(
            image_path=args.image,
            phrases=args.ground,
        )

        print(
            "\nRaw VLM output:"
        )

        print(
            result.get(
                "raw",
                "",
            )
        )

        _print_boxes(
            result.get(
                "boxes",
                [],
            )
        )

        grounding = result.get(
            "grounding"
        )

        if grounding:

            _print_grounding(
                grounding
            )

    except Exception as error:

        print(
            f"\nError processing image: "
            f"{type(error).__name__}: "
            f"{error}"
        )

        traceback.print_exc()

        raise SystemExit(
            1
        )


if __name__ == "__main__":
    cli()