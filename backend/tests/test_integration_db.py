"""End-to-end API tests against a real PostgreSQL database.

Skipped unless TEST_DATABASE_URL points at a database loaded with schema.sql, e.g.
    TEST_DATABASE_URL=postgresql://localhost/cybersec_game_test uv run pytest
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

DB_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DB_URL, reason="set TEST_DATABASE_URL to run against a real PostgreSQL database"
)

PASSWORD = "CorrectHorse9"


@pytest.fixture(scope="module")
def client():
    settings.DATABASE_URL = DB_URL
    settings.DB_POOL_MIN_SIZE = 1
    settings.DB_POOL_MAX_SIZE = 2
    with TestClient(app) as test_client:
        yield test_client


def new_player(client):
    name = "t" + uuid.uuid4().hex[:12]
    response = client.post(
        "/api/v1/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": PASSWORD},
    )
    assert response.status_code == 201
    return name


def login(client, name, password=PASSWORD):
    return client.post("/api/v1/auth/login", json={"username": name, "password": password})


def test_register_login_and_play_a_quiz(client):
    name = new_player(client)
    response = login(client, name)
    assert response.status_code == 200
    headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    assert client.get("/api/v1/auth/me", headers=headers).json()["username"] == name
    assert len(client.get("/api/v1/levels", headers=headers).json()) == 6

    questions = client.get("/api/v1/quiz/1/questions", headers=headers).json()
    assert len(questions) == 4
    assert all("correct_answer" not in q for q in questions)

    result = client.post(
        "/api/v1/quiz/1/submit",
        headers=headers,
        json={"level_id": 1, "answers": {str(q["id"]): 0 for q in questions}, "time_spent": 60},
    )
    assert result.status_code == 200
    assert len(result.json()["feedback"]) == 4

    progress = client.get("/api/v1/progress", headers=headers).json()
    assert progress[0]["level_id"] == 1
    assert progress[0]["attempts"] == 1


def test_wrong_password_is_rejected(client):
    name = new_player(client)
    assert login(client, name, password="WrongHorse9").status_code == 401


def test_duplicate_username_is_rejected(client):
    name = new_player(client)
    response = client.post(
        "/api/v1/auth/register",
        json={"username": name, "email": f"other-{name}@example.com", "password": PASSWORD},
    )
    assert response.status_code == 400


def test_sql_injection_in_login_does_not_log_anyone_in(client):
    new_player(client)
    response = login(client, "' OR '1'='1' --", password="anything-at-all")
    assert response.status_code == 401


def test_password_is_stored_hashed(client):
    import asyncio

    import asyncpg

    name = new_player(client)

    async def stored_hash():
        connection = await asyncpg.connect(DB_URL)
        try:
            return await connection.fetchval(
                "SELECT password_hash FROM users WHERE username = $1", name
            )
        finally:
            await connection.close()

    password_hash = asyncio.run(stored_hash())
    assert password_hash != PASSWORD
    assert password_hash.startswith("$2b$")
