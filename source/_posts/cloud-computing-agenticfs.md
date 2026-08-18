---
title: Cloud Computing - AgenticFS
mathjax: false
date: 2026-08-03 00:06:25
cover: https://cloud-computing-1253868755.cos.ap-guangzhou.myqcloud.com/nas/image-20260803100307919.png
categories:
  - Cloud Computing
  - Storage
tags:
  - Cloud Computing
  - Storage
  - NAS
---

# 概述

AgenticFS是面向**AI Agent场景**的**Serverless**文件存储，**单个文件系统**可管理最高**50万AgenticSpace**（独立**Workspace**），为**每个Agent终端用户**提供**容量配额**、**访问隔离**与**性能隔离**能力

<!-- more -->

## AgenticFS 与 AgenticSpace

| 术语         | 释义                                                         |
| ------------ | ------------------------------------------------------------ |
| AgenticFS    | **地域（Region）级文件系统**，统一管理最高**50万AgenticSpace** |
| AgenticSpace | **可用区（AZ）级独立工作空间**，拥有**独立inode空间**，为**单个Agent终端用户**提供**容量配额**、**访问隔离**与**性能隔离** |

> 基于上述架构，AgenticFS 提供以下核心能力

1. **Agentic 弹性能力：单个AgenticFS**支持最多管理 **50 万个 AgenticSpace**
2. **Agentic 容量管理：**为每个 Agent 设置**容量**和**文件数限额**，避免**资源滥用**，控制 **Agent 运营成本**
3. **Agentic 权限管理：**每个 Agent  独立的**权限管理**，实现真正的**访问隔离**
4. **Agentic 性能隔离：**每个 Agent  支持**吞吐**、**IOPS**、**元数据 QoS 性能隔离**，避免**异常行为**或**恶意访问**干扰，实现真正的**故障域隔离**

## 应用模型

> AgenticFS面向**AI Agent平台**典型**多租户**场景，通过**AgenticFS**、**AgenticSpace**、接入点（**AccessPoint**）、**配额**四类对象，将**平台终端用户**与**文件系统资源**进行**映射**

1. **Agent平台开发者**开通并管理一个或多个**AgenticFS**，统一视图管理大规模**AgenticSpace**
2. 为每个**Agent终端用户**分配一个独立的**AgenticSpace**，作为该用户的**Workspace**，承担**容量配额**、**文件数配额**、**访问隔离**与**性能隔离**
3. **同一终端用户**的多个**Session（会话）**对应到该**AgenticSpace下的子目录**，用于存放**会话记录**、**记忆数据**、**Markdown文件**、**Skill**等持久化数据
4. **接入点（AccessPoint）**支持**AgenticFS**与**AgenticSpace**两种粒度，配合**RAM访问策略**，实现不同**应用**、不同**RAM用户/角色**对**资源**的**差异化访问**
5. **配额**按**AgenticSpace**粒度设置，包括**容量**、**文件数**

## 产品规格

### 功能规格

| 项目       | AgenticFS                                                    | AgenticSpace                                                 |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 协议       | 兼容 **POSIX** 语义<br />支持 **NFS v3**<br />客户端：**Linux** | 兼容 **POSIX** 语义<br />支持 **NFS v3**<br />客户端：**Linux** |
| 最大容量   | **100 PiB**                                                  | **1 PiB**                                                    |
| 最大文件数 | **50,000亿**                                                 | **10亿**                                                     |
| 创建数量   | **单账号20个**（可提交**工单**申请放宽）                     | **单AgenticFS 50万个**（可提交工单放宽）                     |
| 配额       | 不涉及                                                       | 支持**容量**、**文件数**配额                                 |
| 性能隔离   | 不涉及                                                       | 支持                                                         |
| 扩容方式   | **自动扩容**，扩容步长**4 KiB**                              | **自动扩容**，扩容步长**4 KiB**                              |
| 挂载延迟   | **1~3秒**                                                    | **1~3秒**                                                    |
| 加密       | 支持**传输加密**                                             | 支持**传输加密**                                             |
| SLA        | **99.95%**                                                   | **99.95%**                                                   |

### 性能规格

> AgenticSpace ≈ 通用型NAS 高级型

| 项目               | AgenticSpace                                                 |
| ------------------ | ------------------------------------------------------------ |
| 平均单路4K读写延迟 | 同AZ访问：**2 ms**；跨AZ访问：**3~5 ms**                     |
| 峰值吞吐           | 初始读写300 MB/s，每增加1 GiB容量+0.3 MB/s；读上限**20 GB/s**，写上限**5 GB/s** |
| 最大IOPS           | **30,000**                                                   |

