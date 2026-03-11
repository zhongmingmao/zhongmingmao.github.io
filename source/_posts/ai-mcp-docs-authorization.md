---
title: MCP Docs - Authorization
mathjax: true
date: 2026-03-10 06:25:00
cover: https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/mcp-diagram-with-backend-services.png
categories:
  - AI
  - MCP
tags:
  - AI
  - MCP
---

# Overview

1. Learn how to implement **secure authorization** for **MCP servers** using **OAuth 2.1** to protect **sensitive resources** and **operations**.
2. **Authorization** in the Model Context Protocol (MCP) **secures access** to **sensitive resources** and **operations** exposed by **MCP servers**.
3. If your **MCP server** handles **user data** or **administrative actions**, authorization ensures only **permitted users** can access its endpoints.
4. **MCP** uses **standardized authorization flows** to **build trust** between **MCP clients** and **MCP servers**.
   - Its design doesn’t focus on one specific **authorization** or **identity** system, but rather **follows the conventions** outlined for **OAuth 2.1**.
   - For detailed information - https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization

<!-- more -->

## OAuth 2.1

> **Authorization Code Flow** with **PKCE**

![image-20260310174453265](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310174453265.png)

## Higress

![image-20260310174011329](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310174011329.png)

![image-20260310174110240](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310174110240.png)

# When Should You Use Authorization?

> While **authorization** for **MCP servers** is **optional**, it is **strongly recommended** when:

1. Your server accesses **user-specific data** (emails, documents, databases)
2. You need to **audit** <u>who performed which actions</u>
3. Your server grants access to its **APIs** that require **user consent**
4. You’re building for **enterprise environments** with **strict access controls**
5. You want to implement **rate limiting** or **usage tracking** per **user**

> Authorization for **Local MCP Servers**

1. For **MCP servers** using the **STDIO** transport
   - you can use **environment-based** credentials or credentials provided by **third-party libraries** embedded directly in the MCP server instead.
2. Because a STDIO-built MCP server **runs locally**
   - it has access to a **range** of **flexible options** when it comes to **acquiring user credentials**
   - that may or **may not** rely on **in-browser authentication** and **authorization flows**.
3. OAuth flows, in turn, are **designed** for **HTTP-based** transports where the **MCP server** is **remotely-hosted**
   - and the **client** uses **OAuth** to establish that a **user** is **authorized** to access said **remote server**.

![image-20260310175918194](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310175918194.png)

> **OAuth 2.1** + **PKCE**

![image-20260310180337844](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310180337844.png)

![image-20260310180414759](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310180414759.png)

![image-20260310180600712](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310180600712.png)

![image-20260310180847029](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310180847029.png)

| Key             | Value                                        |
| --------------- | -------------------------------------------- |
| <u>安全性</u>   | 远程访问需要**标准化**、**可审计**的授权机制 |
| <u>灵活性</u>   | 本地工具可以使用任何适合的认证方式           |
| <u>用户体验</u> | 本地工具无缝集成，**远程工具安全可控**       |
| <u>业界标准</u> | **OAuth** 是**互联网授权**的**事实标准**     |

# OAuth 2.1 + PKCE vs OIDC

![image-20260310181636955](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310181636955.png)

![image-20260310181844207](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310181844207.png)



![image-20260310182050014](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310182050014.png)

![image-20260310182151182](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310182151182.png)

![image-20260310182317909](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310182317909.png)

## Dex

> Higress → Keycloak → Dex → 公司 SSO

![image-20260310183805434](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310183805434.png)

## Keycloak

![image-20260310184950153](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310184950153.png)

![image-20260310185027509](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310185027509.png)

![image-20260310185117129](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310185117129.png)

![image-20260310185658935](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310185658935.png)

# The Authorization Flow: Step by Step

> Let’s walk through what happens when a **client** wants to **connect** to your **protected MCP server**:

![image-20260311100600414](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311100600414.png)

![image-20260311100648301](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311100648301.png)

![image-20260311100809161](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311100809161.png)

![image-20260311101003442](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101003442.png)

![image-20260311101046858](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101046858.png)

![image-20260311101143645](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101143645.png)

![image-20260311101303245](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101303245.png)

![image-20260311101342803](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101342803.png)

![image-20260311101441007](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101441007.png)

![image-20260311101523964](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101523964.png)

![image-20260311101637948](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311101637948.png)

## Initial Handshake

> MCP（Model Context Protocol）服务器的 **OAuth 2.0 授权流程**的**初始握手**阶段

