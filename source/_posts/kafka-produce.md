---
title: Kafka -- 生产者
date: 2018-10-11 22:13:31
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Stream
---

## 生产者概述

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/producer_component.png" width="600">

1. 创建一个`ProducerRecord`对象，`ProducerRecord`对象包含**Topic**和**Value**，还可以指定**Key**或**Partition**
2. 在发送`ProducerRecord`对象时，生产者先将**Key**和**Partition**序列化成**字节数组**，以便于在网络上传输
3. 字节数组被传给**分区器**
    - 如果在`ProducerRecord`对象里指定了**Partition**
        - 那么分区器就不会做任何事情，直接返回指定的分区
    - 如果没有指定分区，那么分区器会根据`ProducerRecord`对象的**Key**来选择一个**Partition**
    - 选择好分区后，生产者就知道该往哪个主题和分区发送这条记录
4. 这条记录会被添加到一个**记录批次**里，一个批次内的**所有**消息都会被发送到**相同的Topic和Partition**上
    - 有一个**单独的线程**负责把这些记录批次发送到相应的Broker
5. 服务器在收到这些消息时会返回一个响应
    - 如果消息成功写入Kafka，就会返回一个`RecordMetaData`对象
        - 包含了**Topic**和**Partition**信息，以及**记录在分区里的偏移量**
    - 如果写入失败，就会返回一个错误
    - 生产者在收到错误之后会尝试**重新发送消息**，几次之后如果还是失败，就会返回错误信息

<!-- more -->

## 创建生产者

### 必选属性

#### bootstrap.servers
1. Broker的地址清单，**host:port**
2. 清单里不需要包含所有的Broker地址，**生产者会从给定的Broker里找到其它Broker的信息**
    - 建议**最少两个**，一旦其中一个宕机，生产者仍然能够连接到集群上

#### key.serializer
1. Broker希望接收到的消息的**Key**和**Value**都是**字节数组**
2. 生产者接口允许使用**参数化类型**，因此可以把**Java对象**作为**Key**和**Value**发送给Broker
3. `key.serializer`必须是`org.apache.kafka.common.serialization.Serializer`的实现类
4. 生产者会通过`key.serializer`把**Key对象**序列化为_**字节数组**_
5. Kafka默认提供
    - `ByteArraySerializer`
    - `StringSerializer`
    - `IntegerSerializer`

#### value.serializer
1. 与`key.serializer`类似，`value.serializer`指定的类会把**Value**序列化成**字节数组**
2. 如果**Key**和**Value**都是**字符串**，可以使用与`key.serializer`一样的序列化器
3. 如果**Key**是整数类型，而**Value**是字符串，那么需要使用不同的序列化器

#### Java代码
```java
Properties properties = new Properties();
properties.put("bootstrap.servers", "localhost:9092");
properties.put("key.serializer", StringSerializer.class.getName());
properties.put("value.serializer", StringSerializer.class.getName());
producer = new KafkaProducer<>(properties);
```

## 发送消息

### 发送方式

#### 发送并忘记
1. 生产者把消息发送给服务器，但**并不关心是否正常到达**
2. Kafka是**高可用**的，而且生产者会**自动尝试重发**
3. 但会**丢失**一些消息

#### 同步发送
```java
// Key对象和Value对象的类型必须与生产者对象的序列化器相匹配
// key.serializer -> StringSerializer
// value.serializer -> StringSerializer
ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, KEY, VALUE);

// 消息被放入缓冲区，使用单独的线程发送到服务端端
Future<RecordMetadata> future = producer.send(record);

// 调用Future对象的get()方法等待Kafka响应，如果服务器返回错误，get()方法会抛出异常
// 如果没有发生错误，会得到一个RecordMetadata对象，通过RecordMetadata对象可以获取消息的元数据
RecordMetadata recordMetadata = future.get();
log.info("timestamp={}", recordMetadata.timestamp());
log.info("partition={}", recordMetadata.partition());
log.info("offset={}", recordMetadata.offset());
```

