# テスト仕様: insert_map(m, x, y, dir)

## テスト対象関数
`insert_map(m, x, y, dir)` は、subport行列 `m` の座標 `(x, y)` に `dir` ('col' または 'row') で空の列または行を1本挿入し、挿入後の行列を返す。

要件 (`lee/plan.md` insert_map セクション):
- 挿入位置を跨いで subport が連続していた場合、挿入された行/列に「接続を保つための適切な subport」が配置されなければならない。
  - 例: 水平 '-' の subport が x=5 にまたがって連続しているところに `dir='col', x=5` で列挿入した場合、挿入列の該当 y 位置にも '-' を入れて接続を延ばす。
  - 垂直 '|' 行挿入も同様。
- 挿入後、terminal の論理的な相対順序 (x/y 大小関係と dx/dy) は保たれ、`check_equivalence(Tin, T)` が `true` を返す。

## テストハーネス
- ファイル: `lee/insert-map.html`
- 読み込むJS:
  - `lee/draw_map.js`
  - `lee/random_route_gen.js`
  - `lee/insert_map.js`
  - `lee/check_equivalence.js`
- 操作:
  - ボタン「Run Random Insertion Test」押下で下記アルゴリズム (§ランダム挿入テスト) を N 回実行。
  - 1反復ごとに結果行 (PASS/FAIL、挿入座標、期待値、実値) を表に追加。
  - canvas 2枚を並べて描画: 左=挿入前の map、右=挿入後の map。
  - 最終サマリ行に "X/Y PASS" を表示。

## ランダム挿入テスト手順
plan.md §insert_map テスト仕様 (行146「sとtの間にランダムに10行の挿入と10列の挿入を行う。」) に従う。

1. **初期化**: 幅 `W`, 高さ `H` の空 map を生成する (`random_route_gen` の初期状態相当)。
2. **経路生成**: 1つの terminal を開始点 `s` とし、ランダムに上下左右へ subport を伸ばす。行き詰まったらその先端を終点 terminal `t` にする。`s`, `t` の `dx`, `dy` は接続された subport の方向に設定する。ただし subport が2本以上生成されなかった場合はその反復を失敗として捨て、再試行する。
3. **挿入前 Tin の確定**: `Tin = [s, t]` を記録。`m` の初期状態 `m0` も保存。
4. **インタリーブ挿入 (1行+1列 を 10 セット、合計 20 回)**: s と t の間にランダムな行と列を「row → col → row → col → ... 」の順で交互に挿入する (ユーザー確認済 Q4)。各セット (i = 1..10) は以下を順に実行:
   - **行挿入**: `yr` を現在の `T` における `min(s.y, t.y) ≤ yr ≤ max(s.y, t.y)` の範囲からランダムに選ぶ (s.y == t.y の場合は `s.y + 1`)。`m = insert_map(m, 0, yr, 'row', T)` を実行。`T` は in-place で `y >= yr` の要素が +1 シフトされる (5 引数シグネチャ)。
   - **列挿入**: `xr` を現在の `T` における `min(s.x, t.x) ≤ xr ≤ max(s.x, t.x)` の範囲からランダムに選ぶ (s.x == t.x の場合は `s.x + 1`)。`m = insert_map(m, xr, 0, 'col', T)` を実行。
   - 中間状態を検証用に保存 (ハーネスでサンプリング描画)。
5. **最終 T の確定**: すべての挿入後の `T = [s', t']` を確定する (これは `insert_map` の第5引数でシフト済み)。
6. **検証** (すべての挿入が完了した時点で 1 反復あたり 1 回評価):
   - **E1 等価性**: `check_equivalence(Tin, T) === true`。
   - **E2 到達性**: s' から t' へ挿入後の subport 行列 `m` 上で BFS 可能 (既存 subport の方向を尊重する通常の通行ルール)。
   - **E3 terminal 出発方向保存**: `T[i].dx == Tin[i].dx`, `T[i].dy == Tin[i].dy`。
   - **E4 境界整合**: 最終 `m` の幅が `m0` の幅より **+10 (列挿入分)**、高さが **+10 (行挿入分)** 増えている。

