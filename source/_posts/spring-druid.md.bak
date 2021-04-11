---
title: Spring -- Druid
mathjax: false
date: 2019-07-30 18:19:35
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - JDBC
    - Druid
---

## HikariCP VS Druid
1. HikariCP
    - Fast, simple, reliable. HikariCP is a "zero-overhead" production ready JDBC connection pool
2. Druid
    - 为**监控**而生的数据库连接池

<!-- more -->

## 依赖
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
    <exclusions>
        <!-- 需要排除HikariCP -->
        <exclusion>
            <groupId>com.zaxxer</groupId>
            <artifactId>HikariCP</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>1.1.18</version>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

## 自定义Filter

### ConnectionLogFilter
```java
@Slf4j
public class ConnectionLogFilter extends FilterEventAdapter {

    @Override
    public void connection_connectBefore(FilterChain chain, Properties info) {
        log.info("Before Connection!");
    }

    @Override
    public void connection_connectAfter(ConnectionProxy connection) {
        log.info("After Connection!");
    }
}
```

### META-INF/druid-filter.properties
```
druid.filters.connectionLog=me.zhongmingmao.druid.ConnectionLogFilter
```

## 密码加密

### 加密
```
$ java -cp druid-1.1.18.jar com.alibaba.druid.filter.config.ConfigTools zhongmingmao
privateKey:MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEA0RCqooKQpXfLjH8rScU0CzNmzSCOcfWfbhs1PsmPpeVpmTJuIGiAc9Fh1ZyMEUu/Ys5WNMOLnoMfk47yxlm9qQIDAQABAkAY8V8aUm+Fflxnn8h/XarO50wNjyPPjtl9nntkyVF9HkGdCIol2rU54BP+w0nIEHQnlQNEUe1xRdF+PoUo47cBAiEA6i+7MnB7OYZmKVxzZPs+LoTtD8e+L8ucDbv2ntK3GAkCIQDkiegmbPGpZHys+Fltbzsqph3y3Eznr5EZoeZWAD6goQIhAMn1W9TF2B7l3tiwl/twCFIJ5H8FXOjPCMd3X9ncEnYxAiEAyAjZVQDYiU72PaPnCn1oiUz7O76N5eDrHUdzR+VQ6+ECIDT/Gfcrv+iCKbRWWHA/5Q8Acjs8XneAo6RuSB01lr5K
publicKey:MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANEQqqKCkKV3y4x/K0nFNAszZs0gjnH1n24bNT7Jj6XlaZkybiBogHPRYdWcjBFLv2LOVjTDi56DH5OO8sZZvakCAwEAAQ==
password:kasn+cz2VW19LhkoWU2BCGlFziWJR+3Ms/23owalPmV797PSues2cQqMp3OdFPlvonioz4H5Os9jt98hcNwW7Q==
```

### application.properties
```
# JDBC配置
spring.datasource.url=jdbc:h2:mem:testDb
spring.datasource.username=SA
spring.datasource.password=kasn+cz2VW19LhkoWU2BCGlFziWJR+3Ms/23owalPmV797PSues2cQqMp3OdFPlvonioz4H5Os9jt98hcNwW7Q==
spring.datasource.driver-class-name=org.h2.Driver
# 连接池配置
spring.datasource.druid.initial-size=5
spring.datasource.druid.max-active=5
spring.datasource.druid.min-idle=5
spring.datasource.druid.filters=stat,config,wall,connectionLog
spring.datasource.druid.filter.config.enabled=true
spring.datasource.druid.connection-properties=druid.stat.logSlowSql=true;druid.stat.slowSqlMillis=0;config.decrypt=true;config.decrypt.key=${public-key}
spring.datasource.druid.test-on-borrow=true
spring.datasource.druid.test-on-return=true
spring.datasource.druid.test-while-idle=true
spring.datasource.druid.filter.wall.enabled=true
spring.datasource.druid.filter.wall.db-type=h2
spring.datasource.druid.filter.wall.config.delete-allow=false
spring.datasource.druid.filter.wall.config.truncate-allow=false
spring.datasource.druid.filter.wall.config.drop-table-allow=false
public-key=MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBANEQqqKCkKV3y4x/K0nFNAszZs0gjnH1n24bNT7Jj6XlaZkybiBogHPRYdWcjBFLv2LOVjTDi56DH5OO8sZZvakCAwEAAQ==
```

