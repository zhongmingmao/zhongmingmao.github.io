---
title: Spring -- 事务
mathjax: false
date: 2019-08-03 15:42:13
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - H2
    - JDBC
    - Transaction
---

## 事务抽象

### 一致的事务模型
1. JDBC/Hibernate/MyBatis
2. DataSource/JTA

<!-- more -->

### 核心接口
1. PlatformTransactionManager
    - DataSourceTransactionManager
    - HibernateTransactionManager
    - JtaTransactionManager
2. TransactionDefinition
    - Propagation
    - Isolation
    - Timeout
    - Read-Only Status

```java
public interface PlatformTransactionManager {
    void commit(TransactionStatus status) throws TransactionException;
    void rollback(TransactionStatus status) throws TransactionException;
    TransactionStatus getTransaction(@Nullable TransactionDefinition definition) throws TransactionException;
}

public interface TransactionDefinition {
    int getPropagationBehavior();
    int getIsolationLevel();
    int getTimeout();
    boolean isReadOnly();
}
```

### Propagation
| 传播性 | 值 | 描述 | 备注 |
| --- | --- | --- | --- |
| **PROPAGATION_REQUIRED** | 0 | 当前事务有就用当前的，没有就用新的 | 默认 |
| PROPAGATION_SUPPORTS | 1 | 事务可有可无，非必须 | |
| PROPAGATION_MANDATORY | 2 | 当前一定要有事务，否则就抛异常 | |
| **PROPAGATION_REQUIRES_NEW** | 3 | 无论是否有事务，都另起一个新的事务 | 会把旧事务挂起 |
| PROPAGATION_NOT_SUPPORTED | 4 | 不支持事务，按非事务方式运行 | |
| PROPAGATION_NEVER | 5 | 不支持事务，如果有事务就抛出异常 | |
| **PROPAGATION_NESTED** | 6 | 当前有事务就在当前事务再起一个事务 | 1. 里面的事务拥有独立的属性，如回滚状态<br/>2. 里面的事务回滚并不会影响外面的事务 |

#### REQUIRES_NEW / NESTED
1. **REQUIRES_NEW**：始终启动一个事务，两个事务**没有关联**
2. **NESTED**：在原事务内启动一个**内嵌事务**，两个事务有关联，**外部事务回滚，内嵌事务也会回滚**

```java
@Slf4j
@Component
public class PersonServiceImpl implements PersonService {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private PersonService personService;
}
```

##### 外部事务回滚
REQUIRES_NEW：外部事务回滚，不影响内部事务提交
```java
@Override
@Transactional(rollbackFor = RuntimeException.class)
public void outerTransaction() {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
    try {
        personService.innerTransaction();
    } catch (RollbackException ignored) {
    }
    throw new RuntimeException();
}

@Override
@Transactional(rollbackFor = RollbackException.class, propagation = Propagation.REQUIRES_NEW)
public void innerTransaction() throws RollbackException {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('B')");
    //throw new RollbackException();
}
```
_**NESTED：外部事务回滚，会导致内部事务也回滚!!**_
```java
@Override
@Transactional(rollbackFor = RuntimeException.class)
public void outerTransaction() {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
    try {
        personService.innerTransaction();
    } catch (RollbackException ignored) {
    }
    throw new RuntimeException();
}

@Override
@Transactional(rollbackFor = RollbackException.class, propagation = Propagation.NESTED)
public void innerTransaction() throws RollbackException {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('B')");
    //throw new RollbackException();
}
```

##### 内部事务回滚
无论内部事务的propagation为NESTED或者REQUIRES_NEW，内部事务回滚都不影响外部事务提交
```java
@Override
@Transactional(rollbackFor = RuntimeException.class)
public void outerTransaction() {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
    try {
        personService.innerTransaction();
    } catch (RollbackException ignored) {
    }
    //throw new RuntimeException();
}

@Override
@Transactional(rollbackFor = RollbackException.class, propagation = Propagation.NESTED)
public void innerTransaction() throws RollbackException {
    jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('B')");
    throw new RollbackException();
}
```

### Isolation
| 隔离性 | 值 | 脏读 | 不可重复读 | 幻读 | 备注 |
| --- | --- | --- | --- | --- | --- |
| **ISOLATION_DEFAULT** | -1 | | | | 取决于数据库配置 |
| ISOLATION_READ_UNCOMMITTED | 1 | Y | Y | Y | |
| ISOLATION_READ_COMMITTED | 2 | | Y | Y | |
| ISOLATION_REPEATABLE_READ | 4 | | | Y | |
| ISOLATION_SERIALIZABLE | 8 | | | | |

## 编程式事务
1. **TransactionTemplate**
    - TransactionCallback
    - TransactionCallbackWithoutResult
