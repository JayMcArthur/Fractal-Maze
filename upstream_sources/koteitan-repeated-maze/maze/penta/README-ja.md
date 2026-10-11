[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# penta — ゲーデル数化されたペンテーション迷路

penta.md のペンテーション計算を、 ゲーデル数化を介して 2 レジスタミンスキーマシンに落とし込んだ **均一 4 ブロック種** (normal + nx + ny + zero) の繰り返し迷路を生成するジェネレータ。

## 概要

[ペンテーション迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF) は 23 種類のブロックと位置依存規則を用いて密度を稼いでいる。 本ジェネレータは同じ 2 レジスタゲーデル数化ミンスキーマシン (penta.md §「コインシステムの５次元迷路レジスタマシンのゲーデル数システムを２次元迷路レジスタマシンに…」 由来) を normal/nx/ny/zero の 4 種だけに落とし込み、 すべての normal ブロックが同一のポート配置を持つ **均一な迷路** を生成する。

## ファイル

- `make_penta.py`: Python ジェネレータ。 標準出力に `penta.hs` を出力する。
- `penta.hs`: 生成された Haskell 状態機械 (デフォルト initial_a=1 で約 6000 行、 約 5350 個の pc 値)。

## 使い方

```bash
python3 make_penta.py [initial_a] > penta.hs
python3 ../../tools/hs2maze/hs2maze.py penta.hs > penta.maze
# hs2maze が normal/nx/ny/zero への振り分けを自動で行う (手動編集不要)。
```

`initial_a` は入力 x = 2^initial_a を制御する (pc=0.. に 2^initial_a 個の INC x ルールでセットアップ):
- 0: x = 1、 即 HALT (2∤1 ∧ 5∤1 で Rule 1 が発火)
- 1: x = 2、 結果は 3^2 = 9 (Rule 2 → Rule 1)
- 2: x = 4、 結果は 3^(2↑↑↑2) = 3^(2^16) = 3^65536 (すでに巨大)
- 3 以上: 結果は 3^(2↑↑↑initial_a)

## 迷路の規約

現行の `hs2maze.py` / `solver.py` の規約:
- start = `(0, 0, W, 0)`、 ブリッジ `W0 -> C0` 経由 (Haskell pc = 0)
- goal  = `(0, 0, W, 1)`、 ブリッジ `C1 -> W1` 経由 (Haskell pc = 1, HALT)
- 初期レジスタ (x = 0, y = 0); ブロック (0, 0) は `zero` ブロック

ゼロ分岐ルールは Haskell の first-match パターン (`penta (0, y, pc) = ...` および `penta (x, 0, pc) = ...`) を使う。 `hs2maze.py` は LHS のリテラル `0` を読み取り、 これらのポートをそれぞれ nx/zero または ny/zero に振り分ける。 catch-all ルールは 4 種のブロックすべてに振り分けられる。

## アルゴリズム

penta.md の 14 個の Fractran 形式ルールを first-match 順に適用:

| ルール | 条件 (p∤x) | アクション |
|---|---|---|
| 1 | 2, 5 | HALT |
| 2 | 3, 5, 13 | ×9/2 |
| 3 | 5, 7, 13 | ×25/3 |
| 4 | 3, 13 | ×13/2 |
| 5 | 7, 11, 13 | ×49/5 |
| 6 | 5, 13 | ×17/3 |
| 7 | 7, 13 | ×19/5 |
| 8 | 13 | ×121/7 |
| 9 | 5, 17 | ×1/13 |
| 10 | 17 | ×3/5 |
| 11 | 7, 19 | ×1/17 |
| 12 | 19 | ×5/7 |
| 13 | 11 | ×1/19 |
| 14 | (デフォルト) | ×7/11 |

各ルールは以下に分解される:
- **test_ndiv(p)** (非破壊的な可除性テスト、 O(p²) pc)
- **div_p** / **mul_p** (定数による除算/乗算、 各 O(p) pc)

## 規模 (initial_a=1)

- 5350 個のユニークな pc 値
- 約 5350 個の catch-all ルール + 約 360 個の zb='x' + 約 270 個の zb='y' Haskell 行
- 均一な 4 ブロック種: すべての normal ブロックが同じポート配置を持つ (nx, ny, zero も同様)

initial_a=1 は BFS で解ける (directed モードで経路長 約 390)。 ゲーデル結果が x=9 で済むため。 initial_a >= 2 は中間ゲーデル数がペンテーション速度で爆発するため宇宙では計算不能。
