#ifndef BBB_NVRAM_H
#define BBB_NVRAM_H

#include <stdint.h>
#include <stddef.h>

/**
 * @brief Ghi dữ liệu xuống EEPROM (NVRAM)
 * * @param offset Địa chỉ bắt đầu ghi
 * @param data Con trỏ chứa dữ liệu cần ghi
 * @param len Số lượng byte cần ghi
 * @return int 0 nếu thành công, -1 nếu thất bại
 */
int bbb_nvram_write(uint16_t offset, const uint8_t *data, size_t len);

/**
 * @brief Đọc dữ liệu từ EEPROM (NVRAM)
 * * @param offset Địa chỉ bắt đầu đọc
 * @param data Con trỏ lưu dữ liệu đọc được
 * @param len Số lượng byte cần đọc
 * @return int 0 nếu thành công, -1 nếu thất bại
 */
int bbb_nvram_read(uint16_t offset, uint8_t *data, size_t len);

#endif // BBB_NVRAM_H
