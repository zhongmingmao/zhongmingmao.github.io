---
title: Spring -- 单数据源
mathjax: false
date: 2019-07-25 09:35:01
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - H2
    - JDBC
---

## Spring

### 需要配置的Bean
1. 数据源相关
    - **DataSource**（根据选择的**连接池**决定）
2. 事务相关（可选）
    - **PlatformTransactionManager**（常用的是**DataSourceTransactionManager**）
    - **TransactionTemplate**
3. 操作相关（可选）
    - **JdbcTemplate**

<!-- more -->

### 依赖
```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-dbcp2</artifactId>
    <version>2.7.0</version>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <version>1.4.199</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-context</artifactId>
    <version>5.1.9.RELEASE</version>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-jdbc</artifactId>
    <version>5.1.9.RELEASE</version>
</dependency>
```

<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-single-data-source-simple-dependency.png" width=400/>

### applicationContext.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:c="http://www.springframework.org/schema/c"
       xmlns:p="http://www.springframework.org/schema/p" xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="http://www.springframework.org/schema/beans
    http://www.springframework.org/schema/beans/spring-beans-4.1.xsd
    http://www.springframework.org/schema/context
    http://www.springframework.org/schema/context/spring-context-4.1.xsd">

    <context:component-scan base-package="me.zhongmingmao"/>

    <!-- 代码中配置 -->
    <!--
    <bean id="dataSource" class="org.apache.commons.dbcp2.BasicDataSource" destroy-method="close">
        <property name="driverClassName" value="org.h2.Driver"/>
        <property name="url" value="jdbc:h2:mem:testdb"/>
        <property name="username" value="SA"/>
        <property name="password" value=""/>
    </bean>
    -->

</beans>
```

### Java代码
```java
@Configuration
@EnableTransactionManagement
public class DataSourceDemo {

    @Autowired
    private DataSource dataSource;

    public static void main(String[] args) throws SQLException {
        ApplicationContext applicationContext =
                new ClassPathXmlApplicationContext("applicationContext*.xml");
        showBeans(applicationContext);
        dataSourceDemo(applicationContext);
    }

    @Bean(destroyMethod = "close")
    public DataSource dataSource() throws Exception {
        Properties properties = new Properties();
        properties.setProperty("driverClassName", "org.h2.Driver");
        properties.setProperty("url", "jdbc:h2:mem:testdb");
        properties.setProperty("username", "SA");
        // dbcp2
        return BasicDataSourceFactory.createDataSource(properties);
    }

    @Bean
    public PlatformTransactionManager transactionManager() throws Exception {
        return new DataSourceTransactionManager(dataSource());
    }

    private void showDataSource() throws SQLException {
        System.out.println("dataSource=" + dataSource);
        Connection connection = dataSource.getConnection();
        System.out.println("connection=" + connection);
        connection.close();
    }

    private static void showBeans(ApplicationContext applicationContext) {
        System.out.println("beans=" + Arrays.toString(applicationContext.getBeanDefinitionNames()));
    }

    private static void dataSourceDemo(ApplicationContext applicationContext) throws SQLException {
        DataSourceDemo dataSourceDemo = applicationContext.getBean("dataSourceDemo", DataSourceDemo.class);
        dataSourceDemo.showDataSource();
    }
}
```

```
dataSource=org.apache.commons.dbcp2.BasicDataSource@2a798d51
connection=1704237553, URL=jdbc:h2:mem:testdb, UserName=SA, H2 JDBC Driver
```

## Spring Boot

### 自动配置
| 需要配置的Bean | 自动配置 |
| ---- | ---- |
| DataSource | **DataSourceAutoConfiguration** |
| DataSourceTransactionManager | **DataSourceTransactionManagerAutoConfiguration** |
| JdbcTemplate | **JdbcTemplateAutoConfiguration** |

### 依赖
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
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

[Maven Scope](https://www.jianshu.com/p/7145f01ac3ad)

### Java代码
```java
@Slf4j
@SpringBootApplication
public class SingleDataSourceApplication implements CommandLineRunner {

    // 依据依赖关系，自动配置
    @Autowired
    private DataSource dataSource;

