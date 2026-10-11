# Plan: index.html の normal-port 配線を Lee アルゴリズム方式に差し替え

## 目的
diagonal.md で定義された手順に従い、**normal block 内の subport 配線**を Lee アルゴリズム (`lee/lee_algorithm.js`) で描画する。

## スコープ原則 (qa.md の回答反映)
- 大部分の `index.html` 仕様は維持する。
- 変更対象は **normal port の配線アルゴリズム部分のみ**。
- normal block は全て同一形状なので、Lee を **1 回だけ**走らせて得た結果を全 normal block に適用する。
- nx/ny port、block 枠 (gray)、terminal マーカー、入力 UI、座標系、描画スタイルは **変更しない**。
- `lee/` ディレクトリは単独で保守できる状態を保つ (過去テスト `test-*-node.js`/`*.html` を壊さない)。index.html から使いやすくするために wrapper を追加するのは OK。

## 修正ファイル

### ファイル 1: `index.html`

#### 関数 1: `routeBlockPorts(ports, nterm, cellSize)` (現行 line 157–643, 約 500 行)

- **旧仕様**: diagonal3 insertion-based routing。
  - port を L/S/U (adjacent/opposite/same-edge) に分類
  - wList/eList/nList/sList に挿入 + main area に row/col を割り当て
  - swap trials で交差最小化
  - spines/junctions/subgrid を手動構築
  - 戻り値: `{ routes, spines, junctions, termPos, overlaps, subgrid, nR, nC }`

- **新仕様**: Lee アルゴリズム経由に差し替え。
  - 関数本体を削除し、wrapper (下記「ファイル 2」の `buildBlockSubgrid`) を呼ぶだけのシンが入る:
    ```js
    function routeBlockPorts(ports, nterm, cellSize) {
      return window.buildBlockSubgrid(ports, nterm, cellSize);
    }
    ```
  - 戻り値のキー `{ routes, spines, junctions, termPos, overlaps, subgrid, nR, nC }` は **既存の drawNormal との互換を維持**。
    - `termPos`: 各 terminal ({W,E,S,N}i) の block 辺上の 1 点 (block 内のローカル座標)。
    - `subgrid[r][c]`: ─│└┘┌┐┼ space の 2D 配列 (r=上から行、c=左から列、canvas 行順)。
    - `junctions`: `sum(connect)>2` の中黒円を描く点 (block 内ローカル座標)。
    - `routes`, `spines`, `overlaps`: 今は drawNormal が subgrid 描画メインなので **空配列で OK**。互換のためキーは残す。

#### 他の関数: **変更なし**

- `parseTermName`, `parseMaze`, `parsePath`, `detectNterm`: 入力パース — 維持
- `termLocalPos`, `termInsetPos`: fallback 用 terminal 位置 — 維持
- `drawLine`, `drawArrow`, `drawCurvedLine`, `drawCurvedArrowCP`: 描画プリミティブ — 維持
- `computeBounds`, `setupCanvas`, `bpos`: 座標変換 — 維持
- `drawNormal`: block 枠・terminal マーカー・subgrid セル描画ループ・junction ドット・nx/ny port 描画・directed モード — **すべて維持**。subgrid の中身が Lee 由来に変わるだけで、既存のセル描画ループ (line 868–902) はそのまま動く。
- 入力 textarea、プリセット (`normal:`, `yside:` 等)、UI 要素 — 維持

### ファイル 2: `lee/index_adapter.js` (新規作成)

index.html から使いやすくするためのラッパー。lee/ 本体には一切手を入れない。

#### 関数 1: `buildBlockSubgrid(ports, nterm, cellSize) → { termPos, subgrid, nR, nC, junctions, routes, spines, overlaps }`

