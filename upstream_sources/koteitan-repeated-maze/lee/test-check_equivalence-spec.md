# テスト仕様: check_equivalence(Tin, T)

## テスト対象関数
`check_equivalence(Tin, T)` は、拡大terminalリスト `T` が入力terminalリスト `Tin` と順序等価であるとき `true`、そうでないとき `false` を返す。

判定条件 (`lee/plan.md` §タスク要件「拡大mapの等価性」より):
1. すべてのペア (i, j) について、`Tin[i].x` と `Tin[j].x` の大小関係 (`<`, `=`, `>`) は `T[i].x` と `T[j].x` の大小関係と一致しなければならない。
2. 上記 1. と同じことが `.y` についても成り立たなければならない。
3. すべての i について `Tin[i].dx == T[i].dx`。
4. すべての i について `Tin[i].dy == T[i].dy`。

上記のいずれかが不成立 → `false`。すべて成立 → `true`。

## テストハーネス
- ファイル: `lee/test-check_equivalence.html`
- 読み込むJS:
  - `lee/check_equivalence.js`
- A-RANDOM セクションで使うシフト専用ユーティリティはテストハーネス内にインラインで定義する (下記参照)。**`insert_map.js` は依存しない** — check_equivalence を単体で検証し、他モジュールの正しさから切り離すため。
- 以下のすべてのケースを実行し、合否を表形式で描画する。
- 各ケースは以下を持つ: `name`, `Tin`, `T`, `expected` (boolean)、任意で `reason`。
- `check_equivalence(Tin, T) === expected` のときテスト合格。

### インライン ユーティリティ (ハーネス内に実装)
```js
// terminal を k 以降のみシフトする「空行/空列挿入」のみの操作。
// subport は扱わない — check_equivalence のテストでは terminal だけで十分。
function shift_terminals(T, k, dir) {
  // dir: 'col' → x >= k の T[i].x に +1
  // dir: 'row' → y >= k の T[i].y に +1
  for (const t of T) {
    if (dir === 'col' && t.x >= k) t.x += 1;
    if (dir === 'row' && t.y >= k) t.y += 1;
  }
}
```

## テストケース

### A. 正例ケース (expected = true)

| # | 名前 | 説明 |
|---|------|------|
| A1 | empty | `Tin = []`, `T = []` → true (空なので真)。 |
| A2 | single-identical | 1つのterminalが Tin と T で x, y, dx, dy すべて同一。 |
| A3 | identity-three | 3つのterminalが Tin と T で同一。 |
| A4 | translation | T は Tin を (+5, +3) 平行移動したもの。相対順序は保存される。 |
| A5 | uniform-scale | T は Tin の x, y を 2 倍したもの (正のスケール)。 |
| A6 | non-uniform-stretch | T は x 方向の間隔のみ拡大 (例: `x: 0,1,2` → `0,3,7`)。大小関係は保存。 |
| A7 | preserved-ties | 2つのterminalが Tin で同じ x を共有し、T でも同じ x を共有する (x の値自体は変わってもよい)。 |
| A8 | preserved-ties-y | A7 の y 版。 |
| A9 | all-four-dirs | 4つのterminalの dx, dy が {(1,0), (-1,0), (0,1), (0,-1)} を網羅し、T でも変わらない。 |

### A-RANDOM. シフトベースの正例ケース (expected = true)

**背景**: 「空の行/列を位置 k に挿入する」という操作は、terminal 座標に対しては「k 以上のものを +1 シフトする」だけに等しい。この操作は terminal 間の相対的 x/y 大小関係 (`<`, `=`, `>`) と dx, dy を保存するため、`check_equivalence(Tin, T)` は必ず `true` を返さなければならない。subport の連結処理は check_equivalence のテストには不要なので、ここでは **`insert_map` に依存せず**、ハーネス内の `shift_terminals` ユーティリティだけを使う。これにより check_equivalence を単体で検証できる。

#### 決定論的ケース (再現性のため必須)

