---
title: 并发 - JUC - Atomic包 - 源码剖析
date: 2016-08-06 00:06:25
categories:
    - 网易这两年
    - 并发
tags:
    - 网易这两年
    - 并发
    - JUC
---

{% note info %}
本文主要介绍`java.util.concurrent.atomic`包下的`AtomicInteger`、`AtomicReference`、`AtomicIntegerArray`、`AtomicIntegerFieldUpdater`和`AtomicStampedReference`
代码托管在https://github.com/zhongmingmao/concurrent_demo
关于`Unsafe`类的内容请参考「并发 - Unsafe类的简单使用」，本文不在赘述
{% endnote %}

<!-- more -->



# AtomicInteger
`AtomicBoolean`、`AtomicInteger`和`AtomicLong`都是通过`原子方式`更新`基本类型`，实现原理类似，下面以**`AtomicInteger`**为例进行分析

## 源码概要
```Java
public class AtomicInteger extends Number implements java.io.Serializable {
    // 获取Unsafe实例
    private static final Unsafe unsafe = Unsafe.getUnsafe();
    // value在AtomicInteger中的偏移量，通过unsafe实现，具体见下面static{}块中的实现
    private static final long valueOffset;
    static {
        try {
            valueOffset = unsafe.objectFieldOffset(AtomicInteger.class.getDeclaredField("value"));
        } catch (Exception ex) { throw new Error(ex); }
    }
    // AtomicInteger封装int变量value，volatile变量
    private volatile int value;
    // 获取当前最新值value
    public final int get() {
        return value;
    }
    // 设置value为newValue
    public final void set(int newValue) {
        value = newValue;
    }
    // 最终设置value为newValue，其他线程在之后的一小段时间内有可能仍然获取得到的是旧值value
    public final void lazySet(int newValue) {
        unsafe.putOrderedInt(this, valueOffset, newValue);
    }
    // 设置新值newValue并返回旧值，底层CAS操作
    public final int getAndSet(int newValue) {
        return unsafe.getAndSetInt(this, valueOffset, newValue);
    }
    // 如果当前值value为expect，则value设置为update，底层CAS操作
    public final boolean compareAndSet(int expect, int update) {
        return unsafe.compareAndSwapInt(this, valueOffset, expect, update);
    }
    // 当前值value加1，返回旧值，底层CAS操作
    public final int getAndIncrement() {
        return unsafe.getAndAddInt(this, valueOffset, 1);
    }
    // 当前值value减1，返回旧值，底层CAS操作
    public final int getAndDecrement() {
        return unsafe.getAndAddInt(this, valueOffset, -1);
    }
    // 当前值value加delta，返回旧值，底层CAS操作
    public final int getAndAdd(int delta) {
        return unsafe.getAndAddInt(this, valueOffset, delta);
    }
    // 当前值value加1，返回新值，底层CAS操作
    public final int incrementAndGet() {
        return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
    }
    // 当前值value减1，返回新值，底层CAS操作
    public final int decrementAndGet() {
        return unsafe.getAndAddInt(this, valueOffset, -1) - 1;
    }
    // 当前值value加delta，返回新值，底层CAS操作
    public final int addAndGet(int delta) {
        return unsafe.getAndAddInt(this, valueOffset, delta) + delta;
    }
    // 当前值value应用函数式接口IntUnaryOperator进行更新，返回旧值，底层CAS操作
    public final int getAndUpdate(IntUnaryOperator updateFunction) {
        int prev, next;
        do {
            prev = get();
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSet(prev, next));
        return prev;
    }
    // 当前值value应用函数式接口IntUnaryOperator进行更新，返回新值，底层CAS操作
    public final int updateAndGet(IntUnaryOperator updateFunction) {
        int prev, next;
        do {
            prev = get();
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSet(prev, next));
        return next;
    }
    // 当前值value应用函数式接口IntBinaryOperator进行运算，返回旧值，底层CAS操作
    public final int getAndAccumulate(int x,
                                      IntBinaryOperator accumulatorFunction) {
        int prev, next;
        do {
            prev = get();
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSet(prev, next));
        return prev;
    }
    // 当前值value应用函数式接口IntBinaryOperator进行运算，返回新值，底层CAS操作
    public final int accumulateAndGet(int x,
                                      IntBinaryOperator accumulatorFunction) {
        int prev, next;
        do {
            prev = get();
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSet(prev, next));
        return next;
    }
}
```
有源码概要可知，`AtomicInteger`内部基于`Unsafe的CAS方法`实现（**`无锁`**），下面分析有代表性的`incrementAndGet()`方法

