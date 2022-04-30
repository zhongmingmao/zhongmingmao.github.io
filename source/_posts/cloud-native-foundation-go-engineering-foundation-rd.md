---
title: Go Engineering - Foundation - RD
mathjax: false
date: 2022-04-30 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 功能需求

> 为 iamctl 新增 helloworld 命令，该命令向终端打印 hello world

# 开发阶段

## 代码开发

> 选择 **Git Flow**：适用于**大型非开源项目**

![](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/gitflow.webp)

<!-- more -->

### 创建分支

> 基于 develop 分支，新建一个功能分支 feature/helloworld

```
$ git checkout -b feature/helloworld develop
```

branch 名要符合 Git Flow 的分支命名规范，会通过 `pre-commit` 的 githook 来确保分支名符合规范

```
$ md5 ./githooks/pre-commit ./.git/hooks/pre-commit
MD5 (./githooks/pre-commit) = 3324d20a738461f3b6347f9ce7dae6b6
MD5 (./.git/hooks/pre-commit) = 3324d20a738461f3b6347f9ce7dae6b6
```

```bash ./.git/hooks/pre-commit
#!/usr/bin/env bash
LC_ALL=C

local_branch="$(git rev-parse --abbrev-ref HEAD)"

valid_branch_regex="^(master|develop)$|(feature|release|hotfix)\/[a-z0-9._-]+$|^HEAD$"

message="There is something wrong with your branch name. Branch names in this project must adhere to this contract: $valid_branch_regex. 
Your commit will be rejected. You should rename your branch to a valid name and try again."

if [[ ! $local_branch =~ $valid_branch_regex ]]
then
    echo "$message"
  echo ${local_branch} 1111
    exit 1
fi

exit 0
```

![15bb43219269273baf70a27ea94e1279](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/15bb43219269273baf70a27ea94e1279.webp)

> git 默认不会提交 .git/hooks 下的 githooks 脚本，可以借助 Makefile 来同步 -- 每次执行 make 命令时都会执行

```makefile scripts/make-rules/common.mk
# Copy githook scripts when execute makefile
COPY_GITHOOK:=$(shell cp -f githooks/* .git/hooks/)
```

### 生成模板

> 创建 helloworld 命令模板，包含 `low code` 思想 -- **代码自动生成**（提高开发效率 + 保证代码规范）

```
$ iamctl new helloworld -d internal/iamctl/cmd/helloworld
Command file generated: internal/iamctl/cmd/helloworld/helloworld.go
```

> 编辑 internal/iamctl/cmd/cmd.go

```go
import (
  ...
	"github.com/marmotedu/iam/internal/iamctl/cmd/helloworld"
)
	...
  {
    Message: "Troubleshooting and Debugging Commands:",
    Commands: []*cobra.Command{
      validate.NewCmdValidate(f, ioStreams),
      helloworld.NewCmdHelloworld(f, ioStreams), // 加载 helloworld 命令
    },
  },
```

### 生成代码

> 通过 make gen 生成的存量代码要具有**幂等性**

```
$ make gen
===========> Installing codegen
===========> Generating iam error code go source files
===========> Generating error code markdown documentation
===========> Generating missing doc.go for go packages
pkg/rollinglog/doc.go
pkg/rollinglog/distribution/doc.go
pkg/rollinglog/example/doc.go
pkg/rollinglog/klog/doc.go
pkg/rollinglog/logrus/doc.go
pkg/rollinglog/rolling/doc.go
pkg/validator/example/doc.go
```

```makefile Makefile
## gen: Generate all necessary files, such as error code files.
.PHONY: gen
gen:
	@$(MAKE) gen.run
```

