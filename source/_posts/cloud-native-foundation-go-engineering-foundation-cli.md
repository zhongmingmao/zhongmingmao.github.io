---
title: Go Engineering - Foundation - CLI
mathjax: false
date: 2022-05-03 00:06:25
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# CLI

> Cobra 很好地集成了 Pflag 和 Viper

| 工具包    | 用途               |
| --------- | ------------------ |
| **Pflag** | **命令行参数**解析 |
| **Viper** | **配置文件**解析   |
| **Cobra** | **命令行框架**     |

# Pflag

> Pflag 通过创建 **Flag** 和 **FlagSet** 来使用，使用 Pflag 的开源项目：Kubernetes、Istio、Helm、Docker、Etcd

## Flag

> 一个**命令行参数**会被解析成一个 **Flag 类型的变量**

<!-- more -->

```go
// A Flag represents the state of a flag.
type Flag struct {
	Name                string              // name as it appears on command line
	Shorthand           string              // one-letter abbreviated flag
	Usage               string              // help message
	Value               Value               // value as set
	DefValue            string              // default value (as text); for usage message
	Changed             bool                // If the user set the value (or if left to default)
	NoOptDefVal         string              // default value (as text); if the flag is on the command line without any options
	Deprecated          string              // If this flag is deprecated, this string is the new or now thing to use
	Hidden              bool                // used by cobra.Command to allow flags to be hidden from help/usage text
	ShorthandDeprecated string              // If the shorthand of this flag is deprecated, this string is the new or now thing to use
	Annotations         map[string][]string // used by cobra.Command bash autocomple code
}
```

> 将 Flag 的值抽象成一个**接口**，可以自定义 Flag 类型

```go
// Value is the interface to the dynamic value stored in a flag.
// (The default value is represented as a string.)
type Value interface {
	String() string     // 将flag类型的值转换为string类型的值，并返回string的内容
	Set(string) error   // 将string类型的值转换为flag类型的值，转换失败报错
	Type() string       // 返回flag的类型，例如：string、int、ip等
}
```

## FlagSet

1. FlagSet 是一些**预先**定义好的 **Flag 集合**，几乎所有的 Pflag 操作都可以借助 FlagSet 提供的方法来完成
2. 获取 FlagSet
   - 调用 **NewFlagSet** 创建一个 FlagSet
   - 使用 Pflag 包定义的全局 FlagSet：**CommandLine**
     - `var CommandLine = NewFlagSet(os.Args[0], ExitOnError)`

> 自定义 FlagSet：通过定义一个新的 FlagSet 来定义**命令**及其**子命令**的 Flag

```go
var version bool
flagSet := pflag.NewFlagSet("test", pflag.ContinueOnError)
flagSet.BoolVar(&version, "version", true, "Print version information and quit.")
```

> 全局 FlagSet，适用于**不需要定义子命令**的命令行工具

```go
import (
    "github.com/spf13/pflag"
)

pflag.BoolVarP(&version, "version", "v", true, "Print version information and quit.")
```

> CommandLine 是一个**包级别**的变量

```go
var CommandLine = NewFlagSet(os.Args[0], ExitOnError)

func BoolVarP(p *bool, name, shorthand string, value bool, usage string) {
	flag := CommandLine.VarPF(newBoolValue(value, p), name, shorthand, usage)
	flag.NoOptDefVal = "true"
}
```

## Usage

### Definition

> 长选项 + 默认值 + 使用文本，返回指针

```go
name := pflag.String("name", "zhongmingmao", "Input Your Name")

pflag.Parse()
log.Println(*name)
```

> 长选项 + 短选项 + 默认值 + 使用文本，返回指针

```go
name := pflag.StringP("name", "n", "zhongmingmao", "Input Your Name")
```

> 长选项 + 默认值 + 使用文本，将标志的值绑定到变量

```go
var name string
pflag.StringVar(&name, "name", "zhongmingmao", "Input Your Name")
```

> 长选项 + 短选项 + 默认值 + 使用文本，将标志的值绑定到变量

```go
var name string
pflag.StringVarP(&name, "name", "n", "zhongmingmao", "Input Your Name")
```

### `Get<Type>`

> Type 为 Pflag 所支持的类型

![image-20220503153518143](https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220503153518143.png)

```go
flagName := "name"
pflag.String(flagName, "zhongmingmao", "Input Your Name")
pflag.Parse()

if name, err := pflag.CommandLine.GetString(flagName); err == nil {
  log.Println(name)
}
```

