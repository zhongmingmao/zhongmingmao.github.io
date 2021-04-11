---
title: Spring -- 多数据源
mathjax: false
date: 2019-07-27 21:33:09
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - H2
    - JDBC
---

## 注意事项
1. 不同数据源的**配置要分开**
2. 关注每次使用的数据源
    - 有多个DataSource时系统如何判断
    - 对应的设施（事务、ORM）如何选择DataSource

<!-- more -->

## 多数据源配置（二选一）
1. 配置**@Primary**类型的Bean（DataSource）
2. 排除Spring Boot的自动配置（**手动配置**）
    - **DataSourceAutoConfiguration**
    - **DataSourceTransactionManagerAutoConfiguration**
    - **JdbcTemplateAutoConfiguration**

## 依赖
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

## application.properties
```
management.endpoints.web.exposure.include=*
foo.datasource.url=jdbc:h2:mem:foo
foo.datasource.username=SA
foo.datasource.password=
bar.datasource.url=jdbc:h2:mem:bar
bar.datasource.username=SA
bar.datasource.password=
```

## DataSourceConfig
```java
@Slf4j
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("foo.datasource")
    public DataSourceProperties fooDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource fooDataSource() {
        DataSourceProperties dataSourceProperties = fooDataSourceProperties();
        log.info("foo datasource : {}", dataSourceProperties.getUrl());
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    @Resource
    public PlatformTransactionManager fooTxManager(DataSource fooDataSource) {
        return new DataSourceTransactionManager(fooDataSource);
    }

    @Bean
    @ConfigurationProperties("bar.datasource")
    public DataSourceProperties barDataSourceProperties() {
        return new DataSourceProperties();
    }

    @Bean
    public DataSource barDataSource() {
        DataSourceProperties dataSourceProperties = barDataSourceProperties();
        log.info("bar datasource : {}", dataSourceProperties.getUrl());
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }

    @Bean
    @Resource
    public PlatformTransactionManager barTxManager(DataSource barDataSource) {
        return new DataSourceTransactionManager(barDataSource);
    }

}
```

## MultiDatasourceApplication
```java
// 排查自动配置
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class,
        DataSourceTransactionManagerAutoConfiguration.class,
        JdbcTemplateAutoConfiguration.class})
public class MultiDatasourceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MultiDatasourceApplication.class, args);
    }

}
```

```
foo datasource : jdbc:h2:mem:foo
bar datasource : jdbc:h2:mem:bar
```

## beans
```json
"fooDataSource": {
    "aliases": [],
    "scope": "singleton",
    "type": "com.zaxxer.hikari.HikariDataSource",
    "resource": "class path resource [me/zhongmingmao/multidatasource/DataSourceConfig.class]",
    "dependencies": ["fooDataSourceProperties"]
}

"fooTxManager": {
    "aliases": [],
    "scope": "singleton",
    "type": "org.springframework.jdbc.datasource.DataSourceTransactionManager",
    "resource": "class path resource [me/zhongmingmao/multidatasource/DataSourceConfig.class]",
    "dependencies": ["fooDataSource"]
}
```
