---
title: 容器基础 -- Docker容器
mathjax: false
date: 2021-06-07 19:28:42
categories:
    - Cloud Native
    - Kubernetes
tags:
    - Cloud Native
    - Kubernetes
---

# 文件

```
# ls
app.py  Dockerfile  requirements.txt
```

## app.py

```python
from flask import Flask
import socket
import os
 
app = Flask(__name__)
 
@app.route('/')
def hello():
    html = "<h3>Hello {name}!</h3>" \
           "<b>Hostname:</b> {hostname}<br/>"           
    return html.format(name=os.getenv("NAME", "world"), hostname=socket.gethostname())
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80)
```

## requirements.txt

```
Flask
```

<!-- more -->

## Dockerfile

```dockerfile
# 使用官方提供的 Python 开发镜像作为基础镜像
FROM python:2.7-slim
 
# 将工作目录切换为 /app
WORKDIR /app
 
# 将当前目录下的所有内容复制到 /app 下
ADD . /app
 
# 使用 pip 命令安装这个应用所需要的依赖
# RUN原语：在容器里执行shell命令
RUN pip install --trusted-host pypi.python.org -r requirements.txt
 
# 允许外界访问容器的 80 端口
EXPOSE 80
 
# 设置环境变量
ENV NAME World
 
# 设置容器进程为：python app.py，即：这个 Python 应用的启动命令
# app.py的实际路径为/app/app.py
# CMD ["python", "app.py"] 等价于 docker run python app.py
# ENTRYPOINT和CMD都是Docker容器进程启动所必需的参数，完整的执行格式为『ENTRYPOINT CMD』
# 默认情况下，Docker会提供一个隐含的ENTRYPOINT，即/bin/sh -c，所以完整进程/bin/sh -c "python app.py"
# CMD的内容为ENTRYPOINT的参数，Docker容器的启动进程为ENTRYPOINT，而非CMD
CMD ["python", "app.py"]
```

# 制作镜像

1. docker build会自动加载当前目录下的Dockerfile，按照顺序执行文件中的原语
   - 等同于：使用基础镜像启动一个容器，让后在容器中依次执行Dockerfile中的原语
2. Dockerfile中的**每个原语**执行后，都会**生成对应的镜像层**，哪怕原语本身没有明显地修改文件的操作（如ENV原语）

```
# docker build -t helloworld .
Sending build context to Docker daemon  4.608kB
Step 1/7 : FROM python:2.7-slim
 ---> eeb27ee6b893
Step 2/7 : WORKDIR /app

Removing intermediate container 45d5ebc1c92d
 ---> 0f117d95ad46
Step 3/7 : ADD . /app
 ---> 942777f77075
Step 4/7 : RUN pip install --trusted-host pypi.python.org -r requirements.txt
 ---> Running in 6b1b0be3c16e
DEPRECATION: Python 2.7 reached the end of its life on January 1st, 2020. Please upgrade your Python as Python 2.7 is no longer maintained. A future version of pip will drop support for Python 2.7. More details about Python 2 support in pip, can be found at https://pip.pypa.io/en/latest/development/release-process/#python-2-support
Collecting Flask
  Downloading Flask-1.1.4-py2.py3-none-any.whl (94 kB)
Collecting click<8.0,>=5.1
  Downloading click-7.1.2-py2.py3-none-any.whl (82 kB)
Collecting Werkzeug<2.0,>=0.15
  Downloading Werkzeug-1.0.1-py2.py3-none-any.whl (298 kB)
Collecting Jinja2<3.0,>=2.10.1
  Downloading Jinja2-2.11.3-py2.py3-none-any.whl (125 kB)
Collecting itsdangerous<2.0,>=0.24
  Downloading itsdangerous-1.1.0-py2.py3-none-any.whl (16 kB)
Collecting MarkupSafe>=0.23
  Downloading MarkupSafe-1.1.1-cp27-cp27mu-manylinux1_x86_64.whl (24 kB)
Installing collected packages: click, Werkzeug, MarkupSafe, Jinja2, itsdangerous, Flask
Successfully installed Flask-1.1.4 Jinja2-2.11.3 MarkupSafe-1.1.1 Werkzeug-1.0.1 click-7.1.2 itsdangerous-1.1.0
WARNING: You are using pip version 20.0.2; however, version 20.3.4 is available.
You should consider upgrading via the '/usr/local/bin/python -m pip install --upgrade pip' command.
Removing intermediate container 6b1b0be3c16e
 ---> efb50bb99805
Step 5/7 : EXPOSE 80
 ---> Running in c7497f34f744
Removing intermediate container c7497f34f744
 ---> b3f363f4b3e1
Step 6/7 : ENV NAME World
 ---> Running in 3d7b557db5bc
Removing intermediate container 3d7b557db5bc
 ---> f88a74cffa75
Step 7/7 : CMD ["python", "app.py"]
 ---> Running in ad83fbf8d4e7
Removing intermediate container ad83fbf8d4e7
 ---> 2a0c404d778a
Successfully built 2a0c404d778a
Successfully tagged helloworld:latest

# docker images helloworld
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
helloworld          latest              2a0c404d778a        2 minutes ago       158MB
```

