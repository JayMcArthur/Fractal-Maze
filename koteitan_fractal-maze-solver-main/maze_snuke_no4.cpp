#include <vector>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "maze.h"

#ifdef MAZE_SNUKE_NO4
#define NBLOCK   (2)
#define NPORTS   (3)
#define NNEXTLOC (12)
static const int nextlocal_init[NNEXTLOC][5] = {
// B, P-> d, B, P   //  
  {0, 0, +1, 0, 1}, // 0
  {0, 1, +1, 0, 2}, // 1
  {0, 2, +1, 1, 3}, // 2
  {0, 3, +1, 1, 3}, // 3
  {0, 0, -1, 0, 0}, // 4
  {0, 1, -1, 0, 0}, // 5
  {0, 2, -1, 0, 1}, // 6
  {0, 3, -1, 0, 2}, // 7
  {1, 0, -1, 0, 3}, // 8
  {1, 1, -1, 0, 2}, // 9
  {1, 2, -1, 0, 1}, // 10
  {1, 3, -1, 0, 2}, // 11
};
static std::vector<int*> nextlocal;
static void init_nextlocal(){
  for(int i=0; i<NNEXTLOC; i++){
    int *next = new int[5];
    for(int j=0; j<5; j++){
      next[j] = nextlocal_init[i][j];
    }
    nextlocal.push_back(next);
  }
}
/*                           parent, track, d, b, p */
extern const Global start = {NULL  , NULL , 0, 0, 0};
extern const Global goal  = {NULL  , NULL , 0, 0, 3};
//static const int N = 18;
extern const int maxstep        = 100;
extern const int startmaxdepth  = 1;
extern const int maxmaxdepth    = 20;
extern void init_maze(){
  init_nextlocal();
}
static const char *blockname[NBLOCK] = {"L", "R"};
void print_global(Global *g){
  char out[8192]="";
  char str[8192];
  Global *local = g;
  do{
    sprintf(str, "%s%d", blockname[local->block], local->port);
    strcat(str, out);
    strcpy(out, str);
    local = local->parent;
  }while(local != NULL);
  printf("%s", out);
}
extern void getnext(std::vector<Global> *vto, Global *from, int maxdepth){
  //printf("from : "); print_global(from); printf("\n");
  int b = from->block;
  int p = from->port;
  int depth = from->depth;
  Global *parent = from->parent;
  for(int i = 0; i < nextlocal.size(); i++){
    int *next = nextlocal[i];
    int ddepth  = next[2];

    if(              next[1] != p) continue;
    if(ddepth==-1 && next[0] != b) continue;
    if(ddepth==+1 && depth >= maxdepth) continue;

    if(ddepth == +1){
      // go down or stay
      Global to;
      to.depth  = ddepth + depth;
      to.port   = next[4];
      to.block  = next[3];
      to.parent = from;
      to.track  = from;
      vto->push_back(to);
      //printf("todn: "); print_global(&to); printf("\n");
    }else if(ddepth == 0){
      // go down or stay
      Global to;
      to.depth  = ddepth + depth;
      to.port   = next[4];
      to.block  = next[3];
      to.parent = from->parent;
      to.track  = from;
      vto->push_back(to);
      //printf("stay: "); print_global(&to); printf("\n");
    }else{
      // go up
      //printf("toup: local=%d\n", local);
      if(parent == NULL) continue;
      Global to;
      to.depth  = ddepth + depth;
      to.port   = next[4];
      to.block  = parent->block;
      to.parent = parent->parent;
      to.track  = from;
      vto->push_back(to);
      //printf("toup: "); print_global(&to); printf("\n");
#ifdef ADD_NEW_NEXT 
      // add new next
      int *newnext = new int[5];
      newnext[0] = parent->block;
      newnext[1] = parent->port;
      newnext[2] = 0;
      newnext[3] = to.block;
      newnext[4] = to.port;

      if(newnext[0]==newnext[3] && newnext[1]==newnext[4]) continue;
      // check if newnext is already in nextlocal
      bool isfound = false;
      for(int j=0; j<nextlocal.size(); j++){
        int *next = nextlocal[j];
        if(next[0] == newnext[0] && next[1] == newnext[1] && next[2] == newnext[2] && next[3] == newnext[3] && next[4] == newnext[4]){
          isfound = true;
          break;
        }
      }
      if(!isfound){
        // add new next
        nextlocal.push_back(newnext);
        if(print_newnext){
          printf("added next:\n");
          printf("from       : "); print_global(from); printf("\n");
          printf("to         : "); print_global(&to); printf("\n");
          printf("applied    : %s%d -> %d%s%d\n", newnext[0]==0?"L":"R", newnext[1], newnext[2], newnext[3]==0?"L":"R", newnext[4]);
          printf("added next : %s%d -> %d%s%d\n", blockname[newnext[0]], newnext[1], newnext[2], blockname[newnext[3]], newnext[4]);
        }
      }
#endif /* ADD_NEW_NEXT */
    }
  }
}
#endif /* MAZE_SNUKE_NO4 */
