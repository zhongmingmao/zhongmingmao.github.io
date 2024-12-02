---
title: Java Feature - JShell
mathjax: true
date: 2024-10-08 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-9-jshell.jpg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. JShell 在 **JDK 9** 中正式发布
2. JShell API 和工具提供了一种在 **JShell 状态**下**交互式评估** Java 编程语言的**声明**、**语句**和**表达式**的方法
3. JShell 的状态包括**不断发展**的**代码**和**执行状态**
4. 为了**快速**调查和编码，**语句**和**表达式**不需要出现在**方法**中，**变量**和**方法**也不需要出现在**类**中
5. **JShell** 在验证**简单问题**时，比 **IDE** 更**高效**

<!-- more -->

> 启动 JShell

```
$ jshell
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell>
```

> 详细模式 - 提供更多的反馈结果，观察更多细节

```
$ jshell -v
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell>
```

> 退出 JShell

```
$ jshell -v
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell> /exit
|  Goodbye
```

> JShell 命令

![image-20241202184743423](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241202184743423.png)

# 语句

> 立即执行

```
$ jshell -v
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell> System.out.println("Helllo, World");
Helllo, World

jshell>
```

# 声明

> 可覆盖

1. JShell 支持**变量**的**重复声明**
2. JShell 是一个**有状态**的**工具**，可以很好地处理多个**有关联**的**语句**

```
$ jshell -v
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell> String language = "Rust";
language ==> "Rust"
|  created variable language : String

jshell> String ok = switch(language) {
   ...>     case "Rust" -> "Yes";
   ...>     default -> "No";
   ...> };
ok ==> "Yes"
|  created variable ok : String

jshell> System.out.println(ok);
Yes

jshell>

jshell> language = "Go"
language ==> "Go"
|  assigned to language : String

jshell> ok = switch(language) {
   ...>     case "Rust" -> "Yes";
   ...>     default -> "No";
   ...> };
ok ==> "No"
|  assigned to ok : String

jshell> System.out.println(ok);
No
```

> 为了方便评估，可以使用 JShell 运行变量的**重复声明**和**类型变更**

```
$ jshell -v
|  Welcome to JShell -- Version 17.0.9
|  For an introduction type: /help intro

jshell> String language = "Rust";
language ==> "Rust"
|  created variable language : String

jshell> language = "Go";
language ==> "Go"
|  assigned to language : String

jshell> int language = 1;
language ==> 1
|  replaced variable language : int
|    update overwrote variable language : String

jshell> language = 2;
language ==> 2
|  assigned to language : int
```

> 在**可编译**的代码中，在一个**变量**的**作用域**内，不允许**重复声明**，也不允许**改变类型**

# 表达式

1. 在 Java 程序中，**语句**是**最小**的**可执行单位**，而**表达式**并**不能单独存在**
2. **JShell** 支持**表达式**的输入

```
$ jshell> 1+1
$1 ==> 2
|  created scratch variable $1 : int
```

> 可以**直接评估表达式**，不再需要**依附**于一个**语句**

```
$ jshell> "Hello, world" == "Hello, world"
$2 ==> true
|  created scratch variable $2 : boolean

jshell> "Hello, world" == new String("Hello, world")
$3 ==> false
|  created scratch variable $3 : boolean
```

