/* C# 小勇者：格子世界（W0–W3）
 * 先同步執行玩家的程式、產生事件時間軸，再由 GridView 依序播放動畫。
 */
(function (root) {
  'use strict';
  const { compile, Runtime, CsError, sig, fmt, floatStr } = root.CSQ;

  const GRID_SPEC = {
    funcs: {
      MoveRight: sig('void', ['int'], 0), MoveLeft: sig('void', ['int'], 0),
      MoveUp: sig('void', ['int'], 0), MoveDown: sig('void', ['int'], 0),
      Attack: sig('void', []), Jump: sig('void', ['float'], 0),
      SeeEnemy: sig('bool', []), IsPathClear: sig('bool', []), CanMove: sig('bool', ['string']),
      AtFlag: sig('bool', []), CoinsLeft: sig('int', []), OnItem: sig('bool', []), PickUp: sig('string', []),
      Say: sig('void', ['?']), SetLever: sig('void', ['bool']), Pay: sig('void', ['float']),
      DoorColor: sig('string', []), UseKey: sig('void', ['string']), Weight: sig('int', []), DropItem: sig('void', []),
      HasKey: sig('bool', []), IsNight: sig('bool', []), ReadMap: sig('int[]', []), ReadCode: sig('int[]', []),
      IsLavaAhead: sig('bool', []), Summon: sig('void', ['?'])
    }
  };

  const DIRS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
  const KEY_OF = { red: '火焰鑰匙', blue: '冰霜鑰匙', green: '森林鑰匙' };
  const COLOR_CH = { r: 'red', b: 'blue', g: 'green' };
  const MAX_EVENTS = 500;

  class EndSignal { constructor(reason) { this.reason = reason; } }

  /* =========================================================
   * 世界狀態
   * ========================================================= */
  class GridWorld {
    constructor(level, variant) {
      this.level = level;
      this.variant = variant;
      this.data = Object.assign({}, level.data || {}, variant.data || {});
      const rows = variant.map;
      this.h = rows.length;
      this.w = Math.max(...rows.map((r) => r.length));
      this.tiles = [];
      this.coins = new Map();
      this.enemies = new Map();
      this.items = new Map();
      this.gates = new Map(); // 'x,y' → { kind: 'gate'|'merchant'|'rock'|'door', color, open }
      this.flag = null;
      this.hero = { x: 1, y: 1, dir: 'right', alive: true };
      this.said = [];
      this.inventory = [];
      this.logs = [];
      this.events = [];
      this.lever = null;
      this.paid = null;
      this.weight = this.data.weight || 0;
      this.dropped = false;
      this.summoned = [];
      const itemNames = (this.data.items || []).slice();
      for (let y = 0; y < this.h; y++) {
        const row = [];
        for (let x = 0; x < this.w; x++) {
          const ch = rows[y][x] || '#';
          const k = x + ',' + y;
          let base = '.';
          switch (ch) {
            case '#': base = '#'; break;
            case 'L': base = 'L'; break;
            case 'W': base = 'W'; break;
            case 'H': this.hero.x = x; this.hero.y = y; break;
            case 'F': this.flag = { x, y }; break;
            case 'C': this.coins.set(k, true); break;
            case 'S': this.enemies.set(k, { kind: 'slime', hp: 1 }); break;
            case 'D': this.gates.set(k, { kind: 'gate', open: false }); break;
            case 'M': this.gates.set(k, { kind: 'merchant', open: false }); break;
            case 'R': this.gates.set(k, { kind: 'rock', open: false }); break;
            case 'r': case 'b': case 'g': this.gates.set(k, { kind: 'door', color: COLOR_CH[ch], open: false }); break;
            case 'K': this.items.set(k, { name: this.data.itemName || '鑰匙', sprite: 'key' }); break;
            case 'I': this.items.set(k, { name: itemNames.shift() || '藥水', sprite: 'gem' }); break;
            case 'X': this.items.set(k, { name: this.data.chestItem || '寶箱', sprite: 'chest', chest: true }); break;
            default: base = '.';
          }
          row.push(base);
        }
        this.tiles.push(row);
      }
    }
    key(x, y) { return x + ',' + y; }
    inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    tile(x, y) { return this.inside(x, y) ? this.tiles[y][x] : '#'; }
    blocked(x, y) {
      if (this.tile(x, y) === '#') return true;
      const g = this.gates.get(this.key(x, y));
      return !!(g && !g.open);
    }
    front() {
      const d = DIRS[this.hero.dir];
      return { x: this.hero.x + d[0], y: this.hero.y + d[1] };
    }
    push(ev) {
      this.events.push(ev);
      if (this.events.length > MAX_EVENTS) {
        throw new CsError('freeze', 'FREEZE', 'Unity 沒有回應：勇者一直重複動作停不下來，可能是無限迴圈', 0, 0);
      }
    }
    die(reason) {
      this.hero.alive = false;
      this.push({ t: 'die', reason, at: [this.hero.x, this.hero.y] });
      throw new EndSignal(reason);
    }
    arrive() {
      const h = this.hero;
      const k = this.key(h.x, h.y);
      if (this.coins.has(k)) { this.coins.delete(k); this.push({ t: 'coin', at: [h.x, h.y] }); }
      if (this.tile(h.x, h.y) === 'L') { this.push({ t: 'burn', at: [h.x, h.y] }); this.die('掉進岩漿了'); }
      if (this.tile(h.x, h.y) === 'W' && this.weight > 50) {
        this.push({ t: 'collapse', at: [h.x, h.y] });
        this.die(`吊橋只能承受 50 公斤，你有 ${this.weight} 公斤，橋斷了`);
      }
      if (this.enemies.has(k)) this.die('撞上了史萊姆');
    }
    move(dir, n) {
      if (n === undefined) n = 1;
      this.hero.dir = dir;
      if (n <= 0) { this.push({ t: 'turn', dir }); return; }
      for (let i = 0; i < n; i++) {
        const d = DIRS[dir];
        const nx = this.hero.x + d[0];
        const ny = this.hero.y + d[1];
        if (this.blocked(nx, ny)) { this.push({ t: 'bump', dir, at: [this.hero.x, this.hero.y] }); return; }
        if (this.enemies.has(this.key(nx, ny))) {
          this.push({ t: 'move', dir, from: [this.hero.x, this.hero.y], to: [nx, ny], half: true });
          this.die('撞上了史萊姆');
        }
        this.push({ t: 'move', dir, from: [this.hero.x, this.hero.y], to: [nx, ny] });
        this.hero.x = nx;
        this.hero.y = ny;
        this.arrive();
      }
    }
    openGates(kind, color) {
      for (const [k, g] of this.gates) {
        if (g.kind === kind && !g.open && (!color || g.color === color)) {
          g.open = true;
          this.push({ t: 'open', at: k.split(',').map(Number), kind });
        }
      }
    }

    /* ---------- 給程式呼叫的指令 ---------- */
    funcs() {
      const w = this;
      const str = (v, node) => (v === null || v === undefined ? 'Null' : fmt(v, node && node.args[0] && node.args[0].ty));
      return {
        MoveRight: (a) => w.move('right', a[0]),
        MoveLeft: (a) => w.move('left', a[0]),
        MoveUp: (a) => w.move('up', a[0]),
        MoveDown: (a) => w.move('down', a[0]),
        Attack: () => {
          const f = w.front();
          const k = w.key(f.x, f.y);
          const e = w.enemies.get(k);
          if (e) {
            e.hp--;
            const kill = e.hp <= 0;
            if (kill) w.enemies.delete(k);
            w.push({ t: 'attack', dir: w.hero.dir, target: [f.x, f.y], kill });
          } else if (w.coins.has(k)) {
            w.coins.delete(k);
            w.smashed = (w.smashed || 0) + 1;
            w.push({ t: 'attack', dir: w.hero.dir, target: [f.x, f.y] });
            w.push({ t: 'smash', at: [f.x, f.y] });
          } else w.push({ t: 'attack', dir: w.hero.dir, miss: true });
        },
        Jump: (a) => {
          const dist = Math.round(a.length ? a[0] : 2);
          const d = DIRS[w.hero.dir];
          const tx = w.hero.x + d[0] * dist;
          const ty = w.hero.y + d[1] * dist;
          if (dist <= 0) { w.push({ t: 'hop', at: [w.hero.x, w.hero.y] }); return; }
          if (w.blocked(tx, ty)) { w.push({ t: 'bump', dir: w.hero.dir, at: [w.hero.x, w.hero.y] }); return; }
          w.push({ t: 'jump', from: [w.hero.x, w.hero.y], to: [tx, ty] });
          w.hero.x = tx;
          w.hero.y = ty;
          w.arrive();
        },
        SeeEnemy: () => { const f = w.front(); return w.enemies.has(w.key(f.x, f.y)); },
        IsPathClear: () => {
          const f = w.front();
          return !w.blocked(f.x, f.y) && w.tile(f.x, f.y) !== 'L' && !w.enemies.has(w.key(f.x, f.y));
        },
        CanMove: (a) => {
          const d = DIRS[a[0]];
          if (!d) return false;
          const x = w.hero.x + d[0];
          const y = w.hero.y + d[1];
          return !w.blocked(x, y) && w.tile(x, y) !== 'L' && !w.enemies.has(w.key(x, y));
        },
        AtFlag: () => !!(w.flag && w.hero.x === w.flag.x && w.hero.y === w.flag.y),
        CoinsLeft: () => w.coins.size,
        OnItem: () => w.items.has(w.key(w.hero.x, w.hero.y)),
        PickUp: () => {
          const k = w.key(w.hero.x, w.hero.y);
          const it = w.items.get(k);
          if (!it) { w.push({ t: 'say', text: '這裡什麼都沒有', who: 'hero' }); return ''; }
          w.items.delete(k);
          w.inventory.push(it.name);
          w.push({ t: 'pickup', at: [w.hero.x, w.hero.y], name: it.name, sprite: it.sprite });
          return it.name;
        },
        Say: (a, rt, node) => {
          const text = str(a[0], node);
          w.said.push(text);
          w.push({ t: 'say', text, who: 'hero' });
          if (w.data.password !== undefined) {
            if (text === w.data.password) w.openGates('gate');
            else w.push({ t: 'say', text: '密語不對喔', who: 'gate' });
          }
          if (w.data.answer !== undefined) {
            if (text === String(w.data.answer)) w.push({ t: 'chest', open: true });
            else w.push({ t: 'say', text: `寶箱沒有反應（你說了 ${text}）`, who: 'gate' });
          }
        },
        SetLever: (a) => {
          w.lever = !!a[0];
          w.push({ t: 'lever', on: w.lever });
          if (w.lever) {
            if (w.data.isNight) {
              w.openGates('gate');
              w.push({ t: 'ghost' });
              w.die('晚上打開了門，幽靈跑出來了');
            }
            w.openGates('gate');
          }
        },
        Pay: (a) => {
          const amt = a[0];
          w.paid = amt;
          w.push({ t: 'pay', amount: amt });
          const price = w.data.price;
          if (price !== undefined && Math.abs(amt - price) < 1e-6) {
            w.push({ t: 'say', text: '謝謝惠顧！', who: 'merchant' });
            w.openGates('merchant');
          } else {
            w.push({ t: 'say', text: `我要 ${floatStr(price)} 枚，你只給 ${floatStr(amt)} 枚`, who: 'merchant' });
          }
        },
        DoorColor: () => {
          const f = w.front();
          const g = w.gates.get(w.key(f.x, f.y));
          return g && g.kind === 'door' ? g.color : 'none';
        },
        UseKey: (a) => {
          const f = w.front();
          const g = w.gates.get(w.key(f.x, f.y));
          w.push({ t: 'usekey', name: a[0] });
          if (!g || g.kind !== 'door') { w.push({ t: 'say', text: '前面沒有門', who: 'hero' }); return; }
          if (KEY_OF[g.color] === a[0]) { g.open = true; w.push({ t: 'open', at: [f.x, f.y], kind: 'door' }); } else w.push({ t: 'say', text: '鑰匙對不上', who: 'hero' });
        },
        Weight: () => w.weight,
        DropItem: () => { w.dropped = true; w.weight = 30; w.push({ t: 'drop' }); },
        HasKey: () => !!w.data.hasKey,
        IsNight: () => !!w.data.isNight,
        ReadMap: () => ({ kind: 'array', elem: 'int', items: (w.data.path || []).slice() }),
        ReadCode: () => ({ kind: 'array', elem: 'int', items: (w.data.code || []).slice() }),
        IsLavaAhead: () => { const f = w.front(); return w.tile(f.x, f.y) === 'L'; },
        Summon: (a) => {
          const o = a[0];
          if (!o || o.kind !== 'obj') { w.push({ t: 'say', text: '沒有召喚出任何東西', who: 'hero' }); return; }
          const power = o.fields.get('power') || 0;
          const name = o.fields.get('name') || o.cls.name;
          w.summoned.push({ name, power });
          w.push({ t: 'summon', name, power, idx: w.summoned.length - 1 });
          const total = w.summoned.reduce((s, x) => s + x.power, 0);
          if (w.data.rockPower !== undefined && total >= w.data.rockPower) {
            if (total === w.data.rockPower) w.openGates('rock');
            else w.push({ t: 'say', text: `力量 ${total} 太大，石頭被推進了河裡…路也塌了`, who: 'hero' });
          }
        }
      };
    }
  }

  /* =========================================================
   * 判定
   * ========================================================= */
  function stripComments(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  }
  function checkRules(level, code) {
    const src = stripComments(code);
    if (level.maxMoves !== undefined) {
      const n = (src.match(/\bMove(Right|Left|Up|Down)\s*\(/g) || []).length;
      if (n > level.maxMoves) return `這關最多只能寫 ${level.maxMoves} 個 Move 指令（你寫了 ${n} 個），試試用迴圈或方法`;
    }
    for (const r of level.rules || []) {
      const ok = new RegExp(r.re, r.flags || '').test(src);
      if (r.not ? ok : !ok) return r.msg;
    }
    return null;
  }
  function evaluate(level, world) {
    const checks = world.variant.check || level.check || ['flag'];
    const h = world.hero;
    for (const c of checks) {
      const [name, arg] = c.split(':');
      switch (name) {
        case 'flag':
          if (!h.alive) return { ok: false, msg: '勇者倒下了' };
          if (!world.flag || h.x !== world.flag.x || h.y !== world.flag.y) return { ok: false, msg: '勇者沒有停在旗子上' };
          break;
        case 'alive':
          if (!h.alive) return { ok: false, msg: '勇者倒下了' };
          break;
        case 'coins':
          if (world.smashed) return { ok: false, msg: `打碎了 ${world.smashed} 枚金幣` };
          if (world.coins.size > 0) return { ok: false, msg: `還有 ${world.coins.size} 枚金幣沒撿到` };
          break;
        case 'log': {
          const want = level.expectLog || [];
          const got = world.logs.filter((l) => l.kind === 'log').map((l) => l.text);
          if (got.length !== want.length || got.some((g, i) => g !== want[i])) {
            return { ok: false, msg: `Console 應該要印出：${want.join('、')}` + (got.length ? `\n實際印出：${got.slice(0, 5).join('、')}` : '\n實際上什麼都沒印') };
          }
          break;
        }
        case 'logHas': {
          const got = world.logs.map((l) => l.text);
          if (!got.some((g) => g.includes(arg))) return { ok: false, msg: `Console 裡沒有出現「${arg}」` };
          break;
        }
        case 'said':
          if (!world.said.includes(String(world.data.password !== undefined ? world.data.password : world.data.answer))) return { ok: false, msg: '沒有說出正確的話' };
          break;
        case 'lever':
          if (!h.alive) return { ok: false, msg: '勇者倒下了' };
          if (world.lever !== !!world.data.expectLever) return { ok: false, msg: world.data.expectLever ? '這次門應該要打開' : '這次門不應該打開' };
          break;
        case 'item':
          if (!h.alive) return { ok: false, msg: '勇者倒下了' };
          if (!world.inventory.includes(world.data.itemName || '鑰匙')) return { ok: false, msg: '沒有撿到鑰匙' };
          break;
        case 'items':
          if (world.items.size > 0) return { ok: false, msg: `還有 ${world.items.size} 個道具沒撿` };
          break;
        case 'notDropped':
          if (world.dropped && (world.data.weight || 0) <= 50) return { ok: false, msg: `體重才 ${world.data.weight} 公斤，不用丟掉寶物也能過橋` };
          break;
        case 'gates':
          for (const g of world.gates.values()) if (!g.open && g.kind !== 'door') return { ok: false, msg: '門還沒打開' };
          break;
        default:
      }
    }
    return { ok: true };
  }

  /* =========================================================
   * 執行一關
   * ========================================================= */
  function runGrid(level, code, opts) {
    opts = opts || {};
    const comp = compile(code, { spec: GRID_SPEC });
    const variants = level.variants || [{ map: level.map }];
    if (!comp.ok) return { outcome: 'compile', errors: comp.errors, warnings: comp.warnings, runs: [] };
    const idxs = opts.variant !== undefined ? [opts.variant] : variants.map((_, i) => i);
    const runs = [];
    for (const i of idxs) {
      const world = new GridWorld(level, variants[i]);
      const rt = new Runtime(comp.prog, {
        host: {
          funcs: world.funcs(),
          log: (text, kind) => { world.logs.push({ text, kind }); world.push({ t: 'log', text, kind }); }
        },
        maxSteps: 50000,
        seed: 7 + i
      });
      let err = null;
      try {
        rt.runMain();
      } catch (e) {
        if (e instanceof EndSignal) { /* 勇者倒下 */ }
        else if (e instanceof CsError) err = e;
        else throw e;
      }
      const check = err ? { ok: false } : evaluate(level, world);
      runs.push({ variant: i, world, events: world.events, err, check });
      if (err || !check.ok) break;
    }
    const last = runs[runs.length - 1];
    let outcome = 'win';
    let msg = null;
    if (last.err) outcome = last.err.kind === 'freeze' ? 'freeze' : 'runtime';
    else if (!last.check.ok) { outcome = 'fail'; msg = last.check.msg; }
    else {
      const rule = checkRules(level, code);
      if (rule) { outcome = 'fail'; msg = rule; }
    }
    return { outcome, msg, warnings: comp.warnings, runs, errors: [] };
  }

  /* =========================================================
   * 畫面
   * ========================================================= */
  const S = () => root.Sprites;
  const TS = 48;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class GridView {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.st = null;
      this.fx = [];
      this.bubbles = [];
      this.running = true;
      this.reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const loop = (t) => {
        if (!this.running) return;
        this.now = t;
        this.draw(t);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    destroy() { this.running = false; }
    load(level, variantIdx) {
      const variants = level.variants || [{ map: level.map }];
      const w = new GridWorld(level, variants[variantIdx || 0]);
      this.st = {
        w: w.w, h: w.h, tiles: w.tiles,
        coins: new Map(w.coins), enemies: new Map([...w.enemies].map(([k, v]) => [k, Object.assign({}, v)])),
        items: new Map(w.items), gates: new Map([...w.gates].map(([k, v]) => [k, Object.assign({}, v)])),
        flag: w.flag, hero: { x: w.hero.x, y: w.hero.y, dir: 'right', dead: false, ox: 0, oy: 0, lift: 0 },
        summons: [], ghost: false, label: variants.length > 1 ? `測試 ${(variantIdx || 0) + 1} / ${variants.length}` : '',
        night: !!(Object.assign({}, level.data, variants[variantIdx || 0].data).isNight)
      };
      this.fx = [];
      this.bubbles = [];
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      this.cv.width = w.w * TS * dpr;
      this.cv.height = w.h * TS * dpr;
      this.cv.style.aspectRatio = `${w.w} / ${w.h}`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    bubble(text, who, ms) {
      this.bubbles = this.bubbles.filter((b) => b.who !== who);
      this.bubbles.push({ text, who, until: performance.now() + (ms || 1400) });
    }
    tween(ms, fn) {
      if (this.reduced) { fn(1); return Promise.resolve(); }
      return new Promise((resolve) => {
        const start = performance.now();
        const step = () => {
          const p = Math.min(1, (performance.now() - start) / ms);
          fn(p);
          if (p < 1 && !this.abort) requestAnimationFrame(step); else { fn(1); resolve(); }
        };
        step();
      });
    }
    async play(events, opts) {
      opts = opts || {};
      this.abort = false;
      const sp = () => opts.speed ? opts.speed() : 1;
      const h = this.st.hero;
      for (const ev of events) {
        if (this.abort) return;
        const D = (ms) => ms / sp();
        switch (ev.t) {
          case 'move': {
            h.dir = ev.dir;
            const [fx, fy] = ev.from;
            const [tx, ty] = ev.to;
            const end = ev.half ? 0.45 : 1;
            await this.tween(D(170), (p) => { h.x = fx + (tx - fx) * p * end; h.y = fy + (ty - fy) * p * end; });
            break;
          }
          case 'turn': h.dir = ev.dir; await sleep(D(80)); break;
          case 'bump': {
            h.dir = ev.dir;
            const d = DIRS[ev.dir];
            this.fx.push({ kind: 'bonk', x: h.x + d[0] * 0.5, y: h.y + d[1] * 0.5, t0: performance.now(), dur: 400 });
            await this.tween(D(180), (p) => { const k = Math.sin(p * Math.PI) * 0.18; h.ox = d[0] * k; h.oy = d[1] * k; });
            h.ox = h.oy = 0;
            break;
          }
          case 'jump': {
            const [fx, fy] = ev.from;
            const [tx, ty] = ev.to;
            await this.tween(D(320), (p) => { h.x = fx + (tx - fx) * p; h.y = fy + (ty - fy) * p; h.lift = Math.sin(p * Math.PI) * 0.7; });
            h.lift = 0;
            break;
          }
          case 'hop': await this.tween(D(200), (p) => { h.lift = Math.sin(p * Math.PI) * 0.3; }); h.lift = 0; break;
          case 'coin': this.st.coins.delete(ev.at.join(',')); this.fx.push({ kind: 'spark', x: ev.at[0], y: ev.at[1], t0: performance.now(), dur: 450 }); break;
          case 'smash': this.st.coins.delete(ev.at.join(',')); this.fx.push({ kind: 'shatter', x: ev.at[0], y: ev.at[1], t0: performance.now(), dur: 600 }); this.bubble('金幣被打碎了！', 'hero', 1200); await sleep(D(250)); break;
          case 'attack': {
            h.dir = ev.dir;
            const d = DIRS[ev.dir];
            await this.tween(D(160), (p) => { const k = Math.sin(p * Math.PI) * 0.3; h.ox = d[0] * k; h.oy = d[1] * k; });
            h.ox = h.oy = 0;
            if (ev.target) {
              this.fx.push({ kind: 'slash', x: ev.target[0], y: ev.target[1], t0: performance.now(), dur: 300 });
              if (ev.kill) { this.st.enemies.delete(ev.target.join(',')); this.fx.push({ kind: 'poof', x: ev.target[0], y: ev.target[1], t0: performance.now(), dur: 500 }); }
            } else this.bubble('揮空了', 'hero', 800);
            await sleep(D(120));
            break;
          }
          case 'burn': this.fx.push({ kind: 'flame', x: ev.at[0], y: ev.at[1], t0: performance.now(), dur: 900 }); break;
          case 'collapse': this.st.tiles[ev.at[1]][ev.at[0]] = 'L'; break;
          case 'die': h.dead = true; this.bubble(ev.reason, 'hero', 4000); await sleep(D(500)); break;
          case 'say': this.bubble(ev.text, ev.who, 1600); await sleep(D(ev.who === 'hero' ? 420 : 520)); break;
          case 'log': if (opts.onLog) opts.onLog(ev.text, ev.kind); await sleep(D(60)); break;
          case 'open': {
            const g = this.st.gates.get(ev.at.join(','));
            if (g) {
              if (g.kind === 'rock') await this.tween(D(300), (p) => { g.push = p; });
              g.open = true;
            }
            this.fx.push({ kind: 'spark', x: ev.at[0], y: ev.at[1], t0: performance.now(), dur: 400 });
            await sleep(D(160));
            break;
          }
          case 'pickup': {
            this.st.items.delete(ev.at.join(','));
            this.fx.push({ kind: 'float', x: ev.at[0], y: ev.at[1], sprite: ev.sprite, t0: performance.now(), dur: 700 });
            this.bubble(`撿到 ${ev.name}`, 'hero', 900);
            await sleep(D(260));
            break;
          }
          case 'lever': this.st.lever = ev.on; this.bubble(ev.on ? '拉下拉桿' : '拉桿不動', 'hero', 900); await sleep(D(260)); break;
          case 'ghost': this.st.ghost = true; await sleep(D(400)); break;
          case 'pay': this.bubble(`付了 ${floatStr(ev.amount)} 枚金幣`, 'hero', 1000); await sleep(D(320)); break;
          case 'usekey': this.bubble(`使用 ${ev.name}`, 'hero', 900); await sleep(D(260)); break;
          case 'drop': this.bubble('丟掉了寶物', 'hero', 900); await sleep(D(260)); break;
          case 'chest': this.st.chestOpen = true; this.bubble('寶箱打開了！', 'gate', 1500); await sleep(D(300)); break;
          case 'summon': this.st.summons.push({ name: ev.name, power: ev.power }); this.bubble(`${ev.name}（力量 ${ev.power}）`, 'hero', 1000); await sleep(D(350)); break;
          default:
        }
      }
    }
    toPx(x, y) { return [x * TS, y * TS]; }
    draw(t) {
      const st = this.st;
      if (!st) return;
      const c = this.ctx;
      const Sp = S();
      c.clearRect(0, 0, st.w * TS, st.h * TS);
      for (let y = 0; y < st.h; y++) {
        for (let x = 0; x < st.w; x++) {
          const tile = st.tiles[y][x];
          const [px, py] = this.toPx(x, y);
          if (tile === '#') Sp.wall(c, px, py, TS);
          else if (tile === 'L') Sp.lava(c, px, py, TS, t + x * 300);
          else if (tile === 'W') Sp.bridge(c, px, py, TS);
          else Sp.floor(c, px, py, TS, (x + y) % 2 === 0);
        }
      }
      if (st.flag) { const [px, py] = this.toPx(st.flag.x, st.flag.y); Sp.draw(c, 'flag', px + 4, py + 2, TS - 8); }
      for (const [k, g] of st.gates) {
        const [gx, gy] = k.split(',').map(Number);
        const [px, py] = this.toPx(gx, gy);
        if (g.kind === 'gate') Sp.gate(c, px, py, TS, g.open);
        else if (g.kind === 'door') Sp.coloredDoor(c, px, py, TS, g.color, g.open);
        else if (g.kind === 'merchant' && !g.open) Sp.draw(c, 'merchant', px + 4, py + 2, TS - 8);
        else if (g.kind === 'merchant' && g.open) Sp.draw(c, 'merchant', px + 4, py - TS * 0.55, TS - 14, { alpha: 0.85 });
        else if (g.kind === 'rock') { if (!g.open) Sp.draw(c, 'rock', px + 2 + (g.push || 0) * TS, py + 2, TS - 4, { alpha: 1 - (g.push || 0) * 0.8 }); }
      }
      for (const k of st.coins.keys()) {
        const [x, y] = k.split(',').map(Number);
        const [px, py] = this.toPx(x, y);
        Sp.draw(c, 'coin', px + 12, py + 12 + Math.sin((t || 0) / 300 + x) * 2, TS - 24);
      }
      for (const [k, it] of st.items) {
        const [x, y] = k.split(',').map(Number);
        const [px, py] = this.toPx(x, y);
        Sp.draw(c, it.sprite, px + 8, py + 8, TS - 16, it.chest && st.chestOpen ? { tint: '#f2b632' } : undefined);
      }
      for (const k of st.enemies.keys()) {
        const [x, y] = k.split(',').map(Number);
        const [px, py] = this.toPx(x, y);
        Sp.draw(c, 'slime', px + 4, py + 6, TS - 8, { bob: Math.sin((t || 0) / 250 + x) * 1.5 });
      }
      st.summons.forEach((s, i) => {
        const [px, py] = this.toPx(Math.max(0, st.hero.x - 1 - i * 0.6), st.hero.y);
        Sp.draw(c, 'golem', px + 6, py + 8, TS - 14, { tint: i % 2 ? '#3b82f6' : '#3fae5a' });
      });
      // 勇者
      const h = st.hero;
      const [hx, hy] = this.toPx(h.x + h.ox, h.y + h.oy - h.lift);
      Sp.draw(c, h.dead ? 'heroHurt' : 'hero', hx + 4, hy + 3, TS - 8, { flip: h.dir === 'left', alpha: h.dead ? 0.75 : 1 });
      if (st.ghost) {
        const [gx, gy] = this.toPx(h.x + 1, h.y);
        Sp.draw(c, 'ghost', gx + 4, gy + 2 + Math.sin((t || 0) / 200) * 3, TS - 8, { alpha: 0.9 });
      }
      if (st.night) {
        c.fillStyle = 'rgba(10,14,40,.35)';
        c.fillRect(0, 0, st.w * TS, st.h * TS);
      }
      this.drawFx(c, t);
      this.drawBubbles(c);
      if (st.label) {
        c.font = '600 12px "Noto Sans TC", sans-serif';
        const tw = c.measureText(st.label).width + 14;
        c.fillStyle = 'rgba(0,0,0,.55)';
        c.fillRect(6, 6, tw, 22);
        c.fillStyle = '#fff';
        c.fillText(st.label, 13, 21);
      }
    }
    drawFx(c, t) {
      const now = performance.now();
      this.fx = this.fx.filter((f) => now - f.t0 < f.dur);
      for (const f of this.fx) {
        const p = (now - f.t0) / f.dur;
        const [px, py] = this.toPx(f.x, f.y);
        const cx = px + TS / 2;
        const cy = py + TS / 2;
        c.save();
        c.globalAlpha = 1 - p;
        switch (f.kind) {
          case 'spark':
            c.fillStyle = '#ffe08a';
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2;
              c.fillRect(cx + Math.cos(a) * p * 20 - 2, cy + Math.sin(a) * p * 20 - 2, 4, 4);
            }
            break;
          case 'shatter':
            c.fillStyle = '#c98c05';
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              c.fillRect(cx + Math.cos(a) * p * 26, cy + Math.sin(a) * p * 26 + p * p * 20, 5, 3);
            }
            break;
          case 'poof':
            c.fillStyle = '#d8dde8';
            for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(cx + (k - 2) * 7, cy - p * 14, 6 + p * 6, 0, Math.PI * 2); c.fill(); }
            break;
          case 'slash':
            c.strokeStyle = '#ffffff';
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(px + 8, py + 8 + p * 6);
            c.lineTo(px + TS - 8, py + TS - 8 - p * 6);
            c.stroke();
            break;
          case 'bonk':
            c.fillStyle = '#ffe08a';
            c.font = '700 16px "Pixelify Sans", sans-serif';
            c.fillText('砰', cx - 8, cy - 10 - p * 10);
            break;
          case 'flame':
            c.fillStyle = '#ffb347';
            for (let k = 0; k < 4; k++) c.fillRect(px + 8 + k * 9, py + TS - 10 - p * 30 - (k % 2) * 6, 6, 10);
            break;
          case 'float':
            S().draw(c, f.sprite, px + 10, py + 10 - p * 24, TS - 20);
            break;
          default:
        }
        c.restore();
      }
    }
    drawBubbles(c) {
      const now = performance.now();
      this.bubbles = this.bubbles.filter((b) => b.until > now);
      const st = this.st;
      for (const b of this.bubbles) {
        let ax = st.hero.x;
        let ay = st.hero.y;
        if (b.who !== 'hero') {
          const g = [...st.gates.entries()].find(([, v]) => (b.who === 'merchant' ? v.kind === 'merchant' : true));
          if (g) { const [gx, gy] = g[0].split(',').map(Number); ax = gx; ay = gy; }
        }
        c.font = '500 13px "Noto Sans TC", sans-serif';
        const text = b.text.length > 22 ? b.text.slice(0, 21) + '…' : b.text;
        const tw = c.measureText(text).width + 16;
        let bx = ax * TS + TS / 2 - tw / 2;
        bx = Math.max(4, Math.min(st.w * TS - tw - 4, bx));
        let by = ay * TS - 30;
        if (by < 4) by = ay * TS + TS + 4;
        c.fillStyle = b.who === 'hero' ? '#ffffff' : '#ffe9b0';
        c.strokeStyle = '#1b1f2b';
        c.lineWidth = 2;
        c.beginPath();
        c.rect(bx, by, tw, 24);
        c.fill();
        c.stroke();
        c.fillStyle = '#1b1f2b';
        c.fillText(text, bx + 8, by + 17);
      }
    }
  }

  root.GridStage = { GRID_SPEC, GridWorld, runGrid, GridView, checkRules, stripComments };
})(typeof window !== 'undefined' ? window : globalThis);
