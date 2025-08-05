---
title: New Java Feature - Error Code
mathjax: true
date: 2025-01-14 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-exception-recovery.png
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. Java 的**异常处理**是对**代码性能**有着重要影响的因素
2. Java 的异常处理，有着**天生优势**，特别是在**错误排查**方面的作用，很难找到合适的**替代方案**

<!-- more -->

# 用例

```java
package me.zhongmingmao;

import java.security.NoSuchAlgorithmException;

public class UseCase {
  public static void main(String[] args) {
    String[] algorithms = {"SHA-128", "SHA-192"};

    String availableAlgorithm = null;
    for (String algorithm : algorithms) {
      Digest md;
      try {
        md = Digest.of(algorithm);
      } catch (NoSuchAlgorithmException ex) {
        // ignore, continue to use the next algorithm.
        continue;
      }

      try {
        md.digest("Hello, world!".getBytes());
      } catch (Exception ex) {
        System.getLogger("me.zhongmingmao")
            .log(System.Logger.Level.WARNING, algorithm + " does not work", ex);
        continue;
      }

      availableAlgorithm = algorithm;
    }

    if (availableAlgorithm != null) {
      System.out.println(availableAlgorithm + " is available");
    } else {
      throw new RuntimeException("No available hash algorithm");
    }
  }
}
```

## 可恢复异常

1. NoSuchAlgorithmException
2. 尝试**捕获**并**识别**这个异常，然后再从这个异常里**恢复**过来，**继续执行**代码
3. 可恢复的异常处理 - 可以从异常里恢复过来，继续执行的异常处理

```java
} catch (NoSuchAlgorithmException nsae) {
    // ignore, continue to use the next algorithm.
}
```

1. 只要 **catch** 语句能够**捕获**并**识别**这个异常，那么这个**异常**的**生命周期**就**结束**了
2. **catch** 只需要知道**异常的名字**，而不需要知道**异常的调用堆栈**
   - 极大地**削弱**了 **Java 异常**在**错误排查**方面的作用
3. **可恢复异常**不使用**异常的调用堆栈**，是否可以**不生成调用堆栈**？
   - 基于 Java 异常的**性能基准测试**结果，**生成异常的调用堆栈**是异常处理**影响性能**的**最主要因素**
   - 如果不需要生成调用堆栈，Java 异常的处理性能会有**成百上千倍**的提升

## 不可恢复异常

1. RuntimeException
2. 上述代码并没有**捕获**和**识别**，该异常会直接导致**程序的退出**，并且把**异常的信息和堆栈**打印出来
3. 不可恢复的异常处理 - 导致了**程序的中断**，程序并不能从**异常抛出**的地方**恢复**
4. **调用堆栈**对于**不可恢复异常**来说**至关重要**
   - 可以从**异常调用堆栈**的打印信息中，**快速定位**到出问题的代码，降低了运维的成本
5. 由于不可恢复异常**中断**了程序的运行，因此它的开销是**一次性**的
6. 现实中，基本不会允许程序由于异常而中断退出 - **服务端** + **客户端**
   - 在**高质量的产品**里，很难允许不可恢复异常的存在

## 记录的调试信息

1. Exception
2. 尝试**捕获**并**识别**这个异常，然后从异常里**恢复**过来**继续执行**代码 - **可恢复异常**
   - 同时，还在**日志**里记录了该**异常**，异常的**调试信息**，即**异常信息**和**调用堆栈**，也会被详细记录到日志中
3. 典型的使用场景 - 程序可以**恢复**，但异常信息可以**查询**

```java
      } catch (Exception ex) {
        System.getLogger("me.zhongmingmao")
            .log(System.Logger.Level.WARNING, algorithm + " does not work", ex);
        continue;
      }
```

1. 在**异常捕获**的场景下 - **方法调用**
   - 该异常的**记录方式**，包括是否记录 `me.zhongmingmao`
   - 该异常的**记录地点** - `System.getLogger()`
   - 该异常的**严重程度** - `Logger.Level`
   - 该异常的**影响范围** - `[algorithm] does not work`
2. 在**异常生成**的场景下 - **方法实现**
   - 异常生成时携带的**调试信息**，包括**异常信息**和**调用堆栈**
3. 记录在案的调试信息 - **调用代码** + **实现代码**

# 改进

> 共用错误码本身，并没有携带**调试信息**，为了能够**快速定位**问题，需为共用错误码**补充**调试信息

## 方法实现

> 使用**异常**的形式补充了**调用信息**，包括**问题描述**和**调用堆栈**

```java
public static Returned<Digest> of(String algorithm) {
  return switch (algorithm) {
    case "SHA-256" -> new Returned.ReturnValue<>(new SHA256());
    case "SHA-512" -> new Returned.ReturnValue<>(new SHA512());
    case null -> {
      System.getLogger("me.zhongmingmao")
          .log(
              System.Logger.Level.WARNING,
              "No algorithm is specified",
              new Throwable("the calling stack"));
      yield new Returned.ErrorCode<>(-1);
    }
    default -> {
      System.getLogger("me.zhongmingmao")
          .log(
              System.Logger.Level.INFO,
              "Unknown algorithm is specified %s".formatted(algorithm),
              new Throwable("the calling stack"));
      yield new Returned.ErrorCode<>(-1024);
    }
  };
}
```

## 方法调用

```java
public static void main(String[] args) {
  Returned<Digest> returned = Digest.of("SHA-128");
  switch (returned) {
    case Returned.ReturnValue value -> {}
    case Returned.ErrorCode code -> {
      System.getLogger("me.zhongmingmao")
          .log(
              System.Logger.Level.INFO,
              "Failed to get instance of SHA-128, code: %d".formatted(code.errorCode()));
    }
  }
}
```

## 运行效果

> 类似于使用**异常**处理，可以**快速定位**问题的**调试信息**

![image-20250805174155133](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250805174155133.png)

## 对比

1. 使用调试信息带来的**性能损失**，并不比使用异常的性能损失小多少
2. 但日志记录既可以**开启**，也可以**关闭**
   - 如果**关闭**了日志，就不用再**生成调试信息**了，对应的**性能影响**也就消失了
   - 在需要定位问题的时候，再**启动日志**
   - 这样，可以把**性能影响**控制在一个**极小的范围**内

| 问题                                     | 共用错误码的解答                           |
| ---------------------------------------- | ------------------------------------------ |
| **可恢复异常**能不能不生成**调用堆栈**？ | 可以，**不开启日志**，则不生成调用堆栈     |
| **不可恢复异常**还有**存在必要**么？     | 没有，错误码方案的所有错误，**都可以恢复** |
| 有没有**快速定位**问题的**替代方案**？   | 有，**开启日志**，就能提供调试信息了       |

1. 日志并不是唯一可以记录**调试信息**的方式，可以使用更便捷的 **JFR**
2. **错误码**的调试方式，更符合**调试**的目的，只有需要**调试**的时候，才会**生成调试信息**
