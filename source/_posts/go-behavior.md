---
title: Go -- 行为
mathjax: false
date: 2019-06-16 08:38:45
categories:
    - Go
tags:
    - Go
---

## 面向对象
[Is Go an object-oriented language?](https://golang.google.cn/doc/faq#Is_Go_an_object-oriented_language)

> **Yes and no.** Although Go has types and methods and allows an object-oriented style of programming, **there is no type hierarchy. The concept of “interface” in Go provides a different approach that we believe is easy to use and in some ways more general.** There are also ways to embed types in other types to provide something analogous—but not identical—to subclassing.Moreover, methods in Go are more general than in C++ or Java: they can be defined for any sort of data, even built-in types such as plain, “unboxed” integers. They are not restricted to structs (classes).

> Also, the lack of a type hierarchy makes “objects” in Go feel much more lightweight than in languages such as C++ or Java.

<!-- more -->

## 结构体定义
```go
type Employee struct {
    Id   string
    Name string
    Age  int
}
```

## 实例初始化
```go
func TestStructInit(t *testing.T) {
    e1 := Employee{0, "N1", 1}
    t.Logf("%T", e1) // field.Employee

    e2 := Employee{Name: "N2", Age: 2}
    t.Log(e2) // {0 N2 2}

    e3 := new(Employee) // 返回指向实例的指针，相当于e3 := &Employee{}
    e3.Id = 1           // 与其他语言的差异：通过实例的指针访问成员不需要使用->
    e3.Name = "N3"
    e3.Age = 3
    t.Logf("%T", &e2) // *field.Employee
    t.Logf("%T", e3)  // *field.Employee
}
```

## 行为定义
```go
// 第一种方式：方法被调用时，实例的成员会进行值复制
func (e Employee) s1() string {
    fmt.Printf("s1 address is %X\n", unsafe.Pointer(&e.Name)) // 地址会发生变化
    return fmt.Sprintf("Id:%d - Name:%s - Age:%d", e.Id, e.Name, e.Age)
}

// 第二种方式：可以避免内存拷贝
func (e *Employee) s2() string {
    fmt.Printf("s2 address is %X\n", unsafe.Pointer(&e.Name)) // 地址不变
    return fmt.Sprintf("Id:%d = Name:%s = Age:%d", e.Id, e.Name, e.Age)
}

func TestStructOperations(t *testing.T) {
    e1 := Employee{1, "N1", 1}
    fmt.Printf("Address is %X\n", unsafe.Pointer(&e1.Name))
    t.Log(e1.s1()) // Id:1 - Name:N1 - Age:1
    t.Log(e1.s2()) // Id:1 = Name:N1 = Age:1

    fmt.Println()

    e2 := &Employee{2, "N2", 2}
    fmt.Printf("Address is %X\n", unsafe.Pointer(&e2.Name))
    t.Log(e2.s1()) // Id:2 - Name:N2 - Age:2
    t.Log(e2.s2()) // Id:2 = Name:N2 = Age:2

    // fmt输出
    // Address is C000090188
    // s1 address is C0000901A8
    // s2 address is C000090188
    //
    // Address is C000090248
    // s1 address is C000090268
    // s2 address is C000090248
}
```
