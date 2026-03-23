#include "Packet.h"
#include <cstring>
#include <string_view>
#include "DataStructs.h"

template<typename T>
void Packet::write(std::vector<uint8_t>& buffer, const T& value)
{
    const uint8_t* bytes = reinterpret_cast<const uint8_t*>(&value);

    for (size_t i = 0; i < sizeof(T); i++)
        buffer.push_back(bytes[i]);
}



std::string_view Packet::toStringView(const std::vector<uint8_t>& buffer) {
    return { reinterpret_cast<const char*>(buffer.data()), buffer.size() };
}
std::vector<uint8_t> Packet::toVectorBuffer(std::string_view sv) {
    return std::vector<uint8_t>(sv.begin(), sv.end());
}



// Game Structs

std::vector<uint8_t> Packet::Player::encode(
    uint8_t messageType,
    const ::Player& p)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);

    write(buffer, p.id);
    write(buffer, p.x);
    write(buffer, p.y);
    write(buffer, p.health);
    write(buffer, p.maxHealth);

    return buffer;
}

std::vector<uint8_t> Packet::Players::encode(
    uint8_t messageType,
    const std::vector<::Player>& players)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);

    uint16_t count = (uint16_t)players.size();
    write(buffer, count);

    for (const ::Player& p : players)
    {
        write(buffer, p.id);
        write(buffer, p.x);
        write(buffer, p.y);
        write(buffer, p.health);
    }

    return buffer;
}



InputState Packet::Input::decode(const std::vector<uint8_t>& buffer)
{
    InputState state{};

    if (buffer.size() < 2)
        return state;

    uint8_t flags = buffer[1];

    state.w = flags & (1 << 0);
    state.a = flags & (1 << 1);
    state.s = flags & (1 << 2);
    state.d = flags & (1 << 3);

    return state;
}




// Simple Types

std::vector<uint8_t> Packet::UInt16::encode(
    uint8_t messageType,
    uint16_t value)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);
    write(buffer, value);

    return buffer;
}