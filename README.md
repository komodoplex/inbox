# Komodoplex Messages

Message ingestion backend for Komodoplex and affiliated ventures, powered by Cloudflare Workers and Cloudflare D1.

## Overview

Accepts inbound contact forms, inquiries, and feedback from frontend surfaces securely, stores them in Cloudflare D1, and provides internal endpoints to manage conversations.

- **Public Ingestion**: Receives public submissions protected by Cloudflare Turnstile.
- **D1 Database**: Persists ventures, sources, conversations, and messages.
- **Internal API**: Provides endpoints to view conversation threads and update statuses.

## Endpoints

### Public
- `GET /health` - Checks worker health and database connectivity.
- `POST /v1/public/` - Ingests new inbound messages (requires valid payload and Turnstile token).

### Internal
- `GET /v1/internal/conversations` - Lists conversations (supports status and source filters, and pagination).
- `GET /v1/internal/conversations/:id` - Retrieves conversation details along with full message history.
- `POST /v1/internal/conversations/:id/messages` - Appends an outbound reply to a conversation.
- `PATCH /v1/internal/conversations/:id` - Updates conversation status (e.g. `resolved`, `closed`).
- `GET /v1/internal/sources` - Lists all registered sources and ventures.

## Development & Deployment

```bash
# Install dependencies
pnpm install

# Run worker locally
pnpm run dev

# Verify worker bundle build
pnpm run build

# Run test suite
pnpm run test

# Typecheck TypeScript
pnpm run typecheck

# Apply Cloudflare D1 migrations
pnpm run d1:migrate:local   # Local D1 database
pnpm run d1:migrate:remote  # Production D1 database

# Deploy to Cloudflare Workers
pnpm run deploy
```
