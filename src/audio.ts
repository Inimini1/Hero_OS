/** Web Audio synthesis – all sounds generated procedurally. */

export class AudioManager {
  private _ctx: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _musicGain: GainNode | null = null;
  private _sfxGain: GainNode | null = null;
  private _musicSfxVolume = 0.5;
  private _sfxVolume = 0.8;
  private _muted = false;
  private _unlocked = false;
  private _jetpackNode: AudioBufferSourceNode | null = null;
  private _jetpackGain: GainNode | null = null;
  private _musicScheduled = 0;
  private _musicTempo = 120; // BPM
  private _zoneIndex = 0;
  private _musicStopFns: Array<() => void> = [];
  private _coinPitchIdx = 0;

  /** Call on first user gesture. */
  unlock(): void {
    if (this._unlocked) return;
    try {
      this._ctx = new AudioContext();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 1;
      this._masterGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this._musicSfxVolume;
      this._musicGain.connect(this._masterGain);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this._sfxVolume;
      this._sfxGain.connect(this._masterGain);

      this._jetpackGain = this._ctx.createGain();
      this._jetpackGain.gain.value = 0;
      this._jetpackGain.connect(this._sfxGain);

      this._startJetpackLoop();
      this._scheduleMusic();
      this._unlocked = true;
    } catch {
      // Audio not supported
    }
  }

