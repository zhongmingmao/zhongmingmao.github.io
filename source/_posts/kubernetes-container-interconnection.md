---
title: Kubernetes - Container Interconnection
mathjax: false
date: 2022-10-01 00:06:25
cover: https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/docker-04.webp
categories:
  - Kubernetes
  - Docker
tags:
  - Architecture
  - Cloud Native
  - Kubernetes
  - Container
  - Docker
---

# 拷贝数据

```shell
$ docker run -d --rm redis
450662153d83e6e1b30af57443ccfe68d798d5c7f4f8e50d2d287fdde2c1645c

$ docker ps
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS      NAMES
450662153d83   redis     "docker-entrypoint.s…"   7 seconds ago   Up 6 seconds   6379/tcp   cranky_wilbur
```

> 拷贝宿主机文件到容器

```shell
$ md5sum a.txt
d41d8cd98f00b204e9800998ecf8427e  a.txt

$ docker cp a.txt 450:/tmp

$ docker exec -it 450 sh
# ls /tmp
a.txt
# md5sum /tmp/a.txt
d41d8cd98f00b204e9800998ecf8427e  /tmp/a.txt
# exit
```

> 拷贝容器文件到宿主机

```shell
$ docker cp 450:/tmp/a.txt ./b.txt

$ md5sum a.txt b.txt
d41d8cd98f00b204e9800998ecf8427e  a.txt
d41d8cd98f00b204e9800998ecf8427e  b.txt
```

<!-- more -->

# 共享文件

> `宿主机路径:容器内路径`，默认**可读可写**

```shell
$ docker run -d --rm -v /tmp:/tmp redis
854d30bd934d2fc7309b7fbdaa61decc53f07b5a80538d7f8adb4e4d075c3812

$ docker ps
CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS      NAMES
854d30bd934d   redis     "docker-entrypoint.s…"   4 seconds ago   Up 2 seconds   6379/tcp   optimistic_faraday

$ ls /tmp
VMwareDnD
snap-private-tmp
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-ModemManager.service-H0eOrh
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-colord.service-a6W0qQ
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-power-profiles-daemon.service-Sno1CA
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-switcheroo-control.service-595Ivo
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-logind.service-sKN5CO
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-oomd.service-T9jJFH
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-resolved.service-Ptf06D
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-timesyncd.service-sYdBKS
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-upower.service-8tFVxS
tracker-extract-3-files.1000
tracker-extract-3-files.127
vmware-root_687-4022112208

$ docker exec -it 854 sh
# ls /tmp
VMwareDnD
snap-private-tmp
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-ModemManager.service-H0eOrh
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-colord.service-a6W0qQ
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-power-profiles-daemon.service-Sno1CA
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-switcheroo-control.service-595Ivo
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-logind.service-sKN5CO
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-oomd.service-T9jJFH
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-resolved.service-Ptf06D
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-systemd-timesyncd.service-sYdBKS
systemd-private-9d1db53987b445ac93e1a3cce43ef75e-upower.service-8tFVxS
tracker-extract-3-files.1000
tracker-extract-3-files.127
vmware-root_687-4022112208
```

# 网络互通

| 网络模式               | 说明                                                         | 优缺点                                                     |
| ---------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| **null**               | 没有网络                                                     |                                                            |
| **host**               | 去掉容器的网络隔离，直接使用**宿主机网络**<br />容器会共享宿主机的 IP 地址和网卡 | 没有中间层，通信效率高<br />缺少网络隔离，容易导致端口冲突 |
| **bridge**（**默认**） | 容器和宿主机通过**虚拟网卡**接入**虚拟网桥**（**docker 0**） | 多了虚拟网卡和虚拟网桥，通信效率降低                       |

## host

> 宿主机

```shell
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:f2:2e:e2 brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.140.129/24 brd 192.168.140.255 scope global dynamic noprefixroute ens32
       valid_lft 1477sec preferred_lft 1477sec
    inet6 fe80::aa3d:7061:a156:f4c6/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:e3:13:3f:0b brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:e3ff:fe13:3f0b/64 scope link
       valid_lft forever preferred_lft forever
```

> 容器