## incrementAndGet()
AtomicInteger
```Java
// 当前值value加1，返回新值，底层CAS操作
public final int incrementAndGet() {
   return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}
```
Unsafe
```Java
// 1.8新增，给定对象o，根据获取内存偏移量指向的字段，将其增加delta，
// 这是一个CAS操作过程，直到设置成功方能退出循环，返回旧值
public final int getAndAddInt(Object o, long offset, int delta) {
   int v;
   do {
       v = getIntVolatile(o, offset);
   } while (!compareAndSwapInt(o, offset, v, v + delta));
   return v;
}
```

## 简单使用

### 并发安全
```Java
/**
 * 验证基于CAS实现的AtomicInteger是否并发安全
 */
public class AtomicIntegerCAS {
    private static final int THREAD_COUNT = 4;
    private static final long TASK_COUNT = 500 * 1000 * 1000;
    
    public static void main(String[] args) throws NoSuchFieldException, InterruptedException {
        AtomicInteger counter = new AtomicInteger();
        
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> LongStream.range(0, TASK_COUNT)
                        .forEach(j -> counter.incrementAndGet())));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);
        
        // 基于CAS实现的AtomicInteger能保证并发安全
        System.out.println(counter.get()); // 2,000,000,000 = THREAD_COUNT * TASK_COUNT
    }
}
```

### CAS与synchronized
```Java
/**
 * 比对CAS(无锁)和synchronize(锁)速度
 */
public class CasAndsynchronizedTest {
    private static final int THREAD_COUNT = 4;
    private static final long TASK_COUNT = 100 * 1000 * 1000;
    
    @Data
    static class Counter {
        private long count;
        
        public synchronized long incrementAndGet() {
            return ++count;
        }
    }
    
    private static void runWithCas() throws InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        AtomicInteger counter = new AtomicInteger();
        
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> LongStream.range(0, TASK_COUNT)
                        .forEach(j -> counter.incrementAndGet())));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);
        System.out.println(String.format("cas takes %sms",
                Duration.between(start, LocalDateTime.now()).toMillis())); // cas takes 6552ms
    }
    
    private static void runWithSynchronized() throws InterruptedException {
        LocalDateTime start = LocalDateTime.now();
        Counter counter = new Counter();
        
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> LongStream.range(0, TASK_COUNT)
                        .forEach(j -> counter.incrementAndGet())));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);
        System.out.println(String.format("synchronized takes %sms",
                Duration.between(start, LocalDateTime.now()).toMillis())); // synchronized takes 17974ms
    }
    
    public static void main(String[] args) throws NoSuchFieldException, InterruptedException {
        runWithCas();
        runWithSynchronized();
    }
}
```
基于`CAS（无锁）`和基于`synchronized（有锁）`两个一样的计数程序，性能差异大致是`2.74`，测试不够全面，这里只为说明两者的性能差异

# AtomicReference

