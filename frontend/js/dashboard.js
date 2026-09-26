// Placeholder — dashboard logic (stats, charts, import, settings) goes here.
/* =========================================================
   AI Hub — Dashboard logic
   -----------------------------------------------------------
   Everything on this page is computed from real local data:
   conversations created in the Chat Workspace (chat.js writes
   them to CHAT_STORAGE_KEY) and anything imported below (kept
   in IMPORT_STORAGE_KEY). Nothing here is a live AI provider
   connection — see the Platforms view for what "not connected"
   means and what changes once the backend exists.
   ========================================================= */

const CHAT_STORAGE_KEY = 'aihub_chat_conversations_v1'; // must match chat.js
const IMPORT_STORAGE_KEY = 'aihub_imported_conversations_v1';

const MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', vendor: 'OpenAI', color: 'var(--model-chatgpt)' },
  { id: 'claude',  name: 'Claude',  vendor: 'Anthropic', color: 'var(--model-claude)' },
  { id: 'gemini',  name: 'Gemini',  vendor: 'Google', color: 'var(--model-gemini)' },
];

/* ---------- data access ---------- */

function loadNativeConversations() {
  try { return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function loadImported() {
  try { return JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY)) || []; }
  catch (e) { return []; }
}
function saveImported(list) {
  try { localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(list)); }
  catch (e) { /* storage unavailable */ }
}

function messageCountOf(convo) {
  if (convo.mode === 'multi') {
    return Object.values(convo.panels || {}).reduce((sum, arr) => sum + arr.length, 0);
  }
  return (convo.messages || []).length;
}

function matchModelId(platformLabel) {
  const s = (platformLabel || '').toLowerCase();
  if (s.includes('chatgpt') || s.includes('openai') || s.includes('gpt')) return 'chatgpt';
  if (s.includes('claude') || s.includes('anthropic')) return 'claude';
  if (s.includes('gemini') || s.includes('google') || s.includes('bard')) return 'gemini';
  return null;
}

/* ---------- view switching ---------- */

const navItems = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.dash-view[data-view]');

function showView(name) {
  navItems.forEach(n => n.classList.toggle('is-active', n.dataset.view === name));
  views.forEach(v => v.classList.toggle('is-active', v.dataset.view === name));
  if (name === 'overview') renderOverview();
  if (name === 'conversations') renderConversationsView();
  if (name === 'platforms') renderPlatformCards(document.getElementById('platformCardsFull'));
  if (name === 'import') renderImportedTable();
  if (name === 'settings') renderSettingsProviders();
}
navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));

/* ---------- Overview ---------- */

function renderOverview() {
  const native = loadNativeConversations();
  const imported = loadImported();

  const totalConvos = native.length + imported.length;
  const totalMessages = native.reduce((sum, c) => sum + messageCountOf(c), 0)
                       + imported.reduce((sum, c) => sum + (c.messageCount || 0), 0);

  const activeModelIds = new Set();
  native.forEach(c => c.models.forEach(id => activeModelIds.add(id)));
  imported.forEach(c => { if (c.matchedModelId) activeModelIds.add(c.matchedModelId); });

  const lastActivityTs = Math.max(
    0,
    ...native.map(c => c.updatedAt || 0),
    ...imported.map(c => c.importedAt || 0)
  );

  document.getElementById('statGrid').innerHTML = `
    ${statCard('Total conversations', totalConvos, native.length + ' in AI Hub · ' + imported.length + ' imported')}
    ${statCard('Total messages', totalMessages, 'across all conversations')}
    ${statCard('Platforms used', `${activeModelIds.size} / ${MODELS.length}`, 'have at least one conversation')}
    ${statCard('Last activity', lastActivityTs ? relativeTime(lastActivityTs) : '—', lastActivityTs ? new Date(lastActivityTs).toLocaleString() : 'nothing yet')}
  `;

  renderActivityChart(native, imported);
  renderPlatformDistribution(native, imported);
  renderPlatformCards(document.getElementById('platformCardsOverview'));
}

function statCard(label, value, sub) {
  return `<div class="stat-card">
    <div class="stat-card__label">${label}</div>
    <div class="stat-card__value">${value}</div>
    <div class="stat-card__sub">${sub}</div>
  </div>`;
}

