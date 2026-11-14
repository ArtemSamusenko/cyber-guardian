from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class Achievement(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    xp_reward: int
    category: str


class UserAchievement(BaseModel):
    achievement: Achievement
    unlocked_at: datetime


class UserStats(BaseModel):
    total_xp: int
    current_streak: int
    longest_streak: int
    perfect_scores: int
    levels_completed: int
    security_rating: str
    next_rating_xp: Optional[int] = None


class XPTransaction(BaseModel):
    amount: int
    source: str
    description: str
    created_at: datetime


class XPGain(BaseModel):
    amount: int
    source: str
    description: str
    new_total: int
    new_achievements: List[Achievement] = []


class StoryProgress(BaseModel):
    intro_seen: bool = False
    level1_story_seen: bool = False
    level2_story_seen: bool = False
    level3_story_seen: bool = False
    level4_story_seen: bool = False
    level5_story_seen: bool = False
    completion_seen: bool = False


class StoryProgressUpdate(BaseModel):
    intro_seen: Optional[bool] = None
    level1_story_seen: Optional[bool] = None
    level2_story_seen: Optional[bool] = None
    level3_story_seen: Optional[bool] = None
    level4_story_seen: Optional[bool] = None
    level5_story_seen: Optional[bool] = None
    completion_seen: Optional[bool] = None


class StoryProgressResponse(BaseModel):
    progress: StoryProgress
    new_achievements: List[Achievement] = []


class AchievementUnlock(BaseModel):
    achievement: Achievement
    xp_earned: int
