---
title: Security - OPA Core
mathjax: false
date: 2022-12-24 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/opa-7255236.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
tags:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
---

# Glance

1. Use OPA for a *unified toolset and framework* for policy across the *cloud native stack*.
2. Use OPA to *decouple policy from the service's code* so you can release, analyze, and review policies without sacrificing *availability* or *performance*.
3. Declarative
   - Express policy in a *high-level*, declarative language that promotes *safe*, *performant*, *fine-grained controls*.
   - Use a language *purpose-built* for policy in a world where JSON is pervasive.
   - *Iterate, traverse hierarchies*, and apply 150+ built-ins like string manipulation and JWT decoding to declare the policies you want enforced.
4. Context-aware
   - Leverage *external information* to write the policies you really care about.
   - Instead, write logic that adapts to the world around it and attach that logic to the systems that need it.
5. Architectural Flexibility
   - *Daemon* - Sidecar
     - Deploy OPA as a *separate process* on the *same host* as your service.
     - Integrate OPA by changing your service’s code, importing an *OPA-enabled library*, or using a network proxy integrated with OPA.
   - Library
     - *Embed OPA policies into your service*.
     - Integrate OPA as a *Go library* that evaluates policy, or integrate a WebAssembly runtime and use OPA to compile policy to WebAssembly instructions.
6. Policy as Code

![image-20231014114906447](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231014114906447.png)

<!-- more -->

# Introduction

## Overview

1. OPA provides a *high-level declarative language* that lets you specify policy as *code* and *simple APIs* to *offload* policy decision-making from your software.
2. OPA decouples policy *decision-making* from policy *enforcement*.
   - When your software needs to make policy decisions it queries OPA and supplies *structured data* (e.g., JSON) as *input*.
   - OPA accepts *arbitrary* structured data as input.
3. OPA generates policy decisions by evaluating the *query input* against *policies* and *data*.
   - OPA and Rego are *domain-agnostic* so you can describe almost any kind of invariant in your policies.
4. Policy decisions are not limited to simple yes/no or allow/deny answers.
   - Like query inputs, your policies can generate *arbitrary* structured data as output.

![image-20231014130946160](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231014130946160.png)

## Rego

1. OPA policies are expressed in a high-level declarative language called Rego.
2. Rego is purpose-built for expressing policies over *complex hierarchical data structures*.

```json input.json
{
    "servers": [
        {"id": "app", "protocols": ["https", "ssh"], "ports": ["p1", "p2", "p3"]},
        {"id": "db", "protocols": ["mysql"], "ports": ["p3"]},
        {"id": "cache", "protocols": ["memcache"], "ports": ["p3"]},
        {"id": "ci", "protocols": ["http"], "ports": ["p1", "p2"]},
        {"id": "busybox", "protocols": ["telnet"], "ports": ["p1"]}
    ],
    "networks": [
        {"id": "net1", "public": false},
        {"id": "net2", "public": false},
        {"id": "net3", "public": true},
        {"id": "net4", "public": true}
    ],
    "ports": [
        {"id": "p1", "network": "net1"},
        {"id": "p2", "network": "net3"},
        {"id": "p3", "network": "net2"}
    ]
}
```

### References

> When OPA evaluates policies it binds data provided in the query to a global variable called `input`. You can refer to data in the input using the `.` (dot) operator.

```json
input.ports

// ---

[
  {
    "id": "p1",
    "network": "net1"
  },
  {
    "id": "p2",
    "network": "net3"
  },
  {
    "id": "p3",
    "network": "net2"
  }
]
```

> To refer to *array* elements you can use the familiar *square-bracket* syntax

```json
input.servers[0].protocols[1]

// ---

"ssh"
```

> You can use the same *square bracket* syntax if keys contain other than `[a-zA-Z0-9_]`. E.g., `input["foo~bar"]`.

```json
input.servers[0]["protocols"][0]

// ---

"https"
```

> If you refer to a value that *does not exist*, OPA returns *undefined*. Undefined means that OPA was not able to find any results.

### Expressions - AND

> To produce *policy decisions* in Rego you write expressions against *input* and *other data*.

```json
input.servers[0].protocols[0] == "https"

// ---

true
```

> OPA includes a set of *built-in functions* you can use to perform common operations like string manipulation, regular expression matching, arithmetic, aggregation, and more.

```json
count(input.servers[0].ports) >= 3

true
```

> Multiple expressions are joined together with the `;` (*AND*) operator.

> For queries to produce results, all of the expressions in the query must be *true* or *defined*. The *order* of expressions *does not matter*.

```json
input.servers[0].id == "app"; input.servers[0].protocols[1] == "ssh"

// ---

true
```

> You can *omit* the `;` (*AND*) operator by splitting expressions across *multiple lines*.

```go
input.servers[0].id == "app"
input.servers[0].protocols[1] == "ssh"
```

> If any of the expressions in the query are not true (or defined) the result is *undefined*. 

### Variables

> You can store values in *intermediate variables* using the `:=` (*assignment*) operator. Variables can be referenced just like `input`

```go
s := input.servers[0]
s.id == "app"
p := s.protocols[0]
p == "https"

// ---

+---------+-------------------------------------------------------------------+
|    p    |                                 s                                 |
+---------+-------------------------------------------------------------------+
| "https" | {"id":"app","ports":["p1","p2","p3"],"protocols":["https","ssh"]} |
+---------+-------------------------------------------------------------------+
```

> When OPA evaluates expressions, it finds values for the variables that make *all* of the expressions *true*.
> If there are no variable assignments that make all of the expressions true, the result is *undefined*.

```go
s := input.servers[0]
s.id == "app"
s.protocols[1] == "telnet"
```

> Variables are *immutable*. OPA reports an error if you try to assign the same variable twice.

> OPA must be able to *enumerate* the values for *all variables* in all expressions.
> If OPA cannot enumerate the values of a variable in any expression, OPA will report an error.

```go
x := 1
x != y  # y has not been assigned a value
```

### Iteration

1. Like other declarative languages (e.g., SQL), iteration in Rego happens *implicitly* when you *inject variables into expressions*.
2. There are *explicit iteration* constructs to express *FOR ALL* and *FOR SOME*

> need to check if any networks are public

```json
input.networks

// ---

[
  {
    "id": "net1",
    "public": false
  },
  {
    "id": "net2",
    "public": false
  },
  {
    "id": "net3",
    "public": true
  },
  {
    "id": "net4",
    "public": true
  }
]
```

> Now the query asks for values of `i` that make the *overall* expression *true*.

> When you substitute variables in references, OPA automatically finds variable assignments that satisfy *all* of the expressions in the query.
> Just like *intermediate variables*, OPA returns the values of the variables.

```go
some i; input.networks[i].public == true

// ---

+---+
| i |
+---+
| 2 |
| 3 |
+---+
```

> You can substitute as *many* variables as you want.

```go
some i, j; input.servers[i].protocols[j] == "http"

// ---

+---+---+
| i | j |
+---+---+
| 3 | 0 |
+---+---+
```

> If variables appear *multiple times* the assignments satisfy *all* of the expressions.

```go
some i, j
id := input.ports[i].id
input.ports[i].network == input.networks[j].id
input.networks[j].public

// ---

+---+------+---+
| i |  id  | j |
+---+------+---+
| 1 | "p2" | 2 |
+---+------+---+
```

> If you only refer to the variable *once*, you can replace it with the special `_` (wildcard variable) operator. Conceptually, each instance of `_` is a *unique* variable.

```go
input.servers[_].protocols[_] == "http"

// ---

true
```

> If OPA is unable to find any variable assignments that satisfy *all* of the expressions, the result is *undefined*.

```go
some i; input.servers[i].protocols[i] == "ssh"
```

> backwards-compatibility

1. In the first stage, users can opt-in to using the new keywords via a special import: `import future.keywords.every` introduces the `every` keyword described here.
   - Importing `every` means also importing `in` without an extra `import` statement.
2. At some point in the future, the keyword will become *standard*, and the import will become a no-op that can safely be removed.

#### FOR SOME

1. `some ... in ...` is used to iterate over the collection (its last argument), and will bind its variables (*key*, *value position*) to the collection items.
2. It introduces *new bindings* to the evaluation of the rest of the rule body.

```go
public_network contains net.id if {
    some net in input.networks # some network exists and..
    net.public                 # it is public.
}

// ---

[
  "net3",
  "net4"
]
```

```go
shell_accessible contains server.id if {
    some server in input.servers
    "telnet" in server.protocols
}

shell_accessible contains server.id if {
    some server in input.servers
    "ssh" in server.protocols
}

// ---

[
  "app",
  "busybox"
]
```

#### FOR ALL

> `every` allows us to succinctly express that a condition holds for *all elements of a domain*.

```json input.json
{
    "servers": [
        {
            "id": "busybox",
            "protocols": ["http", "ftp"]
        },
        {
            "id": "db",
            "protocols": ["mysql", "ssh"]
        },
        {
            "id": "web",
            "protocols": ["https"]
        }
    ]
}
```

```go
no_telnet_exposed if {
    every server in input.servers {
        every protocol in server.protocols {
            "telnet" != protocol
        }
    }
}

// ---

true
```

```go 
no_telnet_exposed_alt if {
    every server in input.servers {
        not "telnet" in server.protocols
    }
}

// ---

true
```

```go
any_telnet_exposed if {
    some server in input.servers
    "telnet" in server.protocols
}

no_telnet_exposed_not_any if {
    not any_telnet_exposed
}

// ---

true
```

### Rules

> Rego lets you *encapsulate* and *re-use* logic with rules. Rules are just *if-then* logic statements.

#### Complete Rules

> Complete rules are *if-then* statements that assign *a single value* to *a variable*.

> Every rule consists of a *head* and a *body*.
> In Rego we say the rule head is true *if* the rule body is true for some set of variable assignments.

```go
any_public_networks := true if {
    some net in input.networks # some network exists and..
    net.public                 # it is public.
}

// ---

true
```

1. `any_public_networks := true` is the head
2. `some net in input.networks; net.public` is the body

> *All values generated by rules* can be queried via the global `data` variable.
> The path of a rule is always: `data.<package-path>.<rule-name>`.

```go
data.example.rules.any_public_networks

// ---

true
```

> If you *omit* the `= <value>` part of the *rule head* the value defaults to `true`.

```go
any_public_networks if {
    some net in input.networks
    net.public
}
```

> To define *constants*, *omit* the *rule body*. When you *omit* the *rule body* it defaults to `true`.
> Since the *rule body* is *true*, the *rule head* is `always` true/defined.

```go
package example.constants

pi := 3.14
```

```go
pi > 3

// ---

true
```

> If OPA cannot find variable assignments that satisfy the *rule body*, we say that the rule is *undefined*.(which is not the same as *false*.) 

```json input.json
{
    "networks": [
        {"id": "n1", "public": false},
        {"id": "n2", "public": false}
    ]
}
```

```go
any_public_networks if {
    some net in input.networks
    net.public
}

// ---

undefined decision
```

#### Partial Rules

> Partial rules are *if-then* statements that generate *a set of values* and assign that set to *a variable*.

```go
public_network contains net.id if {
    some net in input.networks # some network exists and..
    net.public                 # it is public.
}

// ---

[
  "net3",
  "net4"
]
```

1. `public_network[net.id]` is the rule head
2. `net := input.networks[_]; net.public` is the rule body

> Iteration over the *set of values* can be done with the `some ... in ...` expression

```go
some net in public_network

// ---

+--------+
|  net   |
+--------+
| "net3" |
| "net4" |
+--------+
```

> With a *literal*, or a bound variable, you can check if the value *exists* in the set via `... in ...`

```go
"net3" in public_network

// ---

true
```

> You can also iterate over the set of values by referencing the set elements with a variable

```go
some n; public_network[n]

// ---

+--------+-------------------+
|   n    | public_network[n] |
+--------+-------------------+
| "net3" | "net3"            |
| "net4" | "net4"            |
+--------+-------------------+
```

> Lastly, you can check if a value *exists* in the set using the same syntax

```go
public_network["net3"]

// ---

"net3"
```

#### Logical OR

> When you join *multiple expressions* together in a query you are expressing logical *AND*.
> To express logical *OR* in Rego you define *multiple rules* with the *same name*.

```json input.json
{
    "servers": [
        {
            "id": "busybox",
            "protocols": ["http", "telnet"]
        },
        {
            "id": "web",
            "protocols": ["https"]
        }
    ]
}
```

> Declares `shell_accessible` to be `true` if any servers expose the `"telnet"` or `"ssh"` protocols

> The `default` keyword tells OPA to assign a value to the variable if all of the other rules with the *same name* are *undefined*.

```go
package example.logical_or

default shell_accessible := false

shell_accessible := true {
    input.servers[_].protocols[_] == "telnet"
}

shell_accessible := true {
    input.servers[_].protocols[_] == "ssh"
}

// ---

true
```

> When you use logical *OR* with *partial rules*, each rule definition *contributes* to the *set of values* assigned to the variable.

```json input.json
{
    "servers": [
        {
            "id": "busybox",
            "protocols": ["http", "telnet"]
        },
        {
            "id": "db",
            "protocols": ["mysql", "ssh"]
        },
        {
            "id": "web",
            "protocols": ["https"]
        }
    ]
}
```

```go
package example.logical_or

shell_accessible[server.id] {
    server := input.servers[_]
    server.protocols[_] == "telnet"
}

shell_accessible[server.id] {
    server := input.servers[_]
    server.protocols[_] == "ssh"
}

// ---

[
  "busybox",
  "db"
]
```

### Putting It Together

> desired policy - At a high-level the policy needs to identify servers that violate some conditions.

1. Servers reachable from the Internet must not expose the insecure 'http' protocol.
2. Servers are not allowed to expose the 'telnet' protocol.

```go
package example
import future.keywords.every # "every" implies "in"

allow := true {                                     # allow is true if...
    count(violation) == 0                           # there are zero violations.
}

violation[server.id] {                              # a server is in the violation set if...
    some server in public_servers                   # it exists in the 'public_servers' set and...
    "http" in server.protocols                      # it contains the insecure "http" protocol.
}

violation[server.id] {                              # a server is in the violation set if...
    some server in input.servers                    # it exists in the input.servers collection and...
    "telnet" in server.protocols                    # it contains the "telnet" protocol.
}

public_servers[server] {                            # a server exists in the public_servers set if...
    some server in input.servers                    # it exists in the input.servers collection and...

    some port in server.ports                       # it references a port in the input.ports collection and...
    some input_port in input.ports
    port == input_port.id

    some input_network in input.networks            # the port references a network in the input.networks collection and...
    input_port.network == input_network.id
    input_network.public                            # the network is public.
}

// ---
some x; violation[x]

+-----------+--------------+
|     x     | violation[x] |
+-----------+--------------+
| "busybox" | "busybox"    |
| "ci"      | "ci"         |
+-----------+--------------+
```

## Running OPA

### opa eval

> It is a swiss-army knife that you can use to evaluate *arbitrary* Rego expressions and policies. 

| Flag             | Short | Description                                                  |
| ---------------- | ----- | ------------------------------------------------------------ |
| `--bundle`       | -b    | Load a bundle file or directory into OPA. This flag can be repeated. |
| `--data`         | -d    | Load policy or data files into OPA. This flag can be repeated. |
| `--input`        | -i    | Load a data file and use it as input. This flag cannot be repeated. |
| `--format`       | -f    | Set the *output* format to use.<br />The default is `json` and is intended for programmatic use.<br />The `pretty` format emits more human-readable output. |
| `--fail`         | n/a   | Exit with a non-zero exit code if the query is undefined.    |
| `--fail-defined` | n/a   | Exit with a non-zero exit code if the query is not undefined. |

```json input.json
{
    "servers": [
        {"id": "app", "protocols": ["https", "ssh"], "ports": ["p1", "p2", "p3"]},
        {"id": "db", "protocols": ["mysql"], "ports": ["p3"]},
        {"id": "cache", "protocols": ["memcache"], "ports": ["p3"]},
        {"id": "ci", "protocols": ["http"], "ports": ["p1", "p2"]},
        {"id": "busybox", "protocols": ["telnet"], "ports": ["p1"]}
    ],
    "networks": [
        {"id": "net1", "public": false},
        {"id": "net2", "public": false},
        {"id": "net3", "public": true},
        {"id": "net4", "public": true}
    ],
    "ports": [
        {"id": "p1", "network": "net1"},
        {"id": "p2", "network": "net3"},
        {"id": "p3", "network": "net2"}
    ]
}
```

