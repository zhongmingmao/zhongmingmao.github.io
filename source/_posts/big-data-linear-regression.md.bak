---
title: 大数据 -- 线性回归
mathjax: false
date: 2019-07-11 20:51:12
categories:
    - Big Data
    - Spark
tags:
    - Big Data
    - Spark
    - Linear Regression
---

## 数据集
1. 下载链接：[cal_housing](http://www.dcc.fc.up.pt/~ltorgo/Regression/cal_housing.html)
2. 数据集格式
    - longitude：区域中心的纬度
    - latitude：区域中心的经度
    - housingMedianAge：区域内所有房屋年龄的中位数
    - totalRooms：区域内总房间数
    - totalBedrooms：区域内总卧室数
    - population：区域内总人口数
    - households：区域内总家庭数
    - medianIncome：区域内人均收入中位数
    - medianHouseValue：区域房价的中位数
3. 前面8个属性都可能对房价有影响，假设影响是**线性**的，可以得到类似的公式`A=bB+cC+...iI`，A代表房价，B~I代表属性

<!-- more -->

## 数据清洗

### 创建RDD
把房屋信息数据和每个属性的定义读入到Spark，并创建两个相应的RDD
```python
from pyspark.sql import SparkSession

# 初始化SparkSession和SparkContext
spark = SparkSession.builder \
    .master("local") \
    .appName("California Housing") \
    .config("spark.executor.memory", "1GB") \
    .getOrCreate()
sc = spark.sparkContext

# 读取数据并创建RDD
rdd = sc.textFile('/Users/zhongmingmao/Downloads/CaliforniaHousing/cal_housing.data')

# 读取数据每个属性的定义并创建RDD
header = sc.textFile('/Users/zhongmingmao/Downloads/CaliforniaHousing/cal_housing.domain')
```

### collect + take
```python
# collect函数会把所有数据都加载到内存中，常用方法是用take函数去只读取RDD中的某几个元素
>>> header.collect()
[u'longitude: continuous.', u'latitude: continuous.', u'housingMedianAge: continuous. ', u'totalRooms: continuous. ', u'totalBedrooms: continuous. ', u'population: continuous. ', u'households: continuous. ', u'medianIncome: continuous. ', u'medianHouseValue: continuous. ']

# 读取前两个数据
>>> rdd.take(2)
[u'-122.230000,37.880000,41.000000,880.000000,129.000000,322.000000,126.000000,8.325200,452600.000000'
, u'-122.220000,37.860000,21.000000,7099.000000,1106.000000,2401.000000,1138.000000,8.301400,358500.000000']
```

### map
用SparkContext.textFile函数创建的RDD，每个数据都是一个大字符串，各个属性用逗号分隔，用**map**函数把大字符串分隔成数组
```python
rdd = rdd.map(lambda line: line.split(","))

>>> rdd.take(2)
[[u'-122.230000', u'37.880000', u'41.000000', u'880.000000', u'129.000000', u'322.000000', u'126.000000', u'8.325200', u'452600.000000']
, [u'-122.220000', u'37.860000', u'21.000000', u'7099.000000', u'1106.000000', u'2401.000000', u'1138.000000', u'8.301400', u'358500.000000']]
```

### doDF
Spark SQL的DataFrame API在查询**结构化数据**时更加方便，且性能更好，先把**RDD转换为DataFrame**
```python
from pyspark.sql import Row

df = rdd.map(lambda line: Row(longitude=line[0],
                              latitude=line[1],
                              housingMedianAge=line[2],
                              totalRooms=line[3],
                              totalBedRooms=line[4],
                              population=line[5],
                              households=line[6],
                              medianIncome=line[7],
                              medianHouseValue=line[8])).toDF()
```
```python
>>> df.show()
+-----------+----------------+---------+-----------+----------------+------------+-----------+-------------+-----------+
| households|housingMedianAge| latitude|  longitude|medianHouseValue|medianIncome| population|totalBedRooms| totalRooms|
+-----------+----------------+---------+-----------+----------------+------------+-----------+-------------+-----------+
| 126.000000|       41.000000|37.880000|-122.230000|   452600.000000|    8.325200| 322.000000|   129.000000| 880.000000|
|1138.000000|       21.000000|37.860000|-122.220000|   358500.000000|    8.301400|2401.000000|  1106.000000|7099.000000|
| 177.000000|       52.000000|37.850000|-122.240000|   352100.000000|    7.257400| 496.000000|   190.000000|1467.000000|
| 219.000000|       52.000000|37.850000|-122.250000|   341300.000000|    5.643100| 558.000000|   235.000000|1274.000000|
| 259.000000|       52.000000|37.850000|-122.250000|   342200.000000|    3.846200| 565.000000|   280.000000|1627.000000|
| 193.000000|       52.000000|37.850000|-122.250000|   269700.000000|    4.036800| 413.000000|   213.000000| 919.000000|
| 514.000000|       52.000000|37.840000|-122.250000|   299200.000000|    3.659100|1094.000000|   489.000000|2535.000000|
| 647.000000|       52.000000|37.840000|-122.250000|   241400.000000|    3.120000|1157.000000|   687.000000|3104.000000|
| 595.000000|       42.000000|37.840000|-122.260000|   226700.000000|    2.080400|1206.000000|   665.000000|2555.000000|
| 714.000000|       52.000000|37.840000|-122.250000|   261100.000000|    3.691200|1551.000000|   707.000000|3549.000000|
| 402.000000|       52.000000|37.850000|-122.260000|   281500.000000|    3.203100| 910.000000|   434.000000|2202.000000|
| 734.000000|       52.000000|37.850000|-122.260000|   241800.000000|    3.270500|1504.000000|   752.000000|3503.000000|
| 468.000000|       52.000000|37.850000|-122.260000|   213500.000000|    3.075000|1098.000000|   474.000000|2491.000000|
| 174.000000|       52.000000|37.840000|-122.260000|   191300.000000|    2.673600| 345.000000|   191.000000| 696.000000|
| 620.000000|       52.000000|37.850000|-122.260000|   159200.000000|    1.916700|1212.000000|   626.000000|2643.000000|
| 264.000000|       50.000000|37.850000|-122.260000|   140000.000000|    2.125000| 697.000000|   283.000000|1120.000000|
| 331.000000|       52.000000|37.850000|-122.270000|   152500.000000|    2.775000| 793.000000|   347.000000|1966.000000|
| 303.000000|       52.000000|37.850000|-122.270000|   155500.000000|    2.120200| 648.000000|   293.000000|1228.000000|
| 419.000000|       50.000000|37.840000|-122.260000|   158700.000000|    1.991100| 990.000000|   455.000000|2239.000000|
| 275.000000|       52.000000|37.840000|-122.270000|   162900.000000|    2.603300| 690.000000|   298.000000|1503.000000|
+-----------+----------------+---------+-----------+----------------+------------+-----------+-------------+-----------+
only showing top 20 rows
```

### cast
每一列的数据格式都是string，通过cast()函数把每一列的类型转换成float
```python
from pyspark.sql.types import FloatType

def convertColumn(df, names, newType):
    for name in names:
        df = df.withColumn(name, df[name].cast(newType))
    return df

columns = ['households', 'housingMedianAge', 'latitude', 'longitude', 'medianHouseValue', 'medianIncome', 'population', 'totalBedRooms', 'totalRooms']

df = convertColumn(df, columns, FloatType())
```
```python
# 转换成数字有很多优势，例如可以统计出所有建造年限各有多少个房子
>>> df.groupBy("housingMedianAge").count().sort("housingMedianAge", ascending=False).show()
+----------------+-----+
|housingMedianAge|count|
+----------------+-----+
|            52.0| 1273|
|            51.0|   48|
|            50.0|  136|
|            49.0|  134|
|            48.0|  177|
|            47.0|  198|
|            46.0|  245|
|            45.0|  294|
|            44.0|  356|
|            43.0|  353|
|            42.0|  368|
|            41.0|  296|
|            40.0|  304|
|            39.0|  369|
|            38.0|  394|
|            37.0|  537|
|            36.0|  862|
|            35.0|  824|
|            34.0|  689|
|            33.0|  615|
+----------------+-----+
only showing top 20 rows
```

## 预处理
1. 房价的值普遍都很大，需要把它们调整成相对较小的数字
2. 有的属性没太大意义，例如区域内的总房间数和总卧室数，更应该关心的是平均房间数
3. 房价是结果，其他属性是输入参数，需要把它们**分离处理**
4. 有的属性最大值和最小值范围很大，需要把它们**标准化处理**

### 调小房价
大部分房价都是10万起
```python
from pyspark.sql import functions

df = df.withColumn("medianHouseValue", functions.col("medianHouseValue") / 100000)
```

### 添加新列
1. 每个家庭的平均房间数：roomsPerHousehold
2. 每个家庭的平均人数：populationPerHousehold
3. 卧室在总房间的占比：bedroomsPerRoom

```python
df = df.withColumn("roomsPerHousehold", functions.col("totalRooms") / functions.col("households")) \
    .withColumn("populationPerHousehold", functions.col("population") / functions.col("households")) \
    .withColumn("bedroomsPerRoom", functions.col("totalBedRooms") / functions.col("totalRooms"))
```

### 筛选列
去除没有太大价值的列，例如经纬度，保留有价值的列
```python
df = df.select("medianHouseValue",
               "totalBedRooms",
               "population",
               "households",
               "medianIncome",
               "roomsPerHousehold",
               "populationPerHousehold",
               "bedroomsPerRoom")
```

### 分离处理
先把DataFrame转换到RDD，然后用map函数把每个对象分成两部分，最后再转换回DataFrame
```python
from pyspark.ml.linalg import DenseVector

input_data = df.rdd.map(lambda x: (x[0], DenseVector(x[1:])))
# label代表房价，features代表其余参数的列表
df = spark.createDataFrame(input_data, ["label", "features"])
```

### 标准化
数据的标准化，可以借助Spark ML来完成，增加了features_scaled列，里面每个数据都是标准化过的，用于训练模型
```python
from pyspark.ml.feature import StandardScaler

standardScaler = StandardScaler(inputCol="features", outputCol="features_scaled")
scaler = standardScaler.fit(df)
scaled_df = scaler.transform(df)
```
```python
[Row(label=4.526, features=DenseVector([129.0, 322.0, 126.0, 8.3252, 6.9841, 2.5556, 0.1466]), features_scaled=DenseVector([0.3062, 0.2843, 0.3296, 4.3821, 2.8228, 0.2461, 2.5264]))]
```

## 创建模型
1. 把数据集分成**训练集**和**测试集**，训练集用来训练模型，测试集用来评估模型的正确性
2. DataFrame的randomSplit函数很容易将数据随机分割，将80%的数据用于训练，20%的数据用于测试
3. Spark ML提供的LinearRegression功能，很容易构建一个线性回归模型

```python
from pyspark.ml.regression import LinearRegression

train_data, test_data = scaled_df.randomSplit([.8, .2], seed=123)
lr = LinearRegression(featuresCol='features_scaled', labelCol="label", maxIter=10, regParam=0.3, elasticNetParam=0.8)
linearModel = lr.fit(train_data)
```

## 模型评估
可以用linearModel的transform函数来预测测试集中的房价，与真实情况进行对比
```python
predicted = linearModel.transform(test_data)
predictions = predicted.select("prediction").rdd.map(lambda x: x[0])
labels = predicted.select("label").rdd.map(lambda x: x[0])
predictionAndLabel = predictions.zip(labels)
```
