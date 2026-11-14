import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user_id
from app.database import get_db
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: asyncpg.Connection = Depends(get_db)):
    auth_service = AuthService(db)
    token = await auth_service.register_user(user_data)
    return token


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: asyncpg.Connection = Depends(get_db)):
    auth_service = AuthService(db)
    token = await auth_service.login_user(credentials)
    return token


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
    db: asyncpg.Connection = Depends(get_db)
):
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    return user
