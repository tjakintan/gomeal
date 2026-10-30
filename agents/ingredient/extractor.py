from __future__ import annotations

import os
import threading
import time
from collections import OrderedDict
from typing import Any

import numpy as np

from routes.embed.text import (
    generate_embeddings,
)

from routes.ingredient import (
    _find_ingredient_candidates,
    _get_ingredients,
)


class _TTLCache:
    """
    Small thread-safe LRU cache with a time-to-live.

    A TTL of 0 (or less) disables caching entirely.
    """

    def __init__(self, maxsize: int, ttl: float) -> None:
        self._maxsize = maxsize
        self._ttl = ttl
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> tuple[bool, Any]:
        """Returns (hit, value). A cached None is still a hit."""

        if self._ttl <= 0:
            return False, None

        now = time.monotonic()

        with self._lock:
            entry = self._data.get(key)

            if entry is None:
                return False, None

            expires_at, value = entry

            if expires_at < now:
                del self._data[key]
                return False, None

            self._data.move_to_end(key)
            return True, value

    def set(self, key: str, value: Any) -> None:
        if self._ttl <= 0:
            return

        with self._lock:
            self._data[key] = (time.monotonic() + self._ttl, value)
            self._data.move_to_end(key)

            while len(self._data) > self._maxsize:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


