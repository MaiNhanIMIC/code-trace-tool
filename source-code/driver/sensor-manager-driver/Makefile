obj-m += sensor_manager_driver.o

# Cần CONFIG_KPROBES để tìm symbol động
ccflags-y := -I$(src)/../shared-lib-driver

all:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules

clean:
	make -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean
