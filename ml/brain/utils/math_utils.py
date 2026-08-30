import math
import time
import numpy as np
from typing import List, Any

def compute_normalize_vector_1(vector: np.ndarray) -> np.ndarray:
    """
        Normalize a vector to have L2 norm (length) of 1.
        
        Args:
            vector (np.ndarray): Input vector to normalize.
        
        Returns:
            np.ndarray: L2-normalized vector.
    """
    # Compute the Euclidean norm of the vector
    norm = np.linalg.norm(vector)
    
    # Raise an error if the vector has zero length
    if norm == 0:
        raise ValueError("Zero vector cannot be normalized")
    
    # Divide each component by the norm to get a unit vector
    return vector / norm

def compute_angle_between_vectors(v1: np.ndarray, v2: np.ndarray) -> float:
    """
        Compute the cosine angle (in radians) between two vectors.
        
        Args:
            v1 (np.ndarray): First vector.
            v2 (np.ndarray): Second vector.
            
        Returns:
            float: Angle in radians between v1 and v2.
    """
    # Normalize vectors
    v1_norm = v1 / np.linalg.norm(v1)
    v2_norm = v2 / np.linalg.norm(v2)
    
    # Clip dot product to avoid numerical errors
    dot = np.clip(np.dot(v1_norm, v2_norm), -1.0, 1.0)
    
    return np.arccos(dot)

def compute_time_between_firing(n1: Any, n2: Any) -> float:
    """
        Compute the time difference between the last firing of two neurons.
        
        Args:
            n1 (dict): First neuron containing 'last_fired' timestamp (float or int).
            n2 (dict): Second neuron containing 'last_fired' timestamp (float or int).
            
        Returns:
            float: Time difference (n2 - n1) in same units as timestamps.
    """
    return n2.last_fired - n1.last_fired

def compute_neuron_strength(
    engagement_score: float,
    last_interaction_timestamp: float,
    reinforcement: float = 0.0,
    recency_decay: float = 0.001,
    w_engagement: float = 1.0,
    w_recency: float = 1.0,
    w_reinforcement: float = 1.0
) -> float:
    """
        Compute dynamic neuron strength based on engagement, recency, and reinforcement.

        Returns a float between 0 and 1.

        naturally decays over time, favors recent interactions, and reinforces repeated engagement
    """
    # Age in seconds
    age = time.time() - last_interaction_timestamp

    # Recency factor (exponential decay)
    recency_factor = math.exp(-recency_decay * age)

    # Weighted sum
    raw_strength = (
        w_engagement * engagement_score +
        w_recency * recency_factor +
        w_reinforcement * reinforcement
    )

    # Sigmoid to bound [0,1]
    strength = 1 / (1 + math.exp(-raw_strength))

    return strength

def compute_decay_value(delta_t: float, decay_rate: float) -> float:
    """
        Decays a neuron's activation and strength based on elapsed time.
    """
    # Time since last update
    return math.exp(-decay_rate * delta_t)

def compute_centroid(
    embeddings: np.ndarray,
) -> np.ndarray:
    """
    Compute the normalized centroid of a collection of embeddings.

    Args:
        embeddings:
            Shape (N, D)

    Returns:
        Shape (D,)
    """

    if len(embeddings) == 0:
        raise ValueError(
            "Cannot compute centroid from empty embeddings."
        )

    centroid = embeddings.mean(axis=0)

    norm = np.linalg.norm(centroid)

    if norm > 0:
        centroid /= norm

    return centroid

def compute_centroid_embedding(neurons: List[Any]) -> List[float]:
    """
        Computes normalized centroid embedding from neurons embeddings.
    """

    if not neurons:
        raise ValueError("Cannot compute centroid from empty neuron list")

    embeddings = np.array(
        [n.embedding for n in neurons],
        dtype=np.float32,
    )

    return compute_centroid(embeddings).tolist()

def compute_neuron_activation_energy(activation: float, num_children: int, alpha: float = 0.05, method="linear"):
    """
    Returns scaled activation based on neuron abstraction size.

    Args:
        activation: raw activation from inputs
        num_children: number of child neurons aggregated
        alpha: scaling factor
        method: "linear" or "exp"
    """
    if method == "linear":
        return activation / (1 + alpha * num_children)
    elif method == "exponential":
        import math
        return activation * math.exp(-alpha * num_children)
    else:
        raise ValueError("method must be 'linear' or 'exp'")