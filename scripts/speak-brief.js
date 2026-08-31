#!/usr/bin/env node
// scripts/speak-brief.js
//
// Sends brief text to Fish Audio's TTS API and plays the result out loud.
// This is a LOCAL, Node-only script — it needs your FISH_API_KEY, which
// must never live in Hero OS's browser code (anyone visiting the site
// could read it in dev tools). Run this on your own machine only.
//
// Setup (one time):
//   export FISH_API_KEY=your-key-from-fish.audio
//   export FISH_VOICE_ID=the-reference-id-of-your-chosen-voice
//
// Usage:
//   node scripts/speak-brief.js                 # reads ./brief.txt
//   node scripts/speak-brief.js path/to/file.txt # reads a specific file
//   echo "hello" | node scripts/speak-brief.js - # reads stdin

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FISH_API_KEY = process.env.FISH_API_KEY;
const FISH_VOICE_ID = process.env.FISH_VOICE_ID;
const MODEL = 's2.1-pro-free';

function readText() {
  const arg = process.argv[2];
  if (arg === '-') {
    return fs.readFileSync(0, 'utf8'); // stdin
  }
  const file = arg || path.join(__dirname, '..', 'brief.txt');
  if (!fs.existsSync(file)) {
    console.error(`No brief found at ${file}. Run the morning-brief skill first, or pass a file path.`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

function playAudio(filePath) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`afplay "${filePath}"`, { stdio: 'inherit' });
    } else if (platform === 'linux') {
      // Try a couple of common players; whichever exists first wins.
      try {
        execSync(`which ffplay`, { stdio: 'ignore' });
        execSync(`ffplay -nodisp -autoexit "${filePath}"`, { stdio: 'inherit' });
      } catch (e) {
        execSync(`which aplay`, { stdio: 'ignore' });
        execSync(`aplay "${filePath}"`, { stdio: 'inherit' });
      }
    } else if (platform === 'win32') {
      execSync(`powershell -c (New-Object Media.SoundPlayer '${filePath}').PlaySync();`, { stdio: 'inherit' });
    } else {
      console.log(`Saved to ${filePath} — don't know how to auto-play on ${platform}, open it manually.`);
    }
  } catch (e) {
    console.log(`Saved to ${filePath} — auto-play failed (${e.message}), open it manually.`);
  }
}

async function main() {
  if (!FISH_API_KEY) {
    console.error('FISH_API_KEY is not set. See the top of this file for setup steps.');
    process.exit(1);
  }
  if (!FISH_VOICE_ID) {
    console.error('FISH_VOICE_ID is not set — this is the reference_id from your chosen voice on fish.audio. See the top of this file.');
    process.exit(1);
  }

  const text = readText().trim();
  if (!text) {
    console.error('Brief text is empty — nothing to speak.');
    process.exit(1);
  }

  console.log('Sending brief to Fish Audio...');
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FISH_API_KEY}`,
      'model': MODEL,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: FISH_VOICE_ID,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Fish Audio API error (${res.status}): ${body || res.statusText}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(__dirname, '..', 'brief.mp3');
  fs.writeFileSync(outPath, buffer);
  console.log(`Saved ${outPath} (${buffer.length} bytes). Playing...`);
  playAudio(outPath);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
