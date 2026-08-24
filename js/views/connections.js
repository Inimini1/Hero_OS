// views/connections.js
// People, not productivity. This is NOT a CRM — no scores, no pipeline,
// just enough memory to actually follow through: who, where you met,
// when you last talked, and something worth remembering.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.connections = {
  _editingId: null,

  // ---- data layer ----

  addConnection({ name, whereWeMet = '', note = '', reminderDate = '', lastInteraction = '' }) {
    const s = HeroOS.state.current;
    const connection = {
      id: HeroOS.utils.uid('conn'),
      name: name.trim(),
      whereWeMet,
      note,
      reminderDate,
      lastInteraction,
      createdAt: HeroOS.utils.nowISO(),
    };
    s.connections.push(connection);
    HeroOS.state.save();
    return connection;
  },

  updateConnection(id, changes) {
    const s = HeroOS.state.current;
    const c = s.connections.find((c) => c.id === id);
    if (!c) return;
    Object.assign(c, changes);
    HeroOS.state.save();
  },

  logInteractionToday(id) {
    this.updateConnection(id, { lastInteraction: HeroOS.utils.todayStr(), reminderDate: '' });
  },

  _deleteWithUndo(root, id) {
    const s = HeroOS.state.current;
    const index = s.connections.findIndex((c) => c.id === id);
    if (index === -1) return;
    const removed = s.connections[index];
    s.connections.splice(index, 1);
    HeroOS.state.save();
    this.render(root);
    HeroOS.toast.show(`Removed "${removed.name}"`, {
      onAction: () => {
        s.connections.splice(index, 0, removed);
        HeroOS.state.save();
        this.render(root);
      },
    });
  },

  // Connections with a reminder date today or earlier — used by the
  // dashboard nudge too, so both stay in sync with one source of truth.
  due() {
    const today = HeroOS.utils.todayStr();
    return HeroOS.state.current.connections.filter((c) => c.reminderDate && c.reminderDate <= today);
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    const list = [...s.connections].sort((a, b) => {
      const aDue = a.reminderDate && a.reminderDate <= HeroOS.utils.todayStr();
      const bDue = b.reminderDate && b.reminderDate <= HeroOS.utils.todayStr();
      if (aDue !== bDue) return aDue ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    root.innerHTML = `
      <div class="view-header">
        <h1>Connections</h1>
        <button class="btn btn-primary" id="connection-new-btn">+ Add Person</button>
      </div>

      <div id="connection-form-wrap"></div>

      <ul class="connections-list">
        ${
          list.length
            ? list.map((c) => this._card(c)).join('')
            : `<li class="empty-inline">No one here yet. Add someone you don't want to lose touch with.</li>`
        }
      </ul>
    `;

    this._attachEvents(root);
  },

  _card(c) {
    const { escapeHtml } = HeroOS.utils;
    const isDue = c.reminderDate && c.reminderDate <= HeroOS.utils.todayStr();
    const initial = c.name.trim().charAt(0).toUpperCase() || '?';
    return `
      <li class="connection-card ${isDue ? 'has-reminder' : ''}" data-id="${c.id}">
        <div class="connection-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
        <div class="connection-body">
          <div class="connection-name">${escapeHtml(c.name)}</div>
          <div class="connection-meta">
            ${c.whereWeMet ? escapeHtml(c.whereWeMet) : 'Where you met not set'}
            ${c.lastInteraction ? ` &middot; last talked ${escapeHtml(c.lastInteraction)}` : ''}
          </div>
          ${c.note ? `<div class="connection-note">${escapeHtml(c.note)}</div>` : ''}
          ${isDue ? `<div class="connection-reminder">&#9679; worth reaching out</div>` : ''}
        </div>
        <div class="connection-actions">
          <button data-action="log" title="Mark that you talked today">&#10003;</button>
          <button data-action="edit" title="Edit">&#9998;</button>
          <button data-action="delete" title="Remove" class="danger-btn">&#10005;</button>
        </div>
      </li>
    `;
  },

  _attachEvents(root) {
    root.querySelector('#connection-new-btn').addEventListener('click', () => {
      this._editingId = 'new';
      this._renderForm(root);
    });

    root.querySelectorAll('.connection-card').forEach((card) => {
      const id = card.dataset.id;
      card.querySelector('[data-action="log"]').addEventListener('click', () => {
        this.logInteractionToday(id);
        this.render(root);
      });
      card.querySelector('[data-action="edit"]').addEventListener('click', () => {
        this._editingId = id;
        this._renderForm(root);
      });
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        this._deleteWithUndo(root, id);
      });
    });
  },

  _renderForm(root) {
    const wrap = root.querySelector('#connection-form-wrap');
    const s = HeroOS.state.current;
    const editing = this._editingId !== 'new' ? s.connections.find((c) => c.id === this._editingId) : null;
    const { escapeHtml } = HeroOS.utils;

    wrap.innerHTML = `
      <form class="panel form-panel" id="connection-form">
        <h3>${editing ? 'Edit Person' : 'Add Person'}</h3>
        <label>Name
          <input type="text" name="name" required maxlength="80" value="${editing ? escapeHtml(editing.name) : ''}" placeholder="e.g. Mom & Dad">
        </label>
        <label>Where you met
          <input type="text" name="whereWeMet" maxlength="100" value="${editing ? escapeHtml(editing.whereWeMet) : ''}" placeholder="e.g. Tennis club, business event">
        </label>
        <label>Something worth remembering
          <textarea name="note" rows="2" placeholder="Optional — a detail, an inside joke, what they're working on">${editing ? escapeHtml(editing.note) : ''}</textarea>
        </label>
        <div class="form-row">
          <label>Last interaction date
            <input type="date" name="lastInteraction" value="${editing ? editing.lastInteraction || '' : ''}">
          </label>
          <label>Gentle reminder date
            <input type="date" name="reminderDate" value="${editing ? editing.reminderDate || '' : ''}">
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Add Person'}</button>
          <button type="button" class="btn" id="connection-form-cancel">Cancel</button>
        </div>
      </form>
    `;

    wrap.querySelector('#connection-form-cancel').addEventListener('click', () => {
      this._editingId = null;
      wrap.innerHTML = '';
    });

    wrap.querySelector('#connection-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        name: fd.get('name').trim(),
        whereWeMet: fd.get('whereWeMet').trim(),
        note: fd.get('note').trim(),
        reminderDate: fd.get('reminderDate'),
        lastInteraction: fd.get('lastInteraction'),
      };
      if (!data.name) return;

      if (editing) {
        this.updateConnection(editing.id, data);
      } else {
        this.addConnection(data);
      }
      this._editingId = null;
      this.render(root);
    });

    wrap.querySelector('input[name="name"]').focus();
  },
};
