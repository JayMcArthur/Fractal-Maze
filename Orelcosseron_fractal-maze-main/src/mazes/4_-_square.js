module.exports = {
    maze:
        `# This file is used to declare a fractal maze. 
# You can copy it to create a new maze. To help
# you do so, each component of the maze is described
# before being added. You can also add your own
# commentaries by making a line that start with a #. 

# == SQUARE == #
# Adapted from trivialknot's maze at https://skepticsplay.blogspot.com/2010/10/fractal-maze.html

# COLORS
# Some global colors are set to personalize the maze. 
# For now, it is possible to set: 
# - The background color of the upmost level with OUTSIDE_COLOR;
# - The color of the walls with BACKGROUND_COLOR;
# - The color of the path on with PATH_COLOR;
# - The color of the line drawn when the player moves with LINE_COLOR.
# These colors must be set before declaring any component of the maze. 
# Format: COLOR_NAME #RRGGBB

OUTSIDE_COLOR #000000
BACKGROUND_COLOR #151515
PATH_COLOR #feac16
LINE_COLOR #092fe8

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

# ============== MAZE ============== #
00060505050505050505010000000000000000
02100405050505050505050505050505050503
10100000000000000000020000000000000010
10080000000000000002100000000000000008
10000000000000000010100000000000000000
12010000000000000010100000000000000000
00000000000000000010100000000000000000
00000000000000000010100000000000000000
00000000000000000010120505050505050501
04030000000605050110040505050505050501
00100000001000000008000000000000000002
00100000001205050501000000000000000010
00100000000000000002000000000000000010
00100000000000000010000000000000000210
00100000000000000010000000000000000810
02100000000000000010000000000000000409
10100000000000000010000000000000000200
10120505050505050110040505010000001000
12050505050505050108040505050505050900
# ============ END MAZE ============ #

# TELEPORT DESCRIPTION
# A teleporter allows the player to move in a direction while skipping a few tiles.
# This is useful e.g for drawing a path that goes under another one.
# Format: TELEPORT row col orientation+reach
# Example: TELEPORT 00 00 4+3 => Teleport from (0,0) to (0,3) (3 tiles east)

TELEPORT 01 00 4+2
TELEPORT 01 02 1+2

TELEPORT 00 10 2+2
TELEPORT 02 10 8+2

TELEPORT 09 08 4+2
TELEPORT 09 10 1+2

TELEPORT 08 18 2+2
TELEPORT 10 18 8+2

TELEPORT 10 09 2+2
TELEPORT 12 09 8+2

TELEPORT 14 17 2+2
TELEPORT 16 17 8+2

TELEPORT 17 08 4+2
TELEPORT 17 10 1+2

TELEPORT 18 08 4+2
TELEPORT 18 10 1+2

# PLAYER DESCRIPTION
# The player is the in-game avatar of the actual player.
# The player must be declared before any trophy/exit.
# Format: PLAYER row col #RRGGBB

PLAYER 16 09 #177dff


# TROPHY DESCRIPTION
# Trophies are an optional component of the maze. 
# Reaching a trophy wins the game. 
# Trophies can only be placed on the topmost level of the maze.
# If no trophies are set, reaching an exit on the topmost level
# of the maze wins the game. 
# When used, trophies must be declared before any exit.
# Format: TROPHY row col #RRGGBB

TROPHY 01 09 #ff690a

# EXIT DESCRIPTION
# An exit allows the player to move outside the block they are 
# currently in and to leave the maze if there is no trophies.
# Exits must be declared before any link can be made.
# Format: EXIT name orientation row col

EXIT 01 4 03 18
EXIT 02 4 09 18
EXIT 03 4 15 18
EXIT 04 2 18 09
EXIT 05 1 15 00
EXIT 06 1 09 00
EXIT 07 1 03 00


# BLOCK DESCRIPTION
# A block is a copy of the maze within itself.
# Blocks must be declared before any link is added to them.
# Format: BLOCK name row col width height #RRGGBB

BLOCK A 02 02 07 07 #0070ff
BLOCK B 10 10 07 07 #9730ff


# LINK DESCRIPTION
# A link allows the player to move inside a block. 
# A link must be declared after the block it links to. 
# A link can also link to a block inside one block or more. 
# In that case, the chain of blocks must be entirely described,
# separated by '+'.
# Format: LINK block_name[+block_name[+block_name[+...]]] exit_name row col

LINK A 01 03 09
LINK A 04 09 05
LINK A 06 05 01
LINK A 07 03 01

LINK B 02 13 17
LINK B 03 15 17
LINK B 04 17 13
LINK B 05 15 09
LINK B 07 11 09
`}