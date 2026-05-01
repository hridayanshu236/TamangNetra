# TamangNetra

## Overview

TamangNetra is a single-project Next.js application for translation and language tools. The app is implemented inside the `frontend/` folder and includes:
- text translation and assistant flows
- document processing and multilingual export
- OCR/image translation support
- YouTube subtitle translation
- analytics, translation memory, and glossary helpers

## Repository Structure

- `.env` - local environment variables used by the app
- `frontend/` - Next.js application source code
  - `frontend/app/` - page and API route implementation
  - `frontend/src/components/` - reusable UI and feature components
  - `frontend/package.json` - frontend scripts and dependencies

## Local Setup

1. Install dependencies from the project root:
   ```bash
   cd TamangNetra/frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the app in your browser:
   ```text
   http://localhost:3000
   ```

## Environment Variables

The root `.env` file contains values used by the app. Example variables in this repository:

```env
TMT_TOKEN=team_xxxxxxxxx
FRONTEND_URL=http://localhost:5173
```

If additional environment variables are required, add them to `.env` or `frontend/.env` as needed.

## Available Scripts

From `frontend/`:

- `npm run dev` - start the Next.js development server
- `npm run build` - build the production app
- `npm run start` - run the production server after build
- `npm run lint` - run ESLint
- `npm run db:push` - push Prisma schema to the database
- `npm run db:generate` - generate Prisma client
- `npm run db:migrate` - run Prisma migrations
- `npm run db:reset` - reset Prisma migrations

## API Routes

The app provides internal API routes under `frontend/app/api/`, including:
- `/api/translate`
- `/api/youtube`
- `/api/tts`
- `/api/asr`
- `/api/process-file`
- `/api/export-bilingual`
- `/api/download`
- `/api/stats`
- `/api/assistant`

## Notes

- The frontend is built with Next.js 16, React 19, Tailwind CSS, Prisma, and a large component library.
- The current repository does not include a separate Python backend.
- Use the actual `frontend/` path for installs and commands.


