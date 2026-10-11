(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,45243,(e,t,i)=>{t.exports={maze:`# This file is used to declare a fractal maze. 
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
`}},77092,(e,t,i)=>{t.exports={maze:`# This file is used to declare a fractal maze. 
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
`}},65213,(e,t,i)=>{t.exports={maze:`# This file is used to declare a fractal maze. 
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
`}},40993,(e,t,i)=>{t.exports={maze:`# This file is used to declare a fractal maze. 
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
`}},31713,e=>{"use strict";var t=e.i(43476),i=e.i(71645);let o=(0,i.createContext)(void 0),s=(0,i.createContext)(void 0);function l(){let e=(0,i.useContext)(o),l=(0,i.useContext)(s);return e&&l?(0,t.jsxs)("div",{className:"pad",children:[(0,t.jsx)("div",{children:(0,t.jsx)("button",{id:"pad_button",onClick:()=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowUp"}))},style:{width:l.tile_size/2,height:l.tile_size/2},children:"▲"})}),(0,t.jsxs)("div",{className:"pad_middle_row",style:{width:3*l.tile_size/2},children:[(0,t.jsx)("button",{id:"pad_button",onClick:()=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowLeft"}))},style:{width:l.tile_size/2,height:l.tile_size/2},children:"◀"}),(0,t.jsx)("button",{id:"pad_button",onClick:()=>{e.blockStack.forEach((t,i)=>{setTimeout(()=>{e.setBlockStack(e=>e.length>1?e.slice(0,-1):e)},350*i)}),e.setPlayerPos({row:l.player.row,col:l.player.col}),e.setPrevPlayerPos({row:l.player.row,col:l.player.col}),setTimeout(()=>{e.setLines({}),e.setIsWin(!1)},350*e.blockStack.length+50)},style:{width:l.tile_size/2,height:l.tile_size/2},children:"⟲"}),(0,t.jsx)("button",{id:"pad_button",onClick:()=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight"}))},style:{width:l.tile_size/2,height:l.tile_size/2},children:"▶"})]}),(0,t.jsx)("div",{children:(0,t.jsx)("button",{id:"pad_button",onClick:()=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown"}))},style:{width:l.tile_size/2,height:l.tile_size/2},children:"▼"})})]}):(0,t.jsx)(t.Fragment,{})}function a({children:e}){let a=(0,i.useContext)(o),r=(0,i.useContext)(s);return a&&r&&(0,t.jsxs)("section",{style:{width:r.tile_size*(r.rows[0].length/2+.5)},children:[!a.isWin&&(0,t.jsxs)("h1",{id:"hud",children:["Position: ",a.blockStack.join("←")]}),a.isWin&&(0,t.jsxs)("h1",{id:"hud",children:["Congratulations, you ",r.trophies.length>0?r.trophies.length>1?"reached one of the goals":"reached the goal":"escaped","!"]}),e,(0,t.jsx)(l,{})]})}function r({row:e,col:l,stack:a=[]}){let r=(0,i.useContext)(s),n=(0,i.useContext)(o);if(r&&n){let o=e=>{let t=h.split(".");return e.reduce((i,o,s)=>i&&o==t[t.length-e.length+s],!0)},[s,c]=(0,i.useState)(!1),[h,d]=(0,i.useState)(a.length>0?"0."+a.join("."):"0"),T=parseInt(r.rows[e].slice(2*l,2*l+2)),m=r.teleporters[e]&&r.teleporters[e][l]?r.teleporters[e][l]:{signature:0,reach:{}},p=0;r.links[e]&&r.links[e][l]&&r.links[e][l].forEach(e=>{let t=r.exits[e.exit]?.orientation;1==t?p|=4:2==t?p|=8:4==t?p|=1:8==t&&(p|=2)});let f=0;for(let[t,i]of Object.entries(r.exits)){let s=n.blockStack.length+a.length,c=a.length>0?a[a.length-1]:n.blockStack[n.blockStack.length-1];(1==s&&0==r.trophies.length||s>1&&r.blocks[c]&&r.blocks[c].exits[t]&&o(r.blocks[c].exits[t].path))&&i&&i.row==e&&i.col==l&&(f|=i.orientation)}let E=r.player.row==e&&r.player.col==l,b=!1;for(let t of r.trophies)if(t.row==e&&t.col==l){b=!0;break}let g=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/4,height:r.tile_size/2,position:"absolute",marginLeft:0,marginTop:1/4*r.tile_size}}),u=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/4,position:"absolute",marginLeft:r.tile_size/4,marginTop:3/4*r.tile_size}}),L=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/4,height:r.tile_size/2,position:"absolute",marginLeft:3/4*r.tile_size,marginTop:1/4*r.tile_size}}),O=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/4,position:"absolute",marginLeft:r.tile_size/4,marginTop:0}}),w=(0,t.jsx)("div",{style:{background:"linear-gradient(to left, "+r.path_color+", oklch(from "+r.path_color+" clamp(0, l - 0.2, 1) c h))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/4,zIndex:2}}),_=(0,t.jsx)("div",{style:{background:"linear-gradient(to bottom, "+r.path_color+", oklch(from "+r.path_color+" clamp(0, l - 0.2, 1) c h))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:3/4*r.tile_size,zIndex:2}}),z=(0,t.jsx)("div",{style:{background:"linear-gradient(to right, "+r.path_color+", oklch(from "+r.path_color+" clamp(0, l - 0.2, 1) c h))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:3/4*r.tile_size,marginTop:r.tile_size/4,zIndex:2}}),I=(0,t.jsx)("div",{style:{background:"linear-gradient(to top, "+r.path_color+", oklch(from "+r.path_color+" clamp(0, l - 0.2, 1) c h))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:-r.tile_size/4,zIndex:2}}),R=(0,t.jsx)("div",{style:{background:"linear-gradient(to left, "+r.path_color+", rgb(from "+r.path_color+" r g b / 0))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/4,zIndex:2}}),P=(0,t.jsx)("div",{style:{background:"linear-gradient(to bottom, "+r.path_color+", rgb(from "+r.path_color+" r g b / 0))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:3/4*r.tile_size,zIndex:2}}),y=(0,t.jsx)("div",{style:{background:"linear-gradient(to right, "+r.path_color+", rgb(from "+r.path_color+" r g b / 0))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:3/4*r.tile_size,marginTop:r.tile_size/4,zIndex:2}}),k=(0,t.jsx)("div",{style:{background:"linear-gradient(to top, "+r.path_color+", rgb(from "+r.path_color+" r g b / 0))",width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:-r.tile_size/4,zIndex:2}}),x=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/4,zIndex:2}},"pathExit"),v=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:3/4*r.tile_size,zIndex:2}},"pathExit"),N=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:3/4*r.tile_size,marginTop:r.tile_size/4,zIndex:2}},"pathExit"),C=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:-r.tile_size/4,zIndex:2}},"pathExit"),A=(0,t.jsx)("div",{style:{background:r.background_color,width:r.tile_size/4,height:r.tile_size,position:"absolute",marginLeft:-r.tile_size/4,marginTop:0,zIndex:2}},"backgroundExit"),S=(0,t.jsx)("div",{style:{background:r.background_color,width:r.tile_size,height:r.tile_size/4,position:"absolute",marginLeft:0,marginTop:r.tile_size,zIndex:2}},"backgroundExit"),K=(0,t.jsx)("div",{style:{background:r.background_color,width:r.tile_size/4,height:r.tile_size,position:"absolute",marginLeft:r.tile_size,marginTop:0,zIndex:2}},"backgroundExit"),j=(0,t.jsx)("div",{style:{background:r.background_color,width:r.tile_size,height:r.tile_size/4,position:"absolute",marginLeft:0,marginTop:-r.tile_size/4,zIndex:2}},"backgroundExit"),B=(0,t.jsx)("div",{style:{background:r.path_color,width:r.tile_size/2,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/4,marginTop:r.tile_size/4}}),D=(0,t.jsx)("div",{style:{background:r.path_color,width:+r.tile_size,height:+r.tile_size,position:"absolute",borderRadius:r.tile_size/2,marginLeft:0*r.tile_size/2,marginTop:0*r.tile_size/2}}),X=(0,t.jsx)("div",{style:{background:r.line_color,width:r.tile_size/2,height:1,position:"absolute",marginLeft:0,marginTop:r.tile_size/2,zIndex:3}}),F=(0,t.jsx)("div",{style:{background:r.line_color,width:1,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),G=(0,t.jsx)("div",{style:{background:r.line_color,width:r.tile_size/2,height:1,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),Y=(0,t.jsx)("div",{style:{background:r.line_color,width:1,height:r.tile_size/2,position:"absolute",marginLeft:r.tile_size/2,marginTop:0,zIndex:3}}),U=(0,t.jsx)("div",{style:{background:"linear-gradient(to left, "+r.line_color+", oklch(from "+r.line_color+" clamp(0, l - 0.2, 1) c h))",width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/2,zIndex:3}}),H=(0,t.jsx)("div",{style:{background:"linear-gradient(to bottom, "+r.line_color+", oklch(from "+r.line_color+" clamp(0, l - 0.2, 1) c h))",width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),Z=(0,t.jsx)("div",{style:{background:"linear-gradient(to right, "+r.line_color+", oklch(from "+r.line_color+" clamp(0, l - 0.2, 1) c h))",width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),W=(0,t.jsx)("div",{style:{background:"linear-gradient(to top, "+r.line_color+", oklch(from "+r.line_color+" clamp(0, l - 0.2, 1) c h))",width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:-r.tile_size/4,zIndex:3}}),M=(0,t.jsx)("div",{style:{background:"linear-gradient(to left, "+r.line_color+", rgb(from "+r.line_color+" r g b / 0))",width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/2,zIndex:3}}),V=(0,t.jsx)("div",{style:{background:"linear-gradient(to bottom, "+r.line_color+", rgb(from "+r.line_color+" r g b / 0))",width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),q=(0,t.jsx)("div",{style:{background:"linear-gradient(to right, "+r.line_color+", rgb(from "+r.line_color+" r g b / 0))",width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),J=(0,t.jsx)("div",{style:{background:"linear-gradient(to top, "+r.line_color+", rgb(from "+r.line_color+" r g b / 0))",width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:-r.tile_size/4,zIndex:3}}),Q=(0,t.jsx)("div",{style:{background:r.line_color,width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:-r.tile_size/4,marginTop:r.tile_size/2,zIndex:3}}),$=(0,t.jsx)("div",{style:{background:r.line_color,width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),ee=(0,t.jsx)("div",{style:{background:r.line_color,width:3*r.tile_size/4,height:1,position:"absolute",marginLeft:r.tile_size/2,marginTop:r.tile_size/2,zIndex:3}}),et=(0,t.jsx)("div",{style:{background:r.line_color,width:1,height:3*r.tile_size/4,position:"absolute",marginLeft:r.tile_size/2,marginTop:-r.tile_size/4,zIndex:3}}),ei=(1&T)!=0?X:(1&m.signature)!=0?U:(1&p)!=0?M:(1&f)!=0?Q:null,eo=(2&T)!=0?F:(2&m.signature)!=0?H:(2&p)!=0?V:(2&f)!=0?$:null,es=(4&T)!=0?G:(4&m.signature)!=0?Z:(4&p)!=0?q:(4&f)!=0?ee:null,el=(8&T)!=0?Y:(8&m.signature)!=0?W:(8&p)!=0?J:(8&f)!=0?et:null,ea=(1&T)!=0?g:(1&m.signature)!=0?w:(1&p)!=0?R:(1&f)!=0?[A,x]:null,er=(2&T)!=0?u:(2&m.signature)!=0?_:(2&p)!=0?P:(2&f)!=0?[S,v]:null,en=(4&T)!=0?L:(4&m.signature)!=0?z:(4&p)!=0?y:(4&f)!=0?[K,N]:null,ec=(8&T)!=0?O:(8&m.signature)!=0?I:(8&p)!=0?k:(8&f)!=0?[j,C]:null;return(0,i.useEffect)(()=>{if(0==a.length&&(s||n.playerPos.row==e&&n.playerPos.col==l)){if(n.playerPos.row==e&&n.playerPos.col==l&&b&&1==n.blockStack.length)return void n.setIsWin(!0);let t=n.lines;t[h]||(t[h]={}),t[h][e]||(t[h][e]={}),t[h][e][l]||(t[h][e][l]={w:!1,s:!1,e:!1,n:!1});let i=s?n.playerPos.row:n.prevPlayerPos.row,o=s?n.playerPos.col:n.prevPlayerPos.col;i-e==0&&o-l<0?(t[h][e][l].w=!t[h][e][l].w,n.setLines(t)):i-e>0&&o-l==0?(t[h][e][l].s=!t[h][e][l].s,n.setLines(t)):i-e==0&&o-l>0?(t[h][e][l].e=!t[h][e][l].e,n.setLines(t)):i-e<0&&o-l==0&&(t[h][e][l].n=!t[h][e][l].n,n.setLines(t))}c(n.playerPos.row==e&&n.playerPos.col==l)},[n.playerPos]),(0,i.useEffect)(()=>{d(n.blockStack.concat(a).join("."))},[n.blockStack]),(0,t.jsxs)("div",{style:{position:"absolute",marginLeft:(l+1/4)*r.tile_size,marginTop:(e+1/4)*r.tile_size,background:r.background_color,width:r.tile_size,height:r.tile_size},children:[ea,er,en,ec,(T|m.signature|p|f)!=0&&B,(E||b)&&D,n.lines[h]&&n.lines[h][e]&&n.lines[h][e][l]&&n.lines[h][e][l].w&&ei,n.lines[h]&&n.lines[h][e]&&n.lines[h][e][l]&&n.lines[h][e][l].s&&eo,n.lines[h]&&n.lines[h][e]&&n.lines[h][e][l]&&n.lines[h][e][l].e&&es,n.lines[h]&&n.lines[h][e]&&n.lines[h][e][l]&&n.lines[h][e][l].n&&el]})}return(0,t.jsx)(t.Fragment,{})}function n({name:e,stack:o=[]}){let l=(0,i.useContext)(s);if(l&&l.blocks[e]){let i=l.blocks[e].height/(l.rows.length+.5);return(0,t.jsx)("div",{style:{backgroundColor:l.blocks[e].color,width:l.blocks[e].width*l.tile_size,height:l.blocks[e].height*l.tile_size,position:"absolute",marginLeft:(l.blocks[e].col+1/4)*l.tile_size,marginTop:(l.blocks[e].row+1/4)*l.tile_size,zIndex:2},children:o.length<2&&(0,t.jsxs)("div",{style:{transform:"scale("+i+")",transformOrigin:"top left"},children:[l.rows.map((i,s)=>i.match(/.{2}/g)?.map((i,l)=>(0,t.jsx)(r,{row:s,col:l,stack:o.concat([e])},s.toString()+"."+l.toString()))),Object.keys(l.blocks).map(i=>(0,t.jsx)(n,{name:i,stack:o.concat([e])},i))]})})}return(0,t.jsx)(t.Fragment,{})}function c(){let e=(0,i.useContext)(s),l=(0,i.useContext)(o),[a,r]=(0,i.useState)({isActive:!1,transition:"",visibility:"visible"});return e&&l?((0,i.useEffect)(()=>{l.setPlayerPos({row:e.player.row,col:e.player.col}),l.setPrevPlayerPos({row:e.player.row,col:e.player.col}),l.setBlockStack(["0"]),l.setLines({}),l.setIsWin(!1)},[e]),(0,i.useEffect)(()=>{let t=t=>{if(l.isWin||a.isActive)return;let i={ArrowLeft:{orientation:1,rowOffset:0,colOffset:-1},ArrowDown:{orientation:2,rowOffset:1,colOffset:0},ArrowRight:{orientation:4,rowOffset:0,colOffset:1},ArrowUp:{orientation:8,rowOffset:-1,colOffset:0}};if(t.key in i){let o=l.playerPos.row,s=l.playerPos.col,a=parseInt(e.rows[l.playerPos.row].slice(2*l.playerPos.col,2*l.playerPos.col+2));for(let[e,o]of Object.entries(i))if(t.key==e&&a&o.orientation){r({isActive:!0,transition:"transform 0.1s linear",visibility:"visible"}),l.setPrevPlayerPos(l.playerPos),l.setPlayerPos(e=>({row:e.row+o.rowOffset,col:e.col+o.colOffset})),setTimeout(()=>{r({isActive:!1,transition:"",visibility:"visible"})},100);return}if(e.teleporters[o]&&e.teleporters[o][s]){let a=e.teleporters[o][s].signature;for(let[n,c]of Object.entries(i))if(t.key==n&&a&c.orientation){let t=c.orientation;if(e.teleporters[o]&&e.teleporters[o][s]&&e.teleporters[o][s].reach[t]){let i=e.teleporters[o][s].reach[t];r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos(l.playerPos),l.setPlayerPos(e=>({row:e.row+.75*c.rowOffset,col:e.col+.75*c.colOffset})),setTimeout(()=>{r({isActive:!0,transition:"",visibility:"hidden"}),l.setPrevPlayerPos(e=>({row:e.row+.75*c.rowOffset,col:e.col+.75*c.colOffset})),l.setPlayerPos({row:o+c.rowOffset*(i-.75),col:s+c.colOffset*(i-.75)})},75),setTimeout(()=>{r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos({row:o+c.rowOffset*(i-.75),col:s+c.colOffset*(i-.75)}),l.setPlayerPos({row:o+c.rowOffset*i,col:s+c.colOffset*i})},100*i-75),setTimeout(()=>{r({isActive:!1,transition:"",visibility:"visible"})},100*i);return}}}if(e.links[o]&&e.links[o][s])for(let a of e.links[o][s]){let o=e.exits[a.exit];for(let[e,s]of Object.entries(i))if(t.key==e&&o&&o.orientation==4*s.orientation%15){r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos(l.playerPos),l.setPlayerPos(e=>({row:e.row+.75*s.rowOffset,col:e.col+.75*s.colOffset})),setTimeout(()=>{r({isActive:!0,transition:"",visibility:"hidden"}),l.setPrevPlayerPos(e=>({row:e.row+.75*s.rowOffset,col:e.col+.75*s.colOffset})),l.setPlayerPos({row:o.row-.75*s.rowOffset,col:o.col-.75*s.colOffset})},75),setTimeout(()=>{a.block.forEach((e,t)=>setTimeout(()=>l.setBlockStack(t=>[...t,e]),350*t))},100),setTimeout(()=>{r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos({row:o.row-.75*s.rowOffset,col:o.col-.75*s.colOffset}),l.setPlayerPos({row:o.row,col:o.col})},125+350*a.block.length),setTimeout(()=>{r({isActive:!1,transition:"",visibility:"visible"})},200+350*a.block.length);return}}let n=l.blockStack.length>1?e.blocks[l.blockStack[l.blockStack.length-1]]:null;e:for(let[o,s]of Object.entries(e.exits))if(s&&s.row==l.playerPos.row&&s.col==l.playerPos.col){if(n&&n.exits[o]&&n.exits[o].path.reduce((e,t,i)=>e&&t==l.blockStack[l.blockStack.length-n.exits[o].path.length+i],!0)){let e=n.exits[o];for(let[o,a]of Object.entries(i))if(t.key==o&&s.orientation==a.orientation){r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos(l.prevPlayerPos),l.setPlayerPos(e=>({row:e.row+.75*a.rowOffset,col:e.col+.75*a.colOffset})),setTimeout(()=>{r({isActive:!0,transition:"",visibility:"hidden"}),l.setPrevPlayerPos(e=>({row:e.row+.75*a.rowOffset,col:e.col+.75*a.colOffset})),l.setPlayerPos({row:e.row-.75*a.rowOffset,col:e.col-.75*a.colOffset})},75),setTimeout(()=>{e.path.forEach((e,t)=>setTimeout(()=>l.setBlockStack(e=>e.slice(0,-1)),350*t))},100),setTimeout(()=>{r({isActive:!0,transition:"transform 0.075s linear",visibility:"visible"}),l.setPrevPlayerPos({row:e.row-.75*a.rowOffset,col:e.col-.75*a.colOffset}),l.setPlayerPos({row:e.row,col:e.col})},125+350*e.path.length),setTimeout(()=>{r({isActive:!1,transition:"",visibility:"visible"})},200+350*e.path.length);break e}}else if(null===n&&0==e.trophies.length){for(let[e,o]of Object.entries(i))if(t.key==e&&s.orientation==o.orientation){r({isActive:!0,transition:"transform 0.1s linear",visibility:"visible"}),l.setPrevPlayerPos(l.playerPos),l.setPlayerPos(e=>({row:e.row+o.rowOffset,col:e.col+o.colOffset})),setTimeout(()=>{r({isActive:!1,transition:"",visibility:"visible"}),l.setIsWin(!0)},100);break e}}}}};return document.addEventListener("keydown",t),()=>{document.removeEventListener("keydown",t)}},[e,l,a]),(0,t.jsx)("div",{className:"player",style:{position:"absolute",transform:"translate("+(l.playerPos.col+3/4-.125)*e.tile_size+"px, "+(l.playerPos.row+3/4-.125)*e.tile_size+"px)",background:e.player.color,width:.25*e.tile_size,height:.25*e.tile_size,borderRadius:.25*e.tile_size/2,zIndex:4,visibility:a.visibility,transition:a.transition}})):(0,t.jsx)(t.Fragment,{})}function h({children:e}){let l=(0,i.useContext)(s),a=(0,i.useContext)(o),[r,n]=(0,i.useState)({zoom:1,transition:"",translateRight:0,translateBottom:0,origin:"center"}),[c,h]=(0,i.useState)(["0"]),[d,T]=(0,i.useState)("white");if(a&&l&&l.rows&&l.rows[0]){let o=(l.rows[0].length/4+1/4)*l.tile_size,s=(l.rows.length/2+1/4)*l.tile_size;return(0,i.useEffect)(()=>{if(a.blockStack.length>0){if("0"==a.blockStack[a.blockStack.length-1])T(l.outside_color);else for(let[e,t]of Object.entries(l.blocks))if(t&&e==a.blockStack[a.blockStack.length-1]){setTimeout(()=>{T(t.color)},300);break}if(c.length<a.blockStack.length){let e=l.blocks[a.blockStack[a.blockStack.length-1]];if(e){let t=(e.col+1/4+e.width/2)*l.tile_size,i=(e.row+1/4+e.height/2)*l.tile_size;n({zoom:(l.rows.length+.5)/e.height,transition:"transform 0.3s",translateRight:o-t,translateBottom:s-i,origin:t+"px "+i+"px"}),setTimeout(()=>{n({zoom:1,transition:"",translateRight:0,translateBottom:0,origin:"center"})},350)}}else if(c.length>a.blockStack.length){let e=l.blocks[c[c.length-1]];if(e){let t=(e.col+1/4+e.width/2)*l.tile_size,i=(e.row+1/4+e.height/2)*l.tile_size;n({zoom:(l.rows.length+.5)/e.height,transition:"",translateRight:o-t,translateBottom:s-i,origin:t+"px "+i+"px"}),setTimeout(()=>{n({zoom:1,transition:"transform 0.3s",translateRight:0,translateBottom:0,origin:t+"px "+i+"px"})},50),setTimeout(()=>{n({zoom:1,transition:"",translateRight:0,translateBottom:0,origin:"center"})},350)}}h(a.blockStack)}},[a.blockStack]),(0,t.jsx)("div",{style:{transform:"translate("+r.translateRight+"px, "+r.translateBottom+"px)",transition:r.transition},children:(0,t.jsxs)("div",{style:{transform:"scale("+r.zoom+")",transition:r.transition,transformOrigin:r.origin},children:[(0,t.jsx)("div",{style:{position:"absolute",border:l.tile_size/4+"px solid "+d,width:l.tile_size*(l.rows[0].length/2+.5),height:l.tile_size*(l.rows.length+.5),zIndex:2}}),e]})})}return(0,t.jsx)(t.Fragment,{})}function d({id:e}){let l=(0,i.useContext)(s),a=(0,i.useContext)(o);if(l&&a){let i=l.trophies[e];if(1==a.blockStack.length)return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{style:{position:"absolute",marginLeft:(i.col+3/4-.4)*l.tile_size,marginTop:(i.row+3/4-.2)*l.tile_size,border:"1px solid "+i.color,width:.8*l.tile_size,height:.8*l.tile_size/2,borderRadius:.8*l.tile_size/2,zIndex:4,animation:"0.75s infinite trophy_1",animationTimingFunction:"linear"}}),(0,t.jsx)("div",{style:{position:"absolute",marginLeft:(i.col+3/4-.4)*l.tile_size,marginTop:(i.row+3/4-.2)*l.tile_size,border:"1px solid "+i.color,width:.8*l.tile_size,height:.8*l.tile_size/2,borderRadius:.8*l.tile_size/2,zIndex:4,animation:"0.75s infinite trophy_2",animationTimingFunction:"linear"}}),(0,t.jsx)("div",{style:{position:"absolute",marginLeft:(i.col+3/4-.4)*l.tile_size,marginTop:(i.row+3/4-.2)*l.tile_size,border:"1px solid "+i.color,width:.8*l.tile_size,height:.8*l.tile_size/2,borderRadius:.8*l.tile_size/2,zIndex:4,animation:"0.75s infinite trophy_3",animationTimingFunction:"linear"}}),(0,t.jsx)("div",{style:{position:"absolute",marginLeft:(i.col+3/4-.4)*l.tile_size,marginTop:(i.row+3/4-.2)*l.tile_size,border:"1px solid "+i.color,width:.8*l.tile_size,height:.8*l.tile_size/2,borderRadius:.8*l.tile_size/2,zIndex:4,animation:"0.75s infinite trophy_4",animationTimingFunction:"linear"}})]})}return(0,t.jsx)(t.Fragment,{})}function T(){let e=(0,i.useContext)(s);return e?(0,t.jsx)("div",{className:"maze",style:{width:e.tile_size*(e.rows[0].length/2+.5),height:e.tile_size*(e.rows.length+.5)},children:(0,t.jsxs)(h,{children:[Object.keys(e.blocks).map(e=>(0,t.jsx)(n,{name:e},e)),(0,t.jsx)(c,{}),e.trophies.map((e,i)=>(0,t.jsx)(d,{id:i},i)),e.rows.map((e,i)=>e.match(/.{2}/g)?.map((e,o)=>(0,t.jsx)(r,{row:i,col:o},i.toString()+"."+o.toString())))]})}):(0,t.jsx)(t.Fragment,{})}function m({onChange:o}){let[s,l]=(0,i.useState)([]);(0,i.useEffect)(()=>{l(e.r(32150).mazes)},[]),(0,i.useEffect)(()=>{s.length>0&&o(s[0])},[s]);let a=(0,i.useRef)(null);return(0,t.jsx)("section",{children:(0,t.jsx)("select",{ref:a,name:"level_select",id:"level_select",onChange:function(e){o(e.target.value),a.current.blur()},children:s.map(e=>(0,t.jsx)("option",{value:e,children:e},e))})})}function p(){let[l,r]=(0,i.useState)(""),[n,c]=(0,i.useState)(["0"]),[h,d]=(0,i.useState)({row:0,col:0}),[p,f]=(0,i.useState)({row:0,col:0}),[E,b]=(0,i.useState)({}),[g,u]=(0,i.useState)(!1),[L,O]=(0,i.useState)(void 0);return(0,i.useEffect)(()=>{l&&O(function(t){try{let i=e.f({"./mazes/1_-_alice_in_wonderland.js":{id:()=>45243,module:()=>e.r(45243)},"./mazes/2_-_sierpinski.js":{id:()=>77092,module:()=>e.r(77092)},"./mazes/3_-_microchip.js":{id:()=>65213,module:()=>e.r(65213)},"./mazes/4_-_square.js":{id:()=>40993,module:()=>e.r(40993)}})("./mazes/"+t+".js").maze,o=0,s="white",l="white",a="white",r="white",n={},c={},h={},d={},T={row:0,col:0,color:""},m=[],p=[];for(let e of i.split("\n"))if(e=e.trim(),""!=e&&"#"!=e[0]){if("TILE_SIZE"==e.slice(0,9)){o=parseInt(e.split(" ")[1]);continue}if("OUTSIDE_COLOR"==e.slice(0,13)){s=e.split(" ")[1];continue}if("BACKGROUND_COLOR"==e.slice(0,16)){l=e.split(" ")[1];continue}if("PATH_COLOR"==e.slice(0,10)){a=e.split(" ")[1];continue}if("LINE_COLOR"==e.slice(0,10)){r=e.split(" ")[1];continue}if("TELEPORT"==e.slice(0,8)){let t=e.split(" "),i=t[3].split("+"),o=parseInt(t[1]),s=parseInt(t[2]);o in n||(n[o]={}),!n[o]||s in n[o]||(n[o][s]={signature:0,reach:{}}),n[o]&&n[o][s]&&(n[o][s].signature+=parseInt(i[0]),n[o][s].reach[parseInt(i[0])]=parseInt(i[1]));continue}if("BLOCK"==e.slice(0,5)){let t=e.split(" ");c[t[1]]={row:parseInt(t[2]),col:parseInt(t[3]),width:parseInt(t[4]),height:parseInt(t[5]),color:t[6],exits:{}};continue}if("LINK"==e.slice(0,4)){let t=e.split(" "),i=t[1].split("+"),o=parseInt(t[3]),s=parseInt(t[4]);h[o]||(h[o]={}),h[o][s]||(h[o][s]=[]),h[o][s].push({block:i,exit:t[2]});let l=i[i.length-1];c[l]&&(c[l].exits[t[2]]={row:o,col:s,path:i});continue}if("EXIT"==e.slice(0,4)){let t=e.split(" ");d[t[1]]={orientation:parseInt(t[2]),row:parseInt(t[3]),col:parseInt(t[4])};continue}if("PLAYER"==e.slice(0,6)){let t=e.split(" ");T={row:parseInt(t[1]),col:parseInt(t[2]),color:t[3]};continue}if("TROPHY"==e.slice(0,6)){let t=e.split(" ");m.push({row:parseInt(t[1]),col:parseInt(t[2]),color:t[3]});continue}p.push(e)}return{tile_size:o,outside_color:s,background_color:l,path_color:a,line_color:r,teleporters:n,blocks:c,links:h,exits:d,player:T,trophies:m,rows:p}}catch(e){return alert(e),{tile_size:0,outside_color:"",background_color:"",path_color:"",line_color:"",teleporters:{},blocks:{},links:{},exits:{},player:{row:0,col:0,color:""},trophies:[],rows:[]}}}(l.toLowerCase().replaceAll(" ","_")))},[l]),(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(m,{onChange:e=>r(e)}),(0,t.jsx)(o,{value:{blockStack:n,setBlockStack:c,playerPos:h,setPlayerPos:d,prevPlayerPos:p,setPrevPlayerPos:f,lines:E,setLines:b,isWin:g,setIsWin:u},children:(0,t.jsx)(s,{value:L,children:(0,t.jsx)(a,{children:L&&(0,t.jsx)(T,{})})})})]})}e.s(["default",()=>p],31713)}]);