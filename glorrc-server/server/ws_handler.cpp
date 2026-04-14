#include "ws_handler.h"
#include "GameState.h"
#include "./packet/Packet.h"
#include "./map/Map.h"
#include "./chunk/ChunkCoord.h"
#include <vector>
#include <iostream>
#include <uwebsockets/App.h>
#include <string_view>
#include <queue>

static uint16_t nextId = 1;
static std::queue<uint16_t> freeIds;

std::vector<uint8_t> cachedServerMap;


std::unordered_map<uint16_t, uWS::WebSocket<false, true, WsHandler::UserData>*> WsHandler::connections;




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
    std::vector<uint8_t> buffer1 = Packet::Players::encode(1, players, id);
    ws->send(Packet::toStringView(buffer1), uWS::OpCode::BINARY);

    
    // Add joined player to game state
    Player &player = GameState::addPlayer(id);

    
    // Subscribe to game topic
    ws->subscribe("game");


    // Publish join packet to all players
    std::vector<uint8_t> buffer2 = Packet::ClientPlayer::encode(6, player);
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
    std::vector<uint8_t> buffer = Packet::UInt16::encode(7, id);
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


            connections[id] = ws;


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

            connections.erase(id);

            
            freeIds.push(id);
            
            
        }
    };
}





void WsHandler::sendChunkDeltaUpdates() {
    if (GameState::getOldPlayers().empty()) {
        GameState::snapshotPlayers();
        return;
    }


    std::vector<Player>& players = GameState::getPlayers();

    for (const Player& player : players) {


        std::vector<const Player*> playersInChunk = GameState::getVisiblePlayers(player.id);
        std::vector<Player>& oldPlayers = GameState::getOldPlayers();

        // Check for any changes (deltas)
        std::vector<Player> deltaUpdates;
        for (const Player* pl : playersInChunk) {


            Player* oldPlayer = GameState::getOldPlayer(pl->id);

            // New player joined this tick
            if (!oldPlayer) continue;

            if (
                pl->x != oldPlayer->x
                || pl->y != oldPlayer->y
                || pl->health != oldPlayer->health
                || pl->maxHealth != oldPlayer->maxHealth
                )
            {
                deltaUpdates.push_back(*pl);
            }
        }



        // Send delta players as a snapshot (only if not empty)
        if (!deltaUpdates.empty()) {
            

            auto it = connections.find(player.id);
            if (it != connections.end()) {
                uWS::WebSocket<false, true, WsHandler::UserData>* ws = it->second;
                std::vector<uint8_t> buffer = Packet::Players::encode(4, deltaUpdates, player.id);
                ws->send(Packet::toStringView(buffer), uWS::OpCode::BINARY);
            }

            //app.publish("game", Packet::toStringView(buffer), uWS::OpCode::BINARY);
        }


    }

    



    GameState::snapshotPlayers();
}

void WsHandler::sendChunkSnapshots() {
    std::vector<Player>& allPlayers = GameState::getPlayers();

    for (const Player& player : allPlayers) {
        auto it = connections.find(player.id);
        if (it != connections.end()) {
            uWS::WebSocket<false, true, WsHandler::UserData>* ws = it->second;

            // 1. Get the list of pointers (fast)
            std::vector<const Player*> ptrs = GameState::getVisiblePlayers(player.id);

            // 2. Convert pointers back to objects to satisfy the encoder
            std::vector<Player> playersToEncode;
            playersToEncode.reserve(ptrs.size()); // Optimization: reserve memory upfront
            for (const Player* p : ptrs) {
                if (p) playersToEncode.push_back(*p); // The '*' dereferences the pointer to a copy
            }

            // 3. Encode and send
            std::vector<uint8_t> buffer = Packet::Players::encode(1, playersToEncode, player.id);
            ws->send(Packet::toStringView(buffer), uWS::OpCode::BINARY);
        }
    }
}



void WsHandler::gameLoop(uWS::App& app)
{
    std::vector<Player>& players = GameState::getPlayers();

    const float accel = GameState::Constants::Player::Acceleration;
    const float decel = GameState::Constants::Player::Deceleration;
    const float maxSpeed = GameState::Constants::Player::MaxSpeed;

    // -----------------------------
    // TIMERS (network scheduling)
    // -----------------------------
    static uint64_t snapshotAccumulator = 0;
    static uint64_t correctionAccumulator = 0;

    const uint64_t snapshotInterval = 500;    // 2x per second
    const uint64_t correctionInterval = 100;   // 10x per second

    // -----------------------------
    // SIMULATION STEP
    // -----------------------------
    for (auto& player : players)
    {
        player.oldX = player.x;
        player.oldY = player.y;

        float ix = 0.0f;
        float iy = 0.0f;

        if (player.inputs.w) iy += 1.0f;
        if (player.inputs.s) iy -= 1.0f;
        if (player.inputs.a) ix -= 1.0f;
        if (player.inputs.d) ix += 1.0f;

        float length = std::sqrt(ix * ix + iy * iy);
        if (length > 1.0f)
        {
            ix /= length;
            iy /= length;
        }

        player.vx += ix * accel;
        player.vy += iy * accel;

        if (ix == 0.0f)
        {
            if (player.vx > 0) player.vx = std::max(0.0f, player.vx - decel);
            else if (player.vx < 0) player.vx = std::min(0.0f, player.vx + decel);
        }

        if (iy == 0.0f)
        {
            if (player.vy > 0) player.vy = std::max(0.0f, player.vy - decel);
            else if (player.vy < 0) player.vy = std::min(0.0f, player.vy + decel);
        }

        float speed = std::sqrt(player.vx * player.vx + player.vy * player.vy);
        if (speed > maxSpeed)
        {
            player.vx = (player.vx / speed) * maxSpeed;
            player.vy = (player.vy / speed) * maxSpeed;
        }

        player.x += player.vx;
        player.y += player.vy;

        auto [oldCx, oldCy] = ChunkCoord::getChunkCoord(player.oldX, player.oldY);
        auto [newCx, newCy] = ChunkCoord::getChunkCoord(player.x, player.y);

        long long oldKey = GameState::getChunkKey(oldCx, oldCy);
        long long newKey = GameState::getChunkKey(newCx, newCy);

        GameState::movePlayerChunk(player.id, oldKey, newKey);
    }

    // -----------------------------
    // WORLD DELTAS (every tick)
    // -----------------------------
    sendChunkDeltaUpdates();




    // Chunk info debug logging

    /*static int tick = 0;
    tick++;
    
    if (tick % 60 == 0)
    {
        GameState::debugChunks();
    }*/






    // -----------------------------
    // SNAPSHOTS (LOW FREQUENCY)
    // -----------------------------
    snapshotAccumulator += 1000 / 60;

    if (snapshotAccumulator >= snapshotInterval)
    {
        WsHandler::sendChunkSnapshots();
        snapshotAccumulator = 0;
    }

    // -----------------------------
    // SELF CORRECTION (MEDIUM FREQUENCY)
    // -----------------------------
    correctionAccumulator += 1000 / 60;

    if (correctionAccumulator >= correctionInterval)
    {
        correctionAccumulator = 0;

        for (const auto& player : players)
        {
            auto it = connections.find(player.id);
            if (it == connections.end()) continue;

            auto* ws = it->second;

            auto buffer = Packet::ClientPlayer::encode(
                8,
                player
            );

            ws->send(Packet::toStringView(buffer), uWS::OpCode::BINARY);
        }
    }
}