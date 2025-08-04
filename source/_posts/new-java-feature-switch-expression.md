---
title: New Java Feature - Switch Expression
mathjax: true
date: 2025-01-11 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-switch-expressions.png
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. JDK 14
2. 在 Java 规范里，**表达式**完成**对数据的操作**
   - 一个表达式的结果可以是一个数值（i * 4）；或者是一个变量（i = 4）；或者什么都不是（void 类型）
3. Java 语句是 Java 最基本的**可执行单元**
   - 它本身不是一个数值，也不是一个变量
   - Java 语句的标志性符号是**分号**（**代码**）和**大括号**（**代码块**） - if-else 语句、赋值语句等
4. switch 表达式是一个表达式，而 switch 语句是一个语句

<!-- more -->

# Switch 语句

```java
class DaysInMonth {
  public static void main(String[] args) {
    Calendar today = Calendar.getInstance();
    int month = today.get(Calendar.MONTH);
    int year = today.get(Calendar.YEAR);

    int daysInMonth;
    switch (month) {
      case Calendar.JANUARY:
      case Calendar.MARCH:
      case Calendar.MAY:
      case Calendar.JULY:
      case Calendar.AUGUST:
      case Calendar.OCTOBER:
      case Calendar.DECEMBER:
        daysInMonth = 31;
        break;
      case Calendar.APRIL:
      case Calendar.JUNE:
      case Calendar.SEPTEMBER:
      case Calendar.NOVEMBER:
        daysInMonth = 30;
        break;
      case Calendar.FEBRUARY:
        if (((year % 4 == 0) && !(year % 100 == 0)) || (year % 400 == 0)) {
          daysInMonth = 29;
        } else {
          daysInMonth = 28;
        }
        break;
      default:
        throw new RuntimeException("Calendar in JDK does not work");
    }

    System.out.println("There are " + daysInMonth + " days in this month.");
  }
}
```

> 容易犯错 1 - **break** 关键字的使用

```java
int daysInMonth;
switch (month) {
    case Calendar.JANUARY:
    case Calendar.MARCH:
    case Calendar.MAY:
        break;    // WRONG BREAK!!!
    case Calendar.JULY:
    case Calendar.AUGUST:
    case Calendar.OCTOBER:
    case Calendar.DECEMBER:
        daysInMonth = 31;
        break;
    // snipped
}
```

```java
int daysInMonth;
switch (month) {
    // snipped
    case Calendar.APRIL:
    case Calendar.JUNE:
    case Calendar.SEPTEMBER:
    case Calendar.NOVEMBER:
        daysInMonth = 30;
                         // WRONG, NO BREAK!!!
    case Calendar.FEBRUARY:
        if (((year % 4 == 0) && !(year % 100 == 0))
                || (year % 400 == 0)) {
            daysInMonth = 29;
        } else {
            daysInMonth = 28;
        }
        break;
    // snipped
}
```

1. break 语句的**遗漏**或者**冗余** - 常见软件安全漏洞
   - 凡是使用 **switch 语句**的代码，都可能成为黑客们**重点关注**的对象
   - 编写代码和阅读代码要十分小心 - 增加**维护成本**，降低**生产效率**
2. switch 语句需要 break 的原因 - 在不同的情况下，**共享**部分或者全部的代码片段
3. 这是一个**弊大于利**的设计
   - 新设计的现代语言 - 更多的使用 switch 语句，但不要使用 break
   - 真实需求依然存在 - **不同场景共享代码片段**

> 容易犯错 2 - 反复出现的赋值语句

```java
int daysInMonth = 0;
switch (month) {
    // snipped
    case Calendar.APRIL:
    case Calendar.JUNE:
    case Calendar.SEPTEMBER:
    case Calendar.NOVEMBER:
        break;   // WRONG, INITIAL daysInMonth value IS USED!!!
    case Calendar.FEBRUARY:
    // snipped
}
```

1. daysInMonth 的**变量声明**和**实际赋值**是分开的，赋值语句需要反复出现，以适应不同的场景
2. 如果在 switch 语句里，daysInMonth 变量**没有被赋值**
   - 编译器也**不会报错**，**缺省**的或者**初始**的变量就会被使用

```java
int daysInMonth = 0;
switch (month) {
    // snipped
    case Calendar.APRIL:
    case Calendar.JUNE:
    case Calendar.SEPTEMBER:
    case Calendar.NOVEMBER:
        break;   // WRONG, INITIAL daysInMonth value IS USED!!!
    case Calendar.FEBRUARY:
    // snipped
}
```

