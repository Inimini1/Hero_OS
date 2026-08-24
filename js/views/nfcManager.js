// views/nfcManager.js
// Manage the 57 physical NFC tags: assign each one a name, action,
// location, and category. Generates the URL to program onto the tag.
//
// How this connects to the real world later:
//   1. Assign an action to a tag here (e.g. Tag 1 -> Focus Mode).
//   2. Click "Copy Link" to get its URL.
//   3. Use any phone NFC-writing app to write that URL onto the
//      physical tag.
//   4. Tapping the tag opens this URL, which jumps straight to Focus Mode.
// Reassigning the action in Hero OS later does NOT require rewriting
// the physical tag — the URL encodes the tag number, and Hero OS looks
// up the current action at the time it's tapped.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.nfcManager = {
  _filter: 'all', // all | assigned | unassigned
  _search: '',
  _editingId: null,

  // ---- data layer ----

  updateTag(id, changes) {
    const s = HeroOS.state.current;
    const tag = s.nfcTags.find((t) => t.id === id);
    if (!tag) return;
    Object.assign(tag, changes);
    HeroOS.state.save();
  },

  clearTag(id) {
    this.updateTag(id, { name: '', action: null, description: '', location: '', category: '' });
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    const actions = HeroOS.services.nfc.ACTIONS;

    let tags = s.nfcTags;
    if (this._filter === 'assigned') tags = tags.filter((t) => t.action);
    if (this._filter === 'unassigned') tags = tags.filter((t) => !t.action);
    if (this._search.trim()) {
      const q = this._search.toLowerCase();
      tags = tags.filter(
        (t) =>
          String(t.id).includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q)
      );
    }

    const assignedCount = s.nfcTags.filter((t) => t.action).length;

    root.innerHTML = `
      <div class="view-header"><h1>NFC Control</h1></div>

      <section class="panel">
        <p class="stat-line"><span class="stat-num">${assignedCount}</span> / ${s.nfcTags.length} tags assigned</p>
        <div class="toolbar">
          <input type="search" id="nfc-search" placeholder="Search by number, name, location&hellip;" value="${escapeHtml(this._search)}">
          <select id="nfc-filter">
            <option value="all" ${this._filter === 'all' ? 'selected' : ''}>All tags</option>
            <option value="assigned" ${this._filter === 'assigned' ? 'selected' : ''}>Assigned</option>
            <option value="unassigned" ${this._filter === 'unassigned' ? 'selected' : ''}>Unassigned</option>
          </select>
        </div>
      </section>

      <ul class="nfc-grid">
        ${tags.map((t) => this._tagCard(t, actions)).join('')}
      </ul>
    `;

    this._attachEvents(root, actions);
  },

  _tagCard(tag, actions) {
    const { escapeHtml } = HeroOS.utils;
    const isEditing = this._editingId === tag.id;
    const actionInfo = tag.action ? HeroOS.services.nfc.getAction(tag.action) : null;

    if (!isEditing) {
      return `
        <li class="nfc-card ${tag.action ? 'is-assigned' : 'is-unassigned'}" data-id="${tag.id}">
          <div class="nfc-card-number">TAG ${String(tag.id).padStart(3, '0')}</div>
          <div class="nfc-card-name">${tag.name ? escapeHtml(tag.name) : '<span class="text-muted">Unassigned</span>'}</div>
          <div class="nfc-card-action">${actionInfo ? escapeHtml(actionInfo.label) : '&mdash;'}</div>
          ${tag.location ? `<div class="nfc-card-location">${escapeHtml(tag.location)}</div>` : ''}
          <div class="nfc-card-actions">
            <button data-action="edit" class="btn btn-small">Edit</button>
            <button data-action="copy" class="btn btn-small" title="Copy this tag's Hero OS link — works even before an action is assigned">Copy Link</button>
          </div>
        </li>
      `;
    }

    return `
      <li class="nfc-card nfc-card-editing" data-id="${tag.id}">
        <div class="nfc-card-number">TAG ${String(tag.id).padStart(3, '0')}</div>
        <form data-action="save-form">
          <label>Name
            <input type="text" name="name" value="${escapeHtml(tag.name)}" placeholder="e.g. Desk Focus" maxlength="40">
          </label>
          <label>Action
            <select name="action">
              <option value="">No action</option>
              ${actions.map((a) => `<option value="${a.id}" ${tag.action === a.id ? 'selected' : ''}>${a.label}</option>`).join('')}
            </select>
          </label>
          <label>Location
            <input type="text" name="location" value="${escapeHtml(tag.location)}" placeholder="e.g. Desk" maxlength="40">
          </label>
          <label>Category
            <input type="text" name="category" value="${escapeHtml(tag.category)}" placeholder="e.g. Dorm" maxlength="30">
          </label>
          <label>Description
            <input type="text" name="description" value="${escapeHtml(tag.description)}" placeholder="Optional note" maxlength="100">
          </label>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-small">Save</button>
            <button type="button" data-action="cancel" class="btn btn-small">Cancel</button>
            <button type="button" data-action="clear" class="btn btn-small danger-btn">Clear Tag</button>
          </div>
        </form>
      </li>
    `;
  },

  _attachEvents(root, actions) {
    root.querySelector('#nfc-search').addEventListener('input', (e) => {
      this._search = e.target.value;
      this.render(root);
    });
    root.querySelector('#nfc-filter').addEventListener('change', (e) => {
      this._filter = e.target.value;
      this.render(root);
    });

    root.querySelectorAll('.nfc-card').forEach((card) => {
      const id = parseInt(card.dataset.id, 10);

      const editBtn = card.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          this._editingId = id;
          this.render(root);
        });
      }

      const copyBtn = card.querySelector('[data-action="copy"]');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => this._copyLink(id, copyBtn));
      }

      const form = card.querySelector('[data-action="save-form"]');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          this.updateTag(id, {
            name: fd.get('name').trim(),
            action: fd.get('action') || null,
            location: fd.get('location').trim(),
            category: fd.get('category').trim(),
            description: fd.get('description').trim(),
          });
          this._editingId = null;
          this.render(root);
        });
        form.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          this._editingId = null;
          this.render(root);
        });
        form.querySelector('[data-action="clear"]').addEventListener('click', () => {
          if (confirm(`Clear all data from Tag ${id}?`)) {
            this.clearTag(id);
            this._editingId = null;
            this.render(root);
          }
        });
      }
    });
  },

  _copyLink(id, button) {
    const link = HeroOS.services.nfc.buildDeepLink(id);
    const done = () => {
      const original = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => (button.textContent = original), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done).catch(() => prompt('Copy this link:', link));
    } else {
      prompt('Copy this link:', link);
    }
  },
};
