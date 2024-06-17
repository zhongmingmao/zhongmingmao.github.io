---
title: Go Engineering - CLI
mathjax: false
date: 2023-05-10 00:06:25
cover: https://go-engineering-1253868755.cos.ap-guangzhou.myqcloud.com/go-engineering-framework.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Go Engineering
tags:
  - Cloud Native
  - Go Engineering
  - Go
---

# 应用框架

1. 命令行参数解析 - `Pflag`
2. 配置文件解析 - `Viper`
3. 应用的命令行框架 - `Cobra`
   - 命令需要具备 help 功能
   - 命令需要能够解析命令行参数和配置文件
   - 命令需要能够初始化业务代码，并最终启动业务进程

<!-- more -->

# Pflag

> 命令行参数解析工具 - Kubernetes / Istio / Helm / Docker / Etcd / ...

## Flag

> 一个命令行参数会被解析成一个 Flag 类型的变量

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

> 将 Flag 的值抽象成一个 interface 接口，可以自定义 Flag 类型

```go
// Value is the interface to the dynamic value stored in a flag.
// (The default value is represented as a string.)
type Value interface {
	String() string    // 将 Flag 类型的值转换为 string 类型的值，并返回 string 的内容
	Set(string) error  // 将 string 类型的值转换为 Flag 类型的值，转换失败报错
	Type() string      // 返回 Flag 的类型，如 string、int 等
}
```

## FlagSet

> 预先定义好的 Flag 的集合

1. 调用 `NewFlagSet` 创建一个 FlagSet
2. 使用 Pflag 包定义的全局 FlagSet - `CommandLine`
   - CommandLine 也是由 NewFlagSet 函数创建

### NewFlagSet

> 通过定义一个新的 FlagSet 来定义`命令`及其`子命令`的 Flag

```go
package main

import (
	"fmt"
	"os"

	"github.com/spf13/pflag"
)

func main() {
	flags := pflag.NewFlagSet("test", pflag.ContinueOnError)

	var version string
	flags.StringVar(&version, "version", "v1.0.0", "Print version information and quit.")

	err := flags.Parse(os.Args[1:])
	if err != nil {
		panic(err)
	}

	fmt.Printf("version: %+v\n", version)
}
```

```
$ ./main --version v1.0.1
version: v1.0.1
```

### CommandLine

> 使用全局 FlagSet

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
)

func main() {
	var version string
	pflag.StringVar(&version, "version", "v1.0.0", "Print version information and quit.")

	pflag.Parse()

	fmt.Printf("version: %+v\n", version)
}
```

```
$ ./main --version v1.0.2
version: v1.0.2
```

> CommandLine 是一个`包级别`的变量

```go
// StringVar defines a string flag with specified name, default value, and usage string.
// The argument p points to a string variable in which to store the value of the flag.
func StringVar(p *string, name string, value string, usage string) {
	CommandLine.VarP(newStringValue(value, p), name, "", usage)
}

// CommandLine is the default set of command-line flags, parsed from os.Args.
var CommandLine = NewFlagSet(os.Args[0], ExitOnError)
```

> 如果不需要定义`子命令`，可以直接使用 `CommandLine`

## Usage

### 参数定义

1. 函数名带 `Var` 将标志的值绑定到`变量`，否则将标志的值存储到`指针`中
2. 函数名带 `P` 说明支持`短选项`，否则不支持短选项

> 支持长选项、默认值和使用文本，并将标志的值存储在指针中

```go
package main

import (
	"github.com/spf13/pflag"
	"reflect"
)

func main() {
	name := pflag.String("name", "zhongmingmao", "Input Your Name")
	pflag.Parse()

	println("type: ", reflect.TypeOf(name).String()) // *string
	println("Hello, ", *name)
}
```

```
$ ./main --help
Usage of ./main:
      --name string   Input Your Name (default "zhongmingmao")
pflag: help requested

$ ./main --name go
type:  *string
Hello,  go
```

> 支持长选项、短选项、默认值和使用文本，并将标志的值存储在指针中

```go
package main

import (
	"github.com/spf13/pflag"
	"reflect"
)

