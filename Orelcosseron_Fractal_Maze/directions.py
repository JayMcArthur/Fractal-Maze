from enum import Enum


class Direction(Enum):
    NORTH = 8
    EAST = 4
    SOUTH = 2
    WEST = 1

    def opposite(self):
        if self == Direction.NORTH:
            return Direction.SOUTH
        elif self == Direction.EAST:
            return Direction.WEST
        elif self == Direction.SOUTH:
            return Direction.NORTH
        elif self == Direction.WEST:
            return Direction.EAST
