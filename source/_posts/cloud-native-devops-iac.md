---
title: DevOps - IaC
mathjax: false
date: 2023-02-05 00:06:25
cover: https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/iac.png
categories:
  - Cloud Native
  - DevOps
tags:
  - Cloud Native
  - Kubernetes
  - Infrastructure
  - Architecture
  - DevOps
  - IaC
  - Terraform
  - Crossplane
  - Pulumi
  - Argo CD
  - VPC
---

# IaC

## 概述

1. 使用`代码`定义基础设施（`声明式`：云资源、配置、工具安装）
2. 借助 `Git` 实现对基础设施的版本控制
3. `有状态` - Diff + Patch

<!-- more -->

## 优势

1. `幂等`
2. `版本控制`
3. 使用 `Git` 进行`变更管理`（批准、安全检查、自动化测试）
4. `清晰`的变更行为
5. `快速`配置基础设施

## 能力

1. 提供以`编码工作流`来创建基础设施
2. 更改或者更新现有的基础设施
3. `安全`地更改基础设施
4. 与 `CICD` 工具集成，形成 `DevOps` 工作流
5. 提供`可复用`的模块，方便`协作`和`共享`
6. 实施`安全策略`和`生产标准`
7. 实现`基础设施`的`团队协作`

## 工具

1. *Terraform*
2. Pulumi
3. Crossplane

# Terraform

## 核心架构

![ ](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/terraform-architecture-diagram.png)

1. 全新的配置语言 `HCL` - HashiCorp configuration language
2. `可执行的文档`
3. 人类和机器可读
4. 学习成本低
5. 测试、共享、重用、自动化
6. 适用于`几乎所有`云厂商

## HCL

> 最终转换为 `JSON` 对象，再与云厂商交互

![config-hell](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/config-hell.jpeg)

> JSON

```json
{
  "io_mode": "async",
  "service": {
    "http": {
      "web_proxy": {
        "listen_addr": "127.0.0.1:8080",
        "process": {
          "main": {
            "command": ["/usr/local/bin/awesome-app", "server"]
          },
          "mgmt": {
            "command": ["/usr/local/bin/awesome-app", "mgmt"]
          },
        }
      }
    }
  }
}
```

> HCL

```json
io_mode = "async"

service "http" "web_proxy" {
  listen_addr = "127.0.0.1:8080"
  
  process "main" {
    command = ["/usr/local/bin/awesome-app", "server"]
  }

  process "mgmt" {
    command = ["/usr/local/bin/awesome-app", "mgmt"]
  }
}
```

## 使用范式

> Terraform + Ansible

![terraform-ansible](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/terraform-ansible.png)

> Terraform + Kubernetes

![terraform-k8s](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/terraform-k8s.webp)

## Provider 版本控制

1. 建议`固定版本`，防止上游更新导致异常
2. 默认使用最新版本
3. 版本操作符：=、!=、`\>`、>=、<、<=、`~>`

> 推荐使用`~>`（`悲观约束符`，允许小版本更新，不允许大版本更新）

```json
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## VM

### AWS

```json
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-west-2"
}

data "aws_ami" "this" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
  filter {
    name   = "name"
    values = ["al2023-ami-2023*"]
  }
}

resource "aws_instance" "this" {
  ami = data.aws_ami.this.id
  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price = 0.005
    }
  }
  instance_type = "t4g.nano"
  tags = {
    Name = "test-spot"
  }
}
```

```
$ terraform init

$ terraform plan

$ terraform apply -auto-approve

$ terraform destroy -auto-approve
```

### Tencent

```json
terraform {
  required_providers {
    tencentcloud = {
      source = "tencentcloudstack/tencentcloud"
    }
  }
}

# Configure the TencentCloud Provider
provider "tencentcloud" {
  secret_id  = "my-secret-id"
  secret_key = "my-secret-key"
  region = "ap-guangzhou"
}

# Get availability zones
data "tencentcloud_availability_zones_by_product" "default" {
  product = "cvm"
}

# Get availability images
data "tencentcloud_images" "default" {
  image_type = ["PUBLIC_IMAGE"]
  os_name    = "ubuntu"
}

# Get availability instance types
data "tencentcloud_instance_types" "default" {
  # 机型族
  filter {
    name   = "instance-family"
    values = ["S5"]
  }

  cpu_core_count = 2
  memory_size    = 2
}

# Create a web server
resource "tencentcloud_instance" "web" {
  depends_on                 = [tencentcloud_security_group_lite_rule.default]
  instance_name              = "web server"
  availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
  image_id                   = data.tencentcloud_images.default.images.0.image_id
  instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
  system_disk_type           = "CLOUD_PREMIUM"
  system_disk_size           = 50
  allocate_public_ip         = true
  internet_max_bandwidth_out = 20
  instance_charge_type       = "SPOTPAID"
  orderly_security_groups    = [tencentcloud_security_group.default.id]
  count                      = 1
}

# Create security group
resource "tencentcloud_security_group" "default" {
  name        = "web accessibility"
  description = "make it accessible for both production and stage ports"
}

# Create security group rule allow ssh request
resource "tencentcloud_security_group_lite_rule" "default" {
  security_group_id = tencentcloud_security_group.default.id
  ingress = [
    "ACCEPT#0.0.0.0/0#22#TCP",
    "ACCEPT#0.0.0.0/0#6443#TCP",
  ]

  egress = [
    "ACCEPT#0.0.0.0/0#ALL#ALL"
  ]
}
```

#### terraform init

```
$ terraform init

Initializing the backend...

Initializing provider plugins...
- Reusing previous version of tencentcloudstack/tencentcloud from the dependency lock file
- Installing tencentcloudstack/tencentcloud v1.81.23...
- Installed tencentcloudstack/tencentcloud v1.81.23 (signed by a HashiCorp partner, key ID 84F69E1C1BECF459)

Partner and community providers are signed by their developers.
If you'd like to know more about provider signing, you can read about it here:
https://www.terraform.io/docs/cli/plugins/signing.html

Terraform has made some changes to the provider dependency selections recorded
in the .terraform.lock.hcl file. Review those changes and commit them to your
version control system if they represent changes you intended to make.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

```
$ tree -a
.
|-- cvm.tf
|-- .terraform
|   `-- providers
|       `-- registry.terraform.io
|           `-- tencentcloudstack
|               `-- tencentcloud
|                   `-- 1.81.23
|                       `-- linux_arm64
|                           |-- CHANGELOG.md
|                           |-- LICENSE
|                           |-- README.md
|                           `-- terraform-provider-tencentcloud_v1.81.23
`-- .terraform.lock.hcl
```

> .terraform.lock.hcl

```json
# This file is maintained automatically by "terraform init".
# Manual edits may be lost in future updates.

provider "registry.terraform.io/tencentcloudstack/tencentcloud" {
  version = "1.81.23"
  hashes = [
    "h1:V6PA8E+CURfBlTqCr34HI6atLpibDw8fHvf9DgMQwkk=",
    "h1:kFMUXXC9lTl/Dp+mCpcRi3tmOof/ykHHJyrBN7OdfuA=",
    "zh:01e87a746857c29bfc3bee2292144e8a15b413530b44ed2fe2fcc63604a6c3a5",
    "zh:1b8c92e81aee582afc19f4c0ba45a08c5af7eccdb20bf27ace6b6630a2e239fc",
    "zh:2494cf7ba59ba8cbf7785c2bf0424ce0d4ca171d9b58a8925f4ac0019fa99fab",
    "zh:27996988aa160a1e3c7f62a7f044ab9980bfe4142282fc3e9fc335770a8e0d8a",
    "zh:2d27ab85fb5c28c6e489030c9010402dfcbf874d214aeb202ebcb89a468a8f5d",
    "zh:3e98bb0de64b980df294223a76ea714dfeec25e0a42c0e22f098dba9c95a13ad",
    "zh:49722329b28510f085208481cc0278b462f27feaa5995323b31428cca05d1d15",
    "zh:6796709cc6e07270718c2c3fe38b12fff137db64ac38751cb7d76c8bffe336f6",
    "zh:6d0c10a96e3e733769e0e5c7a800afbd2be80b60053d6cdba5f5b3a774d9155a",
    "zh:7d506483db03bf353eac6776c8cca6efd00b3e3065c639f5947b2b4b397f06c9",
    "zh:b05a423dcc249b28d3600dec0ddeb388a87d9c9ba9415abe4dbd0fdbee04e7b9",
    "zh:d543a61d89054fd00a4cb5659591afae73c7d8b712f389a80ad68d572f44ea10",
    "zh:d9cf82a72a4f1ca832910eb1261810b07921212153b8f509c0f1bd0bcc92badb",
    "zh:de6d1deb6d752c77f5a2e52109dd138645e3cee53939152cafee5953855cc667",
  ]
}
```

#### terraform plan

