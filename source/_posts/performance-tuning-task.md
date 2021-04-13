---
title: 任务系统 - 性能调优
mathjax: false
date: 2021-04-12 20:49:43
categories:
	- Performance
	- Tuning
tags:
	- Performance Tuning
---

# 说明

## 调优背景
1. 任务系统是一个运行多年且**高度抽象**的核心营收系统
2. 业务高峰期出现**频繁GC**，导致Kafka消息消费延迟的情况，影响线上业务
3. 经JVM参数调优后，效果提升不明显，依然无法满足业务需求，需要专项深入优化，**降低内存分配的速度**

## 主要挑战
1. 代码高度抽象且迭代多年，存在**比较陡峭的理解曲线**
2. 调优过程不能影响线上业务，因此不能采用会触发**STW**的工具，如HeapDump等

## 调优思路
1. 不直接关注代码架构设计等静态指标，直接采样线上系统的运行数据
2. 从采样数据中得出**剩余可调优空间**的TopN问题，针对问题进行分析优化后再次上线，进入下一轮调优迭代
3. 调优N次后，当**剩余可调优空间**不大或者性价比不高时（问题域趋向于**收敛**），即结束调优迭代

## 采样时间
1. **Java Flight Recorder**
  - 均为10分钟
  - 采样文件大小与采样时间基本是`O(N)`的关系，不适合长时间采样，且本案例中内存分配的Top 5基本不变
2. **Async Profiler**
  - 调优迭代为10分钟，最后一次采样为7天
  - 采样文件大小与采样时间基本是`O(1)`的关系，可以长时间采样
    - 调优迭代采样10分钟是为了**快速确定TopN问题**，加速调优迭代
    - 最后一次采样为7天是为了不遗留（低频但分配很多内存的）调用链路，提高**剩余可调优空间**的确信度

## 关注点
1. 基于采样数据进行性能分析，与实际的准确数据成**正相关**
2. 系统负载是动态变化的，而性能基线的数据只采样了1次，且采样时间为10分钟
   - 因此调优过程中关注的重点并不是『调优效果』，而是**剩余可调优空间**（趋向于**收敛**）

<!-- more -->

# 调优效果

## 内存分配 & GC

### 2020-12-02

![image-20210104155357043](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210104155357043.png)

![image-20210107222031603](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107222031603.png)

### 2021-01-07

![image-20210107220708577](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107220708577.png)

![image-20210107222103197](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107222103197.png)

### 对比

| 指标                        | 2020-12-02 | 2021-01-07 | 提升（%） |
| --------------------------- | ---------- | ---------- | --------- |
| 堆内存分配-峰值速率（MB/s） | 98.3       | 33.9       | 290.0     |
| 堆内存分配-平均速率（MB/s） | 73.8       | 25.9       | 284.9     |
| YGC次数                     | 15         | 4          | 375.0     |
| 最长停顿                    | 126.450    | 63.987     | 197.6     |

## 日志大小

```bash
$ du -sm server.2020-12-02_21.log
2961	server.2020-12-02_21.log

$ du -sm server.2021-01-07_21.log
313     server.2021-01-07_21.log
```

| 指标           | 2020-12-02 | 2021-01-07 | 提升（%） |
| -------------- | ---------- | ---------- | --------- |
| 日志大小（MB） | 2961       | 313        | 946.0     |

## 调优过程

### 堆内存分配

![image-20210107223924320](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107223924320.png)

![image-20210107225014780](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107225014780.png)

# 调优工具

