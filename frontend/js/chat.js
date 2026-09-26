
/* ---------- 1. Model registry ----------
   This is the single source of truth for which AI platforms
   show up in the selector. Add a provider here and it appears
   in both Single and Compare mode automatically. */
const MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', vendor: 'OpenAI', color: 'var(--model-chatgpt)' },
  { id: 'claude',  name: 'Claude',  vendor: 'Anthropic', color: 'var(--model-claude)' },
  { id: 'gemini',  name: 'Gemini',  vendor: 'Google', color: 'var(--model-gemini)' },
];

/* ---------- 2. App state ---------- */
const state = {
  mode: 'single',              // 'single' | 'multi'
  singleModel: MODELS[0].id,
  multiSelected: new Set([MODELS[0].id, MODELS[1].id]),
  conversations: [],           // { id, title, mode, models, messages, updatedAt }
  activeConversationId: null,
};

const STORAGE_KEY = 'aihub_chat_conversations_v1';

/* ---------- 3. DOM refs ---------- */
const el = {
  historyList: document.getElementById('historyList'),
  historySearch: document.getElementById('historySearch'),
  newChatBtn: document.getElementById('newChatBtn'),
  modeButtons: document.querySelectorAll('.mode-switch__btn'),
  modelSelector: document.getElementById('modelSelector'),
  singleWindow: document.getElementById('singleChatWindow'),
  singleMessages: document.getElementById('singleMessages'),
  compareWindow: document.getElementById('compareWindow'),
  comparePanels: document.getElementById('comparePanels'),
  promptInput: document.getElementById('promptInput'),
  sendBtn: document.getElementById('sendBtn'),
  composerHint: document.getElementById('composerHint'),
};

/* ---------- 4. Persistence ---------- */
function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.conversations = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.conversations = [];
  }
}
function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
  } catch (e) { /* storage unavailable — fail silently, app still works in-memory */ }
}

/* ---------- 5. Conversation helpers ---------- */
function createConversation() {
  const convo = {
    id: 'c_' + Date.now(),
    title: 'New conversation',
    mode: state.mode,
    models: state.mode === 'single' ? [state.singleModel] : [...state.multiSelected],
    messages: [],          // single mode: [{role, modelId, text}]
    panels: {},            // multi mode: { [modelId]: [{role, text}] }
    updatedAt: Date.now(),
  };
  state.conversations.unshift(convo);
  state.activeConversationId = convo.id;
  saveConversations();
  return convo;
}

function getActiveConversation() {
  return state.conversations.find(c => c.id === state.activeConversationId) || null;
}

function titleFromPrompt(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > 42 ? clean.slice(0, 42) + '…' : clean || 'New conversation';
}

/* ---------- 6. Rendering: history sidebar ---------- */
function renderHistory(filter = '') {
  const q = filter.trim().toLowerCase();
  const list = state.conversations.filter(c => c.title.toLowerCase().includes(q));

  el.historyList.innerHTML = '';

  if (list.length === 0) {
    el.historyList.innerHTML = `<div class="history-item__empty">
      ${state.conversations.length === 0
        ? 'No conversations yet.<br>Start one below.'
        : 'No conversations match your search.'}
    </div>`;
    return;
  }

  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'history-item' + (c.id === state.activeConversationId ? ' is-active' : '');
    item.dataset.id = c.id;

    const modelDots = c.models.map(id => {
      const m = MODELS.find(mm => mm.id === id);
      return `<span class="history-item__dot" style="background:${m ? m.color : '#888'}"></span>`;
    }).join('');

    item.innerHTML = `
      <span class="history-item__title">${escapeHtml(c.title)}</span>
      <span class="history-item__meta">
        ${modelDots}
        <span>${c.mode === 'multi' ? 'Compare' : (MODELS.find(m => m.id === c.models[0])?.name || '')}</span>
      </span>`;
    item.addEventListener('click', () => openConversation(c.id));
    el.historyList.appendChild(item);
  });
}

function openConversation(id) {
  const convo = state.conversations.find(c => c.id === id);
  if (!convo) return;
  state.activeConversationId = id;
  state.mode = convo.mode;
  if (convo.mode === 'single') {
    state.singleModel = convo.models[0];
  } else {
    state.multiSelected = new Set(convo.models);
  }
  syncModeUI();
  renderModelSelector();
  renderHistory(el.historySearch.value);
  renderActiveConversation();
}

/* ---------- 7. Rendering: mode + model selector ---------- */
function syncModeUI() {
  el.modeButtons.forEach(btn => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', active);
  });
  el.singleWindow.hidden = state.mode !== 'single';
  el.compareWindow.hidden = state.mode !== 'multi';
  el.composerHint.textContent = state.mode === 'multi'
    ? 'Sending to all selected models — mock responses, not live API calls.'
    : 'Mock response mode — no AI provider is connected yet.';
}

