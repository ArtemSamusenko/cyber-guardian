# Technical Architecture Document - Browser-Based Game for Teaching Cybersecurity Concepts

---

## 1. Introduction

This document describes the technical architecture of a browser-based educational game designed to teach cybersecurity concepts through an interactive 2D pixel-art simulation and quiz-based assessments.

### Core Technologies
- **Frontend:** Phaser 3, TypeScript, Tailwind CSS, Zod
- **Backend:** Python FastAPI, PostgreSQL, asyncpg, Pydantic
- **Development:** Local environment with separate frontend/backend servers

---

## 2. Technology Stack

### 2.1 Frontend Technologies

| Technology | Purpose | Justification |
|------------|---------|---------------|
| **Phaser 3** | Game engine | Most popular HTML5 game framework with extensive resources and community support |
| **TypeScript** | Type safety | Ensures type safety for API communication |
| **Tailwind CSS** | Styling | Pre-built styling templates and utility classes |
| **Zod** | Validation | Runtime type validation for API responses and user input |
| **Vite** | Build tool | Development server |

### 2.2 Backend Technologies

| Technology | Purpose | Justification |
|------------|---------|---------------|
| **Python 3.11+** | Language | Developer familiarity with previous backend experience |
| **FastAPI** | Web framework | Built-in asynchronous support, automatic OpenAPI documentation, and straightforward setup |
| **PostgreSQL 15+** | Database | ACID compliance, proven reliability, prior experience |
| **asyncpg** | Database driver | High-performance async PostgreSQL library |
| **Pydantic 2.x** | Validation | Type-safe schemas matching frontend |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                     │
│                                                         │ 
│  ┌────────────────────────────────────────────────┐     │
│  │         Phaser Game + TypeScript               │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │     │
│  │  │  Scenes  │  │    UI    │  │   API    │      │     │
│  │  │          │  │  Layer   │  │  Client  │      │     │
│  │  └──────────┘  └──────────┘  └──────────┘      │     │
│  └────────────────────────────────────────────────┘     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│               FastAPI Backend                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Routes  │→ │ Services │→ │ asyncpg  │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└────────────────────┬────────────────────────────────────┘
                     │ SQL Queries
                     │
┌────────────────────▼────────────────────────────────────┐
│              PostgreSQL Database                        │
│  Users | Progress | Levels | Quiz Questions | Attempts  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Request Flow

The application follows a standard request–response model. When a user performs an action in the Phaser game, the frontend validates the data using Zod schemas before sending an HTTP request to the backend. The FastAPI backend receives the request, validates it again using Pydantic schemas, processes the business logic in the service layer, and uses asyncpg to query the PostgreSQL database asynchronously. The response is then sent back to the frontend, validated once more, and the game state is updated accordingly.

---

## 4. Frontend Architecture

### 4.1 Directory Structure

```
frontend/
├── src/
│   ├── main.ts                 # Entry point
│   ├── game.ts                 # Phaser configuration
│   ├── scenes/                 # Game scenes
│   │   ├── BootScene.ts
│   │   ├── MainMenuScene.ts
│   │   ├── TutorialScene.ts
│   │   ├── LevelSelectScene.ts
│   │   ├── GameplayScene.ts
│   │   └── QuizScene.ts
│   ├── api/                    # API client
│   │   ├── client.ts
│   │   └── schemas.ts          # Zod schemas
│   ├── store/                  # State management
│   ├── types/                  # TypeScript types
│   └── assets/                 # Game assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### 4.2 Scene Architecture

The game will use six primary Phaser scenes to represent different stages of the user journey:

- **BootScene**: Handles initial asset loading and displays a progress bar while resources are downloaded
- **MainMenuScene**: Acts as the central hub for navigation, offering options to start playing, view progress, access settings, and read documentation
- **TutorialScene**: Offers an interactive onboarding experience for first-time users to learn game controls and interface
- **LevelSelectScene**: Displays all six educational levels with visual indicators for completion status and locked/unlocked states
- **GameplayScene**: The core interactive experience where users engage with simulated computer environments and make security-related decisions
- **QuizScene**: Presents multiple-choice questions, collects answers, calculates scores, and provides detailed feedback

### 4.3 API Client with Zod Validation

The frontend implements an API client class that handles all requests to the backend. Before any data is sent to the server, Zod schemas validate the structure and types of the data. This provides immediate feedback to users if they've entered invalid data and prevents unnecessary API calls. The API client also manages authentication tokens, stores them securely, and automatically includes them in request headers.

Zod schemas mirror the Pydantic schemas on the backend, ensuring consistency across the entire application. For example, quiz submissions validate that level IDs are positive integers between 1 and 6, that answers contain valid question IDs, and that time spent is a positive number.

---

## 5. Backend Architecture

### 5.1 Directory Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application entry
│   ├── config.py               # Configuration management
│   ├── database.py             # asyncpg connection pool
│   ├── api/v1/                 # API routes
│   │   ├── auth.py
│   │   ├── levels.py
│   │   ├── progress.py
│   │   └── quiz.py
│   ├── models/                 # Data models
│   │   ├── user.py
│   │   ├── level.py
│   │   ├── progress.py
│   │   └── quiz.py
│   ├── schemas/                # Pydantic validation schemas
│   │   ├── user.py
│   │   ├── progress.py
│   │   └── quiz.py
│   ├── services/               # Business logic
│   │   ├── auth_service.py
│   │   ├── progress_service.py
│   │   └── quiz_service.py
│   └── core/                   # Core functionality
│       ├── security.py
│       └── exceptions.py
└ tests/
```

