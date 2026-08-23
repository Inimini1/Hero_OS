// toast.js
// A small "snackbar" notification, used mainly for delete + undo.
// Deleting immediately (instead of a confirm() popup) feels faster,
// and the undo window makes it just as safe.

window.HeroOS = window.HeroOS || {};

HeroOS.toast = {
  _timeoutId: null,

  // options: { actionLabel, onAction, duration }
  show(message, options) {
    options = options || {};
    const container = document.getElementById('toast-container');
    if (!container) return;

    clearTimeout(this._timeoutId);

    container.innerHTML = `
      <div class="toast">
        <span>${HeroOS.utils.escapeHtml(message)}</span>
        ${options.onAction ? `<button class="toast-action">${HeroOS.utils.escapeHtml(options.actionLabel || 'Undo')}</button>` : ''}
      </div>
    `;

    if (options.onAction) {
      container.querySelector('.toast-action').addEventListener('click', () => {
        options.onAction();
        this.hide();
      });
    }

    this._timeoutId = setTimeout(() => this.hide(), options.duration || 6000);
  },

  hide() {
    const container = document.getElementById('toast-container');
    if (container) container.innerHTML = '';
    clearTimeout(this._timeoutId);
  },
};
