---
title: Spring -- HelloSpring
mathjax: false
date: 2019-07-23 09:15:56
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
---

## Spring Initializr
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-hellospring-initializr.png" width=800/>

<!-- more -->

## 项目结构
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-hellospring-structure.png" width=500/>

## 启动类
```java
@SpringBootApplication
@RestController
public class HelloSpringApplication {

    public static void main(String[] args) {
        SpringApplication.run(HelloSpringApplication.class, args);
    }

    @RequestMapping("/hello")
    public String hello() {
        return "Hello Spring";
    }
}
```

## 启动
```
.   ____          _            __ _ _
/\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
\\/  ___)| |_)| | | | | || (_| |  ) ) ) )
'  |____| .__|_| |_|_| |_\__, | / / / /
=========|_|==============|___/=/_/_/_/
:: Spring Boot ::        (v2.1.7.RELEASE)

2019-08-07 09:36:51.611  INFO 53865 --- [           main] m.z.hellospring.HelloSpringApplication   : Starting HelloSpringApplication on zhongmingmao.local with PID 53865 (/Users/zhongmingmao/Documents/source_code/github/spring_geek/hello-spring/target/classes started by zhongmingmao in /Users/zhongmingmao/Documents/source_code/github/spring_geek/hello-spring)
2019-08-07 09:36:51.636  INFO 53865 --- [           main] m.z.hellospring.HelloSpringApplication   : No active profile set, falling back to default profiles: default
2019-08-07 09:36:54.410  INFO 53865 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port(s): 8080 (http)
2019-08-07 09:36:54.509  INFO 53865 --- [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2019-08-07 09:36:54.509  INFO 53865 --- [           main] org.apache.catalina.core.StandardEngine  : Starting Servlet engine: [Apache Tomcat/9.0.22]
2019-08-07 09:36:54.748  INFO 53865 --- [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2019-08-07 09:36:54.748  INFO 53865 --- [           main] o.s.web.context.ContextLoader            : Root WebApplicationContext: initialization completed in 3041 ms
2019-08-07 09:36:55.742  INFO 53865 --- [           main] o.s.s.concurrent.ThreadPoolTaskExecutor  : Initializing ExecutorService 'applicationTaskExecutor'
2019-08-07 09:36:56.002  INFO 53865 --- [           main] o.s.b.a.e.web.EndpointLinksResolver      : Exposing 2 endpoint(s) beneath base path '/actuator'
2019-08-07 09:36:56.105  INFO 53865 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2019-08-07 09:36:56.110  INFO 53865 --- [           main] m.z.hellospring.HelloSpringApplication   : Started HelloSpringApplication in 5.404 seconds (JVM running for 7.274)
2019-08-07 09:36:56.437  INFO 53865 --- [on(4)-127.0.0.1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet 'dispatcherServlet'
2019-08-07 09:36:56.437  INFO 53865 --- [on(4)-127.0.0.1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet 'dispatcherServlet'
2019-08-07 09:36:56.444  INFO 53865 --- [on(4)-127.0.0.1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 7 ms
```

## 验证
```
$ curl http://localhost:8080/hello
Hello Spring

$ curl http://localhost:8080/actuator/health
{"status":"UP"}
```

## pom
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.1.7.RELEASE</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>me.zhongmingmao</groupId>
    <artifactId>hello-spring</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>hello-spring</name>
    <description>Demo project for Spring Boot</description>

    <properties>
        <java.version>1.8</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

</project>
```

## 打包
```
$ mvn clean package -Dmaven.test.skip

$ ll target
total 35800
drwxr-xr-x  4 zhongmingmao  staff   128B  8  7 09:42 classes
drwxr-xr-x  3 zhongmingmao  staff    96B  8  7 09:42 generated-sources
-rw-r--r--  1 zhongmingmao  staff    17M  8  7 09:42 hello-spring-0.0.1-SNAPSHOT.jar
-rw-r--r--  1 zhongmingmao  staff   2.8K  8  7 09:42 hello-spring-0.0.1-SNAPSHOT.jar.original
drwxr-xr-x  3 zhongmingmao  staff    96B  8  7 09:42 maven-archiver
drwxr-xr-x  3 zhongmingmao  staff    96B  8  7 09:42 maven-status

$ java -jar target/hello-spring-0.0.1-SNAPSHOT.jar
```

## 自定义parent
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>me.zhongmingmao</groupId>
    <artifactId>hello-spring</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>hello-spring</name>
    <description>Demo project for Spring Boot</description>

    <properties>
        <java.version>1.8</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- 改动点1 -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-parent</artifactId>
                <version>2.1.7.RELEASE</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <plugins>
            <!-- 改动点2 -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <executions>
                    <execution>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>

</project>
```
