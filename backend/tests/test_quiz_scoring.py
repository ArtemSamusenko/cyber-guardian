"""Quiz marking, using a stand-in for the database connection."""

import pytest

from app.core.exceptions import NotFoundException
from app.schemas.quiz import QuizSubmission
from app.services.quiz_service import QuizService

QUESTIONS = [
    {"id": 1, "question_text": "Q1", "correct_answer": 0, "explanation": "E1"},
    {"id": 2, "question_text": "Q2", "correct_answer": 1, "explanation": "E2"},
    {"id": 3, "question_text": "Q3", "correct_answer": 2, "explanation": "E3"},
    {"id": 4, "question_text": "Q4", "correct_answer": 3, "explanation": "E4"},
]


class FakeConnection:
    """Answers only the queries QuizService.submit_quiz makes."""

    def __init__(self, questions):
        self.questions = questions
        self.executed = []

    async def fetch(self, query, *args):
        if "FROM quiz_questions" in query:
            return self.questions
        if "FROM quiz_attempts" in query:
            return []
        raise AssertionError(f"Unexpected query: {query}")

    async def fetchrow(self, query, *args):
        if "FROM user_progress" in query:
            return None
        raise AssertionError(f"Unexpected query: {query}")

    async def execute(self, query, *args):
        self.executed.append((" ".join(query.split()), args))


class NoAchievements:
    async def process_quiz_completion(self, **kwargs):
        return []


def make_service(questions=QUESTIONS):
    db = FakeConnection(questions)
    service = QuizService(db)
    service.achievement_service = NoAchievements()
    return service, db


async def submit(answers, questions=QUESTIONS):
    service, db = make_service(questions)
    submission = QuizSubmission(level_id=1, answers=answers, time_spent=30)
    return await service.submit_quiz(user_id=1, submission=submission), db


async def test_three_out_of_four_passes():
    result, _ = await submit({1: 0, 2: 1, 3: 2, 4: 0})
    assert result.score == 75
    assert result.passed


async def test_two_out_of_four_fails():
    result, _ = await submit({1: 0, 2: 1, 3: 0, 4: 0})
    assert result.score == 50
    assert not result.passed


async def test_all_correct_scores_100():
    result, _ = await submit({1: 0, 2: 1, 3: 2, 4: 3})
    assert result.score == 100


async def test_unanswered_question_counts_as_wrong():
    result, _ = await submit({1: 0, 2: 1, 3: 2})
    assert result.score == 75
    unanswered = next(item for item in result.feedback if item["question_id"] == 4)
    assert unanswered["selected_answer"] is None
    assert not unanswered["is_correct"]


async def test_feedback_explains_every_question():
    result, _ = await submit({1: 3, 2: 3, 3: 3, 4: 3})
    assert [item["explanation"] for item in result.feedback] == ["E1", "E2", "E3", "E4"]
    assert all("correct_answer" in item for item in result.feedback)


async def test_attempt_is_recorded_with_score_and_result():
    _, db = await submit({1: 0, 2: 1, 3: 2, 4: 0})
    attempts = [args for query, args in db.executed if query.startswith("INSERT INTO quiz_attempts")]
    assert attempts == [(1, 1, 75, True, 30)]


async def test_level_without_questions_is_an_error():
    with pytest.raises(NotFoundException):
        await submit({1: 0}, questions=[])