func main() {
	name := pflag.StringP("name", "n", "zhongmingmao", "Input Your Name")
	pflag.Parse()

	println("type: ", reflect.TypeOf(name).String()) // *string
	println("Hello, ", *name)
}
```

```
$ ./main --help
Usage of ./main:
  -n, --name string   Input Your Name (default "zhongmingmao")
pflag: help requested

$ ./main -n rust
type:  *string
Hello,  rust

$ ./main --name go
type:  *string
Hello,  go
```

> 支持长选项、默认值和使用文本，并将标志的值绑定到变量

```go
package main

import (
	"github.com/spf13/pflag"
	"reflect"
)

func main() {
	var name string
	pflag.StringVar(&name, "name", "zhongmingmao", "Input Your Name")
	pflag.Parse()

	println("type: ", reflect.TypeOf(name).String()) // string
	println("Hello, ", name)
}
```

```
$ ./main --help
Usage of ./main:
      --name string   Input Your Name (default "zhongmingmao")
pflag: help requested

$ ./main --name rust
type:  string
Hello,  rust
```

> 支持长选项、短选项、默认值和使用文本，并将标志的值绑定到变量

```go
package main

import (
	"github.com/spf13/pflag"
	"reflect"
)

func main() {
	var name string
	pflag.StringVarP(&name, "name", "n", "zhongmingmao", "Input Your Name")
	pflag.Parse()

	println("type: ", reflect.TypeOf(name).String()) // string
	println("Hello, ", name)
}
```

```
$ ./main --help
Usage of ./main:
  -n, --name string   Input Your Name (default "zhongmingmao")
pflag: help requested

$ ./main -n rust
type:  string
Hello,  rust

$ ./main --name go
type:  string
Hello,  go
```

### `Get<Type>`

> 参数`存在` + 类型`匹配`

```go
package main

import (
	"github.com/spf13/pflag"
	"reflect"
)

func main() {
	f := pflag.CommandLine
	ageA := f.Int("age", 10, "age of the person")

	pflag.Parse()
	ageB, err := f.GetInt("age")

	if err != nil {
		println(err.Error())
		return
	}

	println("ageA type: ", reflect.TypeOf(ageA).String()) // *int
	println("ageA value: ", *ageA)

	println("ageB type: ", reflect.TypeOf(ageB).String()) // int
	println("ageB value: ", ageB)
}
```

```
$ ./main --help
Usage of ./main:
      --age int   age of the person (default 10)
pflag: help requested

$ ./main
ageA type:  *int
ageA value:  10
ageB type:  int
ageB value:  10

$ ./main --age 11
ageA type:  *int
ageA value:  11
ageB type:  int
ageB value:  11

$ ./main --age 11.0
invalid argument "11.0" for "--age" flag: strconv.ParseInt: parsing "11.0": invalid syntax
Usage of ./main:
      --age int   age of the person (default 10)
invalid argument "11.0" for "--age" flag: strconv.ParseInt: parsing "11.0": invalid syntax

$ echo $?
2
```

### 非选项参数

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
)

func main() {
	name := pflag.String("name", "zhongmingmao", "help message for name")

	pflag.Parse()

	fmt.Printf("args count: %d\n", pflag.NArg())
	fmt.Printf("args values: %s\n", pflag.Args())
	fmt.Printf("first arg: %s\n", pflag.Arg(0))
	
	fmt.Printf("name: %s\n", *name)
}
```

```
$ ./main --help
Usage of ./main:
      --name string   help message for name (default "zhongmingmao")
pflag: help requested

$ ./main
args count: 0
args values: []
first arg: 
name: zhongmingmao

$ ./main --name rust
args count: 0
args values: []
first arg: 
name: rust

$ ./main --name rust go java
args count: 2
args values: [go java]
first arg: go
name: rust
```

### 未指定选项值

> 如果一个 Flag 具有 `NoOptDefVal`，该 Flag 在命令行上没有设置该 Flag 的值，则设置为 NoOptDefVal

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
	_ "github.com/spf13/pflag"
)

func main() {
	age := pflag.IntP("age", "a", 10, "Age")
	pflag.Lookup("age").NoOptDefVal = "20"

	pflag.Parse()
	fmt.Printf("age: %d\n", *age)
}
```

```
$ ./main --help
Usage of ./main:
  -a, --age int[=20]   Age (default 10)
pflag: help requested

