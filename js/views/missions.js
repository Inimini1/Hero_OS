// views/missions.js
// The task system. "Mission" is just the Hero OS word for a task.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.missions = {
  // in-memory UI state (not persisted — filters reset on reload, that's fine)
  _filterCategory: 'all',
  _filterStatus: 'active',
  _sortBy: 'due',
  _editingId: null,
  _modeOptions: {},

  // ---- data layer ----

  addMission({ title, description = '', category = 'Personal', priority = 'normal', dueDate = '', dueTime = '', tags = [] }) {
    const s = HeroOS.state.current;
    const mission = {
      id: HeroOS.utils.uid('m'),
      title: title.trim(),
      description,
      category,
      priority,
      dueDate,
      dueTime,
      tags,
      completed: false,
      createdAt: HeroOS.utils.nowISO(),
    };
    s.missions.push(mission);
    if (!s.primaryMissionId) s.primaryMissionId = mission.id;
    HeroOS.state.save();
    return mission;
  },

  updateMission(id, changes) {
    const s = HeroOS.state.current;
    const mission = s.missions.find((m) => m.id === id);
    if (!mission) return;
    Object.assign(mission, changes);
    HeroOS.state.save();
  },

  deleteMission(id) {
    const s = HeroOS.state.current;
    s.missions = s.missions.filter((m) => m.id !== id);
    if (s.primaryMissionId === id) s.primaryMissionId = null;
    HeroOS.state.save();
  },

  // Removes a mission immediately but keeps enough info to restore it,
  // and shows an undo toast instead of a blocking confirm() dialog.
  _deleteWithUndo(root, id) {
    const s = HeroOS.state.current;
    const index = s.missions.findIndex((m) => m.id === id);
    if (index === -1) return;
    const removed = s.missions[index];
    const wasPrimary = s.primaryMissionId === id;

    s.missions.splice(index, 1);
    if (wasPrimary) s.primaryMissionId = null;
    HeroOS.state.save();
    this.render(root, this._modeOptions);

    HeroOS.toast.show(`Deleted "${removed.title}"`, {
      onAction: () => {
        s.missions.splice(index, 0, removed);
        if (wasPrimary) s.primaryMissionId = removed.id;
        HeroOS.state.save();
        this.render(root, this._modeOptions);
      },
    });
  },

  toggleComplete(id) {
    const s = HeroOS.state.current;
    const mission = s.missions.find((m) => m.id === id);
    if (!mission) return;
    mission.completed = !mission.completed;
    HeroOS.state.save();
  },

  setPrimary(id) {
    const s = HeroOS.state.current;
    s.primaryMissionId = s.primaryMissionId === id ? null : id;
    HeroOS.state.save();
  },

  // ---- UI layer ----

  // `options` lets a "mode" screen (see views/modes.js) reuse this same
  // list with a different heading and a category locked in, instead of
  // duplicating the whole mission list UI.
  render(root, options) {
    this._modeOptions = options || {};
    const s = HeroOS.state.current;
    const { escapeHtml } = HeroOS.utils;
    const lockedCategories = this._modeOptions.lockedCategory
      ? [].concat(this._modeOptions.lockedCategory)
      : null;

    let list = [...s.missions];
    if (this._filterStatus === 'active') list = list.filter((m) => !m.completed);
    if (this._filterStatus === 'completed') list = list.filter((m) => m.completed);
    if (lockedCategories) {
      list = list.filter((m) => lockedCategories.includes(m.category));
    } else if (this._filterCategory !== 'all') {
      list = list.filter((m) => m.category === this._filterCategory);
    }

    const priorityRank = { high: 0, normal: 1, low: 2 };
    if (this._sortBy === 'due') {
      list.sort((a, b) => HeroOS.utils.dueSortKey(a.dueDate, a.dueTime).localeCompare(HeroOS.utils.dueSortKey(b.dueDate, b.dueTime)));
    } else if (this._sortBy === 'priority') {
      list.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    } else if (this._sortBy === 'created') {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    const categoryOptions = s.settings.missionCategories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join('');

    root.innerHTML = `
      <div class="view-header">
        <h1>${escapeHtml(this._modeOptions.title || 'Missions')}</h1>
        <button class="btn btn-primary" id="mission-new-btn">+ New Mission</button>
      </div>

      <div id="mission-form-wrap"></div>

      <div class="toolbar">
        <select id="filter-status">
          <option value="active" ${this._filterStatus === 'active' ? 'selected' : ''}>Active</option>
          <option value="completed" ${this._filterStatus === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="all" ${this._filterStatus === 'all' ? 'selected' : ''}>All</option>
        </select>
        ${
          lockedCategories
            ? ''
            : `<select id="filter-category">
                <option value="all">All categories</option>
                ${s.settings.missionCategories
                  .map((c) => `<option value="${escapeHtml(c)}" ${this._filterCategory === c ? 'selected' : ''}>${escapeHtml(c)}</option>`)
                  .join('')}
              </select>`
        }
        <select id="sort-by">
          <option value="due" ${this._sortBy === 'due' ? 'selected' : ''}>Sort: Due date</option>
          <option value="priority" ${this._sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
          <option value="created" ${this._sortBy === 'created' ? 'selected' : ''}>Sort: Created</option>
        </select>
      </div>

      <ul class="mission-list">
        ${
          list.length
            ? this._sortBy === 'due'
              ? this._renderGrouped(list, categoryOptions)
              : list.map((m) => this._missionRow(m, categoryOptions)).join('')
            : `<li class="empty-inline">No missions here. Create one to get started.</li>`
        }
      </ul>
    `;

    this._attachEvents(root, categoryOptions);
  },

  // Groups by due date (Things' Today/Upcoming/Anytime idea, in Hero
  // OS's own words) so "what needs to happen" and "what can wait" are
  // visually separated instead of one flat, equally-weighted list.
  _renderGrouped(list, categoryOptions) {
    const buckets = [
      { key: 'overdue', label: 'Overdue', items: [] },
      { key: 'today', label: 'Today', items: [] },
      { key: 'upcoming', label: 'Upcoming', items: [] },
      { key: 'someday', label: 'Someday', items: [] },
    ];
    const bucketKeyOf = (m) => {
      const state = HeroOS.utils.describeDueDate(m.dueDate).state;
      if (state === 'overdue') return 'overdue';
      if (state === 'today') return 'today';
      if (state === 'none') return 'someday';
      return 'upcoming';
    };
    list.forEach((m) => {
      buckets.find((b) => b.key === bucketKeyOf(m)).items.push(m);
    });
    return buckets
      .filter((b) => b.items.length)
      .map(
        (b) =>
          `<li class="mission-group-heading">${b.label} (${b.items.length})</li>` +
          b.items.map((m) => this._missionRow(m, categoryOptions)).join('')
      )
      .join('');
  },

  _missionRow(m, categoryOptions) {
    const { escapeHtml, describeDueDateTime } = HeroOS.utils;
    const due = describeDueDateTime(m.dueDate, m.dueTime);
    const isPrimary = m.id === HeroOS.state.current.primaryMissionId;
    return `
      <li class="mission-row ${m.completed ? 'is-completed' : ''} ${isPrimary ? 'is-primary' : ''}" data-id="${m.id}">
        <button class="check-btn" data-action="toggle" title="${m.completed ? 'Mark incomplete' : 'Mark complete'}">${m.completed ? '✓' : ''}</button>
        <div class="mission-row-body">
          <div class="mission-row-title">
            ${isPrimary ? '<span class="primary-star" title="Primary Mission">★</span>' : ''}
            ${escapeHtml(m.title)}
          </div>
          ${m.description ? `<div class="mission-row-desc">${escapeHtml(m.description)}</div>` : ''}
          <div class="mission-row-meta">
            <span class="badge badge-${m.category.toLowerCase()}">${escapeHtml(m.category)}</span>
            ${m.priority !== 'normal' ? `<span class="badge badge-priority-${m.priority}">${m.priority === 'high' ? 'High priority' : 'Low priority'}</span>` : ''}
            <span class="due due-${due.state}">${due.text}</span>
            ${m.tags && m.tags.length ? m.tags.map((t) => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('') : ''}
          </div>
        </div>
        <div class="mission-row-actions">
          <button data-action="primary" title="Set as Primary Mission">${isPrimary ? '★' : '☆'}</button>
          <button data-action="edit" title="Edit">✎</button>
          <button data-action="delete" title="Delete" class="danger-btn">✕</button>
        </div>
      </li>
    `;
  },

  _attachEvents(root, categoryOptions) {
    root.querySelector('#mission-new-btn').addEventListener('click', () => {
      this._editingId = 'new';
      this._renderForm(root, categoryOptions);
    });

    root.querySelector('#filter-status').addEventListener('change', (e) => {
      this._filterStatus = e.target.value;
      this.render(root, this._modeOptions);
    });
    const categoryFilterEl = root.querySelector('#filter-category');
    if (categoryFilterEl) {
      categoryFilterEl.addEventListener('change', (e) => {
        this._filterCategory = e.target.value;
        this.render(root, this._modeOptions);
      });
    }
    root.querySelector('#sort-by').addEventListener('change', (e) => {
      this._sortBy = e.target.value;
      this.render(root, this._modeOptions);
    });

    root.querySelectorAll('.mission-row').forEach((row) => {
      const id = row.dataset.id;
      row.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        this.toggleComplete(id);
        this.render(root, this._modeOptions);
      });
      row.querySelector('[data-action="primary"]').addEventListener('click', () => {
        this.setPrimary(id);
        this.render(root, this._modeOptions);
      });
      row.querySelector('[data-action="edit"]').addEventListener('click', () => {
        this._editingId = id;
        this._renderForm(root, categoryOptions);
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', () => {
        this._deleteWithUndo(root, id);
      });
    });
  },

  _renderForm(root, categoryOptions) {
    const wrap = root.querySelector('#mission-form-wrap');
    const s = HeroOS.state.current;
    const editing = this._editingId !== 'new' ? s.missions.find((m) => m.id === this._editingId) : null;
    const { escapeHtml } = HeroOS.utils;

    wrap.innerHTML = `
      <form class="panel form-panel" id="mission-form">
        <h3>${editing ? 'Edit Mission' : 'New Mission'}</h3>
        <label>Title
          <input type="text" name="title" required maxlength="120" value="${editing ? escapeHtml(editing.title) : ''}" placeholder="e.g. Finish SCM assignment">
        </label>
        <label>Description
          <textarea name="description" rows="2" placeholder="Optional details">${editing ? escapeHtml(editing.description) : ''}</textarea>
        </label>
        <div class="form-row">
          <label>Category
            <select name="category">${categoryOptions}</select>
          </label>
          <label>Priority
            <select name="priority">
              <option value="high">High</option>
              <option value="normal" selected>Normal</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>Due date
            <input type="date" name="dueDate" value="${editing ? editing.dueDate || '' : ''}">
          </label>
          <label>Due time
            <input type="time" name="dueTime" value="${editing ? editing.dueTime || '' : ''}">
          </label>
        </div>
        <label>Tags (comma separated)
          <input type="text" name="tags" value="${editing && editing.tags ? escapeHtml(editing.tags.join(', ')) : ''}" placeholder="e.g. urgent, group-project">
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Mission'}</button>
          <button type="button" class="btn" id="mission-form-cancel">Cancel</button>
        </div>
      </form>
    `;

    const defaultCategory = editing
      ? editing.category
      : ([].concat(this._modeOptions.lockedCategory || []))[0];
    if (defaultCategory) wrap.querySelector('select[name="category"]').value = defaultCategory;
    if (editing) wrap.querySelector('select[name="priority"]').value = editing.priority;

    wrap.querySelector('#mission-form-cancel').addEventListener('click', () => {
      this._editingId = null;
      wrap.innerHTML = '';
    });

    wrap.querySelector('#mission-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        title: fd.get('title').trim(),
        description: fd.get('description').trim(),
        category: fd.get('category'),
        priority: fd.get('priority'),
        dueDate: fd.get('dueDate'),
        dueTime: fd.get('dueTime'),
        tags: HeroOS.utils.parseTags(fd.get('tags')),
      };
      if (!data.title) return;

      if (editing) {
        this.updateMission(editing.id, data);
      } else {
        this.addMission(data);
      }
      this._editingId = null;
      this.render(root, this._modeOptions);
    });

    wrap.querySelector('input[name="title"]').focus();
  },
};
