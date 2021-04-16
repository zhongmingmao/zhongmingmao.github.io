---
title: JVM基础 -- 方法调用
date: 2018-12-17 21:06:47
categories:
    - Java
    - JVM
    - Baisc
tags:
    - Java
    - JVM
---

## 重载+重写
1. 重载：方法名相同，但方法描述符不相同的方法之间的关系
2. 重写：方法名相同，并且方法描述符也相同的方法之间的关系
3. 方法描述符
    1. **Java：参数类型**
    2. **JVM：参数类型+返回类型**

### 重载
1. 重载的方法在**编译过程**即可完成识别
    - 具体到在每个方法调用时，Java编译器会根据**传入参数的声明类型**（不是实际类型）来选取重载方法
2. 三阶段
    - 在不允许**自动装拆箱**和**可变长参数**的情况下，选取重载方法
    - 允许**自动装拆箱**，但不允许**可变长参数**的情况下，选取重载方法
    - 在允许**自动装拆箱**和**可变长参数**的情况下，选取重载方法
3. Java编译器在**同一阶段**找到多个适配的方法，依据**形式参数的继承关系**，选择最贴切的方法，原则：**子类优先**
4. 重载来源
    - **同一个类中定义**
    - **继承父类非私有同名方法**

<!-- more -->

### 重写
1. 子类中定义了与父类中**非私有的同名实例方法**，且**参数类型相同**
    - 如果是**静态方法**，那么子类中的方法会**隐藏**父类中方法
2. 方法**重写**是Java**多态**最重要的一种体现形式

## 静态绑定与+动态绑定
1. JVM识别**重载方法**的关键在于**类名**，**方法名**和**方法描述符**
    - 方法描述符：**参数类型 + 返回类型**
    - 如果在同一个类中出现多个**方法名**和**方法描述符**也相同的方法，那么JVM会在类的**验证阶段报错**
    - JVM的限制比Java语言的**限制更少**，Java语言：**方法描述符 = 方法的参数类型**
3. JVM中关于**重写方法**的判定同样基于**方法描述符**
    - 如果子类定义了与父类中**非私有实例方法同名的方法**，那么只有当这两个方法的**参数类型**以及**返回类型**一致，JVM才会判定为重写
4. **Java语言中的重写**而**JVM中的非重写**，编译器会通过生成**桥接方法**来实现Java中的重写语义，保证Java语言和JVM表现出来的重写语义一致
5. 对重载方法的区分在**编译阶段**已经完成，可以认为**JVM不存在重载这一概念**
6. **静态绑定**：在**解析阶段**时能够**直接识别**目标方法
7. **动态绑定**：在**运行过程**中**根据调用者的动态类型**来识别目标方法
8. 重载 == 静态绑定，重写 == 动态绑定？
    - 反例：**重载不一定是静态绑定**（某个类的重载方法可能被它的子类所重写）
    - 反例：**重写不一定是动态绑定**（final修饰目标方法）
    - Java编译器会将**对非私有实例方法的调用**都编译为需要**动态绑定**的类型（可能进一步优化）
    - **重载/重写** 和 **静态绑定/动态绑定** 是**两个不同纬度的描述**

### 重载不一定是静态绑定

#### Java代码
```java
// 重载
public class Overload {
    public static void main(String[] args) {
        A a = new B();
        // invokevirtual指令：A.func(int)和A.func(long)形成重载，但需要动态绑定
        a.func(1);
    }
}

class A {
    void func(int i) {
    }

    void func(long i) {
    }
}

class B extends A {
    @Override
    void func(int i) {
    }
}
```

#### 字节码
```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: new           #2                  // class me/zhongmingmao/basic/invoke/bind/B
         3: dup
         4: invokespecial #3                  // Method me/zhongmingmao/basic/invoke/bind/B."<init>":()V
         7: astore_1
         8: aload_1
         9: iconst_1
         // 虚方法调用
        10: invokevirtual #4                  // Method me/zhongmingmao/basic/invoke/bind/A.func:(I)V
        13: return
      LineNumberTable:
        line 6: 0
        line 7: 8
        line 8: 13
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      14     0  args   [Ljava/lang/String;
            8       6     1     a   Lme/zhongmingmao/basic/invoke/bind/A;
}
```

### 重写不一定是动态绑定

