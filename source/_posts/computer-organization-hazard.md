---
title: 计算机组成 -- 冒险
mathjax: false
date: 2020-01-18 00:55:09
categories:
    - Computer Basics
    - Computer Organization
tags:
    - Computer Basics
    - Computer Organization
---

## 冒险
1. 流水线架构的CPU，是**主动**进行的冒险选择，期望通过冒险带来**更高的回报**
    - 对于各种冒险可能造成的问题，都准备好了**应对方案**
2. 分类
    - **结构冒险**（**Structural** Hazard）
    - **数据冒险**（**Data** Hazard）
    - **控制冒险**（**Control** Hazard）

<!-- more -->

## 结构冒险
1. 结构冒险，本质上是一个**硬件层面的资源竞争问题**
2. CPU在**同一个时钟周期**，同时在运行**两条计算机指令的不同阶段**，但这两个不同的阶段可能会用到**同样的硬件电路**

### 内存的数据访问
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-structural-mem-access.jpg" width=1000/>

1. 第1条指令执行到**访存**（MEM）阶段的时候，流水线的第4条指令，在执行**取指令**（Fetch）操作
2. **访存**和**取指令**，都是要进行内存数据的读取，而**内存只有一个地址译码器**，只能在一个时钟周期内读取一条数据
    - **无法同时执行**第1条指令的**读取内存数据**和第4条指令的**读取指令代码**

### 解决方案
1. 解决方案：**增加资源**
2. **哈佛架构**
   - 把内存分成两部分，它们**有各自的地址译码器**，这两部分分别是**存放指令的程序内存**和**存放数据的数据内存**
   - 缺点：**无法**根据实际情况去**动态调整**
3. **普林斯顿架构 -- 冯.诺依曼体系架构**
   - 今天使用的CPU，仍然是冯.诺依曼体系架构，并没有把内存拆成程序内存和数据内存两部分
1. **混合架构**
   - 现代CPU没有在内存层面进行对应的拆分，但在**CPU内部的高速缓存**部分进行了区分，分成了**指令缓存**和**数据缓存**
   - 内存的访问速度远比CPU的速度慢，**现代CPU并不会直接读取主内存**
     - 会从主内存把**指令**和**数据**加载到**高速缓存**中，后续的访问都是访问高速缓存
   - 指令缓存和数据缓存的拆分，使得CPU在进行**数据访问**和**取指令**的时候，不会再发生资源冲突的情况

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-structural-solution.jpg" width=600/>

## 数据冒险
1. **结构冒险**是**硬件层面**的问题，可以通过**增加硬件资源**的方式来解决；但还有很多冒险问题属于**程序逻辑**层面，最常见是**数据冒险**
2. 数据冒险：**同时在执行多个指令之间，有数据依赖的情况**
3. 依赖分类
    - **先写后读**（Read After Write，**RAW**）
    - **先读后写**（Write After Read，**WAR**）
    - **写后再写**（Write After Write，**WAW**）

### 依赖

#### 写 -> 读
```c raw.c
int main() {
    int a = 1;
    int b = 2;
    a = a + 2;
    b = a + 3;
}
```
```
$ gcc -g -c raw.c
$ objdump -d -M intel -S raw.o
```
```
......
0000000000000000 <main>:
int main() {
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
	int a = 1;
   4:	c7 45 fc 01 00 00 00 	mov    DWORD PTR [rbp-0x4],0x1
	int b = 2;
   b:	c7 45 f8 02 00 00 00 	mov    DWORD PTR [rbp-0x8],0x2
	a = a + 2;
  12:	83 45 fc 02          	add    DWORD PTR [rbp-0x4],0x2
	b = a + 3;
  16:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  19:	83 c0 03             	add    eax,0x3
  1c:	89 45 f8             	mov    DWORD PTR [rbp-0x8],eax
}
  1f:	5d                   	pop    rbp
  20:	c3                   	ret
```
1. 内存地址12的机器码，把0x2添加到`rbp-0x4`对应的**内存地址**
2. 内存地址16的机器码，从`rbp-0x4`这个**内存地址**里面读取，把值把写入到`eax`这个**寄存器**里面
3. 必须保证：在内存地址16的指令读取`rbp-0x4`里面的值之前，内存地址12的指令写入到`rbp-0x4`的操作已经完成
4. **写 -> 读**的依赖关系，一般称为**数据依赖**，即Data Dependency
5. 简单理解：**先写入，才能读**