```
$ terraform plan
data.tencentcloud_instance_types.default: Reading...
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 1s [id=556068968]
data.tencentcloud_images.default: Read complete after 2s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 3s [id=3046689892]

Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # tencentcloud_instance.web[0] will be created
  + resource "tencentcloud_instance" "web" {
      + allocate_public_ip                      = true
      + availability_zone                       = "ap-guangzhou-6"
      + create_time                             = (known after apply)
      + disable_api_termination                 = false
      + disable_monitor_service                 = false
      + disable_security_service                = false
      + expired_time                            = (known after apply)
      + force_delete                            = false
      + id                                      = (known after apply)
      + image_id                                = "img-487zeit5"
      + instance_charge_type                    = "SPOTPAID"
      + instance_charge_type_prepaid_renew_flag = (known after apply)
      + instance_name                           = "web server"
      + instance_status                         = (known after apply)
      + instance_type                           = "S5.MEDIUM2"
      + internet_charge_type                    = (known after apply)
      + internet_max_bandwidth_out              = 20
      + key_ids                                 = (known after apply)
      + key_name                                = (known after apply)
      + orderly_security_groups                 = (known after apply)
      + private_ip                              = (known after apply)
      + project_id                              = 0
      + public_ip                               = (known after apply)
      + running_flag                            = true
      + security_groups                         = (known after apply)
      + subnet_id                               = (known after apply)
      + system_disk_id                          = (known after apply)
      + system_disk_size                        = 50
      + system_disk_type                        = "CLOUD_PREMIUM"
      + vpc_id                                  = (known after apply)
    }

  # tencentcloud_security_group.default will be created
  + resource "tencentcloud_security_group" "default" {
      + description = "make it accessible for both production and stage ports"
      + id          = (known after apply)
      + name        = "web accessibility"
      + project_id  = (known after apply)
    }

  # tencentcloud_security_group_lite_rule.default will be created
  + resource "tencentcloud_security_group_lite_rule" "default" {
      + egress            = [
          + "ACCEPT#0.0.0.0/0#ALL#ALL",
        ]
      + id                = (known after apply)
      + ingress           = [
          + "ACCEPT#0.0.0.0/0#22#TCP",
          + "ACCEPT#0.0.0.0/0#6443#TCP",
        ]
      + security_group_id = (known after apply)
    }

Plan: 3 to add, 0 to change, 0 to destroy.

─────────────────────────────────────────────────────────────────────────────

Note: You didn't use the -out option to save this plan, so Terraform can't
guarantee to take exactly these actions if you run "terraform apply" now.
```

![image-20240225182940259](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225182940259.png)

#### terraform apply

```json
$ terraform apply -auto-approve
data.tencentcloud_instance_types.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Reading...
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 1s [id=556068968]
data.tencentcloud_images.default: Read complete after 1s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 2s [id=3046689892]

Terraform used the selected providers to generate the following execution plan. Resource
actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # tencentcloud_instance.web[0] will be created
  + resource "tencentcloud_instance" "web" {
      + allocate_public_ip                      = true
      + availability_zone                       = "ap-guangzhou-6"
      + create_time                             = (known after apply)
      + disable_api_termination                 = false
      + disable_monitor_service                 = false
      + disable_security_service                = false
      + expired_time                            = (known after apply)
      + force_delete                            = false
      + id                                      = (known after apply)
      + image_id                                = "img-487zeit5"
      + instance_charge_type                    = "SPOTPAID"
      + instance_charge_type_prepaid_renew_flag = (known after apply)
      + instance_name                           = "web server"
      + instance_status                         = (known after apply)
      + instance_type                           = "S5.MEDIUM2"
      + internet_charge_type                    = (known after apply)
      + internet_max_bandwidth_out              = 20
      + key_ids                                 = (known after apply)
      + key_name                                = (known after apply)
      + orderly_security_groups                 = (known after apply)
      + private_ip                              = (known after apply)
      + project_id                              = 0
      + public_ip                               = (known after apply)
      + running_flag                            = true
      + security_groups                         = (known after apply)
      + subnet_id                               = (known after apply)
      + system_disk_id                          = (known after apply)
      + system_disk_size                        = 50
      + system_disk_type                        = "CLOUD_PREMIUM"
      + vpc_id                                  = (known after apply)
    }

  # tencentcloud_security_group.default will be created
  + resource "tencentcloud_security_group" "default" {
      + description = "make it accessible for both production and stage ports"
      + id          = (known after apply)
      + name        = "web accessibility"
      + project_id  = (known after apply)
    }

  # tencentcloud_security_group_lite_rule.default will be created
  + resource "tencentcloud_security_group_lite_rule" "default" {
      + egress            = [
          + "ACCEPT#0.0.0.0/0#ALL#ALL",
        ]
      + id                = (known after apply)
      + ingress           = [
          + "ACCEPT#0.0.0.0/0#22#TCP",
          + "ACCEPT#0.0.0.0/0#6443#TCP",
        ]
      + security_group_id = (known after apply)
    }

Plan: 3 to add, 0 to change, 0 to destroy.
tencentcloud_security_group.default: Creating...
tencentcloud_security_group.default: Creation complete after 1s [id=sg-2kejmpxj]
tencentcloud_security_group_lite_rule.default: Creating...
tencentcloud_security_group_lite_rule.default: Creation complete after 0s [id=sg-2kejmpxj]
tencentcloud_instance.web[0]: Creating...
tencentcloud_instance.web[0]: Still creating... [10s elapsed]
tencentcloud_instance.web[0]: Still creating... [20s elapsed]
tencentcloud_instance.web[0]: Still creating... [30s elapsed]
tencentcloud_instance.web[0]: Creation complete after 34s [id=ins-lpfh806e]

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.
```

```
$ tree -a
.
|-- cvm.tf
|-- .terraform
|   `-- providers
|       `-- registry.terraform.io
|           `-- tencentcloudstack
|               `-- tencentcloud
|                   `-- 1.81.23
|                       `-- linux_arm64
|                           |-- CHANGELOG.md
|                           |-- LICENSE
|                           |-- README.md
|                           `-- terraform-provider-tencentcloud_v1.81.23
|-- .terraform.lock.hcl
|-- terraform.tfstate
`-- terraform.tfstate.backup
```

> terraform.tfstate - 记录所有状态信息（包括敏感信息），随着 terraform destroy 而清空

