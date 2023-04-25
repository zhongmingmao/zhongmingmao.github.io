---
title: JavaScript - Type
mathjax: false
date: 2022-10-03 00:06:25
cover: https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/javascript_banner_sxve2l.webp
categories:
  - Web
  - JavaScript
tags:
  - Infrastructure
  - Web
  - JavaScript
---

# 基本类型

> JavaScript 的每一个`值`都属于某一种`数据类型`

1. `Undefined`
2. `Null`
3. Boolean
4. String
5. Number
6. `Symbol` -- ES6
7. `Object`

<!-- more -->

## Undefined + Null

### Undefined

> 编程规范：使用 `void 0` 代替 `undefined`

1. Undefined 代表`未定义`，只有一个值`undefined`
   - `undefined`为`全局变量`，但`并非关键字` -- 语言设计`缺陷`
2. 任何变量在`赋值前`的类型为是 `Undefined`，值为 `undefined`
3. `void` 运算可以将`任意表达式`变成 `undefined` 值

```javascript
console.log(void 0 === undefined) // true
```

### Null

> Null 代表`定义了但为空`，只有一个值`null`，null 是`关键字`

## Boolean

> Boolean 只有两个值，`true` 和 `false`，且均为`关键字`

## String

### Unicode + UTF

1. Unicode 为`字符集`，每一个 Unicode 码点表示一个字符
   - `U+???`
   - 基本字符区域（BMP）：`U+0000 ~ U+FFFF`
2. UTF 为 Unicode 的`编码方式`：`规定码点在计算机中的表示方式`，常见为 `UTF-8` 和 `UTF-16`

### String

1. String 的最大长度为`2^53-1`（`编码`长度）
2. String 为`值类型`，永远`无法变更`
3. String 把每个 `UTF-16` 单元当作一个`字符`来处理 -- `From Java`

## Number

> 对应数学中的`有理数`，但在计算机中，有一定的`精度限制`

1. `NaN`：占用特定数字
2. `Infinity`：无穷大；`-Infinity`：负无穷大
   - `1/0` ==> `Infinity`
   - `1/-0` ==> `-Infinity`
3. 浮点数存在`精度误差`

```javascript
console.log(0.1 + 0.2 == 0.3) // false
console.log(0.1 + 0.2 === 0.3) // false
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON) // true
```

## Symbol

> ES6 引入，是一切`非字符串的对象Key的集合`，整个`对象系统`被 Symbol 重塑

> `Symbol()` 函数前不能使用 `new`，因为`生成的 Symbol 是一个原始类型的值，不是对象`
> `Symbol`值不是对象，所以也不能添加属性，类似于字符串的`值类型`

```javascript
let a1 = Symbol('A');
let a2 = Symbol('A');
console.log(a1 === a2) // false
```

> 样例：使用 `Symbol.iterator` 来定义 `for...of` 在`对象`上的行为

```javascript
let o = {}

o[Symbol.iterator] = function () {
    let v = 0;
    return {
        next: function () {
            return {
                value: v++,
                done: v > 3
            }
        }
    }
}

for (let v of o) {
    console.log(v); // 0 1 2
}
```

> 如果 `Symbol` 的参数是一个`对象`，会调用该对象的 `toString()`方法，将其转换为字符串，然后生成一个 Symbol 值

```javascript
const obj = {
    toString() {
        return "abc";
    }
};

const sym = Symbol(obj)
console.log(sym) // Symbol("abc")
```

> `Symbol()` 函数的参数只是表示对当前 Symbol 值的`描述`，相同参数的 Symbol 函数的返回值是`不相等`的

```javascript
let s1 = Symbol();
let s2 = Symbol();
console.log(s1 === s2) // false

let a1 = Symbol('A')
let a2 = Symbol('A')
console.log(a1 === a2) // false
```

> `Symbol 不能与其他类型的值进行运算`

```javascript
let s = Symbol();
console.log('symbol: ' + s) // TypeError: can't convert symbol to string
console.log(`symbol: ${s}`) // TypeError: can't convert symbol to string
```

> Symbol 可以显式转成`字符串`

```javascript
let s = Symbol('A');
console.log(String(s)) // Symbol(A)
console.log(String(s).toString()) // Symbol(A)
```

> Symbol 可以转成`布尔值`

```javascript
let s = Symbol('A');
console.log(Boolean(s)) // true

Number(s) // TypeError: can't convert symbol to number
s + 2 // TypeError: can't convert symbol to number
```

## Object

> 对象的定义为`属性的集合`，属性分为`数据属性`和`访问器属性`，都是 `KV` 结构，`Key` 可以为 `String` 或者 `Symbol`

> JavaScript 是`无法自定义类型`的，`『类』`仅仅只是`运行时对象`的一个`私有属性`

> `Number`、`String` 和 `Boolean`，这三个`构造器`是两用的
>
> 1. 与 `new` 搭配：产生`对象`
> 2. `直接调用`：表示`强制类型转换`

```javascript
console.log(typeof 3) // number
console.log(typeof Number(3)) // number
console.log(typeof new Number(3)) // object
```

> Symbol 如果与 new 搭配，会直接报错

```javascript
// console.log(typeof new Symbol('A')) // Uncaught TypeError: Symbol is not a constructor
console.log(typeof Symbol('A')) // symbol
```

> JavaScript 试图模糊`对象`和`基本类型`之间的关系：可以`在基本类型上使用对象的方法` - `装箱转换`

```javascript
let s = 'abc'
console.log(typeof s) // string
console.log(s.charAt(0)) // a
```

> 可以在原型上添加方法，并应用于基本类型

```javascript
Symbol.prototype.hello = () => console.log('hello js')

let symbol = Symbol('A');
console.log(typeof symbol); // symbol，并非 object
symbol.hello(); // hello js
```

