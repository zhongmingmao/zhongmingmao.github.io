---
title: 大数据 -- Word Count
mathjax: false
date: 2019-07-10 12:38:10
categories:
    - Big Data
    - Spark
tags:
    - Big Data
    - Spark
---

## 基于RDD API

### SparkContext
1. 在Spark 2.0之前，**SparkContext是所有Spark任务的入口**
2. SparkContext包含了**Spark程序的基本配置**，Spark的驱动程序利用SparkContext来连接到集群
3. 无论Spark集群有多少个节点做并行处理，每个程序都只有**唯一**的SparkContext，它可以被SparkConf初始化

```python
from pyspark import SparkConf, SparkContext, HiveContext
from pyspark.streaming import StreamingContext

# master参数是一个Spark、Y或者YARN的集群URL
conf = SparkConf().setAppName("WordCountApp").setMaster("local")
sc = SparkContext(conf=conf)

# 通过SparkContext对象来读取输入文件，创建一个RDD，里面的每一个数据代表文本文件的一行
lines = sc.textFile("sample.txt")

words = lines.flatMap(lambda line: line.split(" "))
counts = words.map(lambda word: (word, 1)).reduceByKey(lambda a, b: a + b)
counts.saveAsTextFile("./output")

# 在Spark 2.0之前，如果要使用Spark提供的其它库，如SQL或者Streaming，需要分别创建相应的context对象
# hc = HiveContext(sc)
# ssc = StreamingContext(sc)
```

<!-- more -->

### SparkSession
1. 在Spark 2.0之后，随着DataFrame/DataSet API的普及，Spark引入了新的**SparkSession**对象作为所有Spark任务的入口
2. SparkSession不仅有SparkContext的所有功能，还**集成了所有Spark提供的API**
    - 例如DataFrame、Spark Streaming和Structured Streaming，无需再为不同的功能定义不同的Context
3. 由于SparkSession的**普适性**，尽量使用SparkSession作为Spark程序的入口

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("WordCountApp").getOrCreate()
# RDD
lines = spark.read.text("sample.txt").rdd.map(lambda r: r[0])

words = lines.flatMap(lambda line: line.split(" "))
# counts是包含<word,count>的RDD
counts = words.map(lambda word: (word, 1)).reduceByKey(lambda a, b: a + b)

output = counts.collect()
for (word, count) in output:
    print("%s : %i" % (word, count))
# 停止SparkSession
spark.stop()
```

## 基于DataFrame API
1. Scala和Java都支持对DataFrame进行flatMap操作，但Python不支持，需要借助两个新操作：**split、explode**
2. split是pyspark.sql.functions库提供的函数
    - 作用于DataFrame的某一列，可以把列中的字符串按照某个分隔符**分割**成一个字符串数组
3. explode也是pyspark.sql.functions库提供的函数
    - 作用于DataFrame的某一列，可以把**列中的数组**或者**map中的每一个元素**创建一个**新的Row**
4. DataSet/DataFrame API的便利性：不需要创建<word,count>对作为中间值，可以**直接对数据进行类似SQL的查询**

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import *

if __name__ == "__main__":
    spark = SparkSession.builder.appName("WordCountApp").getOrCreate()
    # DataFrame，每一行只有一列，每一列都是包含很多词语的句子
    lines = spark.read.text("sample.txt")
    # 先对唯一的一列做split，生成一个新的列，列种的每个元素都是词语的数组
    # 再对这个列做explode，可以把数组中的每个元素都生成一个新的ROW
    # split + explode =》 flatMap
    wordCounts = lines.select(explode(split(lines.value, " ")).alias("word")).groupBy("word").count()
    wordCounts.show()
    spark.stop()
```

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-spark-split-explode.png" width=800/>
