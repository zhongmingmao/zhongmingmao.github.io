---
title: JavaScript - Event Loop
mathjax: false
date: 2022-10-05 00:06:25
cover: https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/3cfde400-5298-11ea-9f39-aab161ef8f69.png
categories:
  - Web
  - JavaScript
tags:
  - Infrastructure
  - Web
  - JavaScript
---

# 单线程

1. JavaScript 的主要宿主环境为`浏览器`，主要用途是`与用户互动`和`操作 DOM`
   - 如果采用`多线程`模型，会带来复杂的`同步`问题
2. 从`诞生`伊始，JavaScript 就是单线程，是其`核心特性`
3. 为了利用`多核 CPU` 的计算能力，`HTML 5` 提出了 `Web Worker` 标准
   - 允许 JavaScript 创建多个子线程，但`子线程完全受主线程控制`，且`不允许操作 DOM`

<!-- more -->

# 任务队列

1. JavaScript 在`单线程`模式下，所有任务都需要`排队`
2. 任务分类
   - `同步`任务（`synchronous`）
     - 在`主线程`上`排队执行`的任务，只有前一个任务`执行完毕`，才能执行后一个任务
   - `异步`任务（`asynchronous`）
     - 不进入主线程，而是进入`任务队列`的任务
     - 只有任务队列`通知`主线程，某个异步任务可以执行了，该异步任务才会进入主线程执行
3. 运行机制
   - 所有`同步任务`都在`主线程`上执行，形成一个`执行栈`
   - 主线程之外，还存在一个`任务队列`
     - 只要`异步任务`有了`运行结果`，就会在`任务队列`中放置一个`事件`
   - 一旦`执行栈`中`所有的同步任务执行完毕`，系统就会读取`任务队列`中的`事件`
     - `事件`对应的`异步任务`会`结束等待`状态，`进入执行栈`开始执行
   - 主线程不断重复上一步骤（只要`主线程空闲`，就会去`读取任务队列`）

![bg2014100801](https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/bg2014100801.jpg)

# Event + Callback

1. `任务队列`是一个`事件的队列`
2. `异步任务完成后`会向`任务队列`添加一个`事件`：表示相关的异步任务可以`进入执行栈`了
   - 异步任务本身不需要 CPU 参与，如 `IO`（DMA）
   - 但异步任务对应事件的`回调函数`需要占用 `CPU` 时间
3. `主线程`读取`任务队列`，实际上就是`读取事件`
4. `任务队列`中的`事件`：IO 事件、鼠标点击、页面滚动
   - 只要为 `Event` 指定过 `Callback`，当这些 `Event` 发生时就会进入`任务队列`，等待`主线程`读取
5. `Callback`：`被主线程挂起的代码` -- 需要`占用 CPU 时间`
   - `异步任务`必须指定 `Callback`
   - 当`主线程`开始执行`异步任务`，实际执行的就是对应的 `Callback`
6. `任务队列` 是一个 `FIFO` 的数据结构：排在`前面`的事件，`优先`被主线程读取
   - 主线程的读取过程`基本上`是`自动`的
     - 主要`执行栈`一清空，`任务队列`上`第1位`的事件会自动进入主线程 
     - 针对`定时器`，主线程会首先检查下`执行时间`，某些事件只有到了规定时间，才能返回主线程

# Event Loop

> `event loop`：主线程循环不断地从`任务队列`中`读取事件`

![0_6T6KIVRkN9nWb3QU](https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/0_6T6KIVRkN9nWb3QU.gif)

1. 主线程运行时，会产生 `Heap` 和 `Stack`
2. `Stack` 中的代码调用各种`外部 API`，在`任务队列`中加入各种`事件`
3. 只要 `Stack` 中的代码`执行完毕`
   - 主线程就会去读取`任务队列`（`Callback Queue`），依次执行那些`事件对应的回调函数`
4. 执行栈中的代码（`同步任务`），总是在读取任务队列（`异步任务`）之前执行

```javascript
let request = new XMLHttpRequest();
request.open("GET", "http://www.example.org/example.txt")

request.send(); // 异步任务，只有在当前脚本的所有代码执行完，主线程才会去读取任务队列

// 指定 Callback 属于执行栈的一部分，执行完后才会去执行上面的 send
request.onload = function () {
};
request.onerror = function () {
};

// 执行过程
// 1. 主线程为 Event 指定 Callback
// 2. 执行异步任务 send
// 3. send 执行完后，往任务队列插入 Event
// 4. 主线程读取 Event，执行 Event 对应的 Callback
```

# 定时器

1. `任务队列`除了放置`异步任务`的事件，还可以放置`定时事件`（指定某些代码在多少时间后执行）
2. `定时器`功能主要由 `setTimeout`（一次性） 和 `setInterval`（周期性） 来完成，`内部运行机制完全一样`

```javascript
// 1
// 3
// 2
console.log(1);
setTimeout(function () { // Callback
    console.log(2);
}, 0); // 当前代码执行完（执行栈清空）后，立即执行 Callback
console.log(3);
```

> `setTimeout(fn, 0)`：尽可能早地执行
> 往`任务队列尾部`添加一个事件，等到`同步任务`和`任务队列现有的事件`都处理完后，才会得到执行

> `setTimeout`： 只是`将事件插入到任务队列`
> 必须等到`执行栈`执行完，主线程才会去执行它`指定`的 `Callback`

> 如果`执行栈耗时很长`，此时`无法保证`回调函数一定会在 `setTimeout` 指定的时间执行
