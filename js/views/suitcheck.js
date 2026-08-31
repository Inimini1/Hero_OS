// views/suitcheck.js
// A departure checklist — now supporting several named lists (e.g.
// "Backpack" vs "Gym Bag"), so different NFC tags/locations can each
// point at their own checklist later.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.suitcheck = {
  // ---- data layer ----

  _activeList() {
    const sc = HeroOS.state.current.suitCheck;
    return sc.lists.find((l) => l.id === sc.activeListId) || sc.lists[0];
  },

  // Public accessor — used by services/ai.js so JARVIS can answer
  // "suit check" without reaching into this view's internals.
  getActiveList() {
    return this._activeList();
  },

  addList(name) {
    const s = HeroOS.state.current;
    const list = { id: HeroOS.utils.uid('list'), name: name.trim(), items: [] };
    s.suitCheck.lists.push(list);
    s.suitCheck.activeListId = list.id;
    HeroOS.state.save();
  },

  renameList(id, name) {
    const list = HeroOS.state.current.suitCheck.lists.find((l) => l.id === id);
    if (!list || !name.trim()) return;
    list.name = name.trim();
    HeroOS.state.save();
  },

  deleteList(id) {
    const s = HeroOS.state.current;
    if (s.suitCheck.lists.length <= 1) return; // always keep at least one list
    s.suitCheck.lists = s.suitCheck.lists.filter((l) => l.id !== id);
    if (s.suitCheck.activeListId === id) {
      s.suitCheck.activeListId = s.suitCheck.lists[0].id;
    }
    HeroOS.state.save();
  },

  setActiveList(id) {
    HeroOS.state.current.suitCheck.activeListId = id;
    HeroOS.state.save();
  },

  addItem(name) {
    this._activeList().items.push({ id: HeroOS.utils.uid('item'), name: name.trim(), checked: false });
    HeroOS.state.save();
  },

  removeItem(id) {
    const list = this._activeList();
    list.items = list.items.filter((i) => i.id !== id);
    HeroOS.state.save();
  },

  toggleItem(id) {
    const item = this._activeList().items.find((i) => i.id === id);
    if (!item) return;
    item.checked = !item.checked;
    HeroOS.state.save();
  },

  moveItem(id, direction) {
    const items = this._activeList().items;
    const index = items.findIndex((i) => i.id === id);
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    HeroOS.state.save();
  },

  resetChecks() {
    this._activeList().items.forEach((i) => (i.checked = false));
    HeroOS.state.save();
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    const list = this._activeList();
    const items = list.items;
    const allChecked = items.length > 0 && items.every((i) => i.checked);

    root.innerHTML = `
      <div class="view-header"><h1>Suit Check</h1></div>

      <div class="toolbar suit-list-switcher">
        <select id="suit-list-select">
          ${s.suitCheck.lists
            .map((l) => `<option value="${l.id}" ${l.id === list.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`)
            .join('')}
        </select>
        <button class="btn btn-small" id="suit-list-add">+ New List</button>
        <button class="btn btn-small" id="suit-list-rename">Rename</button>
        <button class="btn btn-small danger-btn" id="suit-list-delete" ${s.suitCheck.lists.length <= 1 ? 'disabled' : ''}>Delete List</button>
      </div>

      <section class="panel ${allChecked ? 'ready-panel' : ''}">
        <div class="ready-status">${allChecked ? 'READY' : `${items.filter((i) => i.checked).length} / ${items.length} checked`}</div>

        <ul class="suit-list">
          ${items
            .map(
              (item, i) => `
            <li class="suit-item ${item.checked ? 'is-checked' : ''}" data-id="${item.id}">
              <label class="suit-check-label">
                <input type="checkbox" ${item.checked ? 'checked' : ''} data-action="toggle">
                <span>${escapeHtml(item.name)}</span>
              </label>
              <div class="suit-item-actions">
                <button data-action="up" title="Move up" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
                <button data-action="down" title="Move down" ${i === items.length - 1 ? 'disabled' : ''}>&darr;</button>
                <button data-action="remove" title="Remove" class="danger-btn">✕</button>
              </div>
            </li>
          `
            )
            .join('')}
        </ul>

        <form id="suit-add-form" class="inline-form">
          <input type="text" id="suit-add-input" placeholder="Add an item&hellip;" maxlength="60">
          <button type="submit" class="btn">Add</button>
        </form>

        <div class="form-actions">
          <button class="btn" id="suit-reset-btn">Reset Checklist</button>
        </div>
      </section>
    `;

    this._attachEvents(root, list);
  },

  _attachEvents(root, list) {
    root.querySelector('#suit-list-select').addEventListener('change', (e) => {
      this.setActiveList(e.target.value);
      this.render(root);
    });
    root.querySelector('#suit-list-add').addEventListener('click', () => {
      const name = prompt('Name for the new checklist:', '');
      if (name && name.trim()) {
        this.addList(name);
        this.render(root);
      }
    });
    root.querySelector('#suit-list-rename').addEventListener('click', () => {
      const name = prompt('Rename this checklist:', list.name);
      if (name && name.trim()) {
        this.renameList(list.id, name);
        this.render(root);
      }
    });
    root.querySelector('#suit-list-delete').addEventListener('click', () => {
      if (HeroOS.state.current.suitCheck.lists.length <= 1) return;
      if (confirm(`Delete the "${list.name}" checklist? This cannot be undone.`)) {
        this.deleteList(list.id);
        this.render(root);
      }
    });

    root.querySelectorAll('.suit-item').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-action="toggle"]').addEventListener('change', () => {
        this.toggleItem(id);
        this.render(root);
      });
      row.querySelector('[data-action="up"]').addEventListener('click', () => {
        this.moveItem(id, -1);
        this.render(root);
      });
      row.querySelector('[data-action="down"]').addEventListener('click', () => {
        this.moveItem(id, 1);
        this.render(root);
      });
      row.querySelector('[data-action="remove"]').addEventListener('click', () => {
        if (confirm('Remove this item from the checklist?')) {
          this.removeItem(id);
          this.render(root);
        }
      });
    });

    root.querySelector('#suit-add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = root.querySelector('#suit-add-input');
      if (input.value.trim()) {
        this.addItem(input.value);
        this.render(root);
      }
    });

    root.querySelector('#suit-reset-btn').addEventListener('click', () => {
      this.resetChecks();
      this.render(root);
    });
  },
};
