---
title: Linux -- 系统调用过程
date: 2019-04-20 16:51:28
categories:
    - Linux
tags:
    - Linux
---

## glibc
1. glibc更熟悉系统调用的细节，封装成更加友好的接口，可以直接调用
2. 在**用户态**进程调用glibc的open函数（函数定义如下）

```cpp
int open(const char *pathname, int flags, mode_t mode)
```

<!-- more -->

### syscalls.list
syscalls.list记录了所有glibc函数所对应的系统调用
```
# File name	Caller	Syscall name	Args	Strong name	Weak names
open		-	open		Ci:siv	__libc_open __open open
```

### make-syscalls.sh
1. make-syscalls.sh会根据上面的配置文件，对于每个封装好的系统调用，生成一个文件F
2. 文件F里面会定义一些宏，例如`#define SYSCALL_NAME open`
    - make-syscalls.sh中对应的代码为`echo '#define SYSCALL_NAME $syscall'`

### syscall-template.S
syscall-template.S会使用文件F里面的宏，定义这个系统调用的**调用方式**
```c
// PSEUDO是伪代码的意思
T_PSEUDO (SYSCALL_SYMBOL, SYSCALL_NAME, SYSCALL_NARGS)
	ret
T_PSEUDO_END (SYSCALL_SYMBOL)

#define T_PSEUDO(SYMBOL, NAME, N)		PSEUDO (SYMBOL, NAME, N)
```

### sysdep.h
PSEUDO也是一个宏，定义如下（sysdeps/unix/sysv/linux/i386/sysdep.h）
```c
#define	PSEUDO(name, syscall_name, args)				      \
  .text;								      \
  ENTRY (name)								      \
    DO_CALL (syscall_name, args);					      \
    cmpl $-4095, %eax;							      \
    jae SYSCALL_ERROR_LABEL
```
里面对于任何一个系统调用，都会调用**DO_CALL**，DO_CALL也是一个宏（32位和64位的定义是不一样的）

## 32位系统调用

### sysdep.h
sysdeps/unix/sysv/linux/i386/sysdep.h
```c
// glibc源码
/* Linux takes system call arguments in registers:
	syscall number %eax	     call-clobbered
	arg 1          %ebx	     call-saved
	arg 2          %ecx	     call-clobbered
	arg 3          %edx	     call-clobbered
	arg 4          %esi	     call-saved
	arg 5          %edi	     call-saved
	arg 6          %ebp	     call-saved
*/

#define DO_CALL(syscall_name, args)			      		      \
    PUSHARGS_##args							      \
    DOARGS_##args							      \
    movl $SYS_ify (syscall_name), %eax;					      \
    ENTER_KERNEL							      \
    POPARGS_##args
```
1. 将请求参数放在**寄存器**里面（PUSHARGS）
2. 根据**系统调用的名称**，得到**系统调用号**（SYS_ify (syscall_name)），_**放在寄存器`%eax`里面**_
3. 然后执行`ENTER_KERNEL`

### ENTER_KERNEL
```c
// glibc源码
# define ENTER_KERNEL int $0x80
```
1. int是**interrupt**的意思，`int $0x80`就是触发一个**软中断**，通过它可以陷入（trap）内核
2. 在内核启动过程中，有一个`trap_init()`函数，其中有代码`SYSG(IA32_SYSCALL_VECTOR,	entry_INT80_32)`
    - 这是一个软中断的陷入门，当接收到一个系统调用时，`entry_INT80_32`就会被调用

### entry_INT80_32
```c
// Linux源码
ENTRY(entry_INT80_32)
	ASM_CLAC
	pushl	%eax			/* pt_regs->orig_ax */
	SAVE_ALL pt_regs_ax=$-ENOSYS switch_stacks=1	/* save rest */
	movl	%esp, %eax
	call	do_int80_syscall_32
.Lsyscall_32_done:
...
.Lirq_return:
	INTERRUPT_RETURN
...
ENDPROC(entry_INT80_32)

/* Handles int $0x80 */
__visible void do_int80_syscall_32(struct pt_regs *regs)
{
	do_syscall_32_irqs_on(regs);
}
```
在进入内核之前，通过push和SAVE_ALL将当前**用户态的寄存器**，保存在**pt_regs**结构里面，然后调用do_int80_syscall_32

