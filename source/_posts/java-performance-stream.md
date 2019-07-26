---
title: Java性能 -- Stream
mathjax: false
date: 2019-07-14 13:07:36
categories:
    - Java
    - Performance
tags:
    - Java
    - Java Performance
    - Java Stream
---

## Stream API
1. Java 8集合中的Stream相当于**高级版的Iterator**
    - Stream API通过**Lambda**表达式对集合进行各种非常便利高效的**聚合操作**，或者**大批量数据操作**
2. Stream的聚合操作与数据库**SQL**的聚合操作sorted、filter、map等非常类似
3. 在数据操作方面，Stream不仅可以通过**串行**的方式实现数据操作，还可以通过**并行**的方式处理大批量数据，提高处理效率

<!-- more -->

```java
// java.util.Collection
default Stream<E> stream() {
    return StreamSupport.stream(spliterator(), false);
}

default Stream<E> parallelStream() {
    return StreamSupport.stream(spliterator(), true);
}
```
```java
@Data
class Student {
    private Integer height;
    private String sex;
}

Map<String, List<Student>> map = Maps.newHashMap();
List<Student> list = Lists.newArrayList();

// 传统的迭代方式
for (Student student : list) {
    if (student.getHeight() > 160) {
        String sex = student.getSex();
        if (!map.containsKey(sex)) {
            map.put(sex, Lists.newArrayList());
        }
        map.get(sex).add(student);
    }
}
// Stream API，串行实现
map = list.stream().filter((Student s) -> s.getHeight() > 160).collect(Collectors.groupingBy(Student::getSex));

// Stream API，并行实现
map = list.parallelStream().filter((Student s) -> s.getHeight() > 160).collect(Collectors.groupingBy(Student::getSex));
```

## 优化遍历

### Stream操作分类
1. 分为两大类：**中间操作**（Intermediate operations）和**终结操作**（Terminal operations）
2. 中间操作只对操作进行了**记录**，即只会返回一个流，不会进行计算操作，而终结操作是实现了**计算**操作
3. 中间操作又分为**无状态**（Stateless）操作和**有状态**（Stateful）操作
    - 无状态操作：元素的处理不受之前元素的影响
    - 有状态操作：该操作只有拿到**所有元素**之后才能继续下去
4. 终结操作又分为**短路**（Short-circuiting）操作与**非短路**（UnShort-circuiting）操作
    - 短路操作：遇到某些符合条件的元素就可以得到最终结果
    - 非短路操作：必须处理完**所有元素**才能得到最终结果
5. 通常会将中间操作称为**懒操作**，正是因为懒操作结合终结操作，数据源构成的**处理管道**（Pipeline），实现了Stream的高效

<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-stream-op-type.jpg" width=1000/>

### Stream源码实现
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-stream-impl.jpg" width=1000/>

1. BaseStream和Stream为最顶端的接口类
    - BaseStream定义了**流的基本接口方法**，如spliterator、isParallel等
    - Stream定义了**流的常用操作方法**，如map、filter等
2. ReferencePipeline是一个结构类，通过**定义内部类组装各种操作流**
    - 内部定义了Head、StatelessOp和StatefulOp三个内部类，实现了BaseStream和Stream的接口方法
3. Sink接口定义**每个Stream操作之间关系**的协议，包含了begin、end、cancellationRequested、accept方法
    - ReferencePipeline最终会将整个Stream流操作组装成一个**调用链**
    - 而调用链上的每个Stream操作的**上下文关系**就是通过Sink接口来定义实现的

### Stream操作叠加
<img src="https://java-performance-1253868755.cos.ap-guangzhou.myqcloud.com/java-performance-stream-sink.jpg" width=1000/>

1. 一个Stream的各个操作是由**处理管道**组装的，并统一完成数据处理
2. 在JDK中，每次的中断操作都会以**使用阶段**（Stage）命名
3. 管道结构通常是由ReferencePipeline类实现的，ReferencePipeline包含Head、StatelessOp、StatefulOp三个内部类
    - Head类主要用来定义**数据源**操作，初次调用.stream()时，会初次加载Head对象
    - 接着加载**中间操作**，分为StatelessOp对象和StatefulOp对象
        - 此时的Stage并没有执行，而是通过AbstractPipeline生成了**中间操作的Stage链表**
    - 当调用**终结操作**时，会生成一个最终的Stage
        - 通过这个Stage触发之前的中间操作，从最后一个Stage开始，**递归产生一个Sink链**

