#include <uwebsockets/App.h>
#include "GameState.h"
#include "./packet/Packet.h"
#include "chunk/ChunkCoord.h"
#include <iostream>
#include <thread>
#include <chrono>
#include "./util/file_utils.h"
#include "ws_handler.h"
#include "./map/MapLoader.h"



uWS::App* g_app = nullptr;

int main(int argc, char* argv[]) {

    std::string region = argv[1];
    std::string map = argv[2];

    //Map server_map = MapLoader::load_map("./maps/" + map + ".bin");
    Map server_map = MapLoader::load_map("./server/map/binary/beta_garden.bin");
    //std::cout << server_map.tile_size << std::endl;
    
    // Set world spawn for gamestate
    GameState::setWorldSpawn(//0, 0
        server_map.spawn_x, // spawn_x
        server_map.spawn_y // spawn_y
    );
    GameState::setMapChunkSize(
        (server_map.width + ChunkCoord::CHUNK_TILE_SIZE - 1) / ChunkCoord::CHUNK_TILE_SIZE,
        (server_map.height + ChunkCoord::CHUNK_TILE_SIZE - 1) / ChunkCoord::CHUNK_TILE_SIZE
    );

    // Old spawn setter, uses grid units and converts to pixels
    //GameState::setWorldSpawn(
    //    server_map.spawn_x * server_map.tile_size, // spawn_x
    //    -(server_map.spawn_x * server_map.tile_size) // spawn_y
    //);


    uWS::App app;
    g_app = &app;

    app.ws("/ws", WsHandler::getWebSocketBehavior(app, server_map))
        .get("/*", [](auto* res, auto* req) {
        std::string url = std::string(req->getUrl());
        if (url == "/") url = "/index.html";
        std::string filePath = "./client" + url;

        std::string content = loadFile(filePath);
        if (content.empty()) {
            res->writeStatus("404 Not Found")->end("File not found!");
            return;
        }
        
        res->writeHeader("Content-Type", getContentType(filePath))->end(content);
            })
        .listen(9001, [](auto* token) {
        if (token) std::cout << "Server running on http://localhost:9001" << std::endl;
        else std::cout << "Failed to listen on port 9001" << std::endl;
            });

    // --- GAME LOOP ---
    auto* loop = (struct us_loop_t*)uWS::Loop::get();
    struct us_timer_t* timer = us_create_timer(loop, 0, 0);

    us_timer_set(timer, [](us_timer_t*) {

        // ONLY calls game loop now
        WsHandler::gameLoop(*g_app);

    }, 1000 / 60, 1000 / 60);



    // Run the uWebSockets server (blocking)
    app.run();

    return 0;
}