### do_syscall_32_irqs_on
```c
// Linux源码
static __always_inline void do_syscall_32_irqs_on(struct pt_regs *regs)
{
	struct thread_info *ti = current_thread_info();
	unsigned int nr = (unsigned int)regs->orig_ax;
    ...
	if (likely(nr < IA32_NR_syscalls)) {
		regs->ax = ia32_sys_call_table[nr](
			(unsigned int)regs->bx, (unsigned int)regs->cx,
			(unsigned int)regs->dx, (unsigned int)regs->si,
			(unsigned int)regs->di, (unsigned int)regs->bp);
	}
	syscall_return_slowpath(regs);
}

#define ia32_sys_call_table sys_call_table
```
1. 将**系统调用号**从寄存器`%eax`中取出，然后根据系统调用号，在**系统调用表**中找到相应的函数进行调用
2. 将寄存器中保存的参数取出来，作为函数参数
3. 根据宏定义，`#define ia32_sys_call_table sys_call_table`，系统调用就放在这个表里面

### INTERRUPT_RETURN
```c
// Linux源码
#define INTERRUPT_RETURN		iret
```
iret指令将原来**用户态**保存的现场恢复回来，包括代码段、指令指针寄存器等，此时用户态进程**恢复执行**

### 小结
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-system-call-32.jpg" width=800/>

## 64位系统调用

### sysdep.h
sysdeps/unix/sysv/linux/x86_64/sysdep.h
```c
// glibc源码
/* The Linux/x86-64 kernel expects the system call parameters in
   registers according to the following table:

    syscall number	rax
    arg 1		rdi
    arg 2		rsi
    arg 3		rdx
    arg 4		r10
    arg 5		r8
    arg 6		r9
*/

#define DO_CALL(syscall_name, args)					      \
  lea SYS_ify (syscall_name), %rax;					      \
  syscall
```
1. 与32位的系统调用类似，首先将**系统调用名称**转换为**系统调用号**，_**放在寄存器`%rax`**_
2. 在这里是**进行真正调用**，而不是采用**中断**模式，改用`syscall`指令（传递参数的寄存器也改变了）

### syscall
1. syscall指令使用了一种特殊的寄存器，称为**特殊模块寄存器**（Model Specific Registers，**MSR**）
2. MSR是CPU为了完成某些**特殊控制功能**为目的的寄存器，例如_**系统调用**_
3. 在Linux系统初始化时，trap_init除了初始化上面的**中断模式**外，还会调用cpu_init()，而cpu_init()会调用**syscall_init()**

### syscall_init()
```c
// Linux源码
void syscall_init(void)
{
	wrmsrl(MSR_LSTAR, (unsigned long)entry_SYSCALL_64);
}
```
1. rdmsr和wrmsr是用来读写特殊模块寄存器的，MSR_LSTAR就是一个特殊模块寄存器
2. 当syscall指令调用的时候，会从MSR_LSTAR寄存器里取出函数地址来调用，即调用entry_SYSCALL_64

### entry_SYSCALL_64
arch/x86/entry/entry_64.S
```c
// Linux源码
ENTRY(entry_SYSCALL_64)
    /* Construct struct pt_regs on stack */
    pushq	$__USER_DS				/* pt_regs->ss */
    pushq	PER_CPU_VAR(cpu_tss_rw + TSS_sp2)	/* pt_regs->sp */
    pushq	%r11					/* pt_regs->flags */
    pushq	$__USER_CS				/* pt_regs->cs */
    pushq	%rcx					/* pt_regs->ip */
GLOBAL(entry_SYSCALL_64_after_hwframe)
    pushq	%rax					/* pt_regs->orig_ax */
    PUSH_AND_CLEAR_REGS rax=$-ENOSYS
    TRACE_IRQS_OFF
	/* IRQs are off. */
	movq	%rax, %rdi
	movq	%rsp, %rsi
	call	do_syscall_64		/* returns with IRQs disabled */
...
    cmpq	%rcx, %r11	/* SYSRET requires RCX == RIP */
    jne	swapgs_restore_regs_and_return_to_usermode
...
syscall_return_via_sysret:
    ...
    USERGS_SYSRET64
END(entry_SYSCALL_64)
```
首先保存很多寄存器到**pt_regs**结构里面，例如用户态的代码段、数据段、保存参数的寄存器，然后调用do_syscall_64

### do_syscall_64
```c
// Linux源码
__visible void do_syscall_64(unsigned long nr, struct pt_regs *regs)
{
	struct thread_info *ti;
    ...
	ti = current_thread_info();
	if (READ_ONCE(ti->flags) & _TIF_WORK_SYSCALL_ENTRY)
		nr = syscall_trace_enter(regs);
    ...
	nr &= __SYSCALL_MASK;
	if (likely(nr < NR_syscalls)) {
		nr = array_index_nospec(nr, NR_syscalls);
		regs->ax = sys_call_table[nr](regs);
	}

	syscall_return_slowpath(regs);
}
```
1. 从寄存器`%rax`里面取出**系统调用号**，然后根据系统调用号，在**系统调用表**sys_call_table中找到相应的函数进行调用
2. 并将寄存器中保存的参数取出来，作为函数参数

