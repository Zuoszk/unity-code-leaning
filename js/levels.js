/* C# 小勇者：全部關卡
 * 格子世界的關卡用地圖字元：# 牆 . 地板 H 勇者 F 旗子 C 金幣 L 岩漿 S 史萊姆 D 柵門 M 商人 R 大石頭
 *   r/b/g 紅藍綠門 K 鑰匙 I 道具 X 寶箱 W 吊橋
 * 即時世界的場景字元：# 地面 ^ 尖刺 ~ 岩漿，其他字元查 entities 表
 */
(function (root) {
  'use strict';

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
  function rep(code, from, to) {
    if (code.indexOf(from) < 0) throw new Error('rep: 找不到「' + from + '」');
    return code.split(from).join(to);
  }

  const HANDBOOK = 'handbook.html';

  const WORLDS = [
    { id: 0, name: '新手村', sub: '第一行程式', ch: 'ch0' },
    { id: 1, name: '變數森林', sub: '變數與型別', ch: 'ch1' },
    { id: 2, name: '迴圈洞窟', sub: '條件與迴圈', ch: 'ch2' },
    { id: 3, name: '工匠小鎮', sub: '陣列、方法、類別', ch: 'ch3' },
    { id: 4, name: 'Unity 入口', sub: 'MonoBehaviour', ch: 'ch4' },
    { id: 5, name: '操作訓練場', sub: '輸入與移動', ch: 'ch5' },
    { id: 6, name: '重力山谷', sub: '2D 物理', ch: 'ch6' },
    { id: 7, name: '兵工廠', sub: 'Prefab 與生成', ch: 'ch7' },
    { id: 8, name: '競技場', sub: '遊戲流程與 UI', ch: 'ch8' },
    { id: 9, name: '時光塔', sub: '協程與事件', ch: 'ch9' },
    { id: 10, name: '魔王城', sub: '總複習', ch: 'ch10' }
  ];

  const L = [];
  function grid(o) { o.kind = 'grid'; o.file = o.file || 'Hero.cs'; L.push(o); }
  function unity(o) { o.kind = 'unity'; o.file = o.file || 'Hero.cs'; L.push(o); }
  const R4 = (n) => 'MoveRight();\n'.repeat(n);

  /* =========================================================
   * W0 新手村
   * ========================================================= */
  grid({
    id: '0-1', world: 0, title: '呼叫方法',
    concept: '程式是一行一行的<b>指令</b>。<code>MoveRight();</code> 的意思是：呼叫一個叫 MoveRight 的方法。後面的 <code>()</code> 代表「執行它」，最後的 <code>;</code> 代表這行指令結束。',
    goal: '讓勇者走到旗子上。',
    map: ['#######', '#H...F#', '#######'],
    starter: '// 每呼叫一次 MoveRight(); 勇者就往右走一格\nMoveRight();\n',
    solution: R4(4),
    choices: [
      { code: R4(4), expect: 'win', explain: '每行走一格，4 行剛好走到旗子。' },
      { code: R4(3), expect: 'fail', explain: '只走了 3 格，還差一格。' },
      { code: 'MoveRight;\n'.repeat(4), expect: 'compile:CS0201', explain: '少了括號 ()，只是寫出方法的名字，沒有真的呼叫它。' },
      { code: 'moveright();\n'.repeat(4), expect: 'compile:CS0103', explain: 'C# 分大小寫，moveright 和 MoveRight 是不同的名字。' }
    ],
    hints: ['旗子在勇者右邊第 4 格。', '每一行 MoveRight(); 只走一格，所以要寫 4 行。', R4(4)]
  });

  const sol02 = cs`
    MoveDown();
    MoveDown();
    MoveRight();
    MoveRight();
    MoveRight();
    MoveRight();
    MoveUp();
    MoveUp();
  `;
  grid({
    id: '0-2', world: 0, title: '繞過牆壁',
    concept: '程式會<b>由上往下</b>一行一行執行，順序寫錯，勇者就會撞牆。<code>MoveUp()</code>、<code>MoveDown()</code>、<code>MoveLeft()</code>、<code>MoveRight()</code> 可以往四個方向走。',
    goal: '繞過中間的牆，走到旗子。',
    map: ['#######', '#H.#.F#', '#..#..#', '#.....#', '#######'],
    starter: '// 先往下走，再往右，最後往上\nMoveDown();\n',
    solution: sol02,
    choices: [
      { code: sol02, expect: 'win', explain: '下 2、右 4、上 2，剛好繞過牆。' },
      { code: R4(4) + 'MoveDown();\nMoveDown();\nMoveUp();\nMoveUp();\n', expect: 'fail', explain: '先往右走會直接撞牆，後面的步數就全亂了。順序很重要。' },
      { code: sol02.replace(/MoveUp\(\);\n$/, ''), expect: 'fail', explain: '少了一個 MoveUp()，停在旗子下面一格。' },
      { code: sol02.replace(/;\n$/, '\n'), expect: 'compile:CS1002', explain: '最後一行少了分號。' }
    ],
    hints: ['勇者不能直接往右，中間有牆。', '往下 2 格、往右 4 格、往上 2 格。', sol02]
  });

  const sol03 = 'MoveRight();\nMoveRight();\nMoveRight();\n';
  grid({
    id: '0-3', world: 0, title: '分號',
    concept: 'C# 用分號 <code>;</code> 表示一行指令結束。少了分號，Console 會出現紅色的 <b>CS1002</b> 錯誤，還會告訴你是第幾行、第幾個字。用中文輸入法時要小心，全形的「；」電腦不認得。',
    goal: '修好錯誤，走到旗子。',
    map: ['######', '#H..F#', '######'],
    starter: 'MoveRight();\nMoveRight()\nMoveRight();\n',
    solution: sol03,
    choices: [
      { code: sol03, expect: 'win', explain: '每行都有分號。' },
      { code: 'MoveRight();\nMoveRight()\nMoveRight();\n', expect: 'compile:CS1002', explain: '第 2 行少了分號。錯誤的位置會指在第 2 行的結尾。' },
      { code: 'MoveRight();\nMoveRight()；\nMoveRight();\n', expect: 'compile:CS1056', explain: '第 2 行用了全形的「；」，C# 不認得這個字元。' },
      { code: 'MoveRight(); MoveRight(); MoveRight();\n', expect: 'win', correct: true, explain: '也可以！空白和換行不影響程式，C# 看的是分號。' }
    ],
    hints: ['按「執行」看 Console 的錯誤訊息，括號裡的數字是行號。', '第 2 行少了東西。', sol03]
  });

  const sol04 = R4(4);
  grid({
    id: '0-4', world: 0, title: '大小寫',
    concept: 'C# 會分大小寫：<code>MoveRight</code>、<code>moveRight</code>、<code>Moveright</code> 是三個不同的名字。名字打錯時會出現 <b>CS0103</b>：找不到這個名稱。',
    goal: '修好每一行的名字，走到旗子。',
    map: ['#######', '#H...F#', '#######'],
    starter: 'moveRight();\nMoveRight();\nMOVERIGHT();\nMoveright();\n',
    solution: sol04,
    choices: [
      { code: sol04, expect: 'win', explain: '每一行都是 MoveRight，M 和 R 大寫。' },
      { code: 'MoveRight();\nMoveRight();\nMoveright();\nMoveRight();\n', expect: 'compile:CS0103', explain: '第 3 行的 r 是小寫。' },
      { code: 'moveRight();\n'.repeat(4), expect: 'compile:CS0103', explain: '開頭的 m 要大寫。C# 的方法名稱習慣每個字的開頭都大寫（PascalCase）。' },
      { code: 'MoveRight();\nMoveRight();\nMoveRight();\nMoveRigth();\n', expect: 'compile:CS0103', explain: '最後一行把 Right 拼成 Rigth 了。' }
    ],
    hints: ['看 Console 的錯誤訊息，它會指出哪一行的名字不存在。', '正確的寫法是 M 和 R 大寫：MoveRight', sol04]
  });

  grid({
    id: '0-5', world: 0, title: 'Debug.Log',
    concept: '<code>Debug.Log(...)</code> 會把括號裡的東西印到 Console 視窗，就像 Python 的 <code>print()</code>。文字要用<b>雙引號</b>包起來，這種資料叫做字串（string）。',
    goal: '在 Console 印出 Hello, Unity!',
    map: ['#####', '#H.F#', '#####'],
    check: ['log'],
    expectLog: ['Hello, Unity!'],
    starter: '// 在 Console 印出 Hello, Unity!\n',
    solution: 'Debug.Log("Hello, Unity!");\n',
    choices: [
      { code: 'Debug.Log("Hello, Unity!");\n', expect: 'win', explain: '文字放在雙引號裡。' },
      { code: 'Debug.Log(Hello, Unity!);\n', expect: 'compile:CS1026', explain: '沒有雙引號，C# 以為 Hello 和 Unity 是變數名稱，整行都看不懂了。' },
      { code: 'Debug.log("Hello, Unity!");\n', expect: 'compile:CS0117', explain: 'Debug 裡沒有 log，要寫大寫的 Log。' },
      { code: "Debug.Log('Hello, Unity!');\n", expect: 'compile:CS1012', explain: '單引號在 C# 只能放一個字元（char），文字要用雙引號。' }
    ],
    hints: ['Debug.Log 的 D 和 L 都是大寫。', '文字要用雙引號 " " 包起來，而且要一模一樣，包括逗號和驚嘆號。', 'Debug.Log("Hello, Unity!");']
  });

  /* =========================================================
   * W1 變數森林
   * ========================================================= */
  grid({
    id: '1-1', world: 1, title: 'int 變數',
    concept: '<b>變數</b>是一個有名字的盒子。<code>int steps = 6;</code> 的意思是：做一個叫 steps 的盒子，只能放整數（int），先放進 6。和 Python 不同，C# 要先寫出型別。<code>MoveRight(6)</code> 括號裡的數字叫<b>參數</b>，代表一次走幾格。',
    goal: '修改 steps 的值，讓勇者一次走到旗子。',
    map: ['#########', '#H.....F#', '#########'],
    rules: [
      { re: '\\bint\\s+steps\\s*=', msg: '這關要宣告 int steps 變數。' },
      { re: 'MoveRight\\s*\\(\\s*steps\\s*\\)', msg: '要寫 MoveRight(steps)，把變數傳給方法。' }
    ],
    starter: 'int steps = 1;\nMoveRight(steps);\n',
    solution: 'int steps = 6;\nMoveRight(steps);\n',
    choices: [
      { code: 'int steps = 6;\nMoveRight(steps);\n', expect: 'win', explain: '旗子在右邊 6 格。' },
      { code: 'int steps = "6";\nMoveRight(steps);\n', expect: 'compile:CS0029', explain: '"6" 有引號，是字串，不能放進 int。' },
      { code: 'steps = 6;\nMoveRight(steps);\n', expect: 'compile:CS0103', explain: '沒寫型別，C# 以為你要用一個已經存在的 steps，但它還沒宣告。Python 可以這樣寫，C# 不行。' },
      { code: 'int steps = 6.0;\nMoveRight(steps);\n', expect: 'compile:CS0266', explain: '6.0 是小數，不能直接放進 int。' }
    ],
    hints: ['數一數勇者到旗子有幾格。', '只要改第一行的數字。', 'int steps = 6;\nMoveRight(steps);']
  });

  const sol12 = 'int steps = 2;\nMoveRight(steps);\nsteps++;\nMoveDown(steps);\n';
  grid({
    id: '1-2', world: 1, title: '++ 和 +=',
    concept: '變數的值可以改。<code>steps++;</code> 讓 steps 加 1，<code>steps += 2;</code> 加 2，<code>steps--;</code> 減 1。小心 <code>=+</code> 和 <code>+=</code> 不一樣！',
    goal: '往右 2 格，再往下 3 格。只能用 steps 變數。',
    map: ['######', '#H..##', '###.##', '###.##', '###F##', '######'],
    rules: [
      { re: 'Move(Right|Down)\\s*\\(\\s*\\d', not: true, msg: 'Move 的括號裡請用 steps 變數，不要直接寫數字。' },
      { re: '(\\+\\+|--|\\+=|-=)', msg: '這關要用 ++ 或 += 來改變 steps。' }
    ],
    starter: 'int steps = 2;\nMoveRight(steps);\n// 讓 steps 變成 3，再往下走\n\nMoveDown(steps);\n',
    solution: sol12,
    choices: [
      { code: sol12, expect: 'win', explain: 'steps 從 2 變成 3。' },
      { code: rep(sol12, 'steps++;', 'steps + 1;'), expect: 'compile:CS0201', explain: 'steps + 1 算出了 3，但沒有存回去，這行不是完整的指令。要寫 steps += 1; 或 steps++;' },
      { code: rep(sol12, 'steps++;', 'int steps = 3;'), expect: 'compile:CS0128', explain: 'steps 已經宣告過了，不能再宣告一次。改值時不用再寫 int。' },
      { code: rep(sol12, 'steps++;', 'steps =+ 1;'), expect: 'fail', explain: '=+ 1 的意思是「steps = +1」，steps 變成 1，只往下走了 1 格。' }
    ],
    hints: ['第一次走 2 格，第二次要走 3 格。', '在兩個 Move 中間讓 steps 加 1。', sol12]
  });

  const sol13 = 'float jump = 2.5f;\nMoveRight();\nJump(jump);\nMoveRight();\n';
  grid({
    id: '1-3', world: 1, title: 'float 和 f',
    concept: '<code>float</code> 是小數。C# 裡直接寫 <code>2.5</code> 會被當成更精確的 double，放進 float 變數會出現 <b>CS0664</b>。所以 float 的數字後面要加 <b>f</b>：<code>2.5f</code>。Unity 的位置、速度、時間全都用 float。<code>Jump(距離)</code> 會往前跳，距離四捨五入成格數。',
    goal: '跳過岩漿，走到旗子。',
    map: ['########', '#H.LL.F#', '########'],
    starter: 'float jump = 2.5;\nMoveRight();\nJump(jump);\nMoveRight();\n',
    solution: sol13,
    choices: [
      { code: sol13, expect: 'win', explain: '2.5f 四捨五入是 3 格，剛好跳過兩格岩漿。' },
      { code: rep(sol13, '2.5f', '2.5'), expect: 'compile:CS0664', explain: '2.5 是 double，放進 float 要加 f。' },
      { code: rep(sol13, 'float jump', 'int jump'), expect: 'compile:CS0266', explain: 'int 只能放整數，2.5f 放不進去。' },
      { code: rep(sol13, '2.5f', '2f'), expect: 'fail', explain: '只跳 2 格，掉進第二格岩漿。' }
    ],
    hints: ['按執行看錯誤訊息，CS0664 告訴你要怎麼修。', '在 2.5 後面加上 f。', sol13]
  });

  const sol14 = 'bool leverOn = true;\nSetLever(leverOn);\nMoveRight(4);\n';
  grid({
    id: '1-4', world: 1, title: 'bool',
    concept: '<code>bool</code> 只有兩種值：<code>true</code>（是）和 <code>false</code>（否），而且要<b>小寫</b>。Python 的 <code>True</code> 在 C# 會變成「找不到名稱」的錯誤。',
    goal: '拉下拉桿打開柵門，走到旗子。',
    map: ['#######', '#H.D.F#', '#######'],
    starter: 'bool leverOn = false;\nSetLever(leverOn);\nMoveRight(4);\n',
    solution: sol14,
    choices: [
      { code: sol14, expect: 'win', explain: 'true 小寫。' },
      { code: rep(sol14, 'true', 'True'), expect: 'compile:CS0103', explain: 'C# 的 bool 是小寫 true，大寫的 True 會被當成一個不存在的名字。' },
      { code: rep(sol14, 'true', '"true"'), expect: 'compile:CS0029', explain: '加了引號就變成字串了。' },
      { code: rep(sol14, 'true', '1'), expect: 'compile:CS0029', explain: 'C# 的 bool 不能用 1 和 0 代替。' }
    ],
    hints: ['柵門要拉桿打開才能通過。', '把 false 改成 true。', sol14]
  });

  const sol15 = 'string password = "芝麻開門";\nSay(password);\nMoveRight(5);\n';
  grid({
    id: '1-5', world: 1, title: 'string',
    concept: '<code>string</code> 用來存文字，要放在<b>雙引號</b> <code>" "</code> 裡。單引號 <code>\' \'</code> 在 C# 是 char，只能放一個字。字串可以用 <code>+</code> 接起來。',
    goal: '對柵門說出正確的密語「芝麻開門」，再走到旗子。',
    map: ['########', '#H..D.F#', '########'],
    data: { password: '芝麻開門' },
    starter: 'string password = "芝麻關門";\nSay(password);\nMoveRight(5);\n',
    solution: sol15,
    choices: [
      { code: sol15, expect: 'win', explain: '密語正確，柵門打開。' },
      { code: rep(sol15, '"芝麻開門"', "'芝麻開門'"), expect: 'compile:CS1012', explain: '單引號只能放一個字元，文字要用雙引號。' },
      { code: rep(sol15, '"芝麻開門"', '芝麻開門'), expect: 'compile:CS0103', explain: '沒有引號，C# 以為「芝麻開門」是一個變數名稱。' },
      { code: rep(sol15, '"芝麻開門"', '"芝麻" + "開門"'), expect: 'win', correct: true, explain: '也可以！兩個字串用 + 接起來就是「芝麻開門」。' }
    ],
    hints: ['仔細看密語的第三個字。', '把「關」改成「開」。', sol15]
  });

  const sol16 = 'int coins = 7;\nfloat half = coins / 2f;\nPay(half);\nMoveRight(4);\n';
  grid({
    id: '1-6', world: 1, title: '整數除法',
    concept: '兩個<b>整數</b>相除，C# 會直接把小數丟掉：<code>7 / 2</code> 是 3，就像 Python 的 <code>7 // 2</code>。只要其中一邊是 float（例如 <code>2f</code>），結果才會有小數 3.5。還有：C# 的 <code>//</code> 是註解，不是除法！',
    goal: '把 7 枚金幣的一半（3.5 枚）付給商人，再走到旗子。',
    map: ['#######', '#H.M.F#', '#######'],
    data: { price: 3.5 },
    starter: 'int coins = 7;\nfloat half = coins / 2;\nPay(half);\nMoveRight(4);\n',
    solution: sol16,
    choices: [
      { code: sol16, expect: 'win', explain: '2f 是 float，所以 7 / 2f = 3.5。' },
      { code: rep(sol16, '2f', '2'), expect: 'fail', explain: '7 / 2 兩邊都是 int，結果是 3。就算存進 float 變數，小數也早就不見了。' },
      { code: rep(sol16, 'float half', 'int half'), expect: 'compile:CS0266', explain: '3.5 是小數，放不進 int。' },
      { code: rep(sol16, 'coins / 2f', 'coins // 2'), expect: 'compile:CS1002', explain: 'C# 的 // 是註解，後面的 2; 都被當成註解，這行就少了分號。' }
    ],
    hints: ['先按執行，看商人說你付了多少。', '讓其中一個數字變成 float。', sol16]
  });

  const sol17 = cs`
    bool hasKey = HasKey();
    bool isNight = IsNight();
    // 有鑰匙「而且」不是晚上，才可以開門
    bool canOpen = hasKey && !isNight;
    SetLever(canOpen);
    MoveRight(4);
  `;
  grid({
    id: '1-7', world: 1, title: '&& || !',
    concept: '<code>&&</code> 是「而且」、<code>||</code> 是「或」、<code>!</code> 是「不是」，等於 Python 的 <code>and</code>、<code>or</code>、<code>not</code>。這關會用三種情況測試你的程式：白天有鑰匙、晚上有鑰匙、白天沒鑰匙。',
    goal: '只有「有鑰匙而且不是晚上」時才開門。晚上開門會放出幽靈。',
    variants: [
      { map: ['#######', '#H.D.F#', '#######'], data: { hasKey: true, isNight: false, expectLever: true }, check: ['flag'] },
      { map: ['#######', '#H.D.F#', '#######'], data: { hasKey: true, isNight: true, expectLever: false }, check: ['lever'] },
      { map: ['#######', '#H.D.F#', '#######'], data: { hasKey: false, isNight: false, expectLever: false }, check: ['lever'] }
    ],
    starter: rep(sol17, 'hasKey && !isNight', 'hasKey'),
    solution: sol17,
    choices: [
      { code: sol17, expect: 'win', explain: '三種情況都正確。' },
      { code: rep(sol17, 'hasKey && !isNight', 'hasKey || !isNight'), expect: 'fail', explain: '|| 是「或」，晚上有鑰匙時也會開門，幽靈跑出來了。' },
      { code: rep(sol17, 'hasKey && !isNight', 'hasKey and not isNight'), expect: 'compile:CS1002', explain: 'and、not 是 Python 的寫法，C# 看不懂。' },
      { code: rep(sol17, 'hasKey && !isNight', 'hasKey && isNight'), expect: 'fail', explain: '少了 !，變成「有鑰匙而且是晚上」才開門，白天反而打不開。' }
    ],
    hints: ['條件有兩個，要同時成立。', '「不是晚上」寫成 !isNight。', 'bool canOpen = hasKey && !isNight;']
  });

  /* =========================================================
   * W2 迴圈洞窟
   * ========================================================= */
  const sol21 = cs`
    MoveRight();
    if (SeeEnemy())
    {
        Attack();
    }
    MoveRight(4);
  `;
  grid({
    id: '2-1', world: 2, title: 'if',
    concept: '<code>if (條件) { ... }</code>：條件成立（true）才執行大括號裡的程式。條件要放在<b>小括號</b>裡。<code>SeeEnemy()</code> 會回傳 bool，告訴你前面一格是不是敵人。這關有兩種地圖，你的程式要兩種都能過。',
    goal: '前面是史萊姆就攻擊；前面是金幣就不要打（會打碎），撿起來就好。',
    variants: [
      { map: ['########', '#H.S..F#', '########'] },
      { map: ['########', '#H.C..F#', '########'] }
    ],
    check: ['flag', 'coins'],
    starter: 'MoveRight();\n// 前面有敵人才攻擊；如果是金幣，打下去會碎掉\nAttack();\nMoveRight(4);\n',
    solution: sol21,
    choices: [
      { code: sol21, expect: 'win', explain: '有敵人才攻擊，兩種地圖都能過。' },
      { code: 'MoveRight();\nAttack();\nMoveRight(4);\n', expect: 'fail', explain: '不管前面是什麼都攻擊，第二張地圖把金幣打碎了。' },
      { code: rep(sol21, 'SeeEnemy()', 'SeeEnemy'), expect: 'compile:CS0428', explain: 'SeeEnemy 後面少了 ()，沒有真的呼叫方法。' },
      { code: rep(sol21, 'if (SeeEnemy())', 'if (SeeEnemy());'), expect: 'fail', explain: 'if 後面多了分號，if 只管到那個分號就結束了，下面的 { Attack(); } 每次都會執行。Console 有黃色警告 CS0642。' }
    ],
    hints: ['只有 SeeEnemy() 是 true 的時候才 Attack()。', '把 Attack(); 放進 if 的大括號裡。', sol21]
  });

  const sol22 = cs`
    if (CanMove("up"))
    {
        MoveUp();
        MoveRight(4);
        MoveDown();
    }
    else
    {
        MoveDown();
        MoveRight(4);
        MoveUp();
    }
  `;
  grid({
    id: '2-2', world: 2, title: 'if / else',
    concept: '<code>else</code> 是「否則」：if 的條件不成立時，改執行 else 的大括號。<code>CanMove("up")</code> 會告訴你往上走不走得通，方向要寫小寫的 "up"、"down"、"left"、"right"。',
    goal: '上面或下面其中一條路被擋住了，走另一條路到旗子。',
    variants: [
      { map: ['#######', '#.....#', '#H###F#', '##....#', '#######'] },
      { map: ['#######', '##....#', '#H###F#', '#.....#', '#######'] }
    ],
    starter: cs`
      if (CanMove("up"))
      {
          MoveUp();
          MoveRight(4);
          MoveDown();
      }
      // 上面被擋住的話，就走下面
    `,
    solution: sol22,
    choices: [
      { code: sol22, expect: 'win', explain: '上面能走就走上面，否則走下面。' },
      { code: sol22.slice(0, sol22.indexOf('else')), expect: 'fail', explain: '沒有 else，上面被擋住時勇者就站著不動。' },
      { code: rep(sol22, 'else\n', 'else (CanMove("down"))\n'), expect: 'compile:CS1002', explain: 'else 後面不能接條件。要再判斷的話要寫 else if (...)。' },
      { code: rep(sol22, '"up"', '"UP"'), expect: 'fail', explain: '字串也分大小寫，"UP" 不是 CanMove 認得的方向，所以永遠是 false。' }
    ],
    hints: ['兩條路的走法剛好相反。', 'else 後面直接接大括號。', sol22]
  });

  const sol23 = cs`
    MoveRight();
    string color = DoorColor();
    if (color == "red")
    {
        UseKey("火焰鑰匙");
    }
    else if (color == "blue")
    {
        UseKey("冰霜鑰匙");
    }
    else
    {
        UseKey("森林鑰匙");
    }
    MoveRight(3);
  `;
  grid({
    id: '2-3', world: 2, title: 'else if',
    concept: '有三種以上的情況時，用 <code>else if</code> 串起來，Python 寫成 <code>elif</code>。判斷兩個值是否相等要用<b>兩個等號</b> <code>==</code>，一個等號 <code>=</code> 是「指定」。',
    goal: '紅門用「火焰鑰匙」、藍門用「冰霜鑰匙」、綠門用「森林鑰匙」。',
    variants: [
      { map: ['#######', '#H.r.F#', '#######'] },
      { map: ['#######', '#H.b.F#', '#######'] },
      { map: ['#######', '#H.g.F#', '#######'] }
    ],
    starter: cs`
      MoveRight();
      string color = DoorColor();
      if (color == "red")
      {
          UseKey("火焰鑰匙");
      }
      // 藍色門用 "冰霜鑰匙"，綠色門用 "森林鑰匙"

      MoveRight(3);
    `,
    solution: sol23,
    choices: [
      { code: sol23, expect: 'win', explain: '三種顏色都有對應的鑰匙。' },
      { code: rep(sol23, 'else\n{\n    UseKey("森林鑰匙");\n}\n', ''), expect: 'fail', explain: '少了綠門的情況。' },
      { code: rep(sol23, 'color == "red"', 'color = "red"'), expect: 'compile:CS0029', explain: '一個等號是「指定」，結果是字串，不是 bool。' },
      { code: rep(sol23, '"red"', 'red'), expect: 'compile:CS0103', explain: 'red 沒有引號，被當成變數名稱了。' }
    ],
    hints: ['用 else if (color == "blue") 接在後面。', '最後一種情況可以直接用 else。', sol23]
  });

  const sol24 = cs`
    int weight = Weight();
    // 吊橋最多承受 50 公斤，超過就要先丟掉寶物
    if (weight > 50)
    {
        DropItem();
    }
    MoveRight(5);
  `;
  grid({
    id: '2-4', world: 2, title: '比較運算子',
    concept: '比較數字用 <code>&gt;</code>、<code>&lt;</code>、<code>&gt;=</code>、<code>&lt;=</code>、<code>==</code>、<code>!=</code>，結果都是 bool。「大於等於」寫成 <code>&gt;=</code>，等號在後面。',
    goal: '吊橋最多承受 50 公斤。超過 50 才丟掉寶物，剛好 50 不用丟。',
    variants: [
      { map: ['########', '#H.WW.F#', '########'], data: { weight: 50 } },
      { map: ['########', '#H.WW.F#', '########'], data: { weight: 70 } }
    ],
    check: ['flag', 'notDropped'],
    starter: rep(sol24, 'weight > 50', 'weight == 50'),
    solution: sol24,
    choices: [
      { code: sol24, expect: 'win', explain: '超過 50 才丟。' },
      { code: rep(sol24, 'weight > 50', 'weight >= 50'), expect: 'fail', explain: '剛好 50 公斤也丟了寶物，其實不用丟。' },
      { code: rep(sol24, 'weight > 50', 'weight => 50'), expect: 'compile:CS1026', explain: '=> 是另一個符號（lambda），大於等於要寫 >=。' },
      { code: rep(sol24, 'weight > 50', 'weight = 50'), expect: 'compile:CS0029', explain: '一個等號是指定，不是比較。' }
    ],
    hints: ['「超過」50 才需要丟。', '用大於 >。', sol24]
  });

  const sol25 = cs`
    // 往右一步、往上一步，重複 4 次
    for (int i = 0; i < 4; i++)
    {
        MoveRight();
        MoveUp();
    }
  `;
  grid({
    id: '2-5', world: 2, title: 'for 迴圈',
    concept: '<code>for (int i = 0; i &lt; 4; i++)</code> 會讓大括號裡的程式重複 4 次，就是 Python 的 <code>for i in range(4):</code>。三個部分用分號隔開：起始值；繼續的條件；每圈結束後做什麼。',
    goal: '爬上樓梯。這關最多只能寫 2 個 Move 指令。',
    map: ['#######', '#####FL', '####..#', '###..##', '##..###', '#H.####', '#######'],
    maxMoves: 2,
    starter: rep(sol25, 'i < 4', 'i < 1'),
    solution: sol25,
    choices: [
      { code: sol25, expect: 'win', explain: 'i 從 0 到 3，共 4 圈。' },
      { code: rep(sol25, 'i < 4', 'i <= 4'), expect: 'fail', explain: 'i <= 4 會跑 5 圈（0、1、2、3、4），多走一步掉進岩漿。' },
      { code: rep(sol25, 'i++)\n', 'i++);\n'), expect: 'fail', explain: 'for 後面多了分號，迴圈重複的是「空指令」，大括號只執行一次。Console 有黃色警告。' },
      { code: rep(sol25, 'int i = 0', 'i = 0'), expect: 'compile:CS0103', explain: '迴圈變數也要宣告型別：int i = 0。' }
    ],
    hints: ['樓梯有 4 階。', '把 i < 1 改成 i < 4。', sol25]
  });

  const sol26 = cs`
    for (int i = 1; i <= 3; i++)
    {
        MoveRight(i);
        MoveDown();
    }
  `;
  grid({
    id: '2-6', world: 2, title: '使用 i',
    concept: '迴圈變數 <code>i</code> 每一圈都會變，也可以拿來用：第 1 圈 i 是 1、第 2 圈是 2……把 <code>i</code> 放進 <code>MoveRight(i)</code>，每一圈就會走得越來越遠。',
    goal: '每一層往右走的格數越來越多（1、2、3）。撿完金幣並走到旗子。',
    map: ['#########', '#HC######', '##.CC####', '####.CCC#', '#######F#', '#########'],
    check: ['flag', 'coins'],
    maxMoves: 2,
    rules: [{ re: 'Move\\w+\\(\\s*i\\s*\\)', msg: '這關要把迴圈變數 i 放進 Move 的括號裡。' }],
    starter: rep(sol26, 'MoveRight(i)', 'MoveRight(1)'),
    solution: sol26,
    choices: [
      { code: sol26, expect: 'win', explain: '第 1 圈走 1 格、第 2 圈 2 格、第 3 圈 3 格。' },
      { code: rep(sol26, 'int i = 1; i <= 3', 'int i = 0; i < 3'), expect: 'fail', explain: 'i 從 0 開始，第一圈 MoveRight(0) 沒有移動，後面全部錯開了。' },
      { code: rep(sol26, 'i++', 'i + 1'), expect: 'compile:CS0201', explain: 'i + 1 只是算出一個數字，沒有存回 i。要寫 i++ 或 i += 1。' },
      { code: 'int i = 1;\n' + sol26, expect: 'compile:CS0136', explain: '外面已經有一個 i 了，迴圈裡不能再宣告同名的變數。' }
    ],
    hints: ['第一層走 1 格，第二層 2 格，第三層 3 格。', '把 MoveRight(1) 的 1 換成 i。', sol26]
  });

  const sol27 = cs`
    while (!AtFlag())
    {
        MoveRight();
    }
  `;
  grid({
    id: '2-7', world: 2, title: 'while 迴圈',
    concept: '<code>while (條件) { ... }</code>：只要條件還是 true，就一直重複。不知道要重複幾次時用 while。<code>AtFlag()</code> 告訴你是不是已經站在旗子上，<code>!</code> 代表「不是」。',
    goal: '走廊長度每次都不一樣，走到旗子為止。',
    variants: [
      { map: ['######', '#H..F#', '######'] },
      { map: ['#########', '#H.....F#', '#########'] },
      { map: ['###########', '#H.......F#', '###########'] }
    ],
    starter: '// 走廊長度每次都不一樣\nMoveRight(3);\n',
    solution: sol27,
    choices: [
      { code: sol27, expect: 'win', explain: '還沒到旗子就繼續走。' },
      { code: rep(sol27, '!AtFlag()', 'AtFlag()'), expect: 'fail', explain: '一開始就不在旗子上，條件是 false，迴圈一次都沒跑。' },
      { code: rep(sol27, 'while', 'if'), expect: 'fail', explain: 'if 只會判斷一次、走一步，不會重複。' },
      { code: rep(sol27, 'AtFlag()', 'AtFlag'), expect: 'compile:CS0023', explain: 'AtFlag 少了 ()，! 不能用在方法名稱上。' }
    ],
    hints: ['「還沒到旗子」就一直往右走。', 'while (!AtFlag()) { ... }', sol27]
  });

  const sol28 = cs`
    while (CoinsLeft() > 0)
    {
        MoveRight();
    }
  `;
  grid({
    id: '2-8', world: 2, title: '無限迴圈',
    concept: 'while 的條件如果永遠是 true，迴圈就停不下來，這叫<b>無限迴圈</b>。在 Unity 裡，無限迴圈會讓整個編輯器卡死，只能強制關閉。迴圈裡一定要有東西讓條件最後變成 false。',
    goal: '撿完所有金幣，而且程式要能結束。',
    map: ['##########', '#HCCCCCC.#', '##########'],
    check: ['coins'],
    starter: 'while (CoinsLeft() > 0)\n{\n    // 忘了移動，金幣永遠撿不完\n}\n',
    solution: sol28,
    choices: [
      { code: sol28, expect: 'win', explain: '每走一步撿一枚，金幣歸零時迴圈結束。' },
      { code: 'while (CoinsLeft() > 0)\n{\n}\n', expect: 'freeze', explain: '迴圈裡什麼都沒做，金幣數量永遠不會變，條件永遠是 true。' },
      { code: rep(sol28, 'CoinsLeft() > 0)', 'CoinsLeft() > 0);'), expect: 'freeze', explain: 'while 後面多了分號，迴圈重複的是空指令，MoveRight 永遠輪不到。' },
      { code: rep(sol28, '> 0', '>= 0'), expect: 'freeze', explain: 'CoinsLeft() 最小是 0，0 >= 0 永遠成立，撿完金幣後勇者一直撞牆停不下來。' }
    ],
    hints: ['迴圈裡要讓勇者移動。', '在大括號裡加上 MoveRight();', sol28]
  });

  const sol29 = cs`
    for (int i = 0; i < 8; i++)
    {
        MoveRight();
        if (OnItem())
        {
            PickUp();
            break;
        }
    }
  `;
  grid({
    id: '2-9', world: 2, title: 'break',
    concept: '<code>break;</code> 會立刻跳出整個迴圈。<code>continue;</code> 只是跳過這一圈剩下的部分，直接進入下一圈。',
    goal: '撿到鑰匙就馬上停下來，鑰匙後面是岩漿。',
    variants: [
      { map: ['##########', '#H..KLLLL#', '##########'] },
      { map: ['##########', '#H.KLLLLL#', '##########'] },
      { map: ['##########', '#H....KLL#', '##########'] }
    ],
    check: ['item'],
    starter: rep(sol29, 'break;', '// 撿到鑰匙就馬上停下來'),
    solution: sol29,
    choices: [
      { code: sol29, expect: 'win', explain: '撿到鑰匙立刻跳出迴圈。' },
      { code: rep(sol29, '        break;\n', ''), expect: 'fail', explain: '撿到鑰匙後迴圈還在跑，勇者走進岩漿。' },
      { code: rep(sol29, 'break;', 'continue;'), expect: 'fail', explain: 'continue 只是跳到下一圈，迴圈沒有結束。' },
      { code: rep(sol29, '    if (OnItem())\n    {\n        PickUp();\n        break;\n    }', '    if (OnItem()) PickUp();\n    break;'), expect: 'fail', explain: 'if 沒有大括號時只管下一行，break 變成每一圈都會執行，走一步就停了。' }
    ],
    hints: ['撿到鑰匙之後要離開迴圈。', '在 PickUp(); 下一行加 break;', sol29]
  });

  /* =========================================================
   * W3 工匠小鎮
   * ========================================================= */
  const sol31 = cs`
    int[] path = ReadMap();   // 每次的地圖都不一樣
    foreach (int n in path)
    {
        MoveRight(n);
        MoveDown();
    }
  `;
  grid({
    id: '3-1', world: 3, title: '陣列與 foreach',
    concept: '<b>陣列</b>可以一次存好幾個值：<code>int[] path = { 2, 1, 3 };</code>。<code>path[0]</code> 是第一個，<code>path.Length</code> 是總共幾個。<code>foreach (int n in path)</code> 會依序把每個值拿出來放進 n，等於 Python 的 <code>for n in path:</code>。',
    goal: '照藏寶圖走：每個數字代表往右走幾格，然後往下一格。',
    variants: [
      { map: ['#########', '#H..#####', '###..####', '####....#', '#######F#', '#########'], data: { path: [2, 1, 3] } },
      { map: ['#########', '#H.######', '##....###', '#####...#', '#######F#', '#########'], data: { path: [1, 3, 2] } }
    ],
    maxMoves: 2,
    starter: cs`
      int[] path = ReadMap();   // 每次的地圖都不一樣
      // 每個數字代表：往右走幾格，然後往下一格
      MoveRight(path[0]);
      MoveDown();
    `,
    solution: sol31,
    choices: [
      { code: sol31, expect: 'win', explain: '每個數字都照著走。' },
      { code: rep(sol31, 'int n in', 'n in'), expect: 'compile:CS0230', explain: 'foreach 的變數也要寫型別。' },
      { code: rep(sol31, 'foreach (int n in path)\n{\n    MoveRight(n);', 'for (int i = 0; i < path.Count; i++)\n{\n    MoveRight(path[i]);'), expect: 'compile:CS1061', explain: '陣列的長度是 Length，List 才是 Count。' },
      { code: rep(sol31, 'MoveRight(n)', 'MoveRight()'), expect: 'fail', explain: '沒有用到 n，每次都只走一格。' }
    ],
    hints: ['用 foreach 把 path 裡的數字一個一個拿出來。', 'foreach (int n in path) { MoveRight(n); MoveDown(); }', sol31]
  });

  const sol32 = cs`
    int[] code = ReadCode();
    MoveRight();
    // 寶箱的密碼是陣列的「最後一個」數字
    Say(code[code.Length - 1]);
  `;
  grid({
    id: '3-2', world: 3, title: '索引從 0 開始',
    concept: '陣列的索引從 <b>0</b> 開始，所以最後一個是 <code>[Length - 1]</code>。用超出範圍的索引，執行時會出現 <b>IndexOutOfRangeException</b>。Python 可以用 <code>[-1]</code> 拿最後一個，C# 不行。',
    goal: '說出密碼陣列的最後一個數字，打開寶箱。',
    variants: [
      { map: ['#####', '#H.X#', '#####'], data: { code: [3, 1, 4, 1], answer: 1 } },
      { map: ['#####', '#H.X#', '#####'], data: { code: [2, 7, 1, 8, 2, 9], answer: 9 } }
    ],
    check: ['said'],
    starter: rep(sol32, 'code.Length - 1', 'code.Length'),
    solution: sol32,
    choices: [
      { code: sol32, expect: 'win', explain: '最後一個的索引是 Length - 1。' },
      { code: rep(sol32, 'code.Length - 1', 'code.Length'), expect: 'runtime:IndexOutOfRangeException', explain: '4 個元素的索引是 0 到 3，code[4] 超出範圍了。' },
      { code: rep(sol32, 'code.Length - 1', '-1'), expect: 'runtime:IndexOutOfRangeException', explain: 'Python 的習慣！C# 的陣列不支援負數索引。' },
      { code: rep(sol32, 'code.Length - 1', '3'), expect: 'fail', explain: '第一個寶箱剛好 4 個數字，但第二個有 6 個，寫死 3 就不對了。' }
    ],
    hints: ['第一個元素是 code[0]。', '最後一個元素是 code[code.Length - 1]。', sol32]
  });

  const sol33 = cs`
    List<string> bag = new List<string>();
    for (int i = 0; i < 3; i++)
    {
        MoveRight(2);
        bag.Add(PickUp());   // PickUp() 會回傳道具名稱
    }
    Debug.Log($"背包裡有 {bag.Count} 個道具");
  `;
  grid({
    id: '3-3', world: 3, title: 'List',
    concept: '<b>List</b> 是可以變長變短的陣列，最像 Python 的 list。<code>List&lt;string&gt;</code> 代表「只裝字串的 List」。<code>Add()</code> 加入、<code>Remove()</code> 移除、<code>Count</code> 是數量（陣列才用 Length）。',
    goal: '把 3 個道具都放進背包，並在 Console 印出背包裡有 3 個道具。',
    map: ['#########', '#H.I.I.I#', '#########'],
    data: { items: ['藥水', '盾牌', '地圖'] },
    check: ['items', 'logHas:3 個'],
    starter: rep(sol33, 'bag.Add(PickUp());', 'PickUp();          '),
    solution: sol33,
    choices: [
      { code: sol33, expect: 'win', explain: '撿到的道具都加進 List。' },
      { code: rep(sol33, 'bag.Add(', 'bag.add('), expect: 'compile:CS1061', explain: '方法名稱是大寫的 Add。' },
      { code: rep(sol33, 'new List<string>()', 'null'), expect: 'runtime:NullReferenceException', explain: 'bag 是 null，沒有真的建立 List，一用就出錯。' },
      { code: rep(sol33, 'bag.Add(PickUp());', 'bag = PickUp();'), expect: 'compile:CS0029', explain: 'PickUp() 回傳的是 string，不能直接指定給 List。' }
    ],
    hints: ['PickUp() 會回傳道具名稱，要把它存起來。', '用 bag.Add(...) 把東西放進 List。', sol33]
  });

  const sol34 = cs`
    void JumpPillar()
    {
        MoveUp();
        MoveRight(2);
        MoveDown();
    }

    JumpPillar();
    JumpPillar();
    JumpPillar();
  `;
  grid({
    id: '3-4', world: 3, title: 'void 方法',
    concept: '把一段常用的動作包起來、取個名字，就是<b>方法</b>。<code>void</code> 代表這個方法做完事情不回傳任何值。寫好以後，<code>JumpPillar();</code> 呼叫幾次，它就執行幾次。',
    goal: '跳過 3 根柱子。這關最多只能寫 3 個 Move 指令。',
    map: ['#########', '#.......#', '#H#.#.#F#', '#########'],
    maxMoves: 3,
    starter: cs`
      void JumpPillar()
      {
          MoveUp();
          MoveRight(2);
          MoveDown();
      }

      // 呼叫 JumpPillar() 三次
    `,
    solution: sol34,
    choices: [
      { code: sol34, expect: 'win', explain: '方法寫一次，呼叫三次。' },
      { code: sol34.replace(/JumpPillar\(\);\n/g, ''), expect: 'fail', explain: '只有寫方法、沒有呼叫，方法不會自己執行。' },
      { code: sol34.replace(/JumpPillar\(\);\n/g, 'JumpPillar;\n'), expect: 'compile:CS0201', explain: '呼叫方法要加 ()。' },
      { code: rep(sol34, 'void JumpPillar()\n{', 'void JumpPillar()').replace('    MoveDown();\n}', '    MoveDown();'), expect: 'compile:CS1514', explain: '方法的內容要用大括號包起來。' }
    ],
    hints: ['方法已經寫好了，只差呼叫。', '寫 JumpPillar(); 三行。', sol34]
  });

  const sol35 = cs`
    void Climb(int height)
    {
        MoveUp(height);
        MoveRight();
    }

    Climb(1);
    Climb(2);
    Climb(3);
  `;
  grid({
    id: '3-5', world: 3, title: '參數',
    concept: '方法可以接收<b>參數</b>：<code>void Climb(int height)</code> 代表呼叫時要給一個整數，方法裡用 height 這個名字拿到它。<code>Climb(3)</code> 時 height 就是 3。參數也要寫型別。',
    goal: '爬上高度 1、2、3 的台階。這關最多只能寫 2 個 Move 指令。',
    map: ['######', '###.F#', '###.##', '###.##', '##..##', '##.###', '#..###', '#H####', '######'],
    maxMoves: 2,
    starter: rep(sol35, 'MoveUp(height)', 'MoveUp()'),
    solution: sol35,
    choices: [
      { code: sol35, expect: 'win', explain: '每次往上爬 height 格。' },
      { code: rep(sol35, 'MoveUp(height)', 'MoveUp()'), expect: 'fail', explain: '沒有用到 height，每次都只爬 1 格。' },
      { code: rep(sol35, 'Climb(int height)', 'Climb(height)'), expect: 'compile:CS1001', explain: '參數要寫型別：int height。' },
      { code: rep(sol35, 'Climb(2);', 'Climb("2");'), expect: 'compile:CS1503', explain: '"2" 是字串，Climb 要的是 int。' }
    ],
    hints: ['參數 height 就是要往上爬幾格。', '把 MoveUp() 改成 MoveUp(height)。', sol35]
  });

  const sol36 = cs`
    bool IsSafe()
    {
        if (!IsLavaAhead())
        {
            return true;
        }
        return false;
    }

    while (!AtFlag())
    {
        if (IsSafe())
        {
            MoveRight();
        }
        else
        {
            Jump();
        }
    }
  `;
  grid({
    id: '3-6', world: 3, title: '回傳值',
    concept: '方法可以用 <code>return</code> <b>回傳</b>一個值。<code>bool IsSafe()</code> 代表它一定要回傳 bool。如果有某種情況沒有 return，就會出現 <b>CS0161</b>：not all code paths return a value。<code>Jump()</code> 不給參數時會跳 2 格。',
    goal: '修好 IsSafe()，前面安全就走、前面是岩漿就跳。',
    variants: [
      { map: ['##########', '#H.L..L.F#', '##########'] },
      { map: ['##########', '#H..L.L.F#', '##########'] }
    ],
    starter: rep(sol36, '    return false;\n', ''),
    solution: sol36,
    choices: [
      { code: sol36, expect: 'win', explain: '兩種情況都有 return。' },
      { code: rep(sol36, '    return false;\n', ''), expect: 'compile:CS0161', explain: '前面是岩漿時，方法走到結尾都沒有 return。' },
      { code: rep(sol36, 'bool IsSafe()\n{\n    if (!IsLavaAhead())\n    {\n        return true;\n    }\n    return false;\n}', 'void IsSafe()\n{\n    return !IsLavaAhead();\n}'), expect: 'compile:CS0127', explain: 'void 方法不能回傳值。' },
      { code: rep(sol36, 'if (!IsLavaAhead())', 'if (IsLavaAhead())'), expect: 'fail', explain: '條件寫反了，前面有岩漿時反而說安全。' }
    ],
    hints: ['如果前面是岩漿，IsSafe() 應該回傳什麼？', '在 if 的大括號後面加上 return false;', sol36]
  });

  const sol37 = cs`
    Slime a = new Slime("小綠", 3);
    Slime b = new Slime("小藍", 5);
    // 兩隻史萊姆的力量加起來要剛好 8 才推得動石頭
    Summon(a);
    Summon(b);
    MoveRight(5);

    public class Slime
    {
        public string name;
        public int power;

        public Slime(string name, int power)
        {
            this.name = name;
            this.power = power;
        }
    }
  `;
  grid({
    id: '3-7', world: 3, title: '類別與 new',
    concept: '<b>類別（class）</b>是藍圖，描述一種東西有哪些資料和動作。用 <code>new</code> 照著藍圖做出一個<b>物件</b>：<code>new Slime("小綠", 3)</code>。和類別同名的方法叫<b>建構子</b>，就是 Python 的 <code>__init__</code>；<code>this</code> 就是 Python 的 <code>self</code>。',
    goal: '再召喚一隻力量 5 的史萊姆，兩隻一起推開石頭（力量要剛好 8）。',
    map: ['########', '#H.R..F#', '########'],
    data: { rockPower: 8 },
    starter: rep(rep(sol37, 'Slime b = new Slime("小藍", 5);\n', ''), 'Summon(b);\n', ''),
    solution: sol37,
    choices: [
      { code: sol37, expect: 'win', explain: '3 + 5 = 8，石頭推開了。' },
      { code: rep(sol37, 'Slime b = new Slime', 'Slime b = Slime'), expect: 'compile:CS1955', explain: '用類別做出物件要加 new。' },
      { code: rep(sol37, 'new Slime("小藍", 5)', 'new Slime(5, "小藍")'), expect: 'compile:CS1503', explain: '參數的順序要和建構子一樣：先 name（string），再 power（int）。' },
      { code: rep(sol37, '"小藍", 5', '"小藍", 6'), expect: 'fail', explain: '3 + 6 = 9，力量太大了。' }
    ],
    hints: ['照著 a 的寫法再做一隻 b。', 'Slime b = new Slime("小藍", 5); 然後 Summon(b);', sol37]
  });

  /* =========================================================
   * 即時世界：共用的物件與腳本
   * ========================================================= */
  const T = {
    hero: (o) => Object.assign({ name: 'Hero', tag: 'Player', sprite: 'hero', w: 0.8, h: 0.9, align: 'bottom', script: 'Hero' }, o || {}),
    heroRb: (o) => Object.assign({ name: 'Hero', tag: 'Player', sprite: 'hero', w: 0.8, h: 0.9, rb: 'dynamic', gravity: 3, children: { GroundCheck: [0, -0.45] }, script: 'Hero' }, o || {}),
    flag: { name: 'Flag', tag: 'Finish', sprite: 'flag', w: 0.8, h: 0.9, collider: false, align: 'bottom' },
    coin: { name: 'Coin', tag: 'Coin', sprite: 'coin', w: 0.5, h: 0.5, trigger: true, size: 0.6 },
    slime: { name: 'Slime', tag: 'Enemy', sprite: 'slime', w: 0.9, h: 0.8, rb: 'kinematic', align: 'bottom' },
    target: { name: 'Target', tag: 'Target', sprite: 'target', w: 0.8, h: 0.8, trigger: true },
    ctrl: (script) => ({ name: 'GameController', collider: false, script })
  };
  const HID = {
    mover: cs`
      public class Mover : MonoBehaviour
      {
          private Rigidbody2D rb;
          void Awake() { rb = GetComponent<Rigidbody2D>(); }
          void Update() { rb.linearVelocity = new Vector2(4f, rb.linearVelocity.y); }
      }
    `
  };
  const U = {
    flagOf: (W) => W.entities.find((e) => e.tag === 'Finish'),
    reached(W) {
      const f = U.flagOf(W);
      const p = W.player;
      if (!f || !p || p.dead || p.destroyed) return false;
      return Math.abs(p.x - f.x) < (p.w + f.w) / 2 && Math.abs(p.y - f.y) < (p.h + f.h) / 2;
    },
    count: (W, tag) => W.entities.filter((e) => !e.destroyed && e.tag === tag).length,
    logs: (W) => W.logs.filter((l) => l.kind === 'log').map((l) => l.text),
    warns: (W) => W.logs.filter((l) => l.kind === 'warn').map((l) => l.text),
    res: (ok, msg) => (ok ? { ok: true } : { ok: false, msg })
  };
  const reachCheck = (W) => {
    if (W.player && W.player.dead) return { ok: false, msg: '勇者' + (W.player.deathReason || '倒下了') };
    return U.res(U.reached(W), '勇者沒有走到旗子');
  };

  /* =========================================================
   * W4 Unity 入口
   * ========================================================= */
  const scene4 = (dur) => ({
    tiles: ['..............', '..............', '..............', '.P..........F.', '##############'],
    entities: { P: T.hero(), F: T.flag },
    duration: dur || 3
  });

  const sol41 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        void Start()
        {
            Debug.Log("遊戲開始！");
        }

        void Update()
        {
        }
    }
  `;
  const start41 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        void Start()
        {
        }

        void Update()
        {
            Debug.Log("遊戲開始！");
        }
    }
  `;
  unity({
    id: '4-1', world: 4, title: 'Start 和 Update',
    concept: 'Unity 會在對的時機<b>自動呼叫</b>你的方法：<code>Start()</code> 在遊戲開始時執行<b>一次</b>；<code>Update()</code> <b>每一幀</b>都執行，一秒大約 60 次。名稱大小寫要完全正確，Unity 才找得到。',
    goal: '在 Console 印出「遊戲開始！」，而且只印一次。',
    scene: scene4(2),
    starter: start41,
    solution: sol41,
    check: (W) => {
      const l = U.logs(W);
      if (l.length === 1 && l[0] === '遊戲開始！') return { ok: true };
      if (l.length > 1) return { ok: false, msg: `「遊戲開始！」印了 ${l.length} 次，應該只印一次` };
      return { ok: false, msg: 'Console 沒有印出「遊戲開始！」' };
    },
    choices: [
      { code: sol41, expect: 'win', explain: 'Start 只執行一次。' },
      { code: start41, expect: 'fail', explain: '寫在 Update 裡，每一幀都印一次，Console 被洗版了。' },
      { code: rep(sol41, 'void Start()', 'void start()'), expect: 'fail', explain: 'start 小寫，Unity 找不到它，所以從來沒有執行。' },
      { code: rep(sol41, '"遊戲開始！");', '"遊戲開始！")'), expect: 'compile:CS1002', explain: '少了分號。' }
    ],
    hints: ['只想執行一次的程式要放在哪個方法？', '把 Debug.Log 從 Update 搬到 Start。', sol41]
  });

  const sol42 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        void Update()
        {
            // 每一幀把勇者往右移動一點點
            transform.position += new Vector3(0.1f, 0f, 0f);
        }
    }
  `;
  unity({
    id: '4-2', world: 4, title: '每幀移動',
    concept: '<code>transform.position</code> 是物件的位置，型別是 <code>Vector3</code>（x、y、z 三個數字）。在 <code>Update()</code> 裡每一幀加一點點，物件就會動起來。position 不能只改 x，要整個指定一個新的 Vector3。',
    goal: '讓勇者往右走到旗子。',
    scene: scene4(3),
    starter: rep(sol42, '        transform.position += new Vector3(0.1f, 0f, 0f);\n', ''),
    solution: sol42,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol42, expect: 'win', explain: '每一幀往右 0.1 格。' },
      { code: rep(sol42, 'transform.position += new Vector3(0.1f, 0f, 0f);', 'transform.position.x += 0.1f;'), expect: 'compile:CS1612', explain: 'position 是一整個 Vector3，不能只改它的 x。' },
      { code: rep(sol42, 'void Update()', 'void Start()'), expect: 'fail', explain: 'Start 只執行一次，勇者只動了 0.1 格。' },
      { code: rep(sol42, '+=', '='), expect: 'fail', explain: '用 = 是「設定成」(0.1, 0, 0)，每一幀都被放回同一個位置。' }
    ],
    hints: ['在 Update 裡改 transform.position。', '用 += 加上一個 new Vector3(0.1f, 0f, 0f)。', sol42]
  });

  const sol43 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 0.1f;

        void Update()
        {
            transform.position += new Vector3(speed, 0f, 0f);
        }
    }
  `;
  unity({
    id: '4-3', world: 4, title: 'SerializeField',
    concept: '加上 <code>[SerializeField]</code> 的欄位會出現在右邊的 <b>Inspector</b>，不用改程式就能調數值（public 欄位也會出現）。注意：一旦在 Inspector 存了數值，Inspector 的值會<b>優先</b>於程式碼裡的預設值。',
    goal: '讓 speed 出現在 Inspector，調整它，讓勇者在 3 秒內走到旗子。',
    scene: scene4(3),
    rules: [{ re: '\\[SerializeField\\]', msg: 'speed 要加上 [SerializeField]，才會出現在 Inspector。' }],
    starter: rep(sol43, '[SerializeField] private float speed = 0.1f;', 'private float speed = 0.02f;'),
    solution: sol43,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol43, expect: 'win', explain: 'speed 出現在 Inspector，數值也夠快。' },
      { code: rep(sol43, '0.1f;', '0.1;'), expect: 'compile:CS0664', explain: 'float 要加 f。' },
      { code: rep(sol43, 'SerializeField', 'SerializeFeild'), expect: 'compile:CS0246', explain: 'SerializeField 拼錯了（Field 不是 Feild）。' },
      { code: rep(sol43, '[SerializeField] ', ''), expect: 'fail', explain: '勇者走到了，但 speed 是 private，Inspector 看不到它。這關要練習用 Inspector 調數值。' }
    ],
    hints: ['在 private 前面加上 [SerializeField]。', '執行一次後，Inspector 會出現 Speed，把它改成 0.1。', sol43]
  });

  const sol44 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        private SpriteRenderer sr;

        void Awake()
        {
            sr = GetComponent<SpriteRenderer>();
        }

        void Start()
        {
            sr.color = Color.red;
        }
    }
  `;
  unity({
    id: '4-4', world: 4, title: 'GetComponent',
    concept: '物件身上的每個功能都是一個<b>元件（Component）</b>，例如負責畫圖的 <code>SpriteRenderer</code>。要用它之前，先用 <code>GetComponent&lt;SpriteRenderer&gt;()</code> 把它找出來存進變數。忘了這一步，變數是 null，就會出現 Unity 最常見的錯誤 <b>NullReferenceException</b>。',
    goal: '把勇者變成紅色，而且 Console 不能有紅字。',
    scene: scene4(0.5),
    starter: rep(sol44, '    void Awake()\n    {\n        sr = GetComponent<SpriteRenderer>();\n    }\n\n', ''),
    solution: sol44,
    check: (W) => {
      const c = W.player.color;
      return U.res(c.r === 1 && c.g === 0 && c.b === 0, '勇者不是紅色的');
    },
    choices: [
      { code: sol44, expect: 'win', explain: '先在 Awake 找到 SpriteRenderer，Start 再改顏色。' },
      { code: rep(sol44, '    void Awake()\n    {\n        sr = GetComponent<SpriteRenderer>();\n    }\n\n', ''), expect: 'runtime:NullReferenceException', explain: 'sr 從來沒有被指定，是 null。' },
      { code: rep(sol44, 'GetComponent<SpriteRenderer>()', 'GetComponent<Rigidbody2D>()'), expect: 'compile:CS0029', explain: '找的是 Rigidbody2D，不能放進 SpriteRenderer 變數。' },
      { code: rep(sol44, 'GetComponent<SpriteRenderer>()', 'new SpriteRenderer()'), expect: 'fail', explain: 'new 出來的是一個新的元件，沒有裝在勇者身上，改它的顏色勇者不會變。' }
    ],
    hints: ['sr 是空的，要先找到勇者身上的 SpriteRenderer。', '加一個 Awake 方法：sr = GetComponent<SpriteRenderer>();', sol44]
  });

  const sol45 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        void Update()
        {
            transform.position += new Vector3(0.1f, 0f, 0f);
        }
    }
  `;
  unity({
    id: '4-5', world: 4, title: '沒有錯誤的 bug',
    concept: 'Unity 是用<b>名字</b>找 <code>Start</code>、<code>Update</code> 這些方法的。打成 <code>update()</code> 不會有任何錯誤訊息，但 Unity 找不到它，所以永遠不會執行。這是最難發現的 bug 之一。',
    goal: '找出勇者為什麼不會動。',
    scene: scene4(3),
    starter: rep(sol45, 'void Update()', 'void update()'),
    solution: sol45,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol45, expect: 'win', explain: 'Update 的 U 大寫。' },
      { code: rep(sol45, 'void Update()', 'void update()'), expect: 'fail', explain: '小寫的 update，Unity 不認得。' },
      { code: rep(sol45, 'void Update()', 'void Update'), expect: 'compile:CS0547', explain: '少了 ()，C# 以為你在寫屬性。' },
      { code: rep(sol45, 'void Update()', 'void UpDate()'), expect: 'fail', explain: 'UpDate 的 D 大寫了，也不對。' }
    ],
    hints: ['程式沒有錯誤，但 Update 裡的程式從來沒有執行。', '仔細看方法的名字。', sol45]
  });

  /* =========================================================
   * W5 操作訓練場
   * ========================================================= */
  const sol51 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 4f;

        void Update()
        {
            transform.position += new Vector3(speed * Time.deltaTime, 0f, 0f);
        }
    }
  `;
  unity({
    id: '5-1', world: 5, title: 'Time.deltaTime',
    concept: '<code>Time.deltaTime</code> 是「上一幀花了幾秒」。不同電腦一秒的幀數不同，每幀移動固定距離的話，快的電腦就跑得快。乘上 deltaTime 以後，<code>speed</code> 的意思變成「每秒移動幾格」，任何電腦都一樣快。',
    goal: '60 FPS 和 144 FPS 兩台電腦上的勇者要一樣快，同時抵達旗子。',
    scene: { tiles: ['..............', '..............', '.P.......F....', '##############'], entities: { P: T.hero(), F: T.flag }, duration: 2.5, race: [60, 144] },
    starter: rep(sol51, 'speed * Time.deltaTime', '0.07f'),
    solution: sol51,
    noInspector: false,
    check: (W, worlds) => {
      const a = worlds[0].player, b = worlds[1].player;
      const f = U.flagOf(worlds[0]);
      if (a.x < f.x - 0.3 || b.x < f.x - 0.3) return { ok: false, msg: '有一台電腦的勇者沒有走到旗子' };
      const d = Math.abs(a.x - b.x);
      return U.res(d < 0.3, `兩台電腦的勇者差了 ${d.toFixed(1)} 格`);
    },
    choices: [
      { code: sol51, expect: 'win', explain: '每秒 4 格，兩台電腦一樣快。' },
      { code: rep(sol51, 'speed * Time.deltaTime', '0.07f'), expect: 'fail', explain: '每幀 0.07 格，144 FPS 的電腦一秒跑了 144 次，快了 2.4 倍。' },
      { code: rep(sol51, 'Time.deltaTime', 'Time.fixedDeltaTime'), expect: 'fail', explain: 'fixedDeltaTime 是固定的 0.02 秒，不是這一幀真正花的時間。' },
      { code: rep(sol51, 'speed * Time.deltaTime', 'speed / Time.deltaTime'), expect: 'fail', explain: '應該乘，不是除。除以一個很小的數字會變得非常快。' }
    ],
    hints: ['兩台電腦一秒執行 Update 的次數不同。', '把移動量改成 speed * Time.deltaTime。', sol51]
  });

  const keyScene = (row, extra) => Object.assign({
    tiles: ['..............', '..............', row, '##############'],
    entities: { P: T.hero(), F: T.flag }
  }, extra);
  const sol52 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 5f;

        void Update()
        {
            // 按住 D 鍵時往右走
            if (Keyboard.current.dKey.isPressed)
            {
                transform.position += new Vector3(speed * Time.deltaTime, 0f, 0f);
            }
        }
    }
  `;
  unity({
    id: '5-2', world: 5, title: '讀取鍵盤',
    concept: 'Unity 6 用 <b>Input System</b> 讀鍵盤，檔案最上面要加 <code>using UnityEngine.InputSystem;</code>。<code>Keyboard.current.dKey.isPressed</code> 在按住 D 鍵的每一幀都是 true。按「執行」時會自動幫你按住 D；也可以按「自己玩」用鍵盤操作。',
    goal: '按住 D 鍵時勇者往右走，走到旗子。',
    scene: keyScene('.P........F...', { duration: 3.5, input: [[0.2, 3.4, 'd']] }),
    keys: ['d'],
    starter: rep(sol52, '        if (Keyboard.current.dKey.isPressed)\n        {\n            transform.position += new Vector3(speed * Time.deltaTime, 0f, 0f);\n        }\n', ''),
    solution: sol52,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol52, expect: 'win', explain: '按住 D 的每一幀都往右走。' },
      { code: rep(sol52, 'using UnityEngine.InputSystem;\n', ''), expect: 'compile:CS0103', explain: '少了 using UnityEngine.InputSystem;，C# 找不到 Keyboard。' },
      { code: rep(sol52, 'dKey', 'DKey'), expect: 'compile:CS1061', explain: '按鍵名稱是小寫開頭：dKey。' },
      { code: rep(sol52, 'isPressed', 'wasPressedThisFrame'), expect: 'fail', explain: 'wasPressedThisFrame 只有剛按下那一幀是 true，按住不放也只會走一小步。' }
    ],
    hints: ['用 if 判斷 D 鍵有沒有被按住。', 'if (Keyboard.current.dKey.isPressed) { ... }', sol52]
  });

  const presses = [];
  for (let k = 0; k < 5; k++) presses.push([0.2 + k * 0.3, 0.35 + k * 0.3, 'space']);
  const sol53 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        void Update()
        {
            // 每按一次空白鍵，往右跳一格
            if (Keyboard.current.spaceKey.wasPressedThisFrame)
            {
                transform.position += new Vector3(1f, 0f, 0f);
            }
        }
    }
  `;
  unity({
    id: '5-3', world: 5, title: 'wasPressedThisFrame',
    concept: '<code>isPressed</code> 是「按住期間每一幀」都是 true；<code>wasPressedThisFrame</code> 只有「剛按下的那一幀」是 true。跳躍、射擊這種按一下做一次的動作，要用 wasPressedThisFrame。',
    goal: '按 5 下空白鍵，每按一下往右跳一格，剛好停在旗子上（旗子後面是岩漿）。',
    scene: keyScene('..P....F~~~~~~', { duration: 2.2, input: presses }),
    keys: ['space'],
    starter: rep(sol53, 'wasPressedThisFrame', 'isPressed'),
    solution: sol53,
    check: (W) => {
      if (W.player.dead) return { ok: false, msg: '勇者' + W.player.deathReason };
      return U.res(U.reached(W), '勇者沒有停在旗子上');
    },
    choices: [
      { code: sol53, expect: 'win', explain: '按一下只跳一格。' },
      { code: rep(sol53, 'wasPressedThisFrame', 'isPressed'), expect: 'fail', explain: '按住的每一幀都跳一格，按一下就跳了好幾格，掉進岩漿。' },
      { code: rep(sol53, 'spaceKey', 'space'), expect: 'compile:CS1061', explain: '空白鍵的名字是 spaceKey。' },
      { code: rep(sol53, 'wasPressedThisFrame)', 'wasPressedThisFrame);'), expect: 'fail', explain: 'if 後面多了分號，大括號裡的程式每一幀都會執行。' }
    ],
    hints: ['isPressed 在按住期間每一幀都是 true。', '改用 wasPressedThisFrame。', sol53]
  });

  const sol54 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 4f;

        void Update()
        {
            var kb = Keyboard.current;
            float x = 0f;
            float y = 0f;
            if (kb.aKey.isPressed) x -= 1f;
            if (kb.dKey.isPressed) x += 1f;
            if (kb.sKey.isPressed) y -= 1f;
            if (kb.wKey.isPressed) y += 1f;

            Vector3 dir = new Vector3(x, y, 0f).normalized;
            transform.position += dir * speed * Time.deltaTime;
        }
    }
  `;
  unity({
    id: '5-4', world: 5, title: 'normalized',
    concept: '同時按右和上，方向是 (1, 1)，長度是 1.414，所以斜著走比直走快 41%。<code>.normalized</code> 會把向量長度變成 1、方向不變，速度就一致了。',
    goal: '斜著走（同時按 W 和 D）時，速度不能超過每秒 4 格。',
    scene: {
      tiles: ['..............', '..............', '..............', '..............', '..............', '.P............', '##############'],
      entities: { P: T.hero() }, duration: 1.6, input: [[0.2, 1.5, 'w'], [0.2, 1.5, 'd']], showSpeed: true, speedLimit: 4
    },
    keys: ['w', 'a', 's', 'd'],
    starter: rep(sol54, 'new Vector3(x, y, 0f).normalized', 'new Vector3(x, y, 0f)'),
    solution: sol54,
    check: (W) => {
      if (W.player.x < W.startX + 2) return { ok: false, msg: '勇者沒有移動' };
      return U.res(W.stats.maxSpeed <= 4.05, `斜走時速度是每秒 ${W.stats.maxSpeed.toFixed(2)} 格，超過 4 了`);
    },
    choices: [
      { code: sol54, expect: 'win', explain: '方向的長度固定是 1。' },
      { code: rep(sol54, 'new Vector3(x, y, 0f).normalized', 'new Vector3(x, y, 0f)'), expect: 'fail', explain: '(1, 1) 的長度是 1.414，斜走速度變成每秒 5.66 格。' },
      { code: rep(sol54, '.normalized', '.normalize'), expect: 'compile:CS1061', explain: '屬性名稱是 normalized。' },
      { code: rep(sol54, 'new Vector3(x, y, 0f).normalized', 'new Vector3(x, y, 0f).Normalize()'), expect: 'compile:CS0029', explain: 'Normalize() 是直接修改自己、不回傳值（void）的方法，不能放進變數。' }
    ],
    hints: ['方向向量 (1, 1) 太長了。', '在 new Vector3(x, y, 0f) 後面加上 .normalized。', sol54]
  });

  const sol55 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 5f;

        void Update()
        {
            float x = 0f;
            if (Keyboard.current.aKey.isPressed) x -= 1f;
            if (Keyboard.current.dKey.isPressed) x += 1f;
            transform.position += new Vector3(x * speed * Time.deltaTime, 0f, 0f);

            // 不讓勇者的 x 超出 1.5 到 11.5
            Vector3 p = transform.position;
            p.x = Mathf.Clamp(p.x, 1.5f, 11.5f);
            transform.position = p;
        }
    }
  `;
  unity({
    id: '5-5', world: 5, title: 'Mathf.Clamp',
    concept: '<code>Mathf.Clamp(值, 最小, 最大)</code> 會把值「夾」在範圍裡，並<b>回傳</b>夾好的結果，記得要接住回傳值。position 是一整個 Vector3，要先複製到變數 <code>p</code>，改完 <code>p.x</code> 再整個指定回去。',
    goal: '一直按住 D，勇者也不能超過 x = 11.5（右邊是岩漿）。',
    scene: keyScene('......P.....~~', { duration: 2.5, input: [[0.1, 2.4, 'd']] }),
    keys: ['a', 'd'],
    starter: rep(sol55, '        Vector3 p = transform.position;\n        p.x = Mathf.Clamp(p.x, 1.5f, 11.5f);\n        transform.position = p;\n', ''),
    solution: sol55,
    check: (W) => {
      if (W.player.dead) return { ok: false, msg: '勇者' + W.player.deathReason };
      return U.res(W.player.x > 11, '勇者沒有走到右邊的邊界');
    },
    choices: [
      { code: sol55, expect: 'win', explain: '每一幀都把 x 夾回範圍內。' },
      { code: rep(sol55, '        Vector3 p = transform.position;\n        p.x = Mathf.Clamp(p.x, 1.5f, 11.5f);\n        transform.position = p;\n', '        transform.position.x = Mathf.Clamp(transform.position.x, 1.5f, 11.5f);\n'), expect: 'compile:CS1612', explain: '不能直接改 position.x。' },
      { code: rep(sol55, 'p.x = Mathf.Clamp', 'Mathf.Clamp'), expect: 'fail', explain: 'Clamp 回傳的結果沒有存起來，等於什麼都沒做。' },
      { code: rep(sol55, '        transform.position = p;\n', ''), expect: 'fail', explain: '只改了 p 這個複製品，沒有把它指定回 transform.position。' }
    ],
    hints: ['先 Vector3 p = transform.position;', 'p.x = Mathf.Clamp(p.x, 1.5f, 11.5f); 最後 transform.position = p;', sol55]
  });

  /* =========================================================
   * W6 重力山谷
   * ========================================================= */
  const sol61 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 5f;
        private Rigidbody2D rb;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        void Update()
        {
            float x = 0f;
            if (Keyboard.current.aKey.isPressed) x -= 1f;
            if (Keyboard.current.dKey.isPressed) x += 1f;
            rb.linearVelocity = new Vector2(x * speed, rb.linearVelocity.y);
        }
    }
  `;
  unity({
    id: '6-1', world: 6, title: 'linearVelocity',
    concept: '加了 <code>Rigidbody2D</code> 的物件交給物理引擎管：會受重力、會被地板擋住。這時不要直接改 position，而是設定速度 <code>rb.linearVelocity</code>（Unity 6 的名字，舊版叫 velocity）。只想改左右速度時，y 要保留原本的值，不然重力會失效。',
    goal: '往右走下高台，走到下面的旗子。',
    scene: {
      tiles: ['................', '................', '.P..............', '######..........', '######..........', '######..........', '######.......F..', '################'],
      entities: { P: T.heroRb(), F: T.flag }, duration: 4, input: [[0.2, 3.9, 'd']]
    },
    keys: ['a', 'd'],
    starter: rep(sol61, 'rb.linearVelocity.y)', '0f)'),
    solution: sol61,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol61, expect: 'win', explain: 'x 由按鍵決定，y 保留給重力。' },
      { code: rep(sol61, 'rb.linearVelocity.y)', '0f)'), expect: 'fail', explain: '每一幀都把 y 速度設成 0，重力剛加上去就被清掉，勇者飄在空中慢慢往下。' },
      { code: rep(sol61, 'rb.linearVelocity = new Vector2(x * speed, rb.linearVelocity.y);', 'rb.linearVelocity.x = x * speed;'), expect: 'compile:CS1612', explain: 'linearVelocity 也是屬性，不能只改它的 x。' },
      { code: rep(rep(sol61, 'rb.linearVelocity = ', 'rb.velocity = '), 'rb.linearVelocity.y', 'rb.velocity.y'), expect: 'win', correct: true, explain: '可以動，但 Console 有黃色警告：velocity 在 Unity 6 已經改名成 linearVelocity。' }
    ],
    hints: ['重力是靠 y 方向的速度在作用。', '把 0f 改成 rb.linearVelocity.y。', sol61]
  });

  const sol62 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float speed = 5f;
        [SerializeField] private float jumpForce = 13f;
        private Rigidbody2D rb;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        void Update()
        {
            float x = 0f;
            if (Keyboard.current.dKey.isPressed) x += 1f;
            rb.linearVelocity = new Vector2(x * speed, rb.linearVelocity.y);

            if (Keyboard.current.spaceKey.wasPressedThisFrame)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            }
        }
    }
  `;
  unity({
    id: '6-2', world: 6, title: '跳躍',
    concept: '跳躍就是瞬間給一個往上的速度：把 <code>linearVelocity</code> 的 y 設成 jumpForce，x 保持不變。之後重力會自動把勇者拉回地面。',
    goal: '跳過兩格高的牆，走到旗子。',
    scene: {
      tiles: ['................', '................', '................', '................', '........#.......', '.P......#....F..', '################'],
      entities: { P: T.heroRb(), F: T.flag }, duration: 3.5, input: [[0.2, 3.4, 'd'], [1.17, 1.3, 'space']]
    },
    keys: ['d', 'space'],
    starter: rep(sol62, '            rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);\n', '            // 跳起來\n'),
    solution: sol62,
    done: U.reached,
    check: reachCheck,
    choices: [
      { code: sol62, expect: 'win', explain: '往上的速度 13，跳得過牆。' },
      { code: rep(sol62, 'rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);', 'rb.linearVelocity.y = jumpForce;'), expect: 'compile:CS1612', explain: '不能只改 linearVelocity 的 y，要整個指定新的 Vector2。' },
      { code: rep(sol62, 'rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);', 'rb.AddForce(Vector2.up * jumpForce);'), expect: 'fail', explain: 'AddForce 預設是持續的「力」，只推一幀幾乎沒效果。要瞬間跳起來可以用 ForceMode2D.Impulse。' },
      { code: rep(sol62, 'jumpForce = 13f', 'jumpForce = 3f'), expect: 'fail', explain: '跳躍力太小，跳不過牆。' }
    ],
    hints: ['按下空白鍵時，改變 y 方向的速度。', 'rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);', sol62]
  });

  const spam = [];
  for (let t = 0.3; t < 3; t += 0.25) spam.push([t, t + 0.08, 'space']);
  const sol63 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private float jumpForce = 12f;
        [SerializeField] private Transform groundCheck;
        [SerializeField] private LayerMask groundLayer;
        private Rigidbody2D rb;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        bool IsGrounded()
        {
            return Physics2D.OverlapCircle(groundCheck.position, 0.15f, groundLayer) != null;
        }

        void Update()
        {
            if (Keyboard.current.spaceKey.wasPressedThisFrame && IsGrounded())
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            }
        }
    }
  `;
  unity({
    id: '6-3', world: 6, title: '地面檢測',
    concept: '如果不檢查「腳有沒有踩在地上」，在空中一直按空白鍵就能一直往上飛。<code>Physics2D.OverlapCircle(位置, 半徑, 圖層)</code> 會在腳底畫一個小圓，回傳碰到的 Collider，碰不到就是 null。記得指定只找 Ground 圖層，不然會偵測到自己。',
    goal: '空白鍵會被一直連按。只有站在地上才能跳，不要撞到天花板的尖刺。',
    scene: {
      tiles: ['............', '############', '^^^^^^^^^^^^', '............', '............', '............', '.....P......', '############'],
      entities: { P: T.heroRb() }, duration: 3.2, input: spam,
      inspector: { Hero: { groundCheck: { ref: 'GroundCheck' }, groundLayer: { layer: 'Ground' } } }
    },
    keys: ['space'],
    starter: rep(sol63, 'Physics2D.OverlapCircle(groundCheck.position, 0.15f, groundLayer) != null;', 'true;   // 這裡要改成真的檢查腳底有沒有地板'),
    solution: sol63,
    check: (W) => {
      if (W.player.dead) return { ok: false, msg: '勇者' + W.player.deathReason };
      const maxY = Math.max(...W.stats.path.map((p) => p[1]));
      return U.res(maxY > 2.4, '勇者一次都沒有跳起來');
    },
    choices: [
      { code: sol63, expect: 'win', explain: '只有腳底碰到 Ground 圖層才能跳。' },
      { code: rep(sol63, 'Physics2D.OverlapCircle(groundCheck.position, 0.15f, groundLayer) != null;', 'true;'), expect: 'fail', explain: '永遠當作在地上，空中連按一直往上飛，撞到尖刺。' },
      { code: rep(sol63, '0.15f, groundLayer)', '0.15f)'), expect: 'fail', explain: '沒有指定圖層，小圓碰到勇者自己的 Collider，永遠以為站在地上。' },
      { code: rep(sol63, 'groundCheck.position', 'transform.position'), expect: 'fail', explain: 'transform.position 是勇者的中心點，離地面太遠，永遠偵測不到地板，所以跳不起來。' }
    ],
    hints: ['IsGrounded() 現在永遠回傳 true。', '用 Physics2D.OverlapCircle 檢查 groundCheck 的位置。', sol63]
  });

  const sol64 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        private int coins = 0;

        // 碰到 Trigger 時 Unity 會自動呼叫這個方法
        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                coins++;
                Debug.Log($"撿到金幣！目前 {coins} 枚");
                Destroy(other.gameObject);
            }
        }
    }
  `;
  unity({
    id: '6-4', world: 6, title: 'OnTriggerEnter2D',
    concept: '金幣的 Collider 勾了 <b>Is Trigger</b>，勇者會穿過它，同時 Unity 呼叫 <code>OnTriggerEnter2D(Collider2D other)</code>，other 就是碰到的那個東西。名稱和參數型別都要有 <b>2D</b>，寫成 3D 版本 Unity 不會呼叫，也不會報錯。',
    goal: '勇者會自動往右走，把 3 枚金幣都撿起來（碰到就刪掉金幣）。',
    hidden: HID.mover,
    scene: {
      tiles: ['................', '................', '.P..C..C..C.....', '################'],
      entities: { P: T.heroRb({ scripts: ['Hero', 'Mover'] }), C: T.coin }, duration: 3.2
    },
    starter: rep(sol64, '        if (other.CompareTag("Coin"))\n        {\n            coins++;\n            Debug.Log($"撿到金幣！目前 {coins} 枚");\n            Destroy(other.gameObject);\n        }\n', ''),
    solution: sol64,
    check: (W) => U.res(U.count(W, 'Coin') === 0, `還有 ${U.count(W, 'Coin')} 枚金幣沒被撿走`),
    choices: [
      { code: sol64, expect: 'win', explain: '碰到 Tag 是 Coin 的物件就刪掉它。' },
      { code: rep(sol64, 'OnTriggerEnter2D(Collider2D other)', 'OnTriggerEnter(Collider other)'), expect: 'fail', explain: '這是 3D 物理用的方法，2D 遊戲裡永遠不會被呼叫。' },
      { code: rep(rep(sol64, 'OnTriggerEnter2D(Collider2D other)', 'OnTriggerEnter2D(Collision2D other)'), 'other.CompareTag("Coin")', 'other.gameObject.CompareTag("Coin")'), expect: 'fail', explain: '參數型別錯了，Unity 只會在 Console 抱怨，不會呼叫它。' },
      { code: rep(sol64, 'Destroy(other.gameObject);', 'Destroy(other);'), expect: 'fail', explain: 'other 是 Collider2D 元件，Destroy(other) 只刪掉了碰撞框，金幣還留在畫面上。' }
    ],
    hints: ['用 other.CompareTag("Coin") 判斷碰到的是不是金幣。', 'Destroy(other.gameObject) 刪掉整個金幣物件。', sol64]
  });

  const sol65 = cs`
    using UnityEngine;

    public class Hero : MonoBehaviour
    {
        // 實體碰撞（會被擋住）
        void OnCollisionEnter2D(Collision2D collision)
        {
            if (collision.gameObject.CompareTag("Enemy"))
            {
                Debug.Log("撞到史萊姆了！");
            }
        }

        // Trigger（會穿過去）
        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                Debug.Log("撿到金幣");
                Destroy(other.gameObject);
            }
        }
    }
  `;
  unity({
    id: '6-5', world: 6, title: 'Collision 和 Trigger',
    concept: '兩種碰撞事件：<b>Collision</b> 是實體碰撞，會被擋住或彈開，用 <code>OnCollisionEnter2D(Collision2D c)</code>；<b>Trigger</b> 會穿過去，只負責偵測，用 <code>OnTriggerEnter2D(Collider2D other)</code>。史萊姆是實體，金幣是 Trigger。',
    goal: '撿到金幣時印出「撿到金幣」，撞到史萊姆時印出「撞到史萊姆了！」。',
    hidden: HID.mover,
    scene: {
      tiles: ['..............', '..............', '.P...C....S...', '##############'],
      entities: { P: T.heroRb({ scripts: ['Hero', 'Mover'] }), C: T.coin, S: T.slime }, duration: 3
    },
    starter: rep(rep(rep(sol65, '"Enemy"', '"__A__"'), '"Coin"', '"Enemy"'), '"__A__"', '"Coin"'),
    solution: sol65,
    check: (W) => {
      const l = U.logs(W);
      if (!l.includes('撿到金幣')) return { ok: false, msg: '沒有印出「撿到金幣」' };
      return U.res(l.some((x) => x.includes('撞到史萊姆')), '沒有印出「撞到史萊姆了！」');
    },
    choices: [
      { code: sol65, expect: 'win', explain: '史萊姆用 Collision，金幣用 Trigger。' },
      { code: rep(rep(rep(sol65, '"Enemy"', '"__A__"'), '"Coin"', '"Enemy"'), '"__A__"', '"Coin"'), expect: 'fail', explain: 'Tag 放反了：金幣是 Trigger，不會觸發 Collision。' },
      { code: rep(sol65, 'OnCollisionEnter2D(Collision2D collision)', 'OnCollisionEnter2D(Collider2D collision)'), expect: 'fail', explain: 'OnCollisionEnter2D 的參數必須是 Collision2D，型別錯了 Unity 不會呼叫。' },
      { code: rep(sol65, 'void OnCollisionEnter2D(Collision2D collision)\n    {\n        if (collision.gameObject.CompareTag("Enemy"))', 'void OnTriggerStay2D(Collider2D collision)\n    {\n        if (collision.CompareTag("Enemy"))'), expect: 'fail', explain: '史萊姆不是 Trigger，所有 Trigger 方法都不會因為它被呼叫。' }
    ],
    hints: ['史萊姆是實體，用哪一種事件？', '兩個方法裡的 Tag 放反了。', sol65]
  });

  /* =========================================================
   * W7 兵工廠
   * ========================================================= */
  const bulletHidden = cs`
    public class Bullet : MonoBehaviour
    {
        void Update()
        {
            transform.position += new Vector3(12f * Time.deltaTime, 0f, 0f);
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Target"))
            {
                TargetHealth t = other.GetComponent<TargetHealth>();
                if (t != null) t.Hit();
                else Destroy(other.gameObject);
                Destroy(gameObject);
            }
        }
    }

    public class TargetHealth : MonoBehaviour
    {
        [SerializeField] private int hp = 6;
        public void Hit()
        {
            hp--;
            if (hp <= 0) Destroy(gameObject);
        }
    }
  `;
  const bulletPrefab = { name: 'Bullet', tag: 'Bullet', sprite: 'bullet', w: 0.3, h: 0.2, trigger: true, rb: 'kinematic', size: 0.5, scripts: ['Bullet'] };

  const sol71 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private GameObject bulletPrefab;
        [SerializeField] private Transform firePoint;

        void Update()
        {
            if (Keyboard.current.jKey.wasPressedThisFrame)
            {
                // 在 firePoint 的位置生成一顆子彈
                Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);
            }
        }
    }
  `;
  unity({
    id: '7-1', world: 7, title: 'Instantiate',
    concept: '<b>Prefab</b> 是做好的物件藍圖，像是子彈、金幣、敵人。<code>Instantiate(prefab, 位置, 旋轉)</code> 會照著藍圖在場景裡生出一個新的物件。<code>Quaternion.identity</code> 代表不旋轉。',
    goal: '按 J 射擊，打倒 3 個標靶。',
    hidden: bulletHidden,
    scene: {
      tiles: ['................', '................', '.P.....T..T..T..', '################'],
      entities: { P: T.hero({ children: { FirePoint: [0.55, 0] } }), T: T.target },
      prefabs: { Bullet: bulletPrefab },
      inspector: { Hero: { bulletPrefab: { prefab: 'Bullet' }, firePoint: { ref: 'FirePoint' } } },
      duration: 3, input: [[0.3, 0.38, 'j'], [0.8, 0.88, 'j'], [1.3, 1.38, 'j']]
    },
    keys: ['j'],
    starter: rep(sol71, '            Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);\n', ''),
    solution: sol71,
    check: (W) => U.res(U.count(W, 'Target') === 0, `還有 ${U.count(W, 'Target')} 個標靶`),
    choices: [
      { code: sol71, expect: 'win', explain: '子彈從 firePoint 的位置射出。' },
      { code: rep(sol71, 'Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);', 'Instantiate(bulletPrefab);'), expect: 'fail', explain: '沒有指定位置，子彈生在 Prefab 原本的位置 (0, 0)，也就是地底下。' },
      { code: rep(sol71, 'Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);', 'bulletPrefab.SetActive(true);'), expect: 'fail', explain: 'Prefab 是藍圖，不在場景裡，啟用它不會生出任何東西。' },
      { code: rep(sol71, 'Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);', 'new GameObject(bulletPrefab);'), expect: 'compile:CS1503', explain: 'new GameObject() 是建立一個空物件，括號裡要放名稱（字串）。複製 Prefab 要用 Instantiate。' }
    ],
    hints: ['用 Instantiate 生成子彈。', 'Instantiate(bulletPrefab, firePoint.position, Quaternion.identity);', sol71]
  });

  const sol72 = cs`
    using UnityEngine;

    public class Bullet : MonoBehaviour
    {
        [SerializeField] private float speed = 12f;

        void Start()
        {
            // 讓子彈 1 秒後自己消失
            Destroy(gameObject, 1f);
        }

        void Update()
        {
            transform.position += new Vector3(speed * Time.deltaTime, 0f, 0f);
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Target"))
            {
                Destroy(other.gameObject);
            }
        }
    }
  `;
  unity({
    id: '7-2', world: 7, title: 'Destroy',
    file: 'Bullet.cs',
    concept: '生出來的物件如果不刪掉，會一直留在場景裡越積越多，遊戲就越來越卡。<code>Destroy(gameObject, 1f)</code> 會在 1 秒後刪除這個物件。注意 <code>Destroy(this)</code> 只會刪掉這個腳本元件，物件本身還在。',
    goal: '機關槍每 0.1 秒自動射一發。讓子彈 1 秒後消失，場景物件數不能超過 25 個，還要打中標靶。',
    noInspector: true,
    hidden: cs`
      public class AutoGun : MonoBehaviour
      {
          [SerializeField] private GameObject bulletPrefab;
          private float timer;
          void Update()
          {
              timer += Time.deltaTime;
              if (timer >= 0.1f)
              {
                  timer = 0f;
                  Instantiate(bulletPrefab, transform.position + new Vector3(0.6f, 0f, 0f), Quaternion.identity);
              }
          }
      }
    `,
    scene: {
      tiles: ['................', '................', '.P........T.....', '################'],
      entities: { P: T.hero({ script: 'AutoGun' }), T: T.target },
      prefabs: { Bullet: Object.assign({}, bulletPrefab, { scripts: ['Bullet'] }) },
      inspector: { Hero: { bulletPrefab: { prefab: 'Bullet' } } },
      duration: 4, showCount: true
    },
    starter: rep(sol72, '        Destroy(gameObject, 1f);\n', ''),
    solution: sol72,
    check: (W) => {
      if (U.count(W, 'Target') > 0) return { ok: false, msg: '標靶沒有被打中' };
      return U.res(W.stats.maxObjects <= 25, `場景物件最多到了 ${W.stats.maxObjects} 個，子彈沒有被清掉`);
    },
    choices: [
      { code: sol72, expect: 'win', explain: '每顆子彈只活 1 秒。' },
      { code: rep(sol72, 'Destroy(gameObject, 1f);', 'Destroy(this, 1f);'), expect: 'fail', explain: 'this 是 Bullet 腳本，1 秒後腳本被刪掉，子彈停在半空中，物件還在。' },
      { code: rep(sol72, 'Destroy(gameObject, 1f);', 'Destroy(gameObject);'), expect: 'fail', explain: '子彈一生出來就馬上被刪掉，打不到標靶。' },
      { code: rep(sol72, '        Destroy(gameObject, 1f);\n', ''), expect: 'fail', explain: '子彈永遠不會消失，越積越多。' }
    ],
    hints: ['在 Start 裡刪除自己，但要延遲一點。', 'Destroy 的第二個參數是延遲幾秒。', sol72]
  });

  const sol73 = cs`
    using UnityEngine;

    public class CoinSpawner : MonoBehaviour
    {
        [SerializeField] private GameObject coinPrefab;
        private float timer;

        void Update()
        {
            timer += Time.deltaTime;
            if (timer >= 0.25f)
            {
                timer = 0f;
                int lane = Random.Range(0, 3);   // 0、1、2 三條車道
                float x = 4f + lane * 3f;
                Instantiate(coinPrefab, new Vector3(x, 6f, 0f), Quaternion.identity);
            }
        }
    }
  `;
  unity({
    id: '7-3', world: 7, title: 'Random.Range',
    file: 'CoinSpawner.cs',
    concept: '<code>Random.Range(最小, 最大)</code> 會隨機挑一個數字。用<b>整數</b>時<b>不包含最大值</b>：<code>Random.Range(0, 3)</code> 只會得到 0、1、2。用小數時兩邊都包含。',
    goal: '金幣要隨機掉在左、中、右三條車道，三條都要出現。',
    inspectorFor: 'Spawner',
    scene: {
      tiles: ['s.............', '..............', '..............', '..............', '..............', '..............', '..............', '##############'],
      entities: { s: { name: 'Spawner', collider: false, script: 'CoinSpawner', dy: 0 } },
      prefabs: { Coin: { name: 'Coin', tag: 'Coin', sprite: 'coin', w: 0.5, h: 0.5, rb: 'dynamic', gravity: 0.6, size: 0.6 } },
      inspector: { Spawner: { coinPrefab: { prefab: 'Coin' } } },
      duration: 5
    },
    starter: rep(sol73, 'Random.Range(0, 3)', 'Random.Range(0, 2)'),
    solution: sol73,
    check: (W) => {
      const lanes = new Set(W.stats.spawnXs.map((x) => Math.round((x - 4) / 3)));
      const names = ['左', '中', '右'];
      const missing = [0, 1, 2].filter((k) => !lanes.has(k)).map((k) => names[k]);
      if ([...lanes].some((k) => k < 0 || k > 2)) return { ok: false, msg: '有金幣掉到車道外面了' };
      return U.res(missing.length === 0, `${missing.join('、')}車道一枚金幣都沒有`);
    },
    choices: [
      { code: sol73, expect: 'win', explain: '0、1、2 都會出現。' },
      { code: rep(sol73, 'Random.Range(0, 3)', 'Random.Range(0, 2)'), expect: 'fail', explain: '整數版不包含最大值，只會得到 0 和 1，右邊車道永遠沒有金幣。' },
      { code: rep(sol73, 'Random.Range(0, 3)', 'Random.Range(1, 3)'), expect: 'fail', explain: '只會得到 1 和 2，左邊車道永遠沒有金幣。' },
      { code: rep(sol73, 'Random.Range(0, 3)', 'Random.Range(0f, 3f)'), expect: 'compile:CS0266', explain: '傳小數進去，回傳的也是 float，不能直接放進 int。' }
    ],
    hints: ['Random.Range(0, 2) 會得到哪些數字？', '整數版的最大值不會被選到。', sol73]
  });

  const sol74 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private GameObject bulletPrefab;
        [SerializeField] private float fireRate = 0.25f;
        private float nextFireTime;

        void Update()
        {
            if (Keyboard.current.jKey.isPressed && Time.time >= nextFireTime)
            {
                Instantiate(bulletPrefab, transform.position + new Vector3(0.6f, 0f, 0f), Quaternion.identity);
                nextFireTime = Time.time + fireRate;
            }
        }
    }
  `;
  unity({
    id: '7-4', world: 7, title: '射擊冷卻',
    concept: '按住射擊鍵時，Update 每一幀都會生一顆子彈，一秒 60 顆。記下「下一次可以射擊的時間」<code>nextFireTime</code>，再用 <code>Time.time</code>（遊戲開始後經過的秒數）比較，就能做出射擊冷卻。',
    goal: '按住 J 2.5 秒，打倒有 6 滴血的標靶，但總共不能射超過 12 發。',
    hidden: bulletHidden,
    scene: {
      tiles: ['................', '................', '.P..........T...', '################'],
      entities: { P: T.hero(), T: Object.assign({}, T.target, { scripts: ['TargetHealth'] }) },
      prefabs: { Bullet: bulletPrefab },
      inspector: { Hero: { bulletPrefab: { prefab: 'Bullet' } } },
      duration: 3, input: [[0.2, 2.7, 'j']], showCount: true
    },
    keys: ['j'],
    starter: rep(rep(sol74, ' && Time.time >= nextFireTime', ''), '            nextFireTime = Time.time + fireRate;\n', ''),
    solution: sol74,
    check: (W) => {
      if (W.stats.spawned > 12) return { ok: false, msg: `射了 ${W.stats.spawned} 發，槍管過熱了` };
      return U.res(U.count(W, 'Target') === 0, `只射了 ${W.stats.spawned} 發，標靶還沒倒`);
    },
    choices: [
      { code: sol74, expect: 'win', explain: '每 0.25 秒最多一發。' },
      { code: rep(rep(sol74, ' && Time.time >= nextFireTime', ''), '            nextFireTime = Time.time + fireRate;\n', ''), expect: 'fail', explain: '沒有冷卻，每一幀都射一發。' },
      { code: rep(sol74, 'nextFireTime = Time.time + fireRate;', 'nextFireTime = fireRate;'), expect: 'fail', explain: 'nextFireTime 永遠是 0.25，過了 0.25 秒以後條件一直成立，又變成每幀一發。' },
      { code: rep(sol74, 'Time.time >= nextFireTime', 'Time.deltaTime >= nextFireTime'), expect: 'fail', explain: 'deltaTime 是一幀的時間，大約 0.016，永遠不會大於下一次射擊的時間，只射了一發。' }
    ],
    hints: ['用 Time.time 記錄下一次可以射擊的時間。', '射擊後設定 nextFireTime = Time.time + fireRate;', sol74]
  });

  /* =========================================================
   * W8 競技場
   * ========================================================= */
  const sol81 = cs`
    using UnityEngine;

    public class Coin : MonoBehaviour
    {
        [SerializeField] private int value = 1;

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Player"))
            {
                // 通知 GameManager 加分
                GameManager.Instance.AddScore(value);
                Destroy(gameObject);
            }
        }
    }
  `;
  unity({
    id: '8-1', world: 8, title: 'GameManager',
    file: 'Coin.cs',
    concept: 'GameManager 是整場遊戲的「裁判」，負責記分和判定輸贏。它用 <b>Singleton</b> 寫法把自己存在 <code>GameManager.Instance</code> 裡，所以任何腳本都能直接寫 <code>GameManager.Instance.AddScore(1)</code>，不用在 Inspector 拖曳。',
    goal: '金幣被撿到時，通知 GameManager 加分。3 枚都撿到要有 3 分。',
    hidden: HID.mover,
    inspectorFor: 'Coin',
    scene: {
      tiles: ['..............', '..............', '.P..C..C..C...', '##############'],
      entities: { P: T.heroRb({ script: 'Mover' }), C: Object.assign({}, T.coin, { scripts: ['Coin'] }) },
      gameManager: true, duration: 3
    },
    starter: rep(sol81, '            GameManager.Instance.AddScore(value);\n', '\n'),
    solution: sol81,
    check: (W) => U.res(W.gm.score === 3, `GameManager 的分數是 ${W.gm.score}，應該是 3`),
    choices: [
      { code: sol81, expect: 'win', explain: '透過 Instance 找到場景裡的 GameManager。' },
      { code: rep(sol81, 'GameManager.Instance.AddScore', 'GameManager.AddScore'), expect: 'compile:CS0120', explain: 'AddScore 屬於「某一個」GameManager 物件，要透過 Instance 才能呼叫。' },
      { code: rep(sol81, 'GameManager.Instance.AddScore', 'new GameManager().AddScore'), expect: 'fail', explain: 'new 出來的是另一個不在場景裡的 GameManager，分數加到它身上了。Console 也有警告：MonoBehaviour 不能用 new。' },
      { code: rep(sol81, 'GameManager.Instance.AddScore', 'AddScore'), expect: 'compile:CS0103', explain: 'Coin 自己沒有 AddScore 這個方法。' }
    ],
    hints: ['GameManager.Instance 就是場景裡那一個 GameManager。', 'GameManager.Instance.AddScore(value);', sol81]
  });

  const sol82 = cs`
    using UnityEngine;
    using TMPro;

    public class Hero : MonoBehaviour
    {
        [SerializeField] private TMP_Text scoreText;
        private int score;

        void Start()
        {
            UpdateScoreText();
        }

        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                score++;
                Destroy(other.gameObject);
                UpdateScoreText();
            }
        }

        void UpdateScoreText()
        {
            // 把分數顯示在畫面上，格式：Score: 3
            scoreText.text = $"Score: {score}";
        }
    }
  `;
  unity({
    id: '8-2', world: 8, title: '更新 UI 文字',
    concept: '畫面上的文字用 TextMeshPro 的 <code>TMP_Text</code> 元件，檔案上面要加 <code>using TMPro;</code>。改它的 <code>.text</code> 屬性就能更新文字。字串前面加 <code>$</code>，才能用 <code>{score}</code> 把變數放進去。',
    goal: '畫面左上角要顯示 Score: 3。',
    hidden: HID.mover,
    scene: {
      tiles: ['..............', '..............', '.P..C..C..C...', '##############'],
      entities: { P: T.heroRb({ scripts: ['Hero', 'Mover'] }), C: T.coin },
      ui: { scoreText: 'New Text' },
      inspector: { Hero: { scoreText: { ui: 'scoreText' } } },
      duration: 3
    },
    starter: rep(sol82, '        scoreText.text = $"Score: {score}";\n', ''),
    solution: sol82,
    check: (W) => U.res(W.ui.scoreText && W.ui.scoreText.text === 'Score: 3', `畫面上顯示的是「${W.ui.scoreText ? W.ui.scoreText.text : ''}」`),
    choices: [
      { code: sol82, expect: 'win', explain: '改的是 scoreText 的 text 屬性。' },
      { code: rep(sol82, 'scoreText.text = $"Score: {score}";', 'scoreText = $"Score: {score}";'), expect: 'compile:CS0029', explain: 'scoreText 是 TMP_Text 元件，不是字串，要改它的 .text。' },
      { code: rep(sol82, '$"Score: {score}"', '"Score: {score}"'), expect: 'fail', explain: '少了 $，{score} 被當成普通文字直接顯示出來。' },
      { code: rep(sol82, '$"Score: {score}"', 'score'), expect: 'compile:CS0029', explain: 'text 要的是字串，score 是 int。' }
    ],
    hints: ['要改的是 scoreText.text。', 'scoreText.text = $"Score: {score}";', sol82]
  });

  const sol83 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;
    using UnityEngine.SceneManagement;

    public class RestartKey : MonoBehaviour
    {
        void Update()
        {
            if (Keyboard.current.rKey.wasPressedThisFrame)
            {
                Time.timeScale = 1f;
                SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex);
            }
        }
    }
  `;
  unity({
    id: '8-3', world: 8, title: 'Time.timeScale',
    file: 'RestartKey.cs',
    concept: '<code>Time.timeScale</code> 控制遊戲時間的速度：1 是正常，0 是暫停。Game Over 時通常把它設成 0。這個值<b>不會</b>因為重新載入場景而恢復，所以重新開始前一定要改回 1，不然新場景還是停住的。',
    goal: '勇者撞到尖刺 Game Over 後，按 R 重新開始，遊戲要能繼續動。',
    hidden: HID.mover,
    noInspector: true,
    scene: {
      tiles: ['G.............', '..............', '.P....^.......', '##############'],
      entities: { P: T.heroRb({ script: 'Mover' }), G: T.ctrl('RestartKey') },
      gameManager: true, hideScore: true, duration: 2.6, input: [[1.8, 1.9, 'r']]
    },
    keys: ['r'],
    starter: rep(sol83, '            Time.timeScale = 1f;\n', ''),
    solution: sol83,
    check: (W) => {
      if (W.stats.reloads < 1) return { ok: false, msg: '場景沒有重新載入' };
      if (W.timeScale === 0) return { ok: false, msg: '重新載入了，但 Time.timeScale 還是 0，遊戲停住不動' };
      return U.res(W.player && W.player.x > W.startX + 1, '重新開始後勇者沒有動');
    },
    choices: [
      { code: sol83, expect: 'win', explain: '先恢復時間，再載入場景。' },
      { code: rep(sol83, '            Time.timeScale = 1f;\n', ''), expect: 'fail', explain: 'timeScale 還是 0，新場景一載入就是暫停狀態。' },
      { code: rep(sol83, 'Time.timeScale = 1f;', 'Time.deltaTime = 1f;'), expect: 'compile:CS0200', explain: 'deltaTime 是唯讀的，而且要恢復的是 timeScale。' },
      { code: rep(sol83, 'Time.timeScale = 1f;', 'Time.timeScale = 0f;'), expect: 'fail', explain: '0 是暫停，1 才是正常速度。' }
    ],
    hints: ['Game Over 時 GameManager 把 Time.timeScale 設成 0 了。', '在 LoadScene 之前加上 Time.timeScale = 1f;', sol83]
  });

  const sol84 = cs`
    using UnityEngine;
    using TMPro;

    public class Timer : MonoBehaviour
    {
        [SerializeField] private TMP_Text timerText;
        [SerializeField] private float timeLimit = 3f;
        private float timeLeft;
        private bool finished;

        void Start()
        {
            timeLeft = timeLimit;
        }

        void Update()
        {
            if (finished) return;

            timeLeft -= Time.deltaTime;
            if (timeLeft <= 0f)
            {
                timeLeft = 0f;
                finished = true;
                GameManager.Instance.GameOver();
            }
            timerText.text = $"Time: {Mathf.CeilToInt(timeLeft)}";
        }
    }
  `;
  unity({
    id: '8-4', world: 8, title: '倒數計時',
    file: 'Timer.cs',
    concept: '倒數計時就是每一幀減掉 <code>Time.deltaTime</code>。歸零時呼叫一次 GameOver，並用一個 bool 記住「已經結束了」，不然之後每一幀都會再呼叫一次。顯示秒數用 <code>Mathf.CeilToInt</code> 無條件進位，2.3 秒會顯示 3。',
    goal: '3 秒倒數，畫面顯示 Time: 3、2、1、0，時間到呼叫 GameOver 一次。',
    inspectorFor: 'GameController',
    scene: {
      tiles: ['G.............', '..............', '.P............', '##############'],
      entities: { P: T.hero({ script: null }), G: T.ctrl('Timer') },
      ui: { timerText: '' },
      inspector: { GameController: { timerText: { ui: 'timerText' } } },
      gameManager: true, hideScore: true, duration: 3.5
    },
    starter: rep(rep(sol84, '        if (finished) return;\n\n', ''), '            finished = true;\n', ''),
    solution: sol84,
    check: (W) => {
      const at = (t) => { let s = ''; for (const u of W.uiLog || []) if (u.key === 'timerText' && u.u <= t) s = u.text; return s; };
      if (at(0.5) !== 'Time: 3') return { ok: false, msg: `0.5 秒時應該顯示 Time: 3，實際是「${at(0.5)}」` };
      if (W.gm.gameOvers === 0) return { ok: false, msg: '時間到了沒有呼叫 GameOver' };
      if (W.gm.gameOvers > 1) return { ok: false, msg: `GameOver 被呼叫了 ${W.gm.gameOvers} 次，應該只有一次` };
      if (W.gm.firstOverAt < 2.9) return { ok: false, msg: `才過 ${W.gm.firstOverAt.toFixed(2)} 秒就 Game Over 了` };
      return U.res(W.ui.timerText.text === 'Time: 0', `最後顯示的是「${W.ui.timerText.text}」`);
    },
    choices: [
      { code: sol84, expect: 'win', explain: '倒數、顯示、只結束一次。' },
      { code: rep(rep(sol84, '        if (finished) return;\n\n', ''), '            finished = true;\n', ''), expect: 'fail', explain: '時間到之後每一幀都再呼叫一次 GameOver。' },
      { code: rep(sol84, 'timeLeft -= Time.deltaTime;', 'timeLeft -= 1f;'), expect: 'fail', explain: '每一幀減 1 秒，3 幀就結束了。' },
      { code: rep(sol84, 'Mathf.CeilToInt(timeLeft)', '(int)timeLeft'), expect: 'fail', explain: '(int) 是無條件捨去，2.9 秒會顯示 2，畫面一開始就少了 1 秒。' }
    ],
    hints: ['時間到之後，Update 還是每一幀都在執行。', '用 finished 記住已經結束，Update 一開始就 return。', sol84]
  });

  /* =========================================================
   * W9 時光塔
   * ========================================================= */
  const sol91 = cs`
    using System.Collections;
    using UnityEngine;

    public class Door : MonoBehaviour
    {
        void Start()
        {
            StartCoroutine(Countdown());
        }

        IEnumerator Countdown()
        {
            for (int i = 3; i > 0; i--)
            {
                Debug.Log(i);
                yield return new WaitForSeconds(1f);
            }
            Debug.Log("開門！");
        }
    }
  `;
  unity({
    id: '9-1', world: 9, title: '協程',
    file: 'Door.cs',
    concept: '<b>協程（Coroutine）</b>是可以「暫停一下再繼續」的方法，回傳型別是 <code>IEnumerator</code>。<code>yield return new WaitForSeconds(1f);</code> 會等 1 秒再往下執行。協程一定要用 <code>StartCoroutine(...)</code> 啟動，直接呼叫不會有任何反應。概念和 Python 用 yield 的 generator 一樣。',
    goal: '每隔 1 秒印出 3、2、1，最後印出「開門！」。',
    noInspector: true,
    scene: { tiles: ['G.............', '..............', '.P............', '##############'], entities: { P: T.hero({ script: null }), G: T.ctrl('Door') }, duration: 3.4 },
    starter: rep(sol91, 'StartCoroutine(Countdown());', 'Countdown();'),
    solution: sol91,
    check: (W) => {
      const l = W.logs.filter((x) => x.kind === 'log');
      const want = ['3', '2', '1', '開門！'];
      if (l.map((x) => x.text).join('|') !== want.join('|')) return { ok: false, msg: `Console 應該依序印出 3、2、1、開門！，實際是：${l.map((x) => x.text).join('、') || '什麼都沒有'}` };
      const ok = l.every((x, k) => Math.abs(x.t - k) < 0.1);
      return U.res(ok, '每一行之間要相隔 1 秒');
    },
    choices: [
      { code: sol91, expect: 'win', explain: '協程每次等 1 秒。' },
      { code: rep(sol91, 'StartCoroutine(Countdown());', 'Countdown();'), expect: 'fail', explain: '直接呼叫只會拿到一個還沒開始的協程，裡面的程式一行都沒執行。' },
      { code: rep(sol91, 'IEnumerator Countdown()', 'void Countdown()').replace('StartCoroutine(Countdown());', 'Countdown();'), expect: 'compile:CS1624', explain: '有 yield return 的方法，回傳型別必須是 IEnumerator。' },
      { code: rep(sol91, 'yield return new WaitForSeconds(1f);', 'yield return null;'), expect: 'fail', explain: 'yield return null 只等一幀，四行幾乎同時印出來。' }
    ],
    hints: ['協程要怎麼啟動？', 'StartCoroutine(Countdown());', sol91]
  });

  const sol92 = cs`
    using System.Collections;
    using UnityEngine;

    public class PlayerHealth : MonoBehaviour
    {
        [SerializeField] private int hp = 3;
        [SerializeField] private float invincibleTime = 1f;
        private bool isInvincible;

        // 碰到尖刺時，每一幀都會被呼叫一次
        public void TakeDamage(int amount)
        {
            if (isInvincible) return;
            hp -= amount;
            Debug.Log($"受傷了！剩下 {hp} 滴血");
            if (hp <= 0)
            {
                Debug.Log("倒下了");
                return;
            }
            // 受傷後無敵一段時間
            StartCoroutine(InvincibleRoutine());
        }

        IEnumerator InvincibleRoutine()
        {
            isInvincible = true;
            yield return new WaitForSeconds(invincibleTime);
            isInvincible = false;
        }
    }
  `;
  unity({
    id: '9-2', world: 9, title: '無敵時間',
    file: 'PlayerHealth.cs',
    concept: '很多動作遊戲受傷後會無敵一下下。用協程：把 isInvincible 設成 true，等待 1 秒，再設回 false。等待的期間其他程式照常執行，遊戲不會卡住。',
    goal: '勇者站在尖刺上 1.9 秒，受傷後要有 1 秒無敵，最後還要活著。',
    scene: {
      tiles: ['..............', '..............', '......P.......', '##############'],
      entities: { P: T.hero({ script: 'PlayerHealth' }) }, hazard: 'damage', duration: 1.9, hazardAt: [[6, 1, 'spike']]
    },
    starter: rep(sol92, '        StartCoroutine(InvincibleRoutine());\n', ''),
    solution: sol92,
    check: (W) => {
      const s = W.player.scripts[0];
      const hp = s ? s.obj.fields.get('hp') : 0;
      return U.res(hp > 0, `勇者的血量變成 ${hp}，倒下了`);
    },
    choices: [
      { code: sol92, expect: 'win', explain: '受傷後 1 秒內不會再扣血。' },
      { code: rep(sol92, '        StartCoroutine(InvincibleRoutine());\n', ''), expect: 'fail', explain: '沒有無敵時間，每一幀都扣血，3 幀就倒下了。' },
      { code: rep(sol92, 'StartCoroutine(InvincibleRoutine());', 'StartCoroutine(InvincibleRoutine);'), expect: 'compile:CS1503', explain: 'InvincibleRoutine 後面要加 ()，呼叫它才會得到協程。' },
      { code: rep(sol92, 'StartCoroutine(InvincibleRoutine());', 'InvincibleRoutine();'), expect: 'fail', explain: '沒有用 StartCoroutine，協程不會執行。' }
    ],
    hints: ['受傷之後要啟動 InvincibleRoutine 協程。', 'StartCoroutine(InvincibleRoutine());', sol92]
  });

  const sol93 = cs`
    using UnityEngine;
    using TMPro;

    public class HealthUI : MonoBehaviour
    {
        [SerializeField] private PlayerHealth player;
        [SerializeField] private TMP_Text hpText;

        void OnEnable()
        {
            player.OnHealthChanged += UpdateText;
        }

        void OnDisable()
        {
            // 物件被停用或刪除時，記得取消訂閱
            player.OnHealthChanged -= UpdateText;
        }

        void UpdateText(int hp)
        {
            hpText.text = $"HP: {hp}";
        }
    }
  `;
  unity({
    id: '9-3', world: 9, title: '事件',
    file: 'HealthUI.cs',
    concept: '<b>事件（event）</b>讓腳本之間不用互相綁死：PlayerHealth 受傷時發出事件，想知道的腳本自己用 <code>+=</code> 訂閱。訂閱和取消訂閱要成對：在 <code>OnEnable</code> 用 <code>+=</code>，在 <code>OnDisable</code> 用 <code>-=</code>。忘了取消，物件被刪掉後事件還會呼叫它，就會出錯。',
    goal: '血條 UI 要跟著更新；1 秒後血條會被刪除，之後勇者再受傷時不能出錯。',
    inspectorFor: 'HUD',
    hidden: cs`
      public class PlayerHealth : MonoBehaviour
      {
          public event Action<int> OnHealthChanged;
          private int hp = 3;
          private float timer;
          void Update()
          {
              timer += Time.deltaTime;
              if ((timer >= 0.5f && hp == 3) || (timer >= 1.5f && hp == 2))
              {
                  hp--;
                  OnHealthChanged?.Invoke(hp);
              }
          }
      }

      public class HudCloser : MonoBehaviour
      {
          [SerializeField] private GameObject hud;
          private float timer;
          void Update()
          {
              timer += Time.deltaTime;
              if (timer >= 1f && hud != null)
              {
                  Destroy(hud);
                  hud = null;
              }
          }
      }
    `,
    scene: {
      tiles: ['U.G...........', '..............', '.P............', '##############'],
      entities: {
        P: T.hero({ script: 'PlayerHealth' }),
        U: { name: 'HUD', collider: false, script: 'HealthUI', ownsUi: ['hpText'] },
        G: T.ctrl('HudCloser')
      },
      ui: { hpText: 'HP: 3' },
      inspector: { HUD: { player: { ref: 'Hero' }, hpText: { ui: 'hpText' } }, GameController: { hud: { ref: 'HUD' } } },
      duration: 2
    },
    starter: rep(sol93, '        player.OnHealthChanged -= UpdateText;\n', ''),
    solution: sol93,
    check: (W) => U.res((W.uiLog || []).some((u) => u.text === 'HP: 2'), '血條沒有更新成 HP: 2'),
    choices: [
      { code: sol93, expect: 'win', explain: '+= 和 -= 成對出現。' },
      { code: rep(sol93, '        player.OnHealthChanged -= UpdateText;\n', ''), expect: 'runtime:MissingReferenceException', explain: '血條被刪除後還留在訂閱名單上，1.5 秒時事件又呼叫了它。' },
      { code: rep(sol93, 'player.OnHealthChanged += UpdateText;', 'player.OnHealthChanged = UpdateText;'), expect: 'compile:CS0070', explain: '別的類別只能用 += 或 -= 操作事件，不能用 = 把別人的訂閱整個蓋掉。' },
      { code: rep(sol93, 'player.OnHealthChanged += UpdateText;', 'player.OnHealthChanged += UpdateText();'), expect: 'compile:CS1501', explain: '訂閱時只寫方法名稱，不要加 ()。加了 () 是「現在就呼叫它」。' }
    ],
    hints: ['OnDisable 裡面是空的。', '用 -= 取消訂閱。', sol93]
  });

  const sol94 = cs`
    using UnityEngine;

    public class HeroAnimation : MonoBehaviour
    {
        private Animator animator;
        private Rigidbody2D rb;

        void Awake()
        {
            animator = GetComponent<Animator>();
            rb = GetComponent<Rigidbody2D>();
        }

        void Update()
        {
            // Animator 裡的參數叫做 Speed（float）
            animator.SetFloat("Speed", Mathf.Abs(rb.linearVelocity.x));
        }
    }
  `;
  unity({
    id: '9-4', world: 9, title: 'Animator 參數',
    file: 'HeroAnimation.cs',
    concept: 'Animator 用<b>參數</b>決定播放哪個動畫，程式用 <code>SetFloat</code>、<code>SetBool</code>、<code>SetTrigger</code> 修改參數。參數名稱是字串，拼錯或大小寫不對時<b>不會</b>出現紅字，只有一行黃色警告，動畫就是不會動。',
    goal: '勇者走路時要播放跑步動畫（Speed 參數要大於 0）。',
    hidden: HID.mover,
    noInspector: true,
    scene: {
      tiles: ['..............', '..............', '.P............', '##############'],
      entities: { P: T.heroRb({ scripts: ['HeroAnimation', 'Mover'], animator: { Speed: 'float', IsGrounded: 'bool' } }) },
      duration: 2
    },
    starter: rep(sol94, '"Speed"', '"speed"'),
    solution: sol94,
    check: (W) => {
      const w = U.warns(W).find((x) => x.startsWith('Parameter'));
      if (w) return { ok: false, msg: 'Console 有警告：' + w };
      return U.res((W.stats.animMax.Speed || 0) > 1, 'Speed 參數一直是 0，動畫沒有播放');
    },
    choices: [
      { code: sol94, expect: 'win', explain: '名稱和型別都對。' },
      { code: rep(sol94, '"Speed"', '"speed"'), expect: 'fail', explain: '參數名稱大小寫不對，只有黃色警告。' },
      { code: rep(sol94, 'animator.SetFloat("Speed", Mathf.Abs(rb.linearVelocity.x));', 'animator.SetBool("Speed", true);'), expect: 'fail', explain: 'Speed 是 float 參數，不能用 SetBool 設定。' },
      { code: rep(sol94, '"Speed"', 'Speed'), expect: 'compile:CS0103', explain: '參數名稱要用字串（加引號）。' }
    ],
    hints: ['看 Console 的黃色警告。', 'Animator 裡的參數叫 Speed，S 大寫。', sol94]
  });

  /* =========================================================
   * W10 魔王城
   * ========================================================= */
  const playerCtl = cs`
    public class PlayerCtl : MonoBehaviour
    {
        private Rigidbody2D rb;
        void Awake() { rb = GetComponent<Rigidbody2D>(); }
        void Update()
        {
            float x = 0f;
            if (Keyboard.current.dKey.isPressed) x = 1f;
            float vy = rb.linearVelocity.y;
            if (Keyboard.current.spaceKey.wasPressedThisFrame) vy = 12f;
            rb.linearVelocity = new Vector2(x * 4f, vy);
        }
        public void Bounce(float force)
        {
            rb.linearVelocity = new Vector2(rb.linearVelocity.x, force);
        }
    }

    public class Walker : MonoBehaviour
    {
        [SerializeField] private float speed = 0f;
        private Rigidbody2D rb;
        void Awake() { rb = GetComponent<Rigidbody2D>(); }
        void Update() { rb.linearVelocity = new Vector2(-speed, 0f); }
    }
  `;
  const sol101 = cs`
    using UnityEngine;

    public class Enemy : MonoBehaviour
    {
        [SerializeField] private float stompBounce = 10f;

        void OnCollisionEnter2D(Collision2D collision)
        {
            if (!collision.gameObject.CompareTag("Player")) return;

            ContactPoint2D contact = collision.GetContact(0);
            if (contact.normal.y < -0.5f)
            {
                // 玩家從上面踩下來：踩扁敵人，讓玩家彈起來
                collision.gameObject.GetComponent<PlayerCtl>().Bounce(stompBounce);
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
  const enemyTpl = (speed) => Object.assign({}, T.slime, { name: 'Enemy', scripts: ['Enemy', 'Walker'] });
  unity({
    id: '10-1', world: 10, title: '踩踏判定',
    file: 'Enemy.cs',
    concept: '判斷「踩」還是「撞」，看碰撞點的<b>法線</b> <code>contact.normal</code>：它指向被撞的這一方。玩家從上面壓下來時，敵人收到的法線朝下，y 接近 -1；從側面撞過來時，y 接近 0。這關會測兩種情況。',
    goal: '從上面踩到敵人要把它踩扁；從側面被撞到要 Game Over。',
    hidden: playerCtl,
    inspectorFor: 'Enemy',
    variants: [
      {
        tiles: ['..............', '..............', '..............', '..P...E.......', '##############'],
        entities: { P: T.heroRb({ script: 'PlayerCtl' }), E: enemyTpl() },
        gameManager: true, hideScore: true, duration: 2, input: [[0.1, 1.5, 'd'], [0.22, 0.3, 'space']], label: '測試 1：從上面踩'
      },
      {
        tiles: ['..............', '..............', '..............', '..P....E......', '##############'],
        entities: { P: T.heroRb({ script: 'PlayerCtl' }), E: enemyTpl() },
        inspector: { Enemy: { speed: 2 } },
        gameManager: true, hideScore: true, duration: 3, label: '測試 2：從側面撞'
      }
    ],
    starter: rep(sol101, cs`
            if (contact.normal.y < -0.5f)
            {
                // 玩家從上面踩下來：踩扁敵人，讓玩家彈起來
                collision.gameObject.GetComponent<PlayerCtl>().Bounce(stompBounce);
                Destroy(gameObject);
            }
            else
            {
                // 從側面撞到：Game Over
                GameManager.Instance.GameOver();
            }
    `.replace(/^/gm, '        ').replace(/\s+$/, '\n'), '        // 玩家從上面踩下來：踩扁敵人，讓玩家彈起來\n        // 從側面撞到：Game Over\n        GameManager.Instance.GameOver();\n'),
    solution: sol101,
    check: (W, worlds, vi) => {
      if (vi === 0) {
        if (W.gm.gameOvers > 0) return { ok: false, msg: '測試 1：從上面踩下去卻 Game Over 了' };
        return U.res(U.count(W, 'Enemy') === 0, '測試 1：敵人沒有被踩扁');
      }
      return U.res(W.gm.gameOvers > 0, '測試 2：被敵人從側面撞到卻沒有 Game Over');
    },
    choices: [
      { code: sol101, expect: 'win', explain: '法線 y 小於 -0.5 代表從上面踩。' },
      { code: rep(sol101, 'contact.normal.y < -0.5f', 'true'), expect: 'fail', explain: '不管從哪裡碰到都算踩扁，側面被撞也不會輸。' },
      { code: rep(sol101, 'contact.normal.y < -0.5f', 'contact.normal.y > 0.5f'), expect: 'fail', explain: '方向反了。法線指向被撞的敵人，玩家在上面時法線朝下（y 是負的）。' },
      { code: rep(sol101, 'contact.normal.y < -0.5f', 'false'), expect: 'fail', explain: '永遠 Game Over，踩到敵人也會輸。' }
    ],
    hints: ['用 contact.normal.y 判斷方向。', '玩家在上面時，敵人收到的 normal.y 接近 -1。', sol101]
  });

  const sol102 = cs`
    using UnityEngine;
    using UnityEngine.InputSystem;

    public class PlayerController : MonoBehaviour
    {
        [SerializeField] private float moveSpeed = 6f;
        [SerializeField] private float jumpForce = 12f;
        [SerializeField] private Transform groundCheck;
        [SerializeField] private LayerMask groundLayer;

        private Rigidbody2D rb;
        private int coins;

        void Awake()
        {
            rb = GetComponent<Rigidbody2D>();
        }

        bool IsGrounded()
        {
            return Physics2D.OverlapCircle(groundCheck.position, 0.15f, groundLayer) != null;
        }

        void Update()
        {
            var kb = Keyboard.current;
            float x = 0f;
            if (kb.aKey.isPressed) x -= 1f;
            if (kb.dKey.isPressed) x += 1f;
            rb.linearVelocity = new Vector2(x * moveSpeed, rb.linearVelocity.y);

            // TODO 1：在地面上按空白鍵時跳起來
            if (kb.spaceKey.wasPressedThisFrame && IsGrounded())
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            }
        }

        // TODO 2：碰到 Tag 為 Coin 的物件時，coins 加 1 並刪除金幣
        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                coins++;
                Destroy(other.gameObject);
            }
        }
    }
  `;
  unity({
    id: '10-2', world: 10, title: '最終關卡',
    file: 'PlayerController.cs',
    concept: '最後一關：把學過的東西組起來。移動已經寫好了，你要補上跳躍和撿金幣。會用到 <code>wasPressedThisFrame</code>、地面檢測、<code>linearVelocity</code>、<code>OnTriggerEnter2D</code> 和 <code>Destroy</code>。',
    goal: '跳過深坑和尖刺史萊姆，撿完 3 枚金幣，走到旗子。',
    hidden: cs`
      public class Spiky : MonoBehaviour
      {
          void OnCollisionEnter2D(Collision2D collision)
          {
              if (collision.gameObject.CompareTag("Player")) GameManager.Instance.GameOver();
          }
      }
    `,
    scene: {
      tiles: ['..................', '..................', '..................', '......C...........', '..................', '.P..C......C.E..F.', '#####...##########'],
      entities: {
        P: T.heroRb({ name: 'Player', script: 'PlayerController' }), C: T.coin, F: T.flag,
        E: Object.assign({}, T.slime, { name: 'Spiky', scripts: ['Spiky'] })
      },
      inspector: { Player: { groundCheck: { ref: 'GroundCheck' }, groundLayer: { layer: 'Ground' } } },
      gameManager: true, hideScore: true, duration: 4.2,
      input: [[0.1, 4, 'd'], [0.48, 0.56, 'space'], [1.73, 1.81, 'space']]
    },
    keys: ['a', 'd', 'space'],
    starter: rep(rep(sol102, cs`
            if (kb.spaceKey.wasPressedThisFrame && IsGrounded())
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            }
    `.replace(/^/gm, '        ').replace(/\s+$/, '\n'), ''), cs`
        void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                coins++;
                Destroy(other.gameObject);
            }
        }
    `.replace(/^/gm, '    ').replace(/\s+$/, '\n'), ''),
    solution: sol102,
    done: (W) => U.reached(W) && U.count(W, 'Coin') === 0,
    check: (W) => {
      if (W.player.dead) return { ok: false, msg: '勇者' + W.player.deathReason };
      if (W.gm.gameOvers > 0) return { ok: false, msg: '撞到尖刺史萊姆，Game Over' };
      if (U.count(W, 'Coin') > 0) return { ok: false, msg: `還有 ${U.count(W, 'Coin')} 枚金幣沒撿` };
      return U.res(U.reached(W), '沒有走到旗子');
    },
    choices: [
      { code: sol102, expect: 'win', explain: '跳躍、地面檢測、撿金幣都完成了。' },
      { code: rep(sol102, 'other.CompareTag("Coin")', 'other.CompareTag("coin")'), expect: 'fail', explain: 'Tag 也分大小寫，"coin" 和 "Coin" 不一樣，金幣一枚都撿不到。' },
      { code: rep(sol102, 'new Vector2(x * moveSpeed, rb.linearVelocity.y)', 'new Vector2(x * moveSpeed, 0f)'), expect: 'fail', explain: '每一幀把 y 速度清成 0，跳起來的速度馬上被蓋掉，跳不起來。' },
      { code: rep(sol102, 'OverlapCircle(groundCheck.position', 'OverlapCircle(transform.position'), expect: 'fail', explain: '檢查點在身體中間，碰不到地面，IsGrounded() 永遠是 false，跳不起來。' }
    ],
    hints: ['跳躍：按下空白鍵、而且 IsGrounded() 時，設定 y 速度。', '撿金幣：寫 OnTriggerEnter2D，判斷 CompareTag("Coin")。', sol102]
  });

  // 補上關卡的順序資訊
  L.forEach((lv, i) => { lv.index = i; lv.handbook = HANDBOOK + '#' + WORLDS[lv.world].ch; });

  /* =========================================================
   * 給 tests.html 用：驗證每一關
   * ========================================================= */
  function outcomeOf(r) {
    if (r.outcome === 'compile') return 'compile:' + r.errors[0].code;
    if (r.outcome === 'runtime') {
      const err = r.err || (r.runs && r.runs[r.runs.length - 1].err);
      return 'runtime:' + (err ? err.code : '?');
    }
    return r.outcome;
  }
  function runLevel(lv, code, opts) {
    if (lv.kind === 'grid') return root.GridStage.runGrid(lv, code, opts);
    const r = root.UnityStage.runHeadless(lv, code, opts);
    if (r.outcome === 'win' && lv.rules) {
      const msg = root.GridStage.checkRules(lv, code);
      if (msg) return Object.assign(r, { outcome: 'fail', msg });
    }
    return r;
  }
  function describe(r) {
    if (r.outcome === 'compile') return r.errors.map((e) => `${e.code} ${e.message} @${e.line}:${e.col}`).join('\n');
    return (r.msg || '') + (r.err ? ` [${r.err.code}: ${r.err.message} @${r.err.line}]` : '');
  }
  root.CSQLevels = {
    WORLDS, LEVELS: L, HANDBOOK, runLevel, outcomeOf,
    helpers: { cs, rep, dedent, T, U, HID, reachCheck },
    /** 讓其他檔案加入新的世界和關卡（js/levels-genres.js） */
    addWorlds(worlds, levels) {
      for (const w of worlds) WORLDS.push(w);
      for (const lv of levels) { lv.kind = lv.kind || 'unity'; lv.file = lv.file || 'Hero.cs'; L.push(lv); }
      L.forEach((lv, i) => { lv.index = i; lv.handbook = HANDBOOK + '#' + WORLDS.find((w) => w.id === lv.world).ch; });
    }
  };
  root.CSQLevelTest = function (test) {
    for (const lv of L) {
      test(`關卡 ${lv.id} 標準答案過關`, () => {
        const r = runLevel(lv, lv.solution);
        return r.outcome === 'win' || `outcome=${outcomeOf(r)} ${describe(r)}`;
      });
      test(`關卡 ${lv.id} 起始程式還沒過關`, () => {
        const r = runLevel(lv, lv.starter);
        return r.outcome !== 'win' || '起始程式就過關了';
      });
      (lv.choices || []).forEach((c, i) => {
        test(`關卡 ${lv.id} 選項 ${'ABCD'[i]} → ${c.expect}`, () => {
          const r = runLevel(lv, c.code);
          const got = outcomeOf(r);
          return got === c.expect || `got ${got}: ${describe(r)}\n--- code ---\n${c.code}`;
        });
      });
      test(`關卡 ${lv.id} 資料完整`, () => {
        if (!lv.hints || lv.hints.length !== 3) return '提示要有 3 個';
        if (!lv.choices || lv.choices.length < 3) return '選項太少';
        if (!lv.choices.some((c) => c.expect === 'win')) return '沒有正確選項';
        return true;
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
