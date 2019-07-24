---
title: Spark Streaming -- Scala语法
mathjax: false
date: 2019-07-13 01:16:00
categories:
    - Big Data
    - Spark
    - Spark Streaming
tags:
    - Big Data
    - Spark
    - Spark Streaming
    - Scala
---

## 换行符
1. Scala是面向**行**的语言，语句可以用**分号**或**换行符**结束
2. Scala中，如果一行仅有一个语句，末尾的分号通常是**可选**的

<!-- more -->

## 统一类型
<img src="https://spark-streaming-1253868755.cos.ap-guangzhou.myqcloud.com/spark-streaming-scala-type.png" width=1000/>

1. Scala中没有所谓的基本数据类型，**一切皆对象**，所有的数据类型都是以对象形式存在，**函数也是一种对象**
2. **Any是所有类型的超类型**，定义了一些通用的方法：equals和hashCode等，Any有两个直接子类：**AnyVal**、**AnyRef**
3. AnyVal代表**值类型**，其中**Unit是不带任何意义的类型**，在函数返回时，可以以Unit作为返回类型
4. AnyRef代表**引用类型**，所有非值类型都被定义为引用类型，用户声明的**自定义类型**都属于AnyRef的子类型
    - Java运行环境调用Scala，AnyRef会被当做Object基类
5. **Nothing是所有类型的子类型**，包括值类型和引用类型，**Nothing也是Null的子类型**，也被称为**底部类型**
    - **没有一个值是Nothing类型的**，Nothing类型通常用于程序**非正常结束**的信号
    - 这与Java中返回**null**类似，可以将Nothing理解为不定义值的表达类型，在非正常返回时使用
6. **Null是所有引用类型的子类型**，它有一个单例值由关键字Null所定义
    - Null主要是使得Scala满足**和其他JVM语言的互操作性**
    - 但是Null是非常容易**引发程序崩溃**的类型，Scala代码中采用了各种机制来避免使用Null类型

```scala
val list: List[Any] = List("a string", 732, 'c', true, () => "func")
list.foreach(element => println(element))
```

## 变量 + 常量
1. 在程序运行过程中值可能改变的量称为变量，不会发生变化的量称为常量
2. 声明变量关键字**var**，声明常量关键字**val**

```scala
var myVar: String = "Spark Action"
val myVal: String = "Spark Streaming Action"

// 根据初始值，进行数据类型推断
var myInt = 27
val myStr = "Hello, Scala"
```

## 条件 + 循环
1. Scala不支持**break**和**continue**语句
    - 多数情况下，break和continue不是必要的，可以用**小函数**更好地解决
    - 在循环中使用continue是非常容易理解的，但在Scala的**函数闭包**中是难以理解的
    - 如果巧妙地使用**函数字面量**代替continue和break，可以使代码更加精简
    - 可以用**纯库函数**的形式提供对两者的支持
2. 从Scala 2.8之后，可以通过`scala.util.control.Breaks._`库来使用break操作
3. 对于continue，Scala原生库还是没有提供支持，可以通过`scala.util.control.Breaks._`来实现

```scala
import util.control.Breaks._

object BreakTests extends App {
  var sum = 0
  // 循环之外
  breakable {
    for (i <- 0 to 1000) {
      sum += i
      if (sum >= 1000) break
    }
  }
}
```
```scala
import scala.util.control.Breaks._

object ContinueTests extends App {
  for (i <- 0 to 1000) {
    // 循环之内
    breakable {
      if (i % 2 == 0) break
    }
  }
}
```

## 函数 + 方法
1. 在Scala中，**一切皆对象**，函数在Scala中也是一个对象，借用函数式编程的思想，函数可以作为参数传递给另一个函数
2. 在Java中，方法和函数并没有区别，但在Scala中，**Method被翻译成方法**，**Function被翻译成函数**
    - Scala Method：类中定义的方法，属于类的一部分，与Java的方法类似
    - Scala Function：代表一个对象，可以像值类型一样赋值给一个变量
        - Function是一个**完整的对象**，本质上是继承了Trait的类的对象
        - Function是一个对象，可以作为参数传入到方法中，而Method不行
    - Scala中使用**def语句**定义**方法**，使用**val语句**定义**函数**
    - 可以在方法名称后面紧跟一个**空格加下划线**，**将方法转换为函数**，通常编译器会自动完成该操作
        - 例如将一个方法传入接收函数参数的地方，就会自动转换
    - 函数和方法是可以**相互转换**的

```scala
abstract class FunctionMethodTests {

  // 方法定义
  def m1(x: Int): Int = x + 3

  // 方法声明，没有等号和方法主体，方法会被隐式声明为抽象，包含它的类型也是一个抽象类型
  // 如果方法没有返回值，可以返回Unit，类似于Java的void
  def m2(x: Int): Unit

  // 函数
  val f1 = (x: Int) => x + 3
  val f2 = m1 _ // 方法转函数
}
```

### 函数式编程

#### 可变参数列表
可变参数列表是指在定义方法时，不需要指定函数参数的个数，而在函数被调用时灵活传入，如同传入一个**变长数组**

```scala
def main(args: Array[String]): Unit = {
  printStrings("Java", "Scala", "Python")
}

// 可变参数，只有函数的最后一个参数可以设置为可重复的可变参数列表
def printStrings(args: String*) = {
  var i: Int = 0;
  for (arg <- args) {
    println("Arg value[" + i + "] = " + arg)
    i = i + 1
  }
}
```