注：以下工具都是在实际调优过程中用到的，没有用到的工具并没有罗列，如[bytebuddy](https://bytebuddy.net/)等

## 采样工具

| 工具                 | 链接                                                         |
| -------------------- | ------------------------------------------------------------ |
| Java Flight Recorder | https://docs.oracle.com/javacomponents/jmc-5-4/jfr-runtime-guide/about.htm<br>https://openjdk.java.net/projects/jmc/ |
| Async Profiler       | https://github.com/jvm-profiling-tools/async-profiler        |

## 诊断工具

| 工具   | 链接                              |
| ------ | --------------------------------- |
| Arthas | https://github.com/alibaba/arthas |

## 字节码工具

| 用途   | 工具                 | 链接                                                         |
| ------ | -------------------- | ------------------------------------------------------------ |
| 查看   | jclasslib            | https://github.com/ingokegel/jclasslib                       |
| 反编译 | javap                | https://docs.oracle.com/javase/8/docs/technotes/tools/windows/javap.html |
|        | jad/jadx             | https://github.com/skylot/jadx                               |
|        | Fernflower           | [Fernflower](https://github.com/JetBrains/intellij-community/tree/master/plugins/java-decompiler/engine) |
|        | CFR                  | https://www.benf.org/other/cfr/                              |
| 操作   | ASM                  | https://asm.ow2.io/                                          |
|        | ASM Bytecode Outline | https://plugins.jetbrains.com/plugin/5918-asm-bytecode-outline |
|        | Javassist            | https://www.javassist.org/                                   |
| 增强   | Java Agent           | https://www.baeldung.com/java-instrumentation                |

## 在线分析工具

| 工具                      | 链接                   |
| ------------------------- | ---------------------- |
| Universal GC Log Analyzer | https://www.gceasy.io/ |
| Java Thread Dump Analyzer | https://fastthread.io/ |

## 自定义工具

| 用途                         | 链接                                             |
| ---------------------------- | ------------------------------------------------ |
| 提取Async Profiler的调用堆栈 | https://gitlab.xxx/yyy/async-profiler-tool |
| 自定义morphia包              | https://gitlab.xxx/yyy/morphia             |
| 自定义Java Agent             | https://gitlab.xxx/yyy/xxx-java-agent       |

# 性能基线

## 内存分配

![image-20210104155357043](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/0_baseline/image-20210104155357043.png)

| 指标                        | 值         |
| --------------------------- | ---------- |
| 堆内存分配-峰值速率（MB/s） | **98.3**   |
| 堆内存分配-平均速率（MB/s） | 73.8       |
| 分配最多的类型              | **char[]** |
| 分配最多的类型的占比（%）   | 21.9       |

## char[] - 调用堆栈

注：调用堆栈的性能基线数据仅保留了火焰图，暂无对应的文本数据

![](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/0_baseline/image-20201203141747030.png)

![](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/0_baseline/image-20201203163842167.png)

## 日志分析

日志大小

```bash
$ du -sm server.2020-12-02_21.log
2961	server.2020-12-02_21.log
```

日志编码

```bash
$ file server.2020-12-02_21.log
server.2020-12-02_21.log: UTF-8 Unicode text, with very long lines
```

打印日志（按字符统计）最多的类，UTF-8是变长编码，一个字符占用1~4个字节，2264686114 Bytes ≈ 2160 MB，占比约为**73%**

```bash
$ awk -F'\\]' '{print $2}' server.2020-12-02_21.log | awk '{sum[$2]+=length($0)} END { for(key in sum) {print sum[key],key} }' | sort -nr | head -n 10
2264686114 f.l.l.a.task.engine.BaseTaskEngine
172705290 f.l.l.a.t.m.u.UserLimitManager
41942364 f.l.l.a.t.m.c.BaseHandlerFactory
35220689 f.l.commons.queue.service.Consumer
12006889 f.l.l.a.t.k.c.DynamicProcessor
11970291 f.l.l.a.t.m.t.DefaultConditionTaskHandler
10576916 f.l.l.amusement.task.redis.RedisLock
10161167 f.l.commons.queue.service.Producer
9651714 f.l.l.a.t.k.p.IntegralProducer
9520656 f.l.l.a.t.k.c.IntegralChangeProcessor
```

BaseTaskEngine打印日志（按字符统计）最多的代码，1871134376 Bytes ≈ 1784 MB，占比约为**60%**

```bash
$ grep 'log\.' BaseTaskEngine.java | sed -e 's/^[[:space:]]*//' 
log.info("registerCondition: {}", conditionType);
log.info("registerRankType:{}", rankType);
log.info("process, triggerData={}", t);
log.info("not TestWhiteUser triggerData={}", t);
log.info("registerType={}, types={}", registeredType, types);
log.info("conditionType not process, because of dynamic engine rule. type={}, clazz={}", type, this.getClass());
log.info("getRegisteredTasks type={}, taskIds={}, triggerData={}", type, taskIds, JsonUtil.dumps(triggerData));
log.info("generateTaskContext, sampleTaskContext={}", JsonUtil.dumps(sampleTaskContext));
log.info("cacheTime={}, clazz={}, taskSize={}, getTaskTime={}",
log.error("task process error.", ex);
log.info("cacheTime={}, clazz={}, taskSize={}, getTaskTime={}, rateLimitAcquireTime={}, taskDealTime={}",
log.info("registeredTaskContexts size={}", registeredTaskContexts.size());

$ awk -F'\\]' '{print $2}' server.2020-12-02_21.log | grep 'BaseTaskEngine' | awk -F'`' '{print $6}' | awk '{sum[substr($0,0,10)]+=length($0)} END { for(key in sum) {print sum[key],key}}' | sort -nr
1871134376 generateTa
70199163 getRegiste
53719518 process, t
9792857 cacheTime=
```

```java
/**
  * 生成任务上下文
  *
  * @param triggerData    kafka数据
  * @param taskInfo       任务
  * @param registeredType 注册类型(条件/榜单)
  * @param type           注册的条件类型/榜单类型
  * @return 任务上下文
  */
private TaskContext<T> generateTaskContext(TriggerData<T> triggerData, TaskInfo taskInfo, RegisteredType registeredType, Object type) {
    TaskContext<T> taskContext = new TaskContext<>(triggerData).setTaskInfo(taskInfo);
    String traceId = traceIdManager.generateTraceId(triggerData.getTraceId());
    taskContext.setTraceId(traceId);
    if (registeredType == RegisteredType.CONDITION) {
        taskContext.setTriggerConditionType(Integer.valueOf(type.toString()));
    } else {
        taskContext.setTriggerRankType(RankType.valueOf(type.toString()));
    }
    taskContext.setTraceTime(new Date());

    // 简单任务上下文，用于打日志，本来的太大
    SampleTaskContext<?> sampleTaskContext = ModelMapperUtils.MODEL_MAPPER.map(taskContext, SampleTaskContext.class);
    sampleTaskContext.setTaskId(taskInfo.getId());
    log.info("generateTaskContext, sampleTaskContext={}", JsonUtil.dumps(sampleTaskContext));
    return taskContext;
}
```

# 调优策略

## 减少日志

### 动作

增加日志开关`openTaskContextLog`

```java
/**
  * 生成任务上下文
  *
  * @param triggerData    kafka数据
  * @param taskInfo       任务
  * @param registeredType 注册类型(条件/榜单)
  * @param type           注册的条件类型/榜单类型
  * @return 任务上下文
  */
private TaskContext<T> generateTaskContext(TriggerData<T> triggerData, TaskInfo taskInfo, RegisteredType registeredType, Object type) {
  TaskContext<T> taskContext = new TaskContext<>(triggerData).setTaskInfo(taskInfo);
  String traceId = traceIdManager.generateTraceId(triggerData.getTraceId());
  taskContext.setTraceId(traceId);
  if (registeredType == RegisteredType.CONDITION) {
    taskContext.setTriggerConditionType(Integer.valueOf(type.toString()));
  } else {
    taskContext.setTriggerRankType(RankType.valueOf(type.toString()));
  }
  taskContext.setTraceTime(new Date());

  if (logConf.isOpenTaskContextLog()) {
    // 简单任务上下文，用于打日志，本来的太大
    SampleTaskContext<?> sampleTaskContext = ModelMapperUtils.MODEL_MAPPER.map(taskContext, SampleTaskContext.class);
    sampleTaskContext.setTaskId(taskInfo.getId());
    log.info("generateTaskContext, sampleTaskContext={}", JsonUtil.dumps(sampleTaskContext));
  }
  return taskContext;
}
```

### 效果

#### 内存分配

![image-20210107150231274](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/1_log/image-20210107150231274.png)

| 指标                        | 新值       | 旧值   | 提升（%） |
| --------------------------- | ---------- | ------ | --------- |
| 堆内存分配-峰值速率（MB/s） | 71.0       | 98.3   | 138.5     |
| 堆内存分配-平均速率（MB/s） | 55.8       | 73.8   | 132.3     |
| char[]分配总量（GB）        | 5.94       | 9.48   | **159.6** |
| 分配最多的类型              | **byte[]** | char[] |           |
| 分配最多的类型的占比（%）   | 25.5       | 21.9   |           |

#### 日志分析

```bash
$ du -sm server.2020-12-06_21.log
903	server.2020-12-06_21.log
```

| 指标     | 新值 | 旧值 | 提升（%） |
| -------- | ---- | ---- | --------- |
| 日志大小 | 903  | 2961 | **327.9** |

#### byte[] - 调用堆栈

注：使用自定义分析工具[async-profiler-tool](https://gitlab.xxx/yyy/async-profiler-tool)可以得出TopN的调用堆栈，数据来源为[Async Profiler](https://github.com/jvm-profiling-tools/async-profiler)采集的Allocation事件

```
=== Top 1 Call Stack Of 'byte[]'
depth=22, score=1.54, identity='byte[]
depth=21, score=2.68, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=20, score=2.68, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=19, score=2.68, identity='org/apache/commons/codec/binary/Base64.encode
depth=18, score=3.84, identity='org/apache/commons/codec/binary/BaseNCodec.encode
depth=17, score=3.86, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=16, score=3.86, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=15, score=3.96, identity='org/apache/commons/codec/binary/Base64.encodeBase64URLSafeString
depth=14, score=4.02, identity='xxx/amusement/task/manager/common/TraceIdManager.generateTraceId
depth=13, score=4.13, identity='xxx/amusement/task/manager/common/TraceIdManager.generateTraceId
depth=12, score=4.21, identity='xxx/amusement/task/engine/BaseTaskEngine.generateTaskContext
depth=11, score=7.79, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=10, score=11.31, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=9, score=16.09, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=8, score=16.19, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=7, score=16.71, identity='xxx/amusement/task/kafka/consumer/IntegralChangeProcessor.msgReceived0
depth=6, score=16.71, identity='xxx/amusement/task/kafka/consumer/IntegralChangeProcessor.msgReceived0
depth=5, score=46.41, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=4, score=46.41, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=3, score=55.67, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=81.63, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=81.63, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=86.77, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'byte[]'
depth=19, score=1.15, identity='byte[]
depth=18, score=3.84, identity='org/apache/commons/codec/binary/BaseNCodec.encode
depth=17, score=3.86, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=16, score=3.86, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=15, score=3.96, identity='org/apache/commons/codec/binary/Base64.encodeBase64URLSafeString
depth=14, score=4.02, identity='xxx/amusement/task/manager/common/TraceIdManager.generateTraceId
depth=13, score=4.13, identity='xxx/amusement/task/manager/common/TraceIdManager.generateTraceId
depth=12, score=4.21, identity='xxx/amusement/task/engine/BaseTaskEngine.generateTaskContext
depth=11, score=7.79, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=10, score=11.31, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=9, score=16.09, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=8, score=16.19, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=7, score=16.71, identity='xxx/amusement/task/kafka/consumer/IntegralChangeProcessor.msgReceived0
depth=6, score=16.71, identity='xxx/amusement/task/kafka/consumer/IntegralChangeProcessor.msgReceived0
depth=5, score=46.41, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=4, score=46.41, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=3, score=55.67, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=81.63, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=81.63, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=86.77, identity='java/lang/Thread.run
```

##### TraceIdManager#generateTraceId()

源码

```java
public String generateTraceId() {
  BigInteger bigInteger = new BigInteger(String.valueOf(idManager.genId()));
  return Base64.encodeBase64URLSafeString(bigInteger.toByteArray());
}

public String generateTraceId(String upstreamTraceId) {
  String traceId = generateTraceId();
  if (StringUtils.isBlank(upstreamTraceId) || "0".equals(upstreamTraceId)) {
    return traceId;
  }
  return Joiner.on(".").join(upstreamTraceId, traceId);
}
```

```java
public long genId() {
  return generator.genId();
}
```

```java
// 全限定名如下，请自行查看源码
xxx.amusement.task.manager.common.TraceIdManager
xxx.amusement.utils.other.xxx.IdManager
org.apache.commons.codec.binary.Base64
```

从采样数据易得，峰值QPS约为**2359**

```bash
[arthas@18]$ monitor -c 10 -n 6 xxx.amusement.task.manager.common.TraceIdManager generateTraceId
Press Q or Ctrl+C to abort.
Affect(class count: 1 , method count: 2) cost in 222 ms, listenerId: 9
 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:38:22          xxx.amusement.task.manager.comm  generateTraceId                           17530          17530         0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:38:32          xxx.amusement.task.manager.comm  generateTraceId                           16298          16298         0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:38:42          xxx.amusement.task.manager.comm  generateTraceId                           13122          13122         0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:38:52          xxx.amusement.task.manager.comm  generateTraceId                           3568           3568          0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:39:02          xxx.amusement.task.manager.comm  generateTraceId                           13736          13736         0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

 timestamp                    class                                      method                                    total          success       fail          avg-rt(ms)     fail-rate    
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 2020-12-07 18:39:12          xxx.amusement.task.manager.comm  generateTraceId                           23590          23590         0             0.01           0.00%        
                              on.TraceIdManager                                                                                                                                           

Command execution times exceed limit: 6, so command willRandomStringUtils exit. You can set it with -n option.
```

## 优化TraceId生成算法

### 动作

通过串联JVM内的traceId来记录**调用链路**，主要用于排查问题，业务上只需要保证**一段时间尽量不重复且易读**即可

```java
// 时间范围：1小时
// 字符：数字+字母

// 2020-12-7 : peak call qps is 2359
// 2359 * 3600 = 8492400
// (26+10)^5 : 60466176
// (26+10)^5 / (2359 * 3600) ≈ 7
org.apache.commons.lang3.RandomStringUtils.randomAlphanumeric(5);
```

### 效果

#### 内存分配

![image-20210107174842700](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/2_traceId/image-20210107174842700.png)

| 指标                        | 新值       | 旧值   | 提升（%） |
| --------------------------- | ---------- | ------ | --------- |
| 堆内存分配-峰值速率（MB/s） | 58.7       | 71.0   | 121.0     |
| 堆内存分配-平均速率（MB/s） | 40.7       | 55.8   | 137.1     |
| byte[]分配总量（GB）        | 2.63       | 8.32   | **316.3** |
| 分配最多的类型              | **char[]** | byte[] |           |
| 分配最多的类型的占比（%）   | 17.6       | 25.5   |           |

#### 调用堆栈

##### char[]

```
=== Top 1 Call Stack Of 'char[]'
depth=22, score=1.9, identity='char[]
depth=21, score=2.22, identity='java/util/Arrays.copyOf
depth=20, score=2.22, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=19, score=2.22, identity='java/lang/AbstractStringBuilder.append
depth=18, score=2.22, identity='java/lang/StringBuilder.append
depth=17, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=7.98, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=7.98, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=7.98, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=7.98, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=7.98, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=8.08, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=8.08, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=8.08, identity='ch/qos/logback/classic/Logger.info
depth=3, score=53.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.08, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'char[]'
depth=21, score=1.21, identity='char[]
depth=20, score=1.44, identity='java/util/Arrays.copyOfRange
depth=19, score=1.44, identity='java/lang/String.<init>
depth=18, score=1.44, identity='java/lang/StringBuilder.toString
depth=17, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=7.98, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=7.98, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=7.98, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=7.98, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=7.98, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=8.08, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=8.08, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=8.08, identity='ch/qos/logback/classic/Logger.info
depth=3, score=53.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.08, identity='java/lang/Thread.run

=== Top 3 Call Stack Of 'char[]'
depth=24, score=0.99, identity='char[]
depth=23, score=1.23, identity='java/util/Arrays.copyOf
depth=22, score=1.23, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=21, score=1.23, identity='java/lang/AbstractStringBuilder.append
depth=20, score=1.23, identity='java/lang/StringBuilder.append
depth=19, score=4.17, identity='org/slf4j/helpers/MessageFormatter.safeObjectAppend
depth=18, score=4.17, identity='org/slf4j/helpers/MessageFormatter.deeplyAppendParameter
depth=17, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=7.98, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=7.98, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=7.98, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=7.98, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=7.98, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=8.08, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=8.08, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=8.08, identity='ch/qos/logback/classic/Logger.info
depth=3, score=53.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.08, identity='java/lang/Thread.run

=== Top 4 Call Stack Of 'char[]'
depth=17, score=0.7, identity='char[]
depth=16, score=0.8, identity='java/util/Arrays.copyOf
depth=15, score=0.8, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=14, score=0.8, identity='java/lang/AbstractStringBuilder.append
depth=13, score=0.8, identity='java/lang/StringBuilder.append
depth=12, score=1.34, identity='ch/qos/logback/core/pattern/FormattingConverter.write
depth=11, score=2.17, identity='ch/qos/logback/core/pattern/PatternLayoutBase.writeLoopOnConverters
depth=10, score=2.17, identity='ch/qos/logback/classic/PatternLayout.doLayout
depth=9, score=2.17, identity='ch/qos/logback/classic/PatternLayout.doLayout
depth=8, score=3.31, identity='ch/qos/logback/core/encoder/LayoutWrappingEncoder.doEncode
depth=7, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.writeOut
depth=6, score=3.31, identity='ch/qos/logback/core/FileAppender.writeOut
depth=5, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.subAppend
depth=4, score=3.31, identity='ch/qos/logback/core/rolling/RollingFileAppender.subAppend
depth=3, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.append
depth=2, score=3.38, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=1, score=3.38, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=0, score=3.43, identity='ch/qos/logback/core/AsyncAppenderBase$Worker.run

=== Top 5 Call Stack Of 'char[]'
depth=25, score=0.66, identity='char[]
depth=24, score=1.23, identity='java/util/Arrays.copyOf
depth=23, score=1.23, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=22, score=1.23, identity='java/lang/AbstractStringBuilder.append
depth=21, score=1.92, identity='java/lang/StringBuilder.append
depth=20, score=2.88, identity='org/apache/kafka/clients/consumer/ConsumerRecord.toString
depth=19, score=4.17, identity='org/slf4j/helpers/MessageFormatter.safeObjectAppend
depth=18, score=4.17, identity='org/slf4j/helpers/MessageFormatter.deeplyAppendParameter
depth=17, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=7.98, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=7.98, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=7.98, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=7.98, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=7.98, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=7.98, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=7.98, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=7.98, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=8.08, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=8.08, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=8.08, identity='ch/qos/logback/classic/Logger.info
depth=3, score=53.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.08, identity='java/lang/Thread.run
```

记录每个Kafka消息的处理情况，需要保留

![image-20210107175613886](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/2_traceId/image-20210107175613886.png)

##### byte[]

```
=== Top 1 Call Stack Of 'byte[]'
depth=14, score=0.61, identity='byte[]
depth=13, score=1.14, identity='java/lang/StringCoding$StringEncoder.encode
depth=12, score=1.14, identity='java/lang/StringCoding.encode
depth=11, score=1.14, identity='java/lang/StringCoding.encode
depth=10, score=1.14, identity='java/lang/String.getBytes
depth=9, score=1.14, identity='ch/qos/logback/core/encoder/LayoutWrappingEncoder.convertToBytes
depth=8, score=3.31, identity='ch/qos/logback/core/encoder/LayoutWrappingEncoder.doEncode
depth=7, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.writeOut
depth=6, score=3.31, identity='ch/qos/logback/core/FileAppender.writeOut
depth=5, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.subAppend
depth=4, score=3.31, identity='ch/qos/logback/core/rolling/RollingFileAppender.subAppend
depth=3, score=3.31, identity='ch/qos/logback/core/OutputStreamAppender.append
depth=2, score=3.38, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=1, score=3.38, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=0, score=3.43, identity='ch/qos/logback/core/AsyncAppenderBase$Worker.run

=== Top 2 Call Stack Of 'byte[]'
depth=26, score=0.43, identity='byte[]
depth=25, score=0.65, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=24, score=0.65, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=23, score=0.65, identity='org/apache/commons/codec/binary/Base64.decode
depth=22, score=0.8, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=21, score=1.04, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=20, score=1.04, identity='org/apache/commons/codec/binary/Base64.decodeBase64
depth=19, score=1.11, identity='xxx/commons/service/client/dubbo/codec/LzDubboCodec.encodeRequestData
depth=18, score=1.86, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encodeRequest
depth=17, score=1.86, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encode
depth=16, score=1.86, identity='xxx/commons/service/client/dubbo/transport/LzDubboCodecAdapter$InternalEncoder.encode
depth=15, score=1.86, identity='io/netty/handler/codec/MessageToByteEncoder.write
depth=14, score=1.86, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=13, score=1.86, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=12, score=1.86, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=11, score=1.86, identity='io/netty/channel/ChannelDuplexHandler.write
depth=10, score=1.89, identity='com/alibaba/dubbo/remoting/transport/netty4/NettyClientHandler.write
depth=9, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=8, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext.access$1900
depth=7, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.write
depth=6, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$WriteAndFlushTask.write
depth=5, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.run
depth=4, score=2.67, identity='io/netty/util/concurrent/SingleThreadEventExecutor.runAllTasks
depth=3, score=4.39, identity='io/netty/channel/nio/NioEventLoop.run
depth=2, score=4.39, identity='io/netty/util/concurrent/SingleThreadEventExecutor$2.run
depth=1, score=4.39, identity='io/netty/util/concurrent/DefaultThreadFactory$DefaultRunnableDecorator.run
depth=0, score=84.08, identity='java/lang/Thread.run

=== Top 3 Call Stack Of 'byte[]'
depth=62, score=0.4, identity='byte[]
depth=61, score=0.51, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=60, score=0.51, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=59, score=0.51, identity='org/apache/commons/codec/binary/Base64.encode
depth=58, score=0.56, identity='org/apache/commons/codec/binary/BaseNCodec.encode
depth=57, score=0.58, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=56, score=0.58, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=55, score=0.58, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=54, score=0.61, identity='org/apache/commons/codec/binary/Base64.encodeBase64String
depth=53, score=0.93, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=52, score=0.98, identity='xxx/commons/service/client/filter/client/impl/ClientLogFilter.doFilter
depth=51, score=0.98, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=50, score=1.14, identity='xxx/commons/service/client/filter/client/impl/ClientCATFilter.doFilter
depth=49, score=1.14, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=48, score=1.14, identity='xxx/commons/service/client/filter/client/impl/ClientContextFilter.doFilter
depth=47, score=1.14, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=46, score=1.14, identity='xxx/commons/service/client/dubbo/protocol/LzDubboProtocol$4.invoke
depth=45, score=1.14, identity='com/alibaba/dubbo/rpc/listener/ListenerInvokerWrapper.invoke
depth=44, score=1.14, identity='com/alibaba/dubbo/rpc/protocol/InvokerWrapper.invoke
depth=43, score=1.21, identity='com/alibaba/dubbo/rpc/cluster/support/FailoverClusterInvoker.doInvoke
depth=42, score=1.24, identity='com/alibaba/dubbo/rpc/cluster/support/AbstractClusterInvoker.invoke
depth=41, score=1.24, identity='com/alibaba/dubbo/rpc/cluster/support/wrapper/MockClusterInvoker.invoke
depth=40, score=1.95, identity='xxx/commons/service/client/dubbo/proxy/LzDubboConsumerInvokerInvocationHandler.invoke
depth=39, score=1.95, identity='com/alibaba/dubbo/common/bytecode/proxy73.isUserInGroup
depth=38, score=1.95, identity='sun/reflect/GeneratedMethodAccessor238.invoke
depth=37, score=1.95, identity='sun/reflect/DelegatingMethodAccessorImpl.invoke
depth=36, score=1.95, identity='java/lang/reflect/Method.invoke
depth=35, score=2.0, identity='xxx/commons/service/client/dubbo/serviceclient/facade/InvokeMethodInterceptor.intercept
depth=34, score=2.0, identity='xxx/usergroup/api/UserGroupService$$EnhancerByCGLIB$$167309eb.isUserInGroup
depth=33, score=2.0, identity='xxx/amusement/task/manager/userlimit/UserGroupManager.doIsUserInGroup
depth=32, score=2.07, identity='xxx/amusement/task/manager/userlimit/UserGroupManager$1.load
depth=31, score=2.07, identity='xxx/amusement/task/manager/userlimit/UserGroupManager$1.load
depth=30, score=2.07, identity='com/google/common/cache/LocalCache$LoadingValueReference.loadFuture
depth=29, score=2.07, identity='com/google/common/cache/LocalCache$Segment.loadSync
depth=28, score=2.09, identity='com/google/common/cache/LocalCache$Segment.lockedGetOrLoad
depth=27, score=2.09, identity='com/google/common/cache/LocalCache$Segment.get
depth=26, score=2.09, identity='com/google/common/cache/LocalCache.get
depth=25, score=2.09, identity='com/google/common/cache/LocalCache.getOrLoad
depth=24, score=2.09, identity='com/google/common/cache/LocalCache$LocalLoadingCache.get
depth=23, score=2.09, identity='com/google/common/cache/LocalCache$LocalLoadingCache.getUnchecked
depth=22, score=2.2, identity='xxx/amusement/task/manager/userlimit/UserGroupManager.isUserInGroup
depth=21, score=2.2, identity='xxx/amusement/task/manager/userlimit/handler/GroupUserLimitHandler.isInLimit
depth=20, score=2.22, identity='xxx/amusement/task/manager/userlimit/handler/BaseUserLimitHandler.isPass
depth=19, score=2.47, identity='xxx/amusement/task/manager/userlimit/UserLimitManager.isPassUserLimit
depth=18, score=2.52, identity='xxx/amusement/task/manager/userlimit/UserLimitManager.isPassTaskUserLimit
depth=17, score=2.52, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.isTaskUser
depth=16, score=2.53, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.preTaskCheck
depth=15, score=2.57, identity='xxx/amusement/task/manager/task/DefaultConditionTaskHandler.doProcess
depth=14, score=2.57, identity='xxx/amusement/task/manager/task/DefaultConditionTaskHandler.doProcess
depth=13, score=2.57, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.process
depth=12, score=2.57, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionProcess
depth=11, score=2.57, identity='xxx/amusement/task/engine/BaseTaskEngine.taskProcessEntrance
depth=10, score=8.12, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=9, score=8.12, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=8, score=8.12, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=7, score=8.12, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=6, score=8.12, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=5, score=29.5, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=4, score=29.5, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=3, score=53.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=74.71, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.08, identity='java/lang/Thread.run
```

调用UserGroupManager#isUserInGroup的QPS为342.5，占比87.65%

![image-20210107172300325](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/2_traceId/image-20210107172300325.png)

```java
private LoadingCache<String, Boolean> cache = CacheBuilder.newBuilder()
  .maximumSize(1000)
  .expireAfterWrite(5, TimeUnit.SECONDS)
  .recordStats()
  .build(new CacheLoader<String, Boolean>() {
    @Override
    public Boolean load(String key) throws Exception {
      List<String> list = Splitter.on(DELIMITER).omitEmptyStrings().trimResults().splitToList(key);
      if (list.size() != 2) {
        return false;
      }
      Long groupId = NULL_STR.contentEquals(list.get(0)) ? null : Long.valueOf(list.get(0));
      Long userId = NULL_STR.contentEquals(list.get(1)) ? null : Long.valueOf(list.get(1));
      return doIsUserInGroup(groupId, userId);
    }
  });
```

缓存命中率为765152 / (765152 + 586156 ) ≈ **56.6%**

| 指标               | 值              |
| ------------------ | --------------- |
| hitCount           | 765152          |
| missCount          | 586156          |
| loadSuccessCount   | 585960          |
| loadExceptionCount | 0               |
| totalLoadTime      | 574977708979 ns |
| evictionCount      | 585553          |

## 提高缓存命中率

### 动作

通过简单分析请求的分布，然后调整`maximumSize`和`expireAfterWrite`，最终目标是将缓存命中率提升到**70%**

#### maximumSize

将`maximumSize`调整为**20000**

```java
// 按Key分组计数，然后按计数倒排，获取P70的累计水位线

// output
//  10000 -> 0.5781230074488595
//  20000 -> 0.7284579435747024
//  30000 -> 0.8030290528021364
//  40000 -> 0.8405358978013487
//  50000 -> 0.878042742800561
//  60000 -> 0.9155495877997735
//  70000 -> 0.9530564327989858
//  80000 -> 0.9905632777981982
//  82516 -> 1.0
```

#### expireAfterWrite

将`expireAfterWrite`调整为**20s**

```java
// 按Key分组计数，然后按计数倒排，取Top1的Key，记为K1
// 获取K1的请求间隔分布，按请求间隔分组计数，按请求间隔正排，获取P70的累计水位线

// output
//  5 -> 0.0851063829787234
//  ...
//  15 -> 0.5106382978723404
//  ...
//  19 -> 0.6382978723404256
//  20 -> 0.6808510638297872
//  21 -> 0.7021276595744681
//  ...
//  62 -> 0.9946808510638298
//  97 -> 1.0
```

### 效果

#### 内存分配

![image-20210107182756682](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/3_cache/image-20210107182756682.png)

| 指标                        | 新值       | 旧值   | 提升（%） |
| --------------------------- | ---------- | ------ | --------- |
| 堆内存分配-峰值速率（MB/s） | 40.3       | 58.7   | 145.7     |
| 堆内存分配-平均速率（MB/s） | 32.6       | 40.7   | 124.8     |
| byte[]分配总量（GB）        | 2.35       | 2.63   | **111.9** |
| 分配最多的类型              | **char[]** | char[] |           |
| 分配最多的类型的占比（%）   | 16.5       | 17.6   |           |

#### 缓存命中率

缓存命中率为772005 / (772005 + 301728) ≈ **71.9%**，达到预期

| 指标               | 值              |
| ------------------ | --------------- |
| hitCount           | 772005          |
| missCount          | 301728          |
| loadSuccessCount   | 298869          |
| loadExceptionCount | 0               |
| totalLoadTime      | 406792490745 ns |
| evictionCount      | 297648          |

#### 调用堆栈

##### char[]

```
=== Top 1 Call Stack Of 'char[]'
depth=22, score=1.52, identity='char[]
depth=21, score=1.82, identity='java/util/Arrays.copyOf
depth=20, score=1.82, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=19, score=1.82, identity='java/lang/AbstractStringBuilder.append
depth=18, score=1.82, identity='java/lang/StringBuilder.append
depth=17, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=6.89, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=6.89, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=6.89, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=6.89, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=6.89, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=6.92, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=6.92, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=6.92, identity='ch/qos/logback/classic/Logger.info
depth=3, score=49.45, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.45, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'char[]'
depth=21, score=1.01, identity='char[]
depth=20, score=1.4, identity='java/util/Arrays.copyOfRange
depth=19, score=1.4, identity='java/lang/String.<init>
depth=18, score=1.4, identity='java/lang/StringBuilder.toString
depth=17, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=6.89, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=6.89, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=6.89, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=6.89, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=6.89, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=6.92, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=6.92, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=6.92, identity='ch/qos/logback/classic/Logger.info
depth=3, score=49.45, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.45, identity='java/lang/Thread.run

=== Top 3 Call Stack Of 'char[]'
depth=24, score=0.78, identity='char[]
depth=23, score=1.21, identity='java/util/Arrays.copyOf
depth=22, score=1.21, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=21, score=1.21, identity='java/lang/AbstractStringBuilder.append
depth=20, score=1.21, identity='java/lang/StringBuilder.append
depth=19, score=3.51, identity='org/slf4j/helpers/MessageFormatter.safeObjectAppend
depth=18, score=3.51, identity='org/slf4j/helpers/MessageFormatter.deeplyAppendParameter
depth=17, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=6.89, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=6.89, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=6.89, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=6.89, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=6.89, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=6.89, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=6.89, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=6.89, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=6.92, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=6.92, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=6.92, identity='ch/qos/logback/classic/Logger.info
depth=3, score=49.45, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.45, identity='java/lang/Thread.run
```

##### byte[]

```
=== Top 1 Call Stack Of 'byte[]'
depth=26, score=0.59, identity='byte[]
depth=25, score=0.7, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=24, score=0.7, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=23, score=0.7, identity='org/apache/commons/codec/binary/Base64.decode
depth=22, score=0.82, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=21, score=1.01, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=20, score=1.01, identity='org/apache/commons/codec/binary/Base64.decodeBase64
depth=19, score=1.08, identity='xxx/commons/service/client/dubbo/codec/LzDubboCodec.encodeRequestData
depth=18, score=1.93, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encodeRequest
depth=17, score=1.93, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encode
depth=16, score=1.93, identity='xxx/commons/service/client/dubbo/transport/LzDubboCodecAdapter$InternalEncoder.encode
depth=15, score=1.97, identity='io/netty/handler/codec/MessageToByteEncoder.write
depth=14, score=1.97, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=13, score=1.97, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=12, score=1.97, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=11, score=1.97, identity='io/netty/channel/ChannelDuplexHandler.write
depth=10, score=2.05, identity='com/alibaba/dubbo/remoting/transport/netty4/NettyClientHandler.write
depth=9, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=8, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext.access$1900
depth=7, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.write
depth=6, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$WriteAndFlushTask.write
depth=5, score=2.39, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.run
depth=4, score=2.71, identity='io/netty/util/concurrent/SingleThreadEventExecutor.runAllTasks
depth=3, score=4.17, identity='io/netty/channel/nio/NioEventLoop.run
depth=2, score=4.17, identity='io/netty/util/concurrent/SingleThreadEventExecutor$2.run
depth=1, score=4.17, identity='io/netty/util/concurrent/DefaultThreadFactory$DefaultRunnableDecorator.run
depth=0, score=84.45, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'byte[]'
depth=14, score=0.44, identity='byte[]
depth=13, score=0.7, identity='java/lang/StringCoding$StringEncoder.encode
depth=12, score=0.7, identity='java/lang/StringCoding.encode
depth=11, score=0.7, identity='java/lang/StringCoding.encode
depth=10, score=0.7, identity='java/lang/String.getBytes
depth=9, score=0.7, identity='ch/qos/logback/core/encoder/LayoutWrappingEncoder.convertToBytes
depth=8, score=1.84, identity='ch/qos/logback/core/encoder/LayoutWrappingEncoder.doEncode
depth=7, score=1.84, identity='ch/qos/logback/core/OutputStreamAppender.writeOut
depth=6, score=1.84, identity='ch/qos/logback/core/FileAppender.writeOut
depth=5, score=1.84, identity='ch/qos/logback/core/OutputStreamAppender.subAppend
depth=4, score=1.84, identity='ch/qos/logback/core/rolling/RollingFileAppender.subAppend
depth=3, score=1.84, identity='ch/qos/logback/core/OutputStreamAppender.append
depth=2, score=1.9, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=1, score=1.9, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=0, score=1.93, identity='ch/qos/logback/core/AsyncAppenderBase$Worker.run

=== Top 3 Call Stack Of 'byte[]'
depth=62, score=0.34, identity='byte[]
depth=61, score=0.53, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=60, score=0.53, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=59, score=0.53, identity='org/apache/commons/codec/binary/Base64.encode
depth=58, score=0.59, identity='org/apache/commons/codec/binary/BaseNCodec.encode
depth=57, score=0.59, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=56, score=0.59, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=55, score=0.59, identity='org/apache/commons/codec/binary/Base64.encodeBase64
depth=54, score=0.63, identity='org/apache/commons/codec/binary/Base64.encodeBase64String
depth=53, score=1.06, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=52, score=1.14, identity='xxx/commons/service/client/filter/client/impl/ClientLogFilter.doFilter
depth=51, score=1.14, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=50, score=1.35, identity='xxx/commons/service/client/filter/client/impl/ClientCATFilter.doFilter
depth=49, score=1.35, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=48, score=1.35, identity='xxx/commons/service/client/filter/client/impl/ClientContextFilter.doFilter
depth=47, score=1.35, identity='xxx/commons/service/client/dubbo/protocol/DubboClientFilterChain.doFilter
depth=46, score=1.35, identity='xxx/commons/service/client/dubbo/protocol/LzDubboProtocol$4.invoke
depth=45, score=1.35, identity='com/alibaba/dubbo/rpc/listener/ListenerInvokerWrapper.invoke
depth=44, score=1.35, identity='com/alibaba/dubbo/rpc/protocol/InvokerWrapper.invoke
depth=43, score=1.37, identity='com/alibaba/dubbo/rpc/cluster/support/FailoverClusterInvoker.doInvoke
depth=42, score=1.4, identity='com/alibaba/dubbo/rpc/cluster/support/AbstractClusterInvoker.invoke
depth=41, score=1.4, identity='com/alibaba/dubbo/rpc/cluster/support/wrapper/MockClusterInvoker.invoke
depth=40, score=2.58, identity='xxx/commons/service/client/dubbo/proxy/LzDubboConsumerInvokerInvocationHandler.invoke
depth=39, score=2.58, identity='com/alibaba/dubbo/common/bytecode/proxy73.isUserInGroup
depth=38, score=2.58, identity='sun/reflect/GeneratedMethodAccessor234.invoke
depth=37, score=2.58, identity='sun/reflect/DelegatingMethodAccessorImpl.invoke
depth=36, score=2.58, identity='java/lang/reflect/Method.invoke
depth=35, score=2.67, identity='xxx/commons/service/client/dubbo/serviceclient/facade/InvokeMethodInterceptor.intercept
depth=34, score=2.69, identity='xxx/usergroup/api/UserGroupService$$EnhancerByCGLIB$$240102b2.isUserInGroup
depth=33, score=2.69, identity='xxx/amusement/task/manager/userlimit/UserGroupManager.doIsUserInGroup
depth=32, score=2.69, identity='xxx/amusement/task/manager/userlimit/UserGroupManager$1.load
depth=31, score=2.69, identity='xxx/amusement/task/manager/userlimit/UserGroupManager$1.load
depth=30, score=2.69, identity='com/google/common/cache/LocalCache$LoadingValueReference.loadFuture
depth=29, score=2.69, identity='com/google/common/cache/LocalCache$Segment.loadSync
depth=28, score=2.75, identity='com/google/common/cache/LocalCache$Segment.lockedGetOrLoad
depth=27, score=2.75, identity='com/google/common/cache/LocalCache$Segment.get
depth=26, score=2.75, identity='com/google/common/cache/LocalCache.get
depth=25, score=2.75, identity='com/google/common/cache/LocalCache.getOrLoad
depth=24, score=2.75, identity='com/google/common/cache/LocalCache$LocalLoadingCache.get
depth=23, score=2.75, identity='com/google/common/cache/LocalCache$LocalLoadingCache.getUnchecked
depth=22, score=2.83, identity='xxx/amusement/task/manager/userlimit/UserGroupManager.isUserInGroup
depth=21, score=2.83, identity='xxx/amusement/task/manager/userlimit/handler/GroupUserLimitHandler.isInLimit
depth=20, score=2.9, identity='xxx/amusement/task/manager/userlimit/handler/BaseUserLimitHandler.isPass
depth=19, score=3.09, identity='xxx/amusement/task/manager/userlimit/UserLimitManager.isPassUserLimit
depth=18, score=3.15, identity='xxx/amusement/task/manager/userlimit/UserLimitManager.isPassTaskUserLimit
depth=17, score=3.15, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.isTaskUser
depth=16, score=3.17, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.preTaskCheck
depth=15, score=3.26, identity='xxx/amusement/task/manager/task/DefaultConditionTaskHandler.doProcess
depth=14, score=3.26, identity='xxx/amusement/task/manager/task/DefaultConditionTaskHandler.doProcess
depth=13, score=3.26, identity='xxx/amusement/task/manager/task/AbstractTaskHandler.process
depth=12, score=3.26, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionProcess
depth=11, score=3.26, identity='xxx/amusement/task/engine/BaseTaskEngine.taskProcessEntrance
depth=10, score=6.53, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=9, score=6.53, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=8, score=6.53, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=7, score=6.53, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=6, score=6.53, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=5, score=28.3, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=4, score=28.3, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=3, score=49.45, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.45, identity='java/lang/Thread.run
```

缓存命中率已经超过**70%**，并且score只有**0.34**，进一步提高缓存命中率，预期提升并不大

##### java.lang.Object[]

```
=== Top 1 Call Stack Of 'java.lang.Object[]'
depth=14, score=1.52, identity='java.lang.Object[]
depth=13, score=1.52, identity='java/util/Arrays.copyOf
depth=12, score=1.52, identity='java/util/ArrayList.grow
depth=11, score=1.52, identity='java/util/ArrayList.ensureExplicitCapacity
depth=10, score=1.52, identity='java/util/ArrayList.ensureCapacityInternal
depth=9, score=1.69, identity='java/util/ArrayList.addAll
depth=8, score=1.69, identity='org/apache/kafka/clients/NetworkClient.handleAbortedSends
depth=7, score=6.24, identity='org/apache/kafka/clients/NetworkClient.poll
depth=6, score=7.08, identity='org/apache/kafka/clients/consumer/internals/ConsumerNetworkClient.poll
depth=5, score=19.06, identity='org/apache/kafka/clients/consumer/KafkaConsumer.pollOnce
depth=4, score=19.25, identity='org/apache/kafka/clients/consumer/KafkaConsumer.poll
depth=3, score=20.85, identity='xxx/commons/queue/service/Consumer$MsgRunner.run
depth=2, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=75.74, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=84.45, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'java.lang.Object[]'
depth=10, score=1.48, identity='java.lang.Object[]
depth=9, score=1.52, identity='java/util/Arrays.copyOf
depth=8, score=1.52, identity='java/util/ArrayList.grow
depth=7, score=1.52, identity='java/util/ArrayList.ensureExplicitCapacity
depth=6, score=1.52, identity='java/util/ArrayList.ensureCapacityInternal
depth=5, score=1.93, identity='java/util/ArrayList.addAll
depth=4, score=1.93, identity='org/apache/kafka/clients/NetworkClient.handleAbortedSends
depth=3, score=8.86, identity='org/apache/kafka/clients/NetworkClient.poll
depth=2, score=10.74, identity='org/apache/kafka/clients/consumer/internals/ConsumerNetworkClient.poll
depth=1, score=10.74, identity='org/apache/kafka/clients/consumer/internals/ConsumerNetworkClient.pollNoWakeup
depth=0, score=11.12, identity='org/apache/kafka/clients/consumer/internals/AbstractCoordinator$HeartbeatThread.run
```

org.apache.kafka.clients.NetworkClient@**kafka-clients-0.10.2.1**

```java
private final List<ClientResponse> abortedSends = new LinkedList<>();

private void handleAbortedSends(List<ClientResponse> responses) {
  responses.addAll(abortedSends);
  abortedSends.clear();
}
```

java.util.ArrayList：当responses和abortedSends都为空时，addAll会触发扩容，但abortedSends为空时是没必要执行addAll的

```java
public boolean addAll(Collection<? extends E> c) {
  Object[] a = c.toArray();
  int numNew = a.length;
  ensureCapacityInternal(size + numNew);  // Increments modCount
  System.arraycopy(a, 0, elementData, size, numNew);
  size += numNew;
  return numNew != 0;
}

private static int calculateCapacity(Object[] elementData, int minCapacity) {
  if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
    return Math.max(DEFAULT_CAPACITY, minCapacity);
  }
  return minCapacity;
}

private void ensureCapacityInternal(int minCapacity) {
  ensureExplicitCapacity(calculateCapacity(elementData, minCapacity));
}

private void ensureExplicitCapacity(int minCapacity) {
  modCount++;

  // overflow-conscious code
  if (minCapacity - elementData.length > 0)
    grow(minCapacity);
}

private void grow(int minCapacity) {
  // overflow-conscious code
  int oldCapacity = elementData.length;
  int newCapacity = oldCapacity + (oldCapacity >> 1);
  if (newCapacity - minCapacity < 0)
    newCapacity = minCapacity;
  if (newCapacity - MAX_ARRAY_SIZE > 0)
    newCapacity = hugeCapacity(minCapacity);
  // minCapacity is usually close to size, so this is a win:
  elementData = Arrays.copyOf(elementData, newCapacity);
}
```

## 升级Kafka-Client

### 动作

经查看源码，**kafka-clients-0.11.0.3**已经Fix了上述问题

![image-20210107193031947](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/4_kafka_client/image-20210107193031947.png)

### 效果

#### 内存分配

![image-20210107193350517](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/4_kafka_client/image-20210107193350517.png)

| 指标                             | 新值       | 旧值   | 提升（%） |
| -------------------------------- | ---------- | ------ | --------- |
| 堆内存分配-峰值速率（MB/s）      | 28.6       | 40.3   | 140.9     |
| 堆内存分配-平均速率（MB/s）      | 22.2       | 32.6   | 146.8     |
| java.lang.Object[]分配总量（GB） | 1.17       | 1.8    | **153.8** |
| 分配最多的类型                   | **char[]** | char[] |           |
| 分配最多的类型的占比（%）        | 26.4       | 16.5   |           |

#### 调用堆栈

##### char[]

```
=== Top 1 Call Stack Of 'char[]'
depth=22, score=1.44, identity='char[]
depth=21, score=1.75, identity='java/util/Arrays.copyOf
depth=20, score=1.75, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=19, score=1.75, identity='java/lang/AbstractStringBuilder.append
depth=18, score=1.75, identity='java/lang/StringBuilder.append
depth=17, score=7.14, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=7.14, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=7.14, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=7.14, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=7.14, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=7.14, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=7.14, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=7.14, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=7.14, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=7.14, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=7.14, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=7.18, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=7.18, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=7.18, identity='ch/qos/logback/classic/Logger.info
depth=3, score=51.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=79.1, identity='java/lang/Thread.run
```

##### byte[]

```
=== Top 1 Call Stack Of 'byte[]'
depth=26, score=0.34, identity='byte[]
depth=25, score=0.4, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=24, score=0.4, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=23, score=0.4, identity='org/apache/commons/codec/binary/Base64.decode
depth=22, score=0.5, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=21, score=0.7, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=20, score=0.7, identity='org/apache/commons/codec/binary/Base64.decodeBase64
depth=19, score=0.76, identity='xxx/commons/service/client/dubbo/codec/LzDubboCodec.encodeRequestData
depth=18, score=1.2, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encodeRequest
depth=17, score=1.2, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encode
depth=16, score=1.2, identity='xxx/commons/service/client/dubbo/transport/LzDubboCodecAdapter$InternalEncoder.encode
depth=15, score=1.2, identity='io/netty/handler/codec/MessageToByteEncoder.write
depth=14, score=1.2, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=13, score=1.2, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=12, score=1.2, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=11, score=1.2, identity='io/netty/channel/ChannelDuplexHandler.write
depth=10, score=1.22, identity='com/alibaba/dubbo/remoting/transport/netty4/NettyClientHandler.write
depth=9, score=1.48, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=8, score=1.48, identity='io/netty/channel/AbstractChannelHandlerContext.access$1900
depth=7, score=1.48, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.write
depth=6, score=1.48, identity='io/netty/channel/AbstractChannelHandlerContext$WriteAndFlushTask.write
depth=5, score=1.48, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.run
depth=4, score=1.73, identity='io/netty/util/concurrent/SingleThreadEventExecutor.runAllTasks
depth=3, score=2.89, identity='io/netty/channel/nio/NioEventLoop.run
depth=2, score=2.89, identity='io/netty/util/concurrent/SingleThreadEventExecutor$2.run
depth=1, score=2.89, identity='io/netty/util/concurrent/DefaultThreadFactory$DefaultRunnableDecorator.run
depth=0, score=79.1, identity='java/lang/Thread.run
```

##### java.lang.Object[]

```
=== Top 1 Call Stack Of 'java.lang.Object[]'
depth=42, score=0.32, identity='java.lang.Object[]
depth=41, score=0.32, identity='java/util/Arrays.copyOf
depth=40, score=0.32, identity='java/util/ArrayList.grow
depth=39, score=0.32, identity='java/util/ArrayList.ensureExplicitCapacity
depth=38, score=0.32, identity='java/util/ArrayList.ensureCapacityInternal
depth=37, score=0.32, identity='java/util/ArrayList.add
depth=36, score=0.52, identity='xyz/morphia/mapping/MappedField.getLoadNames
depth=35, score=0.52, identity='xyz/morphia/mapping/MappedField.getFirstFieldName
depth=34, score=0.52, identity='xyz/morphia/mapping/MappedField.getDbObjectValue
depth=33, score=0.52, identity='xyz/morphia/converters/Converters.fromDBObject
depth=32, score=0.52, identity='xyz/morphia/mapping/ValueMapper.fromDBObject
depth=31, score=0.84, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=30, score=0.86, identity='xyz/morphia/mapping/Mapper.fromDb
depth=29, score=0.9, identity='xyz/morphia/mapping/EmbeddedMapper.readMapOrCollectionOrEntity
depth=28, score=1.04, identity='xyz/morphia/mapping/EmbeddedMapper.readCollection
depth=27, score=1.22, identity='xyz/morphia/mapping/EmbeddedMapper.fromDBObject
depth=26, score=2.95, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=25, score=3.03, identity='xyz/morphia/mapping/Mapper.fromDb
depth=24, score=3.09, identity='xyz/morphia/mapping/Mapper.fromDBObject
depth=23, score=3.09, identity='xyz/morphia/query/MorphiaIterator.convertItem
depth=22, score=3.09, identity='xyz/morphia/query/MorphiaIterator.processItem
depth=21, score=3.09, identity='xyz/morphia/query/MorphiaIterator.next
depth=20, score=6.78, identity='xyz/morphia/query/QueryImpl.asList
depth=19, score=6.78, identity='xyz/morphia/query/QueryImpl.asList
depth=18, score=6.9, identity='xxx/amusement/task/manager/task/TaskInfoManager.getTasksByType
depth=17, score=7.38, identity='xxx/amusement/task/engine/BaseTaskEngine.getTasksByTypeWithCache
depth=16, score=7.42, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=15, score=8.37, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=14, score=8.53, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=13, score=8.53, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=12, score=8.53, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=11, score=8.53, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=10, score=9.37, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=9, score=9.37, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=8, score=10.51, identity='xxx/amusement/task/utils/IdempotentUtil.idempotentHandler
depth=7, score=10.51, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.idempotentCore
depth=6, score=10.67, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.msgReceivedEntrance
depth=5, score=10.67, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$1.msgReceived
depth=4, score=44.09, identity='xxx/commons/queue/callback/MsgFutureWrapper.msgReceived
depth=3, score=51.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=79.1, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'java.lang.Object[]'
depth=33, score=0.16, identity='java.lang.Object[]
depth=32, score=0.16, identity='java/util/Arrays.copyOf
depth=31, score=0.16, identity='java/util/ArrayList.grow
depth=30, score=0.16, identity='java/util/ArrayList.ensureExplicitCapacity
depth=29, score=0.16, identity='java/util/ArrayList.ensureCapacityInternal
depth=28, score=0.16, identity='java/util/ArrayList.add
depth=27, score=0.24, identity='xyz/morphia/mapping/MappedField.getLoadNames
depth=26, score=0.24, identity='xyz/morphia/mapping/MappedField.getFirstFieldName
depth=25, score=0.24, identity='xyz/morphia/mapping/MappedField.getDbObjectValue
depth=24, score=0.24, identity='xyz/morphia/converters/Converters.fromDBObject
depth=23, score=0.24, identity='xyz/morphia/mapping/ValueMapper.fromDBObject
depth=22, score=1.28, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=21, score=1.32, identity='xyz/morphia/mapping/Mapper.fromDb
depth=20, score=1.32, identity='xyz/morphia/mapping/Mapper.fromDBObject
depth=19, score=1.32, identity='xyz/morphia/query/MorphiaIterator.convertItem
depth=18, score=1.32, identity='xyz/morphia/query/MorphiaIterator.processItem
depth=17, score=1.32, identity='xyz/morphia/query/MorphiaIterator.next
depth=16, score=2.85, identity='xyz/morphia/query/QueryImpl.asList
depth=15, score=2.85, identity='xyz/morphia/query/QueryImpl.asList
depth=14, score=2.89, identity='xxx/amusement/task/manager/task/TaskInfoManager.getTasksByType
depth=13, score=2.89, identity='xxx/amusement/task/engine/BaseTaskEngine.getTasksByTypeWithCache
depth=12, score=2.89, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=11, score=3.01, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=10, score=3.01, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=9, score=3.01, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=8, score=3.01, identity='xxx/amusement/task/kafka/consumer/CommentCountProcessor.msgReceived0
depth=7, score=3.01, identity='xxx/amusement/task/kafka/consumer/CommentCountProcessor.msgReceived0
depth=6, score=31.47, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=5, score=31.47, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=4, score=44.09, identity='xxx/commons/queue/callback/MsgFutureWrapper.msgReceived
depth=3, score=51.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=79.1, identity='java/lang/Thread.run

=== Top 3 Call Stack Of 'java.lang.Object[]'
depth=38, score=0.12, identity='java.lang.Object[]
depth=37, score=0.12, identity='java/util/Arrays.copyOf
depth=36, score=0.12, identity='java/util/ArrayList.grow
depth=35, score=0.12, identity='java/util/ArrayList.ensureExplicitCapacity
depth=34, score=0.12, identity='java/util/ArrayList.ensureCapacityInternal
depth=33, score=0.12, identity='java/util/ArrayList.add
depth=32, score=0.14, identity='xyz/morphia/mapping/MappedField.getLoadNames
depth=31, score=0.14, identity='xyz/morphia/mapping/MappedField.getFirstFieldName
depth=30, score=0.14, identity='xyz/morphia/mapping/MappedField.getDbObjectValue
depth=29, score=0.14, identity='xyz/morphia/converters/Converters.fromDBObject
depth=28, score=0.14, identity='xyz/morphia/mapping/ValueMapper.fromDBObject
depth=27, score=0.4, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=26, score=0.42, identity='xyz/morphia/mapping/Mapper.fromDb
depth=25, score=0.46, identity='xyz/morphia/mapping/EmbeddedMapper.readMapOrCollectionOrEntity
depth=24, score=0.54, identity='xyz/morphia/mapping/EmbeddedMapper.readCollection
depth=23, score=0.68, identity='xyz/morphia/mapping/EmbeddedMapper.fromDBObject
depth=22, score=1.2, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=21, score=1.26, identity='xyz/morphia/mapping/Mapper.fromDb
depth=20, score=1.28, identity='xyz/morphia/mapping/Mapper.fromDBObject
depth=19, score=1.28, identity='xyz/morphia/query/MorphiaIterator.convertItem
depth=18, score=1.28, identity='xyz/morphia/query/MorphiaIterator.processItem
depth=17, score=1.28, identity='xyz/morphia/query/MorphiaIterator.next
depth=16, score=3.31, identity='xyz/morphia/query/QueryImpl.asList
depth=15, score=3.31, identity='xyz/morphia/query/QueryImpl.asList
depth=14, score=3.31, identity='xxx/amusement/task/manager/task/TaskInfoManager.getTasksByType
depth=13, score=3.53, identity='xxx/amusement/task/engine/BaseTaskEngine.getTasksByTypeWithCache
depth=12, score=3.55, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=11, score=5.82, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=10, score=5.82, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=9, score=5.82, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=8, score=5.82, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=7, score=5.82, identity='xxx/amusement/task/kafka/consumer/ActiveUserProcessor.msgReceived0
depth=6, score=31.47, identity='xxx/amusement/task/kafka/consumer/BaseProcessor.msgReceivedEntrance
depth=5, score=31.47, identity='xxx/amusement/task/kafka/consumer/Consumers$1.msgReceived
depth=4, score=44.09, identity='xxx/commons/queue/callback/MsgFutureWrapper.msgReceived
depth=3, score=51.35, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=72.22, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=79.1, identity='java/lang/Thread.run
```

xyz.morphia.mapping.MappedField@**core-1.4.0**：空的ArrayList执行add操作必定会扩容

![image-20210107195131013](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/4_kafka_client/image-20210107195131013.png)

## 优化morphia

### Maven

#### 动作

下载源码

```bash
$ git clone https://github.com/MorphiaOrg/morphia --depth=1 --branch=r1.4.0
```

修改源码，代码托管到GitLab：[morphia](https://gitlab.xxx/yyy/morphia)

```java
/**
  * @return the name of the field's (key)name for mongodb, in order of loading.
  */
public List<String> getLoadNames() {
  final List<String> names = new ArrayList<String>(1);
  names.add(getMappedFieldName());

  final AlsoLoad al = (AlsoLoad) foundAnnotations.get(AlsoLoad.class);
  if (al != null && al.value() != null && al.value().length > 0) {
    names.addAll(asList(al.value()));
  }

  return names;
}
```

发布到Maven私服

![image-20210107200020863](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/maven/image-20210107200020863.png)

#### 效果

##### 内存分配

![image-20210107200215538](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/maven/image-20210107200215538.png)

堆内存总分配速率稍有提高，但java.lang.Object[]分配总量却是下降的，说明继续调优的**性价比不高**（调优的效果类似于**长尾**）

| 指标                             | 新值       | 旧值   | 提升（%） | 备注                 |
| -------------------------------- | ---------- | ------ | --------- | -------------------- |
| 堆内存分配-峰值速率（MB/s）      | 31.3       | 28.6   | 91.4      | 服务负载是动态变化的 |
| 堆内存分配-平均速率（MB/s）      | 23.7       | 22.2   | 93.7      |                      |
| java.lang.Object[]分配总量（GB） | 0.88       | 1.17   | **133.0** |                      |
| 分配最多的类型                   | **char[]** | char[] |           |                      |
| 分配最多的类型的占比（%）        | 26.8       | 26.4   |           |                      |

### Java Agent

Java Agent只在预发部署，代码托管到GitLab：[xxx-java-agent](https://gitlab.xxx/yyy/xxx-java-agent)

#### premain

![image-20210107204418807](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/java_agent/premain/image-20210107204418807.png)

![image-20210107204328300](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/java_agent/premain/image-20210107204328300.png)

##### ASM

ASM Bytecode Outline

![image-20210107202815644](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/java_agent/premain/image-20210107202815644.png)

###### 替换整个方法体

xxx.asm.method.AsmCodeMethodVisitor

```java
public class AsmCodeMethodVisitor extends MethodVisitor implements Opcodes {

    private final MethodVisitor target;

    public AsmCodeMethodVisitor(MethodVisitor mv) {
        super(ASM7, null);
        this.target = mv;
    }

    @Override
    public void visitCode() {
        // From ASM Bytecode Outline

        // ClassWriter cw = new ClassWriter(0);
        // target = cw.visitMethod(ACC_PUBLIC, "getLoadNames", "()Ljava/util/List;", "()Ljava/util/List<Ljava/lang/String;>;", null);
        // target.visitCode();
        Label l0 = new Label();
        target.visitLabel(l0);
        target.visitLineNumber(280, l0);
        target.visitTypeInsn(NEW, "java/util/ArrayList");
        target.visitInsn(DUP);
        target.visitInsn(ICONST_1);
        target.visitMethodInsn(INVOKESPECIAL, "java/util/ArrayList", "<init>", "(I)V", false);
        target.visitVarInsn(ASTORE, 1);
        Label l1 = new Label();
        target.visitLabel(l1);
        target.visitLineNumber(281, l1);
        target.visitVarInsn(ALOAD, 1);
        target.visitVarInsn(ALOAD, 0);
        target.visitMethodInsn(INVOKEVIRTUAL, "xyz/morphia/mapping/MappedField", "getMappedFieldName", "()Ljava/lang/String;", false);
        target.visitMethodInsn(INVOKEINTERFACE, "java/util/List", "add", "(Ljava/lang/Object;)Z", true);
        target.visitInsn(POP);
        Label l2 = new Label();
        target.visitLabel(l2);
        target.visitLineNumber(283, l2);
        target.visitVarInsn(ALOAD, 0);
        target.visitFieldInsn(GETFIELD, "xyz/morphia/mapping/MappedField", "foundAnnotations", "Ljava/util/Map;");
        target.visitLdcInsn(Type.getType("Lxyz/morphia/annotations/AlsoLoad;"));
        target.visitMethodInsn(INVOKEINTERFACE, "java/util/Map", "get", "(Ljava/lang/Object;)Ljava/lang/Object;", true);
        target.visitTypeInsn(CHECKCAST, "xyz/morphia/annotations/AlsoLoad");
        target.visitVarInsn(ASTORE, 2);
        Label l3 = new Label();
        target.visitLabel(l3);
        target.visitLineNumber(284, l3);
        target.visitVarInsn(ALOAD, 2);
        Label l4 = new Label();
        target.visitJumpInsn(IFNULL, l4);
        target.visitVarInsn(ALOAD, 2);
        target.visitMethodInsn(INVOKEINTERFACE, "xyz/morphia/annotations/AlsoLoad", "value", "()[Ljava/lang/String;", true);
        target.visitJumpInsn(IFNULL, l4);
        target.visitVarInsn(ALOAD, 2);
        target.visitMethodInsn(INVOKEINTERFACE, "xyz/morphia/annotations/AlsoLoad", "value", "()[Ljava/lang/String;", true);
        target.visitInsn(ARRAYLENGTH);
        target.visitJumpInsn(IFLE, l4);
        Label l5 = new Label();
        target.visitLabel(l5);
        target.visitLineNumber(285, l5);
        target.visitVarInsn(ALOAD, 1);
        target.visitVarInsn(ALOAD, 2);
        target.visitMethodInsn(INVOKEINTERFACE, "xyz/morphia/annotations/AlsoLoad", "value", "()[Ljava/lang/String;", true);
        target.visitMethodInsn(INVOKESTATIC, "java/util/Arrays", "asList", "([Ljava/lang/Object;)Ljava/util/List;", false);
        target.visitMethodInsn(INVOKEINTERFACE, "java/util/List", "addAll", "(Ljava/util/Collection;)Z", true);
        target.visitInsn(POP);
        target.visitLabel(l4);
        target.visitLineNumber(288, l4);
        target.visitFrame(Opcodes.F_APPEND, 2, new Object[]{"java/util/List", "xyz/morphia/annotations/AlsoLoad"}, 0, null);
        target.visitVarInsn(ALOAD, 1);
        target.visitInsn(ARETURN);
        Label l6 = new Label();
        target.visitLabel(l6);
        target.visitLocalVariable("this", "Lxyz/morphia/mapping/MappedField;", null, l0, l6, 0);
        target.visitLocalVariable("names", "Ljava/util/List;", "Ljava/util/List<Ljava/lang/String;>;", l1, l6, 1);
        target.visitLocalVariable("al", "Lxyz/morphia/annotations/AlsoLoad;", null, l3, l6, 2);
        target.visitMaxs(3, 3);
        target.visitEnd();
    }
}
```

###### 替换差异的字节码指令

字节码差异

![image-20210107205753300](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/java_agent/premain/image-20210107205753300.png)

ASM代码差异

```bash
$ diff origin.txt optimized.txt
670c670,671
<             mv.visitMethodInsn(INVOKESPECIAL, "java/util/ArrayList", "<init>", "()V", false);
---
>             mv.visitInsn(ICONST_1);
>             mv.visitMethodInsn(INVOKESPECIAL, "java/util/ArrayList", "<init>", "(I)V", false);
721c722
<             mv.visitMaxs(2, 3);
---
>             mv.visitMaxs(3, 3);

```

xxx.asm.method.AsmDiffMethodVisitor

```java
public class AsmDiffMethodVisitor extends MethodVisitor implements Opcodes {

    public AsmDiffMethodVisitor(MethodVisitor mv) {
        super(ASM7, mv);
    }

    @Override
    public void visitMethodInsn(int opcode, String owner, String name, String descriptor, boolean isInterface) {
        if (opcode == INVOKESPECIAL && "java/util/ArrayList".equals(owner) && "<init>".equals(name) && "()V".equals(descriptor) && !isInterface) {
            mv.visitInsn(ICONST_1);
            mv.visitMethodInsn(INVOKESPECIAL, "java/util/ArrayList", "<init>", "(I)V", false);
        } else {
            mv.visitMethodInsn(opcode, owner, name, descriptor, isInterface);
        }
    }

    @Override
    public void visitMaxs(int maxStack, int maxLocals) {
        if (maxStack == 2 && maxLocals == 3) {
            mv.visitMaxs(3, 3);
        } else {
            mv.visitMaxs(maxStack, maxLocals);
        }
    }
}
```

##### Javassist

xxx.javassist.JavassistAgent

```java
public class JavassistAgent {

    private static final String CLASS_NAME = "xyz/morphia/mapping/MappedField";
    private static final String CLASS_LONG_NAME = CLASS_NAME.replaceAll("/", ".");
    private static final String CLASS_SIMPLE_NAME = CLASS_NAME.substring(CLASS_NAME.lastIndexOf("/"));
    private static final String METHOD_NAME = "getLoadNames";

    // Javassist编译规范
    //  1. 范型符号需要特殊处理（/*...*/）
    //  2. 引用的外部类需要显式声明包路径
    private static final String METHOD_BODY = "{\n" +
            "        final java.util.List/*<String>*/ names = new java.util.ArrayList/*<String>*/(1);\n" +
            "        names.add(getMappedFieldName());\n" +
            "\n" +
            "        final xyz.morphia.annotations.AlsoLoad al = (xyz.morphia.annotations.AlsoLoad) foundAnnotations.get(xyz.morphia.annotations.AlsoLoad.class);\n" +
            "        if (al != null && al.value() != null && al.value().length > 0) {\n" +
            "            names.addAll(java.util.Arrays.asList(al.value()));\n" +
            "        }\n" +
            "\n" +
            "        return names;\n" +
            "    }";

    public static void premain(String agentArgs, Instrumentation inst) {
        inst.addTransformer((loader, className, classBeingRedefined, protectionDomain, classfileBuffer) -> {
                    if (!CLASS_NAME.equals(className)) {
                        return classfileBuffer;
                    }

                    System.out.printf("try to transform [%s] ...\n", CLASS_NAME);

                    byte[] bytes;
                    try {
                        bytes = toBytecode();
                    } catch (NotFoundException | CannotCompileException | IOException e) {
                        e.printStackTrace();
                        return classfileBuffer;
                    }

                    if (Boolean.parseBoolean(System.getProperty("export", Boolean.FALSE.toString()))) {
                        try (FileOutputStream fos = new FileOutputStream(String.format("/tmp/%s.class", CLASS_SIMPLE_NAME))) {
                            fos.write(bytes);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }

                    System.out.printf("transform [%s] successfully !!\n", CLASS_NAME);
                    return bytes;
                }
        );
    }

    private static byte[] toBytecode() throws NotFoundException, CannotCompileException, IOException {
        ClassPool classPool = ClassPool.getDefault();
        CtClass ctClass = classPool.get(CLASS_LONG_NAME);
        CtMethod ctMethod = ctClass.getDeclaredMethod(METHOD_NAME);
        ctMethod.setBody(METHOD_BODY);
        ctClass.detach();
        return ctClass.toBytecode();
    }
}
```

#### agenmain

xxx.javassist.retransform.JavassistReTransformAgent

```java
public class JavassistReTransformAgent {

    private static final String CLASS_NAME = "xyz/morphia/mapping/MappedField";
    private static final String CLASS_LONG_NAME = CLASS_NAME.replaceAll("/", ".");
    private static final String CLASS_SIMPLE_NAME = CLASS_NAME.substring(CLASS_NAME.lastIndexOf("/"));
    private static final String METHOD_NAME = "getLoadNames";

    // Javassist编译规范
    //  1. 范型符号需要特殊处理（/*...*/）
    //  2. 引用的外部类需要显式声明包路径
    private static final String METHOD_BODY = "{\n" +
            "        final java.util.List/*<String>*/ names = new java.util.ArrayList/*<String>*/(1);\n" +
            "        names.add(getMappedFieldName());\n" +
            "\n" +
            "        final xyz.morphia.annotations.AlsoLoad al = (xyz.morphia.annotations.AlsoLoad) foundAnnotations.get(xyz.morphia.annotations.AlsoLoad.class);\n" +
            "        if (al != null && al.value() != null && al.value().length > 0) {\n" +
            "            names.addAll(java.util.Arrays.asList(al.value()));\n" +
            "        }\n" +
            "\n" +
            "        return names;\n" +
            "    }";

    public static void agentmain(String agentArgs, Instrumentation inst) {
        inst.addTransformer((loader, className, classBeingRedefined, protectionDomain, classfileBuffer) -> {
                    if (!CLASS_NAME.equals(className)) {
                        return classfileBuffer;
                    }

                    System.out.printf("try to transform [%s] ...\n", CLASS_NAME);

                    byte[] bytes;
                    try {
                        bytes = toBytecode();
                    } catch (NotFoundException | CannotCompileException | IOException e) {
                        e.printStackTrace();
                        return classfileBuffer;
                    }

                    if (Boolean.parseBoolean(System.getProperty("export", Boolean.FALSE.toString()))) {
                        try (FileOutputStream fos = new FileOutputStream(String.format("/tmp/%s.class", CLASS_SIMPLE_NAME))) {
                            fos.write(bytes);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }

                    System.out.printf("transform [%s] successfully !!\n", CLASS_NAME);
                    return bytes;
                },
                true
        );

        try {
            inst.retransformClasses(MappedField.class);
        } catch (UnmodifiableClassException e) {
            e.printStackTrace();
        }
    }

    private static byte[] toBytecode() throws NotFoundException, CannotCompileException, IOException {
        ClassPool classPool = ClassPool.getDefault();
        CtClass ctClass = classPool.get(CLASS_LONG_NAME);
        CtMethod ctMethod = ctClass.getDeclaredMethod(METHOD_NAME);
        ctMethod.setBody(METHOD_BODY);
        ctClass.detach();
        return ctClass.toBytecode();
    }
}
```

xxx.javassist.retransform.attacher.Attacher

```java
public class Attacher {

    public static void main(String[] args) throws IOException, AttachNotSupportedException, AgentLoadException,
            AgentInitializationException, MonitorException, URISyntaxException {
        Optional<String> pidOpt = tryFindMatchProcess();
        Optional<String> agentOpt = tryFindAgent();
        System.out.printf("try to attach, pid=%s, agent=%s\n", pidOpt, agentOpt);
        if (pidOpt.isPresent() && agentOpt.isPresent()) {
            VirtualMachine virtualMachine = VirtualMachine.attach(pidOpt.get());
            virtualMachine.loadAgent(agentOpt.get());
        }
    }

    private static Optional<String> tryFindMatchProcess() throws MonitorException, URISyntaxException {
        String pid = System.getProperty("pid");
        if (pid != null) {
            return Optional.of(pid);
        }

        MonitoredHost host = MonitoredHost.getMonitoredHost("localhost");
        for (Integer processId : host.activeVms()) {
            MonitoredVm vm = host.getMonitoredVm(new VmIdentifier("//" + processId));
            String processName = MonitoredVmUtil.mainClass(vm, true);
            if (processName.contains(Attacher.class.getSimpleName())) {
                continue;
            }
            if (processName.contains("xxx")) {
                return Optional.of(String.valueOf(processId));
            }
        }

        return Optional.empty();
    }

    private static Optional<String> tryFindAgent() {
        return Optional.ofNullable(System.getProperty("agent"));
    }

}
```

![image-20210107214423258](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/5_morphia/java_agent/agentmain/image-20210107214423258.png)

# 性能快照

## 内存分配

**Top 3的内存分配之和**占比总内存分配为**49%**，且4th内存分配占比**Top 3的内存分配之和**为**7.7%**，因此调用堆栈关注Top 3即可

![image-20210107220708577](https://interview-1253868755.cos.ap-guangzhou.myqcloud.com/performance_tuning_task/effect/image-20210107220708577.png)

## 调用堆栈

注：下面数据的采样时间为7天

### char[]

记录每个Kafka消息的处理情况，需要保留

```
=== Top 1 Call Stack Of 'char[]'
depth=22, score=0.89, identity='char[]
depth=21, score=1.11, identity='java/util/Arrays.copyOf
depth=20, score=1.11, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=19, score=1.11, identity='java/lang/AbstractStringBuilder.append
depth=18, score=1.11, identity='java/lang/StringBuilder.append
depth=17, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=4.94, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=4.94, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=4.94, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=4.94, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=4.94, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=4.97, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=4.97, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=4.97, identity='ch/qos/logback/classic/Logger.info
depth=3, score=35.85, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'char[]'
depth=24, score=0.53, identity='char[]
depth=23, score=0.77, identity='java/util/Arrays.copyOf
depth=22, score=0.77, identity='java/lang/AbstractStringBuilder.ensureCapacityInternal
depth=21, score=0.77, identity='java/lang/AbstractStringBuilder.append
depth=20, score=0.77, identity='java/lang/StringBuilder.append
depth=19, score=2.84, identity='org/slf4j/helpers/MessageFormatter.safeObjectAppend
depth=18, score=2.84, identity='org/slf4j/helpers/MessageFormatter.deeplyAppendParameter
depth=17, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=4.94, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=4.94, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=4.94, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=4.94, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=4.94, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=4.97, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=4.97, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=4.97, identity='ch/qos/logback/classic/Logger.info
depth=3, score=35.85, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run

=== Top 3 Call Stack Of 'char[]'
depth=21, score=0.53, identity='char[]
depth=20, score=0.86, identity='java/util/Arrays.copyOfRange
depth=19, score=0.86, identity='java/lang/String.<init>
depth=18, score=0.87, identity='java/lang/StringBuilder.toString
depth=17, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=16, score=4.94, identity='org/slf4j/helpers/MessageFormatter.arrayFormat
depth=15, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.getFormattedMessage
depth=14, score=4.94, identity='ch/qos/logback/classic/spi/LoggingEvent.prepareForDeferredProcessing
depth=13, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=12, score=4.94, identity='ch/qos/logback/classic/AsyncAppender.preprocess
depth=11, score=4.94, identity='ch/qos/logback/core/AsyncAppenderBase.append
depth=10, score=4.94, identity='ch/qos/logback/core/UnsynchronizedAppenderBase.doAppend
depth=9, score=4.94, identity='ch/qos/logback/core/spi/AppenderAttachableImpl.appendLoopOnAppenders
depth=8, score=4.94, identity='ch/qos/logback/classic/Logger.appendLoopOnAppenders
depth=7, score=4.94, identity='ch/qos/logback/classic/Logger.callAppenders
depth=6, score=4.97, identity='ch/qos/logback/classic/Logger.buildLoggingEventAndAppend
depth=5, score=4.97, identity='ch/qos/logback/classic/Logger.filterAndLog_0_Or3Plus
depth=4, score=4.97, identity='ch/qos/logback/classic/Logger.info
depth=3, score=35.85, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run
```

### byte[]

服务调用相关

```
=== Top 1 Call Stack Of 'byte[]'
depth=15, score=0.67, identity='byte[]
depth=14, score=0.67, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=13, score=0.67, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=12, score=0.67, identity='org/apache/commons/codec/binary/Base64.decode
depth=11, score=0.67, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=10, score=0.68, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=9, score=0.68, identity='org/apache/commons/codec/binary/Base64.decodeBase64
depth=8, score=10.07, identity='xxx/commons/service/client/dubbo/protocol/LzDubboProtocol$3.invoke
depth=7, score=10.07, identity='com/alibaba/dubbo/rpc/protocol/dubbo/DubboProtocol$1.reply
depth=6, score=10.07, identity='xxx/commons/service/client/dubbo/exchanger/LzDubboExchangeHandler.handleRequest
depth=5, score=10.48, identity='xxx/commons/service/client/dubbo/exchanger/LzDubboExchangeHandler.received
depth=4, score=10.48, identity='com/alibaba/dubbo/remoting/transport/DecodeHandler.received
depth=3, score=10.48, identity='com/alibaba/dubbo/remoting/transport/dispatcher/ChannelEventRunnable.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'byte[]'
depth=26, score=0.33, identity='byte[]
depth=25, score=0.43, identity='org/apache/commons/codec/binary/BaseNCodec.resizeBuffer
depth=24, score=0.43, identity='org/apache/commons/codec/binary/BaseNCodec.ensureBufferSize
depth=23, score=0.43, identity='org/apache/commons/codec/binary/Base64.decode
depth=22, score=0.54, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=21, score=0.67, identity='org/apache/commons/codec/binary/BaseNCodec.decode
depth=20, score=0.68, identity='org/apache/commons/codec/binary/Base64.decodeBase64
depth=19, score=0.73, identity='xxx/commons/service/client/dubbo/codec/LzDubboCodec.encodeRequestData
depth=18, score=1.2, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encodeRequest
depth=17, score=1.2, identity='com/alibaba/dubbo/remoting/exchange/codec/ExchangeCodec.encode
depth=16, score=1.2, identity='xxx/commons/service/client/dubbo/transport/LzDubboCodecAdapter$InternalEncoder.encode
depth=15, score=1.22, identity='io/netty/handler/codec/MessageToByteEncoder.write
depth=14, score=1.22, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=13, score=1.22, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=12, score=1.22, identity='io/netty/channel/AbstractChannelHandlerContext.write
depth=11, score=1.22, identity='io/netty/channel/ChannelDuplexHandler.write
depth=10, score=1.24, identity='com/alibaba/dubbo/remoting/transport/netty4/NettyClientHandler.write
depth=9, score=1.82, identity='io/netty/channel/AbstractChannelHandlerContext.invokeWrite
depth=8, score=1.82, identity='io/netty/channel/AbstractChannelHandlerContext.access$1900
depth=7, score=1.82, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.write
depth=6, score=1.82, identity='io/netty/channel/AbstractChannelHandlerContext$WriteAndFlushTask.write
depth=5, score=1.82, identity='io/netty/channel/AbstractChannelHandlerContext$AbstractWriteTask.run
depth=4, score=2.05, identity='io/netty/util/concurrent/SingleThreadEventExecutor.runAllTasks
depth=3, score=3.46, identity='io/netty/channel/nio/NioEventLoop.run
depth=2, score=3.46, identity='io/netty/util/concurrent/SingleThreadEventExecutor$2.run
depth=1, score=3.46, identity='io/netty/util/concurrent/DefaultThreadFactory$DefaultRunnableDecorator.run
depth=0, score=71.89, identity='java/lang/Thread.run
```

### java.lang.Object[]

MongoDB工具类：ArrayList实例化，但score很小

```
=== Top 1 Call Stack Of 'java.lang.Object[]'
depth=38, score=0.08, identity='java.lang.Object[]
depth=37, score=0.08, identity='java/util/ArrayList.<init>
depth=36, score=0.15, identity='xyz/morphia/mapping/MappedField.getLoadNames
depth=35, score=0.15, identity='xyz/morphia/mapping/MappedField.getFirstFieldName
depth=34, score=0.15, identity='xyz/morphia/mapping/MappedField.getDbObjectValue
depth=33, score=0.15, identity='xyz/morphia/converters/Converters.fromDBObject
depth=32, score=0.15, identity='xyz/morphia/mapping/ValueMapper.fromDBObject
depth=31, score=0.35, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=30, score=0.35, identity='xyz/morphia/mapping/Mapper.fromDb
depth=29, score=0.45, identity='xyz/morphia/mapping/EmbeddedMapper.readMapOrCollectionOrEntity
depth=28, score=0.56, identity='xyz/morphia/mapping/EmbeddedMapper.readCollection
depth=27, score=0.66, identity='xyz/morphia/mapping/EmbeddedMapper.fromDBObject
depth=26, score=1.94, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=25, score=1.98, identity='xyz/morphia/mapping/Mapper.fromDb
depth=24, score=2.03, identity='xyz/morphia/mapping/Mapper.fromDBObject
depth=23, score=2.03, identity='xyz/morphia/query/MorphiaIterator.convertItem
depth=22, score=2.03, identity='xyz/morphia/query/MorphiaIterator.processItem
depth=21, score=2.03, identity='xyz/morphia/query/MorphiaIterator.next
depth=20, score=5.16, identity='xyz/morphia/query/QueryImpl.asList
depth=19, score=5.16, identity='xyz/morphia/query/QueryImpl.asList
depth=18, score=5.32, identity='xxx/amusement/task/manager/task/TaskInfoManager.getTasksByType
depth=17, score=5.75, identity='xxx/amusement/task/engine/BaseTaskEngine.getTasksByTypeWithCache
depth=16, score=5.78, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=15, score=6.38, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=14, score=6.46, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=13, score=6.46, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=12, score=6.46, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=11, score=6.46, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=10, score=7.46, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=9, score=7.46, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=8, score=8.77, identity='xxx/amusement/task/utils/IdempotentUtil.idempotentHandler
depth=7, score=8.78, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.idempotentCore
depth=6, score=9.07, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.msgReceivedEntrance
depth=5, score=9.07, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$1.msgReceived
depth=4, score=30.87, identity='xxx/commons/queue/callback/MsgFutureWrapper.msgReceived
depth=3, score=35.85, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run

=== Top 2 Call Stack Of 'java.lang.Object[]'
depth=33, score=0.08, identity='java.lang.Object[]
depth=32, score=0.08, identity='java/util/ArrayList.<init>
depth=31, score=0.16, identity='xyz/morphia/mapping/MappedField.getLoadNames
depth=30, score=0.16, identity='xyz/morphia/mapping/MappedField.getFirstFieldName
depth=29, score=0.16, identity='xyz/morphia/mapping/MappedField.getDbObjectValue
depth=28, score=0.16, identity='xyz/morphia/converters/Converters.fromDBObject
depth=27, score=0.16, identity='xyz/morphia/mapping/ValueMapper.fromDBObject
depth=26, score=1.94, identity='xyz/morphia/mapping/Mapper.readMappedField
depth=25, score=1.98, identity='xyz/morphia/mapping/Mapper.fromDb
depth=24, score=2.03, identity='xyz/morphia/mapping/Mapper.fromDBObject
depth=23, score=2.03, identity='xyz/morphia/query/MorphiaIterator.convertItem
depth=22, score=2.03, identity='xyz/morphia/query/MorphiaIterator.processItem
depth=21, score=2.03, identity='xyz/morphia/query/MorphiaIterator.next
depth=20, score=5.16, identity='xyz/morphia/query/QueryImpl.asList
depth=19, score=5.16, identity='xyz/morphia/query/QueryImpl.asList
depth=18, score=5.32, identity='xxx/amusement/task/manager/task/TaskInfoManager.getTasksByType
depth=17, score=5.75, identity='xxx/amusement/task/engine/BaseTaskEngine.getTasksByTypeWithCache
depth=16, score=5.78, identity='xxx/amusement/task/engine/BaseTaskEngine.getRegisteredTaskContexts
depth=15, score=6.38, identity='xxx/amusement/task/engine/BaseTaskEngine.conditionTrigger
depth=14, score=6.46, identity='xxx/amusement/task/engine/BaseTaskEngine.processCore
depth=13, score=6.46, identity='xxx/amusement/task/engine/BaseTaskEngine.process
depth=12, score=6.46, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=11, score=6.46, identity='xxx/amusement/task/kafka/consumers/live/GiftProcessor.doMsgReceived
depth=10, score=7.46, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=9, score=7.46, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$2.apply
depth=8, score=8.77, identity='xxx/amusement/task/utils/IdempotentUtil.idempotentHandler
depth=7, score=8.78, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.idempotentCore
depth=6, score=9.07, identity='xxx/amusement/task/kafka/consumers/BaseConsumer.msgReceivedEntrance
depth=5, score=9.07, identity='xxx/amusement/task/kafka/consumers/BaseConsumer$1.msgReceived
depth=4, score=30.87, identity='xxx/commons/queue/callback/MsgFutureWrapper.msgReceived
depth=3, score=35.85, identity='xxx/commons/queue/service/Consumer$RecordHandler.run
depth=2, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor.runWorker
depth=1, score=64.86, identity='java/util/concurrent/ThreadPoolExecutor$Worker.run
depth=0, score=71.89, identity='java/lang/Thread.run
```