```json
{
  "version": 4,
  "terraform_version": "1.7.4",
  "serial": 15,
  "lineage": "8348f63a-7e72-e08d-c0b7-ac0c8613d6b3",
  "outputs": {},
  "resources": [
    {
      "mode": "data",
      "type": "tencentcloud_availability_zones_by_product",
      "name": "default",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "id": "556068968",
            "include_unavailable": null,
            "name": null,
            "product": "cvm",
            "result_output_file": null,
            "zones": [
              {
                "description": "Guangzhou Zone 6",
                "id": "100006",
                "name": "ap-guangzhou-6",
                "state": "AVAILABLE"
              },
              {
                "description": "Guangzhou Zone 7",
                "id": "100007",
                "name": "ap-guangzhou-7",
                "state": "AVAILABLE"
              }
            ]
          },
          "sensitive_attributes": []
        }
      ]
    },
    {
      "mode": "data",
      "type": "tencentcloud_images",
      "name": "default",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "id": "4102863276",
            "image_id": null,
            "image_name_regex": null,
            "image_type": [
              "PUBLIC_IMAGE"
            ],
            "images": [
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 22.04 LTS 64bit",
                "image_id": "img-487zeit5",
                "image_name": "Ubuntu Server 22.04 LTS 64bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 22.04 LTS 64bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 20.04 LTS 64bit",
                "image_id": "img-22trbn9x",
                "image_name": "Ubuntu Server 20.04 LTS 64bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 20.04 LTS 64bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 20.04 LTS 64bit GRID11.1",
                "image_id": "img-j10l2cnz",
                "image_name": "Ubuntu Server 20.04 LTS 64bit GRID11.1",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 20.04 LTS 64bit GRID11.1",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "arm",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu 20.04(arm64)",
                "image_id": "img-2eokmhf5",
                "image_name": "Ubuntu 20.04(arm64)",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu 20.04(arm64)",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 18.04 LTS 64bit",
                "image_id": "img-pi0ii46r",
                "image_name": "Ubuntu Server 18.04 LTS 64bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 18.04 LTS 64bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "arm",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu 18.04(arm64)",
                "image_id": "img-9eh8c1p1",
                "image_name": "Ubuntu 18.04(arm64)",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu 18.04(arm64)",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 16.04 LTS 64bit",
                "image_id": "img-pyqx34y1",
                "image_name": "Ubuntu Server 16.04 LTS 64bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 16.04 LTS 64bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "i386",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 16.04 LTS 32bit",
                "image_id": "img-8u6dn6p1",
                "image_name": "Ubuntu Server 16.04 LTS 32bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 16.04 LTS 32bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 14.04 LTS 64bit",
                "image_id": "img-3wnd9xpl",
                "image_name": "Ubuntu Server 14.04 LTS 64bit",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 14.04 LTS 64bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "i386",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 14.04 LTS 32bit",
                "image_id": "img-qpxvpujt",
                "image_name": "Ubuntu Server 14.04 LTS 32bit",
                "image_size": 50,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 14.04 LTS 32bit",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": false,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 20.04 LTS 64bit GRID16.2",
                "image_id": "img-rx55p5nv",
                "image_name": "Ubuntu Server 20.04 LTS 64bit GRID16.2",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 20.04 LTS 64bit GRID16.2",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              },
              {
                "architecture": "x86_64",
                "created_time": "",
                "image_creator": "",
                "image_description": "Ubuntu Server 22.04 LTS 64bit GRID16.2",
                "image_id": "img-fipweiwz",
                "image_name": "Ubuntu Server 22.04 LTS 64bit GRID16.2",
                "image_size": 20,
                "image_source": "OFFICIAL",
                "image_state": "NORMAL",
                "image_type": "PUBLIC_IMAGE",
                "os_name": "Ubuntu Server 22.04 LTS 64bit GRID16.2",
                "platform": "Ubuntu",
                "snapshots": [],
                "support_cloud_init": true,
                "sync_percent": 0
              }
            ],
            "instance_type": null,
            "os_name": "ubuntu",
            "result_output_file": null
          },
          "sensitive_attributes": []
        }
      ]
    },
    {
      "mode": "data",
      "type": "tencentcloud_instance_types",
      "name": "default",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "availability_zone": null,
            "cpu_core_count": 2,
            "exclude_sold_out": false,
            "filter": [
              {
                "name": "instance-family",
                "values": [
                  "S5"
                ]
              }
            ],
            "gpu_core_count": null,
            "id": "3046689892",
            "instance_types": [
              {
                "availability_zone": "ap-guangzhou-6",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "PREPAID",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              },
              {
                "availability_zone": "ap-guangzhou-7",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "PREPAID",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              },
              {
                "availability_zone": "ap-guangzhou-6",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "POSTPAID_BY_HOUR",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              },
              {
                "availability_zone": "ap-guangzhou-7",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "POSTPAID_BY_HOUR",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              },
              {
                "availability_zone": "ap-guangzhou-6",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "SPOTPAID",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              },
              {
                "availability_zone": "ap-guangzhou-7",
                "cpu_core_count": 2,
                "family": "S5",
                "gpu_core_count": 0,
                "instance_charge_type": "SPOTPAID",
                "instance_type": "S5.MEDIUM2",
                "memory_size": 2,
                "status": "SELL"
              }
            ],
            "memory_size": 2,
            "result_output_file": null
          },
          "sensitive_attributes": []
        }
      ]
    },
    {
      "mode": "managed",
      "type": "tencentcloud_instance",
      "name": "web",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "index_key": 0,
          "schema_version": 0,
          "attributes": {
            "allocate_public_ip": true,
            "availability_zone": "ap-guangzhou-6",
            "bandwidth_package_id": null,
            "cam_role_name": "",
            "cdh_host_id": null,
            "cdh_instance_type": null,
            "create_time": "2022-02-25T10:33:41Z",
            "data_disks": [],
            "disable_api_termination": false,
            "disable_monitor_service": false,
            "disable_security_service": false,
            "expired_time": "",
            "force_delete": false,
            "hostname": null,
            "id": "ins-lpfh806e",
            "image_id": "img-487zeit5",
            "instance_charge_type": "SPOTPAID",
            "instance_charge_type_prepaid_period": null,
            "instance_charge_type_prepaid_renew_flag": "",
            "instance_count": null,
            "instance_name": "web server",
            "instance_status": "RUNNING",
            "instance_type": "S5.MEDIUM2",
            "internet_charge_type": "TRAFFIC_POSTPAID_BY_HOUR",
            "internet_max_bandwidth_out": 20,
            "keep_image_login": null,
            "key_ids": [],
            "key_name": "",
            "orderly_security_groups": [
              "sg-2kejmpxj"
            ],
            "password": null,
            "placement_group_id": null,
            "private_ip": "172.16.0.16",
            "project_id": 0,
            "public_ip": "43.136.79.182",
            "running_flag": true,
            "security_groups": [
              "sg-2kejmpxj"
            ],
            "spot_instance_type": null,
            "spot_max_price": null,
            "stopped_mode": null,
            "subnet_id": "subnet-k4efzogs",
            "system_disk_id": "disk-l83hv6we",
            "system_disk_size": 50,
            "system_disk_type": "CLOUD_PREMIUM",
            "tags": null,
            "user_data": null,
            "user_data_raw": null,
            "vpc_id": "vpc-bt2uih1l"
          },
          "sensitive_attributes": [],
          "private": "bnVsbA==",
          "dependencies": [
            "data.tencentcloud_availability_zones_by_product.default",
            "data.tencentcloud_images.default",
            "data.tencentcloud_instance_types.default",
            "tencentcloud_security_group.default",
            "tencentcloud_security_group_lite_rule.default"
          ]
        }
      ]
    },
    {
      "mode": "managed",
      "type": "tencentcloud_security_group",
      "name": "default",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "description": "make it accessible for both production and stage ports",
            "id": "sg-2kejmpxj",
            "name": "web accessibility",
            "project_id": 0,
            "tags": null
          },
          "sensitive_attributes": [],
          "private": "bnVsbA=="
        }
      ]
    },
    {
      "mode": "managed",
      "type": "tencentcloud_security_group_lite_rule",
      "name": "default",
      "provider": "provider[\"registry.terraform.io/tencentcloudstack/tencentcloud\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "egress": [
              "ACCEPT#0.0.0.0/0#ALL#ALL"
            ],
            "id": "sg-2kejmpxj",
            "ingress": [
              "ACCEPT#0.0.0.0/0#22#TCP",
              "ACCEPT#0.0.0.0/0#6443#TCP"
            ],
            "security_group_id": "sg-2kejmpxj"
          },
          "sensitive_attributes": [],
          "private": "bnVsbA==",
          "dependencies": [
            "tencentcloud_security_group.default"
          ]
        }
      ]
    }
  ],
  "check_results": null
}
```

![image-20240225183655086](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225183655086.png)

## 导入资源

> 适用场景

1. 资源一开始并不是由 Terraform 创建的
2. state 文件丢失，需要重新拉取真实的状态

> 导入的资源必须在 `Terraform Config` 中已定义

```
$ rm -rf terraform.tfstate*

$ tree -a
.
|-- cvm.tf
|-- .terraform
|   `-- providers
|       `-- registry.terraform.io
|           `-- tencentcloudstack
|               `-- tencentcloud
|                   `-- 1.81.23
|                       `-- linux_arm64
|                           |-- CHANGELOG.md
|                           |-- LICENSE
|                           |-- README.md
|                           `-- terraform-provider-tencentcloud_v1.81.23
`-- .terraform.lock.hcl

$ terraform import 'tencentcloud_instance.web[0]' ins-f5eay7pe
data.tencentcloud_availability_zones_by_product.default: Reading...
data.tencentcloud_instance_types.default: Reading...
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 0s [id=556068968]
data.tencentcloud_images.default: Read complete after 1s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 2s [id=3046689892]
tencentcloud_instance.web[0]: Importing from ID "ins-f5eay7pe"...
tencentcloud_instance.web[0]: Import prepared!
  Prepared tencentcloud_instance for import
tencentcloud_instance.web[0]: Refreshing state... [id=ins-f5eay7pe]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.

$ terraform state list
data.tencentcloud_availability_zones_by_product.default
data.tencentcloud_images.default
data.tencentcloud_instance_types.default
tencentcloud_instance.web[0]

$ terraform destroy -auto-approve
data.tencentcloud_instance_types.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Reading...
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 0s [id=556068968]
data.tencentcloud_images.default: Read complete after 1s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 2s [id=3046689892]
tencentcloud_instance.web[0]: Refreshing state... [id=ins-f5eay7pe]

Terraform used the selected providers to generate the following execution plan. Resource
actions are indicated with the following symbols:
  - destroy

Terraform will perform the following actions:

  # tencentcloud_instance.web[0] will be destroyed
  - resource "tencentcloud_instance" "web" {
      - allocate_public_ip         = true -> null
      - availability_zone          = "ap-guangzhou-6" -> null
      - create_time                = "2024-02-25T11:16:33Z" -> null
      - disable_api_termination    = false -> null
      - id                         = "ins-f5eay7pe" -> null
      - image_id                   = "img-487zeit5" -> null
      - instance_charge_type       = "SPOTPAID" -> null
      - instance_name              = "web server" -> null
      - instance_status            = "RUNNING" -> null
      - instance_type              = "S5.MEDIUM2" -> null
      - internet_charge_type       = "TRAFFIC_POSTPAID_BY_HOUR" -> null
      - internet_max_bandwidth_out = 20 -> null
      - key_ids                    = [] -> null
      - orderly_security_groups    = [
          - "sg-jjtwxgj3",
        ] -> null
      - private_ip                 = "172.16.0.6" -> null
      - project_id                 = 0 -> null
      - public_ip                  = "119.91.237.229" -> null
      - running_flag               = true -> null
      - security_groups            = [
          - "sg-jjtwxgj3",
        ] -> null
      - subnet_id                  = "subnet-k4efzogs" -> null
      - system_disk_id             = "disk-e36wihvw" -> null
      - system_disk_size           = 50 -> null
      - system_disk_type           = "CLOUD_PREMIUM" -> null
      - tags                       = {} -> null
      - vpc_id                     = "vpc-bt2uih1l" -> null
    }

Plan: 0 to add, 0 to change, 1 to destroy.
tencentcloud_instance.web[0]: Destroying... [id=ins-f5eay7pe]
tencentcloud_instance.web[0]: Destruction complete after 6s

Destroy complete! Resources: 1 destroyed.
```

