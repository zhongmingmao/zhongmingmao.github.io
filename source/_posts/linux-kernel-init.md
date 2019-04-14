---
title: Linux -- 内核初始化
date: 2019-04-13 10:35:08
categories:
    - Linux
tags:
    - Linux
---

## start_kernel()
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-kernel-init-start-kernel.jpeg" width=800/>

<!-- more -->

```c
// init/main.c
asmlinkage __visible void __init start_kernel(void)
{
    // 0号进程（创始进程）
    set_task_stack_end_magic(&init_task);
    // 设置中断门（系统调用是通过中断的方式触发）
    trap_init();
    // 初始化内存管理模块
    mm_init();
    // 初始化调度模块
    sched_init();
    // 初始化基于内存的文件系统rootfs
    vfs_caches_init();
    // 创建1号进程（用户态总管）和2号进程（内核态总管）
    arch_call_rest_init();
    ...
}
```
1. 内核的启动是从入口函数start_kernel()开始，相当于内核的main函数
2. start_kernel()函数里面有各种各样的初始化函数（XXX_init）

## 0号进程
1. `set_task_stack_end_magic(&init_task)`，这是系统创建的第一个进程，称为**0号进程**
2. 0号进程是**唯一**一个没有通过`fork`或者`kernel_thread`产生的进程，是进程列表的第一个进程

## trap_init()
1. trap_init()里面设置了很多**中断门**（Interrupt Gate），用于处理各种中断
2. 系统调用的也是通过**发送中断**的方式进行的，系统调用的中断门
    - 32位：`SYSG(IA32_SYSCALL_VECTOR,	entry_INT80_32)`
    - 64位的有另外的系统调用方法

## mm_init() + sched_init()
1. mm_init()：初始化**内存管理模块**
2. sched_init()：初始化**调度模块**

## vfs_caches_init()
```c
// fs/dcache.c
void __init vfs_caches_init(void)
{
    mnt_init();
}

// init/do_mounts.c
void __init mnt_init(void)
{
    init_rootfs();
}

// init/do_mounts.c
int __init init_rootfs(void)
{
    // 在VFS虚拟文件系统里面注册一种类型
    int err = register_filesystem(&rootfs_fs_type);
}
```
1. vfs_caches_init()：初始化**基于内存的文件系统**`rootfs`
2. 在vfs_caches_init()中会依次调用：mnt_init() -> init_rootfs() -> register_filesystem(&rootfs_fs_type)

### VFS
1. VFS: **Virtual File System**，虚拟文件系统
2. 为了兼容各种各样的文件系统，需要将文件的相关数据结构和操作**抽象**出来，形成一个抽象层并对上提供统一的接口

## rest_init()
start_kernel()最后调用的是rest_init()，用来进行其他方面的初始化
```c
// init/main.c
noinline void __ref rest_init(void)
{
    // 初始化1号进程，用户态总管，systemd
    pid = kernel_thread(kernel_init, NULL, CLONE_FS);
    ...
    // 初始化2号进程，内核态总管，kthreadd
    pid = kernel_thread(kthreadd, NULL, CLONE_FS | CLONE_FILES);
}
```
```
$ top
PID USER      PR  NI    VIRT    RES    SHR S %CPU %MEM     TIME+ COMMAND
103587 root      20   0  162004   2284   1612 R  0.3  0.2   0:00.42 top
103801 root      20   0       0      0      0 S  0.3  0.0   0:00.08 kworker/0:1
     1 root      20   0  127976   6544   4136 S  0.0  0.7   0:25.99 systemd
     2 root      20   0       0      0      0 S  0.0  0.0   0:00.03 kthreadd
```

### 1号进程
1. 通过`kernel_thread(kernel_init, NULL, CLONE_FS)`创建第二个线程，即**1号进程**
2. 1号进程对于操作系统来说，具有划时代的意义，因为1号进程将运行一个_**用户进程**_

#### 权限
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-x86-ring-permission.jpeg" width=800/>
1. 原来只有0号进程，所有资源都可以使用，没有竞争关系，也无须担心被恶意破坏
2. 现在有了1号进程，需要区分核心资源和非核心资源，而x86提供了_**分层的权限机制**_
    - 把区域分成了4个Ring，越往里权限越高