#### Java代码
```java
// 重写
public class Override {
    public static void main(String[] args) {
        C c = new C();
        // C.func()的flags为：ACC_FINAL
        // JVM能确定目标方法只有一个，invokevirtual指令将采用静态绑定
        c.func();
    }
}

class C {
    final void func() {
    }
}
```

#### 字节码
C
```
final void func();
    descriptor: ()V
    flags: ACC_FINAL
    Code:
      stack=0, locals=1, args_size=1
         0: return
      LineNumberTable:
        line 13: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       1     0  this   Lme/zhongmingmao/basic/invoke/bind/C;
```
Override
```
public static void main(java.lang.String[]);
  descriptor: ([Ljava/lang/String;)V
  flags: ACC_PUBLIC, ACC_STATIC
  Code:
    stack=2, locals=2, args_size=1
       0: new           #2                  // class me/zhongmingmao/basic/invoke/bind/C
       3: dup
       4: invokespecial #3                  // Method me/zhongmingmao/basic/invoke/bind/C."<init>":()V
       7: astore_1
       8: aload_1
       9: invokevirtual #4                  // Method me/zhongmingmao/basic/invoke/bind/C.func:()V
      12: return
    LineNumberTable:
      line 6: 0
      line 7: 8
      line 8: 12
    LocalVariableTable:
      Start  Length  Slot  Name   Signature
          0      13     0  args   [Ljava/lang/String;
          8       5     1     d   Lme/zhongmingmao/basic/invoke/bind/C;
}
```

## 调用相关的指令

### 具体指令
1. invokestatic：调用静态方法
2. invokespecial
    - 调用**私有实例方法**、构造器
    - 使用**super**关键词调用父类的实例方法、构造器
    - 调用所实现接口的**default方法**
3. invokevirtual：调用**非私有实例方法**
4. invokeinterface：调用接口方法
5. invokedynamic：调用动态方法（比较复杂）

```java
interface Customer {
    boolean isVip();
}

class Merchant {
    static final double ORIGINAL_DISCOUNT = 0.8d;

    public double discount(double originalPrice, Customer customer) {
        return originalPrice * ORIGINAL_DISCOUNT;
    }
}

class Profiteer extends Merchant {
    @Override
    public double discount(double originalPrice, Customer customer) {
        if (customer.isVip()) { // invokeinterface
            return originalPrice * priceDiscrimination(); // invokestatic
        }
        return super.discount(originalPrice, customer); // invokespecial
    }

    private static double priceDiscrimination() {
        return new Random() // invokespecial
                .nextDouble() // invokevirtual
                + ORIGINAL_DISCOUNT;
    }
}
```

### 定位目标方法
1. 对于**invokestatic**和**invokespecial**，JVM在**解析阶段**能够**直接识别**具体的目标方法
2. 对于**invokevirtual**和**invokeinterface**，在绝大部分情况下，JVM需要在**执行过程**中，根据**调用者的动态类型**，来确定具体的目标方法
    - 唯一例外：如果JVM能确定目标方法**有且只有一个**，例如目标方法被标记为final

### 调用指令的符号引用
1. 在编译过程中，并不知道目标方法的具体内存地址，因此，Java编译器会暂时用**符号引用**来表示该目标方法
    - 符号引用包括：**目标方法所在的类或接口的名字，以及目标方法的方法名和方法描述符**
2. **符号引用**存储在**class文件的常量池之中**，根据**目标方法是否为接口方法**，这些引用可分为**接口符号引用**和**非接口符号引用**

```
$ javap -v Profiteer
Constant pool:
   #1 = Methodref          #8.#30         // me/zhongmingmao/basic/Merchant."<init>":()V
   #2 = InterfaceMethodref #31.#32        // me/zhongmingmao/basic/Customer.isVip:()Z
   #3 = Methodref          #11.#33        // me/zhongmingmao/basic/Profiteer.priceDiscrimination:()D
   #4 = Methodref          #8.#34         // me/zhongmingmao/basic/Merchant.discount:(DLme/zhongmingmao/basic/Customer;)D
...
   #6 = Methodref          #5.#30         // java/util/Random."<init>":()V
   #7 = Methodref          #5.#36         // java/util/Random.nextDouble:()D
```

