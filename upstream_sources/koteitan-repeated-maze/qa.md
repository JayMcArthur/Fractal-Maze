# QA (index.html を Lee アルゴリズムで書き換える件)

diagonal.md で定義された手順で index.html の maze 描画を書き直すにあたって、確認したい点を下記に並べます。ユーザーは各項目の「→ 回答:」欄に回答を書き足してください。

---

## Q1. 既存の v2.4 実装との関係

現在の `index.html` (1303 行) は **v2.4 の 9-area / subgrid** 方式で実装されています (`routeBlockPorts`, subgrid 2D配列など)。diagonal.md の新方式に切り替えるとき:

- (A) v2.4 実装を **全削除**して新規書き直し (クリーンスレート)
- (B) 既存描画と **並行運用** (モード切替 UI を追加)
- (C) その他

→ 回答:A

---

## Q2. lee/ ディレクトリの読み込み方

`lee/*.js` (lee_algorithm, insert_map, draw_map, etc.) を index.html から使う際:

- (A) `<script src="lee/lee_algorithm.js">` など個別に読み込む
- (B) `<script type="module">` で ES import
- (C) lee/ の内容を index.html 内にインライン化
- (D) index.html 側から使いやすい wrapper (例: `lee/index_adapter.js`) を tester に作ってもらう

→ 回答: B. 読み込みやすいように書き換えたりwrapperを作ってもOK.lee/は単体でメンテナンスしやすい形で残すのが理想(過去のテストコードが通るように保つ)

---

## Q3. 座標系

- diagonal.md: 左下原点、東=+x、北=+y (数学座標)
- 現在 index.html: 左上原点 (canvas 標準、+y=下)
- lee/ モジュール: 左上原点で実装されている模様 (m[x][y] で y は下向きインデックス)

どちらに統一しますか?

- (A) 数学座標 (左下原点) に合わせて lee/ 側または index.html 側で反転変換
- (B) canvas 座標 (左上原点) のまま、diagonal.md の記述は論理的なものとして読み替え
- (C) 上下反転するのは表示直前の canvas 描画関数だけ (内部データは数学座標)

→ 回答: 現在 Answer につかう (x,y,terminal) の表記などブロックの座標(x,y)は数学座標になっているはず。canvas 標準であるという認識がおかしいと思う。現在内部がどうなっているかをまず教えて。

→ manager 回答: 確認しました。ご認識通り、**block 座標 (bx, by) は数学座標 (左下原点)** です。index.html:745 の `bpos(bx, by) = {x: MARGIN + (bx - minX) * CELL, y: MARGIN + (maxY - by) * CELL}` で canvas 座標へ変換しています (by が大きいほど canvas y が小さい = 画面上部)。`block 内の subgrid` (subgrid[r][c]) は r=上から何番目の行、c=左から何番目の列、で canvas 標準 (top-down row index) です。したがって:

- block 座標: 数学座標
- 1 block 内の subgrid: 行 r が上から (canvas 流)
- canvas 座標: 上下反転は bpos が担当

新しい Lee 経由の実装でも **この内部座標規約は変更しません**。Lee の `m[x][y]` (top-left index) をそのまま subgrid に流し込めば、既存 drawNormal が処理できる見込みです。

---

## Q4. block とその枠の描画

diagonal.md は「block (x,y) の外周に terminal がある」と述べています。block 自体の枠線 (正方形の outline) は描画しますか?

- (A) block 枠を薄いグレーで描画
- (B) block 枠は描画せず、terminal と subport だけ描画
- (C) v2.4 相当のデザインを踏襲 (block 背景に薄色、枠あり、terminal マーカーあり)

→ 回答:それは今まで通りの描画を保つ。grayで描画されている。

---

## Q5. grid サイズ式の確認

diagonal.md 39–40 行:

- `H = sum_t max(nsubterminal{W,E}[t]) + 2`
- `W = sum_t max(nsubterminal{S,N}[t]) + 2`

