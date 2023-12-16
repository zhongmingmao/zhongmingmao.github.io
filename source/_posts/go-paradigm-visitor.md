---
title: Go Paradigm - Visitor
mathjax: false
date: 2022-02-02 00:06:25
cover: https://go-1253868755.cos.ap-guangzhou.myqcloud.com/paradigm/go-visitor.webp
categories:
  - Go
tags:
  - Go
  - Cloud
  - Native
---

# 概述

1. Visitor 模式是将`算法`和`结构`分离的一种方法
2. 在`不修改结构`的情况下，向现有对象结构`添加新操作`，遵循 `OCP`
3. 不同 Visitor 用来访问同一个数据结构的不同部分

<!-- more -->

# 示例 1

> 类似于 Java `java.util.function.Consumer`

```go
type Visitor func(shape Shape)

type Shape interface {
	accept(Visitor)
}

type Circle struct {
	Radius int
}

func (c *Circle) accept(v Visitor) {
	v(c)
}

type Rectangle struct {
	Width, Height int
}

func (r *Rectangle) accept(v Visitor) {
	v(r)
}

func JsonVisitor(shape Shape) {
	bytes, err := json.Marshal(shape)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(bytes))
}

func XmlVisitor(shape Shape) {
	bytes, err := xml.Marshal(shape)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(bytes))
}

func main() {
	c := Circle{10}
	r := Rectangle{10, 20}

	for _, shape := range []Shape{&c, &r} {
		shape.accept(JsonVisitor)
		shape.accept(XmlVisitor)
	}
}

// output:
//	{"Radius":10}
//	<Circle><Radius>10</Radius></Circle>
//	{"Width":10,"Height":20}
//	<Rectangle><Width>10</Width><Height>20</Height></Rectangle>
```

# 示例 2

```go
type Info struct {
	Name      string
	Namespace string
}

type VisitorFunc func(*Info, error) error

type Visitor interface {
	Visit(VisitorFunc) error
}

func (info *Info) Visit(f VisitorFunc) error {
	return f(info, nil)
}

type NameVisitor struct {
	visitor Visitor
}

func (v *NameVisitor) Visit(f VisitorFunc) error {
	return v.visitor.Visit(func(info *Info, err error) error {
		err = f(info, err)
		if err != nil {
			return err
		}
		fmt.Printf("Name: %s\n", info.Name)
		return nil
	})
}

type NamespaceVisitor struct {
	visitor Visitor
}

func (v *NamespaceVisitor) Visit(f VisitorFunc) error {
	return v.visitor.Visit(func(info *Info, err error) error {
		err = f(info, err)
		if err != nil {
			return err
		}
		fmt.Printf("Namespace: %s\n", info.Namespace)
		return nil
	})
}

func main() {
	info := Info{
		Name:      "app",
		Namespace: "default",
	}
	var v Visitor = &info
	v = &NameVisitor{v}
	v = &NamespaceVisitor{v}

	_ = v.Visit(func(info *Info, err error) error {
		return nil
	})
}

// output:
//	Namespace: default
//	Name: app
```