```makefile scripts/make-rules/gen.mk
.PHONY: gen.run
gen.run: gen.clean gen.errcode gen.docgo.doc

.PHONY: gen.clean
gen.clean:
	@rm -rf ./api/client/{clientset,informers,listers}
	@$(FIND) -type f -name '*_generated.go' -delete

.PHONY: gen.errcode
gen.errcode: gen.errcode.code gen.errcode.doc

.PHONY: gen.errcode.code
gen.errcode.code: tools.verify.codegen
	@echo "===========> Generating iam error code go source files"
	@codegen -type=int ${ROOT_DIR}/internal/pkg/code

.PHONY: gen.errcode.doc
gen.errcode.doc: tools.verify.codegen
	@echo "===========> Generating error code markdown documentation"
	@codegen -type=int -doc \
		-output ${ROOT_DIR}/docs/guide/zh-CN/api/error_code_generated.md ${ROOT_DIR}/internal/pkg/code

.PHONY: gen.docgo.doc
gen.docgo.doc:
	@echo "===========> Generating missing doc.go for go packages"
	@${ROOT_DIR}/scripts/gendoc.sh
```

```makefile scripts/make-rules/tools.mk
.PHONY: tools.verify.%
tools.verify.%:
	@if ! which $* &>/dev/null; then $(MAKE) tools.install.$*; fi
```

### 版权检查（开源软件）

> 如果有新文件添加，需要检查新文件有没有添加版权头信息

```
$ make verify-copyright
===========> Verifying the boilerplate headers for all files
...
```

```makefile Makefile
## verify-copyright: Verify the boilerplate headers for all files.
.PHONY: verify-copyright
verify-copyright:
	@$(MAKE) copyright.verify
```

```makefile scripts/make-rules/copyright.mk
.PHONY: copyright.verify
copyright.verify: tools.verify.addlicense
	@echo "===========> Verifying the boilerplate headers for all files"
	@addlicense --check -f $(ROOT_DIR)/scripts/boilerplate.txt $(ROOT_DIR) --skip-dirs=third_party,vendor,_output

.PHONY: copyright.add
copyright.add: tools.verify.addlicense
	@addlicense -v -f $(ROOT_DIR)/scripts/boilerplate.txt $(ROOT_DIR) --skip-dirs=third_party,vendor,_output
```

```makefile scripts/make-rules/tools.mk
.PHONY: tools.verify.%
tools.verify.%:
	@if ! which $* &>/dev/null; then $(MAKE) tools.install.$*; fi
```

> 自动添加版权头

```
$ make add-copyright
```

### 代码格式化

```
$ make format          
===========> Installing golines
go: downloading github.com/segmentio/golines v0.9.0
...
===========> Formating codes
```

```makefile Makefile
## format: Gofmt (reformat) package sources (exclude vendor dir if existed).
.PHONY: format
format: tools.verify.golines tools.verify.goimports
	@echo "===========> Formating codes"
	@$(FIND) -type f -name '*.go' | $(XARGS) gofmt -s -w
	@$(FIND) -type f -name '*.go' | $(XARGS) goimports -w -local $(ROOT_PACKAGE)
	@$(FIND) -type f -name '*.go' | $(XARGS) golines -w --max-len=120 --reformat-tags --shorten-comments --ignore-generated .
	@$(GO) mod edit -fmt
```

| Package                | Desc                                                         |
| ---------------------- | ------------------------------------------------------------ |
| **`gofmt`**            | 格式化 go 代码                                               |
| **`goimports`**        | 自动增删依赖包，并将依赖包按照字母序排序并分类               |
| **`golines`**          | 把超过 120 行的代码按照 golines 规则，格式化成 < 120 行的代码 |
| **`go mod edit -fmt`** | 格式化 go.mod                                                |

### 静态代码检查

```
$ make lint
===========> Run golangci to lint source codes
...
```

### 单元测试

```
$ make test
===========> Run unit test
...
```

```makefile Makefile
## test: Run unit test.
.PHONY: test
test:
	@$(MAKE) go.test
```

> 并非所有包都需要单元测试；mock_.*.go 文件中的函数是不需要单元测试的

