import os
from pathlib import Path
from typing import List, Optional

import numpy as np
from pydantic import BaseModel, field_validator, Field

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM"))


class Embeddings(BaseModel):
    """A single representation and embedding vector."""

    id: int
    embedding: List[float] = Field(
        ..., min_length=EMBEDDING_DIM, max_length=EMBEDDING_DIM
    )

    @field_validator("embedding", mode="before")
    @classmethod
    def coerce_embedding(cls, v):
        """Accept numpy arrays and convert them to plain float lists."""
        if isinstance(v, np.ndarray):
            return v.tolist()
        return v


class NeuralNetworkConfig(BaseModel):
    """
    Hyperparameters for nearest-neighbour search, ranking, and learning.

    Invariant fields (min_trend_score, explore_similarity_threshold,
    trending_velocity_threshold, max_coactivation_count) are enforced by
    the scoring and trend pipelines to suppress noise, guarantee exploration
    slots, and cap collaborative score inflation.
    """

    # -------------------------------------------------------------------------
    # Learning
    # -------------------------------------------------------------------------
    learning_rate: float = Field(
        0.03,
        gt=0.0,
        description="Step size for user vector updates",
    )
    decay_rate: float = Field(
        0.01,
        ge=0.0,
        le=1.0,
        description="Rate at which activation decays over time",
    )

    # -------------------------------------------------------------------------
    # Brain / synapse
    # -------------------------------------------------------------------------
    brain_boost: float = Field(
        0.03,
        ge=0.0,
        description="Score boost for posts connected to the user in the brain",
    )

    # -------------------------------------------------------------------------
    # Macro neuron patterns
    # -------------------------------------------------------------------------
    macro_pattern_min_count: int = Field(
        3,
        gt=1,
        description=(
            "Co-activations required before promoting a user-recipe pair "
            "or a recipe-recipe pair into a macro neuron"
        ),
    )

    # -------------------------------------------------------------------------
    # Multi-user collaborative learning
    # -------------------------------------------------------------------------
    multi_user_recent_window: int = Field(
        10,
        gt=1,
        description="Recent recipe activations per user kept for collaborative learning",
    )
    multi_user_min_coactivation: int = Field(
        3,
        gt=1,
        description="Coactivation count required before applying the collaborative boost",
    )
    multi_user_boost: float = Field(
        0.12,
        ge=0.0,
        description="Ranking boost from multi-user recipe coactivation",
    )
    max_coactivation_count: int = Field(
        50,
        gt=0,
        description=(
            "Hard cap on recipe_coactivation_counts per pair. "
            "Prevents a single popular pair from inflating collaborative scores "
            "without bound (invariant enforced in Brain.create_macro_neuron_from_recipe_neuron)."
        ),
    )

    # -------------------------------------------------------------------------
    # Seen-post handling
    # -------------------------------------------------------------------------
    seen_post_penalty: float = Field(
        1.5,
        ge=0.0,
        description="Score penalty subtracted from already-seen posts before ranking",
    )
    seen_post_ttl_seconds: int = Field(
        21600,
        gt=0,
        description="TTL (seconds) for the Redis seen-post set per user",
    )
    served_seen_ratio: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Fraction of served posts to mark as seen after each request",
    )
    served_seen_max_count: int = Field(
        10,
        ge=0,
        description="Maximum number of served posts to mark as seen per request",
    )

    # -------------------------------------------------------------------------
    # Candidate pool
    # -------------------------------------------------------------------------
    candidate_multiplier: int = Field(
        3,
        gt=0,
        description="Multiplier applied to limit to size the candidate pool",
    )
    min_candidate_limit: int = Field(
        500,
        gt=0,
        description="Minimum candidate pool size regardless of multiplier",
    )

    # -------------------------------------------------------------------------
    # Diversity
    # -------------------------------------------------------------------------
    diversity_enabled: bool = Field(
        True,
        description="Whether to apply diversity re-ranking to the final post list",
    )
    diversity_similarity_penalty: float = Field(
        0.35,
        ge=0.0,
        description="Score penalty applied to near-duplicate post vectors",
    )
    diversity_max_similarity: float = Field(
        0.72,
        ge=0.0,
        le=1.0,
        description="Cosine similarity threshold above which diversity penalty fires",
    )
    diversity_soft_penalty: float = Field(
        0.12,
        ge=0.0,
        description="Soft penalty scaled by nearest-selected-post similarity",
    )

    # -------------------------------------------------------------------------
    # Scoring invariants (trend pipeline)
    # -------------------------------------------------------------------------
    min_trend_score: float = Field(
        0.01,
        ge=0.0,
        description=(
            "Score floor for trend persistence. Posts below this threshold are "
            "not written to post.trend_score, suppressing noise in the trend feed "
            "(invariant enforced in _post_trends after sort)."
        ),
    )
    trending_velocity_threshold: float = Field(
        0.05,
        ge=0.0,
        description=(
            "Minimum trend_velocity (new_score − old_score) required to "
            "trigger a trending push notification. Prevents notifications for "
            "posts that are stable or cooling off."
        ),
    )

    # -------------------------------------------------------------------------
    # Exploration invariants (feed output)
    # -------------------------------------------------------------------------
    explore_ratio: float = Field(
        0.20,
        ge=0.0,
        le=1.0,
        description=(
            "Fraction of feed slots reserved for posts with low cosine similarity "
            "to the user vector (novelty exploration bucket)."
        ),
    )
    new_post_ratio: float = Field(
        0.10,
        ge=0.0,
        le=1.0,
        description=(
            "Fraction of feed slots reserved for posts created within "
            "new_post_window_seconds. Guarantees new recipes surface even with "
            "low action counts."
        ),
    )
    new_post_window_seconds: int = Field(
        172800,
        gt=0,
        description="Age threshold (seconds) for a post to qualify as 'new' (default 48 h).",
    )
    explore_similarity_threshold: float = Field(
        0.30,
        ge=0.0,
        le=1.0,
        description=(
            "Cosine similarity ceiling for the exploration bucket. Posts whose "
            "similarity to the user vector is below this value are candidates "
            "for the explore slot, ensuring unfamiliar content reaches the feed."
        ),
    )

    # -------------------------------------------------------------------------
    # Collaborative score invariants
    # -------------------------------------------------------------------------
    multi_user_max_boost: float = Field(
        0.30,
        ge=0.0,
        description="Hard ceiling on collaborative boost so no post dominates via coactivation alone",
    )
    max_brain_contribution_ratio: float = Field(
        0.25,
        ge=0.0,
        description="Brain boost capped as a fraction of the base action score",
    )
    coactivation_decay_factor: float = Field(
        0.95,
        ge=0.0,
        le=1.0,
        description="Multiplicative decay applied to all coactivation counts each refresh cycle",
    )