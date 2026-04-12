#include "ChunkCoord.h"
#include <cmath>

namespace ChunkCoord
{
    const int TILE_SIZE = 400;
    const int CHUNK_TILE_SIZE = 2;
    const int CHUNK_SIZE = TILE_SIZE * CHUNK_TILE_SIZE; // CHUNK_SIZE x CHUNK_SIZE
                                                        // dimensions of chunk
    std::pair<int, int> getChunkCoord(float x, float y)
    {
        int cx = static_cast<int>(std::floor(x / CHUNK_SIZE));
        int cy = static_cast<int>(std::floor(y / CHUNK_SIZE));

        return { cx, cy };
    }
}