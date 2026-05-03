#include "bbb_led.h"
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

// Đường dẫn giao tiếp với driver (Cần sửa lại cho khớp với driver thực tế)
#define LED_DEVICE_PATH "/sys/class/bbb_led/value"

int bbb_led_set_state(bbb_led_state_t state) {
    int fd = open(LED_DEVICE_PATH, O_WRONLY);
    if (fd < 0) {
        perror("Không thể mở device node của LED");
        return -1;
    }

    const char *val = (state == LED_ON) ? "1" : "0";
    ssize_t ret = write(fd, val, strlen(val));
    close(fd);

    return (ret == strlen(val)) ? 0 : -1;
}

int bbb_led_on(void) {
    return bbb_led_set_state(LED_ON);
}

int bbb_led_off(void) {
    return bbb_led_set_state(LED_OFF);
}
