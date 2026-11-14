from datetime import timedelta

import asyncpg

from app.config import settings
from app.core.exceptions import (
    InvalidCredentialsException,
    NotFoundException,
    UserAlreadyExistsException,
)
from app.core.security import create_access_token, get_password_hash, verify_password
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse


class AuthService:
    def __init__(self, db: asyncpg.Connection):
        self.db = db

    async def register_user(self, user_data: UserCreate) -> Token:
        """Register a new user and return access token"""

        existing = await self.db.fetchrow(
            "SELECT id FROM users WHERE username = $1 OR email = $2",
            user_data.username, user_data.email
        )

        if existing:
            raise UserAlreadyExistsException("Username or email already exists")

        hashed_password = get_password_hash(user_data.password)

        user = await self.db.fetchrow("""
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id
        """, user_data.username, user_data.email, hashed_password)

        access_token = create_access_token(
            data={"sub": str(user["id"])},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return Token(access_token=access_token)

    async def login_user(self, credentials: UserLogin) -> Token:
        """Authenticate user and return access token"""
        user = await self.db.fetchrow(
            "SELECT id, password_hash FROM users WHERE username = $1",
            credentials.username
        )

        if not user or not verify_password(credentials.password, user["password_hash"]):
            raise InvalidCredentialsException("Invalid username or password")

        await self.db.execute(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            user["id"]
        )

        access_token = create_access_token(
            data={"sub": str(user["id"])},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return Token(access_token=access_token)

    async def get_user_by_id(self, user_id: int) -> UserResponse:
        """Get user by ID"""
        user = await self.db.fetchrow("""
            SELECT id, username, email, created_at, last_login
            FROM users
            WHERE id = $1
        """, user_id)

        if not user:
            raise NotFoundException("User not found")

        return UserResponse(**dict(user))