## 源码概要
跟`AtomicInteger`类似的内容不再标注
```Java
// AtomicReference是一个泛型类（虽然Java是伪泛型）
public class AtomicReference<V> implements java.io.Serializable {
    private static final Unsafe unsafe = Unsafe.getUnsafe();
    private static final long valueOffset;
    static {
        try {
            valueOffset = unsafe.objectFieldOffset
                (AtomicReference.class.getDeclaredField("value"));
        } catch (Exception ex) { throw new Error(ex); }
    }
    // volatile变量
    private volatile V value;
    public final V get() {
        return value;
    }
    public final void set(V newValue) {
        value = newValue;
    }
    public final void lazySet(V newValue) {
        unsafe.putOrderedObject(this, valueOffset, newValue);
    }
    // 底层CAS操作
    public final boolean compareAndSet(V expect, V update) {
        return unsafe.compareAndSwapObject(this, valueOffset, expect, update);
    }
    // 底层CAS操作
    @SuppressWarnings("unchecked")
    public final V getAndSet(V newValue) {
        return (V)unsafe.getAndSetObject(this, valueOffset, newValue);
    }
    // 底层CAS操作
    public final V getAndUpdate(UnaryOperator<V> updateFunction) {
        V prev, next;
        do {
            prev = get();
            next = updateFunction.apply(prev);
        } while (!compareAndSet(prev, next));
        return prev;
    }
    // 底层CAS操作
    public final V updateAndGet(UnaryOperator<V> updateFunction) {
        V prev, next;
        do {
            prev = get();
            next = updateFunction.apply(prev);
        } while (!compareAndSet(prev, next));
        return next;
    }
    // 底层CAS操作
    public final V getAndAccumulate(V x,
                                    BinaryOperator<V> accumulatorFunction) {
        V prev, next;
        do {
            prev = get();
            next = accumulatorFunction.apply(prev, x);
        } while (!compareAndSet(prev, next));
        return prev;
    }
    // 底层CAS操作
    public final V accumulateAndGet(V x,
                                    BinaryOperator<V> accumulatorFunction) {
        V prev, next;
        do {
            prev = get();
            next = accumulatorFunction.apply(prev, x);
        } while (!compareAndSet(prev, next));
        return next;
    }
}
```
`AtomicReference`与`AtomicInteger`类似，都是基于`CAS`的`无锁`实现

## 简单使用
```Java
public class AtomicReferenceDemo {
    @Data
    @AllArgsConstructor
    static class User {
        private String name;
        private String location;
    }
    
    public static void main(String[] args) {
        AtomicReference<User> atomicReference = new AtomicReference<>();
        User expectUser = new User("zhongmingmao", "ZhongShan");
        atomicReference.set(expectUser);
        User updateUser = new User("zhongmingwu", "GuangZhou");
        
        expectUser.setLocation("HangZhou"); // 修改实例域不影响结果
        boolean casOK = atomicReference.compareAndSet(expectUser, updateUser);
        System.out.println(casOK); // true
        System.out.println(atomicReference.get()); // AtomicReferenceDemo.User(name=zhongmingwu, location=GuangZhou)
    }
}
```

# AtomicIntegerArray
`AtomicIntegerArray`、`AtomicLongArray`和`AtomicReferenceArray`都是通过`原子方式`更新`数组里的某个元素`，实现原理类似，下面以**`AtomicIntegerArray`**为例进行分析

