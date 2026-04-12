#include "MapLoader.h"
#include <fstream>
#include <stdexcept>

// Decode a tile from 2 bytes (uint16)
static Tile decode_tile(uint16_t value) {
    Tile t;
    t.texture = value & 0b11111;
    t.rotation = (value >> 5) & 0b11;
    t.underlay = (value >> 7) & 0b11111;
    return t;
}

Map MapLoader::load_map(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("Failed to open file: " + path);

    Map map;

    // Header (same as encoder: uint16_t each)
    file.read(reinterpret_cast<char*>(&map.width), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.height), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.tile_size), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.spawn_x), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.spawn_y), sizeof(uint16_t));

    if (!file) throw std::runtime_error("Failed reading map header");

    size_t tileCount = map.width * map.height;
    map.tiles.resize(tileCount);

    // NOW READ 2 BYTES PER TILE
    for (size_t i = 0; i < tileCount; ++i) {
        uint16_t value;
        file.read(reinterpret_cast<char*>(&value), sizeof(uint16_t));

        if (!file) throw std::runtime_error("Failed reading tile data");

        map.tiles[i] = decode_tile(value);
    }

    return map;
}