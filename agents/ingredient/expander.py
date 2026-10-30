"""
I wrote this module to turn the name of a finished dish (e.g. "pizza") into
the list of base ingredients you'd normally need to cook it.

It sits right after my vision step in the pipeline: the detector tells me what
food is visible in a photo, and this class tells me what that food is made of.
I talk to the model through an OpenAI-compatible API, so the same code works
against vLLM on the GPU box and LM Studio on my local machine.
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

# I load .env up front so LLM_MODEL, LLM_BASE_URL, LLM_API_KEY and VLM_MODEL
# are available before any class below reads them from the environment.
load_dotenv()


class IngredientExpander:
    """
    I take the name of a finished/visible food item and infer the typical
    ingredients used to make it.

    I keep this separate from the detector on purpose, because the two have
    different jobs:

    IngredientDetector:
        "What's visible in this photo?"
        -> literal visual detection for grounding

    IngredientExpander:
        "What is this food typically made of?"
        -> text-only culinary inference, served over an
           OpenAI-compatible API (vLLM on the GPU box, LM Studio locally).

    By default I reuse the same model as the detector (VLM_MODEL). That's the
    setup I originally tuned and tested this pipeline with, so I only override
    it if I have a good reason to.
    """

    # I cap the list at 12 ingredients so one chatty response can't flood
    # the rest of the pipeline.
    MAX_COMPONENTS = 12

    # A JSON array of 3-12 short ingredient names fits comfortably in 80
    # tokens. Keeping this small also keeps each call fast and stops the
    # model from rambling.
    MAX_NEW_TOKENS = 80

    # I run at temperature=0, so the same dish always produces the same
    # answer. That means repeated items ("pizza", "pancakes") never need a
    # second model call, and I just serve them from this in-memory cache.
    CACHE_SIZE = 2048

    # The max number of concurrent requests I send in expand_many(). The
    # inference server batches them, so a handful of parallel calls is much
    # faster than doing them one by one.
    MAX_WORKERS = 8

    # My system prompt. I'm strict about the rules here because I parse the
    # output programmatically: I want only real base ingredients (no
    # toppings, variations, substitutions or equipment) and only a bare JSON
    # array with no markdown or explanation around it. The few-shot examples
    # at the end show the exact output format and level of detail I expect.
    SYSTEM_PROMPT = """
        You are a culinary ingredient extractor.

        Given the name of a finished food, return the small set of ingredients
        normally required to make that food.

        Rules:
        - Return between 3 and 12 ingredients maximum.
        - Return actual ingredients, NOT optional toppings.
        - Do not list possible variations of the food.
        - Do not list substitutions.
        - Do not list different versions of the dish.
        - Do not include duplicate ingredients.
        - Use short, common ingredient names.
        - Prefer base ingredients normally used to prepare the dish.
        - Do not include cooking equipment or tools.
        - Return ONLY a valid JSON array of strings.
        - Do not use markdown.
        - Do not explain your answer.

        Examples:

        French fries:
        ["potato", "vegetable oil", "salt"]

        Pancakes:
        ["flour", "milk", "egg", "sugar", "butter", "baking powder"]

        Hamburger:
        ["ground beef", "burger bun", "cheese", "lettuce", "tomato", "onion", "pickles"]

        Pizza:
        ["flour", "water", "yeast", "salt", "tomato sauce", "mozzarella cheese", "olive oil"]
    """.strip()

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        """
        I set up the model name, the API client and the cache.

        Every argument is optional and falls back to an env var, so I can
        run this unchanged on my laptop or on the GPU box:

        - model: I look at the argument first, then LLM_MODEL, then
          VLM_MODEL (same model as the detector), and finally default to
          Qwen/Qwen3-VL-4B-Instruct.
        - base_url: defaults to LLM_BASE_URL, or LM Studio on the Docker
          host (host.docker.internal:1234) if that isn't set.
        - api_key: defaults to LLM_API_KEY. LM Studio ignores the key, but
          the OpenAI client requires a non-empty one, so I use "lm-studio".
        - timeout: seconds I'll wait on a single request before giving up.
        """

        self.model = (
            model
            or os.getenv("LLM_MODEL")
            or os.getenv("VLM_MODEL", "Qwen/Qwen3-VL-4B-Instruct")
        )

        self.client = OpenAI(
            base_url=base_url
            or os.getenv("LLM_BASE_URL", "http://host.docker.internal:1234/v1"),
            api_key=api_key or os.getenv("LLM_API_KEY", "lm-studio"),
            timeout=timeout,
        )

        # My cache is an LRU: an OrderedDict keeps entries in recency order,
        # so the oldest one is always at the front and easy to evict. I store
        # tuples rather than lists so a caller can never mutate a cached
        # result by accident.
        self._cache: OrderedDict[str, tuple[str, ...]] = OrderedDict()

        # expand_many() calls expand() from several threads, so every cache
        # access goes through this lock to keep the OrderedDict consistent.
        self._cache_lock = threading.Lock()

    # ------------------------------------------------------------------
    # Cache
    # ------------------------------------------------------------------

    def _cache_get(self, item: str) -> list[str] | None:
        """
        I look up an item in the cache.

        On a hit I mark the entry as most recently used and return a fresh
        list copy (so the caller can't change what I've stored). On a miss
        I return None.
        """

        with self._cache_lock:
            cached = self._cache.get(item)

            if cached is None:
                return None

            # Bump to the back so this entry is the last one I'd evict.
            self._cache.move_to_end(item)
            return list(cached)

    def _cache_put(self, item: str, components: list[str]) -> None:
        """
        I store a result in the cache and evict the least recently used
        entries if I've gone over CACHE_SIZE.
        """

        with self._cache_lock:
            self._cache[item] = tuple(components)
            self._cache.move_to_end(item)

            # popitem(last=False) removes from the front, which is the
            # least recently used entry.
            while len(self._cache) > self.CACHE_SIZE:
                self._cache.popitem(last=False)

    def clear_cache(self) -> None:
        """I wipe every cached expansion, e.g. after changing models or prompts."""

        with self._cache_lock:
            self._cache.clear()

    # ------------------------------------------------------------------
    # Expansion
    # ------------------------------------------------------------------

    def expand(self, item: str) -> list[str]:
        """
        Expand a detected food into its typical ingredients.

        My flow is: normalize the name, check the cache, call the model if
        I have to, parse the raw text into a clean list, and cache it. I
        return an empty list if anything goes wrong, and I never raise, so
        one bad item can't break the whole pipeline.
        """

        # I normalize first so "Pizza " and "pizza" share one cache entry.
        item = item.strip().lower()

        if not item:
            return []

        # Cache hit: no model call needed.
        cached = self._cache_get(item)

        if cached is not None:
            print(f"[ComponentExpander] Cache hit: {item}")
            return cached

        print(f"[ComponentExpander] Expanding: {item}")

        # I send everything as a single user turn (system prompt + request)
        # instead of separate system/user messages, because that's the exact
        # prompt shape I originally tested this pipeline with.
        prompt = (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"List the typical ingredients used to make: {item}"
        )

        start = time.perf_counter()

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=self.MAX_NEW_TOKENS,
                temperature=0.0,  # deterministic, which is what makes caching safe
            )
            # content can be None, so I fall back to an empty string.
            output_text = response.choices[0].message.content or ""
        except Exception as e:
            # Network errors, timeouts, server errors, etc. I log it and
            # return nothing. I deliberately don't cache failures, so the
            # next call for this item gets a fresh attempt.
            print(f"[ComponentExpander] LLM call failed: {e}")
            return []

        elapsed = time.perf_counter() - start

        # I log timing and the raw output so I can debug prompt/model issues.
        print(f"[ComponentExpander] Finished in {elapsed:.2f}s")
        print(f"[ComponentExpander] Raw output: {output_text}")

        components = self._parse_items(output_text)

        print(f"[ComponentExpander] Components: {components}")

        # I only cache non-empty results, so a bad or empty response gets
        # retried next time instead of being stuck in the cache forever.
        if components:
            self._cache_put(item, components)

        return components

    def expand_many(self, items: list[str]) -> dict[str, list[str]]:
        """
        Expand several items concurrently.

        Cached items return immediately; the rest are sent in parallel so
        the inference server can batch them. I return
        {normalized_item: components}.
        """

        # Step 1: I normalize and dedupe the input while keeping the
        # original order, so I never pay for the same dish twice.
        unique: list[str] = []
        seen: set[str] = set()

        for raw in items:
            # I silently skip anything that isn't a string (e.g. None from
            # an upstream detector) rather than crashing.
            if not isinstance(raw, str):
                continue

            item = raw.strip().lower()

            if item and item not in seen:
                seen.add(item)
                unique.append(item)

        if not unique:
            return {}

        # Step 2: a single item doesn't need a thread pool, so I skip the
        # overhead and call expand() directly.
        if len(unique) == 1:
            return {unique[0]: self.expand(unique[0])}

        # Step 3: I never spin up more threads than I have items, and never
        # more than MAX_WORKERS.
        workers = min(self.MAX_WORKERS, len(unique))

        # expand() handles its own errors, so map() won't raise. map()
        # also preserves input order, which lets me zip the results back to
        # their items below.
        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(pool.map(self.expand, unique))

        return dict(zip(unique, results))

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _parse_items(self, output: str) -> list[str]:
        """
        Parse the model output into a clean list of ingredients.

        Small models don't always follow "return ONLY a JSON array", so I
        parse defensively. I handle:
        - Normal JSON arrays
        - <think>...</think> blocks
        - Markdown/code fences
        - Truncated JSON
        - Partial quoted-string recovery

        I try the strictest strategy first and fall back to looser ones.
        """

        if not output:
            print("[ComponentExpander] Empty model output.")
            return []

        # Reasoning models can emit <think>...</think> before the real
        # answer. I strip those blocks so I don't parse the model's
        # scratch work as ingredients. DOTALL lets the match span newlines.
        output = re.sub(
            r"<think>.*?</think>",
            "",
            output,
            flags=re.DOTALL,
        ).strip()

        if not output:
            return []

        items: list[Any] | None = None

        # 1. Try a complete JSON array. I grab everything from the first "["
        #    to the last "]", which also skips over any markdown fences or
        #    chatter around the array.
        match = re.search(r"\[[\s\S]*\]", output)

        if match:
            try:
                parsed = json.loads(match.group())

                if isinstance(parsed, list):
                    items = parsed

            except json.JSONDecodeError:
                # Looks like an array but isn't valid JSON; I fall through
                # to the recovery strategies below.
                pass

        # 2. Recover from truncated JSON (no closing "]"). This happens when
        #    the model hits MAX_NEW_TOKENS mid-list. I pull every quoted
        #    string after the opening bracket instead.
        if items is None:
            array_start = output.find("[")

            if array_start != -1:
                quoted_items = re.findall(r'"([^"]+)"', output[array_start:])

                if quoted_items:
                    print("[ComponentExpander] Recovered items from truncated output.")
                    items = quoted_items

        # 3. Last resort: no brackets at all, so I take any quoted strings
        #    anywhere in the output.
        if items is None:
            quoted_items = re.findall(r'"([^"]+)"', output)

            if quoted_items:
                print("[ComponentExpander] Recovered quoted items from output.")
                items = quoted_items

        # 4. Nothing I can parse. I return an empty list, which expand()
        #    treats as a failure and won't cache.
        if items is None:
            print("[ComponentExpander] Could not parse components.")
            return []

        # 5. Clean, deduplicate, and limit results. I enforce the rules
        #    here too, in case the model ignored them: strings only,
        #    lowercase, trimmed, no empties, no duplicates, and at most
        #    MAX_COMPONENTS entries.
        cleaned: list[str] = []
        seen: set[str] = set()

        for value in items:
            if not isinstance(value, str):
                continue

            value = value.strip().lower()

            if not value or value in seen:
                continue

            seen.add(value)
            cleaned.append(value)

            if len(cleaned) >= self.MAX_COMPONENTS:
                break

        return cleaned