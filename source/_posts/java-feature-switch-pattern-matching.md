---
title: Java Feature - Switch Pattern Matching
mathjax: true
date: 2024-10-16 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-switch-pattern-matching.webp
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# OOP

> 存在潜在的**兼容性**问题

![image-20241211234823806](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241211234823806.png)

<!-- more -->

# Switch 模式匹配

1. 将**模式匹配**扩展到 **switch 语句**和 **switch 表达式**
2. 允许测试多个模式，每个模式都可以有特定的操作

```java
public static boolean isSquare(Shape shape) {
    return switch (shape) {
        case null, Shape.Circle c -> false;
        case Shape.Square s -> true;
    };
}
```

> **扩充的匹配类型**

1. 在 JDK 17 之前，switch 关键字可以匹配的数据类型 - **数字** + **枚举** + **字符串** - 本质上是**整型**的**原始类型**
2. 在 JDK 17 开始，支持**引用类型**

> 支持 **null** - 不会抛出 **NPE** - 在 JDK 17 之前需要先判空

```java
public static boolean isSquare(Shape shape) {
    if (shape == null) {
      return false;
    }

    return switch (shape) {
        case Shape.Circle c -> false;
        case Shape.Square s -> true;
    };
}
```

> **类型匹配**

1. 对**类型匹配**来说，switch 要匹配的数据是一个**引用**
2. 当**类型匹配**时，还能获得**匹配变量** - 不再需要**强制转换** - 降低**维护成本**

> **穷举**

1. 使用 **switch 表达式**，需要**穷举所有场景**，否则**编译器**会**报错**
2. **问题提前暴露**，降低代码**维护成本**

![image-20241212000936202](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241212000936202.png)

> **性能优化**

1. 使用 if-else 的处理方式，每一个场景，都至少对应一个 if-else 语句，**顺序执行** - 时间复杂度为 `O(N)`
2. 使用 switch 模式匹配，不需要顺序执行 - 时间复杂度为 `O(1)`

> default - 总能穷举所有场景，但丧失了**检查匹配场景有没有变更**的能力

```java
  public static boolean isSquare(Shape shape) {
    return switch (shape) {
      case Shape.Square s -> true;
      case null, default -> false;
    };
  }
```