2. PlatformTransactionManager
    - 可以传入TransactionDefinition进行定义

### 依赖
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

### schema.sql
```sql
CREATE TABLE PERSON
(
    ID   BIGINT PRIMARY KEY AUTO_INCREMENT,
    NAME VARCHAR(255)
);
```

### data.sql
```sql
INSERT INTO PERSON (ID, NAME) VALUES ('1', 'zhongmingmao');
```

### ProgrammaticTransactionApplication
```java
@Slf4j
@SpringBootApplication
public class ProgrammaticTransactionApplication implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private TransactionTemplate transactionTemplate;

    public static void main(String[] args) {
        SpringApplication.run(ProgrammaticTransactionApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("COUNT BEFORE TRANSACTION : {}", getCount());
        transactionTemplate.execute(status -> {
            jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
            log.info("COUNT IN TRANSACTION : {}", getCount());
            status.setRollbackOnly();
            return null;
        });
        log.info("COUNT AFTER TRANSACTION : {}", getCount());
        // 输出
        // COUNT BEFORE TRANSACTION : 1
        // COUNT IN TRANSACTION : 2
        // COUNT AFTER TRANSACTION : 1
    }

    private long getCount() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM PERSON", Long.class);
    }
}
```

### TransactionTemplate
```java
public class TransactionTemplate extends DefaultTransactionDefinition implements TransactionOperations, InitializingBean{
}

public class DefaultTransactionDefinition implements TransactionDefinition, Serializable {
    private int propagationBehavior = PROPAGATION_REQUIRED;
    private int isolationLevel = ISOLATION_DEFAULT; // -1
    private int timeout = TIMEOUT_DEFAULT; // -1
    private boolean readOnly = false;
}
```

## 声明式事务
Spring的声明式事务本质上是**通过AOP来增强类的功能**，而AOP本质上是为类做了一个代理，**实际调用的是增强后的代理类**
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-transaction-declarative.png" width=1000/>

### 基于注解的配置
1. @EnableTransactionManagement
    - proxyTargetClass
        - Indicate whether **subclass-based (CGLIB) proxies** are to be created (**true**) as opposed to **standard Java interface-based proxies (false)**.
        - The default is **false**. Applicable only if mode() is set to **AdviceMode.PROXY**.
    - mode
        - The default is **AdviceMode.PROXY**.
            - Please note that proxy mode **allows for interception of calls through the proxy only**.
            - _**Local calls within the same class cannot get intercepted that way!!**_
            - An **Transactional** annotation on such a method within a **local call** will be **ignored** since Spring's interceptor does not even kick in for such a runtime scenario.
        - For a more advanced mode of interception, consider switching this to **AdviceMode.ASPECTJ**.
    - order
        - Indicate the ordering of the execution of the transaction advisor when multiple advices are applied at a specific joinpoint.
        - The default is **Ordered.LOWEST_PRECEDENCE**.
2. @Transactional
    - transactionManager
    - propagation
    - isolation
    - timeout
    - readOnly
    - rollbackFor/noRollbackFor

### PersonService接口
由于@EnableTransactionManagement的mode默认值为**PROXY**，PROXY对应的是**JDK动态代理**（基于**接口**）
```java
public interface PersonService {
    void insert();
    void insertThenRollback();
    void invokeInsertThenRollback();
}
```

### PersonServiceImpl
```java
@Component
public class PersonServiceImpl implements PersonService {
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void insert() {
        jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
    }

    @Override
    @Transactional(rollbackFor = UnexpectedRollbackException.class)
    public void insertThenRollback() {
        jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES ('A')");
        throw new UnexpectedRollbackException("Just For Test");
    }

    @Override
    public void invokeInsertThenRollback() {
        // 方法的内部调用，没有走到增强的代理类上，因此也没有事务支持（实际是使用了数据库的隐式事务，自动提交）
        // 不会回滚！！
        insertThenRollback();
    }
}
```

### DeclarativeTransactionApplication
```java
@Slf4j
@SpringBootApplication
public class DeclarativeTransactionApplication implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private PersonService personService;

    public static void main(String[] args) {
        SpringApplication.run(DeclarativeTransactionApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        personService.insert();
        log.info("insert, count : {}", getCount());

        try {
            personService.insertThenRollback();
        } catch (Throwable throwable) {
            log.info("insertThenRollback, count : {}", getCount());
        }

        try {
            personService.invokeInsertThenRollback();
        } catch (Throwable throwable) {
            log.info("invokeInsertThenRollback, count : {}", getCount());
        }

        // 输出
        // insert, count : 2
        // insertThenRollback, count : 2
        // invokeInsertThenRollback, count : 3
    }

    private long getCount() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM PERSON", Long.class);
    }
}
```
