---
title: Spring -- MyBatis
mathjax: false
date: 2019-08-21 12:21:27
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - O/R Mapping
    - MyBatis
---

## 概述
1. MyBatis是一款优秀的持久层框架
2. MyBatis支持_**定制化SQL、存储过程和高级映射**_
3. JPA Or MyBatis
    - JPA：数据操作都比较简单
    - MyBatis：DBA需要对SQL进行审核，复杂SQL
4. Spring + MyBatis
    - MyBatis Spring Adapter
    - MyBatis Spring-Boot-Starter

<!-- more -->

## 简单使用

### pom.xml
```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>1.3.2</version>
</dependency>
<dependency>
    <groupId>org.joda</groupId>
    <artifactId>joda-money</artifactId>
    <version>LATEST</version>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### schema.sql
```sql
create table t_coffee (
    id bigint not null auto_increment,
    name varchar(255),
    price bigint not null,
    create_time timestamp,
    update_time timestamp,
    primary key (id)
);
```

### application.properties
```
mybatis.type-handlers-package=me.zhongmingmao.mybatis.handler
mybatis.configuration.map-underscore-to-camel-case=true
```

### Coffee
```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Coffee {
    private Long id;
    private String name;
    private Money price;
    private Date createTime;
    private Date updateTime;
}
```

### MoneyTypeHandler
```java
package me.zhongmingmao.mybatis.handler;

/**
 * 在 Money 与 Long 之间转换的 TypeHandler，处理 CNY 人民币
 */
public class MoneyTypeHandler extends BaseTypeHandler<Money> {
    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Money parameter, JdbcType jdbcType) throws SQLException {
        ps.setLong(i, parameter.getAmountMinorLong());
    }

    @Override
    public Money getNullableResult(ResultSet rs, String columnName) throws SQLException {
        return parseMoney(rs.getLong(columnName));
    }

    @Override
    public Money getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return parseMoney(rs.getLong(columnIndex));
    }

    @Override
    public Money getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return parseMoney(cs.getLong(columnIndex));
    }

    private Money parseMoney(Long value) {
        // return Money.ofMinor(CurrencyUnit.of("CNY"), value);
        return Money.of(CurrencyUnit.of("CNY"), value / 100.0);
    }
}
```

### CoffeeMapper
```java
package me.zhongmingmao.mybatis.mapper;

@Mapper
public interface CoffeeMapper {

    @Insert("insert into t_coffee (name, price, create_time, update_time) values (#{name}, #{price}, now(), now())")
    @Options(useGeneratedKeys = true)
    int save(Coffee coffee);

    @Select("select * from t_coffee where id = #{id}")
    @Results({
            @Result(id = true, column = "id", property = "id"),
            @Result(column = "create_time", property = "createTime"),
            // map-underscore-to-camel-case = true 可以实现一样的效果
            // @Result(column = "update_time", property = "updateTime"),
    })
    Coffee findById(@Param("id") Long id);
}
```

### 主程序
```java
@Slf4j
@MapperScan("me.zhongmingmao.mybatis.mapper")
@SpringBootApplication
public class MybatisApplication implements ApplicationRunner {

    @Autowired
    private CoffeeMapper coffeeMapper;

    public static void main(String[] args) {
        SpringApplication.run(MybatisApplication.class, args);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        Coffee coffee = Coffee.builder().name("espresso").price(Money.of(CurrencyUnit.of("CNY"), 20.0)).build();
        int count = coffeeMapper.save(coffee);
        log.info("Save {} Coffee: {}", count, coffee);

        coffee = Coffee.builder().name("latte").price(Money.of(CurrencyUnit.of("CNY"), 25.0)).build();
        count = coffeeMapper.save(coffee);
        log.info("Save {} Coffee: {}", count, coffee);

        coffee = coffeeMapper.findById(coffee.getId());
        log.info("Find Coffee: {}", coffee);
    }
}
```
```
Save 1 Coffee: Coffee(id=1, name=espresso, price=CNY 20.00, createTime=null, updateTime=null)
Save 1 Coffee: Coffee(id=2, name=latte, price=CNY 25.00, createTime=null, updateTime=null)
Find Coffee: Coffee(id=2, name=latte, price=CNY 25.00, createTime=Sun Sep 15 13:50:32 CST 2019, updateTime=Sun Sep 15 13:50:32 CST 2019)
```

## MyBatis Generator
1. MyBatis代码生成器
2. 根据**数据表**来生成相关代码
    - POJO
    - Mapper接口
    - SQL Map XML

### pom.xml
```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.1.0</version>
</dependency>
<dependency>
    <groupId>org.mybatis.generator</groupId>
    <artifactId>mybatis-generator-core</artifactId>
    <version>1.3.7</version>