ここで:
- `max(nsubterminal{W,E}[t])` = t 番目の terminal における W 側と E 側の subterminal 数の最大値、の意味で合っていますか?
- `sum_t` = 全 block t についての和、という理解で合っていますか? それとも t は terminal index で、1 block 内の合計?
- `+2` は上下 (あるいは左右) に余白 1 マスずつ、という意味ですか?

→ 回答: tはterminal. sum_t f(t) は sum_t f(t)=f(0)+f(1)+...


---

## Q6. 複数 block の扱い

maze は block が無限に広がる空間です。block (x,y) ごとに独立して Lee を走らせる? それとも全 block を繋げた巨大 grid で Lee を 1 回走らせる?

- (A) block ごとに Lee (内部の port だけを通す)
- (B) 全体統合 grid で Lee (cross-block port も同時解決)
- (C) まず block ごとに独立、後で接続する後処理

→ 回答: normal block は全て同じ形をしている。Lee アルゴリズムを１回だけ回して normal block を１パターン作って、それを全てに描画する。nx/ny port は今まで通り。

---

## Q7. normal / nx / ny port の扱い

diagonal.md は normal/nxport/nyport を区別しています。Lee アルゴリズム上では単一の port 集合として扱いますが、描画時に区別して表示する必要がありますか?

- (A) 3 種類を色分け (例: normal=黒、nx=青、ny=緑)
- (B) 種類関係なく同色で描画
- (C) nx/ny は block 位置 (x=0 or y=0) で自動識別されるのでコード上区別、描画上は同色

→ 回答: Lee アルゴリズムは normal port の描画方法を決めるためのもの。nx/ny port は今まで通り描画する。Lee アルゴリズムは normal port のみを対象とする。色も今まで通り全て黒。

---

## Q8. branch subport の「中黒の円」

diagonal.md 57 行: `sum(connect)>2 ならば、中央に中黒の円を描画する`。この円のサイズ・色・スタイルは?

- (A) subport 線と同色の小さな塗りつぶし円 (半径 = セル幅の 15% 程度)
- (B) 別色で強調
- (C) 具体仕様あり (→ 記入してください)

→ 回答:今まで通り黒色の円。

---

## Q9. 入力 UI

現在の index.html には maze / path 入力 textarea (3 つのプリセット + カスタム) があります:
- `normal:` block 内 port
- `yside:` など

この入力形式を diagonal.md の block(x,y) + {W,E,S,N}i 表記と揃えますか? 既存形式で連携 (内部変換) しますか?

- (A) diagonal.md に合わせた新フォーマット (例: `(2,3) W0-E1, (2,3) N0-S0`)
- (B) 既存フォーマットを継続、内部で diagonal.md モデルに変換
- (C) 両対応

→ 回答: diagonal.md は１つの normal block の中の sub block の描画方法を定義している。入力UIとは関係ない。入力UIはそのまま。

---

## Q10. ブラウザ単独で動くか

index.html を直接開いて動作確認する方針 (plan.md の lee/ と同じ) ですか? それとも require / module bundler を使いますか?

- (A) ブラウザで直接開いて動く (相対 script 読み込みのみ、バンドラなし)
- (B) バンドラ経由

→ 回答: 今まで通りの index.html の仕様を変えない。

---

## Q11. その他 / 補足

他に仕様で曖昧な点があれば教えてください:

→ 回答: 質問を読んでいると全体的に index.html をいろいろ変えようと考えているように思えるが、
大部分の仕様はそのまま残して、normal port のなかの配線の描画の部分のみをこの diagonal.md を使った
書き方に変えたいだけ。
維持してほしい所が維持されるか不安になってきたので、
今回修正するファイルと関数がどこまでに留まるか、修正範囲を確認したい。
- ファイル1:
  - 関数1:
    - 旧仕様: ....
    - 新仕様: ....
  - 関数2:
    - 旧仕様: ....
    - 新仕様: ....
- ファイル2:
 ...

のような形式でプランを plan.md に書いて。



