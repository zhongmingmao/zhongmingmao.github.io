---
title: Linux -- 启动过程
date: 2019-04-10 12:51:17
categories:
    - Linux
tags:
    - Linux
---

## BIOS

### ROM + RAM
1. 主板上有ROM，是**只读**的，上面固化了BIOS程序
2. ROM：Read Only Memory
3. RAM：Read Access Memory
4. BIOS：Basic Input and Output System

<!-- more -->

### 1M寻址空间
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-bios-bootloader-1m.jpg" width=800/>

1. 在x86系统，将1M的**内存空间**最上面的`0xF0000~0xFFFFF`这**64K**空间映射给ROM
2. 电脑在刚启动时，会做一些重置的工作，将CPU的CS设置为`0xFFFF`，将CPU的IP设置为`0x0000`
    - 因此，第一条指令将指向`0xFFFF0`（0xFFFF << 4 + 0x0000），在ROM的范围内
    - 在这里，有一个**JMP**命令（约定）会跳到ROM中执行初始化工作的代码，接着BIOS开始进行**初始化**的工作
        - BIOS检查一下**系统硬件**是否都正常
        - 建立一个**中断向量表**和**中断服务程序**，因为要使用键盘和鼠标，这些都是要通过中断来进行的
        - 在内存空间映射显存的空间，在显示器上显示一些字符

## bootloader
1. BIOS在做完自己的事情后，便开始打听操作系统的下落
2. 操作系统一般会安装在磁盘上，在BIOS界面，有一个选择**启动盘**的选项
    - 启动盘的特点：一般在**第一个扇区**（512字节），以`0xAA55`结束
    - 这是一个**约定**，当满足这个条件时，说明这是一个启动盘，在512字节以内会**启动**相关的代码

## Grub
Grub：_**Grand Unified Bootloader Version 2**_

### 启动列表
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-centos-grub-boot-menu.png" width=1000/>

```shell
$ cat /boot/grub2/grub.cfg

### BEGIN /etc/grub.d/10_linux ###
menuentry 'CentOS Linux (3.10.0-957.el7.x86_64) 7 (Core)' --class centos --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-3.10.0-957.el7.x86_64-advanced-d29269ec-9932-4955-9c91-22cf19b96f1b' {
        load_video
        set gfxpayload=keep
        insmod gzio
        insmod part_msdos
        insmod xfs
        set root='hd0,msdos1'
        if [ x$feature_platform_search_hint = xy ]; then
          search --no-floppy --fs-uuid --set=root --hint-bios=hd0,msdos1 --hint-efi=hd0,msdos1 --hint-baremetal=ahci0,msdos1 --hint='hd0,msdos1'  426233b2-066b-4537-b029-5abf3aca8a06
        else
          search --no-floppy --fs-uuid --set=root 426233b2-066b-4537-b029-5abf3aca8a06
        fi
        linux16 /vmlinuz-3.10.0-957.el7.x86_64 root=/dev/mapper/centos-root ro crashkernel=auto rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet
        initrd16 /initramfs-3.10.0-957.el7.x86_64.img
}
menuentry 'CentOS Linux (0-rescue-b73c751c3f7145f995aa2c110745e89b) 7 (Core)' --class centos --class gnu-linux --class gnu --class os --unrestricted $menuentry_id_option 'gnulinux-0-rescue-b73c751c3f7145f995aa2c110745e89b-advanced-d29269ec-9932-4955-9c91-22cf19b96f1b' {
        load_video
        insmod gzio
        insmod part_msdos
        insmod xfs
        set root='hd0,msdos1'
        if [ x$feature_platform_search_hint = xy ]; then
          search --no-floppy --fs-uuid --set=root --hint-bios=hd0,msdos1 --hint-efi=hd0,msdos1 --hint-baremetal=ahci0,msdos1 --hint='hd0,msdos1'  426233b2-066b-4537-b029-5abf3aca8a06
        else
          search --no-floppy --fs-uuid --set=root 426233b2-066b-4537-b029-5abf3aca8a06
        fi
        linux16 /vmlinuz-0-rescue-b73c751c3f7145f995aa2c110745e89b root=/dev/mapper/centos-root ro crashkernel=auto rd.lvm.lv=centos/root rd.lvm.lv=centos/swap rhgb quiet
        initrd16 /initramfs-0-rescue-b73c751c3f7145f995aa2c110745e89b.img
}
if [ "x$default" = 'CentOS Linux (3.10.0-957.el7.x86_64) 7 (Core)' ]; then default='Advanced options for CentOS Linux>CentOS Linux (3.10.0-957.el7.x86_64) 7 (Core)'; fi;
### END /etc/grub.d/10_linux ###
```

### grub2-mkconfig
```
$ grub2-mkconfig -o /boot/grub2/grub.cfg
Generating grub configuration file ...
Found linux image: /boot/vmlinuz-3.10.0-957.el7.x86_64
Found initrd image: /boot/initramfs-3.10.0-957.el7.x86_64.img
Found linux image: /boot/vmlinuz-0-rescue-b73c751c3f7145f995aa2c110745e89b
Found initrd image: /boot/initramfs-0-rescue-b73c751c3f7145f995aa2c110745e89b.img
done
```