1. When your **MCP client** <u>first tries to connect</u>
   - your **server** responds with a `401 Unauthorized` and tells the client **where to find authorization information**
   - captured in a [Protected Resource Metadata (PRM) document](https://datatracker.ietf.org/doc/html/rfc9728).
2. The **document** is **hosted by** the **MCP server**, follows a **predictable path pattern**
   - and is provided to the **client** in the `resource_metadata` parameter within the `WWW-Authenticate` header.

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="mcp",
  resource_metadata="https://your-server.com/.well-known/oauth-protected-resource"
```

1. This tells the **client** that **authorization** is **required** for the **MCP server**
2. and **where** to get the **necessary information** to **kickstart** the **authorization flow**.

![image-20260310195942760](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310195942760.png)

## Protected Resource Metadata Discovery

> 发现并获取**受保护资源元数据**

1. With the **URI** pointer to the **PRM document**
   - the **client** will **fetch** the **metadata** to **learn about**
   - the **authorization server**, **supported scopes**, and **other resource information**.
2. The **data** is typically **encapsulated** in a **JSON blob**, similar to the one below.

```json
{
  "resource": "https://your-server.com/mcp",
  "authorization_servers": ["https://auth.your-server.com"],
  "scopes_supported": ["mcp:tools", "mcp:resources"]
}
```

![image-20260310200925266](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310200925266.png)

![image-20260310201111174](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310201111174.png)

![image-20260310201325710](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310201325710.png)

## Authorization Server Discovery

> 发现**授权服务器**的**详细能力**

1. Next, the **client** discovers what the **authorization server** can do by fetching its **metadata**.
2. If the **PRM document** lists **more than one authorization server**, the **client** can **decide** which one to use.
3. With <u>an authorization server</u> **selected**
   - the **client** will then **construct** a **standard metadata URI** and **issue** a **request** to
   - the [OpenID Connect (OIDC) Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html) or [OAuth 2.0 Auth Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414) endpoints
     - depending on **authorization server** support
   - and **retrieve** <u>another set of metadata properties</u>
     - that will allow it to know the **endpoints** it needs to **complete** the **authorization flow**.

```json
{
  "issuer": "https://auth.your-server.com",
  "authorization_endpoint": "https://auth.your-server.com/authorize",
  "token_endpoint": "https://auth.your-server.com/token",
  "registration_endpoint": "https://auth.your-server.com/register"
}
```

> /.well-known/openid-configuration vs /.well-known/oauth-authorization-server

![image-20260310202755315](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310202755315.png)

![image-20260310204445673](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310204445673.png)

```json
{
  "issuer": "https://auth.your-server.com",
  "authorization_endpoint": "https://auth.your-server.com/authorize",
  "token_endpoint": "https://auth.your-server.com/token",
  "registration_endpoint": "https://auth.your-server.com/register",
  "scopes_supported": [
    "openid",
    "profile",
    "mcp:tools",
    "mcp:resources"
  ],
  "response_types_supported": [
    "code"
  ],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token"
  ],
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "private_key_jwt"
  ],
  "jwks_uri": "https://auth.your-server.com/jwks",
  "code_challenge_methods_supported": [
    "S256"
  ]
}
```

![image-20260310204900969](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310204900969.png)

![image-20260310205116229](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310205116229.png)

## Client Registration

> 客户端注册 - **MCP 客户端开发者**

1. With all the **metadata** out of the way, the **client** now needs to make sure that it’s **registered** with the **authorization server**.
2. This can be done in two ways - **pre-registered**  or **Dynamic Client Registration**

![image-20260310220122769](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310220122769.png)

![image-20260310221213428](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310221213428.png)

### pre-registered

1. First, the **client** can be **pre-registered** with a **given authorization server**
2. in which case it can have **embedded client registration information** that it uses to **complete** the **authorization flow**.

> 授权服务器可以完全控制客户端列表

![image-20260310220329007](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310220329007.png)

### Dynamic Client Registration

1. Alternatively, the **client** can use Dynamic Client Registration (**DCR**) to **dynamically register itself** with the <u>authorization server</u>.
2. The latter scenario requires the **authorization server** to **support DCR**.
3. If the authorization server **does support DCR**, the client will send a **request** to the **registration_endpoint** with **its information**
4. If the **registration succeeds**, the **authorization server** will return a **JSON blob** with **client registration information**.

```json
{
  "client_name": "My MCP Client",
  "redirect_uris": ["http://localhost:3000/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"]
}
```

![image-20260310220909215](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310220909215.png)

![image-20260310221011260](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310221011260.png)

![image-20260310221654820](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310221654820.png)

> **No** DCR or Pre-Registration

1. In case an **MCP client** connects to an **MCP server**
   - that **doesn’t use an authorization server** that **supports DCR**
   - and the **client** is **not pre-registered** with **said authorization server**
2. it’s the **responsibility** of the **client developer** to provide an **affordance** for the **end-user** to **enter client information manually**.

![image-20260310221044330](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260310221044330.png)

## User Authorization

> **用户授权**与**令牌获取**

1. The **client** will now need to **open a browser** to the `/authorize` endpoint
   - where the **user** can **log in** and **grant the required permissions**.
2. The **authorization server** will then **redirect back** to the **client** with an **authorization code**
   - that the **client exchanges for tokens**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "def502...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

1. The **access token** is what the **client** will use to **authenticate requests** to the **MCP server**.
2. This step follows **standard OAuth 2.1 authorization code** with **PKCE** conventions.

![image-20260311091905531](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311091905531.png)

![image-20260311092134992](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311092134992.png)

![image-20260311092313012](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311092313012.png)

![image-20260311092358389](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311092358389.png)

> 本质上是利用了**单向散列**的安全性，用于替代 **OAuth 2.0** 中存储 **client_secret** 的安全问题

![image-20260311092703675](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311092703675.png)

![image-20260311093621953](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311093621953.png)

![image-20260311093713740](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311093713740.png)

![image-20260311093825185](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311093825185.png)

![image-20260311094038308](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311094038308.png)

![image-20260311094218058](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311094218058.png)

![image-20260311094421654](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311094421654.png)

![image-20260311094515830](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311094515830.png)

> **OAuth 2.1 Authorization Code with PKCE** 的安全性

![image-20260311093151159](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311093151159.png)

## Making Authenticated Requests

Finally, the **client** can **make requests** to your **MCP server** using the **access token** embedded in the `Authorization` header:

```json
GET /mcp HTTP/1.1
Host: your-server.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