3. 操作系统很好地利用了x86的分层权限机制
    - 将能够访问**关键资源**的代码放在**Ring0**，称为**内核态**（Kernel Mode）
    - 将普通的程序代码放在Ring3，称为**用户态**（User Mode）
4. 回忆Linux的启动过程，易知此时系统是处于**保护模式**的
    - 保护模式除了**寻址空间变大**以外，还有另外一个重要功能就是**保护**
    - 保护：_**禁止处于用户态的代码执行更高权限的指令**_
5. 如果用户态的代码需要访问核心资源，需要通过_**系统调用**_

#### 状态切换
_**用户态 -> 系统调用 -> 保存寄存器 -> 内核态执行系统调用 -> 恢复寄存器 -> 返回用户态**_
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-user-kernel-switch.jpeg" width=800/>

##### 发送网络包
1. 场景
    - 当一个用户态程序运行到一半时，要访问一个核心资源，例如访问网卡发送一个网络包
    - 此时需要暂停当前运行的用户态程序，调用**系统调用**，切换到**内核态**，接下来就是运行内核中的代码了
    - 内核将从系统调用传过来的包，在网卡上排队，等待发送
    - 发送完了，系统调用就结束，返回**用户态**，让暂停运行的用户态程序继续运行
2. 如何实现暂停？
    - 在暂停的那一刻，需要把当时CPU**寄存器**的值**全部**暂存到一个地方（进程管理系统很容易获取）
    - 当系统调用执行完毕，准备返回的时候，再从这个地方将寄存器的值恢复回去，就能接着运行了

<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-send-network-packet.jpeg" />

#### 内核态 -> 用户态
```c
// init/main.c
static int __ref kernel_init(void *unused)
{
    // 将ramdisk_execute_command设置为/init
    kernel_init_freeable();

    // 执行ramdisk的/init
    if (ramdisk_execute_command) {
    	ret = run_init_process(ramdisk_execute_command);
    }

    // 执行根文件系统的/sbin/init、/etc/init、/bin/init、/bin/sh
    if (execute_command) {
    	ret = run_init_process(execute_command);
    }
    if (!try_to_run_init_process("/sbin/init") ||
        !try_to_run_init_process("/etc/init") ||
        !try_to_run_init_process("/bin/init") ||
        !try_to_run_init_process("/bin/sh"))
    	return 0;
}

// init/main.c
static noinline void __init kernel_init_freeable(void)
{
    if (!ramdisk_execute_command)
    	ramdisk_execute_command = "/init";
}

// init/main.c
static int run_init_process(const char *init_filename)
{
    // 系统调用，运行一个可执行文件，do_xxx往往是内核系统调用的实现
    return do_execve(getname_kernel(init_filename)...);
}

// init/main.c
static int try_to_run_init_process(const char *init_filename)
{
    ret = run_init_process(init_filename);
}

// fs/exec.c
int do_execve(struct filename *filename...)
{
    return do_execveat_common(AT_FDCWD, filename, argv, envp, 0);
}

// fs/exec.c
static int do_execveat_common(int fd, struct filename *filename,...)
{
    return __do_execve_file(fd, filename, argv, envp, flags, NULL);
}

// fs/exec.c
static int __do_execve_file(int fd, struct filename *filename,...)
{
    retval = exec_binprm(bprm);
}

// fs/exec.c
static int exec_binprm(struct linux_binprm *bprm)
{
    ret = search_binary_handler(bprm);
}

// fs/exec.c
int search_binary_handler(struct linux_binprm *bprm)
{
    struct linux_binfmt *fmt;
    retval = fmt->load_binary(bprm);
}

// fs/binfmt_elf.c
static struct linux_binfmt elf_format = {
    .module         = THIS_MODULE,
    .load_binary    = load_elf_binary,
    .load_shlib     = load_elf_library,
    .core_dump      = elf_core_dump,
    .min_coredump   = ELF_EXEC_PAGESIZE,
};

// fs/binfmt_elf.c
static int load_elf_binary(struct linux_binprm *bprm)
{
    start_thread(regs, elf_entry, bprm->p);
}

// arch/x86/kernel/process_32.c
void start_thread(struct pt_regs *regs, unsigned long new_ip, unsigned long new_sp)
{
    set_user_gs(regs, 0);
    regs->fs		= 0;
    regs->ds		= __USER_DS;
    regs->es		= __USER_DS;
    regs->ss		= __USER_DS;
    regs->cs		= __USER_CS;
    regs->ip		= new_ip;
    regs->sp		= new_sp;
    regs->flags		= X86_EFLAGS_IF;
    force_iret();
}
```
1. 在1号进程的启动过程中，当执行kernel_thread函数时，还处于**内核态**，需要切换到**用户态**去运行程序
2. kernel_thread的第一个参数是一个函数kernel_init，kernel_init函数会调用kernel_init_freeable()
3. 1号进程运行的是一个**文件**，在run_init_process函数中，可见它实际调用的是do_execve
    - execve是一个系统调用，作用是运行一个**可执行文件**，do_xxx往往是内核系统调用的实现
