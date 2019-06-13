---
title: Kafka -- Avro入门
date: 2018-10-15 23:42:11
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Avro
---

## 引入依赖
```xml
<dependency>
    <groupId>org.apache.avro</groupId>
    <artifactId>avro</artifactId>
    <version>1.8.2</version>
</dependency>
```

<!-- more -->
```xml
<plugin>
    <groupId>org.apache.avro</groupId>
    <artifactId>avro-maven-plugin</artifactId>
    <version>1.8.2</version>
    <executions>
        <execution>
            <phase>generate-sources</phase>
            <goals>
                <goal>schema</goal>
            </goals>
            <configuration>
                <sourceDirectory>${project.basedir}/src/main/avro/</sourceDirectory>
                <outputDirectory>${project.basedir}/src/main/java/</outputDirectory>
            </configuration>
        </execution>
    </executions>
</plugin>
```

## Schema
路径：src/main/avro/user.avsc
```json
{
    "namespace": "me.zhongmingmao.avro",
    "type": "record",
    "name": "User",
    "fields": [
        {"name": "name", "type": "string"},
        {"name": "favorite_number",  "type": ["int", "null"]},
        {"name": "favorite_color", "type": ["string", "null"]}
    ]
}
```

## 使用Avro -- 生成代码

### 编译Schema
```shell
# 执行avro-maven-plugin:1.8.2:schema
# 生成类：src/main/java/me/zhongmingmao/avro/User.java
$ mvn clean compile
```

### 序列化
```java
User user1 = new User();
user1.setName("A");
user1.setFavoriteNumber(1);
User user2 = new User("B", 2, "c2");
User user3 = User.newBuilder().setName("C").setFavoriteNumber(3).setFavoriteColor("c3").build();

// org.apache.avro.io.DatumWriter
DatumWriter<User> userDatumWriter = new SpecificDatumWriter<>(User.class);
DataFileWriter<User> dataFileWriter = new DataFileWriter<>(userDatumWriter);
dataFileWriter.create(user1.getSchema(), new File("/tmp/users.avro"));
dataFileWriter.append(user1);
dataFileWriter.append(user2);
dataFileWriter.append(user3);
dataFileWriter.close();
```

### 反序列化
```java
// org.apache.avro.io.DatumReader
DatumReader<User> userDatumReader = new SpecificDatumReader<>(User.class);
DataFileReader<User> dataFileReader = new DataFileReader<>(new File("/tmp/users.avro"), userDatumReader);
User user = null;
while (dataFileReader.hasNext()) {
    user = dataFileReader.next(user);
    log.info("{}", user);
}
dataFileReader.close();
// {"name": "A", "favorite_number": 1, "favorite_color": null}
// {"name": "B", "favorite_number": 2, "favorite_color": "c2"}
// {"name": "C", "favorite_number": 3, "favorite_color": "c3"}
```

## 使用Avro -- 不生成代码

### 序列化
```java
// src/main/resources/user.avsc
String avscFilePath = getClass().getClassLoader().getResource("user.avsc").getPath();
Schema schema = new Schema.Parser().parse(new File(avscFilePath));

GenericData.Record user1 = new GenericData.Record(schema);
user1.put("name", "A");
user1.put("favorite_number", 1);
GenericData.Record user2 = new GenericData.Record(schema);
user2.put("name", "B");
user2.put("favorite_number", 2);
user2.put("favorite_color", "c2");

// 序列化
DatumWriter<GenericRecord> userDatumWriter = new SpecificDatumWriter<>(schema);
DataFileWriter<GenericRecord> dataFileWriter = new DataFileWriter<>(userDatumWriter);
dataFileWriter.create(schema, new File("/tmp/users.avro"));
dataFileWriter.append(user1);
dataFileWriter.append(user2);
dataFileWriter.close();

// 反序列化
DatumReader<GenericRecord> userDatumReader = new SpecificDatumReader<>(schema);
DataFileReader<GenericRecord> dataFileReader = new DataFileReader<>(new File("/tmp/users.avro"), userDatumReader);
GenericRecord user = null;
while (dataFileReader.hasNext()) {
    user = dataFileReader.next(user);
    log.info("{}", user);
}
dataFileReader.close();
// {"name": "A", "favorite_number": 1, "favorite_color": null}
// {"name": "B", "favorite_number": 2, "favorite_color": "c2"}
```

<!-- indicate-the-source -->