```shell
$ docker run -d --rm --net=host nginx:alpine
469487dcf1d9233e4eab6b76ee1fd4d61d97c70ef7e96c301d40d53d5545e64c

$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS     NAMES
469487dcf1d9   nginx:alpine   "/docker-entrypoint.…"   4 seconds ago   Up 3 seconds             sweet_jones

$ docker exec 469 ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP qlen 1000
    link/ether 00:0c:29:f2:2e:e2 brd ff:ff:ff:ff:ff:ff
    inet 192.168.140.129/24 brd 192.168.140.255 scope global dynamic noprefixroute ens32
       valid_lft 1356sec preferred_lft 1356sec
    inet6 fe80::aa3d:7061:a156:f4c6/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN
    link/ether 02:42:e3:13:3f:0b brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:e3ff:fe13:3f0b/64 scope link
       valid_lft forever preferred_lft forever
```

## bridge

> 默认模式，不需要显式指定 `--net=bridge`

![image-20230130225125143](https://kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/docker/image-20230130225125143.png)

```shell
$ docker run -d --rm nginx:alpine
377ac0e8adb82d8cd78be651a6f72fa22f0d7345bca2754a3b716eb821087d64

$ docker run -d --rm redis
5c771d734d9e1c861ab221225b7df7cfbdd5f3591058b7e88343bcdb60a8e6d5

$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED          STATUS         PORTS      NAMES
5c771d734d9e   redis          "docker-entrypoint.s…"   5 seconds ago    Up 5 seconds   6379/tcp   gracious_lamarr
377ac0e8adb8   nginx:alpine   "/docker-entrypoint.…"   10 seconds ago   Up 9 seconds   80/tcp     unruffled_vaughan
```

> **eth0@if9** 为容器的**虚拟网卡**

```shell
$ docker exec 377 ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
8: eth0@if9: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1500 qdisc noqueue state UP
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever

$ docker inspect 5c7 | grep IPAddress
            "SecondaryIPAddresses": null,
            "IPAddress": "172.17.0.3",
                    "IPAddress": "172.17.0.3",
```

> **docker0** 为**虚拟网桥**，**vetha8f7c4a@if8** 为**虚拟网卡**（桥接 Nginx 容器的虚拟网卡 eth0@if9）

```shell
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: ens32: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:0c:29:f2:2e:e2 brd ff:ff:ff:ff:ff:ff
    altname enp2s0
    inet 192.168.140.129/24 brd 192.168.140.255 scope global dynamic noprefixroute ens32
       valid_lft 1589sec preferred_lft 1589sec
    inet6 fe80::aa3d:7061:a156:f4c6/64 scope link noprefixroute
       valid_lft forever preferred_lft forever
3: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:e3:13:3f:0b brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 brd 172.17.255.255 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:e3ff:fe13:3f0b/64 scope link
       valid_lft forever preferred_lft forever
9: vetha8f7c4a@if8: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default
    link/ether b6:38:ea:35:5b:2d brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet6 fe80::b438:eaff:fe35:5b2d/64 scope link
       valid_lft forever preferred_lft forever
11: veth880e4a1@if10: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP group default
    link/ether a6:aa:48:3b:13:29 brd ff:ff:ff:ff:ff:ff link-netnsid 1
    inet6 fe80::a4aa:48ff:fe3b:1329/64 scope link
       valid_lft forever preferred_lft forever
```

### 端口映射

> `本机端口:容器端口`

```shell
$ docker run -d --rm -p 8888:80 nginx:alpine
6cf06471e885d640d5311ba0f874acbc166f53f0b8cefaa18ce4625f02eaba09

$ docker run -d --rm -p 9999:80 nginx:alpine
299c1f238040c90b5fe73df019fd8eb475e323f9885ee7537d84841572d3fb46

$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                                   NAMES
299c1f238040   nginx:alpine   "/docker-entrypoint.…"   4 seconds ago   Up 2 seconds   0.0.0.0:9999->80/tcp, :::9999->80/tcp   stoic_einstein
6cf06471e885   nginx:alpine   "/docker-entrypoint.…"   8 seconds ago   Up 7 seconds   0.0.0.0:8888->80/tcp, :::8888->80/tcp   priceless_archimedes
```

```shell
$ curl -I 127.1:8888
HTTP/1.1 200 OK
Server: nginx/1.23.2
Date: Mon, 30 Jan 2023 15:09:38 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Wed, 19 Oct 2022 10:28:53 GMT
Connection: keep-alive
ETag: "634fd165-267"
Accept-Ranges: bytes

$ curl -I 127.1:9999
HTTP/1.1 200 OK
Server: nginx/1.23.2
Date: Mon, 30 Jan 2023 15:09:43 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Wed, 19 Oct 2022 10:28:53 GMT
```



