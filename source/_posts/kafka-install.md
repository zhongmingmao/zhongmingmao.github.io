---
title: Kafka读书笔记 -- 安装与配置
date: 2018-10-07 01:07:32
categories:
  - Kafka
tags:
  - Kafka
---

## 安装步骤

### Kafka与Zookeeper
Kafka使用Zookeeper保存集群的**元数据信息**和**消费者信息**

![kafka_zookeeper.png](http://pg67n0yz6.bkt.clouddn.com/kafka_zookeeper.png?imageView2/2/w/500)

<!-- more -->

### 安装Zookeeper和Kafka
```
➜  ~ brew install kafka
==> Installing dependencies for kafka: zookeeper
==> Caveats
==> zookeeper
To have launchd start zookeeper now and restart at login:
  brew services start zookeeper
Or, if you don't want/need a background service you can just run:
  zkServer start
==> kafka
To have launchd start kafka now and restart at login:
  brew services start kafka
Or, if you don't want/need a background service you can just run:
  zookeeper-server-start /usr/local/etc/kafka/zookeeper.properties & kafka-server-start /usr/local/etc/kafka/server.properties
```

### 启动Zookeeper和Kafka

#### 当前服务列表
```
➜  ~ brew services list
Name      Status  User         Plist
kafka     stopped
mysql     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.mysql.plist
zookeeper stopped
```

#### 启动Zookeeper
```
➜  ~ brew services start zookeeper
==> Successfully started `zookeeper` (label: homebrew.mxcl.zookeeper)
```
#### 启动Kakfa
```
➜  ~ brew services start kafka
==> Successfully started `kafka` (label: homebrew.mxcl.kafka)
```

#### 当前服务列表
```
➜  ~ brew services list
Name      Status  User         Plist
kafka     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.kafka.plist
mysql     started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.mysql.plist
zookeeper started zhongmingmao /Users/zhongmingmao/Library/LaunchAgents/homebrew.mxcl.zookeeper.plist
```

### 基本测试

#### 创建主题
```
➜  ~ kafka-topics --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic zhongmingmao
Created topic "zhongmingmao".

➜  ~ kafka-topics --zookeeper localhost:2181 --list
__consumer_offsets
zhongmingmao

➜  ~ kafka-topics --zookeeper localhost:2181 --describe --topic zhongmingmao
Topic:zhongmingmao	PartitionCount:1	ReplicationFactor:1	Configs:
	Topic: zhongmingmao	Partition: 0	Leader: 0	Replicas: 0	Isr: 0
```

#### 发布消息
```
➜  ~ kafka-console-producer --broker-list localhost:9092 --topic zhongmingmao
>zhongmingmao
>is
>learning kafka
>
```

#### 读取消息
```
➜  ~ kafka-console-consumer --bootstrap-server localhost:9092 --topic zhongmingmao --from-beginning
zhongmingmao
is
learning kafka
```

<!-- indicate-the-source -->