## 源码概要
跟`AtomicInteger`类似的内容不再标注
```Java
public class AtomicIntegerArray implements java.io.Serializable {
    private static final Unsafe unsafe = Unsafe.getUnsafe();
    // array[0]的偏移量
    private static final int base = unsafe.arrayBaseOffset(int[].class);
    // 数组元素占用空间大小，用2取对数
    private static final int shift;
    // final修饰符保证内存可见性（对象被正确构造且this没有逃逸，其他线程能看到final域在构造函数中被初始化之后的值）
    // See http://ifeve.com/java-memory-model/
    private final int[] array;
    static {
        // int类型占用空间大小，4 Bytes
        int scale = unsafe.arrayIndexScale(int[].class);
        if ((scale & (scale - 1)) != 0)
            throw new Error("data type scale not a power of two");
        // shift = 2
        shift = 31 - Integer.numberOfLeadingZeros(scale);
    }
    // array[i]的偏移量
    private long checkedByteOffset(int i) {
        if (i < 0 || i >= array.length)
            throw new IndexOutOfBoundsException("index " + i);

        return byteOffset(i);
    }
    // array[i]的偏移量
    private static long byteOffset(int i) {
        return ((long) i << shift) + base;
    }
    public AtomicIntegerArray(int length) {
        array = new int[length];
    }
    public AtomicIntegerArray(int[] array) {

        this.array = array.clone();
    }
    // 获取数组长度
    public final int length() {
        return array.length;
    }
    // 以volatile语义获取array[i]
    public final int get(int i) {
        return getRaw(checkedByteOffset(i));
    }
    // 以volatile语义获取数组array中偏移为offset的int值
    private int getRaw(long offset) {
        return unsafe.getIntVolatile(array, offset);
    }
    // 以volatile语义设置array[i]=newValue
    public final void set(int i, int newValue) {
        unsafe.putIntVolatile(array, checkedByteOffset(i), newValue);
    }
    public final void lazySet(int i, int newValue) {
        unsafe.putOrderedInt(array, checkedByteOffset(i), newValue);
    }
    // 设置array[i]=newValue，底层CAS操作
    public final int getAndSet(int i, int newValue) {
        return unsafe.getAndSetInt(array, checkedByteOffset(i), newValue);
    }
    // 设置array[i]=update，底层CAS操作
    public final boolean compareAndSet(int i, int expect, int update) {
        return compareAndSetRaw(checkedByteOffset(i), expect, update);
    }
    // 设置array中偏移为offset的int值为update，底层CAS操作
    private boolean compareAndSetRaw(long offset, int expect, int update) {
        return unsafe.compareAndSwapInt(array, offset, expect, update);
    }
    // array[i]加1，返回旧值，底层CAS操作
    public final int getAndIncrement(int i) {
        return getAndAdd(i, 1);
    }
    // array[i]减1，返回旧值，底层CAS操作
    public final int getAndDecrement(int i) {
        return getAndAdd(i, -1);
    }
    // array[i]加delta，返回旧值，底层CAS操作
    public final int getAndAdd(int i, int delta) {
        return unsafe.getAndAddInt(array, checkedByteOffset(i), delta);
    }
    // array[i]加1，返回新值，底层CAS操作
    public final int incrementAndGet(int i) {
        return getAndAdd(i, 1) + 1;
    }
    // array[i]减1，返回新值，底层CAS操作
    public final int decrementAndGet(int i) {
        return getAndAdd(i, -1) - 1;
    }
    // array[i]加delta，返回新值，底层CAS操作
    public final int addAndGet(int i, int delta) {
        return getAndAdd(i, delta) + delta;
    }
    // array[i]应用函数式接口IntUnaryOperator进行更新，返回旧值，底层CAS操作
    public final int getAndUpdate(int i, IntUnaryOperator updateFunction) {
        long offset = checkedByteOffset(i);
        int prev, next;
        do {
            prev = getRaw(offset);
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSetRaw(offset, prev, next));
        return prev;
    }
    // array[i]应用函数式接口IntUnaryOperator进行更新，返回新值，底层CAS操作
    public final int updateAndGet(int i, IntUnaryOperator updateFunction) {
        long offset = checkedByteOffset(i);
        int prev, next;
        do {
            prev = getRaw(offset);
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSetRaw(offset, prev, next));
        return next;
    }
    // array[i]应用函数式接口IntBinaryOperator进行计算，返回旧值，底层CAS操作
    public final int getAndAccumulate(int i, int x,
                                      IntBinaryOperator accumulatorFunction) {
        long offset = checkedByteOffset(i);
        int prev, next;
        do {
            prev = getRaw(offset);
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSetRaw(offset, prev, next));
        return prev;
    }
    // array[i]应用函数式接口IntBinaryOperator进行计算，返回新值，底层CAS操作
    public final int accumulateAndGet(int i, int x,
                                      IntBinaryOperator accumulatorFunction) {
        long offset = checkedByteOffset(i);
        int prev, next;
        do {
            prev = getRaw(offset);
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSetRaw(offset, prev, next));
        return next;
    }
}
```
`AtomicIntegerArray`跟`AtomicInteger`实现原理类似，无非是由`value`变成了`array`，对数组中的`单个元素`进行`CAS`操作