```
# docker image inspect python:2.7-slim
...
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:b60e5c3bcef2f42ec42648b3acf7baf6de1fa780ca16d9180f3b4a3f266fe7bc",
                "sha256:568944187d9378b07cf2e2432115605b71c36ef566ec77fbf04516aab0bcdf8e",
                "sha256:7ea2b60b0a086d9faf2ba0a52d4e2f940d9361ed4179642686d1d8b59460667c",
                "sha256:7a287aad297b39792ee705ad5ded9ba839ee3f804fa3fb0b81bb8eb9f9acbf88"
            ]
        },
...

# docker image inspect helloworld:latest
...
        "RootFS": {
            "Type": "layers",
            "Layers": [
                "sha256:b60e5c3bcef2f42ec42648b3acf7baf6de1fa780ca16d9180f3b4a3f266fe7bc",
                "sha256:568944187d9378b07cf2e2432115605b71c36ef566ec77fbf04516aab0bcdf8e",
                "sha256:7ea2b60b0a086d9faf2ba0a52d4e2f940d9361ed4179642686d1d8b59460667c",
                "sha256:7a287aad297b39792ee705ad5ded9ba839ee3f804fa3fb0b81bb8eb9f9acbf88",
                "sha256:ede423dfd7bfffd42f310416f4bf2f72aacc6780afdd0edf2485ee4e909b614a",
                "sha256:e1fcb508888bebba83e3711171f8e23f3e45b0a4e0f9cf5630fb0598eb7e93e8",
                "sha256:a3722e174a4aa76a4507bbb82d78a0ca6a64b0e51a4adccf7ff076a2a24b6eb8"
            ]
        },
...
```

# 启动容器

```
# docker run -d -p 4000:80 helloworld
43f306bcf9c8c62dbf15660c09603e8dbcbaec9dff73b6de488733c6bbf8249e

# docker ps -a
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                  NAMES
43f306bcf9c8        helloworld          "python app.py"     2 minutes ago       Up 2 minutes        0.0.0.0:4000->80/tcp   flamboyant_minsky
```

## rootfs

```
# cat /proc/mounts | grep aufs
none /var/lib/docker/aufs/mnt/9927e87c00ca9364903dab60f05dd477f5a9a2bbd509fd30d3ffd792338a9229 aufs rw,relatime,si=63c6fc4814e43f67,dio,dirperm1 0 0

# cat /sys/fs/aufs/si_63c6fc4814e43f67/br[0-9]*
/var/lib/docker/aufs/diff/9927e87c00ca9364903dab60f05dd477f5a9a2bbd509fd30d3ffd792338a9229=rw
/var/lib/docker/aufs/diff/9927e87c00ca9364903dab60f05dd477f5a9a2bbd509fd30d3ffd792338a9229-init=ro+wh
/var/lib/docker/aufs/diff/ce6d2d4b2362f5c6d9b397c74412a386fdfed422cf84953af2c4da4d8c23c9da=ro+wh
/var/lib/docker/aufs/diff/e1c48a365778c69c96b02ca1d154a138db8635b6478c332107885d7f719f4f05=ro+wh
/var/lib/docker/aufs/diff/3794d8fbac88bd09842534521e8081ccb8872fe75270ae69ab687da1ddd10fc4=ro+wh
/var/lib/docker/aufs/diff/1f5231ba2a02c3a36613b9514440b5a7e088d2a6235e8a901f4d7e1dd979edd8=ro+wh
/var/lib/docker/aufs/diff/5ac93dd322f429423f659b33234d3a6c071d7b1d9d9a570a1fefb35c6fe03e4b=ro+wh
/var/lib/docker/aufs/diff/8bea158e152fb8f0127fc6ee79be52c4284ee8451864e262246ec35c16d39495=ro+wh
/var/lib/docker/aufs/diff/2dbf1f1e10f6749721ea8e57c3ba196b1ea1ac4620e95c6de22ce0fe15165b02=ro+wh
```

