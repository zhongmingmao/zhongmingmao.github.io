---
title: Bytecode Manipulation - Java Agent Practice
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

<!-- more -->

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