### Flag vs Arg

> **非选项参数：arg；选项参数（标志）：flag**

```go
flagName := "name"
name := pflag.String(flagName, "zhongmingmao", "Input Your Name")
pflag.Parse()

// flag
log.Println(*name)

// arg
log.Printf("%v, %v, %v\n", pflag.NArg(), pflag.Args(), pflag.Args()[0])
```

```
$ go run main.go --name zhongmingwu hello pflag
2022/05/03 15:42:49 zhongmingwu
2022/05/03 15:42:49 2, [hello pflag], hello
```

### Flag.NoOptDefVal

```go
flagName := "name"
name := pflag.String(flagName, "zhongmingmao", "Input Your Name")
pflag.Lookup(flagName).NoOptDefVal = "zhongmingwu"
pflag.Parse()

log.Println(*name)
```

```
$ go run main.go --name zhongmingwu            
2022/05/03 15:46:38 zhongmingwu

$ go run main.go --name            
2022/05/03 15:46:41 zhongmingwu

$ go run main.go       
2022/05/03 15:46:45 zhongmingmao
```

### MarkDeprecated

> help 文档中不会显式弃用的 flag

```go
pflag.String("protocol", "http", "")
pflag.String("proto", "https", "")
_ = pflag.CommandLine.MarkDeprecated("protocol", "please use --proto instead")
pflag.Parse()
```

```
$ ./main -h          
Usage of ./main:
      --proto string    (default "https")
pflag: help requested

$ ./main --protocol https
Flag --protocol has been deprecated, please use --proto instead

$ ./main --proto https
```

### MarkShorthandDeprecated

```go
flagName := "protocol"
pflag.StringP(flagName, "P", "http", "")
_ = pflag.CommandLine.MarkShorthandDeprecated(flagName, "please use --"+flagName+" only")
pflag.Parse()
```

```
$ ./main -h      
Usage of ./main:
      --protocol string    (default "http")
pflag: help requested

$ ./main -P https
Flag shorthand -P has been deprecated, please use --protocol only

$ ./main --protocol https
```

### MarkHidden

```go
pflag.String("user", "zhongmingmao", "")
pflag.String("password", "i do not know", "")
_ = pflag.CommandLine.MarkHidden("password")
pflag.Parse()
```

```
$ ./main -h              
Usage of ./main:
      --user string    (default "zhongmingmao")
pflag: help requested

$ ./main --user zhongmingmao

$ ./main --user zhongmingmao --password 123456
```

# Viper

> Viper 能够处理**不同格式**的配置文件，**Viper Key** 是**不区分大小写**

## 配置优先级

> 高优先级的配置会**覆盖**低优先级的配置，优先级**由高到低**如下

1. 通过 `viper.Set` 函数**显式设置**的配置 -- Go 代码
2. 命令行参数
3. 环境变量
4. 配置文件
5. 远程 KV 存储
6. 默认值

## 读入配置

> 将配置读入 Viper 中

### 默认值

```go
viper.SetDefault("name", "zhongmingmao")
viper.SetDefault("info", map[string]interface{}{"name": "zhongmingmao", "location": "China"})
```

### 配置文件

> 支持 **JSON**、**TOML**、**YAML**、**Properties**、**Env** 等格式；支持**多路径搜索**

```yaml config config_search.yaml
spring:
  boot:
    name: collector
  server:
    port: 8080

profile:
  active: prod

debug:
  enable: true
  port: 9090
```

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v2"
	"log"
)

var (
	cfg  = pflag.StringP("config", "c", "", "Configuration file.")
	help = pflag.BoolP("help", "h", false, "Show help message.")
)

func init() {
	pflag.Parse()
}

func main() {
	if *help {
		pflag.Usage()
		return
	}

	if *cfg != "" {
		viper.SetConfigFile(*cfg)
		viper.SetConfigType("yaml")
	} else {
		//多路径搜索
		viper.AddConfigPath(".")
		viper.AddConfigPath("$GOPATH/src/")
		//尝试搜索：config_search.yaml、config_search.json 等
		viper.SetConfigName("config_search")
	}

	if err := viper.ReadInConfig(); err != nil {
		panic(fmt.Errorf("Fatal error config file: %v", err))
	}

	//序列化
	marshal, _ := yaml.Marshal(viper.AllSettings())
	log.Printf("\n%s\n", string(marshal))
}
```

```
$ ls                                                                              
config             config_search.yaml go.mod             go.sum             main               main.go

