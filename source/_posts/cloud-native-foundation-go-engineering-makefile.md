---
title: Go Engineering - Makefile
mathjax: false
date: 2023-05-05 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-makefile.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
  - Makefile
---

# 基础语法

> https://github.com/seisman/how-to-write-makefile

1. 规则语法
2. 伪目标
3. 变量赋值
4. 特殊变量
5. 自动化变量

# 功能设计

## Target

| Target           | Desc                                                         |
| ---------------- | ------------------------------------------------------------ |
| gen              | Generate all necessary files, such as error code files.      |
| format           | Gofmt (reformat) package sources (exclude vendor dir if existed). |
| lint             | Check syntax and styling of go sources.                      |
| test             | Run unit test.                                               |
| cover            | Run unit test and get test coverage.                         |
| build            | Build source code for host platform.                         |
| build.multiarch  | Build source code for multiple platforms. See option PLATFORMS. |
| image            | Build docker images for host arch.                           |
| image.multiarch  | Build docker images for multiple platforms. See option PLATFORMS. |
| push             | Build docker images for host arch and push images to registry. |
| push.multiarch   | Build docker images for multiple platforms and push images to registry. |
| deploy           | Deploy updated components to development env.                |
| clean            | Remove all files that are created by building.               |
| release          | Release                                                      |
| verify-copyright | Verify the boilerplate headers for all files.                |
| ca               | Generate CA files for all components.                        |
| install          | Install system with all its components.                      |
| swagger          | Generate swagger document.                                   |
| tools            | install dependent tools.                                     |
| help             | Show this help info.                                         |

> help 命令通过解析 Makefile 文件来输出集成的功能

```makefile
## help: Show this help info.
.PHONY: help
help: Makefile
	@printf "\nUsage: make <TARGETS> <OPTIONS> ...\n\nTargets:\n"
	@sed -n 's/^##//p' $< | column -t -s ':' | sed -e 's/^/ /'
	@echo "$$USAGE_OPTIONS"
```

<!-- more -->

## Option

| Option          | Desc                                                         |
| --------------- | ------------------------------------------------------------ |
| DEBUG           | Whether to generate debug symbols. Default is 0.             |
| BINS            | The binaries to build. Default is all of cmd.<br/>This option is available when using: make build/build.multiarch |
| IMAGES          | Backend images to make. Default is all of cmd.<br/>This option is available when using: make image/image.multiarch/push/push.multiarch |
| REGISTRY_PREFIX | Docker registry prefix.                                      |
| PLATFORMS       | The multiple platforms to build. Default is linux_amd64 and linux_arm64.<br/>This option is available when using: make build.multiarch/image.multiarch/push.multiarch |
| VERSION         | The version information compiled into binaries.<br/>The default is obtained from gsemver or git. |
| V               | Set to 1 enable verbose build. Default is 0.                 |

# 结构设计

1. 根 Makefile `聚合`了项目所有的管理功能，管理功能通过 Makefile `伪目标`的方式实现
2. 将伪目标进行`分类`，把相同类别的伪目标放在同一个 Makefile 中
3. 对于复杂命令，则编写成独立的 shell 脚本，并在 Makefile 命令中调用这些 shell 脚本
4. 为了与 Makefile 的层级相匹配，golang.mk 中的所有目标都按照 `go.xxx` 的方式来命名

![image-20240609214933738](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20240609214933738.png)

```
├── Makefile
├── scripts
│   ├── gendoc.sh
│   ├── make-rules
│   │   ├── gen.mk
│   │   ├── golang.mk
│   │   ├── image.mk
│   │   └── ...
    └── ...
```

# 编写技巧

> TBD

