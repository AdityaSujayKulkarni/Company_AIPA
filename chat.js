/* chat.js — QueryMind Frontend Logic */

const API = '';  // Same origin

// ── State ───────────────────────────────────────────────────────────────────
let currentSessionId = null;
let isThinking = false;

// ── DOM ──────────────────────────────────────────────────────────────────────
const chatArea     = document.getElementById('chatArea');
const messages     = document.getElementById('messages');
const welcome      = document.getElementById('welcome');
const queryInput   = document.getElementById('queryInput');
const btnSend      = document.getElementById('btnSend');
const btnNewChat   = document.getElementById('btnNewChat');
const historyList  = document.getElementById('historyList');
const schemaTree   = document.getElementById('schemaTree');
const chatTitle    = document.getElementById('chatTitle');
const statusPill   = document.getElementById('statusPill');
const statusText   = document.getElementById('statusText');
const sidebar      = document.getElementById('sidebar');
const btnSidebarToggle = document.getElementById('btnSidebarToggle');
const schemaToggle = document.getElementById('schemaToggle');

// ── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(val) {
  if (val === null || val === undefined) return '<span style="color:var(--text-3);font-style:italic">null</span>';
  const s = String(val);
  // Format numbers with commas if purely numeric
  if (/^-?\d+(\.\d+)?$/.test(s) && s.length > 3) {
    const n = parseFloat(s);
    if (Number.isInteger(n)) return n.toLocaleString('en-IN');
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return escapeHtml(s.length > 60 ? s.slice(0, 57) + '…' : s);
}

function highlightSQL(sql) {
  const keywords = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|LIKE|BETWEEN|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|COALESCE|CASE|WHEN|THEN|ELSE|END|NULL|IS|BY|ASC|DESC|WITH|UNION|ALL|EXISTS|REFERENCES|AUTOINCREMENT|PRIMARY KEY)\b/gi;
  const strings = /'([^']*)'/g;
  const numbers = /\b(\d+(\.\d+)?)\b/g;

  let out = escapeHtml(sql);
  // Replace SQL strings first (to avoid re-processing)
  out = out.replace(/&#39;([^&#]*)&#39;/g, (m, s) => `<span class="sql-str">'${s}'</span>`);
  out = out.replace(strings, (m, s) => `<span class="sql-str">'${escapeHtml(s)}'</span>`);
  out = out.replace(keywords, m => `<span class="sql-kw">${m}</span>`);
  out = out.replace(numbers, m => `<span class="sql-num">${m}</span>`);
  return out;
}

function setStatus(state, text) {
  statusPill.className = `status-pill ${state}`;
  statusText.textContent = text;
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

// ── Schema ───────────────────────────────────────────────────────────────────
async function loadSchema() {
  try {
    const res = await fetch(`${API}/api/schema`);
    const schema = await res.json();
    renderSchema(schema);
  } catch (e) {
    schemaTree.innerHTML = '<div class="loading-small" style="color:var(--danger)">Failed to load schema</div>';
  }
}

function renderSchema(schema) {
  schemaTree.innerHTML = '';
  const tables = Object.keys(schema).sort();
  tables.forEach(tbl => {
    const cols = schema[tbl];
    const div = document.createElement('div');
    div.className = 'schema-table';

    const header = document.createElement('div');
    header.className = 'schema-table-header';
    header.innerHTML = `
      <span class="schema-table-icon">🗂</span>
      <span class="schema-table-name">${escapeHtml(tbl)}</span>
      <svg class="schema-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    `;

    const colDiv = document.createElement('div');
    colDiv.className = 'schema-cols';
    cols.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'schema-col';
      colEl.innerHTML = `
        <span class="schema-col-name">${escapeHtml(col.name)}</span>
        <span class="schema-col-type">${escapeHtml(col.type || 'TEXT')}</span>
        ${col.pk ? '<span class="schema-col-pk">PK</span>' : ''}
      `;
      colDiv.appendChild(colEl);
    });

    header.addEventListener('click', () => {
      const chev = header.querySelector('.schema-chevron');
      const isOpen = colDiv.classList.toggle('open');
      chev.classList.toggle('open', isOpen);
    });

    div.appendChild(header);
    div.appendChild(colDiv);
    schemaTree.appendChild(div);
  });
}

