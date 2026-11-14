"""The API must refuse to start without a real secret key."""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.config import Settings

ENV_EXAMPLE = Path(__file__).resolve().parents[1] / ".env.example"
STRONG_KEY = "k" * 48


def test_missing_secret_key_is_rejected(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_placeholder_secret_key_is_rejected():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, SECRET_KEY="change-this-to-a-secure-random-key-at-least-32-characters-long")


def test_short_secret_key_is_rejected():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, SECRET_KEY="too-short")


def test_env_example_cannot_be_used_as_is(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=ENV_EXAMPLE)


def test_strong_secret_key_is_accepted():
    assert Settings(_env_file=None, SECRET_KEY=STRONG_KEY).SECRET_KEY == STRONG_KEY


def test_debug_is_off_by_default(monkeypatch):
    monkeypatch.delenv("DEBUG", raising=False)
    assert Settings(_env_file=None, SECRET_KEY=STRONG_KEY).DEBUG is False


def test_allowed_origins_can_be_comma_separated(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://a.test, http://b.test")
    settings = Settings(_env_file=None, SECRET_KEY=STRONG_KEY)
    assert settings.ALLOWED_ORIGINS == ["http://a.test", "http://b.test"]
