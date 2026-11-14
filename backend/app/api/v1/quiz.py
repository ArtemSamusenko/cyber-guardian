from typing import List

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.database import get_db
from app.schemas.quiz import QuizQuestionResponse, QuizResult, QuizSubmission
from app.services.quiz_service import QuizService

router = APIRouter()


@router.get("/{level_id}/questions", response_model=List[QuizQuestionResponse])
async def get_quiz_questions(
    level_id: int,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    quiz_service = QuizService(db)
    questions = await quiz_service.get_quiz_questions(level_id)
    return questions


@router.post("/{level_id}/submit", response_model=QuizResult)
async def submit_quiz(
    level_id: int,
    submission: QuizSubmission,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    if submission.level_id != level_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Level ID mismatch"
        )

    quiz_service = QuizService(db)
    result = await quiz_service.submit_quiz(user_id, submission)
    return result
