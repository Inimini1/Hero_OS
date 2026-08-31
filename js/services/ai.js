// services/ai.js
// JARVIS's "brain" lives behind this one function: sendMessage().
//
// By default there's no AI provider connected — instead this runs a
// small local rule-based responder so JARVIS is still useful with zero
// setup. To get real AI answers, run the small local backend in
// server/ai-proxy.js (it holds your API key server-side — never in this
// frontend code) and point Settings > AI Provider at it. See that file
// for setup instructions.

window.HeroOS = window.HeroOS || {};
HeroOS.services = HeroOS.services || {};

HeroOS.services.ai = {
  isConfigured() {
    const ap = HeroOS.state.current.settings.aiProvider;
    return !!(ap && ap.endpoint && ap.enabled);
  },

  // Returns a Promise<string>. `history` is the prior chat messages
  // ({role, text}[]) so a real backend has conversation context.
  async sendMessage(message, history) {
    if (this.isConfigured()) {
      try {
        const res = await fetch(HeroOS.state.current.settings.aiProvider.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history: history || [] }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || `Server responded ${res.status}`);
        return data.reply;
      } catch (err) {
        console.error('Hero OS: AI provider request failed, falling back to local commands.', err);
        return `(Couldn't reach the AI provider: ${err.message}. Falling back to local command mode.)\n\n` + (await this._localFallback(message));
      }
    }
    return this._localFallback(message);
  },

  // A handful of simple commands so JARVIS is useful with zero setup.
  // This is NOT AI — it's pattern matching. It's honest about that in the UI.
  async _localFallback(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();
    const s = HeroOS.state.current;
    const name = s.settings.userName || 'Hero';

    if (/^(hi|hello|hey)\b/.test(lower)) {
      return `Hello, ${name}. Local command mode is active — try "today", "primary", "suit check", "captures today", "calendar", "inbox", or "add mission: <title>".`;
    }

    if (lower.includes('calendar') || lower.includes('schedule')) {
      const google = HeroOS.services.google;
      if (!google || !google.isConnected()) {
        return google && google.wasEverConnected()
          ? 'Google access has expired — reconnect on the Briefing screen or in Settings and ask me again.'
          : 'Google Calendar isn\'t connected yet. Connect it in Settings to ask me this.';
      }
      try {
        const events = await google.todaysEvents();
        if (events.length === 0) return 'Nothing on your Google Calendar today.';
        const lines = events.map((e) => {
          const time = e.allDay ? 'All day' : HeroOS.utils.formatTime(new Date(e.start));
          return `${time} — ${e.title}`;
        });
        return `Today's calendar:\n` + lines.join('\n');
      } catch (err) {
        return `Couldn't reach Google Calendar (${err.message}). Try reconnecting in Settings.`;
      }
    }

    if (lower.includes('inbox') || lower.includes('unread') || lower.includes('email')) {
      const google = HeroOS.services.google;
      if (!google || !google.isConnected()) {
        return google && google.wasEverConnected()
          ? 'Google access has expired — reconnect on the Briefing screen or in Settings and ask me again.'
          : 'Gmail isn\'t connected yet. Connect it in Settings to ask me this.';
      }
      try {
        const count = await google.unreadCount();
        return count === 0 ? 'Inbox zero — nothing unread.' : `${count} unread in Gmail.`;
      } catch (err) {
        return `Couldn't reach Gmail (${err.message}). Try reconnecting in Settings.`;
      }
    }

    if (lower.includes('time')) {
      return `It's ${HeroOS.utils.formatTime(new Date())}.`;
    }

    if (lower.includes('date')) {
      return `Today is ${HeroOS.utils.formatDateLong(new Date())}.`;
    }

    if (lower === 'primary' || lower.includes('primary mission')) {
      const primary = s.missions.find((m) => m.id === s.primaryMissionId);
      return primary
        ? `Primary mission: "${primary.title}".`
        : 'No Primary Mission is set. Set one from the Missions screen.';
    }

    if (lower === 'today' || lower.includes("today's missions")) {
      const todays = s.missions.filter((m) => !m.completed && HeroOS.utils.isToday(m.dueDate));
      if (todays.length === 0) return 'Nothing due today. Clear skies.';
      return 'Due today: ' + todays.map((m) => m.title).join(', ');
    }

    if (lower.includes('suit check') || lower.includes('suitcheck')) {
      const list = HeroOS.views.suitcheck.getActiveList();
      const checked = list.items.filter((i) => i.checked).length;
      if (list.items.length === 0) return `Your "${list.name}" checklist is empty.`;
      if (checked === list.items.length) return `"${list.name}" checklist: READY — everything's checked.`;
      const missing = list.items.filter((i) => !i.checked).map((i) => i.name);
      return `"${list.name}" checklist: ${checked}/${list.items.length} checked. Still need: ${missing.join(', ')}.`;
    }

    if (lower.includes('capture')) {
      const todayStr = HeroOS.utils.todayStr();
      const todaysCaptures = s.captures.filter((c) => c.timestamp.slice(0, 10) === todayStr);
      if (todaysCaptures.length === 0) return 'No captures yet today.';
      return `${todaysCaptures.length} capture${todaysCaptures.length === 1 ? '' : 's'} today: ` +
        todaysCaptures.map((c) => `"${c.text.slice(0, 40)}${c.text.length > 40 ? '…' : ''}"`).join(', ');
    }

    const addMatch = text.match(/^add mission:\s*(.+)$/i);
    if (addMatch && addMatch[1]) {
      const title = addMatch[1].trim();
      HeroOS.views.missions.addMission({ title });
      return `Added mission: "${title}".`;
    }

    return (
      'Local command mode: I can\'t reason freely yet (no AI provider connected). ' +
      'Try "today", "primary", "suit check", "captures today", "calendar", "inbox", "time", "date", or "add mission: <title>". ' +
      'Connect a real AI provider anytime in Settings.'
    );
  },
};