> 说明：**AgenticFS**为地域（**Region**）级产品，**AgenticSpace**为可用区（**AZ**）级产品

## 使用限制

1. AgenticFS当前邀测发布，如需使用，请提交工单申请
2. **单个AgenticFS**最多创建**50万个AgenticSpace**
3. **AgenticSpace路径的父目录**必须存在，**路径不支持重命名**，不支持**软链接**
4. 不支持**AgenticSpace嵌套**（父目录已是AgenticSpace时，子目录不可再设为AgenticSpace）
5. **单个AgenticSpace文件数**上限**10亿**，超过后写入返回**no space**错误
6. **容量配额最小1 GiB**，按1 GiB**步长扩容**；调整配额时新值必须**高于**已使用值

# 计费

1. AgenticFS按照**存储容量**计费，默认采用**按量付费**方式
2. 创建AgenticFS文件系统后，按**每小时实际存储容量**的**峰值**计费

## 计费项

> AgenticFS的计费项为**存储容量**（通用存储容量），按照**每小时**文件系统实际存储容量的**峰值**计费

| 计费项       | 计费方式                   | 单价 | 说明                                             |
| ------------ | -------------------------- | ---- | ------------------------------------------------ |
| 通用存储容量 | **按量付费（每小时峰值）** | -    | 包含**文件系统**内**所有AgenticSpace**的存储容量 |

> 存储空间费用（根据使用容量计费）(**元/GB/月**)

| 容量型 | 高级型   | 性能型 | AgenticFS | 极速型 | 低频存储 | 归档存储 |
| ------ | -------- | ------ | --------- | ------ | -------- | -------- |
| 0.35   | **0.85** | 1.85   | 0.85      | N/A    | 0.15     | 0.05     |

> AgenticFS 不支持生命周期管理

## 付费方式

**按量付费**（默认）：创建文件系统后即开始计费，**先使用后付费**，按照各计费项的实际用量结算费用

## 计费周期

1. AgenticFS以**小时**为周期统计**所有资源**的使用量，并按照**使用量**结算产生的费用
2. 账单出账时间通常在当前计费周期结束后**3~4小时**，具体出账时间以系统为准

## 计费公式

1. AgenticFS的使用费用**每小时**结算一次，计算公式如下
   - 费用 = **存储容量小时峰值** × **每小时单价**
2. 产品定价中存储容量的单价为`元/GiB/月`，按量付费计算时需要先将单价转换为`元/GiB/小时`
   - 转换公式为：**每小时单价 = 月单价 ÷ （当月天数 × 24）**

## 计费开始与停止

1. 计费开始
   - 创建AgenticFS文件系统成功后，即按**每小时存储容量峰值**计费
2. 计费停止
   - 删除**AgenticFS**文件系统后停止计费
   - 如果文件系统中存在数据，删除前需先**清空**所有AgenticSpace及文件数据

# 创建AgenticFS文件系统

## 操作步骤

1. 登录 NAS 控制台
2. 在左侧导航栏，选择**文件系统** > **文件系统列表**
3. 在页面左上角，选择**地域**
4. 单击创建文件系统，在文件系统类型中选择**AgenticFS**
5. 配置以下参数，然后单击确定

| 参数     | 说明                                                         |
| -------- | ------------------------------------------------------------ |
| 地域     | 选择要创建AgenticFS文件系统的地域，AgenticFS为地域（**Region**）级别产品 |
| 协议类型 | 仅支持**NFS V3**协议                                         |
| 服务协议 | 阅读并勾选服务协议                                           |

## 后续操作

创建完成后，您可以在文件系统详情页管理AgenticSpace

# 管理AgenticSpace

1. **AgenticSpace**是**AgenticFS**中为**单个Agent终端用户**分配的**独立工作空间**，支持**容量配额**、**文件数配额**、**访问隔离**与**性能隔离**
2. 本文介绍如何通过**控制台**或**OpenAPI**<u>创建、修改、删除</u>**AgenticSpace**，以及在ECS或**Agent Sandbox**中挂载**AgenticSpace**

## 使用限制

