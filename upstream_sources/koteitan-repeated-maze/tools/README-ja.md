[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# tools — 迷路コンパイルツールチェイン

Haskell 風ステートマシンを repeated-maze のポート文字列に変換し、
実行するための Python ユーティリティ群。

## サブツール

- [hs2maze](hs2maze/README-ja.md) — 2 レジスタ Haskell ステートマシン
  を atomic-port (*1) 形式の迷路文字列
  (`normal: ...; nx: ...; ny: ...; zero: ...`) に変換する。
- [nd-to-2d](nd-to-2d/README-ja.md) — *n* レジスタ Haskell ステート
  マシンを Gödel 数化された 2 レジスタ Haskell にコンパイルする。出力は
  そのまま `hs2maze` に渡せる。
- [runhs](runhs/README-ja.md) — Haskell ステートマシン (任意の
  レジスタ数) を `main` ドライバでラップし `runghc` で実行する。
- [solver](solver/README-ja.md) — atomic-port (*1) 形式の迷路を
  BFS で解く Python ソルバ。新形式に対応する唯一のソルバ。
- [gen-maze](gen-maze/README-ja.md) — 特定 nterm における最短経路長
  を最大化する迷路構成の探索ツール (C 実装、旧形式専用)。
  副次的に旧形式 IDDFS / BFS ソルバも提供する。

## 典型的なパイプライン

```
(n レジスタ Haskell)
   │  nd-to-2d/nd-to-2d.py
   ▼
(2 レジスタ Gödel Haskell)
   │  hs2maze/hs2maze.py
   ▼
(迷路文字列: normal / nx / ny / zero)
   │  solver/solver.py
   ▼
(最短経路 / HALT)
```

`runhs/runhs.py` は上記パイプラインとは独立の補助ツールで、
*n* レジスタ版・2 レジスタ版のどちらも 1 コマンドで走らせて停止を
観察できる。
