#pragma once
#include <uwebsockets/App.h>
#include <string_view>


class WsHandler {
public:
    // Optional per-connection user data
    struct UserData {
        int id = 0;
        bool joined = false;
    };

    // Function to return WebSocket behavior
    static uWS::App::WebSocketBehavior<UserData> getWebSocketBehavior(uWS::App& app);


    static void sendDeltaUpdates(uWS::App& app);

    static void sendFullSnapshot(uWS::App& app);

    static void gameLoop(uWS::App& app);
};