    public static void main(String[] args) {
        SpringApplication.run(SingleDataSourceApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        showConnection();
    }

    private void showConnection() throws SQLException {
        log.info("dataSource={}", dataSource);
        Connection connection = dataSource.getConnection();
        log.info("connection={}", connection);
        connection.close();
    }
}
```

```
dataSource=HikariDataSource (null)
connection=HikariProxyConnection@1903406683 wrapping conn0: url=jdbc:h2:mem:testdb user=SA
```

### 查看Bean
路径：`/actuator/beans`

```json
"dataSource": {
    "aliases": [],
    "scope": "singleton",
    "type": "com.zaxxer.hikari.HikariDataSource",
    "resource": "class path resource [org/springframework/boot/autoconfigure/jdbc/DataSourceConfiguration$Hikari.class]",
    "dependencies": ["spring.datasource-org.springframework.boot.autoconfigure.jdbc.DataSourceProperties"]
}

"transactionManager": {
    "aliases": [],
    "scope": "singleton",
    "type": "org.springframework.jdbc.datasource.DataSourceTransactionManager",
    "resource": "class path resource [org/springframework/boot/autoconfigure/jdbc/DataSourceTransactionManagerAutoConfiguration$DataSourceTransactionManagerConfiguration.class]",
    "dependencies": ["spring.datasource-org.springframework.boot.autoconfigure.jdbc.DataSourceProperties"]
}

"jdbcTemplate": {
    "aliases": [],
    "scope": "singleton",
    "type": "org.springframework.jdbc.core.JdbcTemplate",
    "resource": "class path resource [org/springframework/boot/autoconfigure/jdbc/JdbcTemplateAutoConfiguration$JdbcTemplateConfiguration.class]",
    "dependencies": []
}
```

## H2

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
```

### schema.sql
```sql
CREATE TABLE PERSON(
ID BIGINT  PRIMARY KEY AUTO_INCREMENT,
FIRST_NAME VARCHAR(255),
LAST_NAME VARCHAR(255),
ADDRESS VARCHAR(255)
);
```

### data.sql
```sql
INSERT INTO PERSON (first_Name, Last_Name, Address) VALUES ('Tom', 'Syke', 'Green Valley');
```

### Person
```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Person {
    private Long id;
    private String firstName;
    private String lastName;
    private String address;
}
```

### PersonDao
```java
@Slf4j
@Repository
public class PersonDao {

    @Autowired
    private DataSource dataSource;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    public void printDataSource() throws SQLException {
        log.info("dataSource={}", dataSource);
        Connection connection = dataSource.getConnection();
        log.info("connection={}", connection);
        connection.close();
    }

    public void save(Person person) {
        String sql = "INSERT INTO Person (FIRST_NAME, LAST_NAME, ADDRESS) VALUES (?, ?, ?)";
        jdbcTemplate.update(sql, person.getFirstName(), person.getLastName(), person.getAddress());
    }

    public List<Person> loadAll() {
        return jdbcTemplate.query("SELECT * FROM PERSON", (resultSet, i) -> toPerson(resultSet));
    }

    private Person toPerson(ResultSet resultSet) throws SQLException {
        Person person = new Person();
        person.setId(resultSet.getLong("ID"));
        person.setFirstName(resultSet.getString("FIRST_NAME"));
        person.setLastName(resultSet.getString("LAST_NAME"));
        person.setAddress(resultSet.getString("ADDRESS"));
        return person;
    }
}
```

### Client
```java
@Component
public class Client {

    @Autowired
    private PersonDao personDao;

    public void run() throws SQLException {
        personDao.printDataSource();

        personDao.save(new Person(null, "Dana", "Whitley", "464 Yellow Drive"));
        personDao.save(new Person(null, "Robin", "Cash", "64 Logic Park"));

        List<Person> persons = personDao.loadAll();
        persons.forEach(System.out::println);
    }
}
```

### SingleDatasourceH2Application
```java
@SpringBootApplication
public class SingleDatasourceH2Application implements CommandLineRunner {

    @Autowired
    private Client client;

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(SingleDatasourceH2Application.class);
        application.setBannerMode(Banner.Mode.OFF);
        application.run(args);
    }

    @Override
    public void run(String... args) throws SQLException {
        client.run();
    }
}
```

```java
dataSource=HikariDataSource (HikariPool-1)
connection=HikariProxyConnection@848961421 wrapping conn0: url=jdbc:h2:mem:testdb user=SA

Person(id=1, firstName=Tom, lastName=Syke, address=Green Valley)
Person(id=2, firstName=Dana, lastName=Whitley, address=464 Yellow Drive)
Person(id=3, firstName=Robin, lastName=Cash, address=64 Logic Park)
```
