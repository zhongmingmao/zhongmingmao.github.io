---
title: 计算机组成 -- goto
mathjax: false
date: 2020-01-06 20:29:35
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization

---
## CPU执行指令
1. CPU是由一堆**寄存器**组成的，而寄存器是由多个**触发器**（Flip-Flop）或者**锁存器**（Latches）组成的简单电路
    - 触发器和锁存器是两种不同原理的数字电路组成的**逻辑门**
2. N个触发器或者锁存器，就可以组成一个N位的寄存器，能保存N位的数据，64位的Intel服务器，寄存器就是64位的
3. 寄存器分类
   - **PC寄存器**（Program Counter Register），也称为**指令地址寄存器**（Instruction Address Register）
     - 用来存放**下一条**需要执行的计算机指令的**内存地址**
   - **指令寄存器**（Instruction Register）
     - 用来存放**当前正在执行**的指令
   - **条件码寄存器**（Status Register）
      - 用里面的**一个个标志位**（Flag），存放CPU进行**算术**或者**逻辑**计算的结果
   - 其它
      - 整数寄存器、浮点数寄存器、向量寄存器、地址寄存器、通用寄存器
4. 程序执行
    - CPU会根据**PC寄存器**里面的地址，从**内存**里把需要执行的指令读取到**指令寄存器**里面执行
    - 然后根据**指令长度**自增，开始**顺序读取**下一条指令，一个程序的指令，在内存里面是**连续保存**的，也会一条条**顺序加载**
    - 特殊指令，如J类指令（**跳转指令**），会**直接修改PC寄存器里面的地址值**
      - 这样下一条要执行的指令就不是从内存里面顺序加载的了

<!-- more -->

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-goto-register.jpg" width=1000/>

## if-else
```c
// test.c

#include <time.h>
#include <stdlib.h>

int main()
{
  srand(time(NULL));
  int r = rand() % 2;
  int a = 10;
  if (r == 0)
  {
    a = 1;
  } else {
    a = 2;
  }
}
```
```
$ gcc -g -c test.c
$ objdump -d -M intel -S test.o
```
```
......
int main()
{
......
  if (r == 0)
  33:	83 7d fc 00          	cmp    DWORD PTR [rbp-0x4],0x0
  37:	75 09                	jne    42 <main+0x42>
  {
    a = 1;
  39:	c7 45 f8 01 00 00 00 	mov    DWORD PTR [rbp-0x8],0x1
  40:	eb 07                	jmp    49 <main+0x49>
  } else {
    a = 2;
  42:	c7 45 f8 02 00 00 00 	mov    DWORD PTR [rbp-0x8],0x2
  }
}
  49:	c9                   	leave
  4a:	c3                   	ret
```
1. 对于`r == 0`的条件判断，被编译成了`cmp`和`jne`这两条指令
  - `cmp`指令比较了前后两个操作数的值
    - `DWORD PTR`代表操作的数据类型是**32位的整数**，`[rbp-0x4]`是一个寄存器的地址，从寄存器里拿到的变量r的值
    - 第2个操作数`0x0`：常量0的16进制表示
    - `cmp`指令的比较结果，会存入到**条件码寄存器**当中去
      - 如果比较的结果为**True**，即`r==0`，就把**零标志条件码**（对应的条件码是**ZF**，Zero Flag）设置位1
      - Intel CPU的其它标志位
        - 进位标志（**CF**，Carry Flag）、符号标志（**SF**，Sign Flag）、溢出标志（**OF**，Overflow Flag）
  - `cmp`指令执行完成后，PC寄存器会**自动自增**，开始执行下一条`jne`指令
    - `jne = jump if not equal`，`jne`指令会查看对应的**零标志位**，如果为**0**，会跳转到42的位置
      - 42对应的是汇编代码的行号，也是else条件里面的第一条指令
      - 当发生**跳转**时
        - PC寄存器就不再自增，而是被**直接设置**成42，CPU再把42地址里的指令加载到**指令寄存器**来执行
        - 跳转到执行地址为42的指令，实际是一条`mov`指令
          - 该指令将2设置到另一个**32位整型**的寄存器地址，相当于一个**赋值**操作
        - 然后PC寄存器里的值继续自增，执行`leave`指令
2. 如果`r == 0`条件满足，在赋值的`mov`指令执行完成后，有一个`jmp`的**无条件跳转指令**，跳转到49（`leave`指令）

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-goto-if-else.jpg" width=1000/>

## for
```c
// test.c

int main()
{
  int a = 0;
  for (int i = 0; i < 3; i++)
  {
    a += i;
  }
}
```
```
$ gcc -g -c -std=c99 for.c
$ objdump -d -M intel -S for.o
```
```
......
int main()
{
......
  for (int i = 0; i < 3; i++)
   b:	c7 45 f8 00 00 00 00 	mov    DWORD PTR [rbp-0x8],0x0
  12:	eb 0a                	jmp    1e <main+0x1e>
  {
......
  for (int i = 0; i < 3; i++)
  1a:	83 45 f8 01          	add    DWORD PTR [rbp-0x8],0x1
  1e:	83 7d f8 02          	cmp    DWORD PTR [rbp-0x8],0x2
  22:	7e f0                	jle    14 <main+0x14>
  24:	b8 00 00 00 00       	mov    eax,0x0
  }
}
  29:	5d                   	pop    rbp
  2a:	c3                   	ret
```
1. 循环是用1e地址上的`cmp`比较指令和`jle`条件跳转指令来实现的
2. `jle`跳转的地址，是`jle`指令前面的地址14（**向前跳转**）

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-goto-for.jpg" width=1000/>

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)