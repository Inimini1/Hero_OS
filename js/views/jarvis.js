// views/jarvis.js
// Chat UI for JARVIS. All the "thinking" happens in services/ai.js —
// this file only handles displaying messages and the input box.
// Conversation history is session-only (in memory), per spec.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.jarvis = {
  _messages: [], // { role: 'user'|'jarvis', text }
  _sending: false,

  render(root) {
    const configured = HeroOS.services.ai.isConfigured();
    const { escapeHtml } = HeroOS.utils;

    root.innerHTML = `
      <div class="view-header"><h1>JARVIS</h1></div>

      ${
        !configured
          ? `<div class="panel notice-panel">No AI provider configured. Running in local command mode — try "today", "primary", or "add mission: &lt;title&gt;". Connect a real AI provider anytime in <a href="#/settings">Settings</a>.</div>`
          : ''
      }

      <section class="panel hud-frame chat-panel">
        <div class="hud-status-line"><span class="status-dot ${configured ? '' : 'is-muted'}" aria-hidden="true"></span>${configured ? 'JARVIS · AI PROVIDER CONNECTED' : 'JARVIS · LOCAL COMMAND MODE'}</div>
        <div class="chat-log" id="chat-log">
          ${
            this._messages.length
              ? this._messages.map((m) => this._bubble(m)).join('')
              : `<p class="empty-inline">Say something to JARVIS.</p>`
          }
        </div>
        <form id="chat-form" class="inline-form">
          <input type="text" id="chat-input" placeholder="Message JARVIS&hellip;" autocomplete="off">
          <button type="submit" class="btn btn-primary" ${this._sending ? 'disabled' : ''}>Send</button>
        </form>
      </section>
    `;

    const log = root.querySelector('#chat-log');
    log.scrollTop = log.scrollHeight;

    root.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this._send(root);
    });
    root.querySelector('#chat-input').focus();
  },

  _bubble(m) {
    const { escapeHtml } = HeroOS.utils;
    return `<div class="chat-bubble chat-bubble-${m.role}"><span class="chat-role">${m.role === 'user' ? 'You' : 'JARVIS'}</span>${escapeHtml(m.text)}</div>`;
  },

  async _send(root) {
    const input = root.querySelector('#chat-input');
    const text = input.value.trim();
    if (!text || this._sending) return;

    const history = this._messages.slice(); // before the new message is added
    this._messages.push({ role: 'user', text });
    input.value = '';
    this._sending = true;
    this.render(root);

    const reply = await HeroOS.services.ai.sendMessage(text, history);
    this._messages.push({ role: 'jarvis', text: reply });
    this._sending = false;
    this.render(root);
  },
};
