---
title: Kafka -- Avro + Kafka Native API
date: 2018-10-16 18:58:44
categories:
    - MQ
    - Kafka
tags:
    - MQ
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
    public byte[] serialize(String topic, Stock stock) {
        if (stock == null) {
            return null;
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // Avro
        DatumWriter<Stock> datumWriter = new SpecificDatumWriter<>(stock.getSchema());
        BinaryEncoder encoder = EncoderFactory.get().directBinaryEncoder(out, null);
        try {
            datumWriter.write(stock, encoder);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return out.toByteArray();
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
        if (data == null) {
            return null;
        }

        Stock stock = new Stock();
        ByteArrayInputStream in = new ByteArrayInputStream(data);
        // Avro
        DatumReader<Stock> datumReader = new SpecificDatumReader<>(stock.getSchema());
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
// 自定义序列化器
props.put("value.serializer", StockSerializer.class.getName());

Producer<String, Stock> producer = new KafkaProducer<>(props);

for (Stock stock : stocks) {
    ProducerRecord<String, Stock> record = new ProducerRecord<>(TOPIC, stock);
    RecordMetadata metadata = producer.send(record).get();
    log.info("stock={}, timestamp={}, partition={}, offset={}",
            stock.getStockName(), metadata.timestamp(), metadata.partition(), metadata.offset());
}
```

## 消费消息
```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", GROUP_ID);
props.put("key.deserializer", StringDeserializer.class.getName());
// 自定义反序列化器
props.put("value.deserializer", StockDeserializer.class.getName());

Consumer<String, Stock> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Collections.singletonList(TOPIC));

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
