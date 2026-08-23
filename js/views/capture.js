// views/capture.js
// Fast, frictionless note-taking. This is meant to become an "external
// memory" — later, JARVIS (services/ai.js) can summarize or categorize
// these automatically.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.capture = {
  _search: '',
  _filterCategory: 'all',

  CATEGORIES: ['Idea', 'Reminder', 'School', 'Business', 'Thought'],

  // ---- data layer ----

  addCapture(text, category, tags) {
    const s = HeroOS.state.current;
    const capture = {
      id: HeroOS.utils.uid('cap'),
      text: text.trim(),
      category,
      tags,
      timestamp: HeroOS.utils.nowISO(),
    };
    s.captures.push(capture);
    HeroOS.state.save();
    return capture;
  },

  deleteCapture(id) {
    const s = HeroOS.state.current;
    s.captures = s.captures.filter((c) => c.id !== id);
    HeroOS.state.save();
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;

    let list = [...s.captures].reverse();
    if (this._filterCategory !== 'all') list = list.filter((c) => c.category === this._filterCategory);
    if (this._search.trim()) {
      const q = this._search.toLowerCase();
      list = list.filter((c) => c.text.toLowerCase().includes(q) || (c.tags || []).some((t) => t.toLowerCase().includes(q)));
    }

    root.innerHTML = `
      <div class="view-header"><h1>Quick Capture</h1></div>

      <section class="panel">
        <form id="capture-form">
          <textarea id="capture-text" rows="3" placeholder="Type anything you want to remember&hellip;" autofocus></textarea>
          <div class="form-row">
            <select id="capture-category">
              ${this.CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <input type="text" id="capture-tags" placeholder="tags, comma, separated">
            <button type="submit" class="btn btn-primary">Save (Ctrl+Enter)</button>
          </div>
        </form>
      </section>

      <div class="toolbar">
        <input type="search" id="capture-search" placeholder="Search captures&hellip;" value="${escapeHtml(this._search)}">
        <select id="capture-filter">
          <option value="all">All categories</option>
          ${this.CATEGORIES.map((c) => `<option value="${c}" ${this._filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>

      <ul class="capture-list">
        ${
          list.length
            ? list.map((c) => this._captureRow(c)).join('')
            : `<li class="empty-inline">No captures found.</li>`
        }
      </ul>
    `;

    this._attachEvents(root);
  },

  _captureRow(c) {
    const { escapeHtml } = HeroOS.utils;
    const date = new Date(c.timestamp);
    return `
      <li class="capture-row" data-id="${c.id}">
        <div class="capture-row-meta">
          <span class="badge badge-cap-${c.category.toLowerCase()}">${escapeHtml(c.category)}</span>
          <span class="text-muted">${HeroOS.utils.formatDateLong(date)} &middot; ${HeroOS.utils.formatTime(date)}</span>
        </div>
        <div class="capture-row-text">${escapeHtml(c.text)}</div>
        ${c.tags && c.tags.length ? `<div class="capture-row-tags">${c.tags.map((t) => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        <button class="danger-btn capture-delete" data-action="delete" title="Delete">✕</button>
      </li>
    `;
  },

  _attachEvents(root) {
    const form = root.querySelector('#capture-form');
    const textarea = root.querySelector('#capture-text');

    const submit = () => {
      const text = textarea.value.trim();
      if (!text) return;
      const category = root.querySelector('#capture-category').value;
      const tags = HeroOS.utils.parseTags(root.querySelector('#capture-tags').value);
      this.addCapture(text, category, tags);
      this.render(root);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit();
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
      }
    });

    root.querySelector('#capture-search').addEventListener('input', (e) => {
      this._search = e.target.value;
      this.render(root);
    });
    root.querySelector('#capture-filter').addEventListener('change', (e) => {
      this._filterCategory = e.target.value;
      this.render(root);
    });

    root.querySelectorAll('.capture-row').forEach((row) => {
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (confirm('Delete this capture?')) {
          this.deleteCapture(row.dataset.id);
          this.render(root);
        }
      });
    });
  },
};