4. 尝试运行ramdisk上的/init，或者普通文件系统上的/sbin/init、/etc/init、/bin/init、/bin/sh
    - 不同版本的Linux会选择不同的文件启动，只要有一个能起来即可
5. 利用执行init文件的机会，从内核态回到用户态
    - 调用do_execve，恰好是上面系统调用过程的后半部分：_**内核态执行系统调用 -> 恢复寄存器 -> 返回用户态**_
    - `load_binary`
        - 运行一个程序，需要加载**二进制文件**
        - 而二进制文件也是有一定的格式，Linux下的常用格式为**ELF**（Executable and Linkable Format）
    - `.load_binary	= load_elf_binary`：先调用load_elf_binary，最后调用start_thread
        - start_thread的第一个参数`struct pt_regs`为**寄存器**
        - 这个结构是在**系统调用**时，_内核中用于保存**用户态运行上下文**_
        - 将用户态代码段CS设置为`__USER_CS`，将用户态的数据段DS设置为`__USER_DS`
            - 以及指令指针寄存器IP和栈指针寄存器SP
        - force_iret()用于从系统调用中返回，此时会**恢复寄存器**
        - CS和指令指针寄存器IP恢复了，指向用户态下一个要执行的指令
        - DS和函数栈指针SP也恢复了，指向用户态函数栈的栈顶

#### ramdisk
1. init终于从内核态到用户态了，一开始到用户态的是ramdisk的init
    - 后来会启动**真正根文件系统**上的init，成为_**所有用户态进程的祖先**_
2. Grub启动配置
    - `initrd16 /initramfs-3.10.0-957.el7.x86_64.img` -- 基于**内存**的文件系统
3. 刚才的init程序是在**文件系统**上的，而文件系统一定是在**存储设备**上的，例如硬盘
4. Linux需要**驱动**才能访问存储设备
    - 如果存储系统的数量很有限，那么驱动可以直接放到内核里面，内核会被加载到内存里，进而对存储系统进行访问
    - 但现在存储系统很多，如果把所有存储系统的驱动都放进内核，那内核会很大
5. 因此可以先弄一个基于**内存**的文件系统，**内存访问是不需要驱动的**，这就是ramdisk，此时的**ramdisk是根文件系统**
6. 然后开始运行ramdisk上的/init，运行完毕后就已经是用户态的
7. ramdisk上的/init程序会**根据存储系统类型加载驱动**，加载驱动后就可以**设置真正的根文件系统**了
8. 有了真正的根文件系统，ramdisk上的/init会启动文件系统上的init
9. 接下来就是各种系统的初始化，如启动系统服务，控制台等，用户就可以登录进来了

### 2号进程
1. 通过`kernel_thread(kthreadd, NULL, CLONE_FS | CLONE_FILES)`创建第三个进程，即2号进程
2. 进程与线程
    - 从**用户态**来看，创建的是**进程**
    - 从**内核态**来看，无论进程还是线程，都可以统称为**任务**，使用**相同的数据结构**，**平放在同一个链表中**
3. kthreadd负责所有内核态线程的调度和管理，是_**内核态所有线程的祖先**_

<!-- indicate-the-source -->
