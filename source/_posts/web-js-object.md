---
title: JavaScript - Object
mathjax: false
date: 2022-10-04 00:06:25
cover: https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/1_BPSx-c--z6r7tY29L19ukQ.png
categories:
  - Web
  - JavaScript
tags:
  - Infrastructure
  - Web
  - JavaScript
---

# OOP

## 实现方式

> 在不同的编程语言中，设计者利用各种不同的`语言特性`来`抽象描述对象`

1. 最为成功的流派：使用`类`来描述`对象`，典型代表为 `Java`、`C++`
2. `JavaScript` 的实现方式：`原型`（更冷门！）

<!-- more -->

## Like Java

1. JavaScript 诞生之初`模仿 Java`，在`原型运行时`引入了 `new`，`this` 等语言特性
2. 在 ES6 之前，产生了很多『框架』：`试图在原型体系的基础上，把 JavaScript 变得更像是基于类的编程`
   - 这些『框架』最终成为了 JavaScript 的`古怪方言`

> 任何语言在`运行时`，`类`的概念都会被`弱化`

## 对象模型

### 基本特征

1. 对象有`唯一标识性`：完全相同的两个对象，也并非同一个对象
2. 对象有`状态`：同一对象可能处于不同的状态之下
3. 对象有`行为`：对象的状态，可能因为它的行为产生变迁

> 对象的`唯一标识`，一般是通过`内存地址`来体现的

```javascript
let a = {name: 'A'}
let b = {name: 'A'}
console.log(a === b) // false
```

> `状态`和`行为`，不同语言会使用不同的术语来抽象描述
>
> 1. `C++`：`成员变量`和`成员函数`
> 2. `Java`：`属性`和`方法`
> 3. `JavaScript`：统一抽象为`属性`（包括函数）

```javascript
let x = {
    name: "zhongmingmao",
    run() { // run 函数也是一个普通属性
        console.log(this.name + " is running...")
    }
}

console.log(x.name) // zhongmingmao
x.run() // zhongmingmao is running...
```

### 独有特征

> JavaScript 对象具有`高度的动态性`：可以在`运行时`修改对象的`状态`和`行为`

> 在`运行时`，向对象`添加属性`

```javascript
let x = {name: "zhongmingmao"};
x.city = "GuangZhou";

console.log(x.name, x.city) // zhongmingmao GuangZhou
```

### 属性分类

> JavaScript 提供：`数据属性`、`访问器属性`（getter/setter）

> JavaScript 用一组特征（`attribute`）来描述属性（`property`）

#### 数据属性

> 接近其他语言的属性概念

| Attribute      | Desc                             |
| -------------- | -------------------------------- |
| `value`        | 属性的`值` - 常用                |
| `writable`     | 属性能否被`赋值`                 |
| `enumerable`   | `fo...in` 能否`枚举`该属性       |
| `configurable` | 属性能否被`删除`或者`改变`特征值 |

> 通常用于定义属性的代码会产生数据属性，其中 `writable`、`enumerable` 和 `configurable` 默认为 `true`

```javascript
let x = {
    name: "zhongmingmao"
}
x.city = "GuangZhou" // 追加属性

// name 和 city 都是数据属性
console.log(Object.getOwnPropertyDescriptor(x, "name")) // Object { value: "zhongmingmao", writable: true, enumerable: true, configurable: true }
console.log(Object.getOwnPropertyDescriptor(x, "city")) // Object { value: "GuangZhou", writable: true, enumerable: true, configurable: true }

// name
// city
for (let k in x) {
    console.log(k)
}
```

> `Object.defineProperty`：`改变属性的特征`、`定义访问器属性`

```javascript
let x = {
    name: "zhongmingmao"
}
Object.defineProperty(x, "city", {value: "Guang Zhou", writable: false, enumerable: false, configurable: false});

// name 和 city 均为数据属性，但特征值不一样
console.log(Object.getOwnPropertyDescriptor(x, "name")); // Object { value: "zhongmingmao", writable: true, enumerable: true, configurable: true }
console.log(Object.getOwnPropertyDescriptor(x, "city")); // Object { value: "Guang Zhou", writable: false, enumerable: false, configurable: false }

// name
for (let k in x) {
    console.log(k)
}

// x.city = "Zhong Shan"; // TypeError: "city" is read-only
console.log(x.city); // Guang Zhou
```

