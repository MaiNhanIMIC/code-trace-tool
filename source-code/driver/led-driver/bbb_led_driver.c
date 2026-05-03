#include <linux/module.h>
#include <linux/platform_device.h>
#include <linux/gpio/consumer.h>
#include <linux/of.h>
#include <linux/device.h>

struct bbb_led_data {
    struct gpio_desc *led_gpio;
};

static struct bbb_led_data *global_led_data = NULL;
static struct class *led_class = NULL;

/* Hàm đọc trạng thái LED (Show) */
static ssize_t value_show(struct class *class, struct class_attribute *attr, char *buf) {
    if (!global_led_data || !global_led_data->led_gpio)
        return -ENODEV;
    
    return sprintf(buf, "%d\n", gpiod_get_value(global_led_data->led_gpio));
}

/* Hàm ghi trạng thái LED (Store) */
static ssize_t value_store(struct class *class, struct class_attribute *attr, const char *buf, size_t count) {
    int val;
    if (!global_led_data || !global_led_data->led_gpio)
        return -ENODEV;

    if (kstrtoint(buf, 10, &val) < 0)
        return -EINVAL;

    gpiod_set_value(global_led_data->led_gpio, val ? 1 : 0);
    return count;
}

/* Định nghĩa thuộc tính 'value' cho class */
static CLASS_ATTR_RW(value);

static int bbb_led_probe(struct platform_device *pdev) {
    struct device *dev = &pdev->dev;
    struct bbb_led_data *data;
    int ret;

    dev_info(dev, "Probing BBB Green LED Driver...\n");

    data = devm_kzalloc(dev, sizeof(*data), GFP_KERNEL);
    if (!data) return -ENOMEM;

    /* Lấy GPIO từ Device Tree */
    data->led_gpio = devm_gpiod_get(dev, NULL, GPIOD_OUT_LOW);
    if (IS_ERR(data->led_gpio)) {
        return dev_err_probe(dev, PTR_ERR(data->led_gpio), "Failed to get GPIO\n");
    }

    global_led_data = data;

    /* Tạo class bbb_led để xuất hiện tại /sys/class/bbb_led */
    led_class = class_create("bbb_led");
    if (IS_ERR(led_class)) {
        return PTR_ERR(led_class);
    }

    /* Tạo file 'value' trong /sys/class/bbb_led/value */
    ret = class_create_file(led_class, &class_attr_value);
    if (ret) {
        class_destroy(led_class);
        return ret;
    }

    platform_set_drvdata(pdev, data);
    return 0;
}

static int bbb_led_remove(struct platform_device *pdev) {
    if (led_class) {
        class_remove_file(led_class, &class_attr_value);
        class_destroy(led_class);
    }
    
    if (global_led_data && global_led_data->led_gpio) {
        gpiod_set_value(global_led_data->led_gpio, 0); // Tắt LED khi remove
    }
    
    global_led_data = NULL;
    return 0;
}

static const struct of_device_id bbb_led_of_match[] = {
    { .compatible = "bbb,green_led", },
    { },
};
MODULE_DEVICE_TABLE(of, bbb_led_of_match);

static struct platform_driver bbb_led_driver = {
    .driver = {
        .name = "bbb_green_led_driver",
        .of_match_table = bbb_led_of_match,
    },
    .probe = bbb_led_probe,
    .remove = bbb_led_remove,
};

module_platform_driver(bbb_led_driver);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("trongnhan.m");
MODULE_DESCRIPTION("Platform Driver for BBB LED at P9.12");
