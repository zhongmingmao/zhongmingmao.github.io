---
title: JVM进阶 -- 浅谈注解处理器
date: 2019-01-07 21:43:41
categories:
    - Java
    - JVM
    - Advanced
tags:
    - Java
    - JVM
---

## 注解与注解处理器
1. 注解是Java 5引入，用来为类、方法、字段和参数等Java结构**提供额外信息**的机制
2. `@Override`仅对**Java编译器**有用，为Java编译器**引用一条新的编译规则**，编译完成后，它的使命也结束了
3. Java的注解机制允许开发人员**自定义注解**，这些自定义注解同样可以为Java编译器**添加编译规则**
    - 这种功能需要由开发人员提供，并且以**插件的形式**接入Java编译器中，这些插件被称之为**注解处理器**
4. 除了**引入新的编译规则**外，注解处理器还可以用于**修改已有的Java源文件**（不推荐）和**生成新的Java源文件**

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.SOURCE)
public @interface Override {
}
// 元注解@Target：用来限定目标注解所能标注的Java结构
// 元注解@Retention：用来限定目标注解的生命周期
//      SOURCE：源代码，一旦源代码被编译为字节码，注解便会被擦除
//      CLASS：源代码+字节码
//      RUNTIME：源代码+字节码+运行时
```

<!-- more -->

## 原理 + 用途

### 编译过程
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-annotation-processor.png" />
1. 将源文件解析为**抽象语法树**
2. 调用已注册的**注解处理器**
    - 如果该过程**生成了新的源文件**，编译器将重复第1、2步
    - 每次重复成为**一轮**
    - 第一轮解析处理的是输入至编译器中的已有源文件
    - 当注解处理器不再生成新的源文件，将进入最后一轮
3. 生成**字节码**

### 主要用途
1. 定义编译规则，并检查被编译的源文件
2. 修改已有源代码，涉及Java编译器的内部API，不推荐
3. 生成新的源代码

## 定义编译规则
```java
import java.lang.annotation.*;

@Target({ElementType.TYPE, ElementType.FIELD})
@Retention(RetentionPolicy.SOURCE)
public @interface CheckGetter {
}
```
CheckGetter的目的：遍历被标注的类中的实例字段，并检查有没有对应的getter方法

### 实现注解处理器

#### Processor接口
```java
public interface Processor {
    void init(ProcessingEnvironment processingEnv);
    Set<String> getSupportedAnnotationTypes();
    SourceVersion getSupportedSourceVersion();
    boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv);
    ...
}
```
1. init：注解处理器的初始化代码
    - 不采用**构造器**的原因是在Java编译器中，**注解处理器实例是通过反射生成的**
    - 因此每个注解处理器类都需要定义一个**无参构造器**
    - 通常来说不需要声明任何构造器，而是**依赖于Java编译器自动插入一个无参构造器**
    - 具体的初始化代码，放入`init`方法中
2. getSupportedAnnotationTypes：返回该注解处理器**所支持的注解类型**
3. getSupportedSourceVersion：返回该注解处理器**所支持的Java版本**，通常需要**与Java编译器的版本一致**
4. process：最为**关键**的注解处理方法

#### AbstractProcessor抽象类
`AbstractProcessor`实现了`init`，`getSupportedAnnotationTypes`和`getSupportedSourceVersion`方法
它的子类可以通过`@SupportedAnnotationTypes`和`@SupportedSourceVersion`注解来声明所支持的**注解类型**以及**Java版本**
```java
import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import javax.lang.model.util.ElementFilter;
import javax.tools.Diagnostic;
import java.util.Set;

@SupportedAnnotationTypes("CheckGetter")
@SupportedSourceVersion(SourceVersion.RELEASE_8)
public class CheckGetterProcessor extends AbstractProcessor {
    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment roundEnv) {
        // annotations：该注解处理器所能处理的注解类型
        // roundEnv：囊括当前轮生成的抽象语法树RoundEnvironment
        // roundEnv.getElementsAnnotatedWith(CheckGetter.class) -> 获取所有被@CheckGetter注解的类
        for (TypeElement annotatedClass : ElementFilter.typesIn(roundEnv.getElementsAnnotatedWith(CheckGetter.class))) {
            for (VariableElement field : ElementFilter.fieldsIn(annotatedClass.getEnclosedElements())) {
                if (!containsGetter(annotatedClass, field.getSimpleName().toString())) {
                    processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR,
                            String.format("getter not fund for '%s.%s'.", annotatedClass.getSimpleName(),
                                    field.getSimpleName()));
                }
            }
        }
        return false;
    }

    private static boolean containsGetter(TypeElement typeElement, String name) {
        // 拼接getter名称
        String getter = "get" + name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase();
        for (ExecutableElement executableElement : ElementFilter.methodsIn(typeElement.getEnclosedElements())) {
            if (!executableElement.getModifiers().contains(Modifier.STATIC)
                    && executableElement.getSimpleName().toString().equals(getter)
                    && executableElement.getParameters().isEmpty()) {
                return true;
            }
        }
        return false;
    }
}
```
process方法涉及处理各种不同类型的Element，分别指代Java程序的各个**结构**
```java
// package me.zhongmingmao.advanced.annotation; // PackageElement

@CheckGetter
public class Foo { // TypeElement
    int a; // VariableElement
    static int b; // VariableElement

    Foo() { // ExecutableElement
    }

    void setA( // ExecutableElement
               int newA // VariableElement
    ) {
    }
}
```
Java结构之间也存在从属关系，`TypeElement.getEnclosedElements()`将获取**字段，构造器和方法**

#### 注册
在将注解处理器编译成class文件后，就可以将其**注册为Java编译器的插件**，并用来**处理其他源代码**
```shell
$ ll
total 24
-rw-r--r--  1 zhongmingmao  staff   147B  1  7 22:53 CheckGetter.java
-rw-r--r--  1 zhongmingmao  staff   2.0K  1  7 22:54 CheckGetterProcessor.java
-rw-r--r--  1 zhongmingmao  staff   316B  1  7 22:55 Foo.java

$ javac CheckGetter.java CheckGetterProcessor.java

$ javac -cp . -processor CheckGetterProcessor Foo.java
错误: getter not fund for 'Foo.a'.
错误: getter not fund for 'Foo.b'.
2 个错误

$ ll
total 40
-rw-r--r--  1 zhongmingmao  staff   385B  1  7 22:57 CheckGetter.class
-rw-r--r--  1 zhongmingmao  staff   147B  1  7 22:53 CheckGetter.java
-rw-r--r--  1 zhongmingmao  staff   3.1K  1  7 22:57 CheckGetterProcessor.class
-rw-r--r--  1 zhongmingmao  staff   2.0K  1  7 22:54 CheckGetterProcessor.java
-rw-r--r--  1 zhongmingmao  staff   316B  1  7 22:55 Foo.java
```

## 修改与生成源代码
1. 注解处理器并**不能真正地修改源代码**
2. 实际修改的是**由Java源代码生成的抽象语法树**
    - 在其中修改已有的树节点或者插入新的树节点，从而使生成的字节码发生变化
    - 对抽象语法树的修改涉及了**Java编译器的内部API**，很可能**随版本变更而失效**，不推荐
    - 样例：lombok
3. 相对于修改源代码，用注解处理器**生成源代码更为常用**

<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/advanced/jvm-advanced-annotation-processor-lombok.png" width=250/>


<!-- indicate-the-source -->
