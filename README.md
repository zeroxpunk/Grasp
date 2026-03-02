# Grasp

AI-powered adaptive learning platform. Describe what you want to learn — Grasp creates a full course with generated lessons, interactive exercises, a tutor chatbot, and a learner profile that adapts over time.

## Getting Started

```bash
pnpm install
```

Create `apps/web/.env.local`:

```
LEARNING_BASE_PATH=/path/to/data
ANTHROPIC_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
```

Run the web app:

```bash
pnpm dev:web
```

Run the desktop app:

```bash
pnpm dev:desktop
```

Run the backend:

```bash
pnpm dev:backend
```