function renderModelSelector() {
  el.modelSelector.innerHTML = '';

  if (state.mode === 'single') {
    const wrap = document.createElement('label');
    wrap.className = 'model-dropdown';
    const dot = document.createElement('span');
    dot.className = 'history-item__dot';
    const activeModel = MODELS.find(m => m.id === state.singleModel);
    dot.style.background = activeModel.color;

    const select = document.createElement('select');
    MODELS.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.vendor})`;
      if (m.id === state.singleModel) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      state.singleModel = select.value;
      renderModelSelector();
    });

    wrap.appendChild(dot);
    wrap.appendChild(select);
    el.modelSelector.appendChild(wrap);
    return;
  }

  // multi mode: one toggle chip per model
  MODELS.forEach(m => {
    const checked = state.multiSelected.has(m.id);
    const chip = document.createElement('label');
    chip.className = 'model-chip' + (checked ? ' is-checked' : '');
    chip.style.color = checked ? m.color : '';
    chip.innerHTML = `
      <input type="checkbox" ${checked ? 'checked' : ''}>
      <span class="model-chip__dot" style="background:${m.color}"></span>
      ${m.name}`;
    chip.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) state.multiSelected.add(m.id);
      else if (state.multiSelected.size > 1) state.multiSelected.add(m.id) && state.multiSelected.delete(m.id);
      else { e.target.checked = true; return; } // keep at least one model selected
      renderModelSelector();
    });
    el.modelSelector.appendChild(chip);
  });
}

/* ---------- 8. Rendering: messages ---------- */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function renderActiveConversation() {
  const convo = getActiveConversation();

  if (state.mode === 'single') {
    el.singleMessages.innerHTML = '';
    if (!convo || convo.messages.length === 0) {
      el.singleMessages.innerHTML = `<div class="empty-state">
        <h2>Start a conversation</h2>
        <p>Pick a model above and send a message. Responses here are mocked until a real API is wired up.</p>
      </div>`;
      return;
    }
    convo.messages.forEach(m => appendSingleMessage(m.role, m.text, m.modelId, false));
    el.singleMessages.scrollTop = el.singleMessages.scrollHeight;
  } else {
    buildComparePanels(convo ? convo.models : [...state.multiSelected]);
    if (convo) {
      convo.models.forEach(id => {
        (convo.panels[id] || []).forEach(m => appendComparePanelMessage(id, m.role, m.text, false));
      });
    }
  }
}

function appendSingleMessage(role, text, modelId, scroll = true) {
  const m = MODELS.find(mm => mm.id === modelId);
  const row = document.createElement('div');
  row.className = 'msg ' + (role === 'user' ? 'msg--user' : 'msg--ai');

  const bubbleWrap = document.createElement('div');
  if (role === 'ai') {
    const label = document.createElement('div');
    label.className = 'msg__label';
    label.innerHTML = `<span class="msg__label-dot" style="background:${m.color}"></span>${m.name}`;
    bubbleWrap.appendChild(label);
  }
  const bubble = document.createElement('div');
  bubble.className = 'msg__bubble';
  bubble.textContent = text;
  bubbleWrap.appendChild(bubble);

  row.appendChild(bubbleWrap);
  el.singleMessages.appendChild(row);
  if (scroll) el.singleMessages.scrollTop = el.singleMessages.scrollHeight;
}

function buildComparePanels(modelIds) {
  el.comparePanels.innerHTML = '';
  el.comparePanels.style.gridTemplateColumns = `repeat(${modelIds.length}, 1fr)`;
  modelIds.forEach(id => {
    const m = MODELS.find(mm => mm.id === id);
    const panel = document.createElement('div');
    panel.className = 'compare-panel';
    panel.dataset.model = id;
    panel.innerHTML = `
      <div class="compare-panel__head">
        <span class="compare-panel__dot" style="background:${m.color}"></span>
        ${m.name}
      </div>
      <div class="compare-panel__body" id="panel-${id}">
        <div class="compare-panel__placeholder">Waiting for a prompt…</div>
      </div>`;
    el.comparePanels.appendChild(panel);
  });
}

function appendComparePanelMessage(modelId, role, text, scroll = true) {
  const body = document.getElementById(`panel-${modelId}`);
  if (!body) return;
  const placeholder = body.querySelector('.compare-panel__placeholder');
  if (placeholder) placeholder.remove();

  const row = document.createElement('div');
  row.className = 'msg ' + (role === 'user' ? 'msg--user' : 'msg--ai');
  const bubble = document.createElement('div');
  bubble.className = 'msg__bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  body.appendChild(row);
  if (scroll) body.scrollTop = body.scrollHeight;
}

function showTypingIndicator(modelId) {
  const body = document.getElementById(`panel-${modelId}`);
  if (!body) return;
  const t = document.createElement('div');
  t.className = 'compare-panel__typing';
  t.id = `typing-${modelId}`;
  t.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(t);
  body.scrollTop = body.scrollHeight;
}
function removeTypingIndicator(modelId) {
  document.getElementById(`typing-${modelId}`)?.remove();
}

/* ---------- 9. Sending a prompt ---------- */
function handleSend() {
  const text = el.promptInput.value.trim();
  if (!text) return;

  let convo = getActiveConversation();
  const isNewConvo = !convo || convo.mode !== state.mode;
  if (isNewConvo) convo = createConversation();

  if (convo.messages.length === 0 && Object.keys(convo.panels).length === 0) {
    convo.title = titleFromPrompt(text);
  }
  convo.updatedAt = Date.now();

  el.promptInput.value = '';
  autoGrowTextarea();
  el.sendBtn.disabled = true;

  if (state.mode === 'single') {
    convo.messages.push({ role: 'user', text, modelId: null });
    appendSingleMessage('user', text, null);

    const modelId = state.singleModel;
    const typingRow = appendTypingBubbleSingle(modelId);

    mockReply(modelId, text).then(reply => {
      typingRow.remove();
      convo.messages.push({ role: 'ai', text: reply, modelId });
      appendSingleMessage('ai', reply, modelId);
      saveConversations();
      renderHistory(el.historySearch.value);
      el.sendBtn.disabled = false;
    });
  } else {
    convo.models.forEach(id => {
      if (!convo.panels[id]) convo.panels[id] = [];
      convo.panels[id].push({ role: 'user', text });
    });
    convo.models.forEach(id => appendComparePanelMessage(id, 'user', text));
    convo.models.forEach(id => showTypingIndicator(id));

    const pending = convo.models.map(id =>
      mockReply(id, text).then(reply => {
        removeTypingIndicator(id);
        convo.panels[id].push({ role: 'ai', text: reply });
        appendComparePanelMessage(id, 'ai', reply);
      })
    );

    Promise.all(pending).then(() => {
      saveConversations();
      renderHistory(el.historySearch.value);
      el.sendBtn.disabled = false;
    });
  }

  renderHistory(el.historySearch.value);
}

function appendTypingBubbleSingle(modelId) {
  const m = MODELS.find(mm => mm.id === modelId);
  const row = document.createElement('div');
  row.className = 'msg msg--ai';
  row.innerHTML = `
    <div>
      <div class="msg__label"><span class="msg__label-dot" style="background:${m.color}"></span>${m.name}</div>
      <div class="msg__bubble"><span class="compare-panel__typing"><span></span><span></span><span></span></span></div>
    </div>`;
  el.singleMessages.appendChild(row);
  el.singleMessages.scrollTop = el.singleMessages.scrollHeight;
  return row;
}

/* ---------- 10. Mock reply engine ----------
   Stand-in for a real API call. Each "voice" is just flavor
   text so Compare mode visibly differs model to model. Swap
   this for a real fetch() once a backend exists — see the
   BACKEND INTEGRATION note at the bottom of this file. */
const VOICES = {
  chatgpt: (p) => `Here's a straightforward take: ${lowerFirst(p)} — breaking it into a few clear steps usually helps, so I'd start with the basics and build up from there.`,
  claude:  (p) => `Good question. Thinking about "${p}" — I'd want to unpack the context a bit first, then walk through it carefully so nothing important gets glossed over.`,
  gemini:  (p) => `Quick summary on "${p}": there are a couple of angles worth considering, and I can go deeper on whichever one is most useful to you.`,
};
function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

