[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# gen-maze — 最短経路長最大化探索ツール (C 実装)

特定 nterm における **最短経路長を最大化する迷路構成** を探索する C 言語コマンドラインツール。
network のビジービーバー類似 — 与えられた nterm でどこまで長い shortest path を作れるかを問う。

3 戦略: 網羅的列挙、ランダムサンプリング、トップダウン枝刈り。
副次的に旧形式の迷路ソルバ (IDDFS / BFS) も持つ。

> **形式互換性:** このツールは旧形式の迷路 (canonical state E/N + nx/ny 圧縮) のみを扱う。
> 新しい atomic-port (*1) 形式 (`C` サブターミナル / `zero` ブロック / bridges を含む) は解けない。
> 新形式の解には [`tools/solver/`](../solver/README-ja.md) を使う。

## ビルド

```bash
cd tools/gen-maze
make
```

`repeated-maze` バイナリが出力される (このディレクトリに)。

## 使い方

```bash
# 迷路を解く
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# 網羅的探索 / ランダム探索
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# トップダウン探索
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# 迷路の正規化
./repeated-maze norm <nterm> '<maze_string>'
```

## ファイル構成

- `main.c` — CLI エントリポイント
- `maze.h` / `maze.c` — 迷路データ構造、文字列パース/出力、正規化
- `solver.h` / `solver.c` — IDDFS / BFS ソルバ
- `quizmaster.h` / `quizmaster.c` — 最短経路長最大化探索戦略
- `Makefile` — gcc -O2 ビルド