## 简单使用
```Java
public class AtomicIntegerArrayDemo {
    private static final int THREAD_COUNT = 4;
    private static final int TASK_COUNT = 1000 * 1000;
    
    public static void main(String[] args) throws InterruptedException {
        AtomicIntegerArray array = new AtomicIntegerArray(THREAD_COUNT);
        
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> IntStream.range(0, TASK_COUNT)
                        .forEach(j -> array.getAndIncrement(j % THREAD_COUNT))));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);
        // CAS保证并发安全
        System.out.println(array); // [1000000, 1000000, 1000000, 1000000]
    }
}
```

# AtomicIntegerFieldUpdater
`AtomicIntegerFieldUpdater`、`AtomicLongFieldUpdater`和`AtomicReferenceFieldUpdater`都是通过`原子方式`更新`类里的字段`（让普通的变量采用原子操作），实现原理类似，下面以**`AtomicIntegerFieldUpdater`**为例进行分析，采用原子更新器的其中几个条件（详细限制条件请参考代码`AtomicIntegerFieldUpdaterImpl`）
1. 操作的字段`不能`是`static`修饰
2. 操作的字段`不能`是`final`修饰
3. 操作的字段`必须`是`volatile`修饰（`final`和`volatile`本身就无法组合在一起）
4. 操作的字段`对Updater必须可见`

## 源码概要

