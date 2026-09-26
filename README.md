# AI Hub

A unified workspace for chatting with and comparing multiple AI models
(ChatGPT, Claude, Gemini) from one dashboard. Vanilla HTML/CSS/JS on the
frontend, no React. See `docs/project-brief.md` for the full spec.

## Folder structure

```
ai-hub/
├── frontend/
│   ├── pages/
│   │   ├── chat.html         ✅ built — Chat Workspace (single + compare mode)
│   │   └── dashboard.html    ⏳ placeholder — drop your existing prototype here
│   ├── css/
│   │   ├── chat.css          ✅ built
│   │   └── dashboard.css     ⏳ placeholder
│   ├── js/
│   │   ├── chat.js           ✅ built — mock responses, swap-in point noted at bottom
│   │   └── dashboard.js      ⏳ placeholder
│   └── assets/
│       └── icons/            (image/icon assets go here)
│
├── backend/                  ⏳ not started — Node/Express/MySQL per the brief
│   ├── src/
│   │   ├── routes/           API endpoints (e.g. /api/chat, /api/conversations)
│   │   ├── controllers/      request handling logic
│   │   ├── services/         AI provider calls, DB queries
│   │   ├── config/           DB connection, env loading
│   │   └── server.js         Express entry point (placeholder)
│   └── .env.example          copy to .env — API keys & DB URL live here, never in frontend/
│
├── docs/
│   └── project-brief.md      the original project spec
│
└── README.md                 this file
```

## Status

| Piece | Status |
|---|---|
| Chat Workspace (single-AI + compare mode, mock responses, local history) | ✅ Built |
| Dashboard (sidebar, stats, platform cards, charts, import, settings) | ⏳ Not yet added — was built earlier outside this structure; drop it into `frontend/pages/dashboard.html`, `frontend/css/dashboard.css`, `frontend/js/dashboard.js` |
| Backend (Express + MySQL, real AI API integration) | ⏳ Not started |

## Running the frontend right now

No build step — open `frontend/pages/chat.html` directly in a browser, or
serve the `frontend/` folder with any static server. Everything runs on
mock data until the backend exists.

## Why this layout

- `frontend/` and `backend/` are separated cleanly so the backend (and its
  API keys, per the brief's security requirements) never ships to the browser.
- `pages/css/js` are split by type rather than nesting a folder per page —
  simple to navigate with only vanilla JS and a handful of pages.
- Shared styles/logic (e.g. the dark/light theme toggle, sidebar nav) can
  later move into `frontend/css/shared.css` and `frontend/js/shared.js` once
  the dashboard exists and duplication becomes visible.