## grub2-install
```shell
# 将启动程序安装到相应的位置
$ grub2-install /dev/sdb
Installing for i386-pc platform.
Installation finished. No error reported.
```

### imgs
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-centos-grub2-install.jpeg" width=800/>
```
$ ll /boot/grub2/i386-pc/*.img
-rw-r--r--. 1 root root   512 4月  11 22:16 /boot/grub2/i386-pc/boot.img
-rw-r--r--. 1 root root 27810 4月  11 22:16 /boot/grub2/i386-pc/core.img

ll /usr/lib/grub/i386-pc/*img
-rw-r--r--. 1 root root   512 11月  8 19:58 /usr/lib/grub/i386-pc/boot_hybrid.img
-rw-r--r--. 1 root root   512 11月  8 19:58 /usr/lib/grub/i386-pc/boot.img
-rw-r--r--. 1 root root  2048 11月  8 19:58 /usr/lib/grub/i386-pc/cdboot.img
-rw-r--r--. 1 root root   512 11月  8 19:58 /usr/lib/grub/i386-pc/diskboot.img
-rw-r--r--. 1 root root 28120 11月  8 19:58 /usr/lib/grub/i386-pc/kernel.img
-rw-r--r--. 1 root root  1024 11月  8 19:58 /usr/lib/grub/i386-pc/lnxboot.img
-rw-r--r--. 1 root root  2896 11月  8 19:58 /usr/lib/grub/i386-pc/lzma_decompress.img
-rw-r--r--. 1 root root  1024 11月  8 19:58 /usr/lib/grub/i386-pc/pxeboot.img
```

### boot.img
1. grub2第一个要安装的是boot.img，它由boot.S编译而成，一共**512**字节，被安装到**启动盘的第一个扇区**
    - 这个扇区通常称为**MBR**（Master Boot Record，**主引导记录/扇区**）
2. BIOS完成任务后，会将boot.img从硬盘加载到内存中的`0x7c00`来运行
3. 由于boot.img只有512字节，因此能做的事情非常有限，它能做的最重要的一件事情是加载grub2的另一个镜像**core.img**

### core.img
1. core.img由**diskboot.img、lzma_decompress.img、kernel.img**（Grub内核）和一系列模块组成
2. boot.img先加载core.img的**第一个扇区**，如果从硬盘启动，这个扇区里面的是diskboot.img，对应的代码是diskboot.S
3. boot.img将**控制权**交给diskboot.img后，diskboot.img的任务就是将**core.img的其他部分**加载进来
    - 先加载lzma_decompress.img，再加载kernel.img（Grub内核），最后是各个module对应的img
4. lzma_decompress.img对应的代码是startup_raw.S，kernel.img是压缩过的，因此在执行之前，需要先**解压缩**
5. 在这之前，所有遇到过的程序都非常小，完全可以在**实模式**下运行
    - 但随着加载的东西越来越大，实模式的1M地址空间最终会放不下了
    - 所以在**真正的解压缩之前**，lzma_decompress.img会调用**real_to_prot**，切换到**保护模式**
    - 这样就能使用更大的寻址空间，加载更大的内容

#### 实模式 -> 保护模式
切换到**保护模式**需要执行很多工作，大部分工作都与**内存的访问方式**有关

##### 分段 + 分页
1. _**启动分段**：在内存里建立**段描述符**，将**段寄存器**变成**段选择子**，指向**段描述符**，这样就能实现**不同进程的切换**_
2. _**启动分页**：能够管理的内存变大了，就需要将内存分成**相等大小的块**_

##### real_to_prot
1. 在**实模式**下，一共有20根地址线，可以访问1M的地址空间
2. 在**保护模式**下，第21根就要起作用了，需要打开Gate A20，即第21根地址线的**控制线**
3. 函数：`DATA32 call real_to_prot`（startup_raw.S）
4. 此时此刻，有的是空间，接下来需要对压缩过的kernel.img进行**解压缩**，然后跳转到kernal.img开始执行

#### kernal.img
1. kernal.img对应的代码是startup.S以及一堆c文件，在startup.S中会调用grub_main函数
    - 在grub_main函数中，首先从`grub_load_config ()`开始解析`grub.conf`
    - 如果能够正常启动，grub_main函数会调用`grub_command_execute("normal", 0, 0)`
    - 最终会调用`grub_normal_execute()`函数
        - 在这个函数里，`grub_show_menu()`会列出可选择的操作系统列表
2. 选择了一项，就要开始启动某个操作系统，调用`grub_menu_execute_entry()`
    - `linux16`命令
        - **装载指定的内核文件**，**传递内核启动参数**，调用`grub_cmd_linux`函数
        - 首先读取**Linux内核镜像头部**的一些数据结构，放到内存中的数据结构来检查
        - 如果检测通过，就会读取**整个Linux内核镜像**到内存
    - `initrd`命令
        - 用于为即将启动的内核传递`init ramdisk`路径
        - 调用`grub_cmd_initrd`函数，将`initramfs`加载到内存中
    - 最后，调用`grub_command_execute("boot",0,0)`函数，这才开始_**真正地启动内核**_

## 启动过程小结
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-boot-process.jpeg" width=800/>

<!-- indicate-the-source -->
