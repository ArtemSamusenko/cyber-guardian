from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import achievements, auth, levels, progress, quiz
from app.config import settings
from app.database import close_db, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Cyber Guardian API",
    description="Backend for Cyber Guardian, a browser game that teaches everyday cyber security.",
    version="1.0.0",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(levels.router, prefix="/api/v1/levels", tags=["levels"])
app.include_router(progress.router, prefix="/api/v1/progress", tags=["progress"])
app.include_router(quiz.router, prefix="/api/v1/quiz", tags=["quiz"])
app.include_router(achievements.router, prefix="/api/v1/achievements", tags=["achievements"])

@app.get("/")
async def root():
    return {"message": "Cyber Guardian API", "version": app.version}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