$ ./main
age: 10

$ ./main --age
age: 20

$ ./main --age=21
age: 21
```

### 弃用标志

1. 弃用的标志或者标志的简写在帮助文本中会被隐藏
2. 在使用不推荐的标志和简写时打印正确的用法提示

```go
package main

import (
	"github.com/spf13/pflag"
	_ "github.com/spf13/pflag"
)

func main() {
	pflag.StringP("logmode", "l", "std", "Log mode")
	err := pflag.CommandLine.MarkDeprecated("logmode", "please use --log-mode instead")
	if err != nil {
		panic(err)
	}

	pflag.Parse()
}
```

```
$ ./main --help
Usage of ./main:
pflag: help requested

$ ./main --logmode std
Flag --logmode has been deprecated, please use --log-mode instead

$ ./main -l std
Flag --logmode has been deprecated, please use --log-mode instead
```

### 弃用简写

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
	_ "github.com/spf13/pflag"
)

func main() {
	var port int
	pflag.IntVarP(&port, "port", "P", 3306, "MySQL service host port.")

	err := pflag.CommandLine.MarkShorthandDeprecated("port", "please use --port only")
	if err != nil {
		panic(err)
	}

	pflag.Parse()
	fmt.Printf("port: %d\n", port)
}
```

```
$ ./main --help
Usage of ./main:
      --port int   MySQL service host port. (default 3306)
pflag: help requested

$ ./main --port 3307
port: 3307

$ ./main -P 3308
Flag shorthand -P has been deprecated, please use --port only
port: 3308
```

### 隐藏标志

> 标记仍然能正常运行，但不会显示在帮助文本中 - 只在内部使用

```go
package main

import (
	"fmt"
	"github.com/spf13/pflag"
	_ "github.com/spf13/pflag"
)

func main() {
	var secret string
	pflag.StringVarP(&secret, "secret", "S", "12345678", "MySQL service host secret.")

	err := pflag.CommandLine.MarkHidden("secret")
	if err != nil {
		panic(err)
	}

	pflag.Parse()
	fmt.Printf("secret: %s\n", secret)
}
```

```
$ ./main --help
Usage of ./main:
pflag: help requested

$ ./main
secret: 12345678

$ ./main --secret 1234
secret: 1234

$ ./main -S 4321
secret: 4321
```

# Viper

> Viper 配置键`不区分大小写`

## 优先级

1. 通过 `viper.Set` 函数`显式设置`的配置
2. 命令行参数
3. 环境变量
4. 配置文件
5. 远程 KV 存储
6. 默认值

## 读入配置

> 将配置读入到 Viper 中

1. 设置默认的配置文件名
2. 读取配置文件
3. 监听和重新读取配置文件
4. 从 io.Reader 读取配置
5. 从环境变量读取
6. 从命令行标志读取
7. 从远程 KV 存储读取

### 设置默认值

```go
func main() {
	viper.SetDefault("name", "zhongmingmao")
	fmt.Printf("%+v\n", viper.Get("name"))
}
```

### 读取配置文件

1. JSON / TOML / YAML / YML / Properties / Props / Prop / HCL / Dotenv / Env
2. Viper 支持搜索多个路径，默认不配置任何搜索路径

> 使用 Viper 搜索和读取配置，Viper 会根据添加的路径`顺序`搜索配置文件，如果找到则停止

```go
var (
	config = pflag.StringP("config", "c", "", "Configuration file.")
	help   = pflag.BoolP("help", "h", false, "Show this help message.")
)

func main() {
	pflag.Parse()
	if *help {
		pflag.Usage()
		return
	}

	// 从配置文件中读取配置
	if *config != "" {
		viper.SetConfigFile(*config) // 指定配置文件名
		viper.SetConfigType("yaml")  // 如果配置文件名中没有文件扩展名，则需要指定配置文件的格式，告诉viper以何种格式解析文件
	} else {
		viper.AddConfigPath(".")      // 把当前目录加入到配置文件的搜索路径中
		viper.AddConfigPath("$HOME/") // 配置文件搜索路径，可以设置多个配置文件搜索路径
		viper.SetConfigName("config") // 配置文件名称（没有文件扩展名，尝试搜索所有支持的扩展类型）
	}

	if err := viper.ReadInConfig(); err != nil { // 读取配置文件。如果指定了配置文件名，则使用指定的配置文件，否则在注册的搜索路径中搜索
		panic(fmt.Errorf("Fatal error config file: %s \n", err))
	}

	fmt.Printf("Used configuration file is: %s\n", viper.ConfigFileUsed())
}
```