$ ./main -h
Usage of ./main:
  -c, --config string   Configuration file.
  -h, --help            Show help message.
  
$ ./main -c config                                                                       
2022/05/03 16:46:07 
debug:
  enable: true
  port: 9090
profile:
  active: prod
spring:
  boot:
    name: collector
  server:
    port: 8080
    
$ ./main          
2022/05/03 16:46:23 
debug:
  enable: true
  port: 9090
profile:
  active: prod
spring:
  boot:
    name: collector
  server:
    port: 8080
```

### 热加载

> 不建议使用热加载功能，因为不一定能实际生效，例如修改监听端口等

```go
viper.WatchConfig()
viper.OnConfigChange(func(in fsnotify.Event) {
  log.Printf("Config changed, %s\n", in.Name)
})
```

### 显式设置

```go
//覆盖配置文件中对应的值
viper.Set("profile.active", "dev")
```

```
$ ./main          
2022/05/03 16:56:12 
debug:
  enable: true
  port: 9090
profile:
  active: dev
spring:
  boot:
    name: collector
  server:
    port: 8080
```

### 环境变量

> Viper **读取环境变量**是**区分大小写**的

```go
SetEnvPrefix(in string)

BindEnv(input ...string) error // BindEnv binds a Viper key to a ENV variable.
SetEnvKeyReplacer(r *strings.Replacer)

AllowEmptyEnv(allowEmptyEnv bool)

AutomaticEnv()
```

#### SetEnvPrefix

> 用来确保环境变量是**唯一**的

```go
viper.SetEnvPrefix("viper")
viper.AutomaticEnv()
log.Println(viper.Get("api_version")) // VIPER_API_VERSION
```

```
$ VIPER_API_VERSION=0.0.1 go run main.go
2022/05/03 17:03:17 0.0.1
```

#### SetEnvKeyReplacer + BindEnv

```go
id := "user.secret-id"
key := "user.secret-key"
viper.SetEnvPrefix("VIPER")
// . -> _
// - -> _
viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
viper.BindEnv(id, "USER_SECRET_ID") // USER_SECRET_ID
viper.BindEnv(key)                  // VIPER_USER_SECRET_KEY

log.Printf("%v %v\n", viper.Get(id), viper.IsSet(id))
log.Printf("%v %v\n", viper.Get(key), viper.IsSet(key))
```

```
$ USER_SECRET_ID=1 VIPER_USER_SECRET_KEY=key go run main.go
2022/05/03 17:17:30 1 true
2022/05/03 17:17:30 key true

$ USER_SECRET_ID=1 VIPER_USER_SECRET_KEY= go run main.go   
2022/05/03 17:17:32 1 true
2022/05/03 17:17:32 <nil> false
```

#### AllowEmptyEnv

> 默认情况下，**空环境**变量会被认为**未设置**

```go
viper.AllowEmptyEnv(true)
```

```
$ USER_SECRET_ID=1 VIPER_USER_SECRET_KEY= go run main.go
2022/05/03 17:18:49 1 true
2022/05/03 17:18:49  true
```

### Key bind Flag

> Viper 支持 Pflag，能够绑定 **Viper key** 到 **Pflag flag**；绑定时不会设置该值，在**访问**时才会**设置**

```go
pflag.String("id", "xxx", "")
pflag.String("key", "yyy", "")
//绑定 Flag
_ = viper.BindPFlag("v.id", pflag.Lookup("id"))
//绑定 FlagSet
_ = viper.BindPFlags(pflag.CommandLine)
pflag.Parse()

log.Println(viper.Get("v.id"))
log.Println(viper.Get("key"))
```

```
$ go run main.go --id 1
2022/05/03 17:29:56 1
2022/05/03 17:29:56 yyy
```

## 读取配置

> Get 在**找不到**值的时候都会返回**零值**，可以通过 `IsSet` 来判断 key 是否存在

```go
Get(key string) interface{}
Get<Type>(key string) <Type>
AllSettings() map[string]interface{}
IsSet(key string) bool
```

### 嵌套的键

> 嵌套的路径通过 `.` 进行分隔

```yaml config
spring:
  boot:
    name: collector
  server:
    port: 8080

profile:
  active: prod

debug:
  enable: true
  port: 9090