function relativeTime(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function renderActivityChart(native, imported) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const counts = days.map(day => {
    const next = new Date(day); next.setDate(next.getDate() + 1);
    const inRange = (ts) => ts >= day.getTime() && ts < next.getTime();
    return native.filter(c => inRange(c.updatedAt)).length
         + imported.filter(c => inRange(c.importedAt)).length;
  });

  const max = Math.max(1, ...counts);
  const el = document.getElementById('activityChart');

  if (counts.every(c => c === 0)) {
    el.innerHTML = `<div class="empty-chart">No activity yet — start a conversation in the Chat Workspace.</div>`;
    return;
  }

  el.innerHTML = `<div class="bar-chart">
    ${days.map((d, i) => `
      <div class="bar-chart__col">
        <div class="bar-chart__bar" style="height:${(counts[i] / max) * 100}%" title="${counts[i]} conversation${counts[i] === 1 ? '' : 's'}"></div>
        <div class="bar-chart__label">${d.toLocaleDateString(undefined, { weekday: 'short' })[0]}</div>
      </div>`).join('')}
  </div>`;
}

function renderPlatformDistribution(native, imported) {
  const counts = {};
  MODELS.forEach(m => counts[m.id] = 0);
  native.forEach(c => c.models.forEach(id => { if (counts[id] !== undefined) counts[id]++; }));
  imported.forEach(c => { if (c.matchedModelId && counts[c.matchedModelId] !== undefined) counts[c.matchedModelId]++; });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const el = document.getElementById('platformChart');

  if (total === 0) {
    el.innerHTML = `<div class="empty-chart">No conversations yet.</div>`;
    return;
  }

  el.innerHTML = MODELS.map(m => {
    const pct = Math.round((counts[m.id] / total) * 100);
    return `<div class="dist-row">
      <div class="dist-row__top">
        <span class="dist-row__name"><span class="dist-row__dot" style="background:${m.color}"></span>${m.name}</span>
        <span class="dist-row__count">${counts[m.id]} · ${pct}%</span>
      </div>
      <div class="dist-row__track"><div class="dist-row__fill" style="width:${pct}%;background:${m.color}"></div></div>
    </div>`;
  }).join('');
}

function renderPlatformCards(container) {
  if (!container) return;
  const native = loadNativeConversations();
  const imported = loadImported();

  container.innerHTML = MODELS.map(m => {
    const convoCount = native.filter(c => c.models.includes(m.id)).length
                      + imported.filter(c => c.matchedModelId === m.id).length;
    const msgCount = native.filter(c => c.models.includes(m.id)).reduce((s, c) => s + messageCountOf(c), 0);

    return `<div class="platform-card">
      <div class="platform-card__head">
        <span class="platform-card__dot" style="background:${m.color}"></span>
        <div>
          <div class="platform-card__name">${m.name}</div>
          <div class="platform-card__vendor">${m.vendor}</div>
        </div>
      </div>
      <div class="platform-card__status">
        <span class="platform-card__status-dot"></span>
        Not connected — mock mode
      </div>
      <div class="platform-card__stat"><strong>${convoCount}</strong> conversation${convoCount === 1 ? '' : 's'}</div>
      <div class="platform-card__stat"><strong>${msgCount}</strong> messages</div>
    </div>`;
  }).join('');
}

/* ---------- Conversations view ---------- */

function renderConversationsView() {
  renderConvoTable();
  document.getElementById('convoSearch').oninput = renderConvoTable;
  document.getElementById('convoFilter').onchange = renderConvoTable;
}