```
$ ./main --help
Usage of ./main:
  -c, --config string   Configuration file.
  -h, --help            Show this help message.
  
$ ./main -c config.yaml
Used configuration file is: config.yaml

$ tree
.
├── config
├── config.yaml
├── go.mod
├── go.sum
├── main
└── main.go

$ ./main
Used configuration file is: /Users/zhongmingmao/workspace/go/src/github.com/zhongmingmao/go101/config.yaml
```

### 监听和重新读取配置文件

> `热加载`（不推荐使用） - 在调用 `WatchConfig` 函数之前，需要确保已经添加了配置文件的`搜索路径`

```go
viper.WatchConfig()
viper.OnConfigChange(func(e fsnotify.Event) {
  fmt.Println("Config file changed: ", e.Name)
})
```

### 设置配置值

> 显式设置

```go
viper.Set("name", "zhongmingmao")
```

### 使用环境变量

1. 相关函数
   - AutomaticEnv()
   - BindEnv(input …string) error
   - SetEnvPrefix(in string)
   - SetEnvKeyReplacer(r *strings.Replacer)
   - AllowEmptyEnv(allowEmptyEnv bool)
2. Viper 读取环境变量是`区分大小写`的
3. SetEnvPrefix
   - viper.SetEnvPrefix(“VIPER”) + viper.Get(“apiversion”)
   - 实际读取的环境变量为 VIPER_APIVERSION
4. BindEnv 需要 1 个和或 2 个参数
   - 第一个参数为`键名`，第二个参数为`环境变量名称` - 区分`大小写`
   - 如果未提供环境变量名称，则自动推断为 `环境变量前缀_键名全大写`
   - 当显式提供环境变量名称时，不会自动添加前缀
   - 每次访问都将读取环境变量，在调用 BindEnv 时`不固定`该值
5. SetEnvKeyReplacer
   - 使用 strings.Replacer 对象来重写 Env 键
6. 默认情况下，`空环境变量`会被认为`未设置` - AllowEmptyEnv

> SetEnvKeyReplacer

```go
// USER_SECRET_KEY
viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
viper.Get("user.secret-key") // user.secret-key -> user_secret_key -> USER_SECRET_KEY
```

### 使用标志

1. Viper 支持 Pflag，将 key 绑定到 Flag
2. 与 BindEnv 类似，只在`访问时设置`

> 单个标志

```go
func main() {
	name := pflag.String("name", "zhongmingmao", "Name")

	err := viper.BindPFlag("name", pflag.Lookup("name"))
	if err != nil {
		panic(err)
	}

	pflag.Parse()
	nameFromViper := viper.Get("name")
	fmt.Println(*name == nameFromViper) // true
}
```

> 一组标志

```go
func main() {
	name := pflag.String("name", "zhongmingmao", "Name")

	err := viper.BindPFlags(pflag.CommandLine)
	if err != nil {
		panic(err)
	}

	pflag.Parse()
	nameFromViper := viper.Get("name")
	fmt.Println(*name == nameFromViper) // true
}
```

## 读取配置

> 每一个 Get 方法在找不到值的时候都会返回`类型零值`

1. Get(key string) interface{}
2. `Get<Type>(key string) <Type>`
3. AllSettings() map[string]interface{}
4. IsSet(key string) : bool

### 访问嵌套键

```json
{
  "host": {
    "address": "localhost",
    "port": 5799
  },
  "datastore": {
    "metric": {
      "host": "127.0.0.1",
      "port": 3099
    },
    "warehouse": {
      "host": "198.0.0.1",
      "port": 2112
    }
  }
}
```

```go
func main() {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")

	if err := viper.ReadInConfig(); err != nil {
		panic(err)
	}

	host := viper.GetString("datastore.metric.host")
	fmt.Println(host) // 127.0.0.1

	// 如果 datastore.metric 被直接赋值覆盖，则 datastore.metric 下所有子键都将变成未定义状态
	viper.Set("datastore.metric", "123")
	host = viper.GetString("datastore.metric.host")
	fmt.Println(host == "") // true
}
```

