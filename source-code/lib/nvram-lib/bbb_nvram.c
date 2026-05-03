#include "bbb_nvram.h"
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/types.h>

#define EEPROM_DEVICE_PATH "/dev/bbb_eeprom"

int bbb_nvram_write(uint16_t offset, const uint8_t *data, size_t len) {
    if (data == NULL || len == 0) {
        return -1;
    }

    int fd = open(EEPROM_DEVICE_PATH, O_RDWR);
    if (fd < 0) {
        perror("Failed to open EEPROM device for writing");
        return -1;
    }

    // Di chuyển con trỏ file tới địa chỉ offset cần ghi
    if (lseek(fd, offset, SEEK_SET) < 0) {
        perror("Failed to seek to offset");
        close(fd);
        return -1;
    }

    ssize_t bytes_written = write(fd, data, len);
    close(fd);

    return (bytes_written == (ssize_t)len) ? 0 : -1;
}

int bbb_nvram_read(uint16_t offset, uint8_t *data, size_t len) {
    if (data == NULL || len == 0) {
        return -1;
    }

    int fd = open(EEPROM_DEVICE_PATH, O_RDONLY);
    if (fd < 0) {
        perror("Failed to open EEPROM device for reading");
        return -1;
    }

    // Di chuyển con trỏ file tới địa chỉ offset cần đọc
    if (lseek(fd, offset, SEEK_SET) < 0) {
        perror("Failed to seek to offset");
        close(fd);
        return -1;
    }

    ssize_t bytes_read = read(fd, data, len);
    close(fd);

    return (bytes_read == (ssize_t)len) ? 0 : -1;
}