#### 访问器属性

> 访问器属性使得属性`每次`在`读`和`写`时`执行代码`，可以视为一种函数的`语法糖`

| Attribute      | Desc                                          |
| -------------- | --------------------------------------------- |
| `getter`       | `函数`或者`undefined`，在`读取属性值`时被调用 |
| `setter`       | `函数`或者`undefined`，在`设置属性值`时被调用 |
| `enumerable`   | `fo...in` 能否`枚举`该属性                    |
| `configurable` | 属性能否被`删除`或者`改变`特征值              |

> 创建对象时，使用 `get` 和 `set` 关键字来`创建访问器属性`

```javascript
let x = {
    get name() {
        console.log("getting a name...")
        return this.n;
    },
    set name(name) {
        console.log("setting a name...")
        this.n = name;
    }
};

// getting a name...
console.log(x.name); // undefined

// setting a name...
x.name = "zhongmingmao";

// getting a name...
console.log(x.name) // zhongmingmao
```

## JavaScript is OOP ？

1. JavaScript 对象的运行时：`属性的集合`
   - 属性：以 `String` 或者 `Symbol` 为 Key，以特征值（`Attribute`）为 Value
   - 样例
     - Key
       - `name`
     - Value
       - `{ value: "zhongmingmao", writable: true, enumerable: true, configurable: true }`
2. `对象`是一个`属性的索引结构`（Key-Value）
3. JavaScript 为`正统的 OOP 语言`
   - JavaScript 提供`完全运行时`的`对象系统`（高度`动态`），可以`模仿`常见的`面向对象范式`（基于`类` + 基于`原型`）

# 编程范式

> `『基于类』` 并非`OOP`的唯一形态，`原型系统`本身也是一个非常优秀的`抽象对象`的形式

> 从 ES6 开始，JavaScript 提供了 `class` 关键字来定义`类`（但本质仍然是基于`原型运行时系统`的`模拟`）

## 类 vs 原型

1. 基于`类`的编程：提倡使用一个关注`类与类之间关系`的开发模型
2. 基于`原型`的编程：提倡关注一系列`对象实例的行为`，然后才去关心如何将这些对象`划分`到使用方式相似的`原型对象`

> 基于原型的 OOP 系统通过`『复制』`的方式来`创建新对象`
> 在 JavaScript 中，复制仅仅只是使得`新对象持有一个原型的引用`

## JavaScript prototype

### 概述

1. 所有对象都有`私有`字段 `prototype`，代表对象的原型
2. 读取一个`属性`，如果对象本身没有，则会继续访问`对象的原型`，直到原型为空或者找到为止

### 原型操作

> 从 ES6 之后，JavaScript 提供了一系列`内置函数`，使得可以更为方便地操作和访问原型

| Function                | Desc                                        |
| ----------------------- | ------------------------------------------- |
| `Object.create`         | 根据指定的原型创建新对象，原型可以为 `null` |
| `Object.getPrototypeOf` | 获得一个对象的原型                          |
| `Object.setPrototypeOf` | 设置一个对象的原型                          |

```javascript
let cat = {
    say() {
        console.log("I'm a cat");
    },
    jump() {
        console.log("jump");
    }
};

let tiger = Object.create(cat, {
    say: {
        value: function () {
            console.log("I'm a tiger");
        },
        writable: true,
        enumerable: true,
        configurable: true
    }
});

let newCat = Object.create(cat);
let newTiger = Object.create(tiger);

newCat.say(); // I'm a cat
newTiger.jump(); // jump
newTiger.say(); // I'm a tiger
newCat.jump(); // jump
```

### 早期版本

#### class

> 早期版本的 JavaScript 为内置类型指定了 `class` 属性，可以通过 `Object.prototype.toString` 来访问

```javascript
let o = new Object; // [object Object]
let n = new Number; // [object Number]
let s = new String; // [object String]
let b = new Boolean; // [object Boolean]
let d = new Date; // [object Date]
let arg = function () {
    return arguments;
}; // [object Function]
let r = new RegExp; // [object RegExp]
let f = new Function; // [object Function]
let arr = new Array; // [object Array]
let e = new Error; // [object Error]

// 使用方式类似于 Java 的反射
console.log([o, n, s, b, d, arg, r, f, arr, e].map(v => Object.prototype.toString.call(v)));
```