### AtomicIntegerFieldUpdater
```Java
public abstract class AtomicIntegerFieldUpdater<T> {
    @CallerSensitive
    public static <U> AtomicIntegerFieldUpdater<U> newUpdater(Class<U> tclass, String fieldName) {
        // 实际的实现类是AtomicIntegerFieldUpdaterImpl
        return new AtomicIntegerFieldUpdaterImpl<U>(tclass, fieldName, Reflection.getCallerClass());
    }

    protected AtomicIntegerFieldUpdater() {
    }
    public abstract boolean compareAndSet(T obj, int expect, int update);
    public abstract void set(T obj, int newValue);
    public abstract void lazySet(T obj, int newValue);
    public abstract int get(T obj);
    // 更新obj.field=newValue，返回旧值，底层CAS操作
    public int getAndSet(T obj, int newValue) {
        int prev;
        do {
            prev = get(obj);
        } while (!compareAndSet(obj, prev, newValue));
        return prev;
    }
    // obj.field加1，返回旧值，底层CAS操作
    public int getAndIncrement(T obj) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev + 1;
        } while (!compareAndSet(obj, prev, next));
        return prev;
    }
    // obj.field减1，返回旧值，底层CAS操作
    public int getAndDecrement(T obj) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev - 1;
        } while (!compareAndSet(obj, prev, next));
        return prev;
    }
    // obj.field加delta，返回旧值，底层CAS操作
    public int getAndAdd(T obj, int delta) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev + delta;
        } while (!compareAndSet(obj, prev, next));
        return prev;
    }
    // obj.field加1，返回新值，底层CAS操作
    public int incrementAndGet(T obj) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev + 1;
        } while (!compareAndSet(obj, prev, next));
        return next;
    }
    // obj.field减1，返回新值，底层CAS操作
    public int decrementAndGet(T obj) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev - 1;
        } while (!compareAndSet(obj, prev, next));
        return next;
    }
    // obj.field加delta，返回新值，底层CAS操作
    public int addAndGet(T obj, int delta) {
        int prev, next;
        do {
            prev = get(obj);
            next = prev + delta;
        } while (!compareAndSet(obj, prev, next));
        return next;
    }
    // obj.field应用函数式接口IntUnaryOperator进行更新，并返回旧值，底层CAS操作
    public final int getAndUpdate(T obj, IntUnaryOperator updateFunction) {
        int prev, next;
        do {
            prev = get(obj);
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSet(obj, prev, next));
        return prev;
    }
    // obj.field应用函数式接口IntUnaryOperator进行更新，并返回新值，底层CAS操作
    public final int updateAndGet(T obj, IntUnaryOperator updateFunction) {
        int prev, next;
        do {
            prev = get(obj);
            next = updateFunction.applyAsInt(prev);
        } while (!compareAndSet(obj, prev, next));
        return next;
    }
    // obj.field应用函数式接口IntBinaryOperator进行计算，并返回旧值，底层CAS操作
    public final int getAndAccumulate(T obj, int x,
                                      IntBinaryOperator accumulatorFunction) {
        int prev, next;
        do {
            prev = get(obj);
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSet(obj, prev, next));
        return prev;
    }
    // obj.field应用函数式接口IntBinaryOperator进行计算，并返回新值，底层CAS操作
    public final int accumulateAndGet(T obj, int x,
                                      IntBinaryOperator accumulatorFunction) {
        int prev, next;
        do {
            prev = get(obj);
            next = accumulatorFunction.applyAsInt(prev, x);
        } while (!compareAndSet(obj, prev, next));
        return next;
    }
}
```
### AtomicIntegerFieldUpdaterImpl
```Java
private static final class AtomicIntegerFieldUpdaterImpl<T> extends AtomicIntegerFieldUpdater<T> {
   private static final sun.misc.Unsafe U = sun.misc.Unsafe.getUnsafe();
   private final long offset;
   private final Class<?> cclass;
   private final Class<T> tclass;

   AtomicIntegerFieldUpdaterImpl(final Class<T> tclass, final String fieldName, final Class<?> caller) {
       final Field field; // 要原子更新的字段
       final int modifiers; // 字段修饰符
       try {
           field = AccessController.doPrivileged(
               new PrivilegedExceptionAction<Field>() {
                   public Field run() throws NoSuchFieldException {
                       return tclass.getDeclaredField(fieldName);
                   }
               });
           // 获取字段修饰符    
           modifiers = field.getModifiers();
           // 对字段的访问权限进行检查，不在访问范围内抛异常
           sun.reflect.misc.ReflectUtil.ensureMemberAccess(
               caller, tclass, null, modifiers);    
           ClassLoader cl = tclass.getClassLoader();
           ClassLoader ccl = caller.getClassLoader();
           if ((ccl != null) && (ccl != cl) &&
               ((cl == null) || !isAncestor(cl, ccl))) {
               sun.reflect.misc.ReflectUtil.checkPackageAccess(tclass);
           }
       } catch (PrivilegedActionException pae) {
           throw new RuntimeException(pae.getException());
       } catch (Exception ex) {
           throw new RuntimeException(ex);
       }
       
       // 判断是否为原生int类型
       if (field.getType() != int.class)
           throw new IllegalArgumentException("Must be integer type");
       // 判断是否被volatile修饰
       if (!Modifier.isVolatile(modifiers))
           throw new IllegalArgumentException("Must be volatile type");
       this.cclass = (Modifier.isProtected(modifiers) &&
                      tclass.isAssignableFrom(caller) &&
                      !isSamePackage(tclass, caller))
                     ? caller : tclass;
       this.tclass = tclass;
       // 获取该字段在对象内存布局中的偏移量
       this.offset = U.objectFieldOffset(field);
   }
   // second是否在first的类加载器委托链上（双亲委派模型）
   private static boolean isAncestor(ClassLoader first, ClassLoader second) {
       ClassLoader acl = first;
       do {
           acl = acl.getParent();
           if (second == acl) {
               return true;
           }
       } while (acl != null);
       return false;
   }
   // 是否具有相同的ClassLoader和包名称
   private static boolean isSamePackage(Class<?> class1, Class<?> class2) {
       return class1.getClassLoader() == class2.getClassLoader()
              && Objects.equals(getPackageName(class1), getPackageName(class2));
   }
   // 获取包名称
   private static String getPackageName(Class<?> cls) {
       String cn = cls.getName();
       int dot = cn.lastIndexOf('.');
       return (dot != -1) ? cn.substring(0, dot) : "";
   }
   // obj是否是cclass的实例
   private final void accessCheck(T obj) {
       if (!cclass.isInstance(obj))
           throwAccessCheckException(obj);
   }
   // 构建异常
   private final void throwAccessCheckException(T obj) {
       if (cclass == tclass)
           throw new ClassCastException();
       else
           throw new RuntimeException(
               new IllegalAccessException(
                   "Class " +
                   cclass.getName() +
                   " can not access a protected member of class " +
                   tclass.getName() +
                   " using an instance of " +
                   obj.getClass().getName()));
   }
   public final boolean compareAndSet(T obj, int expect, int update) {
       accessCheck(obj);
       return U.compareAndSwapInt(obj, offset, expect, update);
   }
   public final boolean weakCompareAndSet(T obj, int expect, int update) {
       accessCheck(obj);
       return U.compareAndSwapInt(obj, offset, expect, update);
   }
   public final void set(T obj, int newValue) {
       accessCheck(obj);
       U.putIntVolatile(obj, offset, newValue);
   }
   public final void lazySet(T obj, int newValue) {
       accessCheck(obj);
       U.putOrderedInt(obj, offset, newValue);
   }
   public final int get(T obj) {
       accessCheck(obj);
       return U.getIntVolatile(obj, offset);
   }
   public final int getAndSet(T obj, int newValue) {
       accessCheck(obj);
       return U.getAndSetInt(obj, offset, newValue);
   }
   public final int getAndAdd(T obj, int delta) {
       accessCheck(obj);
       return U.getAndAddInt(obj, offset, delta);
   }
   public final int getAndIncrement(T obj) {
       return getAndAdd(obj, 1);
   }
   public final int getAndDecrement(T obj) {
       return getAndAdd(obj, -1);
   }
   public final int incrementAndGet(T obj) {
       return getAndAdd(obj, 1) + 1;
   }
   public final int decrementAndGet(T obj) {
       return getAndAdd(obj, -1) - 1;
   }
   public final int addAndGet(T obj, int delta) {
       return getAndAdd(obj, delta) + delta;
   }
}
```
`AtomicIntegerFieldUpdaterImpl`依旧是基于`CAS`实现