#### 目标方法的查找步骤
1. 对于**非接口符号引用**，假设该符号引用所指向的类为C，查找步骤
    - 在C中查找符合名字和描述符的方法
    - 如果没有找到，在C的**父类**中继续搜索，直至Object类
    - 如果没有找到，在C所**直接实现或间接实现的接口**中搜索，这一步搜索得到的目标方法必须是**非私有、非静态**的
        - 如果目标方法在**间接接口**中，则需要满足**C与该接口之间没有其他符合条件的目标方法** -- 越近，优先级越高
        - 如果有**多个符合条件的目标方法**，则**任意返回**其中一个
    - **静态方法** 也可以通过**子类**来调用，子类的静态方法会**隐藏**父类中同名同描述符的静态方法
2. 对于**接口符号引用**，假设该符号引用所指向的接口为I，查找步骤
    - 在I中查找符合名字和描述符的方法
    - 如果没有找到，在**Object类中的公有实例方法**中搜索
    - 如果没有找到，则在I的**超接口**中搜索，这一步的搜索结果的要求**与非接口符号引用的要求一致**
3. 经过上述的**解析**步骤之后，**符号引用会被解析成实际引用**
    - 对于可以**静态绑定**的方法调用而言，实际引用的是**一个指向方法的指针**
    - 对于需要**动态绑定**的方法调用而言，实际引用则是**一个虚方法表的索引**

## 虚方法调用
1. JVM的虚方法调用指令
    - Java里所有**非私有实例方法的调用**都会编译成**invokevirtual**指令（**绝大数情况下动态绑定**）
    - 而**接口方法调用**都会被编译成**invokeinterface**指令
2. 在绝大数情况下，JVM需要根据**调用者的动态类型**，来**确定虚方法调用的目标方法**，这个过程称之为**动态绑定**
    - 相对于静态绑定的非虚方法调用来说，**虚方法调用更加耗时**
3. 静态绑定
    - 调用静态方法的**invokestatic**指令
    - 调用构造器、私有实例方法和父类非私有实例方法（可继承）的**invokespecial**指令
        - 父类非私有实例方法：本意是要调用父类的特定方法，而非根据具体类型决定目标方法
    - 如果**虚方法调用**指向一个**标记为final**的方法，那么JVM也可以**静态绑定**该虚方法调用的目标方法

## 虚方法表（链接-准备阶段）
1. 虚方法表：JVM采取了一种用**空间换时间**的策略来实现**动态绑定**
2. invokevirtual的虚方法表与invokeinterface的虚方法表类似
3. 虚方法表本质上是一个**数组**，每个数组元素指向**当前类及其父类中非私有、非final的实例方法**
4. 虚方法表的特性
    - **子类虚方法表中包含父类虚方法表中的所有方法**
    - 子类方法在虚方法表中的**索引值**，与它**所重写的父类方法的索引值相同**
5. 方法调用指令中的**符号引用**会在**执行之前**解析成**实际引用**
    - 对于**静态绑定**的方法调用而言，实际引用将指向**具体的目标方法**
    - 对于**动态绑定**的方法调用而言，实际引用则是**虚方法表的索引**（不仅仅是索引值）
6. 动态绑定：JVM将**获取调用者的实际类型**，并在**实际类型的虚方法表**中，根据**索引值**获得**目标方法**
7. 使用虚方法表的动态绑定与静态绑定相比，**仅仅多出几个内存解引用操作**（相对于创建和初始化栈帧来说，开销很小）
    - 访问**栈**上的调用者
    - 读取调用者的**动态类型**
    - 读取该类型的**虚方法表**
    - 读取虚方法表某个**索引值**所对应的**目标方法**

```java
// -XX:CompileCommand=dontinline,*.outBound
@Slf4j
public class InvokeVirtual {
    public static void main(String[] args) {
        Passenger a = new Foreigner();
        Passenger b = new Chinese();
        long start = System.currentTimeMillis();
        int count = 2_000_000_000;
        int half_count = count / 2;
        for (int i = 1; i <= count; i++) {
            Passenger c = (i < half_count) ? a : b;
            c.outBound();
        }
        long end = System.currentTimeMillis();
        // 超多态内存缓存（方法表）：6700ms
        // 单态内联缓存：2315ms
        log.info("{}ms", end - start);
    }
}

abstract class Passenger {
    public abstract void outBound();

    @Override
    public String toString() {
        return super.toString();
    }
}

@Slf4j
class Foreigner extends Passenger {
    @Override
    public void outBound() {
    }
}

@Slf4j
class Chinese extends Passenger {
    @Override
    public void outBound() {
    }

    public void shopping() {
    }
}
```

