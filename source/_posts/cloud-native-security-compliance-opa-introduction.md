---
title: Cloud Native - Security & Compliance - OPA - Introduction
mathjax: false
date: 2022-03-31 00:06:25
categories:
  - Cloud Native
  - Security & Compliance
tags:
  - Cloud Native
  - Security
  - Compliance
  - OPA
---

# Overview

1. The Open Policy Agent is an **general-purpose policy engine** that **unifies policy enforcement across the stack**.
2. OPA provides a **high-level declarative language**
   - that lets you **specify policy as code and simple APIs** to **offload policy decision-making** from your software.
3. OPA **decouples** policy **decision-making** from policy **enforcement**.
4. When your software needs to make policy decisions it **queries** OPA and supplies structured data (e.g., JSON) as input.
   - OPA accepts **arbitrary structured data** as **input**.
5. OPA generates policy decisions by evaluating the **query input** against **policies** and **data**.
6. OPA and Rego are **domain-agnostic** so you can describe almost any kind of invariant in your policies.
7. Policy decisions are not limited to simple yes/no or allow/deny answers.
   - Like query inputs, your policies can generate **arbitrary structured data** as **output**.

<!-- more -->

![opa-service](https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/opa-service.svg)

# System

![](https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/system.svg)

The script receives a **JSON** representation of the system as **input**

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

# Rego

> Rego is **purpose-built** for **expressing policies** over **complex hierarchical data structures**.

## Reference

When OPA evaluates policies it binds data **provided in the query** to a global variable called **input**.

```json
❯ opa eval -f pretty -i input.json 'input.ports'                              
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

```json
❯ opa eval -f pretty -i input.json 'input.servers[0].protocols[1]'
"ssh"
```

You can use the same square bracket syntax if keys contain **other than** `[a-zA-Z0-9_]`. E.g., `input["real~name"]`.

```json input-name.json
{
  "real~name": "zhongmingmao"
}
```

```
❯ opa eval -f pretty -i input-name.json 'input.real~name'
1 error occurred: 1:11: rego_parse_error: illegal token
        input.real~name
                  ^

