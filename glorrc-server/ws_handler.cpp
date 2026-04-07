#include "ws_handler.h"
#include "GameState.h"
#include "Packet.h"
#include <vector>
#include <iostream>
#include <uwebsockets/App.h>
#include <string_view>
#include <queue>

static uint16_t nextId = 1;
static std::queue<uint16_t> freeIds;

std::vector<uint8_t> cachedServerMap;






void handleJoin(auto* ws, uWS::App& app) {

    auto* data = ws->getUserData();
    if (data->joined) return; // prevent duplicate joins
    data->joined = true;
    uint16_t id = data->id;



    // Send ws id to the client
    std::vector<uint8_t> buffer = Packet::UInt16::encode(0, id);
    ws->send(Packet::toStringView(buffer), uWS::OpCode::BINARY);


    // Send server map to the client
    ws->send(Packet::toStringView(cachedServerMap), uWS::OpCode::BINARY);


    // Send players snapshot to joined player
    std::vector<Player> &players = GameState::getPlayers();
    std::vector<uint8_t> buffer1 = Packet::Players::encode(1, players);
    ws->send(Packet::toStringView(buffer1), uWS::OpCode::BINARY);

    
    // Add joined player to game state
    Player &player = GameState::addPlayer(id);

    
    // Subscribe to game topic
    ws->subscribe("game");


    // Publish spawn packet to all players
    std::vector<uint8_t> buffer2 = Packet::Player::encode(2, player);
    app.publish("game", Packet::toStringView(buffer2), uWS::OpCode::BINARY);

    std::cout << "Player joined with id: " << id << std::endl;
}

void handleLeave(auto* ws, uWS::App& app) {

    auto* data = ws->getUserData();
    if (!data->joined) return;
    data->joined = false;


    // Unsubscribe from game topic
    ws->unsubscribe("game");


    // Get left player id and remove from player list
    uint16_t id = data->id;
    GameState::removePlayer(id);


    // Publish leave packet to all players
    std::vector<uint8_t> buffer = Packet::UInt16::encode(3, id);
    app.publish("game", Packet::toStringView(buffer), uWS::OpCode::BINARY);


    std::cout << "Player left with id: " << id << std::endl;
}


void handleInputState(auto *ws, std::vector<uint8_t> buffer) {
    
    auto* data = ws->getUserData();
    if (!data->joined) return;

    InputState inputState = Packet::Input::decode(buffer);
    Player *player = GameState::getPlayer(data->id);
    player->inputs = inputState;

}




uWS::App::WebSocketBehavior<WsHandler::UserData> WsHandler::getWebSocketBehavior(uWS::App &app, Map &server_map) {

    cachedServerMap = Packet::Map::encode(5, server_map);

    return uWS::App::WebSocketBehavior<WsHandler::UserData>{

        .open = [](auto* ws) {

            uint16_t id;

            if (!freeIds.empty()) {
                id = freeIds.front();
                freeIds.pop();
            }
            else {
                id = nextId++;
            }

            ws->getUserData()->id = id;
            ws->getUserData()->joined = false;


            std::cout << "Client connected with id: " << id << std::endl;
        },

        .message = [&app](auto* ws, std::string_view msg, uWS::OpCode op) {

            if (msg.empty()) return;
            if (op != uWS::OpCode::BINARY) return;

            uint8_t type = static_cast<uint8_t>(msg[0]);
            std::vector<uint8_t> data = Packet::toVectorBuffer(msg);

            if (type == 100) {
                handleJoin(ws, app);
            }
            else if (type == 101) {
                handleLeave(ws, app);
            }
            else if (type == 102) {
                handleInputState(ws, data);
            }
        },

        .close = [&app](auto* ws, int code, std::string_view message) {

            auto* data = ws->getUserData();
            uint16_t id = data->id;

            std::cout << "Client disconnected: " << id << std::endl;

            
            handleLeave(ws, app);

            
            freeIds.push(id);
            
            
        }
    };
}





void WsHandler::sendDeltaUpdates(uWS::App& app) {
    if (GameState::getOldPlayers().empty()) {
        GameState::snapshotPlayers();
        return;
    }

    std::vector<Player>& players = GameState::getPlayers();
    std::vector<Player>& oldPlayers = GameState::getOldPlayers();

    // Check for any changes (deltas)
    std::vector<Player> deltaUpdates;
    for (const Player& player : players) {
        Player* oldPlayer = GameState::getOldPlayer(player.id);

        // New player joined this tick
        if (!oldPlayer) continue;

        if (
            player.x != oldPlayer->x
            || player.y != oldPlayer->y
            || player.health != oldPlayer->health
            || player.maxHealth != oldPlayer->maxHealth
            )
        {
            deltaUpdates.push_back(player);
        }
    }



    // Send delta players as a snapshot (only if not empty)
    if (!deltaUpdates.empty()) {
        std::vector<uint8_t> buffer = Packet::Players::encode(4, deltaUpdates);
        app.publish("game", Packet::toStringView(buffer), uWS::OpCode::BINARY);
    }



    GameState::snapshotPlayers();
}

void WsHandler::sendFullSnapshot(uWS::App& app) {


    // Send all players as a snapshot
    std::vector<Player>& players = GameState::getPlayers();
    std::vector<uint8_t> buffer = Packet::Players::encode(1, players);
    app.publish("game", Packet::toStringView(buffer), uWS::OpCode::BINARY);

}



void WsHandler::gameLoop(uWS::App& app) {

    std::vector<Player>& players = GameState::getPlayers();

    const float accel = GameState::Constants::Player::Acceleration;
    const float friction = GameState::Constants::World::Friction;
    const float maxSpeed = GameState::Constants::Player::MaxSpeed;

    for (auto& player : players) {
        // Compute input vector
        float ix = 0.0f;
        float iy = 0.0f;

        if (player.inputs.w) iy += 1.0f;
        if (player.inputs.s) iy -= 1.0f;
        if (player.inputs.a) ix -= 1.0f;
        if (player.inputs.d) ix += 1.0f;

        // Normalize input vector if diagonal
        float length = std::sqrt(ix * ix + iy * iy);
        if (length > 1.0f) {
            ix /= length;
            iy /= length;
        }

        // Apply acceleration
        player.vx += ix * accel;
        player.vy += iy * accel;

        // Clamp velocity
        player.vx = std::clamp(player.vx, -maxSpeed, maxSpeed);
        player.vy = std::clamp(player.vy, -maxSpeed, maxSpeed);

        // Apply velocity to position
        player.x += player.vx;
        player.y += player.vy;

        // Apply friction
        player.vx *= friction;
        player.vy *= friction;
    }

    sendDeltaUpdates(app);
}