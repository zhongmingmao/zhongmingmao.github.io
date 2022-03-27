---
title: Infrastructure - Authentication - Basic + JWT
mathjax: false
date: 2022-03-26 01:06:25
categories:
    - Infrastructure
    - Authentication
tags:
    - Infrastructure
    - Authentication
    - JWT
---

# HTTP Authentication

> Some common authentication schemes include: **Basic** **Bearer**

1. The server responds to a client with a 401 (Unauthorized) response status and provides information on how to authorize with a WWW-Authenticate response header containing at least one challenge.
2. A client that wants to authenticate itself with the server can then do so by including an Authorization request header with the credentials.
3. Usually a client will present a password prompt to the user and will then issue the request including the correct Authorization header.

<!-- more -->

# Basic Authentication

![](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/http-auth-sequence-diagram-8278251.png)

```java
@Configuration
public class SecurityConfig extends WebSecurityConfigurerAdapter {

  @Override
  protected void configure(HttpSecurity http) throws Exception {
    http.csrf().disable().authorizeRequests().anyRequest().authenticated().and().httpBasic();
  }

  @Autowired
  public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
    auth.inMemoryAuthentication().withUser("admin").password("{noop}password").roles("ADMIN");
  }
}
```

```shell
# curl -s -i 'http://localhost:8080/hello/'                                               
HTTP/1.1 401 
Set-Cookie: JSESSIONID=0A7BE231088CA8155B1218C70397CF2D; Path=/; HttpOnly
WWW-Authenticate: Basic realm="Realm"
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
X-Frame-Options: DENY
Content-Length: 0
Date: Sat, 26 Mar 2022 07:19:15 GMT

# echo -n 'admin:password' | base64                                                      
YWRtaW46cGFzc3dvcmQ=

# curl -s -i -H 'Authorization: Basic YWRtaW46cGFzc3dvcmQ=' 'http://localhost:8080/hello/'
HTTP/1.1 200 
Set-Cookie: JSESSIONID=B4A6CB1CE7C73B858C3244ABA6F9FEF9; Path=/; HttpOnly
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Pragma: no-cache
Expires: 0
X-Frame-Options: DENY
Content-Type: text/plain;charset=UTF-8
Content-Length: 12
Date: Sat, 26 Mar 2022 07:19:51 GMT

Hello World!
```

# JWT Authentication

## Overview

