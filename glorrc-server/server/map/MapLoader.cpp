#include "MapLoader.h"
#include "../DataStructs.h"
#include <fstream>
#include <stdexcept>

// Decode a tile from 1 byte (ignore top bit)
static Tile decode_tile(uint8_t byte) {
    Tile t;
    t.rotation = (byte >> 5) & 0b11;  // bits 6-5
    t.texture = byte & 0b11111;      // bits 4-0
    return t;
}

Map MapLoader::load_map(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("Failed to open file: " + path);

    Map map;

    // Header
    file.read(reinterpret_cast<char*>(&map.width), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.height), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.tile_size), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.spawn_x), sizeof(uint16_t));
    file.read(reinterpret_cast<char*>(&map.spawn_y), sizeof(uint16_t));

    if (!file) throw std::runtime_error("Failed reading map header");

    // Allocate tiles
    size_t tileCount = map.width * map.height;
    map.tiles.resize(tileCount);

    // Read tiles
    for (size_t i = 0; i < tileCount; ++i) {
        uint8_t byte;
        file.read(reinterpret_cast<char*>(&byte), sizeof(uint8_t));
        if (!file) throw std::runtime_error("Failed reading tile data");

        map.tiles[i] = decode_tile(byte);
    }

    return map;
}