## テスト規模 (ユーザー確認済)
- map サイズ: **W=10, H=10** (ユーザー確認済 Q2-1)
- 1反復あたりの挿入回数: **(1行+1列) × 10 セット = 20 回、インタリーブ (row→col→row→col→...)** (ユーザー確認済 Q2-2 / Q4、plan.md 146 行目)
- 反復回数 (セッション): **N=10** (1反復ごとに 20 回挿入 → 合計 200 回の insert_map 呼び出し)
- 乱数シード: 固定なし (描画用途のため再現性は不要)。ただし FAIL ケースは seed 相当のパラメータをログに残す。

## 決定論的ケース (回帰用、サンプリングだけだと漏れるため必ず含める)

### D1–D4: 全 subport 隣接組合せ (9 × 4 × 9 = 324 ケース) [ユーザー確認済 Q2-3-fup]

**9 種類の subport**: `' '` (空), `'|'`, `'-'`, `'┼'`, `'┌'`, `'┐'`, `'└'`, `'┘'`, `'T'`

**4 パターンの隣接** (subport1 を基準に subport2 の位置):
- **D1 (ABOVE)**: subport2 が subport1 の上 → 二者の間の行に `row` 挿入
- **D2 (BELOW)**: subport2 が subport1 の下 → 二者の間の行に `row` 挿入
- **D3 (LEFT)**: subport2 が subport1 の左 → 二者の間の列に `col` 挿入
- **D4 (RIGHT)**: subport2 が subport1 の右 → 二者の間の列に `col` 挿入

これら 4 パターン × 9 × 9 = **324 ケース** を網羅する。

#### subport の接続辺の定義

各 subport 文字が持つ接続辺 (L=左, R=右, U=上, D=下):

| char | sides |
|------|-------|
| `' '` | (なし) |
| `'-'`  | L, R |
| `'|'`  | U, D |
| `'┼'` | L, R, U, D |
| `'┌'` | R, D |
| `'┐'` | L, D |
| `'└'` | R, U |
| `'┘'` | L, U |
| `'T'`  | terminal の `dx, dy` から決まる (dx=-1→L, dx=1→R, dy=-1→U, dy=1→D)。1 方向のみ。 |

#### `'T'` セルの取り扱い

`'T'` をテストするときは、その terminal の `dx, dy` を「seam 側」に向ける。すなわち:
- D1 (subport2 が subport1 の上): subport1 が T なら `dy=-1` (上向き); subport2 が T なら `dy=1` (下向き、seam は自分の下)
- D2 (下): subport1 が T なら `dy=1`; subport2 が T なら `dy=-1`
- D3 (左): subport1 が T なら `dx=-1`; subport2 が T なら `dx=1`
- D4 (右): subport1 が T なら `dx=1`; subport2 が T なら `dx=-1`

これにより T は「seam 方向に接続を持つ」として扱われ、seam 側の接続があるかのテストに還元される。

#### seam セルの期待値ルール

隣接する 2 セル subport1, subport2 を分離する挿入を行ったとき、新しい seam セルの期待値は:

- **縦方向の隣接 (D1 / D2, row 挿入)**:
  - subport1 の seam 側辺 と subport2 の seam 側辺 **両方が接続を持つ** → seam セル = `'|'`
  - それ以外 (片方でも接続なし) → seam セル = `' '` (空)
- **横方向の隣接 (D3 / D4, col 挿入)**:
  - subport1 の seam 側辺 と subport2 の seam 側辺 **両方が接続を持つ** → seam セル = `'-'`
  - それ以外 → seam セル = `' '`

**NG の例** (seam に `' '` 以外が入ったら FAIL):
- `'-'` と `'|'` 横隣接 (`'-' | '|'`): `'-'` の R 接続あり、`'|'` の L 接続なし → seam = `' '`
- `'-'` と `'└'` 横隣接 (`'-'` が左, `'└'` が右): `'-'` の R 接続あり、`'└'` の L 接続なし → seam = `' '`
- `'|'` と `'|'` 横隣接: 両方 L / R 接続なし → seam = `' '`
- `' '` と `' '`: 何も接続なし → seam = `' '`

**OK の例** (seam にブリッジ):
- `'-'` と `'-'` 横隣接: seam = `'-'`
- `'-'` と `'┼'` 横隣接: seam = `'-'`
- `'└'` と `'─'` 横隣接 (`'└'` 右側に `'─'`): `'└'` の R あり、`'-'` の L あり → seam = `'-'`
- `'|'` と `'|'` 縦隣接: seam = `'|'`

#### テスト生成と検証アルゴリズム

