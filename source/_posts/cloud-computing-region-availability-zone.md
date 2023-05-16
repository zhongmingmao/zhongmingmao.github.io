---
title: Cloud Computing - Region + Availability zone
mathjax: false
date: 2022-10-09 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/featured-image-cloud-computing.png
categories:
  - Cloud Computing
  - IaaS
tags:
  - Cloud Computing
  - IaaS
---

# Region

1. 云计算厂商在某个`地理位置`提供的`所有云服务的组合`，是厂商对外提供云服务的`基本单位和容器`
2. 绝大多数的云服务，通常都会按照 Region 进行部署
   - 用户使用的所有云资源，都会隶属于某个 Region，通常在`创建资源`时确定
3. 每个 Region 都会有个由字母数字构成的 Region 代号（`Region ID` or `Region Code`），一般为`全局唯一`
4. Region 的设立与分布，体现了云厂商的`业务重点`和`地区倾向`
   - 不同 Region 之间的距离，一般为`数百公里或以上`
5. Region 的选址思路
   - `人口稠密的中心城市` - 离用户和商业更近
   - `相对偏远的地区` - 维护成本低

<!-- more -->

## 选择 Region

1. `地理位置`
   - 尽可能地靠近应用所面向的`最终用户`
   - 混合云架构（本地数据中心与云端互联）
     - 混合云的`专线`接入，一般以`同城`或`短距离`接入为主（控制费用 + 提高线路稳定性）
2. Region 之间`云服务的差异`
   - 同一个云在不同的 Region，所能提供的服务和规模可能是不同的
   - `Region 的服役时间`，往往与 Region 内`云服务的可用性`有较大的关联
     - 新 Region - 最新的硬件和云端服务
     - 旧 Region - 产品丰富 + 技术支持完善
3. `成本`
   - 同一个云服务，在不同 Region 的价格也是不同的，个别 Region 可能会有`明显的价格优势`
   - `入站流量`和`内部流量`趋于`免费`，而`出站流量`则`单独收费`

## 多 Region 架构

> 最佳用户体验 + 高可用

### 公有云

> 公有云的`基础设施`能够极大地方便多 Region 应用的构建

1. `骨干网`（Backbone）
   - 骨干网：各 Region 之间的网络互联`专线`
   - 骨干网使得同一个云在不同的 Region 之间的通信，能够有较高的带宽和较低的延时
2. `软件`
   - 允许位于不同 Region 的`虚拟网络`跨区域进行互联
3. `DNS`
   - 提供`就近解析`和`智能路由`的能力
   - 将分布广泛的 C 端流量引流到`最近`的 IDC

### 应用架构

> `各司其职`：让不同 Region 担任不同的角色，联动起来达到业务目的

# Availability zone

> Availability zone 是 Region 的`下级`概念

> Availability zone：一个具备完整独立的电力供应、冷却系统、网络设施的 `IDC`

1. 一个 Region 通常由多个 Availability zone 高速互联组成
   - Region 内的 Availability zone 一般位于`同一个城市`，相距`一百公里以内`
2. Availability zone 的作用
   - Region 的`高可用性`
   - Region 的`新陈代谢`：建设新的 Availability zone，封存淘汰老的 Availability zone

