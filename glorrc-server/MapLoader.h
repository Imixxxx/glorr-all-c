#pragma once
#include <string>
#include <vector>
#include <cstdint>
#include "DataStructs.h"


class MapLoader {
public:
    static Map load_map(const std::string& path);
};