❯ opa eval -f pretty -i input-name.json 'input["real~name"]'
"zhongmingmao"
```

If you refer to a value that **does not exist**, OPA returns **undefined**. Undefined means that OPA was **not able to find any results**.

```
❯ opa eval -f pretty -i input.json 'input.dead'
undefined
```

## Expression

To **produce policy decisions** in Rego you write expressions against **input** and **other data**.

```
❯ opa eval -f pretty -i input.json 'input.servers[0].id == "app"'
true
```

OPA includes **a set of built-in functions** you can use to perform **common operations**.

```
❯ opa eval -f pretty -i input.json 'count(input.servers[0].protocols) == 2'
true
```

**Multiple** expressions are joined together with the `;` (**AND**) operator.
For queries to **produce** results, **all** of the expressions in the query must be **true** or **defined**. The **order** of expressions **does not matter**.

```
❯ opa eval -f pretty -i input.json 'input.servers[0].id == "app"; input.servers[0].protocols[1] == "ssh"'
true
```

```json
❯ opa eval -f json -i input.json 'input.servers[0].id == "app"; input.servers[0].protocols[1] == "ssh"'
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "input.servers[0].id == \"app\"",
          "location": {
            "row": 1,
            "col": 1
          }
        },
        {
          "value": true,
          "text": "input.servers[0].protocols[1] == \"ssh\"",
          "location": {
            "row": 1,
            "col": 31
          }
        }
      ]
    }
  ]
}
```

You can **omit** the `;` (**AND**) operator by splitting expressions across **multiple lines**. 

```
❯ opa eval -f pretty -i input.json '
input.servers[0].id == "app"
input.servers[0].protocols[0] == "https"
'
true
```

If **any** of the expressions in the query are **not true** (or **not defined**) the result is **undefined** (**not false**).

```
❯ opa eval -f pretty -i input.json '
input.servers[0].id == "app"
input.servers[0].protocols[0] == "telnet"
'
undefined
```

## Variable

You can **store values** in **intermediate variables** using the `:=` (**assignment**) operator.

```
❯ opa eval -f pretty -i input.json '
s := input.servers[0]
s.id == "app"
p := s.protocols[0]
p == "https"
'
+---------+-------------------------------------------------------------------+
|    p    |                                 s                                 |
+---------+-------------------------------------------------------------------+
| "https" | {"id":"app","ports":["p1","p2","p3"],"protocols":["https","ssh"]} |
+---------+-------------------------------------------------------------------+
```

```json
❯ opa eval -f bindings -i input.json '
s := input.servers[0]
s.id == "app"
p := s.protocols[0]
p == "https"
'
{
  "p": "https",
  "s": {
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
  }
}
```

```json
❯ opa eval -f values -i input.json '
s := input.servers[0]
s.id == "app"
p := s.protocols[0]
p == "https"
'
[
  true,
  true,
  true,
  true
]
```

When OPA evaluates expressions, it **finds values for the variables** that make **all** of the expressions **true**.
If there are **no variable assignments** that make **all** of the expressions **true**, the result is **undefined**.

```
❯ opa eval -f pretty -i input.json '
s := input.servers[0]
s.id == "app"
s.protocols[1] == "telent"
'
undefined
```

```json
❯ opa eval -f json -i input.json '
s := input.servers[0]
s.id == "app"
s.protocols[1] == "telent"
'
{}
```

Variables are **immutable**.

```
❯ opa eval -f bindings -i input.json '
s := input.servers[0]
s := input.servers[0]
'
1 error occurred: 3:1: rego_compile_error: var s assigned above
```

OPA must be able to **enumerate the values for all variables** in all expressions.

```
❯ opa eval -f bindings -i input.json '
x := 1
x != y
'
2 errors occurred:
3:1: rego_unsafe_var_error: var y is unsafe
3:1: rego_unsafe_var_error: var _ is unsafe
```

## Iteration

Iteration in Rego happens **implicitly** when you **inject variables into expressions**.

### Implicitly

Substitute the **array index** with a **variable**. Now the query asks for **values of `i`** that make the **overall** expression **true**.

```json
❯ opa eval -f json -i input.json '
some i
input.networks[i].public = true
'
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "input.networks[i].public = true",
          "location": {
            "row": 3,
            "col": 1
          }
        }
      ],
      "bindings": {
        "i": 2
      }
    },
    {
      "expressions": [
        {
          "value": true,
          "text": "input.networks[i].public = true",
          "location": {
            "row": 3,
            "col": 1
          }
        }
      ],
      "bindings": {
        "i": 3
      }
    }
  ]
}
```

```json
❯ opa eval -f bindings -i input.json '
some i
input.networks[i].public = true
'
{
  "i": 2
}
{
  "i": 3
}
```

```json
❯ opa eval -f values -i input.json '
some i
input.networks[i].public = true
'
[
  true
]
[
  true
]
```

```
❯ opa eval -f pretty -i input.json '
some i
input.networks[i].public = true
'
+---+
| i |
+---+
| 2 |
| 3 |
+---+
```

You can substitute as **many** variables as you want.

```
❯ opa eval -f pretty -i input.json '
some i, j
input.servers[i].protocols[j] == "http"
'
+---+---+
| i | j |
+---+---+
| 3 | 0 |
+---+---+
```

If variables appear **multiple times** the assignments satisfy **all** of the expressions.

```
❯ opa eval -f pretty -i input.json '
some i, j
port_id := input.ports[i].id
input.ports[i].network == input.networks[j].id
input.networks[j].public == true
'
+---+---+---------+
| i | j | port_id |
+---+---+---------+
| 1 | 2 | "p2"    |
+---+---+---------+
```

If you only **refer to the variable once**, you can replace it with the special `_` (**wildcard** variable) operator. **no bindings !**
Conceptually, **each instance** of `_` is a **unique variable**.

```
❯ opa eval -f pretty -i input.json '  
input.servers[_].protocols[_] == "http"
'
true
```

```json
❯ opa eval -f json -i input.json '  
input.servers[_].protocols[_] == "http"
'
{
  "result": [
    {
      "expressions": [
        {
          "value": true,
          "text": "input.servers[_].protocols[_] == \"http\"",
          "location": {
            "row": 2,
            "col": 1
          }
        }
      ]
    }
  ]
}
```

```json
❯ opa eval -f bindings -i input.json '
input.servers[_].protocols[_] == "http"
'
{}
```

If OPA is **unable** to find **any variable assignments** that **satisfy all of the expressions**, the result is **undefined**.

```
❯ opa eval -f pretty -i input.json '
some i
input.servers[i].protocols[i] == "ssh"
'
undefined
```

```
❯ opa eval -f json -i input.json '  
some i
input.servers[i].protocols[i] == "ssh"
'
{}
```

### Explicitly

#### some

`some ... in ...` is used to iterate over the **collection**, and will bind its **variables** to the **collection items**.

```go public_network.rego
package example

