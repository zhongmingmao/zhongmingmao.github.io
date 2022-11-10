---
title: Spring Security OAuth2 - Authorization Server
mathjax: false
date: 2022-09-13 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2.png
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

# 授权服务器

> **Introspection Endpoint**：校验 Access Token 的合法性

![image-20221102010635416](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102010635416.png)

<!-- more -->

# Spring Security OAuth2 架构

![](http://terasolunaorg.github.io/guideline/5.3.0.RELEASE/en/_images/OAuth_OAuth2Architecture.png)

# Authorization flow

## Authorization Code Flow

![image-20221102000540824](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102000540824.png)

### Maven

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.security.oauth</groupId>
  <artifactId>spring-security-oauth2</artifactId>
</dependency>
```

### API

```java
@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserInfo {
  String name;
  String email;
}
```

```java
@GetMapping("/api/user")
public ResponseEntity<UserInfo> getUser() {
  User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
  return ResponseEntity.ok(
    UserInfo.builder()
    .name(user.getUsername())
    .email(user.getUsername() + "@gmail.com")
    .build());
}
```

### Authorization Server

> Authorization Server + Client App
> **authorization_code**

```java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServer extends AuthorizationServerConfigurerAdapter {

  @Override
  public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
    clients
        .inMemory()
        .withClient("wechat")
        .secret("654321")
        .redirectUris("http://localhost:9000/callback")
        .authorizedGrantTypes("authorization_code") // 授权码模式
        .scopes("read_userinfo", "read_contacts");
  }
}
```

### Resource Server

```java
@Configuration
@EnableResourceServer
public class ResourceServer extends ResourceServerConfigurerAdapter {

  @Override
  public void configure(HttpSecurity http) throws Exception {
    http.authorizeRequests()
        .anyRequest()
        .authenticated()
        .and()
        .requestMatchers()
        .antMatchers("/api/**");
  }
}
```

### Resource owner

```yaml
server:
  port: 8000
security:
  user:
    name: zhongmingmao
    password: 123456