```makefile scripts/make-rules/golang.mk
.PHONY: go.test
go.test: tools.verify.go-junit-report
	@echo "===========> Run unit test"
	@set -o pipefail;$(GO) test -race -cover -coverprofile=$(OUTPUT_DIR)/coverage.out \
		-timeout=10m -shuffle=on -short -v `go list ./...|\
		egrep -v $(subst $(SPACE),'|',$(sort $(EXCLUDE_TESTS)))` 2>&1 | \
		tee >(go-junit-report --set-exit-code >$(OUTPUT_DIR)/report.xml)
	@sed -i '/mock_.*.go/d' $(OUTPUT_DIR)/coverage.out # remove mock_.*.go files from test coverage
	@$(GO) tool cover -html=$(OUTPUT_DIR)/coverage.out -o $(OUTPUT_DIR)/coverage.html
```

> 检查单元测试覆盖率，如果单元测试覆盖率不达标，禁止合并到 develop 和 master 分支 -- CI Pipeline

```
$ make cover # 默认测试覆盖率至少为60%

$ make cover COVERAGE=90
```

```makefile Makefile
## cover: Run unit test and get test coverage.
.PHONY: cover 
cover:
	@$(MAKE) go.test.cover
```

```makefile scripts/make-rules/golang.mk
.PHONY: go.test.cover
go.test.cover: go.test
	@$(GO) tool cover -func=$(OUTPUT_DIR)/coverage.out | \
		awk -v target=$(COVERAGE) -f $(ROOT_DIR)/scripts/coverage.awk
```

### 构建

```
$ make build

$ make build BINS="iam-apiserver iamctl"
```

### 默认操作

```
$ make
```

```makefile Makefile
# Build all by default, even if it's not first
.DEFAULT_GOAL := all

.PHONY: all
all: tidy gen add-copyright format lint cover build
```

## 代码提交

### commit + push

> 只添加与 feature/helloworld 相关的改动，而非 `git add .`

```
$ git add internal/iamctl/cmd/helloworld internal/iamctl/cmd/cmd.go
```

> `.git/hooks/commit-msg` 会检查 commit message 是否符合 Angular Commit Message 规范

```
$ git commit -m "feat: add new iamctl command 'helloworld'"
$ git push origin feature/helloworld
```

```bash .git/hooks/commit-msg
#!/usr/bin/env bash

go-gitlint --msg-file="$1
```

```shell .gitlint
--subject-regex=^((Merge branch.*of.*)|((revert: )?(feat|fix|perf|style|refactor|test|ci|docs|chore)(\(.+\))?: [^A-Z].*[^.]$))
--subject-maxlen=72
--body-regex=^([^\r\n]{0,72}(\r?\n|$))*$
```

### Github Actions

> 配置 Github Actions，当有代码被 Push 后，会触发 CI Pipeline，Pipeline 会执行 `make all`

![6819f96bda8dcb214c3b7eeba2f37022](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/6819f96bda8dcb214c3b7eeba2f37022.webp)

> 线上 CI 流程与本地 CI 流程要完全保持一致

```yaml .github/workflows/iamci.yaml
name: IamCI

on:
  push:
    branchs:
      - '*'
  pull_request:
    types: [ opened, reopened ]

jobs:

  iamci:
    name: Test with go ${{ matrix.go_version }} on ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    environment:
      name: iamci

    strategy:
      matrix:
        go_version: [ 1.16 ]
        os: [ ubuntu-latest ]

    steps:

      - name: Set up Go ${{ matrix.go_version }}
        uses: actions/setup-go@v2
        with:
          go-version: ${{ matrix.go_version }}
        id: go

      - name: Check out code into the Go module directory
        uses: actions/checkout@v2

      - name: Run go modules tidy
        run: |
          make tidy

      - name: Generate all necessary files, such as error code files
        run: |
          make gen

      - name: Check syntax and styling of go sources
        run: |
          make lint

      - name: Run unit test and get test coverage
        run: |
          make cover

      - name: Build source code for host platform
        run: |
          make build

      - name: Collect Test Coverage File
        uses: actions/upload-artifact@v1.0.0
        with:
          name: main-output
          path: _output/coverage.out

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Login to DockerHub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build docker images for host arch and push images to registry
        run: |
          make push
```

### 提交 PR

> 新 PR 被创建后，会触发 CI Pipeline