The **MCP server** will need to **validate the token** and **process the request** if the **token** is **valid** and has the **required permissions**.

![image-20260311095222804](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311095222804.png)

![image-20260311095346772](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311095346772.png)

> MCP Server Token 验证机制

![image-20260311095750717](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311095750717.png)

![image-20260311095949348](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311095949348.png)

![image-20260311100024741](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311100024741.png)

> MCP 场景：JWT + 本地验证

![image-20260311100148126](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311100148126.png)

# Implementation Example

1. To get started with a practical implementation, we will use a **Keycloak authorization server** hosted in a Docker container.
2. **Keycloak** is an open-source **authorization server** that can be easily deployed locally for testing and experimentation.

![image-20260311103942673](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311103942673.png)

![image-20260311104433355](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311104433355.png)

## Keycloak Setup

From your **terminal** application, run the following command to start the Keycloak container:

```
docker run -p 127.0.0.1:8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev
```

1. This command will pull the Keycloak container image locally and bootstrap the **basic configuration**.
2. It will run on port `8080` and have an `admin` user with `admin` password.

> Not for Production

1. The configuration above may be **suitable** for **testing** and **experimentation**; however, you should **never** use it in **production**.
2. Refer to the [Configuring Keycloak for production](https://www.keycloak.org/server/configuration-production) guide for additional details on
   - how to deploy the **authorization server** for scenarios that require **reliability**, **security**, and **high availability**.

> You will be able to access the **Keycloak authorization server** from your browser at `http://localhost:8080`.

![image-20260311103533253](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311103533253.png)

1. When running with the **default configuration**
   - Keycloak will already support many of the **capabilities** that we need for **MCP servers**
   - including **Dynamic Client Registration**.
2. You can check this by looking at the **OIDC configuration**, available at

> http://localhost:8080/realms/master/.well-known/openid-configuration

```json
{
  "issuer": "http://localhost:8080/realms/master",
  "authorization_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/auth",
  "token_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token",
  "introspection_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token/introspect",
  "userinfo_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/userinfo",
  "end_session_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/logout",
  "frontchannel_logout_session_supported": true,
  "frontchannel_logout_supported": true,
  "jwks_uri": "http://localhost:8080/realms/master/protocol/openid-connect/certs",
  "check_session_iframe": "http://localhost:8080/realms/master/protocol/openid-connect/login-status-iframe.html",
  "grant_types_supported": [
    "authorization_code",
    "client_credentials",
    "implicit",
    "password",
    "refresh_token",
    "urn:ietf:params:oauth:grant-type:device_code",
    "urn:ietf:params:oauth:grant-type:token-exchange",
    "urn:ietf:params:oauth:grant-type:uma-ticket",
    "urn:openid:params:grant-type:ciba"
  ],
  "acr_values_supported": [
    "0",
    "1"
  ],
  "response_types_supported": [
    "code",
    "none",
    "id_token",
    "token",
    "id_token token",
    "code id_token",
    "code token",
    "code id_token token"
  ],
  "subject_types_supported": [
    "public",
    "pairwise"
  ],
  "prompt_values_supported": [
    "none",
    "login",
    "consent"
  ],
  "id_token_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "id_token_encryption_alg_values_supported": [
    "ECDH-ES+A256KW",
    "ECDH-ES+A192KW",
    "ECDH-ES+A128KW",
    "RSA-OAEP",
    "RSA-OAEP-256",
    "RSA1_5",
    "ECDH-ES"
  ],
  "id_token_encryption_enc_values_supported": [
    "A256GCM",
    "A192GCM",
    "A128GCM",
    "A128CBC-HS256",
    "A192CBC-HS384",
    "A256CBC-HS512"
  ],
  "userinfo_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512",
    "none"
  ],
  "userinfo_encryption_alg_values_supported": [
    "ECDH-ES+A256KW",
    "ECDH-ES+A192KW",
    "ECDH-ES+A128KW",
    "RSA-OAEP",
    "RSA-OAEP-256",
    "RSA1_5",
    "ECDH-ES"
  ],
  "userinfo_encryption_enc_values_supported": [
    "A256GCM",
    "A192GCM",
    "A128GCM",
    "A128CBC-HS256",
    "A192CBC-HS384",
    "A256CBC-HS512"
  ],
  "request_object_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512",
    "none"
  ],
  "request_object_encryption_alg_values_supported": [
    "ECDH-ES+A256KW",
    "ECDH-ES+A192KW",
    "ECDH-ES+A128KW",
    "RSA-OAEP",
    "RSA-OAEP-256",
    "RSA1_5",
    "ECDH-ES"
  ],
  "request_object_encryption_enc_values_supported": [
    "A256GCM",
    "A192GCM",
    "A128GCM",
    "A128CBC-HS256",
    "A192CBC-HS384",
    "A256CBC-HS512"
  ],
  "response_modes_supported": [
    "query",
    "fragment",
    "form_post",
    "query.jwt",
    "fragment.jwt",
    "form_post.jwt",
    "jwt"
  ],
  "registration_endpoint": "http://localhost:8080/realms/master/clients-registrations/openid-connect",
  "token_endpoint_auth_methods_supported": [
    "private_key_jwt",
    "client_secret_basic",
    "client_secret_post",
    "tls_client_auth",
    "client_secret_jwt"
  ],
  "token_endpoint_auth_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "introspection_endpoint_auth_methods_supported": [
    "private_key_jwt",
    "client_secret_basic",
    "client_secret_post",
    "tls_client_auth",
    "client_secret_jwt"
  ],
  "introspection_endpoint_auth_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "authorization_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "authorization_encryption_alg_values_supported": [
    "ECDH-ES+A256KW",
    "ECDH-ES+A192KW",
    "ECDH-ES+A128KW",
    "RSA-OAEP",
    "RSA-OAEP-256",
    "RSA1_5",
    "ECDH-ES"
  ],
  "authorization_encryption_enc_values_supported": [
    "A256GCM",
    "A192GCM",
    "A128GCM",
    "A128CBC-HS256",
    "A192CBC-HS384",
    "A256CBC-HS512"
  ],
  "claims_supported": [
    "iss",
    "sub",
    "aud",
    "exp",
    "iat",
    "auth_time",
    "name",
    "given_name",
    "family_name",
    "preferred_username",
    "email",
    "acr",
    "azp",
    "nonce"
  ],
  "claim_types_supported": [
    "normal"
  ],
  "claims_parameter_supported": true,
  "scopes_supported": [
    "openid",
    "microprofile-jwt",
    "acr",
    "service_account",
    "basic",
    "web-origins",
    "address",
    "offline_access",
    "organization",
    "phone",
    "profile",
    "email",
    "roles"
  ],
  "request_parameter_supported": true,
  "request_uri_parameter_supported": true,
  "require_request_uri_registration": true,
  "code_challenge_methods_supported": [
    "plain",
    "S256"
  ],
  "tls_client_certificate_bound_access_tokens": true,
  "dpop_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "ES256",
    "RS256",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "revocation_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/revoke",
  "revocation_endpoint_auth_methods_supported": [
    "private_key_jwt",
    "client_secret_basic",
    "client_secret_post",
    "tls_client_auth",
    "client_secret_jwt"
  ],
  "revocation_endpoint_auth_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "HS256",
    "HS512",
    "ES256",
    "RS256",
    "HS384",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "backchannel_logout_supported": true,
  "backchannel_logout_session_supported": true,
  "device_authorization_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/auth/device",
  "backchannel_token_delivery_modes_supported": [
    "poll",
    "ping"
  ],
  "backchannel_authentication_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/ext/ciba/auth",
  "backchannel_authentication_request_signing_alg_values_supported": [
    "PS384",
    "RS384",
    "EdDSA",
    "ES384",
    "ES256",
    "RS256",
    "ES512",
    "PS256",
    "PS512",
    "RS512"
  ],
  "require_pushed_authorization_requests": false,
  "pushed_authorization_request_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/ext/par/request",
  "mtls_endpoint_aliases": {
    "token_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token",
    "revocation_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/revoke",
    "introspection_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/token/introspect",
    "device_authorization_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/auth/device",
    "registration_endpoint": "http://localhost:8080/realms/master/clients-registrations/openid-connect",
    "userinfo_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/userinfo",
    "pushed_authorization_request_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/ext/par/request",
    "backchannel_authentication_endpoint": "http://localhost:8080/realms/master/protocol/openid-connect/ext/ciba/auth"
  },
  "authorization_response_iss_parameter_supported": true
}
```

![image-20260311104649170](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311104649170.png)

![image-20260311104806844](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311104806844.png)

![](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311105007298.png)

### Client scopes

1. We will also need to **set up Keycloak** to support our **scopes** and allow our **host** (local machine) to <u>dynamically register clients</u>
   - as the **default policies** <u>restrict anonymous dynamic client registration</u>.
2. Go to **Client scopes** in the Keycloak dashboard and create a new `mcp:tools` scope.
   - We will use this to access **all of the tools** on our **MCP server**.

![image-20260311105938115](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311105938115.png)

1. After creating the scope, make sure that you assign its **type** to **Default** and have flipped the **Include in token scope** switch
2. as this will be needed for **token validation**.

### Audience

> Audience (aud) 是 JWT（JSON Web Token）中的一个标准声明，用于标识该令牌是**为谁发行**的

1. Let’s now also set up an **audience** for our **Keycloak-issued tokens**.
2. An audience is important to configure because it **embeds** the **intended destination** directly into the **issued access token**.
3. This helps your **MCP server** to **verify** that the **token** it got was **actually meant** for it rather than some other **API**.
   - This is key to help avoid **token passthrough** scenarios.

![image-20260311110714423](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311110714423.png)

![image-20260311110930424](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311110930424.png)

![image-20260311121651085](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311121651085.png)

To do this, open your `mcp:tools` client scope and click on **Mappers**, followed by **Configure a new mapper**. Select **Audience**.

![scope-add-audience](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/scope-add-audience.gif)

1. For **Name**, use `audience-config`. Add a value for **Included Custom Audience**, set to `http://localhost:3000`.
2. This will be the URI of our **test MCP server**.

![image-20260311122040358](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311122040358.png)

> Not for Production

1. The audience configuration above is meant for **testing**.
2. For **production** scenarios
   - **additional set-up and configuration** will be **required** to **ensure** that **audiences**
   - are **properly constrained** for **issued tokens**.
3. Specifically, the **audience** needs to be based on the **resource parameter** passed from the **client**, not a fixed value.

### Trusted Hosts

1. Now, navigate to **Clients**, then **Client registration**, and then **Trusted Hosts**.
2. Disable the **Client URIs Must Match** setting and add the hosts from which you’re testing.
3. You can get your current host IP by running the `ifconfig` command on Linux or macOS, or `ipconfig` on Windows.
4. You can see the **IP address** you need to add by looking at the **keycloak logs** for a line that looks like
   - `Failed to verify remote host : 192.168.215.1`.
5. Check that the IP address is associated with your host.
   - This may be for a **bridge network** depending on your **docker** setup.

![keycloak-client](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/keycloak-client.gif)

![image-20260311135619736](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311135619736.png)

![image-20260311135646104](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311135646104.png)

> Getting the Host

If you are running Keycloak from a **container**, you will also be able to see the **host IP** from the **Terminal** in the container logs.

### Client

1. Lastly, we need to **register a new client** that we can use with the **MCP server** itself to talk to **Keycloak** for things like **token introspection.**
2. To do that:
   - Go to **Clients**.
   - Click **Create client**.
   - Give your client a unique **Client ID** and click **Next**.
   - Enable **Client authentication** and click **Next**.
   - Click **Save**.
3. Worth noting that **token introspection** is just *one of* the **available approaches** to **validate tokens**.
   - This can also be done with the help of **standalone libraries**, specific to each **language** and **platform**.
4. When you open the client details, go to **Credentials** and take note of the **Client Secret**.

![keycloak-client-auth](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/keycloak-client-auth.gif)

> Handling Secrets

1. Never **embed** client **credentials** directly in your **code**. 
2. We recommend using **environment variables** or **specialized solutions** for **secret storage**.

> With Keycloak configured, every time the **authorization flow** is **triggered**, your **MCP server** will **receive a token** like this:

```
eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI1TjcxMGw1WW5MWk13WGZ1VlJKWGtCS3ZZMzZzb3JnRG5scmlyZ2tlTHlzIn0.eyJleHAiOjE3NTU1NDA4MTcsImlhdCI6MTc1NTU0MDc1NywiYXV0aF90aW1lIjoxNzU1NTM4ODg4LCJqdGkiOiJvbnJ0YWM6YjM0MDgwZmYtODQwNC02ODY3LTgxYmUtMTIzMWI1MDU5M2E4IiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9tYXN0ZXIiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJzdWIiOiIzM2VkNmM2Yi1jNmUwLTQ5MjgtYTE2MS1mMmY2OWM3YTAzYjkiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiI3OTc1YTViNi04YjU5LTRhODUtOWNiYS04ZmFlYmRhYjg5NzQiLCJzaWQiOiI4ZjdlYzI3Ni0zNThmLTRjY2MtYjMxMy1kYjA4MjkwZjM3NmYiLCJzY29wZSI6Im1jcDp0b29scyJ9.P5xCRtXORly0R0EXjyqRCUx-z3J4uAOWNAvYtLPXroykZuVCCJ-K1haiQSwbURqfsVOMbL7jiV-sD6miuPzI1tmKOkN_Yct0Vp-azvj7U5rEj7U6tvPfMkg2Uj_jrIX0KOskyU2pVvGZ-5BgqaSvwTEdsGu_V3_E0xDuSBq2uj_wmhqiyTFm5lJ1WkM3Hnxxx1_AAnTj7iOKMFZ4VCwMmk8hhSC7clnDauORc0sutxiJuYUZzxNiNPkmNeQtMCGqWdP1igcbWbrfnNXhJ6NswBOuRbh97_QraET3hl-CNmyS6C72Xc0aOwR_uJ7xVSBTD02OaQ1JA6kjCATz30kGYg
```

> **Decoded**, it will look like this:

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "5N710l5YnLZMwXfuVRJXkBKvY36sorgDnlrirgkeLys"
}.{
  "exp": 1755540817,
  "iat": 1755540757,
  "auth_time": 1755538888,
  "jti": "onrtac:b34080ff-8404-6867-81be-1231b50593a8",
  "iss": "http://localhost:8080/realms/master",
  "aud": "http://localhost:3000",
  "sub": "33ed6c6b-c6e0-4928-a161-f2f69c7a03b9",
  "typ": "Bearer",
  "azp": "7975a5b6-8b59-4a85-9cba-8faebdab8974",
  "sid": "8f7ec276-358f-4ccc-b313-db08290f376f",
  "scope": "mcp:tools"
}.[Signature]
```

> Embedded Audience

1. Notice the `aud` claim **embedded** in the **token**
2. it’s currently set to be the **URI** of the **test MCP server** and it’s **inferred** from the scope that we’ve previously configured.
3. This will be important in our implementation to **validate**.

## MCP Server Setup

1. We will now set up our **MCP server** to use the **locally-running** <u>Keycloak authorization server</u>.
2. Depending on your **programming language** preference, you can use one of the supported [MCP SDKs](https://modelcontextprotocol.io/docs/sdk).

![image-20260311140951291](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311140951291.png)

![image-20260311141142942](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311141142942.png)

![image-20260311141227609](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311141227609.png)

1. For our testing purposes, we will create an **extremely simple MCP server** that **exposes two tools**
2. one for **addition** and another for **multiplication**. The server will require **authorization** to access these.

> Python

1. To **simplify** our **authorization interaction**, in Python scenarios we rely on **FastMCP**.
2. Many of the **conventions** around **authorization**, like the **endpoints** and **token validation logic**
   - are **consistent across languages**, but some offer **simpler ways** of **integrating** them in production scenarios.
3. Prior to writing the actual server, we need to set up our configuration in `config.py`
   - the contents are entirely based on your **local server setup**:

```python
"""Configuration settings for the MCP auth server."""

