#ifndef BBB_SHARED_LIB_H
#define BBB_SHARED_LIB_H

#include <linux/types.h>

/**
 * @brief Tính toán checksum đơn giản cho dữ liệu driver
 * @param data Con trỏ dữ liệu
 * @param len Độ dài dữ liệu
 * @return u8 Checksum kết quả
 */
u8 bbb_calculate_checksum(const u8 *data, size_t len);

#endif
