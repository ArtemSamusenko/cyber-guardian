"""XP thresholds for the player's security rating."""

import pytest

from app.services.achievement_service import AchievementService


@pytest.mark.parametrize(
    "xp, rating, xp_to_next",
    [
        (0, "Novice", 100),
        (99, "Novice", 1),
        (100, "Apprentice", 200),
        (300, "Practitioner", 300),
        (600, "Expert", 400),
        (1499, "Master", 1),
        (1500, "Guardian", None),
        (5000, "Guardian", None),
    ],
)
def test_security_rating_thresholds(xp, rating, xp_to_next):
    assert AchievementService(db=None).get_security_rating(xp) == (rating, xp_to_next)
