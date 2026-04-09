#pragma once
#include <cstdint>
#include <vector>

struct InputState {
    bool w = false;
    bool a = false;
    bool s = false;
    bool d = false;
};

struct Player {
    uint32_t id;
    float x = 0;
    float y = 0;
    float vx = 0;
    float vy = 0;
    uint8_t health;
    uint8_t maxHealth;
    InputState inputs;
};

struct Tile {
    uint8_t texture;   // 0–31
    uint8_t rotation;  // 0–3
    // bool solid;      // Removed
};

struct Map {
    uint16_t width, height, tile_size;
    uint16_t spawn_x, spawn_y;

    std::vector<Tile> tiles; // size = width * height

    // Helper to access tiles like grid
    Tile& get(uint16_t x, uint16_t y) {
        return tiles[y * width + x];
    }
};