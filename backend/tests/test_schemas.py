"""Request validation."""

import pytest
from pydantic import ValidationError

from app.schemas.progress import ProgressUpdate
from app.schemas.quiz import QuizQuestionResponse, QuizSubmission
from app.schemas.user import UserCreate


def make_user(**overrides):
    data = {"username": "artem", "email": "artem@example.com", "password": "CorrectHorse9"}
    data.update(overrides)
    return UserCreate(**data)


def test_valid_registration_passes():
    assert make_user().username == "artem"


@pytest.mark.parametrize(
    "field, value",
    [
        ("username", "ab"),
        ("username", "a" * 51),
        ("email", "not-an-email"),
        ("password", "short"),
    ],
)
def test_invalid_registration_is_rejected(field, value):
    with pytest.raises(ValidationError):
        make_user(**{field: value})


def test_password_over_72_bytes_is_rejected_even_if_under_72_characters():
    password = "é" * 37  # 37 characters but 74 bytes in UTF-8
    with pytest.raises(ValidationError):
        make_user(password=password)


def test_password_of_exactly_72_bytes_is_accepted():
    assert make_user(password="p" * 72).password == "p" * 72


@pytest.mark.parametrize("level_id", [0, 7])
def test_quiz_submission_for_a_level_that_does_not_exist_is_rejected(level_id):
    with pytest.raises(ValidationError):
        QuizSubmission(level_id=level_id, answers={1: 0}, time_spent=10)


def test_negative_time_spent_is_rejected():
    with pytest.raises(ValidationError):
        QuizSubmission(level_id=1, answers={1: 0}, time_spent=-5)


@pytest.mark.parametrize("score", [-1, 101])
def test_progress_score_must_be_a_percentage(score):
    with pytest.raises(ValidationError):
        ProgressUpdate(level_id=1, completed=True, score=score, time_spent=10)


def test_quiz_questions_never_include_the_answer():
    assert "correct_answer" not in QuizQuestionResponse.model_fields