## 简单使用
```Java
public class AtomicIntegerFieldUpdaterDemo {
    private static final int THREAD_COUNT = 4;
    private static final int TASK_COUNT = 1000 * 1000;
    
    @Data
    static class Counter {
        volatile int count; // 让原本没有原子更新能力的count具有原子更新能力
    }
    
    public static void main(String[] args) throws InterruptedException {
        AtomicIntegerFieldUpdater<Counter> fieldUpdater = AtomicIntegerFieldUpdater.newUpdater(Counter.class, "count");
        Counter counter = new Counter();
        ExecutorService pool = Executors.newFixedThreadPool(THREAD_COUNT);
        IntStream.range(0, THREAD_COUNT).forEach(i ->
                pool.submit(() -> IntStream.range(0, TASK_COUNT)
                        .forEach(j -> fieldUpdater.incrementAndGet(counter))));
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.MINUTES);
        System.out.println(counter.getCount()); // 4000000 = THREAD_COUNT * TASK_COUNT
    }
}
```

# AtomicStampedReference
`AtomicStampedReference`是为了解决`CAS中的ABA问题`

## 源码概要
```Java
public class AtomicStampedReference<V> {
    // 存储数据和时间戳
    private static class Pair<T> {
        final T reference;
        final int stamp;
        private Pair(T reference, int stamp) {
            this.reference = reference;
            this.stamp = stamp;
        }
        static <T> Pair<T> of(T reference, int stamp) {
            return new Pair<T>(reference, stamp);
        }
    }
    // Pair实例，volatile变量
    private volatile Pair<V> pair;
    // 构建Pair实例
    public AtomicStampedReference(V initialRef, int initialStamp) {
        pair = Pair.of(initialRef, initialStamp);
    }
    public V getReference() {
        return pair.reference;
    }
    public int getStamp() {
        return pair.stamp;
    }
    // 返回当前的reference和stamp
    public V get(int[] stampHolder) {
        Pair<V> pair = this.pair;
        stampHolder[0] = pair.stamp;
        return pair.reference;
    }
    // 只有旧的reference和stamp相等，才会执行casPair，底层CAS操作，是解决ABA问题的核心
    public boolean compareAndSet(V   expectedReference, V   newReference,
                                 int expectedStamp, int newStamp) {
        Pair<V> current = pair;
        return
            expectedReference == current.reference && expectedStamp == current.stamp &&
            ((newReference == current.reference && newStamp == current.stamp) 
                || casPair(current, Pair.of(newReference, newStamp)));
    }
    private boolean casPair(Pair<V> cmp, Pair<V> val) {
        return UNSAFE.compareAndSwapObject(this, pairOffset, cmp, val);
    }
    // 无条件直接更新reference和stamp
    public void set(V newReference, int newStamp) {
        Pair<V> current = pair;
        if (newReference != current.reference || newStamp != current.stamp)
            this.pair = Pair.of(newReference, newStamp);
    }
    public boolean attemptStamp(V expectedReference, int newStamp) {
        Pair<V> current = pair;
        return
            expectedReference == current.reference &&
            (newStamp == current.stamp ||
             casPair(current, Pair.of(expectedReference, newStamp)));
    }
    private static final sun.misc.Unsafe UNSAFE = sun.misc.Unsafe.getUnsafe();
    // 获取pair的偏移量
    private static final long pairOffset = objectFieldOffset(UNSAFE, "pair", AtomicStampedReference.class);
    static long objectFieldOffset(sun.misc.Unsafe UNSAFE,
                                  String field, Class<?> klazz) {
        try {
            return UNSAFE.objectFieldOffset(klazz.getDeclaredField(field));
        } catch (NoSuchFieldException e) {
            NoSuchFieldError error = new NoSuchFieldError(field);
            error.initCause(e);
            throw error;
        }
    }
}
```

