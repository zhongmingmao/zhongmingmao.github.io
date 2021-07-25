---
title: Web -- Cookie
mathjax: false
date: 2021-07-25 08:30:07
categories:
    - Web
tags:
    - Web
---

# 背景
> 之前的工作接触Cookie相关的内容比较少，故记录下相关领域知识，以作备忘

# Cookie是什么

1. Cookie是浏览器存储在用户电脑上的一小段文本文件
2. Cookie为纯文本格式，不包含任何可执行的代码
3. 一个Web页面或者服务器告知浏览器按照一定规范来存储Cookie，并在随后的请求中将这些信息发送至服务器
   - Web服务器可以通过使用这些信息来识别不同的用户
4. 大多数需要登录的网站在用户验证成功后都会设置一个Cookie
   - 只要该Cookie存在并且合法，用户就可以自由浏览该网站的任意页面

<!-- more -->

# 创建Cookie

```
== HTTP Response
Set-Cookie: value[; expires=date][; domain=domain][; path=path][; secure]

== HTTP Request
Cookie: value
```

1. Web服务器通过发送一个名为**Set-Cookie**的HTTP的Header来创建一个Cookie
   - value：通常为`name=value`的格式
   - 通过Set-Cookie指定的可选项**只会在浏览器端使用**，而不会被再次发送至服务器
2. Cookie会在随后的每次请求中被发送至服务器，存储在名为Cookie的HTTP的Header，**只会包含Cookie的value**
   - 发送至服务器的Cookie与通过Set-Cookie指定的值完全一样，不会有进一步的**解析**或者**转码**操作

# Cookie编码

1. RPC规范：只有三个字符（**分号**、**逗号**、**空格**）必须进行编码
2. 几乎所有的实现都对Cookie的值进行一系列的URL编码
3. 对于`name=value`格式，通常会对`name`和`value`分别进行编码，而不会对`=`进行编码

# Cookie选项

> 每个选项都指定了**Cookie在何种情况下应该被发送至服务器**

## expires

1. 指定了**何时**不再被发送至服务器，随后浏览器将**删除**该Cookie
2. 格式：`Wdy, DD-Mon-YYYY HH:MM:SS GMT`
3. 如果没有设置expires选项，Cookie的生命周期仅限于**当前会话**中，**关闭浏览器**意味着这次会话结束
4. 如果expires设置为一个过去的时间点，那么该Cookie会被立即删掉

## domain -- 尾部匹配

1. 指定了Cookie将要被发送至**哪些域**中
2. 默认情况下，domain会被设置为创建该Cookie的页面所在的域，所以当给相同域名发送请求时该Cookie会被发送至服务器
3. yahoo.com、a.yahoo.com、b.yahoo.com
   - 如果将Cookie的domain设置成yahoo.com，那么该Cookie可以发送至yahoo.com、a.yahoo.com、b.yahoo.com
   - 浏览器会把domain的值与请求的域名进行**尾部匹配**，匹配成功才会将Cookie发送至服务器
4. domain的值必须是发送Set-Cookie的Header的**主机名的一部分**，不合法的domain会被直接忽略掉

## path -- 头部匹配

1. 指定了请求的资源URL中必须存在指定的路径时，才会发送Cookie
   - 将path选项的值与请求的URL进行**头部匹配**，匹配成功才发送Cookie
   - `Set-Cookie: name=zhongmingmao; path=/x`，该path与`/x`、`/xy`都是匹配的
2. path的默认值：发送Set-Cookie的Header所对应的URL的path部分
3. 核实顺序：**domain -> path**

## secure

1. 该选项只是**标记**没有值
2. 只有当一个请求通过SSL或者HTTPS创建时，包含secure选项的Cookie才能被发送至服务器
   - 这类Cookie一般具有较高的价值，通过HTTP传输，可能会被篡改
   - 但由于整个Cookie机制都是不安全的，因此机密信息不应该在Cookie中存储或者传递
3. 默认情况下，HTTPS链接上传输的Cookie都会被自动加上secure选项

# Cookie的维护与生命周期

一个Cookie中可以指定**任意数量任意顺序**的选项

```
Set-Cookie: name=zhongmingmao; domain=zhongmingmao.me; path=/blog
```

该Cookie有4个标识符：`name`、`domain`、`path`、`secure`
如果想要改变该Cookie的值，需要发送另一个具有**相同标识符**的Set-Cookie的Header

```
Set-Cookie: name=zhongmingwu; domain=zhongmingmao.me; path=/blog
```

修改Cookie的任意选项都将创建一个完全不同的新Cookie，会存在两个名同为name的不同Cookie

```
Set-Cookie: name=zhongmingmao; domain=zhongmingmao.me; path=/
```

如果此时访问`zhongmingmao.me/blog`，请求头的Cookie为`Cookie: name=zhongmingwu; name=zhongmingmao`
按照**`domain-path-secure`**的顺序，设置越详细的Cookie越靠前

# Cookie的失效日期

1. 当Cookie创建时指定了失效日期，这个失效日期则关联了以**`name-domain-path-secure`**为标识的Cookie
2. 当修改一个Cookie的值时，不需要每次都设置失效日期，因为它并不是Cookie标识信息的组成部分
3. 只有手工修改Cookie的失效日期，否则Cookie的失效日期是**不会改变**的
4. 转换
   - 会话Cookie -> 持久化Cookie
     - 设置expires为将来的一个时间
   - **持久化Cookie -> 会话Cookie**
     - 删除持久化Cookie（设置expires为过去的某个时间）
     - 创建一个同名的Cookie

# Cookie的自动删除

1. 会话Cookie（Session Cookie）：会话结束（浏览器关闭）
2. 持久化Cookie（Persistent Cookie）：到达失效日期
3. 浏览器中的Cookie数量达到限制

# HTTP-Only Cookie

1. 告知浏览器该Cookie不能通过JS的document.cookie属性来访问
2. 目的：提供一个安全措施来帮助阻止通过JS发起的**XSS**攻击来窃取Cookie的行为

```
Set-Cookie: name=zhongmingmao; HttpOnly
```





