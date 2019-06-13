---
title: Java 8 -- Stream
date: 2017-06-01 00:06:25
categories:
    - Java
    - SE8
tags:
    - Java
---

{% note info %}
本文主要介绍`Java 8`的 `Stream`的简单使用
{% endnote %}

<!-- more -->

# 简介

## 流与集合的区别

### 计算的时机

|  | 是否全部载入内存 | 能否添加或删除元素 | 类似于 |
| --- | --- | --- | --- |
| 集合 | 是 | 能 | DVD |
| 流 | 否，按需计算 | 不能 | 网络流媒体 |

### 消费一次
流`只能遍历一次`，遍历后即被消费，类似于`网络流`
相关代码托管在[java8_demo](https://github.com/zhongmingmao/java8_demo)
```java
List<String> strs = Arrays.asList("zhong", "ming", "mao");
Stream<String> stream = strs.stream();
stream.forEach(s -> System.out.println(s)); // Lambda
// throw java.lang.IllegalStateException: stream has already been operated upon or closed
stream.forEach(System.out::println); // 方法引用，相关内容请参照「Java8回忆录 - Lambda」
```

### 迭代方式

|  | 迭代方式 | 编程方式 | 并行 | 目的 |
| --- | --- | --- | --- | --- |
| 集合 | 外部迭代 | 自行选择数据表示 | 自行实现并行 | 以特定时间/空间复杂度存储和访问元素 |
| 流 | 内部迭代 | 声明式编程 | 几乎免费的并行 | 计算 |

## 流操作
流操作类似于`流水线`操作
<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-pipeline.png" width="500">

### 中间操作
1. 返回一个流（`Stream`）的操作
2. 中间操作`不会执行任何处理`，直到触发了一个`终端操作`
3. 中间操作一般是可以进行`合并`的，这会在终端操作进行处理

常用中间操作

| 操作 | 出参 | 入参 | 函数描述符（入参） |
| --- | --- | --- | --- |
| filter | `Stream<T>` | `Predicate<T>` | T -> boolean |
| distinct | `Stream<T>` |  |  |
| skip | `Stream<T>` | long |  |
| limit | `Stream<T>` | long |  |
| map | `Stream<R>` | `Function<T,R>` | T -> R |
| flatMap | `Stream<R>` | `Function<T,Stream<R>>` | `T -> Stream<R>` |
| sorted | `Stream<T>` | `Comparator<T>` | (T,T) -> int |

### 终端操作
1. `关闭流`的操作
2. 从流的流水线`生成结果`（List、Integer、void等）

常用终端操作

| 操作 | 出参 | 入参 | 函数描述符（入参） |
| --- | --- | --- | --- |
| anyMatch | boolean | `Predicate<T>` | T -> boolean |
| noneMatch | boolean | `Predicate<T>` | T -> boolean |
| allMatch | boolean | `Predicate<T>` | T -> boolean |
| findAny | `Optional<T>` |  |  |
| findFirst | `Optional<T>` |  |  |
| forEach | void | `Consumer<T>` | T -> void |
| collect | R | `Collector<T,A,R>` |  |
| count | long |  |  |
| reduce | `Optional<T>` | `BinaryOperator<T>` | (T,T) -> T |

# 筛选与切片
## 谓词筛选
```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {

    public enum TYPE {
        OLD, YOUNG;
    }

    private String name;
    private int age;
    private boolean isStudent;

    public User(int age, boolean isStudent) {
        this.age = age;
        this.isStudent = isStudent;
    }
}
```
```java
@Test
public void filterCountTest() {
    // 初始化代码实际在@Before中，这里仅为了行文方便
    List<User> users = Arrays.asList(new User(10, true),
           new User(20, true), new User(30, false),
           new User(40, false), new User(50, false),
           new User(60, false), new User(70, false));

    assertEquals(2, users.stream() // Stream<User>
                         .filter(User::isStudent) // 谓词筛选，方法引用，Stream<User>
                         .count()); // 统计，long
}
```

## 筛选各异元素
```java
@Test
public void filterDistinctTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 3, 2, 1);
   assertEquals(2, numbers.stream() // Stream<Integer>
                          .filter(n -> n % 2 == 0) // 谓词过滤，Lambda，Stream<Integer>
                          .distinct() // 筛选各异的元素，Stream<Integer>
                          .count()); // 统计，long
}
```

## 截断流
```java
@Test
public void filterLimitTest(){
   Predicate<User> isStudent = User::isStudent;
   assertEquals(3, users.stream() // Stream<User>
                        .filter(isStudent.negate()) // 谓词筛选，Stream<User>
                        .limit(3) // 截断流，Stream<User>
                        .count()); // 统计，long
}
```

## 跳过N个元素
```java
@Test
public void filterSkipTest() {
   Predicate<User> isStudent = User::isStudent;
   assertEquals(4, users.stream() // Stream<User>
                        .filter(isStudent.negate()) // 谓词筛选，Stream<User>
                        .skip(1) // 跳过前N个元素，Stream<User>
                        .count()); // 统计，long
}
```

# 映射

## map
```java
@Test
public void mapTest() {
   List<String> words = Arrays.asList("zhong", "ming", "mao");
   assertEquals(3, words.stream() // Stream<String>
                        .map(String::length) // 映射，Stream<Integer>
                        .distinct() // 筛选各异的元素，Stream<Integer>
                        .count()); // 统计，long
}
```
## flatMap
```java
@Test
public void flatMapTest() {
   List<String> words = Arrays.asList("zhong", "ming", "mao");
   Stream<String[]> stream = words.stream() // Stream<String>
                                  .map(s -> s.split("")); // 映射，Stream<String[]>，此时流中的元素是String[]
   // <R> Stream<R> flatMap(Function<? super T, ? extends Stream<? extends R>> mapper)
   // public static <T> Stream<T> stream(T[] array)
   assertEquals(8, stream.flatMap(Arrays::stream) // 映射，Stream<String>，此时流中的元素恢复为String
                         .distinct() // 筛选各异的元素，Stream<String>
                         .collect(toList()) // 收集为List，List<String>
                         .size());
}
```
flatMap 从定义上理解有点晦涩，做简单解释
1. `flatMap`方法定义可简单理解为`Stream<R> (Function<T, Stream<R>> mapper)`，`mapper`的函数描述符简单理解为`T -> Stream<R>`
2. Lambda表达式`Arrays::stream`的签名为`T[] -> Stream<T>`
3. `stream`为`Stream<String[]>`，元素类型为`String[]`，通过`Arrays::stream`会变成`String[] -> Stream<String>`，依据`flatMap`方法的定义，将返回`Stream<String>`，流`被扁平化`

<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-flatmap.png" width="500">

下面是 `flatmap` 的 另一个实例
```java
List<Integer> numbers1 = Arrays.asList(1, 2, 3);
List<Integer> numbers2 = Arrays.asList(3, 4);
Stream<Stream<Integer[]>> mapStream = numbers1.stream() // Stream<Integer>
                                              .map(i ->
                                                    numbers2.stream() // Stream<Integer>
                                                    .map(j -> new Integer[]{i, j}) // Stream<Integer[]>
                                               ); // Stream<Stream<Integer[]>>
// flatMap 相对于 map，相当于抹去了一层 Stream
Stream<Integer[]> flatMapStream = numbers1.stream() // Stream<Integer>
                                          .flatMap(i ->
                                                    numbers2.stream() // Stream<Integer>
                                                    .map(j -> new Integer[]{i, j}) // Stream<Integer[]>
                                                ); // Stream<Integer[]>

assertEquals(2, numbers1.stream() // Stream<Integer>
                        .flatMap(i ->
                            numbers2.stream() // Stream<Integer>
                                    .map(j -> new Integer[]{i, j})) // Stream<Integer[]>
                        .filter(ints -> (ints[0] + ints[1]) % 3 == 0) // Stream<Integer[]> ，只有(2,4)和(3,3)匹配
                        .count()); // long
```



# 查找与匹配

## 查找
```java
@Test(expected = IllegalArgumentException.class)
public void findTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
   Optional<Integer> first = numbers.stream() // Stream<Integer>
                                    .map(x -> x * x + 2) // Stream<Integer>
                                    .filter(x -> x % 3 == 0) // Stream<Integer>
                                    .findFirst(); // Optional<Integer>
   first.orElseThrow(() -> new RuntimeException("error"));

   Optional<Integer> any = numbers.stream() // Stream<Integer>
                                    .map(x -> x * x) // Stream<Integer>
                                    .filter(x -> x % 7 == 0) // Stream<Integer>
                                    .findAny(); // Optional.EMPTY
   any.orElseThrow(() -> new IllegalArgumentException("error"));
}
```

## 匹配
```java
@Test
public void matchTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
   assertFalse(numbers.stream() // Stream<Integer>
                      .anyMatch(x -> x > 10)); // boolean
   assertFalse(numbers.stream() // Stream<Integer>
                      .noneMatch(x -> x < 10)); // boolean
   assertTrue(numbers.stream() // Stream<Integer>
                      .allMatch(x -> x < 10)); // boolean
}
```

# 归约

## 求和
```java
@Test(expected = RuntimeException.class)
public void sumTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(Integer.valueOf(15), numbers.stream() // Stream<Integer>
                                            .reduce(0, (x, y) -> x + y)); // Integer
   // 更简洁的写法Integer::sum（方法引用）
   assertEquals(Integer.valueOf(15), numbers.stream().reduce(0, Integer::sum)); // Integer::sum从 Jdk8 开始引入

   numbers.clear();
   Optional<Integer> sum = numbers.stream() // Stream<Integer>
                                  .reduce((x, y) -> x + y); // Optional<Integer>，无初始值，当numbers为空时，返回Optional.EMPTY
   sum.orElseThrow(() -> new RuntimeException("no init value"));
}
```

<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-reduce-sum.png" width="500">

## 最大值和最小值
```java
@Test
public void maxMinTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(Integer.valueOf(5), numbers.stream().reduce((x, y) -> Integer.max(x, y)).get());
   // 方法引用，Lambda语法糖
   assertEquals(Integer.valueOf(5), numbers.stream() // Stream<Integer>
                                           .reduce(Integer::max) // Optional<Integer>
                                           .get());
   assertEquals(Integer.valueOf(1), numbers.stream().reduce(Integer::min).get());

   assertEquals(Integer.valueOf(5), numbers.stream().max((x, y) -> x.compareTo(y)).get());
   // 方法引用
   assertEquals(Integer.valueOf(5), numbers.stream() // Stream<Integer>
                                           .max(Integer::compareTo) // Optional<Integer>
                                           .get());
   assertEquals(Integer.valueOf(1), numbers.stream().min(Integer::compareTo).get());
}
```

<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-reduce-maxmin.png" width="500">


## 总数
```java
@Test
public void countTest() {
   List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
   // Map-Reduce
   assertEquals(Integer.valueOf(5), numbers.stream() // Stream<Integer>
                                           .map(integer -> 1) // Stream<Integer>，Map
                                           .reduce(0, Integer::sum)); // Integer，Reduce
   // 通过reduce 实现与 count 一样的功能
   assertEquals(5, numbers.stream().count());
}
```

# 数值流
1. 前面涉及到`Stream<String>`、`Stream<Integer>`的都是`对象流`，隐含`装箱`和`拆箱`成本
2. `数值流`是`对象流的原始类型特化`，如 `IntStream`，没有`装箱`和`拆箱`成本

```java
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
Stream<Integer> objStream = numbers.stream(); // 对象流，隐含装箱和拆箱成本
Optional<Integer> reduce = objStream.reduce(Integer::max); // Optional<Integer>
assertEquals(Integer.valueOf(5), reduce.get());

IntStream intStream = numbers.stream().mapToInt(Integer::intValue);
OptionalInt max = intStream.max();
assertEquals(5, max.getAsInt()); // 数值流，没有装箱和拆箱成本
Stream<Integer> boxed = numbers.stream().mapToInt(Integer::intValue).boxed(); // 对象流
```

# 构建流

## 有限流

### 值
```java
@Test
public void buildFromValueTest() {
   // <T> Stream<T> of(T... values)
   Stream<String> stringStream = Stream.of("zhong", "ming", "mao");
   assertEquals(3, stringStream.count());

   // <T> Stream<T> empty()
   Stream<Object> objectStream = Stream.empty();
   assertEquals(0, objectStream.count());

   // IntStream of(int... values) { return Arrays.stream(values); }
   IntStream intStream = IntStream.of(1, 2, 3);
   assertEquals(3, intStream.max().getAsInt());
}
```

### 数组
```java
@Test
public void buildFromArrayTest() {
   int[] intArray = {1, 2, 3, 4, 5, 6, 7};
   // IntStream stream(int[] array)
   IntStream intStream = Arrays.stream(intArray);
   assertEquals(3, intStream.filter(x -> x % 2 == 0).count());

   Integer[] integerArray = {1, 2, 3, 4, 5, 6, 7};
   // <T> Stream<T> stream(T[] array)
   Stream<Integer> integerStream = Arrays.stream(integerArray);
   assertEquals(4, integerStream.filter(x -> x % 2 == 1).count());
}
```

### 文件
```java
@Test
public void buildFromFileTest() throws IOException {
   String relativePath = "/tmp.txt"; // src/test/resources/tmp.txt
   String absPath = this.getClass().getResource(relativePath).getPath(); // 绝对路径
   // Stream<String> lines(Path path, Charset cs) throws IOException
   Stream<String> stringStream = Files.lines(Paths.get(absPath), Charset.defaultCharset()); // Stream<String>，元素为文件中的每一行
   assertEquals(9, stringStream.flatMap(s -> Arrays.stream(s.split("\\s+"))) // 扁平化流，Stream<String>，元素为单词
                               .distinct() // Stream<String>
                               .count()); // long
}
```

### range + rangeClosed
```java
@Test
public void buildFromRangeTest() {
   IntStream intStream = IntStream.range(0, 10);
   assertEquals(5, intStream.filter(value -> value % 2 == 0).count());

   intStream = IntStream.rangeClosed(0, 10);
   assertEquals(6, intStream.filter(value -> value % 2 == 0).count());
}
```
## 无限流

### iterate
```java
@Test
public void buildFromIterateTest() {
   // 偶数数列
   // <T> Stream<T> iterate(final T seed, final UnaryOperator<T> f)
   Stream<Integer> integerStream = Stream.iterate(0, x -> x + 2);
   assertEquals(20, integerStream.limit(5).mapToInt(Integer::intValue).sum());

   // 偶数数列
   // IntStream iterate(final int seed, final IntUnaryOperator f)
   IntStream intStream = IntStream.iterate(0, x -> x + 2);
   assertEquals(20, intStream.limit(5).sum());

   // 斐波那契数列
   Stream<int[]> intArrayStream = Stream.iterate(new int[]{0, 1}, // T
                                                    fibArray -> new int[]{fibArray[1], fibArray[0] + fibArray[1]}); // UnaryOperator<T>
   assertEquals(5, intArrayStream.mapToInt(fib -> fib[1]).limit(5).max().getAsInt());
}
```

### generate
```java
@Test
public void buildFromGenerateTest() {
   // <T> Stream<T> generate(Supplier<T> s)
   Stream<Integer> integerStream = Stream.generate(() -> (int) (Math.random() * 1000));
   // IntStream generate(IntSupplier s)
   IntStream intStream = IntStream.generate(() -> (int) (Math.random() * 1000));

   // 斐波那契数列
   integerStream = Stream.generate(new Supplier<Integer>() {

       private int pre = 0;
       private int cur = 1;

       @Override
       public Integer get() {
           int next = pre + cur;
           pre = cur;
           cur = next;
           return pre;
       }
   });
   assertEquals(5, integerStream.mapToInt(Integer::intValue).limit(5).max().getAsInt());

   intStream = IntStream.generate(new IntSupplier() {
       private int pre = 0;
       private int cur = 1;

       @Override
       public int getAsInt() {
           int next = pre + cur;
           pre = cur;
           cur = next;
           return pre;
       }
   });
   assertEquals(5, intStream.limit(5).max().getAsInt());
}
```

# 收集
`收集器`（`Collector`）会对`流中的元素`应用一个`转换函数`，并将结果`累积`在一个数据结构中

## 汇总

### 求和
```java
 @Test
public void sumTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(15,
                  integerList.stream()
                             .collect(Collectors.summingInt(Integer::intValue))
                             .intValue());
}
```
`<R, A> R collect(Collector<? super T, A, R> collector)`
`<T> Collector<T, ?, Integer> summingInt(ToIntFunction<? super T> mapper)`

<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-collect-sum.png" width="500">


### 总数
```java
@Test
public void countTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(3,
                integerList.stream().filter(n -> n % 2 == 1)
                           .collect(Collectors.counting())
                           .intValue());
}
```


### 最大值最小值
```java
@Test
public void maxMinTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(Integer.valueOf(5),
                                integerList.stream().filter(n -> n % 2 == 1)
                                           .collect(Collectors.maxBy(Comparator.comparingInt(Integer::intValue)))
                                           .get());
   assertEquals(Integer.valueOf(1),
                                integerList.stream().filter(n -> n % 2 == 1)
                                           .collect(Collectors.minBy(Comparator.comparing(Integer::intValue)))
                                           .get());
}
```

### 平均数
```java
@Test
public void avgTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);
   assertEquals(Double.valueOf("3.0"),
                                     integerList.stream()
                                                .collect(Collectors.averagingInt(Integer::intValue)));
}
```

### 统计数
```java
@Test
public void statisticsTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);
   IntSummaryStatistics statistics = integerList.stream()
                                                .collect(Collectors.summarizingInt(Integer::intValue));
   assertEquals(5, statistics.getCount());
   assertEquals(5, statistics.getMax());
   assertEquals(1, statistics.getMin());
   assertEquals(15, statistics.getSum());
   assertEquals(3, (int) statistics.getAverage());
}
```

### 连接字符串
```java
@Test
public void joinStrTest() {

   List<String> stringList = Arrays.asList("zhong", "ming", "mao");
   String delimiter = ",";
   String expectedStr = "";
   for (int i = 0, len = stringList.size(); i < len; i++) {
       expectedStr += stringList.get(i);
       if (i != len - 1) {
           expectedStr += delimiter;
       }
   }
   assertEquals(expectedStr,
                           stringList.stream()
                                     .collect(Collectors.joining(",")));
}
```

### 广义归约
```java
List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 5);

// <T> Collector<T, ?, Optional<T>> reducing(BinaryOperator<T> op)
assertEquals(Integer.valueOf(15),
                                integerList.stream()
                                           .collect(Collectors.reducing(Integer::sum))
                                           .get());

// <T> Collector<T, ?, T> reducing(T identity, BinaryOperator<T> op)
assertEquals(Integer.valueOf(25),
                                integerList.stream()
                                           .collect(Collectors.reducing(10, Integer::sum)));

// <T, U> Collector<T, ?, U> reducing(U identity, Function<? super T, ? extends U> mapper, BinaryOperator<U> op)
assertEquals(Integer.valueOf(50),
                                integerList.stream()
                                           .collect(Collectors.reducing(20, // identity
                                                                        n -> n * 2, // mapper
                                                                        Integer::sum))); // op
```

<img src="https://java8-1253868755.cos.ap-guangzhou.myqcloud.com/java8-stream-collect-reduce.png" width="500">


## 分组

### 单级分组
```java
@Test
public void singleGroupTest() {
   List<User> users = Arrays.asList(new User("a", 10, true),
                new User("b", 20, true), new User("c", 30, false),
                new User("d", 40, false), new User("e", 50, false),
                new User("f", 60, false), new User("g", 70, false));
   // <T, K> Collector<T, ?,Map<K, List<T>>> groupingBy(Function<? super T, ? extends K> classifier)
   Map<Boolean, List<User>> listMap = users.stream()
                                           .collect(Collectors.groupingBy(User::isStudent));
   assertEquals(2, listMap.size());
   assertEquals(5, listMap.get(false).size());
   assertEquals(2, listMap.get(true).size());
}
```

### 多级分组
```java
@Test
public void multiGroupTest() {
    List<User> users = Arrays.asList(new User("a", 10, true),
                new User("b", 20, true), new User("c", 30, false),
                new User("d", 40, false), new User("e", 50, false),
                new User("f", 60, false), new User("g", 70, false));
   // <T, K, A, D> Collector<T, ?, Map<K, D>> groupingBy(Function<? super T, ? extends K> classifier, Collector<? super T, A, D> downstream)
   Map<User.TYPE, Map<Boolean, List<User>>> mapMap =
   users.stream().collect(
            Collectors.groupingBy(user -> user.getAge() > 50 ? User.TYPE.OLD : User.TYPE.YOUNG, // 第一层 Key
            Collectors.groupingBy(User::isStudent))); // 第二层 Key

   assertEquals(2, mapMap.size());
   assertEquals(1, mapMap.get(User.TYPE.OLD).size());
   assertEquals(2, mapMap.get(User.TYPE.YOUNG).size());
   assertFalse(mapMap.get(User.TYPE.OLD).containsKey(Boolean.TRUE));
   assertEquals(2, mapMap.get(User.TYPE.OLD).get(Boolean.FALSE).size());
   assertEquals(2, mapMap.get(User.TYPE.YOUNG).get(Boolean.TRUE).size());
   assertEquals(3, mapMap.get(User.TYPE.YOUNG).get(Boolean.FALSE).size());
}
```

### 按子组收集
```java
@Test
public void groupCollectTest() {
   Map<User.TYPE, Long> typeLongMap = users.stream().collect(
                                            Collectors.groupingBy(user -> user.getAge() > 50 ? User.TYPE.OLD : User.TYPE.YOUNG,
                                            Collectors.counting())); // 子组内总数
   assertEquals(2, typeLongMap.size());
   assertEquals(2, typeLongMap.get(User.TYPE.OLD).intValue());
   assertEquals(5, typeLongMap.get(User.TYPE.YOUNG).intValue());

   Map<User.TYPE, Double> typeDoubleMap = users.stream().collect(
                                            Collectors.groupingBy(user -> user.getAge() > 50 ? User.TYPE.OLD : User.TYPE.YOUNG,
                                            Collectors.averagingInt(User::getAge))); // 子组内平均年龄
   assertEquals(2, typeDoubleMap.size());
   assertEquals(1, typeDoubleMap.get(User.TYPE.OLD).compareTo(typeDoubleMap.get(User.TYPE.YOUNG)));
}
```

## 分区
```java
@Test
public void partitioningTest() {
   Map<Boolean, List<User>> listMap = users.stream().collect(
                                            Collectors.partitioningBy(User::isStudent));
   assertEquals(2, listMap.size());
   assertEquals(2, listMap.get(Boolean.TRUE).size());
   assertEquals(5, listMap.get(Boolean.FALSE).size());

   Map<Boolean, Map<Boolean, List<User>>> map = users.stream().collect(
                                            Collectors.partitioningBy(user -> user.getAge() > 50 ? true : false,
                                            Collectors.partitioningBy(User::isStudent)));
   assertEquals(2, map.size());
   assertEquals(2, map.get(Boolean.TRUE).size());
   assertEquals(2, map.get(Boolean.FALSE).size());
   assertEquals(2, map.get(Boolean.FALSE).get(Boolean.TRUE).size());
   assertEquals(3, map.get(Boolean.FALSE).get(Boolean.FALSE).size());
}
```

## 收集器

### 接口定义
```java
public interface Collector<T, A, R> {
    // T：流中的元素； A：用于累加器处理对象的类型； R：返回类型
    Supplier<A> supplier(); // 生成累加器
    BiConsumer<A, T> accumulator(); // 累加操作
    BinaryOperator<A> combiner(); // 合并操作，对流的子部分如何进行并行合并
    Function<A, R> finisher(); // 最终转换
    Set<Characteristics> characteristics(); // 定义收集器的行为

    enum Characteristics { // 不是很理解，请大神指教
        CONCURRENT,
        UNORDERED,
        IDENTITY_FINISH
    }
}
```

### 自定义收集器
```java
// 自定义收集器，最终转换为 Set<T>
public class CustomCollector<T> implements Collector<T, List<T>, Set<T>> {

    @Override
    public Supplier<List<T>> supplier() {
        // 累加器实例
        return ArrayList::new;
    }

    @Override
    public BiConsumer<List<T>, T> accumulator() {
        // 将流中的元素添加到容器
        return List::add;
    }

    @Override
    public BinaryOperator<List<T>> combiner() {
        // 合并两个（部分）结果容器，主要用于并发
        return (list1, list2) -> {
            list1.addAll(list2);
            return list1;
        };
    }

    @Override
    public Function<List<T>, Set<T>> finisher() {
        // 对结果容器的最终转换
        return list -> {
            Set<T> finalSet = new HashSet<>();
            finalSet.addAll(list);
            return finalSet;
        };
    }

    @Override
    public Set<Characteristics> characteristics() {
        return Collections.unmodifiableSet(EnumSet.of(Characteristics.CONCURRENT));
    }
}
```
```java
@Test
public void customCollectorTest() {
   List<Integer> integerList = Arrays.asList(1, 2, 3, 4, 3, 2, 1);
   Set<Integer> set = integerList.stream().collect(new CustomCollector<>());
   assertEquals(4, set.size());
}
```

# 并行流
这里仅简单介绍`并行流的使用`，平时一般不使用（因为数据量往往不够大，发挥并行优势有比较多的限制条件，`顺序流`基本能应付日常开发的需求）

## 简单使用
```java
public static long sum(int m) {
   return Stream.iterate(1, n -> n + 1).limit(m)
           .parallel() // 标记为顺序流，只是设置boolean标志位， 只有最后一个parallel或sequential有意义
           .filter(n -> n % 2 == 0)
           .sequential() // 标记为并行流，冗余设置
           .map(integer -> integer * 3)
           .parallel() // 最后一个parallel或sequential影响整个流水线
           .reduce(0, Integer::sum);
}
```

## 性能比较
```java
public static int iterativeSum(int n) {
   // 原始类型，无需拆箱和装箱操作
   int result = 0;
   for (int i = 0; i < n; i++) {
       result += i;
   }
   return result;
}

public static int sequentialSum(int m) {
   // 对象顺序流，需要拆箱和装箱操作
   return Stream.iterate(0, n -> n + 1).limit(m).reduce(0, Integer::sum);
}

public static int iterativeParallelSum(int m) {
   // 对象并行流，需要拆箱和装箱操作
   // 很难将iterate操作划分成独立块来并行处理，因为每次计算依赖上一次的计算结果
   // 将流标记为并行，反而增加了开销
   // 最慢
   return Stream.iterate(0, n -> n + 1).limit(m).parallel().reduce(0, Integer::sum);
}

public static int rangesequentialSum(int m) {
   // 数值顺序流，无需拆箱和装箱操作
   // 比iterativeParallelSum快 -> 首先选择合适的数据结构，再考虑是否使用并行流
   return IntStream.range(0, m).reduce(0, Integer::sum);
}

public static int rangeParallelSum(int m) {
   // 数值并行流，无需拆箱和装箱操作
   // range操作能够很方便地进行并行处理（RangeIntSpliterator，属于内部原理 Fork/Join的范畴，后续研究）
   // 最快
   return IntStream.range(0, m).parallel().reduce(0, Integer::sum);
}
```

<!-- indicate-the-source -->