![53f4103f5c8cabb76ef2fddaec3a54ab](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/53f4103f5c8cabb76ef2fddaec3a54ab.webp)

### Code Review

> 如果 Review 不通过，开发者可以直接在 `feature/helloworld` 上修正代码，并再次 push（会触发 CI Pipeline）

![39d992c7bdb35848706bce792877e8ce](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/39d992c7bdb35848706bce792877e8ce.webp)

### 接受 PR

> 使用 **Create a merge commit**，底层操作为 `git merge --no-ff`，**方便回溯**

![30de6bb6c8ff431ec56debbc0f5b667d](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/30de6bb6c8ff431ec56debbc0f5b667d.webp)

### 关闭 PR

> 合并到 develop 后，会触发 CI Pipeline，关闭 PR

![444b0701f8866b50a49bd0138488c873](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/444b0701f8866b50a49bd0138488c873.webp)

# 测试阶段

## 创建分支

> 基于 develop 分支，创建 release 分支

```
$ git checkout -b release/1.0.0 develop
$ make
```

## Bug Fix

> 直接在 `release/1.0.0` 分支上修改代码，本地构建并 push 代码，线上 CI 成功后，则将代码提交给测试同学

```
$ make
$ git add internal/iamctl/cmd/helloworld/
$ git commit -m "fix: fix helloworld print bug"
$ git push origin release/1.0.0
```

## 代码合并

> 测试通过后，将 feature 分支合并到 master 分支和 develop 分支 -- **测试阶段的产物**

```
$ git checkout develop
$ git merge --no-ff release/1.0.0

$ git checkout master
$ git merge --no-ff release/1.0.0
$ git tag -a v1.0.0 -m "add print hello world"
```

## 删除分支

> 删除 feature 分支，选择性地删除 release 分支

```
$ git branch -d feature/helloworld
```

# Makefile 技巧

## help 自动解析

> 通过 sed 命令，自动解析 Makefile 中以 `##` 开头的注释行，自动生成 make help 输出

```makefile Makefile
## help: Show this help info.
.PHONY: help
help: Makefile
	@echo -e "\nUsage: make <TARGETS> <OPTIONS> ...\n\nTargets:"
	@sed -n 's/^##//p' $< | column -t -s ':' | sed -e 's/^/ /'
	@echo "$$USAGE_OPTIONS"
```

## Options

```makefile scripts/make-rules/common.mk
# Minimum test coverage
ifeq ($(origin COVERAGE),undefined)
COVERAGE := 60
endif
```

```
$ make
$ make COVERAGE=90
```

## CHANGELOG

> CHANGELOG 用来展示每个版本之间的变更内容，作为 **Release Note** 的一部分，借助 git-chglog 自动生成

```
$ tree .chglog
.chglog
├── CHANGELOG.tpl.md
└── config.yml
```

## 语义化版本号

> 借助 `gsemve` 工具，gsemver 会根据 Commit Message 自动生成版本号

```bash scripts/ensure_tag.sh
#!/usr/bin/env bash

version=v`gsemver bump`
if [ -z "`git tag -l $version`" ];then
  git tag -a -m "release version $version" $version
fi
```

> 后续的 Makefile 和 Shell 都会用到 scripts/make-rules/common.mk 中的 VERSION 变量

```makefile scripts/make-rules/common.mk
ifeq ($(origin VERSION), undefined)
VERSION := $(shell git describe --tags --always --match='v*')
endif
```

> 如果符合条件的 tag 指向最新提交，则只显示 tag 名字，否则会显示：**该 tag 后有多少次提交** + **最新的 commit id**

```
$ git describe --tags --always --match='v*'
v1.0.0-3-g1909e47
```

| 参数       | 描述                                                         |
| ---------- | ------------------------------------------------------------ |
| `--tags`   | 不仅仅使用带有注释的 tag，而是使用 `refs/tags` 名称空间下的任何 tag |
| `--always` | 显示唯一**缩写**的提交对象作为**后备**                       |
| `--match`  | 只考虑与给定模式相匹配的 tag                                 |