##### 发送错误
1. **可重试错误**（可以通过重发消息来解决的错误）
    - **连接错误**，可以通过再次建立连接来解决
        - `KafkaProducer`可以被配置成**自动重连**
        - 如果在多次重试后扔无法解决问题，应用程序会收到一个重试异常
    - **No Leader 错误**，可以通过重新为分区选举领导来解决
2. 无法通过重试解决的错误，例如消息太大，`KafkaProducer`不会进行任何重试，直接抛出异常

#### 异步发送
```java
ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC, KEY, VALUE);
Future<RecordMetadata> future = producer.send(record, (metadata, exception) -> {
    // 如果Kafka返回一个错误，onCompletion方法会抛出一个非空异常
    log.info("timestamp={}", metadata.timestamp());
    log.info("partition={}", metadata.partition());
    log.info("offset={}", metadata.offset());
});
RecordMetadata recordMetadata = future.get();
```

## 生产者配置

### acks
1. `acks`：必须有多少个**分区副本**收到消息，生产者才会认为**消息写入是成功**的
2. **ack=0**：生产者**不会等待**任何来自服务器的响应。
    - 如果当中出现问题，导致服务器没有收到消息，那么生产者无从得知，会造成**消息丢失**
    - 由于生产者不需要等待服务器的响应
        - 所以可以以网络能够支持的最大速度发送消息，从而达到**很高的吞吐量**
3. **acks=1**（默认值）：只要集群的**Leader节点**收到消息，生产者就会收到一个来自服务器的成功响应
    - 如果消息无法到达**Leader节点**（例如Leader节点崩溃，新的Leader节点还没有被选举出来）
        - 生产者就会收到一个错误响应，为了避免数据丢失，生产者会**重发消息**
    - _**如果一个没有收到消息的节点成为新Leader，消息还是会丢失**_
    - 此时的吞吐量主要取决于使用的是**同步发送**还是**异步发送**
        - 吞吐量还受到**发送中消息数量的限制**，例如生产者在收到服务器响应之前可以发送多少个消息
4. **acks=all**：只有当**所有参与复制的节点**全部都收到消息时，生产者才会收到一个来自服务器的成功响应
    - 这种模式是**最安全**的
        - 可以保证不止一个服务器收到消息，就算有服务器发生崩溃，整个集群依然可以运行
    - **延时比acks=1更高**，因为要等待不止一个服务器节点接收消息

### buffer.memory
1. 该参数用来设置**生产者内缓冲区**的大小，生产者用缓冲区来缓冲要发送到服务器端的消息，默认为`32MB`
2. 如果应用程序发送消息的速度超过了发送到服务器端速度，会导致生产者空间不足
3. 这个时候，`send()`方法调用要么被**阻塞**，要么**抛出异常**，取决于`block.on.buffer.full`

### compression.type
1. 默认情况下为`none`，消息在发送时是**不会被压缩**的
2. 该参数可以设置为`snappy`、`gzip`或者`lz4`
    - `snappy`压缩算法由Google发明
        - 占用**较少的CPU**，却能提供**较好的性能**和相当**可观的压缩比**
        - 适用于关注**性能**和**网络带宽**的场景
    - `gzip`压缩算法
        - 占用**较多的CPU**，但会提供**更高的压缩比**
        - 适用于**网络带宽比较有限**的场景
3. 压缩消息可以降低**网络传输开销**和**存储开销**，而这往往是向`Broker`发送消息的瓶颈

### retries
1. 生产者从服务器收到的错误有可能是**临时性错误**（如分区找不到Leader）
2. 在这种情况下，`retries`参数决定了生产者可以**重发消息的次数**
    - 默认情况下，生产者会在每次重试之间等待**100ms**，控制参数为`retry.backoff.ms`
    - 可以先测试一下恢复一个崩溃节点需要多少时间，假设为`T`
        - 让生产者**总的重试时间**比`T`长，否着生产者会_**过早地放弃重试**_
