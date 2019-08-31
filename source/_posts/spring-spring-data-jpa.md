---
title: Spring -- Spring Data JPA
mathjax: false
date: 2019-08-17 09:37:09
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - O/R Mapping
    - JPA
    - Spring Data
    - Spring Data JPA
    - Hibernate
    - UML
---

## O/R Mapping
RDBMS : **Relational** database management system

| | Object | RDBMS |
| ---- | ---- | ---- |
| 粒度 | 类 | 表 |
| 继承 | 有 | 无 |
| 唯一性 | a==b<br/>a.equals(b) | 主键 |
| 关联 | 引用 | 外键 |
| 数据访问 | 逐级访问 | SQL数量要少 |

<!-- more -->

## Hibernate

### 简介
1. Hibernate是一款**开源**的**O/R Mapping**框架
2. 将开发者从95%的常见**数据持久化**（**简单的CRUD**）工作中解放出来
3. 屏蔽**底层数据库**（MySQL/Oracle/H2）的差异

### 发展历程
1. 2001年，Hibernate发布第一个版本
2. 2003年，Hibernate开发团队加入JBoss
3. 2006年，**Hibernate 3.2成为JPA实现**

## JPA
1. JPA : **Java Persistence API**
2. JPA为**O/R Mapping**提供了一种_**基于POJO的持久化模型**_
    - 简化数据持久化代码的开发工作
    - 为Java社区屏蔽**不同持久化API**（Hibernate/JDO/EJB）的差异
3. 在2006年**JPA 1.0**作为**JSR 220**的一部分正式发布（JSR，Java Specification Request）

## Spring Data
1. Spring将与数据操作相关的内容**剥离出Spring Framework**，统一到**Spring Data**
2. 在**保留底层存储特性**的同时，提供**相对一致**的，基于**Spring**的编程模型
3. 主要模块：Spring Data Commons、Spring Data JDBC、**Spring Data JPA**、Spring Data Redis
    - Spring Data JDBC -- JdbcTemplate
    - Spring Data Redis -- RedisTemplate

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
    <version>2.1.7.RELEASE</version>
</dependency>
```

## JPA注解
1. 实体
    - @Entity
    - @MappedSuperclass
    - @Table
2. 主键
    - @Id
        - @GeneratedValue(strategy, generator)
        - @SequenceGenerator(name, sequenceName)
3. 映射
    - @Column(name, nullable, length, insertable, updatable)
    - @JoinTable(name)、@JoinColumn(name)
4. 关系
    - @OneToOne、@OneToMany、@ManyToOne、@ManyToMany
    - @OrderBy

```java
@Data
// 没有@Table注解，表名即为Product
@Entity(name = "Product")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequence-generator")
    @SequenceGenerator(name = "sequence-generator", sequenceName = "product_sequence")
    private Long id;

    @Column(name = "product_name")
    private String name;
}
```

## SpringBucks

### UML

#### 时序图
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-data-jpa-sequence.png" width=400/>

#### 部署图
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-data-jpa-deployment.png" width=400/>

#### 对象图
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-data-jpa-object.png" width=400/>

#### 状态图
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-data-jpa-state.png" width=200/>

### 依赖
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
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
<dependency>
    <groupId>org.joda</groupId>
    <artifactId>joda-money</artifactId>
    <version>1.0.1</version>
</dependency>
<dependency>
    <groupId>org.jadira.usertype</groupId>
    <artifactId>usertype.core</artifactId>
    <version>6.0.1.GA</version>
</dependency>
```

### Entity

#### BaseEntity
```java
@MappedSuperclass
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BaseEntity implements Serializable {
    @Id
    // 如果strategy采用GenerationType.IDENTITY，使用数据库的自增主键，不会生成sequence表
    @GeneratedValue
    private Long id;

    @Column(updatable = false)
    @CreationTimestamp
    private Date createTime;

    @UpdateTimestamp
    private Date updateTime;
}
```

#### Coffee
```java
@Entity
@Table(name = "T_MENU")
@Builder
@Data
@ToString(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Coffee extends BaseEntity {
    private String name;

    @Column
    @Type(type = "org.jadira.usertype.moneyandcurrency.joda.PersistentMoneyMinorAmount",
            parameters = {@org.hibernate.annotations.Parameter(name = "currencyCode", value = "CNY")})
    private Money price;
}
```

#### Order
```java
@Entity
@Table(name = "T_ORDER")
@Builder
@Data
@ToString(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class Order extends BaseEntity {
    private String customer;

    @ManyToMany
    @JoinTable(name = "T_ORDER_COFFEE") // 映射表
    private List<Coffee> items;

    @Enumerated // 映射成integer
    @Column(nullable = false)
    private OrderState state;
}

public enum OrderState {
    INIT, PAID, BREWING, BREWED, TAKEN, CANCELLED
}
```

#### application.properties
```
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.properties.hibernate.show_sql=true
spring.jpa.properties.hibernate.format_sql=true
```

