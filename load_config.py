from pathlib import Path
import os

from dotenv import dotenv_values, load_dotenv

BASE_DIR = Path(__file__).resolve().parent


def load_environment() -> str:
    # Read DEV directly from config.env.
    config = dotenv_values(BASE_DIR / "config.env")

    dev_value = config.get("DEV", "true").strip().lower()

    if dev_value in {"1", "true", "yes", "on"}:
        profile = "development"
    elif dev_value in {"0", "false", "no", "off"}:
        profile = "production"
    else:
        raise ValueError(f"Invalid DEV value in config.env: {dev_value!r}")

    # Load the selected profile first.
    profile_file = BASE_DIR / f".env.{profile}"

    if not profile_file.is_file():
        raise FileNotFoundError(f"Missing environment file: {profile_file}")

    load_dotenv(profile_file, override=False)

    # Load machine-specific overrides.
    load_dotenv(BASE_DIR / ".env", override=True)

    # Load config.env last, allowing it to provide shared defaults
    # without overwriting profile-specific settings.
    for key, value in config.items():
        if value is not None:
            os.environ.setdefault(key, value)

    # Ensure DEV matches the selected profile.
    os.environ["DEV"] = str(profile == "development").lower()

    print(f"[config] Loaded environment: {profile}")

    return profile


settings = load_environment()