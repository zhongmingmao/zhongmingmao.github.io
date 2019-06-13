---
title: Kafka -- 集群安装与配置（Docker）
date: 2018-10-09 01:48:40
categories:
    - Middleware
    - MQ
    - Kafka
tags:
    - Middleware
    - MQ
    - Kafka
    - Docker
---

## 配置文件

### 文件列表
```
$ tree
.
└── docker-compose.yml
```

<!-- more -->

### docker-compose.yml
```
version: '2'
services:
  zk1:
    image: confluentinc/cp-zookeeper:latest
    hostname: zk1
    container_name: zk1
    restart: always
    ports:
      - "12181:2181"
    environment:
      ZOOKEEPER_SERVER_ID: 1
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_INIT_LIMIT: 5
      ZOOKEEPER_SYNC_LIMIT: 2
      ZOOKEEPER_SERVERS: zk1:12888:13888;zk2:22888:23888;zk3:32888:33888

  zk2:
    image: confluentinc/cp-zookeeper:latest
    hostname: zk2
    container_name: zk2
    restart: always
    ports:
      - "22181:2181"
    environment:
      ZOOKEEPER_SERVER_ID: 2
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_INIT_LIMIT: 5
      ZOOKEEPER_SYNC_LIMIT: 2
      ZOOKEEPER_SERVERS: zk1:12888:13888;zk2:22888:23888;zk3:32888:33888

  zk3:
    image: confluentinc/cp-zookeeper:latest
    hostname: zk3
    container_name: zk3
    restart: always
    ports:
      - "32181:2181"
    environment:
      ZOOKEEPER_SERVER_ID: 3
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      ZOOKEEPER_INIT_LIMIT: 5
      ZOOKEEPER_SYNC_LIMIT: 2
      ZOOKEEPER_SERVERS: zk1:12888:13888;zk2:22888:23888;zk3:32888:33888

  kafka1:
    image: confluentinc/cp-kafka:latest
    hostname: kafka1
    container_name: kafka1
    restart: always
    depends_on:
      - zk1
      - zk2
      - zk3
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zk1:2181,zk2:2181,zk3:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka1:9092

  kafka2:
    image: confluentinc/cp-kafka:latest
    hostname: kafka2
    container_name: kafka2
    restart: always
    depends_on:
      - zk1
      - zk2
      - zk3
    environment:
      KAFKA_BROKER_ID: 2
      KAFKA_ZOOKEEPER_CONNECT: zk1:2181,zk2:2181,zk3:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka2:9092

  kafka3:
    image: confluentinc/cp-kafka:latest
    hostname: kafka3
    container_name: kafka3
    restart: always
    depends_on:
      - zk1
      - zk2
      - zk3
    environment:
      KAFKA_BROKER_ID: 3
      KAFKA_ZOOKEEPER_CONNECT: zk1:2181,zk2:2181,zk3:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka3:9092

  kafka_manager:
    image: hlebalbau/kafka-manager:latest
    hostname: kafka_manager
    container_name: kafka_manager
    restart: always
    ports:
      - "9000:9000"
    environment:
      ZK_HOSTS: "zk1:2181,zk2:2181,zk3:2181"
      APPLICATION_SECRET: "random-secret"
      KAFKA_MANAGER_AUTH_ENABLED: "true"
      KAFKA_MANAGER_USERNAME: zhongmingmao
      KAFKA_MANAGER_PASSWORD: zhongmingmao
    command: -Dpidfile.path=/dev/null
```

## 验证

### 启动
```
$ docker-compose up -d
Creating network "kafka_default" with the default driver
Creating zk2           ... done
Creating zk3           ... done
Creating kafka_manager ... done
Creating zk1           ... done
Creating kafka1        ... done
Creating kafka2        ... done
Creating kafka3        ... done

$ docker-compose ps
    Name                   Command               State                      Ports
----------------------------------------------------------------------------------------------------
kafka1          /etc/confluent/docker/run        Up      9092/tcp
kafka2          /etc/confluent/docker/run        Up      9092/tcp
kafka3          /etc/confluent/docker/run        Up      9092/tcp
kafka_manager   /kafka-manager/bin/kafka-m ...   Up      0.0.0.0:9000->9000/tcp
zk1             /etc/confluent/docker/run        Up      0.0.0.0:12181->2181/tcp, 2888/tcp, 3888/tcp
zk2             /etc/confluent/docker/run        Up      0.0.0.0:22181->2181/tcp, 2888/tcp, 3888/tcp
zk3             /etc/confluent/docker/run        Up      0.0.0.0:32181->2181/tcp, 2888/tcp, 3888/tcp
```

### 发送消息
```
# 进入kafka1
$ docker exec -it kafka1 bash

# 创建主题
root@kafka1:/# kafka-topics --zookeeper zk1:2181,zk2:2181,zk3:2181 --replication-factor 1 --partitions 1 --create --topic zhongmingmao
Created topic "zhongmingmao".
root@kafka1:/# kafka-topics --zookeeper zk1:2181,zk2:2181,zk3:2181 --describe --topic zhongmingmao
Topic:zhongmingmao	PartitionCount:1	ReplicationFactor:1	Configs:
	Topic: zhongmingmao	Partition: 0	Leader: 2	Replicas: 2	Isr: 2

# 发送消息
root@kafka1:/# kafka-console-producer --broker-list kafka1:9092,kafka2:9092,kafka3:9092 --topic=zhongmingmao
>hello
>zhongmingmao
>
```

### 读取消息
```
# 进入kafka2
$ docker exec -it kafka2 bash

# 读取消息
root@kafka2:/# kafka-console-consumer --bootstrap-server kafka1:9092,kafka2:9092,kafka3:9092 --topic zhongmingmao --from-beginning
hello
zhongmingmao
```

### 管理后台
http://localhost:9000/clusters/docker-kafka/topics/zhongmingmao

<img src="https://kafka-1253868755.cos.ap-guangzhou.myqcloud.com/definitive-guide/kafka-manager.png" width=800/>


### 关闭
```
$ docker-compose down
Stopping kafka2        ... done
Stopping kafka1        ... done
Stopping kafka3        ... done
Stopping zk1           ... done
Stopping kafka_manager ... done
Stopping zk3           ... done
Stopping zk2           ... done
Removing kafka2        ... done
Removing kafka1        ... done
Removing kafka3        ... done
Removing zk1           ... done
Removing kafka_manager ... done
Removing zk3           ... done
Removing zk2           ... done
Removing network kafka_default
```

<!-- indicate-the-source -->
