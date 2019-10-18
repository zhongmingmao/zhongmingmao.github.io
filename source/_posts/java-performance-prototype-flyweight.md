---
title: Java性能 -- 原型模式 + 享元模式
mathjax: false
date: 2019-09-19 12:16:21
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
---

## 原型模式
1. 原型模式：通过给出一个原型对象来指明所创建的对象的类型，然后使用自身实现的**克隆接口**来复制这个原型对象
2. 使用这种方式创新的对象的话，就无需再通过new实例化来创建对象了
    - Object类的clone方法是一个**Native**方法，可以直接操作**内存中的二进制流**，所以相对new实例化来说，**性能更佳**

<!-- more -->

### 实现原型模式
```java
class Prototype implements Cloneable {
    @Override
    public Prototype clone() {
        Prototype prototype = null;
        try {
            prototype = (Prototype) super.clone();
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return prototype;
    }
}

class ConcretePrototype extends Prototype {
    public void show() {
        System.out.println("原型模式实现类");
    }
}

public class Client {
    public static void main(String[] args) {
        ConcretePrototype cp = new ConcretePrototype();
        for (int i = 0; i < 10; i++) {
            ConcretePrototype prototype = (ConcretePrototype) cp.clone();
            prototype.show();
        }
    }
}
```
1. **实现**`Cloneable`接口
    - Cloneable接口与Serializable接口的作用类似，告诉JVM可以安全地在实现了Cloneable接口的类上使用clone方法
    - 在JVM中，只有实现了Cloneable接口的类才可以被拷贝，否则会抛出`CloneNotSupportedException`
2. **重写**Object类的`clone`方法
    - Object类中有一个clone方法，作用是返回对象的一个**拷贝**
    - 在重写的clone方法中调用**`super.clone()`**，因为默认情况下，_**类不具备复制对象的能力**_
3. 通过clone方法复制的对象是**真正的对象复制**，clone方法复制的对象是一个**完全独立**的对象
    - Object类的clone方法是一个**Native**方法，直接操作**内存的二进制流**，特别是复制大对象时，**性能**的差别特别明显

```java
@Data
class Student implements Cloneable {
    private String name;

    @Override
    public Student clone() {
        Student student = null;
        try {
            student = (Student) super.clone();
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return student;
    }
}

public class Test {
    public static void main(String args[]) {
        Student stu1 = new Student();
        stu1.setName("test1");

        Student stu2 = stu1.clone();
        stu2.setName("test2");

        System.out.println(stu1.getName() + " : " + stu2.getName()); // test1 : test2
    }
}
```

### 深拷贝 / 浅拷贝
1. 在调用`super.clone()`方法后，首先会检查当前对象所属的类是否支持clone，即看该类是否实现了`Cloneable`接口
2. 如果支持，则创建当前对象所属类的一个新对象，并对该对象进行初始化
    - 使得新对象的**成员变量**的值与当前对象的成员变量的值一模一样
    - 但对于其它对象的引用以及List等类型的成员属性，则只能复制这些对象的**引用**
    - 所以调用`super.clone()`的克隆对象方式，是一种**浅拷贝**
3. **深拷贝**其实就是**基于浅拷贝来递归**实现具体的每个对象

#### 浅拷贝
```java
// 浅拷贝
@Data
class Student implements Cloneable {
    private String name;
    private Teacher teacher;

    @Override
    public Student clone() {
        Student student = null;
        try {
            student = (Student) super.clone();
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return student;
    }
}

@Data
class Teacher implements Cloneable {
    private String name;

    @Override
    public Teacher clone() {
        Teacher teacher = null;
        try {
            teacher = (Teacher) super.clone();
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return teacher;
    }

}

public class Test {

    public static void main(String args[]) {
        Teacher teacher = new Teacher();
        teacher.setName("刘老师");

        Student stu1 = new Student();
        stu1.setName("test1");
        stu1.setTeacher(teacher);
        Student stu2 = stu1.clone();
        stu2.setName("test2");
        stu2.getTeacher().setName("王老师");

        System.out.println(stu1.getName() + " : " + stu1.getTeacher().getName()); // test1 : 王老师
        System.out.println(stu2.getName() + " : " + stu2.getTeacher().getName()); // test2 : 王老师
    }
}
```

