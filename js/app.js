/* C# 小勇者：畫面與操作 */
(function () {
  'use strict';
  const { WORLDS, LEVELS } = window.CSQLevels;
  const { ZH, formatError, compile } = window.CSQ;
  const GS = window.GridStage;
  const US = window.UnityStage;
  const app = document.getElementById('app');

  /* =========================================================
   * 進度（只存在這個瀏覽器）
   * ========================================================= */
  const KEY = 'csq-progress-v1';
  const S = { stars: {}, code: {}, hints: {}, mode: {}, unlockAll: false, insp: {}, last: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') Object.keys(S).forEach((k) => { if (p[k] !== undefined) S[k] = p[k]; });
    }
  } catch (e) { /* 讀不到就用預設值 */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 存不了也沒關係 */ } }

  /* =========================================================
   * 小工具
   * ========================================================= */
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat()) {
      if (k === null || k === undefined || k === false) continue;
      e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    }
    return e;
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const starsOf = (id) => S.stars[id] || 0;
  // 遊戲類型挑戰（W11 以後）：完成 6-5 就能開始任何一個類型，世界裡一關接一關解鎖
  const GENRE_GATE = '6-5';
  const unlocked = (lv) => {
    if (S.unlockAll || lv.index === 0) return true;
    const prev = LEVELS[lv.index - 1];
    if (lv.world >= 11 && prev.world !== lv.world) return starsOf(GENRE_GATE) > 0;
    return starsOf(prev.id) > 0;
  };
  function starsHtml(n, total) {
    let s = '';
    for (let i = 0; i < (total || 3); i++) s += `<span class="${i < n ? 'on' : ''}">★</span>`;
    return s;
  }
  function updateTopStars() {
    document.getElementById('starCount').textContent = LEVELS.reduce((s, l) => s + starsOf(l.id), 0);
    document.getElementById('starTotal').textContent = LEVELS.length * 3;
  }
  function hash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function shuffled(arr, seed) {
    const a = arr.map((x, i) => ({ x, i }));
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- C# 語法上色 ---------- */
  const KW = new Set(['using', 'public', 'private', 'protected', 'class', 'void', 'int', 'float', 'double', 'bool', 'string', 'char', 'var', 'new', 'return', 'if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false', 'null', 'this', 'static', 'const', 'yield', 'event', 'out', 'override', 'virtual', 'readonly', 'typeof', 'namespace']);
  const TOK = /(\/\/.*$)|(\$?"(?:\\.|[^"\\])*"?)|('(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?[fFdDmM]?\b)|(\[[A-Z][A-Za-z]*(?:\([^)]*\))?\])|([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)(\s*\()?/g;
  function hlLine(line) {
    let out = '';
    let last = 0;
    line.replace(TOK, (m, com, str, chr, num, attr, id, call, off) => {
      out += esc(line.slice(last, off));
      last = off + m.length;
      if (com) out += `<span class="t-com">${esc(com)}</span>`;
      else if (str || chr) out += `<span class="t-str">${esc(m)}</span>`;
      else if (num) out += `<span class="t-num">${esc(num)}</span>`;
      else if (attr) out += `<span class="t-meta">${esc(attr)}</span>`;
      else if (id) {
        const cls = KW.has(id) ? 't-kw' : call ? 't-fn' : /^[A-Z]/.test(id) ? 't-type' : '';
        out += cls ? `<span class="${cls}">${esc(id)}</span>` : esc(id);
        if (call) out += esc(call);
      }
      return m;
    });
    return out + esc(line.slice(last));
  }

  /* =========================================================
   * 程式編輯器（textarea 疊在上色過的 pre 上面）
   * ========================================================= */
  class Editor {
    constructor(file, onChange) {
      this.onChange = onChange;
      this.errLines = new Set();
      this.resetBtn = el('button', { class: 'btn btn-sm', type: 'button' }, '重設程式');
      this.head = el('div', { class: 'editor-head' }, el('span', null, `Assets/Scripts/${file}`), this.resetBtn);
      this.gutter = el('div', { class: 'gutter', 'aria-hidden': 'true' });
      this.pre = el('pre', { class: 'hl', 'aria-hidden': 'true' });
      this.ta = el('textarea', { spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': 'C# 程式碼', id: 'codeInput' });
      this.area = el('div', { class: 'ed-area' }, this.pre, this.ta);
      this.body = el('div', { class: 'ed-body' }, this.gutter, this.area);
      this.root = el('div', { class: 'editor' }, this.head, this.body);
      this.ta.addEventListener('input', () => { this.errLines.clear(); this.render(); if (this.onChange) this.onChange(this.ta.value); });
      this.ta.addEventListener('keydown', (e) => this.key(e));
    }
    get value() { return this.ta.value; }
    set value(v) { this.ta.value = v; this.errLines.clear(); this.render(); }
    setReadOnly(b) { this.ta.readOnly = !!b; }
    setErrors(lines) { this.errLines = new Set(lines.filter((n) => n > 0)); this.render(); }
    render() {
      const lines = this.ta.value.split('\n');
      this.pre.innerHTML = lines.map((l, i) => `<span class="ln${this.errLines.has(i + 1) ? ' err' : ''}">${hlLine(l) || '\u200b'}</span>`).join('');
      this.gutter.innerHTML = lines.map((_, i) => `<div class="${this.errLines.has(i + 1) ? 'err' : ''}">${i + 1}</div>`).join('');
      this.pre.style.minWidth = '100%';
    }
    focusLine(n) {
      const lines = this.ta.value.split('\n');
      let pos = 0;
      for (let i = 0; i < n - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      this.ta.focus();
      this.ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
      this.body.scrollTop = Math.max(0, (n - 4) * 21);
    }
    insert(text) {
      this.ta.focus();
      if (!document.execCommand || !document.execCommand('insertText', false, text)) {
        this.ta.setRangeText(text, this.ta.selectionStart, this.ta.selectionEnd, 'end');
        this.ta.dispatchEvent(new Event('input'));
      }
    }
    key(e) {
      if (this.ta.readOnly) return;
      const ta = this.ta;
      const v = ta.value;
      const s = ta.selectionStart;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const before = v.slice(lineStart, s);
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          const m = /^ {1,4}/.exec(v.slice(lineStart));
          if (m) {
            ta.setSelectionRange(lineStart, lineStart + m[0].length);
            this.insert('');
          }
        } else this.insert('    ');
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        let indent = /^\s*/.exec(before)[0];
        if (/\{\s*$/.test(before)) indent += '    ';
        this.insert('\n' + indent);
      } else if (e.key === '}' && /^\s{4,}$/.test(before)) {
        e.preventDefault();
        ta.setSelectionRange(s - 4, s);
        this.insert('}');
      }
    }
  }

  /* =========================================================
   * Console
   * ========================================================= */
  class ConsolePanel {
    constructor(onLine) {
      this.onLine = onLine;
      this.collapse = true;
      this.n = { log: 0, warn: 0, error: 0 };
      this.cnt = el('span', { class: 'counts' });
      this.collapseBtn = el('button', { class: 'btn btn-sm', type: 'button', 'aria-pressed': 'true', onclick: () => { this.collapse = !this.collapse; this.collapseBtn.setAttribute('aria-pressed', String(this.collapse)); this.collapseBtn.textContent = this.collapse ? '合併重複：開' : '合併重複：關'; } }, '合併重複：開');
      this.body = el('div', { class: 'con-body', role: 'log', 'aria-live': 'polite' });
      this.root = el('section', { class: 'panel console', 'aria-label': 'Console' },
        el('div', { class: 'panel-head' }, 'Console', this.cnt, el('span', { class: 'spacer' }), this.collapseBtn, el('button', { class: 'btn btn-sm', type: 'button', onclick: () => this.clear() }, '清除')),
        this.body);
      this.clear();
    }
    clear() {
      this.body.innerHTML = '';
      this.body.appendChild(el('div', { class: 'con-empty' }, '按「執行」後，Debug.Log 的輸出和錯誤訊息會出現在這裡。'));
      this.last = null;
      this.rows = 0;
      this.n = { log: 0, warn: 0, error: 0 };
      this.updateCounts();
    }
    updateCounts() {
      this.cnt.innerHTML = `<span class="e">錯誤 ${this.n.error}</span><span class="w">警告 ${this.n.warn}</span><span>訊息 ${this.n.log}</span>`;
    }
    add(text, kind, opts) {
      kind = kind || 'log';
      opts = opts || {};
      const k = kind === 'info' ? 'log' : kind;
      this.n[k] = (this.n[k] || 0) + 1;
      this.updateCounts();
      if (this.collapse && this.last && this.last.text === text && this.last.kind === kind) {
        this.last.count++;
        this.last.badge.textContent = this.last.count;
        this.last.badge.hidden = false;
        return;
      }
      const empty = this.body.querySelector('.con-empty');
      if (empty) empty.remove();
      const ico = { log: 'i', info: '›', warn: '▲', error: '!' }[kind] || 'i';
      const txt = el('span', { class: 'txt' }, text);
      if (opts.zh) txt.appendChild(el('span', { class: 'zh' }, '中文說明：' + opts.zh));
      const badge = el('span', { class: 'cnt', hidden: true }, '1');
      const go = opts.go || (opts.line && this.onLine ? () => this.onLine(opts.line) : null);
      const row = el('div', { class: `con-line ${kind}${go ? ' clickable' : ''}`, title: go ? `跳到第 ${opts.line} 行` : null }, el('span', { class: 'ico', 'aria-hidden': 'true' }, ico), txt, badge);
      if (go) row.addEventListener('click', go);
      this.body.appendChild(row);
      this.rows++;
      if (this.rows > 300) { this.body.firstChild.remove(); this.rows--; }
      this.last = { text, kind, count: 1, badge };
      this.body.scrollTop = this.body.scrollHeight;
    }
  }

  /* =========================================================
   * 地圖
   * ========================================================= */
  let cur = null;
  function showMap() {
    leaveLevel();
    document.title = 'C# 小勇者';
    const next = LEVELS.find((l) => unlocked(l) && !starsOf(l.id));
    const head = el('div', { class: 'map-head' },
      el('div', null,
        el('h1', null, '冒險地圖'),
        el('p', null, '每一關學一個 C# 概念。寫程式（或從幾段程式裡選一段）控制勇者，前 4 個世界是格子迷宮，之後進入模擬的 Unity 世界。')),
      el('div', { class: 'map-actions' },
        next ? el('a', { class: 'btn btn-primary', href: '#L' + next.id }, `繼續：${next.id} ${next.title}`) : el('span', { class: 'chip chip-unity' }, '全部通關！')));
    const worlds = el('div', { class: 'worlds' });
    for (const w of WORLDS) {
      if (w.genre && !worlds.querySelector('.genre-head')) {
        const gateOk = starsOf(GENRE_GATE) > 0 || S.unlockAll;
        worlds.appendChild(el('div', { class: 'genre-head' },
          el('h2', null, '遊戲類型挑戰'),
          el('p', null, gateOk
            ? '用 Unity 做出不同類型的遊戲：解謎、沙盒、射擊、塔防。四個世界可以照自己喜歡的順序玩。'
            : `完成 ${GENRE_GATE}（重力山谷的最後一關）之後解鎖。這裡會用到前面學的輸入、物理和協程。`)));
      }
      const lvls = LEVELS.filter((l) => l.world === w.id);
      const got = lvls.reduce((s, l) => s + starsOf(l.id), 0);
      const nodes = el('div', { class: 'nodes' }, lvls.map((l) => {
        const ok = unlocked(l);
        const st = starsOf(l.id);
        const b = el('button', {
          class: `node${st ? ' done' : ''}${next === l ? ' next' : ''}`, type: 'button', disabled: !ok,
          'aria-label': `${l.id} ${l.title}${ok ? '' : '（未解鎖）'}，${st} 顆星`,
          onclick: () => { location.hash = 'L' + l.id; }
        }, el('span', { class: 'node-id' }, l.id), el('span', { class: 'node-title' }, l.title), el('span', { class: 'node-stars', html: starsHtml(st) }));
        return b;
      }));
      worlds.appendChild(el('section', { class: 'world', 'aria-label': w.name },
        el('div', { class: 'world-label' },
          el('span', { class: 'world-no' }, `WORLD ${w.id}`),
          el('span', { class: 'world-name' }, w.name),
          el('span', { class: 'world-sub' }, w.sub),
          el('div', { class: 'world-meta' },
            el('span', { class: `chip ${w.id <= 3 ? 'chip-grid' : w.genre ? 'chip-genre' : 'chip-unity'}` }, w.id <= 3 ? '格子迷宮' : w.genre ? w.sub : 'Unity 模擬'),
            el('span', null, `★ ${got} / ${lvls.length * 3}`))),
        nodes));
    }
    const wsCard = el('section', { class: 'world ws-card', 'aria-label': '工作坊' },
      el('div', { class: 'world-label' },
        el('span', { class: 'world-no' }, 'WORKSHOP'),
        el('span', { class: 'world-name' }, '工作坊'),
        el('span', { class: 'world-sub' }, '場景・人物・敵人'),
        el('div', { class: 'world-meta' }, el('span', { class: 'chip chip-unity' }, '自由玩'))),
      el('div', { class: 'ws-desc' },
        el('p', null, '三份完整的 Unity 腳本：用迴圈蓋關卡的 LevelBuilder、會跑會跳的 PlayerController、會巡邏追人的 EnemyPatrol。隨意改程式、在 Inspector 調數值，再用鍵盤實際玩玩看。不判定過關，隨時都能來。'),
        el('a', { class: 'btn btn-primary', href: '#workshop' }, '進入工作坊')));
    app.replaceChildren(head, wsCard, worlds);
    updateTopStars();
    window.scrollTo(0, 0);
  }

  /* =========================================================
   * 關卡畫面
   * ========================================================= */
  function leaveLevel() {
    if (!cur) return;
    cur.token = null;
    if (cur.gview) { cur.gview.abort = true; cur.gview.destroy(); }
    if (cur.player) cur.player.stop(true);
    detachKeys();
    clearTimeout(cur.saveTimer);
    clearTimeout(cur.previewTimer);
    cur = null;
  }

  function showLevel(lv) {
    leaveLevel();
    S.last = lv.id;
    save();
    document.title = `${lv.id} ${lv.title}｜C# 小勇者`;
    const isUnity = lv.kind === 'unity';
    const mode = S.mode[lv.id] || 'code';
    cur = { lv, mode, speed: 1, token: null, running: false, live: false };

    // 頂部列
    const prev = LEVELS[lv.index - 1];
    const next = LEVELS[lv.index + 1];
    const bar = el('div', { class: 'lv-bar' },
      el('a', { class: 'btn btn-ghost btn-sm', href: '#map' }, '← 地圖'),
      el('span', { class: 'lv-id' }, `LV ${lv.id}`),
      el('h1', null, lv.title),
      el('span', { class: 'spacer' }),
      prev ? el('a', { class: 'btn btn-sm', href: '#L' + prev.id }, '← 上一關') : null,
      next ? el('a', { class: 'btn btn-sm', id: 'nextLink', href: unlocked(next) ? '#L' + next.id : null, 'aria-disabled': unlocked(next) ? null : 'true', style: unlocked(next) ? null : 'opacity:.45;pointer-events:none' }, '下一關 →') : null);

    // 左欄：舞台 + Inspector + Console
    const canvas = el('canvas', { id: 'stage', role: 'img', 'aria-label': '遊戲畫面' });
    const freeze = el('div', { class: 'freeze', hidden: true });
    const stageWrap = el('div', { class: 'stage-wrap' }, canvas, freeze);
    const keysRow = el('div', { class: 'keys', hidden: true });
    const stageNote = el('p', { class: 'stage-note', hidden: true });
    const con = new ConsolePanel((line) => { if (cur && cur.mode === 'code') cur.editor.focusLine(line); });
    const inspBody = el('div');
    const inspReset = el('button', { class: 'btn btn-sm', type: 'button' }, 'Reset');
    const insp = el('section', { class: 'panel', 'aria-label': 'Inspector', hidden: !isUnity || lv.noInspector },
      el('div', { class: 'panel-head' }, 'Inspector', el('span', { class: 'spacer' }), inspReset), inspBody);
    const left = el('div', { class: 'col col-left' }, stageWrap, keysRow, stageNote, insp, con.root);

    // 右欄：說明、模式、編輯器或選項
    const brief = el('section', { class: 'brief' },
      el('div', { class: 'concept', html: lv.concept }),
      el('div', { class: 'goal' }, el('span', { class: 'goal-tag' }, '任務'), el('span', null, lv.goal)),
      el('div', { class: 'brief-foot' },
        el('a', { href: lv.handbook, target: '_blank', rel: 'noopener' }, `看手冊：${WORLDS[lv.world].sub}`),
        el('span', null, lv.kind === 'grid' ? '格子迷宮：程式從第一行開始，一行一行執行' : `Unity 模擬：程式寫在 ${lv.file}`)));
    const tabCode = el('button', { class: 'tab', role: 'tab', type: 'button' }, '寫程式');
    const tabChoice = el('button', { class: 'tab', role: 'tab', type: 'button' }, '用選的');
    const runBtn = el('button', { class: 'btn btn-run', type: 'button' }, '▶ 執行');
    const speedBtn = el('button', { class: 'btn', type: 'button', title: '播放速度' }, '速度 1×');
    const liveBtn = el('button', { class: 'btn', type: 'button', hidden: !(isUnity && (lv.keys || lv.mouseLevel)) }, '自己玩');
    const hintBtn = el('button', { class: 'btn', type: 'button' }, '提示');
    const toolbar = el('div', { class: 'toolbar' }, el('div', { class: 'tabs', role: 'tablist' }, tabCode, tabChoice), el('span', { class: 'spacer' }), hintBtn, speedBtn, liveBtn, runBtn);
    const editor = new Editor(lv.file, (v) => {
      clearTimeout(cur.saveTimer);
      cur.saveTimer = setTimeout(() => { S.code[lv.id] = v; save(); }, 400);
      if (isUnity) schedulePreview();
    });
    editor.value = S.code[lv.id] !== undefined ? S.code[lv.id] : lv.starter;
    const choicesBox = el('div', { class: 'choices' });
    const result = el('div', { 'aria-live': 'polite' });
    const hints = el('div', { class: 'hints' });
    const right = el('div', { class: 'col col-right' }, brief, toolbar, editor.root, choicesBox, result, hints);

    app.replaceChildren(bar, el('div', { class: 'lv-grid' }, left, right));
    window.scrollTo(0, 0);

    Object.assign(cur, { editor, con, canvas, stageWrap, freeze, keysRow, stageNote, insp, inspBody, runBtn, speedBtn, liveBtn, hintBtn, result, hints, choicesBox, tabCode, tabChoice });

    // 舞台
    if (isUnity) {
      cur.uview = new US.UnityView(canvas);
      cur.player = new US.UnityPlayer(cur.uview);
      preview();
    } else {
      cur.gview = new GS.GridView(canvas);
      cur.gview.load(lv, 0);
    }

    // 事件
    tabCode.addEventListener('click', () => setMode('code'));
    tabChoice.addEventListener('click', () => setMode('choice'));
    runBtn.addEventListener('click', () => { if (cur.running) stopRun(); else runCode(editor.value); });
    speedBtn.addEventListener('click', () => {
      const steps = isUnity ? [1, 2, 0.5] : [1, 2, 4];
      cur.speed = steps[(steps.indexOf(cur.speed) + 1) % steps.length];
      speedBtn.textContent = `速度 ${cur.speed}×`;
    });
    liveBtn.addEventListener('click', () => { if (cur.running) stopRun(); runCode(cur.mode === 'code' ? editor.value : lv.solution, { live: true }); });
    hintBtn.addEventListener('click', showNextHint);
    editor.resetBtn.addEventListener('click', () => {
      if (editor.resetBtn.dataset.armed) {
        editor.value = lv.starter;
        S.code[lv.id] = lv.starter;
        save();
        delete editor.resetBtn.dataset.armed;
        editor.resetBtn.textContent = '重設程式';
        if (isUnity) schedulePreview();
      } else {
        editor.resetBtn.dataset.armed = '1';
        editor.resetBtn.textContent = '確定要重設？';
        setTimeout(() => { if (editor.resetBtn.dataset.armed) { delete editor.resetBtn.dataset.armed; editor.resetBtn.textContent = '重設程式'; } }, 3000);
      }
    });
    inspReset.addEventListener('click', () => { delete S.insp[lv.id]; save(); preview(); });

    renderHints();
    setMode(mode);
    updateTopStars();
  }

  function setMode(mode) {
    cur.mode = mode;
    S.mode[cur.lv.id] = mode;
    save();
    cur.tabCode.setAttribute('aria-selected', String(mode === 'code'));
    cur.tabChoice.setAttribute('aria-selected', String(mode === 'choice'));
    cur.editor.root.hidden = mode !== 'code';
    cur.runBtn.hidden = mode !== 'code';
    cur.hintBtn.hidden = mode !== 'code';
    cur.choicesBox.hidden = mode !== 'choice';
    cur.result.replaceChildren();
    if (mode === 'choice') renderChoices();
  }

  /* ---------- 選擇模式 ---------- */
  function renderChoices() {
    const lv = cur.lv;
    const starterLines = new Set(lv.starter.split('\n').map((l) => l.trim()));
    const order = shuffled(lv.choices, hash(lv.id));
    cur.choicesBox.replaceChildren(el('p', { class: 'stage-note' }, '從下面挑出能完成任務的程式，按「選這個」就會實際執行，看看勇者會發生什麼事。藍色標記是和起始程式不一樣的地方。'));
    order.forEach(({ x: c }, k) => {
      const letter = 'ABCD'[k];
      const pre = el('pre', { html: c.code.replace(/\n$/, '').split('\n').map((l) => `<span class="ln${l.trim() && !starterLines.has(l.trim()) ? ' chg' : ''}">${hlLine(l) || '\u200b'}</span>`).join('') });
      const verdict = el('div', { class: 'verdict', hidden: true });
      const pick = el('button', { class: 'btn btn-sm btn-primary', type: 'button' }, '選這個');
      const open = el('button', { class: 'btn btn-sm', type: 'button', title: '把這段程式放進編輯器' }, '在編輯器打開');
      const card = el('article', { class: 'choice' }, el('div', { class: 'choice-head' }, el('span', { class: 'choice-letter' }, letter), el('span', { class: 'spacer' }), open, pick), pre, verdict);
      pick.addEventListener('click', () => {
        if (cur.running) stopRun();
        runCode(c.code, { choice: { c, verdict, letter } });
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      open.addEventListener('click', () => {
        cur.editor.value = c.code;
        S.code[lv.id] = c.code;
        save();
        setMode('code');
        if (lv.kind === 'unity') schedulePreview();
      });
      cur.choicesBox.appendChild(card);
    });
  }

  /* ---------- 提示 ---------- */
  function renderHints() {
    const lv = cur.lv;
    const n = S.hints[lv.id] || 0;
    cur.hints.replaceChildren(...lv.hints.slice(0, n).map((h, i) => {
      const isCode = i === 2;
      return el('div', { class: 'hint' }, el('span', { class: 'hint-tag' }, isCode ? '答案' : `提示 ${i + 1}`), isCode ? el('pre', null, h) : el('span', null, h));
    }));
    cur.hintBtn.textContent = n >= 3 ? '提示（已全部顯示）' : `提示 ${n + 1}/3`;
    cur.hintBtn.disabled = n >= 3;
  }
  function showNextHint() {
    const id = cur.lv.id;
    S.hints[id] = Math.min(3, (S.hints[id] || 0) + 1);
    save();
    renderHints();
  }

  /* ---------- Inspector ---------- */
  function nicify(name) {
    return name.replace(/^_/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  }
  function renderInspector(world, entName) {
    if (!cur || cur.insp.hidden) return;
    const info = world && world.inspectorFields(entName);
    if (!info) { cur.inspBody.replaceChildren(el('div', { class: 'insp-empty' }, '這個物件沒有可以在 Inspector 調整的欄位。')); return; }
    const rows = info.rows.map((r) => {
      let input;
      const id = 'insp-' + r.name;
      if (r.editable && typeof r.value === 'number') {
        input = el('input', { type: 'number', step: 'any', id, value: Number.isInteger(r.value) ? r.value : +r.value.toFixed(4) });
        input.addEventListener('change', () => setInsp(info.object, r.name, r.type === 'int' ? Math.trunc(+input.value) : +input.value));
      } else if (r.editable && typeof r.value === 'boolean') {
        input = el('input', { type: 'checkbox', id, checked: r.value });
        input.addEventListener('change', () => setInsp(info.object, r.name, input.checked));
      } else if (r.editable && typeof r.value === 'string') {
        input = el('input', { type: 'text', id, value: r.value });
        input.addEventListener('change', () => setInsp(info.object, r.name, input.value));
      } else input = el('span', { class: 'insp-ref', id }, r.display);
      return el('div', { class: 'insp-row' }, el('label', { for: id, title: `${r.type} ${r.name}` }, nicify(r.name)), input);
    });
    cur.inspBody.replaceChildren(el('div', { class: 'insp-comp' },
      el('div', { class: 'insp-title' }, `${info.script} (Script)`, el('span', { class: 'obj' }, `· 物件 ${info.object}`)),
      rows.length ? rows : el('div', { class: 'stage-note' }, '還沒有欄位出現在 Inspector。public 或加了 [SerializeField] 的欄位才會出現。')));
  }
  function setInsp(obj, field, v) {
    if (cur.workshop) { wsSetInsp(obj, field, v); return; }
    const id = cur.lv.id;
    if (!S.insp[id]) S.insp[id] = {};
    if (!S.insp[id][obj]) S.insp[id][obj] = {};
    S.insp[id][obj][field] = v;
    save();
    if (cur.worlds) cur.worlds.forEach((w) => w.setInspectorValue(field, v));
  }

  /* ---------- Unity 舞台預覽（還沒執行時） ---------- */
  function labelsOf(def) {
    if (def.race) return def.race.map((f) => `${f} FPS`);
    return def.label ? [def.label] : null;
  }
  function schedulePreview() {
    clearTimeout(cur.previewTimer);
    cur.previewTimer = setTimeout(() => { if (cur && !cur.running) preview(); }, 600);
  }
  function preview() {
    const lv = cur.lv;
    const def = US.scenesOf(lv)[0];
    let comp = US.prepare(lv, cur.editor.value);
    const ok = comp.ok;
    if (!ok) comp = compile(lv.hidden || '', {});
    try {
      const worlds = US.makeWorlds(lv, def, comp.prog, { inspector: S.insp[lv.id] });
      cur.worlds = null;
      cur.uview.setWorlds(worlds, labelsOf(def));
      if (ok) renderInspector(worlds[0]);
      else cur.inspBody.replaceChildren(el('div', { class: 'insp-empty' }, '程式有編譯錯誤，修好之後 Inspector 才會顯示欄位。'));
    } catch (e) {
      cur.inspBody.replaceChildren(el('div', { class: 'insp-empty' }, '暫時無法預覽。'));
    }
  }

  /* =========================================================
   * 執行
   * ========================================================= */
  function setRunning(b) {
    if (cur.workshop) { wsSetRunning(b); return; }
    cur.running = b;
    cur.runBtn.textContent = b ? '■ 停止' : '▶ 執行';
    cur.runBtn.className = b ? 'btn btn-stop' : 'btn btn-run';
    cur.liveBtn.textContent = b && cur.live ? '■ 停止' : '自己玩';
    cur.editor.setReadOnly(b);
  }
  function stopRun() {
    if (!cur) return;
    cur.token = null;
    if (cur.gview) cur.gview.abort = true;
    if (cur.player) cur.player.stop();
    setRunning(false);
  }
  function clearFreeze() {
    cur.stageWrap.classList.remove('frozen');
    cur.freeze.hidden = true;
  }
  function showFreeze(err) {
    cur.stageWrap.classList.add('frozen');
    const line = err && err.line ? `（大約在第 ${err.line} 行）` : '';
    const close = el('button', { class: 'btn btn-sm', type: 'button', onclick: clearFreeze }, '強制關閉');
    cur.freeze.replaceChildren(el('div', { class: 'freeze-box', role: 'alertdialog' },
      el('div', { class: 'freeze-title' }, el('span', null, 'Unity Editor (沒有回應)'), el('span', null, '✕')),
      el('div', { class: 'freeze-body' },
        el('p', null, `程式陷入無限迴圈${line}，一直跑不完，整個 Unity 編輯器都卡住了。`),
        el('p', { class: 'stage-note' }, '在真的 Unity 裡只能強制關閉，沒存檔的東西會不見。檢查迴圈的條件：它最後會變成 false 嗎？'),
        el('div', null, close))));
    cur.freeze.hidden = false;
  }
  function logCompile(errors, warnings, file) {
    for (const w of warnings || []) cur.con.add(formatError(w, file), 'warn', { zh: ZH[w.code], line: w.line });
    for (const e of errors || []) cur.con.add(formatError(e, file), 'error', { zh: ZH[e.code], line: e.line });
  }

  function runCode(code, opts) {
    opts = opts || {};
    const lv = cur.lv;
    cur.con.clear();
    clearFreeze();
    cur.result.replaceChildren();
    if (opts.choice) { opts.choice.verdict.hidden = true; }
    cur.editor.setErrors([]);
    cur.live = !!opts.live;
    if (lv.kind === 'grid') runGrid(code, opts);
    else runUnity(code, opts);
  }

  async function runGrid(code, opts) {
    const lv = cur.lv;
    const r = GS.runGrid(lv, code);
    if (r.outcome === 'compile') {
      logCompile(r.errors, r.warnings, lv.file);
      cur.editor.setErrors(r.errors.map((e) => e.line));
      return finish({ outcome: 'compile', errors: r.errors }, code, opts);
    }
    logCompile([], r.warnings, lv.file);
    const token = {};
    cur.token = token;
    setRunning(true);
    let lastErr = null;
    for (let i = 0; i < r.runs.length; i++) {
      const run = r.runs[i];
      cur.gview.load(lv, run.variant);
      await sleep(i ? 450 : 200);
      if (cur.token !== token) return;
      let events = run.events;
      if (run.err && run.err.kind === 'freeze') events = events.slice(0, 30);
      await cur.gview.play(events, { speed: () => cur.speed, onLog: (t, k) => cur.con.add(t, k) });
      if (cur.token !== token) return;
      if (run.err) {
        lastErr = run.err;
        if (run.err.kind === 'freeze') showFreeze(run.err);
        else {
          cur.con.add(formatError(run.err, lv.file), 'error', { zh: ZH[run.err.code], line: run.err.line });
          cur.editor.setErrors([run.err.line]);
        }
      }
    }
    setRunning(false);
    finish({ outcome: r.outcome, msg: r.msg, err: lastErr }, code, opts);
  }

  function runUnity(code, opts) {
    const lv = cur.lv;
    const comp = US.prepare(lv, code);
    if (!comp.ok) {
      logCompile(comp.errors, comp.warnings, lv.file);
      cur.editor.setErrors(comp.errors.map((e) => e.line));
      return finish({ outcome: 'compile', errors: comp.errors }, code, opts);
    }
    logCompile([], comp.warnings, lv.file);
    const userLines = code.split('\n').length;
    const scenes = US.scenesOf(lv);
    const live = !!opts.live;
    let vi = 0;
    setRunning(true);
    const token = {};
    cur.token = token;
    cur.keysRow.hidden = !live;
    cur.stageNote.hidden = !live;
    if (live) {
      cur.stageNote.textContent = lv.mouseLevel
        ? '自由練習：用滑鼠在遊戲畫面上點（左鍵、右鍵都可以）' + (lv.keys ? '，也可以按鍵盤或下面的按鈕' : '') + '。按「執行」才會判定過關。'
        : '自由練習：用鍵盤或下面的按鈕操作（先點一下遊戲畫面以外的地方，不要停在編輯器裡）。按「執行」才會判定過關。';
      renderKeys();
    }
    const start = () => {
      const def = scenes[vi];
      const worlds = US.makeWorlds(lv, def, comp.prog, { inspector: S.insp[lv.id], live });
      worlds[0].onLog = (t, k) => {
        const m = /^(\w+Exception)/.exec(t);
        const line = /\.cs:(\d+)\)/.exec(t);
        cur.con.add(t, k, { zh: m ? ZH[m[1]] : null, line: line && +line[1] <= userLines ? +line[1] : null });
      };
      cur.worlds = worlds;
      cur.uview.setWorlds(worlds, labelsOf(def));
      renderInspector(worlds[0]);
      if (live) attachKeys();
      cur.player.start(worlds, {
        duration: def.duration || 3,
        isDone: lv.done,
        speed: () => cur.speed,
        onEnd: (stopped) => {
          if (!cur || cur.token !== token) return;
          if (live) {
            detachKeys();
            setRunning(false);
            cur.keysRow.hidden = true;
            const reached = lv.done && lv.done(worlds[0]);
            showResult('info', reached ? '你自己玩到終點了！' : '自由練習結束', '自由練習不會判定過關，按「執行」讓程式自己跑一次測試。');
            return;
          }
          if (stopped) { setRunning(false); return; }
          const j = US.judge(lv, worlds, vi);
          let outcome = j.outcome;
          let msg = j.msg;
          if (j.err && j.err.line && j.err.line <= userLines && j.err.kind !== 'freeze') cur.editor.setErrors([j.err.line]);
          if (outcome === 'freeze') showFreeze(j.err);
          if (outcome === 'win' && vi < scenes.length - 1) {
            vi++;
            setTimeout(() => { if (cur && cur.token === token) start(); }, 600);
            return;
          }
          if (outcome === 'win' && lv.rules) {
            const rm = GS.checkRules(lv, code);
            if (rm) { outcome = 'fail'; msg = rm; }
          }
          setRunning(false);
          finish({ outcome, msg, err: j.err }, code, opts);
        }
      });
    };
    start();
  }

  /* ---------- 鍵盤 ---------- */
  const KEYNAME = { ' ': 'space', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Enter: 'enter', Escape: 'escape', Shift: 'shift' };
  function keyOf(e) {
    if (KEYNAME[e.key]) return KEYNAME[e.key];
    if (/^[a-zA-Z0-9]$/.test(e.key)) return e.key.toLowerCase();
    return null;
  }
  function onKey(e) {
    if (!cur || !cur.live || !cur.worlds) return;
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return;
    const k = keyOf(e);
    if (!k) return;
    if (k === 'space' || k.length > 1) e.preventDefault();
    cur.worlds.forEach((w) => {
      if (e.type === 'keydown') { w.liveKeys.add(k); (w.keyLatch || (w.keyLatch = new Set())).add(k); }
      else w.liveKeys.delete(k);
    });
    const b = cur.keysRow.querySelector(`[data-k="${k}"]`);
    if (b) b.classList.toggle('down', e.type === 'keydown');
  }
  // 滑鼠：換算成 Unity 的螢幕座標（像素、原點在左下角，1 格 = 40 像素）
  function onMouse(e) {
    if (!cur || !cur.live || !cur.worlds || !cur.canvas) return;
    const w0 = cur.worlds[0];
    const r = cur.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * w0.W * 40;
    const y = ((r.bottom - e.clientY) / r.height) * w0.H * 40;
    for (const w of cur.worlds) {
      w.liveMouse.x = x;
      w.liveMouse.y = y;
      if (e.type === 'pointerdown') {
        const btn = e.button === 2 ? 'right' : 'left';
        w.liveMouse[btn] = true;
        (w.liveMouse.queue || (w.liveMouse.queue = [])).push({ x, y, btn });
      }
      if (e.type === 'pointerup' || e.type === 'pointerleave') { if (e.button === 2) w.liveMouse.right = false; else w.liveMouse.left = false; if (e.type === 'pointerleave') { w.liveMouse.left = false; w.liveMouse.right = false; } }
    }
    if (e.type === 'pointerdown') e.preventDefault();
  }
  const noMenu = (e) => { if (cur && cur.live) e.preventDefault(); };
  function attachKeys() {
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    if (cur && cur.canvas) {
      for (const t of ['pointermove', 'pointerdown', 'pointerup', 'pointerleave']) cur.canvas.addEventListener(t, onMouse);
      cur.canvas.addEventListener('contextmenu', noMenu);
    }
  }
  function detachKeys() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
    if (cur && cur.canvas) {
      for (const t of ['pointermove', 'pointerdown', 'pointerup', 'pointerleave']) cur.canvas.removeEventListener(t, onMouse);
      cur.canvas.removeEventListener('contextmenu', noMenu);
    }
  }
  function renderKeys() {
    const keys = cur.lv.keys || [];
    cur.keysRow.replaceChildren(...keys.map((k) => {
      const label = { space: 'Space', left: '←', right: '→', up: '↑', down: '↓' }[k] || k.toUpperCase();
      const b = el('button', { class: 'key', type: 'button', 'data-k': k, 'aria-label': k }, label);
      const set = (down) => {
        if (cur && cur.worlds) cur.worlds.forEach((w) => {
          if (down) { w.liveKeys.add(k); (w.keyLatch || (w.keyLatch = new Set())).add(k); } else w.liveKeys.delete(k);
        });
        b.classList.toggle('down', down);
      };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); set(true); });
      b.addEventListener('pointerup', () => set(false));
      b.addEventListener('pointercancel', () => set(false));
      return b;
    }));
  }

  /* ---------- 結果 ---------- */
  const OUTCOME_LABEL = (o) => {
    if (o === 'win') return '過關';
    if (o === 'fail') return '沒有完成任務';
    if (o === 'freeze') return '程式卡住了（無限迴圈）';
    if (o.startsWith('compile:')) return '編譯錯誤 ' + o.slice(8);
    if (o.startsWith('runtime:')) return '執行錯誤 ' + o.slice(8);
    return o;
  };
  function showResult(kind, title, text, actions, starsN) {
    const box = el('div', { class: `result ${kind}` },
      el('div', { class: 'result-title' }, title, starsN !== undefined ? el('span', { class: 'result-stars', 'aria-label': `${starsN} 顆星`, html: starsHtml(starsN) }) : null),
      text ? el('p', null, text) : null,
      actions && actions.length ? el('div', { class: 'result-actions' }, actions) : null);
    cur.result.replaceChildren(box);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function enableNextLink() {
    const a = document.getElementById('nextLink');
    const next = LEVELS[cur.lv.index + 1];
    if (a && next && unlocked(next)) { a.setAttribute('href', '#L' + next.id); a.removeAttribute('aria-disabled'); a.removeAttribute('style'); }
  }
  function finish(r, code, opts) {
    const lv = cur.lv;
    if (r.outcome === 'win') setTimeout(enableNextLink, 0);
    const outcomeKey = r.outcome === 'compile' ? 'compile:' + r.errors[0].code : r.outcome === 'runtime' ? 'runtime:' + (r.err ? r.err.code : '?') : r.outcome;
    const next = LEVELS[lv.index + 1];
    const nextBtn = () => (next ? el('a', { class: 'btn btn-primary', href: '#L' + next.id }, `下一關：${next.title} →`) : el('a', { class: 'btn btn-primary', href: '#map' }, '回地圖'));
    if (opts.choice) {
      const { c, verdict, letter } = opts.choice;
      verdict.hidden = false;
      const won = r.outcome === 'win';
      verdict.className = `verdict ${won ? 'ok' : 'no'}`;
      verdict.replaceChildren(el('b', null, `${won ? '✓ ' : '✗ '}${OUTCOME_LABEL(outcomeKey)}`), el('span', null, c.explain));
      if (r.outcome === 'win') {
        const before = starsOf(lv.id);
        S.stars[lv.id] = Math.max(before, 1);
        save();
        updateTopStars();
        showResult('win', `選項 ${letter} 正確！`, '用選的過關得 1 顆星。試試切換到「寫程式」自己寫一次，可以拿到 3 顆星。', [nextBtn(), el('button', { class: 'btn', type: 'button', onclick: () => setMode('code') }, '改用寫程式挑戰')], S.stars[lv.id]);
      } else {
        showResult('lose', `選項 ${letter}：${OUTCOME_LABEL(outcomeKey)}`, '看看上面的解說，再選一次。');
      }
      return;
    }
    if (r.outcome === 'win') {
      const usedHints = (S.hints[lv.id] || 0) > 0;
      const got = usedHints ? 2 : 3;
      S.stars[lv.id] = Math.max(starsOf(lv.id), got);
      S.code[lv.id] = code;
      save();
      updateTopStars();
      const sol = el('details', null, el('summary', null, '看參考答案'), el('pre', { class: 'hint', style: 'white-space:pre;overflow-x:auto;font-family:var(--font-mono);font-size:12px' }, lv.solution));
      showResult('win', '過關！', usedHints ? '看過提示，這關得到 2 顆星。不看提示重新寫一次可以拿到 3 顆星。' : '沒看提示就寫出來了，3 顆星！', [nextBtn(), el('a', { class: 'btn', href: '#map' }, '回地圖'), sol], got);
      return;
    }
    if (r.outcome === 'compile') {
      const e = r.errors[0];
      showResult('lose', `編譯錯誤 ${e.code}（第 ${e.line} 行）`, `${ZH[e.code] || ''}。Console 有紅字時程式不會執行，點 Console 的錯誤可以跳到那一行。`);
      return;
    }
    if (r.outcome === 'runtime') {
      const e = r.err;
      showResult('lose', `執行時發生錯誤：${e ? e.code : ''}`, `${(e && ZH[e.code]) || r.msg || ''}${e && e.line ? `（第 ${e.line} 行）` : ''}`);
      return;
    }
    if (r.outcome === 'freeze') {
      showResult('lose', '程式卡住了', '無限迴圈：迴圈的條件一直成立，程式永遠跑不完。');
      return;
    }
    showResult('lose', '還沒完成任務', r.msg || '再試試看。', (S.hints[lv.id] || 0) < 3 ? [el('button', { class: 'btn', type: 'button', onclick: showNextHint }, '看下一個提示')] : null);
  }

  /* =========================================================
   * 工作坊
   * ========================================================= */
  const WSKEY = 'csq-workshop-v1';
  const WSS = { code: {}, insp: {}, tab: 'player' };
  try {
    const raw = localStorage.getItem(WSKEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') Object.keys(WSS).forEach((k) => { if (p[k] !== undefined) WSS[k] = p[k]; });
    }
  } catch (e) { /* 讀不到就用預設值 */ }
  function wsSave() { try { localStorage.setItem(WSKEY, JSON.stringify(WSS)); } catch (e) { /* 存不了也沒關係 */ } }
  const WS = () => window.CSQWorkshop;
  const wsFile = (key) => WS().FILES.find((f) => f.key === key);
  const wsCodes = () => { const o = {}; for (const f of WS().FILES) o[f.key] = cur.editors[f.key].value; return o; };

  function showWorkshop() {
    leaveLevel();
    document.title = '工作坊｜C# 小勇者';
    const lv = WS().LEVEL;
    cur = { lv, workshop: true, speed: 1, token: null, running: false, live: true, tab: WSS.tab, editors: {}, tabs: {} };

    const bar = el('div', { class: 'lv-bar' },
      el('a', { class: 'btn btn-ghost btn-sm', href: '#map' }, '← 地圖'),
      el('span', { class: 'lv-id' }, 'WORKSHOP'),
      el('h1', null, '工作坊：場景・人物・敵人'));

    const canvas = el('canvas', { id: 'stage', role: 'img', 'aria-label': '遊戲畫面' });
    const freeze = el('div', { class: 'freeze', hidden: true });
    const stageWrap = el('div', { class: 'stage-wrap', tabindex: '-1' }, canvas, freeze);
    const keysRow = el('div', { class: 'keys' });
    const stageNote = el('p', { class: 'stage-note' }, '操作：A / D 或方向鍵移動、空白鍵跳、R 重新開始。也可以按上面的按鈕。');
    const con = new ConsolePanel(null);
    const inspBody = el('div');
    const inspReset = el('button', { class: 'btn btn-sm', type: 'button', title: '清除這個物件在 Inspector 改過的數值' }, 'Reset');
    const insp = el('section', { class: 'panel', 'aria-label': 'Inspector' }, el('div', { class: 'panel-head' }, 'Inspector', el('span', { class: 'spacer' }), inspReset), inspBody);
    const left = el('div', { class: 'col col-left' }, stageWrap, keysRow, stageNote, insp, con.root);

    const tablist = el('div', { class: 'tabs', role: 'tablist' });
    const intro = el('div', { class: 'concept' });
    const brief = el('section', { class: 'brief' }, tablist, intro);
    const playBtn = el('button', { class: 'btn btn-run', type: 'button' }, '▶ 開始玩');
    const restartBtn = el('button', { class: 'btn', type: 'button', title: '重新載入場景（同 R 鍵）' }, '重新開始');
    const speedBtn = el('button', { class: 'btn', type: 'button' }, '速度 1×');
    const toolbar = el('div', { class: 'toolbar' }, el('span', { class: 'stage-note' }, '三份腳本會一起編譯'), el('span', { class: 'spacer' }), speedBtn, restartBtn, playBtn);
    const edWrap = el('div', { style: 'min-width:0' });
    const challenges = el('section', { class: 'brief ws-challenges' });
    const result = el('div', { 'aria-live': 'polite' });
    const right = el('div', { class: 'col col-right' }, brief, toolbar, edWrap, result, challenges);
    app.replaceChildren(bar, el('div', { class: 'lv-grid' }, left, right));
    window.scrollTo(0, 0);

    Object.assign(cur, { con, canvas, stageWrap, freeze, keysRow, stageNote, insp, inspBody, intro, challenges, result, playBtn, restartBtn, edWrap });

    for (const f of WS().FILES) {
      const dot = el('span', { class: 'tab-dot', hidden: true, 'aria-label': '有錯誤' });
      const t = el('button', { class: 'tab', role: 'tab', type: 'button' }, f.label, dot);
      t.addEventListener('click', () => wsTab(f.key));
      tablist.appendChild(t);
      cur.tabs[f.key] = { btn: t, dot };
      const ed = new Editor(f.file, (v) => {
        WSS.code[f.key] = v;
        clearTimeout(cur.saveTimer);
        cur.saveTimer = setTimeout(wsSave, 400);
        dot.hidden = true;
        if (!cur.running) { clearTimeout(cur.previewTimer); cur.previewTimer = setTimeout(() => { if (cur && cur.workshop && !cur.running) wsPreview(); }, 600); }
      });
      ed.value = WSS.code[f.key] !== undefined ? WSS.code[f.key] : f.code;
      ed.root.hidden = true;
      ed.resetBtn.textContent = '重設這個腳本';
      ed.resetBtn.addEventListener('click', () => {
        if (ed.resetBtn.dataset.armed) {
          ed.value = f.code;
          delete WSS.code[f.key];
          wsSave();
          delete ed.resetBtn.dataset.armed;
          ed.resetBtn.textContent = '重設這個腳本';
          if (!cur.running) wsPreview();
        } else {
          ed.resetBtn.dataset.armed = '1';
          ed.resetBtn.textContent = '確定要重設？';
          setTimeout(() => { if (ed.resetBtn.dataset.armed) { delete ed.resetBtn.dataset.armed; ed.resetBtn.textContent = '重設這個腳本'; } }, 3000);
        }
      });
      cur.editors[f.key] = ed;
      edWrap.appendChild(ed.root);
    }

    cur.uview = new US.UnityView(canvas);
    cur.player = new US.UnityPlayer(cur.uview);
    renderKeys();
    playBtn.addEventListener('click', () => { if (cur.running) stopRun(); else wsPlay(); });
    restartBtn.addEventListener('click', () => {
      if (cur.running && cur.worlds) { const w = cur.worlds[0]; w.timeScale = 1; w.reloadRequested = true; stageWrap.focus(); }
      else wsPlay();
    });
    speedBtn.addEventListener('click', () => {
      const steps = [1, 0.5, 2];
      cur.speed = steps[(steps.indexOf(cur.speed) + 1) % steps.length];
      speedBtn.textContent = `速度 ${cur.speed}×`;
    });
    inspReset.addEventListener('click', () => {
      const ent = wsFile(cur.tab).entity;
      delete WSS.insp[ent];
      wsSave();
      if (cur.running) cur.result.replaceChildren(el('div', { class: 'result info' }, el('p', null, '已清除 Inspector 改過的數值，按「重新開始」後生效。')));
      else wsPreview();
    });
    wsTab(cur.tab);
    wsPreview();
    updateTopStars();
  }

  function wsTab(key) {
    cur.tab = key;
    WSS.tab = key;
    wsSave();
    const f = wsFile(key);
    for (const k of Object.keys(cur.tabs)) {
      cur.tabs[k].btn.setAttribute('aria-selected', String(k === key));
      cur.editors[k].root.hidden = k !== key;
    }
    cur.intro.innerHTML = f.intro;
    cur.challenges.replaceChildren(el('h2', { style: 'font-size:1rem' }, '試試看'),
      ...f.challenges.map((c) => el('div', { class: 'hint' },
        el('span', { class: 'hint-tag' }, c.title),
        el('span', null, c.text),
        c.code ? el('pre', null, c.code) : null)));
    const w = cur.worlds ? cur.worlds[0] : cur.previewWorld;
    if (w) renderInspector(w, f.entity);
  }

  function wsSetInsp(obj, field, v) {
    if (!WSS.insp[obj]) WSS.insp[obj] = {};
    WSS.insp[obj][field] = v;
    wsSave();
    if (cur.running && cur.worlds) {
      cur.worlds[0].setInspectorValue(field, v, obj);
      if (obj === 'Builder') cur.result.replaceChildren(el('div', { class: 'result info' }, el('p', null, '場景是在 Start() 蓋好的，按「重新開始」（或 R 鍵）才會用新的數值重新蓋。')));
    } else wsPreview();
  }

  function wsSetRunning(b) {
    cur.running = b;
    cur.playBtn.textContent = b ? '■ 停止' : '▶ 開始玩';
    cur.playBtn.className = b ? 'btn btn-stop' : 'btn btn-run';
    for (const ed of Object.values(cur.editors)) ed.setReadOnly(b);
  }

  function wsCompile() {
    const c = WS().compileAll(wsCodes());
    for (const f of WS().FILES) { cur.tabs[f.key].dot.hidden = true; cur.editors[f.key].setErrors([]); }
    const goTo = (e) => () => { if (e.fileKey) { wsTab(e.fileKey); cur.editors[e.fileKey].focusLine(e.line); } };
    for (const w of c.warnings) cur.con.add(formatError(w, w.file), 'warn', { zh: ZH[w.code], line: w.line, go: goTo(w) });
    for (const e of c.errors) {
      cur.con.add(formatError(e, e.file), 'error', { zh: ZH[e.code], line: e.line, go: goTo(e) });
      if (e.fileKey) {
        cur.tabs[e.fileKey].dot.hidden = false;
        cur.editors[e.fileKey].setErrors([...cur.editors[e.fileKey].errLines, e.line]);
      }
    }
    return c;
  }

  function wsPreview() {
    if (!cur || !cur.workshop) return;
    cur.con.clear();
    const c = wsCompile();
    if (!c.ok) {
      cur.inspBody.replaceChildren(el('div', { class: 'insp-empty' }, '程式有編譯錯誤，修好之後 Inspector 才會顯示欄位。'));
      return;
    }
    try {
      const w = new US.UWorld(WS().LEVEL, WS().SCENE_DEF, c.prog, { inspector: WSS.insp, formatErr: c.formatErr });
      w.onLog = () => {};
      w.step();
      w.step();
      cur.previewWorld = w;
      cur.uview.setWorlds([w]);
      renderInspector(w, wsFile(cur.tab).entity);
    } catch (e) {
      cur.inspBody.replaceChildren(el('div', { class: 'insp-empty' }, '暫時無法預覽。'));
    }
  }

  function wsPlay() {
    cur.con.clear();
    cur.result.replaceChildren();
    clearFreeze();
    const c = wsCompile();
    if (!c.ok) {
      const e = c.errors[0];
      cur.result.replaceChildren(el('div', { class: 'result lose' },
        el('div', { class: 'result-title' }, `${e.file} 第 ${e.line} 行：編譯錯誤 ${e.code}`),
        el('p', null, `${ZH[e.code] || ''}。有紅點的分頁就是出錯的腳本，點 Console 的錯誤可以直接跳過去。`)));
      return;
    }
    const lv = WS().LEVEL;
    const w = new US.UWorld(lv, WS().SCENE_DEF, c.prog, { inspector: WSS.insp, live: true, formatErr: c.formatErr });
    w.onLog = (t, k) => {
      const m = /^(\w+Exception)/.exec(t);
      const loc = /Scripts\/(\w+\.cs):(\d+)\)/.exec(t);
      const f = loc && WS().FILES.find((x) => x.file === loc[1]);
      cur.con.add(t, k, { zh: m ? ZH[m[1]] : null, line: loc ? +loc[2] : null, go: f ? () => { wsTab(f.key); cur.editors[f.key].focusLine(+loc[2]); } : null });
    };
    cur.worlds = [w];
    cur.previewWorld = null;
    cur.uview.setWorlds(cur.worlds);
    const token = {};
    cur.token = token;
    setRunning(true);
    attachKeys();
    // 敵人是 Start 之後才生成的，場景重新載入後物件也會換新，所以要重畫 Inspector
    let shownFor = -1;
    let readyAt = 3;
    cur.player.start(cur.worlds, {
      duration: 1e9,
      maxLive: 1800,
      speed: () => cur.speed,
      onFrame: () => {
        if (shownFor !== w.stats.reloads) { shownFor = w.stats.reloads; readyAt = w.frame + 3; }
        if (readyAt && w.frame >= readyAt) { readyAt = 0; renderInspector(w, wsFile(cur.tab).entity); }
      },
      onEnd: () => {
        if (!cur || cur.token !== token) return;
        detachKeys();
        setRunning(false);
        if (w.frozen) showFreeze(w.frozen);
      }
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    cur.stageWrap.focus({ preventScroll: true });
  }

  /* =========================================================
   * 設定、路由、啟動
   * ========================================================= */
  const settings = document.getElementById('settings');
  const unlockAll = document.getElementById('unlockAll');
  const resetBtn = document.getElementById('resetBtn');
  const resetConfirm = document.getElementById('resetConfirm');
  document.getElementById('settingsBtn').addEventListener('click', () => {
    unlockAll.checked = !!S.unlockAll;
    resetConfirm.hidden = true;
    settings.hidden = false;
  });
  document.getElementById('settingsClose').addEventListener('click', () => { settings.hidden = true; route(); });
  settings.addEventListener('click', (e) => { if (e.target === settings) { settings.hidden = true; route(); } });
  unlockAll.addEventListener('change', () => { S.unlockAll = unlockAll.checked; save(); });
  resetBtn.addEventListener('click', () => {
    if (resetConfirm.hidden) { resetConfirm.hidden = false; return; }
    S.stars = {}; S.code = {}; S.hints = {}; S.mode = {}; S.insp = {}; S.last = null;
    save();
    resetConfirm.hidden = true;
    settings.hidden = true;
    location.hash = 'map';
    route();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !settings.hidden) { settings.hidden = true; route(); } });

  function route() {
    const h = location.hash.slice(1);
    if (h === 'workshop') { if (!cur || !cur.workshop) showWorkshop(); return; }
    if (h.startsWith('L')) {
      const lv = LEVELS.find((l) => 'L' + l.id === h);
      if (lv && unlocked(lv)) { if (!cur || cur.lv !== lv) showLevel(lv); return; }
    }
    showMap();
  }
  window.addEventListener('hashchange', route);

  // 標誌的小勇者
  (function drawLogo() {
    const c = document.getElementById('logoIcon');
    const ctx = c.getContext('2d');
    window.Sprites.draw(ctx, 'hero', 0, 0, 12);
  })();

  route();
})();