import os
from typing import Optional


class Config:
    """Configuration class that loads from environment variables with sensible defaults."""

    # Server settings
    HOST: str = os.getenv("HOST", "localhost")
    PORT: int = int(os.getenv("PORT", "3000"))

    # Auth server settings
    AUTH_HOST: str = os.getenv("AUTH_HOST", "localhost")
    AUTH_PORT: int = int(os.getenv("AUTH_PORT", "8080"))
    AUTH_REALM: str = os.getenv("AUTH_REALM", "master")

    # OAuth client settings
    OAUTH_CLIENT_ID: str = os.getenv("OAUTH_CLIENT_ID", "test-client")
    OAUTH_CLIENT_SECRET: str = os.getenv("OAUTH_CLIENT_SECRET", "ZPdF24mawV9BifgOef3GvUkfqYGGYs9k")

    # Server settings
    MCP_SCOPE: str = os.getenv("MCP_SCOPE", "mcp:tools")
    OAUTH_STRICT: bool = os.getenv("OAUTH_STRICT", "false").lower() in ("true", "1", "yes")
    TRANSPORT: str = os.getenv("TRANSPORT", "streamable-http")

    @property
    def server_url(self) -> str:
        """Build the server URL."""
        return f"http://{self.HOST}:{self.PORT}"

    @property
    def auth_base_url(self) -> str:
        """Build the auth server base URL."""
        return f"http://{self.AUTH_HOST}:{self.AUTH_PORT}/realms/{self.AUTH_REALM}/"

    def validate(self) -> None:
        """Validate configuration."""
        if self.TRANSPORT not in ["sse", "streamable-http"]:
            raise ValueError(f"Invalid transport: {self.TRANSPORT}. Must be 'sse' or 'streamable-http'")


