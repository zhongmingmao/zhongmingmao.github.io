---
title: 计算机组成 -- ELF + 静态链接
mathjax: false
date: 2020-01-08 12:48:05
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 代码拆分

### 源代码

#### add_lib.c
```c
// add_lib.c
int add(int a, int b)
{
    return a+b;
}
```
#### link_example.c
```c
// link_example.c

#include <stdio.h>

int main()
{
    int a = 10;
    int b = 5;
    int c = add(a, b);
    printf("c=%d\n", c);
}
```

<!-- more -->

### gcc + objdump
```
$ gcc -g -c add_lib.c link_example.c
$ objdump -d -M intel -S add_lib.o
$ objdump -d -M intel -S link_example.o
```
#### add_lib.o
```
add_lib.o：     文件格式 elf64-x86-64
Disassembly of section .text:
0000000000000000 <add>:
// add_lib.c
int add(int a, int b)
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
```

#### link_example.o
```
link_example.o：     文件格式 elf64-x86-64
Disassembly of section .text:
0000000000000000 <main>:
// link_example.c
#include <stdio.h>

int main()
{
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
   4:	48 83 ec 10          	sub    rsp,0x10
	int a = 10;
   8:	c7 45 fc 0a 00 00 00 	mov    DWORD PTR [rbp-0x4],0xa
	int b = 5;
   f:	c7 45 f8 05 00 00 00 	mov    DWORD PTR [rbp-0x8],0x5
	int c = add(a, b);
  16:	8b 55 f8             	mov    edx,DWORD PTR [rbp-0x8]
  19:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  1c:	89 d6                	mov    esi,edx
  1e:	89 c7                	mov    edi,eax
  20:	b8 00 00 00 00       	mov    eax,0x0
  25:	e8 00 00 00 00       	call   2a <main+0x2a>
  2a:	89 45 f4             	mov    DWORD PTR [rbp-0xc],eax
	printf("c=%d\n", c);
  2d:	8b 45 f4             	mov    eax,DWORD PTR [rbp-0xc]
  30:	89 c6                	mov    esi,eax
  32:	bf 00 00 00 00       	mov    edi,0x0
  37:	b8 00 00 00 00       	mov    eax,0x0
  3c:	e8 00 00 00 00       	call   41 <main+0x41>
}
  41:	c9                   	leave
  42:	c3                   	ret
```

## 运行link_example.o
```
$ ll link_example.o
-rw-r--r--. 1 root root 3408 4月   2 21:24 link_example.o

$ chmod u+x link_example.o

$ ./link_example.o
-bash: ./link_example.o: 无法执行二进制文件
```
1. `add_lib.o`和`link_example.o`，通过objdump后，两个程序的地址都是从**0**开始的
2. `add_lib.o`和`link_example.o`并不是一个**可执行文件**，而只是**目标文件**（Object File）
    - 只有通过**链接器**（Linker）把多个**目标文件**以及调用的各种**函数库**链接起来，才能得到一个**可执行文件**
    - gcc的`-o`参数，可以生成对应的可执行文件

## 生成可执行文件
```
$ gcc -o link-example add_lib.o link_example.o

$ ./link-example
c = 15
```

## C代码 -> 汇编代码 -> 机器码
1. **编译**（Compile） -> **汇编**（Assemble） -> **链接**（Link）
    - 生成**可执行文件**
2. 通过**装载器**（Loader）把可执行文件**装载**（Load）到内存中，CPU从内存中读取**指令**和**数据**，来开始真正执行程序

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-composition-elf-static-link-compile-assemble-link.jpg" width=600/>