3. 有些错误不是临时性错误，没办法通过重试来解决（例如消息太大）
4. 一般情况下，因为生产者会**自动**进行重试，所以没必要在代码逻辑处理那些可重试的错误
    - 只需要处理那些**不可重试的错误**或者**重试次数超过上限**的情况

### batch.size
1. 当有**多个消息**需要被发送到**同一个分区**时，生产者会把它们放在**同一个批次**里，默认值为`16KB`
    - 该参数指定了一个批次可以使用多**内存大小**，单位为_**字节**_
2. 当批次被填满，批次里的所有消息会被发送出去
    - **生产者不一定会等到批次被填满才发送**，半满设置只有一个消息的批次也有可能被发送
    - 如果`batch.size`设置**很大**，也**不会造成延迟**，只是会占用**更多的内存**
    - 如果`batch.size`设置**很小**，生产者需要**频繁地发送消息**，会增加一些**额外的开销**

### linger.ms
1. 该参数指定了生产者**在发送批次之前等待更多消息加入批次的时间**，默认值为0
2. `KafkaProducer`会在**批次填满**或者**linger.ms达到上限**时把批次发出去
3. 默认情况下，只要有可用的线程，生产者就会把消息发出去，就算批次里**只有一个消息**
4. 设置`linger.ms`，会**增加延迟**，但也会**提高吞吐量**
    - 一次性发送更多的消息，平摊到单个消息的开销就变小了

### client.id
任意字符串，服务器会用它来识别**消息的来源**，还可以用在日志和配额指标里

### max.in.flight.requests.per.connection
1. 该参数指定了生产者**在收到服务器响应之前可以发送多少消息**，默认值为5
2. 值越高，会占用**越多的内存**，不过也会**提升吞吐量**
3. 如果设为**1**，可以保证消息是**按照发送的顺序写入服务器**，即使发生重试

### timeout.ms、request.timeout.ms、metadata.fetch.timeout.ms
1. `timeout.ms`：指定了Broker**等待同步副本返回消息确认**的时间，默认值为30000
    - 与`acks`的配置相匹配，如果在指定时间内没有收到同步副本的确认，那么Broker就会返回一个错误
2. `request.timeout.ms`：指定了**生产者**在**发送数据**时**等待服务器返回响应**的时间，默认值为10000
3. `metadata.fetch.timeout.ms`：指定了**生产者**在**获取元数据**时**等待服务器返回响应**的时间，默认值为60000
    - 如果等待响应超时，那么生产者要么**重试**发送数据，要么返回一个**错误**（抛出异常或者执行回调）

### max.block.ms
1. 该参数指定了在调用`send()`方法或使用`partitionsFor()`方法获取元数据时，**生产者阻塞的时间**，默认值为60000
2. 当生产者的**发送缓冲区已满**，或者**没有可用的元数据**时，上面两个方法会**阻塞**
3. 在阻塞时间达到`max.block.ms`时，生产者就会抛出超时异常

### max.request.size
1. 该参数用于控制生产者发送**单个请求的大小**，默认值`1MB`
    - 可以指**能发送的单个消息的最大值**（因为一个请求最少有一个消息）
    - 也可以指**单个请求里所有消息（一个批次，多个消息）的总大小**
3. `Broker`对**单个可接收消息的最大值**也有自己的限制（`message.max.bytes`，默认值为`1000012`）
    - 所以两边的配置最好可以**匹配**，避免生产者发送的消息被`Broker`拒绝

### receive.buffer.bytes、send.buffer.bytes
1. 这两个参数分别指定了**TCP Socket**接收和发送数据包的缓冲区大小
  - 如果都被设为**-1**，就使用**操作系统的默认值**
  - `receive.buffer.bytes`的默认值为`32KB`
  - `send.buffer.bytes`的默认值为`128KB`