1. JSON Web Token (JWT) is an **open standard** ([RFC 7519](https://tools.ietf.org/html/rfc7519)) that defines a **compact** and **self-contained** way for **securely transmitting information** between parties as a **JSON object**.
2. This information can be **verified** and **trusted** because it is **digitally signed**.
3. JWTs can be signed using a **secret** (with the **HMAC** algorithm) or a **public/private key pair** using **RSA** or **ECDSA**.

## Authorization

1. Once the user is logged in, each subsequent request will include the JWT, allowing the user to access routes, services, and resources that are permitted with that token.
2. **Single Sign On** is a feature that widely uses JWT nowadays, because of its **small overhead** and its ability to be easily used **across different domains**.

## Structure

> The output is **three Base64-URL strings separated by dots** that can be easily passed in HTML and HTTP environments, while being more compact when compared to XML-based standards such as SAML.

```
Header.Payload.Signature
```

### Header

1. The header *typically* consists of two parts: the type of the token, which is JWT, and the **signing algorithm** being used, such as **HMAC SHA256** or **RSA**.
2. Then, this JSON is **Base64Url** encoded to form the first part of the JWT.

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

1. Claims are statements about an **entity** (typically, the **user**) and **additional data**.
2. There are three types of claims: *registered*, *public*, and *private* claims.
   - [Registered claims](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1)
     - These are a set of **predefined** claims which are not mandatory but **recommended**, to provide a set of useful, interoperable claims.
     - example: **iss** (issuer), **exp** (expiration time), **sub** (Subject)
   - [Public claims](https://datatracker.ietf.org/doc/html/rfc7519#section-4.2)
     - These can be defined **at will** by those using JWTs.
     - But to **avoid collisions** they should be defined in the [IANA JSON Web Token Registry](https://www.iana.org/assignments/jwt/jwt.xhtml) or be defined as a URI that contains a **collision resistant namespace**.
   - [Private claims](https://tools.ietf.org/html/rfc7519#section-4.3)
     - These are the custom claims created to **share information between parties** that agree on using them and are neither *registered* or *public* claims.
3. The payload is then **Base64Url** encoded to form the second part of the JSON Web Token.

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true
}
```

> Do note that for signed tokens this information, though protected against tampering, **is readable by anyone**. Do not put secret information in the payload or header elements of a JWT unless it is encrypted.

### Signature

1. To create the signature part you have to take the **encoded header**, **the encoded payload**, a **secret**, the algorithm specified in the header, and sign that.
2. **The signature is used to verify the message wasn't changed along the way**, and, in the case of tokens signed with a **private key**, it can also **verify that the sender of the JWT** is who it says it is.

```python
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret)
```

## Usage

1. In authentication, when the user successfully logs in using their credentials, **a JSON Web Token will be returned**.
2. Whenever the user wants to access a protected route or resource, the user agent should send the JWT, typically in the **Authorization** header using the **Bearer** schema.

```
Authorization: Bearer <token>
```

## Stateless

1. This can be, in certain cases, a stateless authorization mechanism.
2. The server's protected routes will check for a valid JWT in the `Authorization` header, and if it's present, the user will be allowed to access protected resources. 
3. If the JWT contains the **necessary data**, the need to **query the database** for certain operations may be **reduced**, though this may not always be the case.
   - Note that if you send JWT tokens through HTTP headers, you should try to **prevent them from getting too big**.
   - If you are trying to **embed too much information in a JWT token**, like by including all the user's permissions, you may need an alternative solution.

## CORS

> If the token is sent in the `Authorization` header, **Cross-Origin Resource Sharing** (CORS) won't be an issue as it **doesn't use cookies**.

1. The application or client requests authorization to the authorization server. 
2. When the authorization is granted, the authorization server returns an access token to the application.
3. The application uses the access token to access a protected resource (like an API).

![client-credentials-grant](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/client-credentials-grant.png)

> Do note that with signed tokens, all the information contained within the token is exposed to users or other parties, even though they are unable to change it. **This means you should not put secret information within the token**.

## Workflow

1. Customers sign in by submitting their **credentials** to the provider.
2. Upon successful authentication, it generates **JWT containing user details and privileges** for accessing the services and sets the JWT **expired date** in payload.
3. **The server signs and encrypts the JWT if necessary** and sends it to the client as a response with credentials to the initial request.
4. Based on the expiration set by the server, the customer/client stores the JWT for a restricted or infinite amount of time.
5. The client sends this JWT token in the header for all subsequent requests.
6. **The client authenticates the user with this token**. So we don't need the client to send the user name and password to the server during each authentication process, but only once the server sends the client a JWT.

![jwt-workflow](https://infrastructure-1253868755.cos.ap-guangzhou.myqcloud.com/authentication/jwt-workflow.jpeg)

## Spring Security

### Model

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtRequest {
  String username;
  String password;
}
```

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtResponse {
  String token;
}
```

### Config

```java
@Component
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtTokenHelper {

  @Value("${jwt.secret}")
  String secret;

  public String generate(UserDetails details) {
    return Jwts.builder()
        // Identifier (or, name) of the user this token represents.
        .setSubject(details.getUsername())
        // Date/time when the token was issued.
        .setIssuedAt(Date.from(Instant.now()))
        // Date/time at which point the token is no longer valid.
        .setExpiration(Date.from(Instant.now().plus(Duration.ofDays(1))))
        .signWith(SignatureAlgorithm.HS512, secret)
        .compact();
  }

  public Boolean validate(String token, UserDetails userDetails) {
    return !isTokenExpired(token) && Objects.equals(username(token), userDetails.getUsername());
  }

  public String username(String token) {
    return resolveClaims(token, Claims::getSubject);
  }

  public Date issuedAt(String token) {
    return resolveClaims(token, Claims::getIssuedAt);
  }

  public Date expiration(String token) {
    return resolveClaims(token, Claims::getExpiration);
  }

  private <T> T resolveClaims(String token, Function<Claims, T> claimsResolver) {
    return claimsResolver.apply(
        Jwts.parser().setSigningKey(secret).parseClaimsJws(token).getBody());
  }

  private Boolean isTokenExpired(String token) {
    return expiration(token).before(Date.from(Instant.now()));
  }
}
```

```java
@Component
public class UnauthorizedEntryPoint implements AuthenticationEntryPoint {

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException)
      throws IOException {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
  }
}
```

```java
@Component
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtRequestFilter extends OncePerRequestFilter {

  UserDetailsService userDetailsService;
  JwtTokenHelper tokenHelper;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authorization = request.getHeader("Authorization");
    String username = null;
    String token = null;

    // JWT Token is in the form "Bearer token". Remove Bearer word and get only the Token
    if (!StringUtils.isEmpty(authorization) && authorization.startsWith("Bearer ")) {
      token = authorization.substring(7);
      username = tokenHelper.username(token);
    }

    // Once we get the token validate it.
    if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
      UserDetails userDetails = userDetailsService.loadUserByUsername(username);
      // if token is valid configure Spring Security to manually set authentication
      if (tokenHelper.validate(token, userDetails)) {
        UsernamePasswordAuthenticationToken authenticationToken =
            new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        // After setting the Authentication in the context, we specify
        // that the current user is authenticated. So it passes the Spring Security Configurations
        // successfully.
        SecurityContextHolder.getContext().setAuthentication(authenticationToken);
      }
    }

    filterChain.doFilter(request, response);
  }
}
```

```java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {

  UnauthorizedEntryPoint unauthorizedEntryPoint;
  UserDetailsService detailsService;
  JwtRequestFilter jwtRequestFilter;

  @Autowired
  public void configureGlobal(AuthenticationManagerBuilder auth) throws Exception {
    // configure AuthenticationManager so that it knows from where to load
    // user for matching credentials
    // Use BCryptPasswordEncoder
    auth.userDetailsService(detailsService).passwordEncoder(passwordEncoder());
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  @Override
  public AuthenticationManager authenticationManagerBean() throws Exception {
    return super.authenticationManagerBean();
  }

  @Override
  protected void configure(HttpSecurity httpSecurity) throws Exception {
    httpSecurity
        // We don't need CSRF for this example
        .csrf()
        .disable()
        // do not authenticate this particular request
        .authorizeRequests()
        .antMatchers("/authenticate")
        .permitAll()
        .antMatchers(HttpMethod.OPTIONS, "/**")
        .permitAll()
        // all other requests need to be authenticated
        .anyRequest()
        .authenticated()
        .and()
        .exceptionHandling()
        .authenticationEntryPoint(unauthorizedEntryPoint)
        .and()
        // make sure we use stateless session; session won't be used to
        // store user's state.
        .sessionManagement()
        .sessionCreationPolicy(SessionCreationPolicy.STATELESS);

    // Add a filter to validate the tokens with every request
    httpSecurity.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
  }
}
```

### Service

```java
@Service
public class JwtUserDetailsService implements UserDetailsService {

  @Override
  public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
    // bcrypt is a password-hashing function.
    // https://bcrypt-generator.com/
    if ("zhongmingmao".equals(username)) {
      return new User(
          "zhongmingmao",
          "$2a$12$VvnKaknki2o1saULFLmuduvzVAUMuFZ0LUOrchKnK0jHfLZof3/za",
          Collections.emptyList());
    }
    throw new UsernameNotFoundException("User not found with username: " + username);
  }
}
```

### Controller

```java
@RestController
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JwtAuthenticationController {

  AuthenticationManager authenticationManager;
  JwtTokenHelper tokenHelper;
  UserDetailsService userDetailsService;

  @PostMapping("/authenticate")
  public ResponseEntity<JwtResponse> generateAuthenticationToken(@RequestBody JwtRequest request)
      throws Exception {
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
    return ResponseEntity.ok(
        new JwtResponse(
            tokenHelper.generate(userDetailsService.loadUserByUsername(request.getUsername()))));
  }
}
```

```java
@RestController
public class HelloController {

