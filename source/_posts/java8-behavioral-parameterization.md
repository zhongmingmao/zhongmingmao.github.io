---
title: Java 8小记 - 行为参数化
date: 2017-05-29 00:06:25
categories:
    - Java 8
tags:
    - Java 8
---

{% note info %}
本文主要介绍`行为参数化`
{% endnote %}

<!-- more -->

# 基础概念
1. 行为参数化：将方法或代码作为`参数或值`进行传递
2. 谓词：一个返回 `boolean` 值的函数，在 `Java8` 中是一个`函数式接口`（`java.util.function.Predicate`）

# 代码实例
目录结构如下，相关代码托管在[java8_demo](https://github.com/zhongmingmao/java8_demo)

```
├── main
│   └── java
│       └── me
│           └── zhongmingmao
│               ├── domain
│               │   └── Apple.java
│               ├── filter
│               │   ├── FilterJava7.java
│               │   └── FilterJava8.java
│               └── predicate
│                   ├── java7
│                   │   ├── ColorPredicate.java
│                   │   ├── PredicateJava7.java
│                   │   └── WeightPredicate.java
│                   └── java8
│                       └── PredicateJava8.java
└── test
    └── java
        └── me
            └── zhongmingmao
                └── predicate
                    └── PredicateJavaTest.java
```

## Java7 + 策略模式

### Apple
```java
@Data
@AllArgsConstructor
public class Apple {
    public enum COLOR { GREEN, RED }
    public static final int HEAVY_WEIGHT = 200;
    private COLOR color;    
    private int weight;
}
```

### PredicateJava7
```java
public interface PredicateJava7 { // 函数式接口
    boolean test(Apple apple);
}
```

### ColorPredicate
```java
public class ColorPredicate implements PredicateJava7 { // 模板代码
    public boolean test(Apple apple) { // 模板代码
        // 实际的策略代码
        return null == apple ? false : Apple.COLOR.GREEN.equals(apple.getColor());
    }
}
```

### WeightPredicate
```java
public class WeightPredicate implements PredicateJava7 { // 模板代码
    public boolean test(Apple apple) { // 模板代码
        // 实际的策略代码
        return null == apple ? false : apple.getWeight() > Apple.HEAVY_WEIGHT;
    }
}
```

### FilterJava7
```java
public class FilterJava7 {
    public static List<Apple> filterJava7(List<Apple> apples, PredicateJava7 predicateJava7) {
        List<Apple> result = new ArrayList<Apple>();
        for (Apple apple : apples) {
            if (predicateJava7.test(apple)) {
                result.add(apple);
            }
        }
        return result;
    }
}
```

### PredicateJavaTest
```java
public class PredicateJavaTest {

    private List<Apple> apples = null;

    @Before
    public void setUp() {
        apples = Arrays.asList(new Apple(Apple.COLOR.GREEN, 100), new Apple(Apple.COLOR.RED, 300));
    }

    @Test
    public void predicateJava7Test() {
        assertEquals(1, FilterJava7.filterJava7(apples, new ColorPredicate()).size());
        assertEquals(1, FilterJava7.filterJava7(apples, new WeightPredicate()).size());
    }
}
```

从`ColorPredicate`和`WeightPredicate`可以看出，每实现一个策略都会需要重复相应的`模板代码`

## Java8 + Lambda + 泛型

### PredicateJava8
```java
public interface PredicateJava8<T> { // 函数式接口 + 泛型
    boolean test(T t);
}
```

### FilterJava8
```java
public class FilterJava8 {

    public static <T> List<T> filterJava8(List<T> list, PredicateJava8<T> predicateJava8) {
        List<T> result = new ArrayList<T>();
        for (T t : list) {
            if (predicateJava8.test(t)) {
                result.add(t);
            }
        }
        return result;
    }
}
```
与`FilterJava7`，相比仅仅是引入了泛型

### PredicateJavaTest
增加测试用例`predicateJava8Test`
```java
@Test
public void predicateJava8Test() {
    // Lambda 表达式
    assertEquals(1, FilterJava8.filterJava8(apples, (Apple apple) -> Apple.COLOR.GREEN.equals(apple.getColor())).size());
    assertEquals(1, FilterJava8.filterJava8(apples, apple -> apple.getWeight() > Apple.HEAVY_WEIGHT).size());
}
```

采用 `Lambda` 表达式实现`行为参数化`无需先定义相应的策略，减少`模板代码`的产生

<!-- indicate-the-source -->
