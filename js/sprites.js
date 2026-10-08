/* C# 小勇者：用 canvas 畫的像素圖（不載入外部圖片） */
(function (root) {
  'use strict';

  const PAL = {
    k: '#1b1f2b', // 外框
    H: '#3157d6', // 頭盔
    h: '#6f8ff0', // 頭盔亮面
    S: '#f2c6a0', // 皮膚
    e: '#1b1f2b', // 眼睛
    B: '#2e8f6b', // 衣服
    b: '#4fbf92',
    Y: '#f2b632', // 金色
    y: '#ffe08a',
    o: '#b9780b',
    G: '#4bb35a', // 史萊姆綠
    g: '#8fe08f',
    R: '#d9463b',
    r: '#ff8a7a',
    W: '#ffffff',
    w: '#d8dde8',
    N: '#8a5a2b', // 木頭
    n: '#b07a40',
    P: '#8b5cf6',
    p: '#c4b0ff',
    C: '#5ac8e0',
    c: '#a8ecf7',
    D: '#555b6e',
    d: '#7d8499'
  };

  const SPRITES = {
    hero: [
      '....kkkk....',
      '...kHhhHk...',
      '..kHhHHHHk..',
      '..kkkkkkkk..',
      '..kSeSSeSk..',
      '..kSSSSSSk..',
      '...kSSSSk...',
      '..kBBbbBBk..',
      '.kSkBbbBkSk.',
      '...kBBBBk...',
      '...kk..kk...',
      '..kkk..kkk..'
    ],
    heroHurt: [
      '....kkkk....',
      '...kRrrRk...',
      '..kRrRRRRk..',
      '..kkkkkkkk..',
      '..kSkSSkSk..',
      '..kSSSSSSk..',
      '...kSkkSk...',
      '..kRRrrRRk..',
      '.kSkRrrRkSk.',
      '...kRRRRk...',
      '...kk..kk...',
      '..kkk..kkk..'
    ],
    slime: [
      '............',
      '............',
      '....kkkk....',
      '...kGggGk...',
      '..kGgGGGGk..',
      '.kGGGGGGGGk.',
      '.kGWkGGWkGk.',
      '.kGWkGGWkGk.',
      'kGGGGGGGGGGk',
      'kGGGGkkGGGGk',
      'kGGGGGGGGGGk',
      '.kkkkkkkkkk.'
    ],
    ghost: [
      '....kkkk....',
      '..kkwwwwkk..',
      '.kwWWWWWWwk.',
      '.kWWkWWkWWk.',
      'kWWWkWWkWWWk',
      'kWWWWWWWWWWk',
      'kWWWWkkWWWWk',
      'kWWWWWWWWWWk',
      'kWWWWWWWWWWk',
      'kWWkWWWkWWWk',
      'kWk.kWk.kWk.',
      '.k...k...k..'
    ],
    coin: [
      '..kkkk..',
      '.kYYYYk.',
      'kYyyYYok',
      'kYyYYYok',
      'kYyYYYok',
      'kYYYYYok',
      '.kooook.',
      '..kkkk..'
    ],
    flag: [
      '.kk.........',
      '.kWkkkkk....',
      '.kWRRRRRkk..',
      '.kWRrRRRRRk.',
      '.kWRRRRRRRk.',
      '.kWRRRRRkk..',
      '.kWkkkkk....',
      '.kWk........',
      '.kWk........',
      '.kWk........',
      'kkkkk.......',
      'kNNNk.......'
    ],
    key: [
      '............',
      '...kkk......',
      '..kYyYk.....',
      '..kY.Yk.....',
      '..kYYYk.....',
      '...kYk......',
      '...kYk......',
      '...kYkk.....',
      '...kYYk.....',
      '...kYk......',
      '...kYYk.....',
      '...kkk......'
    ],
    gem: [
      '............',
      '....kkkk....',
      '...kcCCck...',
      '..kcCCCCCk..',
      '..kCCCCCCk..',
      '...kCCCCk...',
      '....kCCk....',
      '.....kk.....',
      '............',
      '............',
      '............',
      '............'
    ],
    chest: [
      '............',
      '............',
      '..kkkkkkkk..',
      '.knnnnnnnnk.',
      '.knNNNNNNnk.',
      '.kkkkYYkkkk.',
      '.knnnYYnnnk.',
      '.knNNkkNNnk.',
      '.knNNNNNNnk.',
      '.knNNNNNNnk.',
      '.kkkkkkkkkk.',
      '............'
    ],
    merchant: [
      '...kkkkkk...',
      '..kPPPPPPk..',
      '.kPPpPPPPPk.',
      'kkkkkkkkkkkk',
      '..kSeSSeSk..',
      '..kSSSSSSk..',
      '...kSkkSk...',
      '..kPPPPPPk..',
      '.kSkPYYPkSk.',
      '..kPPPPPPk..',
      '..kPPPPPPk..',
      '..kkk..kkk..'
    ],
    rock: [
      '............',
      '............',
      '....kkkk....',
      '..kkdddDkk..',
      '.kddwdDDDDk.',
      '.kdddDDDDDk.',
      'kddDDDDDDDDk',
      'kdDDDDDDDDDk',
      'kDDDDDkDDDDk',
      'kDDDDkDDDDDk',
      '.kDDDDDDDDk.',
      '..kkkkkkkk..'
    ],
    golem: [
      '............',
      '...kkkkkk...',
      '..kGGGGGGk..',
      '.kGGgGGGGGk.',
      '.kGWkGGWkGk.',
      '.kGGGGGGGGk.',
      'kGGGkkkkGGGk',
      'kGGGGGGGGGGk',
      'kGGGGGGGGGGk',
      '.kGGGGGGGGk.',
      '.kGGk..kGGk.',
      '.kkkk..kkkk.'
    ],
    bullet: [
      '........',
      '........',
      '..kkkk..',
      '.kyYYok.',
      '.kyYYok.',
      '..kkkk..',
      '........',
      '........'
    ],
    target: [
      '..kkkkkkkk..',
      '.kWWWWWWWWk.',
      'kWRRRRRRRRWk',
      'kWRWWWWWWRWk',
      'kWRWRRRRWRWk',
      'kWRWRkkRWRWk',
      'kWRWRkkRWRWk',
      'kWRWRRRRWRWk',
      'kWRWWWWWWRWk',
      'kWRRRRRRRRWk',
      '.kWWWWWWWWk.',
      '..kkkkkkkk..'
    ],
    lever: [
      '............',
      '..........k.',
      '.........kdk',
      '........kdk.',
      '.......kdk..',
      '......kdk...',
      '.....kdk....',
      '...kkkkkk...',
      '..kNNNNNNk..',
      '..knnnnnnk..',
      '..kkkkkkkk..',
      '............'
    ]
  };

  const cache = new Map();
  function buildCanvas(name, tint) {
    const key = name + '|' + (tint || '');
    if (cache.has(key)) return cache.get(key);
    const rows = SPRITES[name];
    if (!rows) return null;
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const ch = rows[j][i];
        if (ch === '.') continue;
        let col = PAL[ch] || '#ff00ff';
        if (tint && (ch === 'G' || ch === 'B' || ch === 'H')) col = tint;
        if (tint && (ch === 'g' || ch === 'b' || ch === 'h')) col = lighten(tint);
        x.fillStyle = col;
        x.fillRect(i, j, 1, 1);
      }
    }
    cache.set(key, c);
    return c;
  }
  function lighten(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) + 70);
    const g = Math.min(255, ((n >> 8) & 255) + 70);
    const b = Math.min(255, (n & 255) + 70);
    return `rgb(${r},${g},${b})`;
  }

  /** 在 (x, y) 畫一個 size × size 的像素圖，x、y 是左上角 */
  function draw(ctx, name, x, y, size, opts) {
    opts = opts || {};
    const c = buildCanvas(name, opts.tint);
    if (!c) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const sw = size * (c.width / Math.max(c.width, c.height));
    const sh = size * (c.height / Math.max(c.width, c.height));
    const ox = x + (size - sw) / 2;
    const oy = y + (size - sh) / 2 + (opts.bob || 0);
    if (opts.flip) {
      ctx.translate(ox + sw, oy);
      ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0, sw, sh);
    } else ctx.drawImage(c, ox, oy, sw, sh);
    ctx.restore();
  }

  /* ---------- 地形 ---------- */
  const TILE = {
    floorA: '#2a3346',
    floorB: '#2f3a50',
    wall: '#4a5470',
    wallTop: '#606b8a',
    wallLine: '#39415a',
    lava: '#e8572e',
    lavaHi: '#ffb347',
    gate: '#8a5a2b',
    gateBar: '#c58b4a',
    bridge: '#9c6b3c',
    sky: '#1d2333',
    skyLow: '#252d42',
    ground: '#5a4632',
    grass: '#58b368',
    spike: '#d8dde8'
  };

  function floor(ctx, x, y, s, alt) {
    ctx.fillStyle = alt ? TILE.floorB : TILE.floorA;
    ctx.fillRect(x, y, s, s);
  }
  function wall(ctx, x, y, s) {
    ctx.fillStyle = TILE.wall;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = TILE.wallTop;
    ctx.fillRect(x, y, s, s * 0.18);
    ctx.fillStyle = TILE.wallLine;
    const u = s / 4;
    ctx.fillRect(x, y + s * 0.5, s, Math.max(1, s * 0.05));
    ctx.fillRect(x + u * 2, y + s * 0.18, Math.max(1, s * 0.05), s * 0.32);
    ctx.fillRect(x + u, y + s * 0.5, Math.max(1, s * 0.05), s * 0.5);
    ctx.fillRect(x + u * 3, y + s * 0.5, Math.max(1, s * 0.05), s * 0.5);
  }
  function lava(ctx, x, y, s, t) {
    ctx.fillStyle = TILE.lava;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = TILE.lavaHi;
    const ph = (t || 0) / 400;
    for (let k = 0; k < 3; k++) {
      const bx = x + ((k * 0.33 + Math.sin(ph + k) * 0.08 + 0.1) % 1) * s;
      const by = y + (0.25 + 0.25 * k) * s + Math.sin(ph * 1.7 + k) * s * 0.05;
      ctx.fillRect(bx, by, s * 0.18, s * 0.08);
    }
  }
  function gate(ctx, x, y, s, open) {
    if (open) {
      ctx.fillStyle = TILE.gate;
      ctx.fillRect(x, y, s * 0.12, s);
      ctx.fillRect(x + s * 0.88, y, s * 0.12, s);
      return;
    }
    ctx.fillStyle = TILE.gate;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = TILE.gateBar;
    for (let k = 1; k < 4; k++) ctx.fillRect(x + (k * s) / 4 - s * 0.04, y, s * 0.08, s);
    ctx.fillRect(x, y + s * 0.15, s, s * 0.08);
    ctx.fillRect(x, y + s * 0.77, s, s * 0.08);
  }
  function coloredDoor(ctx, x, y, s, color, open) {
    const COLS = { red: '#d9463b', blue: '#3b82f6', green: '#3fae5a' };
    if (open) {
      ctx.fillStyle = COLS[color] || '#888';
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, y, s, s);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.fillStyle = COLS[color] || '#888';
    ctx.fillRect(x + s * 0.08, y, s * 0.84, s);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x + s * 0.18, y + s * 0.1, s * 0.64, s * 0.35);
    ctx.fillRect(x + s * 0.18, y + s * 0.55, s * 0.64, s * 0.35);
    ctx.fillStyle = '#ffe08a';
    ctx.fillRect(x + s * 0.7, y + s * 0.48, s * 0.08, s * 0.08);
  }
  function bridge(ctx, x, y, s) {
    ctx.fillStyle = '#1a1f2c';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = TILE.bridge;
    for (let k = 0; k < 4; k++) ctx.fillRect(x + (k * s) / 4 + 1, y + s * 0.3, s / 4 - 2, s * 0.4);
    ctx.fillStyle = '#6b4526';
    ctx.fillRect(x, y + s * 0.28, s, s * 0.05);
    ctx.fillRect(x, y + s * 0.68, s, s * 0.05);
  }
  function spikes(ctx, x, y, s, up) {
    ctx.fillStyle = TILE.spike;
    const n = 3;
    for (let k = 0; k < n; k++) {
      const bx = x + (k * s) / n;
      ctx.beginPath();
      if (up !== false) {
        ctx.moveTo(bx, y + s);
        ctx.lineTo(bx + s / n / 2, y + s * 0.35);
        ctx.lineTo(bx + s / n, y + s);
      } else {
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + s / n / 2, y + s * 0.65);
        ctx.lineTo(bx + s / n, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  function ground(ctx, x, y, s, top) {
    ctx.fillStyle = TILE.ground;
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x + s * 0.2, y + s * 0.5, s * 0.15, s * 0.12);
    ctx.fillRect(x + s * 0.65, y + s * 0.75, s * 0.12, s * 0.1);
    if (top) {
      ctx.fillStyle = TILE.grass;
      ctx.fillRect(x, y, s, s * 0.2);
    }
  }

  root.Sprites = { draw, SPRITES, TILE, floor, wall, lava, gate, coloredDoor, bridge, spikes, ground };
})(typeof window !== 'undefined' ? window : globalThis);
