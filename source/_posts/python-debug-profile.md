---
title: Python - Debug + Profile
mathjax: true
date: 2024-09-08 00:06:25
cover: https://python-1253868755.cos.ap-guangzhou.myqcloud.com/python-debugging.webp
categories:
  - Python
tags:
  - Python
---

# pdb

> pdb 是 Python 自带的调试库，为 Python 程序提供**交互式**的**源代码调试**功能，是**命令行版本**的 IDE 断点调试器

| Instruction                                         | Desc                                            |
| --------------------------------------------------- | ----------------------------------------------- |
| p                                                   | print                                           |
| n                                                   | next - step over                                |
| l                                                   | list - show source code context                 |
| s                                                   | step into                                       |
| r                                                   | stop out - 继续执行，直到**当前函数完成**后返回 |
| `b [ ([filename:]lineno |function) [, condition] ]` | 设置断点 - b 11                                 |
| c                                                   | continue - 一直执行程序，直到遇到下一个断点     |

<!-- more -->

![image-20241102110748488](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102110748488.png)

> step into - `--Call--` + `--Return--`

![image-20241102111203745](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102111203745.png)

# cProfile

> 瓶颈在于 fib 函数

![image-20241102112028101](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102112028101.png)

| Item                      | Desc                                                         |
| ------------------------- | ------------------------------------------------------------ |
| ncalls                    | 相应代码/函数被调用的次数                                    |
| tottime                   | 相应代码/函数总共执行所需的时间（**不包括**它调用其它代码/函数的执行时间） |
| tottime percall           | tottime / ncalls                                             |
| cumtime                   | 相应代码/函数总共执行所需的时间（**包括**它调用其它代码/函数的执行时间） |
| cumtime percall           | cumtime / ncalls                                             |
| filename:lineno(function) | 相应代码/函数位置                                            |

> 通过字典保存计算过的 fib 结果

![image-20241102112930496](https://python-1253868755.cos.ap-guangzhou.myqcloud.com/image-20241102112930496.png)
