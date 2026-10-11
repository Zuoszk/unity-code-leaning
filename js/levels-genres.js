/* C# 小勇者：遊戲類型挑戰（W11 推箱子、W12 方塊沙盒、W13 太空射擊、W14 塔防）
 * 做法參考：Unity Learn「Use the command pattern」、Unity ScriptReference Pool.ObjectPool<T>、
 * Kodeco「How to Create a Tower Defense Game in Unity」、gamedevbeginner 滑鼠座標轉換教學。
 */
(function (root) {
  'use strict';
  const LV = root.CSQLevels;
  const { cs, rep, U } = LV.helpers;

  /* ---------- 共用工具 ---------- */
  const KEYNAME = { R: 'right', L: 'left', U: 'up', D: 'down', Z: 'z' };
  /** 依序按鍵：'RRUL' → 每 gap 秒按一下 */
  function presses(seq, start, gap) {
    start = start === undefined ? 0.3 : start;
    gap = gap || 0.25;
    return seq.split('').map((ch, i) => [start + i * gap, start + i * gap + 0.08, KEYNAME[ch] || ch]);
  }
  /** 滑鼠點擊：[[x, y, 'left'|'right'], ...]，座標是世界座標（格子） */
  function clicks(list, start, gap) {
    start = start === undefined ? 0.3 : start;
    gap = gap || 0.35;
    const out = [];
    list.forEach(([x, y, btn], i) => {
      const t = start + i * gap;
      out.push([t, x, y, null], [t + 0.05, x, y, btn], [t + 0.15, x, y, null]);
    });
    return out;
  }
  const at = (e, x, y) => !!e && !e.destroyed && Math.abs(e.x - (x + 0.5)) < 0.06 && Math.abs(e.y - (y + 0.5)) < 0.06;
  const ents = (W, pred) => W.entities.filter((e) => !e.destroyed && pred(e));
  const byName = (W, name) => W.entities.find((e) => !e.destroyed && e.name === name);
  const kindAt = (W, map, x, y) => (W.maps[map] ? W.maps[map][y][x] : null);
  const countKind = (W, map, kind) => (W.maps[map] ? W.maps[map].reduce((s, row) => s + row.filter((k) => k === kind).length, 0) : 0);
  const field = (W, entName, f) => { const e = byName(W, entName); return e && e.scripts[0] ? e.scripts[0].obj.fields.get(f) : undefined; };
  const logs = (W) => W.logs.filter((l) => l.kind === 'log').map((l) => l.text);
  const res = U.res;

  const ARROWS = ['left', 'right', 'up', 'down'];
  const SOKO_CHARS = { '#': ['Walls', 'Wall'], o: ['Goals', 'Goal'] };
  const T = {
    gridHero: (script) => ({ name: 'Hero', tag: 'Player', sprite: 'hero', w: 0.8, h: 0.8, collider: false, script }),
    box: { name: 'Box', tag: 'Box', sprite: 'crate', w: 0.9, h: 0.9 },
    flag: { name: 'Flag', tag: 'Finish', sprite: 'flag', w: 0.8, h: 0.8, collider: false },
    ctrl: (script, name) => ({ name: name || 'GameController', collider: false, script })
  };
  const WORLDS = [
    { id: 11, name: '推箱子工坊', sub: '解謎遊戲', ch: 'ch11', genre: true },
    { id: 12, name: '方塊沙盒', sub: '沙盒遊戲', ch: 'ch12', genre: true },
    { id: 13, name: '太空射擊', sub: '射擊遊戲', ch: 'ch13', genre: true },
    { id: 14, name: '塔防前線', sub: '塔防遊戲', ch: 'ch14', genre: true }
  ];
  const L = [];

  /* =========================================================
   * W11 推箱子工坊
   * ========================================================= */
  const sol111 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class GridMover : MonoBehaviour
    {
        private Vector2Int pos;

        void Start()
        {
            // 從目前的位置算出在第幾格
            pos = new Vector2Int(Mathf.FloorToInt(transform.position.x), Mathf.FloorToInt(transform.position.y));
        }

        void Update()
        {
            var kb = Keyboard.current;
            Vector2Int dir = Vector2Int.zero;
            if (kb.rightArrowKey.wasPressedThisFrame) dir = Vector2Int.right;
            if (kb.leftArrowKey.wasPressedThisFrame) dir = Vector2Int.left;
            if (kb.upArrowKey.wasPressedThisFrame) dir = Vector2Int.up;
            if (kb.downArrowKey.wasPressedThisFrame) dir = Vector2Int.down;

            if (dir != Vector2Int.zero)
            {
                pos += dir;
                // 格子座標換成世界座標：格子的中心在 +0.5 的位置
                transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);
            }
        }
    }
  `;
  L.push({
    id: '11-1', world: 11, title: '一次走一格', file: 'GridMover.cs',
    concept: '解謎遊戲大多是<b>格子移動</b>：按一下方向鍵剛好走一格。用 <code>Vector2Int</code> 記住勇者在第幾格（整數），按鍵時加上方向，再換算成世界座標。格子 (3, 1) 的中心是 (3.5, 1.5)，所以要加 0.5。',
    goal: '按方向鍵讓勇者一格一格走到旗子上（會自動按 6 次 →）。',
    scene: { tiles: ['#########', '#P.....F#', '#########'], tileChars: SOKO_CHARS, entities: { P: T.gridHero('GridMover'), F: T.flag }, duration: 2.2, input: presses('RRRRRR'), grid: true },
    keys: ARROWS,
    starter: rep(sol111, '            // 格子座標換成世界座標：格子的中心在 +0.5 的位置\n            transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);\n', '            // 這裡要把 pos 換算成世界座標，指定給 transform.position\n'),
    solution: sol111,
    check: (W) => res(at(W.player, 7, 1), `勇者停在 (${W.player.x.toFixed(1)}, ${W.player.y.toFixed(1)})，不在旗子 (7.5, 1.5) 上`),
    choices: [
      { code: sol111, expect: 'win', explain: 'pos 加上方向後，換算成格子中心的世界座標。' },
      { code: rep(sol111, '            // 格子座標換成世界座標：格子的中心在 +0.5 的位置\n            transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);\n', ''), expect: 'fail', explain: 'pos 有變，但畫面上的勇者沒有移動。資料和畫面要一起更新。' },
      { code: sol111.split('wasPressedThisFrame').join('isPressed'), expect: 'fail', explain: 'isPressed 在按住的每一幀都是 true，按一下就走了好幾格。' },
      { code: rep(sol111, 'Vector2Int dir = Vector2Int.zero;', 'Vector2 dir = Vector2.zero;'), expect: 'compile:CS0029', explain: 'Vector2 是小數向量，不能直接加到 Vector2Int 上。格子座標全程都用 Vector2Int。' }
    ],
    hints: ['pos 已經算好了，畫面上的勇者還沒動。', '要指定 transform.position，記得加 0.5 到格子中心。', 'transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);']
  });

  const sol112 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class GridMover : MonoBehaviour
    {
        [SerializeField] private Tilemap walls;
        private Vector2Int pos;

        void Start()
        {
            pos = new Vector2Int(Mathf.FloorToInt(transform.position.x), Mathf.FloorToInt(transform.position.y));
        }

        void Update()
        {
            var kb = Keyboard.current;
            Vector2Int dir = Vector2Int.zero;
            if (kb.rightArrowKey.wasPressedThisFrame) dir = Vector2Int.right;
            if (kb.leftArrowKey.wasPressedThisFrame) dir = Vector2Int.left;
            if (kb.upArrowKey.wasPressedThisFrame) dir = Vector2Int.up;
            if (kb.downArrowKey.wasPressedThisFrame) dir = Vector2Int.down;

            if (dir != Vector2Int.zero)
            {
                Vector2Int target = pos + dir;
                // 目標格子是牆壁就不動
                if (!walls.HasTile(new Vector3Int(target.x, target.y, 0)))
                {
                    pos = target;
                    transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);
                }
            }
        }
    }
  `;
  L.push({
    id: '11-2', world: 11, title: '撞牆檢查', file: 'GridMover.cs',
    concept: '牆壁畫在一張 <b>Tilemap</b> 上。移動之前先算出「目標格子」，用 <code>walls.HasTile(格子)</code> 問那一格有沒有牆。Tilemap 的格子座標是 <code>Vector3Int</code>，要把 Vector2Int 轉成 <code>new Vector3Int(x, y, 0)</code>。',
    goal: '自動輸入會往上撞牆兩次，勇者不能穿牆，最後要停在旗子上。',
    scene: { tiles: ['#########', '#.......#', '#P....F.#', '#########'], tileChars: SOKO_CHARS, entities: { P: T.gridHero('GridMover'), F: T.flag }, inspector: { Hero: { walls: { tilemap: 'Walls' } } }, duration: 2.6, input: presses('UUDRRRRR'), grid: true },
    keys: ARROWS,
    starter: rep(sol112, cs`
                // 目標格子是牆壁就不動
                if (!walls.HasTile(new Vector3Int(target.x, target.y, 0)))
                {
                    pos = target;
                    transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);
                }
    `.replace(/^(?=.)/gm, '            ').replace(/\s+$/, '\n'), '                // 要先檢查 target 是不是牆壁\n                pos = target;\n                transform.position = new Vector3(pos.x + 0.5f, pos.y + 0.5f, 0f);\n'),
    solution: sol112,
    check: (W) => res(at(W.player, 6, 1), '勇者沒有停在旗子上（可能穿過牆了）'),
    choices: [
      { code: sol112, expect: 'win', explain: '目標格子沒有牆才移動。' },
      { code: rep(sol112, 'if (!walls.HasTile', 'if (walls.HasTile'), expect: 'fail', explain: '條件反了，變成「只有牆壁才能走」。' },
      { code: rep(sol112, 'walls.HasTile(new Vector3Int(target.x, target.y, 0))', 'walls.HasTile(target)'), expect: 'compile:CS1503', explain: 'HasTile 要的是 Vector3Int，Vector2Int 不會自動轉換。' },
      { code: rep(sol112, 'using UnityEngine.Tilemaps;\n', ''), expect: 'compile:CS0246', explain: 'Tilemap 在 UnityEngine.Tilemaps 命名空間裡，要先 using。' }
    ],
    hints: ['移動前先問 walls 那一格有沒有東西。', 'if (!walls.HasTile(new Vector3Int(target.x, target.y, 0))) { ... }', sol112]
  });

  const sol113 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class Pusher : MonoBehaviour
    {
        [SerializeField] private Tilemap walls;
        private Vector2Int pos;

        void Start()
        {
            pos = new Vector2Int(Mathf.FloorToInt(transform.position.x), Mathf.FloorToInt(transform.position.y));
        }

        void Update()
        {
            Vector2Int dir = ReadDirection();
            if (dir == Vector2Int.zero) return;

            Vector2Int target = pos + dir;
            if (IsWall(target)) return;

            // 目標格子上有沒有箱子？
            Collider2D hit = Physics2D.OverlapPoint(CellCenter(target));
            if (hit != null && hit.CompareTag("Box"))
            {
                Vector2Int boxTarget = target + dir;
                // 箱子後面是牆或另一個箱子，就推不動
                if (IsWall(boxTarget) || Physics2D.OverlapPoint(CellCenter(boxTarget)) != null) return;
                hit.transform.position = CellCenter(boxTarget);
            }

            pos = target;
            transform.position = CellCenter(pos);
        }

        Vector2Int ReadDirection()
        {
            var kb = Keyboard.current;
            if (kb.rightArrowKey.wasPressedThisFrame) return Vector2Int.right;
            if (kb.leftArrowKey.wasPressedThisFrame) return Vector2Int.left;
            if (kb.upArrowKey.wasPressedThisFrame) return Vector2Int.up;
            if (kb.downArrowKey.wasPressedThisFrame) return Vector2Int.down;
            return Vector2Int.zero;
        }

        bool IsWall(Vector2Int cell)
        {
            return walls.HasTile(new Vector3Int(cell.x, cell.y, 0));
        }

        Vector3 CellCenter(Vector2Int cell)
        {
            return new Vector3(cell.x + 0.5f, cell.y + 0.5f, 0f);
        }
    }
  `;
  const pushBlock = cs`
            // 目標格子上有沒有箱子？
            Collider2D hit = Physics2D.OverlapPoint(CellCenter(target));
            if (hit != null && hit.CompareTag("Box"))
            {
                Vector2Int boxTarget = target + dir;
                // 箱子後面是牆或另一個箱子，就推不動
                if (IsWall(boxTarget) || Physics2D.OverlapPoint(CellCenter(boxTarget)) != null) return;
                hit.transform.position = CellCenter(boxTarget);
            }
  `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n');
  L.push({
    id: '11-3', world: 11, title: '推箱子', file: 'Pusher.cs',
    concept: '推箱子的關鍵：目標格子上有箱子時，再看<b>箱子後面那一格</b>。後面是空的才把箱子推過去，勇者再跟著前進。用 <code>Physics2D.OverlapPoint(位置)</code> 找某個點上有沒有碰撞框，再用 Tag 確認是不是箱子。這關會測兩種情況：推到目標，以及箱子靠牆推不動。',
    goal: '把箱子推到黃色目標格上；箱子後面是牆時要推不動。',
    variants: [
      { tiles: ['#########', '#P.B..o.#', '#########'], tileChars: SOKO_CHARS, entities: { P: T.gridHero('Pusher'), B: T.box }, inspector: { Hero: { walls: { tilemap: 'Walls' } } }, duration: 1.6, input: presses('RRRR'), grid: true, label: '測試 1：推到目標' },
      { tiles: ['#########', '#.P.B#.o#', '#########'], tileChars: SOKO_CHARS, entities: { P: T.gridHero('Pusher'), B: T.box }, inspector: { Hero: { walls: { tilemap: 'Walls' } } }, duration: 1.6, input: presses('RRRR'), grid: true, label: '測試 2：靠牆推不動' }
    ],
    keys: ARROWS,
    starter: rep(sol113, pushBlock, '        // 目標格子上如果有箱子，要先把箱子推過去\n\n'),
    solution: sol113,
    check: (W, ws, vi) => {
      const box = byName(W, 'Box');
      if (vi === 0) return res(at(box, 6, 1), '箱子沒有被推到目標格上');
      if (!at(box, 4, 1)) return { ok: false, msg: '測試 2：箱子被推進牆裡了' };
      return res(at(W.player, 3, 1), '測試 2：勇者和箱子重疊了');
    },
    choices: [
      { code: sol113, expect: 'win', explain: '先檢查箱子後面，空的才推。' },
      { code: rep(sol113, '            // 箱子後面是牆或另一個箱子，就推不動\n            if (IsWall(boxTarget) || Physics2D.OverlapPoint(CellCenter(boxTarget)) != null) return;\n', ''), expect: 'fail', explain: '沒檢查箱子後面，測試 2 把箱子推進了牆裡。' },
      { code: rep(sol113, 'hit.CompareTag("Box")', 'hit.CompareTag("box")'), expect: 'fail', explain: 'Tag 分大小寫，"box" 找不到箱子，勇者直接穿過去了。' },
      { code: rep(sol113, 'hit.transform.position = CellCenter(boxTarget);', 'hit.position = CellCenter(boxTarget);'), expect: 'compile:CS1061', explain: 'Collider2D 沒有 position，要透過 hit.transform.position 移動物件。' }
    ],
    hints: ['用 Physics2D.OverlapPoint(CellCenter(target)) 找目標格上的東西。', '是箱子的話，算出 boxTarget = target + dir，那一格是空的才推。', sol113]
  });

  const sol114 = cs`
    using UnityEngine;
    using UnityEngine.Tilemaps;

    public class GoalChecker : MonoBehaviour
    {
        [SerializeField] private Tilemap goals;
        private bool won;

        void Update()
        {
            if (won) return;

            GameObject[] boxes = GameObject.FindGameObjectsWithTag("Box");
            foreach (GameObject box in boxes)
            {
                Vector3Int cell = goals.WorldToCell(box.transform.position);
                // 只要有一個箱子不在目標上，就還沒過關
                if (!goals.HasTile(cell)) return;
            }

            won = true;
            GameManager.Instance.LevelComplete();
        }
    }
  `;
  L.push({
    id: '11-4', world: 11, title: '勝利條件', file: 'GoalChecker.cs',
    concept: '<b>所有</b>箱子都在目標上才過關。用 <code>GameObject.FindGameObjectsWithTag("Box")</code> 拿到全部箱子，<code>foreach</code> 一個一個檢查，只要有一個不在目標上就 <code>return</code>。全部通過才呼叫 LevelComplete，並用 bool 記住已經贏了，避免每一幀都再呼叫一次。',
    goal: '兩個箱子都推到目標上時，呼叫一次 GameManager.Instance.LevelComplete()（推箱子的程式已經寫好了）。',
    hidden: sol113,
    inspectorFor: 'GameController',
    scene: {
      tiles: ['#########', '#P.B.o..#', '#..B.oG.#', '#########'], tileChars: SOKO_CHARS,
      entities: { P: T.gridHero('Pusher'), B: T.box, G: T.ctrl('GoalChecker') },
      inspector: { Hero: { walls: { tilemap: 'Walls' } }, GameController: { goals: { tilemap: 'Goals' } } },
      gameManager: true, hideScore: true, duration: 2.7, input: presses('RRRLLDRR'), grid: true
    },
    keys: ARROWS,
    starter: rep(sol114, cs`
            foreach (GameObject box in boxes)
            {
                Vector3Int cell = goals.WorldToCell(box.transform.position);
                // 只要有一個箱子不在目標上，就還沒過關
                if (!goals.HasTile(cell)) return;
            }

            won = true;
            GameManager.Instance.LevelComplete();
    `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n'), '        // 檢查每一個箱子是不是都在目標格上，全部都在才呼叫 LevelComplete\n'),
    solution: sol114,
    check: (W) => {
      if (W.gm.completes === 0) return { ok: false, msg: '兩個箱子都到位了，卻沒有呼叫 LevelComplete' };
      if (W.gm.firstDoneAt < 1.95) return { ok: false, msg: `才推好第一個箱子（${W.gm.firstDoneAt.toFixed(1)} 秒）就過關了` };
      return res(W.gm.completes === 1, `LevelComplete 被呼叫了 ${W.gm.completes} 次，應該只有一次`);
    },
    choices: [
      { code: sol114, expect: 'win', explain: '全部檢查通過才過關，而且只呼叫一次。' },
      { code: rep(rep(sol114, '        if (won) return;\n\n', ''), '        won = true;\n', ''), expect: 'fail', explain: '沒有記住「已經贏了」，之後每一幀都再呼叫一次 LevelComplete。' },
      { code: rep(sol114, '            if (!goals.HasTile(cell)) return;\n', '            if (goals.HasTile(cell))\n            {\n                won = true;\n                GameManager.Instance.LevelComplete();\n                return;\n            }\n'), expect: 'fail', explain: '變成「任何一個箱子到位就過關」，第一個箱子推好就結束了。' },
      { code: rep(sol114, 'if (!goals.HasTile(cell)) return;', 'if (!goals.HasTile(box.transform.position)) return;'), expect: 'compile:CS1503', explain: 'HasTile 要格子座標（Vector3Int），先用 WorldToCell 把世界座標轉成格子。' }
    ],
    hints: ['用 foreach 檢查 boxes 裡的每一個箱子。', '有一個不在目標上就 return；迴圈跑完都沒 return，才代表全部到位。', sol114]
  });

  const sol115 = cs`
    using System.Collections.Generic;
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class UndoPusher : MonoBehaviour
    {
        [SerializeField] private Tilemap walls;
        private Vector2Int pos;
        private Stack<MoveRecord> history = new Stack<MoveRecord>();

        void Start()
        {
            pos = new Vector2Int(Mathf.FloorToInt(transform.position.x), Mathf.FloorToInt(transform.position.y));
        }

        void Update()
        {
            if (Keyboard.current.zKey.wasPressedThisFrame)
            {
                Undo();
                return;
            }

            Vector2Int dir = ReadDirection();
            if (dir == Vector2Int.zero) return;

            Vector2Int target = pos + dir;
            if (IsWall(target)) return;

            Transform pushed = null;
            Collider2D hit = Physics2D.OverlapPoint(CellCenter(target));
            if (hit != null && hit.CompareTag("Box"))
            {
                Vector2Int boxTarget = target + dir;
                if (IsWall(boxTarget) || Physics2D.OverlapPoint(CellCenter(boxTarget)) != null) return;
                pushed = hit.transform;
                pushed.position = CellCenter(boxTarget);
            }

            // 記下這一步：勇者原本在哪、推了哪個箱子、箱子原本在哪
            history.Push(new MoveRecord(pos, pushed, target));
            pos = target;
            transform.position = CellCenter(pos);
        }

        void Undo()
        {
            if (history.Count == 0) return;   // 已經退回最開始了

            MoveRecord last = history.Pop();
            pos = last.playerFrom;
            transform.position = CellCenter(pos);
            if (last.box != null)
            {
                last.box.position = CellCenter(last.boxFrom);
            }
        }

        Vector2Int ReadDirection()
        {
            var kb = Keyboard.current;
            if (kb.rightArrowKey.wasPressedThisFrame) return Vector2Int.right;
            if (kb.leftArrowKey.wasPressedThisFrame) return Vector2Int.left;
            if (kb.upArrowKey.wasPressedThisFrame) return Vector2Int.up;
            if (kb.downArrowKey.wasPressedThisFrame) return Vector2Int.down;
            return Vector2Int.zero;
        }

        bool IsWall(Vector2Int cell)
        {
            return walls.HasTile(new Vector3Int(cell.x, cell.y, 0));
        }

        Vector3 CellCenter(Vector2Int cell)
        {
            return new Vector3(cell.x + 0.5f, cell.y + 0.5f, 0f);
        }
    }

    // 一步的紀錄（Command 模式裡的「指令」）
    public class MoveRecord
    {
        public Vector2Int playerFrom;
        public Transform box;
        public Vector2Int boxFrom;

        public MoveRecord(Vector2Int playerFrom, Transform box, Vector2Int boxFrom)
        {
            this.playerFrom = playerFrom;
            this.box = box;
            this.boxFrom = boxFrom;
        }
    }
  `;
  const pushLine = '        history.Push(new MoveRecord(pos, pushed, target));\n';
  L.push({
    id: '11-5', world: 11, title: '悔一步', file: 'UndoPusher.cs',
    concept: '「悔一步」用 <b>Stack（堆疊）</b>：每走一步就把紀錄 <code>Push</code> 進去，按 Z 時 <code>Pop</code> 出最後一筆、把狀態還原。後進先出，正好就是「最後做的最先撤銷」。這是 Unity 官方教的 <b>Command 模式</b>。紀錄裡要連箱子原本的位置一起存，不然撤銷時箱子回不去。',
    goal: '推過頭之後按 Z，箱子和勇者都要回到上一步；一開始就按 Z 也不能出錯。',
    scene: {
      tiles: ['#########', '#P.B.o..#', '#########'], tileChars: SOKO_CHARS,
      entities: { P: T.gridHero('UndoPusher'), B: T.box },
      inspector: { Hero: { walls: { tilemap: 'Walls' } } }, duration: 2, input: presses('ZRRRRZ'), grid: true
    },
    keys: ARROWS.concat(['z']),
    starter: rep(sol115, pushLine, '        // 在這裡把這一步記進 history\n'),
    solution: sol115,
    check: (W) => {
      const box = byName(W, 'Box');
      if (!at(box, 5, 1)) return { ok: false, msg: '按 Z 之後，箱子沒有回到目標格上' };
      return res(at(W.player, 4, 1), '按 Z 之後，勇者沒有退回上一步的位置');
    },
    choices: [
      { code: sol115, expect: 'win', explain: '每一步都存起來，撤銷時勇者和箱子一起還原。' },
      { code: rep(sol115, '        if (last.box != null)\n        {\n            last.box.position = CellCenter(last.boxFrom);\n        }\n', ''), expect: 'fail', explain: '只有勇者退回去，箱子留在原地。' },
      { code: rep(sol115, '        if (history.Count == 0) return;   // 已經退回最開始了\n\n', ''), expect: 'runtime:InvalidOperationException', explain: '一開始就按 Z，Stack 是空的，Pop 會出錯。先檢查 Count。' },
      { code: rep(rep(sol115, pushLine, ''), '        pos = target;\n        transform.position = CellCenter(pos);\n    }\n\n    void Undo()', '        pos = target;\n' + pushLine + '        transform.position = CellCenter(pos);\n    }\n\n    void Undo()'), expect: 'fail', explain: '先改了 pos 才記錄，存進去的是「新」位置，撤銷時勇者根本不會退。' }
    ],
    hints: ['移動之前，用 history.Push(...) 存一筆 MoveRecord。', 'MoveRecord 要存勇者原本的位置 pos、被推的箱子 pushed、箱子原本的格子 target。', pushLine.trim()]
  });

  const sol116 = cs`
    using UnityEngine;
    using UnityEngine.Tilemaps;

    public class LevelLoader : MonoBehaviour
    {
        [SerializeField] private Tilemap walls;
        [SerializeField] private Tilemap goals;
        [SerializeField] private TileBase wallTile;
        [SerializeField] private TileBase goalTile;
        [SerializeField] private GameObject boxPrefab;
        [SerializeField] private Transform player;

        // # 牆壁　o 目標　B 箱子　P 勇者　. 地板
        private string[] level =
        {
            "#######",
            "#..o..#",
            "#..B..#",
            "#P....#",
            "#######"
        };

        void Start()
        {
            for (int row = 0; row < level.Length; row++)
            {
                // 字串的第 0 行在最上面，但 Unity 的 y 越往上越大，所以要翻過來
                int y = level.Length - 1 - row;
                for (int x = 0; x < level[row].Length; x++)
                {
                    char c = level[row][x];
                    Vector3Int cell = new Vector3Int(x, y, 0);
                    Vector3 center = new Vector3(x + 0.5f, y + 0.5f, 0f);

                    if (c == '#') walls.SetTile(cell, wallTile);
                    else if (c == 'o') goals.SetTile(cell, goalTile);
                    else if (c == 'B') Instantiate(boxPrefab, center, Quaternion.identity);
                    else if (c == 'P') player.position = center;
                }
            }
        }
    }
  `;
  L.push({
    id: '11-6', world: 11, title: '用文字蓋關卡', file: 'LevelLoader.cs',
    concept: '解謎遊戲常常有幾十關，一關一關手擺太累。把關卡寫成<b>字串陣列</b>，每個字元代表一種東西，用雙層 for 迴圈讀 <code>level[row][x]</code>，再用 SetTile 和 Instantiate 蓋出來。要注意：字串第 0 行在最上面，Unity 的 y 卻是往上變大，要翻過來。',
    goal: '照著字串陣列蓋出牆壁、目標、箱子，並把勇者放到 P 的位置。',
    hidden: sol113,
    inspectorFor: 'GameController',
    scene: {
      tiles: ['G......', '.......', '.......', '.......', '......P'], tileChars: SOKO_CHARS,
      entities: { P: T.gridHero('Pusher'), G: T.ctrl('LevelLoader') },
      prefabs: { Box: T.box },
      inspector: {
        Hero: { walls: { tilemap: 'Walls' } },
        GameController: { walls: { tilemap: 'Walls' }, goals: { tilemap: 'Goals' }, wallTile: { tile: 'Wall' }, goalTile: { tile: 'Goal' }, boxPrefab: { prefab: 'Box' }, player: { ref: 'Hero' } }
      },
      duration: 0.3, grid: true
    },
    keys: ARROWS,
    starter: rep(sol116, 'int y = level.Length - 1 - row;', 'int y = row;'),
    solution: sol116,
    check: (W) => {
      const walls = countKind(W, 'Walls', 'Wall');
      if (walls !== 20) return { ok: false, msg: `牆壁應該有 20 格，現在有 ${walls} 格` };
      if (kindAt(W, 'Goals', 3, 3) !== 'Goal') return { ok: false, msg: '目標格不在正確的位置（關卡上下顛倒了嗎？）' };
      const boxes = ents(W, (e) => e.tag === 'Box');
      if (boxes.length !== 1 || !at(boxes[0], 3, 2)) return { ok: false, msg: '箱子的數量或位置不對' };
      return res(at(W.player, 1, 1), '勇者沒有被放到 P 的位置（關卡上下顛倒了嗎？）');
    },
    choices: [
      { code: sol116, expect: 'win', explain: '翻轉 y 之後，字串的樣子和遊戲畫面一致。' },
      { code: rep(sol116, 'int y = level.Length - 1 - row;', 'int y = row;'), expect: 'fail', explain: '沒有翻轉，整個關卡上下顛倒了。' },
      { code: rep(sol116, "if (c == '#')", 'if (c == "#")'), expect: 'compile:CS0019', explain: "level[row][x] 是 char（單一字元），要和 '#'（單引號）比較，不能和字串 \"#\" 比較。" },
      { code: rep(sol116, 'x < level[row].Length', 'x <= level[row].Length'), expect: 'runtime:IndexOutOfRangeException', explain: '字串的最後一個字元是 Length - 1，<= 會多讀一格。' }
    ],
    hints: ['把 y 算錯的話，關卡會上下顛倒。', '第 row 行在 Unity 裡的 y 是 level.Length - 1 - row。', 'int y = level.Length - 1 - row;']
  });

  /* =========================================================
   * W12 方塊沙盒
   * ========================================================= */
  const sandTiles = (extraTop) => [
    (extraTop || 'B') + '...............',
    '................', '................', '................', '................', '................',
    '################', '################', 'xxxxxxxxxxxxxxxx'
  ];
  const SAND_CHARS = { '#': ['Ground', 'Ground'], x: ['Ground', 'Stone'] };
  const sandScene = (o) => Object.assign({
    tiles: sandTiles(), tileChars: SAND_CHARS, entities: { B: T.ctrl('BlockPlacer', 'Builder') },
    inspector: { Builder: { ground: { tilemap: 'Ground' }, blockTile: { tile: 'Stone' } } },
    showMouse: true, grid: true
  }, o);

  const sol121 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class BlockCursor : MonoBehaviour
    {
        void Update()
        {
            // 1. 滑鼠的螢幕座標：單位是像素，左下角是 (0, 0)
            Vector2 screen = Mouse.current.position.ReadValue();
            // 2. 換成世界座標：單位是格子
            Vector3 world = Camera.main.ScreenToWorldPoint(new Vector3(screen.x, screen.y, 10f));
            world.z = 0f;
            transform.position = world;
        }
    }
  `;
  L.push({
    id: '12-1', world: 12, title: '滑鼠座標', file: 'BlockCursor.cs',
    concept: '沙盒遊戲要知道滑鼠指著哪裡。<code>Mouse.current.position.ReadValue()</code> 拿到的是<b>螢幕座標</b>（像素）；遊戲裡的物件用的是<b>世界座標</b>（格子）。用 <code>Camera.main.ScreenToWorldPoint</code> 換算，z 填攝影機到畫面的距離（2D 通常是 10）。',
    goal: '讓方框游標跟著滑鼠移動。',
    scene: Object.assign(sandScene({ entities: { C: { name: 'Cursor', sprite: 'cursor', collider: false, script: 'BlockCursor' } }, tiles: sandTiles('.').map((r, i) => (i === 2 ? '......C.........' : r)) }), {
      mouse: [[0.1, 3.5, 2.5, null], [0.7, 8.3, 5.6, null], [1.3, 12.5, 3.5, null]], duration: 1.8, inspector: {}
    }),
    noInspector: true,
    mouseLevel: true,
    starter: rep(sol121, '        // 2. 換成世界座標：單位是格子\n        Vector3 world = Camera.main.ScreenToWorldPoint(new Vector3(screen.x, screen.y, 10f));\n        world.z = 0f;\n        transform.position = world;\n', '        // 2. 把 screen 換成世界座標，再指定給 transform.position\n'),
    solution: sol121,
    check: (W) => {
      const c = byName(W, 'Cursor');
      return res(c && Math.abs(c.x - 12.5) < 0.05 && Math.abs(c.y - 3.5) < 0.05, `游標停在 (${c.x.toFixed(1)}, ${c.y.toFixed(1)})，滑鼠在 (12.5, 3.5)`);
    },
    choices: [
      { code: sol121, expect: 'win', explain: '螢幕座標換成世界座標後再設定位置。' },
      { code: rep(sol121, '        Vector3 world = Camera.main.ScreenToWorldPoint(new Vector3(screen.x, screen.y, 10f));\n        world.z = 0f;\n        transform.position = world;\n', '        transform.position = screen;\n'), expect: 'fail', explain: '直接把像素當成格子，游標飛到幾百格外面去了。' },
      { code: rep(sol121, 'Vector2 screen = Mouse.current.position.ReadValue();', 'Vector2 screen = Mouse.current.position;'), expect: 'compile:CS0029', explain: 'position 是一個「控制項」，要呼叫 ReadValue() 才會拿到 Vector2。' },
      { code: rep(sol121, 'void Update()', 'void Start()'), expect: 'fail', explain: 'Start 只執行一次，游標不會跟著滑鼠動。' }
    ],
    hints: ['用 Camera.main.ScreenToWorldPoint 換算。', 'z 設成 10，換算後再把 world.z 設回 0。', sol121]
  });

  const sol122 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class BlockPlacer : MonoBehaviour
    {
        [SerializeField] private Tilemap ground;
        [SerializeField] private TileBase blockTile;

        void Update()
        {
            if (Mouse.current.leftButton.wasPressedThisFrame)
            {
                Vector3Int cell = MouseCell();
                ground.SetTile(cell, blockTile);
            }
        }

        // 滑鼠指著哪一格
        Vector3Int MouseCell()
        {
            Vector2 screen = Mouse.current.position.ReadValue();
            Vector3 world = Camera.main.ScreenToWorldPoint(screen);
            return ground.WorldToCell(world);
        }
    }
  `;
  const dragPath = [[1.0, 6.5, 4.5, 'left'], [1.05, 7.5, 4.5, 'left'], [1.1, 8.5, 4.5, 'left'], [1.15, 9.5, 4.5, 'left'], [1.25, 9.5, 4.5, null]];
  L.push({
    id: '12-2', world: 12, title: '左鍵放方塊', file: 'BlockPlacer.cs',
    concept: '滑鼠點到的世界座標，用 <code>tilemap.WorldToCell(world)</code> 換成<b>格子座標</b>，再 <code>SetTile(格子, 方塊)</code>。點一下放一塊要用 <code>wasPressedThisFrame</code>；用 isPressed 的話，按住拖曳會一路蓋過去。',
    goal: '點兩下各放一個石頭；最後一次是按住拖曳，也只能放一塊。',
    scene: sandScene({ mouse: clicks([[3.5, 3.5, 'left'], [4.5, 3.5, 'left']]).concat(dragPath), duration: 1.6 }),
    inspectorFor: 'Builder',
    mouseLevel: true,
    starter: rep(sol122, '            ground.SetTile(cell, blockTile);\n', '            // 在 cell 放上 blockTile\n'),
    solution: sol122,
    check: (W) => {
      const want = [[3, 3], [4, 3], [6, 4]];
      const n = countKind(W, 'Ground', 'Stone') - 16;
      if (want.some(([x, y]) => kindAt(W, 'Ground', x, y) !== 'Stone')) return { ok: false, msg: '點擊的位置沒有出現石頭' };
      return res(n === 3, `應該放 3 塊石頭，實際放了 ${n} 塊`);
    },
    choices: [
      { code: sol122, expect: 'win', explain: '每點一下放一塊。' },
      { code: rep(sol122, 'leftButton.wasPressedThisFrame', 'leftButton.isPressed'), expect: 'fail', explain: '按住拖曳時每一幀都放一塊，拖過的地方全蓋滿了。' },
      { code: rep(sol122, '            Vector3Int cell = MouseCell();\n            ground.SetTile(cell, blockTile);', '            Vector3 world = Camera.main.ScreenToWorldPoint(Mouse.current.position.ReadValue());\n            ground.SetTile(world, blockTile);'), expect: 'compile:CS1503', explain: 'SetTile 要格子座標（Vector3Int），要先用 WorldToCell 換算。' },
      { code: rep(sol122, '        Vector3 world = Camera.main.ScreenToWorldPoint(screen);\n        return ground.WorldToCell(world);', '        return ground.WorldToCell(screen);'), expect: 'fail', explain: '把螢幕的像素當成世界座標，格子算到地圖外面去了（看 Console 的警告）。' }
    ],
    hints: ['MouseCell() 已經算好格子了。', '用 ground.SetTile(cell, blockTile) 放方塊。', 'ground.SetTile(cell, blockTile);']
  });

  const sol123 = rep(sol122, cs`
            if (Mouse.current.leftButton.wasPressedThisFrame)
            {
                Vector3Int cell = MouseCell();
                ground.SetTile(cell, blockTile);
            }
  `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n'), cs`
            if (Mouse.current.leftButton.wasPressedThisFrame)
            {
                Vector3Int cell = MouseCell();
                ground.SetTile(cell, blockTile);
            }

            if (Mouse.current.rightButton.wasPressedThisFrame)
            {
                Vector3Int cell = MouseCell();
                // 最底下那一排（y = 0）是基岩，不能挖
                if (cell.y > 0)
                {
                    ground.SetTile(cell, null);
                }
            }
  `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n')).replace('public class BlockPlacer', 'public class BlockEditor');
  const digBlock = cs`
            if (Mouse.current.rightButton.wasPressedThisFrame)
            {
                Vector3Int cell = MouseCell();
                // 最底下那一排（y = 0）是基岩，不能挖
                if (cell.y > 0)
                {
                    ground.SetTile(cell, null);
                }
            }
  `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n');
  L.push({
    id: '12-3', world: 12, title: '右鍵挖掉', file: 'BlockEditor.cs',
    concept: '把格子設成 <code>null</code>，就是把那一格的方塊拿掉。沙盒遊戲通常有挖不掉的<b>基岩</b>，在挖之前檢查格子的 y 就好。',
    goal: '右鍵挖掉兩塊土，最底層的基岩要挖不掉；左鍵還是可以放方塊。',
    scene: sandScene({
      entities: { B: T.ctrl('BlockEditor', 'Builder') },
      mouse: clicks([[5.5, 2.5, 'right'], [6.5, 1.5, 'right'], [7.5, 0.5, 'right'], [10.5, 3.5, 'left']]), duration: 1.8
    }),
    inspectorFor: 'Builder',
    mouseLevel: true,
    starter: rep(sol123, '\n' + digBlock, '\n        // 右鍵：把滑鼠指著的格子挖掉（最底下一排不能挖）\n'),
    solution: sol123,
    check: (W) => {
      if (kindAt(W, 'Ground', 5, 2) || kindAt(W, 'Ground', 6, 1)) return { ok: false, msg: '右鍵點的土沒有被挖掉' };
      if (!kindAt(W, 'Ground', 7, 0)) return { ok: false, msg: '基岩被挖穿了' };
      return res(kindAt(W, 'Ground', 10, 3) === 'Stone', '左鍵放方塊壞掉了');
    },
    choices: [
      { code: sol123, expect: 'win', explain: '右鍵挖掉，y = 0 的基岩保留。' },
      { code: rep(rep(sol123, '            if (cell.y > 0)\n            {\n                ground.SetTile(cell, null);\n            }\n', '            ground.SetTile(cell, null);\n'), '            // 最底下那一排（y = 0）是基岩，不能挖\n', ''), expect: 'fail', explain: '沒有檢查 y，基岩也被挖掉了。' },
      { code: rep(sol123, 'ground.SetTile(cell, null);', 'ground.SetTile(cell, 0);'), expect: 'compile:CS1503', explain: '「沒有方塊」要用 null 表示，0 是數字。' },
      { code: rep(sol123, 'Mouse.current.rightButton', 'Mouse.current.RightButton'), expect: 'compile:CS1061', explain: '名稱是小寫開頭的 rightButton。' }
    ],
    hints: ['右鍵是 Mouse.current.rightButton。', '挖掉就是 SetTile(cell, null)；挖之前檢查 cell.y > 0。', digBlock.trim()]
  });

  const sol124 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class PaletteBuilder : MonoBehaviour
    {
        [SerializeField] private Tilemap ground;
        [SerializeField] private TileBase[] palette;   // 0 草地、1 石頭、2 木頭
        private int selected = 0;

        void Update()
        {
            var kb = Keyboard.current;
            if (kb.digit1Key.wasPressedThisFrame) selected = 0;
            if (kb.digit2Key.wasPressedThisFrame) selected = 1;
            if (kb.digit3Key.wasPressedThisFrame) selected = 2;

            if (Mouse.current.leftButton.wasPressedThisFrame)
            {
                ground.SetTile(MouseCell(), palette[selected]);
                Debug.Log($"放下 {palette[selected].name}");
            }
        }

        Vector3Int MouseCell()
        {
            Vector3 world = Camera.main.ScreenToWorldPoint(Mouse.current.position.ReadValue());
            return ground.WorldToCell(world);
        }
    }
  `;
  const keySel = '        if (kb.digit1Key.wasPressedThisFrame) selected = 0;\n        if (kb.digit2Key.wasPressedThisFrame) selected = 1;\n        if (kb.digit3Key.wasPressedThisFrame) selected = 2;\n';
  L.push({
    id: '12-4', world: 12, title: '切換材質', file: 'PaletteBuilder.cs',
    concept: '把可以用的方塊放在 <b>陣列</b> <code>TileBase[] palette</code> 裡（在 Inspector 拖進去），再用一個整數 <code>selected</code> 記住現在選哪一個。按數字鍵 1、2、3 切換，放方塊時用 <code>palette[selected]</code>。注意陣列從 0 開始。',
    goal: '按 2 放石頭、按 3 放木頭、按 1 放草地。',
    scene: sandScene({
      entities: { B: T.ctrl('PaletteBuilder', 'Builder') },
      inspector: { Builder: { ground: { tilemap: 'Ground' }, palette: { tiles: ['Grass', 'Stone', 'Wood'] } } },
      input: [[0.25, 0.33, '2'], [0.75, 0.83, '3'], [1.25, 1.33, '1']],
      mouse: clicks([[3.5, 3.5, 'left'], [4.5, 3.5, 'left'], [5.5, 3.5, 'left']], 0.45, 0.5), duration: 1.9
    }),
    inspectorFor: 'Builder',
    mouseLevel: true,
    keys: ['1', '2', '3'],
    starter: rep(sol124, keySel, '        // 按 1、2、3 切換 selected\n'),
    solution: sol124,
    check: (W) => {
      const got = [3, 4, 5].map((x) => kindAt(W, 'Ground', x, 3) || '空');
      return res(got.join() === 'Stone,Wood,Grass', `放下的是：${got.join('、')}，應該是 石頭、木頭、草地`);
    },
    choices: [
      { code: sol124, expect: 'win', explain: '數字鍵 1 對應索引 0。' },
      { code: rep(rep(rep(sol124, 'selected = 2;', 'selected = 3;'), 'selected = 1;', 'selected = 2;'), 'digit1Key.wasPressedThisFrame) selected = 0;', 'digit1Key.wasPressedThisFrame) selected = 1;'), expect: 'runtime:IndexOutOfRangeException', explain: '按 3 時 selected 變成 3，但陣列只有 0、1、2。' },
      { code: rep(sol124, 'ground.SetTile(MouseCell(), palette[selected]);', 'ground.SetTile(MouseCell(), palette(selected));'), expect: 'compile:CS1955', explain: '陣列用中括號 [ ] 取值，不是小括號。' },
      { code: rep(sol124, 'private TileBase[] palette;', 'private TileBase palette;'), expect: 'compile:CS0021', explain: '少了 []，palette 只是一個方塊，不是陣列，不能用索引。' }
    ],
    hints: ['用 Keyboard.current.digit1Key 讀數字鍵 1。', '數字鍵 1 → selected = 0，2 → 1，3 → 2。', keySel.trim()]
  });

  const sol125 = cs`
    using System.Collections.Generic;
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class InventoryBuilder : MonoBehaviour
    {
        [SerializeField] private Tilemap ground;
        [SerializeField] private TileBase[] palette;   // 0 石頭、1 木頭
        private int selected = 0;
        private Dictionary<string, int> inventory = new Dictionary<string, int>();

        void Start()
        {
            // 背包：每種方塊有幾個
            inventory["Stone"] = 3;
            inventory["Wood"] = 2;
        }

        void Update()
        {
            var kb = Keyboard.current;
            if (kb.digit1Key.wasPressedThisFrame) selected = 0;
            if (kb.digit2Key.wasPressedThisFrame) selected = 1;

            if (Mouse.current.leftButton.wasPressedThisFrame)
            {
                TileBase tile = palette[selected];
                if (inventory[tile.name] > 0)
                {
                    ground.SetTile(MouseCell(), tile);
                    inventory[tile.name]--;
                    Debug.Log($"{tile.name} 剩下 {inventory[tile.name]} 個");
                }
                else
                {
                    Debug.Log($"{tile.name} 用完了！");
                }
            }
        }

        Vector3Int MouseCell()
        {
            Vector3 world = Camera.main.ScreenToWorldPoint(Mouse.current.position.ReadValue());
            return ground.WorldToCell(world);
        }
    }
  `;
  const invNoCheck = rep(sol125, cs`
                if (inventory[tile.name] > 0)
                {
                    ground.SetTile(MouseCell(), tile);
                    inventory[tile.name]--;
                    Debug.Log($"{tile.name} 剩下 {inventory[tile.name]} 個");
                }
                else
                {
                    Debug.Log($"{tile.name} 用完了！");
                }
  `.replace(/^(?=.)/gm, '            ').replace(/\s+$/, '\n'), cs`
                // 要先檢查背包裡還有沒有
                ground.SetTile(MouseCell(), tile);
                inventory[tile.name]--;
                Debug.Log($"{tile.name} 剩下 {inventory[tile.name]} 個");
  `.replace(/^(?=.)/gm, '            ').replace(/\s+$/, '\n'));
  L.push({
    id: '12-5', world: 12, title: '背包數量', file: 'InventoryBuilder.cs',
    concept: '<b>Dictionary</b>（字典）用「名字」查「數量」：<code>inventory["Stone"]</code> 就是石頭有幾個，就像 Python 的 dict。放方塊前先確認數量大於 0，放了再減 1。用不存在的 key 讀取會出現 <b>KeyNotFoundException</b>。',
    goal: '石頭只有 3 個。連點 4 下，第 4 下不能放，Console 要顯示「用完了」。',
    scene: sandScene({
      entities: { B: T.ctrl('InventoryBuilder', 'Builder') },
      inspector: { Builder: { ground: { tilemap: 'Ground' }, palette: { tiles: ['Stone', 'Wood'] } } },
      mouse: clicks([[2.5, 3.5, 'left'], [3.5, 3.5, 'left'], [4.5, 3.5, 'left'], [5.5, 3.5, 'left']]), duration: 1.9
    }),
    inspectorFor: 'Builder',
    mouseLevel: true,
    keys: ['1', '2'],
    starter: invNoCheck,
    solution: sol125,
    check: (W) => {
      const placed = [2, 3, 4, 5].filter((x) => kindAt(W, 'Ground', x, 3) === 'Stone').length;
      if (placed !== 3) return { ok: false, msg: `放了 ${placed} 塊石頭，背包裡只有 3 塊` };
      return res(logs(W).some((l) => l.includes('用完了')), 'Console 沒有顯示「用完了」');
    },
    choices: [
      { code: sol125, expect: 'win', explain: '數量大於 0 才放，放了就減 1。' },
      { code: invNoCheck, expect: 'fail', explain: '沒有檢查數量，第 4 塊也放下去了，背包變成 -1。' },
      { code: rep(sol125, 'if (inventory[tile.name] > 0)', 'if (inventory.Get(tile.name) > 0)'), expect: 'compile:CS1061', explain: 'C# 的 Dictionary 沒有 Get，直接用 [key] 取值。' },
      { code: rep(sol125, '                inventory[tile.name]--;\n', '                inventory["stone"]--;\n'), expect: 'runtime:KeyNotFoundException', explain: 'key 是 "Stone"（大寫 S），"stone" 不存在。' }
    ],
    hints: ['放方塊前先看 inventory[tile.name] 還有沒有。', 'if (inventory[tile.name] > 0) { 放方塊並減 1 } else { 顯示用完了 }', sol125]
  });

  const sol126 = cs`
    using System.Collections.Generic;
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    // 要存檔的資料：欄位要是 public，JsonUtility 才會存
    [System.Serializable]
    public class SaveData
    {
        public List<int> xs = new List<int>();
        public List<int> ys = new List<int>();
    }

    public class SaveSystem : MonoBehaviour
    {
        [SerializeField] private Tilemap ground;
        [SerializeField] private TileBase blockTile;
        [SerializeField] private int width = 16;
        [SerializeField] private int height = 9;

        void Update()
        {
            var kb = Keyboard.current;
            if (kb.sKey.wasPressedThisFrame) Save();
            if (kb.lKey.wasPressedThisFrame) Load();
        }

        void Save()
        {
            SaveData data = new SaveData();
            for (int x = 0; x < width; x++)
            {
                for (int y = 3; y < height; y++)
                {
                    if (ground.HasTile(new Vector3Int(x, y, 0)))
                    {
                        data.xs.Add(x);
                        data.ys.Add(y);
                    }
                }
            }
            string json = JsonUtility.ToJson(data);
            PlayerPrefs.SetString("world", json);
            Debug.Log("已存檔：" + json);
        }

        void Load()
        {
            if (!PlayerPrefs.HasKey("world")) return;

            SaveData data = JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString("world"));
            for (int i = 0; i < data.xs.Count; i++)
            {
                ground.SetTile(new Vector3Int(data.xs[i], data.ys[i], 0), blockTile);
            }
            Debug.Log($"讀檔完成，放回 {data.xs.Count} 個方塊");
        }
    }
  `;
  const restartHidden = cs`
    public class RestartKey : MonoBehaviour
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
  L.push({
    id: '12-6', world: 12, title: '存檔讀檔', file: 'SaveSystem.cs',
    concept: '要存的東西先裝進一個加了 <code>[System.Serializable]</code> 的類別，用 <code>JsonUtility.ToJson</code> 變成一段文字（JSON），再用 <code>PlayerPrefs.SetString</code> 存起來。讀檔時反過來：<code>GetString</code> 拿回文字，<code>JsonUtility.FromJson&lt;SaveData&gt;</code> 變回物件。PlayerPrefs 關掉遊戲也還在。',
    goal: '蓋 3 個方塊後按 S 存檔，按 R 重新載入場景（方塊消失），再按 L 讀檔，方塊要回來。',
    hidden: sol122 + restartHidden,
    inspectorFor: 'SaveSystem',
    scene: sandScene({
      tiles: sandTiles('B').map((r, i) => (i === 0 ? 'BSG.............' : r)),
      entities: { B: T.ctrl('BlockPlacer', 'Builder'), S: T.ctrl('SaveSystem', 'SaveSystem'), G: T.ctrl('RestartKey') },
      inspector: { Builder: { ground: { tilemap: 'Ground' }, blockTile: { tile: 'Stone' } }, SaveSystem: { ground: { tilemap: 'Ground' }, blockTile: { tile: 'Stone' } } },
      mouse: clicks([[3.5, 4.5, 'left'], [5.5, 5.5, 'left'], [8.5, 4.5, 'left']]),
      input: [[1.3, 1.38, 's'], [1.6, 1.68, 'r'], [1.9, 1.98, 'l']], duration: 2.3
    }),
    mouseLevel: true,
    keys: ['s', 'l', 'r'],
    starter: rep(sol126, '        PlayerPrefs.SetString("world", json);\n', '        // 把 json 存進 PlayerPrefs\n'),
    solution: sol126,
    check: (W) => {
      if (W.stats.reloads < 1) return { ok: false, msg: '場景沒有重新載入' };
      const ok = [[3, 4], [5, 5], [8, 4]].every(([x, y]) => kindAt(W, 'Ground', x, y));
      return res(ok, '重新載入後按 L，方塊沒有回來');
    },
    choices: [
      { code: sol126, expect: 'win', explain: 'JSON 存進 PlayerPrefs，重新載入後再讀回來。' },
      { code: rep(sol126, '        PlayerPrefs.SetString("world", json);\n', ''), expect: 'fail', explain: '只做出 JSON 文字，沒有存進 PlayerPrefs，讀檔時什麼都找不到。' },
      { code: rep(sol126, 'JsonUtility.FromJson<SaveData>(', 'JsonUtility.FromJson('), expect: 'compile:CS0411', explain: 'FromJson 不知道要變回哪個類別，要寫成 FromJson<SaveData>(...)。' },
      { code: rep(sol126, 'if (!PlayerPrefs.HasKey("world")) return;', 'if (!PlayerPrefs.HasKey("World")) return;'), expect: 'fail', explain: '存的時候叫 "world"，讀的時候找 "World"，key 大小寫不一樣就找不到。' }
    ],
    hints: ['Save() 做出 json 之後，還沒有真的存起來。', '用 PlayerPrefs.SetString("world", json) 存。', 'PlayerPrefs.SetString("world", json);']
  });

  /* =========================================================
   * W13 太空射擊
   * ========================================================= */
  const spaceTiles = (rows) => {
    const base = [];
    for (let r = 0; r < 10; r++) base.push('............');
    for (const [r, c, ch] of rows) base[r] = base[r].slice(0, c) + ch + base[r].slice(c + 1);
    return base;
  };
  const shipTpl = (scripts) => ({ name: 'Ship', tag: 'Player', sprite: 'ship', w: 0.8, h: 0.8, collider: false, scripts });
  const ufoTpl = (scripts) => ({ name: 'Enemy', tag: 'Enemy', sprite: 'ufo', w: 0.8, h: 0.6, trigger: true, rb: 'kinematic', scripts: scripts || [] });
  const laserHidden = cs`
    public class Laser : MonoBehaviour
    {
        [SerializeField] private float speed = 14f;
        void Update()
        {
            transform.position += new Vector3(0f, speed * Time.deltaTime, 0f);
            // 飛出畫面就關掉，等之後重複使用（不是 Destroy）
            if (transform.position.y > 11f) gameObject.SetActive(false);
        }
    }
  `;
  const laserPrefab = (script) => ({ name: 'Bullet', tag: 'Bullet', sprite: 'laser', w: 0.2, h: 0.5, size: 0.5, trigger: true, rb: 'kinematic', scripts: [script] });

  const sol131 = cs`
    using System.Collections.Generic;
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class BulletPool : MonoBehaviour
    {
        [SerializeField] private GameObject bulletPrefab;
        [SerializeField] private int poolSize = 8;
        [SerializeField] private float fireRate = 0.1f;

        private Queue<GameObject> pool = new Queue<GameObject>();
        private float nextFire;

        void Start()
        {
            // 遊戲一開始先做好一批子彈，全部關掉放進池子
            for (int i = 0; i < poolSize; i++)
            {
                GameObject b = Instantiate(bulletPrefab);
                b.SetActive(false);
                pool.Enqueue(b);
            }
        }

        void Update()
        {
            if (Keyboard.current.spaceKey.isPressed && Time.time >= nextFire)
            {
                nextFire = Time.time + fireRate;
                GameObject b = pool.Dequeue();          // 拿出排最前面的那顆
                b.transform.position = transform.position + new Vector3(0f, 0.6f, 0f);
                b.SetActive(true);
                pool.Enqueue(b);                        // 放回隊伍最後面，之後重複使用
            }
        }
    }
  `;
  const poolFire = cs`
                GameObject b = pool.Dequeue();          // 拿出排最前面的那顆
                b.transform.position = transform.position + new Vector3(0f, 0.6f, 0f);
                b.SetActive(true);
                pool.Enqueue(b);                        // 放回隊伍最後面，之後重複使用
  `.replace(/^(?=.)/gm, '            ').replace(/\s+$/, '\n');
  L.push({
    id: '13-1', world: 13, title: '物件池', file: 'BulletPool.cs',
    concept: '射擊遊戲一秒射十幾發，一直 Instantiate 和 Destroy 會讓遊戲卡頓。<b>物件池（Object Pool）</b>的做法是先做好一批子彈關起來，要射時拿一顆出來 <code>SetActive(true)</code>，飛出畫面就 <code>SetActive(false)</code> 收回去，重複使用。這裡用 <code>Queue</code>（排隊）來輪流取用。Unity 也內建 <code>ObjectPool&lt;T&gt;</code>，寫法見手冊。',
    goal: '按住空白鍵連射 3 秒，射出 25 發以上，但子彈物件總共不能超過 8 個。',
    hidden: laserHidden,
    scene: {
      tiles: spaceTiles([[8, 5, 'S']]), entities: { S: shipTpl(['BulletPool']) },
      prefabs: { Bullet: laserPrefab('Laser') }, inspector: { Ship: { bulletPrefab: { prefab: 'Bullet' } } },
      bg: 'space', showCount: true, duration: 3.3, input: [[0.2, 3.2, 'space']]
    },
    inspectorFor: 'Ship',
    keys: ['space'],
    starter: rep(sol131, poolFire, '            // 現在每次都做一顆新的子彈，物件越來越多\n            Instantiate(bulletPrefab, transform.position + new Vector3(0f, 0.6f, 0f), Quaternion.identity);\n'),
    solution: sol131,
    check: (W) => {
      if (W.stats.spawned > 8) return { ok: false, msg: `一共做了 ${W.stats.spawned} 顆子彈物件，池子只有 8 顆` };
      return res(W.stats.activations >= 25, `只射出了 ${W.stats.activations} 發`);
    },
    choices: [
      { code: sol131, expect: 'win', explain: '8 顆子彈輪流使用。' },
      { code: rep(sol131, poolFire, '            Instantiate(bulletPrefab, transform.position + new Vector3(0f, 0.6f, 0f), Quaternion.identity);\n'), expect: 'fail', explain: '每次都 Instantiate，物件數量一直增加，池子形同虛設。' },
      { code: rep(sol131, '            pool.Enqueue(b);                        // 放回隊伍最後面，之後重複使用\n', ''), expect: 'runtime:InvalidOperationException', explain: '拿出來沒有放回去，射 8 發之後池子空了，Dequeue 出錯。' },
      { code: rep(sol131, '            b.SetActive(true);\n', ''), expect: 'fail', explain: '子彈從池子拿出來但沒有啟用，畫面上看不到，也打不到東西。' }
    ],
    hints: ['不要 Instantiate，從 pool 拿一顆出來。', 'Dequeue 拿出來 → 設定位置 → SetActive(true) → Enqueue 放回去。', poolFire.trim()]
  });

  const sol132 = cs`
    using System.Collections;
    using UnityEngine;

    public class WaveSpawner : MonoBehaviour
    {
        [SerializeField] private GameObject enemyPrefab;
        [SerializeField] private int waveCount = 3;
        [SerializeField] private float waveDelay = 1.5f;

        void Start()
        {
            StartCoroutine(SpawnWaves());
        }

        IEnumerator SpawnWaves()
        {
            for (int wave = 1; wave <= waveCount; wave++)
            {
                Debug.Log($"第 {wave} 波");
                for (int i = 0; i < wave * 2; i++)   // 每一波敵人越來越多：2、4、6
                {
                    float x = Random.Range(1f, 11f);
                    Instantiate(enemyPrefab, new Vector3(x, 9.5f, 0f), Quaternion.identity);
                    yield return new WaitForSeconds(0.3f);   // 同一波的敵人間隔 0.3 秒
                }
                yield return new WaitForSeconds(waveDelay);  // 波與波之間休息一下
            }
            Debug.Log("全部的波次結束");
        }
    }
  `;
  const drifter = cs`
    public class Drifter : MonoBehaviour
    {
        void Update()
        {
            transform.position += new Vector3(0f, -1.5f * Time.deltaTime, 0f);
            if (transform.position.y < -1f) Destroy(gameObject);
        }
    }
  `;
  const innerYield = '                yield return new WaitForSeconds(0.3f);   // 同一波的敵人間隔 0.3 秒\n';
  L.push({
    id: '13-2', world: 13, title: '敵人波次', file: 'WaveSpawner.cs',
    concept: '射擊遊戲的敵人一波一波出現，最適合用<b>協程</b>：外層迴圈跑每一波，內層迴圈生出這一波的敵人，每生一隻就 <code>yield return new WaitForSeconds(...)</code> 等一下，波與波之間再休息久一點。用迴圈變數讓每一波越來越多隻。',
    goal: '3 波敵人，數量 2、4、6 隻，同一波的敵人要間隔 0.3 秒出現。',
    hidden: drifter,
    inspectorFor: 'Spawner',
    scene: {
      tiles: spaceTiles([[0, 0, 'W'], [8, 5, 'S']]), entities: { W: T.ctrl('WaveSpawner', 'Spawner'), S: shipTpl([]) },
      prefabs: { Enemy: ufoTpl(['Drifter']) }, inspector: { Spawner: { enemyPrefab: { prefab: 'Enemy' } } },
      bg: 'space', duration: 7
    },
    starter: rep(sol132, innerYield, ''),
    solution: sol132,
    check: (W) => {
      const ts = W.stats.spawnTimes;
      if (ts.length !== 12) return { ok: false, msg: `一共生了 ${ts.length} 隻敵人，應該是 2 + 4 + 6 = 12 隻` };
      const minGap = Math.min(...ts.slice(1).map((t, i) => t - ts[i]));
      if (minGap < 0.25) return { ok: false, msg: '同一波的敵人同時擠在一起出現了' };
      const waves = W.logs.filter((l) => l.text.startsWith('第 ') && l.text.endsWith('波'));
      return res(waves.length === 3 && waves[2].t > 4, '波次的訊息或間隔不對');
    },
    choices: [
      { code: sol132, expect: 'win', explain: '兩層迴圈加上兩種等待。' },
      { code: rep(sol132, innerYield, ''), expect: 'fail', explain: '內層迴圈沒有等待，同一波的敵人在同一幀全部出現。' },
      { code: rep(sol132, 'i < wave * 2', 'i < 2'), expect: 'fail', explain: '每一波都只有 2 隻，沒有越來越多。' },
      { code: rep(sol132, 'StartCoroutine(SpawnWaves());', 'SpawnWaves();'), expect: 'fail', explain: '協程要用 StartCoroutine 啟動，直接呼叫什麼都不會發生。' }
    ],
    hints: ['生一隻敵人之後要等一下。', '在 Instantiate 下一行加 yield return new WaitForSeconds(0.3f);', sol132]
  });

  const sol133 = cs`
    using UnityEngine;

    public class ZigZag : MonoBehaviour
    {
        [SerializeField] private float speed = 1.5f;
        [SerializeField] private float amplitude = 2f;
        [SerializeField] private float frequency = 3f;
        private float startX;

        void Start()
        {
            startX = transform.position.x;
        }

        void Update()
        {
            float y = transform.position.y - speed * Time.deltaTime;
            // Sin 會在 -1 到 1 之間來回，乘上 amplitude 就是左右擺動的幅度
            float x = startX + Mathf.Sin(Time.time * frequency) * amplitude;
            transform.position = new Vector3(x, y, 0f);
        }
    }
  `;
  const zigLine = '        float x = startX + Mathf.Sin(Time.time * frequency) * amplitude;';
  L.push({
    id: '13-3', world: 13, title: 'S 形飛行', file: 'ZigZag.cs',
    concept: '<code>Mathf.Sin</code> 的值會在 -1 到 1 之間平滑地來回擺盪，是做「搖擺、漂浮、繞圈」的萬用工具。<code>Sin(Time.time * 頻率) * 幅度</code>：頻率越大擺得越快，幅度決定擺多寬。加上出發時的 x，敵人就會以出發點為中心左右擺動。',
    goal: '敵人往下飛的同時，以出發點 x = 6 為中心，左右各擺 2 格（4 到 8 之間）。',
    scene: {
      tiles: spaceTiles([[1, 6, 'E'], [8, 5, 'S']]), entities: { E: ufoTpl(['ZigZag']), S: shipTpl([]) },
      bg: 'space', duration: 3, trackTag: 'Enemy'
    },
    inspectorFor: 'Enemy',
    starter: rep(sol133, zigLine, '        float x = startX;   // 用 Mathf.Sin 讓 x 左右擺動'),
    solution: sol133,
    check: (W) => {
      const xs = W.stats.tagPath.map((p) => p[1]);
      const ys = W.stats.tagPath.map((p) => p[2]);
      const lo = Math.min(...xs), hi = Math.max(...xs);
      if (ys[0] - ys[ys.length - 1] < 3) return { ok: false, msg: '敵人沒有往下飛' };
      return res(Math.abs(lo - 4.5) < 0.2 && Math.abs(hi - 8.5) < 0.2, `敵人在 x = ${(lo - 0.5).toFixed(1)} 到 ${(hi - 0.5).toFixed(1)} 之間擺動，應該是 4 到 8`);
    },
    choices: [
      { code: sol133, expect: 'win', explain: '以 startX 為中心，左右各 amplitude 格。' },
      { code: rep(sol133, zigLine, '        float x = Mathf.Sin(Time.time * frequency) * amplitude;'), expect: 'fail', explain: '忘了加 startX，敵人跑到畫面最左邊、以 x = 0 為中心擺動。' },
      { code: rep(sol133, zigLine, '        float x = startX + Mathf.Sin(Time.time * frequency);'), expect: 'fail', explain: '忘了乘幅度，只左右擺 1 格。' },
      { code: rep(sol133, 'Mathf.Sin', 'Mathf.sin'), expect: 'compile:CS0117', explain: 'Mathf 的方法都是大寫開頭：Sin。' }
    ],
    hints: ['x = 出發點 + 擺動量。', '擺動量是 Mathf.Sin(Time.time * frequency) * amplitude。', zigLine.trim()]
  });

  const sol134 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public enum FireMode { Single, Spread }

    public class Ship : MonoBehaviour
    {
        [SerializeField] private GameObject bulletPrefab;
        private FireMode mode = FireMode.Single;

        void Update()
        {
            var kb = Keyboard.current;
            if (kb.qKey.wasPressedThisFrame)
            {
                mode = mode == FireMode.Single ? FireMode.Spread : FireMode.Single;
                Debug.Log($"切換成 {mode}");
            }

            if (kb.spaceKey.wasPressedThisFrame) Fire();
        }

        void Fire()
        {
            switch (mode)
            {
                case FireMode.Single:
                    Shoot(Vector2.up);
                    break;
                case FireMode.Spread:
                    Shoot(new Vector2(-0.4f, 1f));
                    Shoot(Vector2.up);
                    Shoot(new Vector2(0.4f, 1f));
                    break;
            }
        }

        void Shoot(Vector2 dir)
        {
            GameObject b = Instantiate(bulletPrefab, transform.position, Quaternion.identity);
            b.GetComponent<Shot>().SetDirection(dir.normalized);
        }
    }
  `;
  const shotHidden = cs`
    public class Shot : MonoBehaviour
    {
        private Vector2 direction = Vector2.up;
        public void SetDirection(Vector2 dir) { direction = dir; }
        void Update()
        {
            transform.position += new Vector3(direction.x, direction.y, 0f) * 12f * Time.deltaTime;
            if (transform.position.y > 11f) Destroy(gameObject);
        }
    }
  `;
  const spreadCase = '            case FireMode.Spread:\n                Shoot(new Vector2(-0.4f, 1f));\n                Shoot(Vector2.up);\n                Shoot(new Vector2(0.4f, 1f));\n                break;\n';
  L.push({
    id: '13-4', world: 13, title: '射擊模式', file: 'Ship.cs',
    concept: '<b>enum（列舉）</b>用來定義「幾種固定的選項」，例如 <code>enum FireMode { Single, Spread }</code>。比起用 0、1 這種數字，名字一看就懂，也不會打錯。搭配 <code>switch</code>，每種模式各寫一段程式。Debug.Log 會直接印出成員的名字。',
    goal: '按空白鍵射一發；按 Q 切換成散射模式後，按空白鍵一次射三發。',
    hidden: shotHidden,
    inspectorFor: 'Ship',
    scene: {
      tiles: spaceTiles([[8, 5, 'S']]), entities: { S: shipTpl(['Ship']) },
      prefabs: { Bullet: laserPrefab('Shot') }, inspector: { Ship: { bulletPrefab: { prefab: 'Bullet' } } },
      bg: 'space', duration: 1.6, input: [[0.3, 0.38, 'space'], [0.6, 0.68, 'q'], [0.9, 0.98, 'space']]
    },
    keys: ['space', 'q'],
    starter: rep(sol134, spreadCase, '            // 還要處理 FireMode.Spread：一次射出三發\n'),
    solution: sol134,
    check: (W) => {
      const late = W.stats.spawnTimes.filter((t) => t > 0.8).length;
      if (W.stats.spawned !== 4) return { ok: false, msg: `一共射了 ${W.stats.spawned} 發，應該是 1 + 3 = 4 發` };
      return res(late === 3 && logs(W).some((l) => l.includes('Spread')), '切換成散射後沒有一次射三發');
    },
    choices: [
      { code: sol134, expect: 'win', explain: 'enum 加 switch，每種模式各一段。' },
      { code: rep(sol134, '            mode = mode == FireMode.Single ? FireMode.Spread : FireMode.Single;', '            if (mode == FireMode.Single) mode = FireMode.Spread;\n            if (mode == FireMode.Spread) mode = FireMode.Single;'), expect: 'fail', explain: '兩個 if 會連續執行：剛切成 Spread，下一行又切回 Single。' },
      { code: rep(sol134, '                Shoot(Vector2.up);\n                break;\n            case FireMode.Spread:', '                Shoot(Vector2.up);\n            case FireMode.Spread:'), expect: 'compile:CS0163', explain: 'C# 的 case 結尾一定要 break，不能直接掉到下一個 case。' },
      { code: rep(sol134, 'case FireMode.Spread:', 'case Spread:'), expect: 'compile:CS0103', explain: 'enum 的成員要寫完整名稱：FireMode.Spread。' }
    ],
    hints: ['switch 裡少了 Spread 的 case。', '散射就是用三個方向各呼叫一次 Shoot。', spreadCase.trim()]
  });

  const sol135 = cs`
    using UnityEngine;
    using TMPro;

    public class ScoreKeeper : MonoBehaviour
    {
        [SerializeField] private TMP_Text bestText;

        void Start()
        {
            // 遊戲一開始，先顯示之前存下來的最高分
            bestText.text = $"Best: {PlayerPrefs.GetInt("best", 0)}";
        }

        // 每一局結束時呼叫
        public void EndRound(int score)
        {
            int best = PlayerPrefs.GetInt("best", 0);
            best = Mathf.Max(best, score);
            PlayerPrefs.SetInt("best", best);
            bestText.text = $"Best: {best}";
        }
    }
  `;
  const roundHidden = cs`
    public class RoundRunner : MonoBehaviour
    {
        private int[] scores = { 120, 80, 90 };
        private int next;
        private float timer;
        void Update()
        {
            timer += Time.deltaTime;
            if (next < scores.Length && timer >= 0.5f * (next + 1))
            {
                Debug.Log($"第 {next + 1} 局結束：{scores[next]} 分");
                GetComponent<ScoreKeeper>().EndRound(scores[next]);
                next++;
            }
        }
    }
  `;
  const bestLines = '        int best = PlayerPrefs.GetInt("best", 0);\n        best = Mathf.Max(best, score);\n        PlayerPrefs.SetInt("best", best);\n        bestText.text = $"Best: {best}";\n';
  L.push({
    id: '13-5', world: 13, title: '最高分', file: 'ScoreKeeper.cs',
    concept: '<code>PlayerPrefs</code> 可以把簡單的資料（int、float、string）存在玩家的電腦裡，關掉遊戲也不會消失，很適合存最高分和音量設定。<code>GetInt("best", 0)</code> 的第二個參數是「找不到時的預設值」。最高分只能變高不能變低，用 <code>Mathf.Max</code> 取兩者中比較大的。',
    goal: '之前存的最高分是 100。接下來三局得到 120、80、90 分，最後最高分要是 120。',
    hidden: roundHidden,
    inspectorFor: 'ScoreKeeper',
    scene: {
      tiles: spaceTiles([[0, 0, 'K'], [8, 5, 'S']]), entities: { K: { name: 'ScoreKeeper', collider: false, scripts: ['ScoreKeeper', 'RoundRunner'] }, S: shipTpl([]) },
      ui: { bestText: '' }, inspector: { ScoreKeeper: { bestText: { ui: 'bestText' } } },
      prefs: { best: { t: 'int', v: 100 } }, bg: 'space', duration: 2
    },
    starter: rep(sol135, bestLines, '        // 現在每一局都直接蓋掉最高分\n        PlayerPrefs.SetInt("best", score);\n        bestText.text = $"Best: {score}";\n'),
    solution: sol135,
    check: (W) => {
      const best = W.prefs.best ? W.prefs.best.v : 0;
      if (best !== 120) return { ok: false, msg: `PlayerPrefs 裡的最高分是 ${best}，應該是 120` };
      return res(W.ui.bestText && W.ui.bestText.text === 'Best: 120', `畫面顯示「${W.ui.bestText ? W.ui.bestText.text : ''}」`);
    },
    choices: [
      { code: sol135, expect: 'win', explain: '每局都和舊的最高分比較，取大的存回去。' },
      { code: rep(sol135, bestLines, '        PlayerPrefs.SetInt("best", score);\n        bestText.text = $"Best: {score}";\n'), expect: 'fail', explain: '每局都直接覆蓋，最後一局 90 分把 120 蓋掉了。' },
      { code: rep(sol135, 'int best = PlayerPrefs.GetInt("best", 0);', 'int best = PlayerPrefs.GetString("best");'), expect: 'compile:CS0029', explain: 'GetString 拿到的是文字，不能放進 int。存 int 就要用 GetInt。' },
      { code: rep(sol135, 'Mathf.Max(best, score)', 'Mathf.Min(best, score)'), expect: 'fail', explain: 'Min 取的是比較小的，最高分反而越來越低。' }
    ],
    hints: ['先用 GetInt 讀出舊的最高分。', 'best = Mathf.Max(best, score); 再用 SetInt 存回去。', bestLines.trim()]
  });

  /* =========================================================
   * W14 塔防前線
   * ========================================================= */
  // 路徑：從左邊 (0, 6) → (4, 6) → (4, 2) → (10, 2) → (10, 6) → (15, 6)
  const PATH_RECTS = [['Path', 'Path', 0, 6, 4, 6], ['Path', 'Path', 4, 2, 4, 6], ['Path', 'Path', 4, 2, 10, 2], ['Path', 'Path', 10, 2, 10, 6], ['Path', 'Path', 10, 6, 15, 6]];
  const WP_NAMES = ['W1', 'W2', 'W3', 'W4', 'W5'];
  const tdTiles = (extra) => {
    const rows = [];
    for (let r = 0; r < 9; r++) rows.push('................');
    const put = (x, y, ch) => { const r = 8 - y; rows[r] = rows[r].slice(0, x) + ch + rows[r].slice(x + 1); };
    put(4, 6, '1'); put(4, 2, '2'); put(10, 2, '3'); put(10, 6, '4'); put(14, 6, '5'); put(15, 6, 'C');
    for (const [x, y, ch] of extra || []) put(x, y, ch);
    return rows;
  };
  const wp = (n) => ({ name: n, collider: false });
  const TD_ENTS = { 1: wp('W1'), 2: wp('W2'), 3: wp('W3'), 4: wp('W4'), 5: wp('W5'), C: { name: 'Base', sprite: 'castle', collider: false, scripts: ['BaseHealth'] } };
  const enemyTpl = (scripts, name) => ({ name: name || 'Enemy', tag: 'Enemy', layer: 'Enemy', sprite: 'slime', w: 0.8, h: 0.7, size: 0.9, trigger: true, scripts: scripts || [] });
  const towerTpl = (scripts) => ({ name: 'Tower', sprite: 'tower', w: 0.8, h: 0.8, scripts: scripts || [] });
  const baseHidden = cs`
    public class BaseHealth : MonoBehaviour
    {
        [SerializeField] private int hp = 10;
        public void TakeDamage(int amount)
        {
            hp -= amount;
            Debug.Log($"基地受到攻擊！剩下 {hp}");
        }
    }
  `;

  const sol141 = cs`
    using UnityEngine;

    public class EnemyPath : MonoBehaviour
    {
        [SerializeField] private Transform[] waypoints;
        [SerializeField] private float speed = 4f;
        private int index = 0;

        void Update()
        {
            if (index >= waypoints.Length) return;   // 已經走到終點

            Vector3 target = waypoints[index].position;
            transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);

            // 到了這個路徑點，就換下一個
            if (Vector3.Distance(transform.position, target) < 0.05f)
            {
                index++;
            }
        }
    }
  `;
  const nextWp = '        if (Vector3.Distance(transform.position, target) < 0.05f)\n        {\n            index++;\n        }\n';
  L.push({
    id: '14-1', world: 14, title: '沿著路徑走', file: 'EnemyPath.cs',
    concept: '塔防的敵人沿著固定路線前進。在路線的轉角放幾個空物件當<b>路徑點（waypoint）</b>，在 Inspector 依序拖進 <code>Transform[] waypoints</code>。敵人每一幀用 <code>Vector3.MoveTowards</code> 往目前的路徑點靠近，距離夠近就換下一個。',
    goal: '讓史萊姆依序經過 5 個路徑點，停在城堡前面。',
    hidden: baseHidden,
    inspectorFor: 'Enemy',
    scene: {
      tiles: tdTiles([[0, 6, 'E']]), rects: PATH_RECTS,
      entities: Object.assign({ E: enemyTpl(['EnemyPath']) }, TD_ENTS),
      inspector: { Enemy: { waypoints: { refs: WP_NAMES } } }, duration: 6.4, trackTag: 'Enemy', grid: true
    },
    starter: rep(sol141, nextWp, '        // 到了這個路徑點之後，要換下一個\n'),
    solution: sol141,
    check: (W) => {
      const path = W.stats.tagPath;
      const pts = [[4.5, 6.5], [4.5, 2.5], [10.5, 2.5], [10.5, 6.5], [14.5, 6.5]];
      let k = 0;
      for (const p of path) if (k < pts.length && Math.hypot(p[1] - pts[k][0], p[2] - pts[k][1]) < 0.1) k++;
      return res(k === pts.length, k === 0 ? '史萊姆沒有走到第一個路徑點' : `史萊姆只走到第 ${k} 個路徑點`);
    },
    choices: [
      { code: sol141, expect: 'win', explain: '到了才換下一個點。' },
      { code: rep(sol141, nextWp, '        index++;\n'), expect: 'fail', explain: '每一幀都換下一個點，還沒走到就跳過了，5 幀之後就停下來。' },
      { code: rep(sol141, 'index >= waypoints.Length', 'index >= waypoints.Count'), expect: 'compile:CS1061', explain: '陣列的長度是 Length，List 才用 Count。' },
      { code: rep(sol141, 'index >= waypoints.Length', 'index > waypoints.Length'), expect: 'runtime:IndexOutOfRangeException', explain: '走到最後時 index 等於 Length，用 > 判斷會再讀一次 waypoints[5]，超出範圍。' }
    ],
    hints: ['走到目前的路徑點後，index 要加 1。', '用 Vector3.Distance 判斷距離小於 0.05 就 index++。', nextWp.trim()]
  });

  const sol142 = cs`
    using UnityEngine;

    public class EnemyPath : MonoBehaviour
    {
        [SerializeField] private Transform[] waypoints;
        [SerializeField] private float speed = 4f;
        [SerializeField] private BaseHealth baseHealth;
        private int index = 0;

        void Update()
        {
            if (index >= waypoints.Length)
            {
                // 走到終點：扣基地的血，然後刪掉自己
                baseHealth.TakeDamage(1);
                Destroy(gameObject);
                return;
            }

            Vector3 target = waypoints[index].position;
            transform.position = Vector3.MoveTowards(transform.position, target, speed * Time.deltaTime);
            if (Vector3.Distance(transform.position, target) < 0.05f)
            {
                index++;
            }
        }
    }
  `;
  const spawnerHidden = (count, gapSec) => cs`
    public class EnemySpawner : MonoBehaviour
    {
        [SerializeField] private GameObject enemyPrefab;
        private float timer;
        private int spawned;
        void Update()
        {
            timer += Time.deltaTime;
            if (spawned < ${count} && timer >= 0.2f + spawned * ${gapSec}f)
            {
                Instantiate(enemyPrefab, new Vector3(0.5f, 6.5f, 0f), Quaternion.identity);
                spawned++;
            }
        }
    }
  `;
  const reachEnd = '            // 走到終點：扣基地的血，然後刪掉自己\n            baseHealth.TakeDamage(1);\n            Destroy(gameObject);\n            return;\n';
  L.push({
    id: '14-2', world: 14, title: '到終點扣血', file: 'EnemyPath.cs',
    concept: '敵人走到終點時要做兩件事：扣基地的血，然後<b>把自己刪掉</b>。基地的腳本在 Inspector 拖給敵人（<code>[SerializeField] private BaseHealth baseHealth</code>）。沒刪掉的話，敵人會停在終點，每一幀都再扣一次血。',
    goal: '3 隻史萊姆走到城堡後要消失，城堡的血量從 10 變成 7。',
    hidden: baseHidden + spawnerHidden(3, 1),
    inspectorFor: 'Base',
    scene: {
      tiles: tdTiles([[0, 8, 'P']]), rects: PATH_RECTS,
      entities: Object.assign({ P: T.ctrl('EnemySpawner', 'Spawner') }, TD_ENTS),
      prefabs: { Enemy: enemyTpl(['EnemyPath']) },
      inspector: { Spawner: { enemyPrefab: { prefab: 'Enemy' } }, Enemy: { waypoints: { refs: WP_NAMES }, baseHealth: { ref: 'Base' }, speed: 6 } },
      duration: 6.5, grid: true
    },
    starter: rep(sol142, reachEnd, '            // 走到終點了，要扣基地的血並刪掉自己\n            return;\n'),
    solution: sol142,
    check: (W) => {
      const hp = field(W, 'Base', 'hp');
      if (ents(W, (e) => e.tag === 'Enemy').length) return { ok: false, msg: '史萊姆走到終點後沒有消失' };
      return res(hp === 7, `城堡的血量是 ${hp}，應該是 7`);
    },
    choices: [
      { code: sol142, expect: 'win', explain: '扣一次血就把自己刪掉。' },
      { code: rep(sol142, '            Destroy(gameObject);\n', ''), expect: 'fail', explain: '沒有刪掉自己，史萊姆停在終點，每一幀都扣一次血。' },
      { code: rep(sol142, 'Destroy(gameObject);', 'Destroy(this);'), expect: 'fail', explain: 'Destroy(this) 只刪掉腳本，史萊姆本身還留在畫面上。' },
      { code: rep(sol142, 'baseHealth.TakeDamage(1);', 'baseHealth.hp -= 1;'), expect: 'compile:CS0122', explain: 'hp 是 BaseHealth 的 private 欄位，別的腳本不能直接改，要透過 TakeDamage。' }
    ],
    hints: ['走到終點時呼叫 baseHealth.TakeDamage(1)。', '扣完血要 Destroy(gameObject)，再 return。', reachEnd.trim()]
  });

  const sol143 = cs`
    using UnityEngine;

    public class TowerAim : MonoBehaviour
    {
        [SerializeField] private float range = 4f;
        [SerializeField] private LayerMask enemyLayer;
        public Transform target;

        void Update()
        {
            target = FindNearest();
            if (target != null)
            {
                Debug.DrawLine(transform.position, target.position, Color.red);
            }
        }

        Transform FindNearest()
        {
            // 找出範圍內所有的敵人
            Collider2D[] hits = Physics2D.OverlapCircleAll(transform.position, range, enemyLayer);
            Transform nearest = null;
            float bestDistance = Mathf.Infinity;
            foreach (Collider2D hit in hits)
            {
                float d = Vector2.Distance(transform.position, hit.transform.position);
                if (d < bestDistance)
                {
                    bestDistance = d;
                    nearest = hit.transform;
                }
            }
            return nearest;
        }
    }
  `;
  const nearestLoop = cs`
            Transform nearest = null;
            float bestDistance = Mathf.Infinity;
            foreach (Collider2D hit in hits)
            {
                float d = Vector2.Distance(transform.position, hit.transform.position);
                if (d < bestDistance)
                {
                    bestDistance = d;
                    nearest = hit.transform;
                }
            }
            return nearest;
  `.replace(/^(?=.)/gm, '        ').replace(/\s+$/, '\n');
  const aimEnts = { a: enemyTpl([], 'Enemy1'), b: enemyTpl([], 'Enemy2'), c: enemyTpl([], 'Enemy3'), d: enemyTpl([], 'Enemy4'), T: towerTpl(['TowerAim']) };
  L.push({
    id: '14-3', world: 14, title: '找最近的敵人', file: 'TowerAim.cs',
    concept: '<code>Physics2D.OverlapCircleAll(位置, 半徑, 圖層)</code> 會回傳圓圈範圍內<b>所有</b>碰撞框（陣列）。用「目前最近距離」的變數，從無限大（<code>Mathf.Infinity</code>）開始，一個一個比，比較近就記下來，最後剩下的就是最近的敵人。<code>Debug.DrawLine</code> 可以把瞄準線畫出來，方便除錯。',
    goal: '塔要瞄準射程（4 格）內最近的敵人。兩種擺法都要對。',
    inspectorFor: 'Tower',
    variants: [
      {
        tiles: tdTiles([[6, 7, 'a'], [9, 5, 'b'], [4, 2, 'c'], [13, 6, 'd'], [7, 4, 'T']]), rects: PATH_RECTS,
        entities: Object.assign({}, TD_ENTS, aimEnts), inspector: { Tower: { enemyLayer: { layer: 'Enemy' } } }, duration: 0.5, grid: true, want: 'Enemy2', label: '測試 1'
      },
      {
        tiles: tdTiles([[6, 7, 'a'], [12, 5, 'b'], [6, 3, 'c'], [13, 6, 'd'], [7, 4, 'T']]), rects: PATH_RECTS,
        entities: Object.assign({}, TD_ENTS, aimEnts), inspector: { Tower: { enemyLayer: { layer: 'Enemy' } } }, duration: 0.5, grid: true, want: 'Enemy3', label: '測試 2'
      }
    ],
    starter: rep(sol143, nearestLoop, '        if (hits.Length == 0) return null;\n        // 現在直接拿第一個，但第一個不一定是最近的\n        return hits[0].transform;\n'),
    solution: sol143,
    check: (W, ws, vi) => {
      const want = vi === 0 ? 'Enemy2' : 'Enemy3';
      const t = field(W, 'Tower', 'target');
      const got = t && t.ent ? t.ent.name : '沒有目標';
      if (got !== want) return { ok: false, msg: `測試 ${vi + 1}：塔瞄準了 ${got}，最近的是 ${want}` };
      return res(W.stats.lines > 0, '沒有畫出瞄準線');
    },
    choices: [
      { code: sol143, expect: 'win', explain: '從無限大開始比，留下最小的距離。' },
      { code: rep(sol143, nearestLoop, '        if (hits.Length == 0) return null;\n        return hits[0].transform;\n'), expect: 'fail', explain: '直接拿第一個，陣列的順序和距離無關。' },
      { code: rep(sol143, 'Physics2D.OverlapCircleAll(transform.position, range, enemyLayer)', 'Physics2D.OverlapCircleAll(transform.position, range)'), expect: 'fail', explain: '沒有指定敵人圖層，連塔自己的碰撞框也算進去，距離 0，塔瞄準了自己。' },
      { code: rep(sol143, 'Collider2D[] hits = ', 'Collider2D hits = '), expect: 'compile:CS0029', explain: 'OverlapCircleAll 回傳的是陣列 Collider2D[]，少了 []。' }
    ],
    hints: ['不能直接拿 hits[0]，要比較每一個的距離。', '用 bestDistance 記住目前最近的距離，從 Mathf.Infinity 開始。', nearestLoop.trim()]
  });

  const towerFind = cs`
    Transform FindNearest()
    {
        Collider2D[] hits = Physics2D.OverlapCircleAll(transform.position, range, enemyLayer);
        Transform nearest = null;
        float bestDistance = Mathf.Infinity;
        foreach (Collider2D hit in hits)
        {
            float d = Vector2.Distance(transform.position, hit.transform.position);
            if (d < bestDistance) { bestDistance = d; nearest = hit.transform; }
        }
        return nearest;
    }
  `.replace(/^(?=.)/gm, '    ').replace(/\s+$/, '\n');
  const sol144 = cs`
    using UnityEngine;

    public class TowerShooter : MonoBehaviour
    {
        [SerializeField] private float range = 4f;
        [SerializeField] private LayerMask enemyLayer;
        [SerializeField] private float fireRate = 0.5f;
        [SerializeField] private int damage = 1;
        private float cooldown;

        void Update()
        {
            cooldown -= Time.deltaTime;
            Transform target = FindNearest();
            if (target == null) return;

            Debug.DrawLine(transform.position, target.position, Color.yellow);
            if (cooldown <= 0f)
            {
                target.GetComponent<EnemyHealth>().TakeDamage(damage);
                cooldown = fireRate;   // 開火之後要等 fireRate 秒
            }
        }

    __FIND__}
  `.replace('__FIND__', towerFind);
  const enemyHealthHidden = cs`
    public class EnemyHealth : MonoBehaviour
    {
        [SerializeField] private int hp = 3;
        public void TakeDamage(int amount)
        {
            hp -= amount;
            Debug.Log($"命中！{gameObject.name} 剩下 {hp}");
            if (hp <= 0) Destroy(gameObject);
        }
    }
  `;
  const walkerHidden = rep(sol142, 'public class EnemyPath', 'public class EnemyWalker').replace(/^using UnityEngine;\n\n/, '');
  const fireBlock = '        if (cooldown <= 0f)\n        {\n            target.GetComponent<EnemyHealth>().TakeDamage(damage);\n            cooldown = fireRate;   // 開火之後要等 fireRate 秒\n        }\n';
  L.push({
    id: '14-4', world: 14, title: '開火', file: 'TowerShooter.cs',
    concept: '找到目標後，用 <code>target.GetComponent&lt;EnemyHealth&gt;()</code> 拿到「敵人身上的」血量腳本，再呼叫 TakeDamage。和之前的射擊冷卻一樣，用一個倒數的 <code>cooldown</code> 控制開火速度，不然一秒會打 60 次。',
    goal: '3 隻史萊姆（各 3 滴血）沿路前進，塔要在牠們走到城堡前全部打倒，而且總共不能開超過 15 槍。',
    hidden: baseHidden + enemyHealthHidden + spawnerHidden(3, 2) + walkerHidden,
    inspectorFor: 'Tower',
    scene: {
      tiles: tdTiles([[0, 8, 'P'], [7, 4, 'T']]), rects: PATH_RECTS,
      entities: Object.assign({ P: T.ctrl('EnemySpawner', 'Spawner'), T: towerTpl(['TowerShooter']) }, TD_ENTS),
      prefabs: { Enemy: enemyTpl(['EnemyWalker', 'EnemyHealth']) },
      inspector: { Spawner: { enemyPrefab: { prefab: 'Enemy' } }, Enemy: { waypoints: { refs: WP_NAMES }, baseHealth: { ref: 'Base' }, speed: 3 }, Tower: { enemyLayer: { layer: 'Enemy' } } },
      duration: 12, grid: true
    },
    done: (W) => W.stats.spawned === 3 && ents(W, (e) => e.tag === 'Enemy').length === 0,
    starter: rep(sol144, fireBlock, '        // 冷卻結束時，對 target 造成 damage 點傷害，然後重新開始冷卻\n'),
    solution: sol144,
    check: (W) => {
      const hitTimes = W.logs.filter((l) => l.kind === 'log' && l.text.startsWith('命中')).map((l) => l.t);
      const hp = field(W, 'Base', 'hp');
      const minGap = hitTimes.length > 1 ? Math.min(...hitTimes.slice(1).map((t, i) => t - hitTimes[i])) : 1;
      if (hitTimes.length > 15) return { ok: false, msg: `開了 ${hitTimes.length} 槍，太多了` };
      if (minGap < 0.4) return { ok: false, msg: `兩次開火只隔了 ${minGap.toFixed(2)} 秒，沒有冷卻` };
      if (hp !== 10) return { ok: false, msg: `有史萊姆走到城堡了，城堡剩下 ${hp} 滴血` };
      return res(W.stats.spawned === 3 && ents(W, (e) => e.tag === 'Enemy').length === 0, '還有史萊姆沒被打倒');
    },
    choices: [
      { code: sol144, expect: 'win', explain: '冷卻結束才開火，打的是目標身上的 EnemyHealth。' },
      { code: rep(sol144, fireBlock, '        target.GetComponent<EnemyHealth>().TakeDamage(damage);\n'), expect: 'fail', explain: '沒有冷卻，每一幀都開火，一秒 60 槍。' },
      { code: rep(sol144, 'target.GetComponent<EnemyHealth>().TakeDamage(damage);', 'target.TakeDamage(damage);'), expect: 'compile:CS1061', explain: 'target 是 Transform，沒有 TakeDamage。要先 GetComponent<EnemyHealth>()。' },
      { code: rep(sol144, 'target.GetComponent<EnemyHealth>().TakeDamage(damage);', 'GetComponent<EnemyHealth>().TakeDamage(damage);'), expect: 'runtime:NullReferenceException', explain: '少了 target.，變成在「塔自己身上」找 EnemyHealth，找不到所以是 null。' }
    ],
    hints: ['冷卻結束（cooldown <= 0）時開火。', 'target.GetComponent<EnemyHealth>().TakeDamage(damage); 然後 cooldown = fireRate;', fireBlock.trim()]
  });

  const sol145 = cs`
    using UnityEngine;

    public enum TowerState { Idle, Aiming, Reloading }

    public class StateTower : MonoBehaviour
    {
        [SerializeField] private float range = 4f;
        [SerializeField] private LayerMask enemyLayer;
        [SerializeField] private float reloadTime = 0.8f;
        private TowerState state = TowerState.Idle;
        private float reloadTimer;
        private Transform target;

        void Update()
        {
            switch (state)
            {
                case TowerState.Idle:
                    target = FindTarget();
                    if (target != null) ChangeState(TowerState.Aiming);
                    break;

                case TowerState.Aiming:
                    if (target == null)
                    {
                        ChangeState(TowerState.Idle);
                        break;
                    }
                    target.GetComponent<EnemyHealth>().TakeDamage(1);
                    reloadTimer = reloadTime;
                    ChangeState(TowerState.Reloading);
                    break;

                case TowerState.Reloading:
                    reloadTimer -= Time.deltaTime;
                    if (reloadTimer <= 0f) ChangeState(TowerState.Idle);
                    break;
            }
        }

        void ChangeState(TowerState next)
        {
            Debug.Log($"{state} → {next}");
            state = next;
        }

        Transform FindTarget()
        {
            Collider2D hit = Physics2D.OverlapCircle(transform.position, range, enemyLayer);
            if (hit == null) return null;
            return hit.transform;
        }
    }
  `;
  const reloadDec = '                reloadTimer -= Time.deltaTime;\n';
  L.push({
    id: '14-5', world: 14, title: '狀態機', file: 'StateTower.cs',
    concept: '很多遊戲物件會在幾種<b>狀態</b>之間切換：塔有「待命、瞄準、裝填」，RPG 的敵人有「巡邏、追擊、攻擊」。用 <code>enum</code> 列出所有狀態，<code>switch</code> 每一幀只執行目前狀態的程式，條件成立就切到下一個狀態。這叫<b>有限狀態機（FSM）</b>，是遊戲 AI 最基本的寫法。',
    goal: '塔要在「待命 → 瞄準 → 裝填 → 待命」之間循環，把 3 滴血的史萊姆打倒。',
    hidden: enemyHealthHidden,
    inspectorFor: 'Tower',
    scene: {
      tiles: tdTiles([[8, 5, 'e'], [7, 4, 'T']]), rects: PATH_RECTS,
      entities: Object.assign({}, TD_ENTS, { e: enemyTpl(['EnemyHealth']), T: towerTpl(['StateTower']) }),
      inspector: { Tower: { enemyLayer: { layer: 'Enemy' } } }, duration: 3, grid: true
    },
    starter: rep(sol145, reloadDec, '                // 裝填中：計時器要倒數\n'),
    solution: sol145,
    check: (W) => {
      const l = logs(W);
      for (const s of ['Idle → Aiming', 'Aiming → Reloading', 'Reloading → Idle']) if (!l.includes(s)) return { ok: false, msg: `Console 沒有出現「${s}」` };
      return res(ents(W, (e) => e.tag === 'Enemy').length === 0, '史萊姆還沒被打倒（塔卡在某個狀態了嗎？）');
    },
    choices: [
      { code: sol145, expect: 'win', explain: '三個狀態依序切換。' },
      { code: rep(sol145, reloadDec, ''), expect: 'fail', explain: '裝填的計時器沒有倒數，塔永遠卡在 Reloading，只開了一槍。' },
      { code: rep(sol145, '                if (target != null) ChangeState(TowerState.Aiming);\n                break;\n', '                if (target != null) ChangeState(TowerState.Aiming);\n'), expect: 'compile:CS0163', explain: '每個 case 的結尾都要 break。' },
      { code: rep(sol145, 'case TowerState.Idle:', 'case Idle:'), expect: 'compile:CS0103', explain: 'enum 成員要寫完整：TowerState.Idle。' }
    ],
    hints: ['看 Console：塔切到 Reloading 之後就沒有再變了。', 'Reloading 狀態裡，reloadTimer 要每一幀減掉 Time.deltaTime。', reloadDec.trim()]
  });

  const sol146 = cs`
    using System.Collections.Generic;
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.Tilemaps;

    public class TowerPlacer : MonoBehaviour
    {
        [SerializeField] private GameObject towerPrefab;
        [SerializeField] private Tilemap path;
        [SerializeField] private int money = 100;
        [SerializeField] private int towerCost = 50;
        private List<Vector3Int> used = new List<Vector3Int>();

        void Update()
        {
            if (!Mouse.current.leftButton.wasPressedThisFrame) return;

            Vector3 world = Camera.main.ScreenToWorldPoint(Mouse.current.position.ReadValue());
            Vector3Int cell = path.WorldToCell(world);

            if (path.HasTile(cell)) { Debug.Log("路上不能蓋塔"); return; }
            if (used.Contains(cell)) { Debug.Log("這格已經有塔了"); return; }
            if (money < towerCost) { Debug.Log("錢不夠"); return; }

            money -= towerCost;
            used.Add(cell);
            Instantiate(towerPrefab, path.GetCellCenterWorld(cell), Quaternion.identity);
            Debug.Log($"蓋了一座塔，剩下 {money} 元");
        }
    }
  `;
  const moneyCheck = '        if (money < towerCost) { Debug.Log("錢不夠"); return; }\n';
  L.push({
    id: '14-6', world: 14, title: '滑鼠蓋塔', file: 'TowerPlacer.cs',
    concept: '把前面學的組合起來：滑鼠座標換成格子，再一條一條檢查「能不能蓋」：是不是路、這格是否已經有塔、錢夠不夠。不行就 <code>return</code> 提早離開，全部通過才扣錢並 Instantiate。這種「先排除不行的情況」的寫法叫<b>防衛式（guard clause）</b>，比一層層 if 好讀。',
    goal: '有 100 元、一座塔 50 元。點了 5 下（路上、空地、同一格、另一塊空地、錢不夠），最後要蓋好 2 座塔、剩 0 元。',
    inspectorFor: 'Builder',
    scene: {
      tiles: tdTiles([[0, 8, 'B']]), rects: PATH_RECTS,
      entities: Object.assign({ B: T.ctrl('TowerPlacer', 'Builder') }, TD_ENTS),
      prefabs: { Tower: towerTpl([]) },
      inspector: { Builder: { towerPrefab: { prefab: 'Tower' }, path: { tilemap: 'Path' } } },
      mouse: clicks([[4.5, 4.5, 'left'], [7.5, 4.5, 'left'], [7.5, 4.5, 'left'], [12.5, 4.5, 'left'], [2.5, 3.5, 'left']]),
      showMouse: true, duration: 2.2, grid: true
    },
    mouseLevel: true,
    starter: rep(sol146, moneyCheck, '        // 還要檢查錢夠不夠\n'),
    solution: sol146,
    check: (W) => {
      const towers = ents(W, (e) => e.name === 'Tower');
      const money = field(W, 'Builder', 'money');
      if (towers.some((t) => kindAt(W, 'Path', Math.floor(t.x), Math.floor(t.y)))) return { ok: false, msg: '有一座塔蓋在路上了' };
      if (towers.length !== 2) return { ok: false, msg: `蓋了 ${towers.length} 座塔，應該是 2 座` };
      return res(money === 0, `剩下 ${money} 元，應該是 0 元`);
    },
    choices: [
      { code: sol146, expect: 'win', explain: '三個檢查都通過才蓋塔。' },
      { code: rep(sol146, '        if (path.HasTile(cell)) { Debug.Log("路上不能蓋塔"); return; }\n', ''), expect: 'fail', explain: '沒檢查是不是路，第一下就把塔蓋在路上了。' },
      { code: rep(sol146, 'money -= towerCost;', 'money =- towerCost;'), expect: 'fail', explain: '=- 是「等於負的 towerCost」，錢直接變成 -50，之後都蓋不了。' },
      { code: rep(sol146, 'if (money < towerCost)', 'if (money <= towerCost)'), expect: 'fail', explain: '剩 50 元時 50 <= 50 成立，明明錢剛好夠卻說不夠。' }
    ],
    hints: ['蓋塔之前要確認 money 夠不夠 towerCost。', '錢不夠時印出訊息並 return。', moneyCheck.trim()]
  });

  LV.addWorlds(WORLDS, L);
})(typeof window !== 'undefined' ? window : globalThis);