```go example.rego
package example

default allow := false                              # unless otherwise defined, allow is false

allow := true {                                     # allow is true if...
    count(violation) == 0                           # there are zero violations.
}

violation[server.id] {                              # a server is in the violation set if...
    some server
    public_server[server]                           # it exists in the 'public_server' set and...
    server.protocols[_] == "http"                   # it contains the insecure "http" protocol.
}

violation[server.id] {                              # a server is in the violation set if...
    server := input.servers[_]                      # it exists in the input.servers collection and...
    server.protocols[_] == "telnet"                 # it contains the "telnet" protocol.
}

public_server[server] {                             # a server exists in the public_server set if...
    some i, j
    server := input.servers[_]                      # it exists in the input.servers collection and...
    server.ports[_] == input.ports[i].id            # it references a port in the input.ports collection and...
    input.ports[i].network == input.networks[j].id  # the port references a network in the input.networks collection and...
    input.networks[j].public                        # the network is public.
}
```

> Evaluate a trivial expression.

```
$ opa eval '1*2+3'
{
  "result": [
    {
      "expressions": [
        {
          "value": 5,
          "text": "1*2+3",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ]
    }
  ]
}
```

> Evaluate a policy on the command line.

```
$ opa eval -i input.json -d example.rego "data.example.violation[x]"
{
  "result": [
    {
      "expressions": [
        {
          "value": "busybox",
          "text": "data.example.violation[x]",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ],
      "bindings": {
        "x": "busybox"
      }
    },
    {
      "expressions": [
        {
          "value": "ci",
          "text": "data.example.violation[x]",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ],
      "bindings": {
        "x": "ci"
      }
    }
  ]
}
```

> Evaluate a policy on the command line and use the exit code.

```
$ opa eval --fail-defined -i input.json -d example.rego "data.example.violation[x]"

$ echo $?
1

$ opa eval --fail -i input.json -d example.rego "data.example.violation[x]"

$ echo $?
0
```

### opa run

#### interactive

> When you enter statements in the REPL, OPA evaluates them and prints the result.

```
$ opa run
OPA 0.42.0 (commit 9b5fb9b, built at 2022-07-04T12:21:01Z)

Run 'help' to see a list of commands and check for updates.

> true
true
> 3.14
3.14
> ["hello", "world"]
[
  "hello",
  "world"
]
> exit
```

> Most REPLs let you define variables that you can reference later on.

```
$ opa run
OPA 0.42.0 (commit 9b5fb9b, built at 2022-07-04T12:21:01Z)

Run 'help' to see a list of commands and check for updates.

> pi := 3.14
Rule 'pi' defined in package repl. Type 'show' to see rules.
> show
package repl

pi := 3.14
>
> pi
3.14
>
> pi > 3
true
>
> exit
```

> You can load *policy* and *data* files into the REPL by passing them on the command line.
> By default, *JSON* and *YAML* files are rooted under `data`.

```
$ opa run input.json
OPA 0.42.0 (commit 9b5fb9b, built at 2022-07-04T12:21:01Z)

Run 'help' to see a list of commands and check for updates.

> data.servers[0].protocols[1]
"ssh"
>
> data.servers[i].protocols[j]
+---+---+------------------------------+
| i | j | data.servers[i].protocols[j] |
+---+---+------------------------------+
| 0 | 0 | "https"                      |
| 0 | 1 | "ssh"                        |
| 1 | 0 | "mysql"                      |
| 2 | 0 | "memcache"                   |
| 3 | 0 | "http"                       |
| 4 | 0 | "telnet"                     |
+---+---+------------------------------+
>
> net := data.networks[_]; net.public
+-----------------------------+
|             net             |
+-----------------------------+
| {"id":"net3","public":true} |
| {"id":"net4","public":true} |
+-----------------------------+
>
> exit
```

> To set a *data* file as the `input` document in the REPL prefix the file path

```
$ opa run example.rego repl.input:input.json
OPA 0.42.0 (commit 9b5fb9b, built at 2022-07-04T12:21:01Z)

Run 'help' to see a list of commands and check for updates.

> data.example.public_server[s]
+-------------------------------------------------------------------+-------------------------------------------------------------------+
|                                 s                                 |                   data.example.public_server[s]                   |
+-------------------------------------------------------------------+-------------------------------------------------------------------+
| {"id":"app","ports":["p1","p2","p3"],"protocols":["https","ssh"]} | {"id":"app","ports":["p1","p2","p3"],"protocols":["https","ssh"]} |
| {"id":"ci","ports":["p1","p2"],"protocols":["http"]}              | {"id":"ci","ports":["p1","p2"],"protocols":["http"]}              |
+-------------------------------------------------------------------+-------------------------------------------------------------------+
>
> exit
```

1. Prefixing file paths with a reference controls where file is loaded under `data`.
2. By convention, the REPL sets the `input` document that queries see by reading `data.repl.input` each time a statement is evaluated.

```json
$ opa run example.rego repl.input:input.json
OPA 0.42.0 (commit 9b5fb9b, built at 2022-07-04T12:21:01Z)

Run 'help' to see a list of commands and check for updates.

> input
{
  "networks": [
    {
      "id": "net1",
      "public": false
    },
    {
      "id": "net2",
      "public": false
    },
    {
      "id": "net3",
      "public": true
    },
    {
      "id": "net4",
      "public": true
    }
  ],
  "ports": [
    {
      "id": "p1",
      "network": "net1"
    },
    {
      "id": "p2",
      "network": "net3"
    },
    {
      "id": "p3",
      "network": "net2"
    }
  ],
  "servers": [
    {
      "id": "app",
      "ports": [
        "p1",
        "p2",
        "p3"
      ],
      "protocols": [
        "https",
        "ssh"
      ]
    },
    {
      "id": "db",
      "ports": [
        "p3"
      ],
      "protocols": [
        "mysql"
      ]
    },
    {
      "id": "cache",
      "ports": [
        "p3"
      ],
      "protocols": [
        "memcache"
      ]
    },
    {
      "id": "ci",
      "ports": [
        "p1",
        "p2"
      ],
      "protocols": [
        "http"
      ]
    },
    {
      "id": "busybox",
      "ports": [
        "p1"
      ],
      "protocols": [
        "telnet"
      ]
    }
  ]
}
>
>
> data
{
  "example": {
    "allow": false,
    "public_server": [
      {
        "id": "app",
        "ports": [
          "p1",
          "p2",
          "p3"
        ],
        "protocols": [
          "https",
          "ssh"
        ]
      },
      {
        "id": "ci",
        "ports": [
          "p1",
          "p2"
        ],
        "protocols": [
          "http"
        ]
      }
    ],
    "violation": [
      "busybox",
      "ci"
    ]
  },
  "repl": {
    "input": {
      "networks": [
        {
          "id": "net1",
          "public": false
        },
        {
          "id": "net2",
          "public": false
        },
        {
          "id": "net3",
          "public": true
        },
        {
          "id": "net4",
          "public": true
        }
      ],
      "ports": [
        {
          "id": "p1",
          "network": "net1"
        },
        {
          "id": "p2",
          "network": "net3"
        },
        {
          "id": "p3",
          "network": "net2"
        }
      ],
      "servers": [
        {
          "id": "app",
          "ports": [
            "p1",
            "p2",
            "p3"
          ],
          "protocols": [
            "https",
            "ssh"
          ]
        },
        {
          "id": "db",
          "ports": [
            "p3"
          ],
          "protocols": [
            "mysql"
          ]
        },
        {
          "id": "cache",
          "ports": [
            "p3"
          ],
          "protocols": [
            "memcache"
          ]
        },
        {
          "id": "ci",
          "ports": [
            "p1",
            "p2"
          ],
          "protocols": [
            "http"
          ]
        },
        {
          "id": "busybox",
          "ports": [
            "p1"
          ],
          "protocols": [
            "telnet"
          ]
        }
      ]
    }
  }
}
>
> exit
```

#### server

> To integrate with OPA you can run it as a server and execute queries over *HTTP*.(`-s` / `--server`)
> By default OPA listens for HTTP connections on `0.0.0.0:8181`.

```
$ opa run -s example.rego
{"addrs":[":8181"],"diagnostic-addrs":[],"level":"info","msg":"Initializing server. OPA is running on a public (0.0.0.0) network interface. Unless you intend to expose OPA outside of the host, binding to the localhost interface (--addr localhost:8181) is recommended. See https://www.openpolicyagent.org/docs/latest/security/#interface-binding","time":"2022-10-14T22:32:11+08:00"}
```

> When you query the `/v1/data` HTTP API you must wrap *input* data inside of a JSON object

```json
{
    "input": <value>
}
```

```json
$ cat <<EOF > v1-data-input.json
{
    "input": $(cat input.json)
}
EOF

$ cat v1-data-input.json
{
    "input": {
      "servers": [
          {"id": "app", "protocols": ["https", "ssh"], "ports": ["p1", "p2", "p3"]},
          {"id": "db", "protocols": ["mysql"], "ports": ["p3"]},
          {"id": "cache", "protocols": ["memcache"], "ports": ["p3"]},
          {"id": "ci", "protocols": ["http"], "ports": ["p1", "p2"]},
          {"id": "busybox", "protocols": ["telnet"], "ports": ["p1"]}
      ],
      "networks": [
          {"id": "net1", "public": false},
          {"id": "net2", "public": false},
          {"id": "net3", "public": true},
          {"id": "net4", "public": true}
      ],
      "ports": [
          {"id": "p1", "network": "net1"},
          {"id": "p2", "network": "net3"},
          {"id": "p3", "network": "net2"}
      ]
  }
}
```

```json
$ curl -s 127.1:8181/v1/data/example/violation -d @v1-data-input.json -H 'Content-Type: application/json' | jq
{
  "result": [
    "busybox",
    "ci"
  ]
}

$ curl -s 127.1:8181/v1/data/example/allow -d @v1-data-input.json -H 'Content-Type: application/json' | jq
{
  "result": false
}
```

> By default `data.system.main` is used to serve policy queries *without* a path.
> When you execute queries without providing a path, you do not have to wrap the *input*.
> If the `data.system.main` decision is *undefined* it is treated as an *error*.

```json
$ curl -i 127.1:8181 -d @input.json -H 'Content-Type: application/json'
HTTP/1.1 404 Not Found
Content-Type: application/json
Date: Sat, 14 Oct 2022 14:43:27 GMT
Content-Length: 86

{
  "code": "undefined_document",
  "message": "document missing: data.system.main"
}
```

> You can restart OPA and configure to use any decision as the default decision - `default_decision`

```
$ opa run -s --set=default_decision=example/allow  example.rego
{"addrs":[":8181"],"diagnostic-addrs":[],"level":"info","msg":"Initializing server. OPA is running on a public (0.0.0.0) network interface. Unless you intend to expose OPA outside of the host, binding to the localhost interface (--addr localhost:8181) is recommended. See https://www.openpolicyagent.org/docs/latest/security/#interface-binding","time":"2022-10-14T22:45:16+08:00"}

$ curl -i 127.1:8181 -d @input.json -H 'Content-Type: application/json'
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 14 Oct 2022 14:45:37 GMT
Content-Length: 6

false
```

### go library

> OPA can be embedded inside Go programs as a library.

```
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/open-policy-agent/opa/rego"
	"log"
	"os"
)

func main() {
	ctx := context.Background()

	// Construct a Rego object that can be prepared or evaluated.
	r := rego.New(
		rego.Query(os.Args[2]),
		rego.Load([]string{os.Args[1]}, nil))

	// Create a prepared query that can be evaluated.
	query, err := r.PrepareForEval(ctx)
	if err != nil {
		log.Fatal(err)
	}

	// Load the input document from stdin.
	var input interface{}
	dec := json.NewDecoder(os.Stdin)
	dec.UseNumber()
	if err := dec.Decode(&input); err != nil {
		log.Fatal(err)
	}

	// Execute the prepared query.
	rs, err := query.Eval(ctx, rego.EvalInput(input))
	if err != nil {
		log.Fatal(err)
	}

	// Do something with the result.
	fmt.Println(rs)
}
```

```
$ go run main.go example.rego 'data.example.violation' < input.json
[{[[busybox ci]] map[]}]
```

# Philosophy

1. A *policy* is a set of *rules* that governs the *behavior* of a software service.
2. OPA helps you *decouple* any policy using any context from any software system.

## Policy Decoupling

> Software services should allow policies to be *specified declaratively*, *updated at any time without recompiling or redeploying*, and *enforced automatically*.

## What is OPA?

1. OPA is a *lightweight* general-purpose policy engine that can be *co-located* with your service. You can integrate OPA as a *sidecar*, *host-level daemon*, or *library*.
2. Services *offload policy decisions* to OPA by executing *queries*.
   - OPA evaluates *policies* and *data* to produce *query results* (which are sent back to the client).
   - *Policies* are written in a *high-level declarative language* and can be loaded *dynamically* into OPA remotely via *APIs* or through the *local filesystem*.

## Why use OPA?

1. OPA is a *full-featured policy engine* that *offloads policy decisions* from your software.
2. Without OPA, you need to implement *policy management* for your software from scratch. That’s a lot of work.

## Document Model

1. OPA policies (written in Rego) make decisions based on *hierarchical structured* data.
2. Importantly, OPA policies can make decisions based on *arbitrary* structured data.
3. OPA itself is *not tied to* any particular domain model.
4. Similarly, OPA policies can represent *decisions* as *arbitrary* structured data.
5. Data can be loaded into OPA from outside world using *push* or *pull* interfaces that operate *synchronously* or *asynchronously* with respect to policy evaluation.
6. We refer to all data loaded into OPA from the *outside* world as *base documents*.
   - These base documents almost always contribute to your policy decision-making logic.
   - However, your policies can also make decisions based on each other.
7. Policies almost always consist of *multiple rules* that refer to other rules (possibly authored by different groups).
8. In OPA, we refer to the values *generated by rules* (a.k.a., *decisions*) as *virtual documents*.
   - The term *virtual* in this case just means the document is *computed* by the policy, i.e., it’s not loaded into OPA from the outside world.
9. Base and virtual documents can represent the exact *same kind* of information.
   - Moreover, with Rego, you can refer to both *base* and *virtual* documents using the exact same dot/bracket-style reference syntax.
10. Consistency across the types of values that can be represented and the way those values are referenced means that *policy authors only need to learn one way of modeling and referring to information that drives policy decision-making*.
11. Additionally, since there is *no conceptual difference* in the types of values or the way you refer to those values in *base* and *virtual* documents
    - Rego lets you refer to *both* base and virtual documents through a global variable called `data`.
    - Similarly, OPA lets you query for both *base* and *virtual* documents via the `/v1/data` HTTP API.
12. *location*
    - Since *base* documents come from *outside* of OPA, their *location* under `data` is controlled by the software doing the *loading*.
    - On the other hand, the *location* of *virtual* documents under `data` is controlled by policies themselves using the `package` directive in the language.
13. *Base* documents can be *pushed* or *pulled* into OPA *asynchronously* by *replicating* data into OPA when the state of the world changes.
    - This can happen *periodically* or when some *event* (like a database change notification) occurs.
    - *Base* documents loaded *asynchronously* are *always* accessed under the `data` global variable.
    - On the other hand, *base* documents can also be *pushed* or *pulled* into OPA *synchronously* when your software queries OPA for policy decisions.
    - We refer to *base* documents *pushed synchronously* as *input*. Policies can access these inputs under the `input` global variable.
    - To *pull* base documents *during policy evaluation*, OPA exposes (and can be extended with custom) built-in functions like `http.send`.
    - Built-in function return values can be assigned to *local variables* and surfaced in *virtual* documents.
    - Data loaded *synchronously* is kept outside of `data` to avoid naming conflicts.

> Summarizes the different models for loading *base* documents into OPA, how they can be referenced inside of policies, and the actual mechanism(s) for loading.

> *Asynchronous - `data`*

| Model               | How to access in Rego                     | How to integrate with OPA                                    |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Asynchronous Push   | The `data` global variable                | Invoke OPA’s API(s), e.g., `PUT /v1/data`                    |
| `Asynchronous Pull` | The `data` global variable                | Configure OPA’s *Bundle* feature                             |
| Synchronous Push    | The `input` global variable               | Provide data in policy query, e.g., inside the body of `POST /v1/data` |
| Synchronous Pull    | The built-in functions, e.g., `http.send` | N/A                                                          |

