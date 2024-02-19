---
title: DevOps - Foundation
mathjax: false
date: 2023-02-04 00:06:25
cover: https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/devops.png
categories:
  - Cloud Native
  - DevOps
tags:
  - Cloud Native
  - Kubernetes
  - DevOps
  - Helm
  - Docker
  - runc
  - Kustomize
  - OCI
  - BuildKit
  - crane
  - OCI Image
  - OCI Runtime
  - Linux Namespace
  - Linux CGroup
  - K8S Manifest
---

# 基本原理

## 核心原理

![linux-namespace-cgroup](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/linux-namespace-cgroup.webp)

<!-- more -->

## 隔离机制

> 运行 Nginx 镜像

```
$ docker run -d nginx:latest
Unable to find image 'nginx:latest' locally
latest: Pulling from library/nginx
25d3892798f8: Pull complete
42de7275c085: Pull complete
c459a9332e03: Pull complete
48882f13d668: Pull complete
49180167b771: Pull complete
da4abc2b066c: Pull complete
20dc44ab57ab: Pull complete
Digest: sha256:5f44022eab9198d75939d9eaa5341bc077eca16fa51d4ef32d33f1bd4c8cbe7d
Status: Downloaded newer image for nginx:latest
d821171713e9b805c4180c122f3502583bb6732a8b974ebd16179be741a8e49e

$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS          PORTS     NAMES
d821171713e9   nginx:latest   "/docker-entrypoint.…"   41 seconds ago   Up 40 seconds   80/tcp    sad_noether
```

> 获取容器在宿主上的 PID

```
$ docker inspect --format '{{.State.Pid}}' d821171713e9
10909
```

> 查看进程详情

```
$ ps -aux | grep 10909
root       10909  0.0  0.0  11140  6972 ?        Ss   14:17   0:00 nginx: master process nginx -g daemon off;
root       11149  0.0  0.0   5860  1900 pts/1    S+   14:40   0:00 grep --color 10909
```

> 获取进程所有 namespace 类型

```
$ lsns --task 10909
        NS TYPE   NPROCS   PID USER COMMAND
4026531834 time      228     1 root /sbin/init
4026531837 user      228     1 root /sbin/init
4026532698 mnt         5 10909 root nginx: master process nginx -g daemon off;
4026532699 uts         5 10909 root nginx: master process nginx -g daemon off;
4026532700 ipc         5 10909 root nginx: master process nginx -g daemon off;
4026532701 pid         5 10909 root nginx: master process nginx -g daemon off;
4026532702 net         5 10909 root nginx: master process nginx -g daemon off;
4026532762 cgroup      5 10909 root nginx: master process nginx -g daemon off;
```

> 进入 filesystem namespace（无需 docker daemon）

```
$ hostname
devops

$ nsenter --target 10909 --mount bash
root@devops:/# hostname
devops
root@devops:/#
root@devops:/#
root@devops:/# ls
bin   dev		   docker-entrypoint.sh  home  media  opt   root  sbin	sys  usr
boot  docker-entrypoint.d  etc			 lib   mnt    proc  run   srv	tmp  var
root@devops:/#
root@devops:/# whoami
root
root@devops:/#
root@devops:/# pwd
/
root@devops:/#
root@devops:/# exit
exit
```

> 修改容器主机名，会同时修改宿主主机名，因为并没有进入 utc namespace

```
$ nsenter --target 10909 --mount bash
root@devops:/# hostname
devops
root@devops:/#
root@devops:/# hostname zhongmingmao
root@devops:/#
root@devops:/# hostname
zhongmingmao
root@devops:/# exit
exit

$ hostname
zhongmingmao
```

> 进入所有 namespace，再次修改容器主机名，不会修改宿主主机名

```
$ nsenter --target 10909 --all bash
root@d821171713e9:/#
root@d821171713e9:/# hostname
d821171713e9
root@d821171713e9:/#
root@d821171713e9:/# hostname devops
root@d821171713e9:/#
root@d821171713e9:/# hostname
devops
root@d821171713e9:/# exit
exit

$ hostname
zhongmingmao

$ docker exec -it d821171713e9 hostname
devops
```

## 实现容器

### uts

```go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	switch os.Args[1] {
	case "run":
		run()
	default:
		panic("what?")
	}
}

func run() {
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Cloneflags: syscall.CLONE_NEWUTS,
	}

	must(cmd.Run())
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
```

> 实现了对 uts namespace 的隔离

```
$ hostname
devops

$ go run main.go run /bin/bash
Running [/bin/bash] as PID 12759
root@devops:/tmp#
root@devops:/tmp# hostname
devops
root@devops:/tmp#
root@devops:/tmp# hostname zhongmingmao
root@devops:/tmp#
root@devops:/tmp# hostname
zhongmingmao
root@devops:/tmp#
root@devops:/tmp# cat /etc/issue
Ubuntu 22.04.2 LTS \n \l

root@devops:/tmp#
root@devops:/tmp# exit
exit

$ hostname
devops
```

### pid

```go
package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func main() {
	switch os.Args[1] {
	case "run":
		run()
	case "child":
		child()
	default:
		panic("what?")
	}
}

func run() {
	cmd := exec.Command("/proc/self/exe", append([]string{"child"}, os.Args[2:]...)...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// CLONE_NEWUTS 和 CLONE_NEWPID
		Cloneflags: syscall.CLONE_NEWUTS | syscall.CLONE_NEWPID,
	}

	must(cmd.Run())
}

func child() {
	fmt.Printf("Running %v as PID %d\n", os.Args[2:], os.Getpid())

	cmd := exec.Command(os.Args[2], os.Args[3:]...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	// chroot 实现独立的文件系统
	must(syscall.Chroot("/tmp/rootfs"))
	must(os.Chdir("/"))
	must(cmd.Run())
}

func must(err error) {
	if err != nil {
		panic(err)
	}
}
```

> 模拟 rootfs

```
$ dpu alpine:3.19.1
3.19.1: Pulling from library/alpine
3.19.1: Pulling from library/alpine
bca4290a9639: Pull complete
Digest: sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b
Status: Downloaded newer image for alpine:3.19.1
docker.io/library/alpine:3.19.1

$ docker run --rm -it alpine:3.19.1 sh

$ docker ps
CONTAINER ID   IMAGE           COMMAND   CREATED         STATUS         PORTS     NAMES
c76b50efba54   alpine:3.19.1   "sh"      2 minutes ago   Up 2 minutes             relaxed_sinoussi

$ docker export c76b50efba54 -o alpine.tar

$ mkdir /tmp/rootfs

$ tar -xf alpine.tar -C /tmp/rootfs

$ ls /tmp/rootfs
bin    etc    lib    mnt    proc   run    srv    tmp    var
dev    home   media  opt    root   sbin   sys    usr

$ file /tmp/rootfs/bin/sh
/tmp/rootfs/bin/sh: symbolic link to /bin/busybox
```

> 运行 Go 程序

```
$ go run main.go run /bin/sh
Running [/bin/sh] as PID 1
/ #
/ # ps
PID   USER     TIME  COMMAND
/ #
/ # ls
bin    etc    lib    mnt    proc   run    srv    tmp    var
dev    home   media  opt    root   sbin   sys    usr
/ #
/ # whoami
root
/ #
/ # cat /etc/issue
Welcome to Alpine Linux 3.19
Kernel \r on an \m (\l)

/ # exit
```

## Image

> 总共 2 层 Layer（FROM + RUN），Layer 名称是以 Layer `内容`的 `hash` 值命名

```dockerfile
FROM debian:latest
RUN apt-get update && apt-get install nginx -y
CMD ["nginx", "-g", "daemon off;"]
```

```
$ docker build -t nginx:v1 -f Dockerfile .
[+] Building 372.7s (6/6) FINISHED                                                                                                                                          docker:default
 => [internal] load build definition from Dockerfile                                                                                                                                  0.0s
 => => transferring dockerfile: 137B                                                                                                                                                  0.0s
 => [internal] load metadata for docker.io/library/debian:latest                                                                                                                     64.2s
 => [internal] load .dockerignore                                                                                                                                                     0.0s
 => => transferring context: 2B                                                                                                                                                       0.0s
 => [1/2] FROM docker.io/library/debian:latest@sha256:79becb70a6247d277b59c09ca340bbe0349af6aacb5afa90ec349528b53ce2c9                                                              254.5s
 => => resolve docker.io/library/debian:latest@sha256:79becb70a6247d277b59c09ca340bbe0349af6aacb5afa90ec349528b53ce2c9                                                                0.0s
 => => sha256:79becb70a6247d277b59c09ca340bbe0349af6aacb5afa90ec349528b53ce2c9 1.85kB / 1.85kB                                                                                        0.0s
 => => sha256:a250db2ed1e0cdcca7baf72084ba6c4578b69cd984367bd6616abe24c92d61a6 529B / 529B                                                                                            0.0s
 => => sha256:e244810c32b8849593705821bec8d7399b3feae991f2b9e8096e58496aa4d594 1.48kB / 1.48kB                                                                                        0.0s
 => => sha256:66932e2b787d33a94ee3eb8b489be6e6838b29f5c1d732262da306da9b1f2eed 49.62MB / 49.62MB                                                                                    253.0s
 => => extracting sha256:66932e2b787d33a94ee3eb8b489be6e6838b29f5c1d732262da306da9b1f2eed                                                                                             1.4s
 => [2/2] RUN apt-get update && apt-get install nginx -y                                                                                                                             53.9s
 => exporting to image                                                                                                                                                                0.1s
 => => exporting layers                                                                                                                                                               0.1s
 => => writing image sha256:05c5750a507a020657c815dace56dc50ee7d87e0e211c673bad91c043b0f2803                                                                                          0.0s
 => => naming to docker.io/library/nginx:v1                                                                                                                                           0.0s
```

```
$ dils
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
nginx        v1        05c5750a507a   2 minutes ago   177MB
debian       latest    e244810c32b8   4 days ago      139MB

$ docker save nginx:v1 -o nginx.tar

$ mkdir nginx

$ tar -xf nginx.tar -C nginx

$ tree -L 3 nginx
nginx
|-- blobs
|   `-- sha256
|       |-- 05c5750a507a020657c815dace56dc50ee7d87e0e211c673bad91c043b0f2803
|       |-- 1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd
|       |-- 70c00505c8c87b38c586dae20d13765688f1f6015ca17cfa438d17610702d977
|       |-- 9f8c60461a42fd9f275c56f4ec8fea8a8ea2d938493e316e830994a3814cf0aa
|       |-- f885044959b5561449db197b178e8243400bb8ef21a9673035989735e6cf4bb3
|       `-- fbf499cf128f24d47415a9ea80538ca459e5806f8873257d8d55a0500f4be743
|-- index.json
|-- manifest.json
|-- oci-layout
`-- repositories