// ── History ───────────────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch(`${API}/api/history`);
    const data = await res.json();
    renderHistory(data.sessions || {});
  } catch (e) {
    /* silent */
  }
}

function renderHistory(sessions) {
  historyList.innerHTML = '';
  const ids = Object.keys(sessions);
  if (!ids.length) {
    historyList.innerHTML = '<div class="empty-state-small">No sessions yet</div>';
    return;
  }
  ids.forEach(sid => {
    const s = sessions[sid];
    const item = document.createElement('div');
    item.className = `history-item${sid === currentSessionId ? ' active' : ''}`;
    item.dataset.sid = sid;
    item.innerHTML = `
      <span class="history-icon">💬</span>
      <span class="history-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
      <button class="btn-delete-session" title="Delete session">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    `;
    item.querySelector('.btn-delete-session').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSession(sid);
    });
    item.addEventListener('click', () => loadSession(sid));
    historyList.appendChild(item);
  });
}

async function deleteSession(sid) {
  await fetch(`${API}/api/history/${sid}`, { method: 'DELETE' });
  if (sid === currentSessionId) newChat();
  await loadHistory();
}

async function loadSession(sid) {
  currentSessionId = sid;
  try {
    const res = await fetch(`${API}/api/history/${sid}`);
    const session = await res.json();
    messages.innerHTML = '';
    welcome.classList.add('hidden');

    chatTitle.textContent = session.title || 'Session';
    updateActiveHistory(sid);

    // Replay messages
    session.messages.forEach(msg => {
      if (msg.role === 'user') {
        appendUserBubble(msg.content);
      } else {
        appendAICard({
          sql: msg.sql,
          sql_type: msg.sql_type,
          columns: msg.columns || [],
          rows: [],   // don't re-show full data rows in replayed history
          row_count: msg.row_count || 0,
          rows_affected: msg.rows_affected || 0,
          error: msg.error
        }, true);
      }
    });
    scrollToBottom();
  } catch (e) { /* silent */ }
}

function updateActiveHistory(sid) {
  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.dataset.sid === sid);
  });
}

// ── Chat ──────────────────────────────────────────────────────────────────────
function newChat() {
  currentSessionId = null;
  messages.innerHTML = '';
  welcome.classList.remove('hidden');
  chatTitle.textContent = 'New Conversation';
  updateActiveHistory(null);
  queryInput.focus();
}

