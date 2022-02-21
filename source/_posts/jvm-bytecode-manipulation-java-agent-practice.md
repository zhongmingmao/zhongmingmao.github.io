---
title: Bytecode Manipulation - Java Agent Practice
mathjax: false
date: 2022-02-10 00:06:25
categories:
  - Java
  - JVM
  - Bytecode Manipulation
tags:
  - Java
  - JVM
  - Bytecode Manipulation
---

# 概念

## Instrument

1. Instrument 是 JVM 提供的一个可以**修改已加载类**的类库，依赖于 **JVMTI** 的 **Attach API** 机制
2. 要使用 Instrument 的类修改功能，需要实现 `java.lang.instrument.ClassFileTransformer` 接口
   - 可以在 `ClassFileTransformer#transform` 中利用 ASM 或者 Byte Buddy 等工具对字节码进行操作
3. Instrument 通过与 Java Agent 结合来注入到 JVM 中

## JVMTI & Agent

1. **JPDA**（Java Platform Debugger Architecture）是 **JDK 标准**，必须实现
   - 如果 JVM 启动时开启了 JPDA，那么类是**允许被重新加载**的
   - 已加载的旧版类信息被**卸载**，然后重新加载新版本的类
2. JVMTI 是 JVM 提供的一套对 JVM 进行操作的工具接口，**Agent 是 JVMTI 的一种实现**
3. Attach API 的作用：提供 **JVM 进程间通信**的能力
   - Attach 后，目标 JVM 在运行时走到 Agent 中定义的 `agentmain` 方法

<!-- more -->

# Modules

```
$ tree -L 1
.
├── app
├── dynamic-agent-loader
├── dynamic-load-agent
└── static-load-agent
```

# App

```xml pom.xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

```java
@SpringBootApplication
public class AppApplication {
  public static void main(String[] args) {
    SpringApplication.run(AppApplication.class, args);
  }
}
```

```
$ mvn clean package spring-boot:repackage
$ java -jar target/app-0.0.1-SNAPSHOT.jar
```

# Static Load

```java
public class PremainAgent {

  public static void premain(String preArgs, Instrumentation instrumentation) {
    System.out.println("premain start");
    System.out.println("preArgs: " + preArgs);
    Arrays.stream(instrumentation.getAllLoadedClasses())
        .findFirst()
        .ifPresent(klass -> System.out.println("premain loadedClass: " + klass.getName()));
  }
}
```

```xml pom.xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-jar-plugin</artifactId>
      <version>3.2.2</version>
      <configuration>
        <archive>
          <manifest>
            <addClasspath>true</addClasspath>
          </manifest>
          <manifestEntries>
            <Premain-Class>me.zhongmingmao.staticloadagent.PremainAgent</Premain-Class>
          </manifestEntries>
        </archive>
      </configuration>
    </plugin>
  </plugins>
</build>
```

```
$ mvn clean package

$ jar -tf target/static-load-agent-0.0.1-SNAPSHOT.jar 
META-INF/
META-INF/MANIFEST.MF
me/
me/zhongmingmao/
me/zhongmingmao/staticloadagent/
META-INF/maven/
META-INF/maven/me.zhongmingmao/
META-INF/maven/me.zhongmingmao/static-load-agent/
me/zhongmingmao/staticloadagent/PremainAgent.class
META-INF/maven/me.zhongmingmao/static-load-agent/pom.xml
META-INF/maven/me.zhongmingmao/static-load-agent/pom.properties

$ unzip -p target/static-load-agent-0.0.1-SNAPSHOT.jar META-INF/MANIFEST.MF | less
Manifest-Version: 1.0
Premain-Class: me.zhongmingmao.staticloadagent.PremainAgent
Build-Jdk-Spec: 1.8
Created-By: Maven JAR Plugin 3.2.2

$ java -javaagent:/xxx/static-load-agent-0.0.1-SNAPSHOT.jar=static_load -jar target/app-0.0.1-SNAPSHOT.jar
premain start
preArgs: static_load
premain loadedClass: me.zhongmingmao.staticloadagent.PremainAgent
```

# Dynamic Load

## Dynamic Agent

```java
public class AgentMain {

  public static void agentmain(String args, Instrumentation instrumentation) {
    System.out.println("agentmain start");
    System.out.println("args: " + args);
    Arrays.stream(instrumentation.getAllLoadedClasses())
        .findFirst()
        .ifPresent(klass -> System.out.println("agentmain loadedClass: " + klass.getName()));
  }
}
```

```xml pom.xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-jar-plugin</artifactId>
      <version>3.2.2</version>
      <configuration>
        <archive>
          <manifest>
            <addClasspath>true</addClasspath>
          </manifest>
          <manifestEntries>
            <Agent-Class>me.zhongmingmao.dynamicloadagent.AgentMain</Agent-Class>
          </manifestEntries>
        </archive>
      </configuration>
    </plugin>
  </plugins>
</build>
```

```
$ mvn clean package

$ jar -tf target/dynamic-load-agent-0.0.1-SNAPSHOT.jar 
META-INF/
META-INF/MANIFEST.MF
me/
me/zhongmingmao/
me/zhongmingmao/dynamicloadagent/
META-INF/maven/
META-INF/maven/me.zhongmingmao/
META-INF/maven/me.zhongmingmao/dynamic-load-agent/
me/zhongmingmao/dynamicloadagent/AgentMain.class
META-INF/maven/me.zhongmingmao/dynamic-load-agent/pom.xml
META-INF/maven/me.zhongmingmao/dynamic-load-agent/pom.properties

$ unzip -p target/dynamic-load-agent-0.0.1-SNAPSHOT.jar META-INF/MANIFEST.MF | less
Manifest-Version: 1.0
Agent-Class: me.zhongmingmao.dynamicloadagent.AgentMain
Build-Jdk-Spec: 1.8
Created-By: Maven JAR Plugin 3.2.2
```

## Agent Loader

```java
@SpringBootApplication
public class DynamicAgentLoaderApplication implements CommandLineRunner {

  public static void main(String[] args) {
    SpringApplication.run(DynamicAgentLoaderApplication.class, args);
  }

  @Override
  public void run(String... args) {
    if (args.length < 3) {
      return;
    }
    String process = args[0];
    String agent = args[1];
    String options = args[2];

    VirtualMachine.list().stream()
        .filter(descriptor -> descriptor.displayName().contains(process))
        .findAny()
        .ifPresent(
            descriptor -> {
              try {
                // Core Logic
                VirtualMachine vm = VirtualMachine.attach(descriptor.id());
                vm.loadAgent(agent, options);
                vm.detach();
              } catch (AgentLoadException
                  | AgentInitializationException
                  | AttachNotSupportedException
                  | IOException e) {
                e.printStackTrace();
              }
            });
  }
}
```

```xml pom.xml
<dependency>
  <groupId>com.sun</groupId>
  <artifactId>tools</artifactId>
  <version>1.8.0</version>
  <scope>system</scope>
  <systemPath>${JAVA_HOME}/lib/tools.jar</systemPath>
</dependency>
```

```
$ mvn clean package spring-boot:repackage

$ java -Xbootclasspath/a:${JAVA_HOME}/lib/tools.jar -jar target/dynamic-agent-loader-0.0.1-SNAPSHOT.jar AppApplication /xxx/dynamic-load-agent-0.0.1-SNAPSHOT.jar dynamic_load

agentmain start
args: dynamic_load
agentmain loadedClass: me.zhongmingmao.dynamicagentloader.DynamicAgentLoaderApplication$$Lambda$292/1136497418
```
