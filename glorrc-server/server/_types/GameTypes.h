#pragma once

#pragma once
#include <cstdint>

struct InputState {
    bool w, a, s, d;
};

struct Player {
    uint16_t id;
    float x, y, oldX, oldY;
    float vx, vy;
    uint8_t health;
    uint8_t maxHealth;
    InputState inputs;
};