| # | 名前 | Tin | シフト操作列 (`shift_terminals(T, k, dir)`) | 期待 T | 期待 |
|---|------|-----|---------------------------------------------|--------|------|
| AR1 | col-shift-before | `[{x:1,y:1,dx:1,dy:0}, {x:3,y:2,dx:-1,dy:0}]` | `(T, 0, 'col')` (k=0, 全terminalより手前) | `[{x:2,y:1,...}, {x:4,y:2,...}]` | true |
| AR2 | col-shift-between | 同上 | `(T, 2, 'col')` (k=2, Tin[0].x=1 と Tin[1].x=3 の間) | `[{x:1,...}, {x:4,...}]` | true |
| AR3 | col-shift-after-all | 同上 | `(T, 5, 'col')` (k=5, 全terminalより奥) | `[{x:1,...}, {x:3,...}]` (シフト無し) | true |
| AR4 | row-shift-at-tie | `[{x:1,y:2,dx:0,dy:1}, {x:3,y:2,dx:0,dy:-1}]` (y=2 で tie) | `(T, 2, 'row')` (k=2, 両terminalの y==k なのでどちらも +1) | `[{x:1,y:3,...}, {x:3,y:3,...}]` (tie 保存) | true |
| AR5 | mixed-col-then-row | `[{x:0,y:0,dx:1,dy:0}, {x:2,y:2,dx:-1,dy:-1}, {x:4,y:4,dx:0,dy:1}]` | `(T, 1, 'col')` → `(T, 3, 'row')` | `[{x:0,y:0,...}, {x:3,y:2,...}, {x:5,y:5,...}]` | true |
| AR6 | shift-at-each-boundary | `[{x:0,y:0,dx:1,dy:0}, {x:5,y:5,dx:-1,dy:-1}]` | `(T, 0, 'col')` → `(T, 7, 'col')` → `(T, 0, 'row')` → `(T, 7, 'row')` を順に適用 | 最終 T を計算 | true |
| AR7 | many-terminals-several-shifts | 5つの terminal (一部 x または y tie を含む) | 決定論的な col/row 混合 3 回シフト (固定パラメータ) | — | true |

#### ランダムケース (カバレッジ拡張)

