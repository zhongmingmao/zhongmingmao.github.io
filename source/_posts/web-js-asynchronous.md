---
title: JavaScript - Asynchronous
mathjax: false
date: 2022-10-06 00:06:25
cover: https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/es-la-diferencia-entre-Java-y-JavaScript-scaled.jpg
categories:
  - Web
  - JavaScript
tags:
  - Infrastructure
  - Web
  - JavaScript
---

# Asynchronous

> `异步编程`适用于 `IO 密集型应用`

> 异步编程的传统实现方式：`Callback`

```javascript
console.log("main start");
setTimeout(() => console.log("sync start"), 1000);
console.log("main end");

// main start
// main end
// sync start
```

<!-- more -->

> `依次`执行多个异步操作：`Callback Hell`

```javascript
setTimeout(() => {
    console.log("Action 1");
    setTimeout(() => {
        console.log("Action 2");
        setTimeout(() => {
            console.log("Action 3");
            setTimeout(() => {
                console.log("Action 4");
            })
        })
    })
})

// Action 1
// Action 2
// Action 3
// Action 4
```

> 为了解决 `Callback Hell`，提高代码的可读性，`Promise` 应运而生：通过`链式`操作将多个`异步任务`串联起来

![image-20230429154107305](https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/image-20230429154107305.png)

> 常见的 `try...catch...finally` 为`同步`编程范式

 ```javascript
 fetch("https://www.bilibili.com/")
     .then(response => response.json())
     .then(json => console.log(json))
     .catch(error => console.log(error))
     .finally(() => console.log("close"));
 ```

# Promise

> 一个 `JavaScript 引擎`会`常驻于内存`中，等待`宿主`把 JavaScript 代码或者函数传递给它去执行

1. 在 `ES3` 及更早的版本中，JavaScript 引擎本身没有`异步`执行代码的能力
2. 在 `ES5` 之后，JavaScript 引入了 `Promise`，从此，`不需要浏览器的安排，JavaScript 引擎本身也可以发起任务`

## 宏观任务 vs 微观任务

> 依据 `JSC` 引擎的术语，把`宿主`发起的任务称为`宏观任务`，把 `JavaScript 引擎`发起的任务称为`微观任务`

> `Event Loop`：JavaScript 引擎等`宿主`环境分配`宏观任务`
> 在底层的 `C/C++` 代码中，`Event Loop` 是跑在一个`独立线程`的循环中

```c
// 宏观任务的队列相当于 Event Loop
while (true) {
    r = wait();
    execute(r);
}
```

> 在宏观任务中，JavaScript 的 `Promise` 还会产生`异步代码`
> JavaScript 必须保证这些`异步代码在一个宏观任务中完成`，因此，每个`宏观任务`中又包含了一个`微观任务队列`

<img src="https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/image-20230429093046068.png" width="40%">

> 基于`宏观任务`和`微观任务`的机制，可以实现 `宿主级` 和 `JavaScript 引擎级` 的任务
>
> 1. `setTimeout`（宿主 API）：添加`宏观任务`
> 2. `Promise`：在`队列尾部`添加`微观任务`

## Promise

> Promise 是 `JavaScript 语言`提供的一种`标准化`的`异步管理方式`

> 总体思想：需要进行 IO、等待或者其它异步操作的函数，`不返回真实结果`，而是返回一个`『承诺』`
> 函数的调用方可以在合适的时机，选择等待 Promise 实现（通过 Promise 的 `then` 方法`回调`）

> Promise 的 `then` 回调是一个`异步`的执行过程（`微观任务队列尾部`）

```javascript
console.log("main start")
let p = new Promise((resolve, reject) => {
    console.log("Promise start")
    resolve(); // 异步执行
    console.log("Promise end")
})
p.then(() => console.log("resolve"));
console.log("main end")

// main start
// Promise start
// Promise end
// main end
// resolve
```

> Promise + setTimeout，`微观任务始终先于宏观任务`

```javascript
// setTimeout 是浏览器 API，产生的是宏观任务
setTimeout(() => console.log("d"), 0);

// Promise 产生的是 JavaScript 引擎内部的微观任务
let p = new Promise((resolve, reject) => {
    console.log("a");
    resolve();
})
p.then(() => console.log("c"));

console.log("b")

// a
// b
// c
// d
```

> `微观任务始终先于宏观任务`

```javascript
setTimeout(() => console.log("macro"), 0);

new Promise((resolve, reject) => {
    resolve();
}).then(() => {
    // 强制耗时
    let begin = Date.now();
    while (Date.now() - begin < 2000) {
    }

    console.log("micro 1");
    new Promise((resolve, reject) => {
        resolve();
    }).then(() => console.log("micro 2"));
})

// micro 1
// micro 2
// macro
```

## 执行顺序

1. 分析有多少`宏观任务`
2. 在每个宏观任务中，分析有多少`微观任务`
3. 根据`调用次序`，确定宏观任务中的`微观任务`的执行次序
4. 根据宏观任务的`触发规则`和`调用次序`，确定`宏观任务`的执行次序

```javascript
function sleep(duration) {
    return new Promise((resolve, reject) => {
        console.log("b");
        setTimeout(resolve, duration);
    })
}

console.log("a");
sleep(1000).then(() => console.log("c")); // resolve

// a
// b
// c
```

1. `setTimeout` 把整个代码分割成 2 个`宏观任务`
2. 第 1 个`宏观任务`中，包含先后`同步执行`的 `console.log("a");` 和 `console.log("b");`
3. 第 2 个`宏观任务`中，调用了 `resolve`，然后 `then` 中的代码异步得到执行

> 从 `ES6` 开始，有了 `async/await + Promise`，能够有效地`改善代码结构`

# async / await

> `async/await`提供了用`for`、`if`等代码结构来编写`异步`的方式，运行时基础是 `Promise`（本质上为`语法糖`）

> `异步函数`：会返回 `Promise` 的函数
> 可以通过 `async` 关键字将一个函数声明为`异步函数`，而 `await` 关键字也只能在 `async` 声明的异步函数内使用

```javascript
async function httpFetch() {
    let response = await fetch("");
    console.log("httpFetch...")
    return response;
}

httpFetch().then(response => response.status)
    .then(code => console.log(code))
    .finally(() => console.log("done"))

// httpFetch...
// 200
// done
```

```javascript
// 异步函数：返回 Promise 的函数
function sleep(duration) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, duration);
    })
}

async function foo() {
    console.log("a");
    await sleep(2000); // 使用 await 等待一个 Promise
    console.log("b");
}

foo().then(() => console.log("c"));

// a
// b
// c
```

> `async` 函数是可以`嵌套`的

```javascript
function sleep(duration) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, duration);
    })
}

async function foo(name) {
    await sleep(2000);
    console.log(name);
}

async function bar() {
    await foo("A");
    await foo("B");
}

bar().then(() => console.log("C"))

// A
// B
// C
```

> 串行  vs 并行

```javascript
// 任务串行：r1 -> r2
async function f() {
    let r1 = await fetch("");
    let r2 = await fetch("");
}
```

```javascript
// 任务并行：Promise.all
async function f() {
    let r1 = fetch("");
    let r2 = fetch("");
    let [p1, p2] = await Promise.all([r1, r2]);
    return [p1, p2];
}
```

