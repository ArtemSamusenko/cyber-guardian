from typing import List, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.database import get_db
from app.schemas.achievement import (
    Achievement,
    StoryProgress,
    StoryProgressResponse,
    StoryProgressUpdate,
    UserAchievement,
    UserStats,
    XPGain,
    XPTransaction,
)
from app.services.achievement_service import AchievementService

router = APIRouter()


@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Get current user's stats including XP and security rating."""
    service = AchievementService(db)
    return await service.get_user_stats(user_id)


@router.get("/", response_model=List[UserAchievement])
async def get_user_achievements(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Get all achievements unlocked by the current user."""
    service = AchievementService(db)
    return await service.get_user_achievements(user_id)


@router.get("/all", response_model=List[Achievement])
async def get_all_achievements(
    db: asyncpg.Connection = Depends(get_db)
):
    """Get all available achievements."""
    service = AchievementService(db)
    return await service.get_all_achievements()


@router.post("/daily-login", response_model=Optional[XPGain])
async def process_daily_login(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Process daily login and award XP/streak bonuses."""
    service = AchievementService(db)
    return await service.process_daily_login(user_id)


@router.get("/story-progress", response_model=StoryProgress)
async def get_story_progress(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Get current user's story progress."""
    service = AchievementService(db)
    return await service.get_story_progress(user_id)


@router.patch("/story-progress", response_model=StoryProgressResponse)
async def update_story_progress(
    update: StoryProgressUpdate,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Update user's story progress and return any new achievements."""
    service = AchievementService(db)
    return await service.update_story_progress(
        user_id,
        intro_seen=update.intro_seen,
        level1_story_seen=update.level1_story_seen,
        level2_story_seen=update.level2_story_seen,
        level3_story_seen=update.level3_story_seen,
        level4_story_seen=update.level4_story_seen,
        level5_story_seen=update.level5_story_seen,
        completion_seen=update.completion_seen
    )


@router.get("/xp-history", response_model=List[XPTransaction])
async def get_xp_history(
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    """Get recent XP transactions."""
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")

    service = AchievementService(db)
    return await service.get_xp_history(user_id, limit)
