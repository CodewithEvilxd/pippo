import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_USER_DATA = path.join(os.tmpdir(), 'chrome_cdp_profile_' + Date.now());
const MEDIA_DIR = path.resolve('.github/media');

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Starting screenshot suite...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--window-size=1440,960',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  let connected = false;
  let browserWsUrl = null;

  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        browserWsUrl = data.webSocketDebuggerUrl;
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected || !browserWsUrl) {
    console.error('Failed to connect to Chrome CDP');
    chrome.kill();
    process.exit(1);
  }

  const browserWs = new WebSocket(browserWsUrl);
  let id = 1;
  const pending = new Map();

  browserWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(res => browserWs.onopen = res);

  function browserSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const reqId = id++;
      pending.set(reqId, { resolve, reject });
      browserWs.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  const { targetId } = await browserSend('Target.createTarget', {
    url: 'http://localhost:5173/pippo/'
  });

  const pageWsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;
  const pageWs = new WebSocket(pageWsUrl);
  const pagePending = new Map();
  let pageId = 1;

  pageWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pagePending.has(msg.id)) {
      const { resolve, reject } = pagePending.get(msg.id);
      pagePending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(res => pageWs.onopen = res);

  function pageSend(method, params = {}) {
    return new Promise((resolve, reject) => {
      const reqId = pageId++;
      pagePending.set(reqId, { resolve, reject });
      pageWs.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  await pageSend('Page.enable');
  await pageSend('DOM.enable');
  await pageSend('Runtime.enable');
  await pageSend('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 960,
    deviceScaleFactor: 2,
    mobile: false
  });

  async function evaluate(expression) {
    const res = await pageSend('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  async function scrollToElement(selector, offset = 80) {
    await evaluate(`
      (() => {
        const el = document.querySelector('${selector}');
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - ${offset};
          window.scrollTo({ top, behavior: 'instant' });
        }
      })()
    `);
    await sleep(1500);
  }

  async function capture(filename) {
    const shot = await pageSend('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(MEDIA_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved ${filename} (${Math.round(shot.data.length / 1024)} KB)`);
  }

  console.log('Waiting for initial page load...');
  await sleep(3500);

  // 1. Hero Light Mode
  console.log('1. Capturing Hero Light...');
  await evaluate('window.scrollTo(0, 0)');
  await sleep(1200);
  await capture('01-hero-light.png');

  // 2. Hero Dark Mode
  console.log('2. Capturing Hero Dark...');
  await evaluate(`
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  `);
  await sleep(1200);
  await capture('02-hero-dark.png');

  // Switch back to light theme
  await evaluate(`
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  `);
  await sleep(600);

  // 3. 3D Isometric Exploded View (#how-it-works)
  console.log('3. Capturing 3D Exploded Layers...');
  await scrollToElement('#how-it-works', 70);
  await evaluate(`
    const btn = document.querySelector('#how-it-works button');
    if (btn && btn.textContent.includes('Pull it apart')) btn.click();
  `);
  await sleep(1500);
  await capture('03-3d-layers-exploded.png');

  // 4. Pals Playground - Characters Tab (#play)
  console.log('4. Capturing Superpowers - Characters Tab...');
  await scrollToElement('#play', 70);
  await evaluate(`
    const btns = Array.from(document.querySelectorAll('.pals-tab-btn'));
    const charBtn = btns.find(b => b.textContent.includes('Characters'));
    if (charBtn) charBtn.click();
  `);
  await sleep(1200);
  await capture('04-superpowers-characters.png');

  // 5. Pals Playground - Interactions Tab
  console.log('5. Capturing Superpowers - Interactions Tab...');
  await scrollToElement('#play', 70);
  await evaluate(`
    const btns = Array.from(document.querySelectorAll('.pals-tab-btn'));
    const interBtn = btns.find(b => b.textContent.includes('Interactions'));
    if (interBtn) interBtn.click();
  `);
  await sleep(1200);
  await capture('05-superpowers-interactions.png');

  // 6. Pals Playground - Toys Physics Sandbox Tab
  console.log('6. Capturing Superpowers - Toys Sandbox Tab...');
  await scrollToElement('#play', 70);
  await evaluate(`
    const btns = Array.from(document.querySelectorAll('.pals-tab-btn'));
    const toysBtn = btns.find(b => b.textContent.includes('Toys'));
    if (toysBtn) toysBtn.click();
  `);
  await sleep(1200);
  await capture('06-superpowers-toys.png');

  // 7. Pals Playground - Groups & Flocks Tab
  console.log('7. Capturing Superpowers - Groups Tab...');
  await scrollToElement('#play', 70);
  await evaluate(`
    const btns = Array.from(document.querySelectorAll('.pals-tab-btn'));
    const grpBtn = btns.find(b => b.textContent.includes('Groups'));
    if (grpBtn) grpBtn.click();
  `);
  await sleep(1200);
  await capture('07-superpowers-groups.png');

  // 8. Character Roster Gallery (#characters)
  console.log('8. Capturing Character Roster Gallery...');
  await scrollToElement('#characters', 70);
  await sleep(1200);
  await capture('08-character-roster.png');

  // 9. Art Styles Showcase (#styles)
  console.log('9. Capturing Art Styles...');
  await scrollToElement('#styles', 70);
  await sleep(1200);
  await capture('09-art-styles.png');

  // 10. Why Pippo vs Heavy Animations (Comparison Matrix)
  console.log('10. Capturing Comparison Matrix & Quickstart...');
  await scrollToElement('#why-pippo', 70);
  await sleep(1200);
  await capture('10-comparison-matrix.png');

  console.log('All screenshots captured successfully!');
  pageWs.close();
  browserWs.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
