---
title: Spring -- JDBC异常
mathjax: false
date: 2019-08-08 15:07:33
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - JDBC
---

## JDBC异常抽象
Spring会将**数据操作的异常**转换为**DataAccessException**
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-jdbc-exception.png" width=1000/>

## 解析错误码
1. **SQLErrorCodeSQLExceptionTranslator**
2. ErrorCode定义
    - org/springframework/jdbc/support/**sql-error-codes.xml**
    - classpath下的**sql-error-codes.xml**（定制）

<!-- more -->

org/springframework/jdbc/support/sql-error-codes.xml
> Default SQL error codes for well-known databases. Can be overridden by definitions in a "sql-error-codes.xml" file in the root of the class path.

```xml
<bean id="H2" class="org.springframework.jdbc.support.SQLErrorCodes">
    <property name="badSqlGrammarCodes">
        <value>42000,42001,42101,42102,42111,42112,42121,42122,42132</value>
    </property>
    <property name="duplicateKeyCodes">
        <value>23001,23505</value>
    </property>
    <property name="dataIntegrityViolationCodes">
        <value>22001,22003,22012,22018,22025,23000,23002,23003,23502,23503,23506,23507,23513</value>
    </property>
    <property name="dataAccessResourceFailureCodes">
        <value>90046,90100,90117,90121,90126</value>
    </property>
    <property name="cannotAcquireLockCodes">
        <value>50200</value>
    </property>
</bean>

<bean id="MySQL" class="org.springframework.jdbc.support.SQLErrorCodes">
    <property name="databaseProductNames">
        <list>
            <value>MySQL</value>
            <value>MariaDB</value>
        </list>
    </property>
    <property name="badSqlGrammarCodes">
        <value>1054,1064,1146</value>
    </property>
    <property name="duplicateKeyCodes">
        <value>1062</value>
    </property>
    <property name="dataIntegrityViolationCodes">
        <value>630,839,840,893,1169,1215,1216,1217,1364,1451,1452,1557</value>
    </property>
    <property name="dataAccessResourceFailureCodes">
        <value>1</value>
    </property>
    <property name="cannotAcquireLockCodes">
        <value>1205</value>
    </property>
    <property name="deadlockLoserCodes">
        <value>1213</value>
    </property>
</bean>
```

org.springframework.jdbc.support.SQLErrorCodes
```java
public class SQLErrorCodes {

	@Nullable
	private String[] databaseProductNames;
	private boolean useSqlStateForTranslation = false;
	private String[] badSqlGrammarCodes = new String[0];
	private String[] invalidResultSetAccessCodes = new String[0];
	private String[] duplicateKeyCodes = new String[0];
	private String[] dataIntegrityViolationCodes = new String[0];
	private String[] permissionDeniedCodes = new String[0];
	private String[] dataAccessResourceFailureCodes = new String[0];
	private String[] transientDataAccessResourceCodes = new String[0];
	private String[] cannotAcquireLockCodes = new String[0];
	private String[] deadlockLoserCodes = new String[0];
	private String[] cannotSerializeTransactionCodes = new String[0];
	@Nullable
	private CustomSQLErrorCodesTranslation[] customTranslations;
	@Nullable
	private SQLExceptionTranslator customSqlExceptionTranslator;
}
```

## 定制错误码

### 项目路径
```
└── src
    ├── main
    │   ├── java
    │   │   └── me
    │   │       └── zhongmingmao
    │   │           └── jdbcexception
    │   │               ├── CustomDuplicateKeyException.java
    │   │               └── JdbcExceptionApplication.java
    │   └── resources
    │       ├── application.properties
    │       ├── schema.sql
    │       └── sql-error-codes.xml
    └── test
        └── java
            └── me
                └── zhongmingmao
                    └── jdbcexception
                        └── JdbcExceptionApplicationTests.java

```

### sql-error-codes.xml
src/main/resources/sql-error-codes.xml
```xml
<beans>
    <bean id="H2" class="org.springframework.jdbc.support.SQLErrorCodes">
        <property name="badSqlGrammarCodes">
            <value>42000,42001,42101,42102,42111,42112,42121,42122,42132</value>
        </property>
        <property name="duplicateKeyCodes">
            <value>23001,23505</value>
        </property>
        <property name="dataIntegrityViolationCodes">
            <value>22001,22003,22012,22018,22025,23000,23002,23003,23502,23503,23506,23507,23513</value>
        </property>
        <property name="dataAccessResourceFailureCodes">
            <value>90046,90100,90117,90121,90126</value>
        </property>
        <property name="cannotAcquireLockCodes">
            <value>50200</value>
        </property>

        <!-- 定制：错误码为23001或23505时，不会抛出Spring的DuplicateKeyException，而是抛出CustomDuplicateKeyException -->
        <property name="customTranslations">
            <bean class="org.springframework.jdbc.support.CustomSQLErrorCodesTranslation">
                <property name="errorCodes" value="23001,23505"/>
                <property name="exceptionClass" value="me.zhongmingmao.jdbcexception.CustomDuplicateKeyException"/>
            </bean>
        </property>
    </bean>
</beans>
```

### CustomDuplicateKeyException
```java
public class CustomDuplicateKeyException extends DuplicateKeyException {
    public CustomDuplicateKeyException(String msg) {
        super(msg);
    }

    public CustomDuplicateKeyException(String msg, Throwable cause) {
        super(msg, cause);
    }
}
```

### 单元测试
```java
@RunWith(SpringRunner.class)
@SpringBootTest
public class JdbcExceptionApplicationTests {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test(expected = CustomDuplicateKeyException.class)
    public void testThrowCustomDuplicateKeyException() {
        jdbcTemplate.execute("INSERT INTO PERSON (ID, NAME) VALUES ('1', 'zhongmingmao')");
        jdbcTemplate.execute("INSERT INTO PERSON (ID, NAME) VALUES ('1', 'zhongmingwu')");
    }
}
```
