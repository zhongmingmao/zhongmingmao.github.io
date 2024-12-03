---
title: Java Feature - Text Blocks
mathjax: true
date: 2024-10-09 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/java-feature-text-blocks.jpeg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. **Text Blocks** 在 **JDK 15** 正式发布
2. Text Blocks 是一个由**多行文字**构成的**字符串**

<!-- more -->

# 丑陋

![image-20241203164728422](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203164728422.png)

# 所见即所得

1. Text Blocks 是一个由**多行文本**构成的**字符串**

2. Text Blocks 使用**新的形式**来表达**字符串**

   - Text Blocks 尝试消除**换行符**、**连接符**、**转义字符**的影响
   - 使**文字对齐**和**必要的占位符**更加**清晰**，简化**多行字符串的表达**

   ![image-20241203165944345](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203165944345.png)

1. 消失的特殊字符 - 换行符（**\n**）、连接字符（**+**）、双引号没有使用转义字符（\）
2. Text Blocks 由零个或多个**内容字符**组成，从**开始分隔符**开始，到**结束分隔符**结束
   - 开始分隔符 - `"""`，后跟零个或者多个**空格**，以及行结束符组成的序列 - 必须**单独成行**
   - 结束分隔符 - 只有 `"""` - 之前的字符，包括换行符，都属于 Text Blocks 的有效内容
3. Text Blocks **至少两行代码**，即便只是一个**空字符串**，结束分隔符也不能和开始分隔符在同一行
4. Text Blocks 不再需要特殊字符 - **所见即所得**

```
$ jshell> String s = """
   ...> """;
s ==> ""
|  created variable s : String

jshell> String s = """""";
|  Error:
|  illegal text block open delimiter sequence, missing line terminator
|  String s = """""";
|                ^
```

# 编译过程

> Text Blocks 是**字符串**的一种**常量表达式**，在**编译**期，Text Blocks 要按**顺序**通过三个不同的**编译**步骤

| Step           | Desc                                                         |
| -------------- | ------------------------------------------------------------ |
| **换行符**处理 | 为了降低**不同平台**间**换行符**的表达差异，**编译器**把文本内容里的换行符**统一转换**成 **LF** - `\u000A` |
| **空格**处理   | 删除所有**文字内容行**和**结束分隔符**共享的**前导空格**，以及所有**文字内容行**的**尾部空格** |
| **转义**处理   | 避免**开发人员**编写的**转义序列**在前面的步骤被**修改**或**删除** |

> **Text Blocks** 是在**编译期**处理的，在编译期被转换成**常量字符串**，然后被当作常规的字符串

![image-20241203180004388](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203180004388.png)

> Text Blocks 本身是字符串，能够使用字符串支持的各种 API

![image-20241203180739105](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203180739105.png)

> 删除**共享**的**前导空格**（实现缩进） + 删除**尾部空格** - `.` 为前导空格，而 `!` 为尾部空格，都会被**删除**

```java
// There are 8 leading white spaces in common
String textBlock = """
........<!DOCTYPE html>
........<html>
........    <body>
........        <h1>"Hello World!"</h1>!!!!
........    </body>
........</html>
........""";
```

```java
// There are 4 leading white spaces in common
String textBlock = """
....    <!DOCTYPE html>
....    <html>
....        <body>
....            <h1>"Hello World!"</h1>!!!!
....        </body>
....    </html>
....""";
```

```java
// There are 8 leading white spaces in common
String textBlock = """
........<!DOCTYPE html>
........<html>
........    <body>
........        <h1>"Hello World!"</h1>!!!!
........    </body>
........</html>
........!!!!""";
```

> 尾部空格 - `\s` - **空格转义符** - 新引入 - 表示一个**空格** - 不会在 Text Blocks 的编译期被删除 - 保留之前的空格

```java
// There are 8 leading white spaces in common
String textBlock = """
........<!DOCTYPE html>    \s!!!!
........<html>             \s
........    <body>!!!!!!!!!!
........        <h1>"Hello World!"</h1>
........    </body>
........</html>
........""";
```

> 长段落

1. **编码规范**一般都限定**每一行**的**字节数**，通常为 **80** / **120** 字节，而长段落一般都会超过该限制
2. **Text Blocks** 中的**换行符**需要**保留**，而**编码规范**需要**遵守**
3. **Text Blocks** 引入新的转义字符 - **换行转义符**
   - 如果**换行转义符**出现在一个**行**的**结束位置**，该行的**换行符**会被**取缔**
4. **空格处理**先于**转义字符处理**
   - **转义字符之前的空格**不算 Text Blocks 的**尾部空格**，会被**保留**

![image-20241203182541953](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241203182541953.png)
