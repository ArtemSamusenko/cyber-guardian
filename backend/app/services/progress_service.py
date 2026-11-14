from typing import List

import asyncpg

from app.core.exceptions import NotFoundException
from app.schemas.progress import ProgressResponse, ProgressUpdate


class ProgressService:
    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def get_user_progress(self, user_id: int) -> List[ProgressResponse]:
        """Get user's progress across all levels"""
        progress = await self.db.fetch("""
            SELECT user_id, level_id, completed, score, attempts, time_spent, completed_at, updated_at
            FROM user_progress
            WHERE user_id = $1
            ORDER BY level_id
        """, user_id)

        return [ProgressResponse(**dict(p)) for p in progress]

    async def update_progress(self, user_id: int, progress_data: ProgressUpdate) -> ProgressResponse:
        """Update or create progress for a specific level"""
        # Verify level exists
        level = await self.db.fetchrow(
            "SELECT id FROM levels WHERE id = $1",
            progress_data.level_id
        )

        if not level:
            raise NotFoundException("Level not found")

        existing = await self.db.fetchrow("""
            SELECT * FROM user_progress
            WHERE user_id = $1 AND level_id = $2
        """, user_id, progress_data.level_id)

        if existing:
            updated = await self.db.fetchrow("""
                UPDATE user_progress
                SET completed = $3,
                    score = GREATEST(score, $4),
                    attempts = attempts + 1,
                    time_spent = time_spent + $5,
                    completed_at = CASE WHEN $3 = TRUE THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
                WHERE user_id = $1 AND level_id = $2
                RETURNING user_id, level_id, completed, score, attempts, time_spent, completed_at, updated_at
            """, user_id, progress_data.level_id, progress_data.completed,
                progress_data.score, progress_data.time_spent)
        else:
            updated = await self.db.fetchrow("""
                INSERT INTO user_progress (user_id, level_id, completed, score, attempts, time_spent, completed_at)
                VALUES ($1, $2, $3, $4, 1, $5, CASE WHEN $3 = TRUE THEN NOW() ELSE NULL END)
                RETURNING user_id, level_id, completed, score, attempts, time_spent, completed_at, updated_at
            """, user_id, progress_data.level_id, progress_data.completed,
                progress_data.score, progress_data.time_spent)

        return ProgressResponse(**dict(updated))