1. *Data* loaded *asynchronously* into OPA is *cached in-memory* so that it can be *read efficiently* during *policy evaluation*.
2. Similarly, *policies* are also *cached in-memory* to ensure *high-performance* and *high-availability*.
3. *Data pulled synchronously* can also be *cached in-memory*.

![image-20231015014126972](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015014126972.png)

1. *base*
   - API request information *pushed synchronously* located under `input`.
   - Entitlements data *pulled asynchronously* and located under `data.entitlements`.
   - Resource data *pulled synchronously* during policy evaluation using the `http.send` built-in function.
2. *virtual*
   - The entitlements and resource information is *abstracted* by rules that *generate virtual documents* named `data.iam.user_has_role` and `data.acme.user_is_assigned` respectively.

# External Data

1. OPA was designed to let you make *context-aware* authorization and policy decisions by *injecting external data* that describes what is happening in the world and then writing policy using that data.
   - OPA has a *cache* or *replica* of that *data*, just as OPA has a *cache/replica* of *policy*; OPA is not designed to be the source of truth for either.
2. This document describes options for *replicating* data into OPA.
   - The content of the data does not matter, but the *size*, *frequency of update*, and *consistency constraints* all do impact which kind of *data replication* to employ.
   - You should prefer earlier options in the list to later options, but in the end the right choice depends on your situation.

## JWT Tokens

1. JSON Web Tokens (JWTs) allow you to *securely transmit JSON data* between software systems and are usually produced during the *authentication* process.
2. You can set up authentication so that when the user *logs in* you *create a JWT* with that user’s attributes (or any other data as far as OPA is concerned).
3. Then you hand that JWT to OPA and use OPA’s specialized support for JWTs to *extract* the information you need to make a policy decision.

### Flow

![image-20231015102647908](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015102647908.png)

1. User *logs in* to an authentication system, e.g. LDAP/AD/etc.
2. The user is given a *JWT token* encoding group membership and other user attributes stored in LDAP/AD
3. The user provides that JWT token to an *OPA-enabled software system* for authentication
4. The OPA-enabled software system includes that token as part of the usual `input` to OPA.
5. OPA *decodes* the JWT token and uses the contents to make policy decisions.

### Updates

1. The JWT only gets refreshed when the user *authenticates*; how often that happens is up to the *TTL* included in the token.
2. When *user-attribute information changes*, those changes will not be seen by OPA until the user authenticates and *gets a new JWT*.

### Size Limitations

1. JWTs have a limited size in practice, so if your organization has too many user attributes you may not be able to fit all the required information into a JWT.

### Security

1. OPA includes *primitives* to *verify* the *signature* of JWT tokens.
2. OPA let’s you check the *TTL*.
3. OPA has support for making *HTTP* requests during *evaluation*, which could be used to check if a JWT has been *revoked*.

## Overload input

1. For example, suppose your policy says that only a file’s owner may delete it.
   - The authentication system does not track resource-ownership, but the system responsible for files certainly does.
2. The *file-ownership system* may be the one that is asking for an *authorization decision* from OPA.
   - It already knows which file is being operated on and who the owner is, so it can hand OPA the *file-owner* as part of OPA’s `input`.
   - This can be dangerous in that it ties the integration of OPA to the policy, but often it’s sufficient to have the file-ownership system hand over all the *file’s metadata*.

### Flow

![image-20231015104116286](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015104116286.png)

1. OPA-enabled software gathers *relevant metadata* (and *caches* it for subsequent requests)
2. OPA-enabled software sends `input` to OPA including the *external data*
3. Policy makes decisions based on external data included in `input`

### Updates

1. External data gets updated *as frequently as* the OPA-enabled software updates it.
2. Often some of that data is *local* to the OPA-enabled software, and sometimes it is *remote*.
3. The *remote* data is usually *cached* for *performance* and hence is as updated as the *caching strategy* allows.

### Size Limitations

1. Size limitations are rarely a problem for OPA in this approach because it only sees *the metadata for 1 request at a time*.
2. However, the *cache* of remote data that the OPA-enabled service creates will have a limit that the developer controls.

### Security

1. This approach is as secure as the *connection* between the OPA-enabled service and OPA itself, under the assumption that the OPA-enabled service gathers the appropriate metadata securely.
2. That is, using external data with this approach is as secure as using OPA in the first place.

### Recommended usage

> Local, Dynamic data

1. This approach is valuable when the *data changes fairly frequently* and/or when *the cost of making decisions using stale data is high*.
2. It works especially well when the external data is *local* to the system asking for authorization decisions.
3. It can work in the case of remote data as well, but there is more *coupling* of the system to OPA because the system is *hardcoded* to fetch the data needed by the policy (and only that data).

## Bundle API

1. When *external data changes infrequently* and can reasonably *be stored in memory all at once*, you can replicate that data in bulk via OPA’s bundle feature.
2. The bundle feature *periodically downloads policy bundles* from *a centralized server*, which can include *data* as well as *policy*.
3. Every time OPA gets *updated policies*, it gets *updated data* too.
4. You must *implement the bundle server* and *integrate your external data into the bundle server*
   - OPA does NOT help with that–but once it is done, OPA will happily *pull* the data (and *policies*) out of your *bundle server*.

### Flow

![image-20231015105203977](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015105203977.png)

> Three things happen *independently* with this kind of data integration.

1. A. OPA-enabled software system asks OPA for *policy decisions*
2. B. OPA downloads new *policy bundles* including external data
3. C. Bundle server *replicates data* from source of *truth*

### Updates

1. The *lag* between a data update and OPA having the update is the *sum* of the lag for an update between *data replication* and the central bundle server and the lag for an update between the central bundle server and OPA.
2. So if data replication happens every *5* minutes, and OPA pulls a new bundle every *2* minutes, then the total maximum lag is *7* minutes.

### Size limitations

1. *OPA stores the entire datasource at once in memory*.
2. Obviously this can be a problem with large external data sets.
3. Because the centralized server handles both policy and data it can *prune data* to just that which is needed for the policies.

### Recommended usage

> Static, Medium-sized data

1. This approach is more *flexible* than the JWT and `input` cases above
   - because you can include *an entirely new data source* at the bundle server without changing the authentication service or the OPA-enabled service.
   - You are also guaranteed that the *policy* and its corresponding *data* always arrive at the *same time*, making the policy-data *consistency* perfect.
2. The drawback is that the *consistency of the data* with the source of truth is worse than the `input` case and could be better or worse than the consistency for the JWT case (because JWTs only get updated on login).
3. One feature currently *under design* is a *delta-based bundle protocol*, which could improve the *data consistency model significantly* by *lowering the cost of frequent updates*.
4. But as it stands this approach is ideal when the data is *relatively static* and the data *fits into memory*.

## Push Data

1. Another way to replicate external data in its entirety into OPA is to use OPA’s API for *injecting arbitrary JSON data*.
2. You can build a *replicator* that pulls information out of the external data source and pushes that information in OPA through its API.
3. This approach is similar in most respects to the bundle API, except it lets you optimize for update latency and network traffic.

### Flow

![image-20231015111505576](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015111505576.png)

> Three things happen *independently* with this kind of data replication.

1. A. OPA-enabled software system asks OPA for *policy decisions*
2. B. Data replicator *pushes data* into OPA
3. C. Data replicator *replicates data* from source of truth

> Depending on the replication scheme, B and C could be *tied together* so that every update the data replicator gets from the source of truth it pushes into OPA,
> but in general those could be *decoupled* depending on the desired network load, the changes in the data, and so on.

### Updates

1. The total *lag* between the external data source being updated and OPA being updated is the *sum* of the lag for an update between the data source and the synchronizer plus the lag for an update between the synchronizer and OPA.

### Size limitations

1. The *entirety* of the external data source is *stored in memory*, which can obviously be a problem with large external data sources.
2. But unlike the bundle API, this approach does *allow updates to data*.

### Recommended usage

> Dynamic, Medium-sized data

1. This approach is very similar to the bundle approach except it updates the data stored in OPA with *deltas* instead of an entire snapshot at a time.
2. Because the *data* is updated as *deltas*, this approach is *well-suited* for data that *changes frequently*.
3. It assumes the data can fit *entirely in memory* and so is well-suited to *small* and *medium-sized* data sets.

## Pull Data during Evaluation

1. OPA includes functionality for reaching out to external servers *during evaluation*.
2. This functionality handles those cases where there is *too much data* to synchronize into OPA, or policy requires information that must be *as up to date as possible*.
3. That functionality is implemented using built-in functions such as `http.send`.

### Current limitations

1. Credentials needed for the external service can either be *hardcoded* into policy or *pulled* from the environment.
2. The built-in functions *do not implement any retry logic*.

### Flow

![image-20231015112817755](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231015112817755.png)

> The key difference here is that *every decision requires contacting the external data source*.
> If that service or the network connection is *slow* or *unavailable*, OPA may not be able to return a decision.

1. OPA-enabled service asks OPA for a *decision*
2. *During evaluation* OPA asks the external data source for *additional information*

### Updates

1. External data is *perfectly fresh*.
2. There is *no lag* between an update to the external data and when OPA sees that update.

### Size limitations

1. Only the *data actually needed by the policy* is pulled from the external data source.
2. There is no need for a replicator to figure out what data the policy will need before execution.

### Performance and Availability

1. Latency and availability of decision-making are dependent on the *network*.
2. This approach may still be superior to *running OPA on a remote server entirely*
   - because a *local OPA* can make some decisions without going over the network
   - those decisions that do not require information from the remote data server.

### Recommended usage

> Highly Dynamic or Large-sized data

1. If the data is *too large* to fit into memory, or it *changes too frequently* to cache it inside of OPA, the only real option is to *fetch the data on demand*.
2. The `input` approach fetches data on demand as well
   - but puts the burden on the *OPA-enabled service to fetch the necessary data* (and to know what data is necessary).
3. The downside to *pulling data on demand* is *reduced performance and availability* because of the *network*, which can be mitigated via *caching*.
   - In the `input` case, *caching* is under the control of the *OPA-enabled service* and can therefore *be tailored to fit the properties of the data*.
   - In the `http.send` case, *caching* is largely under the control of the *remote service* that sets HTTP *response headers* to indicate how long the response can be *cached* for.
4. It is crucial in this approach for the *OPA-enabled service* to handle the case when *OPA returns no decision*.

## Summary

| Approach        | Perf/Avail           | Limitations                                                 | Recommended Data |
| --------------- | -------------------- | ----------------------------------------------------------- | ---------------- |
| JWT             | High                 | Updates only when user logs back in                         | User attributes  |
| Input           | High                 | *Coupling* between service and OPA                          | Local, dynamic   |
| `Bundle`        | High                 | Updates to *policy/data* at the *same time*. Size an issue. | Static, medium   |
| Push            | High                 | Control data refresh rate. Size an issue.                   | Dynamic, medium  |
| Evaluation Pull | Dependent on network | Perfectly up to date. No size limit                         | Dynamic or large |

# Policy Language

## What is Rego?

1. Rego was inspired by Datalog, which is a well understood, *decades* old query language.
2. Rego extends Datalog to support *structured document models* such as *JSON*.
3. Rego queries are *assertions on data* stored in OPA.
   - These queries can be used to define policies that enumerate instances of data that *violate* the expected state of the system.

## Why use Rego?

1. Use Rego for defining policy that is *easy to read and write*.
2. Rego focuses on providing powerful support for *referencing nested documents* and ensuring that queries are *correct* and *unambiguous*.
3. Rego is *declarative* so policy authors can focus on what queries should return rather than how queries should be executed.
   - These queries are *simpler* and *more concise* than the equivalent in an *imperative language*.
4. Like other applications which support declarative query languages, OPA is able to *optimize queries* to *improve performance*.

## The Basics

> The simplest rule is a single expression and is defined in terms of a *Scalar Value*

> Rules define the *content* of documents.

```go
pi := 3.14159
```

> Rules can also be defined in terms of *Composite Values*

```go
rect := {"width": 2, "height": 4}
```

> You can compare two *scalar* or *composite* values, and when you do so you are checking if the two values are the *same JSON value*

```shell
rect := {"width": 2, "height": 4}
same if rect == {"height": 4, "width": 2} # true
```

> You can define a *new concept* using a rule.

```shell
# undefined
v if "hello" == "world"
```

> Expressions that refer to *undefined* values are also *undefined*. This includes comparisons such as `!=`.

```shell
v if "hello" == "world" # undefined
a if v == true # undefined
b if v != true # undefined
```

> We can define rules in terms of *Variables* as well
> The formal syntax uses the semicolon character `;` to separate expressions. 
> Rule bodies can separate expressions with *newlines* and *omit* the semicolon

```shell
t if {x := 42; y := 41; x > y} # true
```

```shell
t if {
	x := 42
	y := 41
	x > y
} # true
```

> `if` is optional.

```shell
v {
	"hello" == "world"
} # undefined

t {
	x := 42
	y := 41
	x > y
} # true
```

> When evaluating rule bodies, OPA searches for variable bindings that make *all* of the expressions *true*.
> There may be multiple sets of bindings that make the rule body true. The *rule body* can be understood intuitively as

```
expression-1 AND expression-2 AND ... AND expression-N
```

> The rule itself can be understood intuitively as
> If the **value** is omitted, it defaults to **true**.

```
rule-name IS value IF body
```

> refer to nested documents.

```go
package play

import future.keywords.if
import future.keywords.in

sites := [{"name": "prod"}, {"name": "smoke1"}, {"name": "dev"}]

r if {
	some site in sites
	site.name == "prod"
}
```

> The rule `r` above asserts that there exists (at least) one document within `sites` where the `name` attribute equals `"prod"`.

```json output.json
{
    "r": true,
    "sites": [
        {
            "name": "prod"
        },
        {
            "name": "smoke1"
        },
        {
            "name": "dev"
        }
    ]
}
```

> We can generalize the example above with a rule that defines *a set document* instead of *a boolean document*

```go
package play

import future.keywords.contains
import future.keywords.if
import future.keywords.in

sites := [{"name": "prod"}, {"name": "smoke1"}, {"name": "dev"}]

q contains name if {
	some site in sites
	name := site.name
}
```

```json output.json
{
    "q": [
        "dev",
        "prod",
        "smoke1"
    ],
    "sites": [
        {
            "name": "prod"
        },
        {
            "name": "smoke1"
        },
        {
            "name": "dev"
        }
    ]
}
```

> We can re-write the rule `r` from above to make use of `q`. We will call the new rule `p`

```go 
package play

import future.keywords.contains
import future.keywords.if
import future.keywords.in

sites := [{"name": "prod"}, {"name": "smoke1"}, {"name": "dev"}]

q contains name if {
	some site in sites
	name := site.name
}

p if q["prod"]
```

```json output.json
{
    "p": true,
    "q": [
        "dev",
        "prod",
        "smoke1"
    ],
    "sites": [
        {
            "name": "prod"
        },
        {
            "name": "smoke1"
        },
        {
            "name": "dev"
        }
    ]
}
```

## Scalar Values

> Scalar values are the simplest type of term in Rego. Scalar values can be *Strings*, *numbers*, *booleans*, or *null*.

> Documents can be defined *solely* in terms of scalar values.
> This is useful for defining *constants* that are referenced in multiple places.

```go
greeting := "Hello"
max_height := 42
pi := 3.14159
allowed := true
location := null

x := [greeting, max_height, pi, allowed, location]
```

```json output.json
[
    {
        "allowed": true,
        "greeting": "Hello",
        "location": null,
        "max_height": 42,
        "pi": 3.14159,
        "x": [
            "Hello",
            42,
            3.14159,
            true,
            null
        ]
    }
]
```

## Strings

> Rego supports two different types of syntax for declaring strings.

1. The first is likely to be the most familiar: *characters surrounded by double quotes*.
   - In such strings, certain characters must be *escaped* to appear in the string,
   - such as *double quotes themselves*, *backslashes*, etc.