```
$ terraform import 'tencentcloud_security_group.default' sg-jjtwxgj3
tencentcloud_security_group.default: Importing from ID "sg-jjtwxgj3"...
data.tencentcloud_instance_types.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Reading...
tencentcloud_security_group.default: Import prepared!
  Prepared tencentcloud_security_group for import
tencentcloud_security_group.default: Refreshing state... [id=sg-jjtwxgj3]
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 0s [id=556068968]
data.tencentcloud_images.default: Read complete after 1s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 1s [id=3046689892]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.

$ terraform state list
data.tencentcloud_availability_zones_by_product.default
data.tencentcloud_images.default
data.tencentcloud_instance_types.default
tencentcloud_security_group.default

$ terraform destroy -auto-approve
data.tencentcloud_instance_types.default: Reading...
tencentcloud_security_group.default: Refreshing state... [id=sg-jjtwxgj3]
data.tencentcloud_availability_zones_by_product.default: Reading...
data.tencentcloud_images.default: Reading...
data.tencentcloud_availability_zones_by_product.default: Read complete after 1s [id=556068968]
data.tencentcloud_images.default: Read complete after 1s [id=4102863276]
data.tencentcloud_instance_types.default: Read complete after 2s [id=3046689892]

Terraform used the selected providers to generate the following execution plan. Resource
actions are indicated with the following symbols:
  - destroy

Terraform will perform the following actions:

  # tencentcloud_security_group.default will be destroyed
  - resource "tencentcloud_security_group" "default" {
      - description = "make it accessible for both production and stage ports" -> null
      - id          = "sg-jjtwxgj3" -> null
      - name        = "web accessibility" -> null
      - project_id  = 0 -> null
      - tags        = {} -> null
    }

Plan: 0 to add, 0 to change, 1 to destroy.
tencentcloud_security_group.default: Destroying... [id=sg-jjtwxgj3]
tencentcloud_security_group.default: Destruction complete after 0s

Destroy complete! Resources: 1 destroyed.
```

## Operation

| Configuration | State        | Reality      | Operation    |
| ------------- | ------------ | ------------ | ------------ |
| cvm_instance  |              |              | Create       |
| cvm_instance  | cvm_instance |              | Create       |
| cvm_instance  | cvm_instance | cvm_instance | No Ops       |
|               | cvm_instance | cvm_instance | Delete       |
|               |              | cvm_instance | *No Ops*     |
|               | cvm_instance |              | Update State |

## Remote Backend

> State File

### Terraform Cloud

> 收费

![image-20240225202658368](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225202658368.png)

![image-20240225202933963](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225202933963.png)

![image-20240225202743851](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225202743851.png)

```json backend.tf
terraform {
  cloud {
    organization = "example-org-2c4aa5"

    workspaces {
      name = "getting-started"
    }
  }

  required_version = ">= 1.1.2"
}
```

```json main.tf
resource "fakewebservices_vpc" "primary_vpc" {
  name       = "Primary VPC"
  cidr_block = "0.0.0.0/1"
}

resource "fakewebservices_server" "servers" {
  count = 2

  name = "Server ${count.index + 1}"
  type = "t2.micro"
  vpc  = fakewebservices_vpc.primary_vpc.name
}

resource "fakewebservices_load_balancer" "primary_lb" {
  name    = "Primary Load Balancer"
  servers = fakewebservices_server.servers[*].name
}

resource "fakewebservices_database" "prod_db" {
  name = "Production DB"
  size = 256
}
```

### AWS S3

> dynamodb_table - Name of DynamoDB Table to use for `state locking` and `consistency`.

> encrypt - Enable `server side encryption` of the state file.

```json
terraform {
  backend "s3" {
    bucket         = "myorg-terraform-states"
    key            = "myapp/production/tfstate"
    region         = "us-east-1"
    dynamodb_table = "TableName"
    encrypt        = true
  }
}
```

### Tencent COS

```json
terraform {
  backend "cos" {
    region = "ap-guangzhou"
    bucket = "bucket-for-terraform-state-1258798060"
    prefix = "terraform/state"
  }
}
```

> 先使用 Local 存储，定义 Remote Backend，再变更 Config，最后执行 init 和 apply，这样 State File 将迁移到远端

> 本地存储 + 开通 COS

```json
terraform {
  required_providers {
    tencentcloud = {
      source = "tencentcloudstack/tencentcloud"
    }
  }
}

# terraform {
#   backend "cos" {
#     region  = "ap-guangzhou"
#     bucket  = "terraform-state-1301578102"
#     prefix  = "terraform/state"
#     encrypt = true
#   }
# }

# Configure the TencentCloud Provider
provider "tencentcloud" {
  region = "ap-guangzhou"
}

# Get availability zones
data "tencentcloud_availability_zones_by_product" "default" {
  product = "cvm"
}

# Get availability images
data "tencentcloud_images" "default" {
  image_type = ["PUBLIC_IMAGE"]
  os_name    = "ubuntu"
}

# Get availability instance types
data "tencentcloud_instance_types" "default" {
  # 机型族
  filter {
    name   = "instance-family"
    values = ["S5"]
  }

  cpu_core_count = 2
  memory_size    = 2
}

# Create a web server
resource "tencentcloud_instance" "web" {
  depends_on                 = [tencentcloud_security_group_lite_rule.default]
  instance_name              = "web server"
  availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
  image_id                   = data.tencentcloud_images.default.images.0.image_id
  instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
  system_disk_type           = "CLOUD_PREMIUM"
  system_disk_size           = 50
  allocate_public_ip         = true
  internet_max_bandwidth_out = 20
  instance_charge_type       = "SPOTPAID"
  orderly_security_groups    = [tencentcloud_security_group.default.id]
  count                      = 1
}

# Create security group
resource "tencentcloud_security_group" "default" {
  name        = "web accessibility"
  description = "make it accessible for both production and stage ports"
}

# Create security group rule allow ssh request
resource "tencentcloud_security_group_lite_rule" "default" {
  security_group_id = tencentcloud_security_group.default.id
  ingress = [
    "ACCEPT#0.0.0.0/0#22#TCP",
    "ACCEPT#0.0.0.0/0#6443#TCP",
  ]

  egress = [
    "ACCEPT#0.0.0.0/0#ALL#ALL"
  ]
}


# COS
data "tencentcloud_user_info" "info" {}

locals {
  app_id = data.tencentcloud_user_info.info.app_id
}

resource "tencentcloud_cos_bucket" "terraform-state" {
  bucket               = "terraform-state-${local.app_id}"
  acl                  = "private"
  encryption_algorithm = "AES256"
}
```

```json
$ tfi

$ tfa -auto-approve

$ tfsh
# tencentcloud_cos_bucket.terraform-state:
resource "tencentcloud_cos_bucket" "terraform-state" {
    acceleration_enable  = false
    acl                  = "private"
    bucket               = "terraform-state-1253868755"
    cos_bucket_url       = "terraform-state-1253868755.cos.ap-guangzhou.myqcloud.com"
    encryption_algorithm = "AES256"
    force_clean          = false
    id                   = "terraform-state-1253868755"
    log_enable           = false
    versioning_enable    = false
}
```

> 打开 Remote Backend，再次执行 `init`

```json
terraform {
  backend "cos" {
    region  = "ap-guangzhou"
    bucket  = "terraform-state-1253868755"
    prefix  = "terraform/state"
    encrypt = true
  }
}
```

```
$ tfi

Initializing the backend...
Acquiring state lock. This may take a few moments...
Do you want to copy existing state to the new backend?
  Pre-existing state was found while migrating the previous "local" backend to the
  newly configured "cos" backend. No existing state was found in the newly
  configured "cos" backend. Do you want to copy this state to the new "cos"
  backend? Enter "yes" to copy and "no" to start with an empty state.

  Enter a value: yes


Successfully configured the backend "cos"! Terraform will automatically
use this backend unless the backend configuration changes.

Initializing provider plugins...
- Reusing previous version of tencentcloudstack/tencentcloud from the dependency lock file
- Using previously-installed tencentcloudstack/tencentcloud v1.81.23

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

![image-20240225211026418](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225211026418.png)

```json
$ terraform state list
data.tencentcloud_availability_zones_by_product.default
data.tencentcloud_images.default
data.tencentcloud_instance_types.default
data.tencentcloud_user_info.info
tencentcloud_cos_bucket.terraform-state
tencentcloud_instance.web[0]
tencentcloud_security_group.default
tencentcloud_security_group_lite_rule.default

