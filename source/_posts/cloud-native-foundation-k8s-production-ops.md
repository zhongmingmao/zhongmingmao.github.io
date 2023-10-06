---
title: Kubernetes - Production Ops
mathjax: false
date: 2022-12-14 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/k8s-ops.jpeg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 镜像仓库

![image-20231004222139459](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231004222139459.png)

<!-- more -->

1. 镜像仓库（`Registry`）负责`存储`、`管理`和`分发`镜像
2. `Registry` 管理多个 `Repository`（通过`命名`区分）
3. 每个 `Repository` 包含一个或多个镜像（通过`镜像名`和`标签`区分）
4. 客户端拉取镜像：`Registry/Repository/Image:Tag`

## 分发规范

> 镜像仓库应遵循 `OCI Distribution Spec`

| HTTP Verb | URL                                   | Desc                               |
| --------- | ------------------------------------- | ---------------------------------- |
| GET       | /v2/                                  | 检查 `Registry` 实现的规范和版本   |
| GET       | /v2/_catalog                          | 获取 `Repository` 列表             |
| GET       | /v2/<name>/tags/list                  | 获取某个 `Repository` 下所有的标签 |
| PUT       | /v2/<name>/manifests/<reference>      | 上传 `Image` 的 manifest 信息      |
| DELETE    | /v2/<name>/manifests/<reference>      | 删除 `Image`                       |
| GET       | /v2/<name>/manifests/<reference>      | 获取某个  `Image` 的 manifest 信息 |
| GET       | /v2/<name>/blobs/<digest>             | 获取某个  `Image` 的文件层         |
| POST      | /v2/<name>/blobs/uploads/             | 启动某个  `Image` 的上传           |
| PUT       | /v2/<name>/blobs/uploads/<session_id> | 结束文件层上传                     |

