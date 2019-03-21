---
title: Kafka学习笔记 -- Avro + Twitter Bijection
date: 2018-10-17 00:00:01
categories:
    - MQ
    - Kafka
tags:
    - MQ
    - Kafka
    - Avro
---

## Avro + Kafka Native API 比较繁琐
1. 编译Schema
2. 依赖于Avro实现**自定义的序列化器和反序列化器**

## 引入依赖
```xml
<dependency>
    <groupId>com.twitter</groupId>
    <artifactId>bijection-avro_2.12</artifactId>
    <version>0.9.6</version>
</dependency>
```

<!-- more -->

## Schema
路径：src/main/resources/user.json
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

## 发送消息
```java
String schemaFilePath = BijectionProducer.class.getClassLoader().getResource("user.json").getPath();
Schema schema = new Schema.Parser().parse(new File(schemaFilePath));
Injection<GenericRecord, byte[]> recordInjection = GenericAvroCodecs.toBinary(schema);

Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", ByteArraySerializer.class.getName());
Producer<String, byte[]> producer = new KafkaProducer<>(props);

for (int i = 0; i < 10; i++) {
    GenericData.Record record = new GenericData.Record(schema);
    record.put("id", i);
    record.put("name", "zhongmingmao" + i);
    record.put("age", i);
    byte[] bytes = recordInjection.apply(record);
    ProducerRecord<String, byte[]> producerRecord = new ProducerRecord<>("zhongmingmao", bytes);
    producer.send(producerRecord);
    TimeUnit.SECONDS.sleep(1);
}
producer.close();
```

## 消费消息
```java
String schemaFilePath = BijectionProducer.class.getClassLoader().getResource("user.json").getPath();
Schema schema = new Schema.Parser().parse(new File(schemaFilePath));
Injection<GenericRecord, byte[]> recordInjection = GenericAvroCodecs.toBinary(schema);

Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "zhongmingmao");
props.put("key.deserializer", StringDeserializer.class.getName());
props.put("value.deserializer", ByteArrayDeserializer.class.getName());

KafkaConsumer<String, byte[]> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Collections.singletonList("zhongmingmao"));

try {
    while (true) {
        ConsumerRecords<String, byte[]> records = consumer.poll(100);
        for (ConsumerRecord<String, byte[]> record : records) {
            GenericRecord genericRecord = recordInjection.invert(record.value()).get();
            log.info("id={}, name={}, age={}, partition={}, offset={}",
                    genericRecord.get("id"), genericRecord.get("name"), genericRecord.get("age"),
                    record.partition(), record.offset());
        }
        TimeUnit.SECONDS.sleep(1);
    }
} finally {
    consumer.close();
}
```

<!-- indicate-the-source -->
