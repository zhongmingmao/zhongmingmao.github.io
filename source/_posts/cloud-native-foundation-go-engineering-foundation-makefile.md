---
title: Go Engineering - Foundation - Makefile
mathjax: false
date: 2022-04-23 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 使用

1. 先编写 Makefile 文件，指定整个项目的**编译规则**，然后通过 Linux **make** 命令来解析该 Makefile 文件，实现**自动化**
2. 默认情况下，make 命令会在当前目录下，按照 GNUmakefile、makefile、**Makefile**（推荐）的顺序查找
   - `make -f golang.mk` 或者 `make --file golang.mk`

# 规则

1. 规则一般由**目标**、**依赖**和**命令**组成，用来指定**源文件编译的先后顺序**
2. Makefile 规则可以自动判断是否需要**重新编译**某个目标，从而确保**目标仅在需要时编译**

## 规则语法

> 主要包括：**target**、**prerequisites** 和 **command**

```
target ...: prerequisites ...
    command
	  ...
	  ...
```

<!-- more -->

1. target
   - 可以是一个 object file，也可以是一个执行文件，还可以是一个标签
   - 可以使用**通配符**，当有多个目标时，使用**空格**分隔
2. prerequisites：代表生成该 target 所需要的依赖项，当有多个依赖项时，使用**空格**分隔
3. command：代表该 target 要执行的命令
   - 在执行 command 之前，默认会先**打印**出该命令，然后再输出命令的结果
   - 如果不想打印出命令，使用**`@command`**
   - command 可以为多条，也可以分行写，但每行都要以 **tab** 开始
   - 如果后一条命令**依赖**前一条命令，则这两条命令需要写在**同一行**，并用**分号**进行分隔
   - 如果要**忽略**命令的错误，使用**`-command`**

> 只要 target **不存在**，或 prerequisites 中有一个以上的文件比 target 文件**新**，command 会被执行

```c hello.c
#include <stdio.h>
int main()
{
  printf("Hello World!\n");
  return 0;
}
```

```makefile Makefile
hello: hello.o
	gcc -o hello hello.o

hello.o: hello.c
	gcc -c hello.c

clean:
	rm hello
```

```
$ make
gcc -c hello.c
gcc -o hello hello.o

$ ls
Makefile hello    hello.c  hello.o

$ make
make: 'hello' is up to date.

$ touch hello.c

$ make
gcc -c hello.c
gcc -o hello hello.o

$ make clean
rm hello
```

## 伪目标

> Makefile 的管理能力基本上都是通过伪目标来实现的

1. 上面的 clean 是一个伪目标，既**不会为该目标生成任何文件**
2. **伪目标不是文件**，make 无法生成它的**依赖关系**，也无法决定**是否执行**它
3. 通常情况下，需要**显式标识**一个目标是伪目标，如`.PHONY`
4. **伪目标可以有依赖文件**，也可以作为默认目标
5. **伪目标总是会被执行**，所以其依赖总是会被决议

```makefile
.PHONY: all
all: lint test build
```

## order-only 依赖

```
targets : normal-prerequisites | order-only-prerequisites
    command
    ...
    ...
```

1. 只有**第一次**构造 targets 时，才会使用 order-only-prerequisites
2. 后面即使 order-only-prerequisites 发生变化，也不会重新构造 targets
3. 只有 normal-prerequisites 中的文件发生改变时，才会重新构造 targets

# 语法

## 命令

> Makefile 支持 **Linux 命令**，默认会**打印正在执行的命令**，可以使用 **`@`** 来禁止 -- **推荐**

```makefile
.PHONY: test
test:
	echo "hello world"
```

```
$ make
echo "hello world"
hello world
```

```makefile
.PHONY: test
test:
	@echo "hello world"
```

```
$ make
hello world
```

> 命令执行后 make 会检查其返回码，如果成功则执行下一条指令，否则终止，可以使用 `-` 忽略出错命令

```makefile
clean:
	-@rm not_exist_file
	@echo "hello world"
```

```
$ make clean
rm: not_exist_file: No such file or directory
make: [Makefile:7: clean] Error 1 (ignored)
hello world
```

## 变量

> Makefile 支持**变量赋值**，**多行变量**和**环境变量**，还内置了**特殊变量**和**自动化变量**

### 变量引用

> 引用变量，可以通过 `${}` 或者 **`$()`** -- 推荐 

```makefile
GO=go
build:
	@$(GO) build -v .
```

> 展开后为

```makefile
GO=go
build:
	@go build -v .
```

### 变量赋值

#### =

> B 最后的值为 c b，取的是**最终**的变量值