# Global configuration instance
config = Config()
```

> The server implementation is as follows:

```python
import datetime
import logging
from typing import Any

from pydantic import AnyHttpUrl

from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp.server import FastMCP

from config import config
from token_verifier import IntrospectionTokenVerifier

logger = logging.getLogger(__name__)


def create_oauth_urls() -> dict[str, str]:
    """Create OAuth URLs based on configuration (Keycloak-style)."""
    from urllib.parse import urljoin

    auth_base_url = config.auth_base_url

    return {
        "issuer": auth_base_url,
        "introspection_endpoint": urljoin(auth_base_url, "protocol/openid-connect/token/introspect"),
        "authorization_endpoint": urljoin(auth_base_url, "protocol/openid-connect/auth"),
        "token_endpoint": urljoin(auth_base_url, "protocol/openid-connect/token"),
    }


def create_server() -> FastMCP:
    """Create and configure the FastMCP server."""

    config.validate()

    oauth_urls = create_oauth_urls()

    token_verifier = IntrospectionTokenVerifier(
        introspection_endpoint=oauth_urls["introspection_endpoint"],
        server_url=config.server_url,
        client_id=config.OAUTH_CLIENT_ID,
        client_secret=config.OAUTH_CLIENT_SECRET,
    )

    app = FastMCP(
        name="MCP Resource Server",
        instructions="Resource Server that validates tokens via Authorization Server introspection",
        host=config.HOST,
        port=config.PORT,
        debug=True,
        streamable_http_path="/",
        token_verifier=token_verifier,
        auth=AuthSettings(
            issuer_url=AnyHttpUrl(oauth_urls["issuer"]),
            required_scopes=[config.MCP_SCOPE],
            resource_server_url=AnyHttpUrl(config.server_url),
        ),
    )

    @app.tool()
    async def add_numbers(a: float, b: float) -> dict[str, Any]:
        """
        Add two numbers together.
        This tool demonstrates basic arithmetic operations with OAuth authentication.

        Args:
            a: The first number to add
            b: The second number to add
        """
        result = a + b
        return {
            "operation": "addition",
            "operand_a": a,
            "operand_b": b,
            "result": result,
            "timestamp": datetime.datetime.now().isoformat()
        }

    @app.tool()
    async def multiply_numbers(x: float, y: float) -> dict[str, Any]:
        """
        Multiply two numbers together.
        This tool demonstrates basic arithmetic operations with OAuth authentication.

        Args:
            x: The first number to multiply
            y: The second number to multiply
        """
        result = x * y
        return {
            "operation": "multiplication",
            "operand_x": x,
            "operand_y": y,
            "result": result,
            "timestamp": datetime.datetime.now().isoformat()
        }

    return app


