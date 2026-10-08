/* C# 小勇者：工作坊（場景、人物、敵人三份腳本的沙盒，不判定過關） */
(function (root) {
  'use strict';
  const { compile, formatError, CsError } = root.CSQ;

  function dedent(s) {
    const lines = s.replace(/\r/g, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    let min = Infinity;
    for (const l of lines) if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length);
    if (!isFinite(min)) min = 0;
    return lines.map((l) => l.slice(min)).join('\n') + '\n';
  }
  function cs(strings, ...vals) { return dedent(String.raw(strings, ...vals)); }

  /* =========================================================
   * 三份預設腳本
   * ========================================================= */
  const SCENE = cs`
    using UnityEngine;
    using UnityEngine.Tilemaps;

    public class LevelBuilder : MonoBehaviour
    {
        [Header("地形")]
        [SerializeField] private int length = 22;
        [SerializeField] private int groundHeight = 1;
        [SerializeField] private int pitStart = 8;
        [SerializeField] private int pitWidth = 3;
        [SerializeField] private int spikeStart = 16;
        [SerializeField] private int spikeWidth = 1;

        [Header("物件")]
        [SerializeField] private int coinCount = 5;
        [SerializeField] private int enemyCount = 1;

        [Header("參考（已經在 Inspector 接好了）")]
        [SerializeField] private Tilemap ground;
        [SerializeField] private TileBase groundTile;
        [SerializeField] private TileBase spikeTile;
        [SerializeField] private GameObject coinPrefab;
        [SerializeField] private GameObject enemyPrefab;
        [SerializeField] private GameObject goalPrefab;

        void Start()
        {
            BuildGround();
            PlaceCoins();
            PlaceEnemies();

            // 終點旗子放在最右邊
            Instantiate(goalPrefab, new Vector3(length - 1.5f, groundHeight + 0.45f, 0f), Quaternion.identity);
        }

        void BuildGround()
        {
            for (int x = 0; x < length; x++)
            {
                bool isPit = x >= pitStart && x < pitStart + pitWidth;
                if (isPit) continue;   // 坑：這一格不放地面

                for (int y = 0; y < groundHeight; y++)
                {
                    ground.SetTile(new Vector3Int(x, y, 0), groundTile);
                }

                bool isSpike = x >= spikeStart && x < spikeStart + spikeWidth;
                if (isSpike)
                {
                    ground.SetTile(new Vector3Int(x, groundHeight, 0), spikeTile);
                }
            }
        }

        void PlaceCoins()
        {
            // 金幣在坑的上方排成一道弧線
            for (int i = 0; i < coinCount; i++)
            {
                float t = coinCount == 1 ? 0.5f : (float)i / (coinCount - 1);
                float x = pitStart - 0.5f + t * (pitWidth + 1f);
                float y = groundHeight + 1.5f + Mathf.Sin(t * Mathf.PI) * 1.5f;
                Instantiate(coinPrefab, new Vector3(x, y, 0f), Quaternion.identity);
            }
        }

        void PlaceEnemies()
        {
            for (int i = 0; i < enemyCount; i++)
            {
                float x = pitStart + pitWidth + 2.5f + i * 3f;
                Instantiate(enemyPrefab, new Vector3(x, groundHeight + 0.4f, 0f), Quaternion.identity);
            }
        }
    }
  `;

  const PLAYER = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class PlayerController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 6f;
        [SerializeField] private float jumpForce = 12f;
        [SerializeField] private int maxJumps = 1;
        [SerializeField] private Transform groundCheck;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D rb;
        private SpriteRenderer sr;
        private int jumpsLeft;
        private int coins;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            sr = GetComponent<SpriteRenderer>();
        }

        bool IsGrounded()
        {
            return Physics2D.OverlapCircle(groundCheck.position, 0.15f, groundLayer) != null;
        }

        void Update()
        {
            var kb = Keyboard.current;

            // 左右移動
            float x = 0f;
            if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) x -= 1f;
            if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) x += 1f;
            rb.linearVelocity = new Vector2(x * moveSpeed, rb.linearVelocity.y);
            if (x != 0f) sr.flipX = x < 0f;

            // 落地時補滿跳躍次數
            if (IsGrounded() && rb.linearVelocity.y <= 0.01f)
            {
                jumpsLeft = maxJumps;
            }

            // 跳躍
            if (kb.spaceKey.wasPressedThisFrame && jumpsLeft > 0)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
                jumpsLeft--;
            }
        }

        // 踩到敵人時，敵人會呼叫這個方法讓勇者彈起來
        public void Bounce(float force)
        {
            rb.linearVelocity = new Vector2(rb.linearVelocity.x, force);
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                coins++;
                GameManager.Instance.AddScore(1);
                Destroy(other.gameObject);
            }
            else if (other.CompareTag("Finish"))
            {
                Debug.Log($"抵達終點！一共撿到 {coins} 枚金幣");
                GameManager.Instance.LevelComplete();
            }
        }
    }
  `;

  const ENEMY = cs`
    using UnityEngine;

    public class EnemyPatrol : MonoBehaviour
    {
        [SerializeField] private float speed = 2f;
        [SerializeField] private float patrolDistance = 2f;
        [SerializeField] private float chaseRange = 4f;
        [SerializeField] private float chaseSpeed = 3f;
        [SerializeField] private float stompBounce = 10f;

        private Rigidbody2D rb;
        private SpriteRenderer sr;
        private Transform player;
        private float startX;
        private int direction = 1;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
            sr = GetComponent<SpriteRenderer>();
        }

        void Start()
        {
            startX = transform.position.x;
            GameObject p = GameObject.FindWithTag("Player");
            if (p != null) player = p.transform;
        }

        void Update()
        {
            float vx = speed * direction;
            bool chasing = player != null && Vector2.Distance(transform.position, player.position) < chaseRange;

            if (chasing)
            {
                // 玩家靠近：往玩家的方向追，並且變成紅色
                vx = player.position.x > transform.position.x ? chaseSpeed : -chaseSpeed;
                sr.color = Color.red;
            }
            else
            {
                sr.color = Color.white;
                // 走到巡邏範圍的邊界就回頭
                if (transform.position.x > startX + patrolDistance) direction = -1;
                if (transform.position.x < startX - patrolDistance) direction = 1;
            }

            // 不要追出巡邏範圍太遠（免得掉進坑裡）
            float limit = patrolDistance + 1f;
            if (transform.position.x > startX + limit && vx > 0f) vx = 0f;
            if (transform.position.x < startX - limit && vx < 0f) vx = 0f;

            rb.linearVelocity = new Vector2(vx, 0f);
            if (vx != 0f) sr.flipX = vx < 0f;
        }

        void OnCollisionEnter2D(Collision2D collision)
        {
            if (!collision.gameObject.CompareTag("Player")) return;

            ContactPoint2D contact = collision.GetContact(0);
            if (contact.normal.y < -0.5f)
            {
                // 從上面踩下來：敵人被踩扁，勇者彈起來
                collision.gameObject.GetComponent<PlayerController>().Bounce(stompBounce);
                Destroy(gameObject);
            }
            else
            {
                // 從側面撞到：Game Over
                GameManager.Instance.GameOver();
            }
        }
    }
  `;

  // 使用者看不到的輔助腳本：按 R 重新開始
  const HIDDEN = cs`
    public class WorkshopRestart : MonoBehaviour
    {
        void Update()
        {
            if (Keyboard.current.rKey.wasPressedThisFrame)
            {
                Time.timeScale = 1f;
                SceneManager.LoadScene(0);
            }
        }
    }
  `;

  /* =========================================================
   * 場景
   * ========================================================= */
  const WIDTH = 22;
  const HEIGHT = 8;
  const rows = [];
  for (let r = 0; r < HEIGHT; r++) rows.push('.'.repeat(WIDTH));
  const put = (r, c, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };
  put(0, 0, 'B');
  put(0, 1, 'G');
  put(HEIGHT - 2, 1, 'P');

  const SCENE_DEF = {
    tiles: rows,
    entities: {
      B: { name: 'Builder', collider: false, script: 'LevelBuilder' },
      G: { name: 'GameController', collider: false, script: 'WorkshopRestart' },
      P: { name: 'Player', tag: 'Player', sprite: 'hero', w: 0.8, h: 0.9, rb: 'dynamic', gravity: 3, children: { GroundCheck: [0, -0.45] }, script: 'PlayerController' }
    },
    prefabs: {
      Coin: { name: 'Coin', tag: 'Coin', sprite: 'coin', w: 0.5, h: 0.5, trigger: true, size: 0.6 },
      Enemy: { name: 'Enemy', tag: 'Enemy', sprite: 'slime', w: 0.9, h: 0.8, rb: 'kinematic', scripts: ['EnemyPatrol'] },
      Goal: { name: 'Goal', tag: 'Finish', sprite: 'flag', w: 0.8, h: 0.9, trigger: true }
    },
    inspector: {
      Builder: {
        ground: { tilemap: true }, groundTile: { tile: 'Ground' }, spikeTile: { tile: 'Spikes' },
        coinPrefab: { prefab: 'Coin' }, enemyPrefab: { prefab: 'Enemy' }, goalPrefab: { prefab: 'Goal' }
      },
      Player: { groundCheck: { ref: 'GroundCheck' }, groundLayer: { layer: 'Ground' } }
    },
    gameManager: true,
    duration: 600
  };

  const LEVEL = {
    id: 'workshop', kind: 'unity', file: 'LevelBuilder.cs', title: '工作坊',
    keys: ['a', 'd', 'space', 'r'], hidden: HIDDEN, scene: SCENE_DEF
  };

  /* =========================================================
   * 三個分頁
   * ========================================================= */
  const FILES = [
    {
      key: 'scene', label: '場景', file: 'LevelBuilder.cs', entity: 'Builder', code: SCENE,
      intro: '這份腳本掛在 Builder 物件上。遊戲一開始，<code>Start()</code> 會用 for 迴圈一格一格鋪地面（<code>Tilemap.SetTile</code>），再用 <code>Instantiate</code> 放金幣、敵人和終點。場景是在 Start 蓋好的，所以改了場景的數值後要按「重新開始」才會重新蓋。',
      challenges: [
        { title: '把坑挖寬一點', text: '在 Inspector 把 Pit Width 改成 5，按「重新開始」。勇者還跳得過去嗎？跳不過的話，到「人物」分頁調整跳躍。' },
        { title: '在坑上面搭平台', text: '在 BuildGround 裡，坑的位置雖然不放地面，但可以在高一點的地方放一排平台。', code: 'if (isPit)\n{\n    ground.SetTile(new Vector3Int(x, groundHeight + 2, 0), groundTile);\n    continue;\n}' },
        { title: '每隔 4 格一個尖刺', text: '用 % 取餘數，讓坑後面每隔 4 格就出現一個尖刺。', code: 'if (x > pitStart + pitWidth && x % 4 == 0)\n{\n    ground.SetTile(new Vector3Int(x, groundHeight, 0), spikeTile);\n}' }
      ]
    },
    {
      key: 'player', label: '人物', file: 'PlayerController.cs', entity: 'Player', code: PLAYER,
      intro: 'PlayerController 掛在勇者身上：<code>Update()</code> 讀鍵盤、設定 <code>linearVelocity</code>；用 <code>OverlapCircle</code> 檢查腳下有沒有地板；<code>OnTriggerEnter2D</code> 處理撿金幣和抵達終點。人物的 Inspector 數值玩到一半也能改，馬上生效。',
      challenges: [
        { title: '超級跳', text: '玩到一半，在 Inspector 把 Jump Force 改成 20，再按空白鍵。' },
        { title: '二段跳', text: '把 Max Jumps 改成 2。看看程式裡的 jumpsLeft 是怎麼運作的：落地補滿，每跳一次減 1。' },
        { title: '撿到金幣變金色', text: '在撿到金幣的地方加一行，讓勇者變色。', code: 'sr.color = Color.yellow;' }
      ]
    },
    {
      key: 'enemy', label: '敵人', file: 'EnemyPatrol.cs', entity: 'Enemy', code: ENEMY,
      intro: 'EnemyPatrol 掛在每一隻敵人身上。敵人是 Prefab，由 LevelBuilder 生成。它會在出生點左右巡邏，玩家靠近時追過去並變紅，被從上面踩到就消失，從側面撞到勇者就 Game Over。在 Inspector 改數值會同時套用到所有敵人。',
      challenges: [
        { title: '只巡邏、不追人', text: '在 Inspector 把 Chase Range 改成 0。' },
        { title: '敵人大軍', text: '到「場景」分頁把 Enemy Count 改成 3，再回來把 Chase Speed 改成 5。重新開始試試。' },
        { title: '踩扁敵人加 5 分', text: '在「從上面踩下來」的區塊裡加一行。', code: 'GameManager.Instance.AddScore(5);' }
      ]
    }
  ];

  /* =========================================================
   * 三個檔案一起編譯，錯誤要對回正確的檔案和行號
   * ========================================================= */
  function compileAll(codes) {
    let src = '';
    const ranges = [];
    let line = 1;
    for (const f of FILES) {
      const code = (codes[f.key] !== undefined ? codes[f.key] : f.code).replace(/\n?$/, '\n');
      const n = code.split('\n').length - 1;
      ranges.push({ key: f.key, file: f.file, from: line, to: line + n - 1 });
      src += code;
      line += n;
    }
    const hiddenFrom = line;
    src += HIDDEN;
    const comp = compile(src, { requireUsings: true, hiddenFrom });
    const locate = (ln) => {
      const r = ranges.find((x) => ln >= x.from && ln <= x.to);
      return r ? { key: r.key, file: r.file, line: ln - r.from + 1 } : { key: null, file: 'WorkshopRestart.cs', line: ln - hiddenFrom + 1 };
    };
    const mapErr = (e) => {
      const loc = locate(e.line);
      const m = new CsError(e.kind, e.code, e.message, loc.line, e.col);
      m.fileKey = loc.key;
      m.file = loc.file;
      return m;
    };
    return {
      ok: comp.ok, prog: comp.prog,
      errors: (comp.errors || []).map(mapErr),
      warnings: (comp.warnings || []).map(mapErr),
      formatErr: (err) => { const m = mapErr(err); return formatError(m, m.file); },
      locate
    };
  }

  /** 給 tests.html 用：不畫畫面，直接跑一段時間 */
  function simulate(codes, opts) {
    opts = opts || {};
    const c = compileAll(codes || {});
    if (!c.ok) return { compile: c };
    const def = Object.assign({}, SCENE_DEF, { input: opts.input || [] });
    const w = new root.UnityStage.UWorld(LEVEL, def, c.prog, { inspector: opts.inspector, formatErr: c.formatErr });
    const dur = opts.duration || 3;
    while (w.unscaled < dur - 1e-9 && !w.frozen) w.step();
    return { world: w, compile: c };
  }

  root.CSQWorkshop = { FILES, LEVEL, SCENE_DEF, compileAll, simulate };
})(typeof window !== 'undefined' ? window : globalThis);
