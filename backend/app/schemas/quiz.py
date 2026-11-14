from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class QuizQuestionResponse(BaseModel):
    id: int
    level_id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    # Note: correct_answer is NOT included in the response to prevent cheating


class QuizSubmission(BaseModel):
    level_id: int = Field(..., ge=1, le=6)
    answers: Dict[int, int] = Field(..., description="Map of question_id to selected option (0-3)", json_schema_extra={"example": {1: 2, 2: 0, 3: 1}})
    time_spent: int = Field(..., ge=0, description="Time spent in seconds")


class QuizResult(BaseModel):
    score: int
    total_questions: int
    passed: bool
    feedback: List[Dict[str, Any]]
    xp_earned: int = 0
    new_achievements: List[Dict[str, Any]] = []


class QuizAttemptResponse(BaseModel):
    id: int
    user_id: int
    level_id: int
    score: int
    passed: bool
    time_spent: int
    created_at: datetime
