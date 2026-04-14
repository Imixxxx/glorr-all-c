#include "Packet.h"
#include <cstring>
#include <string_view>
#include <vector>
#include <cstdint>
#include <type_traits>
#include <bit>
#include <algorithm>

template<typename T>
void Packet::write(std::vector<uint8_t>& buffer, const T& value)
{
    static_assert(std::is_trivially_copyable_v<T>,
        "Packet::write only supports trivially copyable types");

    static_assert(std::numeric_limits<float>::is_iec559,
        "Float must be IEEE 754");

    T temp = value;

    uint8_t* bytes = reinterpret_cast<uint8_t*>(&temp);

    // ensure little-endian output for network consistency
    if constexpr (std::endian::native == std::endian::big)
    {
        std::reverse(bytes, bytes + sizeof(T));
    }

    buffer.insert(buffer.end(), bytes, bytes + sizeof(T));
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
    const std::vector<::Player>& players,
    uint16_t excludeId)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);

    uint16_t count = 0;

    // We'll encode count AFTER filtering (important)
    size_t countPos = buffer.size();
    write(buffer, count); // placeholder

    for (const ::Player& p : players)
    {
        if (p.id == excludeId)
            continue;

        write(buffer, p.id);
        write(buffer, p.x);
        write(buffer, p.y);
        write(buffer, p.health);

        count++;
    }

    // overwrite correct count
    std::memcpy(buffer.data() + countPos, &count, sizeof(count));

    return buffer;
}



std::vector<uint8_t> Packet::ClientPlayer::encode(
    uint8_t messageType,
    const ::Player& player)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);

    write(buffer, player.id);
    write(buffer, player.x);
    write(buffer, player.y);

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




std::vector<uint8_t> Packet::Map::encode(
    uint8_t messageType,
    const ::Map& map)
{
    std::vector<uint8_t> buffer;

    buffer.push_back(messageType);

    // Header (unchanged)
    write(buffer, map.width);
    write(buffer, map.height);
    write(buffer, map.tile_size);
    write(buffer, map.spawn_x);
    write(buffer, map.spawn_y);

    // Tile count
    uint32_t tileCount = (uint32_t)map.tiles.size();
    write(buffer, tileCount);

    // Pack tile into 16 bits (t + r + u)
    auto packTile = [](const Tile& tile) -> uint16_t {
        return
            (uint16_t)(tile.texture & 0b11111) |
            ((tile.rotation & 0b11) << 5) |
            ((tile.underlay & 0b11111) << 7);
        };

    for (const Tile& tile : map.tiles)
    {
        uint16_t packed = packTile(tile);

        // write as 2 bytes (little endian)
        buffer.push_back(packed & 0xFF);
        buffer.push_back((packed >> 8) & 0xFF);
    }

    return buffer;
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