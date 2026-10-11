[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# solver — atomic-port (*1) 形式 Python BFS ソルバ

`solver.py` は `hs2maze.py` が出力する atomic-port (*1) 形式の迷路文字列を
読み込み、最短経路を BFS で求める。`normal` / `nx` / `ny` / `zero` の
4 種ブロックタイプと、`C` (中心) を含む 5 種サブターミナルを扱える。

C 言語版 `repeated-maze` バイナリは旧形式専用で、(*1) 形式は解けない。
新形式の迷路はこの Python ソルバで解く。

## 使い方

```bash
python3 solver.py [FILE]              # FILE / stdin から迷路文字列を読む
python3 solver.py --max-states N      # BFS 状態上限 (既定 2_000_000)
python3 solver.py -V | --version      # バージョン
python3 solver.py -h | --help         # ヘルプ
```

## 迷路規約

- 開始: `(0, 0, W, 0)`
- ゴール: `(0, 0, W, 1)`
- ブロック `(0, 0)` は corner — `zero` ポートセットを使い、
  `zb='x'` (x=0) と `zb='y'` (y=0) の両方のルールが同セル内で発火可能。
- ブリッジポート `W0-C0` / `W1-C1` で `W0` / `W1` を `C0` / `C1` の連結成分に取り込む。

## ブロックタイプ別ポートセット

| 位置 | 参照するセット |
|------|----------------|
| `(0, 0)` | `zero` |
| `(0, y>0)` | `nx` |
| `(x>0, 0)` | `ny` |
| `(x>0, y>0)` | `normal` |

無向 (`-`) のポートは両方向に展開、有向 (`->`) は片方向のみ。

## 例

```bash
$ python3 tools/solver/solver.py maze/counter-pump/cp2-4.maze
HALT 48 (0, 0, W, 1)

$ python3 tools/hs2maze/hs2maze.py maze/counter-pump/cp2-4.hs --undirected | \
    python3 tools/solver/solver.py
```

## 制限

`cp3-4` などの大規模迷路 (~8千万 state 規模) は現実装の Python BFS では
メモリ不足で完走しない。pypy 化または C 化が将来課題。
