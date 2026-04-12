#pragma once
#include <vector>
#include "./_types/GameTypes.h"
#include <unordered_map>

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

    


    static void setMapChunkSize(float w, float h);
    
    // Get chunk key from x,y
    static long long getChunkKey(int cx, int cy);
    // Get the chunk from player coordinates
    static std::pair<int, int> getPlayerChunk(const Player& p);
    // Get the chunk key from player chunk
    static long long getChunkKeyFromPlayer(const Player& p);

    // Chunk validity check
    static bool isValidChunk(int cx, int cy);
    // Get nearby chunks
    static std::vector<long long> getNearbyChunks(int cx, int cy, int radius);
    // Get visisble players for client
    static std::vector<const Player*> getVisiblePlayers(int clientId);

    static void debugChunks();


    // Chunk getters & setters
    static void addPlayerToChunk(int playerId, long long chunkKey);
    static void removePlayerFromChunk(int playerId, long long chunkKey);
    static void movePlayerChunk(int playerId, long long oldKey, long long newKey);


private:
    static std::vector<Player> players;
    static std::vector<Player> oldPlayers;

    // World spawn coordinates
    static float worldSpawnX;
    static float worldSpawnY;


    // Chunks
    static std::unordered_map<long long, std::vector<int>> chunks;

    static float chunkMapWidth;
    static float chunkMapHeight;
};