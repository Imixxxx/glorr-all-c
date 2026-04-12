#pragma once
#include <uwebsockets/App.h>
#include <string_view>
#include "./map/Map.h"


class WsHandler {
public:
    // Optional per-connection user data
    struct UserData {
        int id = 0;
        bool joined = false;
    };

    // Function to return WebSocket behavior
    static uWS::App::WebSocketBehavior<UserData> getWebSocketBehavior(uWS::App& app, Map &server_map);

    static std::unordered_map<uint16_t, uWS::WebSocket<false, true, UserData>*> connections;


    static void sendChunkDeltaUpdates();

    static void sendFullSnapshot();

    static void gameLoop(uWS::App& app);
};
