cmake_minimum_required(VERSION 3.10)
project(BBB_NVRAM_Library C)

# Set the C standard
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED True)

# Tạo shared library từ bbb_nvram.c
add_library(bbb_nvram SHARED bbb_nvram.c)

# Tạo file thực thi để test
add_executable(nvram_test main.c)

# Link thư viện bbb_nvram với file thực thi nvram_test
target_link_libraries(nvram_test PRIVATE bbb_nvram)

# Cấu hình cài đặt (make install) nếu cần
install(TARGETS bbb_nvram DESTINATION lib)
install(FILES bbb_nvram.h DESTINATION include)
install(TARGETS nvram_test DESTINATION bin)
