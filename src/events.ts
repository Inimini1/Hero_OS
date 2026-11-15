/** Lightweight event queue flushed each frame. Sim writes, render/audio reads. */
export type GameEventType =
  | 'coin_collected'
  | 'spin_token_collected'
  | 'hero_died'
  | 'near_miss'
  | 'vehicle_start'
  | 'vehicle_end'
  | 'pickup_collected'
  | 'mission_progress'
  | 'mission_complete'
  | 'zone_change'
  | 'speed_boost'
  | 'revive'
  | 'shield_hit'
  | 'crate_open';

export interface GameEvent {
  type: GameEventType;
  x?: number;
  y?: number;
  value?: number;
  id?: number;
}

export class EventQueue {
  private _events: GameEvent[] = [];

  push(evt: GameEvent): void {
    this._events.push(evt);
  }

  flush(): readonly GameEvent[] {
    const copy = this._events;
    this._events = [];
    return copy;
  }

  get length(): number {
    return this._events.length;
  }
}
