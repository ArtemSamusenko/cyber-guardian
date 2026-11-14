from typing import List

import asyncpg

from app.core.exceptions import NotFoundException
from app.schemas.quiz import QuizQuestionResponse, QuizResult, QuizSubmission
from app.services.achievement_service import AchievementService


class QuizService:
    PASSING_SCORE = 70  # 70% required to pass

    def __init__(self, db: asyncpg.Connection):
        self.db = db
        self.achievement_service = AchievementService(db)

    async def get_quiz_questions(self, level_id: int) -> List[QuizQuestionResponse]:
        """Get quiz questions for a level (without correct answers)"""
        level = await self.db.fetchrow(
            "SELECT id FROM levels WHERE id = $1",
            level_id
        )

        if not level:
            raise NotFoundException("Level not found")

        questions = await self.db.fetch("""
            SELECT id, level_id, question_text, option_a, option_b, option_c, option_d
            FROM quiz_questions
            WHERE level_id = $1
            ORDER BY id
        """, level_id)

        return [QuizQuestionResponse(**dict(q)) for q in questions]

    async def submit_quiz(self, user_id: int, submission: QuizSubmission) -> QuizResult:
        """Submit quiz answers and calculate score"""
        # Get all questions with correct answers
        questions = await self.db.fetch("""
            SELECT id, question_text, correct_answer, explanation
            FROM quiz_questions
            WHERE level_id = $1
            ORDER BY id
        """, submission.level_id)

        if not questions:
            raise NotFoundException("No quiz questions found for this level")

        total_questions = len(questions)
        correct_answers = 0
        feedback = []

        for question in questions:
            question_id = question["id"]
            user_answer = submission.answers.get(question_id)
            correct_answer = question["correct_answer"]
            is_correct = user_answer == correct_answer

            if is_correct:
                correct_answers += 1

            feedback.append({
                "question_id": question_id,
                "question_text": question["question_text"],
                "selected_answer": user_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "explanation": question["explanation"]
            })

        score = int((correct_answers / total_questions) * 100)
        passed = score >= self.PASSING_SCORE

        # Check previous attempts for achievement logic
        previous_attempts = await self.db.fetch("""
            SELECT passed FROM quiz_attempts
            WHERE user_id = $1 AND level_id = $2
            ORDER BY created_at
        """, user_id, submission.level_id)

        is_first_attempt = len(previous_attempts) == 0
        had_previous_fail = any(not attempt['passed'] for attempt in previous_attempts)

        await self.db.execute("""
            INSERT INTO quiz_attempts (user_id, level_id, score, passed, time_spent)
            VALUES ($1, $2, $3, $4, $5)
        """, user_id, submission.level_id, score, passed, submission.time_spent)

        # Update user progress
        existing_progress = await self.db.fetchrow("""
            SELECT score, attempts, time_spent FROM user_progress
            WHERE user_id = $1 AND level_id = $2
        """, user_id, submission.level_id)

        if existing_progress:
            await self.db.execute("""
                UPDATE user_progress
                SET completed = $3,
                    score = GREATEST(score, $4),
                    attempts = attempts + 1,
                    time_spent = time_spent + $5,
                    completed_at = CASE WHEN $3 = TRUE AND completed_at IS NULL THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
                WHERE user_id = $1 AND level_id = $2
            """, user_id, submission.level_id, passed, score, submission.time_spent)
        else:
            await self.db.execute("""
                INSERT INTO user_progress (user_id, level_id, completed, score, attempts, time_spent, completed_at)
                VALUES ($1, $2, $3, $4, 1, $5, CASE WHEN $3 = TRUE THEN NOW() ELSE NULL END)
            """, user_id, submission.level_id, passed, score, submission.time_spent)

        # Process achievements and XP rewards
        xp_gains = await self.achievement_service.process_quiz_completion(
            user_id=user_id,
            level_id=submission.level_id,
            score=score,
            passed=passed,
            time_spent=submission.time_spent,
            is_first_attempt=is_first_attempt,
            had_previous_fail=had_previous_fail
        )

        # Calculate total XP earned and new achievements
        total_xp_earned = sum(gain.amount for gain in xp_gains)
        new_achievements = []
        for gain in xp_gains:
            new_achievements.extend(gain.new_achievements)

        return QuizResult(
            score=score,
            total_questions=total_questions,
            passed=passed,
            feedback=feedback,
            xp_earned=total_xp_earned,
            new_achievements=[
                {"code": a.code, "name": a.name, "description": a.description, "icon": a.icon}
                for a in new_achievements
            ]
        )
