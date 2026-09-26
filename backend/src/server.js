require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chat.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);

// Serve the frontend from this same server, so chat.js's fetch('/api/chat')
// works with a plain relative path — no separate frontend server needed.
// (You can still serve frontend/ with a different tool if you prefer; just
// update the URL in chat.js's askBackend() to point at this server instead.)
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

app.get('/health', (req, res) => res.json({ ok: true }));

// Lets the dashboard show real connection status without ever exposing the
// keys themselves — just whether each one is set.
app.get('/api/providers', (req, res) => {
  res.json({
    chatgpt: Boolean(process.env.OPENAI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GOOGLE_API_KEY),
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI Hub backend running at http://localhost:${4000}`);
  console.log(`Dashboard:      http://localhost:${4000}/pages/dashboard.html`);
  console.log(`Chat Workspace: http://localhost:${4000}/pages/chat.html`);
});