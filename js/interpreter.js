/* C# 小勇者：C# 子集直譯器
 * tokenize → parse → check（模擬編譯錯誤）→ Runtime（generator 執行器，支援協程）
 */
(function (root) {
  'use strict';

  /* =========================================================
   * 錯誤
   * ========================================================= */
  class CsError extends Error {
    constructor(kind, code, message, line, col) {
      super(message);
      this.kind = kind; // 'compile' | 'runtime' | 'freeze'
      this.code = code;
      this.line = line || 0;
      this.col = col || 0;
    }
  }

  // 每個錯誤代碼的白話中文說明
  const ZH = {
    CS1002: '這行結尾少了分號 ;',
    CS1003: '語法錯誤，少了某個符號',
    CS1026: '少了右括號 )',
    CS1513: '少了右大括號 }',
    CS1514: '少了左大括號 {',
    CS1525: '這個位置不能放這個符號，可能是打錯字或少了東西',
    CS1733: '這裡需要一個運算式',
    CS1001: '這裡需要一個名稱',
    CS1041: '關鍵字不能當作名稱使用',
    CS1010: '字串少了結尾的雙引號 "',
    CS1012: "單引號 ' ' 只能放一個字元，文字請用雙引號 \" \"",
    CS1011: '單引號裡面是空的',
    CS1056: '出現了 C# 不認得的字元',
    CS0103: '找不到這個名稱：可能拼錯字、大小寫不對，或還沒宣告',
    CS0117: '這個類別沒有這個成員，檢查拼字和大小寫',
    CS1061: '這個型別沒有這個成員，檢查拼字和大小寫',
    CS0664: '小數預設是 double，要放進 float 必須在數字後面加 f，例如 5.5f',
    CS0266: '型別不同，需要明確轉型，例如 (int)x',
    CS0029: '型別不符，不能把這種值放進這種變數',
    CS0019: '這個運算子不能用在這兩種型別上',
    CS0023: '這個運算子不能用在這種型別上',
    CS0161: '方法宣告了回傳型別，但有某些情況沒有 return',
    CS0126: '這個方法需要回傳一個值',
    CS0127: 'void 方法不能 return 一個值',
    CS0163: 'switch 的每個 case 結尾都要有 break',
    CS8070: 'switch 的最後一個區段結尾也要有 break',
    CS0139: 'break 或 continue 只能用在迴圈或 switch 裡',
    CS0128: '同一個範圍裡已經宣告過這個變數了',
    CS0136: '外層已經有同名的變數了，換一個名字',
    CS1501: '參數的數量不對',
    CS1503: '參數的型別不對',
    CS0201: '這一行不是完整的指令（例如少了括號 () 或寫成了比較 ==）',
    CS0131: '等號左邊必須是變數',
    CS1612: '不能直接修改 position 的 x 或 y，要先存到變數、改完再整個指定回去',
    CS0200: '這個屬性是唯讀的，不能修改',
    CS0122: '這個成員是 private，只有類別自己能用',
    CS0246: '找不到這個型別，可能拼錯字或少了 using',
    CS0815: 'var 不能指定成 null',
    CS0818: '用 var 宣告時一定要給初始值',
    CS1624: '只有回傳 IEnumerator 的方法才能使用 yield return',
    CS1622: '協程裡要用 yield return，不能用 return 回傳值',
    CS1579: 'foreach 只能用在陣列或 List 這類集合上',
    CS1955: '這不是方法，不能用 () 呼叫；用類別做出物件要加 new',
    CS0428: '方法名稱後面忘了加 ()，所以沒有真的呼叫它',
    CS0120: '這個成員屬於某一個物件，要透過物件（例如 Instance）來使用，不能直接用類別名稱',
    CS0070: '別的腳本只能用 += 或 -= 訂閱事件，不能用 = 直接指定',
    CS0230: 'foreach 要同時寫出型別和變數名稱，例如 foreach (int n in path)',
    CS0547: 'void 的方法名稱後面要加 ()，不然會被當成屬性',
    CS1729: '這個類別的建構子不接受這麼多參數',
    CS0030: '這兩種型別之間不能轉換',
    CS0021: '這種型別不能用 [ ] 取值',
    CS0173: '三元運算子兩邊的型別不一致',
    CS1656: '不能指定值給方法',
    CS1059: '++ 和 -- 只能用在變數上',
    CS1515: 'foreach 的變數後面要接 in',
    CS0622: '{ } 初始化只能用在陣列或 List',
    CS0820: '用 var 宣告時不能直接用 { } 初始化',
    CS1526: 'new 後面要接 () 或 []',
    CS0026: 'this 只能用在類別的方法裡',
    CS0102: '類別裡已經有同名的成員了',
    CS1519: '類別裡不能直接寫這個東西',
    CS1526: 'new 後面要接 () 或 []',
    CS0642: 'if 後面多了一個分號，大括號裡的程式會變成每次都執行',
    CS0618: '這個 API 已經過時，請改用新的寫法',
    NullReferenceException: '用到了空的參考（null），可能是欄位沒有指定或物件身上沒有那個元件',
    IndexOutOfRangeException: '陣列的索引超出範圍：第一個元素是 [0]，最後一個是 [Length - 1]',
    ArgumentOutOfRangeException: 'List 的索引超出範圍：最後一個是 [Count - 1]',
    DivideByZeroException: '整數不能除以 0',
    KeyNotFoundException: 'Dictionary 裡沒有這個 key，先用 ContainsKey 檢查，或確認 key 的拼字和大小寫',
    ArgumentException: '傳進去的值不合理（例如 Dictionary 重複 Add 同一個 key，或要複製的物件是 null）',
    CS0411: '泛型方法要用 <型別> 指定型別，例如 JsonUtility.FromJson<SaveData>(json)',
    CS1922: '這種集合不能用 { } 初始化，請先 new 出來再一個一個加',
    CS0101: '已經有同名的型別了',
    MissingReferenceException: '這個物件已經被刪除了，卻還在使用它',
    InvalidOperationException: '現在不能做這個操作：例如 foreach 進行中修改集合，或是從空的 Stack / Queue 拿東西（先檢查 Count）',
    StackOverflowException: '方法無止境地呼叫自己',
    FREEZE: '程式一直跑不完（通常是無限迴圈），Unity 編輯器卡住沒有回應'
  };

  /* =========================================================
   * Tokenizer
   * ========================================================= */
  const KW = new Set(['int', 'float', 'double', 'bool', 'string', 'char', 'var', 'void', 'object',
    'if', 'else', 'for', 'foreach', 'in', 'while', 'do', 'break', 'continue', 'return', 'new',
    'true', 'false', 'null', 'class', 'struct', 'public', 'private', 'protected', 'internal',
    'static', 'const', 'readonly', 'switch', 'case', 'default', 'using', 'namespace', 'this',
    'yield', 'event', 'override', 'virtual', 'out', 'ref', 'typeof', 'base', 'enum']);
  const TYPE_KW = new Set(['int', 'float', 'double', 'bool', 'string', 'char', 'var', 'void', 'object']);
  const MODS = new Set(['public', 'private', 'protected', 'internal', 'static', 'const', 'readonly', 'override', 'virtual']);
  const OPS = ['??=', '++', '--', '+=', '-=', '*=', '/=', '%=', '==', '!=', '<=', '>=', '&&', '||', '=>', '?.', '??',
    '+', '-', '*', '/', '%', '=', '<', '>', '!', '?', ':', ';', ',', '.', '(', ')', '{', '}', '[', ']', '&', '|'];
  const isIdStart = (ch) => /[\p{L}_]/u.test(ch);
  const isIdPart = (ch) => /[\p{L}\p{N}_]/u.test(ch);
  const ESC = { n: '\n', t: '\t', r: '\r', '0': '\0', '"': '"', "'": "'", '\\': '\\' };

  function tokenize(src, line0, col0) {
    const toks = [];
    let i = 0;
    let line = line0 || 1;
    let col = col0 || 1;
    const n = src.length;
    function adv(k) {
      for (let j = 0; j < (k || 1); j++) {
        if (src[i] === '\n') { line++; col = 1; } else col++;
        i++;
      }
    }
    function push(t, extra, sl, sc) {
      toks.push(Object.assign({ t, line: sl, col: sc, eline: line, ecol: col }, extra));
    }
    while (i < n) {
      const c = src[i];
      if (c === '\n' || c === ' ' || c === '\t' || c === '\r' || c === '　') { adv(); continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') adv(); continue; }
      if (c === '/' && src[i + 1] === '*') {
        adv(2);
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) adv();
        adv(2);
        continue;
      }
      const sl = line, sc = col;
      // 數字
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let s = '';
        let real = false;
        while (i < n && /[0-9_]/.test(src[i])) { s += src[i]; adv(); }
        if (src[i] === '.' && /[0-9]/.test(src[i + 1] || '')) {
          real = true;
          s += '.'; adv();
          while (i < n && /[0-9]/.test(src[i])) { s += src[i]; adv(); }
        }
        let suf = '';
        if (/[fFdDmM]/.test(src[i] || '') && !isIdPart(src[i + 1] || ' ')) { suf = src[i].toLowerCase(); adv(); }
        const ty = suf === 'f' ? 'float' : (suf === 'd' || suf === 'm') ? 'double' : (real ? 'double' : 'int');
        push('num', { v: Number(s.replace(/_/g, '')), ty, text: s + suf }, sl, sc);
        continue;
      }
      // 名稱與關鍵字
      if (isIdStart(c)) {
        let s = '';
        while (i < n && isIdPart(src[i])) { s += src[i]; adv(); }
        push(KW.has(s) ? 'kw' : 'id', { v: s }, sl, sc);
        continue;
      }
      // 字串插值 $"..."
      if (c === '$' && src[i + 1] === '"') {
        adv(2);
        const parts = [];
        let buf = '';
        for (;;) {
          if (i >= n || src[i] === '\n') throw new CsError('compile', 'CS1010', 'Newline in constant', sl, sc);
          const ch = src[i];
          if (ch === '"') { adv(); break; }
          if (ch === '\\') { buf += ESC[src[i + 1]] !== undefined ? ESC[src[i + 1]] : src[i + 1]; adv(2); continue; }
          if (ch === '{' && src[i + 1] === '{') { buf += '{'; adv(2); continue; }
          if (ch === '}' && src[i + 1] === '}') { buf += '}'; adv(2); continue; }
          if (ch === '{') {
            if (buf) { parts.push({ s: buf }); buf = ''; }
            adv();
            const el = line, ec = col;
            let depth = 0;
            let e = '';
            while (i < n && !(src[i] === '}' && depth === 0)) {
              const q = src[i];
              if (q === '\n') throw new CsError('compile', 'CS1010', 'Newline in constant', sl, sc);
              if (q === '"') {
                e += q; adv();
                while (i < n && src[i] !== '"' && src[i] !== '\n') {
                  if (src[i] === '\\') { e += src[i]; adv(); }
                  e += src[i]; adv();
                }
                e += '"'; adv();
                continue;
              }
              if (q === '(' || q === '[' || q === '{') depth++;
              if (q === ')' || q === ']' || q === '}') depth--;
              e += q; adv();
            }
            if (src[i] !== '}') throw new CsError('compile', 'CS1010', 'Newline in constant', sl, sc);
            adv();
            let fmt = null;
            let d2 = 0;
            for (let k = 0; k < e.length; k++) {
              const q = e[k];
              if (q === '"') { k++; while (k < e.length && e[k] !== '"') k++; continue; }
              if ('([{'.includes(q)) d2++;
              else if (')]}'.includes(q)) d2--;
              else if (q === ':' && d2 === 0) { fmt = e.slice(k + 1); e = e.slice(0, k); break; }
            }
            parts.push({ toks: tokenize(e, el, ec), fmt, line: el, col: ec });
            continue;
          }
          buf += ch; adv();
        }
        if (buf) parts.push({ s: buf });
        push('istr', { parts }, sl, sc);
        continue;
      }
      if (c === '"') {
        adv();
        let s = '';
        for (;;) {
          if (i >= n || src[i] === '\n') throw new CsError('compile', 'CS1010', 'Newline in constant', sl, sc);
          if (src[i] === '"') { adv(); break; }
          if (src[i] === '\\') { s += ESC[src[i + 1]] !== undefined ? ESC[src[i + 1]] : src[i + 1]; adv(2); continue; }
          s += src[i]; adv();
        }
        push('str', { v: s }, sl, sc);
        continue;
      }
      if (c === "'") {
        adv();
        let s = '';
        while (i < n && src[i] !== "'" && src[i] !== '\n') {
          if (src[i] === '\\') { s += ESC[src[i + 1]] !== undefined ? ESC[src[i + 1]] : src[i + 1]; adv(2); continue; }
          s += src[i]; adv();
        }
        if (src[i] !== "'") throw new CsError('compile', 'CS1010', 'Newline in constant', sl, sc);
        adv();
        if (s.length === 0) throw new CsError('compile', 'CS1011', 'Empty character literal', sl, sc);
        if ([...s].length > 1) throw new CsError('compile', 'CS1012', 'Too many characters in character literal', sl, sc);
        push('char', { v: s }, sl, sc);
        continue;
      }
      let matched = null;
      for (const op of OPS) if (src.startsWith(op, i)) { matched = op; break; }
      if (matched) {
        adv(matched.length);
        push('op', { v: matched }, sl, sc);
        continue;
      }
      throw new CsError('compile', 'CS1056', `Unexpected character '${c}'`, sl, sc);
    }
    toks.push({ t: 'eof', v: '', line, col, eline: line, ecol: col });
    return toks;
  }

  /* =========================================================
   * Parser
   * ========================================================= */
  const EXPECT = {
    ';': ['CS1002', '; expected'],
    ')': ['CS1026', ') expected'],
    '}': ['CS1513', '} expected'],
    '{': ['CS1514', '{ expected'],
    ']': ['CS1003', "Syntax error, ']' expected"],
    '(': ['CS1003', "Syntax error, '(' expected"],
    ':': ['CS1003', "Syntax error, ':' expected"],
    'in': ['CS1515', "'in' expected"]
  };

  function typeStr(t) {
    if (!t) return '?';
    let s = t.name;
    if (t.args && t.args.length) s += '<' + t.args.map(typeStr).join(', ') + '>';
    for (let k = 0; k < t.rank; k++) s += '[]';
    return s;
  }

  class Parser {
    constructor(toks) { this.t = toks; this.i = 0; }
    get cur() { return this.t[this.i]; }
    peek(k) { return this.t[Math.min(this.i + (k || 0), this.t.length - 1)]; }
    prev() { return this.t[Math.max(0, this.i - 1)]; }
    is(v, k) { const t = this.peek(k); return (t.t === 'op' || t.t === 'kw') && t.v === v; }
    isId(k) { return this.peek(k).t === 'id'; }
    next() { const t = this.cur; if (t.t !== 'eof') this.i++; return t; }
    accept(v) { return this.is(v) ? this.next() : null; }
    err(code, msg, tok) {
      tok = tok || this.cur;
      throw new CsError('compile', code, msg, tok.line, tok.col);
    }
    expect(v) {
      if (this.is(v)) return this.next();
      const [code, msg] = EXPECT[v] || ['CS1003', `Syntax error, '${v}' expected`];
      if (v === ';' || v === ')') {
        const p = this.prev();
        throw new CsError('compile', code, msg, p.eline, p.ecol);
      }
      this.err(code, msg);
    }
    expectId() {
      if (this.isId()) return this.next();
      const t = this.cur;
      if (t.t === 'kw') this.err('CS1041', `Identifier expected; '${t.v}' is a keyword`);
      this.err('CS1001', 'Identifier expected');
    }
    pos(t) { return { line: t.line, col: t.col }; }

    parseEnum() {
      this.next(); // enum
      const id = this.expectId();
      if (this.accept(':')) this.tryType();
      this.expect('{');
      const members = [];
      let v = 0;
      while (!this.is('}')) {
        if (this.cur.t === 'eof') this.err('CS1513', '} expected');
        const m = this.expectId();
        if (this.accept('=')) {
          const neg = !!this.accept('-');
          const n = this.next();
          if (n.t !== 'num') this.err('CS1525', `Invalid expression term '${n.v}'`, n);
          v = neg ? -n.v : n.v;
        }
        members.push({ name: m.v, value: v, line: m.line, col: m.col });
        v++;
        if (!this.accept(',')) break;
      }
      this.expect('}');
      this.accept(';');
      return { k: 'enum', name: id.v, members, line: id.line, col: id.col };
    }

    parseProgram() {
      const prog = { usings: [], classes: [], methods: [], stmts: [], enums: [] };
      while (this.cur.t !== 'eof') {
        if (this.is('using')) {
          const u = this.next();
          let name = '';
          while (!this.is(';') && this.cur.t !== 'eof' && this.cur.line === u.line) name += this.next().v;
          this.expect(';');
          prog.usings.push(name);
          continue;
        }
        const save = this.i;
        const attrs = this.parseAttributes();
        const mods = this.parseMods();
        if (this.is('class')) { prog.classes.push(this.parseClass(mods, attrs)); continue; }
        if (this.is('enum')) { prog.enums.push(this.parseEnum()); continue; }
        const ty = this.tryType();
        if (ty && this.isId() && this.is('(', 1)) { prog.methods.push(this.parseMethod(mods, ty, attrs)); continue; }
        this.i = save;
        prog.stmts.push(this.parseStatement());
      }
      // 類別裡宣告的 enum 也當成全域的（簡化）
      for (const c of prog.classes) for (const e of c.enums || []) prog.enums.push(e);
      return prog;
    }

    parseAttributes() {
      const attrs = [];
      while (this.is('[') && this.isId(1)) {
        this.next();
        for (;;) {
          const a = this.expectId();
          let name = a.v;
          while (this.is('.') && this.isId(1)) { this.next(); name += '.' + this.next().v; }
          attrs.push({ name, line: a.line, col: a.col });
          if (this.is('(')) this.skipBalanced('(', ')');
          if (this.accept(',')) continue;
          break;
        }
        this.expect(']');
      }
      return attrs;
    }
    skipBalanced(open, close) {
      let depth = 0;
      do {
        if (this.cur.t === 'eof') this.expect(close);
        if (this.is(open)) depth++;
        else if (this.is(close)) depth--;
        this.next();
      } while (depth > 0);
    }
    parseMods() {
      const mods = [];
      while (this.cur.t === 'kw' && MODS.has(this.cur.v)) mods.push(this.next().v);
      return mods;
    }

    tryType() {
      const s = this.i;
      const t = this.cur;
      let name;
      if (t.t === 'kw' && TYPE_KW.has(t.v)) { name = t.v; this.next(); }
      else if (t.t === 'id') {
        name = t.v; this.next();
        while (this.is('.') && this.isId(1)) { this.next(); name += '.' + this.next().v; }
      } else { this.i = s; return null; }
      const node = { name, args: [], rank: 0, line: t.line, col: t.col };
      if (this.is('<')) {
        const s2 = this.i;
        this.next();
        const args = [];
        let ok = true;
        for (;;) {
          const a = this.tryType();
          if (!a) { ok = false; break; }
          args.push(a);
          if (this.accept(',')) continue;
          break;
        }
        if (ok && this.is('>')) { this.next(); node.args = args; } else this.i = s2;
      }
      while (this.is('[') && this.is(']', 1)) { this.next(); this.next(); node.rank++; }
      return node;
    }
    isDeclStart() {
      const s = this.i;
      const ty = this.tryType();
      let ok = false;
      if (ty && this.isId()) {
        const kwType = TYPE_KW.has(ty.name) || ty.args.length > 0 || ty.rank > 0;
        ok = kwType || this.is('=', 1) || this.is(';', 1) || this.is(',', 1) || this.is('in', 1) || this.is(')', 1);
      }
      this.i = s;
      return ok;
    }

    parseClass(mods, attrs) {
      this.next(); // class
      const id = this.expectId();
      let base = null;
      if (this.accept(':')) {
        const b = this.tryType();
        base = b ? b.name : null;
        while (this.accept(',')) this.tryType();
      }
      this.expect('{');
      const cls = { k: 'class', name: id.v, base, attrs, fields: [], methods: [], ctors: [], line: id.line, col: id.col };
      while (!this.is('}')) {
        if (this.cur.t === 'eof') this.err('CS1513', '} expected');
        const fAttrs = this.parseAttributes();
        const fMods = this.parseMods();
        if (this.is('enum')) { (cls.enums = cls.enums || []).push(this.parseEnum()); continue; }
        if (this.is('event')) {
          this.next();
          const ty = this.tryType();
          const fid = this.expectId();
          this.expect(';');
          cls.fields.push({ name: fid.v, ty, mods: fMods, attrs: fAttrs, isEvent: true, line: fid.line, col: fid.col });
          continue;
        }
        if (this.isId() && this.cur.v === cls.name && this.is('(', 1)) {
          const m = this.parseMethod(fMods, { name: 'void', args: [], rank: 0 }, fAttrs);
          m.isCtor = true;
          cls.ctors.push(m);
          continue;
        }
        const ty = this.tryType();
        if (!ty) this.err('CS1519', `Invalid token '${this.cur.v}' in class, record, struct, or interface member declaration`);
        if (this.isId() && this.is('(', 1)) { cls.methods.push(this.parseMethod(fMods, ty, fAttrs)); continue; }
        const fid = this.expectId();
        if (this.is('{')) { // 自動屬性 { get; set; }
          if (ty.name === 'void') throw new CsError('compile', 'CS0547', `'${cls.name}.${fid.v}': property or indexer cannot have void type`, fid.line, fid.col);
          this.skipBalanced('{', '}');
          let init = null;
          if (this.accept('=')) { init = this.parseExpr(); this.expect(';'); }
          cls.fields.push({ name: fid.v, ty, init, mods: fMods, attrs: fAttrs, isProp: true, line: fid.line, col: fid.col });
          continue;
        }
        let first = fid;
        for (;;) {
          let init = null;
          if (this.accept('=')) init = this.is('{') ? this.parseArrayInit() : this.parseExpr();
          cls.fields.push({ name: first.v, ty, init, mods: fMods, attrs: fAttrs, line: first.line, col: first.col });
          if (!this.accept(',')) break;
          first = this.expectId();
        }
        this.expect(';');
      }
      this.next();
      return cls;
    }

    parseMethod(mods, ty, attrs) {
      const id = this.expectId();
      this.expect('(');
      const params = [];
      while (!this.is(')')) {
        if (this.cur.t === 'eof') this.expect(')');
        this.accept('out') || this.accept('ref');
        const pty = this.tryType();
        if (!pty) this.err('CS1001', 'Identifier expected');
        const pid = this.expectId();
        let def = null;
        if (this.accept('=')) def = this.parseExpr();
        params.push({ ty: pty, name: pid.v, def, line: pid.line, col: pid.col });
        if (!this.accept(',')) break;
      }
      this.expect(')');
      let body;
      if (this.is('=>')) {
        const a = this.next();
        const e = this.parseExpr();
        this.expect(';');
        const st = ty.name === 'void' ? { k: 'expr', e, line: e.line, col: e.col } : { k: 'return', e, line: e.line, col: e.col };
        body = { k: 'block', stmts: [st], line: a.line, col: a.col };
      } else body = this.parseBlock();
      return { k: 'method', name: id.v, ret: ty, params, body, mods, attrs, line: id.line, col: id.col };
    }

    parseBlock() {
      const t = this.expect('{');
      const stmts = [];
      while (!this.is('}')) {
        if (this.cur.t === 'eof') this.err('CS1513', '} expected');
        stmts.push(this.parseStatement());
      }
      const close = this.next();
      return { k: 'block', stmts, line: t.line, col: t.col, eline: close.line };
    }

    parseStatement() {
      const t = this.cur;
      const P = this.pos(t);
      if (this.is('{')) return this.parseBlock();
      if (this.is(';')) { this.next(); return { k: 'empty', ...P }; }
      if (t.t === 'kw') {
        switch (t.v) {
          case 'if': {
            this.next(); this.expect('(');
            const cond = this.parseExpr();
            this.expect(')');
            const then = this.parseStatement();
            let els = null;
            if (this.accept('else')) els = this.parseStatement();
            return { k: 'if', cond, then, els, ...P };
          }
          case 'while': {
            this.next(); this.expect('(');
            const cond = this.parseExpr();
            this.expect(')');
            return { k: 'while', cond, body: this.parseStatement(), ...P };
          }
          case 'do': {
            this.next();
            const body = this.parseStatement();
            this.expect('while'); this.expect('(');
            const cond = this.parseExpr();
            this.expect(')'); this.expect(';');
            return { k: 'do', cond, body, ...P };
          }
          case 'for': {
            this.next(); this.expect('(');
            let init = null;
            if (!this.is(';')) {
              if (this.isDeclStart()) init = this.parseLocalDecl();
              else { init = [this.parseExpr()]; while (this.accept(',')) init.push(this.parseExpr()); }
            }
            this.expect(';');
            const cond = this.is(';') ? null : this.parseExpr();
            this.expect(';');
            const iter = [];
            if (!this.is(')')) { iter.push(this.parseExpr()); while (this.accept(',')) iter.push(this.parseExpr()); }
            this.expect(')');
            for (const x of iter) {
              if (!['assign', 'call', 'inc', 'new'].includes(x.k)) {
                throw new CsError('compile', 'CS0201', 'Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement', x.line, x.col);
              }
            }
            return { k: 'for', init, cond, iter, body: this.parseStatement(), ...P };
          }
          case 'foreach': {
            this.next(); this.expect('(');
            const ty = this.tryType();
            if (!ty) this.err('CS1001', 'Identifier expected');
            if (this.is('in')) this.err('CS0230', 'Type and identifier are both required in a foreach statement');
            const id = this.expectId();
            this.expect('in');
            const coll = this.parseExpr();
            this.expect(')');
            return { k: 'foreach', ty, name: id.v, coll, body: this.parseStatement(), ...P };
          }
          case 'switch': {
            this.next(); this.expect('(');
            const e = this.parseExpr();
            this.expect(')'); this.expect('{');
            const sections = [];
            while (!this.is('}')) {
              if (this.cur.t === 'eof') this.err('CS1513', '} expected');
              const labels = [];
              while (this.is('case') || this.is('default')) {
                const lt = this.next();
                if (lt.v === 'case') {
                  const v = this.parseExpr();
                  this.expect(':');
                  labels.push({ v, line: lt.line, col: lt.col });
                } else {
                  this.expect(':');
                  labels.push({ def: true, line: lt.line, col: lt.col });
                }
              }
              if (!labels.length) this.err('CS1525', `Invalid expression term '${this.cur.v}'`);
              const stmts = [];
              while (!this.is('case') && !this.is('default') && !this.is('}')) {
                if (this.cur.t === 'eof') this.err('CS1513', '} expected');
                stmts.push(this.parseStatement());
              }
              sections.push({ labels, stmts });
            }
            this.next();
            return { k: 'switch', e, sections, ...P };
          }
          case 'break': this.next(); this.expect(';'); return { k: 'break', ...P };
          case 'continue': this.next(); this.expect(';'); return { k: 'continue', ...P };
          case 'return': {
            this.next();
            const e = this.is(';') ? null : this.parseExpr();
            this.expect(';');
            return { k: 'return', e, ...P };
          }
          case 'yield': {
            this.next();
            if (this.accept('break')) { this.expect(';'); return { k: 'yieldbreak', ...P }; }
            this.expect('return');
            const e = this.parseExpr();
            this.expect(';');
            return { k: 'yield', e, ...P };
          }
          case 'const': {
            this.next();
            const d = this.parseLocalDecl();
            d.isConst = true;
            this.expect(';');
            return d;
          }
          case 'else':
          case 'case':
          case 'default':
            this.err('CS1525', `Invalid expression term '${t.v}'`);
            break;
          default:
        }
      }
      if (this.isDeclStart()) {
        const d = this.parseLocalDecl();
        this.expect(';');
        return d;
      }
      const e = this.parseExpr();
      this.expect(';');
      const ok = e.k === 'assign' || e.k === 'call' || e.k === 'inc' || e.k === 'new';
      if (!ok) throw new CsError('compile', 'CS0201', 'Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement', e.line, e.col);
      return { k: 'expr', e, ...P };
    }

    parseLocalDecl() {
      const ty = this.tryType();
      const decls = [];
      for (;;) {
        const id = this.expectId();
        let init = null;
        if (this.accept('=')) init = this.is('{') ? this.parseArrayInit() : this.parseExpr();
        decls.push({ name: id.v, init, line: id.line, col: id.col });
        if (!this.accept(',')) break;
      }
      return { k: 'decl', ty, decls, line: ty.line, col: ty.col };
    }

    parseArrayInit() {
      const t = this.expect('{');
      const items = [];
      while (!this.is('}')) {
        if (this.cur.t === 'eof') this.err('CS1513', '} expected');
        items.push(this.parseExpr());
        if (!this.accept(',')) break;
      }
      this.expect('}');
      return { k: 'arrinit', items, line: t.line, col: t.col };
    }

    /* ---------- 運算式 ---------- */
    parseExpr() { return this.parseAssign(); }
    parseAssign() {
      const left = this.parseTernary();
      const t = this.cur;
      if (t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '??='].includes(t.v)) {
        this.next();
        if (!['id', 'member', 'index'].includes(left.k)) {
          throw new CsError('compile', 'CS0131', 'The left-hand side of an assignment must be a variable, property or indexer', left.line, left.col);
        }
        const value = this.parseAssign();
        return { k: 'assign', op: t.v, target: left, value, line: left.line, col: left.col };
      }
      return left;
    }
    parseTernary() {
      const c = this.parseCoalesce();
      if (this.is('?')) {
        this.next();
        const a = this.parseAssign();
        this.expect(':');
        const b = this.parseAssign();
        return { k: 'tern', c, a, b, line: c.line, col: c.col };
      }
      return c;
    }
    parseCoalesce() {
      const l = this.parseBin(0);
      if (this.is('??')) {
        this.next();
        const r = this.parseCoalesce();
        return { k: 'coalesce', l, r, line: l.line, col: l.col };
      }
      return l;
    }
    parseBin(level) {
      const LEVELS = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
      if (level >= LEVELS.length) return this.parseUnary();
      let l = this.parseBin(level + 1);
      while (this.cur.t === 'op' && LEVELS[level].includes(this.cur.v)) {
        const op = this.next();
        const r = this.parseBin(level + 1);
        l = { k: 'bin', op: op.v, l, r, line: l.line, col: l.col, opLine: op.line, opCol: op.col };
      }
      return l;
    }
    parseUnary() {
      const t = this.cur;
      if (this.is('!') || this.is('-') || this.is('+')) {
        this.next();
        return { k: 'unary', op: t.v, e: this.parseUnary(), line: t.line, col: t.col };
      }
      if (this.is('++') || this.is('--')) {
        this.next();
        return { k: 'inc', op: t.v, prefix: true, e: this.parseUnary(), line: t.line, col: t.col };
      }
      if (this.is('(') && this.peek(1).t === 'kw' && TYPE_KW.has(this.peek(1).v) && this.is(')', 2)) {
        this.next();
        const to = this.next().v;
        this.next();
        return { k: 'cast', to, e: this.parseUnary(), line: t.line, col: t.col };
      }
      return this.parsePostfix();
    }
    tryTypeArgsBeforeCall() {
      if (!this.is('<')) return null;
      const s = this.i;
      this.next();
      const a = [];
      let ok = true;
      for (;;) {
        const ty = this.tryType();
        if (!ty) { ok = false; break; }
        a.push(ty);
        if (!this.accept(',')) break;
      }
      if (ok && this.is('>') && this.is('(', 1)) { this.next(); return a; }
      this.i = s;
      return null;
    }
    parsePostfix() {
      let e = this.parsePrimary();
      for (;;) {
        if (this.is('.') || this.is('?.')) {
          const nullCond = this.cur.v === '?.';
          this.next();
          const id = this.expectId();
          const targs = this.tryTypeArgsBeforeCall();
          e = { k: 'member', obj: e, name: id.v, nullCond, targs, line: e.line, col: e.col, nameLine: id.line, nameCol: id.col };
          continue;
        }
        if (this.is('(')) {
          const args = this.parseArgs();
          e = { k: 'call', callee: e, args, line: e.line, col: e.col };
          continue;
        }
        if (this.is('[')) {
          this.next();
          const idx = this.parseExpr();
          this.expect(']');
          e = { k: 'index', obj: e, idx, line: e.line, col: e.col };
          continue;
        }
        if (this.is('++') || this.is('--')) {
          const op = this.next().v;
          e = { k: 'inc', op, prefix: false, e, line: e.line, col: e.col };
          continue;
        }
        break;
      }
      return e;
    }
    parseArgs() {
      this.expect('(');
      const args = [];
      while (!this.is(')')) {
        if (this.cur.t === 'eof') this.expect(')');
        if (this.accept('out')) {
          const ty = this.tryType();
          if (ty && this.isId()) {
            const id = this.next();
            args.push({ k: 'outdecl', ty, name: id.v, line: ty.line, col: ty.col });
          } else if (ty) {
            args.push({ k: 'id', name: ty.name, line: ty.line, col: ty.col, isOut: true });
          } else this.err('CS1525', `Invalid expression term '${this.cur.v}'`);
        } else args.push(this.parseExpr());
        if (!this.accept(',')) break;
      }
      this.expect(')');
      return args;
    }
    parseSub(toks, line, col) {
      const p = new Parser(toks);
      if (p.cur.t === 'eof') throw new CsError('compile', 'CS1733', 'Expected expression', line, col);
      const e = p.parseExpr();
      if (p.cur.t !== 'eof') p.err('CS1003', `Syntax error, '}' expected`);
      return e;
    }
    parsePrimary() {
      const t = this.cur;
      const P = this.pos(t);
      switch (t.t) {
        case 'num': this.next(); return { k: 'num', v: t.v, ty: t.ty, text: t.text, ...P };
        case 'str': this.next(); return { k: 'str', v: t.v, ...P };
        case 'char': this.next(); return { k: 'char', v: t.v, ...P };
        case 'istr': {
          this.next();
          const parts = t.parts.map((p) => (p.s !== undefined ? p : { e: this.parseSub(p.toks, p.line, p.col), fmt: p.fmt }));
          return { k: 'istr', parts, ...P };
        }
        case 'id': {
          this.next();
          const targs = this.tryTypeArgsBeforeCall();
          return { k: 'id', name: t.v, targs, ...P };
        }
        case 'kw':
          if (t.v === 'true' || t.v === 'false') { this.next(); return { k: 'bool', v: t.v === 'true', ...P }; }
          if (t.v === 'null') { this.next(); return { k: 'null', ...P }; }
          if (t.v === 'this') { this.next(); return { k: 'this', ...P }; }
          if (t.v === 'new') return this.parseNew();
          if (t.v === 'typeof') {
            this.next(); this.expect('(');
            const ty = this.tryType();
            this.expect(')');
            return { k: 'typeof', ty, ...P };
          }
          if (TYPE_KW.has(t.v) && this.is('.', 1)) { this.next(); return { k: 'id', name: t.v, ...P }; }
          this.err('CS1525', `Invalid expression term '${t.v}'`);
          break;
        case 'op':
          if (t.v === '(') {
            this.next();
            const e = this.parseExpr();
            this.expect(')');
            return { k: 'paren', e, ...P };
          }
          this.err('CS1525', `Invalid expression term '${t.v}'`);
          break;
        default:
          this.err('CS1733', 'Expected expression');
      }
      return null;
    }
    parseNew() {
      const t = this.next();
      const P = this.pos(t);
      const ty = this.tryType();
      if (!ty) this.err('CS1526', 'A new expression requires an argument list or (), [], or {} after type');
      if (this.is('[')) {
        this.next();
        const size = this.parseExpr();
        this.expect(']');
        return { k: 'newarr', elem: ty, size, init: null, ...P };
      }
      if (ty.rank > 0) {
        const init = this.parseArrayInit();
        return { k: 'newarr', elem: Object.assign({}, ty, { rank: ty.rank - 1 }), size: null, init, ...P };
      }
      let args = [];
      if (this.is('(')) args = this.parseArgs();
      else if (!this.is('{')) this.err('CS1526', 'A new expression requires an argument list or (), [], or {} after type');
      const init = this.is('{') ? this.parseArrayInit() : null;
      return { k: 'new', ty, args, init, ...P };
    }
  }

  function parse(src) {
    const toks = tokenize(src);
    return new Parser(toks).parseProgram();
  }

  /* =========================================================
   * 型別表（給檢查器用，也決定執行時的行為）
   * sig: { r: 回傳型別, p: [參數型別], min: 最少參數數 }
   *   型別 '?' 任意、'num' 任意數字（回傳時取最大的數字型別）、'T' List 的元素型別、'targ' 泛型參數
   * ========================================================= */
  function sig(r, p, min) { return { fn: true, r, p: p || [], min: min === undefined ? (p || []).length : min }; }
  const KEYS = 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => c + 'Key')
    .concat(['spaceKey', 'enterKey', 'escapeKey', 'tabKey', 'leftArrowKey', 'rightArrowKey', 'upArrowKey', 'downArrowKey', 'leftShiftKey'])
    .concat([1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `digit${d}Key`));
  const keyProps = {};
  KEYS.forEach((k) => { keyProps[k] = { t: 'KeyControl', ro: true }; });

  const TYPES = {
    string: { props: { Length: { t: 'int', ro: true } }, methods: { ToUpper: sig('string'), ToLower: sig('string'), Contains: sig('bool', ['string']), StartsWith: sig('bool', ['string']), Replace: sig('string', ['string', 'string']), ToString: sig('string') } },
    List: { props: { Count: { t: 'int', ro: true } }, methods: { Add: sig('void', ['T']), Remove: sig('bool', ['T']), Contains: sig('bool', ['T']), Clear: sig('void'), RemoveAt: sig('void', ['int']), Insert: sig('void', ['int', 'T']), IndexOf: sig('int', ['T']) } },
    Stack: { props: { Count: { t: 'int', ro: true } }, methods: { Push: sig('void', ['T']), Pop: sig('T'), Peek: sig('T'), Clear: sig('void'), Contains: sig('bool', ['T']) } },
    Queue: { props: { Count: { t: 'int', ro: true } }, methods: { Enqueue: sig('void', ['T']), Dequeue: sig('T'), Peek: sig('T'), Clear: sig('void'), Contains: sig('bool', ['T']) } },
    Dictionary: {
      props: { Count: { t: 'int', ro: true } },
      methods: { Add: sig('void', ['K', 'V']), ContainsKey: sig('bool', ['K']), Remove: sig('bool', ['K']), Clear: sig('void'), TryGetValue: sig('bool', ['K', 'V']) }
    },
    KeyValuePair: { props: { Key: { t: 'K', ro: true }, Value: { t: 'V', ro: true } }, methods: {} },
    Array: { props: { Length: { t: 'int', ro: true } }, methods: {} },
    Action: { props: {}, methods: { Invoke: sig('void', ['?', '?'], 0) } },
    Debug: { statics: {}, staticMethods: { Log: sig('void', ['?']), LogWarning: sig('void', ['?']), LogError: sig('void', ['?']), DrawLine: sig('void', ['Vector3', 'Vector3', 'Color', 'float'], 2) } },
    Mathf: {
      statics: { PI: { t: 'float', ro: true }, Infinity: { t: 'float', ro: true } },
      staticMethods: {
        Abs: sig('num', ['num']), Min: sig('num', ['num', 'num']), Max: sig('num', ['num', 'num']),
        Clamp: sig('num', ['num', 'num', 'num']), Clamp01: sig('float', ['float']), Sqrt: sig('float', ['float']),
        Round: sig('float', ['float']), Floor: sig('float', ['float']), Ceil: sig('float', ['float']),
        RoundToInt: sig('int', ['float']), FloorToInt: sig('int', ['float']), CeilToInt: sig('int', ['float']),
        Sign: sig('float', ['float']), Lerp: sig('float', ['float', 'float', 'float']), MoveTowards: sig('float', ['float', 'float', 'float']),
        Sin: sig('float', ['float']), Cos: sig('float', ['float']), Pow: sig('float', ['float', 'float'])
      }
    },
    Random: { statics: { value: { t: 'float', ro: true } }, staticMethods: { Range: sig('num', ['num', 'num']) } },
    Vector2: {
      struct: true,
      props: { x: { t: 'float' }, y: { t: 'float' }, normalized: { t: 'Vector2', ro: true }, magnitude: { t: 'float', ro: true }, sqrMagnitude: { t: 'float', ro: true } },
      methods: { Normalize: sig('void'), ToString: sig('string') },
      statics: { zero: { t: 'Vector2', ro: true }, one: { t: 'Vector2', ro: true }, up: { t: 'Vector2', ro: true }, down: { t: 'Vector2', ro: true }, left: { t: 'Vector2', ro: true }, right: { t: 'Vector2', ro: true } },
      staticMethods: { Distance: sig('float', ['Vector2', 'Vector2']), MoveTowards: sig('Vector2', ['Vector2', 'Vector2', 'float']), Lerp: sig('Vector2', ['Vector2', 'Vector2', 'float']) },
      ctor: { p: ['float', 'float'], min: 0 }
    },
    Vector3: {
      struct: true,
      props: { x: { t: 'float' }, y: { t: 'float' }, z: { t: 'float' }, normalized: { t: 'Vector3', ro: true }, magnitude: { t: 'float', ro: true }, sqrMagnitude: { t: 'float', ro: true } },
      methods: { Normalize: sig('void'), ToString: sig('string') },
      statics: { zero: { t: 'Vector3', ro: true }, one: { t: 'Vector3', ro: true }, up: { t: 'Vector3', ro: true }, down: { t: 'Vector3', ro: true }, left: { t: 'Vector3', ro: true }, right: { t: 'Vector3', ro: true }, forward: { t: 'Vector3', ro: true } },
      staticMethods: { Distance: sig('float', ['Vector3', 'Vector3']), MoveTowards: sig('Vector3', ['Vector3', 'Vector3', 'float']), Lerp: sig('Vector3', ['Vector3', 'Vector3', 'float']) },
      ctor: { p: ['float', 'float', 'float'], min: 0 }
    },
    Color: {
      struct: true,
      props: { r: { t: 'float' }, g: { t: 'float' }, b: { t: 'float' }, a: { t: 'float' } },
      methods: {},
      statics: ['red', 'green', 'blue', 'white', 'black', 'yellow', 'cyan', 'magenta', 'gray', 'clear'].reduce((o, k) => { o[k] = { t: 'Color', ro: true }; return o; }, {}),
      staticMethods: {},
      ctor: { p: ['float', 'float', 'float', 'float'], min: 3 }
    },
    Vector2Int: {
      struct: true,
      props: { x: { t: 'int' }, y: { t: 'int' }, magnitude: { t: 'float', ro: true } },
      methods: { ToString: sig('string') },
      statics: ['zero', 'one', 'up', 'down', 'left', 'right'].reduce((o, k) => { o[k] = { t: 'Vector2Int', ro: true }; return o; }, {}),
      staticMethods: { Distance: sig('float', ['Vector2Int', 'Vector2Int']) },
      ctor: { p: ['int', 'int'], min: 0 }
    },
    Quaternion: { struct: true, props: {}, methods: {}, statics: { identity: { t: 'Quaternion', ro: true } }, staticMethods: {} },
    Mouse: { props: { leftButton: { t: 'ButtonControl', ro: true }, rightButton: { t: 'ButtonControl', ro: true }, position: { t: 'Vector2Control', ro: true } }, methods: {}, statics: { current: { t: 'Mouse', ro: true } }, staticMethods: {} },
    ButtonControl: { props: { isPressed: { t: 'bool', ro: true }, wasPressedThisFrame: { t: 'bool', ro: true }, wasReleasedThisFrame: { t: 'bool', ro: true } }, methods: {} },
    Vector2Control: { props: {}, methods: { ReadValue: sig('Vector2') } },
    Camera: {
      props: { orthographicSize: { t: 'float' }, transform: { t: 'Transform', ro: true } },
      methods: { ScreenToWorldPoint: sig('Vector3', ['Vector3']), WorldToScreenPoint: sig('Vector3', ['Vector3']) },
      statics: { main: { t: 'Camera', ro: true } }, staticMethods: {}
    },
    PlayerPrefs: {
      statics: {},
      staticMethods: {
        SetInt: sig('void', ['string', 'int']), GetInt: sig('int', ['string', 'int'], 1),
        SetFloat: sig('void', ['string', 'float']), GetFloat: sig('float', ['string', 'float'], 1),
        SetString: sig('void', ['string', 'string']), GetString: sig('string', ['string', 'string'], 1),
        HasKey: sig('bool', ['string']), DeleteKey: sig('void', ['string']), DeleteAll: sig('void'), Save: sig('void')
      }
    },
    JsonUtility: { statics: {}, staticMethods: { ToJson: sig('string', ['?', 'bool'], 1), FromJson: sig('targ', ['string']) } },
    WaitForSeconds: { props: {}, methods: {}, ctor: { p: ['float'], min: 1 } },
    WaitForSecondsRealtime: { props: {}, methods: {}, ctor: { p: ['float'], min: 1 } },
    IEnumerator: { props: {}, methods: {} },
    Coroutine: { props: {}, methods: {} },
    Time: {
      statics: { deltaTime: { t: 'float', ro: true }, time: { t: 'float', ro: true }, fixedDeltaTime: { t: 'float', ro: true }, unscaledDeltaTime: { t: 'float', ro: true }, timeScale: { t: 'float' }, frameCount: { t: 'int', ro: true } },
      staticMethods: {}
    },
    Keyboard: { props: keyProps, methods: {}, statics: { current: { t: 'Keyboard', ro: true } }, staticMethods: {} },
    KeyControl: { props: { isPressed: { t: 'bool', ro: true }, wasPressedThisFrame: { t: 'bool', ro: true }, wasReleasedThisFrame: { t: 'bool', ro: true } }, methods: {} },
    Transform: {
      props: { position: { t: 'Vector3' }, localScale: { t: 'Vector3' }, gameObject: { t: 'GameObject', ro: true }, name: { t: 'string' } },
      methods: { Translate: sig('void', ['?', '?', '?'], 1), Rotate: sig('void', ['float', 'float', 'float']), GetComponent: sig('targ'), CompareTag: sig('bool', ['string']) }
    },
    GameObject: {
      props: { name: { t: 'string' }, tag: { t: 'string' }, transform: { t: 'Transform', ro: true }, activeSelf: { t: 'bool', ro: true } },
      methods: { CompareTag: sig('bool', ['string']), SetActive: sig('void', ['bool']), GetComponent: sig('targ') },
      statics: {}, staticMethods: { FindWithTag: sig('GameObject', ['string']), FindGameObjectsWithTag: sig('GameObject[]', ['string']) },
      ctor: { p: ['string'], min: 0 }
    },
    Vector3Int: {
      struct: true,
      props: { x: { t: 'int' }, y: { t: 'int' }, z: { t: 'int' } },
      methods: { ToString: sig('string') },
      ctor: { p: ['int', 'int', 'int'], min: 2 }
    },
    TileBase: { props: { name: { t: 'string', ro: true } }, methods: {} },
    Tilemap: {
      props: {},
      methods: {
        SetTile: sig('void', ['Vector3Int', 'TileBase']), HasTile: sig('bool', ['Vector3Int']), GetTile: sig('TileBase', ['Vector3Int']), ClearAllTiles: sig('void'),
        WorldToCell: sig('Vector3Int', ['Vector3']), GetCellCenterWorld: sig('Vector3', ['Vector3Int'])
      }
    },
    Collider: { props: { gameObject: { t: 'GameObject', ro: true }, tag: { t: 'string' } }, methods: { CompareTag: sig('bool', ['string']) } },
    Collision: { props: { gameObject: { t: 'GameObject', ro: true } }, methods: {} },
    SpriteRenderer: { props: { color: { t: 'Color' }, flipX: { t: 'bool' }, flipY: { t: 'bool' }, enabled: { t: 'bool' }, gameObject: { t: 'GameObject', ro: true } }, methods: {} },
    Rigidbody2D: {
      props: {
        linearVelocity: { t: 'Vector2' },
        velocity: { t: 'Vector2', obsolete: "'Rigidbody2D.velocity' is obsolete: 'velocity has been deprecated. Use linearVelocity instead. (UnityUpgradable) -> linearVelocity'" },
        gravityScale: { t: 'float' }, position: { t: 'Vector2' }, gameObject: { t: 'GameObject', ro: true }
      },
      methods: { MovePosition: sig('void', ['Vector2']), AddForce: sig('void', ['Vector2', 'ForceMode2D'], 1) }
    },
    ForceMode2D: { struct: true, props: {}, methods: {}, statics: { Force: { t: 'ForceMode2D', ro: true }, Impulse: { t: 'ForceMode2D', ro: true } }, staticMethods: {} },
    Collider2D: { props: { gameObject: { t: 'GameObject', ro: true }, transform: { t: 'Transform', ro: true }, tag: { t: 'string' }, name: { t: 'string' }, isTrigger: { t: 'bool' } }, methods: { CompareTag: sig('bool', ['string']), GetComponent: sig('targ') } },
    Collision2D: { props: { gameObject: { t: 'GameObject', ro: true }, transform: { t: 'Transform', ro: true }, collider: { t: 'Collider2D', ro: true }, contactCount: { t: 'int', ro: true } }, methods: { GetContact: sig('ContactPoint2D', ['int']) } },
    ContactPoint2D: { struct: true, props: { normal: { t: 'Vector2', ro: true }, point: { t: 'Vector2', ro: true } }, methods: {} },
    Animator: { props: {}, methods: { SetFloat: sig('void', ['string', 'float']), SetBool: sig('void', ['string', 'bool']), SetTrigger: sig('void', ['string']), SetInteger: sig('void', ['string', 'int']) } },
    AudioSource: { props: { volume: { t: 'float' } }, methods: { PlayOneShot: sig('void', ['AudioClip']), Play: sig('void'), Stop: sig('void') } },
    AudioClip: { props: {}, methods: {} },
    TMP_Text: { props: { text: { t: 'string' }, color: { t: 'Color' } }, methods: {} },
    LayerMask: { struct: true, props: {}, methods: {}, statics: {}, staticMethods: { GetMask: sig('int', ['string']) } },
    Physics2D: {
      statics: {},
      staticMethods: {
        OverlapCircle: sig('Collider2D', ['Vector2', 'float', '?'], 2),
        OverlapCircleAll: sig('Collider2D[]', ['Vector2', 'float', '?'], 2),
        OverlapPoint: sig('Collider2D', ['Vector2', '?'], 1)
      }
    },
    GameManager: {
      props: { score: { t: 'int', ro: true } }, methods: { AddScore: sig('void', ['int']), GameOver: sig('void'), Restart: sig('void'), LevelComplete: sig('void') },
      statics: { Instance: { t: 'GameManager', ro: true } }, staticMethods: {}
    },
    SceneManager: { statics: {}, staticMethods: { LoadScene: sig('void', ['?']), GetActiveScene: sig('Scene') } },
    Scene: { struct: true, props: { buildIndex: { t: 'int', ro: true }, name: { t: 'string', ro: true } }, methods: {} },
    ScoreBoard: { props: { score: { t: 'int' } }, methods: {} },
    // MonoBehaviour 繼承來的成員（在 : MonoBehaviour 的類別裡可以直接用）
    MonoBehaviour: {
      props: { transform: { t: 'Transform', ro: true }, gameObject: { t: 'GameObject', ro: true }, enabled: { t: 'bool' }, name: { t: 'string' }, tag: { t: 'string' } },
      methods: {
        GetComponent: sig('targ'), StartCoroutine: sig('Coroutine', ['IEnumerator']), StopCoroutine: sig('void', ['?']), StopAllCoroutines: sig('void'),
        Destroy: sig('void', ['?', 'float'], 1), Instantiate: sig('GameObject', ['GameObject', 'Vector3', 'Quaternion'], 1),
        CompareTag: sig('bool', ['string']), print: sig('void', ['?'])
      }
    }
  };
  // 需要 using 才能用的型別
  const USING_OF = {
    List: 'System.Collections.Generic', Dictionary: 'System.Collections.Generic', Action: 'System',
    Stack: 'System.Collections.Generic', Queue: 'System.Collections.Generic', Mouse: 'UnityEngine.InputSystem',
    IEnumerator: 'System.Collections', Keyboard: 'UnityEngine.InputSystem', TMP_Text: 'TMPro', SceneManager: 'UnityEngine.SceneManagement',
    Tilemap: 'UnityEngine.Tilemaps', TileBase: 'UnityEngine.Tilemaps'
  };
  const UNITY_OBJ = new Set(['GameObject', 'Transform', 'SpriteRenderer', 'Rigidbody2D', 'Collider2D', 'Collider', 'Animator', 'AudioSource', 'TMP_Text', 'GameManager']);
  const KNOWN_ATTRS = new Set(['SerializeField', 'Header', 'RequireComponent', 'CreateAssetMenu', 'Range', 'Tooltip', 'HideInInspector', 'Serializable', 'System.Serializable', 'Space', 'TextArea']);
  const tn = (t) => (t === 'mgroup' ? 'method group' : t);
  const VALUE_TYPES = new Set(['int', 'float', 'double', 'bool', 'char', 'Vector2', 'Vector3', 'Vector2Int', 'Vector3Int', 'Color', 'Quaternion', 'LayerMask', 'ContactPoint2D', 'Scene']);
  const NUMERIC = new Set(['int', 'float', 'double', 'char']);
  let ENUMS = new Set(); // 目前編譯中的程式宣告的 enum 名稱（enum 是值型別）

  function baseName(t) { const k = t.indexOf('<'); return k < 0 ? t : t.slice(0, k); }
  /** 'Dictionary<string, List<int>>' → ['string', 'List<int>'] */
  function genArgs(t) {
    const k = t.indexOf('<');
    if (k < 0 || !t.endsWith('>')) return [];
    const inner = t.slice(k + 1, -1);
    const out = [];
    let depth = 0, cur = '';
    for (const ch of inner) {
      if (ch === '<') depth++;
      if (ch === '>') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function listElem(t) { return t.startsWith('List<') ? t.slice(5, -1) : null; }
  /** List / Stack / Queue 的元素型別 */
  function colElem(t) { const b = baseName(t); return (b === 'List' || b === 'Stack' || b === 'Queue') && t.endsWith('>') ? genArgs(t)[0] : null; }
  function arrElem(t) { return t.endsWith('[]') ? t.slice(0, -2) : null; }
  function promote(a, b) {
    if (a === 'double' || b === 'double') return 'double';
    if (a === 'float' || b === 'float') return 'float';
    return 'int';
  }
  function isNum(t) { return NUMERIC.has(t); }
  function isVecT(t) { return t === 'Vector2' || t === 'Vector3'; }
  function isRefT(t) { return !VALUE_TYPES.has(t) && !ENUMS.has(t); }
  function assignable(from, to) {
    if (from === to || from === '?' || to === '?' || to === 'var' || to === 'object') return true;
    if (from === 'null') return isRefT(to);
    if (from === 'Vector2Int' && (to === 'Vector2' || to === 'Vector3')) return true;
    if (from === 'Vector3Int' && to === 'Vector3') return true;
    if (from === 'int' && (to === 'float' || to === 'double')) return true;
    if (from === 'char' && (to === 'int' || to === 'float' || to === 'double')) return true;
    if (from === 'float' && to === 'double') return true;
    if (isVecT(from) && isVecT(to)) return true;
    if (from === 'mgroup' && to.startsWith('Action')) return true;
    if (from === 'int' && to === 'LayerMask') return true;
    if (to === 'IEnumerator' && from === 'IEnumerator') return true;
    return false;
  }

  /* =========================================================
   * 檢查器：計算每個運算式的型別，找出編譯錯誤
   * ========================================================= */
  class Checker {
    constructor(prog, opts) {
      this.prog = prog;
      this.opts = opts || {};
      this.spec = this.opts.spec || {};
      this.errors = [];
      this.warnings = [];
      this.classes = new Map();
      for (const c of prog.classes) this.classes.set(c.name, c);
      this.topMethods = new Map();
      for (const m of prog.methods) this.topMethods.set(m.name, m);
      this.usings = new Set(prog.usings);
      this.enums = new Map();
      for (const e of prog.enums || []) {
        if (this.enums.has(e.name)) this.error('CS0101', `The namespace '<global namespace>' already contains a definition for '${e.name}'`, e);
        this.enums.set(e.name, e);
      }
      ENUMS = new Set(this.enums.keys());
      this.scopes = [];
      this.ctx = { cls: null, method: null };
    }
    error(code, msg, node) {
      if (this.errors.some((e) => e.line === node.line && e.code === code)) return;
      this.errors.push(new CsError('compile', code, msg, node.line, node.col));
    }
    warn(code, msg, node) { this.warnings.push(new CsError('warning', code, msg, node.line, node.col)); }

    knownType(name) {
      return NUMERIC.has(name) || ['bool', 'string', 'void', 'var', 'object'].includes(name) ||
        this.classes.has(name) || this.enums.has(name) || TYPES[name] !== undefined || name === 'List' || name === 'Action';
    }
    usingOk(name, node) {
      if (!this.opts.requireUsings) return true;
      if (node && this.opts.hiddenFrom && node.line >= this.opts.hiddenFrom) return true;
      const ns = USING_OF[name];
      return !ns || this.usings.has(ns);
    }
    resolveType(tn) {
      if (!tn) return '?';
      let name = tn.name;
      if (name.indexOf('.') >= 0) name = name.slice(name.lastIndexOf('.') + 1);
      if (!this.knownType(name) || !this.usingOk(name, tn)) {
        this.error('CS0246', `The type or namespace name '${name}' could not be found (are you missing a using directive or an assembly reference?)`, tn);
        return '?';
      }
      let s = name;
      if (tn.args && tn.args.length) s += '<' + tn.args.map((a) => this.resolveType(a)).join(', ') + '>';
      for (let k = 0; k < tn.rank; k++) s += '[]';
      return s;
    }

    run() {
      // 類別成員的型別
      const checkAttrs = (attrs) => {
        for (const a of attrs || []) {
          if (!KNOWN_ATTRS.has(a.name)) this.error('CS0246', `The type or namespace name '${a.name}Attribute' could not be found (are you missing a using directive or an assembly reference?)`, a);
        }
      };
      for (const c of this.prog.classes) {
        const seen = new Set();
        c.isMB = c.base === 'MonoBehaviour';
        checkAttrs(c.attrs);
        for (const f of c.fields) {
          if (seen.has(f.name)) this.error('CS0102', `The type '${c.name}' already contains a definition for '${f.name}'`, f);
          seen.add(f.name);
          checkAttrs(f.attrs);
          f.type = this.resolveType(f.ty);
          f.isPrivate = !f.mods.includes('public');
          f.isSerialized = f.mods.includes('public') || (f.attrs || []).some((a) => a.name === 'SerializeField');
        }
        for (const m of c.methods) checkAttrs(m.attrs);
        for (const m of c.methods.concat(c.ctors)) this.prepMethod(m);
      }
      for (const m of this.prog.methods) this.prepMethod(m);

      // 最上層的敘述
      this.scopes = [new Map()];
      this.rootScope = this.scopes[0];
      this.ctx = { cls: null, method: null, loop: 0, sw: 0 };
      for (const s of this.prog.stmts) this.stmt(s);

      for (const m of this.prog.methods) this.methodBody(m, null, [this.rootScope]);
      for (const c of this.prog.classes) {
        for (const f of c.fields) {
          if (!f.init) continue;
          this.scopes = [new Map()];
          this.ctx = { cls: c, method: null, loop: 0, sw: 0 };
          if (f.init.k === 'arrinit') this.arrInit(f.init, f.type);
          else this.convert(this.expr(f.init), f.type, f.init);
        }
        for (const m of c.methods.concat(c.ctors)) this.methodBody(m, c, []);
      }
      return { errors: this.errors, warnings: this.warnings };
    }
    prepMethod(m) {
      m.retType = this.resolveType(m.ret);
      m.isIter = m.retType === 'IEnumerator';
      for (const p of m.params) p.type = this.resolveType(p.ty);
    }
    methodBody(m, cls, outer) {
      this.scopes = outer.concat([new Map()]);
      this.ctx = { cls, method: m, loop: 0, sw: 0 };
      for (const p of m.params) this.scopes[this.scopes.length - 1].set(p.name, p.type);
      this.stmt(m.body);
      if (m.retType !== 'void' && !m.isIter && !m.isCtor && m.retType !== '?' && !this.alwaysReturns(m.body)) {
        const sigText = `${cls ? cls.name + '.' : ''}${m.name}(${m.params.map((p) => p.type).join(', ')})`;
        this.error('CS0161', `'${sigText}': not all code paths return a value`, m);
      }
    }
    alwaysReturns(s) {
      if (!s) return false;
      switch (s.k) {
        case 'return': case 'yieldbreak': return true;
        case 'block': return s.stmts.some((x) => this.alwaysReturns(x));
        case 'if': return !!s.els && this.alwaysReturns(s.then) && this.alwaysReturns(s.els);
        case 'while': case 'for':
          return (!s.cond || (s.cond.k === 'bool' && s.cond.v)) && !this.hasBreak(s.body);
        case 'switch':
          return s.sections.some((sec) => sec.labels.some((l) => l.def)) &&
            s.sections.every((sec) => sec.stmts.some((x) => this.alwaysReturns(x)));
        default: return false;
      }
    }
    hasBreak(s) {
      if (!s) return false;
      if (s.k === 'break') return true;
      if (s.k === 'block') return s.stmts.some((x) => this.hasBreak(x));
      if (s.k === 'if') return this.hasBreak(s.then) || this.hasBreak(s.els);
      return false;
    }

    lookupLocal(name) {
      for (let k = this.scopes.length - 1; k >= 0; k--) if (this.scopes[k].has(name)) return this.scopes[k].get(name);
      return undefined;
    }
    declare(name, type, node) {
      const top = this.scopes[this.scopes.length - 1];
      if (top.has(name)) { this.error('CS0128', `A local variable or function named '${name}' is already defined in this scope`, node); return; }
      for (let k = this.scopes.length - 2; k >= 0; k--) {
        if (this.scopes[k] === this.rootScope && this.ctx.method) break;
        if (this.scopes[k].has(name)) {
          this.error('CS0136', `A local or parameter named '${name}' cannot be declared in this scope because that name is used in an enclosing local scope to define a local or parameter`, node);
          return;
        }
      }
      top.set(name, type);
    }
    pushScope() { this.scopes.push(new Map()); }
    popScope() { this.scopes.pop(); }

    isUnityObj(t) {
      if (UNITY_OBJ.has(t)) return true;
      const c = this.classes.get(t);
      return !!(c && c.base === 'MonoBehaviour');
    }
    convert(from, to, node) {
      if (assignable(from, to)) return;
      if (to === 'bool' && this.isUnityObj(from)) return;
      if (from === 'mgroup') {
        this.error('CS0428', `Cannot convert method group '${node.name || '?'}' to non-delegate type '${to}'. Did you intend to invoke the method?`, node);
        return;
      }
      if (from === 'void') {
        this.error('CS0029', `Cannot implicitly convert type 'void' to '${to}'`, node);
        return;
      }
      const isLit = node.k === 'num' || (node.k === 'unary' && node.e.k === 'num');
      if (from === 'double' && to === 'float' && isLit) {
        this.error('CS0664', "Literal of type double cannot be implicitly converted to type 'float'; use an 'F' suffix to create a literal of this type", node);
      } else if (isNum(from) && isNum(to)) {
        this.error('CS0266', `Cannot implicitly convert type '${from}' to '${to}'. An explicit conversion exists (are you missing a cast?)`, node);
      } else {
        this.error('CS0029', `Cannot implicitly convert type '${from}' to '${to}'`, node);
      }
    }
    requireBool(e) {
      const t = this.expr(e);
      if (t === 'bool' || t === '?' || this.isUnityObj(t)) return;
      this.convert(t, 'bool', e);
    }
    arrInit(init, type) {
      const el = arrElem(type) || listElem(type);
      if (!el) { this.error('CS0622', 'Can only use array initializer expressions to assign to array types. Try using a new expression instead.', init); return; }
      for (const it of init.items) this.convert(this.expr(it), el, it);
    }

    /* ---------- 敘述 ---------- */
    stmt(s) {
      switch (s.k) {
        case 'block':
          this.pushScope();
          for (const x of s.stmts) this.stmt(x);
          this.popScope();
          break;
        case 'empty': break;
        case 'decl': {
          let t = this.resolveType(s.ty);
          s.declType = t;
          for (const d of s.decls) {
            let dt = t;
            if (d.init) {
              if (d.init.k === 'arrinit') {
                if (t === 'var') this.error('CS0820', 'Cannot assign array initializer to an implicitly-typed variable', d.init);
                else this.arrInit(d.init, t);
              } else {
                const it = this.expr(d.init);
                if (t === 'var') {
                  if (it === 'null') this.error('CS0815', "Cannot assign <null> to an implicitly-typed variable", d);
                  dt = it === 'mgroup' ? '?' : it;
                } else this.convert(it, t, d.init);
              }
            } else if (t === 'var') this.error('CS0818', 'Implicitly-typed variables must be initialized', d);
            d.type = dt;
            this.declare(d.name, dt, d);
          }
          break;
        }
        case 'expr': this.expr(s.e); break;
        case 'if':
          this.requireBool(s.cond);
          if (s.then.k === 'empty') this.warn('CS0642', 'Possible mistaken empty statement', s.then);
          this.stmt(s.then);
          if (s.els) this.stmt(s.els);
          break;
        case 'while':
        case 'do':
          this.requireBool(s.cond);
          if (s.k === 'while' && s.body.k === 'empty') this.warn('CS0642', 'Possible mistaken empty statement', s.body);
          this.ctx.loop++;
          this.stmt(s.body);
          this.ctx.loop--;
          break;
        case 'for':
          this.pushScope();
          if (s.init) { if (s.init.k === 'decl') this.stmt(s.init); else s.init.forEach((x) => this.expr(x)); }
          if (s.cond) this.requireBool(s.cond);
          s.iter.forEach((x) => this.expr(x));
          if (s.body.k === 'empty') this.warn('CS0642', 'Possible mistaken empty statement', s.body);
          this.ctx.loop++;
          this.stmt(s.body);
          this.ctx.loop--;
          this.popScope();
          break;
        case 'foreach': {
          const ct = this.expr(s.coll);
          let el = '?';
          if (ct === '?') el = '?';
          else if (arrElem(ct)) el = arrElem(ct);
          else if (colElem(ct)) el = colElem(ct);
          else if (baseName(ct) === 'Dictionary') el = `KeyValuePair<${genArgs(ct).join(', ')}>`;
          else if (ct === 'string') el = 'char';
          else this.error('CS1579', `foreach statement cannot operate on variables of type '${ct}' because '${ct}' does not contain a public instance or extension definition for 'GetEnumerator'`, s.coll);
          let vt = this.resolveType(s.ty);
          if (vt === 'var') vt = el;
          else if (!assignable(el, vt) && !(isNum(el) && isNum(vt))) this.error('CS0030', `Cannot convert type '${el}' to '${vt}'`, s);
          s.varType = vt;
          this.pushScope();
          this.declare(s.name, vt, s);
          this.ctx.loop++;
          this.stmt(s.body);
          this.ctx.loop--;
          this.popScope();
          break;
        }
        case 'switch': {
          const t = this.expr(s.e);
          this.ctx.sw++;
          s.sections.forEach((sec, idx) => {
            for (const l of sec.labels) if (!l.def) this.convert(this.expr(l.v), t, l.v);
            this.pushScope();
            sec.stmts.forEach((x) => this.stmt(x));
            this.popScope();
            const last = sec.stmts[sec.stmts.length - 1];
            const ends = last && ['break', 'return', 'continue', 'yieldbreak'].includes(last.k);
            if (!ends && sec.stmts.length > 0) {
              const l = sec.labels[sec.labels.length - 1];
              const txt = l.def ? 'default:' : `case ${this.labelText(l.v)}:`;
              if (idx === s.sections.length - 1) this.error('CS8070', `Control cannot fall out of switch from final case label ('${txt}')`, l);
              else this.error('CS0163', `Control cannot fall through from one case label ('${txt}') to another`, l);
            }
          });
          this.ctx.sw--;
          break;
        }
        case 'break':
          if (!this.ctx.loop && !this.ctx.sw) this.error('CS0139', 'No enclosing loop out of which to break or continue', s);
          break;
        case 'continue':
          if (!this.ctx.loop) this.error('CS0139', 'No enclosing loop out of which to break or continue', s);
          break;
        case 'return': {
          const m = this.ctx.method;
          if (!m) { if (s.e) this.expr(s.e); break; }
          if (m.isIter) { if (s.e) this.error('CS1622', 'Cannot return a value from an iterator. Use the yield return statement to return a value, or yield break to end the iteration.', s); break; }
          if (m.retType === 'void' || m.isCtor) {
            if (s.e) { this.expr(s.e); this.error('CS0127', `Since '${m.name}' returns void, a return keyword must not be followed by an object expression`, s); }
          } else if (!s.e) this.error('CS0126', `An object of a type convertible to '${m.retType}' is required`, s);
          else this.convert(this.expr(s.e), m.retType, s.e);
          break;
        }
        case 'yield': case 'yieldbreak': {
          const m = this.ctx.method;
          if (!m || !m.isIter) {
            const name = m ? m.name : 'Main';
            const rt = m ? m.retType : 'void';
            this.error('CS1624', `The body of '${name}' cannot be an iterator block because '${rt}' is not an iterator interface type`, s);
          }
          if (s.e) this.expr(s.e);
          break;
        }
        default:
      }
    }
    labelText(e) {
      if (e.k === 'str') return `"${e.v}"`;
      if (e.k === 'num') return e.text;
      if (e.k === 'char') return `'${e.v}'`;
      if (e.k === 'id') return e.name;
      return '...';
    }

    /* ---------- 運算式 ---------- */
    expr(e) { const t = this.exprInner(e); e.ty = t; return t; }
    staticOf(t) { return typeof t === 'string' && t.startsWith('static:') ? t.slice(7) : null; }

    resolveName(e) {
      const name = e.name;
      const local = this.lookupLocal(name);
      if (local !== undefined) { e.res = 'local'; return local; }
      const cls = this.ctx.cls;
      if (cls) {
        const f = cls.fields.find((x) => x.name === name);
        if (f) { e.res = 'field'; return f.type; }
        const ms = cls.methods.filter((x) => x.name === name);
        if (ms.length) { e.res = 'method'; e.methods = ms; return 'mgroup'; }
        if (cls.isMB) {
          const mb = TYPES.MonoBehaviour;
          if (mb.props[name]) { e.res = 'mb'; return mb.props[name].t; }
          if (mb.methods[name]) { e.res = 'mb'; e.sig = mb.methods[name]; return 'fn'; }
        }
      }
      if (this.topMethods.has(name)) { e.res = 'method'; e.methods = [this.topMethods.get(name)]; return 'mgroup'; }
      const g = this.spec.funcs && this.spec.funcs[name];
      if (g) { e.res = 'global'; e.sig = g; return 'fn'; }
      const gv = this.spec.values && this.spec.values[name];
      if (gv) { e.res = 'global'; return gv; }
      if (this.enums.has(name)) { e.res = 'enum'; return 'static:' + name; }
      if (TYPES[name] && (TYPES[name].statics || TYPES[name].staticMethods)) {
        if (!this.usingOk(name, e)) {
          this.error('CS0103', `The name '${name}' does not exist in the current context`, e);
          return '?';
        }
        e.res = 'static';
        return 'static:' + name;
      }
      if (['int', 'float', 'double', 'string', 'bool'].includes(name)) { e.res = 'static'; return 'static:' + name; }
      if (this.classes.has(name)) { e.res = 'class'; return 'static:' + name; }
      this.error('CS0103', `The name '${name}' does not exist in the current context`, e);
      return '?';
    }

    memberType(objT, name, node) {
      const st = this.staticOf(objT);
      if (st) {
        const T = TYPES[st];
        const at = { line: node.nameLine, col: node.nameCol };
        const en = this.enums.get(st);
        if (en) {
          if (en.members.some((m) => m.name === name)) return st;
          this.error('CS0117', `'${st}' does not contain a definition for '${name}'`, at);
          return '?';
        }
        if (T) {
          if (T.statics && T.statics[name]) return this.propType(T.statics[name], st, name, node);
          if (T.staticMethods && T.staticMethods[name]) { node.sig = T.staticMethods[name]; return 'fn'; }
          if ((T.methods && T.methods[name]) || (T.props && T.props[name])) {
            const isM = T.methods && T.methods[name];
            const sg = isM ? `(${T.methods[name].p.join(', ')})` : '';
            this.error('CS0120', `An object reference is required for the non-static field, method, or property '${st}.${name}${sg}'`, at);
            if (isM) node.sig = T.methods[name];
            return isM ? 'fn' : T.props[name].t;
          }
        }
        const ucls = this.classes.get(st);
        if (ucls && (ucls.fields.some((f) => f.name === name) || ucls.methods.some((m) => m.name === name))) {
          this.error('CS0120', `An object reference is required for the non-static field, method, or property '${st}.${name}'`, at);
          return '?';
        }
        if (['int', 'float', 'double'].includes(st) && (name === 'MaxValue' || name === 'MinValue')) return st;
        if (st === 'int' && name === 'Parse') { node.sig = sig('int', ['string']); return 'fn'; }
        this.error('CS0117', `'${st}' does not contain a definition for '${name}'`, { line: node.nameLine, col: node.nameCol });
        return '?';
      }
      if (objT === '?' || objT === 'null') return '?';
      const ae = arrElem(objT);
      if (ae) {
        if (name === 'Length') return 'int';
        return this.noMember(objT, name, node);
      }
      const gb = baseName(objT);
      if (['List', 'Stack', 'Queue', 'Dictionary', 'KeyValuePair'].includes(gb) && objT.endsWith('>')) {
        const T = TYPES[gb];
        const ga = genArgs(objT);
        const gen = gb === 'Dictionary' || gb === 'KeyValuePair' ? { K: ga[0], V: ga[1] } : { elem: ga[0] };
        if (T.props[name]) { const t = T.props[name].t; return t === 'K' ? gen.K : t === 'V' ? gen.V : t; }
        if (T.methods[name]) { node.sig = T.methods[name]; node.elem = gen.elem; node.gen = gen; return 'fn'; }
        if (name === 'ToString') { node.sig = sig('string'); return 'fn'; }
        return this.noMember(objT, name, node);
      }
      if (objT.startsWith('Action')) {
        if (name === 'Invoke') { node.sig = sig('void', ['?', '?'], 0); return 'fn'; }
        return this.noMember(objT, name, node);
      }
      const cls = this.classes.get(objT);
      if (cls) {
        const f = cls.fields.find((x) => x.name === name);
        if (f) {
          if (f.isPrivate && this.ctx.cls !== cls) this.error('CS0122', `'${cls.name}.${name}' is inaccessible due to its protection level`, { line: node.nameLine, col: node.nameCol });
          node.field = f;
          node.fieldCls = cls;
          return f.type;
        }
        const ms = cls.methods.filter((x) => x.name === name);
        if (ms.length) {
          if (!ms[0].mods.includes('public') && this.ctx.cls !== cls) this.error('CS0122', `'${cls.name}.${name}(${ms[0].params.map((p) => p.type).join(', ')})' is inaccessible due to its protection level`, { line: node.nameLine, col: node.nameCol });
          node.methods = ms;
          return 'mgroup';
        }
        if (cls.isMB) {
          const mb = TYPES.MonoBehaviour;
          if (mb.props[name]) return mb.props[name].t;
          if (mb.methods[name]) { node.sig = mb.methods[name]; return 'fn'; }
        }
        return this.noMember(objT, name, node);
      }
      const T = TYPES[baseName(objT)];
      if (T) {
        if (T.props && T.props[name]) return this.propType(T.props[name], objT, name, node);
        if (T.methods && T.methods[name]) { node.sig = T.methods[name]; return 'fn'; }
        if (name === 'ToString') { node.sig = sig('string'); return 'fn'; }
        return this.noMember(objT, name, node);
      }
      return '?';
    }
    propType(p, owner, name, node) {
      if (p.obsolete) this.warn('CS0618', p.obsolete, { line: node.nameLine, col: node.nameCol });
      node.prop = p;
      node.propOwner = owner;
      return p.t;
    }
    noMember(objT, name, node) {
      this.error('CS1061', `'${objT}' does not contain a definition for '${name}' and no accessible extension method '${name}' accepting a first argument of type '${objT}' could be found (are you missing a using directive or an assembly reference?)`, { line: node.nameLine, col: node.nameCol });
      return '?';
    }

    genT(t, ctx) {
      if (t === 'T') return (ctx && ctx.elem) || '?';
      if (t === 'K') return (ctx && ctx.K) || '?';
      if (t === 'V') return (ctx && ctx.V) || '?';
      return t;
    }
    checkArgs(sigv, args, node, name, ctx) {
      const types = args.map((a, i) => (a.k === 'outdecl' ? this.outDecl(a, this.genT(sigv.p[i], ctx)) : this.expr(a)));
      const max = sigv.p.length;
      if (types.length < sigv.min || types.length > max) {
        this.error('CS1501', `No overload for method '${name}' takes ${types.length} arguments`, node);
        return types;
      }
      types.forEach((t, i) => {
        let want = this.genT(sigv.p[i], ctx);
        if (want === 'num') { if (!isNum(t) && t !== '?') this.error('CS1503', `Argument ${i + 1}: cannot convert from '${tn(t)}' to 'float'`, args[i]); return; }
        if (want === '?') { if (t === 'void') this.error('CS1503', `Argument ${i + 1}: cannot convert from 'void' to 'object'`, args[i]); return; }
        if (!assignable(t, want) && !(want === 'bool' && this.isUnityObj(t))) {
          this.error('CS1503', `Argument ${i + 1}: cannot convert from '${tn(t)}' to '${want}'`, args[i]);
        }
      });
      return types;
    }
    retOf(sigv, types, node, ctx) {
      if (sigv.r === 'num') return types.reduce((a, b) => (isNum(b) ? promote(a, b) : a), 'int');
      if (sigv.r === 'T' || sigv.r === 'K' || sigv.r === 'V') return this.genT(sigv.r, ctx);
      if (sigv.r === 'targ') {
        const ta = node.targs && node.targs[0];
        if (!ta) {
          this.error('CS0411', `The type arguments for method '${node.name || '?'}<T>' cannot be inferred from the usage. Try specifying the type arguments explicitly.`, { line: node.nameLine || node.line, col: node.nameCol || node.col });
          return '?';
        }
        return this.resolveType(ta);
      }
      return sigv.r;
    }
    outDecl(a, want) {
      let t = this.resolveType(a.ty);
      if (t === 'var' && want && want !== '?') t = want;
      a.type = t;
      this.declare(a.name, t, a);
      return t;
    }
    pickUserMethod(ms, argc, node, name) {
      const m = ms.find((x) => x.params.filter((p) => !p.def).length <= argc && x.params.length >= argc);
      if (!m) { this.error('CS1501', `No overload for method '${name}' takes ${argc} arguments`, node); return null; }
      return m;
    }

    exprInner(e) {
      switch (e.k) {
        case 'num': return e.ty;
        case 'str': return 'string';
        case 'char': return 'char';
        case 'bool': return 'bool';
        case 'null': return 'null';
        case 'paren': return this.expr(e.e);
        case 'istr': e.parts.forEach((p) => { if (p.e) this.expr(p.e); }); return 'string';
        case 'this':
          if (!this.ctx.cls) { this.error('CS0026', "Keyword 'this' is not valid in a static property, static method, or static field initializer", e); return '?'; }
          return this.ctx.cls.name;
        case 'typeof': return 'Type';
        case 'id': {
          const t = this.resolveName(e);
          if (t === 'fn') return 'mgroup';
          return t;
        }
        case 'member': {
          const ot = this.expr(e.obj);
          const t = this.memberType(ot, e.name, e);
          return t === 'fn' ? 'mgroup' : t;
        }
        case 'call': {
          const c = e.callee;
          if (c.k === 'id') {
            const t = this.expr(c);
            if (c.res === 'method') {
              const m = this.pickUserMethod(c.methods, e.args.length, e, c.name);
              e.args.forEach((a, i) => { const at = this.expr(a); if (m && m.params[i]) this.convertArg(at, m.params[i].type, a, i); });
              e.method = m;
              return m ? m.retType : '?';
            }
            if (c.sig) {
              const types = this.checkArgs(c.sig, e.args, e, c.name);
              return this.retOf(c.sig, types, c);
            }
            e.args.forEach((a) => this.expr(a));
            if (t && t.startsWith && t.startsWith('Action')) return 'void';
            if (t !== '?') this.error('CS1955', `Non-invocable member '${c.name}' cannot be used like a method`, c);
            return '?';
          }
          if (c.k === 'member') {
            const t = this.expr(c);
            if (t === 'mgroup' && c.methods) {
              const m = this.pickUserMethod(c.methods, e.args.length, e, c.name);
              e.args.forEach((a, i) => { const at = this.expr(a); if (m && m.params[i]) this.convertArg(at, m.params[i].type, a, i); });
              e.method = m;
              return m ? m.retType : '?';
            }
            if (t === 'mgroup' && c.sig) {
              const types = this.checkArgs(c.sig, e.args, e, c.name, c.gen || { elem: c.elem });
              return this.retOf(c.sig, types, c, c.gen || { elem: c.elem });
            }
            e.args.forEach((a) => (a.k === 'outdecl' ? this.outDecl(a) : this.expr(a)));
            if (t !== '?') this.error('CS1955', `Non-invocable member '${c.name}' cannot be used like a method`, { line: c.nameLine, col: c.nameCol });
            return '?';
          }
          this.expr(c);
          e.args.forEach((a) => this.expr(a));
          return '?';
        }
        case 'index': {
          const ot = this.expr(e.obj);
          const it = this.expr(e.idx);
          if (ot !== '?' && baseName(ot) === 'Dictionary') {
            const [K, V] = genArgs(ot);
            if (!assignable(it, K)) this.convert(it, K, e.idx);
            return V;
          }
          if (it !== 'int' && it !== '?' && it !== 'char') this.convert(it, 'int', e.idx);
          if (ot === '?') return '?';
          if (arrElem(ot)) return arrElem(ot);
          if (listElem(ot)) return listElem(ot);
          if (ot === 'string') return 'char';
          this.error('CS0021', `Cannot apply indexing with [] to an expression of type '${ot}'`, e);
          return '?';
        }
        case 'new': {
          const t = this.resolveType(e.ty);
          const bn = baseName(t);
          if (this.classes.has(t)) {
            const cls = this.classes.get(t);
            if (cls.ctors.length) {
              const m = this.pickUserMethod(cls.ctors, e.args.length, e, t);
              e.args.forEach((a, i) => { const at = this.expr(a); if (m && m.params[i]) this.convertArg(at, m.params[i].type, a, i); });
            } else {
              e.args.forEach((a) => this.expr(a));
              if (e.args.length) this.error('CS1729', `'${t}' does not contain a constructor that takes ${e.args.length} arguments`, e);
            }
          } else if (bn === 'List') {
            e.args.forEach((a) => this.expr(a));
            if (e.init) this.arrInit(e.init, t);
          } else if (bn === 'Stack' || bn === 'Queue' || bn === 'Dictionary') {
            e.args.forEach((a) => this.expr(a));
            if (e.init) this.error('CS1922', `Cannot initialize type '${t}' with a collection initializer`, e.init);
          } else if (TYPES[t] && TYPES[t].ctor) {
            this.checkArgs(TYPES[t].ctor, e.args, e, t);
          } else e.args.forEach((a) => this.expr(a));
          e.type = t;
          return t;
        }
        case 'newarr': {
          const el = this.resolveType(e.elem);
          const t = el + '[]';
          if (e.size) { const st = this.expr(e.size); this.convert(st, 'int', e.size); }
          if (e.init) this.arrInit(e.init, t);
          e.type = t;
          return t;
        }
        case 'unary': {
          const t = this.expr(e.e);
          if (t === '?') return '?';
          if (e.op === '!') {
            if (t !== 'bool') { this.error('CS0023', `Operator '!' cannot be applied to operand of type '${t}'`, e); return '?'; }
            return 'bool';
          }
          if (isNum(t)) return t === 'char' ? 'int' : t;
          if ((isVecT(t) || t === 'Vector2Int') && e.op === '-') return t;
          this.error('CS0023', `Operator '${e.op}' cannot be applied to operand of type '${t}'`, e);
          return '?';
        }
        case 'inc': {
          const t = this.expr(e.e);
          if (!['id', 'member', 'index'].includes(e.e.k)) this.error('CS1059', 'The operand of an increment or decrement operator must be a variable, property or indexer', e);
          if (t !== '?' && !isNum(t)) this.error('CS0023', `Operator '${e.op}' cannot be applied to operand of type '${t}'`, e);
          return t;
        }
        case 'bin': return this.binType(e.op, this.expr(e.l), this.expr(e.r), e);
        case 'tern': {
          this.requireBool(e.c);
          const a = this.expr(e.a);
          const b = this.expr(e.b);
          if (a === b) return a;
          if (isNum(a) && isNum(b)) return promote(a, b);
          if (a === 'null') return b;
          if (b === 'null') return a;
          if (a === '?' || b === '?') return '?';
          if (isVecT(a) && isVecT(b)) return 'Vector3';
          this.error('CS0173', `Type of conditional expression cannot be determined because there is no implicit conversion between '${a}' and '${b}'`, e);
          return '?';
        }
        case 'coalesce': { const l = this.expr(e.l); this.expr(e.r); return l; }
        case 'cast': {
          const t = this.expr(e.e);
          const enumInt = (this.enums.has(t) && e.to === 'int');
          if (t !== '?' && !enumInt && !(isNum(t) && isNum(e.to)) && t !== e.to && e.to !== 'object') {
            this.error('CS0030', `Cannot convert type '${t}' to '${e.to}'`, e);
          }
          return e.to;
        }
        case 'assign': return this.assignType(e);
        case 'outdecl': return this.outDecl(e);
        case 'arrinit':
          this.error('CS1525', "Invalid expression term '{'", e);
          return '?';
        default: return '?';
      }
    }
    convertArg(from, to, node, i) {
      if (assignable(from, to)) return;
      this.error('CS1503', `Argument ${i + 1}: cannot convert from '${from}' to '${to}'`, node);
    }
    binType(op, l, r, e) {
      if (l === '?' || r === '?') {
        if (['==', '!=', '<', '>', '<=', '>=', '&&', '||'].includes(op)) return 'bool';
        if (op === '+' && (l === 'string' || r === 'string')) return 'string';
        if (isNum(l) && r === '?') return '?';
        return '?';
      }
      const bad = () => {
        this.error('CS0019', `Operator '${op}' cannot be applied to operands of type '${l}' and '${r}'`, { line: e.opLine, col: e.opCol });
        return '?';
      };
      // Vector2Int：同型別相加減還是 Vector2Int；和 Vector2/Vector3 混用時會自動轉成浮點數向量
      if (l === 'Vector2Int' || r === 'Vector2Int') {
        const other = l === 'Vector2Int' ? r : l;
        if (op === '==' || op === '!=') return other === 'Vector2Int' || isVecT(other) || other === 'null' ? 'bool' : bad();
        if (op === '+' || op === '-') {
          if (l === r) return 'Vector2Int';
          if (isVecT(other)) return other;
          return bad();
        }
        if (op === '*') {
          if (other === 'int') return 'Vector2Int';
          if (isNum(other)) return 'Vector2';
          return bad();
        }
        return bad();
      }
      switch (op) {
        case '&&': case '||':
          return l === 'bool' && r === 'bool' ? 'bool' : bad();
        case '==': case '!=':
          if (l === r || (isNum(l) && isNum(r)) || l === 'null' || r === 'null' || (isVecT(l) && isVecT(r))) return 'bool';
          if (isRefT(l) && isRefT(r) && l !== 'string' && r !== 'string') return 'bool';
          return bad();
        case '<': case '>': case '<=': case '>=':
          return isNum(l) && isNum(r) ? 'bool' : bad();
        case '+':
          if (l === 'string' || r === 'string') return 'string';
          if (isNum(l) && isNum(r)) return promote(l, r);
          if (isVecT(l) && isVecT(r)) return l === 'Vector3' || r === 'Vector3' ? 'Vector3' : 'Vector2';
          return bad();
        case '-':
          if (isNum(l) && isNum(r)) return promote(l, r);
          if (isVecT(l) && isVecT(r)) return l === 'Vector3' || r === 'Vector3' ? 'Vector3' : 'Vector2';
          return bad();
        case '*':
          if (isNum(l) && isNum(r)) return promote(l, r);
          if (isVecT(l) && isNum(r)) return l;
          if (isNum(l) && isVecT(r)) return r;
          return bad();
        case '/':
          if (isNum(l) && isNum(r)) return promote(l, r);
          if (isVecT(l) && isNum(r)) return l;
          return bad();
        case '%':
          if (isNum(l) && isNum(r)) return promote(l, r);
          return bad();
        default: return bad();
      }
    }
    assignType(e) {
      const tgt = e.target;
      const tt = this.expr(tgt);
      // 唯讀屬性
      if (tgt.k === 'member' && tgt.prop && tgt.prop.ro) {
        this.error('CS0200', `Property or indexer '${tgt.propOwner}.${tgt.name}' cannot be assigned to -- it is read only`, tgt);
      }
      // transform.position.x = ... 這種修改屬性回傳值的寫法
      if (tgt.k === 'member' && tgt.obj.k === 'member' && tgt.obj.prop && TYPES[tgt.obj.ty] && TYPES[tgt.obj.ty].struct) {
        this.error('CS1612', `Cannot modify the return value of '${tgt.obj.propOwner}.${tgt.obj.name}' because it is not a variable`, tgt.obj);
      }
      if (tgt.k === 'member' && tgt.field && tgt.field.isEvent && this.ctx.cls !== tgt.fieldCls && e.op !== '+=' && e.op !== '-=') {
        this.error('CS0070', `The event '${tgt.fieldCls.name}.${tgt.name}' can only appear on the left hand side of += or -= (except when used from within the type '${tgt.fieldCls.name}')`, { line: tgt.nameLine, col: tgt.nameCol });
      }
      if (tgt.k === 'id' && (tgt.res === 'method' || tgt.res === 'static' || tgt.res === 'class')) {
        this.error('CS1656', `Cannot assign to '${tgt.name}' because it is a 'method group'`, tgt);
      }
      const vt = this.expr(e.value);
      if (e.op === '=') { this.convert(vt, tt, e.value); return tt; }
      if (e.op === '??=') return tt;
      if (typeof tt === 'string' && tt.startsWith('Action')) {
        if ((e.op === '+=' || e.op === '-=') && (vt === 'mgroup' || vt === tt || vt === '?')) return tt;
        this.error('CS0029', `Cannot implicitly convert type '${vt}' to '${tt}'`, e.value);
        return tt;
      }
      const bt = this.binType(e.op[0], tt, vt, { line: e.value.line, col: e.value.col, opLine: e.line, opCol: e.col });
      if (bt !== '?' && !assignable(bt, tt)) this.convert(bt, tt, e.value);
      return tt;
    }
  }

  /* =========================================================
   * 數值格式（模擬 C# 的 ToString）
   * ========================================================= */
  function floatStr(v) {
    if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'NaN';
    const f = Math.fround(v);
    for (let p = 1; p <= 9; p++) {
      const s = Number(f.toPrecision(p));
      if (Math.fround(s) === f) return fixExp(String(s));
    }
    return fixExp(String(f));
  }
  function doubleStr(v) {
    if (!isFinite(v)) return v > 0 ? '∞' : v < 0 ? '-∞' : 'NaN';
    return fixExp(String(v));
  }
  function fixExp(s) { return s.replace(/e\+?(-?)(\d+)$/, (m, sg, d) => 'E' + (sg || '+') + d.padStart(2, '0')); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }

  function fmt(v, ty, spec) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') {
      if (spec && /^[FfNn]\d*$/.test(spec)) return v.toFixed(spec.length > 1 ? +spec.slice(1) : 2);
      if (spec && /^0(\.0+)?$/.test(spec)) return v.toFixed(spec.indexOf('.') < 0 ? 0 : spec.length - 2);
      if (ty === 'int') return String(v);
      if (ty === 'double') return doubleStr(v);
      if (ty === 'float') return floatStr(v);
      return Number.isInteger(v) ? String(v) : floatStr(v);
    }
    if (typeof v === 'string') return v;
    if (v.kind === 'vec' && v.ty === 'Vector3Int') return `(${v.x}, ${v.y}, ${v.z})`;
    if (v.kind === 'vec' && v.ty === 'Vector2Int') return `(${v.x}, ${v.y})`;
    if (v.kind === 'enum') return v.name;
    if (v.kind === 'stack') return `System.Collections.Generic.Stack\`1[${netName(v.elem)}]`;
    if (v.kind === 'queue') return `System.Collections.Generic.Queue\`1[${netName(v.elem)}]`;
    if (v.kind === 'dict') return 'System.Collections.Generic.Dictionary`2';
    if (v.kind === 'kvp') return `[${fmt(v.k)}, ${fmt(v.v)}]`;
    if (v.kind === 'vec') return v.ty === 'Vector2' ? `(${f2(v.x)}, ${f2(v.y)})` : `(${f2(v.x)}, ${f2(v.y)}, ${f2(v.z)})`;
    if (v.kind === 'color') return `RGBA(${v.r.toFixed(3)}, ${v.g.toFixed(3)}, ${v.b.toFixed(3)}, ${v.a.toFixed(3)})`;
    if (v.kind === 'list') return `System.Collections.Generic.List\`1[${netName(v.elem)}]`;
    if (v.kind === 'array') return `${netName(v.elem)}[]`;
    if (v.kind === 'obj') return v.host ? `${v.host.name} (${v.cls.name})` : v.cls.name;
    if (v.kind === 'delegate') return 'System.Action';
    if (v.kind === 'enumerator') return `<${v.method.name}>d__0`;
    if (v.kind === 'wait') return 'UnityEngine.WaitForSeconds';
    if (v.toString && v.toString !== Object.prototype.toString) return v.toString();
    return String(v);
  }
  function netName(t) {
    return ({ int: 'System.Int32', float: 'System.Single', double: 'System.Double', string: 'System.String', bool: 'System.Boolean' })[t] || t;
  }

  /* =========================================================
   * 執行器
   * ========================================================= */
  class Env {
    constructor(parent, self) {
      this.vars = new Map();
      this.parent = parent;
      this.self = self !== undefined ? self : parent ? parent.self : null;
    }
    lookup(name) {
      let e = this;
      while (e) { const b = e.vars.get(name); if (b) return b; e = e.parent; }
      return null;
    }
    declare(name, v) { this.vars.set(name, { v }); }
  }
  const BRK = { c: 'break' };
  const CONT = { c: 'continue' };

  function vec(x, y, z, ty) { return { kind: 'vec', x, y, z: z || 0, ty: ty || (z === undefined ? 'Vector2' : 'Vector3') }; }
  function color(r, g, b, a) { return { kind: 'color', r, g, b, a: a === undefined ? 1 : a }; }
  const COLORS = {
    red: [1, 0, 0, 1], green: [0, 1, 0, 1], blue: [0, 0, 1, 1], white: [1, 1, 1, 1], black: [0, 0, 0, 1],
    yellow: [1, 0.92, 0.016, 1], cyan: [0, 1, 1, 1], magenta: [1, 0, 1, 1], gray: [0.5, 0.5, 0.5, 1], clear: [0, 0, 0, 0]
  };
  function copy(v) {
    if (v && typeof v === 'object' && (v.kind === 'vec' || v.kind === 'color')) return Object.assign({}, v);
    return v;
  }
  function isNullish(v) { return v === null || v === undefined || (typeof v === 'object' && v.__destroyed === true && v.__fakeNull !== false); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Runtime {
    constructor(prog, opts) {
      this.prog = prog;
      this.opts = opts || {};
      this.host = this.opts.host || {};
      this.steps = 0;
      this.maxSteps = this.opts.maxSteps || 200000;
      this.depth = 0;
      this.classes = new Map(prog.classes.map((c) => [c.name, c]));
      this.topMethods = new Map(prog.methods.map((m) => [m.name, m]));
      this.globalEnv = new Env(null, null);
      this.rng = mulberry32(this.opts.seed || 12345);
      // enum：每個成員都是唯一的物件，比較時直接用 ===
      this.enums = new Map();
      for (const e of prog.enums || []) {
        const vals = new Map();
        for (const m of e.members) vals.set(m.name, { kind: 'enum', type: e.name, name: m.name, v: m.value });
        this.enums.set(e.name, vals);
      }
      this.statics = this.makeStatics();
    }
    log(text, kind) { if (this.host.log) this.host.log(text, kind || 'log'); }
    tick(node) {
      if (++this.steps > this.maxSteps) {
        throw new CsError('freeze', 'FREEZE', 'Unity 沒有回應：程式執行太久，可能是無限迴圈', node ? node.line : 0, node ? node.col : 0);
      }
    }
    resetSteps(max) { this.steps = 0; if (max) this.maxSteps = max; }
    fail(code, msg, node) { return new CsError('runtime', code, msg, node ? node.line : 0, node ? node.col : 0); }
    nre(node) { return this.fail('NullReferenceException', 'Object reference not set to an instance of an object', node); }

    /* ---------- 對外 API ---------- */
    runSync(gen) {
      let r = gen.next();
      while (!r.done) r = gen.next();
      return r.value;
    }
    runMain() {
      const self = this;
      return this.runSync((function* () {
        for (const s of self.prog.stmts) {
          const r = yield* self.exec(s, self.globalEnv);
          if (r && r.c === 'return') return;
        }
      })());
    }
    newInstance(className, host, args) {
      const cls = this.classes.get(className);
      if (!cls) return null;
      const obj = { kind: 'obj', cls, fields: new Map(), host: host || null };
      const env = new Env(null, obj);
      for (const f of cls.fields) {
        let v;
        if (f.init) v = f.init.k === 'arrinit' ? this.runSync(this.arrInit(f.init, f.type, env)) : copy(this.runSync(this.eval(f.init, env)));
        else v = this.defaultOf(f.type);
        obj.fields.set(f.name, this.coerce(v, f.type));
      }
      const ctor = cls.ctors.find((c) => c.params.length === (args || []).length);
      if (ctor) this.runSync(this.execMethod(ctor, obj, args || [], null));
      return obj;
    }
    findMethod(cls, name) { return cls.methods.find((m) => m.name === name) || null; }
    hasMethod(obj, name) { return !!(obj && obj.cls && this.findMethod(obj.cls, name)); }
    invoke(obj, name, args) {
      const m = this.findMethod(obj.cls, name);
      if (!m) return undefined;
      return this.runSync(this.callUser(m, obj, args || [], null));
    }
    invokeDelegate(d, args) {
      if (isNullish(d)) return;
      if (d.kind === 'delegate') for (const it of d.list.slice()) this.runSync(this.callUser(it.method, it.obj, args || [], it.closure));
      else if (d.kind === 'mgroup') this.runSync(this.callUser(d.method, d.obj, args || [], d.closure));
    }
    defaultOf(t) {
      if (t === 'int' || t === 'float' || t === 'double' || t === 'LayerMask') return 0;
      if (t === 'char') return '\0';
      if (t === 'bool') return false;
      if (t === 'Vector2') return vec(0, 0);
      if (t === 'Vector3') return vec(0, 0, 0);
      if (t === 'Vector3Int') return vec(0, 0, 0, 'Vector3Int');
      if (t === 'Vector2Int') return vec(0, 0, 0, 'Vector2Int');
      if (t === 'Color') return color(0, 0, 0, 0);
      if (this.enums && this.enums.has(t)) {
        const vals = [...this.enums.get(t).values()];
        return vals.find((x) => x.v === 0) || vals[0];
      }
      return null;
    }
    coerce(v, t) {
      if (v && v.kind === 'vec') {
        if (t === 'Vector2' && v.ty !== 'Vector2') return vec(v.x, v.y);
        if (t === 'Vector3' && v.ty !== 'Vector3') return vec(v.x, v.y, v.z || 0, 'Vector3');
      }
      if (typeof v === 'number' && t === 'float') return Math.fround(v);
      return v;
    }

    /* ---------- 敘述 ---------- */
    *exec(s, env) {
      this.tick(s);
      switch (s.k) {
        case 'block': {
          const e2 = new Env(env);
          for (const st of s.stmts) {
            const r = yield* this.exec(st, e2);
            if (r) return r;
          }
          return undefined;
        }
        case 'empty': return undefined;
        case 'decl':
          for (const d of s.decls) {
            let v;
            if (d.init) v = d.init.k === 'arrinit' ? yield* this.arrInit(d.init, s.declType, env) : copy(yield* this.eval(d.init, env));
            else v = this.defaultOf(d.type);
            env.declare(d.name, this.coerce(v, d.type));
          }
          return undefined;
        case 'expr': yield* this.eval(s.e, env); return undefined;
        case 'if': {
          const c = yield* this.eval(s.cond, env);
          if (c) return yield* this.exec(s.then, env);
          if (s.els) return yield* this.exec(s.els, env);
          return undefined;
        }
        case 'while':
          for (;;) {
            this.tick(s);
            if (!(yield* this.eval(s.cond, env))) break;
            const r = yield* this.exec(s.body, env);
            if (r) { if (r === BRK) break; if (r === CONT) continue; return r; }
          }
          return undefined;
        case 'do':
          for (;;) {
            this.tick(s);
            const r = yield* this.exec(s.body, env);
            if (r) { if (r === BRK) break; if (r !== CONT) return r; }
            if (!(yield* this.eval(s.cond, env))) break;
          }
          return undefined;
        case 'for': {
          const e2 = new Env(env);
          if (s.init) {
            if (s.init.k === 'decl') yield* this.exec(s.init, e2);
            else for (const x of s.init) yield* this.eval(x, e2);
          }
          for (;;) {
            this.tick(s);
            if (s.cond && !(yield* this.eval(s.cond, e2))) break;
            const r = yield* this.exec(s.body, e2);
            if (r) { if (r === BRK) break; if (r !== CONT) return r; }
            for (const x of s.iter) yield* this.eval(x, e2);
          }
          return undefined;
        }
        case 'foreach': {
          const coll = yield* this.eval(s.coll, env);
          if (isNullish(coll)) throw this.nre(s.coll);
          let items;
          let ver = null;
          if (typeof coll === 'string') items = [...coll];
          else if (coll.kind === 'array' || coll.kind === 'list' || coll.kind === 'queue') { items = coll.items; ver = coll.ver || 0; }
          else if (coll.kind === 'stack') { items = coll.items.slice().reverse(); ver = coll.ver || 0; }
          else if (coll.kind === 'dict') { items = [...coll.map.values()].map((p) => ({ kind: 'kvp', k: p.k, v: p.v })); ver = coll.ver || 0; }
          else items = [];
          const n = items.length;
          for (let k = 0; k < n; k++) {
            this.tick(s);
            if (ver !== null && (coll.ver || 0) !== ver) throw this.fail('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.', s);
            const e2 = new Env(env);
            e2.declare(s.name, copy(items[k]));
            const r = yield* this.exec(s.body, e2);
            if (r) { if (r === BRK) break; if (r !== CONT) return r; }
          }
          if (ver !== null && (coll.ver || 0) !== ver) throw this.fail('InvalidOperationException', 'Collection was modified; enumeration operation may not execute.', s);
          return undefined;
        }
        case 'switch': {
          const v = yield* this.eval(s.e, env);
          let start = -1;
          let def = -1;
          for (let k = 0; k < s.sections.length && start < 0; k++) {
            for (const l of s.sections[k].labels) {
              if (l.def) { def = k; continue; }
              const lv = yield* this.eval(l.v, env);
              if (lv === v) { start = k; break; }
            }
          }
          if (start < 0) start = def;
          if (start < 0) return undefined;
          const e2 = new Env(env);
          for (const st of s.sections[start].stmts) {
            const r = yield* this.exec(st, e2);
            if (r === BRK) return undefined;
            if (r) return r;
          }
          return undefined;
        }
        case 'break': return BRK;
        case 'continue': return CONT;
        case 'return': return { c: 'return', v: s.e ? copy(yield* this.eval(s.e, env)) : undefined };
        case 'yield': {
          const v = yield* this.eval(s.e, env);
          yield { yr: v, node: s };
          return undefined;
        }
        case 'yieldbreak': return { c: 'return' };
        default: return undefined;
      }
    }
    *arrInit(init, type, env) {
      const items = [];
      for (const it of init.items) items.push(copy(yield* this.eval(it, env)));
      const le = listElem(type);
      if (le) return { kind: 'list', elem: le, items, ver: 0 };
      return { kind: 'array', elem: arrElem(type) || '?', items };
    }

    /* ---------- 運算式 ---------- */
    *eval(e, env) {
      switch (e.k) {
        case 'num': return e.ty === 'float' ? Math.fround(e.v) : e.v;
        case 'str': case 'char': case 'bool': return e.v;
        case 'null': return null;
        case 'paren': return yield* this.eval(e.e, env);
        case 'istr': {
          let s = '';
          for (const p of e.parts) {
            if (p.s !== undefined) s += p.s;
            else s += fmt(yield* this.eval(p.e, env), p.e.ty, p.fmt);
          }
          return s;
        }
        case 'this': return env.self;
        case 'typeof': return { kind: 'type', name: typeStr(e.ty) };
        case 'id': return this.readId(e, env);
        case 'member': {
          const o = yield* this.eval(e.obj, env);
          if (o === null || o === undefined) { if (e.nullCond) return null; throw this.nre(e); }
          return this.getMember(o, e.name, e);
        }
        case 'index': {
          const o = yield* this.eval(e.obj, env);
          const i = yield* this.eval(e.idx, env);
          return this.getIndex(o, i, e);
        }
        case 'call': return yield* this.evalCall(e, env);
        case 'new': return yield* this.evalNew(e, env);
        case 'newarr': {
          if (e.init) return yield* this.arrInit(e.init, e.type, env);
          const n = yield* this.eval(e.size, env);
          if (n < 0) throw this.fail('OverflowException', 'Arithmetic operation resulted in an overflow.', e);
          const el = arrElem(e.type);
          const items = [];
          for (let k = 0; k < n; k++) items.push(this.defaultOf(el));
          return { kind: 'array', elem: el, items };
        }
        case 'unary': {
          const v = yield* this.eval(e.e, env);
          if (e.op === '!') return !v;
          if (e.op === '-') return v && v.kind === 'vec' ? vec(-v.x, -v.y, -v.z, v.ty) : -v;
          return v;
        }
        case 'inc': {
          const ref = yield* this.ref(e.e, env);
          const old = ref.get();
          let nv = e.op === '++' ? old + 1 : old - 1;
          if (e.ty === 'int') nv |= 0;
          ref.set(nv);
          return e.prefix ? nv : old;
        }
        case 'bin': return yield* this.evalBin(e, env);
        case 'tern': return (yield* this.eval(e.c, env)) ? yield* this.eval(e.a, env) : yield* this.eval(e.b, env);
        case 'coalesce': {
          const l = yield* this.eval(e.l, env);
          return isNullish(l) ? yield* this.eval(e.r, env) : l;
        }
        case 'cast': {
          const v = yield* this.eval(e.e, env);
          if (e.to === 'int' && v && v.kind === 'enum') return v.v;
          if (e.to === 'int') return typeof v === 'string' ? v.charCodeAt(0) : Math.trunc(v);
          if (e.to === 'float') return Math.fround(v);
          return v;
        }
        case 'assign': return yield* this.evalAssign(e, env);
        default: return undefined;
      }
    }
    readId(e, env) {
      const box = env.lookup(e.name);
      if (box) return box.v;
      const self = env.self;
      if (self && self.kind === 'obj') {
        if (self.fields.has(e.name)) return self.fields.get(e.name);
        const m = this.findMethod(self.cls, e.name);
        if (m) return { kind: 'mgroup', obj: self, method: m };
        if (self.host && self.host.has && self.host.has(e.name)) return self.host.get(e.name, this, e);
      }
      if (this.topMethods.has(e.name)) return { kind: 'mgroup', obj: null, method: this.topMethods.get(e.name), closure: this.globalEnv };
      const g = this.host.globals && this.host.globals[e.name];
      if (g !== undefined) return typeof g === 'object' && g && g.__value ? g.get(this) : g;
      if (this.statics[e.name]) return this.statics[e.name];
      if (this.host.statics && this.host.statics[e.name]) return this.host.statics[e.name];
      if (this.classes.has(e.name)) return { kind: 'classref', cls: this.classes.get(e.name) };
      if (this.enums.has(e.name)) return { kind: 'enumtype', name: e.name, vals: this.enums.get(e.name) };
      throw this.fail('CS0103', `The name '${e.name}' does not exist in the current context`, e);
    }
    dictKey(k) {
      if (k && typeof k === 'object' && k.kind === 'vec') return `v:${k.x},${k.y},${k.z}`;
      if (k && typeof k === 'object' && k.kind === 'enum') return `e:${k.type}.${k.name}`;
      return typeof k + ':' + String(k);
    }
    *ref(t, env) {
      const rt = this;
      if (t.k === 'id') {
        const box = env.lookup(t.name);
        if (box) return { get: () => box.v, set: (v) => { box.v = rt.coerce(v, t.ty); } };
        const self = env.self;
        if (self && self.kind === 'obj') {
          if (self.fields.has(t.name)) return { get: () => self.fields.get(t.name), set: (v) => self.fields.set(t.name, rt.coerce(v, t.ty)) };
          if (self.host && self.host.has && self.host.has(t.name)) return { get: () => self.host.get(t.name, rt, t), set: (v) => self.host.set(t.name, v, rt, t) };
        }
        const g = this.host.globals && this.host.globals[t.name];
        if (g && g.__value) return { get: () => g.get(rt), set: (v) => g.set(v, rt) };
        throw this.fail('CS0103', `The name '${t.name}' does not exist in the current context`, t);
      }
      if (t.k === 'member') {
        const o = yield* this.eval(t.obj, env);
        if (isNullish(o)) {
          if (o && o.__destroyed) throw this.fail('MissingReferenceException', `The object of type '${o.__type}' has been destroyed but you are still trying to access it.`, t);
          throw this.nre(t);
        }
        return { get: () => rt.getMember(o, t.name, t), set: (v) => rt.setMember(o, t.name, v, t) };
      }
      if (t.k === 'index') {
        const o = yield* this.eval(t.obj, env);
        const i = yield* this.eval(t.idx, env);
        if (o && o.kind === 'dict') {
          // Dictionary 用 [] 指定時，沒有這個 key 會自動新增
          return { get: () => rt.getIndex(o, i, t), set: (v) => { o.map.set(rt.dictKey(i), { k: copy(i), v: copy(v) }); o.ver = (o.ver || 0) + 1; } };
        }
        rt.getIndex(o, i, t);
        return { get: () => rt.getIndex(o, i, t), set: (v) => { o.items[i] = copy(v); } };
      }
      throw this.fail('CS0131', 'The left-hand side of an assignment must be a variable, property or indexer', t);
    }
    getMember(o, name, node) {
      if (typeof o === 'string') {
        if (name === 'Length') return o.length;
        throw this.fail('CS1061', `'string' does not contain a definition for '${name}'`, node);
      }
      if (o && o.__destroyed && o.__host) throw this.fail('MissingReferenceException', `The object of type '${o.__type}' has been destroyed but you are still trying to access it.`, node);
      switch (o.kind) {
        case 'obj':
          if (o.fields.has(name)) return o.fields.get(name);
          if (this.findMethod(o.cls, name)) return { kind: 'mgroup', obj: o, method: this.findMethod(o.cls, name) };
          if (o.host && o.host.has && o.host.has(name)) return o.host.get(name, this, node);
          break;
        case 'list': case 'stack': case 'queue': if (name === 'Count') return o.items.length; break;
        case 'dict': if (name === 'Count') return o.map.size; break;
        case 'kvp': if (name === 'Key') return o.k; if (name === 'Value') return o.v; break;
        case 'enumtype': if (o.vals.has(name)) return o.vals.get(name); break;
        case 'array': if (name === 'Length') return o.items.length; break;
        case 'vec': {
          if (name === 'x' || name === 'y' || name === 'z') return o[name];
          const mag = Math.sqrt(o.x * o.x + o.y * o.y + o.z * o.z);
          if (name === 'magnitude') return Math.fround(mag);
          if (name === 'sqrMagnitude') return Math.fround(mag * mag);
          if (name === 'normalized') return mag > 1e-5 ? vec(o.x / mag, o.y / mag, o.z / mag, o.ty) : vec(0, 0, 0, o.ty);
          break;
        }
        case 'color': if ('rgba'.includes(name) && name.length === 1) return o[name]; break;
        case 'static': return o.get(name, this, node);
        default:
          if (o.__host) return o.get(name, this, node);
      }
      throw this.fail('CS1061', `'${o.kind || o.__type}' does not contain a definition for '${name}'`, node);
    }
    setMember(o, name, v, node) {
      v = copy(v);
      switch (o.kind) {
        case 'obj':
          if (o.fields.has(name)) {
            const f = o.cls.fields.find((x) => x.name === name);
            o.fields.set(name, this.coerce(v, f && f.type));
            return;
          }
          if (o.host && o.host.has && o.host.has(name)) { o.host.set(name, v, this, node); return; }
          break;
        case 'vec': o[name] = v; return;
        case 'color': o[name] = v; return;
        case 'static': o.set(name, v, this, node); return;
        default:
          if (o.__host) { o.set(name, v, this, node); return; }
      }
      throw this.fail('CS1061', `cannot set '${name}'`, node);
    }
    getIndex(o, i, node) {
      if (isNullish(o)) throw this.nre(node);
      if (typeof o === 'string') {
        if (i < 0 || i >= o.length) throw this.fail('IndexOutOfRangeException', 'Index was outside the bounds of the array.', node);
        return o[i];
      }
      if (o.kind === 'array') {
        if (i < 0 || i >= o.items.length) throw this.fail('IndexOutOfRangeException', 'Index was outside the bounds of the array.', node);
        return o.items[i];
      }
      if (o.kind === 'list') {
        if (i < 0 || i >= o.items.length) throw this.fail('ArgumentOutOfRangeException', 'Index was out of range. Must be non-negative and less than the size of the collection.', node);
        return o.items[i];
      }
      if (o.kind === 'dict') {
        const p = o.map.get(this.dictKey(i));
        if (!p) throw this.fail('KeyNotFoundException', `The given key '${fmt(i)}' was not present in the dictionary.`, node);
        return p.v;
      }
      throw this.fail('CS0021', 'Cannot apply indexing', node);
    }
    *evalArgs(args, env) {
      const out = [];
      for (const a of args) {
        if (a.k === 'outdecl') {
          env.declare(a.name, this.defaultOf(a.type));
          const box = env.lookup(a.name);
          out.push({ kind: 'outref', set: (v) => { box.v = v; } });
        } else if (a.isOut) {
          const r = yield* this.ref(a, env);
          out.push({ kind: 'outref', set: r.set });
        } else out.push(copy(yield* this.eval(a, env)));
      }
      return out;
    }
    *evalCall(e, env) {
      const c = e.callee;
      if (c.k === 'id') {
        const name = c.name;
        const box = env.lookup(name);
        if (box) {
          const args = yield* this.evalArgs(e.args, env);
          return yield* this.invokeValue(box.v, args, e);
        }
        const self = env.self;
        if (self && self.kind === 'obj') {
          const m = e.method && self.cls.methods.includes(e.method) ? e.method : this.findMethod(self.cls, name);
          if (m) {
            const args = yield* this.evalArgs(e.args, env);
            return yield* this.callUser(m, self, args, null);
          }
          if (self.fields.has(name)) {
            const args = yield* this.evalArgs(e.args, env);
            return yield* this.invokeValue(self.fields.get(name), args, e);
          }
          if (self.host && self.host.hasMethod && self.host.hasMethod(name)) {
            const args = yield* this.evalArgs(e.args, env);
            return self.host.call(name, args, this, e, c.targs);
          }
        }
        if (this.topMethods.has(name)) {
          const args = yield* this.evalArgs(e.args, env);
          return yield* this.callUser(e.method || this.topMethods.get(name), null, args, this.globalEnv);
        }
        const g = this.host.funcs && this.host.funcs[name];
        if (g) {
          const args = yield* this.evalArgs(e.args, env);
          return g(args, this, e);
        }
        throw this.fail('CS0103', `The name '${name}' does not exist in the current context`, c);
      }
      if (c.k === 'member') {
        const o = yield* this.eval(c.obj, env);
        if (o === null || o === undefined) {
          if (c.nullCond) return null;
          throw this.nre(c);
        }
        const args = yield* this.evalArgs(e.args, env);
        return yield* this.callMember(o, c.name, args, e, c.targs);
      }
      const f = yield* this.eval(c, env);
      const args = yield* this.evalArgs(e.args, env);
      return yield* this.invokeValue(f, args, e);
    }
    *invokeValue(f, args, node) {
      if (isNullish(f)) throw this.nre(node);
      if (f.kind === 'delegate') { for (const it of f.list.slice()) yield* this.callUser(it.method, it.obj, args, it.closure); return undefined; }
      if (f.kind === 'mgroup') return yield* this.callUser(f.method, f.obj, args, f.closure);
      throw this.fail('CS1955', 'Non-invocable member cannot be used like a method', node);
    }
    *callMember(o, name, args, node, targs) {
      if (typeof o === 'string') {
        switch (name) {
          case 'ToUpper': return o.toUpperCase();
          case 'ToLower': return o.toLowerCase();
          case 'Contains': return o.includes(args[0]);
          case 'StartsWith': return o.startsWith(args[0]);
          case 'Replace': return o.split(args[0]).join(args[1]);
          case 'ToString': return o;
          default:
        }
      }
      if (typeof o === 'number' || typeof o === 'boolean') {
        if (name === 'ToString') return fmt(o, node.callee.obj.ty, args[0]);
      }
      if (o && o.__destroyed && o.__host) throw this.fail('MissingReferenceException', `The object of type '${o.__type}' has been destroyed but you are still trying to access it.`, node);
      switch (o.kind) {
        case 'obj': {
          const m = (node.method && o.cls.methods.includes(node.method)) ? node.method : this.findMethod(o.cls, name);
          if (m) return yield* this.callUser(m, o, args, null);
          if (o.fields.has(name)) return yield* this.invokeValue(o.fields.get(name), args, node);
          if (o.host && o.host.hasMethod && o.host.hasMethod(name)) return o.host.call(name, args, this, node, targs);
          break;
        }
        case 'list': {
          const L = o.items;
          const bump = () => { o.ver = (o.ver || 0) + 1; };
          switch (name) {
            case 'Add': L.push(args[0]); bump(); return undefined;
            case 'Remove': { const k = L.findIndex((x) => this.eq(x, args[0])); if (k >= 0) { L.splice(k, 1); bump(); return true; } return false; }
            case 'Contains': return L.some((x) => this.eq(x, args[0]));
            case 'Clear': L.length = 0; bump(); return undefined;
            case 'IndexOf': return L.findIndex((x) => this.eq(x, args[0]));
            case 'RemoveAt':
              if (args[0] < 0 || args[0] >= L.length) throw this.fail('ArgumentOutOfRangeException', 'Index was out of range. Must be non-negative and less than the size of the collection.', node);
              L.splice(args[0], 1); bump(); return undefined;
            case 'Insert':
              if (args[0] < 0 || args[0] > L.length) throw this.fail('ArgumentOutOfRangeException', 'Index must be within the bounds of the List.', node);
              L.splice(args[0], 0, args[1]); bump(); return undefined;
            default:
          }
          break;
        }
        case 'stack': case 'queue': {
          const L = o.items;
          const bump = () => { o.ver = (o.ver || 0) + 1; };
          const isStack = o.kind === 'stack';
          const empty = () => this.fail('InvalidOperationException', isStack ? 'Stack empty.' : 'Queue empty.', node);
          switch (name) {
            case 'Push': case 'Enqueue': L.push(copy(args[0])); bump(); return undefined;
            case 'Pop': if (!L.length) throw empty(); bump(); return L.pop();
            case 'Dequeue': if (!L.length) throw empty(); bump(); return L.shift();
            case 'Peek': if (!L.length) throw empty(); return isStack ? L[L.length - 1] : L[0];
            case 'Clear': L.length = 0; bump(); return undefined;
            case 'Contains': return L.some((x) => this.eq(x, args[0]));
            default:
          }
          break;
        }
        case 'dict': {
          const M = o.map;
          const bump = () => { o.ver = (o.ver || 0) + 1; };
          const key = this.dictKey(args[0]);
          switch (name) {
            case 'Add':
              if (M.has(key)) throw this.fail('ArgumentException', `An item with the same key has already been added. Key: ${fmt(args[0])}`, node);
              M.set(key, { k: copy(args[0]), v: copy(args[1]) }); bump(); return undefined;
            case 'ContainsKey': return M.has(key);
            case 'Remove': { const had = M.delete(key); if (had) bump(); return had; }
            case 'Clear': M.clear(); bump(); return undefined;
            case 'TryGetValue': {
              const p = M.get(key);
              if (args[1] && args[1].kind === 'outref') args[1].set(p ? p.v : this.defaultOf(o.val));
              return !!p;
            }
            default:
          }
          break;
        }
        case 'vec':
          if (name === 'Normalize') { const n = this.getMember(o, 'normalized'); o.x = n.x; o.y = n.y; o.z = n.z; return undefined; }
          if (name === 'ToString') return fmt(o);
          break;
        case 'delegate': case 'mgroup':
          if (name === 'Invoke') return yield* this.invokeValue(o, args, node);
          break;
        case 'static': return o.call(name, args, this, node, targs);
        default:
          if (o.__host) return o.call(name, args, this, node, targs);
      }
      throw this.fail('CS1061', `'${o.kind || o.__type}' does not contain a definition for '${name}'`, node);
    }
    *callUser(m, self, args, closure) {
      if (m.isIter) {
        const rt = this;
        return { kind: 'enumerator', method: m, make: () => rt.execMethod(m, self, args, closure) };
      }
      return yield* this.execMethod(m, self, args, closure);
    }
    *execMethod(m, self, args, closure) {
      this.depth++;
      if (this.depth > 400) { this.depth = 0; throw this.fail('StackOverflowException', 'The requested operation caused a stack overflow.', m); }
      try {
        const env = new Env(closure || null, self);
        for (let k = 0; k < m.params.length; k++) {
          const p = m.params[k];
          let v = k < args.length ? args[k] : (p.def ? yield* this.eval(p.def, env) : this.defaultOf(p.type));
          env.declare(p.name, this.coerce(copy(v), p.type));
        }
        const r = yield* this.exec(m.body, env);
        return r && r.c === 'return' ? this.coerce(r.v, m.retType) : undefined;
      } finally {
        this.depth--;
      }
    }
    *evalNew(e, env) {
      const t = e.type || typeStr(e.ty);
      const args = yield* this.evalArgs(e.args, env);
      if (this.classes.has(t)) {
        if (this.classes.get(t).base === 'MonoBehaviour') {
          this.log("You are trying to create a MonoBehaviour using the 'new' keyword.  This is not allowed.  MonoBehaviours can only be added using AddComponent().", 'warn');
        }
        return this.newInstance(t, null, args);
      }
      const bn = baseName(t);
      if (bn === 'List') {
        const L = { kind: 'list', elem: listElem(t), items: [], ver: 0 };
        if (e.init) for (const it of e.init.items) L.items.push(copy(yield* this.eval(it, env)));
        return L;
      }
      if (bn === 'Stack') return { kind: 'stack', elem: genArgs(t)[0], items: [], ver: 0 };
      if (bn === 'Queue') return { kind: 'queue', elem: genArgs(t)[0], items: [], ver: 0 };
      if (bn === 'Dictionary') { const [k, v] = genArgs(t); return { kind: 'dict', key: k, val: v, map: new Map(), ver: 0 }; }
      if (t === 'Vector2Int') return vec(args[0] | 0, args[1] | 0, 0, 'Vector2Int');
      if (t === 'Vector2') return vec(args[0] || 0, args[1] || 0);
      if (t === 'Vector3') return vec(args[0] || 0, args[1] || 0, args[2] || 0, 'Vector3');
      if (t === 'Vector3Int') return vec(args[0] | 0, args[1] | 0, (args[2] || 0) | 0, 'Vector3Int');
      if (t === 'Color') return color(args[0], args[1], args[2], args[3]);
      if (t === 'WaitForSeconds') return { kind: 'wait', s: args[0], realtime: false };
      if (t === 'WaitForSecondsRealtime') return { kind: 'wait', s: args[0], realtime: true };
      if (this.host.ctors && this.host.ctors[t]) return this.host.ctors[t](args, this, e);
      return { kind: 'opaque', type: t };
    }
    eq(a, b) {
      if (a && b && a.kind === 'vec' && b.kind === 'vec') {
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz < 1e-10;
      }
      if (a && b && a.kind === 'color' && b.kind === 'color') return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
      if (isNullish(a) && isNullish(b)) return true;
      return a === b;
    }
    *evalBin(e, env) {
      const op = e.op;
      if (op === '&&') return (yield* this.eval(e.l, env)) ? !!(yield* this.eval(e.r, env)) : false;
      if (op === '||') return (yield* this.eval(e.l, env)) ? true : !!(yield* this.eval(e.r, env));
      const l = yield* this.eval(e.l, env);
      const r = yield* this.eval(e.r, env);
      return this.binop(op, l, r, e, e.l.ty, e.r.ty, e.ty);
    }
    binop(op, l, r, node, lt, rtT, resT) {
      if (op === '==') return this.eq(l, r);
      if (op === '!=') return !this.eq(l, r);
      if (op === '+' && (resT === 'string' || typeof l === 'string' || typeof r === 'string')) return fmt(l, lt) + fmt(r, rtT);
      const lv = l && l.kind === 'vec';
      const rv = r && r.kind === 'vec';
      if (lv || rv) {
        let ty = (lv && l.ty === 'Vector3') || (rv && r.ty === 'Vector3') ? 'Vector3' : 'Vector2';
        if (resT === 'Vector2Int' || resT === 'Vector2' || resT === 'Vector3') ty = resT;
        const mk = (x, y, z) => (ty === 'Vector2Int' ? vec(Math.trunc(x), Math.trunc(y), 0, 'Vector2Int') : vec(x, y, ty === 'Vector3' ? z : undefined, ty));
        if (op === '+') return mk(l.x + r.x, l.y + r.y, l.z + r.z);
        if (op === '-') return mk(l.x - r.x, l.y - r.y, l.z - r.z);
        if (op === '*') { const v = lv ? l : r; const k = lv ? r : l; return mk(v.x * k, v.y * k, v.z * k); }
        if (op === '/') return mk(l.x / r, l.y / r, l.z / r);
      }
      if (typeof l === 'string' && l.length === 1 && lt === 'char') l = l.charCodeAt(0);
      if (typeof r === 'string' && r.length === 1 && rtT === 'char') r = r.charCodeAt(0);
      const isInt = resT === 'int';
      let v;
      switch (op) {
        case '+': v = l + r; break;
        case '-': v = l - r; break;
        case '*': v = l * r; break;
        case '/':
          if (isInt) { if (r === 0) throw this.fail('DivideByZeroException', 'Attempted to divide by zero.', node); v = Math.trunc(l / r); }
          else v = l / r;
          break;
        case '%':
          if (isInt && r === 0) throw this.fail('DivideByZeroException', 'Attempted to divide by zero.', node);
          v = l % r;
          break;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        default: v = undefined;
      }
      if (isInt) return v | 0;
      if (resT === 'float') return Math.fround(v);
      return v;
    }
    *evalAssign(e, env) {
      const ref = yield* this.ref(e.target, env);
      if (e.op === '=') {
        const v = copy(yield* this.eval(e.value, env));
        ref.set(v);
        return v;
      }
      if (e.op === '??=') {
        const cur = ref.get();
        if (!isNullish(cur)) return cur;
        const v = yield* this.eval(e.value, env);
        ref.set(v);
        return v;
      }
      const cur = ref.get();
      const v = yield* this.eval(e.value, env);
      const tt = e.target.ty;
      if ((typeof tt === 'string' && tt.startsWith('Action')) || (v && (v.kind === 'mgroup' || v.kind === 'delegate'))) {
        let list = cur && cur.kind === 'delegate' ? cur.list.slice() : [];
        const add = v.kind === 'delegate' ? v.list : [{ obj: v.obj, method: v.method, closure: v.closure }];
        if (e.op === '+=') list = list.concat(add);
        else if (e.op === '-=') {
          for (const a of add) {
            for (let k = list.length - 1; k >= 0; k--) {
              if (list[k].obj === a.obj && list[k].method === a.method) { list.splice(k, 1); break; }
            }
          }
        }
        const nv = list.length ? { kind: 'delegate', list } : null;
        ref.set(nv);
        return nv;
      }
      const nv = this.binop(e.op[0], cur, v, e, tt, e.value.ty, tt === 'string' ? 'string' : (isNum(tt) ? tt : e.ty));
      ref.set(nv);
      return nv;
    }

    /* ---------- 內建靜態類別 ---------- */
    makeStatics() {
      const rt = this;
      function S(type, props, methods, setters) {
        return {
          kind: 'static', __type: type,
          get(name, r, node) {
            if (props && Object.prototype.hasOwnProperty.call(props, name)) return typeof props[name] === 'function' ? props[name]() : copy(props[name]);
            throw rt.fail('CS0117', `'${type}' does not contain a definition for '${name}'`, node);
          },
          set(name, v, r, node) {
            if (setters && setters[name]) { setters[name](v); return; }
            throw rt.fail('CS0200', `'${type}.${name}' cannot be assigned to -- it is read only`, node);
          },
          call(name, args, r, node, targs) {
            if (methods && methods[name]) return methods[name](args, node, targs);
            throw rt.fail('CS0117', `'${type}' does not contain a definition for '${name}'`, node);
          }
        };
      }
      const argTy = (node, i) => (node && node.args && node.args[i] ? node.args[i].ty : undefined);
      const logText = (v, node) => (v === null || v === undefined ? 'Null' : fmt(v, argTy(node, 0)));
      const num = (node, v) => (node.ty === 'int' ? v | 0 : node.ty === 'float' ? Math.fround(v) : v);
      const vecStatics = (ty) => {
        const z = ty === 'Vector3' ? 0 : undefined;
        const mk = (x, y, zz) => vec(x, y, ty === 'Vector3' ? zz : undefined, ty);
        return S(ty, {
          zero: () => mk(0, 0, 0), one: () => mk(1, 1, 1), up: () => mk(0, 1, 0), down: () => mk(0, -1, 0),
          left: () => mk(-1, 0, 0), right: () => mk(1, 0, 0), forward: () => mk(0, 0, z === undefined ? 0 : 1)
        }, {
          Distance: (a) => Math.fround(Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y, a[0].z - a[1].z)),
          MoveTowards: (a) => {
            const [c, t, d] = a;
            const dx = t.x - c.x, dy = t.y - c.y, dz = t.z - c.z;
            const dist = Math.hypot(dx, dy, dz);
            if (dist <= d || dist === 0) return mk(t.x, t.y, t.z);
            return mk(c.x + dx / dist * d, c.y + dy / dist * d, c.z + dz / dist * d);
          },
          Lerp: (a) => { const t = Math.max(0, Math.min(1, a[2])); return mk(a[0].x + (a[1].x - a[0].x) * t, a[0].y + (a[1].y - a[0].y) * t, a[0].z + (a[1].z - a[0].z) * t); }
        });
      };
      return {
        Debug: S('Debug', {}, {
          Log: (a, node) => { rt.log(logText(a[0], node), 'log'); },
          LogWarning: (a, node) => { rt.log(logText(a[0], node), 'warn'); },
          LogError: (a, node) => { rt.log(logText(a[0], node), 'error'); },
          DrawLine: (a) => { if (rt.host.drawLine) rt.host.drawLine(a[0], a[1], a[2]); }
        }),
        Mathf: S('Mathf', { PI: Math.fround(Math.PI), Infinity: Infinity }, {
          Abs: (a, n) => num(n, Math.abs(a[0])),
          Min: (a, n) => num(n, Math.min(a[0], a[1])),
          Max: (a, n) => num(n, Math.max(a[0], a[1])),
          Clamp: (a, n) => num(n, Math.min(Math.max(a[0], a[1]), a[2])),
          Clamp01: (a) => Math.fround(Math.min(Math.max(a[0], 0), 1)),
          Sqrt: (a) => Math.fround(Math.sqrt(a[0])),
          Round: (a) => Math.fround(Math.round(a[0])),
          Floor: (a) => Math.fround(Math.floor(a[0])),
          Ceil: (a) => Math.fround(Math.ceil(a[0])),
          RoundToInt: (a) => Math.round(a[0]),
          FloorToInt: (a) => Math.floor(a[0]),
          CeilToInt: (a) => Math.ceil(a[0]),
          Sign: (a) => (a[0] >= 0 ? 1 : -1),
          Lerp: (a) => Math.fround(a[0] + (a[1] - a[0]) * Math.max(0, Math.min(1, a[2]))),
          MoveTowards: (a) => (Math.abs(a[1] - a[0]) <= a[2] ? a[1] : a[0] + Math.sign(a[1] - a[0]) * a[2]),
          Sin: (a) => Math.fround(Math.sin(a[0])),
          Cos: (a) => Math.fround(Math.cos(a[0])),
          Pow: (a) => Math.fround(Math.pow(a[0], a[1]))
        }),
        Random: S('Random', { value: () => Math.fround(rt.rng()) }, {
          Range: (a, n) => {
            if (n.ty === 'int') { if (a[1] <= a[0]) return a[0]; return a[0] + Math.floor(rt.rng() * (a[1] - a[0])); }
            return Math.fround(a[0] + rt.rng() * (a[1] - a[0]));
          }
        }),
        Vector2: vecStatics('Vector2'),
        Vector3: vecStatics('Vector3'),
        Vector2Int: S('Vector2Int', {
          zero: () => vec(0, 0, 0, 'Vector2Int'), one: () => vec(1, 1, 0, 'Vector2Int'),
          up: () => vec(0, 1, 0, 'Vector2Int'), down: () => vec(0, -1, 0, 'Vector2Int'),
          left: () => vec(-1, 0, 0, 'Vector2Int'), right: () => vec(1, 0, 0, 'Vector2Int')
        }, { Distance: (a) => Math.fround(Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)) }),
        Color: S('Color', Object.keys(COLORS).reduce((o, k) => { o[k] = () => color(...COLORS[k]); return o; }, {}), {}),
        Quaternion: S('Quaternion', { identity: () => ({ kind: 'quat' }) }, {}),
        int: S('int', { MaxValue: 2147483647, MinValue: -2147483648 }, { Parse: (a, node) => { const v = parseInt(a[0], 10); if (isNaN(v)) throw rt.fail('FormatException', 'Input string was not in a correct format.', node); return v; } }),
        float: S('float', { MaxValue: 3.4028235e38, MinValue: -3.4028235e38 }, {})
      };
    }
  }

  /* =========================================================
   * 對外：編譯（解析 + 檢查）
   * ========================================================= */
  function compile(src, opts) {
    opts = opts || {};
    let prog;
    try {
      prog = parse(src);
    } catch (err) {
      if (err instanceof CsError) return { ok: false, errors: [err], warnings: [] };
      throw err;
    }
    const ck = new Checker(prog, opts);
    let res;
    try {
      res = ck.run();
    } catch (err) {
      if (err instanceof CsError) return { ok: false, errors: [err], warnings: [] };
      throw err;
    }
    res.errors.sort((a, b) => a.line - b.line || a.col - b.col);
    return { ok: res.errors.length === 0, errors: res.errors, warnings: res.warnings, prog };
  }

  function formatError(err, fileName) {
    const file = `Assets/Scripts/${fileName || 'Hero.cs'}`;
    if (err.kind === 'compile') return `${file}(${err.line},${err.col}): error ${err.code}: ${err.message}`;
    if (err.kind === 'warning') return `${file}(${err.line},${err.col}): warning ${err.code}: ${err.message}`;
    if (err.kind === 'freeze') return err.message;
    return `${err.code}: ${err.message}\n  (at ${file}:${err.line})`;
  }

  root.CSQ = {
    CsError, ZH, tokenize, parse, compile, Runtime, Checker, TYPES, fmt, floatStr, formatError, vec, color, copy, isNullish, mulberry32, sig, typeStr, genArgs
  };
})(typeof window !== 'undefined' ? window : globalThis);
