# 動物消消樂

3×3 九宮格動物配對小遊戲，純 HTML / CSS / JavaScript，無需建置，手機與電腦瀏覽器都能玩。

## 規則

選擇起始包數後，每次「開包」花 2 包，補滿九宮格，依下列優先序判定並消除：

| 優先序 | 盤面 | 獎勵 |
|---|---|---|
| 1 | 9 格全部不同 | +5 包（全消） |
| 2 | 橫 / 直 / 斜 3 連同種 | +3 包（消除該 3 格） |
| 3 | 任意 2 個相同 | +1 包（消除該 2 格） |

包數不足一次開包，或按「結算」，遊戲結束。

## 本機執行

直接用瀏覽器開 `index.html`，或：

```bash
python -m http.server 8000
```

## 測試

```bash
node logic.test.js
```

## 調整

- 每次開包花費：`game.js` 頂端的 `COST_PER_ROUND`
- 起始包數選項：`PACK_OPTIONS`
- 換成自己的動物圖：在 `ANIMALS` 的每一項加上 `img: 'img/cat.png'`（有 `img` 就顯示圖片，否則顯示 emoji）
- 配色：`style.css` 最上方的 `:root` 變數

## 檔案

- `logic.js` — 消除規則（純邏輯，可用 node 測試）
- `game.js` — 畫面流程與動畫
- `style.css` — 樣式
