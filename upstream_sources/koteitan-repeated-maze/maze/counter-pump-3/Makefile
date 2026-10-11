KS = 2 3 4
HS3D = $(KS:%=cp3-%-3d.hs)
HS2D = $(KS:%=cp3-%-2d.hs)
MAZES = $(KS:%=cp3-%.maze)

HS2MAZE = ../../tools/hs2maze/hs2maze.py
HS2MAZE_FLAGS =
ND_TO_2D = ../../tools/nd-to-2d/nd-to-2d.py
MAKE_CP3 = ./make-cp3.py

all: $(HS3D) $(HS2D) $(MAZES)

cp3-%-3d.hs: $(MAKE_CP3)
	python3 $(MAKE_CP3) $* > $@

cp3-%-2d.hs: cp3-%-3d.hs $(ND_TO_2D)
	python3 $(ND_TO_2D) $< > $@

cp3-%.maze: cp3-%-2d.hs $(HS2MAZE)
	python3 $(HS2MAZE) $(HS2MAZE_FLAGS) $< > $@

clean:
	rm -f $(HS3D) $(HS2D) $(MAZES)

.PHONY: all clean
