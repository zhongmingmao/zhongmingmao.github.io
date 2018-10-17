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

## Kafka Producer

### 引入依赖
```xml
<dependency>
    <groupId>com.twitter</groupId>
    <artifactId>bijection-avro_2.12</artifactId>
    <version>0.9.6</version>
</dependency>
```

### Schema
```java
private static final String USER_SCHEMA = "{\n" +
        "   \"namespace\": \"me.zhongmingmao\",\n" +
        "   \"type\": \"record\",\n" +
        "   \"name\": \"User\",\n" +
        "   \"fields\": [\n" +
        "      {\n" +
        "         \"name\": \"name\",\n" +
        "         \"type\": \"string\"\n" +
        "      },\n" +
        "      {\n" +
        "         \"name\": \"favorite_number\",\n" +
        "         \"type\": [\n" +
        "            \"int\",\n" +
        "            \"null\"\n" +
        "         ]\n" +
        "      },\n" +
        "      {\n" +
        "         \"name\": \"favorite_color\",\n" +
        "         \"type\": [\n" +
        "            \"string\",\n" +
        "            \"null\"\n" +
        "         ]\n" +
        "      }\n" +
        "   ]\n" +
        "}";
```

### Producer
```java
Schema.Parser parser = new Schema.Parser();
Schema schema = parser.parse(USER_SCHEMA);
// Injection对象：将对象转换成字节数组
Injection<GenericRecord, byte[]> recordInjection = GenericAvroCodecs.toBinary(schema);

Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", ByteArraySerializer.class.getName());
KafkaProducer<String, byte[]> producer = new KafkaProducer<>(props);

for (int i = 0; i < 10; i++) {
    // 依据定义好的Schema来创建相关的Record
    GenericData.Record avroRecord = new GenericData.Record(schema);
    avroRecord.put("name", "zhongmingmao" + i);
    avroRecord.put("favorite_number", i);
    avroRecord.put("favorite_color", "color" + i);
    // 序列化
    byte[] bytes = recordInjection.apply(avroRecord);

    ProducerRecord<String, byte[]> record = new ProducerRecord<>("zhongmingmao", "" + i, bytes);
    producer.send(record);
    TimeUnit.SECONDS.sleep(1);
}

producer.close();
```

## Kafka Consumer

<!-- indicate-the-source -->