```makefile
A = a
B = $(A) b
A = c
```

#### :=

> B 最后的值为 a b，赋予**当前位置**的值

```
A = a
B := $(A) b
A = c
```

#### ?=

> 如果该变量**没有被赋值**，则赋予等号后的值

```makefile
PLATFORMS ?= linux_amd64 linux_arm64
Arch := X86
Arch ?= ARM

info:
	@echo $(PLATFORMS)
	@echo $(Arch)
```

```
$ make info 
linux_amd64 linux_arm64
X86
```

#### +=

> 将等号后面的值添加到前面的变量

```makefile
Archs := X86
Archs += ARM

info:
	@echo $(Archs)
```

```
$ make info 
X86 ARM
```

#### 多行变量

> 通过 **define** 关键字设置多行变量，变量中允许**换行**，变量的内容可以包含**函数**、**命令**和**变量**

```makefile
define USAGE_OPTIONS

Options:
  DEBUG        Whether to generate debug symbols. Default is 0.
  BINS         The binaries to build. Default is all of cmd.
  V            Set to 1 enable verbose build. Default is 0.
endef
```

### 环境变量

> 分类：**预定义**的环境变量 + **自定义**的环境变量（可**覆盖**预定义环境变量）
> 环境变量默认**只在当前 Makefile 有效**，如果要**传递**给另一个 Makefile，使用 **export** 关键字来声明

```makefile
...
export USAGE_OPTIONS
...
```

### 特殊变量

> 特殊变量是 make 提前定义好的，可以在 makefile 中直接引用

![c1cba21aaed2eb0117yyb0470byy641d](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/c1cba21aaed2eb0117yyb0470byy641d.webp)

```makefile
info:
	@echo "MAKE:" $(MAKE)
	@echo "MAKECMDGOALS:" $(MAKECMDGOALS)
	@echo "CURDIR:" $(CURDIR)
	@echo "MAKE_VERSION:" $(MAKE_VERSION)
	@echo "MAKEFILE_LIST:" $(MAKEFILE_LIST)
	@echo ".DEFAULT_GOAL:" $(.DEFAULT_GOAL)
	@echo ".FEATURES:" $(.FEATURES)
	@echo ".INCLOUD_DIRS:" $(.INCLOUD_DIRS)
```

```
$ make info
MAKE: make
MAKECMDGOALS: info
CURDIR: /Users/zhongmingmao/Downloads/make_file/var
MAKE_VERSION: 4.3
MAKEFILE_LIST: Makefile
.DEFAULT_GOAL: info
.FEATURES: target-specific order-only second-expansion else-if shortest-stem undefine oneshell nocomment grouped-target extra-prereqs archives jobserver output-sync check-symlink load
.INCLOUD_DIRS:
```

### 自动化变量

>作用：提高编写 Makefile 的**效率**和**质量**
>Makefile 的 **targets** 和 **prerequisites** 都是一系列**文件**
>自动化变量：把模式中所定义的一系列文件**自动挨个取出**，一直到所有**符合模式**的文件都取完为止
>自动化变量只出现在规则的 **command** 中

![13ec33008eaff973c0dd854a795ff712](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/13ec33008eaff973c0dd854a795ff712.webp)

> `$*` 使用最为广泛，如果目标文件的**后缀**能被 make 识别，那么 `$*` 就是**除了后缀**的那部分，如 `foo.c` -> `foo`

## 条件

```makefile
info:
  ifeq ($(ROOT_PACKAGE),)
		$(error the variable ROOT_PACKAGE must be set prior to including golang.mk)
  else
		$(info the value of ROOT_PACKAGE is $(ROOT_PACKAGE))
  endif
```

### ifeq

> 条件判断，判断是否相等，可以用 make **函数**或者**变量**代替 arg1 或者 arg2

```
ifeq (<arg1>, <arg2>)
ifeq '<arg1>' '<arg2>'
ifeq "<arg1>" "<arg2>"
ifeq "<arg1>" '<arg2>'
ifeq '<arg1>' "<arg2>"

ifeq ($(origin ROOT_DIR), undefined) # origin 是函数
ifeq ($(ROOT_PACKAGE), )
```

### ifneq

> 条件判断，判断是否**不相等**，与 `ifeq` 类似

### ifdef

> 条件判断，判断变量是否**已定义**（如果值非空，则表达式为真，否则为假），也可以是**函数的返回值**

```
ifdef <variable-name>
```

### ifndef

> 条件判断，判断变量是否**未定义**，与 `ifdef` 类似

## 函数

### 自定义函数

