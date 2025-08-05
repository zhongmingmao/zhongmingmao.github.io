---
title: New Java Feature - Exception
mathjax: true
date: 2025-01-13 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-exception.jpeg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. Java 异常的使用和处理，是**滥用**最严重，诟病最多，也是最难平衡的一个难题
2. Java 语言支持三种异常的状况
   - 非正常异常（**Error**）、运行时异常（**Runtime Exception**）、检查型异常（**Checked Exception**）
   - **异常**，除非特别声明，一般指的是 **Checked Exception** 和 **Checked Exception**
3. **异常状况的处理**会让代码的**效率**变低 - 不应该使用**异常机制**来处理**正常情况**
   - 理想情况下，在执行代码时**没有任何异常发生**，否则业务执行的**效率**会**大打折扣**
   - 几乎无法完成，不管是 JDK 核心类库还是业务代码，都存在大量的**异常处理**代码
     - 软件都是由很多**类库**集成的，大部分类库，都只是从自身的角度去考虑问题，使用**异常**来处理问题
     - 很难期望业务执行下来没有任何异常发生
4. **抛出异常**影响了代码的**运行效率**，而实际业务又没有办法**完全不抛出**异常
   - 新的编程语言（**Go**），**彻底抛弃**类似于 Java 这样的异常机制，重新拥抱 **C** 语言的错误方式

<!-- more -->

# 性能

> 没有抛出异常的用例，能够支持的**吞吐量**要比抛出异常的用例大 **1000** 倍

![image-20250805112602436](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250805112602436.png)

# 案例

1. 在设计**算法公开接口**时，算法的**敏捷性**是必须要要考虑的问题
   - 算法总是会**演进**，旧的算法会过时，新的算法会出现
2. 一个应用程序，应该能够很方便地**升级**它的算法，自动地**淘汰**旧算法，**采纳**新算法，而不需要太大的改动
3. 因此，算法的公开接口经常使用**通用**的**参数**和**结构**

> 获取一个单向散列函数实例时，通过**工厂模式**来构造出单向散列函数的实例

```java
public abstract sealed class Digest {

  private static final class SHA256 extends Digest {
    @Override
    byte[] digest(byte[] message) {
      return null;
    }
  }

  private static final class SHA512 extends Digest {
    @Override
    byte[] digest(byte[] message) {
      return null;
    }
  }

  public static Digest of(String algorithm) throws NoSuchAlgorithmException {
    return switch (algorithm) {
      case "SHA-256" -> new SHA256();
      case "SHA-512" -> new SHA512();
      default -> throw new NoSuchAlgorithmException();
    };
  }

  abstract byte[] digest(byte[] message);
}
```

> 使用 of 方法，需要处理该 **Checked Exception**

```java
try {
    Digest md = Digest.of(digestAlgorithm);
    md.digest("Hello, world!".getBytes());
} catch (NoSuchAlgorithmException nsae) {
    // snipped
}
```

# 错误码

## Go

> 既能返回值，又能返回错误码 - **Go**

```java
public record Coded<T>(T returned, int errorCode) {
    // blank
};
```

```java
public static Coded<Digest> of(String algorithm) throws NoSuchAlgorithmException {
  return switch (algorithm) {
    case "SHA-256" -> new Coded<>(new SHA256(), 0);
    case "SHA-512" -> new Coded<>(new SHA512(), 0);
    default -> new Coded<>(null, -1);
  };
}
```

```java
Coded<Digest> coded = Digest.of("SHA-256");
if (coded.errorCode() != 0) {
    // snipped
} else {
    coded.returned().digest("Hello, world!".getBytes());
}
```

> 基准测试 - 几乎没有差别

```
Benchmark                  Mode  Cnt           Score          Error  Units
CodedBench.noErrorCode    thrpt   15  1320977784.955 ±  7487395.023  ops/s
CodedBench.withErrorCode  thrpt   15  1068513642.240 ± 69527558.874  ops/s
```

## 缺陷

> 在**性能优化**的同时，放弃了代码的**可读性**和**可维护性**

### 需要更多的代码

1. 使用**异常处理**的代码，可以在一个 **try-catch** 语句块里**包含多个方法的调用**
2. 每个方法的调用都可以**抛出异常**
   - 由于异常的**分层设计**，所有的异常都是 Exception 的子类
   - 可以**一次性**处理多个方法抛出的异常

