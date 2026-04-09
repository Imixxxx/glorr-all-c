#include "file_utils.h"
#include <fstream>
#include <sstream>

std::string loadFile(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) return "";
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

std::string getContentType(const std::string& path) {
    if (path.ends_with(".html")) return "text/html; charset=utf-8";
    if (path.ends_with(".js")) return "application/javascript";
    if (path.ends_with(".css")) return "text/css; charset=utf-8";
    if (path.ends_with(".svg")) return "image/svg+xml";
    if (path.ends_with(".png")) return "image/png";
    if (path.ends_with(".jpg") || path.ends_with(".jpeg")) return "image/jpeg";
    if (path.ends_with(".gif")) return "image/gif";
    if (path.ends_with(".ttf")) return "font/ttf";
    return "text/plain";
}