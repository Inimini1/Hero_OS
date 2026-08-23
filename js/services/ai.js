// services/ai.js
// JARVIS's "brain" lives behind this one function: sendMessage().
//
// V1 has no real AI provider connected (on purpose — no API keys belong
// in frontend code, ever). Instead this runs a tiny local rule-based
// responder so JARVIS is still a little useful.
//
// HOW TO CONNECT A REAL AI PROVIDER LATER:
//   1. Build a small backend (even a single serverless function) that
//      holds your API key and forwards requests to your AI provider.
//   2. Set HeroOS.state.current.settings.aiProvider = { endpoint: 'https://your-backend/chat' }
//   3. Replace the body of sendMessage() below with a fetch() call to
//      that endpoint. The rest of the app (jarvis.js) doesn't need to change
//      at all — it only calls HeroOS.services.ai.sendMessage().

window.HeroOS = window.HeroOS || {};
HeroOS.services = HeroOS.services || {};

HeroOS.services.ai = {
  isConfigured() {
    return !!(HeroOS.state.current.settings.aiProvider &&
      HeroOS.state.current.settings.aiProvider.endpoint);
  },

  // Returns a Promise<string> so a real network call slots in with no
  // changes to the caller.
  async sendMessage(message) {
    if (this.isConfigured()) {
      // Placeholder for the future real call. Left unimplemented on
      // purpose until an actual backend endpoint exists.
      // const res = await fetch(HeroOS.state.current.settings.aiProvider.endpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message }),
      // });
      // const data = await res.json();
      // return data.reply;
    }
    return this._localFallback(message);
  },

  // A handful of simple commands so JARVIS is useful with zero setup.
  // This is NOT AI — it's pattern matching. It's honest about that in the UI.
  _localFallback(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();
    const s = HeroOS.state.current;
    const name = s.settings.userName || 'Hero';

    if (/^(hi|hello|hey)\b/.test(lower)) {
      return `Hello, ${name}. Local command mode is active — try "today", "primary", or "add mission: <title>".`;
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

    const addMatch = text.match(/^add mission:\s*(.+)$/i);
    if (addMatch && addMatch[1]) {
      const title = addMatch[1].trim();
      HeroOS.views.missions.addMission({ title });
      return `Added mission: "${title}".`;
    }

    return (
      'Local command mode: I can\'t reason freely yet (no AI provider connected). ' +
      'Try "today", "primary", "time", "date", or "add mission: <title>". ' +
      'Connect a real AI provider anytime in Settings.'
    );
  },
};
