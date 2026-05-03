#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/slab.h>

/* Định nghĩa kiểu hàm để cast con trỏ hàm sau khi tìm thấy symbol */
typedef u8 (*bbb_checksum_t)(const u8 *, size_t);

static int __init data_logger_init(void) {
    bbb_checksum_t calc_checksum;
    u8 sample_data[] = { 0x48, 0x65, 0x6c, 0x6c, 0x6f }; // "Hello"
    u8 crc;

    pr_info("Data Logger: Khởi tạo module...\n");

    /**
     * Về đề xuất 'find_symbol': 
     * Trong Linux Kernel, 'find_symbol' là hàm nội bộ của trình quản lý module.
     * Để một driver chủ động tìm và sử dụng một symbol đã được EXPORT_SYMBOL, 
     * cách chuẩn và an toàn nhất là dùng 'symbol_get()'.
     * 
     * 'symbol_get' không chỉ trả về địa chỉ mà còn tăng reference count của module 
     * chứa symbol đó, giúp hệ thống không bị crash nếu module kia bị gỡ bỏ đột ngột.
     */
    calc_checksum = (bbb_checksum_t)symbol_get(bbb_calculate_checksum);

    if (calc_checksum) {
        pr_info("Data Logger: Đã tìm thấy hàm 'bbb_calculate_checksum' tại %p\n", calc_checksum);
        
        /* Sử dụng hàm để tính checksum cho dữ liệu mẫu */
        crc = calc_checksum(sample_data, sizeof(sample_data));
        pr_info("Data Logger: Checksum của dữ liệu mẫu là 0x%02x\n", crc);

        /**
         * Sau khi sử dụng xong (hoặc khi module exit), ta nên dùng symbol_put
         * để giảm reference count.
         */
        symbol_put(bbb_calculate_checksum);
    } else {
        pr_err("Data Logger: Không tìm thấy symbol 'bbb_calculate_checksum'.\n");
        pr_err("Data Logger: Hãy đảm bảo module 'bbb_shared_lib' đã được nạp trước.\n");
        return -ENODEV;
    }

    return 0;
}

static void __exit data_logger_exit(void) {
    pr_info("Data Logger: Gỡ bỏ module\n");
}

module_init(data_logger_init);
module_exit(data_logger_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("trongnhan.m");
MODULE_DESCRIPTION("Driver mẫu sử dụng symbol_get để gọi hàm từ driver khác");
