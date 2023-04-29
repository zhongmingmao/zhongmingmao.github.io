---
title: JavaScript - Function
mathjax: false
date: 2022-10-07 00:06:25
cover: https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/1_M9cY0UHTbmlBfoPMCQwxYA.png
categories:
  - Web
  - JavaScript
tags:
  - Infrastructure
  - Web
  - JavaScript
---

# 闭包

> 闭包是一个`绑定了执行环境`的`函数`，JavaScript 中的函数`完全符合`闭包的定义

> 在 JavaScript 中，与`闭包`对应的概念就是`函数`

<!-- more -->

# 执行上下文

1. 执行上下文：`执行一段代码（包括函数），所需要的所有信息`
2. 相比于普通函数，`JavaScript 函数`的`主要复杂性`来源于其携带的`环境部分`

## 版本

### ES3

| Key               | Desc                         |
| ----------------- | ---------------------------- |
| `scope`           | 作用域、作用域链             |
| `variable object` | 变量对象，用于存储变量的对象 |
| `this value`      | this 值                      |

### ES5

| Key                    | Desc                           |
| ---------------------- | ------------------------------ |
| `lexical environment`  | `词法`环境，当`获取`变量时使用 |
| `variable environment` | `变量`环境，当`声明`变量时使用 |
| `this value`           | this 值                        |

### ES2018 - Recommend

> `this value` 被纳入 `lexical environment`

| Key                     | Desc                                                     |
| ----------------------- | -------------------------------------------------------- |
| `lexical environment`   | `词法`环境，当`获取`变量或者 `this` 值时使用             |
| `variable environment`  | `变量`环境，当`声明`变量时使用                           |
| `code evaluation state` | 用于`恢复代码执行位置`                                   |
| `Function`              | 执行的任务是`函数`时使用，表示正在被执行的函数           |
| `ScriptOrModule`        | 执行的任务是`脚本`或者`模块`时使用，表示正在被执行的代码 |
| `Realm`                 | 使用的`基础库`和`内置对象实例`                           |
| `Generator`             | 仅`生成器`上下文有这个属性，表示当前生成器               |

## var

> 通过创建一个函数，并且`立即执行`，来`构造一个新的域`，从而控制 `var` 的范围

> 使用`()`

```javascript
(function () {
    var a = 1;
    console.log(a);
}());

(function () {
    var a = 2;
    console.log(a);
}());
```

> 使用`void` - 推荐
> 有效避免了`语法`问题，并且 `void` 在语义上表示`忽略`后面表达式的值，变成 `undefined`

```javascript
void function () {
    var a = 1;
    console.log(a);
}();

void function () {
    var a = 2;
    console.log(a);
}();
```

> 声明的变量与被赋值的变量可能会`不一致`，要借助 `with`（不推荐使用）

```javascript
var b;

void function () {
    var env = {b: 1};
    b = 2; // 并没有使用 var b 声明
    console.log("In function b: ", b);
    with (env) { // strict mode code may not contain 'with' statements
        var b = 3; // 此处的 var b 作用到了 function 环境，作用到了两个域！
        console.log("In with b:", b);
    }
}();

console.log("Global b:", b);

// In function b:  2
// In with b: 3
// Global b: undefined
```

## let

> 从 `ES6` 开始引入`let`，JavaScript 在`运行时`引入了`块级作用域`
> 在 `let` 之前，JavaScript 的 `if`、`for` 等语句都`不产生作用域`

> `for` `if` `switch` `try/catch/finally`

# 函数

> `切换执行上下文`的主要场景：`函数调用`

## 普通函数

> 使用 `function` 关键字定义的函数

```javascript
function foo() {
    console.log("hello js");
}
```

## 箭头函数

> 使用 `=>` 运算符定义的函数

```javascript
let foo = () => console.log("hello js");
```

## 方法

> 在 `class` 中定义的函数

```javascript
class Human {
    constructor(name) {
        this.name = name;
    }

    say() {
        console.log("I'm " + this.name);
    }
}

new Human("bob").say(); // I'm bob
```

## 生成器函数

> 使用 `function*` 定义的函数

```javascript
function* generator(i) {
    yield i;
    yield i + 10;
}

let gen = generator(10);

console.log(gen.next().value) // 10
console.log(gen.next().value) // 20
console.log(gen.next().value) // undefined
```

## 类

> 使用 `class` 定义的类，`实际上也是函数`

```javascript
class Human {
    constructor(name) {
        // init
    }
}

console.log(typeof Human) // function
```

## 异步函数

> 在`普通函数`、`箭头函数`和`生成器函数`加上 `async` 关键字

```javascript
async function f1() {
    console.log("f1");
}

let f2 = async () => console.log("f2");

async function* f3(i) {
    yield  i << 1;
}
```

# this

## 行为

> `this` 是`执行上下文`中很重要的一个组成部分，同一个函数`调用方式`不同，得到的 `this` 也不同

```javascript
function showThis() {
    console.log(this);
}

let x = {
    showThis: showThis
}

showThis(); // global
x.showThis(); // x
```

1. `普通函数`的 `this` 由`调用它所使用的引用`决定的
2. 获取`函数的表达式`，实际上返回的并非函数本身，而是一个 `Reference` 类型
   - `Reference` 类型的组成：`一个对象` + `一个属性值`
   - `Reference` 类型中的`对象`被当作 `this` 值，传入到执行函数时的`上下文`当中
3. `调用函数时使用的引用，决定了函数执行时刻的 this 值`
4. 从`运行时`角度来看，`this 与 OOP 毫无关联`，而是与`函数调用`时使用的`表达式`有关

> 如果使用`箭头函数`，不论用什么引用来调用它，都不会影响 `this` 值

```javascript
let showThis = () => console.log(this);

let x = {
    showThis: showThis
}

showThis(); // global
x.showThis(); // global
```

> 方法

```javascript
class C {
    showThis() {
        console.log(this);
    }
}

let c = new C();
let showThis = c.showThis;

showThis(); // undefined
c.showThis(); // c
```

## 机制

> TBD

