/* C# 小勇者：即時世界（W4–W10）
 * 模擬 Unity：MonoBehaviour 生命週期、簡易 2D 物理、Trigger/Collision、協程、Prefab、Inspector、鍵盤輸入。
 */
(function (root) {
  'use strict';
  const { compile, Runtime, CsError, fmt, vec, color, formatError, isNullish } = root.CSQ;

  const LAYERS = { Default: 0, TransparentFX: 1, 'Ignore Raycast': 2, Ground: 3, Water: 4, UI: 5, Player: 6, Enemy: 7 };
  const GRAVITY = -9.81;
  const KEYMAP = { spaceKey: 'space', enterKey: 'enter', escapeKey: 'escape', leftArrowKey: 'left', rightArrowKey: 'right', upArrowKey: 'up', downArrowKey: 'down', leftShiftKey: 'shift', digit1Key: '1', digit2Key: '2' };
  const MSG_PARAM = {
    OnTriggerEnter2D: 'Collider2D', OnTriggerStay2D: 'Collider2D', OnTriggerExit2D: 'Collider2D',
    OnCollisionEnter2D: 'Collision2D', OnCollisionStay2D: 'Collision2D', OnCollisionExit2D: 'Collision2D'
  };
  function keyNameOf(prop) {
    if (KEYMAP[prop]) return KEYMAP[prop];
    const m = /^([a-z])Key$/.exec(prop);
    return m ? m[1] : null;
  }
  function boxOf(e) { return { minX: e.x - e.w / 2, maxX: e.x + e.w / 2, minY: e.y - e.h / 2, maxY: e.y + e.h / 2 }; }
  function overlap(a, b) { return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY; }

  /* =========================================================
   * 世界
   * ========================================================= */
  class UWorld {
    constructor(level, def, prog, opts) {
      opts = opts || {};
      this.level = level;
      this.def = def;
      this.prog = prog;
      this.opts = opts;
      this.dt = opts.dt || 1 / 60;
      this.logs = [];
      this.errors = [];
      this.warned = new Set();
      this.time = 0;
      this.unscaled = 0;
      this.frame = 0;
      this.deltaTime = 0;
      this.timeScale = 1;
      this.liveKeys = new Set();
      this.keys = new Set();
      this.prevKeys = new Set();
      this.live = !!opts.live;
      this.stats = { maxObjects: 0, spawned: 0, maxSpeed: 0, reloads: 0, sounds: 0, spawnXs: [], animMax: {}, path: [] };
      this.frozen = null;
      this.finished = false;
      this.ui = {};
      this.rt = new Runtime(prog, { host: this.hostApi(), maxSteps: 40000, seed: opts.seed || 3 });
      this.statics = this.makeStatics();
      this.rt.host.statics = this.statics;
      this.load();
    }

    log(text, kind) {
      this.logs.push({ text, kind: kind || 'log', t: this.time, frame: this.frame });
      if (this.onLog) this.onLog(text, kind || 'log');
    }
    warnOnce(key, text) {
      if (this.warned.has(key)) return;
      this.warned.add(key);
      this.log(text, 'warn');
    }

    /* ---------- 場景 ---------- */
    load() {
      const def = this.def;
      this.entities = [];
      this.coroutines = [];
      this.pendingDestroy = [];
      this.contactPrev = new Map();
      this.triggerPrev = new Set();
      this.nextId = 0;
      this.reloadRequested = false;
      const rows = def.tiles;
      this.H = rows.length;
      this.W = Math.max(...rows.map((r) => r.length));
      this.solid = [];
      this.hazard = [];
      for (let r = 0; r < this.H; r++) {
        const y = this.H - 1 - r;
        this.solid[y] = [];
        this.hazard[y] = [];
        for (let x = 0; x < this.W; x++) {
          const ch = rows[r][x] || '.';
          this.solid[y][x] = ch === '#';
          this.hazard[y][x] = ch === '^' ? 'spike' : ch === '~' ? 'lava' : null;
        }
      }
      for (const k of Object.keys(def.ui || {})) this.ui[k] = { text: def.ui[k] };
      this.gm = def.gameManager ? { score: 0, gameOvers: 0, completes: 0, over: false, done: false } : null;
      for (let r = 0; r < this.H; r++) {
        for (let x = 0; x < this.W; x++) {
          const ch = rows[r][x];
          const tpl = def.entities && def.entities[ch];
          if (!tpl) continue;
          const y = this.H - 1 - r;
          const h = tpl.h !== undefined ? tpl.h : 0.8;
          const ey = tpl.rb === 'dynamic' || tpl.align === 'bottom' ? y + h / 2 + 0.001 : y + 0.5;
          this.spawn(tpl, x + 0.5 + (tpl.dx || 0), ey + (tpl.dy || 0), true);
        }
      }
      for (const [hx, hy, kind] of def.hazardAt || []) this.hazard[hy][hx] = kind;
      // 等全部物件都生成後，才接上 Inspector 的參考
      for (const e of this.entities) for (const s of e.scripts) this.applyInspector(e, s);
      this.player = this.entities.find((e) => e.tag === 'Player') || null;
      this.startX = this.player ? this.player.x : 0;
      this.started = false;
    }
    reload() {
      this.stats.reloads++;
      this.log('[場景重新載入]', 'info');
      this.load();
    }

    spawn(tpl, x, y, deferInspector) {
      const e = {
        id: ++this.nextId, name: tpl.name || 'GameObject', tag: tpl.tag || 'Untagged', layer: tpl.layer || 'Default',
        x, y, vx: 0, vy: 0, w: tpl.w !== undefined ? tpl.w : 0.8, h: tpl.h !== undefined ? tpl.h : 0.8,
        collider: tpl.collider !== false, trigger: !!tpl.trigger, rb: tpl.rb || null,
        gravity: tpl.gravity !== undefined ? tpl.gravity : 1, sprite: tpl.sprite, flipX: false,
        color: color(1, 1, 1, 1), visible: true, active: true, destroyed: false, dead: false,
        children: tpl.children || {}, scripts: [], comps: {}, tpl, grounded: false,
        anim: tpl.animator ? { params: Object.assign({}, tpl.animator), values: {} } : null,
        hp: tpl.hp, moveTarget: null, lastX: x, lastY: y
      };
      this.entities.push(e);
      for (const cls of tpl.scripts || (tpl.script ? [tpl.script] : [])) {
        if (!this.rt.classes.has(cls)) continue;
        const entry = { cls, ent: e, enabled: true, awoken: false, started: false, removed: false, obj: null };
        entry.obj = this.rt.newInstance(cls, this.mbHost(e, entry));
        if (!deferInspector) this.applyInspector(e, entry);
        e.scripts.push(entry);
      }
      return e;
    }
    applyInspector(e, entry) {
      const pre = ((this.def.inspector || {})[e.name] || {});
      const user = ((this.opts.inspector || {})[e.name] || {});
      const cls = entry.obj.cls;
      for (const f of cls.fields) {
        let spec;
        if (Object.prototype.hasOwnProperty.call(pre, f.name)) spec = pre[f.name];
        if (f.isSerialized && Object.prototype.hasOwnProperty.call(user, f.name)) spec = user[f.name];
        if (spec === undefined) continue;
        if (!f.isSerialized && !(spec && typeof spec === 'object' && spec.force)) continue;
        entry.obj.fields.set(f.name, this.resolveRef(spec, f.type, e));
      }
    }
    resolveRef(spec, type, self) {
      if (spec && typeof spec === 'object' && spec.force) return spec.v;
      if (spec === null || typeof spec !== 'object') {
        if (typeof spec === 'number' && type === 'float') return Math.fround(spec);
        return spec;
      }
      if (spec.layer) return 1 << LAYERS[spec.layer];
      if (spec.tilemap) return this.tilemapHost();
      if (spec.tile) return this.tileHost(spec.tile);
      if (spec.ui) { if (!this.ui[spec.ui]) this.ui[spec.ui] = { text: '' }; return this.tmpHost(spec.ui); }
      if (spec.prefab) return this.prefabHost(spec.prefab);
      if (spec.clip) return { __host: true, __type: 'AudioClip', name: spec.clip, get() { return undefined; }, set() {}, call() {}, toString() { return spec.clip + ' (AudioClip)'; } };
      if (spec.ref) {
        let ent = this.entities.find((x) => x.name === spec.ref);
        let child = null;
        if (!ent && self && self.children[spec.ref]) { ent = self; child = spec.ref; }
        if (!ent) return null;
        if (child) return this.childTransform(ent, child);
        if (type === 'Transform') return this.transformHost(ent);
        if (type === 'GameObject') return this.goHost(ent);
        return this.getComponent(ent, type);
      }
      return null;
    }

    /* ---------- 執行使用者的方法 ---------- */
    callMsg(entry, name, args) {
      if (!entry.enabled || entry.removed || entry.ent.destroyed || this.frozen) return undefined;
      const m = this.rt.findMethod(entry.obj.cls, name);
      if (!m) return undefined;
      const want = MSG_PARAM[name];
      if (want && m.params.length > 0 && m.params[0].type !== want) {
        this.warnOnce('sig:' + entry.cls + name, `Script error: ${name}\nThis message parameter has to be of type: ${want}\nThe message will be ignored.`);
        return undefined;
      }
      try {
        this.rt.resetSteps(40000);
        const r = this.rt.runSync(this.rt.callUser(m, entry.obj, m.params.length ? args || [] : [], null));
        if (r && r.kind === 'enumerator') this.startCoroutine(r, entry);
        return r;
      } catch (err) {
        this.handleErr(err);
        return undefined;
      }
    }
    handleErr(err) {
      if (!(err instanceof CsError)) throw err;
      if (err.kind === 'freeze') { this.frozen = err; return; }
      this.errors.push(err);
      this.log(this.opts.formatErr ? this.opts.formatErr(err) : formatError(err, this.level.file), 'error');
    }
    eachScript(name, args) {
      for (const e of this.entities.slice()) {
        if (e.destroyed || !e.active) continue;
        for (const s of e.scripts.slice()) this.callMsg(s, name, args);
        if (this.frozen) return;
      }
    }

    /* ---------- 一幀 ---------- */
    step() {
      if (this.frozen || this.finished) return;
      const dt = this.dt;
      const sdt = dt * this.timeScale;
      this.deltaTime = sdt;
      this.time += sdt;
      this.unscaled += dt;
      this.frame++;
      this.updateInput();
      // Awake / OnEnable / Start
      for (const e of this.entities.slice()) {
        for (const s of e.scripts) if (!s.awoken) { s.awoken = true; this.callMsg(s, 'Awake'); this.callMsg(s, 'OnEnable'); }
      }
      for (const e of this.entities.slice()) {
        for (const s of e.scripts) if (!s.started) { s.started = true; this.callMsg(s, 'Start'); }
      }
      if (this.frozen) return;
      for (const e of this.entities) { e.lastX = e.x; e.lastY = e.y; }
      if (sdt > 0) {
        this.eachScript('FixedUpdate');
        this.physics(sdt);
        this.contacts();
      }
      this.eachScript('Update');
      this.runCoroutines();
      this.eachScript('LateUpdate');
      this.hazards();
      this.processDestroy();
      if (this.reloadRequested) this.reload();
      this.track();
    }
    track() {
      if (!this.uiLog) { this.uiLog = []; this.uiLast = {}; }
      for (const k of Object.keys(this.ui)) {
        if (this.uiLast[k] !== this.ui[k].text) { this.uiLast[k] = this.ui[k].text; this.uiLog.push({ t: this.time, u: this.unscaled, key: k, text: this.ui[k].text }); }
      }
      const alive = this.entities.filter((e) => !e.destroyed).length;
      if (alive > this.stats.maxObjects) this.stats.maxObjects = alive;
      const p = this.player;
      if (p && !p.destroyed && this.dt > 0) {
        const sp = Math.hypot(p.x - p.lastX, p.y - p.lastY) / this.dt;
        if (this.timeScale > 0 && sp > this.stats.maxSpeed) this.stats.maxSpeed = sp;
        if (this.frame % 6 === 0) this.stats.path.push([p.x, p.y]);
      }
      for (const e of this.entities) {
        if (!e.anim) continue;
        for (const [k, v] of Object.entries(e.anim.values)) {
          if (typeof v === 'number') this.stats.animMax[k] = Math.max(this.stats.animMax[k] || 0, v);
          else if (v === true) this.stats.animMax[k] = 1;
        }
      }
    }

    /* ---------- 輸入 ---------- */
    updateInput() {
      this.prevKeys = this.keys;
      if (this.live) this.keys = new Set(this.liveKeys);
      else {
        const t = this.unscaled;
        const s = new Set();
        for (const [a, b, k] of this.def.input || []) if (t >= a && t < b) s.add(k);
        this.keys = s;
      }
    }

    /* ---------- 物理 ---------- */
    solidsNear(b) {
      const out = [];
      const x0 = Math.floor(b.minX) - 1, x1 = Math.floor(b.maxX) + 1;
      const y0 = Math.floor(b.minY) - 1, y1 = Math.floor(b.maxY) + 1;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (y < 0 || y >= this.H || x < 0 || x >= this.W) {
            if (x < 0 || x >= this.W) out.push({ minX: x, maxX: x + 1, minY: y, maxY: y + 1 });
            continue;
          }
          if (this.solid[y][x]) out.push({ minX: x, maxX: x + 1, minY: y, maxY: y + 1 });
        }
      }
      return out;
    }
    entitySolids(self) {
      return this.entities.filter((o) => o !== self && !o.destroyed && o.active && o.collider && !o.trigger && o.rb !== 'dynamic' && o.tpl.solid !== false && o.rb === 'kinematic');
    }
    addContact(a, b, nx, ny) {
      const key = a.id + '|' + b.id;
      this.contactNow.set(key, { a, b, nx, ny });
      this.contactNow.set(b.id + '|' + a.id, { a: b, b: a, nx: -nx, ny: -ny });
    }
    physics(dt) {
      this.contactNow = new Map();
      for (const e of this.entities) {
        if (e.destroyed || !e.active) continue;
        if (e.rb === 'dynamic') {
          e.vy += GRAVITY * e.gravity * dt;
          if (e.vy < -40) e.vy = -40;
          e.grounded = false;
          this.moveAxis(e, e.vx * dt, 0);
          this.moveAxis(e, 0, e.vy * dt);
        } else if (e.rb === 'kinematic') {
          let nx = e.x + e.vx * dt;
          let ny = e.y + e.vy * dt;
          if (e.moveTarget) { nx = e.moveTarget.x; ny = e.moveTarget.y; e.moveTarget = null; }
          const dx = nx - e.x, dy = ny - e.y;
          e.x = nx;
          e.y = ny;
          if (e.collider && !e.trigger && (dx || dy)) this.pushDynamics(e, dx, dy);
        }
      }
      // 靜止的接觸也算持續接觸
      for (const e of this.entities) {
        if (e.destroyed || e.rb !== 'dynamic' || !e.collider || e.trigger) continue;
        const b = boxOf(e);
        const grow = { minX: b.minX - 0.02, maxX: b.maxX + 0.02, minY: b.minY - 0.02, maxY: b.maxY + 0.02 };
        for (const o of this.entitySolids(e)) {
          const ob = boxOf(o);
          if (!overlap(grow, ob)) continue;
          const key = e.id + '|' + o.id;
          if (this.contactNow.has(key)) continue;
          if (this.contactPrev.has(key)) {
            const prev = this.contactPrev.get(key);
            this.addContact(e, o, prev.nx, prev.ny);
          }
        }
      }
    }
    moveAxis(e, dx, dy) {
      e.x += dx;
      e.y += dy;
      if (!e.collider || e.trigger) return;
      const b = boxOf(e);
      const boxes = this.solidsNear(b).map((x) => ({ box: x, ent: null }))
        .concat(this.entitySolids(e).map((o) => ({ box: boxOf(o), ent: o })));
      for (const { box, ent } of boxes) {
        const cb = boxOf(e);
        if (!overlap(cb, box)) continue;
        let nx = 0, ny = 0;
        if (dx > 0) { e.x = box.minX - e.w / 2 - 1e-4; e.vx = 0; nx = -1; }
        else if (dx < 0) { e.x = box.maxX + e.w / 2 + 1e-4; e.vx = 0; nx = 1; }
        else if (dy < 0) { e.y = box.maxY + e.h / 2 + 1e-4; e.vy = 0; e.grounded = true; ny = 1; }
        else if (dy > 0) { e.y = box.minY - e.h / 2 - 1e-4; e.vy = 0; ny = -1; }
        if (ent) this.addContact(e, ent, nx, ny);
      }
    }
    pushDynamics(k, dx, dy) {
      for (const d of this.entities) {
        if (d.destroyed || d.rb !== 'dynamic' || !d.collider || d.trigger) continue;
        const a = boxOf(d);
        const b = boxOf(k);
        if (!overlap(a, b)) continue;
        const pl = a.maxX - b.minX, pr = b.maxX - a.minX, pd = a.maxY - b.minY, pu = b.maxY - a.minY;
        const m = Math.min(pl, pr, pd, pu);
        let nx = 0, ny = 0;
        if (m === pu) { d.y += pu + 1e-4; ny = 1; d.grounded = true; if (d.vy < 0) d.vy = 0; }
        else if (m === pd) { d.y -= pd + 1e-4; ny = -1; }
        else if (m === pl) { d.x -= pl + 1e-4; nx = -1; }
        else { d.x += pr + 1e-4; nx = 1; }
        this.addContact(d, k, nx, ny);
      }
    }
    contacts() {
      // Collision
      for (const [key, c] of this.contactNow) {
        if (!this.contactPrev.has(key)) {
          for (const s of c.a.scripts.slice()) this.callMsg(s, 'OnCollisionEnter2D', [this.collisionHost(c.a, c.b, c.nx, c.ny)]);
        }
      }
      this.contactPrev = this.contactNow;
      // Trigger
      const now = new Set();
      const list = this.entities.filter((e) => !e.destroyed && e.active && e.collider);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (!a.trigger && !b.trigger) continue;
          if (!a.rb && !b.rb) continue;
          if (!overlap(boxOf(a), boxOf(b))) continue;
          now.add(a.id + '|' + b.id);
          const isNew = !this.triggerPrev.has(a.id + '|' + b.id);
          const msg = isNew ? 'OnTriggerEnter2D' : 'OnTriggerStay2D';
          for (const s of a.scripts.slice()) this.callMsg(s, msg, [this.colliderHost(b)]);
          for (const s of b.scripts.slice()) this.callMsg(s, msg, [this.colliderHost(a)]);
        }
      }
      for (const key of this.triggerPrev) {
        if (now.has(key)) continue;
        const [ia, ib] = key.split('|').map(Number);
        const a = this.entities.find((e) => e.id === ia);
        const b = this.entities.find((e) => e.id === ib);
        if (a && b && !a.destroyed && !b.destroyed) {
          for (const s of a.scripts.slice()) this.callMsg(s, 'OnTriggerExit2D', [this.colliderHost(b)]);
          for (const s of b.scripts.slice()) this.callMsg(s, 'OnTriggerExit2D', [this.colliderHost(a)]);
        }
      }
      this.triggerPrev = now;
    }
    hazards() {
      for (const e of this.entities) {
        if (e.destroyed || e.tag !== 'Player' || e.dead) continue;
        const b = boxOf(e);
        let kind = null;
        for (let y = Math.floor(b.minY); y <= Math.floor(b.maxY - 1e-6); y++) {
          for (let x = Math.floor(b.minX); x <= Math.floor(b.maxX - 1e-6); x++) {
            if (y >= 0 && y < this.H && x >= 0 && x < this.W && this.hazard[y][x]) kind = this.hazard[y][x];
          }
        }
        if (e.y < -2) kind = 'fall';
        if (!kind) continue;
        if (this.def.hazard === 'damage' && kind === 'spike') {
          for (const s of e.scripts) if (this.rt.findMethod(s.obj.cls, 'TakeDamage')) this.callMsg(s, 'TakeDamage', [1]);
          continue;
        }
        this.killPlayer(e, kind === 'spike' ? '碰到尖刺了' : kind === 'lava' ? '掉進岩漿了' : '掉出地圖了');
      }
    }
    killPlayer(e, reason) {
      if (e.dead) return;
      e.dead = true;
      e.deathReason = reason;
      e.vx = 0;
      e.vy = 0;
      e.rb = null;
      this.log(`[${reason}]`, 'info');
      if (this.gm) this.gmCall('GameOver');
    }
    processDestroy() {
      const keep = [];
      for (const p of this.pendingDestroy) {
        if (this.time + 1e-9 >= p.at) { if (p.fn) p.fn(); else this.destroyNow(p.ent); }
        else keep.push(p);
      }
      this.pendingDestroy = keep;
      this.entities = this.entities.filter((e) => !e.destroyed);
    }
    destroyNow(e) {
      if (e.destroyed) return;
      for (const s of e.scripts.slice()) { this.callMsg(s, 'OnDisable'); this.callMsg(s, 'OnDestroy'); }
      e.destroyed = true;
      for (const h of Object.values(e.comps)) h.__destroyed = true;
      for (const k of e.tpl.ownsUi || []) {
        if (this.tmpHosts && this.tmpHosts[k]) this.tmpHosts[k].__destroyed = true;
        delete this.ui[k];
      }
      for (const s of e.scripts) s.removed = true;
      this.coroutines = this.coroutines.filter((c) => c.owner.ent !== e);
    }

    /* ---------- 協程 ---------- */
    startCoroutine(en, owner) {
      const co = { gen: en.make(), owner, until: null, done: false, handle: null };
      co.handle = { __host: true, __type: 'Coroutine', co, get() {}, set() {}, call() {}, toString() { return 'UnityEngine.Coroutine'; } };
      this.coroutines.push(co);
      this.resumeCo(co);
      return co.handle;
    }
    resumeCo(co) {
      let r;
      try {
        this.rt.resetSteps(40000);
        r = co.gen.next();
      } catch (err) {
        co.done = true;
        this.handleErr(err);
        return;
      }
      if (r.done) { co.done = true; return; }
      const v = r.value.yr;
      if (v && v.kind === 'wait') co.until = v.realtime ? { rt: this.unscaled + v.s } : { t: this.time + v.s };
      else if (v && v.__type === 'Coroutine') co.until = { co: v.co };
      else co.until = { frame: this.frame + 1 };
    }
    runCoroutines() {
      for (const co of this.coroutines.slice()) {
        if (co.done || co.owner.removed || co.owner.ent.destroyed) { co.done = true; continue; }
        const u = co.until;
        const ready = !u || (u.frame !== undefined && this.frame >= u.frame) || (u.t !== undefined && this.time + 1e-9 >= u.t) ||
          (u.rt !== undefined && this.unscaled + 1e-9 >= u.rt) || (u.co && u.co.done);
        if (ready) this.resumeCo(co);
        if (this.frozen) return;
      }
      this.coroutines = this.coroutines.filter((c) => !c.done);
    }

    /* =========================================================
     * Unity API（host 物件）
     * ========================================================= */
    hostApi() {
      const w = this;
      return {
        log: (t, k) => w.log(t, k),
        ctors: {
          GameManager: () => {
            w.warnOnce('newMB', "You are trying to create a MonoBehaviour using the 'new' keyword.  This is not allowed.  MonoBehaviours can only be added using AddComponent(). Alternatively, your script can inherit from ScriptableObject or no base class at all");
            return w.gmHost(true);
          },
          SpriteRenderer: () => w.detachedSR(),
          GameObject: (a) => w.goHost(w.spawn({ name: a[0] || 'New Game Object', collider: false }, 0, -50))
        }
      };
    }
    mk(type, ent, props, methods, toStr) {
      const w = this;
      return {
        __host: true, __type: type, ent, name: ent ? ent.name : type,
        get(n, rt, node) {
          const p = props[n];
          if (p && p.get) return p.get();
          throw rt.fail('CS1061', `'${type}' does not contain a definition for '${n}'`, node);
        },
        set(n, v, rt, node) {
          const p = props[n];
          if (p && p.set) { p.set(v); return; }
          throw rt.fail('CS0200', `'${type}.${n}' cannot be assigned to -- it is read only`, node);
        },
        call(n, args, rt, node, targs) {
          const f = methods[n];
          if (f) return f(args, node, targs);
          throw rt.fail('CS1061', `'${type}' does not contain a definition for '${n}'`, node);
        },
        toString() { return toStr ? toStr() : `${ent ? ent.name : ''} (${type})`; },
        _w: w
      };
    }
    cached(e, key, make) {
      if (!e.comps[key]) e.comps[key] = make();
      return e.comps[key];
    }
    transformHost(e) {
      return this.cached(e, 'Transform', () => this.mk('Transform', e, {
        position: { get: () => vec(e.x, e.y, 0, 'Vector3'), set: (v) => { e.x = v.x; e.y = v.y; } },
        localScale: { get: () => vec(e.flipScale || 1, 1, 1, 'Vector3'), set: (v) => { e.flipScale = v.x; } },
        gameObject: { get: () => this.goHost(e) },
        name: { get: () => e.name, set: (v) => { e.name = v; } }
      }, {
        Translate: (a) => {
          if (a.length >= 2 && typeof a[0] === 'number') { e.x += a[0]; e.y += a[1]; return; }
          if (a[0] && a[0].kind === 'vec') { e.x += a[0].x; e.y += a[0].y; }
        },
        Rotate: (a) => { e.rot = (e.rot || 0) + (a[2] || 0); }
      }));
    }
    childTransform(e, child) {
      const off = e.children[child];
      return this.cached(e, 'child:' + child, () => this.mk('Transform', { name: child }, {
        position: { get: () => vec(e.x + off[0], e.y + off[1], 0, 'Vector3'), set: () => {} },
        gameObject: { get: () => null }
      }, {}, () => `${child} (Transform)`));
    }
    goHost(e) {
      return this.cached(e, 'GameObject', () => this.mk('GameObject', e, {
        name: { get: () => e.name, set: (v) => { e.name = v; } },
        tag: { get: () => e.tag, set: (v) => { e.tag = v; } },
        transform: { get: () => this.transformHost(e) },
        activeSelf: { get: () => e.active }
      }, {
        CompareTag: (a) => e.tag === a[0],
        SetActive: (a) => { e.active = !!a[0]; e.visible = !!a[0]; },
        GetComponent: (a, node, targs) => this.getComponent(e, this.targName(targs))
      }, () => `${e.name} (UnityEngine.GameObject)`));
    }
    prefabHost(name) {
      const tpl = (this.def.prefabs || {})[name];
      if (!this.prefabs) this.prefabs = {};
      if (this.prefabs[name]) return this.prefabs[name];
      const h = this.mk('GameObject', null, {
        name: { get: () => name }, tag: { get: () => tpl.tag || 'Untagged' }, activeSelf: { get: () => true },
        transform: { get: () => null }
      }, {
        CompareTag: (a) => (tpl.tag || 'Untagged') === a[0],
        SetActive: () => {},
        GetComponent: () => null
      }, () => `${name} (Prefab)`);
      h.__prefab = true;
      h.tpl = Object.assign({ name }, tpl);
      h.name = name;
      this.prefabs[name] = h;
      return h;
    }
    colliderHost(e) {
      return this.cached(e, 'Collider2D', () => this.mk('Collider2D', e, {
        gameObject: { get: () => this.goHost(e) },
        transform: { get: () => this.transformHost(e) },
        tag: { get: () => e.tag, set: (v) => { e.tag = v; } },
        name: { get: () => e.name },
        isTrigger: { get: () => e.trigger, set: (v) => { e.trigger = !!v; } }
      }, {
        CompareTag: (a) => e.tag === a[0],
        GetComponent: (a, node, targs) => this.getComponent(e, this.targName(targs))
      }));
    }
    tilemapCollider() {
      if (this._tilemap) return this._tilemap;
      const fake = { name: 'Tilemap', tag: 'Untagged', comps: {}, children: {}, scripts: [], x: 0, y: 0 };
      this._tilemap = this.mk('Collider2D', fake, {
        gameObject: { get: () => null }, transform: { get: () => null }, tag: { get: () => 'Untagged' }, name: { get: () => 'Tilemap' }
      }, { CompareTag: (a) => a[0] === 'Untagged', GetComponent: () => null }, () => 'Tilemap (UnityEngine.Tilemaps.TilemapCollider2D)');
      return this._tilemap;
    }
    collisionHost(self, other, nx, ny) {
      return this.mk('Collision2D', other, {
        gameObject: { get: () => this.goHost(other) },
        transform: { get: () => this.transformHost(other) },
        collider: { get: () => this.colliderHost(other) },
        contactCount: { get: () => 1 }
      }, {
        GetContact: () => ({
          __host: true, __type: 'ContactPoint2D',
          get: (n) => (n === 'normal' ? vec(nx, ny) : vec(self.x, self.y)),
          set() {}, call() {}, toString() { return 'ContactPoint2D'; }
        })
      });
    }
    srHost(e) {
      return this.cached(e, 'SpriteRenderer', () => this.mk('SpriteRenderer', e, {
        color: { get: () => Object.assign({}, e.color), set: (v) => { e.color = Object.assign({}, v); } },
        flipX: { get: () => e.flipX, set: (v) => { e.flipX = !!v; } },
        flipY: { get: () => !!e.flipY, set: (v) => { e.flipY = !!v; } },
        enabled: { get: () => e.visible, set: (v) => { e.visible = !!v; } },
        gameObject: { get: () => this.goHost(e) }
      }, {}));
    }
    detachedSR() {
      const fake = { name: 'New SpriteRenderer', color: color(1, 1, 1, 1), flipX: false, visible: true, comps: {} };
      return this.mk('SpriteRenderer', fake, {
        color: { get: () => fake.color, set: (v) => { fake.color = v; } },
        flipX: { get: () => fake.flipX, set: (v) => { fake.flipX = v; } },
        enabled: { get: () => true, set: () => {} },
        gameObject: { get: () => null }
      }, {});
    }
    rbHost(e) {
      return this.cached(e, 'Rigidbody2D', () => this.mk('Rigidbody2D', e, {
        linearVelocity: { get: () => vec(e.vx, e.vy), set: (v) => { e.vx = v.x; e.vy = v.y; } },
        velocity: { get: () => vec(e.vx, e.vy), set: (v) => { e.vx = v.x; e.vy = v.y; } },
        gravityScale: { get: () => e.gravity, set: (v) => { e.gravity = v; } },
        position: { get: () => vec(e.x, e.y), set: (v) => { e.x = v.x; e.y = v.y; } },
        gameObject: { get: () => this.goHost(e) }
      }, {
        MovePosition: (a) => { e.moveTarget = { x: a[0].x, y: a[0].y }; },
        AddForce: (a) => {
          const impulse = a[1] && a[1].mode === 'Impulse';
          const k = impulse ? 1 : this.dt;
          e.vx += a[0].x * k;
          e.vy += a[0].y * k;
        }
      }));
    }
    animHost(e) {
      return this.cached(e, 'Animator', () => {
        const setp = (kind) => (a) => {
          const [name, v] = a;
          const P = e.anim.params;
          if (!Object.prototype.hasOwnProperty.call(P, name)) { this.warnOnce('anim:' + name, `Parameter '${name}' does not exist.`); return; }
          if (P[name] !== kind) { this.warnOnce('animt:' + name, `Parameter type '${name}' does not match.`); return; }
          e.anim.values[name] = kind === 'trigger' ? true : v;
        };
        return this.mk('Animator', e, {}, {
          SetFloat: setp('float'), SetBool: setp('bool'), SetInteger: setp('int'), SetTrigger: (a) => setp('trigger')([a[0], true])
        });
      });
    }
    audioHost(e) {
      return this.cached(e, 'AudioSource', () => this.mk('AudioSource', e, { volume: { get: () => 1, set: () => {} } }, {
        PlayOneShot: (a) => { this.stats.sounds++; e.noteUntil = this.unscaled + 0.4; if (!a[0]) this.log('PlayOneShot was called with a null audio clip.', 'warn'); },
        Play: () => { this.stats.sounds++; e.noteUntil = this.unscaled + 0.4; },
        Stop: () => {}
      }));
    }
    tmpHost(key) {
      if (!this.tmpHosts) this.tmpHosts = {};
      if (this.tmpHosts[key]) return this.tmpHosts[key];
      const h = this.mk('TMP_Text', null, {
        text: { get: () => this.ui[key].text, set: (v) => { this.ui[key].text = v === null || v === undefined ? '' : String(v); } },
        color: { get: () => color(1, 1, 1, 1), set: () => {} }
      }, {}, () => `${key} (TMPro.TextMeshProUGUI)`);
      this.tmpHosts[key] = h;
      return h;
    }
    tileHost(kind) {
      if (!this.tiles) this.tiles = {};
      if (!this.tiles[kind]) {
        this.tiles[kind] = this.mk('TileBase', null, { name: { get: () => kind } }, {}, () => `${kind} (Tile)`);
        this.tiles[kind].tileKind = kind;
      }
      return this.tiles[kind];
    }
    tilemapHost() {
      if (this._tilemapHost) return this._tilemapHost;
      const w = this;
      const at = (p) => {
        if (!p || p.kind !== 'vec') return null;
        const x = Math.round(p.x), y = Math.round(p.y);
        if (x < 0 || y < 0 || x >= w.W || y >= w.H) { w.warnOnce('tile-out', `SetTile：位置 (${x}, ${y}) 超出地圖範圍（寬 ${w.W}、高 ${w.H}），這一格被忽略了。`); return null; }
        return { x, y };
      };
      this._tilemapHost = this.mk('Tilemap', null, {}, {
        SetTile: (a) => {
          const p = at(a[0]);
          if (!p) return;
          const kind = a[1] ? a[1].tileKind : null;
          w.solid[p.y][p.x] = kind === 'Ground';
          w.hazard[p.y][p.x] = kind === 'Spikes' ? 'spike' : kind === 'Lava' ? 'lava' : null;
        },
        HasTile: (a) => { const p = at(a[0]); return !!(p && (w.solid[p.y][p.x] || w.hazard[p.y][p.x])); },
        ClearAllTiles: () => {
          for (let y = 0; y < w.H; y++) for (let x = 0; x < w.W; x++) { w.solid[y][x] = false; w.hazard[y][x] = null; }
        }
      }, () => 'Ground (Tilemap)');
      return this._tilemapHost;
    }
    targName(targs) {
      if (!targs || !targs[0]) return '?';
      const t = targs[0];
      return t.name + (t.args && t.args.length ? '<>' : '');
    }
    getComponent(e, type) {
      if (!e || e.destroyed) return null;
      switch (type) {
        case 'Transform': return this.transformHost(e);
        case 'GameObject': return this.goHost(e);
        case 'SpriteRenderer': return e.sprite ? this.srHost(e) : null;
        case 'Rigidbody2D': return e.tpl.rb ? this.rbHost(e) : null;
        case 'Collider2D': case 'BoxCollider2D': case 'CapsuleCollider2D': case 'CircleCollider2D': return e.collider ? this.colliderHost(e) : null;
        case 'Animator': return e.anim ? this.animHost(e) : null;
        case 'AudioSource': return e.tpl.audio ? this.audioHost(e) : null;
        default: {
          const s = e.scripts.find((x) => x.cls === type && !x.removed);
          return s ? s.obj : null;
        }
      }
    }
    mbHost(e, entry) {
      const w = this;
      const props = {
        transform: () => w.transformHost(e),
        gameObject: () => w.goHost(e),
        enabled: () => entry.enabled,
        name: () => e.name,
        tag: () => e.tag
      };
      const methods = {
        GetComponent: (a, node, targs) => w.getComponent(e, w.targName(targs)),
        StartCoroutine: (a, node) => {
          const en = a[0];
          if (!en || en.kind !== 'enumerator') { w.log('Coroutine couldn\'t be started because the the game object is inactive or the routine is null', 'error'); return null; }
          return w.startCoroutine(en, entry);
        },
        StopCoroutine: (a) => { const h = a[0]; w.coroutines.forEach((c) => { if (h && (c.handle === h)) c.done = true; }); },
        StopAllCoroutines: () => { w.coroutines.forEach((c) => { if (c.owner === entry) c.done = true; }); },
        Destroy: (a) => w.destroy(a[0], a[1] || 0),
        Instantiate: (a) => w.instantiate(a[0], a[1], a[2]),
        CompareTag: (a) => e.tag === a[0],
        print: (a, node) => w.log(a[0] === null || a[0] === undefined ? 'Null' : fmt(a[0], node.args[0] && node.args[0].ty), 'log')
      };
      return {
        name: e.name,
        has: (n) => Object.prototype.hasOwnProperty.call(props, n),
        get: (n) => props[n](),
        set: (n, v) => { if (n === 'enabled') entry.enabled = !!v; else if (n === 'name') e.name = v; else if (n === 'tag') e.tag = v; },
        hasMethod: (n) => Object.prototype.hasOwnProperty.call(methods, n),
        call: (n, args, rt, node, targs) => methods[n](args, node, targs)
      };
    }
    destroy(obj, delay) {
      if (obj === null || obj === undefined) { this.log('ArgumentNullException: Value cannot be null.', 'error'); return; }
      if (obj.__prefab) { this.log('Destroying assets is not permitted to avoid data loss.\nIf you really want to remove an asset use DestroyImmediate (theObject, true);', 'error'); return; }
      if (obj.kind === 'obj') {
        for (const e of this.entities) {
          const s = e.scripts.find((x) => x.obj === obj);
          if (s) {
            const kill = () => { s.removed = true; s.enabled = false; e.scripts = e.scripts.filter((x) => x !== s); };
            if (delay > 0) this.pendingDestroy.push({ ent: { destroyed: false }, at: this.time + delay, fn: kill });
            else kill();
          }
        }
        return;
      }
      if (obj.__host && obj.ent) {
        if (obj.__type === 'GameObject') {
          const at = this.time + (delay || 0);
          this.pendingDestroy.push({ ent: obj.ent, at });
          return;
        }
        if (obj.__type === 'Transform') { this.log(`Can't destroy Transform component of '${obj.ent.name}'. If you want to destroy the game object, please call 'Destroy' on the game object instead. Destroying the transform component is not allowed.`, 'error'); return; }
        if (obj.__type === 'Collider2D') { obj.ent.collider = false; return; }
        if (obj.__type === 'SpriteRenderer') { obj.ent.visible = false; return; }
        if (obj.__type === 'Rigidbody2D') { obj.ent.rb = null; return; }
      }
    }
    instantiate(src, pos) {
      if (isNullish(src)) { this.log('ArgumentException: The Object you want to instantiate is null.', 'error'); return null; }
      let tpl;
      if (src.__prefab) tpl = src.tpl;
      else if (src.__type === 'GameObject' && src.ent && src.ent.tpl) tpl = src.ent.tpl;
      else return null;
      let x = tpl.x !== undefined ? tpl.x : 0;
      let y = tpl.y !== undefined ? tpl.y : 0;
      if (pos && pos.kind === 'vec') { x = pos.x; y = pos.y; }
      else if (pos && pos.__type === 'Transform') { const p = pos.get('position'); x = p.x; y = p.y; }
      const e = this.spawn(tpl, x, y);
      this.stats.spawned++;
      this.stats.spawnXs.push(x);
      for (const s of e.scripts) { s.awoken = true; this.callMsg(s, 'Awake'); this.callMsg(s, 'OnEnable'); }
      return this.goHost(e);
    }

    /* ---------- GameManager（場景裡內建的） ---------- */
    gmCall(name, args) {
      const gm = this.gm;
      if (!gm) return;
      switch (name) {
        case 'AddScore': if (!gm.over) gm.score += args[0]; break;
        case 'GameOver':
          gm.gameOvers++;
          if (gm.gameOvers === 1) gm.firstOverAt = this.time;
          if (!gm.over) { gm.over = true; this.timeScale = 0; this.log('[GameManager] Game Over', 'info'); }
          break;
        case 'LevelComplete': gm.completes++; gm.done = true; this.timeScale = 0; break;
        case 'Restart': this.timeScale = 1; this.reloadRequested = true; break;
        default:
      }
    }
    gmHost(detached) {
      const w = this;
      const fake = { score: 0 };
      return this.mk('GameManager', { name: 'GameManager', comps: {} }, {
        score: { get: () => (detached ? fake.score : (w.gm ? w.gm.score : 0)) }
      }, {
        AddScore: (a) => { if (detached) fake.score += a[0]; else w.gmCall('AddScore', a); },
        GameOver: () => { if (!detached) w.gmCall('GameOver'); },
        Restart: () => { if (!detached) w.gmCall('Restart'); },
        LevelComplete: () => { if (!detached) w.gmCall('LevelComplete'); }
      }, () => 'GameManager (GameManager)');
    }

    makeStatics() {
      const w = this;
      const S = (type, props, methods) => ({
        kind: 'static', __type: type,
        get(n, rt, node) { if (props[n]) return props[n].get(); throw rt.fail('CS0117', `'${type}' does not contain a definition for '${n}'`, node); },
        set(n, v, rt, node) { if (props[n] && props[n].set) { props[n].set(v); return; } throw rt.fail('CS0200', `'${type}.${n}' cannot be assigned to -- it is read only`, node); },
        call(n, args, rt, node, targs) { if (methods[n]) return methods[n](args, node, targs); throw rt.fail('CS0117', `'${type}' does not contain a definition for '${n}'`, node); }
      });
      const keyHosts = {};
      const keyHost = (k) => {
        if (!keyHosts[k]) {
          keyHosts[k] = w.mk('KeyControl', null, {
            isPressed: { get: () => w.keys.has(k) },
            wasPressedThisFrame: { get: () => w.keys.has(k) && !w.prevKeys.has(k) },
            wasReleasedThisFrame: { get: () => !w.keys.has(k) && w.prevKeys.has(k) }
          }, {}, () => `Key:${k}`);
        }
        return keyHosts[k];
      };
      const keyboard = {
        __host: true, __type: 'Keyboard',
        get(n, rt, node) { const k = keyNameOf(n); if (k) return keyHost(k); throw rt.fail('CS1061', `'Keyboard' does not contain a definition for '${n}'`, node); },
        set() {}, call() {}, toString() { return 'Keyboard:/Keyboard'; }
      };
      const gmInstance = () => (w.gm ? (w._gmHost || (w._gmHost = w.gmHost(false))) : null);
      return {
        Time: S('Time', {
          deltaTime: { get: () => Math.fround(w.deltaTime) },
          time: { get: () => Math.fround(w.time) },
          fixedDeltaTime: { get: () => Math.fround(0.02) },
          unscaledDeltaTime: { get: () => Math.fround(w.dt) },
          frameCount: { get: () => w.frame },
          timeScale: { get: () => w.timeScale, set: (v) => { w.timeScale = Math.max(0, v); } }
        }, {}),
        Keyboard: S('Keyboard', { current: { get: () => keyboard } }, {}),
        GameObject: S('GameObject', {}, {
          FindWithTag: (a) => {
            const e = w.entities.find((x) => !x.destroyed && x.active && x.tag === a[0]);
            return e ? w.goHost(e) : null;
          }
        }),
        Physics2D: S('Physics2D', {}, {
          OverlapCircle: (a) => {
            const p = a[0];
            const r = a[1];
            const mask = a.length > 2 ? a[2] : ~(1 << 2);
            const hit = (b) => {
              const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
              const cy = Math.max(b.minY, Math.min(p.y, b.maxY));
              return (cx - p.x) ** 2 + (cy - p.y) ** 2 < r * r;
            };
            for (const e of w.entities) {
              if (e.destroyed || !e.collider || !e.active) continue;
              if (!(mask & (1 << LAYERS[e.layer]))) continue;
              if (hit(boxOf(e))) return w.colliderHost(e);
            }
            if (mask & (1 << LAYERS.Ground)) {
              for (const b of w.solidsNear({ minX: p.x - r, maxX: p.x + r, minY: p.y - r, maxY: p.y + r })) if (hit(b)) return w.tilemapCollider();
            }
            return null;
          }
        }),
        LayerMask: S('LayerMask', {}, { GetMask: (a) => a.reduce((m, n) => m | (LAYERS[n] !== undefined ? 1 << LAYERS[n] : 0), 0) }),
        GameManager: S('GameManager', { Instance: { get: gmInstance } }, {}),
        SceneManager: S('SceneManager', {}, {
          LoadScene: () => { w.reloadRequested = true; },
          GetActiveScene: () => ({ __host: true, __type: 'Scene', get: (n) => (n === 'buildIndex' ? 0 : 'Level1'), set() {}, call() {}, toString() { return 'Level1'; } })
        }),
        ForceMode2D: S('ForceMode2D', { Force: { get: () => ({ kind: 'enumv', mode: 'Force' }) }, Impulse: { get: () => ({ kind: 'enumv', mode: 'Impulse' }) } }, {})
      };
    }

    /* ---------- Inspector ---------- */
    inspectorTarget(entName) {
      const name = entName || this.level.inspectorFor;
      const e = name ? this.entities.find((x) => x.name === name && !x.destroyed) : this.player;
      return e && e.scripts[0] ? { ent: e, entry: e.scripts[0] } : null;
    }
    inspectorFields(entName) {
      const t = this.inspectorTarget(entName);
      if (!t) return null;
      const obj = t.entry.obj;
      const rows = obj.cls.fields.filter((f) => f.isSerialized && !f.isEvent).map((f) => {
        const v = obj.fields.get(f.name);
        let display;
        let editable = false;
        if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') { display = v; editable = true; }
        else if (v === null || v === undefined) display = 'None (' + f.type + ')';
        else if (f.type === 'LayerMask') display = Object.keys(LAYERS).find((k) => v === 1 << LAYERS[k]) || (v ? 'Mixed' : 'Nothing');
        else display = fmt(v);
        if (f.type === 'LayerMask' && typeof v === 'number') { editable = false; display = Object.keys(LAYERS).find((k) => v === 1 << LAYERS[k]) || (v ? 'Mixed' : 'Nothing'); }
        return { name: f.name, type: f.type, value: v, display, editable };
      });
      return { script: obj.cls.name, object: t.ent.name, rows };
    }
    setInspectorValue(field, v, entName) {
      const t = this.inspectorTarget(entName);
      if (!t) return;
      // 同名的物件（例如很多隻 Enemy）一起改
      for (const e of this.entities) {
        if (e.destroyed || e.name !== t.ent.name) continue;
        for (const s of e.scripts) {
          const f = s.obj.cls.fields.find((x) => x.name === field);
          if (f && f.isSerialized) s.obj.fields.set(field, f.type === 'float' ? Math.fround(v) : v);
        }
      }
    }
  }

  /* =========================================================
   * 編譯與執行
   * ========================================================= */
  function prepare(level, code) {
    const hidden = level.hidden || '';
    const userLines = code.split('\n').length;
    const full = hidden ? code + '\n' + hidden : code;
    const comp = compile(full, { requireUsings: true, hiddenFrom: hidden ? userLines + 1 : 0 });
    if (!comp.ok) {
      // 隱藏程式裡的錯誤不該發生；只把使用者看得到的行回報出去
      comp.errors = comp.errors.map((e) => (e.line > userLines ? Object.assign(e, { line: userLines }) : e));
    }
    return comp;
  }
  function scenesOf(level) {
    return level.variants ? level.variants.map((v) => v.scene || v) : [level.scene];
  }
  function makeWorlds(level, def, prog, opts) {
    if (def.race) return def.race.map((fps, i) => new UWorld(level, def, prog, Object.assign({}, opts, { dt: 1 / fps, seed: 3 + i })));
    return [new UWorld(level, def, prog, opts)];
  }
  function judge(level, worlds, variantIdx) {
    const W = worlds[0];
    const frozen = worlds.find((w) => w.frozen);
    if (frozen) return { outcome: 'freeze', err: frozen.frozen };
    const errW = worlds.find((w) => w.errors.length);
    const res = level.check ? level.check(W, worlds, variantIdx) : { ok: true };
    if (errW) return { outcome: 'runtime', err: errW.errors[0], msg: res.ok ? 'Console 出現了紅色的錯誤訊息' : res.msg };
    if (!res.ok) return { outcome: 'fail', msg: res.msg };
    return { outcome: 'win' };
  }
  function runHeadless(level, code, opts) {
    opts = opts || {};
    const comp = prepare(level, code);
    if (!comp.ok) return { outcome: 'compile', errors: comp.errors, warnings: comp.warnings, runs: [] };
    const runs = [];
    const scenes = scenesOf(level);
    for (let i = 0; i < scenes.length; i++) {
      const def = scenes[i];
      const worlds = makeWorlds(level, def, comp.prog, { inspector: opts.inspector });
      const dur = def.duration || 3;
      for (const w of worlds) {
        while (w.unscaled < dur - 1e-9 && !w.frozen) {
          w.step();
          if (level.done && level.done(w)) break;
        }
      }
      const j = judge(level, worlds, i);
      runs.push(Object.assign({ variant: i, worlds }, j));
      if (j.outcome !== 'win') break;
    }
    const last = runs[runs.length - 1];
    return { outcome: last.outcome, msg: last.msg, err: last.err, warnings: comp.warnings, runs, errors: [] };
  }

  /* =========================================================
   * 畫面
   * ========================================================= */
  const PPU = 40;
  class UnityView {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.worlds = null;
      this.reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    setWorlds(worlds, labels) {
      this.worlds = worlds;
      this.labels = labels || null;
      const w = worlds[0];
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const rows = worlds.length;
      this.cv.width = w.W * PPU * dpr;
      this.cv.height = w.H * PPU * rows * dpr;
      this.cv.style.aspectRatio = `${w.W} / ${w.H * rows}`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.draw();
    }
    draw() {
      if (!this.worlds) return;
      const c = this.ctx;
      this.worlds.forEach((w, i) => {
        c.save();
        c.translate(0, i * w.H * PPU);
        this.drawWorld(c, w, this.labels ? this.labels[i] : null);
        c.restore();
      });
    }
    drawWorld(c, w, label) {
      const Sp = root.Sprites;
      const T = Sp.TILE;
      const Wp = w.W * PPU, Hp = w.H * PPU;
      const g = c.createLinearGradient(0, 0, 0, Hp);
      g.addColorStop(0, T.sky);
      g.addColorStop(1, T.skyLow);
      c.fillStyle = g;
      c.fillRect(0, 0, Wp, Hp);
      const py = (y) => (w.H - y) * PPU;
      for (let y = 0; y < w.H; y++) {
        for (let x = 0; x < w.W; x++) {
          const X = x * PPU, Y = py(y + 1);
          if (w.solid[y][x]) Sp.ground(c, X, Y, PPU, !(y + 1 < w.H && w.solid[y + 1][x]));
          else if (w.hazard[y][x] === 'spike') Sp.spikes(c, X, Y, PPU, !(y + 1 < w.H && w.solid[y + 1][x]));
          else if (w.hazard[y][x] === 'lava') Sp.lava(c, X, Y, PPU, performance.now() + x * 300);
        }
      }
      for (const e of w.entities) {
        if (e.destroyed || !e.visible || !e.sprite || !e.active) continue;
        const size = (e.tpl.size || 1) * PPU;
        const X = e.x * PPU - size / 2;
        const Y = py(e.y) - size / 2 - (e.tpl.spriteDy || 0) * PPU;
        let name = e.sprite;
        if (e.dead && name === 'hero') name = 'heroHurt';
        const isWhite = e.color.r === 1 && e.color.g === 1 && e.color.b === 1;
        const tint = isWhite ? undefined : `rgb(${Math.round(e.color.r * 255)},${Math.round(e.color.g * 255)},${Math.round(e.color.b * 255)})`;
        let bob = 0;
        if (e.anim && (e.anim.values.Speed || 0) > 0.1 && !this.reduced) bob = Math.sin(w.time * 18) * 1.5;
        if (e.tag === 'Coin' && !this.reduced) bob = Math.sin(w.time * 4 + e.x) * 2;
        Sp.draw(c, name, X, Y, size, { flip: e.flipX || (e.flipScale || 1) < 0, tint, bob, alpha: e.dead ? 0.7 : 1 });
        if (e.noteUntil && w.unscaled < e.noteUntil) {
          c.fillStyle = '#ffe08a';
          c.font = '700 16px sans-serif';
          c.fillText('♪', X + size, Y + 4);
        }
      }
      // UI
      c.font = '600 14px "JetBrains Mono", Consolas, monospace';
      let uy = 20;
      const hud = (text) => {
        const tw = c.measureText(text).width + 14;
        c.fillStyle = 'rgba(0,0,0,.55)';
        c.fillRect(8, uy - 15, tw, 21);
        c.fillStyle = '#ffffff';
        c.fillText(text, 15, uy);
        uy += 26;
      };
      for (const k of Object.keys(w.ui)) if (w.ui[k].text !== '') hud(w.ui[k].text);
      if (w.gm && !w.def.hideScore) hud(`[GameManager] score = ${w.gm.score}`);
      if (w.def.showCount) hud(`場景物件：${w.entities.filter((e) => !e.destroyed).length}`);
      if (w.def.showSpeed && w.player) {
        const sp = Math.hypot(w.player.x - w.player.lastX, w.player.y - w.player.lastY) / w.dt;
        hud(`速度：${sp.toFixed(2)}${sp > (w.def.speedLimit || 99) + 0.05 ? '  超速！' : ''}`);
      }
      if (label) {
        c.font = '700 13px "Pixelify Sans", "Noto Sans TC", sans-serif';
        const tw = c.measureText(label).width + 14;
        c.fillStyle = 'rgba(49,87,214,.85)';
        c.fillRect(Wp - tw - 8, 6, tw, 22);
        c.fillStyle = '#fff';
        c.fillText(label, Wp - tw - 1, 22);
      }
      // 按鍵
      if (w.keys.size) {
        c.font = '600 12px "JetBrains Mono", monospace';
        let kx = 8;
        for (const k of w.keys) {
          const t = k.toUpperCase();
          const tw = c.measureText(t).width + 12;
          c.fillStyle = 'rgba(255,255,255,.9)';
          c.fillRect(kx, Hp - 28, tw, 20);
          c.fillStyle = '#1b1f2b';
          c.fillText(t, kx + 6, Hp - 14);
          kx += tw + 4;
        }
      }
      if (w.timeScale === 0 || (w.gm && w.gm.over)) {
        c.fillStyle = 'rgba(10,12,20,.45)';
        c.fillRect(0, 0, Wp, Hp);
        c.fillStyle = '#fff';
        c.font = '700 26px "Pixelify Sans", sans-serif';
        const t = w.gm && w.gm.over ? 'GAME OVER' : w.gm && w.gm.done ? 'LEVEL CLEAR' : 'PAUSED  (timeScale = 0)';
        const tw = c.measureText(t).width;
        c.fillText(t, (Wp - tw) / 2, Hp / 2);
      }
    }
  }

  /** 即時播放：依照真實時間推進世界 */
  class UnityPlayer {
    constructor(view) { this.view = view; this.raf = 0; }
    start(worlds, opts) {
      this.stop();
      this.worlds = worlds;
      this.opts = opts || {};
      this.acc = worlds.map(() => 0);
      this.last = performance.now();
      this.over = false;
      const loop = (now) => {
        if (this.over) return;
        const speed = this.opts.speed ? this.opts.speed() : 1;
        const el = Math.min(0.1, (now - this.last) / 1000) * speed;
        this.last = now;
        let finished = true;
        worlds.forEach((w, i) => {
          this.acc[i] += el;
          let n = 0;
          while (this.acc[i] >= w.dt && n < 40) {
            this.acc[i] -= w.dt;
            n++;
            if (w.finished || w.frozen) break;
            w.step();
            if (this.opts.isDone && this.opts.isDone(w)) w.finished = true;
            if (!w.live && w.unscaled >= this.opts.duration - 1e-9) w.finished = true;
            if (w.live && w.unscaled >= (this.opts.maxLive || 90)) w.finished = true;
          }
          if (!w.finished && !w.frozen) finished = false;
        });
        this.view.draw();
        if (this.opts.onFrame) this.opts.onFrame();
        if (finished) { this.over = true; if (this.opts.onEnd) this.opts.onEnd(); return; }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    stop(silent) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      const was = !this.over && this.worlds;
      this.over = true;
      if (was && !silent && this.opts && this.opts.onEnd) this.opts.onEnd(true);
    }
  }

  root.UnityStage = { UWorld, prepare, runHeadless, makeWorlds, judge, scenesOf, UnityView, UnityPlayer, LAYERS };
})(typeof window !== 'undefined' ? window : globalThis);
