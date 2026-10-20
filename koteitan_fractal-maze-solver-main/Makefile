.PHONY:all clean
all:solver
solver:solver.o maze_snuke_no3.o maze_snuke_no4.o maze_koteitan.o
	g++ -o solver solver.o maze_snuke_no3.o maze_koteitan.o maze_snuke_no4.o
.cpp.o:
	g++ -c $<
clean:
	rm -f solver *.o
