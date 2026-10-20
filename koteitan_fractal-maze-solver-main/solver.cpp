#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <vector>
#include <unordered_set>

#include "maze.h"

static const bool print_track = true;
static const bool print_newnext = false;

struct GlobalPtrEqual {
    bool operator()(const Global* g1, const Global* g2) const {
        if (!g1 || !g2) return g1 == g2;
        return *g1 == *g2;
    }
};

struct GlobalHash {
  std::size_t operator()(const Global *g) const {
    return std::hash<int>()(g->depth) ^ std::hash<Global*>()(g->parent) ^ std::hash<int>()(g->block) ^ std::hash<int>()(g->port);
  }
};

static std::unordered_set<Global* , GlobalHash, GlobalPtrEqual> coldpool;
static std::unordered_set<Global* , GlobalHash, GlobalPtrEqual> hotpool;
static std::unordered_set<Global* , GlobalHash, GlobalPtrEqual> newpool;
static void print_pools(){
  printf("coldpool:\n");
  for(auto it=coldpool.begin(); it!=coldpool.end(); it++){
    Global *g = *it;
    printf("%p:{%d,%d,%d,%p}\n", g, g->depth, g->block, g->port, g->parent);
  }
  printf("hotpool:\n");
  for(auto it=hotpool.begin(); it!=hotpool.end(); it++){
    Global *g = *it;
    printf("%p:{%d,%d,%d,%p}\n", g, g->depth, g->block, g->port, g->parent);
  }
  printf("newpool:\n");
  for(auto it=newpool.begin(); it!=newpool.end(); it++){
    Global *g = *it;
    printf("%p:{%d,%d,%d,%p}\n", g, g->depth, g->block, g->port, g->parent);
  }
}

int main(int argc, char *argv[]) {
  Global *solution = NULL;
  init_maze();
  for(int maxdepth=startmaxdepth; maxdepth<=maxmaxdepth; maxdepth++){
    int reached_depth = 0;
    printf("maxdepth=%d\n", maxdepth);
    /* init game */

    hotpool.insert(const_cast<Global*>(&start));

    /* start game */
    for(int istep=0; istep<maxstep; istep++){
      printf("istep=%d\n", istep);
      /* take each global position from hotpool */
      bool isfound = false;

      //print_pools();

      for(auto it=hotpool.begin(); it!=hotpool.end(); it++){
        Global *from = *it;

        std::vector<Global> tolist;
        getnext(&tolist, from, maxdepth);
        int nnext = tolist.size();
#if 0
        printf("tolist:\n");
        for(int inext=0; inext<nnext; inext++){
          Global to = tolist[inext];
          printf("%p:{%d,%d,%d,%p}\n", &to, to.depth, to.block, to.port, to.parent);
        }
#endif

        /* take each next global position and add it to newpool */
        for(int inext=0; inext<nnext; inext++){
          Global to = tolist[inext];
          Global *pto = NULL;
          if(coldpool.find(&to) == coldpool.end() && hotpool.find(&to) == hotpool.end()){
            isfound = true;
            pto = new Global;
            *pto = to;
            newpool.insert(pto);
            if(to.depth > reached_depth) reached_depth = to.depth;
            if(print_track){
              printf("%4d:", istep); print_global(pto); printf(" <- "); print_global(from); printf("\n");
            }
          }else{
          }

          if(to == goal){
            solution = pto;
            goto goal;
          }
        } /* for all next */

      } /* for all elements in hotpool */
      if(!isfound) break;

      /* move new -> cold */
      for(auto it=hotpool.begin(); it!=hotpool.end(); it++){
        coldpool.insert(*it);
      }
      hotpool.clear();

      /* move new -> hot */
      for(auto it=newpool.begin(); it!=newpool.end(); it++){
        hotpool.insert(*it);
      }
      newpool.clear();

    } /* for all steps */

    /* game over */
    printf("maxdepth=%d was unsolvable.\n", maxdepth);
    
    /* clear all pools */
    hotpool.clear();
    coldpool.clear();

  } /* for all maxdepths */
    
  return EXIT_SUCCESS;

goal:
  printf("goal!\n");
  printf("\n");
  printf("solution:\n");
  Global *g = solution;
  std::vector<Global*> v;
  do{
    v.push_back(g);
    g = g->track;
  }while(g != NULL);
  for(int i=v.size()-1; i>=0; i--){
    print_global(v[i]);
    printf("\n");
  }
  return EXIT_SUCCESS;
}
