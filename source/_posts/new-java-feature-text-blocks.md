---
title: New Java Feature - Text Blocks
mathjax: true
date: 2025-01-07 00:06:25
cover: https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/text-blocks-java-17-new-feature.jpg
categories:
  - Java
  - Feature
tags:
  - Java
  - Java Feature
---

# 概述

1. JDK 15
2. 文字块 - 一个由**多行文字**构成的字符串

<!-- more -->

# 复杂字符串

> 需要处理 - 文本对齐、换行字符、连接符以及双引号的转义字符串 - 不**美观** + 不**简约** + 不**自然**

```java
String stringBlock =
    "<!DOCTYPE html>\n"
        + "<html>\n"
        + "    <body>\n"
        + "        <h1>\"Hello World!\"</h1>\n"
        + "    </body>\n"
        + "</html>\n";
```

# 所见即所得的文字块

1. 文字块是一个由**多行文件**构成的**字符串**
2. 文字块使用新的形式，尝试消除**换行符**、**连接符**、**转义字符**的影响
   - 使得**文字对齐**和**必要的占位符**更加**清晰**，从而简化**多行文字**字符串的表达

![image-20250802162412991](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802162412991.png)

1. **换行符** `\n` 没有出现在文字块这个
2. **连字符** `+` 没有出现在文字块这个
3. **双引号**没有使用转义字符 `\`

> 与 Python 类似

1. 文字块由**零个**或**多个**内容字符组成
2. 从**开始分隔符**开始，到**结束分隔符**结束 - `"""`
   - 开始分隔符由 `"""` 开始，后面跟着**零个**或**多个**空格，以及**行结束符**组成的序列
     - 开始分隔符必须**单独成行**，前面的 `"""` 以及后面的**空格**和**换行符**都属于开始分隔符
     - 因此，一个文字块至少有**两行代码**
     - 即使是一个**空**字符串，**结束分隔符**也不能和**开始分隔符**放在**同一行代码**里
   - 结束分隔符由 `"""` 组成的序列

```
jshell> String s = """""";
|  Error:
|  illegal text block open delimiter sequence, missing line terminator
|  String s = """""";
|                ^

jshell> String s = """
   ...> """;
s ==> ""
|  created variable s : String
```

> **结束分隔符**只有一个由 `"""` 组成的序列，在这之前的字符，包括**换行符**，都属于文字块的**有效内容**

```
jshell> String s = """
   ...> Oneline""";
s ==> "Oneline"
|  created variable s : String

jshell> String s = """
   ...> Twolines
   ...> """;
s ==> "Twolines\n"
|  modified variable s : String
|    update overwrote variable s : String
```

1. 由于文字块不再需要**特殊字符**，几乎可以**直接拷贝粘贴**看到的文字，不再需要特殊处理
2. 在**代码**中看到的文字块的样子，就是其**实际要表达**的样子 - **所见即所得**

# 文字块的编译过程

> 为了**代码整洁**而使用的**缩进空格**并没有出现在打印的结果里 - 文本块的内容并没有计入缩进空格

```xml
Here is the text block:
<!DOCTYPE html>
<html>
    <body>
        <h1>"Hello World!"</h1>
    </body>
</html>
```

> 与传统字符串一样，文字块是**字符串**的一种**常量表达式**
> 不同于传统字符串，在**编译**期间，**文字块**要顺序通过三个不同的**编译步骤**

1. 为了降低不同平台**换行符**的**表达差异**
   - 编译器把文字内容里的换行符统一转换成 **LF** - `\u000A`
2. 为了能够处理 **Java 源代码里**的**缩进空格**
   - 要删除所有文字内容行和**结束分隔符共享**的**前导空格**，以及所有文字内容行的**尾部空格**
3. 最后处理**转义字符**
   - 开发人员编写的**转义序列**不会在第一步和第二步被修改或删除

![image-20250802170136464](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802170136464.png)

1. 使用**传统方式**声明的字符串和使用**文字块**声明的**字符串**，它们的**内容是一样**的，并且指向**同一个对象**
2. 文字块是在**编译期**处理的，并且在编译期被**转换**成**常量字符串**，然后被当作**常规字符串**了
3. 如果文字块代表的内容，和传统字符串代表的内容是一样的
   - 那么这两个**常量字符串变量**指向**同一个内存地址**，代表同一个对象
4. 虽然表达形式不同，但**文字块就是字符串** - 能够使用字符串支持的各种 **API** 和**操作**方法

> 混合使用

![image-20250802170950324](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802170950324.png)

> 文字块可以调用字符串 String 的 **API**

```java
int stringSize =
    """
    <!DOCTYPE html>
    <html>
        <body>
            <h1>"Hello World!"</h1>
        </body>
    </html>
    """
        .length();
```

> 使用**嵌入式**的表达式

![image-20250802171236113](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802171236113.png)

# 巧妙的结束分隔符

> 删除共享的**前导空格** - 通过合理地安排共享的前导空格，可以实现文字的**编排**和**缩进**
> `.` 表示编译期要删除的**前导空格**，`!` 表示编译期要删除的**尾部空格**

## Case 1

> 把结束分隔符**单独**放在一行，和文本内容**左边对齐**
> 此时，共享的前导空格就是**文本内容本身**共享的前导空格，结束分隔符仅仅用来结束文字块

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

## Case 2

> 把结束分隔符**单独**放一行，但放在比文本内容**更靠左**的位置
> 此时，结束分隔符除了用来**结束文字块**之外，还参与**界定共享的前导空格**

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

## Case 3

> 把结束分隔符**单独**放一行，但放在比文件内容**左对齐位置的右侧**
> 此时，结束分隔符的**左侧**，除了共享的前导空格之外，还有多余的空格
> 这些多余的空格，本质上是文字内容行的**尾部空格**，它们会在**编译期**被删除掉

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

# 保留尾部空格

1. 为了能够支持**尾部附带的空格**，文字块引入了另一个**新的转义字符** - `\s` 表示**一个空格**
2. **空格转义符**不会在文字块的**编译期**被删除，因此**空格转义符之前的空格**也能被**保留** - 每行使用一个 `\s` 即可

> 前两行保留尾部空格

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

# 长段落

1. **编码规范**一般都限定**每一行**的**字节数** - 80/120 - 一个文本的长段落通常要超出这个限制
2. 文字块引入了新的转义字符 - **行终止符** - **换行转义符**
   - 如果**换行转义符**出现在一个**行的结束位置**，那么这一行的**换行**会被**取缔**

![image-20250802173517715](https://java-feature-1253868755.cos.ap-guangzhou.myqcloud.com/image-20250802173517715.png)
