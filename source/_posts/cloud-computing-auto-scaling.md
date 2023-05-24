---
title: Cloud Computing - Auto scaling
mathjax: false
date: 2022-10-15 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/AutoScalingGraphic.png
categories:
  - Cloud Computing
  - IaaS
tags:
  - Cloud Computing
  - IaaS
---

# Design for Failure

> 核心思路：`冗余` + `快速切换`

1. `宿主机`
   - 保证多个虚拟机不在`同一个宿主机`上，甚至不处于`同一个机架`上
   - 提供`物理分散分布`的能力：AWS（`Placement Group`）、Azure（`Availability Set`）、阿里云（`部署集`）
2. `可用区` - IDC
   - `多可用区`的实例部署（`VPC` 支持`跨可用区`）
3. `区域`
   - 多区架构层面的相关预案
   - 互联网业务：通过 `DNS` 导流，将域名解析到另一个区域的备用服务，底层数据依赖日常的`跨区域的实时同步`
4. `多云` - 避免厂商锁定

<!-- more -->

# Auto scaling

> `应对工作负载洪峰` + `在低谷期显著降低成本`

## 虚拟机编组

> 将`功能相同`的多个虚拟机，作为`一个单位`来创建、管理和伸缩

1. `弹性伸缩服务`
   - 根据指定的数量和扩缩容的规则，`动态`地创建和销毁虚拟机实例，协调虚拟机的生命周期
2. `负载均衡器` - SLB
   - 将流量均匀地、或者按照一定权重或规则，分发到多台虚拟机上

> 弹性伸缩服务 + 负载均衡器：适合处理`无状态`类的计算需求

