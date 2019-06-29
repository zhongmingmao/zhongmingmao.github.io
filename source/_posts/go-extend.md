---
title: Go -- 扩展
mathjax: false
date: 2019-06-19 16:06:27
categories:
    - Go
tags:
    - Go
---

## Java的扩展
面向对象的扩展可以通过**继承**和**复合**来实现，但Go并不支持继承
```java
class Pet {
    public void speak() {
        System.out.println("Pet Speak");
    }
}

class Dog extends Pet {
    @Override
    public void speak() {
        System.out.println("Dog Speak");
    }
}
```

<!-- more -->

```java
public class InheritTest {
    @Test
    public void subClassAccessTest() {
        Pet dog = new Dog();
        dog.speak(); // Dog Speak
    }

    @Test
    // LSP : Liskov substitution principle
    // 里氏替换原则：派生类（子类）对象可以在程式中代替其基类（超类）对象
    public void lspTest() {
        makePetSpeak(new Dog()); // Dog Speak
    }

    private void makePetSpeak(Pet pet) {
        pet.speak();
    }
}
```

## Go的扩展

### 复合
```go
type Pet struct {
}

func (p *Pet) speak() {
    fmt.Println("Pet Speak")
}

type Dog struct {
    // 复合：通过Pet扩展Dog的功能
    p *Pet
}

func (d *Dog) speak() {
    d.p.speak()
    fmt.Println("Dog Speak")
}

func TestComplex(t *testing.T) {
    t.Logf("%T", Dog{})    // extension.Dog
    t.Logf("%T", &Dog{})   // *extension.Dog
    t.Logf("%T", new(Dog)) // *extension.Dog
    dog := new(Dog)
    dog.speak()
    // 输出
    //	Pet Speak
    //	Dog Speak
}
```

### 匿名嵌套类型
```go
type Pet struct {
}

func (p *Pet) speak() {
    fmt.Println("Pet Speak")
}

func (p *Pet) eat() {
    fmt.Println("Pet Eat")
}

type Dog struct {
    // 匿名嵌套类型，不能当成继承使用
    Pet
}

func (d *Dog) speak() {
    fmt.Println("Dog Speak")
}

func TestAnonymousNestedType(t *testing.T) {
    dog := new(Dog)
    dog.eat()   // Pet Eat
    dog.speak() // Dog Speak
}

func TestNotInherit(t *testing.T) {
    // 不符合LSP
    // var d1 Pet = new(Dog)         // cannot use new(Dog) (type *Dog) as type Pet in assignment
    // var d2 Pet = Dog{}            // cannot use Dog literal (type Dog) as type Pet in assignment
    // var d3 Pet = (*Pet)(new(Dog)) // cannot convert new(Dog) (type *Dog) to type *Pet
}
```