1. 已创建AgenticFS文件系统，当前AgenticFS仅支持白名单创建，如需使用，请提交工单申请
2. **单个AgenticFS**最多**50万个AgenticSpace**；单个**AgenticSpace**上限**1 PiB容量**、**10亿文件**
3. **路径**不支持**重命名**、**软链接**，不支持AgenticSpace**嵌套**
4. 仅支持**NFS v3（Linux）**，不支持**SMB**与**Windows**
   - 支持**ECS**、**ACS Agent Sandbox**等支持**NFS v3**挂载的**Linux计算节点**

## 创建 AgenticSpace

> 支持**控制台**和**OpenAPI**两种方式，创建时需指定**路径**与**配额**，下表为关键参数

| 参数               | 必填 | 说明                                                         |
| ------------------ | ---- | ------------------------------------------------------------ |
| **FileSystemPath** | 是   | AgenticSpace路径，例如 `/workspace_user001`                  |
| **SizeLimit**      | 是   | **配额总容量限制**，单位：**Byte**<br />取值范围<br />**最小值**：10,737,418,240（**10 GiB**）<br />**最大值**：1,099,511,627,776,000（**1024000 GiB**）<br />**步长**：107,3741,824（**1 GiB**） |
| **FileCountLimit** | 是   | **配额文件数量限制**，取值范围：<br />最小值：**10,000** - **1万**<br />最大值：**1,000,000,000** - **10亿** |

### 方式一：控制台

1. 登录NAS控制台，进入目标AgenticFS文件系统的**AgenticSpace**页签
2. 单击创建AgenticSpace，按上表填写参数后提交

### 方式二：OpenAPI

> 调用**CreateAgenticSpace**接口，请求示例

```
POST /AgenticSpace/Create HTTP/1.1
Host: nas.aliyuncs.com
Content-Type: application/json

{
"FileSystemId":"031*******",
"FileSystemPath":"/test5/",
"RegionId":"cn-shanghai",
"Azone":"cn-shanghai-f",
"Quota.SizeLimit":"110595407872",
"Quota.FileCountLimit":100004
}
```

## 查看与修改配额

1. 在**AgenticSpace**列表中可查看**目录路径**、**可用区**、**容量配额GiB/当前容量GiB**、**文件数配额/当前文件数**、**创建时间**等字段
2. 单击目标行操作列的编辑调整**容量**限制、**文件数**限制；也可调用**SetAgenticSpaceQuota**接口
3. 新配额必须**高于**当前已使用值，否则修改失败

## 接入点（AccessPoint）

> 接入点是**AgenticFS**的**NFS**协议访问入口，承担**挂载寻址**、**权限校验**与**流量隔离**，AgenticFS的接入点支持两种**粒度**

1. **AgenticFS粒度**
   - 接入点指向**AgenticFS根**，用于**平台运维**、**批量管理AgenticSpace**等**可信**场景
   - 当前版本**AgenticFS根目录暂不支持挂载**，仅用于**OpenAPI**管控调用
2. **AgenticSpace粒度**
   - 接入点指向**单个AgenticSpace**，挂载后**视图**被限制在**对应AgenticSpace内**，是**Agent会话**拉起的**标准入口**

> 接入点支持基于**RAM**的访问策略，用于控制**不同应用**、**不同RAM用户/角色**对**AgenticFS**与**AgenticSpace**的访问范围，建议为**RAM子账号**授予 **nas:ClientMount** 权限，并通过 **nas:AccessPointArn** **条件限定**可挂载的**接入点**，示例策略：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "nas:ClientMount"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "nas:AccessPointArn": "<接入点ARN>"
        }
      }
    }
  ]
}
```

> 重要参数说明请参见下表

| 参数               | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| nas:AccessPointArn | 接入点的ARN，例如，`acs:nas:cn-shanghai:117848947****:accesspoint/ap-****`，您可以在接入点的基本信息页面中获取**ARN** |

> 建议为**不同Agent应用**、**不同终端用户**使用**相互隔离**的**RAM角色与接入点**，避免**越权访问**其他AgenticSpace

## 挂载AgenticSpace

1. AgenticSpace支持两种典型挂载场景：在**ECS**上通过**ALINAS客户端**直接挂载，或在**ACS**集群中通过**Agent Sandbox**（**SandboxClaim**）以**CSI**方式挂载
2. 两种场景均需先完成上文 接入点（**AccessPoint**） 的**RAM**授权，且**计算节点**需与**AgenticFS接入点**在**同一VPC**
3. 说明当前版本仅支持挂载AgenticSpace，**AgenticFS根目录暂不支持挂载**

### 场景一：在ECS上挂载

1. 在**AgenticSpace列表**中获取**挂载地址**
   - **挂载地址**即对应**AgenticSpace接入点**的**NFS域名**，挂载后**视图**自动**限制**在**该AgenticSpace内**
2. 在ECS（Linux）安装**NFS客户端**

```
# CentOS / Alibaba Cloud Linux
sudo yum install -y nfs-utils

