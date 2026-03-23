// Map.cpp
#include "Map.h"

// Constructor: initialize all tiles to type 0 (floor) with rotation 0
Map::Map(int w, int h) : width(w), height(h), tiles(w* h, 0) {}

// Get the raw packed tile byte
uint8_t Map::getTile(int x, int y) const {
    return tiles[index(x, y)];
}

// Get tile type (lower 4 bits)
uint8_t Map::getTileType(int x, int y) const {
    return tiles[index(x, y)] & 0x0F;
}

// Get tile rotation (next 2 bits)
uint8_t Map::getTileRotation(int x, int y) const {
    return (tiles[index(x, y)] >> 4) & 0x03;
}

// Set tile type and rotation
void Map::setTile(int x, int y, uint8_t type, uint8_t rotation) {
    tiles[index(x, y)] = ((rotation & 0x03) << 4) | (type & 0x0F);
}