#### 样例
```java
List<String> names = Arrays.asList("张三", "李四", "王老五", "李三", "刘老四", "王小二", "张四", "张五六七");
String maxLenStartWithZ = names.stream()
        .filter(name -> name.startsWith("张"))
        .mapToInt(String::length)
        .max()
        .toString();
```

names是ArrayList集合，names.stream会调用集合类基础接口Collection的stream方法
```java
default Stream<E> stream() {
    return StreamSupport.stream(spliterator(), false);
}
```

Collection.stream方法会调用StreamSupport.stream方法，方法中初始化了一个ReferencePipeline的Head内部类对象
```java
public static <T> Stream<T> stream(Spliterator<T> spliterator, boolean parallel) {
    Objects.requireNonNull(spliterator);
    return new ReferencePipeline.Head<>(spliterator,
                                        StreamOpFlag.fromCharacteristics(spliterator),
                                        parallel);
}
```

调用filter和map，两者都是**无状态的中间操作**，因此并没有执行任何操作，只是分别创建了一个**Stage**来**标识**用户的每一次操作
通常情况下，Stream的操作需要一个回调函数，所以一个**完整的Stage**是由**数据来源、操作、回调函数**组成的三元组表示
```java
@Override
public final Stream<P_OUT> filter(Predicate<? super P_OUT> predicate) {
    Objects.requireNonNull(predicate);
    return new StatelessOp<P_OUT, P_OUT>(this, StreamShape.REFERENCE,
                                 StreamOpFlag.NOT_SIZED) {
        @Override
        Sink<P_OUT> opWrapSink(int flags, Sink<P_OUT> sink) {
            return new Sink.ChainedReference<P_OUT, P_OUT>(sink) {
                @Override
                public void begin(long size) {
                    downstream.begin(-1);
                }

                @Override
                public void accept(P_OUT u) {
                    if (predicate.test(u))
                        downstream.accept(u);
                }
            };
        }
    };
}
```
```java
@Override
@SuppressWarnings("unchecked")
public final <R> Stream<R> map(Function<? super P_OUT, ? extends R> mapper) {
    Objects.requireNonNull(mapper);
    return new StatelessOp<P_OUT, R>(this, StreamShape.REFERENCE,
                                 StreamOpFlag.NOT_SORTED | StreamOpFlag.NOT_DISTINCT) {
        @Override
        Sink<P_OUT> opWrapSink(int flags, Sink<R> sink) {
            return new Sink.ChainedReference<P_OUT, R>(sink) {
                @Override
                public void accept(P_OUT u) {
                    downstream.accept(mapper.apply(u));
                }
            };
        }
    };
}
```

new StatelessOp会调用父类AbstractPipeline的构造函数，该构造函数会将前后的Stage联系起来，生成一个**Stage链表**
```java
AbstractPipeline(AbstractPipeline<?, E_IN, ?> previousStage, int opFlags) {
    if (previousStage.linkedOrConsumed)
        throw new IllegalStateException(MSG_STREAM_LINKED);
    previousStage.linkedOrConsumed = true;
    previousStage.nextStage = this; // 将当前的Stage的next指针指向之前的Stage

    this.previousStage = previousStage; // 赋值当前Stage当全局变量previousStage
    this.sourceOrOpFlags = opFlags & StreamOpFlag.OP_MASK;
    this.combinedFlags = StreamOpFlag.combineOpFlags(opFlags, previousStage.combinedFlags);
    this.sourceStage = previousStage.sourceStage;
    if (opIsStateful())
        sourceStage.sourceAnyStateful = true;
    this.depth = previousStage.depth + 1;
}
```

创建Stage时，会包含opWrapSink方法，该方法把一个**操作的具体实现**封装在Sink类中，Sink采用**处理->转发**的模式来**叠加操作**
调用max，会调用ReferencePipeline的max方法
由于max是**终结操作**，会创建一个**TerminalOp操作**，同时创建一个**ReducingSink**，并且将操作封装在Sink类中
```java
@Override
public final Optional<P_OUT> max(Comparator<? super P_OUT> comparator) {
    return reduce(BinaryOperator.maxBy(comparator));
}
```