</dependency>
<dependency>
    <groupId>org.joda</groupId>
    <artifactId>joda-money</artifactId>
    <version>LATEST</version>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### generatorConfig.xml
```xml
<generatorConfiguration>
    <context id="H2Tables" targetRuntime="MyBatis3">
        <plugin type="org.mybatis.generator.plugins.FluentBuilderMethodsPlugin"/>
        <plugin type="org.mybatis.generator.plugins.ToStringPlugin"/>
        <plugin type="org.mybatis.generator.plugins.SerializablePlugin"/>
        <plugin type="org.mybatis.generator.plugins.RowBoundsPlugin"/>

        <jdbcConnection driverClass="org.h2.Driver"
                        connectionURL="jdbc:h2:mem:testdb"
                        userId="sa"
                        password="">
        </jdbcConnection>

        <javaModelGenerator targetPackage="me.zhongmingmao.mybatis.generator.model"
                            targetProject="./src/main/java">
            <property name="enableSubPackages" value="true"/>
            <property name="trimStrings" value="true"/>
        </javaModelGenerator>

        <sqlMapGenerator targetPackage="me.zhongmingmao.mybatis.generator.mapper"
                         targetProject="./src/main/resources/mapper">
            <property name="enableSubPackages" value="true"/>
        </sqlMapGenerator>

        <!-- 混合模式 -->
        <javaClientGenerator type="MIXEDMAPPER"
                             targetPackage="me.zhongmingmao.mybatis.generator.mapper"
                             targetProject="./src/main/java">
            <property name="enableSubPackages" value="true"/>
        </javaClientGenerator>

        <table tableName="t_coffee" domainObjectName="Coffee">
            <generatedKey column="id" sqlStatement="CALL IDENTITY()" identity="true"/>
            <columnOverride column="price" javaType="org.joda.money.Money" jdbcType="BIGINT"
                            typeHandler="me.zhongmingmao.mybatis.generator.handler.MoneyTypeHandler"/>
        </table>
    </context>
</generatorConfiguration>
```

### 目录结构
```
src/main
├── java
│   └── me
│       └── zhongmingmao
│           └── mybatis
│               └── generator
│                   ├── MybatisGeneratorApplication.java
│                   └── handler
│                       └── MoneyTypeHandler.java
└── resources
    ├── application.properties
    ├── generatorConfig.xml
    ├── mapper
    └── schema.sql

```

### 生成MyBatis样板代码
```java
List<String> warnings = new ArrayList<>();
ConfigurationParser cp = new ConfigurationParser(warnings);
Configuration config = cp.parseConfiguration(getClass().getResourceAsStream("/generatorConfig.xml"));
DefaultShellCallback callback = new DefaultShellCallback(true);
MyBatisGenerator myBatisGenerator = new MyBatisGenerator(config, callback, warnings);
myBatisGenerator.generate(null);
```

### 目录结构
```
src/main
├── java
│   └── me
│       └── zhongmingmao
│           └── mybatis
│               └── generator
│                   ├── MybatisGeneratorApplication.java
│                   ├── handler
│                   │   └── MoneyTypeHandler.java
│                   ├── mapper
│                   │   └── CoffeeMapper.java
│                   └── model
│                       ├── Coffee.java
│                       └── CoffeeExample.java
└── resources
    ├── application.properties
    ├── generatorConfig.xml
    ├── mapper
    │   └── me
    │       └── zhongmingmao
    │           └── mybatis
    │               └── generator
    │                   └── mapper
    │                       └── CoffeeMapper.xml
    └── schema.sql
```

### application.properties
```
mybatis.mapper-locations=classpath*:/mapper/**/*.xml
mybatis.type-aliases-package=me.zhongmingmao.mybatis.generator.model
mybatis.type-handlers-package=me.zhongmingmao.mybatis.generator.handler
mybatis.configuration.map-underscore-to-camel-case=true
```

### 主程序
```java
Coffee espresso = new Coffee()
        .withName("espresso")
        .withPrice(Money.of(CurrencyUnit.of("CNY"), 20.0))
        .withCreateTime(new Date())
        .withUpdateTime(new Date());
coffeeMapper.insert(espresso);

Coffee latte = new Coffee()
        .withName("latte")
        .withPrice(Money.of(CurrencyUnit.of("CNY"), 30.0))
        .withCreateTime(new Date())
        .withUpdateTime(new Date());
coffeeMapper.insert(latte);

// 简单查询
Coffee s = coffeeMapper.selectByPrimaryKey(1L);
log.info("Coffee {}", s);

// 复杂查询
CoffeeExample example = new CoffeeExample();
example.createCriteria().andNameEqualTo("latte");
example.setOrderByClause("id desc");
List<Coffee> list = coffeeMapper.selectByExample(example);
list.forEach(e -> log.info("selectByExample: {}", e));
```
```
Coffee Coffee [Hash = 981159997, id=1, name=espresso, price=CNY 20.00, createTime=Sun Sep 15 15:32:52 CST 2019, updateTime=Sun Sep 15 15:32:52 CST 2019]
selectByExample: Coffee [Hash = 653345773, id=2, name=latte, price=CNY 30.00, createTime=Sun Sep 15 15:32:52 CST 2019, updateTime=Sun Sep 15 15:32:52 CST 2019]
```

