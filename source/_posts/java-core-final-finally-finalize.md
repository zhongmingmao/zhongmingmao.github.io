---
title: Java核心 -- final + finally + finalize
date: 2019-02-25 10:10:11
categories:
    - Java
    - Core
tags:
    - Java
    - Java Core
---

## final
1. 修饰**类**，代表不可以**继承扩展**
2. 修饰**变量**，代表变量不可以**修改**
3. 修饰**方法**，代表方法不可以**重写**

<!-- more -->

### 实践
1. 推荐使用`final`关键字来**明确表示**代码的语义和逻辑意图
2. 将方法或类声明为`final`，明确表示不允许重写或继承
3. 使用`final`修饰参数或变量，能够避免意外赋值而导致的编程错误
4. `final`变量产生了某种程度的**不可变**（immutable）的效果，可以用于保护只读数据
5. 现在`JVM`足够智能，_**`final`对性能的影响，在大部分情况下，都没有必要考虑**_，应用程序更应该关注的是**语义**

### final != immutable
Java目前没有**原生的immutable支持**
```java
// final只能约束strList这个引用不可以被赋值，但strList对象本身的行为是不受影响的
final List<String> strList = new ArrayList<>();
strList.add("Hello");
strList.add("World");
// since 9
List<String> unmodifiableStrList = List.of("Hello", "world");
// throw java.lang.UnsupportedOperationException
unmodifiableStrList.add("again");
```

### immutable类
1. `final class`
2. 所以成员变量定义为`private final`，并且不要实现`setter`方法
3. 构造对象时，成员变量使用**深度拷贝**来初始化
    - 防御编程：因为无法确保输入对象不会被其它线程修改
4. 如果需要实现`getter`，使用`copy-on-write`原则

## finally
1. 保证重点代码**一定要被执行**的一种机制
2. `try-finally`和`try-catch-finally`
3. `try-with-resources`（JDK 7引入）

```java
try {
    System.exit(-1);
} finally {
    // 不会执行
    System.out.println("Print from finally");
}
```

## finalize
1. `java.lang.Object`中的一个`protected`方法
2. 设计目标：_**保证对象在被GC前完成特定资源的回收**_
3. 不推荐使用，在`JDK 9`中已经被标记为`@Deprecated(since="9")`
4. **无法保证`finalize()`何时会执行，执行的结果是否符合预期**
    - 如果使用不当会影响性能，导致程序死锁、挂起等问题
5. 一旦实现类非空的`finalize`方法，会导致对象回收呈现**数量级**上的变慢（40~50倍）
6. 实现了`finalize`方法的对象是**特殊公民**，JVM需要对它们进行额外的处理
    - `finalize`本质上成为了**快速回收的阻碍者**
    - 可能导致对象经过多个**GC周期**才能被回收
7. `System.runFinalization()`同样是不可预测的
8. 实践中，`finalize`会拖慢GC，导致**大量对象堆积**，有可能导致`OOM`
9. 对于消耗非常高频的资源，不要指望`finalize`去承担释放资源的主要职责
    - 推荐做法：**资源用完即显式释放**，或者利用**资源池**来复用
10. 另外，`finalize`会**掩盖资源回收时的出错信息**

```java java.lang.ref.Finalizer
// Throwable被生吞
private void runFinalizer(JavaLangAccess jla) {
    ...
    try {
        Object finalizee = this.get();
        if (finalizee != null && !(finalizee instanceof java.lang.Enum)) {
            jla.invokeFinalize(finalizee);
            // Clear stack slot containing this variable, to decrease
            // the chances of false retention with a conservative GC
            finalizee = null;
        }
    } catch (Throwable x) { }
    super.clear();
}
```

### 替代方案 -- Cleaner
1. Java平台逐渐使用`java.lang.ref.Cleaner`替换掉原有的`finalize`实现
2. `Cleaner`的实现利用了**幻象引用**（Phantom Reference）
    - 利用**幻象引用**和**引用队列**，保证对象被**销毁之前**做一些类似资源回收的工作
3. `Cleaner`比`finalize`更加**轻量**，更加**可靠**
4. 每个`Cleaner`的操作都是**独立**的，都有**自己的运行线程**，可以**避免意外死锁**等问题
5. 从**可预测**的角度来判断，`Cleaner`或者**幻象引用**改善的程度依然是有限的
    - 由于种种原因导致**幻象引用堆积**，同样会出现问题
    - `Cleaner`适合作为**最后的保证手段**，而**不能完全依赖**`Cleaner`进行资源回收

```java
public class CleaningExample implements AutoCloseable {
    // A cleaner, preferably one shared within a library
    private static final Cleaner cleaner = Cleaner.create();

    // State定义为static，为了避免由于普通的内部类隐含对外部对象的强引用，而导致外部对象无法进入幻象可达的状态
    static class State implements Runnable {
        State() {
            // initialize State needed for cleaning action
        }

        @Override
        public void run() {
            // cleanup action accessing State, executed at most once
        }
    }

    private final State state;
    private final Cleaner.Cleanable cleanable;

    public CleaningExample() {
        this.state = new State();
        this.cleanable = cleaner.register(this, state);
    }

    @Override
    public void close() {
        cleanable.clean();
    }
}
```

<!-- indicate-the-source -->
