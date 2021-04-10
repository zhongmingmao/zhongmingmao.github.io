---
title: Java性能 -- 正则表达式
mathjax: false
date: 2019-06-23 22:02:47
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
---

## 元字符
<img src="	https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-meta-char.jpg" width=1000/>

1. 正则表达式使用一些**特定的元字符**来检索、匹配和替换符合规则的字符串
2. 元字符：**普通字符**、**标准字符**、**限定字符**（量词）、**定位字符**（边界字符）

<!-- more -->

## 正则表达式引擎
1. 正则表达式是一个用**正则符号**写出来的公式
    - 程序对正则表达式进行**语法分析**，建立**语法分析树**
    - 再根据**语法分析树**结合**正则表达式引擎**生成执行程序（**状态机**），用于字符匹配
        - 正则表达式引擎是一套核心算法，用于**建立状态机**
    - 小结
        - 正则表达式 => 语法分析树
        - 语法分析树 + 正则表达引擎 => 状态机 => 用于字符匹配
2. 目前实现正则表达式引擎的方式有两种
    - **DFA自动机**（Deterministic Finite Automaton，确定有限状态自动机）
    - **NFA自动机**（Nondeterministic Finite Automaton，非确定有限状态自动机）
3. DFA自动机的**构造代价**远大于NFA自动机，但DFA自动机的**执行效率**高于NFA自动机
    - 假设一个字符串的长度为n，如果采用DFA自动机作为正则表达式引擎，则匹配的时间复杂度为`O(n)`
    - 如果采用NFA自动机作为正则表达式引擎，NFA自动机在**匹配过程**中存在大量的**分支**和**回溯**，假设NFA的状态数为s，
        - 则匹配的时间复杂度为**`O(ns)`**
4. NFA自动机的优势是**支持更多高级功能**，但都是基于_**子表达式独立进行匹配**_
    - 因此在**编程语言**里，使用的正则表达式库都是基于**NFA自动机**实现的

## NFA自动机

### 匹配过程
1. NFA自动机会读取正则表达式的每一个字符，拿去和目标字符串匹配
2. 匹配成功则换正则表达式的下一个字符，反之就继续就和目标字符串的下一个字符进行匹配

```
text="aabcab"
regex="bc"
```

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-match-1.jpg" width=600/>
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-match-2.jpg" width=600/>

### 回溯
1. 用NFA自动机实现的比较复杂的正则表达式，在匹配过程中经常会引起回溯问题
2. 大量的回溯会**长时间占用CPU**，从而带来系统性能开销

```
text="abbc"
regex="ab{1,3}c"
```

读取正则表达式第一个匹配符a和字符串第一个字符a进行比较，a对a，匹配
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-backtracking-1.jpg" width=600/>
读取正则表达式第二个匹配符b{1,3}和字符串的第二个字符b进行比较，匹配，但b{1,3}表示1~3个字符，而NFA自动机具有**贪婪**特性，所以不会读取正则表达式的下一个匹配符c
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-backtracking-2.jpg" width=600/>
使用b{1,3}和字符串的第四个字符c进行比较，发现不匹配，此时就会发生**回溯**，已经读取的字符串第四个字符c将被吐出去，指针回到第三个字符b的位置
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-backtracking-3.jpg" width=600/>
发生回溯后，读取正则表达式的下一个匹配符c，和字符串的第四个字符c进行比较，结果匹配
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-regex-nfa-backtracking-4.jpg" width=600/>

### 避免回溯
避免回溯的方法：使用**懒惰**模式和**独占**模式

#### 贪婪模式（Greedy）
1. 在数量匹配中，如果单独使用`+、？、*、{min,max}`等量词，正则表达式会匹配**尽可能多**的内容
2. `text="abbc" , regex="ab{1,3}c"`，发生了一次匹配失败，就会引起一次回溯
3. `text="abbbc" , regex="ab{1,3}c"`，匹配成功

#### 懒惰模式（Reluctant）
1. 在懒惰模式下，正则表达式会**尽可能少**地重复匹配字符，如果匹配成功，会继续匹配剩余的字符串
2. 使用`?`开启懒惰模式，`text="abc" , regex="ab{1,3}?c"`
    - 匹配结果是`"abc"`，在该模式下NFA自动机首先选择**最小**的匹配范围，即匹配1个b字符，**避免了回溯问题**

#### 独占模式（Possessive）
1. 和贪婪模式一样，独占模式一样会**最大限度**地匹配更多内容，但在匹配失败时会**结束匹配**，**不会发生回溯问题**
2. 使用`+`开启懒惰模式，`text="abbc" , regex="ab{1,3}+bc"`
    - 结果是不匹配，结束匹配，不会发生回溯问题

#### 代码
```java
match("ab{1,3}c", "abbc"); // abbc，贪婪模式，产生回溯
match("ab{1,3}c", "abbbc"); // abbbc，贪婪模式，不产生回溯
match("ab{1,3}?", "abbbb"); // ab，懒惰模式，不产生回溯
match("ab{1,3}+bc", "abbc"); // null，独占模式，不产生回溯
```

## 正则表达式的优化
1. 少用贪婪模式，**多用独占模式**（避免回溯）
2. **减少分支选择**，分支选择类型`"(X|Y|Z)"`的正则表达式会**降低性能**，尽量减少使用，如果一定要使用
    - 考虑选择的顺序，将比较常用的选择放在前面，使它们可以较快地被匹配
    - 提取共用模式，`(abcd|abef)` => `ab(cd|ef)`
    - 如果是简单的分支选择类型，可以用三次index代替`(X|Y|Z)`
3. **减少捕获嵌套**
    - 捕获组：把正则表达式中，子表达式匹配的内容保存到以数字编号或显式命名的数组中，一般一个`()`就是一个捕获组
        - 每个捕获组都有一个编号，编号0代表整个匹配到的内容
    - 非捕获组：参与匹配却**不进行分组编号**的捕获组，其表达式一般由`(?:exp)`组成
    - 减少不需要获取的分组，可以提高正则表达式的性能

### 捕获组
```java
String text = "<input high=\"20\" weight=\"70\">test</input>";
String reg = "(<input.*?>)(.*?)(</input>)";
Pattern p = Pattern.compile(reg);
Matcher m = p.matcher(text);
while (m.find()) {
    System.out.println(m.group(0));// 整个匹配到的内容
    System.out.println(m.group(1));//(<input.*?>)
    System.out.println(m.group(2));//(.*?)
    System.out.println(m.group(3));//(</input>)
    // 输出：
    //  <input high="20" weight="70">test</input>
    //  <input high="20" weight="70">
    //  test
    //  </input>
}
```

### 非捕获组
```java
String text = "<input high=\"20\" weight=\"70\">test</input>";
String reg = "(?:<input.*?>)(.*?)(?:</input>)";
Pattern p = Pattern.compile(reg);
Matcher m = p.matcher(text);
while (m.find()) {
    System.out.println(m.group(0));// 整个匹配到的内容
    System.out.println(m.group(1));//(.*?)
    // 输出
    //  <input high="20" weight="70">test</input>
    //  test
}
```

## 小结
在做好性能测试的前提下，可以使用正则表达式，否则**能不用就不用**，避免造成更多的性能问题

## 参考资料
[Java性能调优实战](https://time.geekbang.org/column/intro/100028001)
