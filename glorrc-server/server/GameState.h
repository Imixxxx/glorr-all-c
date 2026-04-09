#pragma once
#include <vector>
#include "DataStructs.h"

class GameState {
public:

    struct Constants {
        struct World {
            static constexpr float Friction = 0.4f;
        };
        struct Player {
            static constexpr float Acceleration = 0.6f;
            static constexpr float Deceleration = 0.45f;
            static constexpr float MaxSpeed = 6.2f;
            static constexpr int MaxHealth = 100;
        };
    };

    // --- WORLD SPAWN ---
    static void setWorldSpawn(float x, float y);
    static float getWorldSpawnX();
    static float getWorldSpawnY();

    // Add a player and return a reference to the newly added player
    static Player& addPlayer(int id);

    // Remove a player by id
    static void removePlayer(int id);

    // Get all players
    static std::vector<Player>& getPlayers();

    // Get a player by id
    static Player* getPlayer(int id);

    // Previous tick snapshot
    static std::vector<Player>& getOldPlayers();
    static void snapshotPlayers();
    static Player* getOldPlayer(int id);

private:
    static std::vector<Player> players;
    static std::vector<Player> oldPlayers;

    // World spawn coordinates
    static float worldSpawnX;
    static float worldSpawnY;
};