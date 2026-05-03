obj-m += bbb_led_driver.o

# Đường dẫn tới thư mục mã nguồn Linux Kernel 6.12 của bạn
KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	make -C $(KDIR) M=$(PWD) modules

clean:
	make -C $(KDIR) M=$(PWD) clean