$ tree -a
.
|-- cvm.tf
|-- .terraform
|   |-- providers
|   |   `-- registry.terraform.io
|   |       `-- tencentcloudstack
|   |           `-- tencentcloud
|   |               `-- 1.81.23
|   |                   `-- linux_arm64
|   |                       |-- CHANGELOG.md
|   |                       |-- LICENSE
|   |                       |-- README.md
|   |                       `-- terraform-provider-tencentcloud_v1.81.23
|   `-- terraform.tfstate
|-- .terraform.lock.hcl
|-- terraform.tfstate
`-- terraform.tfstate.backup

$ du -sh terraform.tfstate
0	terraform.tfstate

$ cat .terraform/terraform.tfstate
{
    "version": 3,
    "serial": 1,
    "lineage": "be18a710-9501-3a04-d146-8311b4b28b74",
    "backend": {
        "type": "cos",
        "config": {
            "accelerate": null,
            "acl": null,
            "assume_role": [],
            "bucket": "terraform-state-1253868755",
            "domain": null,
            "encrypt": true,
            "endpoint": null,
            "key": null,
            "prefix": "terraform/state",
            "region": "ap-guangzhou",
            "secret_id": null,
            "secret_key": null,
            "security_token": null
        },
        "hash": 2906183806
    },
    "modules": [
        {
            "path": [
                "root"
            ],
            "outputs": {},
            "resources": {},
            "depends_on": []
        }
    ]
}
```

## Layout

```
$ tree -a
.
|-- main.tf
|-- outputs.tf
|-- variables.tf
`-- version.tf

```

| File         | Desc           |
| ------------ | -------------- |
| main.tf      | 主要的业务逻辑 |
| outputs.tf   | 定义输出内容   |
| variables.tf | 定义变量参数   |
| version.tf   | 定义依赖和版本 |

> outputs.tf

```json
output "public_ip" {
  description = "vm public ip address"
  value       = tencentcloud_instance.web[0].public_ip
  sensitive   = true
}
```

1. 定义运行结束后所需要输出的内容
2. 可设置是否为`敏感`数据（`不输出`）
3. 可以`引用`其它 Resource 的的输出内容

> variables.tf

```json
variable "prefix" {
  type        = string
  default     = "30"
  description = "xxx"
  verification {
    condition     = length(var.prefix) > 3
    error_message = "prefix must be logger than 3" 
  }
  sensitive =  true
}
```

```json
resource "cloudflare_record" "jenkins" {
  zone_id         = data.cloudflare_zone.this.id
  name            = "jenkins.${var.prefix}.${var.domain}"
  value           = tencentcloud_instance.ubuntu[0].public_ip
  type            = "A"
  ttl             = 60
  allow_overwrite = true
}
```

1. 定义参数变量，用于在代码中应用
2. 可以定义：类型、默认值、描述、验证函数、是否敏感数据（不在 Plan 中显示）
3. 设置方式（优先级，从高到低）

| Method     | Example                                      |
| ---------- | -------------------------------------------- |
| 命令行参数 | `terraform apply -var="prefix=values"`       |
| 配置文件   | `terraform apply -var-file="testing.tfvars"` |
| 环境变量   | `export TF_VAR_prefix=values`                |
| 默认值     | default                                      |
| 交互式输入 | 兜底缺失值                                   |

> version.tf

```json
terraform {
  required_version = "> 0.13.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}
```

1. 定义 Terraform CLI 最低要求版本
2. 定义项目的 Provider 依赖以及特定版本

## Practice

> 过程（有顺序）

1. 开通 VM
2. 安装 K3S
3. 安装 Argo CD
4. 查看依赖关系：terraform graph | dot -Tsvg > graph.svg

```
$ tree
.
|-- cvm.tf
|-- helm.tf
|-- k3s.tf
|-- outputs.tf
|-- variables.tf
`-- version.tf
```

### Config

#### version.tf

```json
terraform {
  required_version = "> 0.13.0"
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.81.5"
    }

    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

provider "helm" {
  kubernetes {
    config_path = local_sensitive_file.kubeconfig.filename
  }
}
```

#### variables.tf

```json
variable "secret_id" {
  default = "xxx"
}

variable "secret_key" {
  default = "yyy"
}

variable "regoin" {
  default = "ap-hongkong"
}

variable "password" {
  default = "zzz"
}
```

#### cvm.tf

```json
# Configure the TencentCloud Provider
provider "tencentcloud" {
  region     = var.regoin
  secret_id  = var.secret_id
  secret_key = var.secret_key
}

# Get availability zones
data "tencentcloud_availability_zones_by_product" "default" {
  product = "cvm"
}

# Get availability images
data "tencentcloud_images" "default" {
  image_type = ["PUBLIC_IMAGE"]
  os_name    = "ubuntu"
}

# Get availability instance types
data "tencentcloud_instance_types" "default" {
  # 机型族
  filter {
    name   = "instance-family"
    values = ["S5"]
  }

  cpu_core_count = 2
  memory_size    = 4
}

# Create a web server
resource "tencentcloud_instance" "web" {
  depends_on                 = [tencentcloud_security_group_lite_rule.default]
  count                      = 1
  instance_name              = "web server"
  availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
  image_id                   = data.tencentcloud_images.default.images.0.image_id
  instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
  system_disk_type           = "CLOUD_PREMIUM"
  system_disk_size           = 50
  allocate_public_ip         = true
  internet_max_bandwidth_out = 100
  instance_charge_type       = "SPOTPAID"
  orderly_security_groups    = [tencentcloud_security_group.default.id]
  password                   = var.password
}

# Create security group
resource "tencentcloud_security_group" "default" {
  name        = "tf-security-group"
  description = "make it accessible for both production and stage ports"
}

# Create security group rule allow ssh request
resource "tencentcloud_security_group_lite_rule" "default" {
  security_group_id = tencentcloud_security_group.default.id
  ingress = [
    "ACCEPT#0.0.0.0/0#22#TCP",
    "ACCEPT#0.0.0.0/0#6443#TCP",
  ]

  egress = [
    "ACCEPT#0.0.0.0/0#ALL#ALL"
  ]
}
```

#### k3s.tf

> https://registry.terraform.io/modules/xunleii/k3s/module/latest

```json
module "k3s" {
  source                   = "xunleii/k3s/module"
  k3s_version              = "v1.25.11+k3s1"
  generate_ca_certificates = true
  global_flags = [
    "--tls-san ${tencentcloud_instance.web[0].public_ip}",
    "--write-kubeconfig-mode 644",
    "--disable=traefik",
    "--kube-controller-manager-arg bind-address=0.0.0.0",
    "--kube-proxy-arg metrics-bind-address=0.0.0.0",
    "--kube-scheduler-arg bind-address=0.0.0.0"
  ]
  k3s_install_env_vars = {}

  servers = {
    "k3s" = {
      ip = tencentcloud_instance.web[0].private_ip
      connection = {
        timeout  = "60s"
        type     = "ssh"
        host     = tencentcloud_instance.web[0].public_ip
        password = var.password
        user     = "ubuntu"
      }
    }
  }
}

resource "local_sensitive_file" "kubeconfig" {
  content  = module.k3s.kube_config
  filename = "${path.module}/config.yaml"
}
```

1. `--tls-san ${tencentcloud_instance.web[0].public_ip}` - 隐式依赖 CVM
2. `tencentcloud_instance.web[0].private_ip` - 隐式依赖 CVM

#### helm.tf

> 显式依赖 K3S

```json
resource "helm_release" "argo_cd" {
  depends_on       = [module.k3s]
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
}
```

> 在 apply 之前会通过 `DAG` 分析`隐式依赖`和`显式依赖`

### init

```
$ tfi

Initializing the backend...
Initializing modules...
Downloading registry.terraform.io/xunleii/k3s/module 3.4.0 for k3s...
- k3s in .terraform/modules/k3s

Initializing provider plugins...
- Reusing previous version of hashicorp/http from the dependency lock file
- Reusing previous version of hashicorp/null from the dependency lock file
- Reusing previous version of hashicorp/random from the dependency lock file
- Reusing previous version of hashicorp/tls from the dependency lock file
- Reusing previous version of tencentcloudstack/tencentcloud from the dependency lock file
- Reusing previous version of hashicorp/helm from the dependency lock file
- Reusing previous version of hashicorp/local from the dependency lock file
- Installing tencentcloudstack/tencentcloud v1.81.5...
- Installed tencentcloudstack/tencentcloud v1.81.5 (signed by a HashiCorp partner, key ID 84F69E1C1BECF459)
- Installing hashicorp/helm v2.11.0...
- Installed hashicorp/helm v2.11.0 (signed by HashiCorp)
- Installing hashicorp/local v2.4.0...
- Installed hashicorp/local v2.4.0 (signed by HashiCorp)
- Installing hashicorp/http v3.4.0...
- Installed hashicorp/http v3.4.0 (signed by HashiCorp)
- Installing hashicorp/null v3.2.1...
- Installed hashicorp/null v3.2.1 (signed by HashiCorp)
- Installing hashicorp/random v3.5.1...
- Installed hashicorp/random v3.5.1 (signed by HashiCorp)
- Installing hashicorp/tls v4.0.4...
- Installed hashicorp/tls v4.0.4 (signed by HashiCorp)

Partner and community providers are signed by their developers.
If you'd like to know more about provider signing, you can read about it here:
https://www.terraform.io/docs/cli/plugins/signing.html

