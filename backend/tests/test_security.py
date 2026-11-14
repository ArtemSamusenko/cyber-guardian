"""Password hashing and JWT handling."""

import base64
import json
from datetime import timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.config import settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_current_user_id,
    get_password_hash,
    verify_password,
)


def _b64url(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def test_password_is_stored_as_a_bcrypt_hash():
    hashed = get_password_hash("CorrectHorse9")
    assert hashed != "CorrectHorse9"
    assert hashed.startswith("$2b$")


def test_correct_password_verifies_and_wrong_one_does_not():
    hashed = get_password_hash("CorrectHorse9")
    assert verify_password("CorrectHorse9", hashed)
    assert not verify_password("correcthorse9", hashed)


def test_same_password_gets_a_new_salt_each_time():
    assert get_password_hash("CorrectHorse9") != get_password_hash("CorrectHorse9")


def test_password_longer_than_bcrypt_limit_never_verifies():
    hashed = get_password_hash("CorrectHorse9")
    assert not verify_password("x" * 200, hashed)


def test_token_round_trip_keeps_the_user_id():
    payload = decode_access_token(create_access_token({"sub": "42"}))
    assert payload["sub"] == "42"
    assert "exp" in payload


def test_expired_token_is_rejected():
    token = create_access_token({"sub": "42"}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        decode_access_token(token)
    assert exc.value.status_code == 401


def test_token_signed_with_another_key_is_rejected():
    forged = jwt.encode({"sub": "1"}, "attacker-key-" + "x" * 40, algorithm=settings.ALGORITHM)
    with pytest.raises(HTTPException) as exc:
        decode_access_token(forged)
    assert exc.value.status_code == 401


def test_tampered_signature_is_rejected():
    header, payload, signature = create_access_token({"sub": "42"}).split(".")
    tampered = ".".join([header, payload, signature[::-1]])
    with pytest.raises(HTTPException):
        decode_access_token(tampered)


def test_unsigned_alg_none_token_is_rejected():
    unsigned = f"{_b64url({'alg': 'none', 'typ': 'JWT'})}.{_b64url({'sub': '1'})}."
    with pytest.raises(HTTPException):
        decode_access_token(unsigned)


async def test_current_user_id_comes_from_the_token():
    assert await get_current_user_id(_bearer(create_access_token({"sub": "7"}))) == 7


async def test_token_without_a_user_id_is_rejected():
    with pytest.raises(HTTPException) as exc:
        await get_current_user_id(_bearer(create_access_token({"role": "player"})))
    assert exc.value.status_code == 401


async def test_non_numeric_user_id_is_rejected():
    with pytest.raises(HTTPException) as exc:
        await get_current_user_id(_bearer(create_access_token({"sub": "abc"})))
    assert exc.value.status_code == 401


async def test_auth_code_never_prints_tokens(capsys):
    token = create_access_token({"sub": "7"})
    decode_access_token(token)
    await get_current_user_id(_bearer(token))
    with pytest.raises(HTTPException):
        decode_access_token("not-a-token")
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""
