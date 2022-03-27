---
title: Infrastructure - Authentication - Scheme
mathjax: false
date: 2022-03-26 00:06:25
categories:
    - Infrastructure
    - Authentication
tags:
    - Infrastructure
    - Authentication
---

# Concept

## Secrets and Keys

> Authentication is **the art of unlocking things with a secret**. At the heart of every authentication is a **shared secret**!

1. The secret has **two copies**.
   - One copy is with the **system** and the other copy is with **you**.
   - Your copy is what is called the *private* key.
   - The server only has a **highly encrypted version of the secret**; it doesn’t know what the decrypted value would look like.
     - That’s why if you forget your password, you’d need to reset it.
2. Public and Private Keys
   - Your copy which is the private key, and the other is the public key that’s accessible to anyone.

<!-- more -->

## Factors

> Factors authenticate you by **who you are**, **what do you know**, and **what do you have**.
> In addition to username and password, authentication can include **additional information** called *factors*.

1. **Single Factor**
   - this is the **username and password** that we talked about. This is the “**who you are**” type of auth.
2. **Two Factor**
   - Along with the username and password, you need to **answer another secret question** that you set up while signing up. So you have 2 secrets keys. One for **who you are** and the other for **what you know**.
3. **Multi-Factor** Authentication (**MFA**)
   - This is the **hardest** to crack.
   - When you use your first secret key, the server sends you **another secret key** to the secret location that you mutually agreed on during the sign-up process (usually people set this as their **phone number** or their **email address**). This second secret key is usually valid for only a few minutes.
   - This takes care of **who you are**, and **what you have** (the cell phone) type of auth.
4. **Biometric** authentication
   - This is the **fingerprint ID** that is becoming a common part of authenticating on the mobile.
   - This is an automated “**who you are**” type of auth where you’re not required to manually type in a username and password.
5. **Captchas**
   - One where you have to decipher the squiggly words that you see and type those in.
   - The other where you have to identify mountains, or cars, or storefronts, or any number of things in a grid of pictures.

## Authentication and Authorization

1. **Authentication happens before Authorization**.
2. Authentication gets you logged into the server.
   - Authentication is negotiated with **usernames**, **passwords**, and other **factors** we talked about.
3. Authorization gets you access to the resources on the server.
   - Authorization is negotiated based on **policies on the account**.

# Scheme

> Being **stateless**, the REST API can’t remember your credentials. So you have to tell it who you are **every time** you talk to it!

## Basic Authentication

1. Have the user type in a **username** and a **password** to identify themselves every time you send in a request.
2. In the standard HTTP specification, there is an **Authorization** header field that can be used for this purpose. The username and password are encoded with **Base 64 encoding**.
3. The interceptor can copy that gibberish and stick it into an online decoder to get back your username and password.
   - This is called a **Man-In-The-Middle** (MiTM) attack.

## Token-Based Authentication

1. In this scheme, the user will type in their username and password (**credentials**), and the server will **generate a token based on those credentials**.
2. The server then sends this token out to the user and it also stores a copy of it in the database.
3. Now the user has **exchanged** the credentials for a server-generated token.
   - Now the user doesn’t need to send in login credentials with every request. Instead, they just send in the encoded token.
4. There are ways to encode **date** and **time** into this token so someone intercepting the token cannot **re-use** it after a certain time.
5. The user will need to **pass this token** through either the header, body, or as a query parameter when it calls on an endpoint to access resources.
6. The token can be set to **expire** after a certain amount of time so users will need to log in again. Tokens can also be **revoked** from the server-side if there has been any compromise.
7. The most popular format for tokens is **Jason Web Tokens** (JWT).
   - The fields of the token are key/value pairs. The keys are called claims.
   - **JWT Tokens are negotiated based on the OpenID Connect protocol (OIDC)**.

## API Key and Client Secret

1. The client that needs access to the resources needs to register itself with the API.
   - **The API generates a Key and a Secret for each registered client.**
2. These are then stored with the server, and a copy of these are sent to the client. The client will need to pass these in when they try to connect.
3. Problem
   - This is **hard to scale**.
   - **key management** -- get **complicated**
     - That’s why some organizations prefer to hire a **3rd party service** to do this.
4. If you want to do it yourself instead of hiring a 3rd party service, you’ll want to **automate** the **key generation** and **exchange** so you can **scale**.
   - The need for this automation is one of the main reasons an **authorization framework** like **OAuth** was developed.

## OAuth 2.0 (Open Authorization)

1. **OAuth automates the key generation and exchange**.
2. When an app needs your permission/authorization to access data on your behalf it’ll ask you to log in to the API provider.
3. OAuth flow
   - You go to the bank, show your ID
     - authenticate yourself
   - Tell them you want Joe to have access to your account
     - Authorize Joe
   - Give the bank Joe’s email address so the bank can send Joe an access token
     - API Provider calls a website redirect URI with the access token in the response body
   - Joe brings the access token to the bank along with his ID
     - Client authenticates themselves and presents access token
   - The bank grants Joe access to your account
     - API provider grants client access to your resources

# Reference

1. [The Auth Schemes of REST](https://medium.com/future-vision/the-great-authenticators-of-rest-738e81109331)