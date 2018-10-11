---
title: Kafka学习笔记 -- 集群安装与配置（Docker）
date: 2018-10-09 01:48:40
categories:
  - Kafka
tags:
  - Kafka
  - Docker
---

## 配置文件

### 文件列表
```
➜ tree
.
├── docker-compose.yml
└── zoo.cfg

0 directories, 2 files
```

### zoo.cfg
```
clientPort=2181
dataDir=/data
dataLogDir=/datalog
tickTime=2000
initLimit=5
syncLimit=2
server.1=zoo1:2888:3888
server.2=zoo2:2888:3888
server.3=zoo3:2888:3888
4lw.commands.whitelist=*
```

<!-- more -->

### docker-compose.yml
```
version: '2'

services:
  # ZK Cluster
  zoo1:
    image: zookeeper:latest
    restart: always
    container_name: zoo1
    ports:
      - "12181:2181"
    volumes:
      - ./zoo.cfg:/conf/zoo.cfg
    environment:
      ZOO_MY_ID: 1 # ZK服务的ID
  zoo2:
    image: zookeeper:latest
    restart: always
    container_name: zoo2
    ports:
      - "22181:2181"
    volumes:
      - ./zoo.cfg:/conf/zoo.cfg
    environment:
      ZOO_MY_ID: 2
  zoo3:
    image: zookeeper:latest
    restart: always
    container_name: zoo3
    ports:
      - "32181:2181"
    volumes:
      - ./zoo.cfg:/conf/zoo.cfg
    environment:
      ZOO_MY_ID: 3

  # Kafka Cluster
  kafka1:
    image: wurstmeister/kafka
    restart: always
    container_name: kafka1
    ports:
      - "19092:9092"
    environment:
      KAFKA_BROKER_ID : 1
      KAFKA_ADVERTISED_HOST_NAME: kafka1
      KAFKA_ZOOKEEPER_CONNECT: zoo1:2181,zoo2:2181,zoo3:2181
  kafka2:
    image: wurstmeister/kafka
    restart: always
    container_name: kafka2
    ports:
      - "29092:9092"
    environment:
      KAFKA_BROKER_ID : 2
      KAFKA_ADVERTISED_HOST_NAME: kafka2
      KAFKA_ZOOKEEPER_CONNECT: zoo1:2181,zoo2:2181,zoo3:2181
  kafka3:
    image: wurstmeister/kafka
    restart: always
    container_name: kafka3
    ports:
      - "39092:9092"
    environment:
      KAFKA_BROKER_ID : 3
      KAFKA_ADVERTISED_HOST_NAME: kafka3
      KAFKA_ZOOKEEPER_CONNECT: zoo1:2181,zoo2:2181,zoo3:2181
```

## 验证

### 启动
```
➜ docker-compose up -d
Creating network "downloads_default" with the default driver
Creating zoo3   ... done
Creating kafka2 ... done
Creating kafka3 ... done
Creating zoo2   ... done
Creating zoo1   ... done
Creating kafka1 ... done

➜ docker-compose ps
 Name               Command               State                      Ports
---------------------------------------------------------------------------------------------
kafka1   start-kafka.sh                   Up      0.0.0.0:19092->9092/tcp
kafka2   start-kafka.sh                   Up      0.0.0.0:29092->9092/tcp
kafka3   start-kafka.sh                   Up      0.0.0.0:39092->9092/tcp
zoo1     /docker-entrypoint.sh zkSe ...   Up      0.0.0.0:12181->2181/tcp, 2888/tcp, 3888/tcp
zoo2     /docker-entrypoint.sh zkSe ...   Up      0.0.0.0:22181->2181/tcp, 2888/tcp, 3888/tcp
zoo3     /docker-entrypoint.sh zkSe ...   Up      0.0.0.0:32181->2181/tcp, 2888/tcp, 3888/tcp
```

### 创建主题
```
➜ kafka-topics --create --topic test --zookeeper localhost:12181,localhost:22181,localhost:32181 --replication-factor 1 --partitions 1
Created topic "test".

➜ kafka-topics --zookeeper localhost:12181,localhost:22181,localhost:32181 --describe --topic test
Topic:test	PartitionCount:1	ReplicationFactor:1	Configs:
	Topic: test	Partition: 0	Leader: 3	Replicas: 3	Isr: 3
```

### 发送消息
```
➜ kafka-console-producer --topic=test --broker-list localhost:19092,localhost:29092,localhost:39092
>hello
>zhongmingmao
```

### 读取消息
```
➜  Downloads kafka-console-consumer --bootstrap-server localhost:19092,localhost:29092,localhost:39092 --from-beginning --topic
hello
zhongmingmao
```

### 关闭
```
➜ docker-compose down
Stopping kafka1 ... done
Stopping kafka3 ... done
Stopping zoo3   ... done
Stopping kafka2 ... done
Stopping zoo2   ... done
Stopping zoo1   ... done
Removing kafka1 ... done
Removing kafka3 ... done
Removing zoo3   ... done
Removing kafka2 ... done
Removing zoo2   ... done
Removing zoo1   ... done
Removing network downloads_default
```





<!-- indicate-the-source -->