```

### Flow

> 未授权

```shell
$ curl -s --location --request GET 'http://localhost:8000/api/user' | jq
{
  "error": "unauthorized",
  "error_description": "Full authentication is required to access this resource"
}
```

> 获取授权码，**response_type=code**
> 浏览器：http://localhost:8000/oauth/authorize?client_id=wechat&redirect_uri=http://localhost:9000/callback&response_type=code&scope=read_userinfo

![image-20221103001315526](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221103001315526.png)

![image-20221103001416403](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221103001416403.png)

![image-20221103001636098](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221103001636098.png)

```shell
$ echo -n 'zhongmingmao:123456' | base64
emhvbmdtaW5nbWFvOjEyMzQ1Ng==
```

```shell
$ curl --location --request POST 'http://localhost:8000/oauth/authorize' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic emhvbmdtaW5nbWFvOjEyMzQ1Ng==' \
--data-urlencode 'user_oauth_approval=true' \
--data-urlencode 'scope.read_userinfo=true' \
--data-urlencode 'authorize=Authorize'
```

> 兑换授权码

```shell
$ echo -n 'wechat:654321' | base64
d2VjaGF0OjY1NDMyMQ==
```

```shell
$ curl -s --location --request POST 'http://localhost:8000/oauth/token' \
--header 'content-type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic d2VjaGF0OjY1NDMyMQ==' \
--data-urlencode 'code=6qhVz7' \
--data-urlencode 'grant_type=authorization_code' \
--data-urlencode 'redirect_uri=http://localhost:9000/callback' \
--data-urlencode 'scope=read_userinfo' | jq
{
  "access_token": "1aac6db3-c304-45c1-ab9d-9c7d63da842d",
  "token_type": "bearer",
  "expires_in": 43199,
  "scope": "read_userinfo"
}
```

> 访问资源

```shell
$ curl -s --location --request GET 'http://localhost:8000/api/user' \
--header 'authorization: Bearer 1aac6db3-c304-45c1-ab9d-9c7d63da842d' | jq
{
  "name": "zhongmingmao",
  "email": "zhongmingmao@gmail.com"
}
```

## Implicit Grant Flow

> 相对于授权码模式，减少了**授权码兑换**的过程，直接获得 Access Token，**非常不安全**！

![image-20221102001550406](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102001550406.png)

> 代码结构与授权码类似

### Authorization Server

> **implicit**

```java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServer extends AuthorizationServerConfigurerAdapter {

  @Override
  public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
    clients
        .inMemory()
        .withClient("wechat")
        .secret("654321")
        .redirectUris("http://localhost:9000/callback")
        .authorizedGrantTypes("implicit")
        .accessTokenValiditySeconds(1 << 8)
        .scopes("read_userinfo", "read_contacts");
  }
}
```

### Flow

> 直接获取 Access Token：**response_type=token**
> 浏览器：http://localhost:8000/oauth/authorize?client_id=wechat&redirect_uri=http://localhost:9000/callback&response_type=token&scope=read_userinfo

![image-20221103011001348](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221103011001348.png)

> 访问资源

```shell
$ curl -s --location --request GET 'http://localhost:8000/api/user' \
--header 'authorization: Bearer a5cf3dc2-d3e6-4915-aee3-155e95d9764e' | jq
{
  "name": "zhongmingmao",
  "email": "zhongmingmao@gmail.com"
}
```

## Resource Owner Password Credentials Flow

![](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102001311093.png)

### Authorization Server

> **password**

```java
@Configuration
@EnableAuthorizationServer
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthorizationServer extends AuthorizationServerConfigurerAdapter {

  // 认证
  AuthenticationManager authenticationManager;

  @Override
  public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
    endpoints.authenticationManager(authenticationManager);
  }

  @Override
  public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
    clients
        .inMemory()
        .withClient("wechat")
        .secret("654321")
        .authorizedGrantTypes("password")
        .scopes("read_userinfo", "read_contacts");
  }
}
```

### Flow

```shell
$ echo -n 'wechat:654321' | base64
d2VjaGF0OjY1NDMyMQ==
```

> 客户应用直接使用**用户账密**去授权服务器申请 Access Token

```shell
$ curl -s --location --request POST 'http://localhost:8000/oauth/token' \
--header 'accept: application/json' \
--header 'content-type: application/x-www-form-urlencoded' \
--header 'Authorization: Basic d2VjaGF0OjY1NDMyMQ==' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'username=zhongmingmao' \
--data-urlencode 'password=123456' \
--data-urlencode 'scope=read_userinfo' | jq
{
  "access_token": "e2849e93-125d-444a-862e-acc2c3a0bad9",
  "token_type": "bearer",
  "expires_in": 43145,
  "scope": "read_userinfo"
}
```

```shell
$ curl -s --location --request GET 'http://localhost:8000/api/user' \
--header 'authorization: Bearer e2849e93-125d-444a-862e-acc2c3a0bad9' | jq
{
  "name": "zhongmingmao",
  "email": "zhongmingmao@gmail.com"
}
```

## Client Credentials Flow

![](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102002252924.png)

### API

```java
@GetMapping("/api/users")
public ResponseEntity<List<UserInfo>> getUsers() {
  List<UserInfo> users = new ArrayList<>();
  users.add(UserInfo.builder().name("zhongmingmao").email("zhongmingmao@gmail.com").build());
  users.add(UserInfo.builder().name("zhongmingwu").email("zhongmingmao@outlook.com").build());
  return ResponseEntity.ok(users);
}
```

### Authorization Server

> **client_credentials**

```java
clients
  .inMemory()
  .withClient("wechat")
  .secret("654321")
  .authorizedGrantTypes("client_credentials")
  .scopes("read_userinfo", "read_contacts");
```

### Flow

```shell
$ echo -n 'wechat:654321' | base64
d2VjaGF0OjY1NDMyMQ==
```

```shell
$ curl -s --location --request POST 'http://localhost:8000/oauth/token' \
--header 'Authorization: Basic d2VjaGF0OjY1NDMyMQ==' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'scope=read_userinfo' | jq
{
  "access_token": "5954cfbc-5b1b-4699-9478-8233774c05c6",
  "token_type": "bearer",
  "expires_in": 43199,
  "scope": "read_userinfo"
}
```

```shell
$ curl -s --location --request GET 'http://localhost:8000/api/users' \
--header 'authorization: Bearer 5954cfbc-5b1b-4699-9478-8233774c05c6' | jq
[
  {
    "name": "zhongmingmao",
    "email": "zhongmingmao@gmail.com"
  },
  {
    "name": "zhongmingwu",
    "email": "zhongmingmao@outlook.com"
  }
]
```

## 技术选型

![](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221102004642403.png)

# 参考

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)