### USERGS_SYSRET64
```c
// Linux源码
#define USERGS_SYSRET64				\
	swapgs;					\
	sysretq;
```
返回用户态的指令变成了sysretq

### 小结
<img src="https://linux-1253868755.cos.ap-guangzhou.myqcloud.com/linux-system-call-64-perfect.jpg" width=800/>

## 系统调用表

### 32位 VS 64位
```
// Linux源码 -- arch/x86/entry/syscalls/syscall_32.tbl
5	i386	open			sys_open			__ia32_compat_sys_open

// Linux源码 -- arch/x86/entry/syscalls/syscall_64.tbl
2	common	open			__x64_sys_open
```
1. 第1列的数字是**系统调用号**，32位和64位的系统调用号是不一样的
2. 第3列是**系统调用名称**
3. 第4列是系统调用在_**内核中的实现函数**_

### 实现函数

#### 声明
系统调用在内核中的实现函数需要有一个**声明**，该声明一般在`include/linux/syscalls.h`文件中
```java
// Linux源码
asmlinkage long sys_open(const char __user *filename, int flags, umode_t mode);
```

#### 实现
系统调用的真正实现，一般在.c文件中，sys_open的实现在`fs/open.c`里面，但里面只有SYSCALL_DEFINE3
```java
// Linux源码
SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
	if (force_o_largefile())
		flags |= O_LARGEFILE;

	return do_sys_open(AT_FDCWD, filename, flags, mode);
}
```

#### 宏展开
SYSCALL_DEFINE3是一个宏，**系统调用最多6个参数**，根据参数的数量选择宏，具体的宏定义如下
```c
// Linux源码
#define SYSCALL_DEFINE1(name, ...) SYSCALL_DEFINEx(1, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE2(name, ...) SYSCALL_DEFINEx(2, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE3(name, ...) SYSCALL_DEFINEx(3, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE4(name, ...) SYSCALL_DEFINEx(4, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE5(name, ...) SYSCALL_DEFINEx(5, _##name, __VA_ARGS__)
#define SYSCALL_DEFINE6(name, ...) SYSCALL_DEFINEx(6, _##name, __VA_ARGS__)

#define __PROTECT(...) asmlinkage_protect(__VA_ARGS__)

#define SYSCALL_DEFINEx(x, sname, ...)				\
	SYSCALL_METADATA(sname, x, __VA_ARGS__)			\
	__SYSCALL_DEFINEx(x, sname, __VA_ARGS__)

    #define __SYSCALL_DEFINEx(x, name, ...)					\
    	__diag_push();							\
    	__diag_ignore(GCC, 8, "-Wattribute-alias",			\
    		      "Type aliasing is used to sanitize syscall arguments");\
    	asmlinkage long sys##name(__MAP(x,__SC_DECL,__VA_ARGS__))	\
    		__attribute__((alias(__stringify(__se_sys##name))));	\
    	ALLOW_ERROR_INJECTION(sys##name, ERRNO);			\
    	static inline long __do_sys##name(__MAP(x,__SC_DECL,__VA_ARGS__));\
    	asmlinkage long __se_sys##name(__MAP(x,__SC_LONG,__VA_ARGS__));	\
    	asmlinkage long __se_sys##name(__MAP(x,__SC_LONG,__VA_ARGS__))	\
    	{								\
    		long ret = __do_sys##name(__MAP(x,__SC_CAST,__VA_ARGS__));\
    		__MAP(x,__SC_TEST,__VA_ARGS__);				\
    		__PROTECT(x, ret,__MAP(x,__SC_ARGS,__VA_ARGS__));	\
    		return ret;						\
    	}								\
    	__diag_pop();							\
    	static inline long __do_sys##name(__MAP(x,__SC_DECL,__VA_ARGS__))
```
宏展开后，实现如下，与声明的是一致的
```java
// Linux源码
asmlinkage long sys_open(const char __user * filename, int flags, int mode)
{
    long ret;

    if (force_o_largefile())
        flags |= O_LARGEFILE;

    ret = do_sys_open(AT_FDCWD, filename, flags, mode);
    asmlinkage_protect(3, ret, filename, flags, mode);
    return ret;
}
```

<!-- indicate-the-source -->
