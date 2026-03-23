#pragma once
// MapManager.h
#pragma once
#include "Map.h"
#include <string>
#include <unordered_map>

class MapManager {
public:
    MapManager() = default;
    ~MapManager() = default;

    // Load all maps from file
    bool loadMaps(const std::string& filename);

    // Get a map by name
    Map* getMap(const std::string& name);

private:
    std::unordered_map<std::string, Map> maps;
};
