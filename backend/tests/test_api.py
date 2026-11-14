"""HTTP-level checks that don't need a database."""

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token, get_current_user_id
from app.database import get_db
from app.main import app
from app.services.achievement_service import AchievementService

QUESTION_ROWS = [
    {
        "id": n,
        "level_id": 1,
        "question_text": f"Question {n}",
        "option_a": "A",
        "option_b": "B",
        "option_c": "C",
        "option_d": "D",
        "correct_answer": n % 4,
        "explanation": f"Because {n}",
    }
    for n in range(1, 5)
]


class FakeConnection:
    async def fetchrow(self, query, *args):
        if "FROM levels" in query:
            return {"id": 1}
        if "FROM user_progress" in query:
            return None
        raise AssertionError(f"Unexpected query: {query}")

    async def fetch(self, query, *args):
        if "FROM quiz_questions" in query:
            return QUESTION_ROWS
        if "FROM quiz_attempts" in query:
            return []
        raise AssertionError(f"Unexpected query: {query}")

    async def execute(self, query, *args):
        return None


async def fake_get_db():
    yield FakeConnection()


@pytest.fixture
def client():
    # Not used as a context manager, so the startup hook never opens a real database pool
    app.dependency_overrides[get_db] = fake_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def player(client):
    app.dependency_overrides[get_current_user_id] = lambda: 1
    return client


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.parametrize(
    "path",
    ["/api/v1/auth/me", "/api/v1/levels", "/api/v1/progress", "/api/v1/achievements/stats"],
)
def test_protected_endpoints_need_a_token(client, path):
    assert client.get(path).status_code in (401, 403)


def test_made_up_token_is_rejected(client):
    response = client.get("/api/v1/levels", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_expired_token_is_rejected(client):
    from datetime import timedelta

    token = create_access_token({"sub": "1"}, expires_delta=timedelta(seconds=-1))
    response = client.get("/api/v1/levels", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_bad_registration_is_rejected_with_422(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"username": "ab", "email": "nope", "password": "short"},
    )
    assert response.status_code == 422


def test_quiz_questions_endpoint_does_not_send_answers(player):
    response = player.get("/api/v1/quiz/1/questions")
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) == 4
    assert all("correct_answer" not in q and "explanation" not in q for q in questions)


def test_quiz_is_marked_on_the_server(player, monkeypatch):
    async def no_achievements(self, **kwargs):
        return []

    monkeypatch.setattr(AchievementService, "process_quiz_completion", no_achievements)
    answers = {str(row["id"]): row["correct_answer"] for row in QUESTION_ROWS}
    response = player.post(
        "/api/v1/quiz/1/submit",
        json={"level_id": 1, "answers": answers, "time_spent": 45},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 100
    assert body["passed"] is True


def test_quiz_submission_for_the_wrong_level_is_rejected(player):
    response = player.post(
        "/api/v1/quiz/2/submit",
        json={"level_id": 1, "answers": {"1": 0}, "time_spent": 10},
    )
    assert response.status_code == 400
