---
title: Kafka -- Docker + Schema Registry
date: 2019-03-26 10:39:06
categories:
    - MQ
    - Kafka
tags:
    - MQ
    - Kafka
    - Avro
    - Docker
---

## Avro
1. Avro的数据文件里包含了**整个Schema**
2. 如果每条Kafka记录都嵌入了`Schema`，会让记录的大小**成倍地增加**
3. 在读取记录时，仍然需要读到**整个Schema**，所以需要先找到`Schema`
4. 可以采用**通用的结构模式**并使用**Schema注册表**的方案
    - 开源的`Schema`注册表实现：`Confluent Schema Registry`

<!-- more -->

## Confluent Schema Registry
<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-confluent-schema-registry.png" width=500/>

1. 把所有**写入数据**需要用到的`Schema`保存在**注册表**里，然后在_**记录里引用Schema ID**_
2. 负责读数据的应用程序使用`Schema ID`从注册表拉取`Schema`来**反序列化**记录
3. 序列化器和反序列化器分别负责处理Schema的**注册**和**拉取**

### Confluent Schema Registry
```bash
# Start Zookeeper and expose port 2181 for use by the host machine
$ docker run -d --name zookeeper -p 2181:2181 confluent/zookeeper

# Start Kafka and expose port 9092 for use by the host machine
$ docker run -d --name kafka -p 9092:9092 --link zookeeper:zookeeper confluent/kafka

# Start Schema Registry and expose port 8081 for use by the host machine
$ docker run -d --name schema-registry -p 8081:8081 --link zookeeper:zookeeper \
    --link kafka:kafka confluent/schema-registry

# Start REST Proxy and expose port 8082 for use by the host machine
$ docker run -d --name rest-proxy -p 8082:8082 --link zookeeper:zookeeper \
    --link kafka:kafka --link schema-registry:schema-registry confluent/rest-proxy

$ docker ps
CONTAINER ID        IMAGE                       COMMAND                  CREATED             STATUS              PORTS                                        NAMES
38e5a908c954        confluent/rest-proxy        "/usr/local/bin/rest…"   4 hours ago         Up 4 hours          0.0.0.0:8082->8082/tcp                       rest-proxy
a6110eab7a84        confluent/schema-registry   "/usr/local/bin/sche…"   4 hours ago         Up 4 hours          0.0.0.0:8081->8081/tcp                       schema-registry
c33c9268e4da        confluent/kafka             "/usr/local/bin/kafk…"   4 hours ago         Up 4 hours          0.0.0.0:9092->9092/tcp                       kafka
be6f2a3b6a2c        confluent/zookeeper         "/usr/local/bin/zk-d…"   4 hours ago         Up 4 hours          2888/tcp, 0.0.0.0:2181->2181/tcp, 3888/tcp   zookeeper
```

## 注册Schema

### user.json
```json
{
    "type": "record",
    "name": "User",
    "fields": [
        {"name": "id", "type": "int"},
        {"name": "name",  "type": "string"},
        {"name": "age", "type": "int"}
    ]
}
```

### 注册
```bash
$ curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
--data '{"schema": "{\"type\": \"record\", \"name\": \"User\", \"fields\": [{\"name\": \"id\", \"type\": \"int\"}, {\"name\": \"name\",  \"type\": \"string\"}, {\"name\": \"age\", \"type\": \"int\"}]}"}' \
http://localhost:8081/subjects/zhongmingmao/versions
{"id":1}

$ curl http://localhost:8081/subjects/zhongmingmao/versions
[1]
```

## ConfluentProducer
```java
private static final String TOPIC = "zhongmingmao";
private static final String USER_SCHEMA = "{\"type\": \"record\", \"name\": \"User\", " +
        "\"fields\": [{\"name\": \"id\", \"type\": \"int\"}, " +
        "{\"name\": \"name\",  \"type\": \"string\"}, {\"name\": \"age\", \"type\": \"int\"}]}";

public static void main(String[] args) throws Exception {
    Properties props = new Properties();
    props.put("bootstrap.servers", "localhost:9092");
    // 使用Confluent实现的KafkaAvroSerializer
    props.put("key.serializer", KafkaAvroSerializer.class.getName());
    props.put("value.serializer", KafkaAvroSerializer.class.getName());
    // 添加Schema服务的地址，用于获取Schema
    props.put("schema.registry.url", "http://localhost:8081");

    // 因为没有使用Avro生成的对象，因此需要提供Avro Schema
    Schema.Parser parser = new Schema.Parser();
    Schema schema = parser.parse(USER_SCHEMA);

    // 对象类型为Avro GenericRecord
    Producer<String, GenericRecord> producer = new KafkaProducer<>(props);

    Random rand = new Random();
    int id = 0;

    try {
        while (id < 100) {
            id++;
            String name = "name" + id;
            int age = rand.nextInt(40) + 1;
            // ProducerRecord.value是GenericRecord类型，包含了Schema和数据
            // 序列化器知道如何从记录获取Schema，把它保存到注册表里，并用它序列化对象数据
            GenericRecord user = new GenericData.Record(schema);
            user.put("id", id);
            user.put("name", name);
            user.put("age", age);

            ProducerRecord<String, GenericRecord> record = new ProducerRecord<>(TOPIC, user);
            producer.send(record);
            TimeUnit.SECONDS.sleep(1);
        }
    } finally {
        producer.close();
    }
}
```

## ConfluentConsumer
```java
private static final String TOPIC = "zhongmingmao";
private static final String GROUP_ID = "zhongmingmao";

public static void main(String[] args) {
    Properties props = new Properties();
    props.put("bootstrap.servers", "localhost:9092");
    props.put("group.id", GROUP_ID);
    // 使用Confluent实现的KafkaAvroDeserializer
    props.put("key.deserializer", KafkaAvroDeserializer.class.getName());
    props.put("value.deserializer", KafkaAvroDeserializer.class.getName());
    // 添加Schema服务的地址，用于获取Schema
    props.put("schema.registry.url", "http://localhost:8081");
    Consumer<String, GenericRecord> consumer = new KafkaConsumer<>(props);

    consumer.subscribe(Collections.singletonList(TOPIC));
    try {
        while (true) {
            ConsumerRecords<String, GenericRecord> records = consumer.poll(100);
            for (ConsumerRecord<String, GenericRecord> record : records) {
                GenericRecord user = record.value();
                log.info("value=[id={}, name={}, age={}], partition={}, offset={}",
                        user.get("id"), user.get("name"), user.get("age"), record.partition(), record.offset());
            }
        }
    } finally {
        consumer.close();
    }
}
```

<!-- indicate-the-source -->
