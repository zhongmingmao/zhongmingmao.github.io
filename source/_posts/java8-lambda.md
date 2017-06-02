---
title: Java 8小记 - Lambda
date: 2017-05-30 00:06:25
categories:
    - 网易这两年
    - Java 8
tags:
    - 网易这两年
    - Java 8
    - Lambda
---

{% note info %}
本文主要介绍`Java 8`的 `Lambda` 表达式的简单使用
{% endnote %}

<!-- more -->

# 基本语法
```
(parameters) -> expression
(parameters) -> {statements;}
```
## Apple
相关代码托管在[java8_demo](https://github.com/zhongmingmao/java8_demo)
```Java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Apple {
    public static enum COLOR { GREEN, RED }
    public static final int HEAVY_WEIGHT = 200;
    private COLOR color;
    private Integer weight;
}
```

## 实例
```Java
(String s) -> s.length()
// 等价于
int f(String s){ return s.length(); }

(Apple a) -> a.getWeight() > Apple.HEAVY_WEIGHT
// 等价于
boolean f(Apple a){ return a.getWeight() > Apple.HEAVY_WEIGHT; }

(int x, int y) -> {
    System.out.println("Result:");
    Syetem.out.println(x+y;
}
// 等价于
void f(int x, int y){
    System.out.println("Result:");
    Syetem.out.println(x+y;
}

() -> 42
// 等价于
int f(){ return 42; }

(Apple a1 , Apple a2) -> a1.getWeight() > a2.getWeight
// 等价于
boolean f(Apple a1 , Apple a2){ return a1.getWeight() > a2.getWeight;}
```

# 函数式接口 + 函数描述符

## 函数式接口
1. 定义：只定义了`一个抽象方法`（排除 `default` 方法）的接口
2. 用途：`Lambda` 表达式允许直接以`内联`的形式，`为函数式接口的抽象方法提供实现`，并把整个表达式作为`函数式接口的实例`

## 函数描述符
1. 定义：`函数式接口的抽象方法的签名`
2. `函数描述符` = `函数式接口的抽象方法的签名` = `Lambda表达式的签名`

## Lambda 出现的地方
1. 赋值给一个变量（类型为`函数式接口`）
2. 传递给一个接受`函数式接口为参数的方法`

# 自定义函数式接口

## 函数式接口
```Java
@FunctionalInterface
public interface Change { // 只有一个抽象方法
    Integer action(Integer param);
}
```
函数描述符：`Integer -> Integer`

## 单元测试
```Java
private int localChange(int param, Change change) {
   return change.action(param);
}
    
@Test
public void multipyTest() {
   // Lambda 能够赋值给一个函数式接口的变量（前提是函数式接口的抽象方法的签名 = Lambda 表达式的签名）
   Change multiply = param -> param * 3;
   assertEquals(15, localChange(5, multiply));
   // Lambda 能够传递给一个接受函数式接口为参数的方法（前提是函数式接口的抽象方法的签名 = Lambda 表达式的签名）
   assertEquals(4, localChange(3, param -> param + 1));
}
```


# 常用内置函数式接口

| 函数式接口 | 函数描述符 |
| --- | --- |
| `Predicate<T>` | T -> boolean |
| `Consumer<T>` | T -> void |
| `Supplier<T>` | () -> T |
| `Function<T,R>`  | T -> R  |
| `BiFunction<T,U,R>` | (T,U) -> R |
| `BiPredicate<T,U>` | (T,U) -> boolean |
| `BinaryOperator<T> extends BiFunction<T,T,T>` | (T,T) -> T |
| `BiConsumer<T,U>` | (T,U) -> void |
| `UnaryOperator<T> extends Function<T,T>` | T -> T |

## Predicate<T>

### 定义
```Java
@FunctionalInterface
public interface Predicate<T> {
    boolean test(T t);
}
```
函数描述符：`T -> boolean`

### 实例
```Java
private <T> List<T> predicate(List<T> list, Predicate<T> predicate) {
   List<T> result = new ArrayList<>();
   for (T t : list) {
       if (predicate.test(t)) {
           result.add(t);
       }
   }
   return result;
}
    
@Test
public void predicateTest() {
   assertEquals(2, predicate(Arrays.asList("zhongmingmao", "", null),
           s -> null == s || s.isEmpty()).size());
}
```

## Consumer<T>

### 定义
```Java
@FunctionalInterface
public interface Consumer<T> {
    void accept(T t);
}
```
函数描述符：`T -> void`

### 实例
```Java
private <T> void consume(List<T> list, Consumer<T> consumer) {
   for (T t : list) {
       consumer.accept(t);
   }
}
    
@Test
public void consumerTest() {
   consume(Arrays.asList(1, 2, 3), integer -> System.out.println(integer));
}
```

## Supplier<T>

### 定义
```Java
@FunctionalInterface
public interface Supplier<T> {
    T get();
}
```
函数描述符：`() -> T`

### 实例
```Java
private <T> T supply(Supplier<T> supplier) {
   return supplier.get();
}
    
@Test
public void supplierTest() {
   assertEquals(LocalDate.now(), supply(() -> LocalDate.now()));
}
```

## Function<T,R>
### 定义
```Java
@FunctionalInterface
public interface Function<T, R> {
    R apply(T t);
}
```
函数描述符：`T -> R`

### 实例
```Java
private <T, R> R function(T t, Function<T, R> func) {
   return func.apply(t);
}
    
@Test
public void functionTest() {
   assertEquals(Integer.valueOf(12), function(Integer.valueOf(4), integer -> integer * 3));
}
```

## BiFunction<T, U, R>

### 定义
```Java
@FunctionalInterface
public interface BiFunction<T, U, R> {
    R apply(T t, U u);
}
```
函数描述符：`(T,U) -> R`

### 实例
```Java
private <T, U, R> R biFunction(T t, U u, BiFunction<T, U, R> biFunc) {
   return biFunc.apply(t, u);
}
    
@Test
public void biFunctionTest() {
   assertEquals("40", biFunction(4, "0", (integer, s) -> integer + s));
}
```

## BiPredicate<T, U>

### 定义
```Java
@FunctionalInterface
public interface BiPredicate<T, U> {
    boolean test(T t, U u);
}
```
函数描述符：`(T,U) -> boolean`

### 实例
```Java
private <T, U> boolean biPredicate(T t, U u, BiPredicate<T, U> biPred) {
   return biPred.test(t, u);
}
    
@Test
public void biPredicateTest() {
   assertTrue(biPredicate(4, "zhognmingmao", (integer, s) -> null != s && s.length() > integer));
}
```

## BinaryOperator<T>

### 定义
```Java
@FunctionalInterface
public interface BinaryOperator<T> extends BiFunction<T,T,T> {
}
```
函数描述符：`(T,T) -> T`

### 实例
```Java
private <T> T binaryOperator(T t, BinaryOperator<T> bOp) {
   return bOp.apply(t, t);
}
    
@Test
public void binaryOperatorTest() {
   assertEquals(Integer.valueOf(16), binaryOperator(4, (integer, integer2) -> integer * integer2));
}
```

## BiConsumer<T, U>

### 定义
```Java
@FunctionalInterface
public interface BiConsumer<T, U> {
    void accept(T t, U u);
}
```
函数描述符：`(T,U) -> void`

### 实例
```Java
private <T, U> void biConsumer(T t, U u, BiConsumer<T, U> bCon) {
   bCon.accept(t, u);
}
    
@Test
public void biConsumerTest() {
   biConsumer(4, "zhongmingmao", (integer, s) -> System.out.println(integer + s.length()));
}
```

## UnaryOperator<T>

### 定义
```Java
@FunctionalInterface
public interface UnaryOperator<T> extends Function<T, T> {
}
```
函数描述符：`T -> T`

### 实例
```Java
private <T> T unaryOperator(T t, UnaryOperator<T> uOp) {
   return uOp.apply(t);
}
    
@Test
public void unaryOperatorTest() {
   assertEquals("zhongmingmao" , unaryOperator("zhongming" , s -> s + "mao"));
}
```

## IntPredicate
1. `IntPredicate`是`Predicate<Integer>`的**`原始类型特化`**，节省了`自动装箱`和`自动拆箱`的开销
2. 类似函数式接口的还有 `LongPredicate`、`IntFunction<R>` 等

### 定义
```Java
@FunctionalInterface
public interface IntPredicate {
    boolean test(int value);
}
```

### 实例
```Java
@Test
public void intPredicateTest() {
   IntPredicate intPredicate = value -> value % 2 == 0;
   Predicate<Integer> integerPredicate = integer -> integer % 2 == 0;
   
   int max = 1 << 30;
   long p1 = System.currentTimeMillis();
   for (int i = 0; i < max; i++) {
       intPredicate.test(i);
   }
   long p2 = System.currentTimeMillis();
   for (int i = 0; i < max; i++) {
       integerPredicate.test(i);
   }
   long p3 = System.currentTimeMillis();
   System.out.println((p3 - p2) / (p2 - p1 + 0.0)); // 本地结果在100~220之间
   assertTrue((p3 - p2) > (p2 - p1));
}
```

# 类型检查

引用上面的例子进行分析
```Java
// 函数定义
private <T> List<T> predicate(List<T> list, Predicate<T> predicate) {...}
// 函数调用
predicate(Arrays.asList("zhongmingmao", "", null), s -> null == s || s.isEmpty()).size());
```
1. 函数定义中形参为`Predicate<T> predicate`
2. `Predicate<T>`中的抽象函数的签名为`boolean test(T t)`，因此`Predicate<T>`的`函数描述符`为`T -> boolean`
3. 函数调用中 `Lambda` 的`签名`为`String -> boolean`与`Predicate<T>`的`函数描述符`匹配，类型检查通过

# 方法引用

`方法引用`是`Lambda`的一种`快捷写法`（**`语法糖`**）

## 静态方法
1. Lambda：`(args) -> ClassName.staticMethod(args)`
2. 方法引用：`ClassName::staticMethod`

```Java
Function<String, Integer> str2Integer = s -> Integer.parseInt(s);
str2Integer = Integer::parseInt;
```

## 任意类型的实例方法
1. Lambda：`(arg0,rest) -> arg0.instanceMethod(rest)`（`arg0`是 `ClassName` 类型）
2. 方法引用：`ClassName::instanceMethod`

```Java
BiPredicate<List<String>, String> contains = (strings, s) -> strings.contains(s);
contains = List::contains;
```

## 现有对象的实例方法
1. Lambda：`(args) -> expr.instanceMethod(args)`
2. 方法引用：`expr::instanceMethod`

```Java
List<String> list = Arrays.asList("a", "b", "A", "B");
Predicate<String> contain = s -> list.contains(s);
contain = list::contains;
```

## 构造函数
```Java
Supplier<Apple> c1 = () -> new Apple();
c1 = Apple::new;// 默认构造函数
Apple apple = c1.get();
   
BiFunction<Apple.COLOR, Integer, Apple> c2 = (color, integer) -> new Apple(color, integer);
c2 = Apple::new;// 2个参数构造函数
apple = c2.apply(Apple.COLOR.GREEN, Integer.valueOf(200));
```

# 复合Lambda

## Comparator复合
```Java
@FunctionalInterface
public interface Comparator<T> {
    int compare(T o1, T o2);
}

// <T, U extends Comparable<? super U>> Comparator<T> comparing(
// Function<? super T, ? extends U> keyExtractor)
Comparator<Apple> comparator = Comparator.comparing(Apple::getWeight); // Apple -> Integer
Comparator<Apple> reversedComparetor = comparator.reversed();
Comparator<Apple> linkedComparator = Comparator.comparing(Apple::getWeight).reversed()
                                              .thenComparing(Apple::getColor).reversed();
```

## Predicate复合
```Java
Predicate<Apple> greenApple = apple -> Apple.COLOR.GREEN.equals(apple.getColor());
Predicate<Apple> notGreenApple = greenApple.negate();
Predicate<Apple> heavyApple = apple -> apple.getWeight() > Apple.HEAVY_WEIGHT;
Predicate<Apple> greenAndHeavyApple = greenApple.and(heavyApple);
Predicate<Apple> redApple = apple -> Apple.COLOR.RED.equals(apple.getColor());
Predicate<Apple> greenAndHeavyOrRedApple = greenAndHeavyApple.or(redApple);
// 优先级从左至右，（red or green） and heavy
Predicate<Apple> redOrGreenAndHeavyApple = redApple.or(greenApple).and(heavyApple);
```

## Function复合
```Java
Function<Integer, Integer> f = integer -> integer + 1;
Function<Integer, Integer> g = integer -> integer * 2;
Function<Integer, Integer> h = f.andThen(g); // g(f(x)) = (x+1)*2
Function<Integer, Integer> i = g.andThen(f); // f(g(x)) = (x*2)+1
```





<!-- indicate-the-source -->