> define 本质上是定义一个**多行变量**，可以在 **`call`** 的作用下**当作函数**来使用，其它位置只能**当作多行变量**来使用

```makefile
.PHONY: test

define Foo
	@echo "func name is $(0)"
	@echo "params[1] => $(1)"
	@echo "params[2] => $(2)"
endef

test:
	@echo $(call Foo, hello, zhongmingmao) # 当作函数
	@echo "==========="
	@echo $(Foo) # 当作多行变量
```

```
$ make
@echo func name is Foo
params[1] =>  hello
params[2] =>  zhongmingmao
===========
@echo func name is 
params[1] => 
params[2] => 
```

> 自定义函数是一种**过程调用**，**没有任何返回值**

### 预定义函数

> arguments 之间使用 `,` 分隔，函数的参数也可以是变量

```
$(<function> <arguments>)

${<function> <arguments>}
```

```makefile
.PHONY: all

PLATFORM := linux_amd64
GOOS := $(word 2, $(subst _, "", $(PLATFORM)))

all:
	@echo $(GOOS)
```

```
$ make
amd64
```

## 复用

```makefile
include scripts/make-rules/common.mk
include scripts/make-rules/golang.mk
```

```makefile
include scripts/make-rules/*
```

> 忽略无法读取的文件，继续执行

```makefile
-include <filename>
```

# 实践

## 功能规划

> 小部分功能是通过目标文件实现的，大部分功能是通过**伪目标**来实现的

```
$ make help

Usage: make <TARGETS> <OPTIONS> ...

Targets:
  build              Build source code for host platform.
  build.multiarch    Build source code for multiple platforms. See option PLATFORMS.
  image              Build docker images for host arch.
  image.multiarch    Build docker images for multiple platforms. See option PLATFORMS.
  push               Build docker images for host arch and push images to registry.
  push.multiarch     Build docker images for multiple platforms and push images to registry.
  deploy             Deploy updated components to development env.
  clean              Remove all files that are created by building.
  lint               Check syntax and styling of go sources.
  test               Run unit test.
  cover              Run unit test and get test coverage.
  release            Release iam
  format             Gofmt (reformat) package sources (exclude vendor dir if existed).
  verify-copyright   Verify the boilerplate headers for all files.
  add-copyright      Ensures source code files have copyright license headers.
  gen                Generate all necessary files, such as error code files.
  ca                 Generate CA files for all iam components.
  install            Install iam system with all its components.
  swagger            Generate swagger document.
  serve-swagger      Serve swagger spec and docs.
  dependencies       Install necessary dependencies.
  tools              install dependent tools.
  check-updates      Check outdated dependencies of the go projects.
  help               Show this help info.

Options:
  DEBUG            Whether to generate debug symbols. Default is 0.
  BINS             The binaries to build. Default is all of cmd.
                   This option is available when using: make build/build.multiarch
                   Example: make build BINS="iam-apiserver iam-authz-server"
  IMAGES           Backend images to make. Default is all of cmd starting with iam-.
                   This option is available when using: make image/image.multiarch/push/push.multiarch
                   Example: make image.multiarch IMAGES="iam-apiserver iam-authz-server"
  REGISTRY_PREFIX  Docker registry prefix. Default is marmotedu. 
                   Example: make push REGISTRY_PREFIX=ccr.ccs.tencentyun.com/marmotedu VERSION=v1.6.2
  PLATFORMS        The multiple platforms to build. Default is linux_amd64 and linux_arm64.
                   This option is available when using: make build.multiarch/image.multiarch/push.multiarch
                   Example: make image.multiarch IMAGES="iam-apiserver iam-pump" PLATFORMS="linux_amd64 linux_arm64"
  VERSION          The version information compiled into binaries.
                   The default is obtained from gsemver or git.
  V                Set to 1 enable verbose build. Default is 0.
```

## 设计结构

> 分层设计，根目录聚合所有的 Makefile 命令，具体实现则按功能分类，放在另外的 Makefile 中
> 将复杂的 Shell 命令封装在 Shell 脚本中，供 Makefile 直接调用

![5c524e0297b6d6e4e151643d2e1bbbf7](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/5c524e0297b6d6e4e151643d2e1bbbf7.webp)

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

## 编写技巧

### 通配符 + 自动变量

> Makefile 允许对 **target** 进行类似正则运算的匹配，主要通配符为 `%`

```makefile
tools.verify.%:
  @if ! which $* &>/dev/null; then $(MAKE) tools.install.$*; fi
```

