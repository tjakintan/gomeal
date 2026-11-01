from pathlib import Path
import os
from types import SimpleNamespace

from dotenv import dotenv_values, load_dotenv

BASE_DIR = Path(__file__).resolve().parent


def load_environment() -> str:
    config = dotenv_values(BASE_DIR / "config.env")
    dev_value = (config.get("DEV") or "true").strip().lower()

    if dev_value in {"1", "true", "yes", "on"}:
        profile = "development"
    elif dev_value in {"0", "false", "no", "off"}:
        profile = "production"
    else:
        raise ValueError(f"Invalid DEV value in config.env: {dev_value!r}")

    profile_file = BASE_DIR / f".env.{profile}"

    if not profile_file.is_file():
        raise FileNotFoundError(f"Missing environment file: {profile_file}")

    load_dotenv(profile_file, override=False)
    load_dotenv(BASE_DIR / ".env", override=True)

    for key, value in config.items():
        if value is not None:
            os.environ.setdefault(key, value)

    os.environ["DEV"] = str(profile == "development").lower()

    print(f"[config] Loaded environment: {profile}")
    return profile


def _get_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


PROFILE = load_environment()

settings = SimpleNamespace(
    profile=PROFILE,
    port=int(os.getenv("PORT", "6970")),
    llm_health_url=os.getenv("LLM_HEALTH_URL", ""),
    cors_origins=[
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ],
    watch_spot_interruption=_get_bool(
        "WATCH_SPOT_INTERRUPTION",
        default=PROFILE == "production",
    ),
)
