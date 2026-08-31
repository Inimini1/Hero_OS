#!/bin/bash
# scripts/run-morning-brief.sh
#
# Wrapper for launchd (or manual use): runs the morning-brief skill via
# the Claude Code CLI, non-interactively, from this repo's folder. The
# skill itself (.claude/skills/morning-brief/SKILL.md) is what actually
# pulls Calendar/Gmail/Notion, writes brief.txt + the Notion page, and —
# since this runs with real shell + speaker access — calls
# scripts/speakbrief.js at the end to speak it out loud.
#
# Requires the Claude Code CLI installed and logged in:
#   npm install -g @anthropic-ai/claude-code
#   claude   (run once interactively to log in, then you can exit)

set -e
cd "$(dirname "$0")/.."

if ! command -v claude &> /dev/null; then
  echo "Claude Code CLI not found. Install it first: npm install -g @anthropic-ai/claude-code" >&2
  exit 1
fi

claude -p "run my morning brief"