#### 读 -> 写
```c war.c
int main() {
  int a = 1;
  int b = 2;
  a = b + a;
  b = a + b;
}
```
```
$ gcc -g -c war.c
$ objdump -d -M intel -S war.o
```
```
......
0000000000000000 <main>:
int main() {
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
	int a = 1;
   4:	c7 45 fc 01 00 00 00 	mov    DWORD PTR [rbp-0x4],0x1
	int b = 2;
   b:	c7 45 f8 02 00 00 00 	mov    DWORD PTR [rbp-0x8],0x2
	a = b + a;
  12:	8b 45 f8             	mov    eax,DWORD PTR [rbp-0x8]
  15:	01 45 fc             	add    DWORD PTR [rbp-0x4],eax
	b = a + b;
  18:	8b 45 fc             	mov    eax,DWORD PTR [rbp-0x4]
  1b:	01 45 f8             	add    DWORD PTR [rbp-0x8],eax
}
  1e:	5d                   	pop    rbp
  1f:	c3                   	ret
```
1. 内存地址15的指令，要把`eax`寄存器里面的值读出来，再加到`rbp-0x4`的内存地址
2. 内存地址18的指令，要更新`eax`寄存器
3. 如果内存地址18的`eax`的写入先完成，在内存地址为15的代码里面取出`eax`才发生，程序就会出错
  - 同样要保证对于`eax`的**先读后写**的操作顺序
4. **读 -> 写**的依赖关系，一般称为**反依赖**，即Anti Dependency
5. 简单理解：**前一个读操作取出来的数据用于其它运算，后一个写操作就不能先执行完成**

#### 写 -> 写
```c waw.c
int main() {
  int a = 1;
  a = 2;
}
```
```
$ gcc -g -c waw.c
$ objdump -d -M intel -S waw.o
```
```
......
0000000000000000 <main>:
int main() {
   0:	55                   	push   rbp
   1:	48 89 e5             	mov    rbp,rsp
	int a = 1;
   4:	c7 45 fc 01 00 00 00 	mov    DWORD PTR [rbp-0x4],0x1
	a = 2;
   b:	c7 45 fc 02 00 00 00 	mov    DWORD PTR [rbp-0x4],0x2
}
  12:	5d                   	pop    rbp
  13:	c3                   	ret
```
1. 内存地址4的指令和内存地址b的指令，都是将对应的数据写入到`rbp-0x4`  的内存地址里面
2. 必须保证：内存地址4的指令的写入，在内存地址b的指令的写入之前完成
3. **写 -> 写**的依赖关系，一般称为**输出依赖**，即Output Dependency
5. 简单理解：**覆盖写**

### 解决方案 -- 流水线停顿
1. 除了**读 -> 读**，对于**同一个**寄存器或者内存地址的操作，都有**明确强制的顺序要求**
2. 解决数据冒险的简单方案：**流水线停顿**（Pipeline Stall）、别称：**流水线冒泡**（Pipeline Bubbling）
  - 这是一种**以牺牲CPU性能为代价**的方案，在最坏的情况下，**流水线架构的CPU会退化成单指令周期的CPU！！**
3. 在进行**指令译码**的时候，会拿到对应指令**所需要访问的寄存器和内存地址**
  - 此时能判断这个指令是否会触发数据冒险，如果会触发数据冒险，可以决定让整个流水线**停顿一个或多个周期**
4. 时钟信号会**不停地**在0和1之间**自动切换**，并**没有办法真的停顿下来**
  - 在实践过程中，并不是让流水线停下来，而是在执行后面的操作步骤前**插入**一个**NOP**（No Option）操作
  - 好像在一个水管里面，进了一个**空气泡**，因此也叫**流水线冒泡**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-pipeline-stall.jpg" width=1000/>

## 操作数前推

### 流水线对齐

#### 五级流水线
**取指令（IF） -> 指令译码（ID） -> 指令执行（EX） -> 内存访问（MEM） -> 数据写回（WB）**
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-5-stage.jpg" width=1000/>

#### MIPS指令
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips.jpg" width=1000/>

1. 在MIPS的体系结构下，**不同类型的指令，会在流水线的不同阶段进行不同的操作**
2. **LOAD**：从**内存**里**读取**数据到**寄存器**
  - 需要经历5个完整的流水线
3. **STORE**：从**寄存器**往**内存**里**写入**数据
  - 不需要有**写回寄存器**的操作，即没有**数据写回**（WB）的流水线阶段
4. **ADD**、**SUB**
  - 加减法指令，**所有操作**都在**寄存器**完成，没有实际的**内存访问**（MEM）操作

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-load-store-r.jpg" width=1000/>