> curl -s -u name:pass ${Registry}/v2/${Repository}/manifests/${Tag} | jq

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "config": {
    "mediaType": "application/vnd.docker.container.image.v1+json",
    "size": 7501,
    "digest": "sha256:999361eb9282b13cf4752b48e81fb6cb9680e49267c764d42a0d826895676240"
  },
  "layers": [
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 73358335,
      "digest": "sha256:840caab23da4da8d08d9e3ba17d613cdb42ae4dd0679cbb9ff4ff457155701e2"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 152902661,
      "digest": "sha256:d882a31913c4087426ead7002410e53890b4b84fb42288d1136fc84c204b3110"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 972,
      "digest": "sha256:eac713f6fddb8734b2307fa515f73cb25a33e529e674c25ac541dee3f91f80f3"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 2923,
      "digest": "sha256:a951ea919797eb7d65588ba8d3d86647a637f5ad9bd972be2171b7a2a1b3af21"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 32,
      "digest": "sha256:4f4fb700ef54461cfa02571ae0db9a0dc1e0cdb5577484a6d75e68dc38e8acc1"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 19527096,
      "digest": "sha256:3afdd7c08756f2583fa3697f844f558a2f49ae9d3d34ca4b1fa15f52e8c8c7b1"
    },
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 92879932,
      "digest": "sha256:aad1b2728107315a8465f01631fab1276b5ce0eda95603e163c192023ac498cf"
    }
  ]
}
```

## 元数据 vs 块文件

> 镜像由元数据（`manifests`）和块文件（`blobs`）组成

![image-20231004225259420](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231004225259420.png)

1. 元数据
   - 元数据用于描述一个`镜像的核心信息`
     - Registry / Repository / Image / Checksum / 文件层 / 镜像构建描述
   - 从抽象层面完整地描述一个镜像
     - 镜像是如何构建出来的
     - 运行过什么构建命令
     - 构建的每一个文件层的校验码
     - 镜像标签
     - 镜像的校验码
   - `docker image inspect` 查看的是镜像的元数据信息
2. 块文件
   - 块文件是`组成镜像的联合文件层的实体`
   - 每个块文件是一个`文件层`，内部包含对应文件层的`变更`

> docker image inspect nginx:1.25.2

```json
[
    {
        "Id": "sha256:ab73c7fd672341e41ec600081253d0b99ea31d0c1acdfb46a1485004472da7ac",
        "RepoTags": [
            "nginx:1.25.2"
        ],
        "RepoDigests": [
            "nginx@sha256:104c7c5c54f2685f0f46f3be607ce60da7085da3eaa5ad22d3d9f01594295e9c"
        ],
        "Parent": "",
        "Comment": "",
        "Created": "2023-08-15T23:58:26.480051949Z",
        "Container": "c24a3de5b0d9fe94394b335bfcd832035f985151a4d3e8e8dcfc684fa82a9fed",
        "ContainerConfig": {
            "Hostname": "c24a3de5b0d9",
            "Domainname": "",
            "User": "",
            "AttachStdin": false,
            "AttachStdout": false,
            "AttachStderr": false,
            "ExposedPorts": {
                "80/tcp": {}
            },
            "Tty": false,
            "OpenStdin": false,
            "StdinOnce": false,
            "Env": [
                "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "NGINX_VERSION=1.25.2",
                "NJS_VERSION=0.8.0",
                "PKG_RELEASE=1~bookworm"
            ],
            "Cmd": [
                "/bin/sh",
                "-c",
                "#(nop) ",
                "CMD [\"nginx\" \"-g\" \"daemon off;\"]"
            ],
            "Image": "sha256:a90fccfd0da73d83dde8f65485e6385ae687eda3bc92a430bc952b990f8a331b",
            "Volumes": null,
            "WorkingDir": "",
            "Entrypoint": [
                "/docker-entrypoint.sh"
            ],
            "OnBuild": null,
            "Labels": {
                "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
            },
            "StopSignal": "SIGQUIT"
        },
        "DockerVersion": "20.10.23",
        "Author": "",
        "Config": {
            "Hostname": "",
            "Domainname": "",
            "User": "",
            "AttachStdin": false,
            "AttachStdout": false,
            "AttachStderr": false,
            "ExposedPorts": {
                "80/tcp": {}
            },
            "Tty": false,
            "OpenStdin": false,
            "StdinOnce": false,
            "Env": [
                "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "NGINX_VERSION=1.25.2",
                "NJS_VERSION=0.8.0",
                "PKG_RELEASE=1~bookworm"
            ],
            "Cmd": [
                "nginx",
                "-g",
                "daemon off;"
            ],
            "Image": "sha256:a90fccfd0da73d83dde8f65485e6385ae687eda3bc92a430bc952b990f8a331b",
            "Volumes": null,
            "WorkingDir": "",
            "Entrypoint": [
                "/docker-entrypoint.sh"
            ],
            "OnBuild": null,
            "Labels": {
                "maintainer": "NGINX Docker Maintainers <docker-maint@nginx.com>"
            },
            "StopSignal": "SIGQUIT"
        },
        "Architecture": "arm64",
        "Variant": "v8",
        "Os": "linux",
        "Size": 192063326,
        "VirtualSize": 192063326,
        "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/2b3338c595a735d306d5a3d6ef526b785d61242d6e6601e4ba1eb91fea212ae4/diff:/var/lib/docker/overlay2/6f583281737256bda0ab291b2e16243458e09d76c234b6044fac442cf37e949c/diff:/var/lib/docker/overlay2/0bab1cfc61d232958d69e9eb5623421d5869b8085060c4f9d33e32323c8d1c96/diff:/var/lib/docker/overlay2/ceb0576a280c2350f4359bba9687991e7a1e6afc8fe3b212269e2591e1e213f5/diff:/var/lib/docker/overlay2/b1dfbb1cbfda3b344da3a15c74522e46465a0e67b7220cea4a4d1aa1cd5144c2/diff:/var/lib/docker/overlay2/af1748caeab3243da786f13878790cd3a0a10f25e97898adb7af19de55dde62b/diff",
                "MergedDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/merged",
                "UpperDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/diff",
                "WorkDir": "/var/lib/docker/overlay2/53b48d720d0899c1da2ab07d970b2a633b04cba0f56cfbfc9ba71d4427b57da8/work"
            },
            "Name": "overlay2"
        },
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:1c3daa06574284614db07a23682ab6d1c344f09f8093ee10e5de4152a51677a1",
                "sha256:dcb816d1345ed4a429dec632c0933e2af8887b808259985bfc555d155d8c615d",
                "sha256:8cc0ce26d320f5a342eda516e03ae2bd1ddaa82826b1eed977e3dd484995c2c0",
                "sha256:78cdcd2ba4bbe6067ab5976dd4c38b3a3ad4b8d41c38972a037c9ebd4731988c",
                "sha256:def14911cf6a8e011b5ba8f39441a22097170c433a4905b60ec69e84a9df78fd",
                "sha256:3ccc534e961ca62536dc8629a756fa921e989ba9cc8a5fca617d8ff5e40e7d92",
                "sha256:e005f3c090e08bbf9eb7dd8a289f07124c08556cb959b8aa17dd6e6c8840e4c7"
            ]
        },
        "Metadata": {
            "LastTagTime": "0001-01-01T00:00:00Z"
        }
    }
]
```

```
$ docker history nginx:1.25.2
IMAGE          CREATED       CREATED BY                                      SIZE      COMMENT
ab73c7fd6723   13 days ago   /bin/sh -c #(nop)  CMD ["nginx" "-g" "daemon…   0B
<missing>      13 days ago   /bin/sh -c #(nop)  STOPSIGNAL SIGQUIT           0B
<missing>      13 days ago   /bin/sh -c #(nop)  EXPOSE 80                    0B
<missing>      13 days ago   /bin/sh -c #(nop)  ENTRYPOINT ["/docker-entr…   0B
<missing>      13 days ago   /bin/sh -c #(nop) COPY file:9e3b2b63db9f8fc7…   4.62kB
<missing>      13 days ago   /bin/sh -c #(nop) COPY file:57846632accc8975…   3.02kB
<missing>      13 days ago   /bin/sh -c #(nop) COPY file:3b1b9915b7dd898a…   298B
<missing>      13 days ago   /bin/sh -c #(nop) COPY file:caec368f5a54f70a…   2.12kB
<missing>      13 days ago   /bin/sh -c #(nop) COPY file:01e75c6dd0ce317d…   1.62kB
<missing>      13 days ago   /bin/sh -c set -x     && groupadd --system -…   94.9MB
<missing>      13 days ago   /bin/sh -c #(nop)  ENV PKG_RELEASE=1~bookworm   0B
<missing>      13 days ago   /bin/sh -c #(nop)  ENV NJS_VERSION=0.8.0        0B
<missing>      13 days ago   /bin/sh -c #(nop)  ENV NGINX_VERSION=1.25.2     0B
<missing>      13 days ago   /bin/sh -c #(nop)  LABEL maintainer=NGINX Do…   0B
<missing>      13 days ago   /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>      13 days ago   /bin/sh -c #(nop) ADD file:bc58956fa3d1aff2e…   97.1MB
```

## Harbor

> Harbor 是 VMware 开源的企业级 Registry，已 CNCF 毕业

![image-20231005100705415](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005100705415.png)

### 核心模块

| Module                  | Desc                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Harbor Core             | 仓库管理、认证管理、授权管理、配置管理、项目管理、配额管理、签名管理、副本管理等 |
| Harbor Portal           | Web 界面                                                     |
| Registry                | 负责接收客户端的 `Pull / Push` 请求                          |
| Replication Job Service | 可以以`主从模式`部署 Registry，将镜像从主 Registry 分发到从 Registry |
| Log Collector           | 收集各模块的日志                                             |
| GC Controller           | 回收`删除镜像`（默认只删除元数据）记录后遗留在`块存储`中的`孤立块文件` |

### 核心架构

![image-20231005102126241](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005102126241.png)

### Helm

> 完成安装

```
$ h list -n harbor
NAME  	NAMESPACE	REVISION	UPDATED                                	STATUS  	CHART        	APP VERSION
harbor	harbor   	1       	2022-10-05 14:23:03.129780366 +0800 CST	deployed	harbor-1.13.0	2.9.0

