---
title: Oauth2 - Authorization Code Flow
mathjax: false
date: 2022-09-14 00:06:25
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

# Authorization Server

## Maven

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
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

<!-- more -->

## application.yml

```yaml
server:
  port: 8000
security:
  user:
    name: zhongmingmao
    password: 123456
```

## API

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
@RestController
public class UserController {

  @GetMapping("/api/userInfo")
  public ResponseEntity<UserInfo> getUser() {
    // org.springframework.security.core.userdetails.User implements
    // org.springframework.security.core.userdetails.UserDetails
    User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    return ResponseEntity.ok(
        UserInfo.builder()
            .name(user.getUsername())
            .email(String.join("@", user.getUsername(), "gmail.com"))
            .build());
  }
}
```

## Config

### AuthorizationServerConfig

````java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig extends AuthorizationServerConfigurerAdapter {

  @Override
  public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
    clients
        .inMemory()
        .withClient("wechat")
        .secret("654321")
        .redirectUris("http://localhost:9000/callback")
        .authorizedGrantTypes("authorization_code")
        .accessTokenValiditySeconds(1 << 10)
        .scopes("read_userinfo", "read_contacts");
  }
}
````

### ResourceServerConfig

```java
@Configuration
@EnableResourceServer
public class ResourceServerConfig extends ResourceServerConfigurerAdapter {

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

# Client App

## Maven

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
  </dependency>
  <dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

## application.yml

```yaml
server:
  port: 9000
spring:
  datasource:
    url: jdbc:mysql://localhost/clientdb?useSSL=false
    username: testuser
    password: test
    driver-class-name: com.mysql.jdbc.Driver
  http:
    converters:
      preferred-json-mapper: jackson
  jpa:
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect
        hbm2ddl:
          auto: validate
  thymeleaf:
    cache: false
```

## Storage

```java
@Data
@Entity
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClientUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  String username;
  String password;
  String accessToken;
  Calendar accessTokenValidity;
  String refreshToken;
}
```

```java
public interface ClientUserRepository extends CrudRepository<ClientUser, Long> {
  Optional<ClientUser> findByUsername(final String username);
}
```

## Spring Security

### ClientUserDetails

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClientUserDetails implements UserDetails {

  ClientUser delegator;

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return Collections.emptySet();
  }

  @Override
  public String getPassword() {
    return delegator.getPassword();
  }

  @Override
  public String getUsername() {
    return delegator.getUsername();
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
```

### ClientUserDetailsService

```java
@Service
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ClientUserDetailsService implements UserDetailsService {

  ClientUserRepository repository;

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    Optional<ClientUser> clientUser = repository.findByUsername(username);
    if (!clientUser.isPresent()) {
      throw new UsernameNotFoundException("invalid username or password");
    }
    return ClientUserDetails.builder().delegator(clientUser.get()).build();
  }
}
```

### WebSecurityConfig

```java
@Configuration
@EnableWebSecurity
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {

  /** ClientUserDetailsService */
  UserDetailsService userDetailsService;

  @Override
  protected void configure(AuthenticationManagerBuilder auth) throws Exception {
    auth.userDetailsService(userDetailsService);
  }

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http.authorizeRequests()
        .antMatchers("/", "/index.html")
        .permitAll()
        .anyRequest()
        .authenticated()
        .and()
        .formLogin()
        .and()
        .logout()
        .permitAll()
        .and()
        .csrf()
        .disable();
  }
}
```

## OAuth2

```java
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserInfo {
  String name;
  String email;
}
```

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OAuth2Token {

  @JsonProperty("access_token")
  String accessToken;

  @JsonProperty("token_type")
  String tokenType;

  @JsonProperty("expires_in")
  String expiresIn;

  @JsonProperty("refresh_token")
  String refreshToken;
}
```

```java
@Slf4j
public final class AuthorizationCodeFlowUtils {

  public static final String HOST = "http://localhost:8000";
  public static final String ENDPOINT_AUTHORIZE = HOST + "/oauth/authorize";
  public static final String ENDPOINT_TOKEN = HOST + "/oauth/token";
  public static final String ENDPOINT_USER = HOST + "/api/userInfo";
  public static final String ENDPOINT_CALLBACK = "http://localhost:9000/callback";

  public static String buildAuthorizeEndpoint() {
    Map<String, String> params = new HashMap<>(1 << 2);
    params.put("client_id", "wechat");
    params.put("redirect_uri", ENDPOINT_CALLBACK);
    params.put("response_type", "code");
    params.put("scope", "read_userinfo");

    List<String> paramList = new ArrayList<>(params.size());
    params.forEach((name, value) -> paramList.add(String.join("=", name, value)));
    String endpoint =
        String.format(
            "%s?%s",
            ENDPOINT_AUTHORIZE,
            paramList.stream().reduce((a, b) -> String.join("&", a, b)).orElse(""));
    log.info("authorize endpoint: {}", endpoint);
    return endpoint;
  }

  public static String encodeClientCredentials(final String clientId, final String clientSecret) {
    String clientCredentials =
        new String(
            Base64.getEncoder()
                .encode(String.join(":", clientId, clientSecret).getBytes(StandardCharsets.UTF_8)));
    log.info(
        "clientId: {}, clientSecret: {}, clientCredentials: {}",
        clientId,
        clientSecret,
        clientCredentials);
    return clientCredentials;
  }

  public static HttpHeaders buildExchangeCodeHeader(final String encodedClientCredentials) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON_UTF8));
    headers.add("Authorization", "Basic " + encodedClientCredentials);
    return headers;
  }

  public static MultiValueMap<String, String> buildExchangeCodeBody(final String code) {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("redirect_uri", ENDPOINT_CALLBACK);
    form.add("grant_type", "authorization_code");
    form.add("scope", "read_userinfo");
    form.add("code", code);
    return form;
  }
}
```