> 在 ES3 及之前的版本，`类`是一个`很弱`的概念，仅仅只是`运行时`的一个`字符串属性`

> 从 `ES5` 开始，`class` 私有属性被 `Symbol.toStringTag` 代替
> 可以通过 `Symbol.toStringTag` 来自定义 `Object.prototype.toString` 的行为

```javascript
let x = {
    [Symbol.toStringTag]: "MyObject"
}

console.log(x) // Object { Symbol("Symbol.toStringTag"): "MyObject" }
console.log(x + "") // [object MyObject]
console.log(Object.prototype.toString.call(x)) // [object MyObject]
```

#### new

> new 依然为 JavaScript OOP 的一部分

> new 运算：接受`一个构造器`和`一组调用参数`

1. 以`构造器的 prototype 属性`为`原型`，创建新对象
2. 将 `this`（刚刚新建的对象） 和`调用参数`传给`构造器`执行
3. 如果构造器返回的是对象，则返回；否则返回第1步创建的对象（默认 `return this`）

> 试图让`函数对象`在语法上跟`类`变得类似
> `__proto__` 是 `mozilla` 提供的私有属性，多数环境不支持

```javascript
// 在构造器中添加属性
function class1(name) {
    this.name = name;
    this.say = function () {
        console.log("I'm " + this.name);
    }
}

let o1 = new class1("Bob");
o1.say(); // I'm Bob
console.log(o1.constructor === class1) // true
console.log(o1.__proto__ === class1.prototype) // true
```

```javascript
// 在构造器的 prototype 属性（以此为原型创建对象）上添加属性
function class2() {
}

class2.prototype.name = "Tom";
class2.prototype.say = function () {
    console.log("I'm " + this.name);
}

let o2 = new class2;
o2.say(); // I'm Tom
console.log(o2.constructor === class2) // true
console.log(o2.__proto__ === class2.prototype) // true
```

### ES6 class

> ES6 引进的 `class` 的特性，替代了原有的 `new + function` 的怪异组合（但`运行时并没有改变`）
> 使得 `function` 回归原本的`函数语义`

> ES6 引入了 `class` 关键字，在标准中`删除`了所有 `[[class]]` 相关的`私有属性`

> `类`的概念正式从`属性`升级为`语言的基础设施`，从此`基于类的编程方式`正式成为了 JavaScript 的`官方编程范式`

> 类的写法本质上也是由`原型运行时`来承载的
> 逻辑上 JavaScript 认为`每个类`是`有共同原型的一组对象`，类中定义的方法和属性会被写在`原型对象`之上

```javascript
class Rectangle {
    constructor(height, width) {
        // 数据型成员
        this.height = height;
        this.width = width;
    }

    // Getter
    get area() {
        return this.calArea();
    }

    // Method
    calArea() {
        return this.height * this.width;
    }
}

console.log(new Rectangle(3, 2).area) // 6
```

> 类提供了`继承`能力

```javascript
class Animal {
    constructor(name) {
        this.name = name;
    }

    say() {
        console.log(this.name + " is a common animal")
    }
}

class Dog extends Animal {
    constructor(name) {
        super(name);
    }

    say() {
        console.log(this.name + " is a dog")
    }
}

let d = new Dog("bob"); // bob is a dog
d.say();
```

# 对象分类

## 宿主对象

> `host object`：由 JavaScript `宿主环境`提供的对象，对象的行为完全由宿主环境决定

1. JavaScript 常见的宿主环境为`浏览器`

2. 在浏览器环境中，有全局对象 `window`（属性一部分来自于 `JavaScript 语言`，一部分来自于`浏览器环境`）
3. `JavaScript 标准`中规定了`全局对象属性`，`w3c`的各种标准中规定了 window 对象的其它属性
4. 宿主对象也可以分为：`固有对象` + `用户可创建对象`

## 内置对象

> `build-in object`：由 `JavaScript` 语言提供的对象

### 固有对象

> `intrinsic object`：由`标准`规定，随着 `JavaScript 运行时`而`自动创建`的对象实例

1. 固有对象在`任何 JS 代码执行前`就已经被创建出来了，扮演`『基础库』`的角色
2. `ECMA` 标准定义了 `150+` 个固有对象

### 原生对象

> `native object`：可以通过 `JavaScript 语言本身的构造器`创建的对象