Passenger的方法表

| 索引 | 方法 | 备注 |
| -- | -- | -- |
| 0 | Passenger.toString() | 重写Object.toString() |
| 1 | Passenger.outBound() | 抽象方法，不可执行 |

Foreigner的方法表

| 索引 | 方法 | 备注 |
| -- | -- | -- |
| 0 | Passenger.toString() | 重写Object.toString() |
| 1 | Foreigner.outBound() | 重写Passenger.outBound() |

Chinese的方法表

| 索引 | 方法 | 备注 |
| -- | -- | -- |
| 0 | Passenger.toString() | 重写Object.toString() |
| 1 | Chinese.outBound() | 重写Passenger.outBound() |
| 2 | Chinese.shopping() | 购物 |

## 即时编译优化

### 内联缓存
1. **加快动态绑定**的优化技术：**缓存虚方法调用中调用者的动态类型，以及该类型所对应的目标方法**
2. 在之后的执行过程中，如果碰到已缓存的类型，内联缓存便会直接调用该类型所对应的目标方法
    - 如果没有碰到已缓存的类型，内联缓存则会退化至使用**基于虚方法表的动态绑定**
3. 内联缓存实际上并**没有内联目标方法**
    - **任何方法调用除非被内联，否则都会有固定开销**
    - 开销
        - 保存程序在该方法中的**执行位置**
        - 新建、压入和弹出新方法所使用的**栈帧**
    - getter/setter方法的固定开销所占据的CPU时间甚至超过了方法本身
    - 在**即时编译**中，**方法内联可以消除方法调用的固定开销**

#### 针对多态的优化
1. 术语
    - 单态：仅有一种状态的情况
    - 多态：有限数量状态的情况
    - 超多态：在某个具体数值之下，称之为多态，否则，称之为超多态
2. 对于内联缓存，我们也有对应的单态内联缓存、多态内联缓存和超多态内联缓存
    - 单态内联缓存
        - 只缓存了一种动态类型以及它所对应的目标方法；比较所缓存的动态类型，如果命中，则调用对应的目标方法
        - 大部分的虚方法调用均是单态的（只有一种动态类型），为了节省内存空间，**JVM只采用单态内联缓存**
    - 多态内联缓存（HotSpot中不存在）
        - 缓存了多个动态类型以及目标方法；逐个将所缓存的动态类型与当前动态类型进行比较，如果命中，则调用相应的目标方法
        - 一般来说，我们会将更热门的动态类型放在前面
3. 当内联缓存没有命中的情况下，JVM需要重新使用**虚方法表**进行动态绑定，有两种选择
    - 替换单态内联缓存中的记录（**数据局部性原理**）
        - 最坏情况：每次进行方法调用都轮流替换内联缓存，导致**只有写缓存的额外开销，但没有读缓存对性能提升**
        - 可以劣化为超多态内联缓存
    - **超多态内联缓存（JVM的具体实现方式）**
        - 实际上已经**放弃了优化的机会，直接访问虚方法表来动态绑定目标方法**
4. 单态内联缓存 -> (无法命中，劣化) -> 超多态内联缓存（直接使用虚方法表来进行动态绑定）
    - **HotSpot只存在单态内联缓存和超多态内联缓存**，不存在多态内联缓存

#### 性能对比
```java
// -XX:CompileCommand=dontinline,*.outBound
Passenger a = new Foreigner();
Passenger b = new Chinese();
long start = System.currentTimeMillis();
int count = 2_000_000_000;
int half_count = count / 2;
for (int i = 1; i <= count; i++) {
    Passenger c = (i < half_count) ? a : b;
    c.outBound();
}
long end = System.currentTimeMillis();
// 超多态内存缓存（方法表）：6700ms
// 单态内联缓存：2315ms
log.info("{}ms", end - start);
```

### 方法内联（跳过，后续介绍）

## 参考资料
[深入拆解Java虚拟机](https://time.geekbang.org/column/intro/100010301)

<!-- indicate-the-source -->
