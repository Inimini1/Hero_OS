// views/suitcheck.js
// A departure checklist. Future: an NFC tag by the door triggers this view.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.suitcheck = {
  // ---- data layer ----

  addItem(name) {
    const s = HeroOS.state.current;
    s.suitCheck.items.push({ id: HeroOS.utils.uid('item'), name: name.trim(), checked: false });
    HeroOS.state.save();
  },

  removeItem(id) {
    const s = HeroOS.state.current;
    s.suitCheck.items = s.suitCheck.items.filter((i) => i.id !== id);
    HeroOS.state.save();
  },

  toggleItem(id) {
    const s = HeroOS.state.current;
    const item = s.suitCheck.items.find((i) => i.id === id);
    if (!item) return;
    item.checked = !item.checked;
    HeroOS.state.save();
  },

  moveItem(id, direction) {
    const s = HeroOS.state.current;
    const items = s.suitCheck.items;
    const index = items.findIndex((i) => i.id === id);
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    HeroOS.state.save();
  },

  resetChecks() {
    const s = HeroOS.state.current;
    s.suitCheck.items.forEach((i) => (i.checked = false));
    HeroOS.state.save();
  },

  // ---- UI layer ----

  render(root) {
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    const items = s.suitCheck.items;
    const allChecked = items.length > 0 && items.every((i) => i.checked);

    root.innerHTML = `
      <div class="view-header"><h1>Suit Check</h1></div>

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

    this._attachEvents(root);
  },

  _attachEvents(root) {
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