## ELF格式 + 链接
程序最终通过**装载器**变成**指令**和**数据**，但生成的可执行代码不仅仅是一条条的指令
```
$ objdump -d -M intel -S link-example
```
```
link-example：     文件格式 elf64-x86-64
Disassembly of section .init:
......
Disassembly of section .plt:
......
Disassembly of section .text:
......
000000000040052d <add>:
// add_lib.c
int add(int a, int b)
{
  40052d:	55                   	push   rbp
  40052e:	48 89 e5             	mov    rbp,rsp
  400531:	89 7d fc             	mov    DWORD PTR [rbp-0x4],edi
  400534:	89 75 f8             	mov    DWORD PTR [rbp-0x8],esi
	return a+b;
  400537:	8b 45 f8             	mov    eax,DWORD PTR [rbp-0x8]
  40053a:	8b 55 fc             	mov    edx,DWORD PTR [rbp-0x4]
  40053d:	01 d0                	add    eax,edx
}
  40053f:	5d                   	pop    rbp
  400540:	c3                   	ret

0000000000400541 <main>:
// link_example.c
#include <stdio.h>
int main()
{
  400541:	55                   	push   rbp
  400542:	48 89 e5             	mov    rbp,rsp
  400545:	48 83 ec 10          	sub    rsp,0x10
	int a = 10;
  400549:	c7 45 fc 0a 00 00 00 	mov    DWORD PTR [rbp-0x4],0xa
	int b = 5;
  400550:	c7 45 f8 05 00 00 00 	mov    DWORD PTR [rbp-0x8],0x5
	int c = add(a, b);
  400557:	8b 55 f8             	mov    edx,DWORD PTR [rbp-0x8]
  40055a:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  40055d:	89 d6                	mov    esi,edx
  40055f:	89 c7                	mov    edi,eax
  400561:	b8 00 00 00 00       	mov    eax,0x0
  400566:	e8 c2 ff ff ff       	call   40052d <add>
  40056b:	89 45 f4             	mov    DWORD PTR [rbp-0xc],eax
	printf("c=%d\n", c);
  40056e:	8b 45 f4             	mov    eax,DWORD PTR [rbp-0xc]
  400571:	89 c6                	mov    esi,eax
  400573:	bf 20 06 40 00       	mov    edi,0x400620
  400578:	b8 00 00 00 00       	mov    eax,0x0
  40057d:	e8 8e fe ff ff       	call   400410 <printf@plt>
}
......
Disassembly of section .fini:
......
```
1. **可执行代码**和**目标代码**类似，在Linux下，**可执行文件**和**目标文件**所使用的都是**ELF**格式
    - ELF：**Execuatable and Linkable File Format**，**可执行**与**可链接**文件格式
2. main函数里调用add的跳转地址，不再是下一条指令的地址，而是**add函数的入口地址**，这是**ELF格式**和**链接器**的功劳

### ELF格式
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-composition-elf-static-link-elf-format.jpg" width=600/>

1. ELF有一个基本的**文件头**，用来表示这个文件的**基本属性**（是否是可执行文件、对应的CPU、操作系统等）
2. ELF文件格式把各种信息，分成一个个的**Section**保存起来
    - **.text** section
      - **代码段**或指令段（Code Section），用来保存程序的代码和指令
    - **.data** section
      - **数据段**（Data Section），用来保存程序里面设置好的**初始化**数据信息
    - **.rel.text** section
      - **重定位表**（Relocation Table）
      - `link_example.o`里面的main函数调用了add和printf这两个函数
        - 但在**链接发生之前**，并不知道该跳转到哪里，这些信息会存储在重定位表里（**链接**的时候进行**修正**）
    - **.symtab** Section
      - **符号表**（Symbol Table），保存了**当前文件**里面定义的函数名称和对应地址的地址簿

### 链接
1. **链接器**会扫描**所有**输入的**目标文件**，然后把所有**符号表**里的信息收集起来，构成一个**全局的符号表**
2. 然后再根据**重定位表**，把所有不确定要跳转到哪个地址的代码，根据**全局符号表**里面存储的地址，进行一次**修正**
3. 最后，把所有的目标文件的**对应段**进行一次合并，变成了最终的可执行代码
4. 因此，可执行文件里面的**函数调用的地址都是正确的**
    - 装载器不再需要考虑**地址跳转**的问题，只需要解析ELF文件，把对应的指令和数据，加载到内存里面供CPU执行即可

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-composition-elf-static-link-link-process.jpg" width=1000/>

## Linux + Windows
1. Linux和Windows的**可执行文件**的格式是不一样的
    - Windows：**PE**（Portable Executable Format）
    - Linux下的装载器只能解析ELF格式，而不能解析PE格式
2. **Wine**：兼容PE格式的装载器
3. **WSL**（Windows Subsystem for Linux）：可以解析和加载ELF格式的文件

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)