1. 有些指令没有对应的流水线阶段，但**不能跳过对应的阶段**直接执行下一阶段
2. 如果先后执行一条LOAD指令和一条ADD指令，LOAD指令的WB阶段和ADD指令的WB阶段，在**同一个时钟周期**发生
  - 相当于触发了一个**结构冒险**事件，产生了**资源竞争**
3. 在实践中，各个指令不需要的阶段，**不会直接跳过**，而是会运行一次**NOP**操作

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-load-add.jpg" width=800/>
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-nop.jpg" width=1000/>

### 操作数前推
1. 通过**NOP**操作进行对齐，在流水线里，就不会遇到**资源竞争**产生的**结构冒险**问题
  - NOP操作，即**流水线停顿**插入的对应操作
2. 插入过多的**NOP**操作，意味着CPU**空转**增多

```c
// s1 s2 t0都是寄存器
add $t0, $s2,$s1 // s1 + s2 -> t0
add $s2, $s1,$t0 // s1 + t0 -> s2
```
1. 后一条add指令，依赖寄存器t0的值，而t0里面的值，又来自于前一条add指令的计算结果
  - 因此后一条add指令，需要等待前一条add指令的**数据写回**（WB）阶段完成之后才能执行
2. 这是一个**数据冒险**：**数据依赖**类型（**写 -> 读**），上面的方案是通过**流水线停顿**来解决这个问题
3. 要在第二条指令的**译码**阶段之后，插入对应的NOP指令，直到前一条指令的数据写回完成之后，才能继续执行
4. 这虽然解决了数据冒险的问题，但也**浪费了两个时钟周期**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-nop-2-add.jpg" width=1000/>

1. 第二条指令的执行，未必需要等待第一条指令写回完成才能进行
2. 如果能够把第一条指令的执行结果**作为输入直接传输**到第二条指令的执行阶段
  - 那第二条指令就不用再从**寄存器**里面，把数据再单独读取出来才能执行代码
  - 可以在第一条指令的**执行（EX）阶段完成**之后，直接将结果数据传输到下一条指令的**ALU**
    - 这样，下一条指令不再需要再插入两个NOP阶段，就可以正常走到执行阶段
3. 上面的方案就是**操作数前推**（Operand **Forwarding**）、**操作数旁路**（Operand **Bypassing**）
  - Forwarding：**逻辑**含义，第一条指令的执行结果**作为输入直接转发**给第二条指令的ALU
  - Bypassing：**硬件**含义，为了实现Forwarding，在CPU的硬件层面，需要**单独**拉出一根信号传输的线路
    - 使得ALU的计算结果能够**重新回到**ALU的输入
    - 越过了**写入寄存器**，再**从寄存器读出来**的过程，可以**节省两个时钟周期**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-operand-forwarding-2-add.jpg" width=1000/>

1. **操作数前推**的解决方案可以和**流水线停顿**一起使用
  - 虽然可以把操作数转发到下一条指令，但下一条指令仍然需要停顿一个时钟周期
2. 先执行一条LOAD指令，再执行ADD指令
  - LOAD指令在访存阶段才能把数据读取出来，下一条指令的执行阶段，需要等上一阶段的访存阶段完成之后，才能进行

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-mips-operand-forwarding-load-add.jpg" width=1000/>

**操作数前推并不能减少所有冒泡**，只能去掉其中一部分，仍然需要通过插入一些**NOP**来解决**数据冒险**问题

## 乱序执行
1. **结构冒险**
  - 限制来源：**在同一时钟周期内，不同的指令的不同流水线阶段，要访问相同的硬件资源**
  - 解决方案：_**增加资源**_
2. **数据冒险**
  - 限制来源：**数据之间的各种依赖**
  - 解决方案：_**流水线停顿**、**操作数前推**_
3. 即便综合运用这三个技术，仍然会遇到**不得不停下整个流水线**，等待前面的指令完成的情况

### 填补空闲的NOP
1. 无论是**流水线停顿**，还是**操作数前推**，只要前面指令的特定阶段还没有执行完成，后面的指令就会被**阻塞**
2. 虽然**代码生成**的指令是**顺序**的，如果后面的指令**不需要依赖**前面指令的执行结果，完全可以**不必等待**前面的指令执行完成
  - 这样的解决方案，在计算机组成里面，被称为**乱序执行**（**Out-of-Order** Execution，OoOE）

