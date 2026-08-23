// views/portal.js
// Control surface for the physical Doctor Strange portal project
// (projector + laptop + MPU-6050 + ESP32-C3 + gesture ring, built in
// a separate repository). Hero OS does NOT reimplement that project —
// this is just the remote control / status display for it.
//
// Future wiring:
//   Gesture Ring -> ESP32 -> Bluetooth -> HeroOS.services.hardware
//   -> HeroOS.views.portal.activate() -> your portal controller ->
//   laptop -> projector.
// For now, activate()/deactivate() only change the status shown here.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.portal = {
  // ---- data layer ----

  setStatus(status) {
    HeroOS.state.current.portal.status = status;
    HeroOS.state.save();
  },

  activate() {
    this.setStatus('ACTIVE');
  },

  deactivate() {
    this.setStatus('OFFLINE');
  },

  test() {
    // Placeholder for a future self-test sequence (projector ping,
    // ESP32 handshake, etc). For now it just briefly flashes READY.
    this.setStatus('READY');
  },

  // ---- UI layer ----

  render(root) {
    const status = HeroOS.state.current.portal.status;

    root.innerHTML = `
      <div class="view-header"><h1>Portal System</h1></div>

      <section class="panel hud-frame portal-panel">
        <div class="hud-status-line"><span class="status-dot is-muted" aria-hidden="true"></span>PORTAL CONTROLLER · HARDWARE LINK: NOT CONNECTED</div>
        <div class="panel-eyebrow">Status</div>
        <div class="portal-status portal-status-${status.toLowerCase()}">${status}</div>

        <div class="focus-controls">
          <button class="btn btn-primary" id="portal-activate">Activate Portal</button>
          <button class="btn" id="portal-deactivate">Deactivate Portal</button>
          <button class="btn" id="portal-test">Test</button>
          <a class="btn" href="#/settings">Settings</a>
        </div>
      </section>

      <section class="panel notice-panel">
        This is a remote control for the physical portal project (projector, MPU-6050,
        ESP32-C3, gesture ring — built separately). No hardware is connected yet.
        Once your gesture ring sends a signal through
        <code>HeroOS.services.hardware</code>, it can call
        <code>HeroOS.views.portal.activate()</code> directly &mdash; no clicking required.
      </section>
    `;

    root.querySelector('#portal-activate').addEventListener('click', () => {
      this.activate();
      this.render(root);
    });
    root.querySelector('#portal-deactivate').addEventListener('click', () => {
      this.deactivate();
      this.render(root);
    });
    root.querySelector('#portal-test').addEventListener('click', () => {
      this.test();
      this.render(root);
    });
  },
};