| # | 名前 | 手順 | 反復数 | 期待 |
|---|------|------|--------|------|
| AR-R | random-shifts | (1) **N = 3〜10** 個の terminal をランダム座標 (`x,y ∈ [0..10)`) と dx,dy (上下左右4方向のいずれか、 &#124;dx&#124;+&#124;dy&#124;=1) で生成し `Tin` とする。tie 発生を許容。(2) `T = deep copy of Tin`。(3) **K = 3〜10** 回、`shift_terminals(T, k, dir)` を適用する (k はランダム整数、現在の座標範囲内、dir はランダムに 'col'/'row' を選ぶ)。(4) `check_equivalence(Tin, T) === true` を検証。 | **20 反復** | すべて true (20/20) |

FAIL 時は Tin, シフト操作列, シード相当のパラメータをログに出し coder に報告。

### B. 負例ケース (expected = false)

| # | 名前 | 不一致理由 |
|---|------|-----------|
| B1 | swapped-x | `Tin[0].x < Tin[1].x` だが `T[0].x > T[1].x`。 |
| B2 | swapped-y | `Tin[0].y < Tin[1].y` だが `T[0].y > T[1].y`。 |
| B3 | equal-became-different-x | `Tin[0].x == Tin[1].x` だが `T[0].x != T[1].x`。 |
| B4 | equal-became-different-y | `Tin[0].y == Tin[1].y` だが `T[0].y != T[1].y`。 |
| B5 | different-became-equal-x | `Tin[0].x != Tin[1].x` だが `T[0].x == T[1].x`。 |
| B6 | different-became-equal-y | `Tin[0].y != Tin[1].y` だが `T[0].y == T[1].y`。 |
| B7 | dx-flipped | Tin[0].dx = 1, T[0].dx = -1。 |
| B8 | dy-flipped | Tin[0].dy = 1, T[0].dy = -1。 |
| B9 | dx-zeroed | Tin[0].dx = 1, T[0].dx = 0。 |
| B10 | dy-zeroed | Tin[0].dy = 1, T[0].dy = 0。 |
| B11 | three-term-partial-swap | 3つのterminalのうち、後ろ2つだけ x 順序が入れ替わる。 |
| B12 | order-broken-middle | 4つのterminal、Tin では x が狭義単調増加だが、T で中間の1ペアが入れ替わる。 |

### B-RANDOM. シフト後に順序を壊した負例ケース (expected = false)

**背景**: A-RANDOM の正例生成手順で得られた `(Tin, T)` は順序等価なので `check_equivalence` は true を返す。ここで T の 2 つの異なる x 値 (または異なる y 値) を持つ terminal のペアを選び、その x (または y) だけを交換すると、x (または y) の大小関係が崩れて等価性が破れる。したがって `check_equivalence(Tin, T) === false` が期待される。dx, dy およびその他の座標は触らないため、失敗は必ず条件 (1) または (2) によるもので原因が一意に特定できる。

#### 決定論的ケース (再現性のため必須)

| # | 名前 | Tin | 手順 | 期待 T | 期待 |
|---|------|-----|------|--------|------|
| BR1 | swap-x-head-tail | `[{x:0,y:0,dx:1,dy:0}, {x:2,y:1,dx:-1,dy:0}, {x:4,y:2,dx:0,dy:1}]` (T = deep copy) | T[0].x と T[2].x を交換 (0 ↔ 4) | `[{x:4,...},{x:2,...},{x:0,...}]` | false |
| BR2 | swap-x-after-col-shift | 同 Tin | `shift_terminals(T, 1, 'col')` → T[0].x と T[1].x を交換 | シフト後 T=`[{x:0},{x:3},{x:5}]`、交換後 `[{x:3},{x:0},{x:5}]` | false |
| BR3 | swap-y-head-tail | `[{x:0,y:1,dx:0,dy:1},{x:1,y:3,dx:-1,dy:0},{x:2,y:5,dx:0,dy:-1}]` | T[0].y と T[2].y を交換 (1 ↔ 5) | `[{y:5,...},{y:3,...},{y:1,...}]` | false |

#### ランダムケース

| # | 名前 | 手順 | 反復数 | 期待 |
|---|------|------|--------|------|
| BR-R | random-x-swap | A-RANDOM AR-R と同じ手順で Tin と T を生成した後、T の中から `T[i].x !== T[j].x` を満たす 2 インデックス `i, j` をランダムに選び、T[i].x と T[j].x を交換する。そのようなペアが見つからない (全 terminal が同じ x) 場合はその反復を再試行する (最大 5 回まで、5 回とも失敗したらその反復はスキップせず、代わりに y-swap にフォールバックしログ出力)。 | **20 反復** | すべて false (20/20) |
| BR-RY | random-y-swap | BR-R の y 版。`T[i].y !== T[j].y` を満たす 2 インデックスの y を交換。 | **20 反復** | すべて false (20/20) |

FAIL 時 (= `check_equivalence` が true を返してしまった場合) は Tin, T, 交換インデックス, シード相当のパラメータをログに出し coder に報告。

### C. エッジケース

| # | 名前 | expected | 備考 |
|---|------|----------|------|
| C1 | length-mismatch | false | `Tin.length != T.length` の場合 false を返すべき (仕様には明記されていないが、防御的な健全性不変量として妥当)。 |
| C2 | single-dx-changed | false | 1つのterminal、dx のみが異なる。 |
| C3 | single-dy-changed | false | 1つのterminal、dy のみが異なる。 |

## 具体的なフィクスチャ例

```js
// A2
Tin = [{x:0, y:0, dx:1, dy:0}];
T   = [{x:0, y:0, dx:1, dy:0}]; // expected true

// A4 translation
Tin = [{x:0,y:0,dx:1,dy:0}, {x:2,y:1,dx:-1,dy:0}];
T   = [{x:5,y:3,dx:1,dy:0}, {x:7,y:4,dx:-1,dy:0}]; // expected true

// A7 preserved ties
Tin = [{x:1,y:0,dx:0,dy:1}, {x:1,y:3,dx:0,dy:-1}];
T   = [{x:5,y:0,dx:0,dy:1}, {x:5,y:7,dx:0,dy:-1}]; // expected true

// B1 swapped x
Tin = [{x:0,y:0,dx:1,dy:0}, {x:2,y:0,dx:-1,dy:0}];
T   = [{x:5,y:0,dx:1,dy:0}, {x:3,y:0,dx:-1,dy:0}]; // expected false

// B3 equal-became-different-x
Tin = [{x:1,y:0,dx:0,dy:1}, {x:1,y:2,dx:0,dy:-1}];
T   = [{x:1,y:0,dx:0,dy:1}, {x:2,y:2,dx:0,dy:-1}]; // expected false

// B7 dx-flipped
Tin = [{x:0,y:0,dx:1,dy:0}];
T   = [{x:0,y:0,dx:-1,dy:0}]; // expected false

// AR2 col-shift-between (uses inline shift_terminals, NO insert_map)
const Tin_AR2 = [{x:1,y:1,dx:1,dy:0}, {x:3,y:2,dx:-1,dy:0}];
const T_AR2   = Tin_AR2.map(t => ({...t}));
shift_terminals(T_AR2, 2, 'col');
// T_AR2 is now [{x:1,y:1,...}, {x:4,y:2,...}] -- expected true
// check_equivalence(Tin_AR2, T_AR2) === true
```

## 合格基準
- A, A-RANDOM (決定論的 AR1–AR7), B, B-RANDOM (決定論的 BR1–BR3), C すべての決定論的ケースが期待結果と一致しなければならない。
- A-RANDOM の AR-R は 20 反復すべて true (20/20)。
- B-RANDOM の BR-R は 20 反復すべて false (20/20)。
- B-RANDOM の BR-RY は 20 反復すべて false (20/20)。
- 1件でも不一致があれば、testerは詳細 (Tin, T, シフト/交換パラメータ, 期待値, 実値) を coder に報告する (testerは本番コードを編集しない)。

## 描画
`lee/test-check_equivalence.html` は次の表を描画する:

| case | expected | actual | result (PASS/FAIL) | note |

最終行に "X/Y PASS" というサマリ行を出す。
