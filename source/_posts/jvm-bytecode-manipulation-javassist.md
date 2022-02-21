---
title: Bytecode Manipulation - Javassist
mathjax: false
date: 2022-02-11 00:06:25
categories:
  - Java
  - JVM
  - Bytecode Manipulation
tags:
  - Java
  - JVM
  - Bytecode Manipulation
---

# 概要

> Unlike other similar bytecode editors, Javassist provides two levels of API: **source** level and **bytecode** level.

# 生成字节码

```java
package me.zhongmingmao.javassist;

public class Point {

  private int x;
  private int y;

  public Point(int x, int y) {
    this.x = x;
    this.y = y;
  }

  public void move(int x, int y) {
    this.x = x;
    this.y = y;
  }
}
```

```
$ javac me/zhongmingmao/javassist/Point.java
$ javap -v me.zhongmingmao.javassist.Point
```

<!-- more -->

```java
Classfile /xxx/me/zhongmingmao/javassist/Point.class
  Last modified Feb 10, 2022; size 352 bytes
  MD5 checksum a44e68a69467ce37199980dd9bc5d30a
  Compiled from "Point.java"
public class me.zhongmingmao.javassist.Point
  minor version: 0
  major version: 52 // Java 8
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool: // 常量池
   #1 = Methodref          #5.#16         // java/lang/Object."<init>":()V
   #2 = Fieldref           #4.#17         // me/zhongmingmao/javassist/Point.x:I
   #3 = Fieldref           #4.#18         // me/zhongmingmao/javassist/Point.y:I
   #4 = Class              #19            // me/zhongmingmao/javassist/Point
   #5 = Class              #20            // java/lang/Object
   #6 = Utf8               x
   #7 = Utf8               I
   #8 = Utf8               y
   #9 = Utf8               <init>
  #10 = Utf8               (II)V
  #11 = Utf8               Code
  #12 = Utf8               LineNumberTable
  #13 = Utf8               move
  #14 = Utf8               SourceFile
  #15 = Utf8               Point.java
  #16 = NameAndType        #9:#21         // "<init>":()V
  #17 = NameAndType        #6:#7          // x:I
  #18 = NameAndType        #8:#7          // y:I
  #19 = Utf8               me/zhongmingmao/javassist/Point
  #20 = Utf8               java/lang/Object
  #21 = Utf8               ()V
{
  public me.zhongmingmao.javassist.Point(int, int);
    descriptor: (II)V
    flags: ACC_PUBLIC
    Code:
      stack=2, locals=3, args_size=3 // 操作数栈深度、局部变量表长度、参数数量（对于实例方法，默认slot[0] = this）
         0: aload_0	// this 压栈
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V // this 出栈，执行 Object 实例化
         4: aload_0 // this 压栈
         5: iload_1 // x 压栈，slot[1] = x
         6: putfield      #2                  // Field x:I // this 和 x 出栈，执行 this.x = x
         9: aload_0
        10: iload_2
        11: putfield      #3                  // Field y:I
        14: return
      LineNumberTable:
        line 8: 0 // 源代码行数 <-> 字节码索引
        line 9: 4
        line 10: 9
        line 11: 14

  public void move(int, int);
    descriptor: (II)V
    flags: ACC_PUBLIC
    Code:
      stack=2, locals=3, args_size=3
         0: aload_0
         1: iload_1
         2: putfield      #2                  // Field x:I
         5: aload_0
         6: iload_2
         7: putfield      #3                  // Field y:I
        10: return
      LineNumberTable:
        line 14: 0
        line 15: 5
        line 16: 10
}
SourceFile: "Point.java"
```

# Javassist

## 生成新类

```java
private static void generateClass() throws CannotCompileException {
  ClassFile classFile =
    new ClassFile(false, "me.zhongmingmao.javassist.JavassistGeneratedClass", null);
  classFile.setInterfaces(new String[] {"java.lang.Cloneable"});
  FieldInfo fieldInfo = new FieldInfo(classFile.getConstPool(), "id", "I");
  fieldInfo.setAccessFlags(AccessFlag.PUBLIC);
  classFile.addField(fieldInfo);

  Class<?> klass = ClassPool.getDefault().makeClass(classFile).toClass();
  assertTrue(
    Stream.of(klass.getInterfaces())
    .map(Class::getCanonicalName)
    .anyMatch(interfaceName -> interfaceName.contentEquals("java.lang.Cloneable")));
  assertTrue(
    Stream.of(klass.getFields()).map(Field::getName).anyMatch(field -> field.contains("id")));
}
```

## 读取字节码

```java
private static void loadBytecode() throws BadBytecode, NotFoundException {
  // Class -> Method -> Code
  CodeIterator iterator =
    ClassPool.getDefault()
    .get("me.zhongmingmao.javassist.Point")
    .getClassFile()
    .getMethod("move")
    .getCodeAttribute()
    .iterator();

  List<String> ops = Lists.newArrayList();
  while (iterator.hasNext()) {
    int index = iterator.next();
    String op = Mnemonic.OPCODE[iterator.byteAt(index)];
    System.out.println(index + " : " + op);
    ops.add(op);
  }
  // 0 : aload_0
  // 1 : iload_1
  // 2 : putfield
  // 5 : aload_0
  // 6 : iload_2
  // 7 : putfield
  // 10 : return

  assertEquals(
    Arrays.asList("aload_0", "iload_1", "putfield", "aload_0", "iload_2", "putfield", "return"),
    ops);
}
```

## 添加字段

```java
private void addField() throws NotFoundException, CannotCompileException {
  ClassFile classFile =
    ClassPool.getDefault().get("me.zhongmingmao.javassist.Point").getClassFile();
  FieldInfo fieldInfo = new FieldInfo(classFile.getConstPool(), "id", "I");
  fieldInfo.setAccessFlags(AccessFlag.PUBLIC);
  classFile.addField(fieldInfo);

  assertTrue(
    Stream.of(ClassPool.getDefault().makeClass(classFile).toClass().getFields())
    .map(Field::getName)
    .anyMatch(field -> field.contains("id")));
}
```

## 添加构造函数

```java
private void addConstructor() throws NotFoundException, DuplicateMemberException, BadBytecode {
  ClassFile classFile =
    ClassPool.getDefault().get("me.zhongmingmao.javassist.Point").getClassFile();

  // 定义 Point 类的无参构造函数
  MethodInfo methodInfo = new MethodInfo(classFile.getConstPool(), MethodInfo.nameInit, "()V");
  // 构造 Code 区
  Bytecode bytecode = new Bytecode(classFile.getConstPool());
  bytecode.addAload(0);
  // 先执行父类的实例初始化
  bytecode.addInvokespecial("java/lang/Object", MethodInfo.nameInit, "()V");
  bytecode.addReturn(null);
  CodeAttribute code = bytecode.toCodeAttribute();
  methodInfo.setCodeAttribute(code);
  classFile.addMethod(methodInfo);

  CodeIterator iterator = bytecode.toCodeAttribute().iterator();
  List<String> ops = new LinkedList<>();
  while (iterator.hasNext()) {
    int index = iterator.next();
    String op = Mnemonic.OPCODE[iterator.byteAt(index)];
    System.out.println(index + " : " + op);
    ops.add(op);
  }

  assertEquals(Arrays.asList("aload_0", "invokespecial", "return"), ops);
}
```