```

```go
log.Println(viper.GetString("spring.boot.name"))
```

```
$ ./main -c config
2022/05/03 17:39:43 
debug:
  enable: true
  port: 9090
profile:
  active: dev
spring:
  boot:
    name: collector
  server:
    port: 8080

2022/05/03 17:39:43 collector
```

>  如果 Key 被更高优先级的配置**覆盖**，该 Key 下的所有子 Key 都是**未定义状态**

```go
viper.Set("spring.boot", "overlay")
log.Println(viper.IsSet("spring.boot.name")) // false
```

> 如果存在与分隔的路径**完全匹配**的 Key，直接返回其值

```yaml config
spring.boot.name: client
spring:
  boot:
    name: collector
  server:
    port: 8080

profile:
  active: prod

debug:
  enable: true
  port: 9090
```

```go
log.Println(viper.Get("spring.boot.name"))
```

```
$ ./main -c config
2022/05/03 17:45:34 
debug:
  enable: true
  port: 9090
profile:
  active: dev
spring:
  boot:
    name: client
  server:
    port: 8080

2022/05/03 17:45:34 client
```

### 反序列化

```go
type Boot struct {
	name string
}

type Server struct {
	port int
}

type Spring struct {
	boot   Boot
	server Server
}

type Profile struct {
	active bool
}

type Debug struct {
	enable    bool
	debugPort int `mapstructure:"port"`
}

type YamlConfig struct {
	spring  Spring
	profile Profile
	debug   Debug
}
```

```go
var yc = YamlConfig{}
_ = viper.Unmarshal(&yc)
yamlSettings, _ := yaml.Marshal(viper.AllSettings())
log.Printf("\n%s\n", string(yamlSettings))
jsonSettings, _ := json.Marshal(viper.AllSettings())
log.Printf("\n%s\n", string(jsonSettings))
```

```
$ ./main -c config
2022/05/03 17:57:58 
debug:
  enable: true
  port: 9090
profile:
  active: prod
spring:
  boot:
    name: collector
  server:
    port: 8080

2022/05/03 17:57:58 
{"debug":{"enable":true,"port":9090},"profile":{"active":"prod"},"spring":{"boot":{"name":"collector"},"server":{"port":8080}}}
```

# Cobra

> 建立在 **commands**（命令）、**arguments**（非选项参数） 和 **flags**（选项参数） 之上

```
# clone 是一个命令，URL 是一个非选项参数，bare 是一个选项参数
$ git clone URL --bare
```

## 实践

> 使用 Cobra 库创建命令

### root

```go cmd/root.go
package cmd

import (
	"github.com/mitchellh/go-homedir"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"log"
	"os"
)

var gitCmd = &cobra.Command{
	Use:   "git",
	Short: "Short",
	Long:  "Long",
	Run: func(cmd *cobra.Command, args []string) {
		log.Println("Run in cmd: git")
	},
}

var (
	cfg     string
	path    string
	license string
)

func init() {
	cobra.OnInitialize(initConfig)

	gitCmd.PersistentFlags().StringVarP(&cfg, "config", "c", "", "config file (default is $HOME/.cobra.yaml)")
	gitCmd.PersistentFlags().StringVarP(&path, "path", "p", "", "base project directory")
	gitCmd.PersistentFlags().StringVarP(&license, "license", "l", "", "Name of license for the project")

	_ = viper.BindPFlag("v.path", gitCmd.PersistentFlags().Lookup("path"))
	_ = viper.BindPFlag("v.license", gitCmd.PersistentFlags().Lookup("license"))
	viper.SetDefault("v.license", "MIT")
}

func initConfig() {
	if cfg != "" {
		viper.SetConfigFile(cfg)
	} else {
		home, err := homedir.Dir()
		if err != nil {
			log.Println(err)
			os.Exit(1)
		}
		viper.AddConfigPath(home)
		viper.SetConfigName(".cobra")
	}

	if err := viper.ReadInConfig(); err != nil {
		log.Println(err)
		os.Exit(1)
	}
}

func Execute() {
	if err := gitCmd.Execute(); err != nil {
		log.Println(err)
		os.Exit(1)
	}
}
```

### main

```go main.go
package main

import "github.com/zhongmingmao/cli/cobra/cmd"

func main() {
	cmd.Execute()
}
```

```
$ ./main -h
Long

Usage:
  git [flags]

Flags:
  -c, --config string    config file (default is $HOME/.cobra.yaml)
  -h, --help             help for git
  -l, --license string   Name of license for the project
  -p, --path string      base project directory
  
