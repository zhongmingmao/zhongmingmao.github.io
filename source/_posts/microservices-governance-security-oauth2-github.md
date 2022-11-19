---
title: Oauth2 - Github
mathjax: false
date: 2022-09-20 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/oauth2-01.svg
categories:
  - Microservices Governance
  - Security
  - Oauth2
tags:
  - Microservices Governance
  - Microservices
  - Security
  - Oauth2
  - Architecture
  - Cloud Native
  - Spring
  - Spring Security
  - Spring Security OAuth2
---

# Module

| 模块                          | 描述                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| spring-security-oauth2-core   | **OAuth2** 授权框架 + **OIDC** 核心数据结构及接口            |
| spring-security-oauth2-jose   | 支持 **JOSE** 协议组<br />**JWT**: JSON Web **Token**<br />**JWS**: JSON Web **Signature**<br />**JWE**: JSON Web **Encryption**<br />**JWK**: JSON Web **Key** |
| spring-security-oauth2-client | 支持 **OAuth2** 和 **OIDC** 的客户端                         |

<!-- more -->

# Register application

> callback: **/login/oauth2/code/github**

![image-20221119205050210](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119205050210.png)

# Config

> callback template: {baseUrl}/login/oauth2/code/**{registrationId}**

```yaml
server:
  port: 9000
spring:
  security:
    oauth2:
      client:
        registration:
          github: # registrationId
            clientId: 0722018ad9600fd8561a
            clientSecret: *****9729110a
```

# Controller

```java
@RestController
public class HelloController {

  @GetMapping("/hello")
  public String hello(Principal principal) {
    // Principal 由 Spring Security 自动注入，代表当前登录用户
    return "hello " + principal.getName();
  }
}
```

# Flow

![image-20221119211443062](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119211443062.png)

![image-20221119211510307](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119211510307.png)

![image-20221119213727103](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119213727103.png)

![image-20221119213746837](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119213746837.png)

# Traffic

> 重定向到本站点的 **oauth2/authorization/github**

![image-20221119211742768](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119211742768.png)

> 构造授权 URL，重定向到授权服务器（Github）

![image-20221119211942673](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119211942673.png)

![image-20221119212407283](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119212407283.png)

> 用户授权后回调

![image-20221119212522656](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119212522656.png)

![image-20221119212600445](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221119212600445.png)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)