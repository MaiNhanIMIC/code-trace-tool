#include <linux/module.h>
#include <linux/i2c.h>
#include <linux/fs.h>
#include <linux/device.h>
#include <linux/cdev.h>
#include <linux/uaccess.h>

#define DRIVER_NAME "bbb_eeprom"

static dev_t dev_num;
static struct cdev eeprom_cdev;
static struct class *eeprom_class;
static struct device *eeprom_device;
static struct i2c_client *eeprom_client;

/* Hàm đọc 1 byte từ EEPROM */
static ssize_t eeprom_read(struct file *file, char __user *buf, size_t count, loff_t *offset)
{
    uint8_t reg_addr = *offset & 0xFF; // Sử dụng offset như địa chỉ thanh ghi (1 byte address)
    uint8_t data;
    int ret;

    ret = i2c_smbus_read_byte_data(eeprom_client, reg_addr);
    if (ret < 0) {
        pr_err("Lỗi đọc từ EEPROM\n");
        return ret;
    }

    data = (uint8_t)ret;
    if (copy_to_user(buf, &data, 1))
        return -EFAULT;

    *offset += 1;
    return 1;
}

/* Hàm ghi 1 byte vào EEPROM */
static ssize_t eeprom_write(struct file *file, const char __user *buf, size_t count, loff_t *offset)
{
    uint8_t reg_addr = *offset & 0xFF;
    uint8_t data;
    int ret;

    if (copy_from_user(&data, buf, 1))
        return -EFAULT;

    ret = i2c_smbus_write_byte_data(eeprom_client, reg_addr, data);
    if (ret < 0) {
        pr_err("Lỗi ghi vào EEPROM\n");
        return ret;
    }

    *offset += 1;
    return 1;
}

static struct file_operations eeprom_fops = {
    .owner = THIS_MODULE,
    .read = eeprom_read,
    .write = eeprom_write,
};

/* Hàm Probe (Theo chuẩn Kernel 6.x) */
static int eeprom_probe(struct i2c_client *client)
{
    int ret;

    eeprom_client = client;

    /* Đăng ký Character Device */
    ret = alloc_chrdev_region(&dev_num, 0, 1, DRIVER_NAME);
    if (ret < 0) return ret;

    cdev_init(&eeprom_cdev, &eeprom_fops);
    ret = cdev_add(&eeprom_cdev, dev_num, 1);
    if (ret < 0) goto r_class;

    /* Tạo Device node /dev/bbb_eeprom */
    eeprom_class = class_create(DRIVER_NAME);
    if (IS_ERR(eeprom_class)) {
        ret = PTR_ERR(eeprom_class);
        goto r_cdev;
    }

    eeprom_device = device_create(eeprom_class, NULL, dev_num, NULL, DRIVER_NAME);
    if (IS_ERR(eeprom_device)) {
        ret = PTR_ERR(eeprom_device);
        goto r_device;
    }

    pr_info("BBB EEPROM Driver khởi tạo thành công tại I2C address 0x%02x\n", client->addr);
    return 0;

r_device:
    class_destroy(eeprom_class);
r_cdev:
    cdev_del(&eeprom_cdev);
r_class:
    unregister_chrdev_region(dev_num, 1);
    return ret;
}

static void eeprom_remove(struct i2c_client *client)
{
    device_destroy(eeprom_class, dev_num);
    class_destroy(eeprom_class);
    cdev_del(&eeprom_cdev);
    unregister_chrdev_region(dev_num, 1);
    pr_info("BBB EEPROM Driver đã được gỡ bỏ\n");
}

static const struct of_device_id eeprom_dt_ids[] = {
    { .compatible = "bbb,custom-eeprom", },
    { }
};
MODULE_DEVICE_TABLE(of, eeprom_dt_ids);

static struct i2c_driver eeprom_driver = {
    .driver = {
        .name = DRIVER_NAME,
        .of_match_table = eeprom_dt_ids,
    },
    .probe = eeprom_probe,
    .remove = eeprom_remove,
};

module_i2c_driver(eeprom_driver);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("trongnhan.m");
MODULE_DESCRIPTION("I2C EEPROM Driver cho BeagleBone Black - Kernel 6.12");