## MyBatis PageHelper
1. 支持多种数据库
2. 支持多种分页方式
3. SpringBoot支持（pagehelper-spring-boot-starter）

### pom.xml
```xml
<dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>2.1.0</version>
</dependency>
<dependency>
    <groupId>com.github.pagehelper</groupId>
    <artifactId>pagehelper-spring-boot-starter</artifactId>
    <version>1.2.12</version>
</dependency>
<dependency>
    <groupId>org.joda</groupId>
    <artifactId>joda-money</artifactId>
    <version>LATEST</version>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### data.sql
```sql
insert into t_coffee (name, price, create_time, update_time) values ('espresso', 2000, now(), now());
insert into t_coffee (name, price, create_time, update_time) values ('latte', 2500, now(), now());
insert into t_coffee (name, price, create_time, update_time) values ('capuccino', 2500, now(), now());
insert into t_coffee (name, price, create_time, update_time) values ('mocha', 3000, now(), now());
insert into t_coffee (name, price, create_time, update_time) values ('macchiato', 3000, now(), now());
```

### CoffeeMapper
```java
@Mapper
public interface CoffeeMapper {

    @Select("select * from t_coffee order by id")
    List<Coffee> findAllWithRowBounds(RowBounds rowBounds);

    @Select("select * from t_coffee order by id")
    List<Coffee> findAllWithParam(@Param("pageNum") int pageNum, @Param("pageSize") int pageSize);
}
```

### application.properties
```
# mybatis
mybatis.type-handlers-package=me.zhongmingmao.mybatis.pagehelper.handler
mybatis.configuration.map-underscore-to-camel-case=true
# pagehelper
pagehelper.offset-as-page-num=true
pagehelper.reasonable=true
pagehelper.page-size-zero=true
pagehelper.support-methods-arguments=true
```

### 主程序
```java
coffeeMapper.findAllWithRowBounds(new RowBounds(1, 3))
        .forEach(coffee -> log.info("Page(1) Coffee {}", coffee));
coffeeMapper.findAllWithRowBounds(new RowBounds(2, 3))
        .forEach(coffee -> log.info("Page(2) Coffee {}", coffee));

log.info("==============");

// 获取所有记录
coffeeMapper.findAllWithRowBounds(new RowBounds(1, 0))
        .forEach(coffee -> log.info("Page(1) Coffee {}", coffee));

coffeeMapper.findAllWithParam(1, 3)
        .forEach(coffee -> log.info("Page(1) Coffee {}", coffee));
List<Coffee> list = coffeeMapper.findAllWithParam(2, 3);
PageInfo<Coffee> pageInfo = new PageInfo<>(list);
log.info("PageInfo: {}", pageInfo);
```
```
Page(1) Coffee Coffee(id=1, name=espresso, price=CNY 20.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=2, name=latte, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=3, name=capuccino, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(2) Coffee Coffee(id=4, name=mocha, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(2) Coffee Coffee(id=5, name=macchiato, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
==============
Page(1) Coffee Coffee(id=1, name=espresso, price=CNY 20.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=2, name=latte, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=3, name=capuccino, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=4, name=mocha, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=5, name=macchiato, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=1, name=espresso, price=CNY 20.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=2, name=latte, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
Page(1) Coffee Coffee(id=3, name=capuccino, price=CNY 25.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)
PageInfo: PageInfo{pageNum=2, pageSize=3, size=2, startRow=4, endRow=5, total=5, pages=2, list=Page{count=true, pageNum=2, pageSize=3, startRow=3, endRow=6, total=5, pages=2, reasonable=true, pageSizeZero=true}[Coffee(id=4, name=mocha, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019), Coffee(id=5, name=macchiato, price=CNY 30.00, createTime=Sun Sep 15 16:12:50 CST 2019, updateTime=Sun Sep 15 16:12:50 CST 2019)], prePage=1, nextPage=0, isFirstPage=false, isLastPage=true, hasPreviousPage=true, hasNextPage=false, navigatePages=8, navigateFirstPage=1, navigateLastPage=2, navigatepageNums=[1, 2]}

```
