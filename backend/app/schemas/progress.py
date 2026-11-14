from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProgressUpdate(BaseModel):
    level_id: int = Field(..., ge=1, le=6)
    completed: bool
    score: int = Field(..., ge=0, le=100)
    time_spent: int = Field(..., ge=0, description="Time spent in seconds")


class ProgressResponse(BaseModel):
    user_id: int
    level_id: int
    completed: bool
    score: int
    attempts: int
    time_spent: int
    completed_at: Optional[datetime] = None
    updated_at: datetime
