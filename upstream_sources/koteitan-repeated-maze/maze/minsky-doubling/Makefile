KS = 3 4 5
HS = $(KS:%=md%.hs)
MAZES = $(KS:%=md%.maze)

HS2MAZE = ../../tools/hs2maze/hs2maze.py
HS2MAZE_FLAGS =
MAKE_MD = ./make-minsky-doubling.py

all: $(HS) $(MAZES)

md%.hs: $(MAKE_MD)
	python3 $(MAKE_MD) $* > $@

md%.maze: md%.hs $(HS2MAZE)
	python3 $(HS2MAZE) $(HS2MAZE_FLAGS) $< > $@

clean:
	rm -f $(HS) $(MAZES)

.PHONY: all clean