#### 深拷贝
```java
@Data
class Student implements Cloneable {
    private String name;
    private Teacher teacher;

    @Override
    public Student clone() {
        // 深拷贝
        Student student = null;
        try {
            student = (Student) super.clone();
            Teacher teacher = this.teacher.clone();
            student.setTeacher(teacher);
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }
        return student;
    }
}
```

### 适用场景
1. 在一些**重复创建对象**的场景下，可以使用原型模式来提供对象的创建性能
2. Spring中的`@Service("prototype")`

## 享元模式
1. 享元模式是运用**共享技术**有效地最大限度地**复用细粒度对象**的一种模式
2. 在享元模式中，以**对象的信息状态**划分，可以分为**内部数据**和**外部数据**
    - **内部数据**是对象可以**共享**出来的信息，这些信息**不会随着系统的运行而改变**
    - **外部数据**则是在不同**运行时**被标记了不同的值
3. 享元模式一般分为三个角色
    - **Flyweight**（抽象享元类）：通常是一个接口或抽象类，向外界提供享元对象的**内部数据**或**外部数据**
    - **ConcreteFlyweight**（具体享元类）：实现**内部数据共享**的类
    - **FlyweightFactory**（享元工厂类）：**创建**和**管理**享元对象的工厂类

### 实现享元模式

#### Flyweight
```java
interface Flyweight {
    /* 对外状态对象 */
    void operation(String name);

    /* 对内对象 */
    String getType();
}
```

#### ConcreteFlyweight
```java
@AllArgsConstructor
class ConcreteFlyweight implements Flyweight {
    // 内部数据，不会随着系统的运行而改变
    private String type;

    @Override
    public void operation(String name) {
        System.out.printf("[类型 (内在状态)] - [%s] - [名字 (外在状态)] - [%s]\n", type, name);
    }

    @Override
    public String getType() {
        return type;
    }
}
```

#### FlyweightFactory
```java
class FlyweightFactory {
    // 享元池，用来存储享元对象
    private static final Map<String, Flyweight> FLYWEIGHT_MAP = new HashMap<>();

    public static Flyweight getFlyweight(String type) {
        if (FLYWEIGHT_MAP.containsKey(type)) {
            // 如果在享元池中存在对象，则直接获取
            return FLYWEIGHT_MAP.get(type);
        } else {
            // 在享元池不存在，则新创建对象，并放入到享元池
            ConcreteFlyweight flyweight = new ConcreteFlyweight(type);
            FLYWEIGHT_MAP.put(type, flyweight);
            return flyweight;
        }
    }
}
```

#### Client
```java
public class Client {
    public static void main(String[] args) {
        Flyweight fw0 = FlyweightFactory.getFlyweight("a");
        Flyweight fw1 = FlyweightFactory.getFlyweight("b");
        Flyweight fw2 = FlyweightFactory.getFlyweight("a");
        Flyweight fw3 = FlyweightFactory.getFlyweight("b");
        fw1.operation("abc");                                           // [类型 (内在状态)] - [b] - [名字 (外在状态)] - [abc]
        System.out.printf("[结果 (对象对比)] - [%s]\n", fw0 == fw2);      // [结果 (对象对比)] - [true]
        System.out.printf("[结果 (内在状态)] - [%s]\n", fw1.getType());   // [结果 (内在状态)] - [b]
    }
}
```

### 适用场景
1. Java中的**String**，在一些**字符串常量**中，会共享**常量池**中字符串对象，从而**减少重复创建相同值对象**，减少空间占用
2. **线程池**和**Java本地缓存**也是享元模式的一种实现

```java
String s1 = "hello";
String s2 = "hello";
System.out.println(s1 == s2); // true
```