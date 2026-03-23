// MapManager.cpp
#include "MapManager.h"
#include <fstream>
#include <iostream>

bool MapManager::loadMaps(const std::string& filename) {
    // For simplicity, assume binary format
    std::ifstream file(filename, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "Failed to open map file: " << filename << "\n";
        return false;
    }

    uint32_t mapCount;
    file.read(reinterpret_cast<char*>(&mapCount), sizeof(mapCount));

    for (uint32_t i = 0; i < mapCount; ++i) {
        uint32_t nameLen;
        file.read(reinterpret_cast<char*>(&nameLen), sizeof(nameLen));

        std::string mapName(nameLen, ' ');
        file.read(&mapName[0], nameLen);

        uint32_t width, height;
        file.read(reinterpret_cast<char*>(&width), sizeof(width));
        file.read(reinterpret_cast<char*>(&height), sizeof(height));

        Map map(width, height);
        file.read(reinterpret_cast<char*>(map.tiles.data()), width * height);

        maps[mapName] = map;
    }

    file.close();
    return true;
}

Map* MapManager::getMap(const std::string& name) {
    auto it = maps.find(name);
    if (it != maps.end())
        return &it->second;
    return nullptr;
}
