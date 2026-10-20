**Japanese** | [English](README.md)

# 迷路構成法

長い最短経路を生む繰り返し迷路の既知の構成法。

## 構成法

- [カウンターポンプ](counter-pump/README-ja.md) — y座標の非対称な蓄積・放出を利用。固定復路幅で O(n²)、nterm に比例する復路幅で O(n³) のパス長を達成。
- [ミンスキーダブリングマシン](minsky-doubling/README-ja.md) — 2^k を計算する2カウンタ ミンスキーレジスタマシンを符号化。指数的パス長 O(2^{nterm/12}) を達成するが、nterm = O(k) ターミナルが必要。

## ツール

- [hs2maze](hs2maze/README-ja.md) — Haskell 風ステートマシン定義（ミンスキーレジスタマシン等）を繰り返し迷路のポート文字列に変換。
