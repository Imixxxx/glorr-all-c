#include <vector>
#include "DataStructs.h"
#include "GameState.h"


std::vector<Player> GameState::players;
std::vector<Player> GameState::oldPlayers;

Player& GameState::addPlayer(int id) {
    Player p;
    p.id = id;
    //p.x = 0;
    //p.y = 0;
    p.health = Constants::Player::MaxHealth;
    p.maxHealth = Constants::Player::MaxHealth;

    players.push_back(p);
    return players.back(); // return reference to the newly added player
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
        if (p.id == id)
            return &p; // return pointer to player
    }
    return nullptr; // not found
}





void GameState::snapshotPlayers() {
    oldPlayers = players; // full copy snapshot
}

std::vector<Player>& GameState::getOldPlayers() {
    return oldPlayers;
}

Player* GameState::getOldPlayer(int id) {
    for (auto& p : oldPlayers) {
        if (p.id == id)
            return &p; // return pointer to player
    }
    return nullptr; // not found
}