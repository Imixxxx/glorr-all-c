// Map.h
#pragma once
#include <vector>
#include <cstdint>

class Map {
public:
    Map(int width, int height);  // constructor
    ~Map() = default;

    // Access tiles
    uint8_t getTile(int x, int y) const;
    uint8_t getTileType(int x, int y) const;
    uint8_t getTileRotation(int x, int y) const;

    void setTile(int x, int y, uint8_t type, uint8_t rotation);

    int getWidth() const { return width; }
    int getHeight() const { return height; }

private:
    int width;
    int height;
    std::vector<uint8_t> tiles; // 1 byte per tile (type + rotation)

    int index(int x, int y) const { return y * width + x; } // helper to flatten 2D
};
