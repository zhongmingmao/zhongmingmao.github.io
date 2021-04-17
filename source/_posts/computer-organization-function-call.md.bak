---
title: 计算机组成 -- 函数调用
mathjax: false
date: 2020-01-07 21:08:42
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 程序栈
```c
// function_example.c

#include <stdio.h>

int static add(int a, int b)
{
    return a+b;
}

int main()
{
    int x = 5;
    int y = 10;
    int u = add(x, y);
}
```

<!-- more -->

```
$ gcc -g -c function_example.c
$ objdump -d -M intel -S function_example.o
```
```
......
0000000000000000 <add>:
......
int static add(int a, int b)
{
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
   4:	89 7d fc             	mov    DWORD PTR [rbp-0x4],edi
   7:	89 75 f8             	mov    DWORD PTR [rbp-0x8],esi
	return a+b;
   a:	8b 45 f8             	mov    eax,DWORD PTR [rbp-0x8]
   d:	8b 55 fc             	mov    edx,DWORD PTR [rbp-0x4]
  10:	01 d0                	add    eax,edx
}
  12:	5d                   	pop    rbp
  13:	c3                   	ret

0000000000000014 <main>:

int main()
{
  14:	55                   	push   rbp
  15:	48 89 e5             	mov    rbp,rsp
  18:	48 83 ec 10          	sub    rsp,0x10
	int x = 5;
  1c:	c7 45 fc 05 00 00 00 	mov    DWORD PTR [rbp-0x4],0x5
	int y = 10;
  23:	c7 45 f8 0a 00 00 00 	mov    DWORD PTR [rbp-0x8],0xa
	int u = add(x, y);
  2a:	8b 55 f8             	mov    edx,DWORD PTR [rbp-0x8]
  2d:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  30:	89 d6                	mov    esi,edx
  32:	89 c7                	mov    edi,eax
  34:	e8 c7 ff ff ff       	call   0 <add>
  39:	89 45 f4             	mov    DWORD PTR [rbp-0xc],eax
}
  3c:	c9                   	leave
  3d:	c3                   	ret
```
1. `call`指令后面紧跟的是**跳转后的程序地址**
2. add函数
   - 代码先执行一条`push`指令和一条`mov`指令 -- **压栈**
   - 在函数执行结束的时候，又执行了一条`pop`指令和一条`ret`指令 -- **出栈**
3. 实现**函数调用**的几个思路
   - 思路1：把调用的函数指令，直接插入在调用函数的地方，替换掉对应的call指令
     - 问题：如果函数A调用函数B，而函数B又调用函数A，会产生无穷无尽地替换
   - 思路2：CPU内部专门设立一个「**程序调用寄存器**」，用来存储接下来要**跳转回来执行的指令地址**
     - 问题：在**多层**函数调用里，只记录一个地址是不够的，例如函数A调用函数B，函数B调用函数C，依次类推
       - CPU里的**寄存器非常珍贵且有限**，Intel i7 CPU只有16个64位寄存器
   - 思路3：在**内存**（比CPU的寄存器**便宜**！）里开辟一段空间，采用**栈**（**后进先出**）的数据结构
     - **函数调用之前 -> 压栈，函数执行完之后 -> 出栈**
     - 在真实的程序里，压栈的不只有函数调用完成后的返回地址
       - 如果函数A调用函数B时，需要传输的**参数数据**在**寄存器不够用**时，也会被压入栈中
     - 整个函数A所**占用的所有内存**，就是函数A的**栈帧**（**Stack Frame**）
     - 实际的程序栈布局，**底在最上面，顶在最下面**
       - **栈底的内存地址**一开始就是**固定**的，一层层压栈后，栈顶的内存地址是在**逐渐变小**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-function-call-stack.jpg" width=1000/>

### 实际执行过程
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-function-call-stack-add.jpg" width=1000/>

1. 栈指针：`rsp` ，帧指针：`rbp`
2. add函数：入口为0、1行，结束为12、13行
3. 调用34行的`call`指令时，会把**当前的PC寄存器里的值压栈（下一条指令的地址，即39行）**
    - 目的：保留main函数调用add函数后要执行的指令地址
4. add函数的第0行：`push   rbp`指令，在进行**压栈**（**寄存器 -> 内存**）
    - `rbp`又叫**栈帧指针**，存放了**当前栈帧**位置的寄存器
    - `push   rbp`把之前的调用函数，即**main函数的栈帧的栈底地址**，压到**栈顶**
5. add函数的第1行：`mov    rbp,rsp`
    - 把`rsp`这个**栈指针**的值复制到`rbp`，而`rsp`始终会指向**栈顶**
    - 该命令意味着，`rbp`这个栈帧指针指向的地址，变成当前**最新的栈顶**，即**add函数的栈帧的栈底地址**
6. add函数的第12行：`pop    rbp`：将**当前的栈顶出栈**
7. add函数的第13行：`ret`：把call调用的时候压栈的指令地址出栈（即39行），更新到PC寄存器
    - 将程序的**控制权**返回到出栈后的栈顶，即main函数
8. 无论多少层的函数调用，只需要通过维持`rbp`和`rsp`，这两个维护**栈顶所在地址**的寄存器，就能管理好不同函数之间的跳转

## 构造stack overflow
1. 栈大小是有限的，构造stack overflow通常有两种方式
   - **无限递归**
   - **在栈空间里面创建非常占内存的变量**

## 函数内联（性能优化）
```c
// function_example_inline.c

#include <stdio.h>
#include <time.h>
#include <stdlib.h>

int static add(int a, int b)
{
  return a+b;
}

int main()
{
  srand(time(NULL));
  int x = rand() % 5;
  int y = rand() % 10;
  int u = add(x, y);
  printf("u = %d\n",u);
}
```
```
$ gcc -g -c -O function_example_inline.c
$ objdump -d -M intel -S function_example_inline.o
```
```
......
0000000000000000 <main>:
{
	return a+b;
}

int main()
{
......
	return a+b;
  4e:	8d 34 0b             	lea    esi,[rbx+rcx*1]
	int u = add(x, y);
	printf("u = %d\n", u);
  51:	bf 00 00 00 00       	mov    edi,0x0
  56:	b8 00 00 00 00       	mov    eax,0x0
  5b:	e8 00 00 00 00       	call   60 <main+0x60>
}
  60:	5b                   	pop    rbx
  61:	c3                   	ret
```
1. 没有把add函数单独编译成一段指令顺序，而是在调用`u=add(x, y)`，**直接替换成指令**，这就是**函数内联**
2. 内联的优点
  - **CPU需要执行的指令数减少**
  - 根据地址跳转的过程不需要了，压栈和出栈的过程也不用了
3. 内联的代价
  - 内联意味着，把可以复用的程序指令在调用它的地方**完全展开**了
  - 这样会导致**整个程序占用的空间会变大**
4. **叶子函数**（**叶子过程**）：没有调用其它函数，只会被调用的函数

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)