2. 如果生产者或消费者与Broker处于不同的数据中心，那么可以适当增大这些值

## 序列化器

### 自定义序列化
1. 如果发送到Kafka的对象不是简单的**字符串**或**整型**，那么可以使用**序列化框架**来创建消息记录
    - 例如**通用**的序列化框架（推荐）：`Avro`、`Thrift`、`ProtoBuf`
    - 也可以使用自定义序列化器，但不推荐

```java
// 复杂对象
@Data
@AllArgsConstructor
class Customer {
    private int id;
    private String name;
}
```

```java
// 序列化器
class CustomerSerializer implements Serializer<Customer> {

    @Override
    public void configure(Map<String, ?> configs, boolean isKey) {
        // 不做任何配置
    }

    @Override
    public byte[] serialize(String topic, Customer customer) {
        if (null == customer) {
            return null;
        }
        byte[] serializedName = new byte[0];
        int strLen = 0;
        if (customer.getName() != null) {
            serializedName = customer.getName().getBytes(StandardCharsets.UTF_8);
            strLen = serializedName.length;
        }

        // Customer对象被序列化成
        //  1. id：占用4个字节
        //  2. name的长度：占用4个字节
        //  3. name：占用N个字节
        ByteBuffer buffer = ByteBuffer.allocate(4 + 4 + strLen);
        buffer.putInt(customer.getId());
        buffer.putInt(strLen);
        buffer.put(serializedName);

        return buffer.array();
    }

    @Override
    public void close() {
        // 不需要关闭任何东西
    }
}
```

```java
public class CustomSerializerTest {
    private static final String TOPIC = "Customer";
    private static final String KEY = "Customer";

    @Test
    public void customSerializerTest() {
        Customer value = new Customer(1, "zhongmingmao");
        ProducerRecord<String, Customer> record = new ProducerRecord<>(TOPIC, KEY, value);
    }
}
```

### Avro
1. `Apache Avro`是一种**与编程语言无关**的序列化格式
2. `Avro`数据通过**与语言无关的schema**来定义
    - `schema`通过**JSON**来**描述**，数据被序列化成**二进制文件**或**JSON文件**，一般会使用二进制文件
    - `Avro`在**读写文件**时需要用到`schema`，`schema`一般是**内嵌在数据文件**里
3. 重要特性
    - _**当负责写消息的应用程序使用新的schema，负责读消息的应用程序可以继续处理消息而无需做任何改动**_
    - 特别适用于Kafka这样的消息系统

## 分区
1. Kafka的消息是一个**键值对**，`ProducerRecord`对象可以只包含`Topic`和`Value`，`Key`可以设置为**null**
2. Key的作用
    - 作为_**消息的附加信息**_
    - 用来_**决定消息被写到主题的哪一个分区**_
3. 拥有**相同Key的消息**会被写入到**同一个分区**
4. 如果**Key为null**，并且使用了**默认的分区器**，那么记录会被**随机**（**轮询算法**）地发送到主题内的各个**可用分区**上
5. 如果**Key不为null**，并且使用了**默认的分区器**，那么Kafka会对`Key`进行**散列**，然后根据散列值把消息**映射**到特定的分区上
    - 使用的是**Kafka内部的散列算法**，即使升级Java版本，散列值也不会发生变化
    - _**同一个Key总是被映射到同一个分区上**_
        - 因此在映射时，会使用**主题的所有分区**，如果写入数据的分区是**不可用**的，那么就会**发生错误**
    - _**只有不改变分区数量的情况下，Key与分区之间的映射才能保持不变**_
        - 如果使用`Key`来映射分区，最好在创建主题的时候就把分区**规划**好，并且**永远不要增加新分区**
6. 可以**自定义分区器**

<!-- indicate-the-source -->
