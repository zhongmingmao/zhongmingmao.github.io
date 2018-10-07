---
title: Kafka读书笔记 -- 集群安装与配置
date: 2018-10-08 00:53:07
categories:
tags:
---
## VMware Fusion

### 安装Zookeeper
```
sudo apt-get install zookeeperd
```

<!-- more -->

### Zookeeper运行状态
```
➜  ~ sudo systemctl status zookeeper
● zookeeper.service - LSB: centralized coordination service
   Loaded: loaded (/etc/init.d/zookeeper; generated)
   Active: active (running) since Sun 2018-10-07 16:03:02 UTC; 2min 58s ago
     Docs: man:systemd-sysv-generator(8)
    Tasks: 17 (limit: 1084)
   CGroup: /system.slice/zookeeper.service
           └─24080 /usr/bin/java -cp /etc/zookeeper/conf:/usr/share/java/jline.jar:/usr/share/java/log4j-1.2.jar:/usr/share/java/xercesImpl.jar:/usr/share/java/xmlParserAPIs.jar:

Oct 07 16:03:02 ubuntu systemd[1]: Starting LSB: centralized coordination service...
Oct 07 16:03:02 ubuntu systemd[1]: Started LSB: centralized coordination service.
```

## Docker

<!-- indicate-the-source -->
