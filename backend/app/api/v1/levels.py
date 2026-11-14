import json
from typing import List

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.database import get_db
from app.schemas.level import LevelListResponse, LevelResponse

router = APIRouter()


@router.get("", response_model=List[LevelListResponse])
async def get_all_levels(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    levels = await db.fetch("""
        SELECT id, title, description, order_num
        FROM levels
        ORDER BY order_num
    """)
    return [dict(level) for level in levels]


@router.get("/{level_id}", response_model=LevelResponse)
async def get_level_detail(
    level_id: int,
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    level = await db.fetchrow("""
        SELECT id, title, description, order_num, content_data
        FROM levels
        WHERE id = $1
    """, level_id)

    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found"
        )

    level_dict = dict(level)
    if level_dict.get("content_data") and isinstance(level_dict["content_data"], str):
        level_dict["content_data"] = json.loads(level_dict["content_data"])

    return level_dict