```java
try {
    doSomething();      // could throw Exception
    doSomethingElse();  // could throw RuntimeException
    socket.close();     // could throw IOException
} catch (Exception ex) {
    // handle the exception in one place.
}
```

1. 使用了错误码的方式，**每一个方法调用**都要**检查返回的错误码**
2. 一般情况下，**同样的逻辑和接口结构**，使用**错误码**的方式需要编写**更多的代码**

> 对于**简单**的逻辑和语句，可以使用**逻辑运算符**合并多个语句 - **紧凑**但牺牲了代码的**可读性**

```java
if (doSomething() != 0 &&
    doSomethingElse() != 0 &&
    socket.close() != 0) {
    // handle the exception
}
```

> 对于**复杂**的逻辑和语句，需要一个**独立**的**代码块**来处理错误码 - **结构重复**的代码会增加

```java
if (doSomething() != 0) {
    // handle the exception
};

if (doSomethingElse() != 0) {
    // handle the exception
};

if  (socket.close() != 0) {
    // handle the exception
}
```

### 丢弃调试信息

> 性能 vs 可维护性

1. 最大的代价 - **可维护性大幅度降低**
2. 使用异常的代码，可以通过异常的**调用堆栈**，清楚地看到代码的**执行轨迹**，快速找到出问题的代码
3. 使用**错误码**之后，就**不再生成调用堆栈**了 - 性能提高
4. 快速找到代码的问题，是一个编程语言的竞争力
   - 如果回到错误码的处理方式，需要提供**快速排查问题**的**替代方案**
   - **更详尽的日志** + **JFR**

### 易碎的数据结构

1. 一个**新机制**的设计，必须要**简单**和**皮实** - 不容易犯错
2. 生成一个 Coded 实例，需遵循以下规则，**违反任意规则**，都可能产生**不可预测**的错误
   - 错误码的数值必须一致，0 代表没有错误，其它值表示出错了
   - 不能同时设置返回值和错误码
3. 使用错误码，同样需要遵循规则
   - 必须**首先检查错误码**，然后才能**使用返回值**
4. 需要依赖编码人员的自觉发现，**编译器**本身不会帮忙检查

```java
public static Coded<Digest> of(String algorithm) {
    return switch (algorithm) {
        // INCORRECT: set both error code and value.
        case "SHA-256" -> new Coded(sha256, -1);
        case "SHA-512" -> new Coded(sha512, 0);
        default -> new Coded(sha256, -1);
    };
}
```

```java
Coded<Digest> coded = Digest.of("SHA-256");
// INCORRECT: use returned value before checking error code.
coded.returned().digest("Hello, world!".getBytes());
```

> 需要自觉遵循的规则越多，犯错的概率越大

## 改进方案 - 共用错误码

> 同时考虑**生成错误码**和**使用错误码**两端的需求

```java
public sealed interface Returned<T> {

  record ReturnValue<T>(T returnValue) implements Returned<T> {}

  record ErrorCode<T>(Integer errorCode) implements Returned<T> {}
}
```

1. **封闭类**的**许可子类**是可以**穷举**的
2. 把 Returned 的**许可子类**（ReturnValue 和 ErrorCode）定义成**档案类**，分别表示**返回值**和**错误代码**

> 要么是**返回值**（ReturnValue），要么是**错误码**（ErrorCode）

```java
public static Returned<Digest> of(String algorithm) {
  return switch (algorithm) {
    case "SHA-256" -> new Returned.ReturnValue<>(new SHA256());
    case "SHA-512" -> new Returned.ReturnValue<>(new SHA512());
    case null, default -> new Returned.ErrorCode<>(-1);
  };
}
```

> 使用错误码 - **switch 匹配** - 必须使用 ReturnValue 或者 ErrorCode - **穷举**

```java
public static void main(String[] args) {
  Returned<Digest> returned = Digest.of("SHA-256");
  switch (returned) {
    case Returned.ReturnValue value -> {}
    case Returned.ErrorCode code -> {}
  }
}
```

> 依然存在的缺陷 - 本身没有携带**调试信息**

# 小结

> 错误码 - **封闭类** + **档案类**

1. 不能携带**调试信息**
2. 提高了错误处理的**性能**
3. 增加了**错误排查**的困难
4. 降低了代码的**可维护性**







