**Japanese** | [English](README.md)

# Repeated Maze

チューリングマシンのビジービーバー問題と同様に、繰り返しタイル迷路上のレジスタマシンにおいて最短経路長を最大化する迷路構成を探索するプロジェクト。

## 概要

「繰り返し迷路」は、同一のブロックを無限2Dグリッド上にタイル状に敷き詰めたものです。各ブロックは4辺にターミナル（ポート）を持ち、隣接ブロックと接続します。プレイヤーは開始状態からゴール状態までポート接続を辿って移動します。目標は、最短経路長を最大化するポート割り当て（迷路構成）を見つけることです。

`repeated-maze` は C 言語のコマンドラインツールで、**迷路ソルバー**と**迷路生成器**（クイズマスター）の両方の機能を持ちます。ソルバーは IDDFS または BFS で迷路の最短経路を求めます。クイズマスターは網羅的列挙、ランダムサンプリング、トップダウン枝刈りの戦略で最短経路長を最大化する迷路構成を探索します。ブラウザベースのインタラクティブビジュアライザ（`index.html`）で迷路とパスを描画できます。

## ドキュメント

- [仕様](spec-ja.md) — 状態、ブロック、ターミナル、ポート、迷路最適化問題の形式的定義
- [迷路構成法](maze/README-ja.md)
  - [カウンターポンプ方式](maze/counter-pump/README-ja.md) — y座標の非対称蓄積により O(n²)〜O(n³) のパス長を達成する構成法
    - [nterm=6 の例](maze/counter-pump/6-ja.md) — 6ターミナルのカウンターポンプの詳細解析（パス長 257）
  - [ミンスキーダブリングマシン](maze/minsky-doubling/README-ja.md) — レジスタマシン符号化による指数的パス長 O(2^{nterm/12})
    - [k=5 の例](maze/minsky-doubling/5-ja.md) — 5回反復のダブリングマシン（662ステップ）
  - [hs2maze](maze/hs2maze/README-ja.md) — Haskell 風ステートマシン定義から迷路文字列への変換器

## ビルド

```bash
make
```

## 使い方

```bash
# 迷路を解く
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# 網羅的探索
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# トップダウン探索
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# 迷路の正規化
./repeated-maze norm <nterm> '<maze_string>'
```

## ビジュアライゼーション

`index.html` をブラウザで開くと、迷路とパスをインタラクティブに可視化できます。