> 如果存在与分隔的键路径匹配的键，则直接返回其值

```json
{
  "datastore.metric.host": "0.0.0.0",
  "host": {
    "address": "localhost",
    "port": 5799
  },
  "datastore": {
    "metric": {
      "host": "127.0.0.1",
      "port": 3099
    },
    "warehouse": {
      "host": "198.0.0.1",
      "port": 2112
    }
  }
}
```

```go
func main() {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")

	if err := viper.ReadInConfig(); err != nil {
		panic(err)
	}

	host := viper.GetString("datastore.metric.host")
	fmt.Println(host) // 0.0.0.0
}
```

### 反序列化

> 将`所有`或者`特定`的值解析到 `struct` or`map` 等

1. Unmarshal(rawVal interface{}) error
2. UnmarshalKey(key string, rawVal interface{}) error

```json
{
  "Port": 3306,
  "Name": "MySQL",
  "path_map": "/usr/mysql"
}
```

```go
func main() {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")

	if err := viper.ReadInConfig(); err != nil {
		panic(err)
	}

	var c config
	err := viper.Unmarshal(&c)
	if err != nil {
		panic(err)
	}

	fmt.Printf("%+v\n", c) // {Port:3306 Name:MySQL PathMap:/usr/mysql}
}
```

### 序列化

> 将 Viper 中保存的所有设置序列化成一个字符串

```go
func main() {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")

	if err := viper.ReadInConfig(); err != nil {
		panic(err)
	}

	c := viper.AllSettings()
	bytes, err := yaml.Marshal(c)
	if err != nil {
		panic(err)
	}

	fmt.Printf("%+v\n", string(bytes))
	// name: MySQL
	// path_map: /usr/mysql
	// port: 3306
}
```

# Cobra

> 创建 CLI + 生成应用和命令文件

| Component | Desc            |
| --------- | --------------- |
| Command   | 命令            |
| Argument  | 非选项参数      |
| Flag      | 选项参数 - 标志 |

> `APPNAME COMMAND ARG --FLAG`

```
$ git clone URL --bare # clone 是一个命令，URL 是一个非选项参数，bare 是一个选项参数
```

> 创建命令的 2 种方式

| Method     | Desc                                                     |
| ---------- | -------------------------------------------------------- |
| Cobra 命令 | 生成一个 Command 命令模板（可以引用 Cobra 库来构建命令） |
| Cobra 库   |                                                          |

## Cobra 库

### cmd/root.go

```go
var rootCmd = &cobra.Command{
	Use:   "hugo",
	Short: "Hugo is a very fast static site generator",
	Long: `A Fast and Flexible Static Site Generator built with 
  love by spf13 and friends in Go. 
  Complete documentation is available at http://hugo.spf13.com`,
	Run: func(cmd *cobra.Command, args []string) {
		// Do Stuff Here
	},
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		panic(err)
	}
}
```

> 在 `init()` 函数中定义标志和处理配置

```go
var (
	cfgFile     string
	projectBase string
	userLicense string
)

func initConfig() {
	if cfgFile != "" {
		// Use config file from the flag.
		viper.SetConfigFile(cfgFile)
	} else {
		hme, err := homedir.Dir()
		if err != nil {
			panic(err)
		}

		viper.AddConfigPath(hme)
		viper.SetConfigName(".cobra")
	}

	if err := viper.ReadInConfig(); err != nil {
		panic(err)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.cobra.yaml)")
	rootCmd.PersistentFlags().StringVarP(&projectBase, "projectbase", "b", "", "base project directory eg. github.com/spf13/")
	rootCmd.PersistentFlags().StringP("author", "a", "YOUR NAME", "Author name for copyright attribution")
	rootCmd.PersistentFlags().StringVarP(&userLicense, "license", "l", "", "Name of license for the project (can provide `licensetext` in config)")
	rootCmd.PersistentFlags().Bool("viper", true, "Use Viper for configuration")

	_ = viper.BindPFlag("author", rootCmd.PersistentFlags().Lookup("author"))
	_ = viper.BindPFlag("projectbase", rootCmd.PersistentFlags().Lookup("projectbase"))
	_ = viper.BindPFlag("useViper", rootCmd.PersistentFlags().Lookup("viper"))
	viper.SetDefault("author", "NAME HERE <EMAIL ADDRESS>")
	viper.SetDefault("license", "apache")
}
```

### main.go

> main.go 中的代码要尽量精简

```go
package main