```c
a = b + c
d = a * e
x = y * z
```
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-3-command.jpg" width=1000/>

### 实现过程
<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-oooe.jpg" width=1000/>

1. **取指令**和**指令译码**阶段，乱序执行的CPU和使用流水线架构的CPU是一样的，会**一级一级顺序进行**
2. 指令译码完成后，CPU**不会直接进行指令执行**，而是进行一次**指令分发**
  - 指令分发：把指令分发到**保留站**（Reservation Stations，RS）
    - 类比：**保留站 -> 火车站**，**指令 -> 火车**
  - 这些**指令不会立即执行**，而是等待它们**所依赖的数据**，传递给它们之后才会执行
    - 类比：**数据 -> 乘客**，火车需要等乘客
3. 一旦指令依赖的数据到齐了，指令就可以交到后面的**功能单元**（Function Unit，FU，本质是**ALU**）去执行了
  - 很多功能单元是可以**并行运行**的，但**不同的功能单元能够支持执行的指令是不相同的**
4. 指令执行阶段完成后，我们并**不能立即把结果写回到寄存器**里面，而是把结果先存放到**重排序缓冲区**（ReOrder Buffer，ROB）
5. 在**重排序缓冲区**里，我们的CPU会按照**取指令的顺序**，对指令的计算结果重新排序
  - 只有**排在前面的指令**都已经**完成**了，才会**提交指令**，完成整个指令的运算结果
6. 实际的指令计算结果数据，并**不是直接写到内存或者高速缓存**，而是先写入**存储缓冲区**（Store Buffer）
  - **最终才会写入内存和高速缓存**
7. 在乱序执行的情况下，只有**CPU内部指令的执行层面**，可能是**乱序**的
  - 只要能在**指令译码**阶段**正确地分析出指令之间的数据依赖关系**，『乱序』就只会在**相互没有影响**的指令之间发生
    - 相互没有影响 ≈ **不破坏数据依赖**
  - 即便指令的执行过程是乱序的，在指令的计算结果**最终写入到寄存器和内存之前**，依然会进行一次**排序**
    - 以确保**所有指令**在**外部看来**仍然是**有序完成**的

### 回到样例
```c
a = b + c
d = a * e
x = y * z
```
1. d依赖于a的计算结果，不会在a的计算完成之前执行
2. `x = y * z`的指令同样会被分发到**保留站**，x所依赖的y和z的数据是准备好的，这里的乘法运算不会等待d的计算结果
3. 如果只有一个FU能够计算乘法，那么这个FU并不会因为d要等待a的计算结果而被限制，会先被拿来计算x
4. x计算完成后，d也等来了a的计算结果，此时，唯一的乘法FU会去计算d的结果
5. 在**重排序缓冲区**里，把对应的计算结果的提交顺序，仍然设置为**a->d->x**，但实际计算完成的顺序是**x->a->d**
6. 整个过程中，计算乘法的FU**没有被闲置**，意味着**CPU的吞吐率最大化**

### 小结
1. 整个乱序执行技术，类似于在**指令的执行阶段**提供了一个**线程池**，**FU**就是**线程**
  - 指令不再是顺序执行的，而是根据线程池所**拥有的资源**，各个任务**是否可以进行执行**，进行**动态调度**
  - 在执行完成之后，又重新把结果放在一个**队列**里面，**按照指令的分发顺序重新排序**
  - 即使内部是『乱序』的，但**外部看来**，仍然是**顺序执行**的
2. 乱序执行，**极大地提高了CPU的运行效率**
  - 核心原因：**CPU的运行速度比访问主内存的速度快很多**
  - 如果采用**顺序执行**的方式，很多时间会被浪费在前面指令**等待获取内存数据**
    - 为此，CPU不得不加入**NOP**操作进行**空转**
  - 乱序执行充分利用了**较深流水线**带来的**并发性**，可以充分利用CPU的性能

## 控制冒险
1. 在**结构冒险**和**数据冒险**中，所有的**流水线停顿**都要从**指令执行**（EX）阶段开始
  - 流水线的前两个阶段，即**取指令**（IF）和**指令译码**（ID），是不需要停顿的
  - 基于一个基本假设：所有的指令代码都是**顺序加载执行**的
    - 不成立的情况：在执行的代码中，遇到**if/else**条件分支，或者**for/while**循环
2. jne指令发生的时候，CPU可能会跳转去执行其它指令
  - jne后的那一条指令是否应该顺序加载执行，在流水线里进行**取指令**的时候，是**无法知道**的
  - 要等到**jne指令执行完成**，更新了**PC寄存器**后，才能知道是否执行下一条指令，还是跳转到另一个内存地址，去取别的指令
