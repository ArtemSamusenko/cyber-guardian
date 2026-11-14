import logging

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

# Global connection pool
pool: asyncpg.Pool = None


async def init_db():
    global pool
    pool = await asyncpg.create_pool(
        settings.DATABASE_URL,
        min_size=settings.DB_POOL_MIN_SIZE,
        max_size=settings.DB_POOL_MAX_SIZE,
        command_timeout=60
    )
    logger.info("Database connection pool created")


async def close_db():
    global pool
    if pool:
        await pool.close()
        logger.info("Database connection pool closed")


async def get_db():
    async with pool.acquire() as connection:
        yield connection
