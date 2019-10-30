---
title: Kafka -- 常用脚本
mathjax: false
date: 2019-09-27 09:49:25
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

## 脚本列表
```
connect-distributed              kafka-consumer-perf-test         kafka-reassign-partitions        kafka-verifiable-producer
connect-standalone               kafka-delegation-tokens          kafka-replica-verification       trogdor
kafka-acls                       kafka-delete-records             kafka-run-class                  zookeeper-security-migration
kafka-broker-api-versions        kafka-dump-log                   kafka-server-start               zookeeper-server-start
kafka-configs                    kafka-log-dirs                   kafka-server-stop                zookeeper-server-stop
kafka-console-consumer           kafka-mirror-maker               kafka-streams-application-reset  zookeeper-shell
kafka-console-producer           kafka-preferred-replica-election kafka-topics
kafka-consumer-groups            kafka-producer-perf-test         kafka-verifiable-consumer
```

<!-- more -->

## kafka-broker-api-versions
```
kafka-broker-api-versions --bootstrap-server localhost:9092
localhost:9092 (id: 0 rack: null) -> (
	Produce(0): 0 to 7 [usable: 7],
	Fetch(1): 0 to 11 [usable: 11],
	ListOffsets(2): 0 to 5 [usable: 5],
	Metadata(3): 0 to 8 [usable: 8],
	LeaderAndIsr(4): 0 to 2 [usable: 2],
    ...
)
```
1. kafka-broker-api-versions脚本用于验证**不同Kafka版本**之间**服务器**和**客户端**的适配性
2. `Produce(0): 0 to 7 [usable: 7]`
    - Produce请求，序号为0，表示Kafka所有请求类型中的**第一号**请求
    - `0 to 7`表示Produce请求在Kafka 2.3中总共有**8个版本**
    - `usable: 7`表示当前连入这个Broker的客户端API能够使用的版本号是7，即**最新版本**
3. 在**0.10.2.0**之前，Kafka是**单向兼容**的，即高版本的Broker能够处理低版本Client发送的请求，反正则不行
4. 从**0.10.2.0**开始，Kafka正式支持**双向兼容**，即_**低版本的Broker也能处理高版本Client的请求**_

## kafka-console-producer
```
$ kafka-console-producer --broker-list localhost:9092 --topic zhongmingmao --request-required-acks -1 --producer-property compression.type=lz4
>hello world
>
```

## kafka-console-consumer
如果没有指定`group`，每次运行Console Consumer，都会**自动生成一个新的消费者组**（console-consumer开头）来消费
`--from-beginning`等同于将Consumer端参数`auto.offset.reset`设置为**`Earliest`**（默认值为`Latest`）
```
$ kafka-console-consumer --bootstrap-server localhost:9092 --topic zhongmingmao --group zhongmingmao --from-beginning --consumer-property enable.auto.commit=false
hello world
```

## kafka-producer-perf-test
向指定专题发送1千万条消息，每条消息大小为**1KB**，一般关注**99th**分位即可，可以作为该生产者对外承诺的**SLA**
```
$ kafka-producer-perf-test --topic zhongmingmao --num-records 10000000 --throughput -1 --record-size 1024 --producer-props bootstrap.servers=localhost:9092 acks=-1 linger.ms=2000 compression.type=lz4
24041 records sent, 4802.4 records/sec (4.69 MB/sec), 2504.6 ms avg latency, 3686.0 ms max latency.
374745 records sent, 74829.3 records/sec (73.08 MB/sec), 3955.9 ms avg latency, 4258.0 ms max latency.
530462 records sent, 106092.4 records/sec (103.61 MB/sec), 5043.2 ms avg latency, 5979.0 ms max latency.
973178 records sent, 194402.3 records/sec (189.85 MB/sec), 4616.0 ms avg latency, 6092.0 ms max latency.
1114737 records sent, 222858.3 records/sec (217.64 MB/sec), 3226.9 ms avg latency, 3501.0 ms max latency.
1274003 records sent, 254647.8 records/sec (248.68 MB/sec), 2967.1 ms avg latency, 3258.0 ms max latency.
1315568 records sent, 262798.2 records/sec (256.64 MB/sec), 2655.6 ms avg latency, 2790.0 ms max latency.
1384239 records sent, 276847.8 records/sec (270.36 MB/sec), 2665.2 ms avg latency, 2799.0 ms max latency.
1419418 records sent, 283883.6 records/sec (277.23 MB/sec), 2509.9 ms avg latency, 2612.0 ms max latency.
10000000 records sent, 201751.200420 records/sec (197.02 MB/sec), 3041.05 ms avg latency, 6092.00 ms max latency, 2684 ms 50th, 5500 ms 95th, 5999 ms 99th, 6085 ms 99.9th.
```

