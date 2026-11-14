# Cyber Guardian backend

FastAPI backend for the game: accounts, levels, quiz marking, progress and achievements.

## Setup

```bash
uv sync
createdb cybersec_game
psql cybersec_game < schema.sql
cp .env.example .env
```

Set `DATABASE_URL` and `SECRET_KEY` in `.env`. The server won't start without a proper secret key. To make one:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Tests

```bash
uv sync --extra dev
uv run pytest
```

`tests/test_integration_db.py` needs a database and only runs when `TEST_DATABASE_URL` is set:

```bash
createdb cybersec_game_test && psql cybersec_game_test < schema.sql
TEST_DATABASE_URL=postgresql://localhost/cybersec_game_test uv run pytest
```

## Structure

```
app/
├── main.py       # app setup, CORS, routers
├── config.py     # settings from .env
├── database.py   # connection pool
├── core/         # password hashing, JWT
├── api/v1/       # routes
├── schemas/      # request and response models
└── services/     # quiz marking, progress, XP, achievements
tests/
schema.sql        # tables and seed data (levels, questions, achievements)
```
