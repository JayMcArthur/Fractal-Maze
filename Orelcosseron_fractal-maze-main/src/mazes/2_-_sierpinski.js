module.exports = {
    maze:
        `# This file is used to declare a fractal maze. 
# You can copy it to create a new maze. To help
# you do so, each component of the maze is described
# before being added. You can also add your own
# commentaries by making a line that start with a #. 

# == SIERPINSKI == #
# Adapted from trivialknot's maze at https://skepticsplay.blogspot.com/2014/02/fractal-maze-2-sierpinski-paths.html

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
BACKGROUND_COLOR #f8cf4a
PATH_COLOR #c65223
LINE_COLOR #1023c7

# SIZE DESCRIPTION
# It is possible to set the size of the tiles to adjust the rendering of the 
# maze. The tile's size must be set before declaring any component of the maze. 
# Format: TILE_SIZE size

TILE_SIZE 20

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

# ======== MAZE ======== #
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000000000000000000000000000000000000000000000000
000200020000000200000000000000000000000000000000
041100100000000800000000000000000000000000000000
001000100000000000000000000000000000000000000000
041301100403000000000200000000000000000000000000
000000100010000000001000000000000000000000000000
040505130110040505031201000000000000000000000000
000000000008000002080401000000000000000000000000
040505050505050110040501000000000000000000000000
000000000002000010040501000000000000000000000000
040505050110040511060501000000000000000000000000
000006050513050110080000000000000000000000000000
000008000000040509000000000000000000000000000000
# ====== END MAZE ====== #

# TELEPORT DESCRIPTION
# A teleporter allows the player to move in a direction while skipping a few tiles.
# This is useful e.g for drawing a path that goes under another one.
# Format: TELEPORT row col orientation+reach
# Example: TELEPORT 00 00 4+3 => Teleport from (0,0) to (0,3) (3 tiles east)

TELEPORT 15 02 4+2
TELEPORT 15 04 1+2
TELEPORT 17 04 4+2
TELEPORT 17 06 1+2
TELEPORT 18 08 4+2
TELEPORT 18 10 1+2
TELEPORT 17 10 2+2
TELEPORT 19 10 8+2
TELEPORT 18 05 2+2
TELEPORT 20 05 8+2
TELEPORT 18 09 2+2
TELEPORT 20 09 8+2
TELEPORT 19 07 4+2
TELEPORT 19 09 1+2
TELEPORT 21 04 4+2
TELEPORT 21 06 1+2
TELEPORT 22 07 4+2
TELEPORT 22 09 1+2

# PLAYER DESCRIPTION
# The player is the in-game avatar of the actual player. 
# The player must be declared before any trophy/exit.
# Format: PLAYER row col #RRGGBB

PLAYER 13 07 #101b7a

# TROPHY DESCRIPTION
# Trophies are an optional component of the maze. 
# Reaching a trophy wins the game. 
# Trophies can only be placed on the topmost level of the maze.
# If no trophies are set, reaching an exit on the topmost level
# of the maze wins the game. 
# When used, trophies must be declared before any exit.
# Format: TROPHY row col #RRGGBB

TROPHY 15 10 #6dc738

# EXIT DESCRIPTION
# An exit allows the player to move outside the block they are 
# currently in and to leave the maze if there is no trophies.
# Exits must be declared before any link can be made.
# Format: EXIT name orientation row col

EXIT 01 1 13 00
EXIT 02 1 15 00
EXIT 03 1 17 00
EXIT 04 1 19 00
EXIT 05 1 21 00
EXIT 06 2 23 02
EXIT 07 2 23 06

# BLOCK DESCRIPTION
# A block is a copy of the maze within itself.
# Blocks must be declared before any link is added to them.
# Format: BLOCK name row col width height #RRGGBB

BLOCK UP 00 00 12 12 #f8cf4a
BLOCK RIGHT 12 12 12 12 #f8cf4a

# LINK DESCRIPTION
# A link allows the player to move inside a block. 
# A link must be declared after the block it links to. 
# A link can also link to a block inside one block or more. 
# In that case, the chain of blocks must be entirely described,
# separated by '+'.
# Format: LINK block_name[+block_name[+block_name[+...]]] exit_name row col

LINK UP 06 12 01
LINK UP 07 12 03
LINK UP+RIGHT 07 12 07

LINK RIGHT 01 18 11
LINK RIGHT 02 19 11
LINK RIGHT 03 20 11
LINK RIGHT 04 21 11
LINK RIGHT+UP 05 17 11
`}