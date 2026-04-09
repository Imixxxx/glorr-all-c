#include "GameState.h"
#include <vector>

// --- Players ---
std::vector<Player> GameState::players;
std::vector<Player> GameState::oldPlayers;

// --- World spawn ---
float GameState::worldSpawnX = 0.0f;
float GameState::worldSpawnY = 0.0f;

// --- Methods ---
void GameState::setWorldSpawn(float x, float y) {
    worldSpawnX = x;
    worldSpawnY = y;
}

float GameState::getWorldSpawnX() { return worldSpawnX; }
float GameState::getWorldSpawnY() { return worldSpawnY; }

Player& GameState::addPlayer(int id) {
    Player p;
    p.id = id;
    p.x = worldSpawnX; // use world spawn
    p.y = worldSpawnY;
    p.health = Constants::Player::MaxHealth;
    p.maxHealth = Constants::Player::MaxHealth;

    players.push_back(p);
    return players.back();
}

void GameState::removePlayer(int id) {
    for (auto it = players.begin(); it != players.end(); ++it) {
        if (it->id == id) {
            players.erase(it);
            break;
        }
    }
}

std::vector<Player>& GameState::getPlayers() {
    return players;
}

Player* GameState::getPlayer(int id) {
    for (auto& p : players) {
        if (p.id == id) return &p;
    }
    return nullptr;
}

void GameState::snapshotPlayers() {
    oldPlayers = players;
}

std::vector<Player>& GameState::getOldPlayers() {
    return oldPlayers;
}

Player* GameState::getOldPlayer(int id) {
    for (auto& p : oldPlayers) {
        if (p.id == id) return &p;
    }
    return nullptr;
}