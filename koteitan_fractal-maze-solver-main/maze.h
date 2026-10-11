#ifndef MAZE_H
#define MAZE_H

#undef  MAZE_SNUKE_NO3
#undef  MAZE_SNUKE_NO4
#define MAZE_KOTEITAN

typedef struct Global{
  struct Global *parent;
  struct Global *track;
  int depth;
  int block;
  int port;
  bool operator==(const Global &other) const {
    return (depth == other.depth) && (parent == other.parent) && (block == other.block) && (port == other.port);
  }
}Global;

extern const int maxstep;
extern const int startmaxdepth;
extern const int maxmaxdepth;
extern const Global start;
extern const Global goal;
extern void init_maze();
extern void print_global(Global *g);
extern void getnext(std::vector<Global> *vto, Global *from, int maxdepth);

#endif /* MAZE_H */
