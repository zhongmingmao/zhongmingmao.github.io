---
title: Cloud Computing - Virtual machine
mathjax: false
date: 2022-10-12 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/c2jc06l6fp3zzg52fl01.webp
categories:
  - Cloud Computing
  - IaaS
tags:
  - Cloud Computing
  - IaaS
---

# 体系结构

> `计算存储分离`

1. 传统虚拟化
   - 对单一物理机器资源的`纵向分割`，计算、存储、网络等能力都是一台物理机的子集，`可伸缩性`有较大局限
2. 云虚拟机
   - 云端有`大规模的专属硬件`和`高速的内部网络`
   - 除了核心的 `CPU` 和`内存`仍属于同一台宿主机外，`硬盘`和`网络`等可以享受云端的基础设施
   - 在`可扩展性`（硬盘、网卡、公网 IP）和`故障隔离`方面，有很大优势
   - 名称
     - 阿里云：ECS - Elastic Compute Service
     - AWS：EC2 - Elastic Compute Cloud
     - Azure：Virtual Machines
     - 腾讯云：CVM - Cloud Virtual Machine

<!-- more -->

![vm-01](https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/vm-01.jpeg)

## 网络安全组

> Network Security Group

1. 网络安全组：一层覆盖在虚拟机之外的`网络防火墙`，能够控制虚拟机`入站流量`和`出站流量`
2. 网络安全组并不工作在 `OS` 层，是`额外`的一层防护，非法流量不会到达 OS 的网络堆栈，`不会影响 VM 的性能`
3. 网络安全组是一种`可复用`的配置，可以同时应用于多个虚拟机，`软件定义网络`
4. 网络安全组非常`灵活`，规则会`动态生效`

# 类型规格

## 类型

> 具有同一类`设计目的`或者`性能特点`的虚拟机类别：`通用均衡型`、`计算密集型`、`内存优化型`、`图形计算型`

> 重要指征：`vCPU : Memory`，在主流云计算平台上，通常使用`字母缩写`来表达`虚拟机类型`

| 类型                                             | `vCPU : Memory` | 用途                         |
| ------------------------------------------------ | --------------- | ---------------------------- |
| 通用均衡型                                       | `1:4`           | 建站、应用后端               |
| 计算密集型                                       | `1:2` ~ `1:1`   | 科学计算、视频编码、代码编译 |
| 内存优化型                                       | > `1:8`         | 数据库、缓存服务、大数据分析 |
| 图形计算型（GPU）                                |                 | AI（机器学习、深度学习等）   |
| 本地存储型<br />带有`高性能`或`大容量`的本地存储 |                 |                              |

## Generation

> 用来标识该`类型`下的第几代机型

1. 同类型虚拟机更新换代，首先是 `CPU` 的换代提升
2. 新机型的推出，云厂商会详细说明背后支撑的`硬件详细信息`
3. 由于虚拟机所采用的`物理 CPU` 在`不断更新`，因此云上虚拟机的`单核性能未必相同`
   - Azure 引入 `ACU`（Azure Compute Unit），用来帮助`量化`不同 CPU 的`单核性能 `
4. `虚拟化技术`也会不断改进，如 `AWS Nitro System`（类似：阿里的神龙架构）
   - 将许多原本`占用宿主机资源`的`虚拟化管理工作`进行了`剥离`
   - 并将`部分工作负载`，通过 `Nitro Card`  等`专用硬件`进行`硬件化`
   - 进而达到`最大化计算资源利用率`的效果
5. `买新不买旧`
   - 新一代的型号，对应着全新的`特制底层物理服务器`和`虚拟化设施`，能够提供更高的`性能价格比`

## 规格

> `medium`、`large`、`xlarge`

1. `large = 2vCPU`
2. `xlarge = 4vCPU`
3. `nxlarge = n × 4 vCPU`

> vCPU 是更合适的表达方式（`超线程`，HyperThreading，一个 `Core` 能虚拟出两个 `vCPU` 的`算力`）

> 裸金属：云厂商`尽最大可能`地将`物理裸机`以`云产品`方式暴露出来的实例
> 主要用于一些追求`极致性能`，或者需要在`非虚拟化`环境下运行软件的场景

## 命名规则

> 利用三个维度（`类型`、`Generation`、 `规格`），按照某种顺序排列的`组合`

```bash
$ lscpu
Architecture:          x86_64
CPU op-mode(s):        32-bit, 64-bit
Byte Order:            Little Endian
CPU(s):                16
On-line CPU(s) list:   0-15
Thread(s) per core:    2
Core(s) per socket:    8
Socket(s):             1
NUMA node(s):          1
Vendor ID:             GenuineIntel
CPU family:            6
Model:                 85
Model name:            Intel(R) Xeon(R) Platinum 8163 CPU @ 2.50GHz
Stepping:              4
CPU MHz:               2500.018
BogoMIPS:              5000.03
Hypervisor vendor:     KVM
Virtualization type:   full
L1d cache:             32K
L1i cache:             32K
L2 cache:              1024K
L3 cache:              33792K
NUMA node0 CPU(s):     0-15
```

# 成本

> 可组合使用

| 降本方式              | 代价                                    |
| --------------------- | --------------------------------------- |
| Package               | `固定时长 + 预付费`，牺牲`采购的灵活性` |
| Spot                  | `拍卖 + 随时被回收`，牺牲`稳定性`       |
| Burstable Performance | `积分机制`，牺牲`性能`                  |
| ARM                   | `生态` + `兼容性`                       |

## Package

> 提前`预估`好虚拟机的`使用时间`，并`提前支付`，一般能获得 `3~7` 折

1. 一般`无法提前取消`，或者需要扣除部分费用后才能提前取消
2. 繁琐的`续费管理`（忘记续费，过了`缓冲期`后，虚拟机会被`自动关闭`，进而`影响业务的连续性`）

## Spot

> AWS 首创，能提供`大幅折扣`（`1~2` 折）

1. 基本原理：将云数据中心上`闲置`的机器资源进行公开的`拍卖`，价高者得
2. 主要限制：当数据中心的闲置资源不足时，`随时可能被回收`，牺牲了`稳定性`
3. Spot Instances 也是按`运行时长`付费，可`随时启停`
4. 适合场景：`无状态`、`可中断`的工作（后台批计算、性能测试等）

> 竞价方式：设定`可接受的最高价`；根据市场价格波动，`自动出价`

## Burstable Performance

> `6` 折或更低

1. Burstable Performance Instances 的`成本显著降低`
2. Burstable Performance Instances 的 CPU 性能表现，采用`积分制`
   - 积分随着`时间的推移`而`匀速累加`，也会随着`算力的输出`而不断`消耗`
3. 当`积分充裕`时，CPU 可以`按需跑满`，达到 CPU 性能的 `100%`，但`积分`也会`快速消耗`
4. 当`积分不足`时，CPU 只能发挥出`标称值的一小部分性能`（`性能基准`）
   - `性能基准`：与`积分匀速累加`的速度一致（即以该算力持续输出，积分会一直`持平`）
   - 性能`基准`一般为性能`峰值`的 `5% ~ 40%`
5. 积分的积累存在`上限`（一般足够`全速计算数小时`）
6. 适合符合`流量自然特征`的`互联网业务`

![image-20230522233236813](https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/image-20230522233236813.png)

## ARM

> `低功耗` + `高性价比`（输出同样性能，可节约 30 ~ 40 % 的成本）

> ARM 是一个`相对开放`的架构，云厂商会基于 ARM 来`自建芯片`（进一步`降低单位算力的成本`）

> ARM 在`服务器端的软件生态`，相对于 x86，还有待加强



