# 烏龜消消樂

3×3 九宮格烏龜配對小遊戲，純 HTML / CSS / JavaScript，無需建置，手機與電腦瀏覽器都能玩。

## 規則

1. 開局選**幸運色**與**起始包數**（10 / 20 / 50）
2. 按「開包」：每個空格開一包（花 1 包），依**左→右、上→下**一格一格開
3. 開滿後依**左→右、上→下**把所有組合對完，每組各自播報：

| 組合 | 條件 | 獎勵 |
|---|---|---|
| 碰 | 任意 2 隻同色 | +1 包 |
| 連線 | 橫 / 直 / 斜 3 隻同色 | +3 包 |
| 全家福 | 9 隻顏色全部不同 | +5 包 |

   連線優先於碰；同一隻只會算進一組；成立的組合會被清空。
4. 開出幸運色的烏龜時暫停播報，+1 包
5. 包數用完（還有空格要開）或按「結算」，遊戲結束

平均每開一包只回收約 0.6 包，所以目標是「單局獲得多少包」與「撐幾個回合」。

## 成就與存檔

進度（開包數、碰 / 連線 / 全家福 / 幸運色次數、最佳紀錄、成就）預設存在瀏覽器 `localStorage`。
設定好 Firebase 後可用 Google 登入把進度存到雲端，換裝置也能延續。合併規則：數值取較大者，成就與幸運色取聯集。

## 啟用 Google 登入（Firebase）

1. [Firebase 主控台](https://console.firebase.google.com/) → 新增專案
2. 專案總覽 → **網頁應用程式**（`</>`）→ 註冊 → 複製 `firebaseConfig`
3. **Authentication** → 登入方式 → 啟用 **Google**
4. Authentication → 設定 → **已授權的網域** → 新增 `a25776711.github.io`（之後有自訂網域也要加）
5. **Firestore Database** → 建立資料庫（正式模式），規則貼上：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

6. 把第 2 步的設定貼進 `firebase-config.js`：

```js
window.FIREBASE_CONFIG = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  appId: '...'
};
```

7. commit、push。設定前登入按鈕不會顯示。

`firebaseConfig` 不是機密，可以放進公開倉庫；安全性由第 5 步的規則保證。

## 本機執行

```bash
python -m http.server 8000
```

## 測試

```bash
node logic.test.js
node progress.test.js
```

## 調整

- 起始包數選項、顏色與圖片：`game.js` 的 `PACK_OPTIONS`、`COLORS`
- 動畫速度：`game.js` 的 `MS`
- 獎勵：`logic.js` 的 `REWARD`
- 成就：`progress.js` 的 `DEFS`
- 配色：`style.css` 最上方的 `:root`

## 檔案

- `logic.js` — 開包後的組合判定
- `progress.js` — 統計、成就、合併
- `cloud.js` — Firebase 登入與雲端存檔
- `game.js` — 畫面流程與動畫
- `firebase-config.js` — Firebase 設定