1. 在 JavaScript 标准中，提供了 `30+` 构造器，可以通过 `new` 运算符创建新的对象
2. 基本上所有这些构造器的能力都是`无法通过纯 JavaScript 代码实现`，也`无法用 class/extends 来继承`

| 基本类型 | 基础功能和数据结构 | 错误类型       | 二进制类型        | 带类型的数组      |
| -------- | ------------------ | -------------- | ----------------- | ----------------- |
| Boolean  | Array              | Error          | ArrayBuffer       | Float32Array      |
| String   | Date               | EvalError      | SharedArrayBuffer | Float64Array      |
| Number   | RegExp             | RangeError     | DataView          | Int8Array         |
| Symbol   | Promise            | ReferenceError |                   | Int16Array        |
| Object   | Proxy              | SyntaxError    |                   | Int32Array        |
|          | Map                | TypeError      |                   | Uint8Array        |
|          | WeakMap            | URIError       |                   | Uint16Array       |
|          | Set                |                |                   | Uint32Array       |
|          | WeakSet            |                |                   | Uint8ClampedArray |
|          | Function           |                |                   |                   |

> 通过这些构造器创建的对象多数使用了`私有字段`（无法通过原型`继承`）
> 原生对象：为了`特定能力或者性能`，而设计出来的`特权对象`

| 原生对象 | 私有字段          |
| -------- | ----------------- |
| Error    | [[ErrorData]]     |
| Boolean  | [[BooleanData]]   |
| Number   | [[NumberData]]    |
| Date     | [[DateValue]]     |
| RegExp   | [[RegExpMatcher]] |
| Symbol   | [[SymbolData]]    |
| Map      | [[MapData]]       |

### 普通对象

> `ordinary object`：由 `{}` 、`Object 构造器` 或者 `class` 关键字定义类创建的对象，能够`被原型继承`

## 函数对象 vs 构造器对象

> 用`对象`来`模拟`：`函数`和`构造器`

1. 定义
   - `函数对象`：具有 `[[call]]` 私有字段的对象
   - `构造器对象`：具有 `[[construct]]` 私有字段的对象
2. 使用
   - 任何对象只要实现了`[[call]]`，就是一个`函数对象`，可以作为函数被调用
   - 任何对象只要实现了`[[construct]]`，就是一个`构造器对象`，可以作为构造器被调用
3. 用 `function` 关键字创建的函数必定`同时`是`函数`和`构造器`

> 对于`宿主对象`和`内置对象`来说，在实现 `[[call]]` 和 `[[construct]]` 不总是一致的

```javascript
// Date 作为构造器被调用时，产生对象
console.log(typeof new Date); // object
// Date 作为函数被调用时，产生字符串
console.log(typeof Date()) // string
```

```javascript
// 在浏览器宿主环境，Image 只能被当作构造器使用，而不允许作为函数使用
console.log(new Image)
console.log(Image()) // TypeError: Image constructor: 'new' is required
```

```javascript
// String Number Boolean 被当作函数使用时，会产生类型转换的效果
console.log(typeof String("x")) // string
console.log(typeof Number("1e2")) // number
console.log(typeof Boolean(Symbol("x"))) // boolean
```

> 在 ES6 之后，`=>` 创建的函数，`仅仅只是函数`，无法被当作构造器来使用

```javascript
let f = () => {
}

new f // TypeError: f is not a constructor
```

> 使用 `function 语法`或者 `Function 构造器` 创建的对象，`[[call]]` 和 `[[construct]]` 是`执行同一段代码`

```javascript
function f() {
    return 1;
}

// 将 f 当成函数调用
console.log(typeof f()); // number
// 将 f 当成构造器调用
console.log(typeof new f()); // object
```

> `[[construct]]` 的执行过程

1. 以 `Object.protoype` 为`原型`创建一个新对象
2. 以该新对象为 `this`，执行函数 `[[call]]`
3. 如果 `[[call]]` 的返回值为对象，则返回这个对象；否则返回第 1 步创建的新对象（隐含 `reture this`）

```javascript
// 如果构造器返回了一个新对象
// 那么原本通过 new 创建的新对象将变成一个在构造器之外无法访问的对象

function cls() {
    this.name = "zhongmingmao";

    // 默认返回 this，这里返回一个新对象，不再有 name 属性
    return {
        getName: () => this.name
    }
}


let x = new cls;
console.log(x.name); // undefined
console.log(x.getName()); // zhongmingmao
```
