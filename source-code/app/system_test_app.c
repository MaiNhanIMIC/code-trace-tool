#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/* Bao gồm file header từ thư viện chia sẻ đã tạo */
#include "bbb_led.h"
#include "bbb_nvram.h"

#define TEST_OFFSET 0x00
#define TEST_DATA "TRACE_DATA_OK"

int main() {
    printf("[TRACE] === BẮT ĐẦU CHẠY ỨNG DỤNG KIỂM THỬ TỔNG HỢP ===\n");

    /* 1. Bật LED báo hiệu bắt đầu tiến trình */
    printf("[TRACE] Gọi API bbb_led_set_state(1) để bật LED tại chân P9.12...\n");
    if (bbb_led_set_state(1) < 0) {
        fprintf(stderr, "[ERROR] Không thể ghi giá trị 1 để bật LED.\n");
        return EXIT_FAILURE;
    }

    /* 2. Chuẩn bị dữ liệu và ghi xuống NVRAM */
    char write_buf[] = TEST_DATA;
    int data_len = strlen(write_buf) + 1; // Tính cả ký tự NULL kết thúc chuỗi
    
    printf("[TRACE] Gọi API bbb_nvram_write: Ghi '%s' vào offset 0x%02X...\n", write_buf, TEST_OFFSET);
    if (bbb_nvram_write(TEST_OFFSET, write_buf, data_len) != data_len) {
        fprintf(stderr, "[ERROR] Lỗi khi ghi dữ liệu xuống /dev/bbb_eeprom.\n");
        bbb_led_set_state(0); // Đảm bảo tắt LED nếu có lỗi
        return EXIT_FAILURE;
    }

    /* Tạo một độ trễ nhỏ mô phỏng quá trình xử lý / chờ EEPROM ổn định */
    usleep(500000); // Trễ 0.5 giây

    /* 3. Đọc dữ liệu từ NVRAM để verify */
    char read_buf[32] = {0};
    printf("[TRACE] Gọi API bbb_nvram_read: Đọc dữ liệu từ offset 0x%02X...\n", TEST_OFFSET);
    if (bbb_nvram_read(TEST_OFFSET, read_buf, data_len) != data_len) {
        fprintf(stderr, "[ERROR] Lỗi khi đọc dữ liệu từ /dev/bbb_eeprom.\n");
        bbb_led_set_state(0);
        return EXIT_FAILURE;
    }

    /* 4. Đối chiếu kết quả (Tracing data in/out) */
    printf("[TRACE] Dữ liệu đọc được: '%s'\n", read_buf);
    if (strcmp(write_buf, read_buf) == 0) {
        printf("[TRACE] ==> SUCCESS: Dữ liệu khớp hoàn toàn!\n");
    } else {
        printf("[ERROR] ==> FAILED: Dữ liệu bị sai lệch (data corruption)!\n");
    }

    /* 5. Tắt LED báo hiệu hoàn thành tiến trình */
    printf("[TRACE] Gọi API bbb_led_set_state(0) để tắt LED...\n");
    if (bbb_led_set_state(0) < 0) {
        fprintf(stderr, "[ERROR] Không thể ghi giá trị 0 để tắt LED.\n");
        return EXIT_FAILURE;
    }

    printf("[TRACE] === KẾT THÚC ỨNG DỤNG ===\n");
    return EXIT_SUCCESS;
}
