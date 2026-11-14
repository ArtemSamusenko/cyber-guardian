# Cyber Guardian frontend

Phaser 3 and TypeScript game client. Needs the backend running on http://localhost:8000 (change it with `VITE_API_URL`).

## Commands

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

## Structure

```
src/
├── main.ts
├── game.ts               # Phaser config and scene list
├── api/                  # API client and Zod schemas
├── audio/AudioManager.ts
├── effects/              # transitions and effects
└── scenes/               # menu, login, register, level select, story, gameplay, quiz, progress, settings
```