def main() -> int:
    """
    Run the MCP Resource Server.

    This server:
    - Provides RFC 9728 Protected Resource Metadata
    - Validates tokens via Authorization Server introspection
    - Serves MCP tools requiring authentication

    Configuration is loaded from config.py and environment variables.
    """
    logging.basicConfig(level=logging.INFO)

    try:
        config.validate()
        oauth_urls = create_oauth_urls()

    except ValueError as e:
        logger.error("Configuration error: %s", e)
        return 1

    try:
        mcp_server = create_server()

        logger.info("Starting MCP Server on %s:%s", config.HOST, config.PORT)
        logger.info("Authorization Server: %s", oauth_urls["issuer"])
        logger.info("Transport: %s", config.TRANSPORT)

        mcp_server.run(transport=config.TRANSPORT)
        return 0

    except Exception:
        logger.exception("Server error")
        return 1


if __name__ == "__main__":
    exit(main())

```

1. Lastly, the **token verification logic** is delegated entirely to `token_verifier.py`
2. ensuring that we can use the **Keycloak introspection endpoint** to **verify** the **validity** of **any credential artifacts**

```python
"""Token verifier implementation using OAuth 2.0 Token Introspection (RFC 7662)."""

import logging
from typing import Any

from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.shared.auth_utils import check_resource_allowed, resource_url_from_server_url