function mockReply(modelId, prompt) {
  const delay = 500 + Math.random() * 900;
  return new Promise(resolve => {
    setTimeout(() => {
      const voice = VOICES[modelId] || ((p) => `Mock response to: ${p}`);
      resolve(voice(prompt) + '\n\n[mock response — no AI provider connected yet]');
    }, delay);
  });
}

/* ---------- 11. Composer UX ---------- */
function autoGrowTextarea() {
  el.promptInput.style.height = 'auto';
  el.promptInput.style.height = Math.min(el.promptInput.scrollHeight, 160) + 'px';
}

/* ---------- 12. Event wiring ---------- */
el.newChatBtn.addEventListener('click', () => {
  state.activeConversationId = null;
  renderActiveConversation();
  renderHistory(el.historySearch.value);
  el.promptInput.focus();
});

el.modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    state.activeConversationId = null; // switching mode starts a fresh conversation
    syncModeUI();
    renderModelSelector();
    renderActiveConversation();
    renderHistory(el.historySearch.value);
  });
});

el.historySearch.addEventListener('input', () => renderHistory(el.historySearch.value));

el.sendBtn.addEventListener('click', handleSend);
el.promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
el.promptInput.addEventListener('input', autoGrowTextarea);

/* ---------- 13. Init ---------- */
function init() {
  loadConversations();
  syncModeUI();
  renderModelSelector();
  renderHistory();
  renderActiveConversation();
}
init();

/* =========================================================
   BACKEND INTEGRATION — what changes when APIs are real
   -----------------------------------------------------------
   1. Replace mockReply(modelId, prompt) with a call to your
      backend, e.g.:

        async function mockReply(modelId, prompt) {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelId, prompt, conversationId: state.activeConversationId })
          });
          if (!res.ok) throw new Error('AI request failed');
          const data = await res.json();
          return data.reply;
        }

   2. The backend (Node/Express, per the project brief) is
      what should hold provider API keys and call each
      provider's real API — never put API keys in this file.
   3. Everything else (state, rendering, history, multi-panel
      layout) stays the same — this file already treats
      "get a reply for a model" as a single swappable function.
   ========================================================= */