$ k get po -n harbor -owide
NAME                                 READY   STATUS    RESTARTS      AGE   IP               NODE      NOMINATED NODE   READINESS GATES
harbor-core-68bdc76b5d-8lnzt         1/1     Running   5 (17m ago)   27m   192.168.185.12   mac-k8s   <none>           <none>
harbor-database-0                    1/1     Running   0             27m   192.168.185.17   mac-k8s   <none>           <none>
harbor-jobservice-6698b45576-nfbxk   1/1     Running   1 (15m ago)   27m   192.168.185.19   mac-k8s   <none>           <none>
harbor-nginx-67965c8dc-tgr9j         1/1     Running   0             27m   192.168.185.16   mac-k8s   <none>           <none>
harbor-portal-6947675598-brq5g       1/1     Running   0             27m   192.168.185.14   mac-k8s   <none>           <none>
harbor-redis-0                       1/1     Running   0             27m   192.168.185.13   mac-k8s   <none>           <none>
harbor-registry-869779cf47-clpll     2/2     Running   0             27m   192.168.185.18   mac-k8s   <none>           <none>
harbor-trivy-0                       1/1     Running   0             27m   192.168.185.15   mac-k8s   <none>           <none>

$ k get service -n harbor -owide
NAME                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE   SELECTOR
harbor              NodePort    10.106.237.84    <none>        80:30002/TCP,443:30003/TCP   27m   app=harbor,component=nginx,release=harbor
harbor-core         ClusterIP   10.100.49.21     <none>        80/TCP                       27m   app=harbor,component=core,release=harbor
harbor-database     ClusterIP   10.98.161.143    <none>        5432/TCP                     27m   app=harbor,component=database,release=harbor
harbor-jobservice   ClusterIP   10.107.0.117     <none>        80/TCP                       27m   app=harbor,component=jobservice,release=harbor
harbor-portal       ClusterIP   10.104.103.27    <none>        80/TCP                       27m   app=harbor,component=portal,release=harbor
harbor-redis        ClusterIP   10.101.101.122   <none>        6379/TCP                     27m   app=harbor,component=redis,release=harbor
harbor-registry     ClusterIP   10.103.237.253   <none>        5000/TCP,8080/TCP            27m   app=harbor,component=registry,release=harbor
harbor-trivy        ClusterIP   10.101.223.125   <none>        8080/TCP                     27m   app=harbor,component=trivy,release=harbor
```

> Portal

![image-20231005154353843](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005154353843.png)

> 浏览器导出 cer，通过 openssl 转换成 crt

```
$ openssl x509 -inform PEM -in core.harbor.domain.cer -out ca.crt
```

> 为 Docker 配置证书并重启 Docker

```
$ sudo mkdir -p /etc/docker/certs.d/core.harbor.domain
$ sudo cp ca.crt /etc/docker/certs.d/core.harbor.domain/
$ sudo systemctl restart docker
```

> 配置域名解析（IP 为 harbor svc vip）

```
10.106.237.84 core.harbor.domain
```

> 登录

```
$ docker login -u admin -p Harbor12345 core.harbor.domain
WARNING! Using --password via the CLI is insecure. Use --password-stdin.
WARNING! Your password will be stored unencrypted in /home/zhongmingmao/.docker/config.json.
Configure a credential helper to remove this warning. See
https://docs.docker.com/engine/reference/commandline/login/#credentials-store

