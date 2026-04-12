#include "GameState.h"
#include "chunk/ChunkCoord.h"
#include <vector>
#include <algorithm>
#include <iostream>

// --- Players ---
std::vector<Player> GameState::players;
std::vector<Player> GameState::oldPlayers;

// --- World spawn ---
float GameState::worldSpawnX = 0.0f;
float GameState::worldSpawnY = 0.0f;

// --- Chunks ---
std::unordered_map<long long, std::vector<int>> GameState::chunks;

float GameState::chunkMapWidth;
float GameState::chunkMapHeight;

void GameState::setMapChunkSize(float w, float h) {
    chunkMapWidth = w;
    chunkMapHeight = h;
}



// --- Debug ---
void GameState::debugChunks()
{
    std::cout << "----- CHUNK STATE -----\n";

    for (const auto& [key, players] : chunks)
    {
        std::cout << "Chunk " << key << " : ";

        for (int id : players)
        {
            std::cout << id << " ";
        }

        std::cout << "\n";
    }

    std::cout << "-----------------------\n";
}

//
// Chunk helpers
//

long long GameState::getChunkKey(int cx, int cy)
{
    return (static_cast<long long>(cx) << 32) | static_cast<unsigned int>(cy);
}



std::pair<int, int> GameState::getPlayerChunk(const Player& p)
{
    return ChunkCoord::getChunkCoord(p.x, p.y);
}



long long GameState::getChunkKeyFromPlayer(const Player& p)
{
    auto [cx, cy] = ChunkCoord::getChunkCoord(p.x, p.y);
    return getChunkKey(cx, cy);
}




bool GameState::isValidChunk(int cx, int cy)
{
    return cx >= 0 && cy >= 0 &&
        cx < chunkMapWidth &&
        cy < chunkMapHeight;
}





std::vector<long long> GameState::getNearbyChunks(int cx, int cy, int radius)
{
    std::vector<long long> result;

    for (int y = cy - radius; y <= cy + radius; y++)
    {
        for (int x = cx - radius; x <= cx + radius; x++)
        {
            if (!isValidChunk(x, y))
                continue;

            result.push_back(getChunkKey(x, y));
        }
    }

    return result;
}



// 1. Return by value, but contain pointers (const Player*)
// This is fast because you're only moving a list of memory addresses.
std::vector<const Player*> GameState::getVisiblePlayers(int clientId)
{
    // Initialize a local vector of pointers
    std::vector<const Player*> result;

    Player* client = getPlayer(clientId);
    if (!client) return result;

    auto [cx, cy] = ChunkCoord::getChunkCoord(client->x, client->y);
    auto nearbyChunks = getNearbyChunks(cx, cy, 1);

    for (long long chunkKey : nearbyChunks)
    {
        auto it = chunks.find(chunkKey);
        if (it == chunks.end()) continue;

        for (int playerId : it->second)
        {
            // Get the pointer to the actual player in your master list
            Player* p = getPlayer(playerId);

            if (p) {
                // Store the address, not a copy of the whole object
                result.push_back(p);
            }
        }
    }

    return result; // Compiler uses RVO (Return Value Optimization) here
}



//
// Chunk API (SAFE)
//

void GameState::addPlayerToChunk(int playerId, long long chunkKey)
{
    auto& vec = chunks[chunkKey];

    if (std::find(vec.begin(), vec.end(), playerId) == vec.end())
    {
        vec.push_back(playerId);
    }
}

void GameState::removePlayerFromChunk(int playerId, long long chunkKey)
{
    auto it = chunks.find(chunkKey);
    if (it == chunks.end()) return;

    auto& vec = it->second;

    vec.erase(
        std::remove(vec.begin(), vec.end(), playerId),
        vec.end()
    );

    if (vec.empty())
    {
        chunks.erase(it);
    }
}

void GameState::movePlayerChunk(int playerId, long long oldKey, long long newKey)
{
    if (oldKey == newKey) return;

    removePlayerFromChunk(playerId, oldKey);
    addPlayerToChunk(playerId, newKey);
}

//
// World
//

void GameState::setWorldSpawn(float x, float y)
{
    worldSpawnX = x;
    worldSpawnY = y;
}

float GameState::getWorldSpawnX() { return worldSpawnX; }
float GameState::getWorldSpawnY() { return worldSpawnY; }

//
// Player management (FIXED)
//

Player& GameState::addPlayer(int id)
{
    Player p;
    p.id = id;
    p.x = worldSpawnX;
    p.y = worldSpawnY;
    p.health = Constants::Player::MaxHealth;
    p.maxHealth = Constants::Player::MaxHealth;

    players.push_back(p);
    Player& ref = players.back();

    // ✅ Use chunk API (NOT direct push)
    long long key = getChunkKeyFromPlayer(ref);
    addPlayerToChunk(ref.id, key);

    return ref;
}

void GameState::removePlayer(int id)
{
    for (auto it = players.begin(); it != players.end(); ++it)
    {
        if (it->id == id)
        {
            // ✅ REMOVE FROM CHUNK FIRST
            long long key = getChunkKeyFromPlayer(*it);
            removePlayerFromChunk(id, key);

            players.erase(it);
            return;
        }
    }
}

//
// Getters
//

std::vector<Player>& GameState::getPlayers()
{
    return players;
}

Player* GameState::getPlayer(int id)
{
    for (auto& p : players)
    {
        if (p.id == id) return &p;
    }
    return nullptr;
}

//
// Snapshot system
//

void GameState::snapshotPlayers()
{
    oldPlayers = players;
}

std::vector<Player>& GameState::getOldPlayers()
{
    return oldPlayers;
}

Player* GameState::getOldPlayer(int id)
{
    for (auto& p : oldPlayers)
    {
        if (p.id == id) return &p;
    }
    return nullptr;
}