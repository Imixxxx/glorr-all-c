#pragma once
#pragma once
#include <cstdint>


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

//struct ClientPlayer {
//    float x;
//    float y;
//    uint8_t health;
//    uint8_t maxHealth;
//};

//class ConvertStruct {
//public:
//    static ClientPlayer toClientPlayer(const Player& p);
//};
