#pragma once
#include <vector>
#include <cstdint>
#include "Tile.h"

struct Map {
    uint16_t width, height, tile_size;
    uint16_t spawn_x, spawn_y;

    std::vector<Tile> tiles;

    Tile& get(uint16_t x, uint16_t y);
};