  @GetMapping("/hello")
  public String hello() {
    return "Hello World!";
  }
}
```

### Validation

```shell
# curl -s --location --request POST 'localhost:8080/authenticate' \
--header 'Content-Type: application/json' \
--data-raw '{
    "username":"zhongmingmao",
    "password":"zhongmingmao"
}' | jq
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ6aG9uZ21pbmdtYW8iLCJpYXQiOjE2NDgzMTMwNDksImV4cCI6MTY0ODM5OTQ0OX0.9_Uq0p63SLkfE1FycNGxE0ttfufhiewDShdW38uXiOYaAggHu8mJfGTM5BrED1a5HiSnx_GN1n17xK4Tz5dQwg"
}
```

```shell
# curl --location --request GET 'localhost:8080/hello' \
--header 'Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ6aG9uZ21pbmdtYW8iLCJpYXQiOjE2NDgzMTMwNDksImV4cCI6MTY0ODM5OTQ0OX0.9_Uq0p63SLkfE1FycNGxE0ttfufhiewDShdW38uXiOYaAggHu8mJfGTM5BrED1a5HiSnx_GN1n17xK4Tz5dQwg'
Hello World!
```

```shell
# curl -s --location --request GET 'localhost:8080/hello' | jq
{
  "timestamp": "2022-03-25T16:46:29.363+0000",
  "status": 401,
  "error": "Unauthorized",
  "message": "Unauthorized",
  "path": "/hello"
}
```

