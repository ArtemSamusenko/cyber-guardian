from datetime import date
from typing import List, Optional, Tuple

import asyncpg

from app.schemas.achievement import (
    Achievement,
    StoryProgress,
    StoryProgressResponse,
    UserAchievement,
    UserStats,
    XPGain,
    XPTransaction,
)


class AchievementService:
    # XP reward constants
    XP_LEVEL_COMPLETE = 50
    XP_QUIZ_PASS = 25
    XP_PERFECT_SCORE = 50
    XP_SPEED_BONUS = 25
    XP_FIRST_TRY = 15
    XP_DAILY_LOGIN = 5

    # Security rating thresholds
    RATINGS = [
        (0, 'Novice'),
        (100, 'Apprentice'),
        (300, 'Practitioner'),
        (600, 'Expert'),
        (1000, 'Master'),
        (1500, 'Guardian'),
    ]

    def __init__(self, db: asyncpg.Connection):
        self.db = db

    def get_security_rating(self, total_xp: int) -> Tuple[str, Optional[int]]:
        """Get the security rating for given XP and XP needed for next rating."""
        current_rating = 'Novice'
        next_rating_xp = None

        for i, (threshold, rating) in enumerate(self.RATINGS):
            if total_xp >= threshold:
                current_rating = rating
                # At the top rating there is nothing left to reach, so reset to None
                # (previously this kept the last value and went to 0 or negative)
                if i + 1 < len(self.RATINGS):
                    next_rating_xp = self.RATINGS[i + 1][0] - total_xp
                else:
                    next_rating_xp = None
            else:
                break

        return current_rating, next_rating_xp

    async def ensure_user_stats(self, user_id: int) -> None:
        """Ensure user has a stats record."""
        await self.db.execute("""
            INSERT INTO user_stats (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO NOTHING
        """, user_id)

    async def ensure_story_progress(self, user_id: int) -> None:
        """Ensure user has a story progress record."""
        await self.db.execute("""
            INSERT INTO story_progress (user_id)
            VALUES ($1)
            ON CONFLICT (user_id) DO NOTHING
        """, user_id)

    async def get_user_stats(self, user_id: int) -> UserStats:
        """Get user stats including XP and rating."""
        await self.ensure_user_stats(user_id)

        stats = await self.db.fetchrow("""
            SELECT total_xp, current_streak, longest_streak, perfect_scores, levels_completed
            FROM user_stats WHERE user_id = $1
        """, user_id)

        rating, next_rating_xp = self.get_security_rating(stats['total_xp'])

        return UserStats(
            total_xp=stats['total_xp'],
            current_streak=stats['current_streak'],
            longest_streak=stats['longest_streak'],
            perfect_scores=stats['perfect_scores'],
            levels_completed=stats['levels_completed'],
            security_rating=rating,
            next_rating_xp=next_rating_xp
        )

    async def add_xp(self, user_id: int, amount: int, source: str,
                     description: str, source_id: Optional[int] = None) -> XPGain:
        """Add XP to user and check for new achievements."""
        await self.ensure_user_stats(user_id)

        # Update user's total XP
        result = await self.db.fetchrow("""
            UPDATE user_stats
            SET total_xp = total_xp + $2, updated_at = NOW()
            WHERE user_id = $1
            RETURNING total_xp
        """, user_id, amount)

        new_total = result['total_xp']

        # Log the transaction
        await self.db.execute("""
            INSERT INTO xp_transactions (user_id, amount, source, source_id, description)
            VALUES ($1, $2, $3, $4, $5)
        """, user_id, amount, source, source_id, description)

        # Check for XP milestone achievements
        new_achievements = await self.check_xp_achievements(user_id, new_total)

        return XPGain(
            amount=amount,
            source=source,
            description=description,
            new_total=new_total,
            new_achievements=new_achievements
        )

    async def check_xp_achievements(self, user_id: int, total_xp: int) -> List[Achievement]:
        """Check and unlock XP-based achievements."""
        new_achievements = []

        if total_xp >= 500:
            achievement = await self.unlock_achievement(user_id, 'xp_500')
            if achievement:
                new_achievements.append(achievement)

        if total_xp >= 1000:
            achievement = await self.unlock_achievement(user_id, 'xp_1000')
            if achievement:
                new_achievements.append(achievement)

        return new_achievements

    async def unlock_achievement(self, user_id: int, achievement_code: str) -> Optional[Achievement]:
        """Unlock an achievement for a user if not already unlocked."""
        # Get achievement details
        achievement_row = await self.db.fetchrow("""
            SELECT id, code, name, description, icon, xp_reward, category
            FROM achievements WHERE code = $1
        """, achievement_code)

        if not achievement_row:
            return None

        # Check if already unlocked
        existing = await self.db.fetchrow("""
            SELECT id FROM user_achievements
            WHERE user_id = $1 AND achievement_id = $2
        """, user_id, achievement_row['id'])

        if existing:
            return None

        # Unlock the achievement
        await self.db.execute("""
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES ($1, $2)
        """, user_id, achievement_row['id'])

        # Award XP for the achievement (without recursion for XP achievements)
        if achievement_row['xp_reward'] > 0 and not achievement_code.startswith('xp_'):
            await self.db.execute("""
                UPDATE user_stats SET total_xp = total_xp + $2 WHERE user_id = $1
            """, user_id, achievement_row['xp_reward'])

            await self.db.execute("""
                INSERT INTO xp_transactions (user_id, amount, source, description)
                VALUES ($1, $2, 'achievement', $3)
            """, user_id, achievement_row['xp_reward'], f"Unlocked: {achievement_row['name']}")

        return Achievement(
            id=achievement_row['id'],
            code=achievement_row['code'],
            name=achievement_row['name'],
            description=achievement_row['description'],
            icon=achievement_row['icon'],
            xp_reward=achievement_row['xp_reward'],
            category=achievement_row['category']
        )

    async def get_user_achievements(self, user_id: int) -> List[UserAchievement]:
        """Get all achievements unlocked by a user."""
        rows = await self.db.fetch("""
            SELECT a.id, a.code, a.name, a.description, a.icon, a.xp_reward, a.category,
                   ua.unlocked_at
            FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = $1
            ORDER BY ua.unlocked_at DESC
        """, user_id)

        return [
            UserAchievement(
                achievement=Achievement(
                    id=row['id'],
                    code=row['code'],
                    name=row['name'],
                    description=row['description'],
                    icon=row['icon'],
                    xp_reward=row['xp_reward'],
                    category=row['category']
                ),
                unlocked_at=row['unlocked_at']
            )
            for row in rows
        ]

    async def get_all_achievements(self) -> List[Achievement]:
        """Get all available achievements."""
        rows = await self.db.fetch("""
            SELECT id, code, name, description, icon, xp_reward, category
            FROM achievements ORDER BY category, id
        """)

        return [
            Achievement(
                id=row['id'],
                code=row['code'],
                name=row['name'],
                description=row['description'],
                icon=row['icon'],
                xp_reward=row['xp_reward'],
                category=row['category']
            )
            for row in rows
        ]

    async def process_quiz_completion(self, user_id: int, level_id: int,
                                       score: int, passed: bool, time_spent: int,
                                       is_first_attempt: bool, had_previous_fail: bool) -> List[XPGain]:
        """Process quiz completion and award XP/achievements."""
        xp_gains = []

        if not passed:
            return xp_gains

        # Base XP for passing quiz
        gain = await self.add_xp(
            user_id, self.XP_QUIZ_PASS, 'quiz_pass',
            f"Passed Level {level_id} quiz", level_id
        )
        xp_gains.append(gain)

        # Perfect score bonus
        if score == 100:
            gain = await self.add_xp(
                user_id, self.XP_PERFECT_SCORE, 'perfect_score',
                f"Perfect score on Level {level_id}", level_id
            )
            xp_gains.append(gain)

            # Update perfect scores count and check achievement
            await self.db.execute("""
                UPDATE user_stats SET perfect_scores = perfect_scores + 1 WHERE user_id = $1
            """, user_id)

            stats = await self.db.fetchrow("""
                SELECT perfect_scores FROM user_stats WHERE user_id = $1
            """, user_id)

            if stats['perfect_scores'] == 1:
                achievement = await self.unlock_achievement(user_id, 'perfect_score')
                if achievement:
                    xp_gains[-1].new_achievements.append(achievement)
            elif stats['perfect_scores'] == 3:
                achievement = await self.unlock_achievement(user_id, 'triple_perfect')
                if achievement:
                    xp_gains[-1].new_achievements.append(achievement)

        # Speed bonus (under 60 seconds with 80%+ score)
        if time_spent < 60 and score >= 80:
            gain = await self.add_xp(
                user_id, self.XP_SPEED_BONUS, 'speed_bonus',
                f"Speed completion on Level {level_id}", level_id
            )
            xp_gains.append(gain)

            achievement = await self.unlock_achievement(user_id, 'speed_demon')
            if achievement:
                gain.new_achievements.append(achievement)

        # First try bonus
        if is_first_attempt:
            gain = await self.add_xp(
                user_id, self.XP_FIRST_TRY, 'first_try',
                f"First try pass on Level {level_id}", level_id
            )
            xp_gains.append(gain)

            achievement = await self.unlock_achievement(user_id, 'first_try')
            if achievement:
                gain.new_achievements.append(achievement)

        # Never give up achievement (passed after failing)
        if had_previous_fail:
            achievement = await self.unlock_achievement(user_id, 'never_give_up')
            if achievement and xp_gains:
                xp_gains[0].new_achievements.append(achievement)

        # Level completion achievement
        level_achievement_map = {
            1: 'level_1_complete',
            2: 'level_2_complete',
            3: 'level_3_complete',
            4: 'level_4_complete',
            5: 'level_5_complete',
            6: 'level_6_complete'
        }
        if level_id in level_achievement_map:
            achievement = await self.unlock_achievement(user_id, level_achievement_map[level_id])
            if achievement and xp_gains:
                xp_gains[0].new_achievements.append(achievement)

        # Update levels completed and check all levels achievement
        await self.db.execute("""
            UPDATE user_stats
            SET levels_completed = (
                SELECT COUNT(DISTINCT level_id) FROM user_progress
                WHERE user_id = $1 AND completed = TRUE
            )
            WHERE user_id = $1
        """, user_id)

        stats = await self.db.fetchrow("""
            SELECT levels_completed FROM user_stats WHERE user_id = $1
        """, user_id)

        if stats['levels_completed'] >= 6:
            achievement = await self.unlock_achievement(user_id, 'all_levels_complete')
            if achievement and xp_gains:
                xp_gains[0].new_achievements.append(achievement)

        return xp_gains

    async def process_level_completion(self, user_id: int, level_id: int) -> XPGain:
        """Award XP for completing a level (interactive part)."""
        return await self.add_xp(
            user_id, self.XP_LEVEL_COMPLETE, 'level_complete',
            f"Completed Level {level_id} scenario", level_id
        )

    async def process_daily_login(self, user_id: int) -> Optional[XPGain]:
        """Process daily login and update streak."""
        await self.ensure_user_stats(user_id)

        stats = await self.db.fetchrow("""
            SELECT last_login_date, current_streak, longest_streak
            FROM user_stats WHERE user_id = $1
        """, user_id)

        today = date.today()
        last_login = stats['last_login_date']
        current_streak = stats['current_streak']
        longest_streak = stats['longest_streak']

        # Check if already logged in today
        if last_login == today:
            return None

        # Update streak
        if last_login is None:
            new_streak = 1
        elif (today - last_login).days == 1:
            new_streak = current_streak + 1
        else:
            new_streak = 1

        new_longest = max(longest_streak, new_streak)

        await self.db.execute("""
            UPDATE user_stats
            SET last_login_date = $2, current_streak = $3, longest_streak = $4, updated_at = NOW()
            WHERE user_id = $1
        """, user_id, today, new_streak, new_longest)

        # Award daily login XP
        gain = await self.add_xp(
            user_id, self.XP_DAILY_LOGIN, 'daily_login',
            f"Daily login (Day {new_streak})"
        )

        # Check for first login achievement
        if new_streak == 1 and last_login is None:
            achievement = await self.unlock_achievement(user_id, 'first_login')
            if achievement:
                gain.new_achievements.append(achievement)

        # Check streak achievements
        if new_streak == 3:
            achievement = await self.unlock_achievement(user_id, 'streak_3')
            if achievement:
                gain.new_achievements.append(achievement)
        elif new_streak == 7:
            achievement = await self.unlock_achievement(user_id, 'streak_7')
            if achievement:
                gain.new_achievements.append(achievement)
        elif new_streak == 30:
            achievement = await self.unlock_achievement(user_id, 'streak_30')
            if achievement:
                gain.new_achievements.append(achievement)

        return gain

    async def get_story_progress(self, user_id: int) -> StoryProgress:
        """Get user's story progress."""
        await self.ensure_story_progress(user_id)

        row = await self.db.fetchrow("""
            SELECT intro_seen, level1_story_seen, level2_story_seen,
                   level3_story_seen, level4_story_seen, level5_story_seen, completion_seen
            FROM story_progress WHERE user_id = $1
        """, user_id)

        return StoryProgress(
            intro_seen=row['intro_seen'],
            level1_story_seen=row['level1_story_seen'],
            level2_story_seen=row['level2_story_seen'],
            level3_story_seen=row['level3_story_seen'],
            level4_story_seen=row['level4_story_seen'],
            level5_story_seen=row['level5_story_seen'],
            completion_seen=row['completion_seen']
        )

    async def update_story_progress(self, user_id: int, **kwargs) -> StoryProgressResponse:
        """Update user's story progress and unlock achievements."""
        await self.ensure_story_progress(user_id)

        updates = []
        values = [user_id]
        param_num = 2

        for field in ['intro_seen', 'level1_story_seen', 'level2_story_seen',
                      'level3_story_seen', 'level4_story_seen', 'level5_story_seen',
                      'completion_seen']:
            if field in kwargs and kwargs[field] is not None:
                updates.append(f"{field} = ${param_num}")
                values.append(kwargs[field])
                param_num += 1

        if updates:
            query = f"""
                UPDATE story_progress SET {', '.join(updates)}, updated_at = NOW()
                WHERE user_id = $1
            """
            await self.db.execute(query, *values)

        # Check and unlock story achievements
        new_achievements = await self.check_story_achievements(user_id, **kwargs)

        progress = await self.get_story_progress(user_id)
        return StoryProgressResponse(progress=progress, new_achievements=new_achievements)

    async def check_story_achievements(self, user_id: int, **kwargs) -> List[Achievement]:
        """Check and unlock story-related achievements."""
        new_achievements = []

        # Intro story achievement
        if kwargs.get('intro_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_intro')
            if achievement:
                new_achievements.append(achievement)

        # Chapter 2 (after level 1) story achievement
        if kwargs.get('level1_story_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_chapter_2')
            if achievement:
                new_achievements.append(achievement)

        # Chapter 3 (after level 2) story achievement
        if kwargs.get('level2_story_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_chapter_3')
            if achievement:
                new_achievements.append(achievement)

        # Chapter 4 (after level 3) story achievement
        if kwargs.get('level3_story_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_chapter_4')
            if achievement:
                new_achievements.append(achievement)

        # Chapter 5 (after level 4) story achievement
        if kwargs.get('level4_story_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_chapter_5')
            if achievement:
                new_achievements.append(achievement)

        # Chapter 6 (after level 5) story achievement
        if kwargs.get('level5_story_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_chapter_6')
            if achievement:
                new_achievements.append(achievement)

        # Completion story achievement
        if kwargs.get('completion_seen'):
            achievement = await self.unlock_achievement(user_id, 'story_complete')
            if achievement:
                new_achievements.append(achievement)

        return new_achievements

    async def get_xp_history(self, user_id: int, limit: int = 20) -> List[XPTransaction]:
        """Get recent XP transactions for a user."""
        rows = await self.db.fetch("""
            SELECT amount, source, description, created_at
            FROM xp_transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        """, user_id, limit)

        return [
            XPTransaction(
                amount=row['amount'],
                source=row['source'],
                description=row['description'],
                created_at=row['created_at']
            )
            for row in rows
        ]
