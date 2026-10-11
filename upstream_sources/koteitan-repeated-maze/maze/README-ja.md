**Japanese** | [English](README.md)

# 迷路構成法

長い最短経路を生む繰り返し迷路の既知の構成法。

## 構成法

- [カウンターポンプ (cp2)](counter-pump/README-ja.md) — 2 レジスタミンスキーで y 座標を n² まで蓄積・放出する。固定復路幅で O(n²)。
- [カウンターポンプ 3 段 (cp3)](counter-pump-3/) — 3 レジスタの三重ループ。`make-cp3.py` で 3-register Haskell を生成し `nd-to-2d.py` → `hs2maze.py` のパイプラインで O(n³)。
- [ミンスキーダブリングマシン](minsky-doubling/README-ja.md) — y ↦ 2y+1 を k 回繰り返し、x↔y 移送で乗算を実装。O(2^k)。
- [ペンテーション迷路 (penta)](penta/README-ja.md) — 2 レジスタ Gödel 符号化ミンスキーマシンで 14 個の Fractran 形式ルールによりペンテーションを計算。 均一 4 種ブロックでパス長 Ω(2↑↑↑n)。

## 使われる基本演算

各構成法が依存する register-machine レベルのテクニックの比較。素の Minsky マシンは INC / DEC と ゼロ判定だけで動くので、ルール 1 行が直接表現する操作はどれも同じ。差が出るのは「最終的に何を計算するか」と、それを実装する手段 (ループ深さ・移送パターン・Gödel 符号化) の側。

| 構成 | INC/DEC ±1 | ゼロ判定 (=0 分岐) | 多重ループ | x↔y 移送 | 算術 (× p / ÷ p / mod p) | 計算する量 | パス長 |
|---|---|---|---|---|---|---|---|
| counter-pump (cp2)         | ✓ | ✓ | 二重         | –             | –                  | y を n² まで蓄積        | O(n²) |
| counter-pump-3 (cp3)       | ✓ | ✓ | 三重         | –             | –                  | 内側 DEC z を n³ 回     | O(n³) |
| minsky-doubling (md)       | ✓ | ✓ | k 段反復     | ✓             | –                  | y ↦ 2y+1 を k 回 (= 2^{k+1}−1) | O(2^k) |
| pentation (penta)          | ✓ | ✓ | (Fractran loop) | ✓ | ✓ (Gödel 符号化) | 14 個の Fractran 形式ルールでペンテーション計算 | Ω(2↑↑↑n) |
| nd-to-2d (出力)            | ✓ | ✓ | (元のマシン次第) | ✓ | ✓ (Gödel 符号化)   | n-reg Minsky を 2-reg Gödel 形に変換 | (元次第) |

`nd-to-2d` は構成法そのものではなく、n-register ミンスキー Haskell ソースを 2-register Gödel 数化形 (hs2maze の入力形式) にコンパイルする**ツール**。出力された 2-register マシン上では、元の各 `INC r_i` / `DEC r_i` / LHS パターン `(... 0 ...)` がそれぞれ x := x · p_i / x := x ÷ p_i / x mod p_i = 0 のテストへとマクロ展開される (p_i は i 番目の素数 = 2, 3, 5, …)。表の「nd-to-2d (出力)」行はこのマクロ層の機能を表す。

## ツール

- [hs2maze](../tools/hs2maze/README-ja.md) — Haskell 風ステートマシン定義 (ミンスキーレジスタマシン等) を繰り返し迷路のポート文字列に変換。
- [nd-to-2d](../tools/nd-to-2d/README-ja.md) — n-register ミンスキー Haskell ソースを 2-register Gödel 数化版にコンパイル (上表の「nd-to-2d (出力)」行を生成)。
- [runhs](../tools/runhs/README-ja.md) — `hs2maze` / `nd-to-2d` 形式の Haskell ファイルを `runghc` で実行するラッパー (HALT までトレース可)。
