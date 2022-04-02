---
title: Cloud Native - Security & Compliance - OPA - Glance
mathjax: false
date: 2022-03-30 00:06:25
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

1. **Policy-based control** for **cloud native** environments
   - **Flexible**, **fine-grained control** for administrators **across the stack**
   - Use OPA for a **unified toolset and framework** for policy **across the cloud native stack**.
2. **Decouple policy from the service's code**, so you can **release**, **analyze**, and **review** policies **without sacrificing availability or performance**.

# Declarative Policy

1. **Declarative**
   - Express policy in a **high-level**, **declarative language** that promotes **safe**, **performant**, **fine-grained controls**.
   - **DSL** : Use **a language purpose-built for policy** in a world where **JSON** is pervasive.
2. **Context-aware**
   - Leverage **external information** to write the policies you really care about.
   - **Stop inventing roles that represent complex relationships** that years down the road **no one will understand**.
     - Instead, **write logic that adapts to the world around it and attach that logic to the systems that need it**.

<!-- more -->

# Architectural Flexibility

## Daemon

1. Deploy OPA as a **separate process** on the **same host** as your service.
2. Integrate OPA by changing your service’s code, **importing an OPA-enabled library**, or **using a network proxy integrated with OPA**.

![image-20220401110945023](https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220401110945023.png)

## Library

1. **Embed OPA policies** into your service.
2. Schemes
   - Integrate OPA as a **Go library** that **evaluates policy**
   - Integrate a **WebAssembly runtime** and use **OPA** to **compile policy to WebAssembly instructions**.

![image-20220401111100731](https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/image-20220401111100731.png)
