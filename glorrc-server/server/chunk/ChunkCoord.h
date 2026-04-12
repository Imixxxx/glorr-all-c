#pragma once

#include <utility>

namespace ChunkCoord
{
    extern const int TILE_SIZE;
    extern const int CHUNK_TILE_SIZE;
    extern const int CHUNK_SIZE;

    std::pair<int, int> getChunkCoord(float x, float y);
}