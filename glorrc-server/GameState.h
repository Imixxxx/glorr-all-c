#pragma once
#include <vector>
#include "DataStructs.h"

class GameState {
public:

    struct Constants {
        struct World {
            static constexpr float Friction = 0.85f;
        };
        struct Player {
            static constexpr float Acceleration = 1.0f;
            static constexpr float MaxSpeed = 5.0f;
            static constexpr int MaxHealth = 100;
        };
    };



    // Add a player and return a reference to the newly added player
    static Player& addPlayer(int id);

    // Remove a player by id
    static void removePlayer(int id);

    // Get all players
    static std::vector<Player>& getPlayers();

    // Get a player by id (returns nullptr if not found)
    static Player* getPlayer(int id);




    // Previous tick snapshot
    static std::vector<Player>& getOldPlayers();

    // Copy current players -> oldPlayers
    static void snapshotPlayers();

    // Get an old player by id (returns nullptr if not found)
    static Player* getOldPlayer(int id);


private:
    static std::vector<Player> players;
    static std::vector<Player> oldPlayers;
};