Terraform has made some changes to the provider dependency selections recorded
in the .terraform.lock.hcl file. Review those changes and commit them to your
version control system if they represent changes you intended to make.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

### graph

```
$ terraform graph | dot -Tsvg > graph.svg
```

![graph](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/graph.svg)

### apply

```
$ tfa -auto-approve
...
Apply complete! Resources: 24 added, 0 changed, 0 destroyed.

Outputs:

kube_config = "./config.yaml"
password = "password123"
public_ip = "43.xxx.226.90"

$ k --kubeconfig=./config.yaml get pod -A
NAMESPACE     NAME                                                READY   STATUS    RESTARTS   AGE
kube-system   local-path-provisioner-69dff9496c-nbbnp             1/1     Running   0          6m56s
kube-system   coredns-8b9777675-kg626                             1/1     Running   0          6m56s
kube-system   metrics-server-854c559bd-q5hl8                      1/1     Running   0          6m56s
argocd        argocd-redis-78b5b89956-6pjx5                       1/1     Running   0          6m38s
argocd        argocd-applicationset-controller-5c458c8c48-z9bfn   1/1     Running   0          6m37s
argocd        argocd-notifications-controller-d9445794f-9tbxs     1/1     Running   0          6m38s
argocd        argocd-server-6b895dc5b-nrnjx                       1/1     Running   0          6m38s
argocd        argocd-dex-server-79f689689d-qw5w5                  1/1     Running   0          6m38s
argocd        argocd-repo-server-68bbd457dd-wpc9v                 1/1     Running   0          6m38s
argocd        argocd-application-controller-0                     1/1     Running   0          6m37s

$ k --kubeconfig=./config.yaml get secrets -n argocd argocd-initial-admin-secret -ojsonpath='{.data.password}' | base64 -d
xxxx

$ k --kubeconfig=./config.yaml port-forward -n argocd svc/argocd-server 8888:80 --address 0.0.0.0
Forwarding from 0.0.0.0:8888 -> 8080
```

![image-20240225224958121](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240225224958121.png)

## 表达式 + 函数

### 表达式

1. 模板变量
2. 值引用
3. 运算符
4. 条件表达式
5. For 表达式
6. Splat 表达式
7. 动态块
8. 条件约束（变量类型、版本）

### 函数

1. 数值函数
2. 字符串函数
3. 集合函数
4. 编码函数
5. 文件系统函数
6. 时间日期函数
7. 哈希和加密函数
8. 类型转换函数

## Meta Arguments

1. Scope: resource / modules

2. Arguments

   - depends_on

   - count

   - for_each

   - lifecycle

### depends_on

1. Terraform 根据引用自动生成资源的 DAG
2. 根据 DAG 来创建和销毁过程（有顺序）
3. 可以通过 depends_on `显式`指定依赖关系，控制创建和销毁顺序
4. 可以通过 terraform graph | dot -Tsvg > graph.svg 生成依赖图

```json
resource "helm_release" "argo_cd" {
  depends_on       = [module.k3s]
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
}
```

### count

> 指定创建 N 个`相同`资源

```json
# Create a web server
resource "tencentcloud_instance" "web" {
  count                      = 4
  instance_name              = "web server"
  availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
  image_id                   = data.tencentcloud_images.default.images.0.image_id
  instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
  system_disk_type           = "CLOUD_PREMIUM"
  system_disk_size           = 50
  allocate_public_ip         = true
  internet_max_bandwidth_out = 20
  instance_charge_type       = "SPOTPAID"
  orderly_security_groups    = [tencentcloud_security_group.default.id]
  depends_on                 = [tencentcloud_security_group_lite_rule.default]
}
```

### for_each

> 在单个块中创建多个`不同`的资源

```json
locals {
  subnet_ids = toSet([
    "subnet-abcd",
    "subnet-0123"
  ])
}

resource "aws_instance" "server" {
    for_each = locals.subnet_ids

    subnet_id = each.key

    tags = {
        Name = "Server ${each.key}"
    }
}
```

### lifecycle

> 使用较少

## Provisioners

> 在本地或者远端虚拟机中执行动作

| Type          | Desc                               |
| ------------- | ---------------------------------- |
| `file`        | 将本地文件或者目录复制到远端虚拟机 |
| local-exec    | 在本地执行一段命令                 |
| `remote-exec` | 在远端虚拟机中执行命令             |
| vendor        |                                    |

```json
resource "null_resource" "connect_ubuntu" {
  connection {
    host     = tencentcloud_instance.ubuntu[0].public_ip
    type     = "ssh"
    user     = "ubuntu"
    password = var.password
    //private_key = file("ssh-key/id_rsa")
    //agent = false
  }

...

  # kube-prometheus-stack
  provisioner "file" {
    destination = "/tmp/kube-prometheus-stack-values.yaml"
    content = templatefile(
      "${path.module}/prometheus/values.yaml.tpl",
      {
        "domain" : "${var.prefix}.${var.domain}"
        "grafana_password" : "${var.grafana_password}"
      }
    )
  }

  ...

  provisioner "remote-exec" {
    # script = "/tmp/init.sh"
    inline = [
      "chmod +x /tmp/init.sh",
      "sh /tmp/init.sh",
    ]
  }

...
}
```

## Multi Environment

### Directory

1. 为不同的环境创建对应的目录
2. 本质上区分 `State File`

```
$ tree
.
|-- dev
|   |-- helm.tf
|   |-- k3s.tf
|   |-- main.tf
|   |-- outputs.tf
|   |-- variables.tf
|   `-- version.tf
`-- testing
    |-- helm.tf
    |-- k3s.tf
    |-- main.tf
    |-- outputs.tf
    |-- variables.tf
    `-- version.tf
```

> 需要同时修改多个环境，可维护性差、代码复用性差

### Workspace

> 区分 State File

```
$ terraform workspace list
* default

$ terraform workspace new dev
Created and switched to workspace "dev"!

You're now on a new, empty workspace. Workspaces isolate their state,
so if you run "terraform plan" Terraform will not see any existing state
for this configuration.

$ terraform workspace list
  default
* dev
  
$ terraform workspace new testing
Created and switched to workspace "testing"!

You're now on a new, empty workspace. Workspaces isolate their state,
so if you run "terraform plan" Terraform will not see any existing state
for this configuration.

$ terraform workspace list
  default
  dev
* testing

$ tree -L 2 terraform.tfstate.d .terraform
terraform.tfstate.d
|-- dev
|   `-- terraform.tfstate
`-- testing
    `-- terraform.tfstate
.terraform
|-- environment
|-- modules
|   |-- k3s
|   `-- modules.json
`-- providers
    `-- registry.terraform.io

$ cat .terraform/environment
testing
```

> Workspace vs Directory

| Workspace                                              | Directory                  |
| ------------------------------------------------------ | -------------------------- |
| 一套代码 N 个环境，实现了`代码复用`                    | 需要同时修改多个环境的代码 |
| 增加了`执行上下文`的概念，容易出错 - `不推荐使用`      | 环境目录清晰，不容易出错   |
| 需要通过 `terraform workspace list` 查看当前执行上下文 | 可维护性差、代码复用性差   |
| 通过 `terraform.tfstate.d` 目录区分 State File         |                            |

### Module

1. Module 是`复用` Terraform 代码的主要方式
2. 更好地组织和管理 IaC 源码：配置、微服务、角色
3. Module 类型
   - `Root` Module：包含所有工作目录下的 .tf 文件，默认模块
   - `Sub` Module：通过 .tf 文件引用的`外部`模块
     - `Local`
     - Terraform Registry
     - HTTP
     - GIT
     - S3

```
$ tree -a
.
|-- modules
|   |-- cvm
|   |   |-- main.tf
|   |   |-- output.tf
|   |   |-- variables.tf
|   |   `-- version.tf
|   `-- k3s
|       |-- main.tf
|       |-- output.tf
|       `-- variables.tf
|-- dev
|   |-- main.tf
|   `-- variables.tf
`-- testing
    |-- main.tf
    `-- variables.tf
```

#### modules

##### cvm

> cvm/version.tf

```json
terraform {
  required_version = "> 0.13.0"
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "1.81.5"
    }
  }
}
```

> cvm/variables.tf

```json
variable "secret_id" {
  default = "Your Access ID"
}

variable "secret_key" {
  default = "Your Access Key"
}

variable "region" {
  default = "ap-hongkong"
}

variable "password" {
  default = "password123"
}
```

> cvm/output.tf

```json
output "public_ip" {
  description = "vm public ip address"
  value       = tencentcloud_instance.web[0].public_ip
}

output "private_ip" {
  description = "vm private ip address"
  value       = tencentcloud_instance.web[0].private_ip
}
```

> cvm/main.tf

```json
# Configure the TencentCloud Provider
provider "tencentcloud" {
  region     = var.region
  secret_id  = var.secret_id
  secret_key = var.secret_key
}

# Get availability zones
data "tencentcloud_availability_zones_by_product" "default" {
  product = "cvm"
}

