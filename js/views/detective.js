// views/detective.js
// Placeholder for future vision capabilities (camera input, OCR,
// object recognition, document explanation). No AI vision API is
// wired up in V1 — this just reserves the screen and the concept.

window.HeroOS = window.HeroOS || {};
HeroOS.views = HeroOS.views || {};

HeroOS.views.detective = {
  render(root) {
    root.innerHTML = `
      <div class="view-header"><h1>Detective Mode</h1></div>

      <section class="panel notice-panel">
        <p>Detective Mode is reserved for future vision capabilities:</p>
        <ul class="mini-list">
          <li>Camera input, through your phone or Meta glasses</li>
          <li>OCR &mdash; reading text from photos of pages or whiteboards</li>
          <li>Object and document recognition</li>
          <li>Contextual AI explanations of what you're looking at</li>
        </ul>
        <p>None of this is connected yet. When it is, it will plug into
        the same AI service layer used by JARVIS (<code>services/ai.js</code>).</p>
      </section>
    `;
  },
};