Login Succeeded
```

> 为镜像打标签并推送到 Harbor

```
$ docker tag nginx:1.25.2 core.harbor.domain/library/nginx:1.25.2

$ docker push core.harbor.domain/library/nginx:1.25.2
The push refers to repository [core.harbor.domain/library/nginx]
e005f3c090e0: Pushed
3ccc534e961c: Pushed
def14911cf6a: Pushed
78cdcd2ba4bb: Pushed
8cc0ce26d320: Pushed
dcb816d1345e: Pushed
1c3daa065742: Pushed
1.25.2: digest: sha256:d204087971390839f077afcaa4f5a771c1694610f0f7cb13a2d2a3aa520b053f size: 1778
```

![image-20231005154326115](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005154326115.png)

> 查询 `repositories` 和 `blobs`

```
$ k exec -it -n harbor harbor-registry-869779cf47-clpll -- bash
Defaulted container "registry" out of: registry, registryctl
harbor [ / ]$ ls /storage/docker/registry/v2/
blobs  repositories
harbor [ / ]$
harbor [ / ]$ cd /storage/docker/registry/v2/
harbor [ /storage/docker/registry/v2 ]$
harbor [ /storage/docker/registry/v2 ]$ ls blobs/
sha256
harbor [ /storage/docker/registry/v2 ]$ ls repositories/
library
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/
nginx
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/nginx/
_layers  _manifests  _uploads
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/nginx/_manifests/
revisions  tags
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/nginx/_manifests/tags/
1.25.2
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/nginx/_manifests/tags/1.25.2/
current  index
harbor [ /storage/docker/registry/v2 ]$ ls repositories/library/nginx/_layers/
sha256
harbor [ /storage/docker/registry/v2 ]$
harbor [ /storage/docker/registry/v2 ]$ du -sh *
64M	blobs
140K	repositories
```

```
$ k exec -it -n harbor harbor-database-0 -- bash
Defaulted container "database" out of: database, data-migrator (init), data-permissions-ensurer (init)
postgres [ / ]$
postgres [ / ]$ psql -U postgres -d postgres -h 127.0.0.1 -p 5432
psql (14.9)
Type "help" for help.