#### 相关日志
```
Hibernate:

    drop table t_menu if exists
Hibernate:

    drop table t_order if exists
Hibernate:

    drop table t_order_coffee if exists
Hibernate:

    drop sequence if exists hibernate_sequence
```
```
Hibernate: create sequence hibernate_sequence start with 1 increment by 1
Hibernate:

    create table t_menu (
       id bigint not null,
        create_time timestamp,
        update_time timestamp,
        name varchar(255),
        price bigint,
        primary key (id)
    )
Hibernate:

    create table t_order (
       id bigint not null,
        create_time timestamp,
        update_time timestamp,
        customer varchar(255),
        state integer not null,
        primary key (id)
    )
Hibernate:

    create table t_order_coffee (
       order_id bigint not null,
        items_id bigint not null
    )
Hibernate:

    alter table t_order_coffee
       add constraint FKj2swxd3y69u2tfvalju7sr07q
       foreign key (items_id)
       references t_menu
Hibernate:

    alter table t_order_coffee
       add constraint FKjnvwi9aq5s71k7dru924mleq7
       foreign key (order_id)
       references t_order
```
```
Hibernate:

   drop table t_menu if exists
Hibernate:

   drop table t_order if exists
Hibernate:

   drop table t_order_coffee if exists
Hibernate:

   drop sequence if exists hibernate_sequence
```

### Repository
```java
@EnableJpaRepositories

JpaRepository<T, ID> extends PagingAndSortingRepository<T, ID>
PagingAndSortingRepository<T, ID> extends CrudRepository<T, ID>
CrudRepository<T, ID> extends Repository<T, ID>
```

#### 定义查询
1. find..by.. / find..by.. / query..by.. / get..by..
2. count..by..
3. ..OrderBy..[Asc/Desc]
4. And / Or / IgnoreCase
5. Top / First / Distinct

#### 分页查询
1. PagingAndSortingRepository\<T, ID\>
2. Pageable / Sort
3. Slice\<T\> / Page\<T\>

#### 保存Entity

##### CoffeeRepository
```java
public interface CoffeeRepository extends CrudRepository<Coffee, Long> {
}
```

##### OrderRepository
```java
public interface OrderRepository extends CrudRepository<Order, Long> {
}
```

##### SpringDataJpaApplication
```java
@Slf4j
@EnableJpaRepositories
@SpringBootApplication
public class SpringDataJpaApplication implements ApplicationRunner {

    @Autowired
    private CoffeeRepository coffeeRepository;
    @Autowired
    private OrderRepository orderRepository;

    public static void main(String[] args) {
        SpringApplication.run(SpringDataJpaApplication.class, args);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        initOrders();
    }

    private void initOrders() {
        Coffee espresso = Coffee.builder().name("espresso")
                .price(Money.of(CurrencyUnit.of("CNY"), 20.0)).build();
        coffeeRepository.save(espresso);
        log.info("Coffee: {}", espresso);

        Coffee latte = Coffee.builder().name("latte")
                .price(Money.of(CurrencyUnit.of("CNY"), 30.0)).build();
        coffeeRepository.save(latte);
        log.info("Coffee: {}", latte);

        Order order = Order.builder().customer("zhongmingmao")
                .items(Arrays.asList(espresso))
                .state(OrderState.INIT).build();
        orderRepository.save(order);
        log.info("Order: {}", order);

        order = Order.builder().customer("zhongmingmao")
                .items(Arrays.asList(espresso, latte))
                .state(OrderState.INIT).build();
        orderRepository.save(order);
        log.info("Order: {}", order);
    }
}
```

##### 相关日志
```
Hibernate:
    call next value for hibernate_sequence
Hibernate:
    insert
    into
        t_menu
        (create_time, update_time, name, price, id)
    values
        (?, ?, ?, ?, ?)

Coffee: Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), name=espresso, price=CNY 20.00)
```
```
Hibernate:
    call next value for hibernate_sequence
Hibernate:
    insert
    into
        t_menu
        (create_time, update_time, name, price, id)
    values
        (?, ?, ?, ?, ?)

Coffee: Coffee(super=BaseEntity(id=2, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), name=latte, price=CNY 30.00)
```
```
Hibernate:
    call next value for hibernate_sequence
Hibernate:
    insert
    into
        t_order
        (create_time, update_time, customer, state, id)
    values
        (?, ?, ?, ?, ?)
Hibernate:
    insert
    into
        t_order_coffee
        (order_id, items_id)
    values
        (?, ?)

Order: Order(super=BaseEntity(id=3, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), customer=zhongmingmao, items=[Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), name=espresso, price=CNY 20.00)], state=INIT)
```
```
Hibernate:
    call next value for hibernate_sequence
Hibernate:
    insert
    into
        t_order
        (create_time, update_time, customer, state, id)
    values
        (?, ?, ?, ?, ?)
Hibernate:
    insert
    into
        t_order_coffee
        (order_id, items_id)
    values
        (?, ?)
Hibernate:
    insert
    into
        t_order_coffee
        (order_id, items_id)
    values
        (?, ?)

Order: Order(super=BaseEntity(id=4, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), customer=zhongmingmao, items=[Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), name=espresso, price=CNY 20.00), Coffee(super=BaseEntity(id=2, createTime=Sat Aug 31 14:27:26 CST 2019, updateTime=Sat Aug 31 14:27:26 CST 2019), name=latte, price=CNY 30.00)], state=INIT)
```