1. 初始的变量值可能是个合适的数据，也可能不是
2. 为了判断本地变量有没有合适的值，我们需要**通览**整个 switch 语句块，确保赋值没有遗漏，也没有多余
   - 增加**编码出错的几率**，也增加**阅读代码的成本**

> 催生需求 - **多场景处理**的**代码块**拥有一个**数值** - 变成一个**表达式**

# Switch 表达式

```java
class DaysInMonth {

  public static void main(String[] args) {
    Calendar today = Calendar.getInstance();
    int month = today.get(Calendar.MONTH);
    int year = today.get(Calendar.YEAR);

    int daysInMonth =
        switch (month) {
          case Calendar.JANUARY,
              Calendar.MARCH,
              Calendar.MAY,
              Calendar.JULY,
              Calendar.AUGUST,
              Calendar.OCTOBER,
              Calendar.DECEMBER ->
              31;
          case Calendar.APRIL, Calendar.JUNE, Calendar.SEPTEMBER, Calendar.NOVEMBER -> 30;
          case Calendar.FEBRUARY -> {
            if (((year % 4 == 0) && !(year % 100 == 0)) || (year % 400 == 0)) {
              yield 29;
            } else {
              yield 28;
            }
          }
          default -> throw new RuntimeException("Calendar in JDK does not work");
        };

    System.out.println("There are " + daysInMonth + " days in this month.");
  }
}
```

1. **switch 代码块**出现在**赋值运算符**的**右侧**，意味着 **switch 代码**块表示的是一个**数值**，或者说一个**变量**
2. 多情景的合并，即**一个 Case 语句**，可以处理**多个场景**
   - 这些场景，使用**逗号**分隔，**共享一个代码块**
   - **传统**的 switch 语句，**一个 Case 语句**只能处理**一种场景**
3. **多情景**的**合并**的设计，满足了**共享代码片段**的需求
   - 由于**只使用了一个 Case 语句**，也就不再需要使用 **break** 语句来满足该需求了
   - 因此，**break 语句**从 **switch 表达式**里消失了
4. 不同的是，**传统的 switch 语句**，不同的 **case** 语句之间可以**共享部分的代码片段**
   - 而 **switch 表达式**里，需要**共享全部的代码片段**
   - **共享部分代码片段**的能力给代码的编写者带来的**困惑**远远多于它带来的**好处**
5. 情景操作符 - `->`
   - 一般使用在 **case** 语句里，一般化的形式为 `case L ->`，这里的 `L` 为要匹配的**一个或多个情景**
   - 如果目标变量与情景**匹配**，那么就**执行**操作符右边的**表达式**或者**代码块**
   - 如果要匹配的情景有**两个或两个以上**，就要使用 `,` 分隔
6. 传统的 switch 语句，这个一般化的形式为 `case L: `，即使用**冒号标识符**
   - 依然可以在 **switch 表达式**里面使用**冒号标识符**
   - 使用**冒号标识符**的**一个 case 语句**只能匹配**一个场景**
7. **箭头标识符**右侧的**数值**，代表在匹配该情景下，**switch 表达式**的**数值**
   - 可以是**表达式**、**代码块**或者**异常抛出语句**，而不能是其它形式
   - 如果只需要**一个语句**，该语句也要以**代码块**的形式呈现出来
   - 没有以**代码块**形式呈现的代码，**编译时会报错**，是一个**很棒的约束**
   - 代码块的形式，增强了**视觉效果**，减少了**编码失误**

> 如果只需要**一个语句**，该语句也要以**代码块**的形式呈现出来

```java
case Calendar.JANUARY,
     // snipped
     Calendar.DECEMBER -> {  // CORRECT, enclosed with braces.
    yield 31;
}
```

> 没有以**代码块**形式呈现的代码，**编译时会报错**，是一个**很棒的约束**

```java
case Calendar.JANUARY,
     // snipped
     Calendar.DECEMBER ->   // WRONG, not a block.
    yield 31;
```

> 箭头标识符右侧需要一个**表达 switch 表达式的数值**，这是一个**很强的约束**
> 如果一个语句破坏了这个约束，就**不能出现**在 switch 表达式里
> 例如 **return** 语句的意图是**退出该方法**，而没有表达这个 switch 表达式的数值 - **无法通过编译**

```java
int daysInMonth = switch (month) {
    // snipped
    case Calendar.APRIL,
         // snipped
         Calendar.NOVEMBER -> {
        // yield 30;
        return; // WRONG, return outside of enclosing switch expression.
    }
    // snipped
}
```

> 新关键字 - **yield** 