$ ./main   
2022/05/03 18:34:00 Run in cmd: git
```

### AddCommand

```go cmd/version.go
package cmd

import (
	"github.com/spf13/cobra"
	"log"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Long:  "Print the version code",
	Run: func(cmd *cobra.Command, args []string) {
		log.Println("git version 2.36.0")
	},
}

func init() {
	gitCmd.AddCommand(versionCmd)
}
```

```
$ ./main -h
Long

Usage:
  git [flags]
  git [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  version     Print the version number

Flags:
  -c, --config string    config file (default is $HOME/.cobra.yaml)
  -h, --help             help for git
  -l, --license string   Name of license for the project
  -p, --path string      base project directory

Use "git [command] --help" for more information about a command.

$ ./main version
2022/05/03 18:36:00 git version 2.36.0
```

## 核心特性

### pflag

> Cobra 可以与 Pflag 集成，使用强大的标志功能

#### 持久化

> 持久化：该标志可用于它所分配的命令以及该命令下的每个子命令

```go
rootCmd.PersistentFlags().Bool("viper", true, "Use Viper for configuration")
```

#### 本地

> 本地：只能用在它所绑定的命令上

```go
rootCmd.Flags().StringVarP(&Source, "source", "s", "", "Source directory to read from")
```

> `--source` 只能在 rootCmd 上引用，而不能在 rootCmd 的子命令上引用，例如 version

#### 标志绑定到 Viper

> 将标志绑定到 Viper 上，后续可以通过 viper.Get() 来获取标志的值

```go
var author string

func init() {
  rootCmd.PersistentFlags().StringVar(&author, "author", "YOUR NAME", "Author name for copyright attribution")
  viper.BindPFlag("author", rootCmd.PersistentFlags().Lookup("author"))
}
```

#### 必选标志

> 默认情况下，标志为可选的

```go
rootCmd.Flags().StringVarP(&Region, "region", "r", "", "AWS region (required)")
rootCmd.MarkFlagRequired("region")
```

### 非选项参数验证

> 可以使用 Command 的 Args 字段来验证非选项参数，或者通过 Cobra 的内置验证函数

| Cobra 内置验证函数  | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| NoArgs              | 如果存在任何非选项参数，报错                                 |
| ArbitraryArgs       | 接受任意非选项参数                                           |
| OnlyValidArgs       | 任何非选项参数不在 Command 的 ValidArgs 字段中，报错         |
| MinimumNArgs(int)   | 少于 N 个非选项参数，报错                                    |
| MaximumNArgs(int)   | 多于 N 个非选项参数，报错                                    |
| ExactArgs(int)      | 不等于 N 个非选项参数，报错                                  |
| ExactValidArgs(int) | 不等于 N 个非选项参数 或者 非选项参数不在 Command 的 ValidArgs 字段中，报错 |
| RangeArgs(min, max) | 非选项参数的个数不在 min 和 max 之间，报错                   |

> 内置验证函数

```go
var cmd = &cobra.Command{
  Short: "hello",
  Args: cobra.MinimumNArgs(1), // 使用内置的验证函数
  Run: func(cmd *cobra.Command, args []string) {
    fmt.Println("Hello, World!")
  },
}
```

> 自定义验证函数

```go
var cmd = &cobra.Command{
  Short: "hello",
  // Args: cobra.MinimumNArgs(10), // 使用内置的验证函数
  Args: func(cmd *cobra.Command, args []string) error { // 自定义验证函数
    if len(args) < 1 {
      return errors.New("requires at least one arg")
    }
    if myapp.IsValidColor(args[0]) {
      return nil
    }
    return fmt.Errorf("invalid color specified: %s", args[0])
  },
  Run: func(cmd *cobra.Command, args []string) {
    fmt.Println("Hello, World!")
  },
}
```

### Hooks: PreRun + PostRun

> 在运行 Run 函数时，可以运行一些 Hook 函数

> 如果子命令没有指定的 `Persistent*Run` 函数，则将继承父命令的 `Persistent*Run` 函数

| 运行顺序 | Hook              |
| -------- | ----------------- |
| 1        | PersistentPreRun  |
| 2        | PreRun            |
| 3        | Run               |
| 4        | PostRun           |
| 5        | PersistentPostRun |

> 父级的 PreRun 只会在父级命令运行时调用，子命令不会调用
