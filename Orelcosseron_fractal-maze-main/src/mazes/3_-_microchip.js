module.exports = {
    maze:
        `# This file is used to declare a fractal maze. 
# You can copy it to create a new maze. To help
# you do so, each component of the maze is described
# before being added. You can also add your own
# commentaries by making a line that start with a #. 

# == MICROCHIP == #
# Adapted from Mark J. P. Wolf's maze  (mark.wolf at cuw.edu) found at https://www.mathpuzzle.com/18Nov2003.html

# COLORS
# Some global colors are set to personalize the maze. 
# For now, it is possible to set: 
# - The background color of the upmost level with OUTSIDE_COLOR;
# - The color of the walls with BACKGROUND_COLOR;
# - The color of the path on with PATH_COLOR;
# - The color of the line drawn when the player moves with LINE_COLOR.
# These colors must be set before declaring any component of the maze. 
# Format: COLOR_NAME #RRGGBB

OUTSIDE_COLOR #63998b
BACKGROUND_COLOR #275d5c
PATH_COLOR #f0bd6a
LINE_COLOR #cd9a51

# SIZE DESCRIPTION
# It is possible to set the size of the tiles to adjust the rendering of the 
# maze. The tile's size must be set before declaring any component of the maze. 
# Format: TILE_SIZE size

TILE_SIZE 30

# TILE DESCRIPTION
# Tiles are the basic components of the maze, each row of the maze is described
# as a succession of tiles, each being a 4-bit number written on two digits. This 
# number indicates in which directions the tile can be entered or left by a natural
# path (that is, not by using a teleporter, an exit or a link), each bit indicating 
# if a path is set in a given direction. 
# Tiles must be declared before any other components of the maze. 
#
# ORIENTATION VALUES:
# 8 = 1000 = North
# 4 = 0100 = East
# 2 = 0010 = South
# 1 = 0001 = West
# Examples:   10 = 1010      => A tile with a vertical path.
#           0501 = 0101|0001 => Two tiles with an horizontal path that has no exit eastward. 

# =============== MAZE =============== #
0605010000000000000605050104050505010000
1000000000000605011004050505050505010000
1405050503001002001000000601060505050302
1000000008000808001000000800080403020810
1000060100000000040900020000000008100409
1000100000000000060505090000000000100200
1002100000000000100200020000000000081000
0810100000000000081000100000000004011000
0010100002000202001000100000000002021000
0010120108040910001401100605050509101000
0010060505010012011002101002000000101000
0010100002000000001010100812050100100800
0411100010000000001010100000000000140501
0010100012050100001008080000000004090200
0010100000040505011004010000000002001000
0010100000000000001004010000000008001000
0010100000000000000800040505010000001000
0010120505050505050505050705050505011000
0012050505050503000200001000000000060900
0000040505050108040900000800000000080000
# ============= END MAZE ============= #

# TELEPORT DESCRIPTION
# A teleporter allows the player to move in a direction while skipping a few tiles.
# This is useful e.g for drawing a path that goes under another one.
# Format: TELEPORT row col orientation+reach
# Example: TELEPORT 00 00 4+3 => Teleport from (0,0) to (0,3) (3 tiles east)

TELEPORT 00 07 2+2
TELEPORT 02 07 8+2

TELEPORT 01 08 4+2
TELEPORT 01 10 1+2

TELEPORT 00 13 2+2
TELEPORT 02 13 8+2

TELEPORT 01 17 2+2
TELEPORT 03 17 8+2

TELEPORT 04 16 4+2
TELEPORT 04 18 1+2

TELEPORT 03 18 2+2
TELEPORT 05 18 8+2

TELEPORT 04 09 2+2
TELEPORT 06 09 8+2

TELEPORT 06 01 4+2
TELEPORT 06 03 1+2

TELEPORT 06 16 2+2
TELEPORT 08 16 8+2

TELEPORT 06 17 2+2
TELEPORT 08 17 8+2

TELEPORT 07 17 4+2
TELEPORT 07 19 1+2

TELEPORT 09 03 4+2
TELEPORT 09 05 1+2

TELEPORT 08 05 2+2
TELEPORT 10 05 8+2

TELEPORT 09 10 4+2
TELEPORT 09 12 1+2

TELEPORT 08 13 2+2
TELEPORT 10 13 8+2

TELEPORT 09 04 2+2
TELEPORT 11 04 8+2

TELEPORT 10 08 4+2
TELEPORT 10 10 1+2

TELEPORT 11 18 2+2
TELEPORT 13 18 8+2

TELEPORT 14 08 4+2
TELEPORT 14 10 1+2

TELEPORT 13 10 2+2
TELEPORT 15 10 8+2

TELEPORT 14 11 2+2
TELEPORT 16 11 8+2

TELEPORT 17 00 4+2
TELEPORT 17 02 1+2

TELEPORT 16 09 2+2
TELEPORT 18 09 8+2

TELEPORT 17 17 4+2
TELEPORT 17 19 1+2

TELEPORT 19 06 4+2
TELEPORT 19 08 1+2

# PLAYER DESCRIPTION
# The player is the in-game avatar of the actual player.
# The player must be declared before any trophy/exit.
# Format: PLAYER row col #RRGGBB

PLAYER 13 06 #87632d

# TROPHY DESCRIPTION
# Trophies are an optional component of the maze. 
# Reaching a trophy wins the game. 
# Trophies can only be placed on the topmost level of the maze.
# If no trophies are set, reaching an exit on the topmost level
# of the maze wins the game. 
# When used, trophies must be declared before any exit.
# Format: TROPHY row col #RRGGBB

TROPHY 14 05 #42665c

# EXIT DESCRIPTION
# An exit allows the player to move outside the block they are 
# currently in and to leave the maze if there is no trophies.
# Exits must be declared before any link can be made.
# Format: EXIT name orientation row col

EXIT 01 8 00 02
EXIT 02 8 00 07
EXIT 03 8 00 12
EXIT 04 8 00 17
EXIT 05 4 02 19
EXIT 06 4 07 19
EXIT 07 4 12 19
EXIT 08 4 17 19
EXIT 09 2 19 17
EXIT 10 2 19 12
EXIT 11 2 19 07
EXIT 12 2 19 02
EXIT 13 1 17 00
EXIT 14 1 12 00
EXIT 15 1 07 00
EXIT 16 1 02 00

# BLOCK DESCRIPTION
# A block is a copy of the maze within itself.
# Blocks must be declared before any link is added to them.
# Format: BLOCK name row col width height #RRGGBB

BLOCK A 04 04 04 04 #7d0c6f
BLOCK B 04 12 04 04 #267d06
BLOCK C 12 12 04 04 #7d510c

# LINK DESCRIPTION
# A link allows the player to move inside a block. 
# A link must be declared after the block it links to. 
# A link can also link to a block inside one block or more. 
# In that case, the chain of blocks must be entirely described,
# separated by '+'.
# Format: LINK block_name[+block_name[+block_name[+...]]] exit_name row col

LINK A 01 03 04
LINK A 03 03 06
LINK A 04 03 07
LINK A 05 04 08
LINK A 08 07 08
LINK A 09 08 07
LINK A 10 08 06
LINK A 11 08 05
LINK A 12 08 04
LINK A 14 06 03
LINK A 16 04 03

LINK B 01 03 12
LINK B 03 03 14
LINK B 04 03 15
LINK B 07 06 16
LINK B 08 07 16
LINK B 11 08 13
LINK B 14 06 11
LINK B 16 04 11

LINK C 01 11 12
LINK C 04 11 15
LINK C 06 13 16
LINK C 07 14 16
LINK C 08 15 16
LINK C 10 16 14
LINK C 13 15 11
LINK C 15 13 11
`}