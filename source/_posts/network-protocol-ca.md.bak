---
title: 网络协议 -- CA证书签署
mathjax: false
date: 2019-08-04 23:17:09
categories:
    - Network
    - Protocol
tags:
    - Network
    - Network Protocol
    - HTTPS
    - CA
---

## CA签名的价值
1. 服务器的公钥是公开的，客户端需要自行判断与之通信的服务器是不是公钥的持有人
2. 假设客户端想要和163.com建立安全连接，需要用某个**公钥**去验证服务器
    - 公钥是由服务器发送给客户端的，用服务器发送过来的公钥去验证它自己，并不能证明该服务器是163.com的合法代表
    - _**公钥本身只能证明你是你，但不能证明你是谁**_
3. 因此，服务器为了让客户端相信自己是163.com，除了提供自身的**公钥**外，还会提供**CA签名**（用**CA私钥**加密的）
    - CA签名的内容：_**此公钥是163.com的合法代表**_
    - CA签名的本质：把一个**公钥**和一个**域名**关联起来，解决了**你是谁**的问题
4. 怎么证明CA签名就是由CA签署的？
    - **CA公钥也是公开的**，只要用CA公钥去解密CA签名，就能看到里面的具体内容，也能证明是由CA签署的
5. 怎么证明拿到的CA公钥就能代表CA？
    - 回到了CA自身的身份无法确定，这种循环的论证有个源头，那就是**根CA**，而**根CA**的公钥一般**内置**在程序中
    - 对**根CA**，程序是**无条件信任**的

<!-- more -->

## 生成CA私钥
CA比较重要，所以密钥长度选择为**4096**，**安全性更高**，`-aes256`会要求输入**私钥保护密码**，私钥本身以**密文**保存
```
$ openssl genrsa -aes256 -out ca-key.pem 4096
Generating RSA private key, 4096 bit long modulus
Enter pass phrase for ca-key.pem:
Verifying - Enter pass phrase for ca-key.pem:

$ cat ca-key.pem
-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,38908CEC7277A03CA1C41F8C1B04F27C

poLn6xnmwpHEDfNccDLn8wkm4pjeYORTL+UYWBDkPeLycpBAfbpLEKmJVZ5skXDf
...
01wIyHRYXBOyZcf8oL3XX9lunFLSmVGfxnLAyeQyuPEAGti2Ejg90qphn1K7ut/+
-----END RSA PRIVATE KEY-----
```

### 解密CA私钥
ca.key是一个_**裸私钥**_
```
$ openssl rsa -in ca-key.pem -out ca.key
Enter pass phrase for ca-key.pem:
writing RSA key

$ cat ca.key
-----BEGIN RSA PRIVATE KEY-----
MIIJJwIBAAKCAgEAwXyEyA/6JVNgnJHqAqk8cZ2Xgh9/SLh/3T6VnfZTzmByHUT6
...
PrpFYs0skhhtqrbdP/pod0VD4ZZLIBtmikuJCTw4ZJ7hPCC9KQJCls1HYg==
-----END RSA PRIVATE KEY-----
```

### 生成CA公钥
RSA密钥都是**一对**的，**公钥是根据私钥生成的**，由于RSA的**非对称性**，_**私钥算出公钥很容易，但公钥算出私钥却很难**_
```
$ openssl rsa -in ca.key -pubout -out ca.pub
writing RSA key

$ cat ca.pub
-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAwXyEyA/6JVNgnJHqAqk8
...
1NTBk+ZgGdemt75WzmuTvx8CAwEAAQ==
-----END PUBLIC KEY-----
```

## 生成CA证书
```
$ openssl req -new -x509 -days 365 -key ca-key.pem -sha256 -subj '/' -out ca.pem
Enter pass phrase for ca-key.pem:

$ cat ca.pem
-----BEGIN CERTIFICATE-----
MIIEfDCCAmQCCQCJX/8al7r/MzANBgkqhkiG9w0BAQsFADAAMB4XDTE5MDgxOTAz
...
nSQFJiCLDb0zTItAkZdlxc+C5ZmBx8HethzWrKoMthyP1osm+i4a0ukHYkLa1LBv
-----END CERTIFICATE-----
```
1. 从**证明是谁**的角度来看，该CA证书没有什么意义
    - 参数里面只提供了CA的私钥（很容易算出对应的公钥），但`-subj`并没有指定公钥是谁，拥有哪个域名