2. The other type of string declaration is a *raw string declaration*.
   - These are made of characters surrounded by *backticks* (*`*),
   - with the exception that raw strings *may not contain backticks themselves*.
   - Raw strings are what they sound like
     - *escape* sequences are *not interpreted*, but instead taken as the *literal text* inside the backticks.
   - Raw strings are particularly useful when constructing *regular expressions* for matching,
     - as it eliminates the need to *double escape special characters*.

## Composite Values

> Composite values define *collections*.

```go
cube := {"width": 3, "height": 4, "depth": 5}
width := cube.width
```

```json output.json
[
    {
        "cube": {
            "depth": 5,
            "height": 4,
            "width": 3
        },
        "width": 3
    }
]
```

> Composite values can also be defined in terms of *Variables* or *References*.

```go
a := 42
b := false
c := null
d := {"a": a, "x": [b, c]}
```

```json output.json
{
    "a": 42,
    "b": false,
    "c": null,
    "d": {
        "a": 42,
        "x": [
            false,
            null
        ]
    }
}
```

### Objects

> Objects are *unordered key-value collections*.
> In Rego, *any value type* can be used as an *object key*.

```go
ips_by_port := {
	80: ["1.1.1.1", "1.1.1.2"],
	443: ["2.2.2.1"],
}

x := ips_by_port[80]
```

```json output.json
{
    "ips_by_port": {
        "80": [
            "1.1.1.1",
            "1.1.1.2"
        ],
        "443": [
            "2.2.2.1"
        ]
    },
    "x": [
        "1.1.1.1",
        "1.1.1.2"
    ]
}
```

```go
ips_by_port := {
	80: ["1.1.1.1", "1.1.1.2"],
	443: ["2.2.2.1"],
}

q contains port if {
	ips_by_port[port][_] == "1.1.1.1"
}
```

```json output.json
{
    "ips_by_port": {
        "80": [
            "1.1.1.1",
            "1.1.1.2"
        ],
        "443": [
            "2.2.2.1"
        ]
    },
    "q": [
        80
    ]
}
```

> When *Rego values* are converted to *JSON non-string object keys* are *marshalled as strings*, because JSON does not support non-string object keys.

### Sets

> In addition to *arrays* and *objects*, Rego supports set values. Sets are *unordered collections of unique values*.
> Just like other composite values, sets can be defined in terms of scalars, variables, references, and other composite values.

```go
cube := {"width": 3, "height": 4, "depth": 5}
s := {cube.width, cube.height, cube.depth}
```

```json output.json
{
    "cube": {
        "depth": 5,
        "height": 4,
        "width": 3
    },
    "s": [
        3,
        4,
        5
    ]
}
```

1. Set documents are *collections of values without keys*.
2. OPA represents set documents as *arrays* when serializing to *JSON* or other formats that do not support a set data type.
3. The important distinction between *sets* and *arrays* or *objects* is that sets are *unkeyed* while arrays and objects are keyed
   - i.e., you cannot refer to the *index* of an element within a set.

> When comparing sets, the order of elements does not matter

```go
same_set if {
	{1, 2, 3} == {3, 1, 2}
} # true
```

> Because sets share *curly-brace* syntax with *objects*, and an *empty object* is defined with `{}`, an *empty set* has to be constructed with a different syntax: `set()`

```go
size := count(set()) # 0
```

## Variables

> Variables are another kind of term in Rego. They appear in both the *head* and *body* of rules.

1. Variables appearing in the *head* of a rule can be thought of as *input* and *output* of the rule.
2. In Rego a variable is *simultaneously* an *input* and an *output*.
   - If a *query supplies a value* for a variable, that variable is an input
   - and if the query does not supply a value for a variable, that variable is an output

```go
package play

import future.keywords.contains
import future.keywords.if
import future.keywords.in

sites := [
	{"name": "prod"},
	{"name": "smoke1"},
	{"name": "dev"},
]

q contains name if {
	some site in sites
	name := site.name
}
```

> query - `q[x]`
> In this case, we evaluate `q` with a variable `x` (which is not bound to a value).
> As a result, the query returns all of the values for `x` and all of the values for `q[x]`, which are always the same because `q` is a set.

```
+----------+----------------+
|    x     | data.play.q[x] |
+----------+----------------+
| "dev"    | "dev"          |
| "prod"   | "prod"         |
| "smoke1" | "smoke1"       |
+----------+----------------+
```

> Query - `q["dev"]`
> On the other hand, if we evaluate `q` with an *input value* for `name` we can determine whether `name` exists in the document defined by `q`:

```
"dev"
```

1. *Variables* appearing in the *head* of a rule must also appear in a *non-negated equality expression* within the same rule.
2. This property ensures that if the rule is evaluated and *all* of the expressions evaluate to *true* for some set of *variable bindings*, the variable in the head of the rule will be *defined*.

## References

> References are used to access *nested documents*.

```json
sites := [
    {
        "region": "east",
        "name": "prod",
        "servers": [
            {
                "name": "web-0",
                "hostname": "hydrogen"
            },
            {
                "name": "web-1",
                "hostname": "helium"
            },
            {
                "name": "db-0",
                "hostname": "lithium"
            }
        ]
    },
    {
        "region": "west",
        "name": "smoke",
        "servers": [
            {
                "name": "web-1000",
                "hostname": "beryllium"
            },
            {
                "name": "web-1001",
                "hostname": "boron"
            },
            {
                "name": "db-1000",
                "hostname": "carbon"
            }
        ]
    },
    {
        "region": "west",
        "name": "dev",
        "servers": [
            {
                "name": "web-dev",
                "hostname": "nitrogen"
            },
            {
                "name": "db-dev",
                "hostname": "oxygen"
            }
        ]
    }
]

apps := [
    {
        "name": "web",
        "servers": ["web-0", "web-1", "web-1000", "web-1001", "web-dev"]
    },
    {
        "name": "mysql",
        "servers": ["db-0", "db-1000"]
    },
    {
        "name": "mongodb",
        "servers": ["db-dev"]
    }
]

containers := [
    {
        "image": "redis",
        "ipaddress": "10.0.0.1",
        "name": "big_stallman"
    },
    {
        "image": "nginx",
        "ipaddress": "10.0.0.2",
        "name": "cranky_euclid"
    }
]
```

> The simplest reference contains *no variables*.

```go
sites[0].servers[1].hostname

// ---

"helium"
```

> The *canonical form* does away with `.` and closely resembles *dictionary lookup* in a language such as Python

```go
sites[0]["servers"][1]["hostname"]

// ---

"helium"
```

> Both forms are *valid*, however, the *dot-access* style is typically *more readable*.
> Note that there are four cases where *brackets* must be used

1. *String keys* containing characters other than `[a-z]`, `[A-Z]`, `[0-9]`, or `_` (underscore).
2. *Non-string keys* such as numbers, booleans, and null.
3. *Variable keys*
4. *Composite keys*

> The prefix of a reference identifies the *root document* for that reference.
> The *root document* may be

1. a *local variable* inside a rule.
2. a rule inside the *same package*.
3. a document stored in OPA.
4. a documented temporarily provided to OPA as part of a transaction.
5. an array, object or set, e.g. `[1, 2, 3][0]`.
6. a function call, e.g. `split("a.b.c", ".")[1]`.
7. a *comprehension*.

### Variable Keys

> References can include variables as keys. 
> References written this way are used to select a value from *every element* in a collection.

```go
sites[i].servers[j].hostname

// ---

+---+---+----------------------------------------+
| i | j | data.play.sites[i].servers[j].hostname |
+---+---+----------------------------------------+
| 0 | 0 | "hydrogen"                             |
| 0 | 1 | "helium"                               |
| 0 | 2 | "lithium"                              |
| 1 | 0 | "beryllium"                            |
| 1 | 1 | "boron"                                |
| 1 | 2 | "carbon"                               |
| 2 | 0 | "nitrogen"                             |
| 2 | 1 | "oxygen"                               |
+---+---+----------------------------------------+
```

> In the reference above, we effectively used variables named `i` and `j` to iterate the collections.
> If the variables are *unused* outside the reference, we prefer to replace them with an underscore (`_`) character.

```go
sites[_].servers[_].hostname

// ---

+----------------------------------------+
| data.play.sites[_].servers[_].hostname |
+----------------------------------------+
| "hydrogen"                             |
| "helium"                               |
| "lithium"                              |
| "beryllium"                            |
| "boron"                                |
| "carbon"                               |
| "nitrogen"                             |
| "oxygen"                               |
+----------------------------------------+
```

1. The *underscore* is special because it *cannot be referred to by other parts of the rule*, e.g., the other side of the expression, another expression, etc.
2. The *underscore* can be thought of as a *special iterator*. Each time an underscore is specified, a *new iterator* is instantiated.
   - Under the hood, OPA translates the `_` character to a *unique variable name* that does not conflict with variables and rules that are in scope.

### Composite Keys

> References can include *Composite Values* as keys if the key is being used to refer into *a set*.
> Composite keys may not be used in refs for base data documents, they are only valid for references into *virtual documents*.

> This is useful for checking for the *presence* of *composite values* within *a set*, or extracting all values within a set matching some pattern.

```go
s := {[1, 2], [1, 4], [2, 6]}
x := s[[1, 2]]
```

```json output.json
{
    "s": [
        [
            1,
            2
        ],
        [
            1,
            4
        ],
        [
            2,
            6
        ]
    ],
    "x": [
        1,
        2
    ]
}
```

```go
s[[1,x]]

// ---

+---+--------------------+
| x | data.play.s[[1,x]] |
+---+--------------------+
| 2 | [1,2]              |
| 4 | [1,4]              |
+---+--------------------+
```

### Multiple Expressions

> Rules are often written in terms of *multiple expressions* that contain references to documents.

```go
apps_and_hostnames[[name, hostname]] {
    some i, j, k
    name := apps[i].name
    server := apps[i].servers[_]
    sites[j].servers[k].name == server
    hostname := sites[j].servers[k].hostname
}
```

```go
apps_and_hostnames[x]

// ---

+----------------------+---------------------------------+
|          x           | data.play.apps_and_hostnames[x] |
+----------------------+---------------------------------+
| ["mongodb","oxygen"] | ["mongodb","oxygen"]            |
| ["mysql","carbon"]   | ["mysql","carbon"]              |
| ["mysql","lithium"]  | ["mysql","lithium"]             |
| ["web","beryllium"]  | ["web","beryllium"]             |
| ["web","boron"]      | ["web","boron"]                 |
| ["web","helium"]     | ["web","helium"]                |
| ["web","hydrogen"]   | ["web","hydrogen"]              |
| ["web","nitrogen"]   | ["web","nitrogen"]              |
+----------------------+---------------------------------+
```

1. Several variables *appear more than once* in the *body*.
   - When *a variable* is used in *multiple locations*, OPA will only produce documents for the rule with the variable bound to the *same value in all expressions*.
2. The rule is *joining* the `apps` and `sites` documents *implicitly*.
   - In Rego (and other languages based on Datalog), *joins are implicit*.

### Self-Joins

> Using a *different key* on the same array or object provides the equivalent of self-join in SQL.

```go
same_site[apps[k].name] {
    some i, j, k
    apps[i].name == "mysql"
    server := apps[i].servers[_]
    server == sites[j].servers[_].name
    other_server := sites[j].servers[_].name
    server != other_server
    other_server == apps[k].servers[_]
}
```

```go
same_site[x]

// ---

+-------+------------------------+
|   x   | data.play.same_site[x] |
+-------+------------------------+
| "web" | "web"                  |
+-------+------------------------+
```

## Comprehensions

> Comprehensions provide a concise way of *building Composite Values* from sub-queries.

1. Like Rules, comprehensions consist of a *head* and a *body*.
2. The body of a comprehension can be understood in exactly the *same way* as the body of a rule
   - that is, one or more expressions that must *all* be true in order for the overall body to be true.
3. When the body evaluates to true, the head of the comprehension is evaluated to produce an element in the result.

> The body of a comprehension is able to refer to variables defined in the *outer* body.

```go
region := "west"
names := [name | sites[i].region == region; name := sites[i].name]
```

> In the above query, the second expression contains an *Array Comprehension* that refers to the *region* variable. The region variable will be bound in the *outer* body.

> When a comprehension refers to a variable in an outer body,
> OPA will *reorder expressions* in the outer body so that variables referred to in the comprehension are *bound* by the time the comprehension is *evaluated*.

```json
...
		"names": [
        "smoke",
        "dev"
    ],
    "region": "west",
...
```

> Comprehensions are similar to the same *constructs* found in other languages like *Python*.

> Comprehensions are often used to *group elements by some key*.

### Array Comprehensions

> Array Comprehensions *build array values* out of sub-queries

```
[ <term> | <body> ]
```

```go
app_to_hostnames[app_name] := hostnames if {
    app := apps[_]
    app_name := app.name
    hostnames := [hostname | name := app.servers[_]
                            s := sites[_].servers[_]
                            s.name == name
                            hostname := s.hostname]
}
```

```go
app_to_hostnames[app_name]

// ---

+-----------+------------------------------------------------------+
| app_name  |         data.play.app_to_hostnames[app_name]         |
+-----------+------------------------------------------------------+
| "mongodb" | ["oxygen"]                                           |
| "mysql"   | ["lithium","carbon"]                                 |
| "web"     | ["hydrogen","helium","beryllium","boron","nitrogen"] |
+-----------+------------------------------------------------------+
```

### Object Comprehensions

> Object Comprehensions *build object values* out of sub-queries.

```
{ <key>: <term> | <body> }
```

```go
app_to_hostnames := {app.name: hostnames |
    app := apps[_]
    hostnames := [hostname |
                    name := app.servers[_]
                    s := sites[_].servers[_]
                    s.name == name
                    hostname := s.hostname]
}
```

```go
app_to_hostnames[app_name]

// ---

+-----------+------------------------------------------------------+
| app_name  |         data.play.app_to_hostnames[app_name]         |
+-----------+------------------------------------------------------+
| "mongodb" | ["oxygen"]                                           |
| "mysql"   | ["lithium","carbon"]                                 |
| "web"     | ["hydrogen","helium","beryllium","boron","nitrogen"] |
+-----------+------------------------------------------------------+
```

> Object comprehensions are not allowed to have *conflicting* entries

```go
x := {"foo": y | z := [1, 2, 3]; y := z[_] }
```

```
eval_conflict_error: object keys must be unique
```

### Set Comprehensions

> Set Comprehensions *build set values* out of sub-queries. 

```
{ <term> | <body> }
```

```go
a := [1, 2, 3, 4, 3, 4, 3, 4, 5]
b := {x | x = a[_]}
```

```json output.json
{
    "a": [
        1,
        2,
        3,
        4,
        3,
        4,
        3,
        4,
        5
    ],
    "b": [
        1,
        2,
        3,
        4,
        5
    ]
}
```

## Rules

> Rules define the *content* of *Virtual Documents* in OPA.
> When OPA *evaluates* a rule, we say OPA *generates* the content of the document that is defined by the rule.

> Rule definitions can be *more expressive* when using the *future keywords* `contains` and `if`.

### Generating Sets

> The following rule defines a set containing the hostnames of all servers

```go
hostnames contains name if {
    name := sites[_].servers[_].hostname
}
```

```go
hostnames

// ---

[
  "beryllium",
  "boron",
  "carbon",
  "helium",
  "hydrogen",
  "lithium",
  "nitrogen",
  "oxygen"
]
```

> Note that the (future) keywords *contains* and *if* are *optional* here.

```go
hostnames[name] {
    name := sites[_].servers[_].hostname
}
```

```go
hostnames

// ---

[
  "beryllium",
  "boron",
  "carbon",
  "helium",
  "hydrogen",
  "lithium",
  "nitrogen",
  "oxygen"
]
```

```go
hostnames[name]

// ---

+-------------+---------------------------+
|    name     | data.play.hostnames[name] |
+-------------+---------------------------+
| "beryllium" | "beryllium"               |
| "boron"     | "boron"                   |
| "carbon"    | "carbon"                  |
| "helium"    | "helium"                  |
| "hydrogen"  | "hydrogen"                |
| "lithium"   | "lithium"                 |
| "nitrogen"  | "nitrogen"                |
| "oxygen"    | "oxygen"                  |
+-------------+---------------------------+
```

1. First, the rule defines *a set document* where the contents are defined by the variable `name`.
   - We know this rule defines *a set document* because the *head* only includes a *key*.
2. Second, the `sites[_].servers[_].hostname` fragment selects the `hostname` attribute from all of the objects in the `servers` collection.
   - From reading the fragment in isolation we cannot tell whether the fragment refers to *arrays* or *objects*.
   - We only know that it refers to a *collections* of values.
3. Third, the `name := sites[_].servers[_].hostname` expression binds the value of the `hostname` attribute to the variable `name`, which is also declared in the *head* of the rule.

> All rules have the following form (where key, value, and body are all optional)

```
<name> <key>? <value>? <body>?
```

### Generating Objects

> Rules that define *objects* are very similar to rules that define *sets*

```go
apps_by_hostname[hostname] := app if {
    some i
    server := sites[_].servers[_]
    hostname := server.hostname
    apps[i].servers[_] == server.name
    app := apps[i].name
}
```

> The rule above defines an *object* that maps hostnames to app names.

> The main difference between this rule and one which defines a *set* is the rule *head*: in addition to declaring a *key*, the rule head also declares a *value* for the document.

```json
apps_by_hostname

// ---

{
  "beryllium": "web",
  "boron": "web",
  "carbon": "mysql",
  "helium": "web",
  "hydrogen": "web",
  "lithium": "mysql",
  "nitrogen": "web",
  "oxygen": "mongodb"
}
```

> Using the (future) keyword if is *optional* here.

```go
apps_by_hostname[hostname] := app {
    some i
    server := sites[_].servers[_]
    hostname := server.hostname
    apps[i].servers[_] == server.name
    app := apps[i].name
}
```

### Incremental Definitions

1. A rule may be *defined multiple times* with the *same name*.
   - When a rule is defined this way, we refer to the rule definition as *incremental* because *each definition is additive*.
2. The document produced by *incrementally defined rules* is the *union* of the documents produced by each *individual* rule.

```go
instances contains instance if {
    server := sites[_].servers[_]
    instance := {"address": server.hostname, "name": server.name}
}

instances contains instance if {
    container := containers[_]
    instance := {"address": container.ipaddress, "name": container.name}
}
```

```go
instances

// ---

[
  {
    "address": "10.0.0.1",
    "name": "big_stallman"
  },
  {
    "address": "10.0.0.2",
    "name": "cranky_euclid"
  },
  {
    "address": "beryllium",
    "name": "web-1000"
  },
  {
    "address": "boron",
    "name": "web-1001"
  },
  {
    "address": "carbon",
    "name": "db-1000"
  },
  {
    "address": "helium",
    "name": "web-1"
  },
  {
    "address": "hydrogen",
    "name": "web-0"
  },
  {
    "address": "lithium",
    "name": "db-0"
  },
  {
    "address": "nitrogen",
    "name": "web-dev"
  },
  {
    "address": "oxygen",
    "name": "db-dev"
  }
]
```

> If the *head* of the rule is *same*, we can *chain multiple rule bodies* together to obtain the same result.
> We *don’t recommend* using this form anymore.

```
instances contains instance if {
    server := sites[_].servers[_]
    instance := {"address": server.hostname, "name": server.name}
} {
    container := containers[_]
    instance := {"address": container.ipaddress, "name": container.name}
}
```

> An *incrementally defined rule* can be intuitively understood as `<rule-1> OR <rule-2> OR ... OR <rule-N>`.

> Note that the (future) keywords contains and if are *optional* here.

```go
instances[instance] {
    server := sites[_].servers[_]
    instance := {"address": server.hostname, "name": server.name}
}

instances[instance] {
    container := containers[_]
    instance := {"address": container.ipaddress, "name": container.name}
}
```

### Complete Definitions

> In addition to rules that *partially* define *sets* and *objects*, Rego also supports so-called *complete* definitions of any type of document.
> Rules provide a *complete definition* by *omitting the key in the head*. Complete definitions are commonly used for *constants*:

```go
pi := 3.14159
```

> Rego allows authors to *omit the body of rules*. If the body is omitted, it defaults to *true*.

> Documents produced by rules with *complete definitions* can only have *one value* at a time.
> If evaluation produces multiple values for the same document, an error will be returned.

```go
user := "bob"
power_users := {"alice", "bob", "fred"}
restricted_users := {"bob", "kim"}
max_memory := 32 if power_users[user]
max_memory := 4 if restricted_users[user]
```

```
complete rules must not produce multiple outputs
```

> In some cases, having an undefined result for a document is not desirable. In those cases, policies can use the *Default* Keyword to provide a *fallback* value.

> Note that the (future) keyword if is *optional* here.

```go
max_memory := 32  {power_users[user]}
max_memory := 4  {restricted_users[user]}
```

### Rule Heads containing References

> As a shorthand for *defining nested rule structures*, it’s valid to use references as *rule heads*

```go
package play

import future.keywords.contains
import future.keywords.if
import future.keywords.in

fruit.apple.seeds = 12
fruit.orange.color = "orange"
```

```json output.json
{
    "fruit": {
        "apple": {
            "seeds": 12
        },
        "orange": {
            "color": "orange"
        }
    }
}
```

> This module defines *two complete rules*
> `data.play.fruit.apple.seeds` + `data.play.fruit.orange.color`

#### Variables in Rule Head References

##### Example

> Any term, *except the very first*, in a rule *head*’s reference can be a *variable*.
> These variables can be *assigned within the rule*, just as for any other *partial rule*, to *dynamically construct a nested collection of objects*.

```json input.json
{
    "users": [
        {
            "id": "alice",
            "role": "employee",
            "country": "USA"
        },
        {
            "id": "bob",
            "role": "customer",
            "country": "USA"
        },
        {
            "id": "dora",
            "role": "admin",
            "country": "Sweden"
        }
    ],
    "admins": [
        {
            "id": "charlie"
        }
    ]
}
```

```go
package play

import future.keywords

# A partial object rule that converts a list of users to a mapping by "role" and then "id".
users_by_role[role][id] := user if {
	some user in input.users
	id := user.id
	role := user.role
}

# Partial rule with an explicit "admin" key override
users_by_role.admin[id] := user if {
	some user in input.admins
	id := user.id
}

# Leaf entries can be partial sets
users_by_country[country] contains user.id if {
	some user in input.users
	country := user.country
}
```

```json output.json
{
    "users_by_country": {
        "Sweden": [
            "dora"
        ],
        "USA": [
            "alice",
            "bob"
        ]
    },
    "users_by_role": {
        "admin": {
            "charlie": {
                "id": "charlie"
            },
            "dora": {
                "country": "Sweden",
                "id": "dora",
                "role": "admin"
            }
        },
        "customer": {
            "bob": {
                "country": "USA",
                "id": "bob",
                "role": "customer"
            }
        },
        "employee": {
            "alice": {
                "country": "USA",
                "id": "alice",
                "role": "employee"
            }
        }
    }
}
```

##### Conflicts

> The *first variable* declared in a rule *head*’s reference divides the reference in *a leading constant portion* and *a trailing dynamic portion*.
> Other rules are allowed to *overlap* with the *dynamic portion* (dynamic extent) without causing a *compile-time conflict*.

```go
# R1
p[x].r := y {
    x := "q"
    y := 1
}

# R2
p.q.r := 2
```

> In the above example, rule `R2` overlaps with the *dynamic portion* of rule `R1`’s reference (`[x].r`), which is allowed at compile-time, as these rules aren’t guaranteed to produce conflicting output.
> However, as `R1` defines `x` as `"q"` and `y` as `1`, a *conflict* will be reported at evaluation-time.

```
eval_conflict_error: object keys must be unique
```

```go
# R1
p[x].r := y if {
	x := "q"
	y := 1
}

# R2
p.q.r := 1
```

```json output.json
{
    "p": {
        "q": {
            "r": 1
        }
    }
}
```

> *Conflicts* are detected at *compile-time*, where possible, between rules even if they are within the dynamic extent of another rule.

```go
package play

import future.keywords

# R1
p[x].r := y if {
	x := "foo"
	y := 1
}

# R2
p.q.r := 2

# R3
p.q.r.s := 3
```

```
rego_type_error: rule data.play.p.q.r conflicts with [data.play.p.q.r.s]
```

> Above, `R2` and `R3` are within the *dynamic extent* of `R1`, but are in conflict with each other, which is detected at compile-time.

> Rules are *not allowed to overlap* with *object values* of other rules.

```go
# R1
p.q.r := {"s": 1}

# R2
p[x].r.t := 2 {
    x := "q"
}
```

```
eval_conflict_error: object keys must be unique
```

> In the above example, `R1` is within the *dynamic extent* of `R2` and a conflict cannot be detected at *compile-time*.
> However, at *evaluation-time* `R2` will attempt to inject a value under key `t` in an *object value* defined by `R1`.
> This is a conflict, as rules are not allowed to *modify or replace values defined by other rules*.

```go
# R1
p.q.r.s := 1

# R2
p[x].r.t := 2 if {
	x := "q"
}
```

```json output.json
{
    "p": {
        "q": {
            "r": {
                "s": 1,
                "t": 2
            }
        }
    }
}
```

> As `R1` is now instead defining a value within the *dynamic extent* of `R2`’s reference, which is allowed.

### Functions

> Rego supports *user-defined functions* that can be called with the same semantics as Built-in Functions.
> They have access to both the the *data* Document and the *input* Document

```go
package play

import future.keywords

trim_and_split(s) := x if {
	t := trim(s, " ")
	x := split(t, ".")
}

r := trim_and_split("   foo.bar ")
```

```json output.json
{
    "r": [
        "foo",
        "bar"
    ]
}
```

> Note that the (future) keyword if is *optional* here.

```go
trim_and_split(s) := x {
	t := trim(s, " ")
	x := split(t, ".")
}
```

> Functions may have an *arbitrary number of inputs*, but *exactly one output*. Function arguments may be *any kind of term*.

```go
foo([x, {"bar": y}]) := z if {
	z := {x: y}
}

r1 := foo(["5", {"bar": "hello"}])

r2 := foo(["5", {"bar": [1, 2, 3, ["foo", "bar"]]}])
```

```json output.json
{
    "r1": {
        "5": "hello"
    },
    "r2": {
        "5": [
            1,
            2,
            3,
            [
                "foo",
                "bar"
            ]
        ]
    }
}
```

> If you need *multiple outputs*, write your functions so that the output is an *array*, *object* or *set* containing your results.
> If the output term is *omitted*, it is equivalent to having the output term be the literal `true`.
> Furthermore, `if` can be used to write *shorter definitions*.

```go
f(x) { x == "foo" }
f(x) if { x == "foo" }
f(x) if x == "foo"

f(x) := true { x == "foo" }
f(x) := true if { x == "foo" }
f(x) := true if x == "foo"
```

> The outputs of user functions have some additional limitations, namely that they must resolve to *a single value*.
> If you write a function that has *multiple possible bindings for an output variable*, you will get a *conflict* error

```go
p(x) := y if {
	y := x[_]
}

r := p([1, 2, 3])
```

```
eval_conflict_error: functions must not produce multiple outputs for same inputs
```

> It is possible in Rego to define a function more than once, to achieve a *conditional selection* of which function to execute: Functions can be *defined incrementally*.

```go
q(1, x) := y if {
	y := x
}

q(2, x) := y if {
	y := x * 4
}

r1 := q(1, 1) # 1
r2 := q(2, 1) # 4
r3 := q(3, 1) # undefined
```

> A given function call will execute *all* functions that match the *signature* given.

```go
r(1, x) := y if {
	y := x
}

r(x, 2) := y if {
	y := x * 4
}

r1 := r(1, 2)
```

```
eval_conflict_error: functions must not produce multiple outputs for same inputs
```

> On the other hand, if a call *matches no functions*, then the result is *undefined*.

```go
s(x, 2) := y if {
	y := x * 4
}

r := s(5, 3) # undefined
```

#### Function overloading

> Rego *does not currently support* the *overloading* of functions by the *number of parameters*.
> If two function definitions are given with the *same function name* but *different numbers of parameters*, a *compile-time type error* is generated.

```go
r(x) := result if {
	result := 2 * x
}

r(x, y) := result if {
	result := (2 * x) + (3 * y)
}
```

```
rego_type_error: conflicting rules data.play.r found
```

> The error can be avoided by using different function names.

```go
r_1(x) := result if {
	result := 2 * x
}

r_2(x, y) := result if {
	result := (2 * x) + (3 * y)
}

r := [r_1(10), r_2(10, 1)]
```

```json output.json
{
    "r": [
        20,
        23
    ]
}
```

> In the unusual case that it is critical to use the *same name*, the function could be made to take the *list of parameters* as *a single array*.

```go
r(params) := result if {
	count(params) == 1
	result := 2 * params[0]
}

r(params) := result if {
	count(params) == 2
	result := (2 * params[0]) + (3 * params[1])
}

x := [r([10]), r([10, 1])]
```

```go output.json
{
    "x": [
        20,
        23
    ]
}
```

## Negation

> To generate the content of a *Virtual* Document, OPA attempts to bind variables in the body of the rule such that *all expressions* in the rule evaluate to *True*.
> This generates the correct result when the expressions represent *assertions* about what *states* should *exist* in the data stored in OPA.
> In some cases, you want to express that certain states *should not exist* in the data stored in OPA. In these cases, *negation* must be used.

> For safety, a variable appearing in *a negated expression* must also appear in another *non-negated equality expression* in the *rule*.

1. OPA will *reorder expressions* to ensure that *negated expressions are evaluated* after other *non-negated expressions* with the *same variables*.
2. OPA will *reject* rules containing *negated expressions* that do not meet the *safety criteria* described above.

> The simplest use of negation involves only *scalar values* or *variables* and is equivalent to *complementing the operator*

```
t if {
    greeting := "hello"
    not greeting == "goodbye"
}
```

```json output.json
{
    "t": true
}
```

> Negation is required to check whether some value *does not exist* in a collection.
> That is, *complementing* the operator in an expression such as `p[_] == "foo"` yields `p[_] != "foo"`.
> However, this is *not equivalent to* `not p["foo"]`.

```go
prod_servers contains name if {
	some site in sites
	site.name == "prod"
	some server in site.servers
	name := server.name
}

apps_in_prod contains name if {
	some site in sites
	some app in apps
	name := app.name
	some server in app.servers
	prod_servers[server]
}

apps_not_in_prod contains name if {
	some app in apps
	name := app.name
	not apps_in_prod[name]
}
```

```json output.json
...
		"prod_servers": [
        "db-0",
        "web-0",
        "web-1"
    ],
    "apps_in_prod": [
        "mysql",
        "web"
    ],
    "apps_not_in_prod": [
        "mongodb"
    ],
...
```

## Universal Quantification - FOR ALL

> policy

```
There must be no apps named "bitcoin-miner".
```

> The most expressive way to state this in Rego is using the `every` keyword

```shell
no_bitcoin_miners_using_every if {
	every app in apps {
		app.name != "bitcoin-miner"
	}
} # true
```

> Variables in Rego are *existentially quantified* by default

```shell
arr := ["one", "two", "three"]
x := i if arr[i] == "three" # 2
```

> Define a rule that finds if there *exists* a bitcoin-mining app (which is easy using the `some` keyword).
> And then you use *negation* to check that there is NO bitcoin-mining app.
> Technically, you’re using 2 negations and an existential quantifier, which is logically the same as a universal quantifier.

```shell
any_bitcoin_miners if {
	some app in apps
	app.name == "bitcoin-miner"
} # undefined

no_bitcoin_miners_using_negation if not any_bitcoin_miners # true
```

```go
no_bitcoin_miners_using_negation with apps as [{"name": "web"}]

// ---

true
```

```go
no_bitcoin_miners_using_negation with apps as [{"name": "bitcoin-miner"}, {"name": "web"}]

// ---

undefined
```

> The `undefined` result above is expected because we did not define a *default* value for `no_bitcoin_miners_using_negation`.
> Since the body of the rule *fails to match*, there is *no value generated*.

```shell
no_bitcoin_miners if {
    app := apps[_]
    app.name != "bitcoin-miner"  # THIS IS NOT CORRECT.
}
```

```shell
no_bitcoin_miners if {
    some app in apps
    app.name != "bitcoin-miner"
}
```

> The reason the rule is *incorrect* is that variables in Rego are *existentially quantified*. This means that rule bodies and queries express *FOR ANY* and *not FOR ALL*. 
> To express *FOR ALL* in Rego *complement the logic in the rule body* (e.g., `!=` becomes `==`) and then *complement the check* using *negation*
> `FOR ALL = Not FOR ANY`

> Alternatively, we can implement the same kind of logic inside a single rule using *Comprehensions*.

```shell
no_bitcoin_miners_using_comprehension if {
	bitcoin_miners := {app | some app in apps; app.name == "bitcoin-miner"}
	count(bitcoin_miners) == 0
} # true
```

> Whether you use *negation*, *comprehensions*, or `every` to express *FOR ALL* is up to you.
> The `every` keyword should lend itself nicely to a rule formulation that closely follows how requirements are stated, and thus enhances your policy’s readability.

> The *comprehension version* is *more concise* than the *negation variant*, and does not require a *helper rule* while the negation version is *more verbose* but a bit *simpler* and allows for *more complex ORs*.

## Modules

> In Rego, *policies* are defined inside *modules*. Modules consist of:

1. Exactly *one Package declaration*.
2. *Zero or more Import statements*.
3. *Zero or more Rule definitions*.

> Modules are typically *represented in Unicode text* and *encoded in UTF-8*.

### Comments

> Comments begin with the `#` character and continue until the *end* of the line.

### Packages

1. Packages *group the rules defined* in one or more *modules* into a particular *namespace*.
   - Because rules are *namespaced* they can be safely shared across projects.
2. Modules contributing to the *same package* do not have to be located in the *same directory*.
3. The rules defined in a module are *automatically exported*.
4. That is, they can be queried under OPA’s Data API provided the appropriate package is given.

```go
package opa.examples

pi := 3.14159
```

> The `pi` document can be queried via the Data API

```
GET https://example.com/v1/data/opa/examples/pi HTTP/1.1
```

> Valid package names are *variables* or *references* that only contain *string operands*. valid package names

```
package foo
package foo.bar
package foo.bar.baz
package foo["bar.baz"].qux
```

>invalid package names

```
package 1foo        # not a variable
package foo[1].bar  # contains non-string operand
```

### Imports

1. Import statements declare dependencies that modules have on documents defined outside the package.
   - By importing a document, the *identifiers exported by that document* can be referenced within the current module.
2. All modules contain *implicit statements* which import the `data` and `input` documents.
   - Modules use the same syntax to *declare dependencies* on *Base* and *Virtual* Documents.

```shell
package play

import future.keywords # uses 'in' and 'contains' and 'if'

import data.servers

http_servers contains server if {
	some server in servers # import data.servers
	"http" in server.protocols
}
```

```json output.json
{
    "http_servers": [
        {
            "id": "ci",
            "ports": [
                "p1",
                "p2"
            ],
            "protocols": [
                "http"
            ]
        }
    ]
}
```

> Similarly, modules can *declare dependencies* on *query arguments* by specifying an import path that starts with `input`.

```bash
package opa.examples
import future.keywords

import input.user
import input.method

# allow alice to perform any operation.
allow if user == "alice"

# allow bob to perform read-only operations.
allow if {
    user == "bob"
    method == "GET"
}

# allows users assigned a "dev" role to perform read-only operations.
allow if {
    method == "GET"
    input.user in data.roles["dev"]
}

# allows user catherine access on Saturday and Sunday
allow if {
    user == "catherine"
    day := time.weekday(time.now_ns())
    day in ["Saturday", "Sunday"]
}
```

```json input.json
{
    "user": "alice",
    "method": "GET"
}
```

> Imports can include an optional `as` keyword to handle namespacing issues

```shell
package opa.examples
import future.keywords

import data.servers as my_servers

http_servers contains server if {
    some server in my_servers
    "http" in server.protocols
}
```

## Future Keywords

> To ensure *backwards-compatibility*, new keywords (like every) are *introduced slowly*.
> In the first stage, users can *opt-in* to using the new keywords via a special import

1. `import future.keywords` introduces *all* future keywords, and
2. `import future.keywords.x` *only* introduces the `x` keyword – see below for all known future keywords.

> Using `import future.keywords` to import *all* future keywords means an **opt-out of a safety measure**:

1. With a new version of OPA, the set of *all* future keywords can *grow*, and policies that worked with the previous version of OPA *stop working*.
2. This cannot happen when you *selectively import* the future keywords as you need them.

> At some point in the future, the keyword will become *standard*, and the import will become a no-op that can safely be removed.

> Note that some future keyword imports have consequences on *pretty-printing*
> If `contains` or `if` are *imported*, the *pretty-printer* will use them as applicable when *formatting* the modules.

### in

> More expressive *membership* and *existential quantification* keyword

```go
deny {
    some x in input.roles # iteration
    x == "denylisted-role"
}
deny {
    "denylisted-role" in input.roles # membership check
}
```

> in was introduced in *v0.34.0*.

### every

> Expressive *universal quantification* keyword

```go
allowed := {"customer", "admin"}

allow {
    every role in input.roles {
        role.name in allowed
    }
}
```

> There is no need to also import `future.keywords.in`, that is **implied** by importing `future.keywords.every`.

> every was introduced in *v0.38.0*.

### if

> This keyword allows more expressive rule *heads*

```go
deny if input.token != "secret"
```

> if was introduced in *v0.42.0*.

### contains

> This keyword allows more expressive *rule heads* for *partial set rules*

```
deny contains msg { msg := "forbidden" }
```

> contains was introduced in *v0.42.0*.

## Some Keyword

> The `some` keyword allows queries to *explicitly declare local variables*.
> Use the `some` keyword in rules that contain unification statements or references with *variable* operands **if** variables contained in those statements are *not declared* using `:=` .

| Statement                        | Example                          | Variables   |
| -------------------------------- | -------------------------------- | ----------- |
| Unification                      | `input.a = [["b", x], [y, "c"]]` | `x` and `y` |
| Reference with variable operands | `data.foo[i].bar[j]`             | `i` and `j` |

> For example, the following rule generates tuples of array indices for servers in the “west” region that contain “db” in their name.

```shell
tuples contains [i, j] if {
	some i, j
	sites[i].region == "west"
	server := sites[i].servers[j] # note: 'server' is local because it's declared with :=
	contains(server.name, "db")
}
```

```json output.json
...
		"tuples": [
        [
            1,
            2
        ],
        [
            2,
            1
        ]
    ]
...
```

> Since we have declared `i`, `j`, and `server` to be local, we can introduce rules in the same package without affecting the result above:

```shell
# Define a rule called 'i'
i := 1
```

> If we had not declared `i` with the `some` keyword, introducing the `i` rule above would have changed the result of `tuples` because the `i` symbol in the body would capture the *global* value. removing `some i, j`

```shell
# Define a rule called 'i'
i := 1

tuples contains [i, j] if {
	# 	some i, j
	sites[i].region == "west"
	server := sites[i].servers[j] # note: 'server' is local because it's declared with :=
	contains(server.name, "db")
}
```

```json output.json
...
		"tuples": [
        [
            1,
            2
        ]
    ]
...
```

> The `some` keyword is *not required* but it’s *recommended* to avoid situations like the one above where introduction of a rule inside a package could change behaviour of other rules.

## Every Keyword

```shell
names_with_dev if {
	some site in sites
	site.name == "dev"

	every server in site.servers {
		endswith(server.name, "-dev")
	}
} # true
```

> The `every` keyword takes an (optional) *key* argument, a *value* argument, a domain, and a block of further queries, its “body”.

1. The keyword is used to *explicitly assert* that its body is *true* for *any element in the domain*.
2. It will *iterate* over the domain, *bind its variables*, and check that the body holds for those bindings.
3. If *one* of the bindings *does not* yield a *successful evaluation* of the body, the *overall* statement is *undefined*.
4. If the *domain* is *empty*, the overall statement is *true*.
5. Evaluating `every` does **not** introduce *new bindings* into the rule evaluation.

> Used with a *key* argument, the *index*, or *property name* (for *objects*), comes into the scope of the body evaluation

```shell
array_domain if {
	every i, x in [1, 2, 3] { x - i == 1 } # array domain
} # true

object_domain if {
	every k, v in {"foo": "bar", "fox": "baz"} { # object domain
		startswith(k, "f")
		startswith(v, "b")
	}
} # true

set_domain if {
	every x in {1, 2, 3} { x != 4 } # set domain
} # true
```

> Semantically, `every x in xs { p(x) }` is equivalent to, but shorter than, a “not-some-not” construct using a helper rule

```shell
xs := [2, 2, 4, 8]

larger_than_one(x) := x > 1

rule_every if {
	every x in xs { larger_than_one(x) }
}

less_or_equal_one if {
	some x in xs
	not larger_than_one(x)
}

not_less_or_equal_one if not less_or_equal_one
```

```json output.json
{
    "not_less_or_equal_one": true,
    "rule_every": true,
    "xs": [
        2,
        2,
        4,
        8
    ]
}
```

> Negating `every` is forbidden. If you desire to express `not every x in xs { p(x) }` please use `some x in xs; not p(x)` instead.

## With Keyword

> The with keyword allows queries to *programmatically* specify values *nested* under the *input* Document or the *data* Document, or *built-in* functions.

> For example, given the simple authorization policy in the Imports section, we can write a *query* that checks whether a particular request would be allowed

```go
allow with input as {"user": "alice", "method": "POST"}

// --- 

true
```

```go
allow with input as {"user": "bob", "method": "GET"}

// ---

true
```

```go
not allow with input as {"user": "bob", "method": "DELETE"}

// ---

true
```

```go
allow with input as {"user": "charlie", "method": "GET"} with data.roles as {"dev": ["charlie"]}

// ---

true
```

```go
not allow with input as {"user": "charlie", "method": "GET"} with data.roles as {"dev": ["bob"]}

// ---

true
```

```go
allow with input as {"user": "catherine", "method": "GET"}
      with data.roles as {"dev": ["bob"]}
      with time.weekday as "Sunday"
      
// ---

true
```

> The `with` keyword acts as a *modifier* on expressions. A single expression is allowed to have *zero or more* `with` modifiers. The `with` keyword has the following syntax
> The `<target>`s must be references to values in the *input* document (or the input document itself) or *data* document, or references to *functions* (built-in or not).

```
<expr> with <target-1> as <value-1> [with <target-2> as <value-2> [...]]
```

> When applied to the `data` document, the `<target>` must *not* attempt to *partially define virtual documents*.
> For example, given a virtual document at path `data.foo.bar`, the compiler will generate an error if the policy attempts to replace `data.foo.bar.baz`.

> The `with` keyword only *affects* the *attached* expression. Subsequent expressions will see the *unmodified* value.

```shell
inner := [x, y] if { # {"foo": 100, "bar": 300}
	x := input.foo
	y := input.bar
}

middle := [a, b] if { # {"foo": 200, "bar": 300}
	a := inner with input.foo as 100
	b := input # foo still as 200
}

outer := result if {
	result := middle with input as {"foo": 200, "bar": 300}
}
```

```json output.json
{
    "outer": [
        [
            100,
            300
        ],
        {
            "bar": 300,
            "foo": 200
        }
    ]
}
```

> When `<target>` is a reference to a *function*, like `http.send`, then its `<value>` can be any of the following:

1. a value: `with http.send as {"body": {"success": true }}`
2. a reference to another function: `with http.send as mock_http_send`
3. a reference to another (possibly custom) built-in function: `with custom_builtin as less_strict_custom_builtin`
4. a reference to a rule that will be used as the *value*.

> When the *replacement value* is a *function*, its *arity* needs to match the replaced function’s arity; and the *types* must be compatible.

```shell
f(x) := count(x)

mock_count(x) := 0 if "x" in x
mock_count(x) := count(x) if not "x" in x

f([1, 2, 3]) with count as mock_count # 3
f(["x", "y", "z"]) with count as mock_count # 0
```

## Default Keyword

> The default keyword allows policies to define *a default value* for documents produced by rules with *Complete Definitions*.
> The default value is used when all of the rules sharing the *same name* are *undefined*.

```shell
default allow := false # false

allow if {
	input.user == "bob"
	input.method == "GET"
}

allow if input.user == "alice"
```

> When the `allow` document is queried, the return value will be either `true` or `false`
> Without the default definition, the `allow` document would simply be *undefined* for the same input.

> When the `default` keyword is used, the rule syntax is restricted to

```
default <name> := <term>
```

> The term may be any *scalar*, *composite*, or *comprehension value* but it may not be a *variable* or *reference*.
> If the value is a *composite* then it may not contain variables or references.
> *Comprehensions* however may, as the result of a comprehension is *never undefined*.

> Similar to *rules*, the `default` keyword can be applied to *functions* as well.

```go
package play

import future.keywords

default clamp_positive(_) := 0

clamp_positive(x) = x if {
	x > 0
}

r := clamp_positive(-1)
```

> When `clamp_positive` is queried, the return value will be either the argument provided to the function or `0`.

```json output.json
{
    "r": 0
}
```

> The value of a `default` function follows the *same conditions* as that of a `default` rule. In addition, a `default` function satisfies the following properties:

1. same *arity* as other functions with the same name
2. arguments should only be *plain variables* ie. no composite values
3. argument names should not be *repeated*

## Else Keyword

> The `else` keyword is a basic *control flow construct* that gives you control over *rule evaluation order*.
> Rules grouped together with the `else` keyword are evaluated *until a match is found*. Once a match is found, rule evaluation *does not proceed to rules further in the chain*.

> The `else` keyword is useful if you are porting policies into Rego from an *order-sensitive* system like *IPTables*.

```shell
authorize := "allow" if {
    input.user == "superuser"           # allow 'superuser' to perform any operation.
} else := "deny" if {
    input.path[0] == "admin"            # disallow 'admin' operations...
    input.source_network == "external"  # from external networks.
} # ... more rules
```

> In the example below, *evaluation stops immediately* after the *first rule* even though the input matches the second rule as well.

```json input.json
{
  "path": [
    "admin",
    "exec_shell"
  ],
  "source_network": "external",
  "user": "superuser"
}
```

> In the next example, the input matches the second rule (but not the first) so evaluation continues to the second rule before stopping.

```json input.json
{
  "path": [
    "admin",
    "exec_shell"
  ],
  "source_network": "external",
  "user": "alice"
}
```

> The `else` keyword may be used *repeatedly* on the same rule and there is *no limit* imposed on the number of `else` clauses on a rule.

## Operators

### Membership and iteration: in

> Membership and iteration

> The membership operator `in` lets you check if an element is part of a *collection* (*array*, *set*, or *object*). It always evaluates to `true` or `false`

```shell
p := [x, y, z] if {
	x := 3 in [1, 2, 3] # array
	y := 3 in {1, 2, 3} # set
	z := 3 in {"foo": 1, "bar": 3} # object
}
```

```shell
{
    "p": [
        true,
        true,
        true
    ]
}
```

> When providing *two arguments* on the *left-hand* side of the `in` operator, and an *object* or an *array* on the *right-hand* side,
> the *first argument* is taken to be the *key (object)* or *index (array)*, respectively

```shell
p := [x, y] if {
    x := "foo", "bar" in {"foo": "bar"}    # key, val with object
    y := 2, "baz" in ["foo", "bar", "baz"] # key, val with array
}
```

```json output.json
{
    "p": [
        true,
        true
    ]
}
```

> that in *list contexts*, like *set* or *array* definitions and *function* arguments, *parentheses* are required to use the form with *two left-hand side arguments*

```shell
p := x if {
    x := { 0, 2 in [2] }
}

q := x if {
    x := { (0, 2 in [2]) }
}
```

```json output.json
{
    "p": [
        true,
        0
    ],
    "q": [
        true
    ]
}
```

```shell
g(x) := sprintf("one function argument: %v", [x])
f(x, y) := sprintf("two function arguments: %v, %v", [x, y])

w := x if {
    x := g((0, 2 in [2]))
}

z := x if {
    x := f(0, 2 in [2])
}
```

```json output.json
{
    "w": "one function argument: true",
    "z": "two function arguments: 0, true"
}
```

> Combined with `not`, the operator can be handy when asserting that an element is *not member* of an array

```shell
deny if not "admin" in input.user.roles

test_deny if {
	deny with input.user.roles as ["operator", "user"]
}
```

```json output.json
{
    "test_deny": true
}
```

> that expressions using the `in` operator *always return `true` or `false`*, even when called in *non-collection* arguments

```shell
q := x if {
    x := 3 in "three"
} # false
```

> Using the `some` variant, it can be used to introduce *new variables based on a collections’ items*

```json output.json
p[x] {
    some x in ["a", "r", "r", "a", "y"]
}

q[x] {
    some x in {"s", "e", "t"}
}

r[x] {
    some x in {"foo": "bar", "baz": "quz"}
}
```

```json output.json
{
    "p": [
        "a",
        "r",
        "y"
    ],
    "q": [
        "e",
        "s",
        "t"
    ],
    "r": [
        "bar",
        "quz"
    ]
}
```

> Furthermore, passing a *second argument* allows you to work with *object keys* and *array indices*

```shell
p[x] {
    some x, "r" in ["a", "r", "r", "a", "y"] # key variable, value constant
}

q[x] = y if {
     some x, y in ["a", "r", "r", "a", "y"] # both variables
}

r[y] = x if {
    some x, y in {"foo": "bar", "baz": "quz"}
}
```

```json output.json
{
    "p": [
        1,
        2
    ],
    "q": {
        "0": "a",
        "1": "r",
        "2": "r",
        "3": "a",
        "4": "y"
    },
    "r": {
        "bar": "foo",
        "quz": "baz"
    }
}
```

> Any argument to the `some` variant can be a *composite, non-ground value*

```shell
p[x] = y if {
    some x, {"foo": y} in [{"foo": 100}, {"bar": 200}]
}

p[x] = y if {
    some {"bar": x}, {"foo": y} in {{"bar": "b"}: {"foo": "f"}}
}
```

```json output.json
{
    "p": {
        "0": 100,
        "b": "f"
    }
}
```

### Equality: Assignment, Comparison, and Unification

> Rego supports three kinds of equality: *assignment* (`:=`), *comparison* (`==`), and *unification* `=`.
> We recommend using assignment (`:=`) and comparison (`==`) whenever possible for policies that are easier to read and write.

#### Assignment :=

> The assignment operator (`:=`) is used to *assign values to variables*.
> Variables assigned inside a rule are *locally scoped* to that rule and *shadow global variables*.

```shell
x := 100

p if {
    x := 1     # declare local variable 'x' and assign value 1
    x != 100   # true because 'x' refers to local variable
} # true
```

> *Assigned variables* are not allowed to *appear before the assignment* in the query.

```shell
p if {
    x != 100
    x := 1     # error because x appears earlier in the query.
} # rego_compile_error: var x referenced above

q if {
    x := 1
    x := 2     # error because x is assigned twice.
} # rego_compile_error: var x assigned above
```

> A simple form of *destructuring* can be used to *unpack values from arrays* and *assign* them to variables

```bash
address := ["3 Abbey Road", "NW8 9AY", "London", "England"]

in_london if {
	[_, _, city, country] := address
	city == "London"
	country == "England"
} # true
```

#### Comparison ==

> Comparison checks if two values are equal within a rule. If the left or right hand side contains a variable that *has not been assigned* a value, the compiler throws an error.

```shell
p if {
    x := 100
    x == 100   # true because x refers to the local variable
} # true
```

```shell
y := 100
q if {
    y == 100   # true because y refers to the global variable
} # true
```

```shell
r if {
    z == 100   # compiler error because z has not been assigned a value
} # rego_unsafe_var_error: var z is unsafe
```

#### Unification =

> Unification (`=`) combines *assignment* and *comparison*.
> Rego will *assign variables to values* that *make the comparison true*.
> Unification lets you ask for values for variables that *make an expression true*.

```shell
p[x] = y if {
	[x, "world"] = ["hello", y]
}
```

```json output.json
{
    "p": {
        "hello": "world"
    }
}
```

> As *opposed* to when assignment (`:=`) is used, the *order* of expressions in a rule *does not affect* the document’s content.

```shell
s if {
	x > y
	y = 41
	x = 42
} # true
```

#### Best Practices for Equality

> Here is a *comparison* of the three forms of equality.

| Equality | Applicable | Compiler Errors           | Use Case        |
| -------- | ---------- | ------------------------- | --------------- |
| :=       | Everywhere | Var already assigned      | Assign variable |
| ==       | Everywhere | Var not assigned          | Compare values  |
| =        | Everywhere | Values cannot be computed | Express query   |

> Best practice is to use *assignment* `:=` and *comparison* `==` wherever possible.
> The *additional compiler checks* help avoid errors when writing policy, and the additional syntax helps *make the intent clearer* when *reading* policy.

> Under the hood `:=` and `==` are *syntactic sugar* for `=`, local variable creation, and additional compiler checks.

### Comparison Operators

> The following comparison operators are supported:

```shell
a  ==  b  #  `a` is equal to `b`.
a  !=  b  #  `a` is not equal to `b`.
a  <   b  #  `a` is less than `b`.
a  <=  b  #  `a` is less than or equal to `b`.
a  >   b  #  `a` is greater than `b`.
a  >=  b  #  `a` is greater than or equal to `b`.
```

> None of these operators *bind variables* contained in the expression. As a result, if either operand is a variable, the variable must appear in another expression in the same rule that would cause the variable to *be bound*, i.e., an equality expression or the target position of a built-in function.

## Built-in Functions

> Built-ins can be easily recognized by their *syntax*. All built-ins have the following form
> Built-ins usually take *one or more input values* and *produce one output value*. Unless stated otherwise, all built-ins accept *values* or *variables* as *output* arguments.

```
<name>(<arg-1>, <arg-2>, ..., <arg-n>)
```

> If a built-in function is invoked with a *variable* as *input*, the variable must be *safe*, i.e., it must be *assigned* elsewhere in the query.

> Built-ins can include `.` characters in the name. This allows them to be *namespaced*.
> If you are adding custom built-ins to OPA, consider *namespacing* them to avoid naming conflicts, e.g., `org.example.special_func`.

### Errors

> By default, built-in function calls that encounter *runtime errors* evaluate to *undefined* (which can usually be treated as `false`) and *do not halt policy evaluation*.
> This ensures that built-in functions can be called with *invalid inputs* without causing the entire policy to *stop evaluating*.

> In most cases, policies do not have to implement any kind of *error handling logic*.
> If error handling is required, the built-in function call can be *negated* to test for *undefined*.

```shell
allow if {
	io.jwt.verify_hs256(input.token, "secret")
	[_, payload, _] := io.jwt.decode(input.token)
	payload.role == "admin"
}

reason contains "invalid JWT supplied as input" if {
	not io.jwt.decode(input.token)
}
```

```json input.json
{
    "token": "a poorly formatted token"
}
```

```json output.json
{
    "reason": [
        "invalid JWT supplied as input"
    ]
}
```

> If you wish to disable this behaviour and instead have built-in function call errors treated as *exceptions* that *halt policy evaluation* enable `strict built-in errors` in the caller

## Metadata

> The package and individual rules in a module can be *annotated* with a rich set of metadata.

```shell
# METADATA
# title: My rule
# description: A rule that determines if x is allowed.
# authors:
# - John Doe <john@example.com>
# entrypoint: true
allow {
  ...
}
```

> Annotations are grouped within a *metadata block*, and must be specified as YAML within a comment block that **must** start with `# METADATA`.
> Also, every line in the comment block containing the annotation **must** start at Column 1 in the module/file, or otherwise, they will be ignored.

## Strict Mode

1. The Rego compiler supports `strict mode`, where *additional constraints* and *safety checks* are *enforced* during *compilation*.
2. Compiler rules that will be enforced by future versions of OPA, but will be a *breaking change* once introduced, are incubated in strict mode.
3. This creates an opportunity for users to verify that their policies are compatible with the next version of OPA before upgrading.

> Compiler Strict mode is supported by the `check` command, and can be enabled through the `-S` flag.

```
$ opa help check
Check Rego source files for parse and compilation errors.

	If the 'check' command succeeds in parsing and compiling the source file(s), no output
	is produced. If the parsing or compiling fails, 'check' will output the errors
	and exit with a non-zero exit code.

Usage:
  opa check <path> [path [...]] [flags]

Flags:
  -b, --bundle                 load paths as bundle files or root directories
      --capabilities string    set capabilities version or capabilities.json file path
  -f, --format {pretty,json}   set output format (default pretty)
  -h, --help                   help for check
      --ignore strings         set file and directory names to ignore during loading (e.g., '.*' excludes hidden files)
  -m, --max-errors int         set the number of errors to allow before compilation fails early (default 10)
  -s, --schema string          set schema file path or directory path
  -S, --strict                 enable compiler strict mode
```

# Policy Testing

> To help you verify the *correctness* of your policies, OPA also gives you a *framework* that you can use to write *tests* for your policies.
> By writing tests for your policies you can *speed up the development process of new rules* and *reduce the amount of time it takes to modify rules* as requirements evolve.

## Getting Started

> The file below implements a simple policy that allows new users to be created and users to access their own profile.

```shell example.rego
package authz
import future.keywords

allow if {
    input.path == ["users"]
    input.method == "POST"
}

allow if {
    input.path == ["users", input.user_id]
    input.method == "GET"
}
```

```shell example_test.rego
package authz
import future.keywords

test_post_allowed if {
    allow with input as {"path": ["users"], "method": "POST"}
}

test_get_anonymous_denied if {
    not allow with input as {"path": ["users"], "method": "GET"}
}

test_get_user_allowed if {
    allow with input as {"path": ["users", "bob"], "method": "GET", "user_id": "bob"}
}

test_get_another_user_denied if {
    not allow with input as {"path": ["users", "bob"], "method": "GET", "user_id": "alice"}
}
```

```
$ ls .
example.rego  example_test.rego

$ opa test . -v
example_test.rego:
data.authz.test_post_allowed: PASS (175.042µs)
data.authz.test_get_anonymous_denied: PASS (247.084µs)
data.authz.test_get_user_allowed: PASS (83µs)
data.authz.test_get_another_user_denied: PASS (81.583µs)
--------------------------------------------------------------------------------
PASS: 4/4
```

> by removing the first rule in **example.rego**

```
$ opa test . -v
FAILURES
--------------------------------------------------------------------------------
data.authz.test_post_allowed: FAIL (110.459µs)

  query:1                 Enter data.authz.test_post_allowed = _
  example_test.rego:4     | Enter data.authz.test_post_allowed
  example_test.rego:5     | | Fail data.authz.allow with input as {"method": "POST", "path": ["users"]}
  query:1                 | Fail data.authz.test_post_allowed = _

SUMMARY
--------------------------------------------------------------------------------
example_test.rego:
data.authz.test_post_allowed: FAIL (110.459µs)
data.authz.test_get_anonymous_denied: PASS (84.208µs)
data.authz.test_get_user_allowed: PASS (119.458µs)
data.authz.test_get_another_user_denied: PASS (69.209µs)
--------------------------------------------------------------------------------
PASS: 3/4
FAIL: 1/4
```

## Test Format

> Tests are expressed as *standard Rego rules* with a *convention* that the *rule name* is prefixed with `test_`.

```shell
package mypackage
import future.keywords

test_some_descriptive_name if {
    # test logic
}
```

## Test Discovery

1. The `opa test` subcommand runs all of the tests (i.e., rules prefixed with `test_`) found in Rego files passed on the command line.
2. If *directories* are passed as *command line arguments*, `opa test` will load their file contents *recursively*.

## Specifying Tests to Run

> The opa test subcommand supports a `--run/-r` *regex* option to further specify which of the *discovered tests* should be evaluated. The option supports *re2 syntax*

```
$ opa test . -v -r test_post_allowed
example_test.rego:
data.authz.test_post_allowed: PASS (166.75µs)
--------------------------------------------------------------------------------
PASS: 1/1

$ opa test . -v -r data.authz.test_post_allowed
example_test.rego:
data.authz.test_post_allowed: PASS (171.542µs)
--------------------------------------------------------------------------------
PASS: 1/1
```

## Test Results

1. If the test rule is *undefined* or generates a *non-true* value the test result is reported as `FAIL`. 
2. If the test encounters a *runtime error* (e.g., a divide by zero condition) the test result is marked as an `ERROR`. 
3. Tests prefixed with `todo_` will be reported as `SKIPPED`.
4. Otherwise, the test result is marked as `PASS`.

```shell pass_fail_error_test.rego
package example
import future.keywords

allow if {
    input.path == ["users"]
    input.method == "POST"
}

allow if {
    input.path == ["users", input.user_id]
    input.method == "GET"
}

# This test will pass.
test_ok if true

# This test will fail.
test_failure if 1 == 2

# This test will error.
test_error if 1 / 0

# This test will be skipped.
todo_test_missing_implementation if {
    allow with data.roles as ["not", "implemented"]
}
```

```
$ opa test pass_fail_error_test.rego
pass_fail_error_test.rego:
data.example.test_failure: FAIL (44.125µs)
data.example.test_error: FAIL (47.417µs)
data.example.todo_test_missing_implementation: SKIPPED
--------------------------------------------------------------------------------
PASS: 1/4
FAIL: 2/4
SKIPPED: 1/4
```

>By default, OPA prints the test results in a *human-readable* format.
>If you need to consume the test results *programmatically*, use the *JSON* output format.

```json
$ opa test --format=json pass_fail_error_test.rego
[
  {
    "location": {
      "file": "pass_fail_error_test.rego",
      "row": 15,
      "col": 1
    },
    "package": "data.example",
    "name": "test_ok",
    "duration": 114708
  },
  {
    "location": {
      "file": "pass_fail_error_test.rego",
      "row": 18,
      "col": 1
    },
    "package": "data.example",
    "name": "test_failure",
    "fail": true,
    "duration": 46084
  },
  {
    "location": {
      "file": "pass_fail_error_test.rego",
      "row": 21,
      "col": 1
    },
    "package": "data.example",
    "name": "test_error",
    "fail": true,
    "duration": 45083
  },
  {
    "location": {
      "file": "pass_fail_error_test.rego",
      "row": 24,
      "col": 1
    },
    "package": "data.example",
    "name": "todo_test_missing_implementation",
    "skip": true,
    "duration": 0
  }
]
```

## Data and Function Mocking

> OPA’s `with` keyword can be used to *replace the data document* or *called functions with mocks*.
> Both *base* and *virtual* documents can be *replaced*.

> When replacing functions, built-in or otherwise, the following *constraints* are in place

1. Replacing `internal.*` functions, or `rego.metadata.*`, or `eq`; or relations (`walk`) is *not allowed*.
2. Replacement and *replaced function* need to have the *same arity*.
3. Replaced functions can call the functions they’re replacing, and those calls will call out to the original function, and *not cause recursion*.

> Below is a simple policy that depends on the *data* document

```shell authz.rego
package authz
import future.keywords

allow {
    some x in data.policies
    x.name == "test_policy"
    matches_role(input.role)
}

matches_role(my_role) if input.user in data.roles[my_role]
```

```shell authz_test.rego
package authz
import future.keywords

policies := [{"name": "test_policy"}]
roles := {"admin": ["alice"]}

test_allow_with_data if {
    allow with input as {"user": "alice", "role": "admin"}
          with data.policies as policies # [{"name": "test_policy"}]
          with data.roles as roles       # {"admin": ["alice"]}
}
```

```
$ opa test -v authz.rego authz_test.rego
authz_test.rego:
data.authz.test_allow_with_data: PASS (259.416µs)
--------------------------------------------------------------------------------
PASS: 1/1
```

> Below is an example to *replace* a **rule without arguments**.

```shell authz.rego
package authz
import future.keywords

allow1 if allow2

allow2 if 2 == 1
```

```shell authz_test.rego
package authz
import future.keywords

test_replace_rule if {
    allow1 with allow2 as true
}
```

```
$ opa test -v authz.rego authz_test.rego
authz_test.rego:
data.authz.test_replace_rule: PASS (176.75µs)
--------------------------------------------------------------------------------
PASS: 1/1
```

> Here is an example to *replace* a rule’s **built-in function** with a *user-defined function*.

```shell authz.rego
package authz
import future.keywords

import data.jwks.cert

allow if {
    [true, _, _] = io.jwt.decode_verify(input.headers["x-token"], {"cert": cert, "iss": "corp.issuer.com"})
}
```

```shell authz_test.rego
package authz
import future.keywords

mock_decode_verify("my-jwt", _) := [true, {}, {}]
mock_decode_verify(x, _)        := [false, {}, {}] if x != "my-jwt"

test_allow if {
    allow
      with input.headers["x-token"] as "my-jwt"
      with data.jwks.cert as "mock-cert"
      with io.jwt.decode_verify as mock_decode_verify
}
```

```
$ opa test -v authz.rego authz_test.rego
authz_test.rego:
data.authz.test_allow: PASS (236.042µs)
--------------------------------------------------------------------------------
PASS: 1/1
```

> In simple cases, a *function* can also be replaced with a *value*, as in
> Every *invocation* of the *function* will then return the *replacement value*, regardless of the function’s arguments.

```shell authz_test.rego
package authz
import future.keywords

mock_decode_verify("my-jwt", _) := [true, {}, {}]
mock_decode_verify(x, _)        := [false, {}, {}] if x != "my-jwt"

test_allow if {
    allow
      with input.headers["x-token"] as "my-jwt"
      with data.jwks.cert as "mock-cert"
      with io.jwt.decode_verify as mock_decode_verify
}

test_allow_value if {
    allow
      with input.headers["x-token"] as "my-jwt"
      with data.jwks.cert as "mock-cert"
      with io.jwt.decode_verify as [true, {}, {}]
}
```

```
$ opa test -v authz.rego authz_test.rego
authz_test.rego:
data.authz.test_allow: PASS (213.291µs)
data.authz.test_allow_value: PASS (95.125µs)
--------------------------------------------------------------------------------
PASS: 2/2
```

> Note that it’s also possible to replace one built-in function by another; or a *non-built-in function* by a *built-in* function.

```shell authz.rego
package authz
import future.keywords

replace_rule if {
    replace(input.label)
}

replace(label) if {
    label == "test_label"
}
```

```shell authz_test.rego
package authz
import future.keywords

test_replace_rule if {
    replace_rule 
        with input.label as "does-not-matter"
        with replace as true
}
```

```
$ opa test -v authz.rego authz_test.rego
authz_test.rego:
data.authz.test_replace_rule: PASS (173.25µs)
--------------------------------------------------------------------------------
PASS: 1/1
```

## Coverage

> In addition to reporting *pass*, *fail*, and *error* results for tests, `opa test` can also report *coverage* for the policies under test.

> The coverage report includes all of the *lines* evaluated and not evaluated in the Rego files provided on the command line.
> When a line is *not covered* it indicates one of two things

1. If the line refers to the *head* of a rule, the *body* of the rule was *never true*.
2. If the line refers to an *expression* in a rule, the expression was *never evaluated*.

> It is also possible that *rule indexing* has determined *some path unnecessary for evaluation*, thereby *affecting* the lines reported as covered.

> If we run the coverage report on the original **example.rego** file without `test_get_user_allowed` from **example_test**.rego.

```json
$ opa test --coverage --format=json example.rego example_test.rego
{
  "files": {
    "example.rego": {
      "covered": [
        {
          "start": {
            "row": 4
          },
          "end": {
            "row": 6
          }
        },
        {
          "start": {
            "row": 10
          },
          "end": {
            "row": 10
          }
        }
      ],
      "not_covered": [
        {
          "start": {
            "row": 9
          },
          "end": {
            "row": 9
          }
        },
        {
          "start": {
            "row": 11
          },
          "end": {
            "row": 11
          }
        }
      ],
      "covered_lines": 4,
      "not_covered_lines": 2,
      "coverage": 66.65
    },
    "example_test.rego": {
      "covered": [
        {
          "start": {
            "row": 4
          },
          "end": {
            "row": 5
          }
        },
        {
          "start": {
            "row": 8
          },
          "end": {
            "row": 9
          }
        },
        {
          "start": {
            "row": 16
          },
          "end": {
            "row": 17
          }
        }
      ],
      "covered_lines": 6,
      "coverage": 100
    }
  },
  "covered_lines": 10,
  "not_covered_lines": 2,
  "coverage": 83.35
}
```

> add `test_get_user_allowed`

```json
$ opa test --coverage --format=json example.rego example_test.rego
{
  "files": {
    "example.rego": {
      "covered": [
        {
          "start": {
            "row": 4
          },
          "end": {
            "row": 6
          }
        },
        {
          "start": {
            "row": 9
          },
          "end": {
            "row": 11
          }
        }
      ],
      "covered_lines": 6,
      "coverage": 100
    },
    "example_test.rego": {
      "covered": [
        {
          "start": {
            "row": 4
          },
          "end": {
            "row": 5
          }
        },
        {
          "start": {
            "row": 8
          },
          "end": {
            "row": 9
          }
        },
        {
          "start": {
            "row": 12
          },
          "end": {
            "row": 13
          }
        },
        {
          "start": {
            "row": 16
          },
          "end": {
            "row": 17
          }
        }
      ],
      "covered_lines": 8,
      "coverage": 100
    }
  },
  "covered_lines": 14,
  "not_covered_lines": 0,
  "coverage": 100
}
```

# Integrating OPA

> OPA exposes *domain-agnostic* APIs that your service can call to *manage* and *enforce* policies.

> When integrating with OPA there are two interfaces to consider

1. **Evaluation**
   - OPA’s interface for *asking for policy decisions*.
   - Integrating OPA is primarily focused on integrating an application, service, or tool with OPA’s *policy evaluation interface*.
   - This integration results in *policy decisions* being *decoupled* from that application, service, or tool.
2. **Management**
   - OPA’s interface for *deploying policies*, *understanding status*, *uploading logs*, and so on.
   - This integration is typically the *same across all OPA instances*, regardless what software the evaluation interface is integrated with.
   - *Distributing policy*, *retrieving status*, and *storing logs* in the same way across all OPAs provides a *unified management plane* for policy across many different software systems.

> This page focuses predominantly on different ways to integrate with OPA’s *policy evaluation interface* and how they compare

| Management Interface    | Desc                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Bundle API              | distributing policy and data to OPA                          |
| Status API              | collecting status reports on bundle activation and agent health |
| Decision Log API        | collecting a log of policy decisions made by agents          |
| Health API              | checking agent deployment readiness and health               |
| Prometheus API endpoint | obtain insight into performance and errors                   |

## Evaluating Policies

> OPA supports different ways to *evaluate policies*.

1. The *REST API* returns decisions as *JSON* over *HTTP*.
2. The *Go API* (GoDoc) returns decisions as *simple Go types* (bool, string, map[string]interface{}, etc.)
3. WebAssembly *compiles Rego policies into Wasm instructions* so they can be embedded and evaluated by any *WebAssembly runtime*.
4. Custom *compilers* and *evaluators* may be written to *parse evaluation plans* in the *low-level Intermediate Representation format*, which can be emitted by the `opa build` command
5. The *SDK* provides *high-level APIs* for obtaining the *output* of *query evaluation* as *simple Go types* (bool, string, map[string]interface{}, etc.)

### Integrating with the REST API

1. To integrate with OPA *outside of Go*, we recommend you deploy OPA as a *host-level daemon* or *sidecar container*.
2. When your application or service needs to make *policy decisions* it can query OPA locally via *HTTP*.
3. Running OPA *locally* on the *same host* as your application or service helps ensure *policy decisions* are *fast* and *highly-available*.

#### Named Policy Decisions

> Use the *Data API* to query OPA for *named policy decisions*

```
POST /v1/data/<path>
Content-Type: application/json
```

```json
{
    "input": <the input document>
}
```

> The `<path>` in the HTTP request identifies the policy decision to ask for. In OPA, *every rule generates a policy decision*.

> In the example below there are two decisions: `example/authz/allow` and `example/authz/is_admin`.

```shell authz.rego
package example.authz

import future.keywords.if
import future.keywords.in

default allow := false

allow if {
    input.method == "GET"
    input.path == ["salary", input.subject.user]
}

allow if is_admin

is_admin if "admin" in input.subject.groups
```

> You can request specific decisions by querying for `<package path>/<rule name>`. For example to request the `allow` decision execute the following HTTP request

```
POST /v1/data/example/authz/allow
Content-Type: application/json
```

```json
{
    "input": <the input document>
}
```

> The body of the request specifies the value of the `input` document to use during *policy evaluation*.

```
$ curl -v --location '127.1:8181/v1/data/example/authz/allow' \
--header 'Content-Type: application/json' \
--data '{
    "input": {
        "method": "GET",
        "path": [
            "salary",
            "bob"
        ],
        "subject": {
            "user": "bob"
        }
    }
}'
*   Trying 127.0.0.1:8181...
* Connected to 127.0.0.1 (127.0.0.1) port 8181 (#0)
> POST /v1/data/example/authz/allow HTTP/1.1
> Host: 127.0.0.1:8181
> User-Agent: curl/7.88.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 175
>
< HTTP/1.1 200 OK
< Content-Type: application/json
< Vary: Accept-Encoding
< Date: Mon, 16 Oct 2022 10:19:27 GMT
< Content-Length: 16
<
{"result":true}
* Connection #0 to host 127.0.0.1 left intact
```

> OPA returns an HTTP `200` response code if the policy was *evaluated successfully*.
> *Non-HTTP 200* response codes indicate *configuration or runtime errors*.
> The policy decision is contained in the `"result"` key of the response message body.

```
$ curl -v --location '127.1:8181/v1/data/example/authz/allow' \
--header 'Content-Type: application/json' \
--data '{
    "input": {
        "subject": {
            "user": "bob",
            "groups": [
                "sales",
                "marketing"
            ]
        }
    }
}'
*   Trying 127.0.0.1:8181...
* Connected to 127.0.0.1 (127.0.0.1) port 8181 (#0)
> POST /v1/data/example/authz/allow HTTP/1.1
> Host: 127.0.0.1:8181
> User-Agent: curl/7.88.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 173
>
< HTTP/1.1 200 OK
< Content-Type: application/json
< Vary: Accept-Encoding
< Date: Mon, 16 Oct 2022 10:23:20 GMT
< Content-Length: 17
<
{"result":false}
* Connection #0 to host 127.0.0.1 left intact
```

> If the requested policy decision is *undefined* OPA returns an HTTP *200* response without the `"result"` key.
> For example, the following request for `is_admin` is *undefined* because there is *no default value* for `is_admin` and the input does not satisfy the `is_admin` rule body:

```
$ curl -v --location '127.1:8181/v1/data/example/authz/is_admin' \
--header 'Content-Type: application/json' \
--data '{
    "input": {
        "subject": {
            "user": "bob",
            "groups": [
                "sales",
                "marketing"
            ]
        }
    }
}'
*   Trying 127.0.0.1:8181...
* Connected to 127.0.0.1 (127.0.0.1) port 8181 (#0)
> POST /v1/data/example/authz/is_admin HTTP/1.1
> Host: 127.0.0.1:8181
> User-Agent: curl/7.88.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 173
>
< HTTP/1.1 200 OK
< Content-Type: application/json
< Vary: Accept-Encoding
< Date: Mon, 16 Oct 2022 10:25:38 GMT
< Content-Length: 3
<
{}
* Connection #0 to host 127.0.0.1 left intact
```

### Integrating with the Go SDK

> The SDK package contains *high-level APIs* for *embedding OPA* inside of *Go programs* and obtaining the *output* of *query evaluation*.

> A typical workflow when using the `sdk` package would involve first creating a new `sdk.OPA` object by calling `sdk.New` and then invoking its `Decision` method to fetch the policy decision. The `sdk.New` call takes the `sdk.Options` object as an input which allows specifying the OPA configuration, console logger, plugins, etc.

```go
package main

import (
	"bytes"
	"context"
	"fmt"
	"github.com/open-policy-agent/opa/sdk"
	sdktest "github.com/open-policy-agent/opa/sdk/test"
)

func main() {
	ctx := context.Background()

	// create a mock HTTP bundle server
	server, err := sdktest.NewServer(sdktest.MockBundle("/bundles/bundle.tar.gz", map[string]string{
		"example.rego": `
				package authz

				import future.keywords.if

				default allow := false

				allow if input.open == "sesame"
			`,
	}))
	if err != nil {
		// handle error.
	}

	defer server.Stop()

	// provide the OPA configuration which specifies
	// fetching policy bundles from the mock server
	// and logging decisions locally to the console
	config := []byte(fmt.Sprintf(`{
		"services": {
			"test": {
				"url": %q
			}
		},
		"bundles": {
			"test": {
				"resource": "/bundles/bundle.tar.gz"
			}
		},
		"decision_logs": {
			"console": true
		}
	}`, server.URL()))

	// create an instance of the OPA object
	opa, err := sdk.New(ctx, sdk.Options{
		ID:     "opa-test-1",
		Config: bytes.NewReader(config),
	})
	if err != nil {
		// handle error.
	}

	defer opa.Stop(ctx)

	// get the named policy decision for the specified input
	if result, err := opa.Decision(ctx, sdk.DecisionOptions{Path: "/authz/allow", Input: map[string]interface{}{"open": "sesame"}}); err != nil {
		// handle error.
	} else if decision, ok := result.Result.(bool); !ok || !decision {
		// handle error.
	}
}
```

> If you executed this code, the output (i.e. *Decision Log event*) would be logged to the console by default.

```json
{
  "bundles": {
    "test": {}
  },
  "decision_id": "160d789a-6da6-490c-9da0-58d3b8c92122",
  "input": {
    "open": "sesame"
  },
  "labels": {
    "id": "opa-test-1",
    "version": "0.57.0"
  },
  "level": "info",
  "metrics": {
    "timer_rego_query_compile_ns": 25208,
    "timer_rego_query_eval_ns": 93292,
    "timer_rego_query_parse_ns": 20792,
    "timer_sdk_decision_eval_ns": 237500
  },
  "msg": "Decision Log",
  "path": "/authz/allow",
  "result": true,
  "time": "2022-10-16T18:41:25+08:00",
  "timestamp": "2022-10-16T10:41:25.964008Z",
  "type": "openpolicyagent.org/decision_logs"
}
```

### Integrating with the Go API

> Use the *low-level* [github.com/open-policy-agent/opa/rego](https://pkg.go.dev/github.com/open-policy-agent/opa/rego) package to *embed OPA* as a *library* inside services written in Go, when only policy **evaluation**
> and no other capabilities of OPA, like the management features — are desired.

> If you’re unsure which one to use, the *SDK* is probably the *better* option.

```go
import "github.com/open-policy-agent/opa/rego"
```

> The `rego` package exposes different options for *customizing how policies are evaluated*.
> Through the `rego` package you can supply *policies* and *data*, enable *metrics* and *tracing*, toggle *optimizations*, etc. In most cases you will

1. Use the `rego` package to construct a *prepared query*.
2. Execute the prepared query to produce *policy decisions*.
3. *Interpret* and *enforce* the policy decisions.

> Preparing queries in advance avoids *parsing* and *compiling* the policies on each query and *improves performance* considerably.
> Prepared queries are safe to *share across multiple Go routines*.

## Comparison

> A comparison of the different integration choices are summarized below.

| Dimension  | `REST API` - sidecar | Go Lib                     | Wasm                       |
| ---------- | -------------------- | -------------------------- | -------------------------- |
| Evaluation | Fast                 | Faster                     | Fastest                    |
| Language   | Any                  | Only Go                    | Any with Wasm              |
| Operations | Update just OPA      | Update entire service      | Update service rarely      |
| Security   | *Must secure API*    | Enable only what is needed | Enable only what is needed |

> REST API

1. Integrating OPA via the REST API is the *most common*, at the time of writing.
2. OPA is most often deployed either as a *sidecar* or less commonly as an external service.
3. Operationally this makes it *easy to upgrade OPA* and to configure it to use its *management services* (bundles, status, decision logs, etc.).
4. Because it is a separate process it requires *monitoring* and *logging* (though this happens automatically for any sidecar-aware environment like Kubernetes).
5. OPA’s configuration and APIs must be *secured* according to the security guide.

> Go API

1. Integrating OPA via the Go API only works for Go software.
2. Updates to OPA require *re-vendoring* and *re-deploying* the software.
3. Evaluation has *less overhead* than the REST API because all the communication happens in the *same operating-system process*.
4. All of the *management functionality* (bundles, decision logs, etc.) must be either *enabled* or *implemented*.
5. *Security concerns* are limited to those *management features* that are enabled or implemented.

> Wasm

1. Wasm policies are *embeddable* in any programming language that has a *Wasm runtime*.
2. Evaluation has *less overhead* than the REST API (because it is evaluated in the *same operating-system process*)
   - and should *outperform* the Go API (because the policies have been compiled to a *lower-level instruction* set).
3. *Each programming language* will need its own SDKs that implement the *management functionality* and the *evaluation interface*.
4. Typically new OPA language features will not require updating the service since neither the Wasm runtime nor the SDKs will be impacted.
   - Updating the *SDKs* will require *re-deploying* the service.
5. Security is analogous to the Go API integration: it is mainly the *management functionality* that presents *security risks*.
