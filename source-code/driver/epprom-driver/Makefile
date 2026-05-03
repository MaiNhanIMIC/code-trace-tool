obj-m += bbb_eeprom_driver.o

# Trỏ đến thư mục source/build của kernel 6.12 đang chạy trên BeagleBone
KDIR ?= /lib/modules/$(shell uname -r)/build

all:
	make -C $(KDIR) M=$(PWD) modules

clean:
	make -C $(KDIR) M=$(PWD) clean