logger = logging.getLogger(__name__)


class IntrospectionTokenVerifier(TokenVerifier):
    """Token verifier that uses OAuth 2.0 Token Introspection (RFC 7662).
    """

    def __init__(
        self,
        introspection_endpoint: str,
        server_url: str,
        client_id: str,
        client_secret: str,
    ):
        self.introspection_endpoint = introspection_endpoint
        self.server_url = server_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.resource_url = resource_url_from_server_url(server_url)

    async def verify_token(self, token: str) -> AccessToken | None:
        """Verify token via introspection endpoint."""
        import httpx

        if not self.introspection_endpoint.startswith(("https://", "http://localhost", "http://127.0.0.1")):
            return None

        timeout = httpx.Timeout(10.0, connect=5.0)
        limits = httpx.Limits(max_connections=10, max_keepalive_connections=5)

        async with httpx.AsyncClient(
            timeout=timeout,
            limits=limits,
            verify=True,
        ) as client:
            try:
                form_data = {
                    "token": token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                }
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                response = await client.post(
                    self.introspection_endpoint,
                    data=form_data,
                    headers=headers,
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                if not data.get("active", False):
                    return None

                if not self._validate_resource(data):
                    return None

                return AccessToken(
                    token=token,
                    client_id=data.get("client_id", "unknown"),
                    scopes=data.get("scope", "").split() if data.get("scope") else [],
                    expires_at=data.get("exp"),
                    resource=data.get("aud"),  # Include resource in token
                )

            except Exception as e:
                return None

    def _validate_resource(self, token_data: dict[str, Any]) -> bool:
        """Validate token was issued for this resource server.

        Rules:
        - Reject if 'aud' missing.
        - Accept if any audience entry matches the derived resource URL.
        - Supports string or list forms per JWT spec.
        """
        if not self.server_url or not self.resource_url:
            return False

        aud: list[str] | str | None = token_data.get("aud")
        if isinstance(aud, list):
            return any(self._is_valid_resource(a) for a in aud)
        if isinstance(aud, str):
            return self._is_valid_resource(aud)
        return False

    def _is_valid_resource(self, resource: str) -> bool:
        """Check if the given resource matches our server."""
        return check_resource_allowed(self.resource_url, resource)
```

> 启动并测试 MCP Server

![image-20260311144403007](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311144403007.png)

![image-20260311144305004](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311144305004.png)

#  Testing the MCP Server

## Visual Studio Code

1. For testing purposes, we will be using **Visual Studio Code**
   - but any **client** that **supports MCP** and the **new authorization specification** will fit.
2. Press **Cmd + Shift + P** and select **MCP: Add server…**. Select **HTTP** and enter `http://localhost:3000`.
3. Give the **server** a **unique name** to be used inside Visual Studio Code.
4. In `mcp.json` you should now see an entry like this:

```json
"my-mcp-server-18676652": {
  "url": "http://localhost:3000",
  "type": "http"
}
```

**On connection**, you will be **taken** to the **browser**, where you will be **prompted to consent** to **Visual Studio Code** having **access** to the `mcp:tools` scope.

![image-20260311144724971](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311144724971.png)

![image-20260311144946933](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311144946933.png)

**After consenting**, you will see the **tools listed** right above the server entry in `mcp.json`.

![image-20260311145111878](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311145111878.png)

![image-20260311145209554](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311145209554.png)

You will be able to **invoke individual tools** with the help of the `#` sign in the **chat view**.

![image-20260311145420987](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311145420987.png)

![image-20260311145737215](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311145737215.png)

## Claude Code

> ~/.claude.json

```json
"mcpServers": {
	"mcp-keycloak-auth": {
      "type": "http",
      "url": "http://localhost:3000"
    }
}
```

![image-20260311155441764](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311155441764.png)

![image-20260311155608344](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311155608344.png)

![image-20260311155736254](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311155736254.png)

![image-20260311155802765](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311155802765.png)

![image-20260311155830848](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311155830848.png)

![image-20260311160016869](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311160016869.png)

![image-20260311160102941](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311160102941.png)

# Common Pitfalls and How to Avoid Them

1. For **comprehensive security guidance**, including **attack vectors**, **mitigation strategies**, and implementation best practices,
2. make sure to read through [Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices). A few **key issues** are called out below.

## Do not implement token validation or authorization logic by yourself. 

1. Use **off-the-shelf**, **well-tested**, and **secure libraries** for things like **token validation** or **authorization decisions**.
2. **Doing everything from scratch** means that you’re more likely to implement things **incorrectly** unless you are a <u>security expert</u>.

![image-20260311153759657](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311153759657.png)

## Use short-lived access tokens

1. Depending on the **authorization server** used, this setting might be **customizable**.
2. We recommend to **not use long-lived tokens**
3. if a malicious actor **steals** them, they will be able to **maintain** their **access** for **longer periods**.

![image-20260311153845043](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311153845043.png)

## Always validate tokens

1. Just because your server received a token does not mean that the **token is valid** or that it’s meant **for your server**.
2. **Always verify** that what your **MCP server** is getting from the client matches the **required constraints**.

![image-20260311154007952](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154007952.png)

## Store tokens in secure, encrypted storage

1. In certain scenarios, you might need to **cache tokens server-side**.
2. If that is the case, ensure that the **storage** has the **right access controls** and **cannot be easily exfiltrated**
   - by **malicious parties** with access to your **server**.
3. You should also implement **robust cache eviction policies**
   - to ensure that your **MCP server** is **not re-using expired** or **otherwise invalid tokens**.

![image-20260311154107988](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154107988.png)

## Enforce HTTPS in production

1. Do not **accept tokens** or **redirect callbacks** over **plain HTTP** except for `localhost` during **development**.

![image-20260311154148696](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154148696.png)

## Least-privilege scopes

1. Don’t use **catch‑all scopes**.
2. **Split access** per **tool** or **capability** where possible and **verify required scopes per route/tool** on the **resource server**.

![image-20260311154252686](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154252686.png)

## Don’t log credentials

1. Never log `Authorization` headers, **tokens**, **codes**, or **secrets**.
2. Scrub query strings and headers.
3. **Redact sensitive fields** in structured logs.

![image-20260311154312439](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154312439.png)

## Separate app vs. resource server credentials

1. Don’t **reuse** your **MCP server’s client secret** for **end‑user flows**.
2. **Store all secrets** in a **proper secret manager**, <u>not in source control</u>.

![image-20260311154415882](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154415882.png)

## Return proper challenges

1. On 401, include `WWW-Authenticate` with `Bearer`, `realm`, and `resource_metadata`
2. so **clients** can **discover how to authenticate**.

![image-20260311154516521](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154516521.png)

## DCR (Dynamic Client Registration) controls

1. If enabled, be aware of **constraints specific** to your **organization**
   - such as **trusted hosts**, required **vetting**, and **audited registrations**.
2. **Unauthenticated DCR** means that **anyone** can **register any client** with your **authorization server**.

![image-20260311154618558](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154618558.png)

## Multi‑tenant/realm mix-ups

1. Pin to a **single issuer/tenant** unless **explicitly** multi‑tenant.
2. **Reject tokens** from **other realms** even if signed by the **same authorization server**.

![image-20260311154716324](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154716324.png)

## Audience/resource indicator misuse

1. Don’t **configure** or **accept** <u>generic audiences</u> (like `api`) or <u>unrelated resources</u>.
2. Require the **audience/resource** to match your **configured server**.

![image-20260311154800724](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154800724.png)

## **Error detail leakage**

1. Return **generic messages** to **clients**, but **log detailed reasons** with **correlation IDs internally**
1. to **aid troubleshooting without exposing internals**.

![image-20260311154829989](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154829989.png)

## Session identifier hardening

1. Treat `Mcp-Session-Id` as **untrusted input**; never tie **authorization** to it.
2. **Regenerate** on **auth changes** and **validate lifecycle server‑side**.

![image-20260311154922327](https://mcp-1253868755.cos.ap-guangzhou.myqcloud.com/image-20260311154922327.png)

# Related Standards and Documentation

> **MCP authorization** builds on these **well-established standards**

| Standards        | Desc                                    |
| ---------------- | --------------------------------------- |
| <u>OAuth 2.1</u> | The core authorization framework        |
| <u>RFC 8414</u>  | Authorization Server Metadata discovery |
| <u>RFC 7591</u>  | Dynamic Client Registration             |
| <u>RFC 9728</u>  | Protected Resource Metadata             |
| <u>RFC 8707</u>  | Resource Indicators                     |

> For additional details, refer to

1. [Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
2. [Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
3. [Available MCP SDKs](https://modelcontextprotocol.io/docs/sdk)