import future.keywords.in

public_network[net.id] {
    some net in input.networks
    net.public
}
```

```json
❯ opa eval -f json -i input.json -d public_network.rego 'data.example.public_network'
{
  "result": [
    {
      "expressions": [
        {
          "value": [
            "net3",
            "net4"
          ],
          "text": "data.example.public_network",
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

#### every

Importing `every` means also importing `in` without an extra `import` statement.
`every` allows us to succinctly express that **a condition holds** for **all elements** of a domain.

```json exposed.json
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

```go every.rego
package example

import future.keywords.every

no_telnet_exposed_every {
    every server in input.servers {
        every protocol in server.protocols {
            "telnet" != protocol
        }
    }
}

no_telnet_exposed_every_not_in {
    every server in input.servers {
        not "telnet" in server.protocols
    }
}

no_telnet_exposed_not_some_in {
    not any_telnet_exposed
}

any_telnet_exposed {
    some server in input.servers
    "telnet" in server.protocols
}
```

```json
❯ opa eval -f pretty -i exposed.json -d every.rego 'data.example'
{
  "no_telnet_exposed_every": true,
  "no_telnet_exposed_every_not_in": true,
  "no_telnet_exposed_not_some_in": true
}

❯ opa eval -f json -i exposed.json -d every.rego 'data.example.any_telnet_exposed'
{}
```

## Rule

Rego lets you **encapsulate** and **re-use** logic with rules. Rules are just **if-then logic statements**. 

### Complete

Complete rules are **if-then statements** that **assign a single value to a variable**.

```go complete.rego
package example

import future.keywords.every

any_public_networks_1 = true {
    some i
    input.networks[i].public
}

any_public_networks_2 = true {
    input.networks[_].public
}

any_public_networks_3 = true {
    net := input.networks[_]
    net.public
}

any_public_networks_4 = true {
    some net in input.networks
    net.public
}

any_public_networks_5 = true {
    not all_private_network
}

all_private_network = true {
    every net in input.networks {
        not net.public
    }
}
```

**All values generated by rules** can be queried via the global **data** variable. `data.<package-path>.<rule-name>`

```json
❯ opa eval -f pretty -i input.json -d complete.rego 'data.example'
{
  "any_public_networks_1": true,
  "any_public_networks_2": true,
  "any_public_networks_3": true,
  "any_public_networks_4": true,
  "any_public_networks_5": true
}
```

Every rule consists of a **head** and a **body**. rule **head is true** if the rule **body is true**

> head: `any_public_networks = true`; body: `input.networks[_].public`

```go
any_public_networks = true {
    input.networks[_].public
}
```

If you **omit** the `= <value>` part of the **rule head** the value defaults to **true**.

```go
any_public_networks {
    input.networks[_].public
}
```

To define **constants**, **omit** the **rule body**.

```go constant.rego
package example

pi = 3.14
```

```
❯ opa eval -f pretty -i input.json -d constant.rego 'data.example.pi > 3'
true
```

If OPA cannot find **variable assignments** that **satisfy the rule body**, we say that the **rule is undefined**.

```json private.json
{
  "networks": [
    {"id": "n1", "public": false},
    {"id": "n2", "public": false}
  ]
}
```

```go undefined.rego
package example

any_public_network {
    input.networks[_].public
}
```

```
❯ opa eval -f pretty -i private.json -d undefined.rego 'data.example.any_public_network'
undefined
```

### Partial

Partial rules are **if-then statements** that **generate a set of values** and **assign that set to a variable**.

> head: `public_network[net.id]`; body: `net := input.networks[_]; net.public`

```go partial.rego
package example

public_network[net.id] {
    net := input.networks[_]
    net.public
}
```

You can **iterate over the set of values** by referencing the set elements with a variable

```
❯ opa eval -f pretty -i input.json -d partial.rego 'data.example.public_network[x]'
+--------+--------------------------------+
|   x    | data.example.public_network[x] |
+--------+--------------------------------+
| "net3" | "net3"                         |
| "net4" | "net4"                         |
+--------+--------------------------------+
```

```json
❯ opa eval -f values -i input.json -d partial.rego 'data.example.public_network[x]'
[
  "net3"
]
[
  "net4"
]
```

```json
❯ opa eval -f bindings -i input.json -d partial.rego 'data.example.public_network[x]'
{
  "x": "net3"
}
{
  "x": "net4"
}
```

```json
❯ opa eval -f json -i input.json -d partial.rego 'data.example.public_network[x]'
{
  "result": [
    {
      "expressions": [
        {
          "value": "net3",
          "text": "data.example.public_network[x]",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ],
      "bindings": {
        "x": "net3"
      }
    },
    {
      "expressions": [
        {
          "value": "net4",
          "text": "data.example.public_network[x]",
          "location": {
            "row": 1,
            "col": 1
          }
        }
      ],
      "bindings": {
        "x": "net4"
      }
    }
  ]
}
```

**no bindings !**

```
❯ opa eval -f pretty -i input.json -d partial.rego 'data.example.public_network[_]'
+--------------------------------+
| data.example.public_network[_] |
+--------------------------------+
| "net3"                         |
| "net4"                         |
+--------------------------------+
```

```
❯ opa eval -f pretty -i input.json -d partial.rego 'data.example.public_network["net3"]'
"net3"
```

```
❯ opa eval -f pretty -i input.json -d partial.rego 'data.example.public_network["unknown_net"]'
undefined
```

### Logic OR

When you **join multiple expressions together** in a query you are expressing logical **AND**.
To express logical **OR** in Rego you **define multiple rules with the same name**.

```json or.json
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

 `default` : assign a **default value** to the variable if **all** of the other rules with the **same name** are **undefined**.

```go or.rego
package example

default shell_accessible_default = false // not undefined !

shell_accessible_or {
	input.servers[_].protocols[_] == "telnet"
}

shell_accessible_or {
	input.servers[_].protocols[_] == "ssh"
}

shell_accessible_default {
	input.servers[_].protocols[_] == "telnet_x"
}

shell_accessible_no_default {
	input.servers[_].protocols[_] == "ssh_x"
}
```

```json
❯ opa eval -f pretty -i or.json -d or.rego 'data.example'                            
{
  "shell_accessible_default": false,
  "shell_accessible_or": true
}
```

```
❯ opa eval -f pretty -i or.json -d or.rego 'data.example.shell_accessible_no_default'
undefined
```

When you use **logical OR** with **partial rules**, each rule definition **contributes** to the set of values assigned to the variable.

```json partial_or.json
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

```go partial_or.rego
package example

shell_accessible[server.id] {
    server := input.servers[_]
    server.protocols[_] == "telnet"
}

shell_accessible[server.id] {
    server := input.servers[_]
    server.protocols[_] == "ssh"
}
```

```json
❯ opa eval -f pretty -i partial_or.json -d partial_or.rego 'data.example.shell_accessible'
[
  "busybox",
  "db"
]
```

## Practice

```
1. Servers reachable from the Internet must not expose the insecure 'http' protocol.
2. Servers are not allowed to expose the 'telnet' protocol.
```

```go practice_1.rego
package practice_1

import future.keywords

default allow = false

public_servers[server] {
	some server in input.servers

	some port in server.ports
	some input_port in input.ports
	port == input_port.id

	some net in input.networks
	input_port.network == net.id
	net.public
}

violation[server.id] {
	some server in input.servers
	"telnet" in server.protocols
}

violation[server.id] {
	some server in public_servers
	"http" in server.protocols
}

allow {
	count(violation) == 0
}
```

```go practice_2.rego
package practice_2

import future.keywords

default allow = false

public_servers[server] {
	some i, j
	server := input.servers[_]
	server.ports[_] == input.ports[i].id
	input.ports[i].network == input.networks[j].id
	input.networks[j].public
}

violation[server.id] {
    server := input.servers[_]
    server.protocols[_] == "telnet"
}

violation[server.id] {
    server := public_servers[_]
    server.protocols[_] == "http"
}

allow {
	count(violation) == 0
}
```

```
❯ opa eval -f pretty -i input.json -d practice_1.rego -d practice_2.rego 'x = data.practice_1.violation; y = data.practice_2.violation'
+------------------+------------------+
|        x         |        y         |
+------------------+------------------+
| ["busybox","ci"] | ["busybox","ci"] |
+------------------+------------------+
```