# Get availability images
data "tencentcloud_images" "default" {
  image_type = ["PUBLIC_IMAGE"]
  os_name    = "ubuntu"
}

# Get availability instance types
data "tencentcloud_instance_types" "default" {
  # 机型族
  filter {
    name   = "instance-family"
    values = ["S5"]
  }

  cpu_core_count = 2
  memory_size    = 4
}

# Create security group
resource "tencentcloud_security_group" "default" {
  name        = "tf-security-group"
  description = "make it accessible for both production and stage ports"
}

# Create security group rule allow ssh request
resource "tencentcloud_security_group_lite_rule" "default" {
  security_group_id = tencentcloud_security_group.default.id
  ingress = [
    "ACCEPT#0.0.0.0/0#22#TCP",
    "ACCEPT#0.0.0.0/0#6443#TCP",
  ]

  egress = [
    "ACCEPT#0.0.0.0/0#ALL#ALL"
  ]
}

# Create a web server
resource "tencentcloud_instance" "web" {
  depends_on                 = [tencentcloud_security_group_lite_rule.default]
  count                      = 1
  instance_name              = "web server"
  availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
  image_id                   = data.tencentcloud_images.default.images.0.image_id
  instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
  system_disk_type           = "CLOUD_PREMIUM"
  system_disk_size           = 50
  allocate_public_ip         = true
  internet_max_bandwidth_out = 100
  instance_charge_type       = "SPOTPAID"
  orderly_security_groups    = [tencentcloud_security_group.default.id]
  password                   = var.password
}
```

##### k3s

> k3s/variables.tf

```json
variable "password" {
  default = "password123"
}

variable "public_ip" {}

variable "private_ip" {}
```

> k3s/output.tf

```json
output "kube_config" {
  value = module.k3s.kube_config
}

output "kubernetes" {
  value = module.k3s.kubernetes
}
```

> k3s/main.tf

```json
module "k3s" {
  source                   = "xunleii/k3s/module"
  k3s_version              = "v1.25.11+k3s1"
  generate_ca_certificates = true
  global_flags = [
    "--tls-san ${var.public_ip}",
    "--write-kubeconfig-mode 644",
    "--disable=traefik",
    "--kube-controller-manager-arg bind-address=0.0.0.0",
    "--kube-proxy-arg metrics-bind-address=0.0.0.0",
    "--kube-scheduler-arg bind-address=0.0.0.0"
  ]
  k3s_install_env_vars = {}

  servers = {
    "k3s" = {
      ip = var.private_ip
      connection = {
        timeout  = "60s"
        type     = "ssh"
        host     = var.public_ip
        password = var.password
        user     = "ubuntu"
      }
    }
  }
}
```

#### dev

> dev/main.tf

```json
module "cvm" {
  source     = "../modules/cvm"
  secret_id  = var.secret_id
  secret_key = var.secret_key
  password   = var.password
}

module "k3s" {
  source     = "../modules/k3s"
  public_ip  = module.cvm.public_ip
  private_ip = module.cvm.private_ip
}

resource "local_sensitive_file" "kubeconfig" {
  content  = module.k3s.kube_config
  filename = "${path.module}/config.yaml"
}
```

> dev/variables.tf

```json
variable "secret_id" {
  default = "Your Access ID"
}

variable "secret_key" {
  default = "Your Access Key"
}
```

```json
$ cd dev/

$ tfi

Initializing the backend...
Initializing modules...
- cvm in ../modules/cvm
- k3s in ../modules/k3s
Downloading registry.terraform.io/xunleii/k3s/module 3.4.0 for k3s.k3s...
- k3s.k3s in .terraform/modules/k3s.k3s

Initializing provider plugins...
- Reusing previous version of hashicorp/http from the dependency lock file
- Reusing previous version of hashicorp/local from the dependency lock file
- Reusing previous version of tencentcloudstack/tencentcloud from the dependency lock file
- Reusing previous version of hashicorp/null from the dependency lock file
- Reusing previous version of hashicorp/random from the dependency lock file
- Reusing previous version of hashicorp/tls from the dependency lock file
- Installing tencentcloudstack/tencentcloud v1.81.5...
- Installed tencentcloudstack/tencentcloud v1.81.5 (signed by a HashiCorp partner, key ID 84F69E1C1BECF459)
- Installing hashicorp/null v3.2.1...
- Installed hashicorp/null v3.2.1 (signed by HashiCorp)
- Installing hashicorp/random v3.5.1...
- Installed hashicorp/random v3.5.1 (signed by HashiCorp)
- Installing hashicorp/tls v4.0.4...
- Installed hashicorp/tls v4.0.4 (signed by HashiCorp)
- Installing hashicorp/http v3.4.0...
- Installed hashicorp/http v3.4.0 (signed by HashiCorp)
- Installing hashicorp/local v2.4.0...
- Installed hashicorp/local v2.4.0 (signed by HashiCorp)

Partner and community providers are signed by their developers.
If you'd like to know more about provider signing, you can read about it here:
https://www.terraform.io/docs/cli/plugins/signing.html

Terraform has made some changes to the provider dependency selections recorded
in the .terraform.lock.hcl file. Review those changes and commit them to your
version control system if they represent changes you intended to make.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.

$ tree -L 3 -a
.
|-- main.tf
|-- .terraform
|   |-- modules
|   |   |-- k3s.k3s
|   |   `-- modules.json
|   `-- providers
|       `-- registry.terraform.io
|-- .terraform.lock.hcl
`-- variables.tf

$ cat .terraform/modules/modules.json | jq
{
  "Modules": [
    {
      "Key": "",
      "Source": "",
      "Dir": "."
    },
    {
      "Key": "cvm",
      "Source": "../modules/cvm",
      "Dir": "../modules/cvm"
    },
    {
      "Key": "k3s",
      "Source": "../modules/k3s",
      "Dir": "../modules/k3s"
    },
    {
      "Key": "k3s.k3s",
      "Source": "registry.terraform.io/xunleii/k3s/module",
      "Version": "3.4.0",
      "Dir": ".terraform/modules/k3s.k3s"
    }
  ]
}
```

```
$ tfa -auto-approve

$ k --kubeconfig=./config.yaml get pod -A
NAMESPACE     NAME                                      READY   STATUS    RESTARTS   AGE
kube-system   local-path-provisioner-69dff9496c-q7g25   1/1     Running   0          4m14s
kube-system   coredns-8b9777675-zfwp6                   1/1     Running   0          4m14s
kube-system   metrics-server-854c559bd-8t2j7            1/1     Running   0          4m14s
```

#### 抽象原则

1. 以产品或者功能`拆分`模块
2. 为模块设置必要的`入参`和`逻辑条件判断`
3. 为模块的输入提供有用的`默认值`
4. 设置`输出`，便于与其它模块进一步`集成`（Pipeline）

## Terragrunt

> 类似于 Helm - K8S Manifest，适用于大型组织，使用较少

![image-20240226224551931](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226224551931.png)

1. Terraform 包装器
2. 减少重复代码
3. 多账户支持
4. 大规模场景组织 IaC 代码
5. `IaC 生成器`

> Layout

```
$ tree
.
|-- deploy
|   |-- department1
|   |   |-- team1
|   |   |   |-- account.hcl
|   |   |   `-- cvm
|   |   |       `-- terragrunt.hcl
|   |   `-- team2
|   |       |-- account.hcl
|   |       `-- cvm
|   |           `-- terragrunt.hcl
|   `-- terragrunt.hcl
|-- modules
|   |-- cos
|   |   |-- main.tf
|   |   |-- outputs.tf
|   |   |-- variables.tf
|   |   `-- version.tf
|   `-- cvm
|       |-- main.tf
|       |-- outputs.tf
|       |-- variables.tf
|       `-- version.tf
`-- terragrunt.hcl
```

1. 对 Terraform 版本支持的问题
2. 社区（`不活跃`）和维护问题
3. `Terraform + Module` 仍是主流

# Pulumi

> IaC `SDK`，可以再造 Terraform

1. 在代码里使用 IaC
2. 支持多语言
3. 抽象层：更高层的封装调用
4. 多云支持

![image-20240226231540641](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226231540641.png)

# Crossplane

> 基于 Crossplane，可以快速自建 PaaS 平台，提供 `Runtime`

![image-20240226231908707](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226231908707.png)

1. K8S 控制器，CRD 方式定义资源
2. 无需代码，声明式 API
3. 基础设施`控制平面` - 类似于 Terraform Cloud
4. 多云与混合云支持
5. 可以在 K8S 中运行 Terraform

## Architecture

![image-20240302202336519](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302202336519.png)

## Provider

> Terraform - 可以白嫖 Terraform 生态

![image-20240226233449389](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226233449389.png)

> Tencent Cloud

![image-20240226233039421](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226233039421.png)

![image-20240226233925645](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240226233925645.png)

## Installation

```
$ helm repo add crossplane-stable https://charts.crossplane.io/stable
"crossplane-stable" has been added to your repositories

$ helm repo update
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "crossplane-stable" chart repository
Update Complete. ⎈Happy Helming!⎈

