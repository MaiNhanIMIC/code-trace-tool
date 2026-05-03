cmake_minimum_required(VERSION 3.10)
project(BBBLedLib C)

# Cờ biên dịch
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra")

# 1. Tạo Shared Library (libbbb_led.so)
add_library(bbb_led SHARED bbb_led.c)

# Chỉ định thư mục chứa header để các project khác có thể include
target_include_directories(bbb_led PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# 2. Tạo chương trình Test liên kết với thư viện
add_executable(led_test main.c)
target_link_libraries(led_test bbb_led)

# 3. (Tùy chọn) Cài đặt thư viện vào hệ thống (dùng lệnh: sudo make install)
install(TARGETS bbb_led DESTINATION /usr/lib)
install(FILES bbb_led.h DESTINATION /usr/include)