> 根因：`.`运算符提供了`装箱`操作，会根据`基础类型`构造一个`临时对象`，使得能在基础类型上调用对应对象的方法

# 类型转换

> JavaScript 为`弱类型动态语言`，发生`类型转换`非常频繁

![71bafbd2404dc3ffa5ccf5d0ba077720](https://web-1253868755.cos.ap-guangzhou.myqcloud.com/js/71bafbd2404dc3ffa5ccf5d0ba077720.jpg)

## ==

> 语言设计缺陷：试图实现`跨类型`的比较，规则非常复杂

> 最佳实践：进行`显式`地`类型转换`后，再使用 `===`进行比较

## StringToNumber

> 大多数情况下，`Number` 是比 `parseInt` 和 `parseFloat` 更好的选择

```javascript
// 十进制、二进制、八进制、十六进制
console.log(30, 0b111, 0o13, 0xFF); // 30 7 11 255
// 科学计数法（十进制）
console.log(1e3, -1e-2); // 1000 -0.01
```

> `parseInt` 默认只支持 `16 进制`，且会`忽略非数字字符`，也`不支持科学计数法`

```javascript
console.log(parseInt('0xFF')) // 255
console.log(parseInt('0xFFxxxx')) // 255
console.log(parseInt('0b13')) // 0
console.log(parseInt('1e3'))  // 1

// 显式指定进制
console.log(parseInt('111', 2)) // 7
console.log(parseInt('13', 8)) // 11
```

> `parseFloat` 直接把字符串作为`十进制`来解析，不会引入其它进制

```javascript
console.log(parseFloat('123.45')) // 123.45
console.log(parseFloat('123.45xxx')) // 123.45
console.log(parseFloat('1e3')) // 1000
console.log(parseFloat('-1e-2')) // -0.01
console.log(parseFloat('0xFF')) // 0
console.log(parseFloat('0b111')) // 0
console.log(parseFloat('0o13')) // 0
```

## NumberToString

> 当 Number 的绝对值较大或者较小的时候，将使用`科学计数法`表示（保证产生的字符串`不会过长`）

```javascript
console.log(String(1e256)) // 1e+256
console.log(String(1e-256)) // 1e-256
```

## 装箱转换

1. 每一种基本类型`Number`、`String`、`Boolean`、`Symbol`在对象中都有`对应的类`
2. 装箱转换：将`基本类型`转换为对应的`对象`
3. `装箱机制`会频繁产生`临时对象`，在高性能场景，应该尽量避免对`基本类型`做装箱转换

> Symbol

```javascript
let s = (function () {
    return this;
}).call(Symbol('A'));

console.log(typeof s); // symbol
console.log(s instanceof Object) // false
console.log(s instanceof Symbol) // false
console.log(s.constructor === Symbol) // true
```

> 通过内置的`Object`函数，可以`显式调用装箱能力`

```javascript
let o = Object(Symbol('A'))

console.log(typeof o); // object
console.log(o instanceof Symbol); // true
console.log(o.constructor === Symbol); // true
```

> 每一类`装箱对象`都有私有的`Class`属性，可以通过 `Object.prototype.toString` 来获取
> 在 JavaScript 中，`无法更改私有的 Class 属性`，比 `instanceof` 本身`更准确`
> `call` 本身会产生`装箱操作`，需要配合`typeof`来区分`基本类型`还是`对象类型`

```javascript
let o = Object(Symbol('A'))

console.log(Object.prototype.toString.call(o)) // [object Symbol]
```

## 拆箱转换

> `ToPrimitive`：对象类型 -> 基础类型

> `对象`到 `String` 和 `Number` 的转换：`先拆箱再转换`（对象 -> 基本类型 -> String/Number）

> 拆箱转换会尝试调用`valueOf`和`toString`来获得拆箱后的`基本类型`
> 如果 `valueOf` 和 `toString` 都不存在，或者`没有返回基本类型`，会产生类型错误 `TypeError`

> valueOf -> toString

```javascript
let o = {
    valueOf: () => {
        console.log("try valueOf");
        return {}; // 返回对象类型
    },
    toString: () => {
        console.log("try toString");
        return {}; // 返回对象类型
    }
}

// try valueOf
// try toString
// TypeError: can't convert o to number
o * 2
```

> toString -> valueOf

```javascript
let o = {
    valueOf: () => {
        console.log("try valueOf");
        return {}; // 返回对象类型
    },
    toString: () => {
        console.log("try toString");
        return {}; // 返回对象类型
    }
}

// try toString
// try valueOf
// TypeError: can't convert o to string
console.log(String(o));
```

> 在 ES6 之后，允许对象通过显式指定 `@@toPrimitive Symbol` 来`覆盖`原有的`拆箱行为`

```javascript
let o = {
    valueOf: () => {
        console.log("try valueOf");
        return {};
    },
    toString: () => {
        console.log("try toString");
        return {};
    }
}

o[Symbol.toPrimitive] = () => {
    console.log("try toPrimitive");
    return "hello js";
}

// try toPrimitive
// hello js
console.log(o + "")
```

# typeof

> 同样为`语言的设计缺陷`：typeof 的运算结果，与`运行时数据类型`有较多`不一致`的地方

| 示例表达式       | typeof 结果 | 运行时类型  |
| ---------------- | ----------- | ----------- |
| `null`           | `object`    | `Null`      |
| `(function(){})` | `function`  | `Object`    |
| `void 0`         | `undefined` | `Undefined` |
| `Symbol("A") `   | `symbol`    | `Symbol`    |
| {}               | object      | Object      |
| 3                | number      | Number      |
| "ok"             | string      | String      |
| true             | boolean     | Boolean     |