$ helm install crossplane \
--namespace crossplane-system \
--create-namespace crossplane-stable/crossplane
NAME: crossplane
LAST DEPLOYED: Mon Feb 26 23:44:06 2023
NAMESPACE: crossplane-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Release: crossplane

Chart Name: crossplane
Chart Description: Crossplane is an open source Kubernetes add-on that enables platform teams to assemble infrastructure from multiple vendors, and expose higher level self-service APIs for application teams to consume.
Chart Version: 1.15.0
Chart Application Version: 1.15.0

Kube Version: v1.28.3

$ k get pods -n crossplane-system
NAME                                       READY   STATUS    RESTARTS   AGE
crossplane-6494656b8b-r5mfh                1/1     Running   0          46s
crossplane-rbac-manager-8458557cdd-8h5n7   1/1     Running   0          46s
```

## CVM

### YAML

```
$ tree
.
|-- cvm
|   |-- cvm.yaml
|   |-- subnet.yaml
|   `-- vpc.yaml
|-- providerConfig.yaml
|-- provider.yaml
`-- secret.yaml
```

> provider.yaml

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-tencentcloud
spec:
  package: xpkg.upbound.io/crossplane-contrib/provider-tencentcloud:v0.6.0
```

> secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: example-creds
  namespace: crossplane-system
type: Opaque
stringData:
  credentials: |
    {
      "secret_id": "",
      "secret_key": "",
      "region": "ap-hongkong"
    }
```

> providerConfig.yaml

```yaml
apiVersion: tencentcloud.crossplane.io/v1alpha1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    secretRef:
      key: credentials
      name: example-creds
      namespace: crossplane-system
    source: Secret
```

> cvm/vpc.yaml

```yaml
apiVersion: vpc.tencentcloud.crossplane.io/v1alpha1
kind: VPC
metadata:
  name: example-cvm-vpc
spec:
  forProvider:
    cidrBlock: "10.2.0.0/16"
    name: "test-crossplane-cvm-vpc"
```

> cvm/subnet.yaml

```yaml
apiVersion: vpc.tencentcloud.crossplane.io/v1alpha1
kind: Subnet
metadata:
  name: example-cvm-subnet
spec:
  forProvider:
    availabilityZone: "ap-hongkong-2"
    cidrBlock: "10.2.2.0/24"
    name: "test-crossplane-cvm-subnet"
    vpcidRef:
      name: "example-cvm-vpc"
```

> cvm/cvm.yaml - `隐式依赖` vpc 和 subnet

```yaml
apiVersion: cvm.tencentcloud.crossplane.io/v1alpha1
kind: Instance
metadata:
  name: example-cvm
spec:
  forProvider:
    instanceName: "test-crossplane-cvm"
    availabilityZone: "ap-hongkong-2"
    instanceChargeType: "SPOTPAID"
    imageId: "img-487zeit5"
    instanceType: "S5.MEDIUM2"
    systemDiskType: "CLOUD_PREMIUM"
    vpcidRef:
      name: "example-cvm-vpc"
    subnetIdRef:
      name: "example-cvm-subnet"
```

### Operation

> 安装 Provider

```
$ k apply -f provider.yaml
provider.pkg.crossplane.io/provider-tencentcloud created

$ k get provider
NAME                    INSTALLED   HEALTHY   PACKAGE                                                           AGE
provider-tencentcloud   True        Unknown   xpkg.upbound.io/crossplane-contrib/provider-tencentcloud:v0.6.0   35s

$ k apply -f secret.yaml -f providerConfig.yaml
secret/example-creds created
providerconfig.tencentcloud.crossplane.io/default created

$ k get providers
NAME                    INSTALLED   HEALTHY   PACKAGE                                                           AGE
provider-tencentcloud   True        True      xpkg.upbound.io/crossplane-contrib/provider-tencentcloud:v0.6.0   42m
```

> 安装：私有网络 / 子网 / 云服务器

```
$ k apply -f cvm
instance.cvm.tencentcloud.crossplane.io/example-cvm created
subnet.vpc.tencentcloud.crossplane.io/example-cvm-subnet created
vpc.vpc.tencentcloud.crossplane.io/example-cvm-vpc created

$ k get vpcs.vpc.tencentcloud.crossplane.io
NAME              READY   SYNCED   EXTERNAL-NAME   AGE
example-cvm-vpc   True    True     vpc-lvgkm1cg    118s

$ k get subnets.vpc.tencentcloud.crossplane.io
NAME                 READY   SYNCED   EXTERNAL-NAME     AGE
example-cvm-subnet   True    True     subnet-q5fwr275   2m22s

$ k get instances.cvm.tencentcloud.crossplane.io
NAME          READY   SYNCED   EXTERNAL-NAME   AGE
example-cvm   True    True     ins-b05ee9a8    94s
```

![image-20240302152639173](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302152639173.png)

![image-20240302152711963](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302152711963.png)

![image-20240302152738289](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302152738289.png)

> 销毁资源

```
$ k delete -f cvm
instance.cvm.tencentcloud.crossplane.io "example-cvm" deleted
subnet.vpc.tencentcloud.crossplane.io "example-cvm-subnet" deleted
vpc.vpc.tencentcloud.crossplane.io "example-cvm-vpc" deleted
```

## PaaS

### Argo CD

![image-20240302155023624](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302155023624.png)

### Terraform

> 白嫖 Terraform 生态

![image-20240302162159902](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302162159902.png)

```
$ tree .
.
|-- cvm.yaml
|-- providerConfig.yaml
`-- provider.yaml
```

> provider.yaml

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-terraform
spec:
  package: xpkg.upbound.io/upbound/provider-terraform:v0.10.0
```

> providerConfig.yaml - 声明 `backend` 为 kubernetes

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  configuration: |
    terraform {
      required_providers {
        tencentcloud = {
          source = "tencentcloudstack/tencentcloud"
        }
      }
    }

    provider "tencentcloud" {
      # edit me
      secret_id  = ""
      secret_key = ""
      region     = "ap-hongkong"
    }

    // Modules _must_ use remote state. The provider does not persist state.
    terraform {
      backend "kubernetes" {
        secret_suffix     = "providerconfig-default"
        namespace         = "crossplane-system"
        in_cluster_config = true
      }
    }
```

> cvm.yaml

```yaml
apiVersion: tf.upbound.io/v1beta1
kind: Workspace
metadata:
  name: cvm
spec:
  forProvider:
    source: Inline
    module: |
      data "tencentcloud_availability_zones_by_product" "default" {
        product = "cvm"
      }

      # Get availability images
      data "tencentcloud_images" "default" {
        image_type = ["PUBLIC_IMAGE"]
        os_name    = "ubuntu"
      }

      # Get availability instance types
      data "tencentcloud_instance_types" "default" {
        filter {
          name   = "instance-family"
          values = ["S5"]
        }

        cpu_core_count = 2
        memory_size    = 4
      }

      # Create security group
      resource "tencentcloud_security_group" "default" {
        name        = "tf-security-group"
        description = "make it accessible for both production and stage ports"
      }

      # Create security group rule allow ssh request
      resource "tencentcloud_security_group_lite_rule" "default" {
        security_group_id = tencentcloud_security_group.default.id
        ingress = [
          "ACCEPT#0.0.0.0/0#22#TCP",
          "ACCEPT#0.0.0.0/0#6443#TCP",
        ]

        egress = [
          "ACCEPT#0.0.0.0/0#ALL#ALL"
        ]
      }

      # Create a web server
      resource "tencentcloud_instance" "web" {
        depends_on                 = [tencentcloud_security_group_lite_rule.default]
        count                      = 1
        instance_name              = "web server"
        availability_zone          = data.tencentcloud_availability_zones_by_product.default.zones.0.name
        image_id                   = data.tencentcloud_images.default.images.0.image_id
        instance_type              = data.tencentcloud_instance_types.default.instance_types.0.instance_type
        system_disk_type           = "CLOUD_PREMIUM"
        system_disk_size           = 50
        allocate_public_ip         = true
        internet_max_bandwidth_out = 100
        instance_charge_type       = "SPOTPAID"
        orderly_security_groups    = [tencentcloud_security_group.default.id]
        password                   = var.cvm_password
      }
      variable "cvm_password" {
        description = "user ubuntu password"
        type        = string
      }
    vars:
      - key: cvm_password
        value: password123
```

> 安装 Provider

```
$ k apply -f provider.yaml
provider.pkg.crossplane.io/provider-terraform created

$ k get provider.pkg.crossplane.io/provider-terraform
NAME                 INSTALLED   HEALTHY   PACKAGE                                              AGE
provider-terraform   True        True      xpkg.upbound.io/upbound/provider-terraform:v0.10.0   75s

$ k apply -f providerConfig.yaml
providerconfig.tf.upbound.io/default created
```

> 创建 CVM

```
$ k apply -f cvm.yaml
workspace.tf.upbound.io/cvm created

$ k get workspaces.tf.upbound.io
NAME   READY   SYNCED   AGE
cvm    True    True     116s
```

![image-20240302164148873](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240302164148873.png)

> 销毁资源

```
$ k delete -f cvm.yaml
workspace.tf.upbound.io "cvm" deleted
```