postgres=# \c registry
You are now connected to database "registry" as user "postgres".
registry=#
registry=# select * from harbor_user;
 user_id | username  | email |             password             |    realname    |    comment     | deleted | reset_uuid |               salt               | sysadmin_flag |       creation_time        |        update_time         | password_version
---------+-----------+-------+----------------------------------+----------------+----------------+---------+------------+----------------------------------+---------------+----------------------------+----------------------------+------------------
       2 | anonymous |       |                                  | anonymous user | anonymous user | t       |            |                                  | f             | 2022-10-05 06:34:25.687982 | 2022-10-05 06:34:25.766607 | sha1
       1 | admin     |       | e3f34d1d678a8c1adda9047536c1feb4 | system admin   | admin user     | f       |            | wPKuaGBudkmjRWNR7Q0CUD34z3eTInXZ | t             | 2022-10-05 06:34:25.687982 | 2022-10-05 06:34:25.872904 | sha256
(2 rows)

registry=#
registry=# exit
postgres [ / ]$ exit
exit
```

### HA

![image-20231005151928881](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005151928881.png)

### User

> public 仓库可以直接 pull

| Role      | ACL              |
| --------- | ---------------- |
| Guest     | docker pull      |
| Developer | docker pull/push |
| Admin     | all              |

![image-20231005154502872](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005154502872.png)

### GC

> 镜像删除时，blob 文件不会被删除（因为分层，减少磁盘占用），需要 GC 来删除没有被引用的 blob，进而回收存储空间

![image-20231005154529168](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005154529168.png)

> 删除 core.harbor.domain/library/nginx:1.25.2

![image-20231005154603666](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005154603666.png)

> 再次推送 - Layer already exists

```
$ docker push core.harbor.domain/library/nginx:1.25.2
The push refers to repository [core.harbor.domain/library/nginx]
e005f3c090e0: Preparing
e005f3c090e0: Layer already exists
3ccc534e961c: Layer already exists
def14911cf6a: Layer already exists
78cdcd2ba4bb: Layer already exists
8cc0ce26d320: Layer already exists
dcb816d1345e: Layer already exists
1c3daa065742: Layer already exists
1.25.2: digest: sha256:d204087971390839f077afcaa4f5a771c1694610f0f7cb13a2d2a3aa520b053f size: 1778
```

## Dragonfly

> 基于 `P2P` 的智能镜像和文件分发工具，提高文件传输效率，最大化利用网络带宽

> `非侵入`性支持`所有类型的容器技术`
> dfget proxy `拦截`来自于 `docker pull/push` 的 HTTP 请求，然后使用 dfget 来处理那些与镜像分层相关的请求

![image-20231005160223151](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005160223151.png)

> 每个文件会被分成多个 Block，这些 Block 会在 Peer 之间传输

![image-20231005160534218](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005160534218.png)

# 镜像安全

## 最佳实践

| Scope    | Action                                                       |
| -------- | ------------------------------------------------------------ |
| 构建指令 | `配置与代码分离`，避免在构建镜像时添加`敏感信息`             |
| 应用依赖 | 避免安装`不必要`的依赖，确保依赖无安全风险                   |
| 文件分层 | 如果敏感信息位于 lower，即便 upper 屏蔽删除（逻辑删除），依然可以获得原文件 |

![image-20231005162905453](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005162905453.png)

## 镜像扫描

> CVE - Common Vulnerabilities and Exposures

1. 分析构建指令、应用、文件、依赖包
2. 查询 CVE 库和安全策略
3. 检查镜像是否安全，是否符合企业的安全标准

> 扫描过程 - 静态分析

1. 镜像扫描服务从镜像仓库拉取镜像
2. `解析`镜像的`元数据`
3. `解压`镜像的`每一个文件层`
   - 提取每一层所包含的依赖包、可运行程序、文件列表、扫描文件内容
4. 将扫描结果与 `CVE 字典`、`安全策略字典`进行匹配，以最终确定镜像是否安全

> Harbor provides `static analysis of vulnerabilities in images` through the open source projects `Trivy` and `Clair`.

## 镜像准入

>  ImagePolicyWebhook admission controller

![image-20231005163533870](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231005163533870.png)

# 可观测性

## Loki

> `低成本` - 标签 + 压缩
> 借鉴了 `Prometheus` 的思想，不做`全文索引`

1. `标签` - 基于`仅索引日志的元数据`而构建的
2. 日志数据本身被`压缩`并存储在 OSS 或者 Local FileSystem

> Prometheus -> Grafana -> Grafana Loki

### 日志采集

![image-20231006170725713](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006170725713.png)

| Component | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| Promtail  | 发现采集目标以及给日志流添加上 `Label` 后发送给 Loki<br />`服务发现`是基于 `Prometheus` 的服务发现机制实现的（一脉相承） |
| Loki      | 可以`水平扩展`，支持 `HA` 和`多租户`<br />使用与 `Prometheus` 相同的`服务发现机制`，将 `Label` 添加到日志流中，而不是建立`全文索引`<br />Promtail 接收到的 `Log` 和应用的 `Metrics` 具有`相同的 Label 集合` |
| Grafana   | 一个用于`监控`和`可视化观测`的开源平台，支持非常丰富的`数据源`<br />在 Loki 技术栈中，Grafana 专门用来展示来自于 `Prometheus` 和 `Loki` 的`时间序列数据` |

### 架构

![image-20231006172507431](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006172507431.png)

| Component   | Desc                                                         |
| ----------- | ------------------------------------------------------------ |
| Distributor | 负责处理 `Promtail` 写入的日志<br />一旦 Distributor 接收到日志数据，会将它们`分批`（先聚合），然后`并行`地发送到多个 Ingester<br />Distributor 与 Ingester 通过 `gRpc` 进行通信<br />Distributor 是`无状态`的，基于`一致性哈希` |
| Ingester    | Ingester 负责将日志数据写入`持久化存储`（S3 等）<br />Ingester 会校验采集的日志`是否乱序`（日志行是否按`时间戳递增`） |
| Querier     | 处理 `LogQL`（类似于 PromQL）                                |

### Hello Loki

```
$ k get po
NAME                                            READY   STATUS    RESTARTS   AGE
loki-0                                          1/1     Running   0          27m
loki-grafana-7c48d88cd7-q49kk                   2/2     Running   0          4m39s
loki-kube-state-metrics-5d666fbb55-tgr9j        1/1     Running   0          27m
loki-prometheus-alertmanager-649cc4f455-8jfpx   2/2     Running   0          27m
loki-prometheus-node-exporter-8lnzt             1/1     Running   0          27m
loki-prometheus-pushgateway-575b7f6bfd-pjq9r    1/1     Running   0          27m
loki-prometheus-server-b4c6f96bd-tv2hx          2/2     Running   0          27m
loki-promtail-clpll                             1/1     Running   0          27m
```

```yaml
apiVersion: v1
data:
  admin-password: ZGJpTm1ZSTk1ZG0wSTUycW9Denc1Tk9vNHhKQzJSUDM1aHJyZXhCaA==
  admin-user: YWRtaW4=
  ldap-toml: ""