#### 查询Entity

##### BaseRepository
```java
@NoRepositoryBean // 告知Spring无需为BaseRepository创建Bean
public interface BaseRepository<T, ID> extends PagingAndSortingRepository<T, ID> {
    List<T> findTop3ByOrderByUpdateTimeDescIdAsc();
}
```

##### CoffeeRepository
```java
public interface CoffeeRepository extends BaseRepository<Coffee, Long> {
}
```

##### OrderRepository
```java
public interface OrderRepository extends BaseRepository<Order, Long> {
    List<Order> findByCustomerOrderById(String customer);

    List<Order> findByItems_Name(String name);
}
```

##### SpringDataJpaApplication
```java
private void findOrders() {
    coffeeRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
            .forEach(coffee -> log.info("Loading {}", coffee));

    List<Order> orders = orderRepository.findTop3ByOrderByUpdateTimeDescIdAsc();
    log.info("findTop3ByOrderByUpdateTimeDescIdAsc: {}", getJoinedOrderId(orders));

    orders = orderRepository.findByCustomerOrderById("zhongmingmao");
    log.info("findByCustomerOrderById: {}", getJoinedOrderId(orders));

    // 不开启事务会因为没有Session而报LazyInitializationException
    // run方法加上@Transactional注解
    orders.forEach(order -> {
        log.info("Order: {}", order.getId());
        order.getItems().forEach(coffee -> log.info(" Item {}", coffee));
    });

    orders = orderRepository.findByItems_Name("latte");
    log.info("findByItems_Name: {}", getJoinedOrderId(orders));
}

private String getJoinedOrderId(List<Order> orders) {
    return orders.stream().map(order -> order.getId().toString()).collect(Collectors.joining(","));
}
```

##### 相关日志
```
Hibernate:
    select
        coffee0_.id as id1_0_,
        coffee0_.create_time as create_t2_0_,
        coffee0_.update_time as update_t3_0_,
        coffee0_.name as name4_0_,
        coffee0_.price as price5_0_
    from
        t_menu coffee0_
    order by
        coffee0_.id desc

Loading Coffee(super=BaseEntity(id=2, createTime=Sat Aug 31 15:03:49 CST 2019, updateTime=Sat Aug 31 15:03:49 CST 2019), name=latte, price=CNY 30.00)
Loading Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 15:03:49 CST 2019, updateTime=Sat Aug 31 15:03:49 CST 2019), name=espresso, price=CNY 20.00)
```
```
Hibernate:
    select
        order0_.id as id1_1_,
        order0_.create_time as create_t2_1_,
        order0_.update_time as update_t3_1_,
        order0_.customer as customer4_1_,
        order0_.state as state5_1_
    from
        t_order order0_
    order by
        order0_.update_time desc,
        order0_.id asc limit ?

findTop3ByOrderByUpdateTimeDescIdAsc: 4,3
```
```
Hibernate:
    select
        order0_.id as id1_1_,
        order0_.create_time as create_t2_1_,
        order0_.update_time as update_t3_1_,
        order0_.customer as customer4_1_,
        order0_.state as state5_1_
    from
        t_order order0_
    where
        order0_.customer=?
    order by
        order0_.id asc

findByCustomerOrderById: 3,4
Order: 3
 Item Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 15:03:49 CST 2019, updateTime=Sat Aug 31 15:03:49 CST 2019), name=espresso, price=CNY 20.00)
Order: 4
 Item Coffee(super=BaseEntity(id=1, createTime=Sat Aug 31 15:03:49 CST 2019, updateTime=Sat Aug 31 15:03:49 CST 2019), name=espresso, price=CNY 20.00)
 Item Coffee(super=BaseEntity(id=2, createTime=Sat Aug 31 15:03:49 CST 2019, updateTime=Sat Aug 31 15:03:49 CST 2019), name=latte, price=CNY 30.00)
```
```
Hibernate:
    select
        order0_.id as id1_1_,
        order0_.create_time as create_t2_1_,
        order0_.update_time as update_t3_1_,
        order0_.customer as customer4_1_,
        order0_.state as state5_1_
    from
        t_order order0_
    left outer join
        t_order_coffee items1_
            on order0_.id=items1_.order_id
    left outer join
        t_menu coffee2_
            on items1_.items_id=coffee2_.id
    where
        coffee2_.name=?

findByItems_Name: 4
```

## Repository to Bean
