---
title: Oauth2 - JWT
mathjax: false
date: 2022-09-17 00:06:25
cover: https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/oauth2-jwt.png
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

# Token Type

![image-20221114220349916](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221114220349916.png)

<!-- more -->

# JWT

> 资源服务器**自解释**和**自校验**，无需再跟授权服务器交互

## 结构

> 验签

![image-20221114221311391](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221114221311391.png)

## issue + audience

> **issue：令牌签发人**
> **audience：目标接收人**

![image-20221114221846849](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221114221846849.png)

# Code

## Authorization Server

### Maven

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.security.oauth</groupId>
    <artifactId>spring-security-oauth2</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-jwt</artifactId>
  </dependency>
</dependencies>
```

### application.yml

```yaml
server:
  port: 8000
security:
  user:
    name: zhongmingmao
    password: 123456
```

### Config

```java
@Configuration
@EnableAuthorizationServer
public class OAuth2Config extends AuthorizationServerConfigurerAdapter {

  // 采用 Resource Owner Password Credentials Flow 时，需要注入 AuthenticationManager
  @Autowired private AuthenticationManager authenticationManager;

  @Bean
  public JwtAccessTokenConverter accessTokenConverter() {
    JwtAccessTokenConverter converter = new JwtAccessTokenConverter();
    // 对称加密密钥：签名+验签
    converter.setSigningKey("macos-secret");
    return converter;
  }

  @Bean
  public JwtTokenStore jwtTokenStore() {
    // 采用 "自包含Token"，而非 "透明Token"
    return new JwtTokenStore(accessTokenConverter());
  }

  @Override
  public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
    endpoints
        .authenticationManager(authenticationManager)
        .tokenStore(jwtTokenStore())
        .accessTokenConverter(accessTokenConverter());
  }

  @Override
  public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
    clients
        .inMemory()
        .withClient("wechat")
        .secret("654321")
        .scopes("read_userinfo", "read_contacts")
        .authorizedGrantTypes("authorization_code", "password", "refresh_token");
  }
}
```

## Resource Server

### Maven

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>

  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.security.oauth</groupId>
    <artifactId>spring-security-oauth2</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-jwt</artifactId>
  </dependency>

  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

### application.yml

> 对称加密，密钥与授权服务器一致

```yaml
server:
  port: 9000
security:
  oauth2:
    resource:
      jwt:
        key-value: macos-secret
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
@Controller
public class UserController {

  @GetMapping("/api/userinfo")
  public ResponseEntity<UserInfo> getUserInfo() {
    String username =
        (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    return ResponseEntity.ok(
        UserInfo.builder().name(username).email(username + "@gmail.com").build());
  }
}
```

### Config

```java
@Configuration
@EnableResourceServer
public class OAuth2Config extends ResourceServerConfigurerAdapter {

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

## Flow

### Authorization Server

```shell
$ echo -n 'wechat:654321' | base64
d2VjaGF0OjY1NDMyMQ==
```

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
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2Njg0ODI2ODMsInVzZXJfbmFtZSI6Inpob25nbWluZ21hbyIsImF1dGhvcml0aWVzIjpbIlJPTEVfVVNFUiJdLCJqdGkiOiI2ZTQ4ZmZjNy1kODViLTRkN2ItOTY2MC00YjU3ZWJhN2M0YzciLCJjbGllbnRfaWQiOiJ3ZWNoYXQiLCJzY29wZSI6WyJyZWFkX3VzZXJpbmZvIl19.oM5xeY8aVauChmVXubu7KNXS1VT1MK3e-IadLAuy4CM",
  "token_type": "bearer",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJ6aG9uZ21pbmdtYW8iLCJzY29wZSI6WyJyZWFkX3VzZXJpbmZvIl0sImF0aSI6IjZlNDhmZmM3LWQ4NWItNGQ3Yi05NjYwLTRiNTdlYmE3YzRjNyIsImV4cCI6MTY3MTAzMTQ4MywiYXV0aG9yaXRpZXMiOlsiUk9MRV9VU0VSIl0sImp0aSI6IjRjOTAzYmU0LWU5NTMtNDM3OC04YTg3LTAyYzU3MzdlMjA4MSIsImNsaWVudF9pZCI6IndlY2hhdCJ9.-nB67OKfaucimBAVOwGGnS2dGj8yGGefxbPLwfimfvI",
  "expires_in": 43199,
  "scope": "read_userinfo",
  "jti": "6e48ffc7-d85b-4d7b-9660-4b57eba7c4c7"
}
```

![image-20221114232620073](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221114232620073.png)

### Resource Server

> 解析 JWT

```shell
$ curl -s --location --request GET 'http://localhost:9000/api/userinfo' \
--header 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2Njg0ODI2ODMsInVzZXJfbmFtZSI6Inpob25nbWluZ21hbyIsImF1dGhvcml0aWVzIjpbIlJPTEVfVVNFUiJdLCJqdGkiOiI2ZTQ4ZmZjNy1kODViLTRkN2ItOTY2MC00YjU3ZWJhN2M0YzciLCJjbGllbnRfaWQiOiJ3ZWNoYXQiLCJzY29wZSI6WyJyZWFkX3VzZXJpbmZvIl19.oM5xeY8aVauChmVXubu7KNXS1VT1MK3e-IadLAuy4CM' | jq
{
  "name": "zhongmingmao",
  "email": "zhongmingmao@gmail.com"
}
```

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)
