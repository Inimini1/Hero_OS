// services/hardware.js
// A tiny event bus for future hardware: ESP32-C3, MPU-6050 gesture ring,
// Spider-Sense proximity sensors, haptic motors, Bluetooth devices, etc.
//
// NOTHING here talks to real hardware yet. V1 just defines the *shape*
// of events so that when real hardware exists, it can call
// HeroOS.services.hardware.emit(...) and the rest of the app can react
// without being rewritten.
//
// Example of how a future gesture bridge would use this:
//   HeroOS.services.hardware.on(HeroOS.services.hardware.EVENTS.GESTURE_DETECTED, (payload) => {
//     if (payload.gesture === 'clockwise') HeroOS.app.navigate('#/portal');
//   });
//   HeroOS.services.hardware.emit(HeroOS.services.hardware.EVENTS.GESTURE_DETECTED, { gesture: 'clockwise' });

window.HeroOS = window.HeroOS || {};
HeroOS.services = HeroOS.services || {};

HeroOS.services.hardware = {
  EVENTS: {
    GESTURE_DETECTED: 'GESTURE_DETECTED',
    SENSOR_READING: 'SENSOR_READING',
    BUTTON_PRESSED: 'BUTTON_PRESSED',
    DEVICE_CONNECTED: 'DEVICE_CONNECTED',
    DEVICE_DISCONNECTED: 'DEVICE_DISCONNECTED',
  },

  _listeners: {},

  on(eventName, handler) {
    if (!this._listeners[eventName]) this._listeners[eventName] = [];
    this._listeners[eventName].push(handler);
  },

  off(eventName, handler) {
    if (!this._listeners[eventName]) return;
    this._listeners[eventName] = this._listeners[eventName].filter((h) => h !== handler);
  },

  emit(eventName, payload) {
    (this._listeners[eventName] || []).forEach((handler) => handler(payload));
  },

  // Spider-Sense placeholder: directional haptic feedback.
  // A real implementation would send a Bluetooth command to a wearable.
  // For now it just logs, so the call site already exists for later.
  triggerHaptic(direction) {
    console.log(`[hardware] haptic requested: ${direction} (no device connected yet)`);
  },
};
