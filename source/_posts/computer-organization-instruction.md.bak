---
title: 计算机组成 -- 指令
mathjax: false
date: 2020-01-04 10:24:49
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## CPU + 计算机指令
1. **硬件**的角度
    - CPU是一个**超大规模集成电路**，通过电路实现了加法、乘法乃至各种各样的处理逻辑
2. **软件工程师**的角度
    - CPU就是一个执行各种**计算机指令**的逻辑机器
    - 计算机指令是一门CPU能听懂的语言，也称为**机器语言**
    - 不同的CPU能够听懂的语言不太一样，两种CPU各自支持的语言，就是两组不同的**计算机指令集**
    - 计算机程序平时是存储在存储器中，这种程序指令存储在存储器里面的计算机，叫作**存储程序型计算机**

<!-- more -->

## 代码 -> 机器码（编译 -> 汇编）
```c
// test.c
int main()
{
    int a = 1;
    int b = 2;
    a = a + b;
}
```
1. **编译**（Compile）成**汇编**代码：把整个程序翻译成一个汇编语言（ASM，Assembly Language）的程序
2. **汇编**：针对汇编代码，用**汇编器**（Assembler）翻译成**机器码**（Machine Code）
   - 机器码由**0**和**1**组成的机器语言表示，一串串的**16进制**数字，就是CPU能够真正认识的**计算机指令**

### 汇编代码 + 机器码
```
$ gcc --help
-c                       编译、汇编到目标代码，不进行链接

$ objdump --help
-d, --disassemble        Display assembler contents of executable sections
-M, --disassembler-options=OPT 将文本传递到 OPT 反汇编程序
-S, --source             Intermix source code with disassembly

$ gcc -g -c test.c
$ objdump -d -M intel -S test.o
```
```
test.o：     文件格式 elf64-x86-64

Disassembly of section .text:

0000000000000000 <main>:
int main()
{
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
	int a = 1;
   4:	c7 45 fc 01 00 00 00 	mov    DWORD PTR [rbp-0x4],0x1
	int b = 2;
   b:	c7 45 f8 02 00 00 00 	mov    DWORD PTR [rbp-0x8],0x2
	a = a + b;
  12:	8b 45 f8             	mov    eax,DWORD PTR [rbp-0x8]
  15:	01 45 fc             	add    DWORD PTR [rbp-0x4],eax
}
  18:	5d                   	pop    rbp
  19:	c3                   	ret
```
1. 左边的一堆数字是**机器码**，右边一系列的`push,mov,add,pop`就是对应的**汇编代码**
2. 一行C代码，可能会对应**一条或多条**机器码和汇编代码
3. 汇编代码和机器码之间是**一一对应**的
    - 汇编代码：**给程序员看的机器码！！**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-instruction-compile-assembly.png" width=1000/>

## 解析指令和机器码

### 指令类型
| 指令类型 | 场景 | 示例指令 | 示例汇编代码 | 含义 | 注释 |
| --- | --- | --- | --- | --- | --- |
| **算术**指令 | 加减乘除 | add | `add $s1,$s2,$s3` | `$s1=$s2+$s3` | 将s2和s3寄存器中的数相加后的结果放到寄存器s1中 |
| **逻辑**指令 | 与、非 | or | `or $s1,$s2,$s3` | `$s1=$s2\|$s3` | 将s2和s3寄存器中的数**按位取或**后的结果放到寄存器s1中 |
| **数据传输**指令 | 变量赋值、在内存读写数据 | load | `load $1,10($2)` | `$s1=memroy[$s2+10]` | 取s2寄存器中的数，加上10偏移量后，<br>找到内存中的**字**，存入到s1寄存器中 |
| **条件分支**指令 | if-else | branch on equal | `beq $s1,$s2,10` | `if($s1==$s2) goto PC+4+10` | 如果s1和s2寄存器内的值相等，从程序计数器往后跳10 |
| **无条件跳转**指令 | **函数调用** | jump | `j 1000` | `goto 1000` | 跳转到1000这个目标地址 |

### MIPS指令集
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-instruction-mips.jpg" width=1000/>

1. MIPS指令是一个**32位**的整数，高6位叫作**操作码**（opcode），代表这条指令具体是一条怎样的指令
    - 剩下的26位有三种格式，分别是**R**、**I**、**J**
    - **R指令**
       - 一般用来做**算术**和**逻辑**操作，里面有读取和写入数据的寄存器地址
       - 如果是**逻辑位**操作，后面还有位移操作的位移量
       - 最后的功能码，则是在前面的操作码不够的时候，扩展操作码表示对应的具体指令
    - **I指令**
       - 通常用在**数据传输**、**条件分支**、以及在**运算**时使用的并非变量而是**常数**的时候
       - 第三种情况：此时没有了位移量和操作码，也没有第三个寄存器，而是把这三部分直接**合并**成一个**地址值**或者一个**常数**
    - **J指令**
       - 跳转指令，高6位之外的26位都是一个跳转后的地址
2. `add $t0,$s1,$s2`，用十进制表示
    - opcode：**0**
    - rs代表第一个寄存器s1的地址**17**
    - rt代表第二个寄存器s2的地址**18**
    - rd代表目标的临时寄存器t0的地址**8**
    - 由于不是位移操作，所以位移量是**0**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-instruction-mips-add.jpg" width=1000/>

打孔代表1，没打孔代表0
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-instruction-mips-add-punching-tape.png" width=600/>

## 参考资料
[深入浅出计算机组成原理](https://time.geekbang.org/column/intro/100026001)