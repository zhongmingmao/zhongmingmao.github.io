---
title: Go Engineering - Specification - Open Source + Document + Version
mathjax: false
date: 2022-03-19 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 规范

| 分类         | 规范         |
| ------------ | ------------ |
| 非编码类规范 | **开源规范** |
|              | **文档规范** |
|              | **版本规范** |
|              | 提交规范     |
|              | 发布规范     |
| 编码类规范   | 目录规范     |
|              | 代码规范     |
|              | 接口规范     |
|              | 日志规范     |
|              | 错误码规范   |

<!-- more -->

# 开源规范

## 开源协议

> Apache 是对**商业应用**友好的协议，大公司的开源项目通常会采用 **Apache 2.0** 开源协议

![image-20220322210135570](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220322210135570.png)

## 开源项目

1. 较高的**单元覆盖率**
2. 代码库中不能包含**敏感信息**
3. **及时**处理 PR、ISSUE 等
4. **持续**更新和 Bug Fix

# 文档规范

> 文档属于**软件交付**的一个重要组成部分

## README

```markdown
# 项目名称

## 功能特性

## 软件架构(可选)

## 快速开始
### 依赖检查
### 构建
### 运行

## 使用指南

## 如何贡献

## 社区(可选)

## 关于作者

## 谁在用(可选)

## 许可证
```

## 项目文档

```
docs
├── devel                            # 开发文档，可以提前规划好，英文版文档和中文版文档
│   ├── en-US/                       # 英文版文档，可以根据需要组织文件结构
│   └── zh-CN                        # 中文版文档，可以根据需要组织文件结构
│       └── development.md           # 开发手册，可以说明如何编译、构建、运行项目
├── guide                            # 用户文档
│   ├── en-US/                       # 英文版文档，可以根据需要组织文件结构
│   └── zh-CN                        # 中文版文档，可以根据需要组织文件结构
│       ├── api/                     # API文档
│       ├── best-practice            # 最佳实践，存放一些比较重要的实践文章
│       │   └── authorization.md
│       ├── faq                      # 常见问题
│       │   ├── iam-apiserver
│       │   └── installation
│       ├── installation             # 安装文档
│       │   └── installation.md
│       ├── introduction/            # 产品介绍文档
│       ├── operation-guide          # 操作指南，里面可以根据RESTful资源再划分为更细的子目录，用来存放系统核心/全部功能的操作手册
│       │   ├── policy.md
│       │   ├── secret.md
│       │   └── user.md
│       ├── quickstart               # 快速入门
│       │   └── quickstart.md
│       ├── README.md                # 用户文档入口文件
│       └── sdk                      # SDK文档
│           └── golang.md
└── images                           # 图片存放目录
    └── 部署架构v1.png
```

## API 文档

### 编写方式

> Markdown 为最优选择（个人）

![image-20220322213120107](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220322213120107.png)

### 组成

1. 介绍文档
2. 变更历史文档
3. 通用说明
4. 数据结构说明
5. 错误码描述
6. API 接口文档
   - 接口描述
   - 请求方法：POST /v1/users
   - 输入参数：Header、Query、Body、Path
   - 输出参数
   - 请求示例

| Markdown                              | Desc                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| README.md                             | 介绍文档                                                     |
| CHANGELOG.md                          | 变更历史文档                                                 |
| generic.md                            | 通用的请求参数、返回参数、认证方法和请求方法等               |
| struct.md                             | 数据结构文档，会在 user.md、secret.md、policy.md 中被引用    |
| user.md<br />secret.md<br />policy.md | API 接口文档<br />相同 REST 资源的接口会放在同一个文件中，并以 REST 资源命名文档文件名 |
| error_code.md                         | 错误码描述，通常由程序自动生成                               |

# 版本规范

## 语义化版本规范

> 语义化版本规范：SemVer，Semantic Versioning，

1. **主版本号.次版本号.修订号**（X.Y.Z）：X、Y、Z 为**非负整数**，禁止在数字前面**补零**
   - 主版本号（**MAJOR**）：做了**不兼容**的 API 修改
   - 次版本号（**MINOR**）：做了**向下兼容**的**功能性**新增和修改，**偶数**为**稳定**版本，**奇数**为**开发**版本
   - 修订号（**PATCH**）：做了**向下兼容**的 **Bug Fix**
2. `X.Y.Z[-先行版本号][+编译版本号]`
   - 先行版本号：该版本**不稳定**，可能存在兼容性问题，格式为`X.Y.Z-[一连串以句点分隔的标识符]`
     - 1.0.0-alpha
     - 1.0.0-alpha.1
     - 1.0.0-0.3.7
     - 1.0.0-x.7.z.92
   - 编译版本号：一般是编译器在编译过程中**自动生成**的
     - 1.0.0-alpha+001
     - 1.0.0+20130313144700
     - 1.0.0-beta+exp.sha.5114f85
   - 先行版本号和编译版本号，只能是**字母+数字**

![image-20220322220814529](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220322220814529.png)

![image-20220322221018164](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220322221018164.png)

## 核心规范

1. 标记版本号的软件发行后，**禁止改变**该版本软件的内容，任何修改都必须以**新版本**发行
2. **主版本号为零**的软件处于**开发初始阶段**，公共 API **不稳定**，第一个稳定版本为 **1.0.0**
3. **修订号 Z**（x.y.Z | **x > 0**）必须在做了**向下兼容**的 **Bug Fix** 时才递增
4. **次版本号 Y**（x.Y.z | **x > 0**）必须在有**向下兼容的新功能**出现时递增，每次次版本号递增时，修订号必须**归零**
   - 任何公共 API 的功能被标记为**弃用**时也必须递增
5. **主版本号 X**（X.y.z | **x > 0**）必须在有**任何不兼容的修改**被加入公共 API 时递增
   - 每当主版本号递增时，次版本号和修订号必须**归零**

## 实践经验

1. 使用 **0.1.0** 作为第一个开发版本号，后续的每次**发行**时递增**次版本号**
2. 版本稳定，并第一次对外发布时，定为 **1.0.0**
3. 严格按照 Angular commit message 规范提交代码
   - **fix** 类型的 commit，**修订号+1**
   - **feat** 类型的 commit，**次版本号+1**
   - **BREAKING CHANGE** 的 commit，**主版本号+1**
