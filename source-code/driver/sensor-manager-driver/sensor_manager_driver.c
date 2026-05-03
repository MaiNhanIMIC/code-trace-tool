#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/kprobes.h>

/* Định nghĩa kiểu hàm cho bbb_calculate_checksum */
typedef u8 (*bbb_checksum_func_t)(const u8 *, size_t);

/* Kiểu hàm cho kallsyms_lookup_name */
typedef unsigned long (*kallsyms_lookup_name_t)(const char *name);

static int __init sensor_manager_init(void) {
    kallsyms_lookup_name_t lookup_name;
    bbb_checksum_func_t calc_checksum = NULL;
    struct kprobe kp = {
        .symbol_name = "kallsyms_lookup_name",
    };
    u8 data[] = { 0xAA, 0xBB, 0xCC, 0xDD };
    u8 result;

    pr_info("Sensor Manager: Đang khởi tạo bằng phương pháp Dynamic Lookup (Kernel 6.12)\n");

    /* 
     * Bước 1: Tìm địa chỉ của kallsyms_lookup_name thông qua kprobe 
     * (Vì kallsyms_lookup_name không còn được export từ bản 5.7)
     */
    if (register_kprobe(&kp) < 0) {
        pr_err("Sensor Manager: Không thể tìm thấy kallsyms_lookup_name\n");
        return -EFAULT;
    }
    lookup_name = (kallsyms_lookup_name_t)kp.addr;
    unregister_kprobe(&kp);

    /* 
     * Bước 2: Sử dụng lookup_name để "tìm symbol" (tương đương find_symbol)
     */
    if (lookup_name) {
        calc_checksum = (bbb_checksum_func_t)lookup_name("bbb_calculate_checksum");
    }

    /* Bước 3: Sử dụng hàm nếu tìm thấy */
    if (calc_checksum) {
        pr_info("Sensor Manager: Đã tìm thấy symbol 'bbb_calculate_checksum' tại: %p\n", calc_checksum);
        result = calc_checksum(data, sizeof(data));
        pr_info("Sensor Manager: Checksum kết quả (Dynamic Call) = 0x%02x\n", result);
    } else {
        pr_err("Sensor Manager: Thất bại! Không tìm thấy hàm bbb_calculate_checksum.\n");
        pr_err("Sensor Manager: Hãy đảm bảo module bbb_shared_lib đã được nạp.\n");
        return -ENODEV;
    }

    return 0;
}

static void __exit sensor_manager_exit(void) {
    pr_info("Sensor Manager: Gỡ bỏ module\n");
}

module_init(sensor_manager_init);
module_exit(sensor_manager_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("trongnhan.m");
MODULE_DESCRIPTION("Driver 6.12 thực hiện tìm kiếm symbol động (Simulation of find_symbol)");
