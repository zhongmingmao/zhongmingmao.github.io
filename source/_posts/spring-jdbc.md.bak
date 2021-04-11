---
title: Spring -- JDBC
mathjax: false
date: 2019-08-01 17:19:43
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - H2
    - JDBC
---

## Spring JDBC的操作类
1. core：JdbcTemplate等相关核心接口和类
2. dataSource：数据源相关的辅助类
3. object：将基本的JDBC操作封装成对象
4. support：错误码等其他辅助工具

<!-- more -->

## 常用的Bean注解
1. @Component -- 通用Bean
2. @Repository -- 数据操作的仓库
3. @Service -- 业务服务
4. @Controller -- Spring MVC
    - @RestController -- RESTful Web Services

## 简单使用
1. query
2. queryForObject
3. queryForList
4. update：插入、修改、删除
5. execute

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

### Person
```java
@Data
@Builder
public class Person {
    private Long id;
    private String name;
}
```

### PersonDao
```java
@Slf4j
@Repository
public class PersonDao {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private SimpleJdbcInsert simpleJdbcInsert;

    public void insert() {
        Arrays.asList("A", "B").forEach(name -> jdbcTemplate.update("INSERT INTO PERSON (NAME) VALUES (?)", name));

        Map<String, String> row = new HashMap<>();
        row.put("NAME", "C");
        Number id = simpleJdbcInsert.executeAndReturnKey(row);
        log.info("ID of C : {}", id);
    }

    public void list() {
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM PERSON", Long.class);
        log.info("count : {}", count);

        List<String> names = jdbcTemplate.queryForList("SELECT NAME FROM PERSON", String.class);
        names.forEach(name -> log.info("name : {}", name));

        // 自定义RowMapper
        List<Person> people = jdbcTemplate.query("SELECT * FROM PERSON",
                (rs, rowNum) -> Person.builder().id(rs.getLong(1)).name(rs.getString(2)).build());
        people.forEach(person -> log.info("person : {}", person));
    }
}
```

### JdbcApplication
```java
@Slf4j
@SpringBootApplication
public class JdbcApplication implements CommandLineRunner {
    @Autowired
    private PersonDao personDao;

    public static void main(String[] args) {
        SpringApplication.run(JdbcApplication.class, args);
    }

    @Bean
    @Autowired
    public SimpleJdbcInsert simpleJdbcInsert(JdbcTemplate jdbcTemplate) {
        // SimpleJdbcInsert是Spring JDBC提供的一个辅助类，可以更方便地使用JdbcTemplate
        return new SimpleJdbcInsert(jdbcTemplate).withTableName("PERSON").usingGeneratedKeyColumns("ID");
    }

    @Override
    public void run(String... args) throws Exception {
        personDao.insert();
        personDao.list();
    }
}
```

## 批处理
```java
// JdbcTemplate
int[] batchUpdate(String sql, BatchPreparedStatementSetter pss) throws DataAccessException;

// NamedParameterJdbcTemplate
int[] batchUpdate(String sql, SqlParameterSource[] batchArgs);
SqlParameterSourceUtils.createBatch
```

### Bean定义
```java
@Bean
@Autowired
public NamedParameterJdbcTemplate namedParameterJdbcTemplate(DataSource dataSource) {
    return new NamedParameterJdbcTemplate(dataSource);
}
```

### 两种方式
```java
// jdbcTemplate
jdbcTemplate.batchUpdate("INSERT INTO PERSON (NAME) VALUES (?)", new BatchPreparedStatementSetter() {
    @Override
    public void setValues(PreparedStatement ps, int i) throws SQLException {
        ps.setString(1, "batch-" + i);
    }

    @Override
    public int getBatchSize() {
        return 2;
    }
});

// namedParameterJdbcTemplate，更优雅！
List<Person> list = new ArrayList<>();
list.add(Person.builder().id(100L).name("batch-100").build());
list.add(Person.builder().id(101L).name("batch-101").build());
namedParameterJdbcTemplate.batchUpdate("INSERT INTO PERSON (ID, NAME) VALUES (:id, :name)",
        SqlParameterSourceUtils.createBatch(list));
```
