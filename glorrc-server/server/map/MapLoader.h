#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include "./Map.h"






class MapLoader {
public:
    static Map load_map(const std::string& path);
};