```js
const subports = [' ', '|', '-', '┼', '┌', '┐', '└', '┘', 'T'];
const SIDES = {
  ' ': '', '-': 'LR', '|': 'UD', '┼': 'LRUD',
  '┌': 'RD', '┐': 'LD', '└': 'RU', '┘': 'LU',
  // 'T' は dx,dy から個別計算
};
const directions = ['ABOVE', 'BELOW', 'LEFT', 'RIGHT'];

function t_sides(dx, dy) {
  if (dx === -1) return 'L';
  if (dx === 1)  return 'R';
  if (dy === -1) return 'U';
  if (dy === 1)  return 'D';
  return '';
}

// 各 324 ケースについて:
// 1. 小さなmap (5x5) を作成し中央に subport1, 指定方向の隣接位置に subport2 を配置。
// 2. T に必要な terminal を登録 (subport1 または subport2 が 'T' の場合)。
// 3. 方向に応じた位置に行または列を挿入 (insert_map(m, x, y, dir, T))。
// 4. seam セルが期待値 (ルール通り) と一致するか確認。
// 5. map サイズが +1 シフトされているか確認。
// 6. terminal 座標が正しくシフトされているか確認。
```

例 (D4 = RIGHT, subport1=`'-'`, subport2=`'|'`):
- 初期 `m[2][2]='-'`, `m[3][2]='|'`
- `insert_map(m, 3, 0, 'col')` → seam セル `(3, 2)` は `' '` であるべき (`-` の R あり、`|` の L なし)
- 期待: `newM[3][2] === ' '`

合格: **324 ケース中 324 PASS** (100%)。1 件でも不一致 → FAIL 詳細 (subport1, subport2, direction, 実際の seam 値, 期待値) を coder に報告。

### D5–D7: その他の回帰ケース

| # | 名前 | 初期配置 | 挿入 | 期待 |
|---|------|----------|------|------|
| D5 | no-subport-insert | すべて空の map。terminal 2 個のみ。 | 任意の挿入 | 新列/行は空のまま。terminal 座標のみシフト。 |
| D6 | insert-at-terminal-boundary | terminal が (3,3) にあり、挿入 `(4, 3, 'col')` (terminal の直後)。 | — | terminal 位置は変化せず、新列が空のまま挿入される。`check_equivalence` true。 |
| D7 | insert-row-at-0 | `dir='row', y=0` で先頭行挿入。 | — | すべての terminal の y が +1。空行が先頭に追加。 |

## 合格基準
- ランダム挿入テスト: **N=10 反復すべて PASS** (10/10 = 100%)。1件でも FAIL → tester は詳細 (初期 m, 挿入パラメータ列, 期待, 実値) を coder に報告。
- 決定論的ケース D1–D4: **324/324 PASS** 必須 (9 × 4 × 9 全 subport 隣接組合せ)。
- 決定論的ケース D5–D7: **3/3 PASS** 必須。
- 総計 **327/327 + 10/10 ランダム = 337/337 PASS** 期待。
- 最終サマリで合計 PASS/TOTAL を表示。

## 描画
`lee/insert-map.html`:
- **全 10 反復の before/after ペアを描画する** (ユーザー要望)。各反復につき:
  - 左 canvas: 挿入前の map (`m0`, `Tin`)
  - 右 canvas: 20 回の挿入がすべて完了した後の map (`m`, `T`)
  - 下にその反復の検証結果 (E1–E4) と PASS/FAIL を表示。
- 結果表 (サマリ): | iter# | 挿入回数 (row, col) | W増分 | H増分 | check_equivalence | reachable | result |
- D1–D7 の決定論的ケースは別セクションに表示 (承認待ちのためオプション扱いで描画枠だけ確保)。

## 解決済み

- **Q2-1**: W=10, H=10 (確定)
- **Q2-2 / Q4**: (1 行 + 1 列) × 10 セット、row→col インタリーブ (確定)
- **Q2-3**: D1–D7 採用 (確定)
- **Q2-3-fup**: D1–D4 拡張は「subport1 の {上,下,左,右} に subport2 がある 4 パターン × 9 × 9 = 324 ケース」(確定)
- **Q3**: `insert_map(m, x, y, dir, T)` の 5 引数シグネチャで十分。P 引数の追加は行わない (確定)。現行実装がすでに 5 引数をサポート済。