import (
	"github.com/zhongmingmao/cobra101/cmd"
)

func main() {
	cmd.Execute()
}
```

### cmd/version.go

> 通过 AddCommand 添加其它命令

```go
package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
)

func init() {
	rootCmd.AddCommand(versionCmd)
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number of Hugo",
	Long:  `All software has versions. This is Hugo's`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Hugo Static Site Generator v0.9 -- HEAD")
	},
}
```

### compile & run

```
$ go build -v .
github.com/spf13/cobra
github.com/zhongmingmao/cobra101/cmd
github.com/zhongmingmao/cobra101
```

```
$ ./cobra101 -h
A Fast and Flexible Static Site Generator built with 
  love by spf13 and friends in Go. 
  Complete documentation is available at http://hugo.spf13.com

Usage:
  hugo [flags]
  hugo [command]

Available Commands:
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  version     Print the version number of Hugo

Flags:
  -a, --author string         Author name for copyright attribution (default "YOUR NAME")
      --config string         config file (default is $HOME/.cobra.yaml)
  -h, --help                  help for hugo
  -l, --license licensetext   Name of license for the project (can provide licensetext in config)
  -b, --projectbase string    base project directory eg. github.com/spf13/
      --viper                 Use Viper for configuration (default true)

Use "hugo [command] --help" for more information about a command.
```

## 核心特性

### 使用 Flag

> Cobra + Pflag

#### 持久化标志

> 标志可用于其所分配的命令以及该命令下的每个`子命令`

```go
rootCmd.PersistentFlags().BoolVarP(&Verbose, "verbose", "v", false, "verbose output")
```

#### 本地标志

> 本地标志仅能在其所绑定的命令上使用

```go
rootCmd.Flags().StringVarP(&Source, "source", "s", "", "Source directory to read from")
```

#### 将标志绑定到 Viper

> 可以通过 `viper.Get()` 获取配置的值

```go
var author string

func init() {
  rootCmd.PersistentFlags().StringVar(&author, "author", "YOUR NAME", "Author name for copyright attribution")
  viper.BindPFlag("author", rootCmd.PersistentFlags().Lookup("author"))
}
```

#### 必选标志

> 默认情况下，标志是`必选`的 - 如果没有提供标志，Cobra 会报错

```go
rootCmd.Flags().StringVarP(&Region, "region", "r", "", "AWS region (required)")
rootCmd.MarkFlagRequired("region")
```

### 验证 Argument

> 内置验证函数

| Verification        | Desc                                                         |
| ------------------- | ------------------------------------------------------------ |
| NoArgs              | 如果存在任何 Argument，则报错                                |
| ArbitraryArgs       | 接受任何 Argument                                            |
| OnlyValidArgs       | 如果有任何 Argument 不在 Command 的 `ValidArgs` 字段中，则报错 |
| MinimumNArgs(int)   | 最少 N 个 Argument                                           |
| MaximumNArgs(int)   | 最多 N 个 Argument                                           |
| ExactArgs(int)      | 精确等于 N 个 Argument                                       |
| ExactValidArgs(int) | ExactArgs(int) + OnlyValidArgs                               |
| RangeArgs(min, max) | Argument 个数介于 min 和 max 之间                            |

```go
var c = &cobra.Command{
	Short: "hello",
	Args:  cobra.MinimumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("hello rust")
	},
}
```

> 自定义验证函数

```go
var c = &cobra.Command{
	Short: "hello",
	Args: func(cmd *cobra.Command, args []string) error {
		return nil
	},
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("hello rust")
	},
}
```

### Hook

> 如果子命令没有指定 `Persistent*Run` 函数，则子命令将会继承父命令的 `Persistent*Run` 函数，执行顺序如下

1. PersistentPreRun
2. PreRun
3. `Run`
4. PostRun
5. PersistentPostRun

> 父命令的 PreRun 只会在父命令运行时调用，运行子命令时是不会调用的

