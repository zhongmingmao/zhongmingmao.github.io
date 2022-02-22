---
title: ASM - Introduction
mathjax: false
date: 2022-02-22 00:06:25
categories:
  - Java
  - JVM
  - Bytecode Manipulation
tags:
  - Java
  - JVM
  - Bytecode Manipulation
  - ASM
---

# Glance

1. ASM is an **all purpose** Java bytecode manipulation and analysis framework.
   - It can be used to **modify existing classes** or to **dynamically generate classes**, directly in **binary** form.
2. ASM provides some **common bytecode transformations and analysis algorithms** from which custom complex transformations and code analysis tools can be built.
3. ASM offers similar functionality as other Java bytecode frameworks, but is focused on **performance**.
   - Because it was designed and implemented to be as **small** and as **fast** as possible, it is well suited for use in **dynamic** systems (but can of course be used in a **static** way too, e.g. in compilers).

# Introduction

## Motivations

### Situations

1. **Program analysis**
   - which can range from a simple syntaxic parsing to a full semantic analysis, can be used to find potential bugs in applications, to detect unused code, to reverse engineer code, etc.
2. **Program generation**
   - is used in **compilers**. This include **traditional compilers**, but also **stub or skeleton compilers** used for distributed programming, **Just in Time compilers**, etc.
3. **Program transformation**
   - can be used to **optimize or obfuscate programs**, to insert **debugging** or **performance monitoring** code into applications, for **aspect oriented programming**, etc.

<!-- more -->

### Advantages of working on compiled classes

1. The **source code** is **not needed**.
   - Program transformations can therefore be used on **any applications**, including **closed source** and **commercial ones**.
2. It becomes possible to analyze, generate or transform classes at **runtime**.
   - Tools such as **stub compilers** or **aspect weavers** become **transparent** to users.

### ASM

1. ASM is designed for **runtime** – but also offline – class **generation** and **transformation**.
   - The ASM library was therefore designed to work on **compiled Java classes**.
2. It was also designed to be as **fast** and as **small** as possible.
   - Being as fast as possible is important in order **not to slow down too much** the applications that use ASM at runtime, for dynamic class generation or transformation.
   - And being as small as possible is important in order to be used in memory constrained environments, and to **avoid bloating the size** of small applications or libraries using ASM.

## Overview

### Scope

1. The goal of the ASM library is to **generate, transform and analyze compiled Java classes**, represented as **byte arrays** (as they are stored on disk and loaded in the Java Virtual Machine).
2. For this purpose ASM provides tools to **read, write and transform** such byte arrays by using **higher level concepts** than bytes.
3. Note that the **scope** of the ASM library is **strictly limited** to ***reading, writing, transforming and analyzing classes***.
   - In particular the *class loading process* is *out of scope*.

### Model

1. The ASM library provides two APIs for generating and transforming compiled classes
   - the **core API** provides an **event based** representation of classes
   - the **tree API** provides an **object based** representation of classes
2. **event based**
   - With the event based model a class is represented with **a sequence of events**, each **event** representing **an element of the class**, such as its header, a field, a method declaration, an instruction, etc.
   - The event based API defines the set of possible events and the **order** in which they must occur
     - and provides a **class parser** that **generates one event per element that is parsed**
       - ***class parser: element -> event***
     - as well as a **class writer** that **generates compiled classes from sequences of such events**.
       - ***class writer: events -> class***
3. **object based**
   - With the object based model a class is represented with **a tree of objects**, each object representing a part of the class, such as the class itself, a field, a method, an instruction, etc. and each object having **references** to the objects that represent its **constituents**.
   - *The object based API is built **on top of** the event based API*.
     - The object based API provides a way to convert a sequence of events representing a class to the object tree representing the same class and, vice versa, to convert an object tree to the equivalent event sequence.
4. ASM provides both APIs because **there is no best API**.
   - The **event based** API is **faster** and **requires less memory** than the object based API, since there is no need to create and store in memory a tree of objects representing the class.
   - However **implementing class transformations** can be **more difficult** with the **event based** API, since **only one element** of the class is **available** at **any given time** (the element that corresponds to the current event), while the whole class is available in memory with the object based API.
5. Note that the two APIs **manage only one class at a time**, and **independently** of the others
   - **no information about the class hierarchy is maintained**, and if a class transformation affects other classes, it is up to the user to modify these other classes.

### Architecture

1. **event based**
   - Indeed the event based API is organized around **event producers** (the **class parser**), **event consumers** (the **class writer**) and various **predefined event filters**, to which user defined producers, consumers and filters can be added.
   - Two step process
     - **assembling** event producer, filter and consumer components into possibly complex architectures.
     - and then **starting the event producers** to run the **generation** or **transformation** process.
2. **object based**
   - Indeed class **generator** or **transformer** components that operate on object trees **can be composed**, the **links** between them representing the **order of transformations**.

![image-20220222144417064](https://jvm-byte-coding-1253868755.cos.ap-guangzhou.myqcloud.com/asm/image-20220222144417064.png)

## Organization

1. **core API**
   - **asm**
     - **the `org.objectweb.asm` and `org.objectweb.asm.signature` packages define the **event based** API and provide the **class parser and writer** components.
   - **asm-util**
     - the `org.objectweb.asm.util` package, provides various tools based on the **core API** that can be used during the **development** and **debuging** of ASM applications.
   - **asm-commons**
     - the `org.objectweb.asm.commons` package provides several useful **predefined class transformers**, mostly based on the **core API**.
2. **tree API**
   - **asm-tree**
     - the `org.objectweb.asm.tree` package, defines the **object based** API, and provides tools to **convert** between the **event based** and the **object based** representations.
   - **asm-analysis**
     - the `org.objectweb.asm.tree.analysis` package provides a **class analysis framework** and several **predefined class analyzers**, based on the **tree API**.

# Reference

1. [ASM 4.0 - A Java bytecode engineering library](https://asm.ow2.io/asm4-guide.pdf)