kind: Secret
metadata:
  annotations:
    meta.helm.sh/release-name: loki
    meta.helm.sh/release-namespace: default
  creationTimestamp: "2022-10-06T09:41:40Z"
  labels:
    app.kubernetes.io/instance: loki
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: grafana
    app.kubernetes.io/version: 8.3.5
    helm.sh/chart: grafana-6.43.5
  name: loki-grafana
  namespace: default
  resourceVersion: "9844"
  uid: cdd4e229-233f-4a5b-8a5b-d64734c2ca29
type: Opaque
```

```
$ echo -n 'YWRtaW4=' | base64 -d
admin

$ echo -n 'ZGJpTm1ZSTk1ZG0wSTUycW9Denc1Tk9vNHhKQzJSUDM1aHJyZXhCaA==' | base64 -d
dbiNmYI95dm0I52qoCzw5NOo4xJC2RP35hrrexBh

$ k get svc
NAME                            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
kubernetes                      ClusterIP   10.96.0.1        <none>        443/TCP        39d
loki                            ClusterIP   10.107.0.117     <none>        3100/TCP       28m
loki-grafana                    NodePort    10.106.237.84    <none>        80:31195/TCP   28m
loki-headless                   ClusterIP   None             <none>        3100/TCP       28m
loki-kube-state-metrics         ClusterIP   10.98.161.143    <none>        8080/TCP       28m
loki-memberlist                 ClusterIP   None             <none>        7946/TCP       28m
loki-prometheus-alertmanager    ClusterIP   10.104.103.27    <none>        80/TCP         28m
loki-prometheus-node-exporter   ClusterIP   None             <none>        9100/TCP       28m
loki-prometheus-pushgateway     ClusterIP   10.101.101.122   <none>        9091/TCP       28m
loki-prometheus-server          ClusterIP   10.100.49.21     <none>        80/TCP         28m
```

> Loki - Log

![image-20231006181952222](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006181952222.png)

> Prometheus - Metrics

![image-20231006182132733](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006182132733.png)

## Prometheus

> Prometheus 需要较多的`内存`和`存储`，数据是`不汇聚`的

![image-20231006183011110](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006183011110.png)

### Node

> `kubelet`（集成 `cAdvisor`）会收集当前 Node 上的所有信息，信息来源为 `CGroup`，Prometheus 会拉取这些信息

### Pod

> Pod 通过 `Annotation` 声明上报端口，Prometheus 会服务发现这些 Endpoint

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    prometheus.io/port: http-metrics
    prometheus.io/scrape: "true"
  name: loki-0
  namespace: default
spec:
    ports:
    - containerPort: 3100
      name: http-metrics
      protocol: TCP
```

> App 要暴露 Prometheus Metrics

### Metrics

| Type      | Desc                                                         |
| --------- | ------------------------------------------------------------ |
| Counter   | 单调递增                                                     |
| Guage     | 可增可减                                                     |
| Histogram | 划分 Bucket：`均等` / `指数`                                 |
| Summary   | 与 Histogram 类似，但直接`存储分位值`，而不是通过 Bucket 计算 |

### Status

#### Service Discovery

![image-20231006195335235](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006195335235.png)

#### Targets

![image-20231006195552915](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20231006195552915.png)
