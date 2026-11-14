from typing import List

import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user_id
from app.database import get_db
from app.schemas.progress import ProgressResponse, ProgressUpdate
from app.services.progress_service import ProgressService

router = APIRouter()


@router.get("", response_model=List[ProgressResponse])
async def get_user_progress(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    progress_service = ProgressService(db)
    progress = await progress_service.get_user_progress(user_id)
    return progress


@router.post("", response_model=ProgressResponse, status_code=status.HTTP_201_CREATED)
async def update_progress(
    progress_data: ProgressUpdate,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    progress_service = ProgressService(db)
    progress = await progress_service.update_progress(user_id, progress_data)
    return progress
