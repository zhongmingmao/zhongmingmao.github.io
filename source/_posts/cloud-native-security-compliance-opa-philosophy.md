---
title: Cloud Native - Security & Compliance - OPA - Philosophy
mathjax: false
date: 2022-04-01 00:06:25
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

1. A **policy** is **a set of rules** that **governs** the **behavior** of a software service.
2. Authorization is a special kind of policy.
   - difference
     - **Authentication**: how people or machines **prove they are** who they say they are.
     - **Authorization**: which people or machines can run which **actions** on which **resources**.
   - Authorization and more generally policy often **utilize the results of authentication** (the username, user attributes, groups, claims), but makes decisions based on **far more information** than just who the user is.
3. Today policy is often a **hard-coded** feature of the software service it actually governs.
   - OPA helps you **decouple any policy using any context from any software system**.

<!-- more -->

# Policy Decoupling

1. Software services should allow policies to be **specified declaratively**, updated at **any time** without **recompiling** or **redeploying**, and **enforced automatically**.

# What is OPA

1. OPA is a **lightweight general-purpose policy engine** that can be co-located with your service.
   - You can integrate OPA as a **sidecar**, **host-level daemon**, or **library**.
2. Services **offload policy decisions** to OPA by executing *queries*.
   - OPA **evaluates** policies and data to produce query results (which are sent back to the client).
   - Policies are written in a **high-level declarative language** and can be **loaded dynamically** into OPA remotely via **APIs** or through the **local filesystem**.

# Why use OPA

1. OPA is a **full-featured policy engine** that **offloads policy decisions** from your software.
2. OPA provides the **building blocks** for enabling better **control** and **visibility** over policy in your systems.
3. Without OPA, you need to **implement policy management** for your software **from scratch**.
   - Required components: **policy language** (syntax *and* semantics), **evaluation engine**

# Document Model

## Summary

> The different models for **loading base documents** into OPA, how they can be **referenced** inside of **policies**, and the actual **mechanism(s) for loading**.

| Model          | How to access in Rego                         | How to integrate with OPA                                    |
| -------------- | --------------------------------------------- | ------------------------------------------------------------ |
| **Async Push** | The `data` global variable                    | Invoke OPA’s **API(s)**, e.g., `PUT /v1/data`                |
| **Async Pull** | The `data` global variable                    | Configure OPA’s **Bundle** feature                           |
| **Sync Push**  | The `input` global variable                   | Provide data in **policy query**, <br />e.g., inside the body of `POST /v1/data` |
| **Sync Pull**  | The **built-in** functions, e.g., `http.send` | N/A                                                          |

## Structured Data

1. OPA policies (written in **Rego**) make decisions based on **hierarchical structured data**.
   - Importantly, OPA policies can **make decisions** based on **arbitrary structured data**.
2. OPA itself is **not tied** to any **particular domain model**.
   - OPA uses its **own internal representation** for structures like maps and lists
3. Similarly, OPA policies can **represent decisions** as **arbitrary structured data**.

## data

1. **Base** documents can be **pushed** or **pulled** into OPA **asynchronously** by **replicating** data into OPA.
   - This can happen **periodically** or when some **event** (like a database change notification) occurs.
   - **Base** documents loaded **asynchronously** are always accessed under the **`data`** global variable.
2. We refer to all data loaded into OPA from the **outside** world as **base** documents.
   - These base documents almost always **contribute** to your policy **decision-making** logic.
3. In OPA, we refer to the values **generated** by rules (a.k.a., decisions) as **virtual** documents.
   - The term “**virtual**” in this case just means the document is **computed** by the policy.
4. Rego lets you **refer** to *both* **base** and **virtual** documents through a global variable called `data`.
   - Similarly, OPA lets you **query** for *both* **base** and **virtual** documents via the `/v1/data` HTTP API.
5. Controlled
   - Since **base** documents come from **outside** of OPA, their location under `data` is controlled by the software doing the **loading**.
   - On the other hand, the location of **virtual** documents under `data` is controlled by policies themselves using the **`package`** directive in the language.

## input

1. **Base** documents can also be **pushed** or **pulled** into OPA **synchronously** when your software **queries** OPA
2. We say refer to base documents **pushed synchronously** as “**input**”.
   - Policies can access these inputs under the **`input`** global variable.
3. Data **loaded synchronously** is **kept outside of** `data` to **avoid naming conflicts**.

## Cache

1. **Data loaded async** into OPA is cached in-memory so that it can be read efficiently during policy evaluation.
2. Similarly, **policies** are also cached in-memory to ensure **high-performance** and and **high-availability**.
3. **Data pulled synchronously** can also be cached in-memory.

## Example

![data-model](https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/data-model.svg)