  setMusicVolume(v: number): void {
    this._musicSfxVolume = v;
    if (this._musicGain) this._musicGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this._masterGain) {
      this._masterGain.gain.value = muted ? 0 : 1;
    }
  }

  setZone(zoneIndex: number): void {
    this._zoneIndex = zoneIndex;
  }

  setGameSpeed(speed: number): void {
    // Ramp music tempo with speed
    this._musicTempo = 110 + (speed / 13) * 30;
  }

  setJetpackThrust(thrust: number): void {
    if (!this._jetpackGain || this._muted) return;
    const target = thrust * 0.18;
    this._jetpackGain.gain.setTargetAtTime(target, this._ctx!.currentTime, 0.05);
  }

  /** Play a sound effect by name. */
  play(name: SfxName, _x?: number, _y?: number): void {
    if (!this._ctx || !this._sfxGain || this._muted) return;
    const ctx = this._ctx;
    const dest = this._sfxGain;

    switch (name) {
      case 'coin': this._playCoin(ctx, dest); break;
      case 'explosion': this._playExplosion(ctx, dest); break;
      case 'laser_fire': this._playLaser(ctx, dest); break;
      case 'missile_warn': this._playMissileWarn(ctx, dest); break;
      case 'missile_whoosh': this._playMissileWhoosh(ctx, dest); break;
      case 'vehicle_pickup': this._playPickup(ctx, dest); break;
      case 'token_collect': this._playToken(ctx, dest); break;
      case 'shield_hit': this._playShieldHit(ctx, dest); break;
      case 'ui_click': this._playUIClick(ctx, dest); break;
      case 'ui_confirm': this._playUIConfirm(ctx, dest); break;
      case 'mission_complete': this._playMissionComplete(ctx, dest); break;
      case 'revive': this._playRevive(ctx, dest); break;
      case 'new_best': this._playNewBest(ctx, dest); break;
    }
  }

  private _startJetpackLoop(): void {
    if (!this._ctx || !this._jetpackGain) return;
    const ctx = this._ctx;

    // Filtered noise
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 220;
    filter.Q.value = 2;

    src.connect(filter);
    filter.connect(this._jetpackGain!);
    src.start();
    this._jetpackNode = src;
  }

  private _playCoin(ctx: AudioContext, dest: AudioNode): void {
    const pitches = [523, 587, 659, 698, 784, 880];
    const freq = pitches[this._coinPitchIdx % pitches.length] ?? 523;
    this._coinPitchIdx++;
    if (this._coinPitchIdx > 5) this._coinPitchIdx = 0;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  private _playExplosion(ctx: AudioContext, dest: AudioNode): void {
    const bufSize = ctx.sampleRate * 0.6;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start();
  }

  private _playLaser(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2000, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain); gain.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  }

  private _playMissileWarn(ctx: AudioContext, dest: AudioNode): void {
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 440 + i * 220;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.1);
      osc.connect(gain); gain.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  }

  private _playMissileWhoosh(ctx: AudioContext, dest: AudioNode): void {
    const bufSize = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    src.connect(filter); filter.connect(dest);
    src.start();
  }

  private _playPickup(ctx: AudioContext, dest: AudioNode): void {
    const freqs = [440, 550, 660, 880, 1100];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i] ?? 440;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.15);
      osc.connect(gain); gain.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + i * 0.06 + 0.2);
    }
  }

  private _playToken(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }

  private _playShieldHit(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }

  private _playUIClick(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain); gain.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }

  private _playUIConfirm(ctx: AudioContext, dest: AudioNode): void {
    const freqs = [523, 659, 784];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freqs[i] ?? 523;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain); gain.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + i * 0.1 + 0.2);
    }
  }

  private _playMissionComplete(ctx: AudioContext, dest: AudioNode): void {
    const melody = [523, 659, 784, 1047];
    for (let i = 0; i < melody.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = melody[i] ?? 523;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
      osc.connect(gain); gain.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    }
  }

  private _playRevive(ctx: AudioContext, dest: AudioNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain); gain.connect(dest);
    osc.start(); osc.stop(ctx.currentTime + 0.7);
  }

  private _playNewBest(ctx: AudioContext, dest: AudioNode): void {
    const melody = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < melody.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = melody[i] ?? 523;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
      osc.connect(gain); gain.connect(dest);
      osc.start(); osc.stop(ctx.currentTime + i * 0.1 + 0.3);
    }
  }

  /** Schedule the procedural music ahead of time. */
  private _scheduleMusic(): void {
    if (!this._ctx || !this._musicGain) return;
    const ctx = this._ctx;
    const lookahead = 0.1;
    const scheduleAhead = 0.5;

    const tick = (): void => {
      const now = ctx.currentTime;
      const beatDuration = 60 / this._musicTempo;

      while (this._musicScheduled < now + scheduleAhead) {
        this._scheduleBeat(this._musicScheduled, beatDuration);
        this._musicScheduled += beatDuration;
      }
      setTimeout(tick, lookahead * 1000);
    };

    this._musicScheduled = ctx.currentTime;
    tick();
  }

  private _scheduleBeat(time: number, beatDuration: number): void {
    if (!this._ctx || !this._musicGain) return;
    const ctx = this._ctx;
    const dest = this._musicGain;

    // Zone-dependent scales
    const scales = [
      [0, 2, 4, 7, 9],           // Pentatonic (Lab)
      [0, 2, 3, 5, 7, 8, 10],    // Natural minor (Cavern)
      [0, 2, 4, 5, 7, 9, 11],    // Major (Sky Deck)
      [0, 1, 3, 5, 6, 8, 10],    // Phrygian (Neon)
      [0, 2, 4, 7, 9, 12, 14],   // Pentatonic extended (Space)
    ];
    const roots = [110, 98, 130.8, 103.8, 92.5]; // A2, G2, C3, Ab2, F#2
    const scale = scales[this._zoneIndex] ?? scales[0]!;
    const root = roots[this._zoneIndex] ?? roots[0]!;

    const beatIdx = Math.round(time / beatDuration) % 32;

    // Bass line (every beat)
    if (beatIdx % 2 === 0) {
      this._playNote(ctx, dest, root * Math.pow(2, (scale[Math.floor(beatIdx / 2) % scale.length] ?? 0) / 12), time, beatDuration * 0.9, 'sawtooth', 0.04);
    }

    // Melody arpeggio (eighth notes)
    const arpNote = scale[beatIdx % scale.length] ?? 0;
    if (Math.sin(beatIdx * 1.618) > 0.3) {
      this._playNote(ctx, dest, root * 2 * Math.pow(2, arpNote / 12), time, beatDuration * 0.4, 'triangle', 0.02);
    }

    // Percussion (kick on 1 and 3, hi-hat on 2 and 4)
    if (beatIdx % 8 === 0 || beatIdx % 8 === 4) {
      this._playDrum(ctx, dest, time, 'kick');
    } else if (beatIdx % 4 === 2) {
      this._playDrum(ctx, dest, time, 'hat');
    }
  }

  private _playNote(
    ctx: AudioContext, dest: AudioNode,
    freq: number, time: number, duration: number,
    type: OscillatorType, volume: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain); gain.connect(dest);
    osc.start(time); osc.stop(time + duration + 0.01);
  }

  private _playDrum(ctx: AudioContext, dest: AudioNode, time: number, kind: 'kick' | 'hat'): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === 'kick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.start(time); osc.stop(time + 0.2);
    } else {
      osc.type = 'square';
      osc.frequency.value = 8000;
      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.start(time); osc.stop(time + 0.05);
    }
    osc.connect(gain); gain.connect(dest);
  }

  /** Mute/unmute based on page visibility. */
  handleVisibility(hidden: boolean): void {
    if (!this._masterGain) return;
    this._masterGain.gain.value = hidden || this._muted ? 0 : 1;
  }

  resetCoinPitch(): void { this._coinPitchIdx = 0; }
}

export type SfxName =
  | 'coin'
  | 'explosion'
  | 'laser_fire'
  | 'missile_warn'
  | 'missile_whoosh'
  | 'vehicle_pickup'
  | 'token_collect'
  | 'shield_hit'
  | 'ui_click'
  | 'ui_confirm'
  | 'mission_complete'
  | 'revive'
  | 'new_best';