function renderConvoTable() {
  const q = (document.getElementById('convoSearch').value || '').toLowerCase();
  const filter = document.getElementById('convoFilter').value;

  const native = loadNativeConversations().map(c => ({
    id: c.id, title: c.title, models: c.models, mode: c.mode,
    updatedAt: c.updatedAt, source: 'native',
  }));
  const imported = loadImported().map(c => ({
    id: c.id, title: c.title, models: c.matchedModelId ? [c.matchedModelId] : [],
    mode: 'single', updatedAt: c.importedAt, source: 'imported', rawPlatform: c.platform,
  }));

  let rows = [...native, ...imported].sort((a, b) => b.updatedAt - a.updatedAt);
  rows = rows.filter(r => r.title.toLowerCase().includes(q));
  if (filter !== 'all') rows = rows.filter(r => r.models.includes(filter));

  const container = document.getElementById('convoTable');
  if (rows.length === 0) {
    container.innerHTML = `<div class="table-empty">No conversations match. Start one in the Chat Workspace, or import an export.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="convo-row convo-row--head">
      <span>Title</span><span>Platform</span><span>Updated</span><span></span>
    </div>
    ${rows.map(r => `
      <div class="convo-row">
        <span class="convo-row__title">${escapeHtml(r.title)}</span>
        <span class="convo-row__models">
          ${r.models.length
            ? r.models.map(id => modelDot(id)).join('')
            : `<span class="convo-row__badge">${escapeHtml(r.rawPlatform || 'Unknown')}</span>`}
          ${r.source === 'imported' ? '<span class="convo-row__badge">Imported</span>' : (r.mode === 'multi' ? '<span class="convo-row__badge">Compare</span>' : '')}
        </span>
        <span class="convo-row__date">${new Date(r.updatedAt).toLocaleDateString()}</span>
        ${r.source === 'native'
          ? `<a class="convo-row__open" href="chat.html?id=${encodeURIComponent(r.id)}">Open</a>`
          : `<span class="convo-row__open" style="opacity:.5;cursor:default;">View only</span>`}
      </div>`).join('')}
  `;
}

function modelDot(id) {
  const m = MODELS.find(mm => mm.id === id);
  return `<span class="convo-row__dot" style="background:${m ? m.color : '#888'}"></span>`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ---------- Import view ---------- */

const dropZone = document.getElementById('importDrop');
const fileInput = document.getElementById('importFile');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('is-dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('is-dragover');
  if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleImportFile(fileInput.files[0]);
});

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch (e) { alert('That file is not valid JSON.'); return; }
    if (!Array.isArray(data)) { alert('Expected a JSON array of conversations.'); return; }

    const imported = loadImported();
    let added = 0;
    data.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      imported.unshift({
        id: 'imp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        title: String(entry.title || 'Imported conversation').slice(0, 120),
        platform: String(entry.platform || 'Unknown'),
        matchedModelId: matchModelId(entry.platform),
        messageCount: Array.isArray(entry.messages) ? entry.messages.length : 0,
        importedAt: Date.now(),
      });
      added++;
    });

    saveImported(imported);
    fileInput.value = '';
    renderImportedTable();
    alert(added > 0 ? `Imported ${added} conversation${added === 1 ? '' : 's'}.` : 'No valid conversations found in that file.');
  };
  reader.readAsText(file);
}

function renderImportedTable() {
  const imported = loadImported();
  const container = document.getElementById('importedTable');
  if (imported.length === 0) {
    container.innerHTML = `<div class="table-empty">Nothing imported yet.</div>`;
    return;
  }
  container.innerHTML = `
    <div class="convo-row convo-row--head">
      <span>Title</span><span>Platform</span><span>Imported</span><span>Messages</span>
    </div>
    ${imported.map(c => `
      <div class="convo-row">
        <span class="convo-row__title">${escapeHtml(c.title)}</span>
        <span class="convo-row__models">
          ${c.matchedModelId ? modelDot(c.matchedModelId) : ''}
          <span class="convo-row__badge">${escapeHtml(c.platform)}</span>
        </span>
        <span class="convo-row__date">${new Date(c.importedAt).toLocaleDateString()}</span>
        <span class="convo-row__date">${c.messageCount}</span>
      </div>`).join('')}
  `;
}

/* ---------- Settings view ---------- */

function renderSettingsProviders() {
  MODELS.forEach(m => {
    const row = document.getElementById(`settingsProviderRow-${m.id}`);
    if (!row) return;
    row.innerHTML = `
      <div>
        <div class="settings-row__title">${m.name}</div>
        <div class="settings-row__desc">${m.vendor} · not connected</div>
      </div>
      <input class="provider-key-input" type="password" placeholder="API key — set on backend" disabled>
    `;
  });
}

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    conversations: loadNativeConversations(),
    imported: loadImported(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ai-hub-export.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('clearDataBtn').addEventListener('click', () => {
  if (!confirm('Delete all local conversation history and imports? This cannot be undone.')) return;
  localStorage.removeItem(CHAT_STORAGE_KEY);
  localStorage.removeItem(IMPORT_STORAGE_KEY);
  renderOverview();
  renderConvoTable();
  renderImportedTable();
});

/* ---------- init ---------- */
renderOverview();