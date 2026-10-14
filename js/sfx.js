/* 8-bit 音效：用 Web Audio 即時合成方波／三角波，不需要任何音檔。
 * SFX.play('clear')；SFX.enabled 讀寫 localStorage 'csq-sound'，遊戲和手冊共用。 */
(function () {
  'use strict';
  const KEY = 'csq-sound';
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* 讀不到就預設開 */ }

  let ctx = null;
  let master = null;
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    return ctx;
  }
  // 瀏覽器規定第一次使用者操作之後才能出聲
  function unlock() {
    if (!enabled) return;
    const a = audio();
    if (a && a.state === 'suspended') a.resume();
  }
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  // 一個音：type 波形、f 起始頻率、f2 結束頻率（滑音）、d 秒數、v 音量、at 延遲秒數
  function tone(type, f, d, at, v, f2) {
    const a = ctx;
    const t = a.currentTime + (at || 0);
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v === undefined ? 1 : v, t);
    g.gain.setValueAtTime(v === undefined ? 1 : v, t + d * 0.7);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + d + 0.02);
  }
  function noise(d, at, v) {
    const a = ctx;
    const t = a.currentTime + (at || 0);
    const len = Math.max(1, Math.floor(a.sampleRate * d));
    const buf = a.createBuffer(1, len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource();
    const g = a.createGain();
    g.gain.value = v === undefined ? 0.6 : v;
    s.buffer = buf;
    s.connect(g);
    g.connect(master);
    s.start(t);
  }
  // 音名轉頻率：'C5'、'G#4'
  const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  function hz(n) {
    const m = /^([A-G])(#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (NOTE[m[1]] + (m[2] ? 1 : 0) + (+m[3] - 4) * 12) / 12);
  }
  function melody(notes, step, type, v) {
    notes.forEach((n, i) => { if (n) tone(type || 'square', hz(n), step * 0.9, i * step, v); });
  }

  const SOUNDS = {
    select: () => tone('square', 880, 0.05, 0, 0.5),
    cursor: () => tone('square', 660, 0.03, 0, 0.35),
    step: () => tone('triangle', 220, 0.04, 0, 0.35),
    run: () => { tone('square', 523, 0.06, 0, 0.5); tone('square', 784, 0.08, 0.06, 0.5); },
    start: () => melody(['C5', 'E5', 'G5', 'C6'], 0.08),
    coin: () => { tone('square', 988, 0.06, 0, 0.6); tone('square', 1319, 0.16, 0.06, 0.6); },
    star: () => { tone('square', 1047, 0.05, 0, 0.55); tone('square', 1568, 0.12, 0.05, 0.55); },
    jump: () => tone('square', 300, 0.16, 0, 0.45, 700),
    bump: () => tone('square', 140, 0.09, 0, 0.6, 90),
    hit: () => noise(0.08, 0, 0.5),
    poof: () => { noise(0.18, 0, 0.45); tone('triangle', 400, 0.18, 0, 0.4, 80); },
    hurt: () => { tone('square', 400, 0.25, 0, 0.6, 70); noise(0.12, 0, 0.3); },
    open: () => melody(['G4', 'C5', 'E5'], 0.06),
    error: () => { tone('square', 196, 0.12, 0, 0.6); tone('square', 147, 0.22, 0.13, 0.6); },
    fail: () => melody(['E4', 'D#4', 'D4', 'C#4'], 0.14, 'triangle', 0.9),
    freeze: () => { tone('square', 110, 0.5, 0, 0.5, 55); noise(0.3, 0.05, 0.25); },
    clear: () => {
      melody(['C5', 'E5', 'G5', 'C6', null, 'G5', 'C6'], 0.1);
      melody(['C4', 'C4', 'E4', 'E4', null, 'G4', 'C5'], 0.1, 'triangle', 0.8);
    },
    right: () => { tone('square', 784, 0.06, 0, 0.5); tone('square', 1175, 0.12, 0.07, 0.5); },
    wrong: () => tone('square', 220, 0.18, 0, 0.5, 150),
    levelup: () => melody(['G4', 'C5', 'E5', 'G5', 'E5', 'G5', 'C6'], 0.07),
  };

  window.SFX = {
    get enabled() { return enabled; },
    set enabled(v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) { /* 存不了也沒關係 */ }
      if (enabled) unlock();
    },
    play(name) {
      if (!enabled || !SOUNDS[name]) return;
      const a = audio();
      if (!a) return;
      if (a.state === 'suspended') a.resume();
      try { SOUNDS[name](); } catch (e) { /* 音效失敗不影響遊戲 */ }
    },
    names: Object.keys(SOUNDS),
  };
})();
