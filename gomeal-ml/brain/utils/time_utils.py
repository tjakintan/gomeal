import math
from datetime import datetime, timezone

from brain.core.config.config import _load_network_config

config = _load_network_config()

def _time_decay(created_at, decay_rate: float = config.decay_rate) -> float:

    now = datetime.now(timezone.utc)
    
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_days = max((now - created_at).total_seconds() / 86400.0, 0)
    return math.exp(-decay_rate * age_days)