$ du -sh nginx/blobs/sha256/*
4.0K	nginx/blobs/sha256/05c5750a507a020657c815dace56dc50ee7d87e0e211c673bad91c043b0f2803
37M	nginx/blobs/sha256/1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd
4.0K	nginx/blobs/sha256/70c00505c8c87b38c586dae20d13765688f1f6015ca17cfa438d17610702d977
137M	nginx/blobs/sha256/9f8c60461a42fd9f275c56f4ec8fea8a8ea2d938493e316e830994a3814cf0aa
4.0K	nginx/blobs/sha256/f885044959b5561449db197b178e8243400bb8ef21a9673035989735e6cf4bb3
4.0K	nginx/blobs/sha256/fbf499cf128f24d47415a9ea80538ca459e5806f8873257d8d55a0500f4be743
```

> repositories

```json
{
  "nginx": {
    "v1": "1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd"
  }
}
```

> oci-layout

```json
{
  "imageLayoutVersion": "1.0.0"
}
```

> manifest.json

```json
[
  {
    "Config": "blobs/sha256/05c5750a507a020657c815dace56dc50ee7d87e0e211c673bad91c043b0f2803",
    "RepoTags": [
      "nginx:v1"
    ],
    "Layers": [
      "blobs/sha256/9f8c60461a42fd9f275c56f4ec8fea8a8ea2d938493e316e830994a3814cf0aa",
      "blobs/sha256/1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd"
    ],
    "LayerSources": {
      "sha256:1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd": {
        "mediaType": "application/vnd.oci.image.layer.v1.tar",
        "size": 38124544,
        "digest": "sha256:1ba13ff2de2b5c6e6a37d13462d72bf49362230c9df685507f9e3abd0f6494fd"
      },
      "sha256:9f8c60461a42fd9f275c56f4ec8fea8a8ea2d938493e316e830994a3814cf0aa": {
        "mediaType": "application/vnd.oci.image.layer.v1.tar",
        "size": 143643136,
        "digest": "sha256:9f8c60461a42fd9f275c56f4ec8fea8a8ea2d938493e316e830994a3814cf0aa"
      }
    }
  }
]
```

> index.json

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.oci.image.index.v1+json",
  "manifests": [
    {
      "mediaType": "application/vnd.oci.image.manifest.v1+json",
      "digest": "sha256:fbf499cf128f24d47415a9ea80538ca459e5806f8873257d8d55a0500f4be743",
      "size": 621,
      "annotations": {
        "io.containerd.image.name": "docker.io/library/nginx:v1",
        "org.opencontainers.image.ref.name": "v1"
      },
      "platform": {
        "architecture": "arm64",
        "os": "linux",
        "variant": "v8"
      }
    }
  ]
}
```

## Overlay

> lower_dir 为`只读层`，upper_dir 为`读写层`，merged_dir 为用户最终看到的目录，work_dir 存储中间结果

```
$ tree
.
|-- lower_dir
|   |-- 1.txt
|   |-- 2.txt
|   `-- same.txt
|-- merged_dir
|-- upper_dir
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
`-- work_dir
```

```
$ mount -t overlay -o lowerdir=lower_dir/,upperdir=upper_dir/,workdir=work_dir/ none merged_dir/

$ df -a
Filesystem                        1K-blocks    Used Available Use% Mounted on
...
none                               31270768 8351528  21305212  29% /root/workspace/iac/merged_dir

$ cd /root/workspace/iac/

$ tree
.
|-- lower_dir
|   |-- 1.txt
|   |-- 2.txt
|   `-- same.txt
|-- merged_dir
|   |-- 1.txt
|   |-- 2.txt
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
|-- upper_dir
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
`-- work_dir
    `-- work
```

> 同名文件会被上层 Layer 覆盖

```
$ cat lower_dir/same.txt
我是底层的 Layer

$ cat upper_dir/same.txt
我是上层的 Layer

$ cat merged_dir/same.txt
我是上层的 Layer
```

> `写时复制`（上层 Layer）

```
$ cat lower_dir/1.txt | wc -l
0

$ cat merged_dir/1.txt | wc -l
0

$ echo 'hello devops' > merged_dir/1.txt

$ tree
.
|-- lower_dir
|   |-- 1.txt
|   |-- 2.txt
|   `-- same.txt
|-- merged_dir
|   |-- 1.txt
|   |-- 2.txt
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
|-- upper_dir
|   |-- 1.txt
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
`-- work_dir
    `-- work

$ cat merged_dir/1.txt | wc -l
1

$ cat upper_dir/1.txt | wc -l
1

$ cat lower_dir/1.txt | wc -l
0
```

> `标记删除`（上层 Layer）

```
$ rm -rf merged_dir/2.txt

$ tree
.
|-- lower_dir
|   |-- 1.txt
|   |-- 2.txt
|   `-- same.txt
|-- merged_dir
|   |-- 1.txt
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
|-- upper_dir
|   |-- 1.txt
|   |-- 2.txt
|   |-- 3.txt
|   |-- 4.txt
|   `-- same.txt
`-- work_dir
    `-- work
        `-- #11

$ ls -la lower_dir
total 12
drwxr-xr-x 2 zhongmingmao staff 4096 Nov 29 12:39 .
drwxr-xr-x 6 zhongmingmao staff 4096 Feb  6 10:11 ..
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 1.txt
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 2.txt
-rw-r--r-- 1 zhongmingmao staff   21 Sep 20 14:15 same.txt
        
$ ls -la upper_dir
total 16
drwxr-xr-x 2 zhongmingmao staff 4096 Feb  6 14:14 .
drwxr-xr-x 6 zhongmingmao staff 4096 Feb  6 10:11 ..
-rw-r--r-- 1 zhongmingmao staff   13 Feb  6 14:08 1.txt
c--------- 2 root         root  0, 0 Feb  6 14:14 2.txt
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 3.txt
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 4.txt
-rw-r--r-- 1 zhongmingmao staff   21 Sep 20 14:15 same.txt

$ ls -la merged_dir
total 16
drwxr-xr-x 1 zhongmingmao staff 4096 Feb  6 14:14 .
drwxr-xr-x 6 zhongmingmao staff 4096 Feb  6 10:11 ..
-rw-r--r-- 1 zhongmingmao staff   13 Feb  6 14:08 1.txt
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 3.txt
-rw-r--r-- 1 zhongmingmao staff    0 Sep 20 14:15 4.txt
-rw-r--r-- 1 zhongmingmao staff   21 Sep 20 14:15 same.txt
```

> Docker Image

```
$ dils
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
nginx        v1        9831fa04701a   4 minutes ago   177MB

$ docker image inspect nginx:v1 | jq -r '.[0]|{Data:.GraphDriver.Data}'
{
  "Data": {
    "LowerDir": "/var/lib/docker/overlay2/11ebcd41fca026092de6e607c64e59ef0220b5e85d486e4414ec3a498f51e72a/diff",
    "MergedDir": "/var/lib/docker/overlay2/6rt4ae10ohwu79b3l802u77ls/merged",
    "UpperDir": "/var/lib/docker/overlay2/6rt4ae10ohwu79b3l802u77ls/diff",
    "WorkDir": "/var/lib/docker/overlay2/6rt4ae10ohwu79b3l802u77ls/work"
  }
}

$ ls /var/lib/docker/overlay2/11ebcd41fca026092de6e607c64e59ef0220b5e85d486e4414ec3a498f51e72a/diff
bin  boot  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var

$ ls /var/lib/docker/overlay2/6rt4ae10ohwu79b3l802u77ls/diff
etc  tmp  usr  var
```

![image-20240206145333549](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240206145333549.png)

## Dockerfile

### 命令

> ENTRYPOINT / CMD

1. ENTRYPOINT 默认为 `/bin/sh -c`，因此 CMD 为一个可执行文件时，能运行
2. ENTRYPOINT + CMD

> ADD / COPY

1. 优选 `COPY`，语义更清晰

### 最佳实践

1. 减少 Layer `层数`
2. 将`经常发生变化`的 Layer 层`移后`，尽量利用`构建缓存`
3. 使用 `.dockerignore`
4. 减少镜像`体积`
   - 基础镜像：`alpine`、`slim`
   - 使用`多阶段构建`
5. 安全

### 镜像

> `慎用 alpine 镜像`

| Tag    | Size      | Note          |
| ------ | --------- | ------------- |
| latest | 381.88 MB | gnu c library |
| slim   | 70.28 MB  | gnu c library |
| alpine | 47.02 MB  | `musl libc`   |

```go
package main

import (
	"github.com/labstack/echo/v4"
	"net/http"
)

func main() {
	e := echo.New()
	e.GET("/hello", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World!")
	})
	e.Logger.Fatal(e.Start(":8888"))
}
```

```dockerfile
# step 1
FROM golang:1.19 as builder
WORKDIR /opt/app
COPY . .
RUN go mod init app && go mod tidy && go build -o example

# step 2
FROM alpine:latest
WORKDIR /opt/app
COPY --from=builder /opt/app/example ./example
CMD ["/opt/app/example"]
```

> `go build` 默认是`动态链接`，会找不到动态链接库

```
$ docker build -t go-alpine:v1 -f Dockerfile . --no-cache

$ dils
REPOSITORY      TAG        IMAGE ID       CREATED         SIZE
go-alpine       v1         f998fec48dff   3 seconds ago   14.8MB

$ docker run go-alpine:v1
exec /opt/app/example: no such file or directory

$ docker run -it go-alpine:v1 sh
/opt/app # ls
example
/opt/app # ./example
sh: ./example: not found
```

> 静态链接：`-tags netgo -ldflags '-extldflags "-static"'`

```dockerfile
# step 1
FROM golang:1.19 as builder
WORKDIR /opt/app
COPY . .
RUN go mod init app && go mod tidy && go build -tags netgo -ldflags '-extldflags "-static"' -o example

# step 2
FROM alpine:latest
WORKDIR /opt/app
COPY --from=builder /opt/app/example ./example
CMD ["/opt/app/example"]
```

```
$ docker build -t go-alpine:v2 -f Dockerfile . --no-cache

$ docker run go-alpine:v2

   ____    __
  / __/___/ /  ___
 / _// __/ _ \/ _ \
/___/\__/_//_/\___/ v4.11.4
High performance, minimalist Go web framework
https://echo.labstack.com
____________________________________O/_______
                                    O\
⇨ http server started on [::]:8888
```

> 静态链接：`CGO_ENABLE=0`

```dockerfile
# step 1
FROM golang:1.19 as builder
WORKDIR /opt/app
COPY . .
RUN go mod init app && go mod tidy && CGO_ENABLE=0 go build -o example

# step 2
FROM alpine:latest
WORKDIR /opt/app
COPY --from=builder /opt/app/example ./example
CMD ["/opt/app/example"]
```

```
$ docker build -t go-alpine:v3 -f Dockerfile . --no-cache

$ docker run go-alpine:v3

   ____    __
  / __/___/ /  ___
 / _// __/ _ \/ _ \
/___/\__/_//_/\___/ v4.11.4
High performance, minimalist Go web framework
https://echo.labstack.com
____________________________________O/_______
                                    O\
⇨ http server started on [::]:8888
```

> 统一都使用 alpine 镜像

```docker
# step 1
FROM golang:1.19-alpine as builder
WORKDIR /opt/app
COPY . .
RUN go mod init app && go mod tidy && go build -o example

# step 2
FROM alpine:latest
WORKDIR /opt/app
COPY --from=builder /opt/app/example ./example
CMD ["/opt/app/example"]
```

```
$ docker build -t go-alpine:v4 -f Dockerfile . --no-cache

$ docker run go-alpine:v4

   ____    __
  / __/___/ /  ___
 / _// __/ _ \/ _ \
/___/\__/_//_/\___/ v4.11.4
High performance, minimalist Go web framework
https://echo.labstack.com
____________________________________O/_______
                                    O\
⇨ http server started on [::]:8888
```

### 多阶段构建

> 主要用途：`减少镜像大小`

#### 单阶段

```dockerfile Dockerfile
FROM golang:1.17
WORKDIR /opt/app
COPY . .
RUN go mod init app && go build -o example
CMD ["/opt/app/example"]
```

```
$ docker build -t app:v1 -f Dockerfile .

$ dils
REPOSITORY   TAG       IMAGE ID       CREATED              SIZE
app          v1        21fcbe4fbaa0   About a minute ago   808MB
```

#### 多阶段

```dockerfile Dockerfile-multi-stage
# step 1
FROM golang:1.17 as builder
WORKDIR /opt/app
COPY . .
RUN go mod init app && go build -o example

# step 2
FROM ubuntu:latest
WORKDIR /opt/app
COPY --from=builder /opt/app/example ./example
CMD ["/opt/app/example"]
```

```
$ docker build -t app:v2 -f Dockerfile-multi-stage .

$ dils
REPOSITORY   TAG       IMAGE ID       CREATED          SIZE
app          v2        3133d10045a7   10 seconds ago   67.7MB
```

### 安全

> 避免使用 `root` 用户

```dockerfile
FROM ubuntu:latest
RUN useradd -ms /bin/bash app
USER app
WORKDIR /app
```

```
$ docker build -t user:v1 -f Dockerfile .

$ docker run --rm -it user:v1 whoami
app
```

# 镜像构建

## DinD

> `不安全`

1. docker build 依赖于 `Docker Daemon`
2. DinD - 将宿主上的 `Docker Socket`（权限很高） 挂载到容器，将宿主的权限`暴露`到容器中

```
$ docker run -it -v /var/run/docker.sock:/var/run/docker.sock docker:dind docker -v
Docker version 25.0.2, build 29cf629
```

## BuildKit

1. `buildx`：内置在 Docker 的默认构建工具，`效率`远高于原始的 Docker 构建
2. 不依赖于 Docker Daemon，但依赖于 `Buildkit Daemon`（可以`直接部署在容器中`）

![buildkit](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/buildkit.png)

> 启动 buildkitd 容器（用于构建镜像）

```
$ docker run -d --name buildkitd --privileged moby/buildkit:rootless
370d7080ce0a58e500f5f3c78b133fee7d8f5f187c5654afc293381d58b2faf8

$  docker ps
CONTAINER ID   IMAGE                                  COMMAND                  CREATED              STATUS              PORTS                                                                                                      NAMES
370d7080ce0a   moby/buildkit:rootless                 "rootlesskit buildki…"   About a minute ago   Up About a minute                                                                                                              buildkitd
```

> 构建镜像（指定`构建上下文`，并传递到 buildkitd 容器）

```
$ buildctl --addr docker-container://buildkitd build \
--frontend=dockerfile.v0 \
--local context=. \
--local dockerfile=. \
--output type=image,name=nginx:v2
[+] Building 128.3s (7/7) FINISHED
 => [internal] load build definition from Dockerfile                                                             0.0s
 => => transferring dockerfile: 138B                                                                             0.0s
 => [internal] load metadata for docker.io/library/ubuntu:latest                                                 3.5s
 => [auth] library/ubuntu:pull token for registry-1.docker.io                                                    0.0s
 => [internal] load .dockerignore                                                                                0.0s
 => => transferring context: 2B                                                                                  0.0s
 => [1/2] FROM docker.io/library/ubuntu:latest@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2  39.4s
 => => resolve docker.io/library/ubuntu:latest@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2b  0.0s
 => => sha256:b91d8878f844c327b4ff924d4973661a399f10256ed50ac7c640b30c5894166b 27.36MB / 27.36MB                38.9s
 => => extracting sha256:b91d8878f844c327b4ff924d4973661a399f10256ed50ac7c640b30c5894166b                        0.5s
 => [2/2] RUN apt-get update && apt-get install nginx -y                                                        82.9s
 => exporting to image                                                                                           2.5s
 => => exporting layers                                                                                          2.4s
 => => exporting manifest sha256:4fe3c6e56f30d9566e0b7874c2b878748e95bc5e1cef4e22fed24ca885627774                0.0s
 => => exporting config sha256:e5767056cc73207a3e27cf8a3c1f3f5926cd8914172cb022e09630eb4e4b040a                  0.0s
```

| Option | Desc                                                         |
| ------ | ------------------------------------------------------------ |
| --addr | buildkitd address (default: "unix:///run/buildkit/buildkitd.sock") |



## Kaniko

### 示例

> Kaniko 用于推送镜像的凭证

```
$ echo -n 'zhongmingmao:${docker_hub_access_token}' | base64
xxx
```

```json config.json
{
    "auths": {
        "https://index.docker.io/v1/": {
            "auth": "xxx"
        }
    }
}
```

```dockerfile
FROM debian:latest

WORKDIR /app
COPY . .

# install python3
RUN apt-get update
RUN apt-get install python3 -y
RUN apt-get install wget -y

CMD ["python3", "app.py"]
```

```python
print("Hello World")
```

```
$ tree
.
|-- app.py
|-- config.json
|-- Dockerfile

$ docker run \
-v "./config.json:/kaniko/.docker/config.json" \
-v ".:/workspace" \
gcr.io/kaniko-project/executor:latest \
--dockerfile /workspace/Dockerfile \
--destination "zhongmingmao/devops-app:v1" \
--context dir:///workspace/
INFO[0002] Retrieving image manifest debian:latest
INFO[0002] Retrieving image debian:latest from registry index.docker.io
INFO[0006] Built cross stage deps: map[]
INFO[0006] Retrieving image manifest debian:latest
INFO[0006] Returning cached image manifest
INFO[0006] Executing 0 build triggers
INFO[0006] Building stage 'debian:latest' [idx: '0', base-idx: '-1']
INFO[0006] Unpacking rootfs as cmd COPY . . requires it.
INFO[0097] WORKDIR /app
INFO[0097] Cmd: workdir
INFO[0097] Changed working directory to /app
INFO[0097] Creating directory /app with uid -1 and gid -1
INFO[0097] Taking snapshot of files...
INFO[0097] COPY . .
INFO[0097] Taking snapshot of files...
INFO[0097] RUN apt-get update
INFO[0097] Initializing snapshotter ...
INFO[0097] Taking snapshot of full filesystem...
INFO[0097] Cmd: /bin/sh
INFO[0097] Args: [-c apt-get update]
INFO[0097] Running: [/bin/sh -c apt-get update]
...
INFO[0114] Taking snapshot of full filesystem...
INFO[0115] RUN apt-get install python3 -y
INFO[0115] Cmd: /bin/sh
INFO[0115] Args: [-c apt-get install python3 -y]
INFO[0115] Running: [/bin/sh -c apt-get install python3 -y]
...
INFO[0136] Taking snapshot of full filesystem...
INFO[0144] RUN apt-get install wget -y
INFO[0144] Cmd: /bin/sh
INFO[0144] Args: [-c apt-get install wget -y]
INFO[0144] Running: [/bin/sh -c apt-get install wget -y]
...
INFO[0146] Taking snapshot of full filesystem...
INFO[0146] CMD ["python3", "app.py"]
INFO[0146] Pushing image to zhongmingmao/devops-app:v1
INFO[0227] Pushed index.docker.io/zhongmingmao/devops-app@sha256:45af3d0bcd801ecb864dd4520efa48b1160647d5c420d225ce6720429395a504
```

![image-20240206225057362](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240206225057362.png)

### 缺点

1. 不支持`跨平台构建`（没有`虚拟化`）
2. `构建速度`较慢
3. `缓存效率`相对于本地缓存更低，一般需要借助`网络`和 `Repository`
4. `资源消耗`比较多

## 构建原理

### 传统构建

> `串行构建`，效率低

```dockerfile
FROM debian:latest

WORKDIR /app
COPY . .

# install python3
RUN apt-get update
RUN apt-get install python3 -y
RUN apt-get install wget -y

CMD ["python3", "app.py"]
```

```python
print("Hello World")
```

> 禁用 BuildKit  `DOCKER_BUILDKIT=0`

```
$ DOCKER_BUILDKIT=0 docker build -t app:v1 . --no-cache
DEPRECATED: The legacy builder is deprecated and will be removed in a future release.
            BuildKit is currently disabled; enable it by removing the DOCKER_BUILDKIT=0
            environment-variable.
```

> 监控 Docker 资源消耗 - `串行创建容器`

```
$ docker stats -a
```

![image-20240207103338445](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207103338445.png)

> 查看历史，存在很多`中间镜像`

```
$ dils
REPOSITORY   TAG       IMAGE ID       CREATED         SIZE
app          v1        4c515a334e32   2 minutes ago   214MB
debian       latest    e244810c32b8   6 days ago      139MB

$ docker history app:v1
IMAGE          CREATED         CREATED BY                                      SIZE      COMMENT
4c515a334e32   2 minutes ago   /bin/sh -c #(nop)  CMD ["python3" "app.py"]     0B
5fcca84b53b5   2 minutes ago   /bin/sh -c apt-get install wget -y              5.08MB
c33eea06254d   3 minutes ago   /bin/sh -c apt-get install python3 -y           51MB
4836a8252d35   3 minutes ago   /bin/sh -c apt-get update                       19.2MB
0dbe04522c2a   3 minutes ago   /bin/sh -c #(nop) COPY dir:97cd23d94493fbd05…   493B
b74b24a3d291   3 minutes ago   /bin/sh -c #(nop) WORKDIR /app                  0B
e244810c32b8   6 days ago      /bin/sh -c #(nop)  CMD ["bash"]                 0B
<missing>      6 days ago      /bin/sh -c #(nop) ADD file:8bc7f537dd3dc4b92…   139MB
```

> 构建过程（`串行`）

1. 首先通过 `docker run` 基于基础镜像启动第一个`中间容器`
2. 在中间容器中执行 Dockerfile 中的第一条构建命令
3. 最后通过 `docker commit` 将中间容器的`读写层`提交为`镜像只读层`
4. 执行下一条构建命令

> 总共 6 层 Layer

![image-20240207105154984](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207105154984.png)

### BuildKit

> 多阶段构建

```dockerfile
FROM alpine As kubectl
ENV KUBECTL_VERSION=1.22.0
WORKDIR /output
RUN apk add curl
RUN curl -LO https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl
RUN chmod +x kubectl

FROM alpine As terraform
ENV TERRAFORM_VERSION=1.5.5
WORKDIR /output
RUN apk add curl zip
RUN curl -LO https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
RUN unzip terraform_${TERRAFORM_VERSION}_linux_amd64

FROM alpine
COPY --from=kubectl /output/kubectl /usr/local/bin/
COPY --from=terraform /output/terraform /usr/local/bin/
```

#### 传统构建

> `串行`（Dockerfile 总共 17 行，扫描到 15 个 Step，依次执行）

```
$ DOCKER_BUILDKIT=0 docker build -t app:v2.1 . --no-cache
DEPRECATED: The legacy builder is deprecated and will be removed in a future release.
            BuildKit is currently disabled; enable it by removing the DOCKER_BUILDKIT=0
            environment-variable.

Sending build context to Docker daemon   2.56kB
Step 1/15 : FROM alpine As kubectl
 ---> ace17d5d883e
Step 2/15 : ENV KUBECTL_VERSION=1.22.0
 ---> Running in 90d2c8328ffa
 ---> Removed intermediate container 90d2c8328ffa
 ---> e533e7cfc049
Step 3/15 : WORKDIR /output
 ---> Running in 34e4a969c829
 ---> Removed intermediate container 34e4a969c829
 ---> 7ea13ef487d2
Step 4/15 : RUN apk add curl
 ---> Running in 8dc705f90042
fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main/aarch64/APKINDEX.tar.gz
fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/community/aarch64/APKINDEX.tar.gz
(1/8) Installing ca-certificates (20230506-r0)
(2/8) Installing brotli-libs (1.1.0-r1)
(3/8) Installing c-ares (1.24.0-r1)
(4/8) Installing libunistring (1.1-r2)
(5/8) Installing libidn2 (2.3.4-r4)
(6/8) Installing nghttp2-libs (1.58.0-r0)
(7/8) Installing libcurl (8.5.0-r0)
(8/8) Installing curl (8.5.0-r0)
Executing busybox-1.36.1-r15.trigger
Executing ca-certificates-20230506-r0.trigger
OK: 13 MiB in 23 packages
 ---> Removed intermediate container 8dc705f90042
 ---> c053772d0e1f
Step 5/15 : RUN curl -LO https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl
 ---> Running in cfba68780dba
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   138  100   138    0     0    168      0 --:--:-- --:--:-- --:--:--   168
100 44.7M  100 44.7M    0     0   523k      0  0:01:27  0:01:27 --:--:--  604k
 ---> Removed intermediate container cfba68780dba
 ---> f6a604bfb07d
Step 6/15 : RUN chmod +x kubectl
 ---> Running in 2ca7431e0dac
 ---> Removed intermediate container 2ca7431e0dac
 ---> fe78712a5a48
Step 7/15 : FROM alpine As terraform
 ---> ace17d5d883e
Step 8/15 : ENV TERRAFORM_VERSION=1.5.5
 ---> Running in e04fa5775b46
 ---> Removed intermediate container e04fa5775b46
 ---> 1b39330b4a04
Step 9/15 : WORKDIR /output
 ---> Running in c1e73121e079
 ---> Removed intermediate container c1e73121e079
 ---> 1cd6baf401a1
Step 10/15 : RUN apk add curl zip
 ---> Running in 82cc3da776a3
fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main/aarch64/APKINDEX.tar.gz
fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/community/aarch64/APKINDEX.tar.gz
(1/10) Installing ca-certificates (20230506-r0)
(2/10) Installing brotli-libs (1.1.0-r1)
(3/10) Installing c-ares (1.24.0-r1)
(4/10) Installing libunistring (1.1-r2)
(5/10) Installing libidn2 (2.3.4-r4)
(6/10) Installing nghttp2-libs (1.58.0-r0)
(7/10) Installing libcurl (8.5.0-r0)
(8/10) Installing curl (8.5.0-r0)
(9/10) Installing unzip (6.0-r14)
(10/10) Installing zip (3.0-r12)
Executing busybox-1.36.1-r15.trigger
Executing ca-certificates-20230506-r0.trigger
OK: 14 MiB in 25 packages
 ---> Removed intermediate container 82cc3da776a3
 ---> c462f291f399
Step 11/15 : RUN curl -LO https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
 ---> Running in 418af7423ff1
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 20.0M  100 20.0M    0     0   580k      0  0:00:35  0:00:35 --:--:--  581k
 ---> Removed intermediate container 418af7423ff1
 ---> f698453c3034
Step 12/15 : RUN unzip terraform_${TERRAFORM_VERSION}_linux_amd64
 ---> Running in 0f1559fcfb85
Archive:  terraform_1.5.5_linux_amd64.zip
  inflating: terraform
 ---> Removed intermediate container 0f1559fcfb85
 ---> db704a4548c1
Step 13/15 : FROM alpine
 ---> ace17d5d883e
Step 14/15 : COPY --from=kubectl /output/kubectl /usr/local/bin/
 ---> cf63ae19d314
Step 15/15 : COPY --from=terraform /output/terraform /usr/local/bin/
 ---> 55dd577730da
Successfully built 55dd577730da
Successfully tagged app:v2.1
```

```
$ dils
REPOSITORY      TAG       IMAGE ID       CREATED              SIZE
<none>          <none>    db704a4548c1   About a minute ago   102MB
app             v2.1      55dd577730da   About a minute ago   120MB
<none>          <none>    fe78712a5a48   2 minutes ago        109MB

$ docker history fe78712a5a48
IMAGE          CREATED         CREATED BY                                      SIZE      COMMENT
fe78712a5a48   3 minutes ago   /bin/sh -c chmod +x kubectl                     46.9MB
f6a604bfb07d   3 minutes ago   /bin/sh -c curl -LO https://dl.k8s.io/releas…   46.9MB
c053772d0e1f   5 minutes ago   /bin/sh -c apk add curl                         7.01MB
7ea13ef487d2   5 minutes ago   /bin/sh -c #(nop) WORKDIR /output               0B
e533e7cfc049   5 minutes ago   /bin/sh -c #(nop)  ENV KUBECTL_VERSION=1.22.0   0B
ace17d5d883e   11 days ago     /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      11 days ago     /bin/sh -c #(nop) ADD file:d0764a717d1e9d0af…   7.73MB

$ docker history app:v2.1
IMAGE          CREATED         CREATED BY                                      SIZE      COMMENT
55dd577730da   3 minutes ago   /bin/sh -c #(nop) COPY file:e7b95d65dbe7ce17…   65.2MB
cf63ae19d314   3 minutes ago   /bin/sh -c #(nop) COPY file:7db4b8e3cdd20ba1…   46.9MB
ace17d5d883e   11 days ago     /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      11 days ago     /bin/sh -c #(nop) ADD file:d0764a717d1e9d0af…   7.73MB
```

![image-20240207111229167](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207111229167.png)

#### BuildKit

> `并行`（借助 `DAG` 依赖分析，terraform 和 kubectl 没有依赖关系，可以并行）

```
$ docker build -t app:v2.2 . --no-cache
[+] Building 141.3s (14/14) FINISHED                                                                   docker:default
 => [internal] load build definition from Dockerfile                                                             0.0s
 => => transferring dockerfile: 612B                                                                             0.0s
 => [internal] load metadata for docker.io/library/alpine:latest                                                 0.0s
 => [internal] load .dockerignore                                                                                0.0s
 => => transferring context: 2B                                                                                  0.0s
 => [terraform 1/5] FROM docker.io/library/alpine:latest                                                         0.0s
 => [terraform 2/5] WORKDIR /output                                                                              0.0s
 => [kubectl 3/5] RUN apk add curl                                                                              10.6s
 => [terraform 3/5] RUN apk add curl zip                                                                        12.4s
 => [kubectl 4/5] RUN curl -LO https://dl.k8s.io/release/v1.22.0/bin/linux/amd64/kubectl                       130.1s
 => [terraform 4/5] RUN curl -LO https://releases.hashicorp.com/terraform/1.5.5/terraform_1.5.5_linux_amd64.zi  40.4s
 => [terraform 5/5] RUN unzip terraform_1.5.5_linux_amd64                                                        0.6s
 => [kubectl 5/5] RUN chmod +x kubectl                                                                           0.3s
 => [stage-2 2/3] COPY --from=kubectl /output/kubectl /usr/local/bin/                                            0.0s
 => [stage-2 3/3] COPY --from=terraform /output/terraform /usr/local/bin/                                        0.1s
 => exporting to image                                                                                           0.1s
 => => exporting layers                                                                                          0.1s
 => => writing image sha256:d73ff2cfc061d0b2d15e50a2a2444e294337211a102d1bddf34c78db50213fa8                     0.0s
 => => naming to docker.io/library/app:v2.2                                                                      0.0s
```

```
$ dils
REPOSITORY      TAG       IMAGE ID       CREATED          SIZE
app             v2.2      d73ff2cfc061   59 seconds ago   120MB

$ docker history app:v2.2
IMAGE          CREATED              CREATED BY                                      SIZE      COMMENT
d73ff2cfc061   About a minute ago   COPY /output/terraform /usr/local/bin/ # bui…   65.2MB    buildkit.dockerfile.v0
<missing>      About a minute ago   COPY /output/kubectl /usr/local/bin/ # build…   46.9MB    buildkit.dockerfile.v0
<missing>      11 days ago          /bin/sh -c #(nop)  CMD ["/bin/sh"]              0B
<missing>      11 days ago          /bin/sh -c #(nop) ADD file:d0764a717d1e9d0af…   7.73MB
```

> 通过 `docker stats -a` 观察，不会产生新的中间容器

## 多架构

### crane

> 查看镜像的 Manifest

```json
$ crane manifest alpine:latest | jq
{
  "manifests": [
    {
      "digest": "sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v6"
      },
      "size": 528
    },
    {
      "digest": "sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v7"
      },
      "size": 528
    },
    {
      "digest": "sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm64",
        "os": "linux",
        "variant": "v8"
      },
      "size": 528
    },
    {
      "digest": "sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "386",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "ppc64le",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "s390x",
        "os": "linux"
      },
      "size": 528
    }
  ],
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "schemaVersion": 2
}
```

> 查看镜像某一架构的 Manifest

```json
$ crane manifest alpine:latest@sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0 | jq
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "config": {
    "mediaType": "application/vnd.docker.container.image.v1+json",
    "size": 1472,
    "digest": "sha256:05455a08881ea9cf0e752bc48e61bbd71a34c029bb13df01e40e3e70e0d007bd"
  },
  "layers": [
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 3408729,
      "digest": "sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8"
    }
  ]
}
```

> 模拟镜像拉取过程（`Manifest -> Image -> Layer`）

```json
$ crane export -v alpine:latest - | tar xv
2023/02/07 14:02:20 --> GET https://index.docker.io/v2/
2023/02/07 14:02:20 GET /v2/ HTTP/1.1
Host: index.docker.io
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Accept-Encoding: gzip


2023/02/07 14:02:21 <-- 401 https://index.docker.io/v2/ (994.859516ms)
2023/02/07 14:02:21 HTTP/1.1 401 Unauthorized
Content-Length: 87
Content-Type: application/json
Date: Wed, 07 Feb 2023 06:02:21 GMT
Docker-Distribution-Api-Version: registry/2.0
Strict-Transport-Security: max-age=31536000
Www-Authenticate: Bearer realm="https://auth.docker.io/token",service="registry.docker.io"

{"errors":[{"code":"UNAUTHORIZED","message":"authentication required","detail":null}]}

2023/02/07 14:02:21 --> GET https://auth.docker.io/token?scope=repository%3Alibrary%2Falpine%3Apull&service=registry.docker.io [body redacted: basic token response contains credentials]
2023/02/07 14:02:21 GET /token?scope=repository%3Alibrary%2Falpine%3Apull&service=registry.docker.io HTTP/1.1
Host: auth.docker.io
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Accept-Encoding: gzip


2023/02/07 14:02:22 <-- 200 https://auth.docker.io/token?scope=repository%3Alibrary%2Falpine%3Apull&service=registry.docker.io (1.007807659s) [body redacted: basic token response contains credentials]
2023/02/07 14:02:22 HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: application/json
Date: Wed, 07 Feb 2023 06:02:22 GMT
Strict-Transport-Security: max-age=31536000


2023/02/07 14:02:22 --> GET https://index.docker.io/v2/library/alpine/manifests/latest
2023/02/07 14:02:22 GET /v2/library/alpine/manifests/latest HTTP/1.1
Host: index.docker.io
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Accept: application/vnd.docker.distribution.manifest.v1+json,application/vnd.docker.distribution.manifest.v1+prettyjws,application/vnd.docker.distribution.manifest.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.index.v1+json
Authorization: <redacted>
Accept-Encoding: gzip


2023/02/07 14:02:22 <-- 200 https://index.docker.io/v2/library/alpine/manifests/latest (289.809999ms)
2023/02/07 14:02:22 HTTP/1.1 200 OK
Content-Length: 1638
Content-Type: application/vnd.docker.distribution.manifest.list.v2+json
Date: Wed, 07 Feb 2023 06:02:22 GMT
Docker-Content-Digest: sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b
Docker-Distribution-Api-Version: registry/2.0
Docker-Ratelimit-Source: 129.227.149.221
Etag: "sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b"
Ratelimit-Limit: 100;w=21600
Ratelimit-Remaining: 90;w=21600
Strict-Transport-Security: max-age=31536000

{
  "manifests": [
    {
      "digest": "sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v6"
      },
      "size": 528
    },
    {
      "digest": "sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v7"
      },
      "size": 528
    },
    {
      "digest": "sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm64",
        "os": "linux",
        "variant": "v8"
      },
      "size": 528
    },
    {
      "digest": "sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "386",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "ppc64le",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "s390x",
        "os": "linux"
      },
      "size": 528
    }
  ],
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "schemaVersion": 2
}
2023/02/07 14:02:22 --> GET https://index.docker.io/v2/library/alpine/manifests/sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0
2023/02/07 14:02:22 GET /v2/library/alpine/manifests/sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0 HTTP/1.1
Host: index.docker.io
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Accept: application/vnd.docker.distribution.manifest.v2+json
Authorization: <redacted>
Accept-Encoding: gzip


2023/02/07 14:02:22 <-- 200 https://index.docker.io/v2/library/alpine/manifests/sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0 (565.099481ms)
2023/02/07 14:02:22 HTTP/1.1 200 OK
Content-Length: 528
Content-Type: application/vnd.docker.distribution.manifest.v2+json
Date: Wed, 07 Feb 2023 06:02:22 GMT
Docker-Content-Digest: sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0
Docker-Distribution-Api-Version: registry/2.0
Docker-Ratelimit-Source: 129.227.149.221
Etag: "sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0"
Ratelimit-Limit: 100;w=21600
Ratelimit-Remaining: 90;w=21600
Strict-Transport-Security: max-age=31536000

{
   "schemaVersion": 2,
   "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
   "config": {
      "mediaType": "application/vnd.docker.container.image.v1+json",
      "size": 1472,
      "digest": "sha256:05455a08881ea9cf0e752bc48e61bbd71a34c029bb13df01e40e3e70e0d007bd"
   },
   "layers": [
      {
         "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
         "size": 3408729,
         "digest": "sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8"
      }
   ]
}
2023/02/07 14:02:22 --> GET https://index.docker.io/v2/library/alpine/blobs/sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8 [body redacted: omitting binary blobs from logs]
2023/02/07 14:02:22 GET /v2/library/alpine/blobs/sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8 HTTP/1.1
Host: index.docker.io
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Authorization: <redacted>
Accept-Encoding: gzip


2023/02/07 14:02:23 <-- 307 https://index.docker.io/v2/library/alpine/blobs/sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8 (243.89499ms) [body redacted: omitting binary blobs from logs]
2023/02/07 14:02:23 HTTP/1.1 307 Temporary Redirect
Content-Type: application/octet-stream
Date: Wed, 07 Feb 2023 06:02:23 GMT
Docker-Distribution-Api-Version: registry/2.0
Location: https://production.cloudflare.docker.com/registry-v2/docker/registry/v2/blobs/sha256/4a/4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8/data?verify=1707288743-Cy4zDsyi3KttvHMoDxRlm0ey%2BlI%3D
Strict-Transport-Security: max-age=31536000
Content-Length: 0


2023/02/07 14:02:23 --> GET https://production.cloudflare.docker.com/registry-v2/docker/registry/v2/blobs/sha256/4a/4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8/data?verify=1707288743-Cy4zDsyi3KttvHMoDxRlm0ey%2BlI%3D [body redacted: omitting binary blobs from logs]
2023/02/07 14:02:23 GET /registry-v2/docker/registry/v2/blobs/sha256/4a/4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8/data?verify=1707288743-Cy4zDsyi3KttvHMoDxRlm0ey%2BlI%3D HTTP/1.1
Host: production.cloudflare.docker.com
User-Agent: crane/v0.19.0 go-containerregistry/v0.19.0
Referer: https://index.docker.io/v2/library/alpine/blobs/sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8
Accept-Encoding: gzip


2023/02/07 14:02:23 <-- 200 https://production.cloudflare.docker.com/registry-v2/docker/registry/v2/blobs/sha256/4a/4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8/data?verify=1707288743-Cy4zDsyi3KttvHMoDxRlm0ey%2BlI%3D (182.325023ms) [body redacted: omitting binary blobs from logs]
2023/02/07 14:02:23 HTTP/2.0 200 OK
Content-Length: 3408729
Accept-Ranges: bytes
Age: 970036
Cache-Control: public, max-age=14400
Cf-Cache-Status: HIT
Cf-Ray: 85196c784e920976-HKG
Content-Type: application/octet-stream
Date: Wed, 07 Feb 2023 06:02:23 GMT
Etag: "a618c0d95d3644232bac3126afb149f9"
Expires: Wed, 07 Feb 2023 10:02:23 GMT
Last-Modified: Sat, 27 Jan 2023 00:31:24 GMT
Server: cloudflare
Vary: Accept-Encoding
X-Amz-Id-2: nxgqBVRInfsy/+PYjepixKMATpy+iSIBh9FGHqrtS/j7YgRq3bh53lpvx32bePYcT8jx/tajk7k=
X-Amz-Request-Id: 322FXJKFDN2ZRHNZ
X-Amz-Server-Side-Encryption: AES256
X-Amz-Version-Id: OSaSg4VWviOKBWIUuIdx3FGSxOHZSoPH


bin
bin/arch
...
var/tmp
```

```
$ ls
bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

> 复制镜像（所有架构）

```
$ crane cp alpine:latest index.docker.io/zhongmingmao/alpine:latest
2023/02/07 14:22:33 Copying from alpine:latest to index.docker.io/zhongmingmao/alpine:latest
2023/02/07 14:22:43 mounted blob: sha256:30c69795e46bd167df7f6152056f3c885cba4f5b4238e2327c73fb35c226d351
2023/02/07 14:22:43 mounted blob: sha256:4abcf20661432fb2d719aaf90656f55c287f8ca915dc1c92ec14ff61e67fbaf8
2023/02/07 14:22:43 mounted blob: sha256:05455a08881ea9cf0e752bc48e61bbd71a34c029bb13df01e40e3e70e0d007bd
2023/02/07 14:22:43 mounted blob: sha256:bca4290a96390d7a6fc6f2f9929370d06f8dfcacba591c76e3d5c5044e7f420c
2023/02/07 14:22:43 mounted blob: sha256:0dc2e6c0f9ded2daeca96bbf270526d182d2f4267f5c7610c222c05cad6f6b96
2023/02/07 14:22:43 mounted blob: sha256:935b61847fc465ff70ecbd3436253a7596a500e649a16014646a99393ccbb661
2023/02/07 14:22:43 mounted blob: sha256:fda0ff469afd28d9cfbb946e8e0a3c911c591a2691bea62be9187e45a1c50549
2023/02/07 14:22:43 mounted blob: sha256:ace17d5d883e9ea5a21138d0608d60aa2376c68f616c55b0b7e73fba6d8556a3
2023/02/07 14:22:44 index.docker.io/zhongmingmao/alpine@sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0: digest: sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0 size: 528
2023/02/07 14:22:44 index.docker.io/zhongmingmao/alpine@sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8: digest: sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8 size: 528
2023/02/07 14:22:44 index.docker.io/zhongmingmao/alpine@sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46: digest: sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46 size: 528
2023/02/07 14:22:44 index.docker.io/zhongmingmao/alpine@sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe: digest: sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe size: 528
2023/02/07 14:22:45 mounted blob: sha256:f4968021da4ff8b74325e5aebf0f9448b44becfdd14df80ecba474e43cc92546
2023/02/07 14:22:45 mounted blob: sha256:4a0759b5afbffdc507fbb4e32b3a139063c3a5c0829f811973850447f98830ae
2023/02/07 14:22:45 mounted blob: sha256:5b984dd0323cee557fb6a9d8796f4b4414317cf1fb88bb2047d2046ac9447d77
2023/02/07 14:22:45 mounted blob: sha256:8fc740d8c40e45ea330a3f324fe009148dfc1f771bc90254eaf8ff8bbcecfe02
2023/02/07 14:22:45 mounted blob: sha256:2d433224a9f8f46c545c8fc4bc82ea382227d892e9f0c704d90ef585542bf497
2023/02/07 14:22:46 mounted blob: sha256:eb8fba61d86413beda3240c40c599041e040e658cd8314e38ee15e67ea57d349
2023/02/07 14:22:46 index.docker.io/zhongmingmao/alpine@sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2: digest: sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2 size: 528
2023/02/07 14:22:46 index.docker.io/zhongmingmao/alpine@sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171: digest: sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171 size: 528
2023/02/07 14:22:46 index.docker.io/zhongmingmao/alpine@sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe: digest: sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe size: 528
2023/02/07 14:22:46 index.docker.io/zhongmingmao/alpine:latest: digest: sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b size: 1638
```

```json
$ crane manifest zhongmingmao/alpine:latest | jq
{
  "manifests": [
    {
      "digest": "sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v6"
      },
      "size": 528
    },
    {
      "digest": "sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v7"
      },
      "size": 528
    },
    {
      "digest": "sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm64",
        "os": "linux",
        "variant": "v8"
      },
      "size": 528
    },
    {
      "digest": "sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "386",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "ppc64le",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "s390x",
        "os": "linux"
      },
      "size": 528
    }
  ],
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "schemaVersion": 2
}
```

![image-20240207142836765](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207142836765.png)

> 查看镜像的所有 Tag

```
$ crane ls zhongmingmao/alpine
latest
```

### BuildKit

> 基于 `qemu` 虚拟化技术

```
$ builder=builderx

$ docker buildx prune -a -f --verbose
Total:	0B

$ docker buildx stop ${builder} && docker buildx rm ${builder}
builderx removed

$ docker buildx create --name=${builder} --driver docker-container --platform linux/amd64,linux/arm64/v8
builderx

$ docker buildx inspect --bootstrap --builder ${builder}
[+] Building 16.7s (1/1) FINISHED
 => [internal] booting buildkit                                                                                                  16.7s
 => => pulling image moby/buildkit:buildx-stable-1                                                                               16.4s
 => => creating container buildx_buildkit_builderx0                                                                               0.4s
Name:          builderx
Driver:        docker-container
Last Activity: 2023-02-07 07:16:19 +0000 UTC

Nodes:
Name:      builderx0
Endpoint:  unix:///var/run/docker.sock
Status:    running
Buildkit:  v0.9.3
Platforms: linux/amd64*, linux/arm64*
Labels:
 org.mobyproject.buildkit.worker.executor:    oci
 org.mobyproject.buildkit.worker.hostname:    c11aa7b46da1
 org.mobyproject.buildkit.worker.snapshotter: overlayfs
GC Policy rule#0:
 All:           false
 Filters:       type==source.local,type==exec.cachemount,type==source.git.checkout
 Keep Duration: 48h0m0s
 Keep Bytes:    488.3MiB
GC Policy rule#1:
 All:           false
 Keep Duration: 1440h0m0s
 Keep Bytes:    2.794GiB
GC Policy rule#2:
 All:        false
 Keep Bytes: 2.794GiB
GC Policy rule#3:
 All:        true
 Keep Bytes: 2.794GiB

$ docker buildx build --no-cache --builder ${builder} --platform linux/amd64,linux/arm64/v8 -t zhongmingmao/multi-arch-app:v1 --push .
[+] Building 215.0s (14/14) FINISHED                                                                         docker-container:builderx
 => [internal] load build definition from Dockerfile                                                                              0.0s
 => => transferring dockerfile: 208B                                                                                              0.0s
 => [internal] load .dockerignore                                                                                                 0.0s
 => => transferring context: 2B                                                                                                   0.0s
 => [linux/arm64 internal] load metadata for docker.io/library/ubuntu:22.04                                                       4.9s
 => [linux/amd64 internal] load metadata for docker.io/library/ubuntu:22.04                                                       5.2s
 => [auth] library/ubuntu:pull token for registry-1.docker.io                                                                     0.0s
 => [auth] library/ubuntu:pull token for registry-1.docker.io                                                                     0.0s
 => [linux/arm64 1/2] FROM docker.io/library/ubuntu:22.04@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2b41af9  84.0s
 => => resolve docker.io/library/ubuntu:22.04@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2b41af999             0.0s
 => => sha256:b91d8878f844c327b4ff924d4973661a399f10256ed50ac7c640b30c5894166b 27.36MB / 27.36MB                                 83.4s
 => => extracting sha256:b91d8878f844c327b4ff924d4973661a399f10256ed50ac7c640b30c5894166b                                         0.5s
 => [linux/amd64 1/2] FROM docker.io/library/ubuntu:22.04@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2b41af9  92.0s
 => => resolve docker.io/library/ubuntu:22.04@sha256:e9569c25505f33ff72e88b2990887c9dcf230f23259da296eb814fc2b41af999             0.0s
 => => sha256:57c139bbda7eb92a286d974aa8fef81acf1a8cbc742242619252c13b196ab499 29.55MB / 29.55MB                                 91.5s
 => => extracting sha256:57c139bbda7eb92a286d974aa8fef81acf1a8cbc742242619252c13b196ab499                                         0.5s
 => [linux/arm64 2/2] WORKDIR /app                                                                                                0.1s
 => [linux/amd64 2/2] WORKDIR /app                                                                                                0.1s
 => exporting to image                                                                                                          117.7s
 => => exporting layers                                                                                                           0.1s
 => => exporting manifest sha256:4f07d70eca595adfc262e92b55f8fa0fbcaa940b5735fbc04b13a9125f326ddb                                 0.0s
 => => exporting config sha256:893c15d5e83641903282025e37593a13a331f4b908c34145b316a14cf871b309                                   0.0s
 => => exporting manifest sha256:45a4ce63c5864fea36890252e8cfa259bffc1a229741f5139fca2c2172401e8a                                 0.0s
 => => exporting config sha256:41cb3eff104dbd8cf3e43b276a07e31d5e3ee6da4ab1e8ca0c47e3168d8bb93b                                   0.0s
 => => exporting manifest list sha256:52b1a891cf23bd3fc512f300a9f3a5510d70434571193726e6abd1894c492481                            0.0s
 => => pushing layers                                                                                                           113.9s
 => => pushing manifest for docker.io/zhongmingmao/multi-arch-app:v1@sha256:52b1a891cf23bd3fc512f300a9f3a5510d70434571193726e6ab  3.7s
 => [auth] zhongmingmao/multi-arch-app:pull,push token for registry-1.docker.io                                                   0.0s
 => [auth] zhongmingmao/multi-arch-app:pull,push token for registry-1.docker.io                                                   0.0s
 => [auth] zhongmingmao/multi-arch-app:pull,push token for registry-1.docker.io                                                   0.0s
```

![image-20240207153242370](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207153242370.png)

# OCI

> OCI - `Open Container Initiative`

![image-20240207170723854](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207170723854.png)

# runc

> runc - `Open Container Initiative runtime`

> runc is a command line client for running applications packaged according to
> the Open Container Initiative (OCI) format and is a compliant implementation of the
> Open Container Initiative specification.

> Containers are configured using `bundles`. A bundle for a container is a directory
> that includes a specification file named "`config.json`" and a `root filesystem`.
> The root filesystem contains the contents of the container.

![image-20240207171252044](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207171252044.png)

## rootfs

```json
$ mkdir /tmp/rootfs

$ cd /tmp/rootfs

$ crane manifest alpine:latest | jq
{
  "manifests": [
    {
      "digest": "sha256:6457d53fb065d6f250e1504b9bc42d5b6c65941d57532c072d929dd0628977d0",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "amd64",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b229a85166aadbde58e73e03c5e2b9737fb4642ffb2d98ba453adc90d144c1d8",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v6"
      },
      "size": 528
    },
    {
      "digest": "sha256:ec299a7ba3c670e38642b0b62a0c779d84b249a3c889757e2b6f841433b4c6fe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm",
        "os": "linux",
        "variant": "v7"
      },
      "size": 528
    },
    {
      "digest": "sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "arm64",
        "os": "linux",
        "variant": "v8"
      },
      "size": 528
    },
    {
      "digest": "sha256:15c46ced65c6abed6a27472a7904b04273e9a8091a5627badd6ff016ab073171",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "386",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:b12b826de1ec8c4237aa09a0287e7be8bd317586f32bf6cd9395ec5dba52a3a2",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "ppc64le",
        "os": "linux"
      },
      "size": 528
    },
    {
      "digest": "sha256:5d0da60400afb021f2d8dbfec8b7d26457e77eb8825cba90eba84319133f0efe",
      "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
      "platform": {
        "architecture": "s390x",
        "os": "linux"
      },
      "size": 528
    }
  ],
  "mediaType": "application/vnd.docker.distribution.manifest.list.v2+json",
  "schemaVersion": 2
}
```

```
$ arch
aarch64

$ crane export alpine:latest@sha256:a0264d60f80df12bc1e6dd98bae6c43debe6667c0ba482711f0d806493467a46 - | tar xv

$ ls
bin  dev  etc  home  lib  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
```

## config.json

```
$ cd /tmp/

$ runc spec
```

```json config.json
{
	"ociVersion": "1.0.2-dev",
	"process": {
		"terminal": true,
		"user": {
			"uid": 0,
			"gid": 0
		},
		"args": [
			"sh"
		],
		"env": [
			"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
			"TERM=xterm"
		],
		"cwd": "/",
		"capabilities": {
			"bounding": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"effective": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"permitted": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"ambient": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			]
		},
		"rlimits": [
			{
				"type": "RLIMIT_NOFILE",
				"hard": 1024,
				"soft": 1024
			}
		],
		"noNewPrivileges": true
	},
	"root": {
		"path": "rootfs",
		"readonly": true
	},
	"hostname": "runc",
	"mounts": [
		{
			"destination": "/proc",
			"type": "proc",
			"source": "proc"
		},
		{
			"destination": "/dev",
			"type": "tmpfs",
			"source": "tmpfs",
			"options": [
				"nosuid",
				"strictatime",
				"mode=755",
				"size=65536k"
			]
		},
		{
			"destination": "/dev/pts",
			"type": "devpts",
			"source": "devpts",
			"options": [
				"nosuid",
				"noexec",
				"newinstance",
				"ptmxmode=0666",
				"mode=0620",
				"gid=5"
			]
		},
		{
			"destination": "/dev/shm",
			"type": "tmpfs",
			"source": "shm",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"mode=1777",
				"size=65536k"
			]
		},
		{
			"destination": "/dev/mqueue",
			"type": "mqueue",
			"source": "mqueue",
			"options": [
				"nosuid",
				"noexec",
				"nodev"
			]
		},
		{
			"destination": "/sys",
			"type": "sysfs",
			"source": "sysfs",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"ro"
			]
		},
		{
			"destination": "/sys/fs/cgroup",
			"type": "cgroup",
			"source": "cgroup",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"relatime",
				"ro"
			]
		}
	],
	"linux": {
		"resources": {
			"devices": [
				{
					"allow": false,
					"access": "rwm"
				}
			]
		},
		"namespaces": [
			{
				"type": "pid"
			},
			{
				"type": "network"
			},
			{
				"type": "ipc"
			},
			{
				"type": "uts"
			},
			{
				"type": "mount"
			},
			{
				"type": "cgroup"
			}
		],
		"maskedPaths": [
			"/proc/acpi",
			"/proc/asound",
			"/proc/kcore",
			"/proc/keys",
			"/proc/latency_stats",
			"/proc/timer_list",
			"/proc/timer_stats",
			"/proc/sched_debug",
			"/sys/firmware",
			"/proc/scsi"
		],
		"readonlyPaths": [
			"/proc/bus",
			"/proc/fs",
			"/proc/irq",
			"/proc/sys",
			"/proc/sysrq-trigger"
		]
	}
}
```

## run

> 启动容器

```
$ runc run runc-app
/ # hostname
runc
/ #
/ # ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 sh
    8 root      0:00 ps aux
/ #
/ #
```

> 查看容器

```
$ runc list
ID          PID         STATUS      BUNDLE      CREATED                         OWNER
runc-app    16571       running     /tmp        2023-02-07T10:10:38.98848122Z   root

$ runc state runc-app
{
  "ociVersion": "1.0.2-dev",
  "id": "runc-app",
  "pid": 16571,
  "status": "running",
  "bundle": "/tmp",
  "rootfs": "/tmp/rootfs",
  "created": "2023-02-07T10:10:38.98848122Z",
  "owner": ""
}

$ runc exec -t runc-app sh
/ # hostname
runc
/ #
/ # ls
bin    etc    lib    mnt    proc   run    srv    tmp    var
dev    home   media  opt    root   sbin   sys    usr
/ #
/ # cat /etc/issue
Welcome to Alpine Linux 3.19
Kernel \r on an \m (\l)

/ # exit
```

> 二次开发：https://github.com/opencontainers

# Manifest

| Type      | Item                   |
| --------- | ---------------------- |
| Workload  | *Deployment*           |
|           | *StatefulSet*          |
|           | DaemonSet              |
|           | Job                    |
|           | CronJob                |
| Service   | *ClusterIP*            |
|           | NodePort               |
|           | *Loadbalancer*         |
|           | Headless - StatefulSet |
|           | *Ingress*              |
| *Config*  | ConfigMap              |
|           | Secret                 |
| *HPA*     |                        |
| *Storage* | StorageClass           |
|           | PV / PVC               |

## kubectl create

> 使用 kubectl create 命令来生成 YAML 模板

```yaml
$ k create deployment nginx --image=nginx -oyaml --dry-run=client
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: nginx
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        resources: {}
status: {}
```

```yaml
$ k create service clusterip my-cs --tcp=5678:8080 -oyaml --dry-run=client
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: my-cs
  name: my-cs
spec:
  ports:
  - name: 5678-8080
    port: 5678
    protocol: TCP
    targetPort: 8080
  selector:
    app: my-cs
  type: ClusterIP
status:
  loadBalancer: {}
```

```yaml
$ k create configmap my-cm --from-literal=name=zhongmingmao --from-literal=city=gz -oyaml --dry-run=client
apiVersion: v1
data:
  city: gz
  name: zhongmingmao
kind: ConfigMap
metadata:
  creationTimestamp: null
  name: my-cm
```

```
$ k create configmap --help
```

## 文件合并

```yaml
apiVersion: v1
kind: Service
metadata:
  name: svc-1
spec:
  selector:
    app: app-1
  ports:
    - port: 8080
      targetPort: 8080

---
apiVersion: v1
kind: Service
metadata:
  name: svc-2
spec:
  selector:
    app: app-2
  ports:
    - port: 8080
      targetPort: 8080
```

## 挪威问题

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  labels:
    name: app
spec:
  containers:
  - name: app
    image: nginx
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
      - containerPort: 80
    env:
      - name: NORWAY
        value: NO # NO 会被转换为布尔值
```

```
y|Y|yes|Yes|YES|n|N|no|No|NO
|true|True|TRUE|false|False|FALSE
|on|On|ON|off|Off|OFF
```

> 不确定时，用`双引号`包裹

## 保留关键字

> 保留关键字不能作为 `Key`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp
data:
  on: "yes" # 自动转换为 True: "yes"
```

## 数字

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  labels:
    name: app
spec:
  containers:
  - name: app
    image: nginx
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
    ports:
      - containerPort: 80
    env:
      - name: NORWAY
        value: 1.10 # 自动转换为数字 1.1，需要用引号包裹
```

## 多行内容

```yaml
key1: >   # 不保留文字间的换行 + 保留末尾换行
  xxx
  yyy
key2: >-  # 不保留文字间的换行 + 不保留末尾换行
  xxx
  yyy
key3: |   # 保留文字间的换行 + 保留末尾换行
  xxx
  yyy
key4: |-  # 保留文字间的换行 + 不保留末尾换行
  xxx
  yyy
```

![image-20240207210233611](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207210233611.png)

## 引用

> 比较少用

![image-20240207211001028](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207211001028.png)

# 微服务

## 架构

![image-20240207215205288](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207215205288.png)

## Manifest

### 目录

```
$ tree
.
|-- k8s-specifications
|   |-- db-deployment.yaml
|   |-- db-service.yaml
|   |-- redis-deployment.yaml
|   |-- redis-service.yaml
|   |-- result-deployment.yaml
|   |-- result-service.yaml
|   |-- vote-deployment.yaml
|   |-- vote-service.yaml
|   `-- worker-deployment.yaml
|-- result
|   |-- docker-compose.test.yml
|   |-- Dockerfile
|   |-- package.json
|   |-- package-lock.json
|   |-- server.js
|   |-- tests
|   |   |-- Dockerfile
|   |   |-- render.js
|   |   `-- tests.sh
|   `-- views
|       |-- angular.min.js
|       |-- app.js
|       |-- index.html
|       |-- socket.io.js
|       `-- stylesheets
|           `-- style.css
|-- seed-data
|   |-- Dockerfile
|   |-- generate-votes.sh
|   `-- make-data.py
|-- vote
|   |-- app.py
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- static
|   |   `-- stylesheets
|   |       `-- style.css
|   `-- templates
|       `-- index.html
`-- worker
    |-- Dockerfile
    |-- Program.cs
    `-- Worker.csproj
```

### 部署

```
$ k --kubeconfig ~/.kube/devops-camp apply -f k8s-specifications
deployment.apps/db created
service/db created
deployment.apps/redis created
service/redis created
deployment.apps/result created
service/result created
deployment.apps/vote created
service/vote created
deployment.apps/worker created

$ k --kubeconfig ~/.kube/devops-camp get pod -A
NAMESPACE     NAME                                      READY   STATUS    RESTARTS   AGE
kube-system   local-path-provisioner-69dff9496c-8rjh2   1/1     Running   0          8m52s
kube-system   coredns-8b9777675-bm792                   1/1     Running   0          8m52s
kube-system   metrics-server-854c559bd-nqpf9            1/1     Running   0          8m52s
default       redis-79f984f6b5-m25sm                    1/1     Running   0          70s
default       db-579b55967d-c9bp7                       1/1     Running   0          70s
default       result-5c4b4bf59c-hnbdr                   1/1     Running   0          69s
default       vote-97d848469-4fmmd                      1/1     Running   0          69s
default       worker-549b9c46d8-6tbmz                   1/1     Running   0          69s

$ k --kubeconfig ~/.kube/devops-camp get svc -owide
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE     SELECTOR
kubernetes   ClusterIP   10.43.0.1       <none>        443/TCP          10m     <none>
db           ClusterIP   10.43.89.33     <none>        5432/TCP         2m25s   app=db
redis        ClusterIP   10.43.239.164   <none>        6379/TCP         2m25s   app=redis
result       NodePort    10.43.7.237     <none>        5001:31001/TCP   2m24s   app=result
vote         NodePort    10.43.153.143   <none>        5000:31000/TCP   2m24s   app=vote
```

> 投票

![image-20240207222429742](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207222429742.png)

![image-20240207222451153](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240207222451153.png)

### 实现

#### Vote

```python
@app.route("/", methods=['POST','GET'])
def hello():
    voter_id = request.cookies.get('voter_id')
    if not voter_id:
        voter_id = hex(random.getrandbits(64))[2:-1]

    vote = None

    if request.method == 'POST':
        redis = get_redis()
        vote = request.form['vote']
        app.logger.info('Received vote for %s', vote)
        data = json.dumps({'voter_id': voter_id, 'vote': vote})
        redis.rpush('votes', data)

    resp = make_response(render_template(
        'index.html',
        option_a=option_a,
        option_b=option_b,
        hostname=hostname,
        vote=vote,
    ))
    resp.set_cookie('voter_id', voter_id)
    return resp
```

#### Worker

```c#
                while (true)
                {
                    // Slow down to prevent CPU spike, only query each 100ms
                    Thread.Sleep(100);

                    // Reconnect redis if down
                    if (redisConn == null || !redisConn.IsConnected) {
                        Console.WriteLine("Reconnecting Redis");
                        redisConn = OpenRedisConnection("redis");
                        redis = redisConn.GetDatabase();
                    }
                    string json = redis.ListLeftPopAsync("votes").Result;
                    if (json != null)
                    {
                        var vote = JsonConvert.DeserializeAnonymousType(json, definition);
                        Console.WriteLine($"Processing vote for '{vote.vote}' by '{vote.voter_id}'");
                        // Reconnect DB if down
                        if (!pgsql.State.Equals(System.Data.ConnectionState.Open))
                        {
                            Console.WriteLine("Reconnecting DB");
                            pgsql = OpenDbConnection("Server=db;Username=postgres;Password=postgres;");
                        }
                        else
                        { // Normal +1 vote requested
                            UpdateVote(pgsql, vote.voter_id, vote.vote);
                        }
                    }
                    else
                    {
                        keepAliveCommand.ExecuteNonQuery();
                    }
                }
```

#### Result

```javascript
async.retry(
  {times: 1000, interval: 1000},
  function(callback) {
    pool.connect(function(err, client, done) {
      if (err) {
        console.error("Waiting for db");
      }
      callback(err, client);
    });
  },
  function(err, client) {
    if (err) {
      return console.error("Giving up");
    }
    console.log("Connected to db");
    getVotes(client);
  }
);

function getVotes(client) {
  client.query('SELECT vote, COUNT(id) AS count FROM votes GROUP BY vote', [], function(err, result) {
    if (err) {
      console.error("Error performing query: " + err);
    } else {
      var votes = collectVotesFromResult(result);
      io.sockets.emit("scores", JSON.stringify(votes)); // 数据实时刷新
    }

    setTimeout(function() {getVotes(client) }, 1000);
  });
}
```

### Dockerfile

> 对于 node.js，使用 `tini` 作为 1 号进程，否则会产生很多`僵尸进程`

```dockerfile
FROM node:18-slim

# add curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# have nodemon available for local dev use (file watching)
RUN npm install -g nodemon

COPY package*.json ./

RUN npm ci \
 && npm cache clean --force \
 && mv /app/node_modules /node_modules

COPY . .

ENV PORT 80
EXPOSE 80

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
```

### 服务依赖

> 1. 通过 `initContainers` 使用 `k8s-wait-for` 来控制 Pod 的`启动顺序`
> 2. 基于`指数退让`，大规模应用集合的启动时间可能会很久

```yaml
kind: StatefulSet
metadata:
  name: develop-oneprovider-krakow
  labels:
    app: develop-oneprovider-krakow
    chart: oneprovider-krakow
    release: develop
    heritage: Tiller
    component: oneprovider
  annotations:
    version: "0.2.17"
spec:
  selector:
    matchLabels:
      app: develop-oneprovider-krakow
      chart: oneprovider-krakow
      release: develop
      heritage: Tiller
      component: "oneprovider"
  serviceName: develop-oneprovider-krakow
  template:
    metadata:
      labels:
        app: develop-oneprovider-krakow
        chart: oneprovider-krakow
        release: develop
        heritage: Tiller
        component: "oneprovider"
      annotations:
        version: "0.2.17"
    spec:
      initContainers:
        - name: wait-for-onezone
          image: ghcr.io/groundnuty/k8s-wait-for:v1.6
          imagePullPolicy: Always
          args:
            - "job"
            - "develop-onezone-ready-check"
        - name: wait-for-volume-ceph
          image: ghcr.io/groundnuty/k8s-wait-for:v1.6
          imagePullPolicy: Always
          args:
            - "pod"
            - "-lapp=develop-volume-ceph-krakow"
        - name: wait-for-volume-gluster
          image: ghcr.io/groundnuty/k8s-wait-for:v1.6
          imagePullPolicy: Always
          args:
            - "pod"
            - "-lapp=develop-volume-gluster-krakow"
      containers:
      - name: oneprovider
        image: docker.onedata.org/oneprovider:ID-a3a9ff0d78
        imagePullPolicy: Always
```

### 数据初始化

1. 业务代码负责初始化
2. 通过 `K8S Job` 进行初始化

# Helm

> `动态 Manifests`

1. 管理 K8S 对象
2. 将多个微服务的工作负载、配置对象等`封装`成一个应用
3. 屏蔽终端用户使用的复杂度
4. `参数化`、`模板化`，支持多环境

## Helm Chart

1. https://github.com/bitnami/charts
2. https://artifacthub.io

## 核心概念

| Concepts     | Desc                                                   |
| ------------ | ------------------------------------------------------ |
| `Chart`      | K8S 应用安装包，包含应用的 K8S 对象，用于创建实例      |
| `Release`    | 使用默认或者特定参数安装的 Helm 实例（`运行中`的实例） |
| `Repository` | 用于`存储`和`分发` Helm Chart 仓库（`Git`、`OCI`）     |

## 常用命令

| Command                          | Desc                                             |
| -------------------------------- | ------------------------------------------------ |
| install                          | 安装 Helm Chart                                  |
| `uninstall`                      | 卸载 Helm Chart，不会删除 `PVC` 和 `PV`          |
| get / status / list              | 获取 Helm Release 信息（存储在 `K8S Secret` 中） |
| repo add / list / remove / index | Repository 相关命令                              |
| search                           | 在 Repository 中查找 Helm Chart                  |
| `create` / `package`             | 创建和打包 Helm Chart                            |
| `pull`                           | 拉取 Helm Chart                                  |

## Scratch

> 创建 Helm Chart
> templates 为 manifests 模板，charts 为`依赖`的子 Chart，`helm dependency build` 会`拉取`远端仓库的 Chart

```
$ h create demo
Creating demo

$ tree
.
└── demo
    ├── Chart.yaml
    ├── charts
    ├── templates
    │   ├── NOTES.txt
    │   ├── _helpers.tpl
    │   ├── deployment.yaml
    │   ├── hpa.yaml
    │   ├── ingress.yaml
    │   ├── service.yaml
    │   ├── serviceaccount.yaml
    │   └── tests
    │       └── test-connection.yaml
    └── values.yaml

5 directories, 10 files
```

> Chart.yaml

```yaml
apiVersion: v2
name: demo
description: A Helm chart for Kubernetes

# A chart can be either an 'application' or a 'library' chart.
#
# Application charts are a collection of templates that can be packaged into versioned archives
# to be deployed.
#
# Library charts provide useful utilities or functions for the chart developer. They're included as
# a dependency of application charts to inject those utilities and functions into the rendering
# pipeline. Library charts do not define any templates and therefore cannot be deployed.
type: application

# This is the chart version. This version number should be incremented each time you make changes
# to the chart and its templates, including the app version.
# Versions are expected to follow Semantic Versioning (https://semver.org/)
version: 0.1.0

# This is the version number of the application being deployed. This version number should be
# incremented each time you make changes to the application. Versions are not expected to
# follow Semantic Versioning. They should reflect the version the application is using.
# It is recommended to use it with quotes.
appVersion: "1.16.0"
```

| Key            | Desc                  |
| -------------- | --------------------- |
| apiVersion     | API 版本，默认 v2     |
| name           | Helm Chart 名称       |
| type           | application / library |
| version        | Helm Chart 版本       |
| appVersion     | 应用版本              |
| `dependencies` | 依赖其它子 Chart      |

> values.yaml

```yaml
# Default values for demo.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

replicaCount: 1

image:
  repository: nginx
  pullPolicy: IfNotPresent
  # Overrides the image tag whose default is the chart appVersion.
  tag: ""

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  # Specifies whether a service account should be created
  create: true
  # Annotations to add to the service account
  annotations: {}
  # The name of the service account to use.
  # If not set and create is true, a name is generated using the fullname template
  name: ""

podAnnotations: {}

podSecurityContext: {}
  # fsGroup: 2000

securityContext: {}
  # capabilities:
  #   drop:
  #   - ALL
  # readOnlyRootFilesystem: true
  # runAsNonRoot: true
  # runAsUser: 1000

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: ""
  annotations: {}
    # kubernetes.io/ingress.class: nginx
    # kubernetes.io/tls-acme: "true"
  hosts:
    - host: chart-example.local
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls: []
  #  - secretName: chart-example-tls
  #    hosts:
  #      - chart-example.local

resources: {}
  # We usually recommend not to specify default resources and to leave this as a conscious
  # choice for the user. This also increases chances charts run on environments with little
  # resources, such as Minikube. If you do want to specify resources, uncomment the following
  # lines, adjust them as necessary, and remove the curly braces after 'resources:'.
  # limits:
  #   cpu: 100m
  #   memory: 128Mi
  # requests:
  #   cpu: 100m
  #   memory: 128Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80
  # targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}
```

> templates/deployment.yaml
>
> 1. `image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"`
> 2. `imagePullPolicy: {{ .Values.image.pullPolicy }}`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "demo.fullname" . }}
  labels:
    {{- include "demo.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "demo.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "demo.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "demo.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /
              port: http
          readinessProbe:
            httpGet:
              path: /
              port: http
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

> 本地渲染：`Render chart templates locally and display the output.`

```yaml
$ h template .
---
# Source: demo/templates/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: release-name-demo
  labels:
    helm.sh/chart: demo-0.1.0
    app.kubernetes.io/name: demo
    app.kubernetes.io/instance: release-name
    app.kubernetes.io/version: "1.16.0"
    app.kubernetes.io/managed-by: Helm
---
# Source: demo/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: release-name-demo
  labels:
    helm.sh/chart: demo-0.1.0
    app.kubernetes.io/name: demo
    app.kubernetes.io/instance: release-name
    app.kubernetes.io/version: "1.16.0"
    app.kubernetes.io/managed-by: Helm
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: demo
    app.kubernetes.io/instance: release-name
---
# Source: demo/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: release-name-demo
  labels:
    helm.sh/chart: demo-0.1.0
    app.kubernetes.io/name: demo
    app.kubernetes.io/instance: release-name
    app.kubernetes.io/version: "1.16.0"
    app.kubernetes.io/managed-by: Helm
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: demo
      app.kubernetes.io/instance: release-name
  template:
    metadata:
      labels:
        app.kubernetes.io/name: demo
        app.kubernetes.io/instance: release-name
    spec:
      serviceAccountName: release-name-demo
      securityContext:
        {}
      containers:
        - name: demo
          securityContext:
            {}
          image: "nginx:1.16.0"
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /
              port: http
          readinessProbe:
            httpGet:
              path: /
              port: http
          resources:
            {}
---
# Source: demo/templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "release-name-demo-test-connection"
  labels:
    helm.sh/chart: demo-0.1.0
    app.kubernetes.io/name: demo
    app.kubernetes.io/instance: release-name
    app.kubernetes.io/version: "1.16.0"
    app.kubernetes.io/managed-by: Helm
  annotations:
    "helm.sh/hook": test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['release-name-demo:80']
  restartPolicy: Never
```

> 安装（等价）

1. `h install .`
2. `h template . | k apply -f -`

> 调试：inspect

```
$ h inspect values oci://registry-1.docker.io/bitnamicharts/redis
```

## Dependency

> Chart.yaml

```yaml
apiVersion: v2
name: vote
description: Kubernetes vote application
type: application
version: 0.1.0
appVersion: "0.1.0"

dependencies:
  - name: redis # 子 Chart
    version: "17.16.0"
    repository: "oci://registry-1.docker.io/bitnamicharts"
    condition: redis.enabled
    tags:
      - middleware
  - name: postgresql-ha
    version: "11.9.0"
    repository: "oci://registry-1.docker.io/bitnamicharts"
    condition: postgresql-ha.enabled
    tags:
      - middleware
```

> values.yaml

```yaml
# 父 Chart 覆写子 Chart 的默认值
redis: # 子 Chart 要一致
  enabled: true
  fullnameOverride: redis
  auth:
    enabled: false
# https://github.com/bitnami/charts/blob/cf413a8a118a0dd1288b72b6ae9936f655221e9b/bitnami/redis/values.yaml#L125

postgresql-ha:
  enabled: true
  ...
```

> helm dependency build 会`拉取`远端仓库的 Chart

```
$ helm dependency build
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "koderover-chart" chart repository
...Successfully got an update from the "bitnami" chart repository
Update Complete. ⎈Happy Helming!⎈
Saving 2 charts
Downloading redis from repo oci://registry-1.docker.io/bitnamicharts
Pulled: registry-1.docker.io/bitnamicharts/redis:17.16.0
Digest: sha256:2ac70a7a7aa27e71d05bf95dbf898c9c3901494963070788bfd5eeec65567493
Downloading postgresql-ha from repo oci://registry-1.docker.io/bitnamicharts
Pulled: registry-1.docker.io/bitnamicharts/postgresql-ha:11.9.0
Digest: sha256:099ad0a22567f340b7fe772b50431e9b1eb4bcd56faacccfaf320ce62a576e29
Deleting outdated charts

$ tree .
.
├── Chart.lock
├── Chart.yaml
├── charts
│   ├── postgresql-ha-11.9.0.tgz
│   └── redis-17.16.0.tgz
├── templates
│   ├── result-db-secret.yaml
│   ├── result-deployment.yaml
│   ├── result-service.yaml
│   ├── vote-configmap.yaml
│   ├── vote-deployment.yaml
│   ├── vote-service.yaml
│   ├── worker-db-secret.yaml
│   └── worker-deployment.yaml
└── values.yaml
```

## 高级技术

> `Dependency` 基于 `Subcharts`（放在 `charts` 目录） 来实现

| Key                         | Link                                                         |
| --------------------------- | ------------------------------------------------------------ |
| Built-in Objects            | https://helm.sh/docs/chart_template_guide/builtin_objects/   |
| Template Function List      | https://helm.sh/docs/chart_template_guide/function_list/     |
| Helm Dependency             | https://helm.sh/docs/helm/helm_dependency/                   |
| Debugging Templates         | https://helm.sh/docs/chart_template_guide/debugging/         |
| Subcharts and Global Values | https://helm.sh/docs/chart_template_guide/subcharts_and_globals/ |
| Chart Hooks                 | https://helm.sh/docs/topics/charts_hooks/                    |

> `pre-install` - 同样可以执行数据库的初始化

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}"
  labels:
    app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
    app.kubernetes.io/instance: {{ .Release.Name | quote }}
    app.kubernetes.io/version: {{ .Chart.AppVersion }}
    helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    # This is what defines this resource as a hook. Without this line, the
    # job is considered part of the release.
    "helm.sh/hook": post-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    metadata:
      name: "{{ .Release.Name }}"
      labels:
        app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
        app.kubernetes.io/instance: {{ .Release.Name | quote }}
        helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
    spec:
      restartPolicy: Never
      containers:
      - name: post-install-job
        image: "alpine:3.3"
        command: ["/bin/sleep","{{ default "10" .Values.sleepyTime }}"]
```

## Helm Upgrade

![image-20240218230216421](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240218230216421.png)

## Helm Cheat Sheet

> 安装或者升级

```
$ helm upgrade --install <release-name> --values <values file> <chart directory>
```

> 查看 Helm Chart values.yaml 配置信息，主要用于观测 Subcharts

```
$ helm inspect values <CHART>
```

> 查看 Helm Chart Repository 列表

```
$ helm repo list
```

> 查看所有命名空间的 Release

```
$ helm list --all-namespaces
```

> 先更新依赖（Subcharts），再升级应用 -- `helm dependency build`

```
$ helm upgrade <release> <chart> --dependency-update
```

> 回滚应用，只能在 `Manifests` 层级，而非业务层级

```
helm rollback <release> <revision>
```

# Kustomize

## 概述

> 增强版 YAML，类似于`声明式版本`的 `yq`

> Kubernetes native configuration management

1. Kustomize 是一个 `CLI` 工具
2. 可以对 `Manifests` 的`任何字段`进行`覆写`
3. 适用于`多环境`的场景
4. 由 K8S 团队开发，并内置到 `kubectl`

![image-20240219011001692](https://cloud-native-devops-1253868755.cos.ap-guangzhou.myqcloud.com/foundation/image-20240219011001692.png)

> base - 基础目录，不同环境的`通用`的 Manifest

```
$ tree .
.
├── base
│   ├── db-deployment.yaml
│   ├── db-secret.yaml
│   ├── db-service.yaml
│   ├── kustomization.yaml
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml
│   ├── result-db-secret.yaml
│   ├── result-deployment.yaml
│   ├── result-service.yaml
│   ├── vote-configmap.yaml
│   ├── vote-deployment.yaml
│   ├── vote-service.yaml
│   ├── worker-db-secret.yaml
│   └── worker-deployment.yaml
└── overlays
    └── dev
        └── kustomization.yaml

$ ls -a overlays/dev
.  ..  .env  kustomization.yaml
```

```yaml overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

secretGenerator:
  - name: result-db-secret
    files:
      - .env=.env
  - name: worker-db-secret
    envs:
      - .env

configMapGenerator:
  - name: vote-configmap
    literals:
      - OPTION_A=InfoQ
      - OPTION_B=GeekBang
      - REDIS_HOST=redis
```

> kustomization.yaml 常用配置

| Config                | Desc                                                        |
| :-------------------- | ----------------------------------------------------------- |
| resources             | 定义 Manifest 资源、文件、目录或者 URL                      |
| secretGenerator       | 生成 Secret 对象                                            |
| configMapGenerator    | 生成 ConfigMap 对象                                         |
| images                | 覆写 image tag                                              |
| `helmCharts`          | 定义依赖的 helm chart                                       |
| patchesStrategicMerge | 覆写操作（`任意字段`），v1 版本将废弃，建议迁移至 `patches` |

> 渲染（类似于 `helm template <dir>`）

```yaml
$ kubectl kustomize ./overlays/dev
...
---
apiVersion: v1
data:
  DB_HOST: ZGI=
  DB_NAME: cG9zdGdyZXM=
  DB_PASS: cG9zdGdyZXM=
  DB_USER: cG9zdGdyZXM=
  REDIS_HOST: cmVkaXM=
kind: Secret
metadata:
  name: worker-db-secret-b27f9282dh
type: Opaque
---
...
```

> 部署

```
$ kubectl kustomize ./overlays/dev | kubectl apply -f -
```

## 引用 Helm Chart

```
$ tree -L 5
.
├── base
│   ├── kustomization.yaml
│   ├── result-db-secret.yaml
│   ├── result-deployment.yaml
│   ├── result-service.yaml
│   ├── vote-configmap.yaml
│   ├── vote-deployment.yaml
│   ├── vote-service.yaml
│   ├── worker-db-secret.yaml
│   └── worker-deployment.yaml
└── overlays
    └── dev
        ├── charts
        │   ├── postgresql-ha
        │   │   ├── Chart.lock
        │   │   ├── Chart.yaml
        │   │   ├── README.md
        │   │   ├── charts
        │   │   ├── templates
        │   │   └── values.yaml
        │   └── redis
        │       ├── Chart.lock
        │       ├── Chart.yaml
        │       ├── README.md
        │       ├── charts
        │       ├── img
        │       ├── templates
        │       ├── values.schema.json
        │       └── values.yaml
        └── kustomization.yaml
```

> kustomization.yaml

```yaml overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: dev

images:
  - name: xxx/result
    newTag: env
  - name: xxx/vote
    newTag: env
  - name: xxx/worker
    newTag: env

# 使用 patchs 修改镜像版本，效果同 images 字段

# patches:
#   - patch: |-
#       - op: replace
#         path: /spec/template/spec/containers/0/image
#         value: xxx/vote:env
#     target:
#       kind: Deployment
#       name: vote
#   - patch: |-
#       - op: replace
#         path: /spec/template/spec/containers/0/image
#         value: xxx/result:env
#     target:
#       kind: Deployment
#       name: result
#   - patch: |-
#       - op: replace
#         path: /spec/template/spec/containers/0/image
#         value: xxx/worker:env
#     target:
#       kind: Deployment
#       name: worker

secretGenerator:
  - name: result-db-secret
    files:
      - .env=.env
  - name: worker-db-secret
    envs:
      - .env

configMapGenerator:
  - name: vote-configmap
    literals:
      - OPTION_A=InfoQ
      - OPTION_B=GeekBang
      - REDIS_HOST=redis-master

helmCharts:
  - name: redis
    version: "17.16.0"
    # 暂不支持 OCI，使用传统的 Helm Repository：https://github.com/kubernetes-sigs/kustomize/pull/5167
    repo: "https://charts.bitnami.com/bitnami"
    namespace: dev
    valuesInline: # 覆写，类似 Helm Subcharts
      fullnameOverride: redis
      auth:
        enabled: false
  - name: postgresql-ha
    version: "11.9.0"
    repo: "https://charts.bitnami.com/bitnami"
    namespace: dev
    valuesInline:
      fullnameOverride: db
      global:
        postgresql:
          username: postgres
          password: postgres
          database: postgres
          repmgrUsername: postgres
          repmgrPassword: postgres
```

## 对比 Helm Chart

1. 可以覆写`任何` Manifest 字段和值
2. `学习成本`低
3. 在`多环境`下，Base 和 Overlays 模式能够很好地实现 `Manifest` 的`复用`
4. 可以从 `ENV` 生成 ConfigMap、Secret 对象，避免`凭据泄漏`
5. Helm 屏蔽应用细节，对终端用户友好；Kustomize 暴露所有 K8S API，对开发者友好

## 与 Helm Chart 混用

1. `Helm Chart` 主要提供`模板化`和`参数化`的能力，而 `Kustomize` 可以`覆写任意字段`
2. 结合：在 `Helm Hooks` 中集成 Kustomize

## 缺点

1. `分发`没有 Helm Chart 方便
2. `生态`不如 Helm
3. `强依赖`于`目录结构`
