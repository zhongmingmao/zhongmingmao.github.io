---
title: 计算机组成 -- 动态链接
mathjax: false
date: 2020-01-10 15:01:37
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 静态链接
1. 把对应的不同文件内的代码段合并在一起，成为最后的**可执行文件**，可以做到**代码在开发阶段的复用**
2. 很多程序都需要通过**装载器**装载到**内存**里面，里面链接好的**同样的功能代码**，也都需要再装载一遍，**再占一遍内存空间**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dynamic-link-usr.jpg" width=1000/>

<!-- more -->

## 动态链接
1. 动态链接过程中，需要链接的不是存储在**硬盘上的目标文件代码**，而是加载到**内存**中的**共享库**（Shared Libraries）
    - 加载到内存中的共享库会被很多程序的指令调用
2. **Windows**的共享库文件是`.dll`（Dynamic-Link Libary）文件；**Linux**的共享库文件是`.so`（Shared Object）文件

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dynamic-link.jpg" width=1000/>

## 地址无关 + 相对地址
1. 要在程序**运行时**共享代码，这些机器码必须是**地址无关**的，即**编译出来的共享库文件的指令代码**，是**地址无关码**
    - 地址无关码（**PIC**）：Position-Independent Code，无论加载到哪个物理内存地址，都能够正常执行
    - 大部分函数库都能做到地址无关，因为都是接受特定的输入，进行确定的操作，然后给出返回结果
2. 对于所有**动态链接共享库**的程序来讲
    - 虽然**共享库**用的都是**同一段物理内存地址**
    - 但在不同的应用程序里，共享库所在的**虚拟内存地址是不同**的
    - 不应该要求动态链接同一个共享库的不同程序，必须把这个共享库所使用的虚拟内存地址变成一致 -- **万恶的侵入性**
3. **动态共享库**编译出来的**代码指令**如果做到**地址无关**的？
    - 动态共享库**内部的变量和函数调用**很容易解决，只需要使用**相对地址**即可
      - 各种指令中使用到的内存地址，给出的不是一个绝对的地址空间，而是一个**相对于当前指令偏移量的内存地址**
      - **整个共享库**是放在一段**连续的虚拟内存地址**中
        - 无论装载到哪一段虚拟内存地址，**不同指令之间的相对地址都是不变的**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dynamic-link-pic.jpg" width=1000/>

## 解决方案：PLT + GOT

### 源代码

#### lib.h
```c
// lib.h

#ifndef LIB_H
#define LIB_H

void show_me_the_money(int money);

#endif
```
#### lib.c
```c
// lib.c
#include <stdio.h>

void show_me_the_money(int money)
{
    printf("Show me USD %d from lib.c \n", money);
}
```
#### show_me_poor.c
```c
// show_me_poor.c
#include "lib.h"

int main()
{
    int money = 5;
    show_me_the_money(money);
}
```

### lib.c -> lib.so
```
$ gcc lib.c -fPIC -shared -o lib.so
$ gcc -o show_me_poor show_me_poor.c lib.so
```
1. `-fPIC`：Position Independent Code，编译成一个**地址无关**的代码
2. gcc编译了可执行文件`show_me_poor`：**动态链接**了`lib.so`

### PLT -- Procedure Link Table
```
$ objdump -d -M intel -S show_me_poor
......
00000000004004e0 <.plt>:
  4004e0:	ff 35 22 0b 20 00    	push   QWORD PTR [rip+0x200b22]        # 601008 <_GLOBAL_OFFSET_TABLE_+0x8>
  4004e6:	ff 25 24 0b 20 00    	jmp    QWORD PTR [rip+0x200b24]        # 601010 <_GLOBAL_OFFSET_TABLE_+0x10>
  4004ec:	0f 1f 40 00          	nop    DWORD PTR [rax+0x0]
......
00000000004004f0 <show_me_the_money@plt>:
  4004f0:	ff 25 22 0b 20 00    	jmp    QWORD PTR [rip+0x200b22]        # 601018 <show_me_the_money>
  4004f6:	68 00 00 00 00       	push   0x0
  4004fb:	e9 e0 ff ff ff       	jmp    4004e0 <.plt>
......
000000000040060d <main>:
  40060d:	55                   	push   rbp
  40060e:	48 89 e5             	mov    rbp,rsp
  400611:	48 83 ec 10          	sub    rsp,0x10
  400615:	c7 45 fc 05 00 00 00 	mov    DWORD PTR [rbp-0x4],0x5
  40061c:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  40061f:	89 c7                	mov    edi,eax
  400621:	e8 ca fe ff ff       	call   4004f0 <show_me_the_money@plt>
  400626:	c9                   	leave
  400627:	c3                   	ret
  400628:	0f 1f 84 00 00 00 00 	nop    DWORD PTR [rax+rax*1+0x0]
  40062f:	00
......
```
1. main函数调用show_me_the_money函数时，对应的代码是`call   4004f0 <show_me_the_money@plt>`
    - `@plt`：需要从PLT，也就是**程序链接表**（**Procedure Link Table**）查找要调用的函数，对应的地址是4004f0
2. 来到4004f0，里面又有一次跳转`jmp    4004e0 <.plt>`，来到GLOBAL_OFFSET_TABLE，即**GOT**
3. GLOBAL_OFFSET_TABLE即**全局偏移表**

### GOT -- Global Offset Table
1. 在**共享库**的**`data section`**，保存了一张**全局偏移表**（**GOT**，Global Offset Table）
2. 重要前提：**共享库**的代码部分和数据部分
    - **代码部分**的**物理内存是共享**的
    - **数据部分**是各个动态链接它的应用程序里面**各加载一份的**
3. 所有需要引用**当前共享库外部地址的指令**，都会**查询GOT**，来找到当前运行程序的**虚拟内存**里的对应位置
    - 步骤：**想要调用共享库的实际指令 -> PLT -> GOT -> 本进程的虚拟内存地址 -> 物理内存地址（共享库）**
4. GOT里的内容，是在**本进程加载一个个共享库**的时候写进去的
    - GOT里的内容是**运行时计算**的，并非编译时确定的
5. 不同的进程，调用同样的lib.so，**各自GOT里面指向最终加载的动态链接库的虚拟内存地址是不同的！！**
6. 不同的程序调用同样的动态库，各自的内存地址是独立的，调用的又都是同一个动态库
    - 但不需要去修改动态库里面代码所使用的地址，**各个程序各自维护好自己的GOT**，能够找到对应的动态库即可
7. 本质：通过各个可执行程序在**加载**时，**生成的各不相同的GOT表**，来找到它需要调用到的外部变量和函数的地址

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-dynamic-link-got.jpg" width=1000/>

## 小结
1. **静态链接** -> 代码在**开发阶段**的复用；**动态链接** -> 代码在**运行阶段**的复用
2. C语言的标准库在1MB以上
    - /usr/bin下有上千个可执行文件，如果每一个都把标准库静态链接进来，会占用几GB甚至几十GB的的磁盘空间
    - 服务端要开上千个进程，如果采用静态链接，会占用几GB的内存空间
3. 动态链接的主要价值：**节省资源（磁盘、内存）！！**

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)