3. 为了确保能**取到正确的指令**，不得不进行**等待延迟**的情况，这就是**控制冒险**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-if.jpg" width=1000/>

### 缩短分支延迟
1. **条件跳转指令**实际上进行了两种电路操作：**条件比较** + **实际跳转**
2. **条件跳转**
  - 根据**指令的opcode**，就能确认**对应的条件码寄存器**
3. **实际跳转**
  - 把要**跳转的地址**写入到**PC寄存器**
4. 无论是**指令的opcode**，还是**对应的条件码寄存器**，还是**跳转的地址**，都是在**指令译码**阶段就能获得的
  - 对应的**条件码比较电路**，只需要**简单的逻辑门电路**即可，并不需要一个完整而复杂的ALU
  - 可以将**条件判断**、**地址跳转**，都提前到**指令译码**阶段进行，而不需要放在**指令执行**阶段
  - 在CPU里面设计对应的**旁路**，在**指令译码**阶段，就提供对应的**判断比较的电路**
5. 这种方式，本质上和前面**数据冒险**的**操作数前推**的解决方案类似，就是在**硬件电路层面**，把一些计算结果**更早地反馈**到流水线中
  - 这样反馈会变得更快，后面的指令需要**等待的时间**就会**变短**
6. 只是**改造硬件**，并**不能彻底解决问题**
  - 跳转指令的比较结果，仍然要在**指令执行**完成后才能知道
  - 在流水线里，第一条指令进行**指令译码**的时钟周期里，其实就要**取下一条指令**了
    - 但由于第一条指令还没开始指令执行阶段，此时并不知道比较的结果，自然也就无法准确知道要取哪一条指令了

### 分支预测

#### 静态预测
1. CPU预测：条件跳转**一定不发生**
2. 如果**预测成功**，可以**节省**本来需要停顿下来**等待的时间**
2. 如果**预测失败**，需要**丢弃**后面已经取出指令且已经执行的部分
  - 这个丢弃的操作，在流水线里面叫作**Zap**或者**Flush**
  - CPU不仅要执行后面的指令，对于已经在流水线里面**执行到一半**的指令，还需要做对应的**清除**操作
    - 例如清空已经使用的**寄存器**里面的数据，而这些清除操作，有一定的**开销**

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-static-prediction.jpg" width=1000/>

#### 动态预测
1. **一级分支预测**（One Level Branch Prediction）、**1比特饱和计数**（1-bit saturating counter）
  - 用**1Bit**，记录当前分支的比较情况，**直接用当前分支的比较情况来预测下一次分支的比较情况**
2. **状态机**（State Machine）
  - 如果状态机总共有**4个状态**，需要2个比特来记录对应的状态，这样的策略叫作**2比特饱和计数**或者**双模态预测器**

#### 循环嵌套
```java
public class BranchPrediction {
    public static void main(String args[]) {
        long start = System.currentTimeMillis();
        for (int i = 0; i < 100; i++) {
            for (int j = 0; j < 1000; j++) {
                for (int k = 0; k < 10000; k++) {
                }
            }
        }
        long end = System.currentTimeMillis();
        System.out.println("Time spent is " + (end - start));

        start = System.currentTimeMillis();
        for (int i = 0; i < 10000; i++) {
            for (int j = 0; j < 1000; j++) {
                for (int k = 0; k < 100; k++) {
                }
            }
        }
        end = System.currentTimeMillis();
        System.out.println("Time spent is " + (end - start) + "ms");
    }
}
```
```
Time spent is 4
Time spent is 19ms
```
1. 循环其实也是利用**cmp**和**jle**指令来实现的
2. 每一次循环都有一个**cmp**和**jle**指令
  - 每一个**jle**都意味着要**比较条件码寄存器的状态**，来决定是**顺序执行**代码，还是要**跳转**到另外的地址
  - 每一次**循环发生**的时候，都会有一次『**分支**』
3. 分支预测策略最简单的方式：假设分支**不发生**
  - 对应循环，就是**循环始终进行下去**
4. 上面第一段代码**分支预测错误**的情况**比较少**
  - 更多的计算机指令，在流水线里顺序运行下去了，而不是把运行到一半的指令丢弃掉，再去重新加载新的指令执行

<img src="https://computer-composition-1253868755.cos.ap-guangzhou.myqcloud.com/computer-organization-hazard-prediction-loop.jpg" width=800/>