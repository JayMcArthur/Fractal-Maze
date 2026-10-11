[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# runhs — Haskell ステートマシンランナー

`runhs.py` は `hs2maze` / `nd-to-2d` 入力形式で書かれた Haskell ファイル
(例: `cp3 (x, y, z, pc) = cp3 (...)` という形式の単一 tail-recursive
ステップ関数のみ、`main :: IO ()` なし) をそのまま `runghc` に渡せない
問題を解決するためのユーティリティ。各等式をワンステップ形に書き換え、
pc=1 で停止する terminator を追加し、`main` ドライバを被せて一時ファイル
として `runghc` に渡す。

## 使い方

```bash
python3 runhs.py FILE.hs             # HALT ステップ数と最終状態を表示
python3 runhs.py FILE.hs --trace     # 全ステップの状態を表示
python3 runhs.py FILE.hs --limit N   # N ステップ超で打ち切り
                                     # (デフォルト: 5_000_000)
python3 runhs.py FILE.hs --save      # ラップ後の Haskell を入力の隣に
                                     # <ステム>_runable.hs として保存
python3 runhs.py FILE.hs --start "(a, b, ..., pc)"
                                     # 初期状態を明示指定 (旧 (0,1,0) 等)
python3 runhs.py -V | --version
```

## 入力フォーマット

入力は下記形式の等式を含むこと:

```haskell
FN (pat_0, ..., pat_{n-1}, pat_pc) = FN (rhs_0, ..., rhs_{n-1}, rhs_pc)
```

型シグネチャは任意だが、あれば arity の自動検出に使われる:

```haskell
FN :: (Int, ..., Int) -> (Int, ..., Int)
```

タプル長 (= レジスタ数 + 1、末尾はプログラムカウンタ) は型シグネチャ
または最初の等式から推論される。arity 2 以上ならどれでも受け付けるので、
`nd-to-2d` に渡す前の *n* レジスタ版、および `hs2maze` に渡す前の
2 レジスタ版 Gödel 版のどちらも実行できる。

## 初期状態と HALT

デフォルトは全レジスタ 0 = `(0, 0, ..., 0)` (新 atomic-port 形式の
`(0,0,W0)` maze start convention に対応)。`--start "(...)"` を渡せば
明示指定でき、旧 `(0,1,0)` 想定のプログラム (古い hs2maze 出力) も
そのまま走らせられる。

ドライバは pc (タプル末尾) が 1 になった時点で停止し、
`HALT <ステップ数> <状態>` を出力する。`--limit` 超過時は
`TIMEOUT <ステップ数> <状態>` を出力する。

## 例

```bash
$ python3 tools/runhs/runhs.py maze/counter-pump/cp2-4.hs
HALT 48 (0,0,1)

$ python3 tools/runhs/runhs.py maze/counter-pump/cp2-4.hs --trace | head -4
0 (0,0,0)
1 (0,0,2)
2 (1,0,3)
3 (2,0,4)

# 旧 (0,1,0) 開始想定のレガシー Haskell:
$ python3 tools/runhs/runhs.py legacy.hs --start "(0,1,0)"
```