## 访问服务

```
# curl http://localhost:4000
<h3>Hello World!</h3><b>Hostname:</b> 43f306bcf9c8<br/>

# docker inspect 43f306bcf9c8
...
            "IPAddress": "172.17.0.2",
...

# curl http://172.17.0.2:80
<h3>Hello World!</h3><b>Hostname:</b> 43f306bcf9c8<br/>
```

# tag & push & commit

## tag

给容器镜像起一个完整的名字（格式：`Repository/Image:Version`）

```
# docker tag helloworld:latest zhongmingmao/helloworld:v1
```

## push

```
# docker push zhongmingmao/helloworld:v1
The push refers to repository [docker.io/zhongmingmao/helloworld]
a3722e174a4a: Pushed
e1fcb508888b: Pushed
ede423dfd7bf: Pushed
7a287aad297b: Mounted from library/python
7ea2b60b0a08: Mounted from library/python
568944187d93: Mounted from library/python
b60e5c3bcef2: Mounted from library/python
v1: digest: sha256:b2599fea639eb0553053bfc514cfdaef70d1d9d80171c69426fd2d60fdbd19ae size: 1787
```

## commit

把一个**正在运行**的容器，直接提交为一个镜像

```
# docker ps -a
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                  NAMES
43f306bcf9c8        helloworld          "python app.py"     About an hour ago   Up About an hour    0.0.0.0:4000->80/tcp   flamboyant_minsky

# docker exec -it 43f306bcf9c8 /bin/sh
# touch test.txt
# exit

# docker commit 43f306bcf9c8 zhongmingmao/helloworld:v2
sha256:c22d8e4c2a0c902e8c8859ec821d875c31952c184dd7ad69219ac0cb554963d9

# docker images zhongmingmao/helloworld
REPOSITORY                TAG                 IMAGE ID            CREATED              SIZE
zhongmingmao/helloworld   v2                  c22d8e4c2a0c        About a minute ago   158MB
zhongmingmao/helloworld   v1                  2a0c404d778a        About an hour ago    158MB

# docker push zhongmingmao/helloworld:v2
The push refers to repository [docker.io/zhongmingmao/helloworld]
cf14503d0143: Pushed
a3722e174a4a: Layer already exists
e1fcb508888b: Layer already exists
ede423dfd7bf: Layer already exists
7a287aad297b: Layer already exists
7ea2b60b0a08: Layer already exists
568944187d93: Layer already exists
b60e5c3bcef2: Layer already exists
v2: digest: sha256:9d8c5db76bb780c1728ee71100b088654ce4fa3d2f4a3a4a31bf1e9edefc0930 size: 1996
```

![](https://cloud-native-kubernetes-1253868755.cos.ap-guangzhou.myqcloud.com/geek/image-20210607234025959.png)

# exec

获取正在运行的Docker容器的PID

```
# docker inspect --format '{{.State.Pid}}' 43f306bcf9c8
16612
```

查看进程的**Namespace信息**

```
# ll /proc/16612/ns/
total 0
dr-x--x--x 2 root root 0 Jun  7 22:47 ./
dr-xr-xr-x 9 root root 0 Jun  7 22:47 ../
lrwxrwxrwx 1 root root 0 Jun  7 23:47 cgroup -> cgroup:[4026531835]
lrwxrwxrwx 1 root root 0 Jun  7 23:34 ipc -> ipc:[4026532523]
lrwxrwxrwx 1 root root 0 Jun  7 23:34 mnt -> mnt:[4026532521]
lrwxrwxrwx 1 root root 0 Jun  7 22:47 net -> net:[4026532526]
lrwxrwxrwx 1 root root 0 Jun  7 23:34 pid -> pid:[4026532524]
lrwxrwxrwx 1 root root 0 Jun  7 23:47 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Jun  7 23:34 uts -> uts:[4026532522]
```

exec的原理：通过`setns()`系统调用，一个进程可以加入到某个进程已有的Namespace当中，看到一样的视图

## setns



# 参考资料

[深入剖析Kubernetes](https://time.geekbang.org/column/intro/100015201)