最后调用AbstractPipeline的wrapSink方法，生成一个Sink链表，**Sink链表中的每一个Sink都封装了一个操作的具体实现**
```java
final <P_IN> Sink<P_IN> wrapSink(Sink<E_OUT> sink) {
    Objects.requireNonNull(sink);

    for ( @SuppressWarnings("rawtypes") AbstractPipeline p=AbstractPipeline.this; p.depth > 0; p=p.previousStage) {
        sink = p.opWrapSink(p.previousStage.combinedFlags, sink);
    }
    return (Sink<P_IN>) sink;
}
```

当Sink链表生成完成后，Stream开始执行，通过Spliterator迭代集合，执行Sink链表中的具体操作
```java
@Override
final <P_IN> void copyInto(Sink<P_IN> wrappedSink, Spliterator<P_IN> spliterator) {
    Objects.requireNonNull(wrappedSink);

    if (!StreamOpFlag.SHORT_CIRCUIT.isKnown(getStreamAndOpFlags())) {
        wrappedSink.begin(spliterator.getExactSizeIfKnown());
        spliterator.forEachRemaining(wrappedSink);
        wrappedSink.end();
    }
    else {
        copyIntoWithCancel(wrappedSink, spliterator);
    }
}
```
1. java 8中的forEachRemaining会迭代集合
2. 每迭代一次，都会执行一次filter操作，通过后就会触发map操作，然后将结果放入到**临时数组**object中，再进行下一次迭代
3. 完成中间操作后，最后触发终结操作max

### Stream并行处理
```java
List<String> names = Arrays.asList("张三", "李四", "王老五", "李三", "刘老四", "王小二", "张四", "张五六七");
String maxLenStartWithZ = names.stream()
        .parallel()
        .filter(name -> name.startsWith("张"))
        .mapToInt(String::length)
        .max()
        .toString();
```

Stream的并行处理在执行终结操作之前，跟串行处理的实现是一样的，在调用终结方法之后，会调用TerminalOp.evaluateParallel
```java
final <R> R evaluate(TerminalOp<E_OUT, R> terminalOp) {
    assert getOutputShape() == terminalOp.inputShape();
    if (linkedOrConsumed)
        throw new IllegalStateException(MSG_STREAM_LINKED);
    linkedOrConsumed = true;

    return isParallel()
           ? terminalOp.evaluateParallel(this, sourceSpliterator(terminalOp.getOpFlags()))
           : terminalOp.evaluateSequential(this, sourceSpliterator(terminalOp.getOpFlags()));
}
```
1. 并行处理指的是Stream结合了**ForkJoin**框架，对Stream处理进行了**分片**，Spliterator.estimateSize会**估算**出分片的数据量
2. 通过预估的数据量获取**最小处理单元**的阈值，如果当前分片大小大于最小处理单元的阈值，就继续切分集合
3. **每个分片都将会生成一个Sink链表**，当所有分片操作完成后，ForkJoin框架将会合并分片任何结果集

## 合理使用Stream
1. 在循环迭代次数较少的情况下，常规的迭代方式性能反而更好
2. 在单核CPU服务器配置环境中，也是常规迭代方式更有优势
3. 在**大数据循环迭代**中，如果服务器是**多核CPU**的情况，采用**Stream的并行迭代**优势明显

## 小结
1. Stream将整个操作分解成了**链式结构**，不仅**简化**了遍历操作，还为实现**并行计算**奠定了基础
2. Stream将遍历元素的操作和对元素的计算分为**中间操作**和**终结操作**
    - 中间操作又根据元素之间状态有无干扰分为**有状态操作**和**无状态操作**，实现了链式结构中的不同阶段
3. 串行处理
    - Stream在执行中间操作时，并不会做实际的数据操作处理，而是将这些中间操作串联起来，最终由终结操作触发
    - 生成一个**数据处理链表**，通过Java 8的**Spliterator迭代器**进行数据处理
4. 并行处理
    - 对中间操作的处理跟串行处理的方式是一样的，但在终结操作中，Stream将结合**ForkJoin**框架对集合进行切片处理