1. 在大多数情况下，switch 表达式**箭头标识符**的右侧是一个**数值**或者一个**表达式**
2. 如果需要**一个或者多个语句**，就要使用**代码块**的形式
3. 需要引入一个新的 **yield 语句**来**产生**一个值，该值就成为了这个**封闭代码块**所代表的**数值**
4. 可以将 **yield 语句**产生的值看作 **switch 表达式**的**返回值**
5. **yield 语句**只能用在 **switch 表达式**里，而不能用在 **switch 语句**里

```java
case Calendar.FEBRUARY -> {
    if (((year % 4 == 0) && !(year % 100 == 0))
            || (year % 400 == 0)) {
        yield 29;
    } else {
        yield 28;
    }
}
```

> 在 **switch 表达式**里，**所有的情景**都要列举出来 - **穷举**
> 如果没有最后的 **default** 分支，**编译器**就会报错 - 使得 **switch 表达式**更加**健壮**，大幅度降低**维护成本**

```java
int daysInMonth = switch (month) {
    case Calendar.JANUARY,
         // snipped
         Calendar.DECEMBER -> 31;
    case Calendar.APRIL,
         // snipped
         Calendar.NOVEMBER -> 30;
    case Calendar.FEBRUARY -> {
             // snipped
    }
    // WRONG to comment out the default branch, 'switch' expression
    // MUST cover all possible input values.
    //
    // default -> throw new RuntimeException(
    //        "Calendar in JDK does not work");
};
```

# 改进的 switch 语句

```java
  private static int daysInMonth(int year, int month) {
    int daysInMonth = 0;
    switch (month) {
      case Calendar.JANUARY,
          Calendar.MARCH,
          Calendar.MAY,
          Calendar.JULY,
          Calendar.AUGUST,
          Calendar.OCTOBER,
          Calendar.DECEMBER ->
          daysInMonth = 31;
      case Calendar.APRIL, Calendar.JUNE, Calendar.SEPTEMBER, Calendar.NOVEMBER -> daysInMonth = 30;
      case Calendar.FEBRUARY -> {
        if (((year % 4 == 0) && !(year % 100 == 0)) || (year % 400 == 0)) {
          daysInMonth = 29;
          break;
        }

        daysInMonth = 28;
      }
        // default -> throw new RuntimeException(
        //        "Calendar in JDK does not work");
    }

    return daysInMonth;
  }
```

1. **switch 语句**可以使用**箭头标识符**，也可以使用 **break 语句**，也**不需要列出所有的场景**
2. switch 语句的**改进**主要体现在 **break 语句**使用上
   - **break 语句**没有出现在**下一个 case 语句之前**
   - 意味着使用**箭头标识符**的 **switch 语句**不再需要 **break 语句**来实现**情景间**的**代码共享**了
   - 虽然可以这样使用 break 语句，但已经没有必要了
3. 有没有 **break** 语句，使用**箭头标识符**的 **switch 语句**都**不会 fall-through** 了 - **与 Go 对齐**

```java
switch (month) {
    // snipped
    case Calendar.APRIL,
             // snipped
         Calendar.NOVEMBER -> {
            daysInMonth = 30;
            break;  // UNNECESSARY, could be removed safely.
        }
    // snipped
}
```

> 使用**箭头标识符**的 switch 语句并没有禁止 break 语句，而是恢复了它本来的意义 - **从代码片段中抽身**

```java
switch (month) {
   // snipped
   case Calendar.FEBRUARY -> {
        if (((year % 4 == 0) && !(year % 100 == 0))
                || (year % 400 == 0)) {
            daysInMonth = 29;
            break;     // BREAK the switch statement
        }
    
        daysInMonth = 28;
    }
   // snipped
}
```

> 使用**箭头标识符**的 **switch 语句**和 **switch 表达式**，代码会更**健壮**

# 小结

1. **break 语句**只能出现在 **switch 语句**里，不能出现在 switch 表达式里
2. **yield 语句**只能出现在 **switch 表达式**里，不能出现在 switch 语句里
3. **switch 表达式**要穷举出**所有场景**，而 switch 语句不需要
4. 使用**冒号标识符**的 switch 形式，支持**情景间**的 **fall-through**，而使用箭头标识符的 switch 形式不支持
5. 使用**箭头标识符**的 switch 形式，**一个 case 语句**支持**多个情景**，而使用冒号标识符的 switch 形式不支持

> 使用**箭头标识符**的 switch 形式，**废止**了容易出问题的 **fall-through** 特征 - 推荐使用

> 在 switch 表达式和 switch 语句之间，**优先 switch 表达式** - 简化代码逻辑，减少代码错误，提高**生产效率**





