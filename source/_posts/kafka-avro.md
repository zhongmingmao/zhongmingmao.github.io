---
title: Kafka学习笔记 -- 使用Avro序列化
date: 2018-10-16 23:42:11
categories:
  - Kafka
tags:
  - Kafka
  - Avro
---

## 简单使用

### 引入Maven依赖
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

### user.avsc
路径：src/main/avro/user.avsc
```json
{
   "namespace": "me.zhongmingmao",
   "type": "record",
   "name": "User",
   "fields": [
      {
         "name": "name",
         "type": "string"
      },
      {
         "name": "favorite_number",
         "type": [
            "int",
            "null"
         ]
      },
      {
         "name": "favorite_color",
         "type": [
            "string",
            "null"
         ]
      }
   ]
}
```

### 编译模式
```
 mvn clean avro:schema
```
生成类：target/generated-sources/avro/me/zhongmingmao/User.java

### 序列化
```java
User u1 = new User();
u1.setName("zhongmingmao");
u1.setFavoriteNumber(256);
User u2 = new User("zhongmingwu", 7, "red");
User u3 = User.newBuilder().setName("zhongming").setFavoriteNumber(10).setFavoriteColor("blue").build();

File file = new File("/tmp/users.avro");
DatumWriter<User> userDatumWriter = new SpecificDatumWriter<>(User.class);
DataFileWriter<User> dataFileWriter = new DataFileWriter<>(userDatumWriter);
dataFileWriter.create(u1.getSchema(), file);

dataFileWriter.append(u1);
dataFileWriter.append(u2);
dataFileWriter.append(u3);
dataFileWriter.close();
```

### 反序列化
```java
DatumReader<User> userDatumReader = new SpecificDatumReader<>(User.class);
DataFileReader<User> dataFileReader = new DataFileReader<>(file, userDatumReader);
User user = null;
while (dataFileReader.hasNext()) {
  user = dataFileReader.next(user);
  log.info("{}", user);
}
// {"name": "zhongmingmao", "favorite_number": 256, "favorite_color": null}
// {"name": "zhongmingwu", "favorite_number": 7, "favorite_color": "red"}
// {"name": "zhongming", "favorite_number": 10, "favorite_color": "blue"}
```



<!-- indicate-the-source -->