# Ubuntu / Debian
sudo apt-get install -y nfs-common
```

3. 配置**RAM AK/SK**凭证（用于**接入点鉴权**）

```
sudo mkdir -p /etc/aliyun/alinas
sudo tee /etc/aliyun/alinas/.credentials > /dev/null <<EOF
[NASCredentials]
accessKeyID = <子账号AK>
accessKeySecret = <子账号SK>
EOF
```

4. 执行挂载命令，并通过 `df -h` 验证

```
sudo mount -t alinas -o tls,vers=3,ram <挂载地址>:/ /mnt/agenticspace
```

### 场景二：在Agent Sandbox中通过CSI挂载

适用于在**ACS**集群中通过**Agent Sandbox**（SandboxSet/SandboxClaim）拉起的**容器化Agent实例**，将**AgenticSpace**作为**持久化Workspace**挂载到**Sandbox容器**

#### 前置条件

1. 已开通容器计算服务ACS并创建**ACS集群**，集群与**AgenticFS接入点**在**同一VPC**
2. 已在**ACS**集群安装 `ack-agent-sandbox-controller` 组件，并通过 **SandboxSet** 完成**沙箱预热池**配置
3. 用于挂载的**RAM子账号**已按上文接入点（**AccessPoint**）中的**策略**示例完成**授权**

#### 步骤一：创建Secret与PV

> 预计 8.17 支持 **STS**

将 **RAM 子账号AK/SK**写入**Secret**，并创建指向**AgenticSpace接入点**的**PV**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nas-secret
  namespace: sandbox-system
stringData:
  akId: <子账号AK>
  akSecret: <子账号SK>

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nas-agenticspace-pv
  labels:
    alicloud-pvname: nas-agenticspace-pv
spec:
  capacity:
    storage: 500Gi
  accessModes:
    - ReadWriteMany
  csi:
    driver: nasplugin.csi.alibabacloud.com
    volumeHandle: nas-agenticspace-pv
    nodePublishSecretRef:
      name: nas-secret
      namespace: sandbox-system
    volumeAttributes:
      server: "<AgenticSpace接入点域名>"
      path: "/"
      vers: "3"
      mountprotocol: "alinas"
      filesystemtype: "standard"
  mountOptions:
  - tls,ram
  - vers=3
```

> 应用后执行 kubectl get pv，确认PV状态为 **Available**

#### 步骤二：通过SandboxClaim挂载

> 在**SandboxClaim**中通过 **dynamicVolumesMount** 引用上一步创建的**PV**，并指定**容器内挂载路径**

```yaml
apiVersion: agents.kruise.io/v1alpha1
kind: SandboxClaim
metadata:
  name: code-interpreter-claim
  namespace: default
spec:
  templateName: code-interpreter    # SandboxSet 名称
  replicas: 1
  claimTimeout: 5m
  ttlAfterCompleted: 15m
  dynamicVolumesMount:
  - pvName: nas-agenticspace-pv
    mountPath: "/workspace"
```

#### 步骤三：验证挂载结果

> 查看**SandboxClaim**对应的Pod，进入容器验证**挂载路径**

```
kubectl get sandbox -n default -l agents.kruise.io/claim-name=code-interpreter-claim
kubectl -n default exec -it <sandbox-pod-name> -- sh
df -h | grep workspace
```

## 删除AgenticSpace

1. 删除前需卸载所有接入点并备份数据，**删除操作不可恢复**
2. 在AgenticSpace管理列表中单击目标行**操作**列的**删除**，或调用**DeleteAgenticSpace**接口
   - 删除完成后，**原路径**可**重新创建AgenticSpace**

## 常见问题

> 挂载时返回 access denied？

检查**ECS**与**AgenticFS**是否在**同一VPC**

> 写入返回 no space？

已达到**容量**或**文件数**配额上限，通过**修改配额**扩容，或**清理**AgenticSpace中的文件

> 是否支持**跨AgenticFS迁移AgenticSpace**？

当前版本**不支持**，需先创建新AgenticSpace，再通过**应用层复制数据**

> 能否使用**SMB**或Windows访问？

不支持，AgenticFS当前仅支持**NFS v3**协议与**Linux**客户端

