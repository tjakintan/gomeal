from __future__ import annotations

import os
import time
import yaml
from pathlib import Path

from brain.core.config.network import NeuralNetworkConfig

_CONFIG_CACHE: NeuralNetworkConfig | None = None
_CONFIG_LOADED_AT = 0.0
_CONFIG_TTL_SECONDS = 5.0

def _load_network_config(force: bool = False) -> NeuralNetworkConfig:
    global _CONFIG_CACHE, _CONFIG_LOADED_AT

    now = time.time()

    if (
        not force
        and _CONFIG_CACHE is not None
        and now - _CONFIG_LOADED_AT < _CONFIG_TTL_SECONDS
    ):
        return _CONFIG_CACHE

    config_env = os.getenv("CONFIG_PATH")

    if config_env:
        file_path = Path(config_env)

        if file_path.suffix not in {".yaml", ".yml"}:
            file_path = file_path / "network_config.yaml"
    else:
        file_path = Path("./brain/core/config/network_config.yaml")

    if not file_path.exists():
        raise FileNotFoundError(f"Config file not found at {file_path}")

    with file_path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)

    if data is None:
        raise ValueError(f"{file_path} is empty or invalid YAML.")

    _CONFIG_CACHE = NeuralNetworkConfig(**data)
    _CONFIG_LOADED_AT = now

    return _CONFIG_CACHE