## 慢SQL
application.properties
```
spring.datasource.druid.connection-properties=druid.stat.logSlowSql=true;druid.stat.slowSqlMillis=0
```

## 监控
```java
@RestController
public class DruidStatController {

    @GetMapping("/druid/stat")
    public Object druidStat() {
        return DruidStatManagerFacade.getInstance().getDataSourceStatDataList();
    }
}
```

## 运行
```
2019-08-16 18:33:07.658  INFO 92273 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port(s): 8080 (http)
2019-08-16 18:33:07.693  INFO 92273 --- [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
2019-08-16 18:33:07.693  INFO 92273 --- [           main] org.apache.catalina.core.StandardEngine  : Starting Servlet engine: [Apache Tomcat/9.0.22]
2019-08-16 18:33:07.814  INFO 92273 --- [           main] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring embedded WebApplicationContext
2019-08-16 18:33:07.815  INFO 92273 --- [           main] o.s.web.context.ContextLoader            : Root WebApplicationContext: initialization completed in 2528 ms
2019-08-16 18:33:07.908  INFO 92273 --- [           main] c.a.d.s.b.a.DruidDataSourceAutoConfigure : Init DruidDataSource
2019-08-16 18:33:08.207 ERROR 92273 --- [           main] com.alibaba.druid.pool.DruidDataSource   : testOnBorrow is true, testOnReturn is true, testWhileIdle is true, validationQuery not set
2019-08-16 18:33:08.215  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : Before Connection!
2019-08-16 18:33:08.357  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : After Connection!
2019-08-16 18:33:08.382  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : Before Connection!
2019-08-16 18:33:08.386  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : After Connection!
2019-08-16 18:33:08.386  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : Before Connection!
2019-08-16 18:33:08.387  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : After Connection!
2019-08-16 18:33:08.388  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : Before Connection!
2019-08-16 18:33:08.388  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : After Connection!
2019-08-16 18:33:08.389  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : Before Connection!
2019-08-16 18:33:08.389  INFO 92273 --- [           main] m.z.druid.ConnectionLogFilter            : After Connection!
2019-08-16 18:33:08.397  INFO 92273 --- [           main] com.alibaba.druid.pool.DruidDataSource   : {dataSource-1} inited
2019-08-16 18:33:08.851 ERROR 92273 --- [           main] c.alibaba.druid.filter.stat.StatFilter   : slow sql 26 millis. CREATE TABLE PERSON( ID BIGINT PRIMARY KEY AUTO_INCREMENT, FIRST_NAME VARCHAR(255), LAST_NAME VARCHAR(255), ADDRESS VARCHAR(255) )[]
2019-08-16 18:33:08.898 ERROR 92273 --- [           main] c.alibaba.druid.filter.stat.StatFilter   : slow sql 3 millis. INSERT INTO PERSON (first_Name, Last_Name, Address) VALUES ('Tom', 'Syke', 'Green Valley')[]
2019-08-16 18:33:09.169  INFO 92273 --- [           main] o.s.s.concurrent.ThreadPoolTaskExecutor  : Initializing ExecutorService 'applicationTaskExecutor'
2019-08-16 18:33:09.438  INFO 92273 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 8080 (http) with context path ''
2019-08-16 18:33:09.444  INFO 92273 --- [           main] me.zhongmingmao.druid.DruidApplication   : Started DruidApplication in 5.007 seconds (JVM running for 7.017)
2019-08-16 18:33:09.451  INFO 92273 --- [           main] me.zhongmingmao.druid.PersonDao          : dataSource={
	CreateTime:"2019-08-16 18:33:07",
	ActiveCount:0,
	PoolingCount:5,
	CreateCount:5,
	DestroyCount:0,
	CloseCount:4,
	ConnectCount:4,
	Connections:[
		{ID:1365163763, ConnectTime:"2019-08-16 18:33:08", UseCount:0, LastActiveTime:"2019-08-16 18:33:08"},
		{ID:1414924274, ConnectTime:"2019-08-16 18:33:08", UseCount:0, LastActiveTime:"2019-08-16 18:33:08"},
		{ID:957387062, ConnectTime:"2019-08-16 18:33:08", UseCount:0, LastActiveTime:"2019-08-16 18:33:08"},
		{ID:666911607, ConnectTime:"2019-08-16 18:33:08", UseCount:0, LastActiveTime:"2019-08-16 18:33:08"},
		{ID:55429210, ConnectTime:"2019-08-16 18:33:08", UseCount:4, LastActiveTime:"2019-08-16 18:33:08"}
	]
}
2019-08-16 18:33:09.454  INFO 92273 --- [           main] me.zhongmingmao.druid.PersonDao          : connection=com.alibaba.druid.proxy.jdbc.ConnectionProxyImpl@34dc85a
2019-08-16 18:33:09.467 ERROR 92273 --- [           main] c.alibaba.druid.filter.stat.StatFilter   : slow sql 0 millis. INSERT INTO Person (FIRST_NAME, LAST_NAME, ADDRESS) VALUES (?, ?, ?)["Dana","Whitley","464 Yellow Drive"]
2019-08-16 18:33:09.470 ERROR 92273 --- [           main] c.alibaba.druid.filter.stat.StatFilter   : slow sql 0 millis. INSERT INTO Person (FIRST_NAME, LAST_NAME, ADDRESS) VALUES (?, ?, ?)["Robin","Cash","64 Logic Park"]
2019-08-16 18:33:09.507 ERROR 92273 --- [           main] c.alibaba.druid.filter.stat.StatFilter   : slow sql 13 millis. SELECT * FROM PERSON[]
```

