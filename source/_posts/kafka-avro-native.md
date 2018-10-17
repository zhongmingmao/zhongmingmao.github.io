---
title: Kafka学习笔记 -- Avro + Kafka Native API
date: 2018-10-16 18:58:44
categories:
  - Kafka
tags:
  - Kafka
  - Avro
---

## Schema
```json
{
    "namespace": "me.zhongmingmao.avro",
    "type": "record",
    "name": "Stock",
    "fields": [
        {"name": "stockCode", "type": "string"},
        {"name": "stockName",  "type": "string"},
        {"name": "tradeTime", "type": "long"},
        {"name": "preClosePrice", "type": "float"},
        {"name": "openPrice", "type": "float"},
        {"name": "currentPrice", "type": "float"},
        {"name": "highPrice", "type": "float"},
        {"name": "lowPrice", "type": "float"}
    ]
}
```

<!-- more -->

## 编译Schema
```
mvn clean compile
```

## 自定义序列化器
```java
public class StockSerializer implements Serializer<Stock> {
    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
    }

    @Override
    public byte[] serialize(String topic, Stock data) {
        if (null == data) {
            return null;
        }

        DatumWriter<Stock> datumWriter = new SpecificDatumWriter<>(data.getSchema());
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        BinaryEncoder encoder = EncoderFactory.get().directBinaryEncoder(outputStream, null);
        try {
            datumWriter.write(data, encoder);
        } catch (IOException e) {
            throw new SerializationException(e);
        }

        return outputStream.toByteArray();
    }

    @Override
    public void close() {
    }
}
```

## 自定义反序列化器
```java
public class StockDeserializer implements Deserializer<Stock> {
    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
    }

    @Override
    public Stock deserialize(String topic, byte[] data) {
        if (null == data) {
            return null;
        }

        Stock stock = new Stock();
        DatumReader<Stock> datumReader = new SpecificDatumReader<>(stock.getSchema());
        ByteArrayInputStream in = new ByteArrayInputStream(data);
        BinaryDecoder decoder = DecoderFactory.get().directBinaryDecoder(in, null);
        try {
            stock = datumReader.read(null, decoder);
        } catch (IOException e) {
            throw new SerializationException(e);
        }
        return stock;
    }

    @Override
    public void close() {
    }
}
```

## 发送消息
```java
List<Stock> stocks = Lists.newArrayList();
for (int i = 0; i < 10; i++) {
    Stock stock = Stock.newBuilder()
            .setStockCode(String.valueOf(i))
            .setStockName("stock" + i)
            .setTradeTime(System.currentTimeMillis())
            .setPreClosePrice(100).setOpenPrice(200)
            .setCurrentPrice(300).setHighPrice(400).setLowPrice(0).build();
    stocks.add(stock);
}

Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", StringSerializer.class.getName());
props.put("value.serializer", StockSerializer.class.getName());

Producer<String, Stock> producer = new KafkaProducer<>(props);

for (Stock stock : stocks) {
    ProducerRecord<String, Stock> record = new ProducerRecord<>("zhongmingmao", stock);
    RecordMetadata metadata = producer.send(record).get();
    log.info("stock={}, partition={}, offset={}", stock, metadata.partition(), metadata.offset());
    TimeUnit.SECONDS.sleep(1);
}
```

## 消费消息
```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "zhongmingmao");
props.put("key.deserializer", StringDeserializer.class.getName());
props.put("value.deserializer", StockDeserializer.class.getName());

KafkaConsumer<String, Stock> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Collections.singletonList("zhongmingmao"));

try {
    while (true) {
        ConsumerRecords<String, Stock> records = consumer.poll(100);
        for (ConsumerRecord<String, Stock> record : records) {
            Stock stock = record.value();
            log.info("stock={}", stock);
        }
    }
} finally {
    consumer.close();
}
```

<!-- indicate-the-source -->
