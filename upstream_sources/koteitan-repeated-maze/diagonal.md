# maze の構成要素の定義
- maze: block が２次元に無限に広がっている空間。
  - 下記から構成される:
    - normal port の集合
    - nyport の集合
    - nxport の集合
    - terminal の集合
- block: maze を構成する部品である正方形。(x,y) と表される。x>=0, y>=0.
- terminal: block の外周上にある端点。
  - block の西東南北の４辺にはE terminal, W terminal, S terminal, N terminal が存在する。
  - 同じ辺には複数の terminal が存在し、それぞれ辺を表すアルファベットと数字の組み合わせで、
    - {W,E,S,N}i (iは0から始まる整数) で表される。例えば、W0, E1, S2, N3 ... など。
- port:１つの terminal と１つの terminal を繋ぐ線分。
  - normal port: x>0, y>0 なるblock (x,y) にある port。
  - nyport: x>0, y=0 なるblock (x,y) にある port。
  - nxport: x=0, y>0 なるblock (x,y) にある port。

# maze を描画するための構成要素の定義
以上はトポロジー的な構成要素の定義であったが、以下は maze を描画するための構成要素の定義である。
maze は線が重なると見にくいので、port を垂直と水平の折れ線で表現し、同一の terminal に複数の port が繋がっている場合は、port を分岐させて表現することにする。

- drawing element: maze を描画するための構成要素。area, subblock, subterminal, subport, spine から構成される。
- subblock:
  - area をさらに細かく分割した最小単位の正方形。subport を内包している。
  - ひとつの area がいくつの subblock に分割されるかは描画の初めから終わりまで動的に変わる。
- subterminal: 同じ terminal に複数の port が繋がっている場合に、terminal を分割して表現するための構成要素。
  - それぞれ辺を表すアルファベットと数字の組み合わせで、
    - {W,E,S,N}i-j (i,j は0から始まる整数) で表される。例えば、W0-1, E2-3, S4-5, N6-7 ... など。
    - i は subterminal が接続されている terminal の番号を表す。例えば、W0-1 は W0 に接続されている subterminal であることを表す。
    - j は同じ terminal に接続されている subterminal の中での番号を表す。例えば、W0-1 は W0 に接続されている subterminal の中での 1 番目の subterminal であることを表す。
- subport:
  - subblock 内に存在する線分であり、port を構成する。

# drawing element による port の構成
- maze が定義された場合、それに応じて drawing element を配置して、描画を行うことができる。ここではその手順を説明する。
- grid の作成
 - 座標系は数学と同じで、左下が原点、東が x 軸の正の方向、北が y 軸の正の方向とする。
 - nsubterminal{W,E,S,N}[t] を t 番目の terminal に接続されている subterminal の数とする。
 - grid の高さ H = sum_t max(nsubterminal{W,E}[t])+2 (2はsubterminal を置くスペース)
 - grid の幅   W = sum_t max(nsubterminal{S,N}[t])+2 (2はsubterminal を置くスペース)
 - この大きさで grid を作成する。
- subterminal の配置
  下記の手順で grid の外周に subterminal を配置する。
  - y=0, t=0 に初期化する。
  - subterminal Wt-s, Et-s を (0,y), (W-1,y) から y をインクリメントしながら順番に配置する。
    - Wt-s, Et-s の y 座標は同じにする。
    - subterminal の数が W と E で異なる場合は、少ない方の subterminal を配置した後に、残りのスペースを空ける。
  - subterminal St-s, Nt-s を (x,0), (x,H-1) から x をインクリメントしながら順番に配置する。
    - St-s, Nt-s の x 座標は同じにする。
    - subterminal の数が S と N で異なる場合は、少ない方の subterminal を配置した後に、残りのスペースを空ける。
- subport の配置
  - subterminal と subterminal を繋ぐ subport を lee/ にある lee のアルゴリズムを用いて配置する。
- 正方形に整形
  - grid を正方形に整形する。grid の幅と高さのうち大きい方を正方形の一辺の長さとし、その状態になるまで
    insert_map で行か列を挿入する。ただし、挿入する場所は、
    - 行を挿入する場合は、拡大後の高さを H' として H'-1 と H'-2 の間に挿入する。
    - 列を挿入する場合は、拡大後の幅  を W' として W'-1 と W'-2 の間に挿入する。
- branch subport の配置
  - subterminal を branch subport に変換していく。
  - branch subport の構造と表示方法:
    - 構造:connect[d]: d={W,E,S,N}: 0 ならば中心点と d 方向を繋ぐ線分は存在しない。1 ならば存在する。
    - 表示方法:sum(connect)>2 ならば、中央に中黒の円を描画する。
  - Dt-0 の connect[D]: Dt-0 が存在すれば connect[D]=1 (terminal t に繋がる横線)
  - Wt-s の connect[E]: Wt-s が存在すれば connect[E]=1 (subterminal t-s に繋がる横線)
  - Et-s の connect[W]: Et-s が存在すれば connect[W]=1 (subterminal t-s に繋がる横線)
  - St-s の connect[N]: St-s が存在すれば connect[N]=1 (subterminal t-s に繋がる縦線)
  - Nt-s の connect[S]: Nt-s が存在すれば connect[S]=1 (subterminal t-s に繋がる縦線)
  - Wt-s の connect[S]: Wt-(s-1) が存在すれば connect[S]=1 (隣の subterminal に繋がる縦線)
  - Wt-s の connect[N]: Wt-(s+1) が存在すれば connect[N]=1 (隣の subterminal に繋がる縦線)
  - Et-s の connect[S]: Et-(s-1) が存在すれば connect[S]=1 (隣の subterminal に繋がる縦線)
  - Et-s の connect[N]: Et-(s+1) が存在すれば connect[N]=1 (隣の subterminal に繋がる縦線)
  - St-s の connect[W]: St-(s-1) が存在すれば connect[W]=1 (隣の subterminal に繋がる横線)
  - St-s の connect[E]: St-(s+1) が存在すれば connect[E]=1 (隣の subterminal に繋がる横線)
  - Nt-s の connect[W]: Nt-(s-1) が存在すれば connect[W]=1 (隣の subterminal に繋がる横線)
  - Nt-s の connect[E]: Nt-(s+1) が存在すれば connect[E]=1 (隣の subterminal に繋がる横線)