2. 在这里把该CA证书当成**根CA证书**，而根CA证书是**直接内嵌**到软件中的，**无条件信任**，至于它是谁并不重要
3. 当验证一个**普通证书**的时候，验证的是**普通证书的签名方是不是根CA**，这只需用**根CA的公钥**去解码签名信息即可

## 生成服务器私钥
```
$ openssl genrsa -out server-key.pem 4096
Generating RSA private key, 4096 bit long modulus

$ cat server-key.pem
-----BEGIN RSA PRIVATE KEY-----
MIIJKgIBAAKCAgEAvnWnnYXBpdHn1llmbjpZ+2Df9n4zDejNLlnLIvuvT4lUzcg2
...
nRD5RyqtJFvkwZFTMrB3UhtUIF+dM6z4t2iTsXF7dif9eIZJEVXXG8QtmTlg1g==
-----END RSA PRIVATE KEY-----
```

## 生成服务器证书

### 生成证书申请请求
```
$ openssl req -subj "/CN=zhongmingmao.me" -sha256 -new -key server-key.pem -out server.csr

$ cat server.csr
-----BEGIN CERTIFICATE REQUEST-----
MIIEXzCCAkcCAQAwGjEYMBYGA1UEAwwPemhvbmdtaW5nbWFvLm1lMIICIjANBgkq
...
V4rOItR6nYLzeGrXVH07DPeIYg==
-----END CERTIFICATE REQUEST-----
```
1. 证书的作用：把一个**公钥**和一个**域名**关联起来
2. 对浏览器而言，检查一个HTTPS网站是否有效，就是要看**证书里面的`/CN`字段**是否等于**正在访问的域名**

### 用CA证书签名
```
$ openssl x509 -req -days 365 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem
Signature ok
subject=/CN=zhongmingmao.me
Getting CA Private Key
Enter pass phrase for ca-key.pem:

$ cat server-cert.pem
-----BEGIN CERTIFICATE-----
MIIEljCCAn4CCQCiOf0vbsy3ljANBgkqhkiG9w0BAQsFADAAMB4XDTE5MDgxOTAz
...
hQCk+kTITJuoH4ADvldnalmAwsqBBuSca2Y=
-----END CERTIFICATE-----
```
1. 签名需要**CA证书**，用来表明该服务器证书是**谁签署**的
2. 签名需要**CA私钥**，用来**生成摘要**保证**签名内容不被修改**
3. server-cert.pem就是已经被CA证书签名过的服务器证书，主要包含两部分内容
    - 服务器的**公钥**（**你是你**）
    - 服务器的**身份**（**你是谁**，`/CN`）

## 查看服务器证书
```
$ openssl x509 -in server-cert.pem -noout -text
Certificate:
    Data:
        Version: 1 (0x0)
        Serial Number: 11689652687981033366 (0xa239fd2f6eccb796)
    Signature Algorithm: sha256WithRSAEncryption
        Issuer:
        Validity
            Not Before: Aug 19 03:53:44 2019 GMT
            Not After : Aug 18 03:53:44 2020 GMT
        Subject: CN=zhongmingmao.me
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (4096 bit)
                Modulus:
                    00:be:75:a7:9d:85:c1:a5:d1:e7:d6:59:66:6e:3a:
                    ...
                    3a:6a:e9
                Exponent: 65537 (0x10001)
    Signature Algorithm: sha256WithRSAEncryption
         a5:b9:65:10:4e:46:50:1e:3f:b0:ae:3f:bf:a0:88:94:e4:e2:
         ...
         c2:ca:81:06:e4:9c:6b:66
```

## 小结
1. 上述过程中总共两类文件：**密钥**、**证书**（csr是中间文件）
2. 私钥是保密的，不能分发，可以生成单独的公钥文件发布
3. 使用证书是更好的选择，因为证书里面不仅包含**公钥**，还提供了该**公钥的身份信息**用于校验
    - 哪怕签署时什么身份信息都没填，至少也能表明**被某CA签署过**

## 参考资料
[openssl走一轮CA证书签发的过程和各个文件作用](https://fatfatson.github.io/2018/07/27/openssl%E8%B5%B0%E4%B8%80%E8%BD%AECA%E8%AF%81%E4%B9%A6%E7%AD%BE%E5%8F%91%E7%9A%84%E8%BF%87%E7%A8%8B%E5%92%8C%E5%90%84%E4%B8%AA%E6%96%87%E4%BB%B6%E4%BD%9C%E7%94%A8/)