### 5.2 FastAPI Application Structure

The FastAPI application is Organised around a mainfile that includes multiple routers for different areas of the backend (authentication, levels, progress, quizzes). Each router is prefixed with `/api/v1/` to allow for future versioning in case of breaking changes or updates. In terms of developer documentation, FastAPI's automatic OpenAPI documentation is enabled at `/api/docs`, making it straightforward to test endpoints during development.

---

## 6. Database Design

### 6.1 Core Tables

**Users Table**
Stores user account information including username, email, and bcrypt-hashed password. Each user has timestamps for account creation and last login. The username and email fields have unique constraints to prevent duplicates.

**Levels Table**
Holds the six educational levels with titles, descriptions, and a JSONB column for flexible content storage (scenarios, difficulty settings, etc.). The order_num field determines the sequence of levels and has a unique constraint.

**UserProgress Table**
Tracks each user's progress through the levels. Has a unique constraint on (user_id, level_id) so each user has exactly one progress record per level. Stores completion status, score, number of attempts, time spent, and completion timestamp.

**QuizQuestions Table**
Stores quiz questions for each level with four multiple-choice options and the index of the correct answer (0-3). Includes an explanation field for educational feedback. Questions are linked to levels via foreign key.

**QuizAttempts Table**
Records every quiz attempt with the score achieved, time spent, and pass/fail status. This allows tracking improvement over multiple attempts and provides data for analytics.

---

## 7. API Design

### 7.1 Core Endpoints

**Authentication**
- `POST /api/v1/auth/register` - Create new user account with username, email, and password
- `POST /api/v1/auth/login` - Authenticate user and return JWT access token
- `GET /api/v1/auth/me` - Retrieve current authenticated user's information

**Levels**
- `GET /api/v1/levels` - Retrieve list of all available levels with basic information
- `GET /api/v1/levels/{id}` - Get detailed information for a specific level including content

**Progress**
- `GET /api/v1/progress` - Get current user's progress across all levels
- `POST /api/v1/progress` - Update progress for a specific level (score, completion status)

**Quiz**
- `GET /api/v1/quiz/{levelId}/questions` - Fetch quiz questions for a level (without correct answers)
- `POST /api/v1/quiz/{levelId}/submit` - Submit quiz answers and receive score with feedback

---

## 8. Security

### 8.1 Authentication & Authorization

The system uses JWT (JSON Web Tokens) for stateless authentication. Passwords are hashed using bcrypt, making them computationally expensive to crack. Tokens have a 60-minute expiration to limit the window of opportunity if a token is compromised. Protected endpoints verify the token signature and expiration before processing requests.

## 9. Development Setup

### 9.1 Environment Variables

The application uses environment variables for configuration to keep sensitive data out of the codebase:

**Database Configuration**
- `DATABASE_URL` - PostgreSQL connection string
- `DB_POOL_MIN_SIZE` - Minimum connections in the asyncpg pool (default: 10)
- `DB_POOL_MAX_SIZE` - Maximum connections in the asyncpg pool (default: 20)

**Security**
- `SECRET_KEY` - Secret key for JWT signing (minimum 32 characters)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token expiration time (default: 60)

**Application**
- `ENV` - Environment name (development/production)
- `DEBUG` - Enable debug mode for detailed error messages
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

**Frontend**
- `VITE_API_URL` - Backend API base URL for frontend to connect to

### 9.2 Local Development Workflow

**Backend Setup:**
1. Create a Python virtual environment to isolate dependencies
2. Install requirements from package lock (FastAPI, asyncpg, Pydantic, etc.)
3. Set up PostgreSQL database locally
4. Run database setup script to create schema
5. Start the FastAPI server

**Frontend Setup:**
1. Install Node.js dependencies using npm
2. Configure Vite to proxy API requests to the backend server
3. Start the Vite development server 

---

## 10. Testing Strategy

### 10.1 Backend Testing Approach

Unit tests will be used validate individual functions in isolation, particularly service layer methods. Integration tests verify that the API endpoints work correctly with the database. Tests use a separate test database that is reset before each test run to ensure consistency. Mock data is inserted for testing different scenarios (successful quiz submission, failed authentication, etc.).

Key areas to test:
- Authentication: registration, login, token validation
- Quiz scoring: correct calculation of scores and pass/fail determination
- Progress tracking: proper updating of completion status and scores
- Input validation: rejection of invalid data formats

---

## 11. Performance Considerations

### 11.1 Connection Pooling

The asyncpg connection pool maintains a set of reusable database connections. Creating a new database connection is expensive, so the pool keeps connections open and reuses them across requests. This significantly improves performance under load. Pool size is configurable based on expected traffic.

### 11.2 Frontend Asset Loading

The BootScene implements progressive asset loading with a loading bar to improve perceived performance. Essential assets load first, allowing the menu to display quickly. Level-specific assets are loaded on-demand when a level is selected rather than all at once on game start.

---

## 13. Future Extensibility

### 13.1 Additional Levels

The level system is designed for easy extension. New levels simply require:
- A new row in the levels table with incremented order_num
- Quiz questions for that level
- Frontend scene implementation
- Level content in the content_data JSONB field

### 13.2 Open Source Contributions

By hosting on GitHub with clear documentation, the architecture supports community contributions. Contributors can add new levels, improve existing content, or translate to other languages. The modular structure makes contributions easier to integrate.

