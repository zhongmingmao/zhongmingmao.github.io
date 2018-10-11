---
title: Kafka学习笔记 -- 集群安装与配置（Ubuntu）
date: 2018-10-08 00:53:07
categories:
  - Kafka
tags:
  - Kafka
---

## 单节点

### 安装Java

#### 添加ppa
```
➜ sudo add-apt-repository ppa:webupd8team/java
➜ sudo apt-get update
```

#### 安装oracle-java8-installer
```
➜ sudo apt-get install oracle-java8-installer
```

<!-- more -->

#### 设置系统默认JDK
```
➜ sudo update-java-alternatives -s java-8-oracle
```

### 下载解压Kafka
```
➜ mkdir ~/Downloads & cd ~/Downloads
➜ wget http://mirrors.hust.edu.cn/apache/kafka/2.0.0/kafka_2.11-2.0.0.tgz

➜ mkdir ~/kafka && cd ~/kafka
➜ kafka tar -xvzf ~/Downloads/kafka_2.11-2.0.0.tgz  --strip 1
```

### 允许Kafka删除主题
```
➜ vim ~/kafka/config/server.properties

# 添加
delete.topic.enable=true
```

### 定义systemd

#### Zookeeper
```
➜ sudo vim /etc/systemd/system/zookeeper.service
```

```
[Unit]
Requires=network.target remote-fs.target
After=network.target remote-fs.target

[Service]
Type=simple
User=zhongmingmao
ExecStart=/home/zhongmingmao/kafka/bin/zookeeper-server-start.sh /home/zhongmingmao/kafka/config/zookeeper.properties
ExecStop=/home/zhongmingmao/kafka/bin/zookeeper-server-stop.sh
Restart=on-abnormal

[Install]
WantedBy=multi-user.target
```

#### Kafka
```
➜ sudo vim /etc/systemd/system/kafka.service
```

```
[Unit]
Requires=zookeeper.service
After=zookeeper.service

[Service]
Type=simple
User=zhongmingmao
ExecStart=/bin/sh -c '/home/zhongmingmao/kafka/bin/kafka-server-start.sh /home/zhongmingmao/kafka/config/server.properties > /home/zhongmingmao/kafka/kafka.log 2>&1'
ExecStop=/home/zhongmingmao/kafka/bin/kafka-server-stop.sh
Restart=on-abnormal

[Install]
WantedBy=multi-user.target
```

### 启动
```
➜ sudo systemctl start kafka

➜ sudo systemctl status kafka
● kafka.service
   Loaded: loaded (/etc/systemd/system/kafka.service; disabled; vendor preset: enabled)
   Active: active (running) since Mon 2018-10-08 01:52:40 UTC; 6s ago

➜ sudo systemctl status zookeeper
● zookeeper.service
  Loaded: loaded (/etc/systemd/system/zookeeper.service; disabled; vendor preset: enabled)
  Active: active (running) since Mon 2018-10-08 01:52:40 UTC; 1min 33s ago
```

### 查看日志
```
➜ journalctl -u kafka
➜ journalctl -u zookeeper
```

### 开机自启动
```
➜ sudo systemctl enable kafka
Created symlink /etc/systemd/system/multi-user.target.wants/kafka.service → /etc/systemd/system/kafka.service.
```

### 添加环境变量
```
➜ vim ~/.zshrc

# 添加
KAFKA_HOME="/home/zhongmingmao/kafka/"
export PATH=$KAFKA_HOME/bin:$PATH

➜ source ~/.zshrc
```

### 测试功能

#### 创建主题
```
➜ kafka-topics.sh --zookeeper localhost:2181 --create --replication-factor 1 --partitions 1 --topic zhongmingmao
Created topic "zhongmingmao".

➜ kafka-topics.sh --zookeeper localhost:2181 --list
zhongmingmao
```

#### 发送消息
```
➜ echo "hello, zhongmingmao" | kafka-console-producer.sh --broker-list localhost:9092 --topic zhongmingmao > /dev/null
```

#### 读取消息
```
➜ kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic zhongmingmao --from-beginning
hello, zhongmingmao
```

### KafkaT

#### 安装
```
➜ sudo apt install ruby ruby-dev build-essential
➜ sudo gem install kafkat
```

#### 配置
```
➜ vim ~/.kafkatcfg
```

```
{
  "kafka_path": "~/kafka",
  "log_path": "/tmp/kafka-logs",
  "zk_path": "localhost:2181"
}
```

```
➜ kafkat partitions
Topic		Partition	Leader		Replicas						ISRs
zhongmingmao	0		0		[0]							[0]
__consumer_offsets	0		0		[0]							[0]
```

## 集群

### 机器IP
- 172.16.143.133
- 172.16.143.134
- 172.16.143.135

### 创建数据目录
```
➜ mkdir -p ~/data/zookeeper && mkdir -p ~/data/kafka
```

### 配置Zookeeper

#### zookeeper.properties
```
➜ vim ~/kafka/config/zookeeper.properties

```

```
dataDir=/home/zhongmingmao/data/zookeeper
clientPort=2181

maxClientCnxns=100
tickTime=2000
initLimit=10
syncLimit=5

server.1=172.16.143.133:2888:3888
server.2=172.16.143.134:2888:3888
server.3=172.16.143.135:2888:3888
```

#### 新增myid
```
➜ echo 1 > ~/data/zookeeper/myid # 不同机器，数值为1、2、3
```

### 配置Kafka
```
➜ vim ~/kafka/config/server.properties

# 修改下面配置
broker.id=0 # 不同机器，数值为0、1、2
listeners=PLAINTEXT://172.16.143.133:9092 # 机器IP
zookeeper.connect=172.16.143.133:2181,172.16.143.134:2181,172.16.143.135:2181 # Zookeeper集群
log.dirs=/home/zhongmingmao/data/kafka
```

### 启动Kafka
```
➜ sudo systemctl start kafka

➜ jps
4997 Jps
4331 Kafka
4317 QuorumPeerMain
```

### 测试功能

#### 创建主题
```
# Mac OS
➜ kafka-topics --zookeeper 172.16.143.133:2181,172.16.143.134:2181,172.16.143.135:2181 --create --replication-factor 1 --partitions 1 --topic zhongmingmao
Created topic "zhongmingmao".

➜ kafka-topics --zookeeper 172.16.143.133:2181,172.16.143.134:2181,172.16.143.135:2181 --list
zhongmingmao

# --zookeeper 可以只列一个
```

#### 发送消息
```
# Mac OS
➜ echo "hello, zhongmingmao" | kafka-console-producer --broker-list 172.16.143.133:9092,172.16.143.134:9092,172.16.143.135:9092, --topic zhongmingmao > /dev/null
```

#### 读取消息
```
# Mac OS
➜ kafka-console-consumer --bootstrap-server 172.16.143.133:9092,172.16.143.134:9092,172.16.143.135:9092 --topic zhongmingmao --from-beginning
hello, zhongmingmao
```

#### 修改KafkaT
```
➜ vim ~/.kafkatcfg
```

```
{
  "kafka_path": "/home/zhongmingmao/kafka",
  "log_path": "/home/zhongmingmao/data/kafka",
  "zk_path": "172.16.143.133:2181,172.16.143.134:2181,172.16.143.135:2181"
}
```

```
➜ kafkat partitions
Topic		Partition	Leader		Replicas						ISRs
zhongmingmao	0		2		[2]							[2]
__consumer_offsets	0		1		[1]							[1]
```

<!-- indicate-the-source -->
