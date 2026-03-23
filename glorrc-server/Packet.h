#pragma once
#include <vector>
#include <cstdint>
#include "DataStructs.h"
#include <string_view>



class Packet {
public:

    static std::string_view toStringView(const std::vector<uint8_t>& buffer);
    static std::vector<uint8_t> toVectorBuffer(std::string_view sv);

    struct Player {
        static std::vector<uint8_t> encode(
            uint8_t messageType,
            const ::Player& player
        );
    };

    struct Players {
        static std::vector<uint8_t> encode(
            uint8_t messageType,
            const std::vector<::Player>& players
        );
    };

    struct UInt16 {
        static std::vector<uint8_t> encode(
            uint8_t messageType,
            uint16_t value
        );
    };

    struct Input {
        static InputState decode(const std::vector<uint8_t>& buffer);
    };

private:
    template<typename T>
    static void write(std::vector<uint8_t>& buffer, const T& value);
};