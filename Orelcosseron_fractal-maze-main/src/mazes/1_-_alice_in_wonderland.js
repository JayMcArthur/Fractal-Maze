module.exports = {
    maze:
        `# This file is used to declare a fractal maze. 
# You can copy it to create a new maze. To help
# you do so, each component of the maze is described
# before being added. You can also add your own
# commentaries by making a line that start with a #. 

# == ALICE AND THE FRACTAL HEDGE MAZE == #
# Adapted from Mike Earnest's maze at https://puzzling.stackexchange.com/questions/37675/alice-and-the-fractal-hedge-maze

# COLORS
# Some global colors are set to personalize the maze. 
# For now, it is possible to set: 
# - The background color of the upmost level with OUTSIDE_COLOR;
# - The color of the walls with BACKGROUND_COLOR;
# - The color of the path on with PATH_COLOR;
# - The color of the line drawn when the player moves with LINE_COLOR.
# These colors must be set before declaring any component of the maze. 
# Format: COLOR_NAME #RRGGBB

OUTSIDE_COLOR #82be38
BACKGROUND_COLOR #477f1e
PATH_COLOR #b77c44
LINE_COLOR #ff0000

# SIZE DESCRIPTION
# It is possible to set the size of the tiles to adjust the rendering of the 
# maze. The tile's size must be set before declaring any component of the maze. 
# Format: TILE_SIZE size

TILE_SIZE 40

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
06050505050302000000000200
10040505011010000405051102
12010000001010020000000810
00000000000810080000000411
06010000000008000000000409
10020202000405050102000000
08081010040503000010000601
06050908000010000413011000
10000000000411020000001000
10020000000210080000000800
10100000001008000000000000
08140505011205050304050501
00080000000000001205050100
# ====== END MAZE ====== #

# TELEPORT DESCRIPTION
# A teleporter allows the player to move in a direction while skipping a few tiles.
# This is useful e.g for drawing a path that goes under another one.
# Format: TELEPORT row col orientation+reach
# Example: TELEPORT 00 00 4+3 => Teleport from (0,0) to (0,3) (3 tiles east)

TELEPORT 06 02 4+2
TELEPORT 06 04 1+2
TELEPORT 06 01 2+2
TELEPORT 08 01 8+2
TELEPORT 05 01 4+2
TELEPORT 05 03 1+2
TELEPORT 05 08 4+2
TELEPORT 05 10 1+2
TELEPORT 04 06 2+2
TELEPORT 06 06 8+2
TELEPORT 05 05 2+2
TELEPORT 07 05 8+2
TELEPORT 07 05 2+2
TELEPORT 09 05 8+2
TELEPORT 10 05 4+2
TELEPORT 10 07 1+2
TELEPORT 10 06 2+2
TELEPORT 12 06 8+2

# PLAYER DESCRIPTION
# The player is the in-game avatar of the actual player. 
# The player must be declared before any trophy/exit.
# Format: PLAYER row col #RRGGBB

PLAYER 01 01 #0000ff

# TROPHY DESCRIPTION
# Trophies are an optional component of the maze. 
# Reaching a trophy wins the game. 
# Trophies can only be placed on the topmost level of the maze.
# If no trophies are set, reaching an exit on the topmost level
# of the maze wins the game. 
# When used, trophies must be declared before any exit.
# Format: TROPHY row col #RRGGBB



# EXIT DESCRIPTION
# An exit allows the player to move outside the block they are 
# currently in and to leave the maze if there is no trophies.
# Exits must be declared before any link can be made.
# Format: EXIT name orientation row col

EXIT 01 8 00 01
EXIT 02 8 00 06
EXIT 03 8 00 11
EXIT 04 4 01 12
EXIT 05 4 06 12
EXIT 06 4 11 12
EXIT 07 2 12 11
EXIT 08 2 12 06
EXIT 09 2 12 01
EXIT 10 1 11 00
EXIT 11 1 06 00
EXIT 12 1 01 00

# BLOCK DESCRIPTION
# A block is a copy of the maze within itself.
# Blocks must be declared before any link is added to them.
# Format: BLOCK name row col width height #RRGGBB

BLOCK A 02 02 03 03 #fff7ac
BLOCK B 02 08 03 03 #a3d0e7
BLOCK C 08 02 03 03 #daa5c1
BLOCK D 08 08 03 03 #cbcbcb

# LINK DESCRIPTION
# A link allows the player to move inside a block. 
# A link must be declared after the block it links to. 
# A link can also link to a block inside one block or more. 
# In that case, the chain of blocks must be entirely described,
# separated by '+'.
# Format: LINK block_name[+block_name[+block_name[+...]]] exit_name row col

LINK A 03 01 04
LINK A 05 03 05
LINK A 09 05 02
LINK A 10 04 01
LINK A 12 02 01

LINK B 01 01 08
LINK B 04 02 11
LINK B 05 03 11
LINK B 06 04 11
LINK B 07 05 10
LINK B 08 05 09
LINK B 11 03 07
LINK B 12 02 07

LINK C 02 07 03
LINK C 04 08 05
LINK C 07 11 04
LINK C 11 09 01
LINK C 12 08 01

LINK D 01 07 08
LINK D 03 07 10
LINK D 04 08 11
LINK D 05 09 11
LINK D 08 11 09
LINK D 10 10 07
LINK D 11 09 07
LINK D 12 08 07
`}