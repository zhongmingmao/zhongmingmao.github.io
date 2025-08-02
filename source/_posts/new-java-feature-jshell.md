---
title: New Java Feature - JShell
mathjax: true
date: 2025-01-06 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-jshell.jpeg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. JDK 9
2. JShell 是 Java 的**交互式**编程环境
3. JShell API 和工具提供了一种在 JShell 状态下评估 Java 编程语言的**声明**、**语句**和**表达式**的方式
4. JShell 的状态包括不断发展的**代码**和**执行状态**
5. 为了便于快速调查和编码
   - **语句**和**表达式**不需要出现在**方法**中
   - **变量**和**方法**也不需要出现在**类**中

<!-- more -->

# 启动 JShell

```
$ jshell
|  Welcome to JShell -- Version 21.0.7
|  For an introduction type: /help intro

jshell>
```

> 详尽模式

```
$ jshell -v
|  Welcome to JShell -- Version 21.0.7
|  For an introduction type: /help intro

jshell>
```

# 退出 JShell

```
$ jshell -v
|  Welcome to JShell -- Version 21.0.7
|  For an introduction type: /help intro

jshell> /exit
|  Goodbye
```

# JShell 命令

```
$ jshell -v
|  Welcome to JShell -- Version 21.0.7
|  For an introduction type: /help intro

jshell> /help
|  Type a Java language expression, statement, or declaration.
|  Or type one of the following commands:
|  /list [<name or id>|-all|-start]
|  	list the source you have typed
|  /edit <name or id>
|  	edit a source entry
|  /drop <name or id>
|  	delete a source entry
|  /save [-all|-history|-start] <file>
|  	Save snippet source to a file
|  /open <file>
|  	open a file as source input
|  /vars [<name or id>|-all|-start]
|  	list the declared variables and their values
|  /methods [<name or id>|-all|-start]
|  	list the declared methods and their signatures
|  /types [<name or id>|-all|-start]
|  	list the type declarations
|  /imports
|  	list the imported items
|  /exit [<integer-expression-snippet>]
|  	exit the jshell tool
|  /env [-class-path <path>] [-module-path <path>] [-add-modules <modules>] ...
|  	view or change the evaluation context
|  /reset [-class-path <path>] [-module-path <path>] [-add-modules <modules>]...
|  	reset the jshell tool
|  /reload [-restore] [-quiet] [-class-path <path>] [-module-path <path>]...
|  	reset and replay relevant history -- current or previous (-restore)
|  /history [-all]
|  	history of what you have typed
|  /help [<command>|<subject>]
|  	get information about using the jshell tool
|  /set editor|start|feedback|mode|prompt|truncation|format ...
|  	set configuration information
|  /? [<command>|<subject>]
|  	get information about using the jshell tool
|  /!
|  	rerun last snippet -- see /help rerun
|  /<id>
|  	rerun snippets by ID or ID range -- see /help rerun
|  /-<n>
|  	rerun n-th previous snippet -- see /help rerun
|
|  For more information type '/help' followed by the name of a
|  command or a subject.
|  For example '/help /list' or '/help intro'.
|
|  Subjects:
|
|  intro
|  	an introduction to the jshell tool
|  keys
|  	a description of readline-like input editing
|  id
|  	a description of snippet IDs and how use them
|  shortcuts
|  	a description of keystrokes for snippet and command completion,
|  	information access, and automatic code generation
|  context
|  	a description of the evaluation context options for /env /reload and /reset
|  rerun
|  	a description of ways to re-evaluate previously entered snippets

jshell>
```

# 立即执行的语句

> 使用 JShell 来评估 Java 语言的语句

```java
jshell> System.out.println("Hello, Rust");
Hello, Rust

jshell>
```

# 可覆盖的声明

> 支持**变量**的**重复声明**和**类型变更** - JShell 是一个**有状态**的工具

```java
jshell> String greeting;
greeting ==> null
|  created variable greeting : String

jshell> String greeting = "Rust";
greeting ==> "Rust"
|  modified variable greeting : String
|    update overwrote variable greeting : String

jshell> System.out.println(greeting);
Rust
  
jshell> Integer greeting;
greeting ==> null
|  replaced variable greeting : Integer
|    update overwrote variable greeting : String
```

> 在**可编译**的代码里，在一个变量的作用域内，这个变量的类型是不允许转变的，也不允许重复声明的

# 独立的表达式

> 在 Java 程序中，**语句**是最小的可执行单位，**表达式**并不能**单独存在** - JShell 支持表达式的输入

```
jshell> 1 << 10
$7 ==> 1024
|  created scratch variable $7 : int

jshell> "Rust" == "Rust"
$8 ==> true
|  created scratch variable $8 : boolean

jshell> "Rust" == new String("Rust")
$9 ==> false
|  created scratch variable $9 : boolean
```

