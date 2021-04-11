---
title: Spring -- Docker
mathjax: false
date: 2019-08-27 10:38:03
categories:
    - Spring
    - Spring Boot
tags:
    - Spring
    - Spring Boot
    - NoSQL
    - Docker
---

## 容器 / 虚拟机
容器是**应用层的抽象**，是标准化的单元，容器内部不包含**操作系统**的细节和内容，比虚拟机**轻量**
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-nosql-docker-container-vm.png" width=1000/>

<!-- more -->

## Docker
**开发**：简化开发环境的搭建；**运维**：交付系统更为流畅，伸缩性更好
<img src="https://spring-1253868755.cos.ap-guangzhou.myqcloud.com/spring-nosql-docker.png" width=1000/>

## 常用命令

### 镜像相关
1. docker search \<image\>
2. docker pull \<image\>

### 容器相关
1. docker run
2. docker start/stop \<container\>
3. docker ps \<container\>
4. docker logs \<container\>

### docker run
1. docker run [**option...**] image [command] [arg...]
2. -d：后台运行容器
3. -e：设置环境变量
4. \-\-expose/-p 宿主端口:容器端口
5. \-\-name：指定容器名称
6. \-\-link：链接其他容器
7. -v 宿主目录:容器目录，挂载磁盘卷

## mongo

### docker search
```
$ docker search mongo
NAME                                DESCRIPTION                                     STARS               OFFICIAL            AUTOMATED
mongo                               MongoDB document databases provide high avai…   6196                [OK]
mongo-express                       Web-based MongoDB admin interface, written w…   516                 [OK]
tutum/mongodb                       MongoDB Docker image – listens in port 27017…   228                                     [OK]
...
```

### docker pull
```
$ docker pull mongo
Using default tag: latest
latest: Pulling from library/mongo
Digest: sha256:d9e20d05063ba34bac4da916e335c70d6add38241cee1e99ad96c47660bd6955
Status: Image is up to date for mongo:latest
docker.io/library/mongo:latest
```

### docker images
```
docker images
REPOSITORY                  TAG                 IMAGE ID            CREATED             SIZE
mongo                       latest              cdc6740b66a7        4 weeks ago         361MB
zookeeper                   latest              4ebfb9474e72        5 months ago        150MB
mysql                       latest              7bb2586065cd        5 months ago        477MB
...
```

### docker run
```
$ docker run -d --name mongo -p 27017:27017 -v ~/docker-data/mongo:/data/db -e MONGO_INITDB_ROOT_USERNAME=root -e MONGO_INITDB_ROOT_PASSWORD=123456 mongo
19fcb168261d63aa094ed79b7d93d997f1b58330537fc76bd1bebf24f8cbee1f
```

### docker ps
```
$ docker ps -a
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                      NAMES
19fcb168261d        mongo               "docker-entrypoint.s…"   6 minutes ago       Up 6 minutes        0.0.0.0:27017->27017/tcp   mongo
```

### docker exec
```
$ docker exec -it mongo /bin/bash
root@19fcb168261d:/# mongo -uroot -p123456
MongoDB shell version v4.2.0
connecting to: mongodb://127.0.0.1:27017/?compressors=disabled&gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("9413b54e-cf03-4951-9dbb-8e069565a503") }
MongoDB server version: 4.2.0
Welcome to the MongoDB shell.

> show dbs
admin   0.000GB
config  0.000GB
local   0.000GB
```
