[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# nd-to-2d — n レジスタ → 2 レジスタ Gödel 数化コンパイラ

`nd-to-2d.py` は、*n* レジスタ版 Minsky 風 Haskell ステートマシンを
**2 レジスタの Gödel 数化版** Haskell に変換するツール。出力は
`hs2maze.py` でそのまま迷路化できる形式。

2 レジスタ版では全 *n* 個のレジスタを 1 つの Gödel 数

> *x* = p<sub>0</sub><sup>r<sub>0</sub></sup> · p<sub>1</sub><sup>r<sub>1</sub></sup> · ⋯ · p<sub>n−1</sub><sup>r<sub>n−1</sub></sup>

に畳み込む。*p*<sub>0</sub> = 2, *p*<sub>1</sub> = 3, … は最初の *n* 個の
素数。もう 1 つのレジスタ *y* は掛け算・割り算・可除性テストの
サブルーチン用の作業領域。

## パイプライン

```
(n レジスタ Haskell)
   │  nd-to-2d.py
   ▼
(2 レジスタ Haskell)
   │  hs2maze.py
   ▼
(一様 normal + nx + ny 迷路)
```

## 進捗

- [x] **Part 1 — パーサ**: *n* レジスタ Haskell を読み、ルールを AST
      として露出。`python3 nd-to-2d.py input.hs --parse` でパース結果を
      表示。
- [x] **Part 2 — コンパイラ**: 2 レジスタ Gödel 数化された Haskell
      を標準出力に、必要な nx / ny / bridge ポート一覧をヘッダコメント
      に出力。`python3 nd-to-2d.py input.hs > output_godel.hs` で実行。

## 入力文法

```haskell
FN :: (Int, Int, ..., Int) -> (Int, Int, ..., Int)
FN (pat_0, pat_1, ..., pat_{n-1}, pat_pc) = FN  (rhs_0, ..., rhs_{n-1}, rhs_pc)
FN (...)                                  = (...)     -- HALT (FN prefix なし)
```

LHS スロットパターン:

| パターン | 意味 |
|---|---|
| `var` | 識別子。任意値を捕捉 |
| `_` | ワイルドカード |
| `0` | ゼロテスト (このレジスタが 0 であること) |
| `k` (整数) | 厳密リテラルテスト (通常使わない) |

RHS スロット式:

| 式 | 意味 |
|---|---|
| `var` | 変化なし |
| `var + k` | +k |
| `var - k` | −k |
| `k` (整数) | 絶対代入 *r<sub>i</sub> := k* |

PC スロットは LHS / RHS 共に整数リテラル必須。

## 実行例

```bash
# パーサのみのダンプ
python3 nd-to-2d.py examples/cp_n3.hs --parse

# Gödel 数化された 2 レジスタ Haskell にコンパイル
python3 nd-to-2d.py examples/cp_n3.hs > cp_n3_godel.hs

# hs2maze に通して normal ポート列を取得
python3 ../hs2maze.py cp_n3_godel.hs > cp_n3.maze
```

3 レジスタ *n*³ counter pump (`examples/cp_n3.hs`、15 ルール) では、
パイプラインは以下を出力する:

| ステージ | サイズ |
|---|---|
| `cp_n3.hs` | 15 ルール |
| `cp_n3_godel.hs` | 210 pc、main 211 + nx 34 + ny 25 方程式 |
| `cp_n3.maze` | 403 ポート (normal 344 + nx 34 + ny 25)、nterm = 254 |

2 レジスタ Haskell の zero-branch ルール (`(0, y, pc) = ...` と
`(x, 0, pc) = ...`) は拡張された `hs2maze.py` が自動的に認識し、
対応する nx / ny ポートとブリッジに変換する。手動の後処理は不要。

## ディレクトリ構成

- `nd-to-2d.py` — 本体 (現状パーサのみ)
- `examples/cp_n3.hs` — 3 レジスタ *n*³ counter pump。パーサのテスト
  用、かつ Part 2 完成時のコンパイル対象。
