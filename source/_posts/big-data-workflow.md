---
title: 大数据 -- Workflow设计模式
mathjax: false
date: 2019-06-30 19:20:09
categories:
    - Big Data
tags:
    - Big Data
---

## 工作流系统
将由多个不同的处理模块连接在一起，最后得到一个**有向无环图**（DAG），称为一个**工作流系统**（Workflow System）

## 复制模式 -- Copier Pattern
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-copier-pattern.jpg" width=800/>

<!-- more -->

1. 将单个数据处理模块中的数据，完整地复制到两个或更多的数据处理模块中，然后再由不同的数据处理模块进行处理
2. 应用场景：需要对同一个数据集采取多种不同的数据处理转换
3. 样例：Youtube处理视频
    - 依据带宽提供不同分辨率的视频
    - 生成视频的动画缩略图
    - 利用NLP技术分析视频的数据集，自动生成视频字幕
    - 分析视频内容，产生更好的内容推荐
4. 每个数据处理模块的输入都是**相同**的，每个数据处理模块可以**单独且同时**运行处理

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-copier-pattern-youtube.jpg" width=800/>

## 过滤模式 -- Filter Pattern
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-filter-pattern.jpg" width=800/>

1. 过滤模式：过滤掉不符合特定条件的数据
2. 应用场景：需要针对一个数据集中某些特定的数据采用数据处理
3. 样例：电商会员系统
    - 根据用户特征，将用户划分为五星会员（Five Star）、金牌会员（Golden）、钻石会员（Diamond）
    - 通过邮件，针对钻石会员发出活动邀请

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-filter-pattern-member.jpg" width=800/>

## 分离模式 -- Splitter Pattern
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-splitter-pattern-1.jpg" width=800/>
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-splitter-pattern-2.jpg" width=800/>

1. 应用场景：处理数据集时，把数据分类成不同的类别分别进行处理
2. 分离模式不会过滤任何数据，只是将原来的数据集分组
3. 样例：电商会员系统
    - 通过邮件，针对全部会员发送符合他们身份的活动邀请

<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-splitter-pattern-member.jpg" width=800/>

## 合并模式 -- Joiner Pattern
<img src="https://big-data-1253868755.cos.ap-guangzhou.myqcloud.com/big-data-workflow-joiner-pattern.jpg" width=800/>

合并模式：将多个不同的数据集转换集中到一起，成为一个总数据集，然后将这个总数据集放在一个工作流中进行处理
