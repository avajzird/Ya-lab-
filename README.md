# TapLab Web Tester v1.0 — iPhone setup

TapLab is a private static web app. It records **manual** taps on an included demo game, or you can instrument your own website with `taplab-recorder.js`. It is **not** an auto-clicker yet.

## Contents
- `index.html` — completely self-contained demo (works without external JS/CSS).
- `taplab-recorder.js` — recorder overlay for your own browser game.
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — optional installable PWA files.

## Install on your iPhone, without a computer

**Recommended: host with GitHub Pages using iPhone Safari**

1. Download the ZIP or individual files from ChatGPT, and **Save to Files** on your iPhone. Uncompress the ZIP in the Files app.
2. Open `https://github.com/new` in Safari, sign in to GitHub (free), and create a **public** repository, e.g. `taplab-web`. Don't upload private game material to public repositories. A public repo makes the source visible to everyone; recording files remain on your phone unless you share them.
3. Open the repository in Safari. Tap **Add file → Upload files** (use **Request Desktop Website** from Safari's page menu if the upload controls are hidden). Use **Choose Files** to select the six files from the unzipped `TapLab-Web` folder: `index.html`, `taplab-recorder.js`, `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`. Keep them at the **top level** of the repository, not nested inside a subfolder. Commit the changes.
4. In repository **Settings → Pages**, select **Deploy from a branch**, branch **main**, folder **/(root)**, and tap **Save**.
5. After deployment completes, open `https://YOUR-GITHUB-USERNAME.github.io/taplab-web/` in Safari. The username/repo are yours; the URL is an example, not an already-hosted site.
6. To use it like an app, use Safari **Share → Add to Home Screen → Add**. If available, choose **Open as Web App**.

For a simpler temporary demo, open `index.html` directly where iPhone allows, or use another HTTPS static-file host. Opening local HTML files from Files varies by browser and may limit storage and installability. HTTPS hosting is the most reliable option.

**No code uploads recordings by default.** Data is held in local storage on the current browser. Private/incognito mode or cleared site data can erase it, so export a JSON before leaving.

## Recording the built-in demo

1. Tap **Start recording**.
2. Tap Search naturally ~100–150 times. The button moves after 15–25 successful searches, picking a *different* slot from A/B/C.
3. Tap **Stop**.
4. Tap **Share JSON → Save to Files** on iPhone. Or use **Save JSON** (check Safari Downloads). **Copy JSON** is a backup option.
5. Upload the exported `taplab-*.json` file to your chat to analyze tap spacing, speed, duration, movement, and the behavior when the button moves.

### What is recorded
Each tap includes: absolute timestamps, time since recording began, milliseconds since previous tap start and previous release, hold time, event-reported CSS-pixel coordinates for down and up, movement points (when reported), pressure/contact data (if available), viewport and pixel ratio, the current A/B/C slot, button and game bounds, coordinates normalized within button and game, distance from button center, and whether the button was hit. Session tracks slot changes and summary statistics.

**Important:** These are browser-reported pointer events, not private raw iOS touchscreen sensor coordinates. A click on the demo button increments the game count even if recording is off. A tap that begins inside the button and ends inside counts as a recorded hit. Clicking outside the game area isn't recorded.

## Record taps on your OWN game

A website **cannot** monitor touch events from a separate browser tab or cross-origin iframe. Instead, include this recording file on the webpage you own. Before the closing `</body>` tag, add:

```html
<script>
  window.TAPLAB_CONFIG = {
    targetSelector: '#search-button', // use your actual Search button CSS selector
    gameAreaSelector: '#game',        // optional but recommended to capture missed touches
    positionTolerancePx: 46          // how near a position must be to reuse its A/B/C label
  };
</script>
<script src="/taplab-recorder.js" defer></script>
```

Put `taplab-recorder.js` on the **same site** as your game. Ensure your actual Search button has `id="search-button"` and the play area has `id="game"`, or change the selectors to match your markup.

On that page, a small **draggable** TapLab panel appears. Tap **Record → play normally → Stop → JSON / Share**. The page stays fully interactive. The recorder captures pointer interactions directed at your selector and, if configured, misses within `gameAreaSelector`. It doesn't run any automated clicks. It doesn't send anything to a server. It doesn't persist the game recording; export before navigating away.

If your game uses a `canvas`, this simple version won't automatically know which pixels constitute a specific in-canvas search button. The panel can still record taps within the canvas by setting `gameAreaSelector` to the canvas selector, but for exact button bounds and A/B/C identification, we would integrate with your game's internal state.

For reliable explicit labeling, when your game moves the Search button, set `data-taplab-slot="A"` (or B/C) on the element. Otherwise, the script groups observed button-center locations into slots by distance tolerance. These labels are session-local.

## Design limits
- No native iPhone installation or developer account required.
- HTTPS hosting recommended for Add to Home Screen and service-worker offline caching.
- A browser page cannot simulate real trusted touches on another app. Future automation would have to operate inside the game/webpage and might not count as genuine physical taps for browser security checks.
- The PWA service worker caches the demo for offline use after the first successful HTTPS visit, subject to Safari's cache management.
TapLab deployment test.