1. 通过使用通配符，可以使**不同的 target 使用相同的规则**，扩展性更强
2. `make tools.verify.swagger` 和 `make tools.verify.mockgen` ，`%` 分别代表 swagger 和 mockgen
   - `$*`：用来指代被匹配的值 `swagger` 和 `mockgen`
3. 命名清晰：`tools.verify.%` 位于 `scripts/make-rules/tools.mk` 的 `verify` 分类

```makefile
tools.verify.%:
	@echo $*
```

```
$ make tools.verify.swagger
swagger

$ make tools.verify.mockgen
mockgen
```

### 依赖需要用到的工具

1. 如果 Makefile 某个 target 的 command 用到了某个工具，可以将该工具放在 target 的 prerequisites 中
2. 当执行该 target 时，可以检查系统是否安装了该工具，如果没有安装则自动安装，实现更高程度的自动化

> format 依赖 tools.verify.golines 和 tools.verify.goimports

```makefile
.PHONY: format
format: tools.verify.golines tools.verify.goimports
  @echo "===========> Formating codes"
  @$(FIND) -type f -name '*.go' | $(XARGS) gofmt -s -w
  @$(FIND) -type f -name '*.go' | $(XARGS) goimports -w -local $(ROOT_PACKAGE)
  @$(FIND) -type f -name '*.go' | $(XARGS) golines -w --max-len=120 --reformat-tags --shorten-comments --ignore-generated .
```

>`tools.verify.%` 会先检查工具是否安装，如果没有安装则通过 `tools.install.$*` 来安装

```makefile
tools.verify.%:
  @if ! which $* &>/dev/null; then $(MAKE) tools.install.$*; fi
```

```makefile
.PHONY: install.golines
install.golines:
  @$(GO) get -u github.com/segmentio/golines
```

### 编写可扩展的 Makefile

1. 可以在**不改变** Makefile 结构的情况下添加新功能 -- 设计合理的 Makefile 结构
2. 扩展项目时，新功能可以**自动纳入**到 Makefile 的现有逻辑中 -- 利用**通配符**、**自动变量**和**函数**等

> 执行 make go.build 时可以构建 `cmd/` 目录下的**所有组件**

```makefile
COMMANDS ?= $(filter-out %.md, $(wildcard ${ROOT_DIR}/cmd/*))
BINS ?= $(foreach cmd,${COMMANDS},$(notdir ${cmd}))

.PHONY: go.build
go.build: go.build.verify $(addprefix go.build., $(addprefix $(PLATFORM)., $(BINS)))
.PHONY: go.build.%               

go.build.%:
  $(eval COMMAND := $(word 2,$(subst ., ,$*)))
  $(eval PLATFORM := $(word 1,$(subst ., ,$*)))
  $(eval OS := $(word 1,$(subst _, ,$(PLATFORM))))           
  $(eval ARCH := $(word 2,$(subst _, ,$(PLATFORM))))                         
  @echo "===========> Building binary $(COMMAND) $(VERSION) for $(OS) $(ARCH)"
  @mkdir -p $(OUTPUT_DIR)/platforms/$(OS)/$(ARCH)
  @CGO_ENABLED=0 GOOS=$(OS) GOARCH=$(ARCH) $(GO) build $(GO_BUILD_FLAGS) -o $(OUTPUT_DIR)/platforms/$(OS)/$(ARCH)/$(COMMAND)$(GO_OUT_EXT) $(ROOT_PACKAGE)/cmd/$(COMMAND)
```

### 设置 OPTIONS

> 是否有定义

```makefile
define USAGE_OPTIONS    
                         
Options:
  ...
  BINS         The binaries to build. Default is all of cmd.
               ...
  ...
  V            Set to 1 enable verbose build. Default is 0.    
endef    
export USAGE_OPTIONS
```

```makefile
ifndef V    
MAKEFLAGS += --no-print-directory    
endif
```

```makefile
ifeq ($(origin V), undefined)                                
MAKEFLAGS += --no-print-directory              
endif
```

> 是否已经被赋值

```makefile
BINS ?= $(foreach cmd,${COMMANDS},$(notdir ${cmd}))
...
go.build: go.build.verify $(addprefix go.build., $(addprefix $(PLATFORM)., $(BINS)))
```

### 其他技巧

1. 善用（预定义）函数
2. 把常用功能放在 `/Makefile` 中，不常用功能放在分类的 Makefile 中，并在 `/Makefile` 中 include 这些分类的 Makefile
3. 将所有输出放在**同一个目录**下，方便清理和查找
4. 使用**带层级**的命名方式，如 `tools.verify.swagger`，可以实现**目标分组管理**
5. 合理地拆分 target，尽量地松耦合
6. 定义环境变量，与编程中的宏类似
