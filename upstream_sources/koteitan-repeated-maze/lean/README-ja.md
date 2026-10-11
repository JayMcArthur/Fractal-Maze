[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# 繰り返し迷路の形式証明

4 種類のブロック (normal / nx / ny / zero) からなるパターン繰り返し迷路について、 Lean 4 + Mathlib で証明した結果をまとめる。

## 主定理

**ポート数 $`n`$ 以下の迷路の最短経路長の最大値 $`L(n)`$ は、 どんな計算可能関数でも上から抑えられない。**

```math
\forall f : \mathbb{N} \to \mathbb{N},\quad f \text{ が計算可能} \;\Longrightarrow\; \exists n \in \mathbb{N},\; L(n) > f(n)
```

ここで「計算可能」とは、 チューリング機械で計算できる (必ず停止する) 関数であることをいう。 $`L(n)`$ の定義は以下で与える。 なお、 各 $`n`$ について $`L(n)`$ が有限の値 (最大値) であることも証明に含まれる。

## 定義

### 端子とブロック

端子の辺の集合を $`\Sigma = \{W, E, N, S, C\}`$ とし、 端子を辺と番号の組 $`t = (\sigma, i) \in \Sigma \times \mathbb{N}`$ とする。 $`\sigma = C`$ はブロックの内部、 それ以外はブロックの西 / 東 / 北 / 南の辺上の点である。

ブロックは格子点 $`(x, y) \in \mathbb{N}^2`$ に置かれ、 その種別は位置だけで決まる:

```math
\tau(x, y) =
\begin{cases}
\mathrm{zero} & (x = 0,\ y = 0) \cr
\mathrm{nx} & (x = 0,\ y \geq 1) \cr
\mathrm{ny} & (x \geq 1,\ y = 0) \cr
\mathrm{normal} & (x \geq 1,\ y \geq 1)
\end{cases}
```

### 迷路

迷路 $`M`$ は、 4 種類のブロック種別 $`b`$ それぞれに対するポートの有限列 $`P_b`$ の組である:

```math
M = (P_\mathrm{normal},\ P_\mathrm{nx},\ P_\mathrm{ny},\ P_\mathrm{zero}),\qquad P_b \in \big( (\Sigma \times \mathbb{N}) \times (\Sigma \times \mathbb{N}) \big)^{*}
```

ポート $`(a, b) \in P_{\tau(x, y)}`$ は、 ブロック $`(x, y)`$ の端子 $`a`$ から端子 $`b`$ へ一方向に進める辺を表す。 同じ種別のブロックはすべて同じポートを持つ。

### 迷路の点

ブロック $`(x, y)`$ の東の辺はブロック $`(x+1, y)`$ の西の辺と同じ線であり、 北の辺はブロック $`(x, y+1)`$ の南の辺と同じ線である。 そこで、 ブロック $`(x, y)`$ の端子 $`t`$ が表す迷路上の点 $`\pi_{x,y}(t)`$ を次のように定める:

```math
\begin{aligned}
\pi_{x,y}(C, i) &= c(x, y, i) \cr
\pi_{x,y}(W, i) &= w(x, y, i) \cr
\pi_{x,y}(E, i) &= w(x+1, y, i) \cr
\pi_{x,y}(S, i) &= s(x, y, i) \cr
\pi_{x,y}(N, i) &= s(x, y+1, i)
\end{aligned}
```

$`c, w, s`$ は互いに異なる 3 種類の点の名前で、 引数が等しいときに限り同じ点を表す。

### 1 歩とスタート・ゴール

点 $`u`$ から点 $`v`$ へ 1 歩で進めることを $`u \to_M v`$ と書き、 次で定める:

```math
u \to_M v \;:\Longleftrightarrow\; \exists x, y \in \mathbb{N},\ \exists (a, b) \in P_{\tau(x, y)},\quad \pi_{x,y}(a) = u \;\land\; \pi_{x,y}(b) = v
```

スタートとゴールはブロック $`(0, 0)`$ の西の辺上の 2 点である:

```math
\mathrm{start} = w(0, 0, 0),\qquad \mathrm{goal} = w(0, 0, 1)
```

### 最短経路長

$`\mathrm{start}`$ からちょうど $`k`$ 歩で $`v`$ に着けることを $`\mathrm{Reach}_M(k, v)`$ と書く:

```math
\mathrm{Reach}_M(k, v) \;:\Longleftrightarrow\; \exists v_0, \ldots, v_k,\quad v_0 = \mathrm{start},\ v_k = v,\ \forall j < k,\ v_j \to_M v_{j+1}
```

迷路 $`M`$ が **解ける** とは $`\exists k,\ \mathrm{Reach}_M(k, \mathrm{goal})`$ であることをいい、 そのとき最短経路長を

```math
\mathrm{dist}(M) = \min \{\, k \in \mathbb{N} \mid \mathrm{Reach}_M(k, \mathrm{goal}) \,\}
```

とする (解けないときは $`\mathrm{dist}(M) = 0`$ とする)。

### 迷路の大きさと $`L(n)`$

迷路の大きさ $`|M|`$ は、 4 種類のブロックのポートの本数の合計である:

```math
|M| = |P_\mathrm{normal}| + |P_\mathrm{nx}| + |P_\mathrm{ny}| + |P_\mathrm{zero}|
```

$`L(n)`$ は、 大きさ $`n`$ 以下の解ける迷路の最短経路長の最大値である:

```math
L(n) = \max \{\, \mathrm{dist}(M) \mid |M| \leq n,\ M \text{ は解ける} \,\}
```

端子の番号はいくらでも大きく取れるので、 $`|M| \leq n`$ を満たす迷路は無限個ある。 しかし端子の番号を付け直しても最短経路長は変わらないため、 この集合は有限であり、 最大値が存在する。

## 関連する定理

主定理と同じ証明の中で、 次も示している。

1. **到達判定の決定不能性**: 迷路 $`M`$ を入力として「$`M`$ は解けるか」を判定するアルゴリズムは存在しない。

   $`\neg\, \exists\, \text{アルゴリズム } A,\quad \forall M,\ \big( A(M) = 1 \Longleftrightarrow \exists k,\ \mathrm{Reach}_M(k, \mathrm{goal}) \big)`$

2. **無向版**: ポートを両方向に進めるとした場合 (1 歩を $`u \to_M v \lor v \to_M u`$ とした場合) も、 上の判定不能性と主定理がそのまま成り立つ。

## 証明の流れ

1. Mathlib の停止問題 (プログラムが止まるかは判定できない) から出発する。
2. 決まった 1 台の万能チューリング機械を、 3 カウンター機械、 さらにゲーデル数化で 2 カウンター機械に直す。
3. 2 カウンター機械を、 4 種類のブロックの迷路に直す。 「迷路が解ける ⇔ 機械が止まる」が成り立つ。
4. もし計算可能な $`f`$ で $`L(n) \leq f(n)`$ なら、 「$`f(|M|)`$ 歩以内にゴールに着くか」を調べることで機械が止まるかが判定できてしまい、 停止問題に矛盾する。

## ファイル

| ファイル | 内容 |
|---|---|
| `RepeatedMaze/Basic.lean` | 迷路の定義と、 判定不能性の命題 |
| `RepeatedMaze/GrowthSpec.lean` | $`\mathrm{dist}`$、 $`\lvert M \rvert`$、 $`L(n)`$ の定義と、 主定理の命題 |
| `RepeatedMaze/Growth.lean` | 主定理の証明 |
| `RepeatedMaze/Undecidable.lean` | 判定不能性の証明 |
| `RepeatedMaze/Relabel.lean` | 端子の番号の付け直しと、 $`L(n)`$ の有限性 |
| その他 | カウンター機械、 ゲーデル数化、 迷路への変換など |

証明は `sorry` を含まず、 使う公理は Lean の標準公理 (`propext`、 `Classical.choice`、 `Quot.sound`) だけである。

# 検証方法

## 環境構築

1. Lean のバージョン管理ツール elan を入れる。

   ```sh
   curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh
   ```

   Lean 本体の版 (v4.33.1) は `lean/lean-toolchain` に書いてあり、 次の `lake` を最初に動かしたときに elan が自動で入れる。

2. このリポジトリを取ってきて、 `lean/` に入る。

   ```sh
   git clone https://github.com/koteitan/repeated-maze.git
   cd repeated-maze/lean
   ```

3. Mathlib のビルド済みファイルを取ってくる。 Mathlib をソースからビルドすると何時間もかかるため、 ビルド済みのものを使う。

   ```sh
   lake exe cache get
   ```

## 検証

`lean/` で次を実行する。

```sh
lake build
```

成功すると、 最後に次が出る。 終了コードは 0 である。

```
Build completed successfully (1021 jobs).
```

途中で、 4 つの定理それぞれが使う公理が表示される。 どれも Lean の標準公理 3 つだけであることを確かめる (`sorryAx` が出ていないこと)。

```
'RepeatedMaze.undirected_undecidable' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.directed_undecidable' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.L_not_computably_bounded' depends on axioms: [propext, Classical.choice, Quot.sound]
'RepeatedMaze.UL_not_computably_bounded' depends on axioms: [propext, Classical.choice, Quot.sound]
```

主定理は `RepeatedMaze.L_not_computably_bounded` である。