#### 默认参数值
Java不支持默认参数值，而Scala支持
```scala
object Test2 {
  def main(args: Array[String]): Unit = {
    println(addInt())
  }

  def addInt(a: Int = 5, b: Int = 7): Int = {
    var sum: Int = 0
    sum = a + b
    return sum
  }
}
```

#### 偏应用函数
偏应用函数指的是**固定方法的某一个参数**，然后重新声明为一个函数，这是Scala提供的**语法糖**

```scala
def main(args: Array[String]): Unit = {
  val date = new Date
  // 偏应用函数，_表示缺失，将新函数的索引值重新赋值给logWithDateBound
  val logWithDateBound = log(date, _: String)
  logWithDateBound("message1")
  logWithDateBound("message2")
  logWithDateBound("message3")
}

def log(date: Date, message: String) = {
  println(date + " --- " + message)
}
```

#### 指定函数参数名
在Java或C++中，调用函数时只能按照函数定义时指定的顺序将参数传入，而Scala和Python支持指定参数名

```scala
def main(args: Array[String]): Unit = {
  printInt(b = 5, a = 7)
}

def printInt(a: Int, b: Int) = {
  println("a=" + a + ", b=" + b)
}
```

#### 高级函数
1. 高阶函数指的是_**操作其他函数的函数**_
2. 在Scala中，可以将函数作为**参数**来传递或者通过运算**返回一个函数的引用**，这种函数就是高阶函数
3. 在Java 8引入了**Lambda**表达式，也支持这种特性

```scala
def main(args: Array[String]): Unit = {
  println(apply(layout, 10)) // [10]
}

// apply()函数使用了另外一个函数f()和值v作为参数，而函数f()又调用了参数v
def apply(f: Int => String, v: Int) = f(v)

def layout[A](x: A) = "[" + x.toString + "]"
```

#### 函数柯里化
1. 函数柯里化是**函数式编程**中的一个概念
2. 函数柯里化
    - 将原来接收**两个参数**的函数，变成新的接收**一个参数**的函数
    - 新的函数返回一个**以第二个参数为参数的函数**
3. Scala支持函数柯里化

```scala
def main(args: Array[String]): Unit = {
  println(add1(1, 2))
  println(add2(1)(2))
}

def add1(x: Int, y: Int) = x + y

// 柯里化本质上是依次调用了两个普通函数（非柯里化函数）的过程
// 拆解成：def add2(x:Int) = (y:Int) => x+y
def add2(x: Int)(y: Int) = x + y
}
```

## 特质、单例和样例类

### 特质
1. **特质**（Traits）用于在类（Class）之间共享程序**接口**（Interface）和**字段**（Field）
    - 是Scala独有的一种特性，类似于**Java 8的接口**
2. **类和对象（Objects）可以扩展特质，但特质不能被实例化，因为特质没有参数**

```scala
trait Iterator[A] {
  def hasNext: Boolean

  def next(): A
}

class IntIterator(to: Int) extends Iterator[Int] {

  private var current = 0

  override def hasNext: Boolean = current < to

  override def next(): Int = {
    if (hasNext) {
      val t = current
      current += 1
      t
    } else 0
  }
}

/* 测试代码 */
val iterator = new IntIterator(10)
println(iterator.next()) // 0
println(iterator.next()) // 1
```

#### 混入
当某个特质被用于**组合类**时，被称为**混入**
```scala
abstract class A {
  val message: String
}

class B extends A {
  override val message: String = "I'm an instance of class B"
}

trait C extends A {
  def loudMessage = message.toUpperCase
}

// 类D有一个父类B和一个混入C
// 一个类只能有一个父类（extends关键字），但可以有多个混入（with关键字）
// 混入和某个父类可能有相同的父类，例如A
class D extends B with C

/* 测试代码 */
val d = new D
println(d.message) // I'm an instance of class B
println(d.loudMessage) // I'M AN INSTANCE OF CLASS B
```

### 单例
Scala在**语言特性**中提供单例的支持，即**object**关键字

```scala
object Logger {
  def info(message: String) = println(s"INFO:$message")
}

/* 测试代码 */
// 不需要new一个Logger对象，直接Logger.info调用，但又区别于静态函数（static）
Logger.info("Scala object")
```

#### 伴生对象
将**类**和**object**放在**同一个文件**中，形成**伴生对象**

```scala
import scala.math._

case class Circle(radius: Double) {

  import Circle._

  // 单例对象Circle具有可用于每个实例的方法calculateArea
  def area: Double = calculateArea(radius)
}

object Circle {
  private def calculateArea(radius: Double): Double = Pi * pow(radius, 2.0)
}

/* 测试代码 */
val circle = new Circle(5.0)
println(circle.area)
```

### 样例类
1. 在Java中，有一种类只有**get/set**方法，在网站开发和数据库绑定的DAO设计模式中比较常见
2. Scala将这种特殊的类**内化在语言特性**中，即样例类，经常与**模式匹配**结合使用

```scala
case class Book(isbn: String)

case class Message(sender: String, recipient: String, body: String)

/* 样例代码 */
// 没有使用关键字new来实例化Book类，case类默认会是使用apply方法来处理对象构造
val book = Book("123")

val message = Message("A@gmail.com", "B@gmail.com", "hello scala")
// 使用copy来复制对象
val m = message.copy(sender = message.sender, recipient = "C@gmail.com")
println(m.sender) // A@gmail.com
println(m.recipient) // C@gmail.com
println(m.body) // hello scala
```
