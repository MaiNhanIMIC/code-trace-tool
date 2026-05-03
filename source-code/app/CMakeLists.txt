cmake_minimum_required(VERSION 3.10)
project(BeagleBoneAppTrace C)

# Cấu hình chuẩn C
set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED True)

# Bật cảnh báo để code chặt chẽ hơn (chuẩn của người làm tool)
add_compile_options(-Wall -Wextra -Wpedantic)

# (Tùy chọn) Chỉ định thư mục chứa file header .h nếu chúng không nằm chung thư mục
# include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# (Tùy chọn) Chỉ định thư mục chứa file .so nếu chúng không nằm trong thư mục chuẩn hệ thống
# link_directories(${CMAKE_CURRENT_SOURCE_DIR}/lib)

# Định nghĩa file thực thi cho ứng dụng
add_executable(system_test_app main.c)

# Link ứng dụng với 2 thư viện chia sẻ: libbbb_led.so và libbbb_nvram.so
target_link_libraries(system_test_app bbb_led bbb_nvram)
