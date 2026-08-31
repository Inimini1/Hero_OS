// services/google.js
// Direct browser-to-Google integration — no backend involved. Uses Google
// Identity Services (loaded in index.html) to get a short-lived access
// token that lives only in this tab's sessionStorage, and calls Google's
// APIs straight from the browser (Calendar and Gmail both allow this —
// verified their CORS headers explicitly allow cross-origin requests).
//
// Read-only on purpose: this only ever reads Calendar/Gmail, never sends
// or modifies anything. Drafting/sending stays a Claude-chat action, not
// something Hero OS's frontend does on its own.
//
// Because there's no backend, there's no refresh token either — the
// access token expires in about an hour and the user re-approves via a
// one-click prompt, not a full re-login.

window.HeroOS = window.HeroOS || {};
HeroOS.services = HeroOS.services || {};

HeroOS.services.google = {
  CLIENT_ID: '302881839625-nlh84k2o4jc8459364kjq8f395eiid8m.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly',
  TOKEN_KEY: 'heroOS.google.token.v1',

  _tokenClient: null,
  _listeners: [],

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    this._listeners.forEach((fn) => fn());
  },

  _readToken() {
    try {
      const raw = sessionStorage.getItem(this.TOKEN_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data.accessToken || !data.expiresAt || Date.now() >= data.expiresAt) return null;
      return data;
    } catch (e) {
      return null;
    }
  },

  _writeToken(accessToken, expiresInSeconds) {
    const data = { accessToken, expiresAt: Date.now() + expiresInSeconds * 1000 - 60000 };
    try {
      sessionStorage.setItem(this.TOKEN_KEY, JSON.stringify(data));
    } catch (e) {
      // sessionStorage unavailable (private browsing, etc.) — connection
      // just won't persist across a reload; not fatal.
    }
  },

  isConnected() {
    return !!this._readToken();
  },

  isReady() {
    return !!(window.google && window.google.accounts && window.google.accounts.oauth2);
  },

  connect(onSuccess, onError) {
    if (!this.isReady()) {
      onError && onError(new Error("Google sign-in hasn't loaded yet — check your connection and try again in a moment."));
      return;
    }
    if (!this._tokenClient) {
      this._tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: (resp) => {
          if (resp.error) {
            onError && onError(new Error(resp.error));
            return;
          }
          this._writeToken(resp.access_token, resp.expires_in);
          this._notify();
          onSuccess && onSuccess();
        },
      });
    }
    this._tokenClient.requestAccessToken();
  },

  disconnect() {
    const token = this._readToken();
    try {
      sessionStorage.removeItem(this.TOKEN_KEY);
    } catch (e) {
      // ignore
    }
    if (token && this.isReady()) {
      google.accounts.oauth2.revoke(token.accessToken, () => {});
    }
    this._notify();
  },

  async _authedFetch(url) {
    const token = this._readToken();
    if (!token) throw new Error('Not connected to Google.');
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token.accessToken } });
    if (!res.ok) throw new Error('Google API error (' + res.status + ')');
    return res.json();
  },

  // Today's events, 00:00–23:59 local time, soonest first.
  async todaysEvents() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const url =
      'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
      '?timeMin=' + encodeURIComponent(startOfDay) +
      '&timeMax=' + encodeURIComponent(endOfDay) +
      '&singleEvents=true&orderBy=startTime&maxResults=15';
    const data = await this._authedFetch(url);
    return (data.items || []).map((ev) => ({
      id: ev.id,
      title: ev.summary || '(untitled event)',
      start: ev.start && (ev.start.dateTime || ev.start.date),
      end: ev.end && (ev.end.dateTime || ev.end.date),
      allDay: !!(ev.start && ev.start.date && !ev.start.dateTime),
      location: ev.location || '',
    }));
  },

  // Just a count — Hero OS doesn't read message bodies.
  async unreadCount() {
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent('is:unread') + '&maxResults=25';
    const data = await this._authedFetch(url);
    return data.resultSizeEstimate || 0;
  },
};