class IngredientExtractor:

    # Not used inside this class; kept for any caller that reads it.
    MIN_CONFIDENCE = 0.90

    # Non-exact matches below this are sent back to the model
    # for component expansion.
    EXPAND_CONFIDENCE = 0.85

    # Components returned by the model must meet this
    # confidence before being accepted into the result.
    COMPONENT_MIN_CONFIDENCE = 0.79

    CANDIDATE_LIMIT = 1

    # Candidate lookups (embedding + DB query) are cached per item.
    # The TTL bounds how stale DB fields like `price` can get.
    # Set INGREDIENT_CACHE_TTL=0 to disable caching.
    CACHE_TTL_SECONDS = float(os.getenv("INGREDIENT_CACHE_TTL", "300"))
    CACHE_SIZE = 4096

    def __init__(
        self,
    ) -> None:

        self._candidate_cache = _TTLCache(
            self.CACHE_SIZE,
            self.CACHE_TTL_SECONDS,
        )

        self._ingredient_names: set[str] = set()

        for name in _get_ingredients():

            if not isinstance(name, str):
                continue

            normalized = self._normalize(name)

            if not normalized:
                continue

            self._ingredient_names.add(normalized)
            self._ingredient_names |= self._forms(normalized)
            self._ingredient_names.add(self._pluralize(normalized))

    def clear_cache(self) -> None:
        """Call after ingredients are added/edited in the DB."""

        self._candidate_cache.clear()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(
        self,
        item: str,
        min_confidence: float | None = None,
    ) -> dict[str, Any]:

        item = self._normalize(item)

        if min_confidence is None:
            min_confidence = self.EXPAND_CONFIDENCE

        if not item:
            return {
                "match": None,
                "should_expand": False,
            }

        print(f"[IngredientExtractor] Finding candidate for: {item}")

        resolved = self._resolve_candidates([item])

        # Embedding generation failed.
        if item not in resolved:
            return {
                "match": None,
                "should_expand": False,
            }

        candidate = resolved[item]

        if candidate is None:
            print("[IngredientExtractor] No DB candidate found")

            return {
                "match": None,
                "should_expand": True,
            }

        confidence, candidate_name, exact_match = self._score(
            item,
            candidate,
        )

        # ---------------------------------------------------------
        # Expansion policy
        #
        # EXACT MATCH (including singular/plural forms)
        #     Always trust the DB.
        #     Never expand.
        #
        # STRONG SEMANTIC MATCH
        #     >= min_confidence (default 85%)
        #     Trust the DB.
        #     Never expand.
        #
        # WEAK SEMANTIC MATCH
        #     < min_confidence
        #     should_expand is True: ask the model to expand the item
        #     into components instead of trusting this DB candidate.
        #
        # NOTE: `match` is returned even when should_expand is True
        # (an older comment here claimed it was None; the code never
        # did that). Callers must check should_expand before using
        # `match` as the item's label. `weak_match` is the same
        # candidate, kept for logging.
        # ---------------------------------------------------------

        should_expand = (
            not exact_match
            and confidence < min_confidence
        )

        print(
            f"[IngredientExtractor] Candidate: {candidate_name} | "
            f"exact={exact_match} | "
            f"confidence={confidence:.2%} | "
            f"threshold={min_confidence:.2%} | "
            f"expand={should_expand}"
        )

        return {
            "match": self._build_match(
                item,
                candidate,
                confidence,
                exact_match,
            ),
            "should_expand": should_expand,
            "weak_match": self._build_match(
                item,
                candidate,
                confidence,
                exact_match,
            ),
        }

    def extract_components(
        self,
        items: list[str],
    ) -> dict[str, dict[str, Any]]:

        normalized_items = self._deduplicate(items)

        if not normalized_items:
            return {}

        print(
            f"[IngredientExtractor] "
            f"Batch resolving {len(normalized_items)} components"
        )

        resolved = self._resolve_candidates(normalized_items)

        results: dict[str, dict[str, Any]] = {}

        for item in normalized_items:

            # Embedding generation failed, or no DB candidate.
            candidate = resolved.get(item)

            if candidate is None:
                results[item] = {
                    "match": None,
                    "should_expand": False,
                }

                continue

            confidence, _, exact_match = self._score(
                item,
                candidate,
            )

            best_match = None

            if (
                exact_match
                or confidence >= self.COMPONENT_MIN_CONFIDENCE
            ):
                best_match = self._build_match(
                    item,
                    candidate,
                    confidence,
                    exact_match,
                )

            results[item] = {
                "match": best_match,
                "should_expand": False,
            }

        return results

    # ------------------------------------------------------------------
    # Lookup / scoring
    # ------------------------------------------------------------------

    def _resolve_candidates(
        self,
        items: list[str],
    ) -> dict[str, dict[str, Any] | None]:
        """
        Resolve each (already normalized) item to its top DB candidate.

        Cached items skip both the embedding and the DB query. All
        cache misses are embedded together in a single batch.

        Returns {item: candidate or None}. Items whose embedding could
        not be generated are omitted from the result.
        """

        resolved: dict[str, dict[str, Any] | None] = {}
        misses: list[str] = []

        for item in items:
            hit, candidate = self._candidate_cache.get(item)

            if hit:
                resolved[item] = candidate
            else:
                misses.append(item)

        if not misses:
            return resolved

        embeddings = generate_embeddings(misses)

        if (
            embeddings is None
            or len(embeddings) != len(misses)
        ):
            return resolved

        for item, embedding in zip(misses, embeddings):

            candidates = _find_ingredient_candidates(
                embedding=np.asarray(
                    embedding,
                    dtype=np.float32,
                ),
                limit=self.CANDIDATE_LIMIT,
            )

            candidate = candidates[0] if candidates else None

            self._candidate_cache.set(item, candidate)
            resolved[item] = candidate

        return resolved

    def _score(
        self,
        item: str,
        candidate: dict[str, Any],
    ) -> tuple[float, str, bool]:
        """Returns (confidence, normalized candidate name, exact_match)."""

        confidence = float(candidate.get("similarity", 0.0))

        candidate_name = self._normalize(
            str(candidate.get("name", ""))
        )

        exact_match = (
            item == candidate_name
            or bool(
                self._forms(item)
                & self._forms(candidate_name)
            )
        )

        return confidence, candidate_name, exact_match

    @staticmethod
    def _build_match(
        item: str,
        candidate: dict[str, Any],
        confidence: float,
        exact_match: bool,
    ) -> dict[str, Any]:

        return {
            "raw": item,
            "ingredient_id": candidate.get("ingredient_id"),
            "name": candidate.get("name"),
            "category": candidate.get("category"),
            "media_url": candidate.get("media_url"),
            "price": candidate.get("price"),
            "confidence": confidence,
            "match_type": "exact" if exact_match else "semantic",
        }

    # ------------------------------------------------------------------
    # String helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _deduplicate(
        items: list[str],
    ) -> list[str]:

        seen: set[str] = set()
        results: list[str] = []

        for item in items:

            if not isinstance(item, str):
                continue

            item = item.strip().lower()

            if not item or item in seen:
                continue

            seen.add(item)
            results.append(item)

        return results

    @staticmethod
    def _normalize(
        value: str,
    ) -> str:

        return value.strip().lower()

    @staticmethod
    def _forms(
        value: str,
    ) -> set[str]:
        """
        Plausible singular forms of a word, including itself.

        Two names count as the same ingredient when their form sets
        overlap. Returning several candidates (instead of one guessed
        singular) handles words a single rule gets wrong:

            cookies  -> cookie  (not "cooky")
            pies     -> pie     (not "py")
            berries  -> berry
            tomatoes -> tomato
        """

        v = value.strip().lower()

        forms = {v}

        if v.endswith("ies") and len(v) > 3:
            forms.add(v[:-3] + "y")
            forms.add(v[:-1])

        if v.endswith("es") and len(v) > 2:
            forms.add(v[:-2])

        if v.endswith("s") and not v.endswith("ss") and len(v) > 1:
            forms.add(v[:-1])

        return forms

    @staticmethod
    def _pluralize(
        value: str,
    ) -> str:

        value = value.strip().lower()

        # consonant + y -> ies (berry -> berries); vowel + y -> s (turkey -> turkeys)
        if (
            value.endswith("y")
            and len(value) > 1
            and value[-2] not in "aeiou"
        ):
            return value[:-1] + "ies"

        if value.endswith(("s", "x", "z", "ch", "sh")):
            return value + "es"

        return value + "s"