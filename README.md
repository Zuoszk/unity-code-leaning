# C# 小勇者

寫 C# 控制勇者的闖關小遊戲，從變數、迴圈一路學到 Unity 的 `Update`、2D 物理、Prefab 和協程。全部在瀏覽器裡執行，不用安裝 Unity。

**線上遊玩：** https://zuoszk.github.io/unity-code-leaning/

## 內容

- **80 個小關，一個概念一關**
  - 前 4 個世界是格子迷宮：寫 `MoveRight();`、`if`、`for`、`while`、陣列、方法、`class`，勇者會照著程式走。
  - 後 7 個世界是模擬的 Unity：寫真正的 `MonoBehaviour` 腳本，例如 `Start`、`Update`、`Time.deltaTime`、`Rigidbody2D`、`OnTriggerEnter2D`、`Instantiate`、`StartCoroutine`、`event`。
  - 4 個「遊戲類型挑戰」世界（完成 6-5 後解鎖）：推箱子解謎（格子移動、`Stack` 悔一步）、方塊沙盒（滑鼠轉格子、`SetTile`、`JsonUtility` 存檔）、太空射擊（物件池、敵人波次、`enum` 射擊模式）、塔防（路徑點、找最近的敵人、狀態機）。
- **兩種玩法**：
  - 自己寫程式
  - 從 4 段程式裡挑一段：每段都會真的執行，你會看到撞牆、編譯錯誤、無限迴圈卡死等結果，並附上解說。
- **和 Unity 一樣的錯誤訊息**：Console 會顯示 `CS1002`、`CS0664`、`NullReferenceException` 等錯誤，附中文說明，點一下就能跳到出錯的那一行。
- **工作坊**：場景（`LevelBuilder`）、人物（`PlayerController`）、敵人（`EnemyPatrol`）三份完整腳本，可以改程式、在 Inspector 調數值，再用鍵盤實際玩。
- **闖關手冊**（`handbook.html`）：每一關都能連回對應章節的講義。四種遊戲類型各有一章，附上真實 Unity 的寫法（例如官方 `ObjectPool<T>`、Command 模式）。

> 這是教學用的 C# 子集直譯器，只支援課程用到的語法和 Unity API，不是完整的 C# 或 Unity。

## 在自己的電腦上執行

因為要讀取 `js/` 裡的檔案，請用本機伺服器開啟，不要直接雙擊 `index.html`：

```bash
python -m http.server 8000
```

然後打開 http://localhost:8000/ 。

## 檔案結構

| 檔案 | 用途 |
|---|---|
| `index.html` | 遊戲頁面和樣式 |
| `handbook.html` | 闖關手冊（講義） |
| `js/interpreter.js` | C# 子集直譯器：tokenizer → parser → 型別檢查（模擬編譯錯誤）→ generator 執行器（支援協程） |
| `js/stage-grid.js` | 格子迷宮的模擬與動畫 |
| `js/stage-unity.js` | 模擬 Unity：MonoBehaviour 生命週期、2D 物理、Trigger/Collision、Prefab、Inspector、鍵盤、滑鼠、Tilemap、PlayerPrefs |
| `js/sprites.js` | 用 canvas 畫的像素圖 |
| `js/levels.js` | 關卡資料（說明、地圖、起始程式、參考答案、選項、提示） |
| `js/levels-genres.js` | 遊戲類型挑戰的 23 關（推箱子、沙盒、射擊、塔防） |
| `js/workshop.js` | 工作坊的三份腳本和場景 |
| `js/app.js` | 畫面、編輯器、Console、Inspector、進度存檔 |
| `tests.html` | 自動測試 |

## 測試

用本機伺服器打開 `tests.html`，會自動跑 644 項測試：

- 直譯器的單元測試
- 每一關的參考答案都能過關，起始程式都還不會過關
- 每個選項的結果都和解說一致
- 工作坊的三份腳本都能正常運作

進度只存在瀏覽器的 localStorage，不會上傳到任何地方。