function scrollToBottom() {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

function appendUserBubble(text) {
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  messages.appendChild(div);
  scrollToBottom();
}

function showTyping() {
  const el = document.createElement('div');
  el.id = 'typingIndicator';
  el.className = 'typing-indicator';
  el.innerHTML = `
    <span class="typing-text">QueryMind is thinking</span>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messages.appendChild(el);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

function appendAICard(data, isReplay = false) {
  const { sql, sql_type, columns, rows, row_count, rows_affected, error } = data;

  const card = document.createElement('div');
  card.className = 'msg msg-ai';

  // Determine badge
  let badgeClass = 'badge-select', badgeLabel = sql_type || 'QUERY';
  if (error) { badgeClass = 'badge-error'; badgeLabel = 'ERROR'; }
  else if (sql_type === 'INSERT') badgeClass = 'badge-insert';
  else if (sql_type === 'UPDATE') badgeClass = 'badge-update';
  else if (sql_type === 'DELETE') badgeClass = 'badge-delete';

  let bodyHTML = '';

  if (error && !sql) {
    // Pure error (no SQL generated)
    bodyHTML = `
      <div class="error-card">
        <span>⚠️</span>
        <span>${escapeHtml(error)}</span>
      </div>
    `;
  } else {
    // SQL block
    if (sql) {
      bodyHTML += `
        <div class="sql-block">
          <div class="sql-block-header">
            <span>⚡ GENERATED SQL</span>
            <button class="btn-copy" onclick="copySql(this, ${JSON.stringify(escapeHtml(sql))})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          </div>
          <div class="sql-code">${highlightSQL(sql)}</div>
        </div>
      `;
    }

    if (error) {
      // SQL was generated but execution failed
      bodyHTML += `
        <div class="mutation-result error">
          <span>⚠️</span>
          <span>${escapeHtml(error)}</span>
        </div>
      `;
    } else if (sql_type === 'SELECT') {
      if (!isReplay && rows && rows.length > 0) {
        // Results summary
        bodyHTML += `
          <div class="result-summary">
            <span class="result-icon">📋</span>
            <span><span class="result-count">${row_count.toLocaleString()}</span> row${row_count !== 1 ? 's' : ''} returned</span>
          </div>
        `;
        // Table
        const headerRow = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
        const bodyRows = rows.slice(0, 200).map(row =>
          `<tr>${columns.map((_, i) => `<td>${formatValue(row[i])}</td>`).join('')}</tr>`
        ).join('');
        bodyHTML += `
          <div class="result-table-wrap">
            <table class="result-table">
              <thead><tr>${headerRow}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>
        `;
        if (rows.length > 200) {
          bodyHTML += `<p style="font-size:0.75rem;color:var(--text-3);text-align:center">Showing first 200 of ${row_count} rows</p>`;
        }
      } else if (!isReplay && row_count === 0) {
        bodyHTML += `<div class="result-summary">📭 No results found for this query.</div>`;
      } else if (isReplay) {
        bodyHTML += `<div class="result-summary"><span class="result-icon">📋</span><span><span class="result-count">${row_count.toLocaleString()}</span> row${row_count !== 1 ? 's' : ''} (from history)</span></div>`;
      }
    } else {
      // Mutation
      bodyHTML += `
        <div class="mutation-result success">
          <span>✅</span>
          <span><strong>${rows_affected}</strong> row${rows_affected !== 1 ? 's' : ''} affected by ${sql_type}.</span>
        </div>
      `;
    }
  }

  card.innerHTML = `
    <div class="ai-card">
      <div class="ai-card-header">
        <div class="ai-avatar">🤖</div>
        <span class="ai-name">QueryMind</span>
        <span class="ai-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="ai-card-body">${bodyHTML}</div>
    </div>
  `;
  messages.appendChild(card);
  scrollToBottom();
}

async function sendMessage() {
  const text = queryInput.value.trim();
  if (!text || isThinking) return;

  isThinking = true;
  btnSend.disabled = true;
  setStatus('thinking', 'Thinking…');

  // Hide welcome, show message
  welcome.classList.add('hidden');
  appendUserBubble(text);

  // Set title on first message of a new chat
  if (!currentSessionId) {
    chatTitle.textContent = text.length > 50 ? text.slice(0, 47) + '…' : text;
  }

  queryInput.value = '';
  queryInput.style.height = 'auto';
  showTyping();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, session_id: currentSessionId })
    });

    const data = await res.json();
    hideTyping();

    if (!currentSessionId && data.session_id) {
      currentSessionId = data.session_id;
    }

    appendAICard(data);
    await loadHistory();  // Refresh sidebar
    updateActiveHistory(currentSessionId);

    setStatus('', 'Ready');
  } catch (e) {
    hideTyping();
    appendAICard({ sql: null, sql_type: null, error: 'Network error: ' + e.message, columns: [], rows: [], row_count: 0, rows_affected: 0 });
    setStatus('error', 'Error');
  }

  isThinking = false;
  btnSend.disabled = false;
  queryInput.focus();
}

function copySql(btn, sql) {
  // Unescape HTML entities
  const txt = sql.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
  navigator.clipboard.writeText(txt).then(() => {
    btn.textContent = '✓ Copied';
    setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy'; }, 2000);
  });
}

// ── Event Listeners ──────────────────────────────────────────────────────────
btnSend.addEventListener('click', sendMessage);

queryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

queryInput.addEventListener('input', () => autoResize(queryInput));

btnNewChat.addEventListener('click', newChat);

btnSidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

schemaToggle.addEventListener('click', () => {
  const tree = document.getElementById('schemaTree');
  const chev = schemaToggle.querySelector('.chevron');
  const isHidden = tree.style.display === 'none';
  tree.style.display = isHidden ? '' : 'none';
  chev.classList.toggle('open', isHidden);
});

// Example chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    queryInput.value = chip.dataset.q;
    autoResize(queryInput);
    queryInput.focus();
    sendMessage();
  });
});

// ── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  await Promise.all([loadSchema(), loadHistory()]);
  queryInput.focus();
})();