## kafka-consumer-perf-test
```
$ kafka-consumer-perf-test --broker-list localhost:9092 --messages 10000000 --topic zhongmingmao
start.time, end.time, data.consumed.in.MB, MB.sec, data.consumed.in.nMsg, nMsg.sec, rebalance.time.ms, fetch.time.ms, fetch.MB.sec, fetch.nMsg.sec
2019-09-27 19:46:34:219, 2019-10-30 19:46:52:092, 9765.6250, 546.3898, 10000002, 559503.2731, 50, 17823, 547.9226, 561072.8834
```

## 查看主题消息总数
```
$ 
$ kafka-run-class kafka.tools.GetOffsetShell --broker-list localhost:9092 --time -2 --topic zhongmingmao
zhongmingmao:0:0

$ kafka-run-class kafka.tools.GetOffsetShell --broker-list localhost:9092 --time -1 --topic zhongmingmao
zhongmingmao:0:10000002
```

## 查看消息文件数据
`--files`显式的是消息批次或消息集合的**元数据**信息
```
$ kafka-dump-log --files /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log | head -n 10
Dumping /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log
Starting offset: 0
baseOffset: 0 lastOffset: 0 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 0 CreateTime: 1572434815538 size: 79 magic: 2 compresscodec: NONE crc: 234703942 isvalid: true
baseOffset: 1 lastOffset: 1 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 79 CreateTime: 1572434920055 size: 69 magic: 2 compresscodec: NONE crc: 1305542871 isvalid: true
baseOffset: 2 lastOffset: 16 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 148 CreateTime: 1572435583918 size: 1241 magic: 2 compresscodec: LZ4 crc: 3547131642 isvalid: true
baseOffset: 17 lastOffset: 31 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 1389 CreateTime: 1572435583920 size: 1238 magic: 2 compresscodec: LZ4 crc: 2462803486 isvalid: true
baseOffset: 32 lastOffset: 46 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 2627 CreateTime: 1572435583924 size: 1238 magic: 2 compresscodec: LZ4 crc: 2150713960 isvalid: true
baseOffset: 47 lastOffset: 61 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 3865 CreateTime: 1572435583926 size: 1239 magic: 2 compresscodec: LZ4 crc: 1263953458 isvalid: true
baseOffset: 62 lastOffset: 76 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 5104 CreateTime: 1572435583932 size: 1238 magic: 2 compresscodec: LZ4 crc: 2346030242 isvalid: true
baseOffset: 77 lastOffset: 91 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 6342 CreateTime: 1572435583936 size: 1238 magic: 2 compresscodec: LZ4 crc: 1966965031 isvalid: true
```
`--deep-iteration`用于查看每条**具体**的消息
```

$ kafka-dump-log --files /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log --deep-iteration | head -n 25
Dumping /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log
Starting offset: 0
baseOffset: 0 lastOffset: 0 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 0 CreateTime: 1572434815538 size: 79 magic: 2 compresscodec: NONE crc: 234703942 isvalid: true
| offset: 0 CreateTime: 1572434815538 keysize: -1 valuesize: 11 sequence: -1 headerKeys: []
baseOffset: 1 lastOffset: 1 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 79 CreateTime: 1572434920055 size: 69 magic: 2 compresscodec: NONE crc: 1305542871 isvalid: true
| offset: 1 CreateTime: 1572434920055 keysize: -1 valuesize: 1 sequence: -1 headerKeys: []
baseOffset: 2 lastOffset: 16 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 148 CreateTime: 1572435583918 size: 1241 magic: 2 compresscodec: LZ4 crc: 3547131642 isvalid: true
| offset: 2 CreateTime: 1572435583623 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 3 CreateTime: 1572435583916 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 4 CreateTime: 1572435583916 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 5 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 6 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 7 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 8 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 9 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 10 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 11 CreateTime: 1572435583917 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 12 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 13 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 14 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 15 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 16 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
baseOffset: 17 lastOffset: 31 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 1389 CreateTime: 1572435583920 size: 1238 magic: 2 compresscodec: LZ4 crc: 2462803486 isvalid: true
| offset: 17 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
| offset: 18 CreateTime: 1572435583918 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: []
```
`--print-data-log`用于查看**消息里面的实际数据**
```
$ kafka-dump-log --files /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log --deep-iteration --print-data-log | head -n 8
Dumping /usr/local/var/lib/kafka-logs/zhongmingmao-0/00000000000000000000.log
Starting offset: 0
baseOffset: 0 lastOffset: 0 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 0 CreateTime: 1572434815538 size: 79 magic: 2 compresscodec: NONE crc: 234703942 isvalid: true
| offset: 0 CreateTime: 1572434815538 keysize: -1 valuesize: 11 sequence: -1 headerKeys: [] payload: hello world
baseOffset: 1 lastOffset: 1 count: 1 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 79 CreateTime: 1572434920055 size: 69 magic: 2 compresscodec: NONE crc: 1305542871 isvalid: true
| offset: 1 CreateTime: 1572434920055 keysize: -1 valuesize: 1 sequence: -1 headerKeys: [] payload: w
baseOffset: 2 lastOffset: 16 count: 15 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false position: 148 CreateTime: 1572435583918 size: 1241 magic: 2 compresscodec: LZ4 crc: 3547131642 isvalid: true
| offset: 2 CreateTime: 1572435583623 keysize: -1 valuesize: 1024 sequence: -1 headerKeys: [] payload: SSXVNJHPDQDXVCRASTVYBCWVMGNYKRXVZXKGXTSPSJDGYLUEGQFLAQLOCFLJBEPOWFNSOMYARHAOPUFOJHHDXEHXJBHWGSMZJGNLONJVXZXZOZITKXJBOZWDJMCBOSYQQKCPRRDCZWMRLFXBLGQPRPGRNTAQOOSVXPKJPJLAVSQCCRXFRROLLHWHOHFGCFWPNDLMWCSSHWXQQYKALAAWCMXYLMZALGDESKKTEESEMPRHROVKUMPSXHELIDQEOOHOIHEGJOAZBVPUMCHSHGXZYXXQRUICRIJGQEBBWAXABQRIRUGZJUUVFYQOVCDEDXYFPRLGSGZXSNIAVODTJKSQWHNWVPSAMZKOUDTWHIORJSCZIQYPCZMBYWKDIKOKYNGWPXZWMKRDCMBXKFUILWDHBFXRFAOPRUGDFLPDLHXXCXCUPLWGDPPHEMJGMTVMFQQFVCUPOFYWLDUEBICKPZKHKVMCJVWVKTXBKAPWAPENUEZNWNWDCACDRLPIPHJQQKMOFDQSPKKNURFBORJLBPCBIWTSJNPRBNITTKJYWAHWGKZYNUSFISPIYPIOGAUPZDXHCFVGXGIVVCPFHIXAACZXZLFDMOOSSNTKUPJQEIRRQAMUCTBLBSVPDDYOIHAOODZNJTVHDCIEGTAVMYZOCIVSKUNSMXEKBEWNZPRPWPUJABJXNQBOXSHOEGMJSNBUTGTIFVEQPSYBDXEXORPQDDODZGBELOISTRWXMEYWVVHGMJKWLJCCHPKAFRASZEYQZCVLFSLOWTLBMPPWPPFPQSAZPTULSTCDMODYKZGSRFQTRFTGCNMNXQQIYVUQZHVNIPHZWVBSGOBYIFDNNXUTBBQUYNXOZCSICGRTZSSRHROJRGBHMHEQJRDLOQBEPTOBMYLMIGPPDPOLTEUVDGATCGYPQOGOYYESKEGBLOCBIYSLQEYGCCIPBXPNSPKDYTBEWDHBHWVDPLOVHJPNYGJUHKKHDASNFGZDAIWWQEPPBRJKDGOSAFAPRLWFFXRVMZQTKRYF
```

## 查询消费者组位移
`CURRENT-OFFSET`表示该消费者当前消费的最新位移，`LOG-END-OFFSET`表示对应分区最新生产消息的位移
```
$ kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group zhongmingmao

GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID                                     HOST            CLIENT-ID
zhongmingmao    zhongmingmao    0          -               10000002        -               consumer-1-338796c8-e062-47e5-94d0-ed8d686a004f /127.0.0.1      consumer-1
```