```java
@Service
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthorizationCodeTokenService {

  public OAuth2Token exchange(final String code) {
    RestTemplate rest = new RestTemplate();
    RequestEntity<MultiValueMap<String, String>> request =
        new RequestEntity<>(
            buildExchangeCodeBody(code),
            buildExchangeCodeHeader(encodeClientCredentials("wechat", "654321")),
            HttpMethod.POST,
            URI.create(ENDPOINT_TOKEN));
    ResponseEntity<OAuth2Token> response = rest.exchange(request, OAuth2Token.class);
    if (response.getStatusCode().is2xxSuccessful()) {
      return response.getBody();
    }
    throw new RuntimeException("fail to exchange code, code: " + code);
  }
}
```

## Controller

```java
@Controller
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MainPage {

  ClientUserRepository userRepository;
  AuthorizationCodeTokenService tokenService;

  @GetMapping("/")
  public String home() {
    return "index";
  }

  @GetMapping("/mainpage")
  public ModelAndView mainpage() {
    ClientUserDetails userDetails =
        (ClientUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    ClientUser clientUser = userDetails.getDelegator();

    if (Objects.isNull(clientUser.getAccessToken())) {
      return new ModelAndView("redirect:" + buildAuthorizeEndpoint());
    }

    ModelAndView mv = new ModelAndView("mainpage");
    mv.addObject("user", clientUser);
    fetchUserInfo(mv, clientUser.getAccessToken());
    return mv;
  }

  @GetMapping("/callback")
  public ModelAndView callback(final String code, final String state) {
    ClientUserDetails userDetails =
        (ClientUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    ClientUser clientUser = userDetails.getDelegator();

    OAuth2Token token = tokenService.exchange(code);
    clientUser.setAccessToken(token.getAccessToken());

    Calendar tokenValidity = Calendar.getInstance();
    long validIn = System.currentTimeMillis() + Long.parseLong(token.getExpiresIn());
    tokenValidity.setTime(new Date(validIn));
    clientUser.setAccessTokenValidity(tokenValidity);

    userRepository.save(clientUser);

    return new ModelAndView("redirect:/mainpage");
  }

  private void fetchUserInfo(final ModelAndView mv, final String token) {
    RestTemplate rest = new RestTemplate();
    MultiValueMap<String, String> headers = new LinkedMultiValueMap<>();
    headers.add("Authorization", "Bearer " + token);
    RequestEntity<Object> request =
        new RequestEntity<>(headers, HttpMethod.GET, URI.create(ENDPOINT_USER));
    ResponseEntity<UserInfo> response = rest.exchange(request, UserInfo.class);
    if (response.getStatusCode().is2xxSuccessful()) {
      mv.addObject("userInfo", response.getBody());
    }
  }
}
```

# Flow

## Index

![image-20221111134851267](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221111134851267.png)

## Login - Client App

![image-20221111135016541](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221111135016541.png)

```sql
mysql> select * from client_user;
+----+--------------+----------+--------------+-----------------------+---------------+
| id | username     | password | access_token | access_token_validity | refresh_token |
+----+--------------+----------+--------------+-----------------------+---------------+
|  1 | zhongmingmao | 123456   | NULL         | NULL                  | NULL          |
+----+--------------+----------+--------------+-----------------------+---------------+
1 row in set (0.01 sec)
```

> 没有 Access Token ，跳转到授权服务器，走 Authorization Code Flow

## Authorize

![image-20221111135308864](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221111135308864.png)

![image-20221111135404698](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/image-20221111135404698.png)

```sql
mysql> select * from client_user;
+----+--------------+----------+--------------------------------------+-----------------------+---------------+
| id | username     | password | access_token                         | access_token_validity | refresh_token |
+----+--------------+----------+--------------------------------------+-----------------------+---------------+
|  1 | zhongmingmao | 123456   | 510b2f7e-9046-4a6f-9abd-73dbca29bf51 | 2022-09-14 13:53:14   | NULL          |
+----+--------------+----------+--------------------------------------+-----------------------+---------------+
1 row in set (0.01 sec)
```

> 缓存 Access Token

# Code

[authorization-code-flow.tar.gz](https://microservices-1253868755.cos.ap-guangzhou.myqcloud.com/oauth2/authorization-code-flow.tar.gz)

# Reference

1. [微服务架构实战 160 讲](https://time.geekbang.org/course/intro/100007001)