- **旧仕様**: 存在しない。
- **新仕様**:
  1. `ports` (index.html の maze.normal と同形式: `{src: {dir, idx}, dst: {dir, idx}}[]`) から:
     - 各 terminal {W,E,S,N}i ごとの subterminal 数 `nsubterminal{W,E,S,N}[t]` を集計
     - diagonal.md 式でグリッドサイズ計算:
       - `H = Σ_t max(nsubterminal.W[t], nsubterminal.E[t]) + 2`
       - `W = Σ_t max(nsubterminal.S[t], nsubterminal.N[t]) + 2`
  2. subterminal を grid 外周に配置 (diagonal.md 44–50 行のルール):
     - Wt-s, Et-s を (0,y), (W-1,y) に y=0→H-1 で配置 (同じ y)
     - St-s, Nt-s を (x,0), (x,H-1) に x=0→W-1 で配置 (同じ x)
  3. `Tin`, `P` を構築し `lee_algorithm(Tin, P)` を呼ぶ → `(W', H', T', m')`
  4. **正方形に整形** (diagonal.md §53–57): `W'` と `H'` のうち大きい方を正方形の一辺 `S` とし、
     - `W' < S` の間: `insert_map(m', W'-1, 0, 'col', T')` を繰り返す (新列は `W'-1` と `W'-2` の間、つまり右端列の1つ内側に挿入)
     - `H' < S` の間: `insert_map(m', 0, H'-1, 'row', T')` を繰り返す (新行は `H'-1` と `H'-2` の間、つまり上端行の1つ内側)
     - 挿入のたびに `W'`, `H'` が +1 され、`T'` の座標も `insert_map` の T 引数経由で自動シフト
  5. 結果 `m'` (正方形 subport 行列) を drawNormal 用 `subgrid[r][c]` に変換 (Lee は m[x][y], subgrid は [row][col] = [y][x])
  6. `termPos[terminal_key]`: 各 terminal の **block 辺上の位置** (block 内ローカル座標、cellSize スケール) を返す。
     - drawNormal の `statePos` が E/N の位置決定に使用 (既存 index.html:804–821 の挙動を継続)
     - **nx/ny port の描画との整合性**: nx port (x=0 の block) および ny port (y=0 の block) は、隣接する normal block の W/E/N/S terminal 位置にラインを延ばす。これら nx/ny ラインの端点は `gridTermPos['W'+i]` 等を経由して決まるため、adapter が返す termPos が正確な subterminal 位置でないと block 間で線が途切れて見える。
     - 同一 terminal に複数 subterminal がある場合 (Wt-0, Wt-1, ...) は、**block 辺上の中間位置** (または diagonal.md §58–75 の branch subport の入口) を termPos に記録し、内側の branch 線に合流させる。
  7. branch subport を計算 (diagonal.md 58–75 行): 各 subterminal 位置の `connect[D]` を調べ、`sum(connect)>2` なら `junctions` に追加。
  8. `routes`/`spines`/`overlaps` は空配列。

#### 関数 2: (必要ならヘルパー関数を複数に分割) — 上記 buildBlockSubgrid の内部実装補助

### ファイル 3: (読み込み順を追加するだけ) `index.html` の `<head>` / `<body>` 末尾

- 現在: `<script>` タグは index.html 内インラインのみ
- 新仕様: 先に lee/ モジュールを読み込んでから index.html 本体スクリプトを評価:
  ```html
  <script src="lee/prng.js"></script>
  <script src="lee/draw_map.js"></script>             <!-- 使わないが依存の可能性 -->
  <script src="lee/check_equivalence.js"></script>
  <script src="lee/insert_map.js"></script>
  <script src="lee/lee_algorithm.js"></script>
  <script src="lee/index_adapter.js"></script>
  <script> /* 既存の index.html 本体 */ </script>
  ```

## 非対象 (今回変更しないもの)
- nx/ny port の描画ロジック (既存のまま)
- block 枠 (gray `#bbb`) の描画
- terminal ラベル (W0, E1 など) の表示
- 座標系 (block 数学座標 / subgrid top-down / bpos 変換) の変更
- 入力フォーマット
- バンドラ導入
- `lee/*.js`, `lee/*.html`, `lee/*-spec.md` への変更
- 描画色・線太さ・ダークモードの index.html 側適用

## 検証手順
1. ブラウザで `index.html` を開く
2. 3 つのプリセット `normal:`, `yside:` ... すべてで描画確認
3. カスタム入力でも異常が出ないこと
4. directed モードが従来通りに矢印表示されること
5. 既存の `lee/` テスト (`node lee/test-*-node.js`) が引き続き PASS することを確認
6. **既存の `epic/4/test/test-v2.js` が 1017/1017 PASS することを確認** (回帰テスト):
   - このテストは `index.html` から `routeBlockPorts` を eval で取り出し、各 port について subgrid BFS で src→dst 到達性を検証する
   - 併せて termPos の W/E 行揃え・N/S 列揃え (`checkAlignment`) も検証
   - `routeBlockPorts` 戻り値の互換 (subgrid, nR, nC, termPos) を plan.md で保持しているので、テスト自体はそのまま動く
   - PASS しない場合は adapter の terminal 配置 (diagonal.md §44–50) か Lee 呼び出し結果の subgrid 変換に問題があるので原因特定・修正
