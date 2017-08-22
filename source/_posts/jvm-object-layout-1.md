---
title: 对象内存布局 - Instrumentation + sa-jdi 工具构建
date: 2016-06-27 00:06:25
categories:
    - JVM
tags:
    - Netease
    - JVM
---

{% note info %}
本文首先介绍测量对象内存布局的其中一种方法，`Instrumentation` + `sa-jdi`
{% endnote %}

<!-- more -->

# 核心代码

1. 代码托管在：[https://github.com/zhongmingmao/java_object_layout](https://github.com/zhongmingmao/java_object_layout)
2. 采用`Instrumentation` + `sa-jdi`的方式需要自己编写代码，比较繁琐，`OpenJDK`提供的`JOL` (Java Object Layout) 工具则是`开箱即用`，非常方便，后续博文会进一步介绍JOL的使用

## 测量对象大小
通过`Instrumentation`测量`对象占用的空间大小`
```Java
/**
 * 对象占用字节大小工具类<br/>
 * see http://yueyemaitian.iteye.com/blog/2033046
 */
public class SizeOfObjectUtil {
    
    static Instrumentation inst;
    
    public static void premain(String args, Instrumentation instP) {
        inst = instP;
    }
    
    /**
     * 直接计算当前对象占用空间大小<br/>
     * 包括
     * <ol>
     * <li>当前类及超类的基本类型实例字段大小</li>
     * <li>引用类型实例字段引用大小</li>
     * <li>实例基本类型数组总占用空间</li>
     * <li>实例引用类型数组引用本身占用空间大小</li>
     * </ol>
     * <br/>
     * 但是不包括
     * <ol>
     * <li>超类继承下来的和当前类声明的实例引用字段的对象本身的大小</li>
     * <li>实例引用数组引用的对象本身的大小</li>
     * </ol>
     *
     * @param obj 待计算空间占用的对象
     * @return 对象占用的空间大小
     */
    public static long sizeOf(Object obj) {
        return inst.getObjectSize(obj);
    }
    
    /**
     * 递归计算当前对象占用空间总大小，包括当前类和超类的实例字段大小以及实例字段引用对象大小
     */
    public static long fullSizeOf(Object objP) throws IllegalAccessException {
        Set<Object> visited = new HashSet<>();
        Deque<Object> toBeQueue = new ArrayDeque<>();
        toBeQueue.add(objP);
        long size = 0L;
        while (toBeQueue.size() > 0) {
            Object obj = toBeQueue.poll();
            // sizeOf的时候已经计基本类型和引用的长度，包括数组
            size += skipObject(visited, obj) ? 0L : sizeOf(obj);
            Class<?> tmpObjClass = obj.getClass();
            if (tmpObjClass.isArray()) {
                // [I , [F 基本类型名字长度是2
                if (tmpObjClass.getName().length() > 2) {
                    for (int i = 0, len = Array.getLength(obj); i < len; i++) {
                        Object tmp = Array.get(obj, i);
                        if (tmp != null) {
                            // 非基本类型需要深度遍历其对象
                            toBeQueue.add(Array.get(obj, i));
                        }
                    }
                }
            } else {
                while (tmpObjClass != null) {
                    Field[] fields = tmpObjClass.getDeclaredFields();
                    for (Field field : fields) {
                        if (Modifier.isStatic(field.getModifiers()) // 静态不计
                                || field.getType().isPrimitive() // 基本类型不重复计
                                || field.getName().contains("this")) {  // 内部类实例对外部类实例的引用不再重复计算
                            continue;
                        }
                        
                        field.setAccessible(true);
                        Object fieldValue = field.get(obj);
                        if (fieldValue == null) {
                            continue;
                        }
                        toBeQueue.add(fieldValue);
                    }
                    tmpObjClass = tmpObjClass.getSuperclass();
                }
            }
        }
        return size;
    }
    
    /**
     * String.intern的对象不计；计算过的不计，也避免死循环
     */
    static boolean skipObject(Set<Object> visited, Object obj) {
        if (obj instanceof String && obj == ((String) obj).intern()) {
            return true;
        }
        return visited.contains(obj);
    }
}
```

## 创建对象
通过`反射`创建对象，这些对象都是具有代表性的实例，下一博文继续分析
```Java
/**
 * 通过反射实例化类<br/>
 * java -cp create-object-1.0-SNAPSHOT.jar -javaagent:./size-of-object-1.0-SNAPSHOT.jar
 * me.zhongmingmao.create.CreateObjectUtil
 *
 * @author zhongmingmao zhongmingmao0625@gmail.com
 */
public class CreateObjectUtil {
    
    /**
     * 实例化对象的列表
     */
    static List<Object> objects = new ArrayList<>();
    
    /**
     * 通过反射实例化类，考虑jar包和非jar包的情况
     */
    static void createObject(Class<?> clazz) throws Exception {
        String packageName = clazz.getName().substring(0, clazz.getName().lastIndexOf("."));
        String resourcePath = clazz.getResource("").getPath();
        Set<String> outClassSet = new HashSet<>();
        
        if (resourcePath.contains("!")) {
            // 打包成jar包后路径会含有!字符
            String jarFilePath = resourcePath.substring(resourcePath.indexOf(":") + 1, resourcePath.lastIndexOf("!"));
            new JarFile(jarFilePath).stream().forEach(jarEntry -> {
                if (jarEntry.getName().endsWith(".class")) {
                    String className = jarEntry.getName()
                            .substring(0, jarEntry.getName().length() - 6).replace("/", ".");
                    if (className.contains(packageName)) {// 只实例化packageName下的类
                        instance(className, outClassSet);
                    }
                }
            });
        } else {
            // 在IDE或终端直接采用运行class文件
            for (File subFile : new File(resourcePath).listFiles()) {
                String className = String.format("%s.%s", packageName,
                        subFile.getName().substring(0, subFile.getName().lastIndexOf(".")));
                if (className.contains(packageName)) {
                    instance(className, outClassSet);
                }
            }
        }
    }
    
    /**
     * 实例化
     */
    private static void instance(String className, Set<String> outClassSet) {
        try {
            Class<?> klass = Class.forName(className);
            if (className.contains("$")) {
                // 不能单独实例化内部类
                outClassSet.add(className.substring(0, className.lastIndexOf("$")));
                return;
            }
            Object object = klass.newInstance();
            objects.add(object);
            System.out.println(String.format("%20s : shallow size = %d Bytes , retained size= %s Bytes",
                    klass.getCanonicalName(),
                    sizeOf(object),
                    fullSizeOf(object)));
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public static void main(String[] args) throws Exception {
        createObject(CompressedOopsTestClass.class);
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        reader.readLine();
    }
}
```

## 打印内存布局
通过`Hotspot JVM`提供的工具，打印`JVM进程的内存映像`到磁盘文件，便于后续继续分析
```Java
package me.zhongmingmao.layout;

import sun.jvm.hotspot.oops.HeapPrinter;
import sun.jvm.hotspot.oops.HeapVisitor;
import sun.jvm.hotspot.oops.ObjectHeap;
import sun.jvm.hotspot.runtime.VM;
import sun.jvm.hotspot.tools.Tool;

/**
 * 打印JVM进程中的对象内存布局
 */
public class PrintObjectMemLayout extends Tool {

    @Override
    public void run() {
        VM vm = VM.getVM();
        ObjectHeap objHeap = vm.getObjectHeap();
        HeapVisitor heapVisitor = new HeapPrinter(System.out);
        objHeap.iterate(heapVisitor);
    }
    
    public static void main(String[] args) throws InterruptedException {
        PrintObjectMemLayout layout = new PrintObjectMemLayout();
        layout.execute(args);
        layout.stop();
    }
}
```

# 使用

## git clone
```
$ git clone https://github.com/zhongmingmao/java_object_layout
```

## mvn clean install
```
$ cd java_object_layout && mvn clean install
```

## 创建对象
```
$ cd create-object/target

# -Xms5m -Xmx5m ➔ 限制Heap大小是为了加快JVM内存映像的导出时间和减小文件大小，可以依据实际情况进行调整
# -XX:+UseCompressedOops ➔ 开启指针压缩，可以关闭观察差异，默认打开
$ java -cp create-object-1.0-SNAPSHOT.jar -javaagent:./size-of-object-1.0-SNAPSHOT.jar -Xms5m -Xmx5m -XX:+UseCompressedOops me.zhongmingmao.create.CreateObjectUtil
me.zhongmingmao.create.classes.CompressedOopsTestClass : shallow size = 24 Bytes , retained size= 56 Bytes
```

## 导出JVM内存布局
```
# 另起一个会话
$ cd print-object-mem-layout/src/main/java

$ javac -cp $JAVA_HOME/lib/sa-jdi.jar me/zhongmingmao/layout/PrintObjectMemLayout.java

# 需要sudo权限
$ sudo java -cp $JAVA_HOME/lib/sa-jdi.jar:.  me.zhongmingmao.layout.PrintObjectMemLayout $(jps | grep CreateObjectUtil | awk  '{print $1}') > heap_oops_compress.txt

$ du -sh heap_oops_compress.txt
9.7M	heap_oops_compress.txt # 上面限制Heap大小，导出的文件也很小，便于分析

# 通过导出的JVM内存映像就能对对象的内存布局进行分析
$ cat heap_oops_compress.txt | grep CompressedOopsTestClass | head -n 1
"me/zhongmingmao/create/classes/CompressedOopsTestClass.class" @ 0x00000007bfa31ea0 (object size = 24)
``` 

# 待续
下一博文将通过`Instrumentation` + `sa-jdi`来分析对象的内存布局

<!-- indicate-the-source -->


