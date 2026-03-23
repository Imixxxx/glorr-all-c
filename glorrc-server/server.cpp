#include <uwebsockets/App.h>
#include "GameState.h"
#include "Packet.h"
#include <iostream>
#include <thread>
#include <chrono>
#include "file_utils.h"
#include "ws_handler.h"



uWS::App* g_app = nullptr;

int main() {
    uWS::App app;
    g_app = &app;

    app.ws("/ws", WsHandler::getWebSocketBehavior(app))
        .get("/*", [](auto* res, auto* req) {
        std::string url = std::string(req->getUrl());
        if (url == "/") url = "/index.html";
        std::string filePath = "." + url;

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


        // --- GAME TICK LOGIC ---
        WsHandler::gameLoop(*g_app);   // runs every tick (~16ms)
        

        // --- FULL SNAPSHOT LOGIC ---
        static uint64_t fullSnapshotAccumulator = 0;
        const uint64_t fullSnapshotInterval = 500;

        fullSnapshotAccumulator += 1000 / 60;
        if (fullSnapshotAccumulator >= fullSnapshotInterval) {
            WsHandler::sendFullSnapshot(*g_app);
            fullSnapshotAccumulator = 0;
        }

    }, 1000 / 60, 1000 / 60);



    // Run the uWebSockets server (blocking)
    app.run();

    return 0;
}