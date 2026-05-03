#include <linux/module.h>
#include <linux/kernel.h>
#include "bbb_shared_lib.h"

/**
 * bbb_calculate_checksum - Hàm tính XOR checksum đơn giản
 * @data: Dữ liệu đầu vào
 * @len: Độ dài dữ liệu
 *
 * Hàm này được EXPORT để các driver khác (như EEPROM) có thể dùng 
 * để kiểm tra tính toàn vẹn của dữ liệu.
 */
u8 bbb_calculate_checksum(const u8 *data, size_t len) {
    u8 checksum = 0;
    size_t i;

    if (!data) return 0;

    for (i = 0; i < len; i++) {
        checksum ^= data[i];
    }

    pr_info("Shared Lib: Calculated checksum 0x%02x for %zu bytes\n", checksum, len);
    return checksum;
}

/* Quan trọng: Export symbol để các module khác có thể thấy */
EXPORT_SYMBOL_GPL(bbb_calculate_checksum);

static int __init bbb_shared_lib_init(void) {
    pr_info("Shared Library Driver loaded\n");
    return 0;
}

static void __exit bbb_shared_lib_exit(void) {
    pr_info("Shared Library Driver unloaded\n");
}

module_init(bbb_shared_lib_init);
module_exit(bbb_shared_lib_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("trongnhan.m");
MODULE_DESCRIPTION("A shared utility library driver for BBB");