### 监控
```json
[{
	"Identity": 1009326765,
	"Name": "DataSource-1009326765",
	"DbType": "h2",
	"DriverClassName": "org.h2.Driver",
	"URL": "jdbc:h2:mem:testDb",
	"UserName": "SA",
	"FilterClassNames": ["com.alibaba.druid.filter.config.ConfigFilter", "com.alibaba.druid.wall.WallFilter", "com.alibaba.druid.filter.stat.StatFilter", "me.zhongmingmao.druid.ConnectionLogFilter"],
	"WaitThreadCount": 0,
	"NotEmptyWaitCount": 0,
	"NotEmptyWaitMillis": 0,
	"PoolingCount": 5,
	"PoolingPeak": 5,
	"PoolingPeakTime": "2019-08-16T10:33:08.390+0000",
	"ActiveCount": 0,
	"ActivePeak": 1,
	"ActivePeakTime": "2019-08-16T10:33:08.445+0000",
	"InitialSize": 5,
	"MinIdle": 5,
	"MaxActive": 5,
	"QueryTimeout": 0,
	"TransactionQueryTimeout": 0,
	"LoginTimeout": 0,
	"ValidConnectionCheckerClassName": null,
	"ExceptionSorterClassName": null,
	"TestOnBorrow": true,
	"TestOnReturn": true,
	"TestWhileIdle": true,
	"DefaultAutoCommit": true,
	"DefaultReadOnly": null,
	"DefaultTransactionIsolation": null,
	"LogicConnectCount": 8,
	"LogicCloseCount": 8,
	"LogicConnectErrorCount": 0,
	"PhysicalConnectCount": 5,
	"PhysicalCloseCount": 0,
	"PhysicalConnectErrorCount": 0,
	"ExecuteCount": 5,
	"ExecuteUpdateCount": 2,
	"ExecuteQueryCount": 1,
	"ExecuteBatchCount": 0,
	"ErrorCount": 0,
	"CommitCount": 0,
	"RollbackCount": 0,
	"PSCacheAccessCount": 0,
	"PSCacheHitCount": 0,
	"PSCacheMissCount": 0,
	"StartTransactionCount": 0,
	"TransactionHistogram": [0, 0, 0, 0, 0, 0, 0],
	"ConnectionHoldTimeHistogram": [3, 0, 4, 1, 0, 0, 0, 0],
	"RemoveAbandoned": false,
	"ClobOpenCount": 0,
	"BlobOpenCount": 0,
	"KeepAliveCheckCount": 0,
	"KeepAlive": false,
	"FailFast": false,
	"MaxWait": -1,
	"MaxWaitThreadCount": -1,
	"PoolPreparedStatements": false,
	"MaxPoolPreparedStatementPerConnectionSize": 10,
	"MinEvictableIdleTimeMillis": 1800000,
	"MaxEvictableIdleTimeMillis": 25200000,
	"LogDifferentThread": true,
	"RecycleErrorCount": 0,
	"PreparedStatementOpenCount": 2,
	"PreparedStatementClosedCount": 2,
	"UseUnfairLock": false,
	"InitGlobalVariants": false,
	"InitVariants": false
}]
```
