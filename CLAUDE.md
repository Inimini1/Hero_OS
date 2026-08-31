# Who I am
I'm Iniyan, an incoming freshman at Michigan State studying Supply Chain
Management. I care most about optimizing myself in health, fitness, fun,
making friends, and staying connected while not doing anything stupid.

# What I'm working on this month
- Starting the semester off strong, joining clubs and making friends
  while staying close to family, building HydroSource AI.

# My priorities, ranked
1. Happiness
2. Connection to friends and family
3. Productivity / academics

# My tone
Warm, direct, no corporate filler.

# Hard rules
- Always draft, never send. Never take irreversible actions without asking.
- Only use the apps I've connected (currently: Gmail, Google Calendar,
  Notion, Google Drive).

# Context for whoever/whatever reads this (Claude, a scheduled routine, etc.)
This file lives at the root of the Hero_OS repo (heroos.appscloud365.com).
Hero OS itself is a local-first PWA — missions, focus timer, suit check,
quick capture, connections, a daily briefing, and a JARVIS chat screen —
with real (read-only) Google Calendar and Gmail wired directly into the
browser, no backend. Notion is NOT wired into the browser (Notion's API
can't be safely called from client-side code — the token would be
exposed to anyone who opened dev tools on the public site). Notion access
instead happens through a Claude session with the Notion connector on —
same as this one — which is also how the morning-brief skill
(.claude/skills/morning-brief/) gets real Notion data.

There's also a separate standalone file, dashboard.html (+ jarvis_data.js),
NOT part of this deployed site — a "wow layer" HUD-style command display
(glowing core, orbital rings, streaming activity log) that Iniyan keeps
on his own machine. Hero OS's own screens deliberately do NOT use that
neon/glow look — Hero OS's visual language is calm and restrained on
purpose; don't change that without being asked.