## 简单使用
```Java
/**
 * 通过AtomicStampedReference解决ABA问题
 */
public class AtomicStampedReferenceDemo {
    public static void main(String[] args) throws InterruptedException {
        AtomicStampedReference<Integer> stampedReference = new AtomicStampedReference<>(10, 0);
        
        Thread t1 = new Thread(() -> { // 构造ABA问题
            int stamp = stampedReference.getStamp();
            // 要注意autoboxing
            boolean success = stampedReference.compareAndSet(10, 20, stamp, stamp + 1);
            System.out.println(String.format("thread: %s , compareAndSet success : %s , current value : %s",
                    Thread.currentThread().getName(), success, stampedReference.getReference()));
            
            stamp = stampedReference.getStamp();
            success = stampedReference.compareAndSet(20, 10, stamp, stamp + 1);
            System.out.println(String.format("thread: %s , compareAndSet success : %s , current value : %s",
                    Thread.currentThread().getName(), success, stampedReference.getReference()));
        });
        
        Thread t2 = new Thread(() -> { // 遇到ABA问题，无法更新
            int stamp = stampedReference.getStamp();
            try {
                TimeUnit.SECONDS.sleep(1);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
            boolean success = stampedReference.compareAndSet(100, 300, stamp, stamp + 1);
            System.out.println(String.format("thread: %s , compareAndSet success : %s , current value : %s",
                    Thread.currentThread().getName(), success, stampedReference.getReference()));
        });
        
        t2.start();
        TimeUnit.MILLISECONDS.sleep(200);
        t1.start();
    }
}
```

### 运行结果
```
thread: Thread-0 , compareAndSet success : true , current value : 20
thread: Thread-0 , compareAndSet success : true , current value : 10
thread: Thread-1 , compareAndSet success : false , current value : 10
```

<!-- indicate-the-source -->


