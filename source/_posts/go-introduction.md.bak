---
title: Go -- 语言简介
mathjax: false
date: 2019-06-03 09:35:08
categories:
    - Go
tags:
    - Go
---

## 诞生背景
1. 多核硬件架构
2. 超大规模分布式计算集群
3. Web模式导致的前所未有的开发规模和更新速度

<!-- more -->

## 创始人
1. Rob Pike：Unix早期开发者、UTF-8创始人
2. Ken Thompson：Unix创始人、C语言创始人、1983年获图灵奖
3. Robert Griesemer：Google V8 Js Engine、Hot Spot开发者

## 特点
1. 简单：C 37关键字、C++ 84关键字、Go 25个关键字
2. 高效：垃圾回收、支持指针
3. 生产力：复合（不支持继承）
4. 云计算语言：Docker、Kubernetes
5. 区块链语言：Ethereum、Hyperledger

## Hello Go
从Go 1.8开始，GOPATH默认为$HOME/go
```golang
// /src/ch1/hello/hello_world.go
package main // 包

import ( // 代码依赖
    "fmt"
    "os"
)

// 程序入口
//  1. 必须是main包：package main
//  2. 必须是main方法：func main()
//  3. 文件名不一定是main.go
// main函数不支持传入参数，通过os.Args获取命令行参数
func main() {
    fmt.Println(os.Args)
    if len(os.Args) > 1 {
    	fmt.Println("Hello World", os.Args[1])
    }
    // Go中的main函数不支持任何返回值，通过os.Exit来返回状态
    os.Exit(0)
}
```
```shell
$ go run hello_world.go zhongmingmao
[/var/folders/gm/y_bbs_5s62zgml6rlmtb07rc0000gn/T/go-build812653812/b001/exe/hello_world zhongmingmao]
Hello World zhongmingmao

$  go build hello_world.go
hello_world    hello_world.go
```
