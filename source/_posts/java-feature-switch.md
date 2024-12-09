---
title: Java Feature - Switch
mathjax: true
date: 2024-10-15 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-switch.jpg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. **Switch 表达式**在 **JDK 14** 正式发布
2. 在 Java  规范中，表达式完成**对数据的操作**
   - 表达式的结果：可以是一个**数值**（i * 4），也可以是一个**变量**（i = 4），或者**什么都不是**（void 类型）
3. **Java 语句**是 Java **最基本的可执行单位**，本身不是一个数值，也不是一个变量
   - Java 语句的标志符号为**分号（代码）**和**双引号（代码块）**

<!-- more -->

# Switch 语句

![image-20241209182542013](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241209182542013.png)

> break 语句

1. 常见错误 - **break 语句**的**遗漏**或者**冗余**
2. 凡是使用 switch 语句的代码，都有可能成为黑客们**重点关注**的对象
   - 在 Code Review 时需重点关注 - 增加代码维护成本 + 降低生产效率
3. **break 语句**是一个**弊大于利**的设计
   - 设计一门现代的语言，需要更多地使用 Switch 语句，但不要再使用 break 语句 - **Go**
4. 需要依然存在 - **不同的场景共享代码片段**

> 反复出现的**赋值**语句

1. **本地变量**的**声明**和**实际赋值**是**分开**的
2. 在 Switch 语句中，**本地变量没有被赋值**，编译器也**不会报错**，使用**缺省**或者**初始化**的变量值
3. 为了判断本地变量有没有合适的值，需要**通览**整个 Switch 语句块，确保赋值没有遗漏 - 维护成本

```java
package ai.zhongmingmao.feature;

import java.util.Calendar;

class DaysInMonth {
  public static void main(String[] args) {
    Calendar today = Calendar.getInstance();
    int month = today.get(Calendar.MONTH);
    int year = today.get(Calendar.YEAR);

    int daysInMonth = 0;
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
        // daysInMonth = 30;
        break; // WRONG, INITIAL daysInMonth value IS USED!!!
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

    System.out.printf("There are %d days in this month.%n", daysInMonth);
  }
}
```

# Switch 表达式

![image-20241209184311504](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241209184311504.png)

1. **Switch 代码块**出现在**赋值运算符**的**右侧**
   - **Switch 代码块**表示的是一个**数值**，或者一个**变量**
   - **Switch 代码块**是一个**表达式**
2. 多场景合并 - **一个 Case 语句**可以处理**多个情景** - 使用**逗号**分隔，**共享代码块**
   - 传统的 **Switch 语句**，**一个 Case 语句**只能处理**一个情景**
   - **break 语句**从 **Switch 表达式**中**消失**了
3. 可以在 **Switch 表达式**里使用**冒号**标识符，但**一个 Case 语句**只能匹配**一个情景**
4. **箭头标识符右侧**可以是**表达式**、**代码块**或者**异常抛出语句**，不能是其它形式
5. **yield**
   - 如果需要**一个或多个语句**时，需要使用**代码块**的形式，**yield** 语句**产生**一个值
   - yield 语句产生的值可以看成是 **Switch 表达式**的**返回值**
   - yield 只能用于 **Switch 表达式**，而不能用于 **Switch 语句**
6. 在 Switch 表达式中，需要**穷举所有情景** - 使得代码**更健壮**，大幅降低**维护成本**

# 改进的 Switch 语句

> Switch 语句可以使用**箭头标识符**，也可以使用 **break 语句**，也**不需要**列出**所有的情景**

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
        // default -> throw new RuntimeException("Calendar in JDK does not work");
    }

    return daysInMonth;
  }
```

> Switch 语句的改进主要体现在 **break 语句**的使用上

1. **break 语句**没有出现在**下一个 case 语句之前**
2. 使用**箭头标识符**的 **Switch 语句**不再需要 **break 语句**来实现情景间的代码共享
3. **有没有 break 语句**，使用**箭头标识符**的 Switch 语句**都不会顺序执行**下面的操作 - **fall-through**
4. 使用**箭头标识符**的 Switch 语句**并没有禁止 break 语句**

# 怪味的 Switch 表达式

> 不再推荐使用**冒号标识符**的 **Switch 语句**和 **Switch 表达式**

1. **Switch 表达式**也可以使用**冒号标识符**
2. 使用**冒号标识符**的**一个 case 语句**只能匹配**一个场景**，而且支持 **fall-through**
3. 使用**冒号标识符**的 **Switch 表达式**也**不支持 break 语句**，应该是使用 **yield** 语句

```java
package ai.zhongmingmao.feature;

import java.util.Calendar;

class DaysInMonth {
  public static void main(String[] args) {
    Calendar today = Calendar.getInstance();
    int month = today.get(Calendar.MONTH);
    int year = today.get(Calendar.YEAR);

    int daysInMonth =
        switch (month) {
          case Calendar.JANUARY:
          case Calendar.MARCH:
          case Calendar.MAY:
          case Calendar.JULY:
          case Calendar.AUGUST:
          case Calendar.OCTOBER:
          case Calendar.DECEMBER:
            yield 31;
          case Calendar.APRIL:
          case Calendar.JUNE:
          case Calendar.SEPTEMBER:
          case Calendar.NOVEMBER:
            yield 30;
          case Calendar.FEBRUARY:
            if (((year % 4 == 0) && !(year % 100 == 0)) || (year % 400 == 0)) {
              yield 29;
            } else {
              yield 28;
            }
          default:
            throw new RuntimeException("Calendar in JDK does not work");
        };

    System.out.println("There are " + daysInMonth + " days in this month.");
  }
}
```

# 小结

> Switch 表达式 - yield 语句 + 穷举所有场景
> 箭头标识符 -> 不支持 fall-through + 多场景

1. **break 语句**只能出现在 **Switch 语句**里，不能出现在 Switch 表达式里
2. **yield 语句**只能出现在 **Switch 表达式**里，不能出现在 Switch 语句里
3. **Switch 表达式**需要**穷举所有场景**，而 Switch 语句不需要
4. 使用**冒号标识符**的 Switch 形式，支持 **fall-through**，而使用箭头标识符，则不支持 - Go
5. 使用**箭头标识符**的 Switch 形式，**一个 Case 语句支持多个场景**，而冒号标识符不支持

> 优先选择 - **箭头标识符** + **Switch 表达式**

