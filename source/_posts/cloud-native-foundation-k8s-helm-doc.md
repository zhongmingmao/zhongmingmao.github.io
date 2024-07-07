---
title: Kubernetes - Helm Doc
mathjax: false
date: 2023-05-11 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/helm.jpg
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 基本概念

1. Chart
   - 包含在 Kubernetes 集群内部运行的应用程序、工具和服务所需的`所有资源定义`
2. Repository
   - 用于存放和共享 Chart
3. Release
   - 运行在 Kubernetes 集群中的 Chart 实例
   - 一个 Chart 可以在同一个集群中被安装多次，每次安装都会创建一个 Release

<!-- more -->

# 基本使用

## Search

| Source | Desc                         |
| ------ | ---------------------------- |
| hub    | 从 Artifact Hub 中搜索       |
| repo   | 基于本地 repo 搜索，无需联网 |

### hub

```
$ h search hub wordpress
URL                                               	CHART VERSION	APP VERSION        	DESCRIPTION
https://artifacthub.io/packages/helm/kube-wordp...	0.1.0        	1.1                	this is my wordpress package
https://artifacthub.io/packages/helm/wordpress-...	1.0.2        	1.0.0              	A Helm chart for deploying Wordpress+Mariadb st...
https://artifacthub.io/packages/helm/bitnami-ak...	15.2.13      	6.1.0              	WordPress is the world's most popular blogging ...
...
```

### repo

```
$ h repo add brigade https://brigadecore.github.io/charts
"brigade" has been added to your repositories

$ h repo list
NAME   	URL
brigade	https://brigadecore.github.io/charts

$ h repo update brigade
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "brigade" chart repository
Update Complete. ⎈Happy Helming!⎈

$ h search repo brigade
NAME                        	CHART VERSION	APP VERSION	DESCRIPTION
brigade/brigade             	1.10.0       	v1.5.0     	Brigade provides event-driven scripting of Kube...
brigade/brigade-github-app  	0.8.0        	v0.4.1     	The Brigade GitHub App, an advanced gateway for...
brigade/brigade-github-oauth	0.4.0        	v0.20.0    	The legacy OAuth GitHub Gateway for Brigade
brigade/brigade-k8s-gateway 	0.3.0        	           	A Helm chart for Kubernetes
brigade/brigade-project     	1.1.0        	v1.0.0     	Create a Brigade project
brigade/kashti              	0.7.0        	v0.4.0     	A Helm chart for Kubernetes
```

> 支持模糊匹配

```
$ h search repo kash
NAME          	CHART VERSION	APP VERSION	DESCRIPTION
brigade/kashti	0.7.0        	v0.4.0     	A Helm chart for Kubernetes
```

## Install

> Helm 客户端不会等待所有资源都运行才退出

```
$ h install happy-panda bitnami/wordpress
NAME: happy-panda
LAST DEPLOYED: Sat Jun 29 14:55:11 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: wordpress
CHART VERSION: 22.4.16
APP VERSION: 6.5.5

** Please be patient while the chart is being deployed **

Your WordPress site can be accessed through the following DNS name from within your cluster:

    happy-panda-wordpress.default.svc.cluster.local (port 80)

To access your WordPress site from outside the cluster follow the steps below:

1. Get the WordPress URL by running these commands:

  NOTE: It may take a few minutes for the LoadBalancer IP to be available.
        Watch the status with: 'kubectl get svc --namespace default -w happy-panda-wordpress'

   export SERVICE_IP=$(kubectl get svc --namespace default happy-panda-wordpress --template "{{ range (index .status.loadBalancer.ingress 0) }}{{ . }}{{ end }}")
   echo "WordPress URL: http://$SERVICE_IP/"
   echo "WordPress Admin URL: http://$SERVICE_IP/admin"

2. Open a browser and access WordPress using the obtained URL.

3. Login with the following credentials below to see your blog:

  echo Username: user
  echo Password: $(kubectl get secret --namespace default happy-panda-wordpress -o jsonpath="{.data.wordpress-password}" | base64 -d)

WARNING: There are "resources" sections in the chart not set. Using "resourcesPreset" is not recommended for production. For production installations, please set the following values according to your workload needs:
  - resources
+info https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
```

> Release 列表

```
$ h list
NAME       	NAMESPACE	REVISION	UPDATED                                	STATUS  	CHART            	APP VERSION
happy-panda	default  	1       	2023-06-29 14:55:11.589741237 +0800 CST	deployed	wordpress-22.4.16	6.5.5
```

```
$ k get all
NAME                                         READY   STATUS    RESTARTS        AGE
pod/happy-panda-mariadb-0                    1/1     Running   0               18m
pod/happy-panda-wordpress-69bf4fbf69-qsqsl   1/1     Running   3 (8m44s ago)   18m

NAME                            TYPE           CLUSTER-IP    EXTERNAL-IP   PORT(S)                      AGE
service/happy-panda-mariadb     ClusterIP      10.98.93.96   <none>        3306/TCP                     18m
service/happy-panda-wordpress   LoadBalancer   10.103.7.40   <pending>     80:32599/TCP,443:32670/TCP   18m
service/kubernetes              ClusterIP      10.96.0.1     <none>        443/TCP                      21h

NAME                                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/happy-panda-wordpress   1/1     1            1           18m

NAME                                               DESIRED   CURRENT   READY   AGE
replicaset.apps/happy-panda-wordpress-69bf4fbf69   1         1         1       18m

NAME                                   READY   AGE
statefulset.apps/happy-panda-mariadb   1/1     18m
```

> Release 状态

```
$ h status happy-panda
NAME: happy-panda
LAST DEPLOYED: Sat Jun 29 14:55:11 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
CHART NAME: wordpress
CHART VERSION: 22.4.16
APP VERSION: 6.5.5

** Please be patient while the chart is being deployed **

Your WordPress site can be accessed through the following DNS name from within your cluster:

    happy-panda-wordpress.default.svc.cluster.local (port 80)

To access your WordPress site from outside the cluster follow the steps below:

1. Get the WordPress URL by running these commands:

  NOTE: It may take a few minutes for the LoadBalancer IP to be available.
        Watch the status with: 'kubectl get svc --namespace default -w happy-panda-wordpress'

   export SERVICE_IP=$(kubectl get svc --namespace default happy-panda-wordpress --template "{{ range (index .status.loadBalancer.ingress 0) }}{{ . }}{{ end }}")
   echo "WordPress URL: http://$SERVICE_IP/"
   echo "WordPress Admin URL: http://$SERVICE_IP/admin"

2. Open a browser and access WordPress using the obtained URL.

3. Login with the following credentials below to see your blog:

  echo Username: user
  echo Password: $(kubectl get secret --namespace default happy-panda-wordpress -o jsonpath="{.data.wordpress-password}" | base64 -d)

WARNING: There are "resources" sections in the chart not set. Using "resourcesPreset" is not recommended for production. For production installations, please set the following values according to your workload needs:
  - resources
+info https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
```

## Custom

> 查看 Chart 的可配置选项

```
$ h show values bitnami/wordpress | head -n 20
# Copyright Broadcom, Inc. All Rights Reserved.
# SPDX-License-Identifier: APACHE-2.0

## @section Global parameters
## Global Docker image parameters
## Please, note that this will override the image parameters, including dependencies, configured to use the global value
## Current available global Docker image parameters: imageRegistry, imagePullSecrets and storageClass
##

## @param global.imageRegistry Global Docker image registry
## @param global.imagePullSecrets Global Docker registry secret names as an array
## @param global.storageClass Global StorageClass for Persistent Volume(s)
##
global:
  imageRegistry: ""
  ## E.g.
  ## imagePullSecrets:
  ##   - myRegistryKeySecretName
  ##
  imagePullSecrets: []
```

### 传递配置

1. `--values` or `-f`
   - 使用 `YAML` 文件覆盖配置，可以指定多次，优先使用`最右边`的文件
2. `--set`
   - 通过命令行的方式对`指定项`进行覆盖
   - `--set` 中的值会被`合并`到 `--values` 中，但 `--set` 中的值`优先级更高`
   - `--set` 中覆盖的内容会被保存在 `ConfigMap` 中
     - `helm get values <release-name>` - 查看指定 Release 中 `--set` 设置的值
     - `helm upgrade --reset-values` 清除 `--set` 中设置的值

### set

> `--set name=value`

```yaml
name: value
```

> `--set a=b,c=d`

```yaml
a: b
c: d
```

> `--set outer.inner=value`

```yaml
outer:
  inner: value
```

> `--set name={a, b, c}`

```yaml
name:
  - a
  - b
  - c
```

> `--set name=[],a=null`

```yaml
name: []
a: null
```

> `--set servers[0].port=80`

```yaml
servers:
  - port: 80
```

> `--set servers[0].port=80,servers[0].host=example`

```yaml
servers:
  - port: 80
    host: example
```

> `--set name=value1\,value2`

```yaml
name: "value1,value2"
```

> `--set nodeSelector."kubernetes\.io/role"=master`

```yaml
nodeSelector:
  kubernetes.io/role: master
```

> `深层嵌套`的数据结构很难用 `--set` 来表达

## Installation

1. Chart Repository
2. 本地 Chart 压缩包
   - helm install foo foo-0.1.1.tgz
3. 本地 Chart 目录
   - helm install foo path/to/foo
4. 完成 URL
   - helm install foo https://example.com/charts/foo-1.2.3.tgz

## Upgrade

> Upgrade - 升级到 Chart 新版本 / 修改 Release 配置

1. 一次 Upgrade 操作会使用已有的 Release 并根据信息进行升级
2. `最小侵入式升级` - 只会更新自上次 Release 以来发生了变更的内容

> Release 使用了相同的 Chart 进行升级，使用了新的 Value 文件

```
$ h upgrade -f panda.yaml happy-panda bitnami/wordpress
Release "happy-panda" has been upgraded. Happy Helming!
NAME: happy-panda
LAST DEPLOYED: Sat Jun 29 15:44:04 2023
NAMESPACE: default
STATUS: deployed
REVISION: 2
TEST SUITE: None
NOTES:
CHART NAME: wordpress
CHART VERSION: 22.4.16
APP VERSION: 6.5.5

** Please be patient while the chart is being deployed **

Your WordPress site can be accessed through the following DNS name from within your cluster:

    happy-panda-wordpress.default.svc.cluster.local (port 80)

To access your WordPress site from outside the cluster follow the steps below:

1. Get the WordPress URL by running these commands:

  NOTE: It may take a few minutes for the LoadBalancer IP to be available.
        Watch the status with: 'kubectl get svc --namespace default -w happy-panda-wordpress'

   export SERVICE_IP=$(kubectl get svc --namespace default happy-panda-wordpress --template "{{ range (index .status.loadBalancer.ingress 0) }}{{ . }}{{ end }}")
   echo "WordPress URL: http://$SERVICE_IP/"
   echo "WordPress Admin URL: http://$SERVICE_IP/admin"

2. Open a browser and access WordPress using the obtained URL.

3. Login with the following credentials below to see your blog:

  echo Username: user
  echo Password: $(kubectl get secret --namespace default happy-panda-wordpress -o jsonpath="{.data.wordpress-password}" | base64 -d)

WARNING: There are "resources" sections in the chart not set. Using "resourcesPreset" is not recommended for production. For production installations, please set the following values according to your workload needs:
  - resources
+info https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
```

```
$ h list
NAME       	NAMESPACE	REVISION	UPDATED                                	STATUS  	CHART            	APP VERSION
happy-panda	default  	2       	2023-06-29 15:44:04.084206339 +0800 CST	deployed	wordpress-22.4.16	6.5.5
```

> 获取 Release 的 Values

```
$ h get values happy-panda
USER-SUPPLIED VALUES:
mariadb.auth.username: user1
```

## Rollback

> Release 版本是一个`增量修订` - Install / Upgrade / Rollback

```
$ h rollback happy-panda 1
Rollback was a success! Happy Helming!
```

```
$ h list
NAME       	NAMESPACE	REVISION	UPDATED                                	STATUS  	CHART            	APP VERSION
happy-panda	default  	3       	2023-06-29 15:49:48.705074051 +0800 CST	deployed	wordpress-22.4.16	6.5.5

$ h history happy-panda
REVISION	UPDATED                 	STATUS    	CHART            	APP VERSION	DESCRIPTION
1       	Sat Jun 29 14:55:11 2023	superseded	wordpress-22.4.16	6.5.5      	Install complete
2       	Sat Jun 29 15:44:04 2023	superseded	wordpress-22.4.16	6.5.5      	Upgrade complete
3       	Sat Jun 29 15:49:48 2023	deployed  	wordpress-22.4.16	6.5.5      	Rollback to 1
```

## Uninstall

> 无法回滚一个已经被卸载的资源

```
$ h uninstall happy-panda
release "happy-panda" uninstalled

$ h list --all
NAME	NAMESPACE	REVISION	UPDATED	STATUS	CHART	APP VERSION
```

## Chart

### Create

```
$ h create deis-workflow
Creating deis-workflow

$ tree deis-workflow
deis-workflow
├── charts
├── Chart.yaml
├── templates
│   ├── deployment.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
│   ├── serviceaccount.yaml
│   ├── service.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml
```

### Lint

```
$ h lint deis-workflow
==> Linting deis-workflow
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

### Package

```
$ h package deis-workflow
Successfully packaged chart and saved it to: /home/zhongmingmao/deis-workflow-0.1.0.tgz
```

### Install

```
$ h install deis-workflow ./deis-workflow-0.1.0.tgz
NAME: deis-workflow
LAST DEPLOYED: Sat Jun 29 16:22:10 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
1. Get the application URL by running these commands:
  export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=deis-workflow,app.kubernetes.io/instance=deis-workflow" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=$(kubectl get pod --namespace default $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace default port-forward $POD_NAME 8080:$CONTAINER_PORT
```

## Cheat Sheet

### Chart

```
helm pull <chart>                       # Download/pull chart 
helm pull <chart> --untar=true          # If set to true, will untar the chart after downloading it
helm pull <chart> --verify              # Verify the package before using it
helm pull <chart> --version <number>    # Default-latest is used, specify a version constraint for the chart version to use
helm dependency list <chart>            # Display a list of a chart’s dependencies:
```

### Install / Uninstall

```
helm install <name> <chart> --dry-run --debug         # Run a test installation to validate chart (p)
helm install <name> <chart> --verify                  # Verify the package before using it 
helm install <name> <chart> --dependency-update       # update dependencies if they are missing before installing the chart
```

### Upgrade / Rollback

```
helm upgrade <release> <chart> --atomic                   # If set, upgrade process rolls back changes made in case of failed upgrade.
helm upgrade <release> <chart> --dependency-update        # update dependencies if they are missing before installing the chart
helm upgrade <release> <chart> --version <version_number> # specify a version constraint for the chart version to use
helm upgrade <release> <chart> --force                    # Force resource updates through a replacement strategy

helm rollback <release> <revision>  --cleanup-on-fail     # Allow deletion of new resources created in this rollback when rollback fails
```

### Repo

```
helm search repo <keyword>        # Search repositories for a keyword in charts
helm search hub <keyword>         # Search for charts in the Artifact Hub or your own hub instance
```

### Release

```
helm list                       # Lists all of the releases for a specified namespace, uses current namespace context if namespace not specified
helm list --all                 # Show all releases without any filter applied, can use -a
helm list --all-namespaces      # List releases across all namespaces, we can use -A
helm -l key1=value1,key2=value2 # Selector (label query) to filter on, supports '=', '==', and '!='

helm list --date                # Sort by release date
helm list --deployed            # Show deployed releases. If no other is specified, this will be automatically enabled
helm list --pending             # Show pending releases
helm list --failed              # Show failed releases
helm list --uninstalled         # Show uninstalled releases (if 'helm uninstall --keep-history' was used)
helm list --superseded          # Show superseded releases

helm list -o yaml               # Prints the output in the specified format. Allowed values: table, json, yaml (default table)

helm status <release>           # This command shows the status of a named release.
helm status <release> --revision <number>   # if set, display the status of the named release with revision

helm history <release>          # Historical revisions for a given release.

helm env                        # Env prints out all the environment information in use by Helm.
```

```
$ h env
HELM_BIN="/home/zhongmingmao/.asdf/installs/helm/3.15.2/bin/helm"
HELM_BURST_LIMIT="100"
HELM_CACHE_HOME="/home/zhongmingmao/.cache/helm"
HELM_CONFIG_HOME="/home/zhongmingmao/.config/helm"
HELM_DATA_HOME="/home/zhongmingmao/.local/share/helm"
HELM_DEBUG="false"
HELM_KUBEAPISERVER=""
HELM_KUBEASGROUPS=""
HELM_KUBEASUSER=""
HELM_KUBECAFILE=""
HELM_KUBECONTEXT=""
HELM_KUBEINSECURE_SKIP_TLS_VERIFY="false"
HELM_KUBETLS_SERVER_NAME=""
HELM_KUBETOKEN=""
HELM_MAX_HISTORY="10"
HELM_NAMESPACE="default"
HELM_PLUGINS="/home/zhongmingmao/.local/share/helm/plugins"
HELM_QPS="0.00"
HELM_REGISTRY_CONFIG="/home/zhongmingmao/.config/helm/registry/config.json"
HELM_REPOSITORY_CACHE="/home/zhongmingmao/.cache/helm/repository"
HELM_REPOSITORY_CONFIG="/home/zhongmingmao/.config/helm/repositories.yaml"
```

```
helm get all <release>      # A human readable collection of information about the notes, hooks, supplied values, and generated manifest file of the given release.
helm get hooks <release>    # This command downloads hooks for a given release. Hooks are formatted in YAML and separated by the YAML '---\n' separator.
helm get manifest <release> # A manifest is a YAML-encoded representation of the Kubernetes resources that were generated from this release's chart(s). If a chart is dependent on other charts, those resources will also be included in the manifest.
helm get notes <release>    # Shows notes provided by the chart of a named release.
helm get values <release>   # Downloads a values file for a given release. use -o to format output
```

### Plugin

```
helm plugin install <path/url1>     # Install plugins
helm plugin list                    # View a list of all installed plugins
helm plugin update <plugin>         # Update plugins
helm plugin uninstall <plugin>      # Uninstall a plugin
```

# Chart

1. Helm 使用的包格式为 Chart
2. Chart 是一个描述 Kubernetes 相关资源的文件集合

## 文件结构

> Chart 是一个组织在文件目录中的集合，目录名称为 Chart 名称

```
wordpress/
  Chart.yaml          # 包含了chart信息的YAML文件
  LICENSE             # 可选: 包含chart许可证的纯文本文件
  README.md           # 可选: 可读的README文件
  values.yaml         # chart 默认的配置值
  values.schema.json  # 可选: 一个使用JSON结构的values.yaml文件
  charts/             # 包含chart依赖的其他chart
  crds/               # 自定义资源的定义
  templates/          # 模板目录， 当和values 结合时，可生成有效的Kubernetes manifest文件
  templates/NOTES.txt # 可选: 包含简要使用说明的纯文本文件
```

## Chart.yaml

```yaml
apiVersion: chart API 版本 （必需）
name: chart名称 （必需）
version: 语义化2 版本（必需）
kubeVersion: 兼容Kubernetes版本的语义化版本（可选）
description: 一句话对这个项目的描述（可选）
type: chart类型 （可选）
keywords:
  - 关于项目的一组关键字（可选）
home: 项目home页面的URL （可选）
sources:
  - 项目源码的URL列表（可选）
dependencies: # chart 必要条件列表 （可选）
  - name: chart名称 (nginx)
    version: chart版本 ("1.2.3")
    repository: （可选）仓库URL ("https://example.com/charts") 或别名 ("@repo-name")
    condition: （可选） 解析为布尔值的yaml路径，用于启用/禁用chart (e.g. subchart1.enabled )
    tags: # （可选）
      - 用于一次启用/禁用 一组chart的tag
    import-values: # （可选）
      - ImportValue 保存源值到导入父键的映射。每项可以是字符串或者一对子/父列表项
    alias: （可选） chart中使用的别名。当你要多次添加相同的chart时会很有用
maintainers: # （可选）
  - name: 维护者名字 （每个维护者都需要）
    email: 维护者邮箱 （每个维护者可选）
    url: 维护者URL （每个维护者可选）
icon: 用做icon的SVG或PNG图片URL （可选）
appVersion: 包含的应用版本（可选）。不需要是语义化，建议使用引号
deprecated: 不被推荐的chart （可选，布尔值）
annotations:
  example: 按名称输入的批注列表 （可选）.
```

### version

1. 每个 Chart 都必须有一个版本号，且必须遵循`语义化`版本 V2 标准
   - Helm 使用版本号作为发布标记
2. 系统`明确禁止`非语义化版本名称
3. Helm 不再依赖 GitHub 甚至 Git，完全不使用 Git SHA 进行版本控制
4. 系统假设 Chart 包名中的版本号与 Chart.yaml 中的 version `匹配`

### appVersion

1. appVersion 与 version 并不相关，用于指定应用版本
2. appVersion 仅供参考，不影响 Chart 版本的计算
3. 建议使用`引号`，强制 `YAML 解析器`将 appVersion 视为`字符串`

### kubeVersion

> Helm 在安装 Chart 时会验证约束，在集群运行不支持的 Kubernetes 版本时失败

1. \>= 1.13.0 < 1.15.0
2. \>= 1.13.0 < 1.14.0 || >= 1.14.1 < 1.15.0
3. 范围 - 
   - 1.1 - 2.3.4
   - \>= 1.1 <= 2.3.4
4. 通配符 - x / X / *
   - 1.2.x
   - \>= 1.2.0 < 1.3.0
5. 允许变更补丁版本 ~
   - ~1.2.3
   - \>= 1.2.3 < 1.3.0
6. 允许变更次版本 ^
   - ^1.2.3
   - \>= 1.2.3 < 2.0.0

### deprecated

1. 在 Chart `Repository` 管理 Chart 时，需要废弃一个 Chart
2. 如果 `latest` 版本被标记为 deprecated，则`所有版本`都被认为 deprecated
3. 后续可以发布未标记为 deprecated 的新版本来`重新启用` Chart
4. 弃用流程
   - 升级 Chart.yaml 标记为 deprecated，并更改版本
   - 在 Chart Repository 中发布新版的 Chart
   - 从源仓库（如 Git）中移除 Chart

### type

1. application / library
2. application 为默认类型，是可以完全操作的标准 Chart
3. library 提供针对 `Chart 构建`的实用程序和功能
   - library `不能安装`，通常`不包含任何资源对象`
4. application 可以作为 library 使用 - 将 type 设置为 library
   - 所有的实用程序和功能都可以使用
   - 所有的`资源对象`都`不会被渲染`

## NOTES

1. 在 `helm install` 或者 `helm status` 时打印到 STDOUT
2. 作为一个`模板`进行`渲染` - 使用说明、后续步骤等

## Dependency

> Chart 可能会依赖其它任意个 Chart

1. 通过 Chart.yaml 的 `dependencies` 字段进行`动态链接`
2. 或者被带入到 `charts/` 目录并`手动配置`

### dependencies

```yaml
dependencies:
  - name: apache
    version: 1.2.3
    repository: https://example.com/charts
  - name: mysql
    version: 3.2.1
    repository: https://another.example.com/charts
```

> 可以使用仓库名称代替 URL

```
$ helm repo add fantastic-charts https://charts.helm.sh/incubator
```

```yaml
dependencies:
  - name: awesomeness
    version: 1.0.0
    repository: "@fantastic-charts"
```

> 定义依赖后，运行 helm dependency update - 下载依赖的 Chart 到 `charts/` 目录

```
charts/
  apache-1.2.3.tgz
  mysql-3.2.1.tgz
```

> 依赖别名

```yaml
dependencies:
  - name: subchart
    repository: http://localhost:10191
    version: 0.1.0
    alias: new-subchart-1
  - name: subchart
    repository: http://localhost:10191
    version: 0.1.0
    alias: new-subchart-2
  - name: subchart
    repository: http://localhost:10191
    version: 0.1.0
```

```
subchart
new-subchart-1
new-subchart-2
```

### tags + condition

1. 所有的 Chart 会`默认加载`
2. 如果存在 tags 和 condition 字段，将用于评估 Chart 是否加载
3. Condition
   - 包含一个或多个 YAML 路径
   - 如果 YAML 路径在 values 中已存在并解析为布尔值
   - 只会使用列表中找到的`第一个`有效路径，如果未找到则条件无效
4. Tags
   - 在 values 中，通过指定 Tag 和布尔值，可以启用或禁用所有帶 Tag 的 Chart

```yaml
dependencies:
  - name: subchart1
    repository: http://localhost:10191
    version: 0.1.0
    condition: subchart1.enabled,global.subchart1.enabled
    tags:
      - front-end
      - subchart1
  - name: subchart2
    repository: http://localhost:10191
    version: 0.1.0
    condition: subchart2.enabled,global.subchart2.enabled
    tags:
      - back-end
      - subchart2
```

> values

```yaml
subchart1:
  enabled: true
tags:
  front-end: false
  back-end: true
```

1. 所有帶 front-end tag 的 Chart 都会被禁用
   - 但只要上层的 value 中的 subchart1.enabled 为 true
   - 则会覆盖 front-end tag 并且 subchart1 会被启用
2. 所有帶 back-end tag 的 Chart 都会被启用
   - 尽管 subchart2 指定了 condition，但上层 value 没有相应的值，不会生效

```
$ helm install --set tags.front-end=true --set subchart2.enabled=false
```

> 解析

1. `condition 总会覆盖 tag`
   - `第一个` condition 路径存在时，会`忽略`后面的路径
2. tag 被定义为 - 如果任意的 Chart 标签为 `true`，Chart `可以启用`
3. tag 和 condition 值必须被设置在`顶层 Value` 中
4. `tags` - 必须是`顶层键`

### 导入子 Value

> 允许子 Chart 的值作为公共默认传递到父 Chart

```yaml
# child's values.yaml file

exports:
  data:
    myint: 99
```

```yaml
# parent's Chart.yaml file

dependencies:
  - name: subchart
    repository: http://localhost:10191
    version: 0.1.0
    import-values:
      - data
```

> Helm 会在子 Chart 的 exports 字段查找 data 键，并导入内容

```yaml
# parent's values

myint: 99
```

> 但父级键 data 并没有包含在父 Chart 最终的 value 中，需要使用`子-父`格式

```yaml
# parent's Chart.yaml file

dependencies:
  - name: subchart1
    repository: http://localhost:10191
    version: 0.1.0
    ...
    import-values:
      - child: default.data
        parent: myimports
```

```yaml
# parent's values.yaml file

myimports:
  myint: 0
  mybool: false
  mystring: "helm rocks!"
```

```yaml
# subchart1's values.yaml file

default:
  data:
    myint: 999
    mybool: true
```

> 父 Chart 最终 value - 合并子 Chart 的 value

```yaml
# parent's final values

myimports:
  myint: 999
  mybool: true
  mystring: "helm rocks!"
```

### 手动管理依赖

1. 将有依赖关系的 Chart 复制到 `charts/` 目录中`显式表达`依赖关系
2. 依赖应该是一个`解压`的 Chart 目录 - `helm pull`

```yaml
wordpress:
  Chart.yaml
  # ...
  charts/
    apache/
      Chart.yaml
      # ...
    mysql/
      Chart.yaml
      # ...
```

### 操作过程

> 当 Helm 安装或者升级 Chart 时，Chart 中`所有`的 Kubernetes 对象和依赖会

1. 聚合成一个`单一集合`
2. 按照类型和名称排序
3. 按顺序创建或者升级

## Templates

1. Chart 模板按照 `Go 模板语言`书写
2. 所有的模板文件存储在 Chart 的 `templates/` 目录
   - Helm 渲染 Chart 时，通过模板引擎遍历目录中的每个文件
3. Values
   - values.yaml - 默认值
   - -f other-values.yaml - 覆盖默认值

## Values

1. 通过 `.Values` 对象可访问 values.yaml 文件或者 `--set` 提供的值
2. 预定义 Values - 可覆盖 + 区分大小写

| 预定义 Value      | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| Release.Name      | 版本名称 - 非 Chart 的                                       |
| Release.Namespace | 发布的 Chart 版本的命名空间                                  |
| Release.Service   | 组织版本的服务                                               |
| Release.IsUpgrade | 当前操作为 Upgrade 或者 Rollback，则为 true                  |
| Release.IsInstall | 当前操作为 Install，则为 true                                |
| Chart             | Chart.yaml 的内容<br />任何未知的 Chart.yaml 字段会被抛弃，无法访问 |
| Files             | A map-like object containing all non-special files in the chart. |
| Capabilities      | A map-like object that contains information about the versions of Kubernetes |

> Chart 会包含一个默认的 values.yaml 文件，允许使用附加文件来覆盖默认值

```
$ helm install --generate-name --values=myvals.yaml wordpress
```

1. Chart 中包含的默认 values 文件，必须被命名为 `values.yaml`
2. `--set` 提供的值，会在客户端被简单地转换为 `YAML`
3. 如果 value 是必需的，则在 Chart 模板中使用 `required` 函数声明

## 范围 + 依赖 + 值

1. values 文件可以为 Chart 及其任何依赖项提供值
2. 更高阶的 Chart 可以访问下面定义的所有变量，低阶的 Chart 不能访问父级 Chart
3. Values 被限制在命名空间中，但命名空间被删减了
   - 对于 WordPress Chart - `.Values.mysql.password`
   - 对于 MySQL Chart - `.Values.password`

```yaml
title: "My WordPress Site" # Sent to the WordPress template

mysql:
  max_connections: 100 # Sent to MySQL
  password: "secret"

apache:
  port: 8080 # Passed to Apache
```

## 全局 Values

> 特殊的键 - global

```yaml
title: "My WordPress Site" # Sent to the WordPress template

global:
  app: MyWordPress

mysql:
  max_connections: 100 # Sent to MySQL
  password: "secret"

apache:
  port: 8080 # Passed to Apache
```

> 实际渲染

```yaml
title: "My WordPress Site" # Sent to the WordPress template

global:
  app: MyWordPress

mysql:
  global:
    app: MyWordPress
  max_connections: 100 # Sent to MySQL
  password: "secret"

apache:
  global:
    app: MyWordPress
  port: 8080 # Passed to Apache
```

1. 提供了一种`与所有子 Chart 共享顶级变量`的方式
2. 只能`向下传递`，而不会向上传递，因此子 Chart 无法影响父 Chart 的值
3. `父 Chart` 的全局变量`优先`于`子 Chart` 中的全局变量

## Schema

> values.schema.json - https://json-schema.org/ - 在应用 values 时验证

1. helm install
2. helm upgrade
3. helm lint
4. helm template

> Furthermore, the final `.Values` object is checked against *all* subchart schemas.

## CRD

1. 使用 CRD，Kubernetes 开发者可以声明自定义资源类型
2. 在 Helm 中，CRD 被视为一种特殊的对象
   - CRD 被安装在 Chart 的其它部分`之前`，并受到一些限制
3. CRD YAML 文件被放置在 `crds/` 目录
   - Helm 会尝试加载 CRD 目录中所有的文件到 Kubernetes 中
4. CRD 文件`无法模板化`，必须是`普通的 YAML 文档`
5. Helm 在安装新 Chart 时，会上传 CRD，`暂停`安装直到 CRD 可以被 `API 服务`使用
   - 然后启动`模块引擎`，渲染 Chart 的其它部分，并上传到 Kubernetes
   - 因此 CRD 信息会在 `.Capabilities` 对象中生效
     - 并且模板会创建在 CRD 中声明的新的实例对象

> 在 `crds/` 有针对 CronTab 的 `CRD`，可以在 `templates/` 创建 CronTab `实例`

```yaml
crontabs/
  Chart.yaml
  crds/
    crontab.yaml
  templates/
    mycrontab.yaml
```

> crontab.yaml 不能包含模板指令

```yaml
kind: CustomResourceDefinition
metadata:
  name: crontabs.stable.example.com
spec:
  group: stable.example.com
  versions:
    - name: v1
      served: true
      storage: true
  scope: Namespaced
  names:
    plural: crontabs
    singular: crontab
    kind: CronTab
```

> 在 mycrontab.yaml 创建一个新的 CronTab
> 安装 `templates/` 内容之前会保证 CronTab 类型安装成功并对 Kubernetes API 可用

```yaml
apiVersion: stable.example.com
kind: CronTab
metadata:
  name: {{ .Values.name }}
spec:
   # ...
```

> 使用限制

1. 与大部分 Kubernetes 对象不同，CRD 是`全局安装`的 - 非常谨慎
2. CRD `从不重新安装`
   - 如果 `crds/` 目录中的 CRD 已存在（忽略版本），不会安装或者升级
3. CRD 不会在`升级`或者`回滚`时安装，只会在安装是创建 CRD
4. CRD `从不会删除`
   - 自动删除 CRD 会删除集群中所有命名空间中的所有 CRD 内容

## Repository

1. Chart Repository 是一个 HTTP 服务器，包含一个或者多个打包的 Chart
   - 任何可以服务于 `YAML` 文件和 `tar` 文件并可以响应 GET 请求的 HTTP 服务器
2. helm 用来管理本地 Chart 目录；使用 Chart Repository 来共享 Chart
3. Repository 的主要特征 - 存在 `index.yaml`
   - 包含 Repository 提供的 Chart 列表，以及允许检索和验证这些 Chart 的元数据
4. 在客户端，Repository 使用 `helm repo` 管理
   - 但 Helm 不提供`上传` Chart 到远程 Repository 的工具

# Chart Hook

1. 允许 Chart 开发者在 Release 生命周期的某些点进行干预
2. Hook 的工作方式与 Template 类似，但会存在一些特殊的 Annotation

## Hook

| Annotation    | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| *pre-install* | Executes after templates are rendered, but before any resources are created in Kubernetes |
| post-install  | Executes after all resources are loaded into Kubernetes      |
| pre-upgrade   | Executes on an upgrade request after templates are rendered, but before any resources are updated |
| post-upgrade  | Executes on an upgrade request after all resources have been upgraded |
| pre-rollback  | Executes on a rollback request after templates are rendered, but before any resources are rolled back |
| post-rollback | Executes on a rollback request after all resources have been modified |
| pre-delete    | Executes on a deletion request before any resources are deleted from Kubernetes |
| post-delete   | Executes on a deletion request after all of the release's resources have been deleted |
| test          | Executes when the Helm test subcommand is invoked            |

## Ready

1. Hook Ready 取决于 Hook 声明的资源
   - 如果资源为 Job 或者 Pod 类型，Helm 会等到其成功运行完成
   - 对于其它类型的资源，一旦被 Kubernetes 标记为已加载，则认为 Ready
2. 如果 Hook 失败，则 Release 失败 - Hook 为`阻塞`操作

## Resources

1. 当一个 Hook 中声明了很多资源时，资源会`串行执行`
2. 如果 Hook 有权重，则会按权重顺序执行
   - 具有相同权重的 Hook 资源会和普通的非 Hook 资源以相同的顺序安装 - 字典序

## Version

1. Hook 创建的资源无法作为 Release 的一部分进行跟踪和管理
2. 一旦 Helm 验证 Hook 达到了 Ready 状态，将不使用 Hook 资源
3. 当对应的 Release 删除后，未来会添加 Hook 资源的 GC
   - 不能被删除的 Hook 资源应该添加 `helm.sh/resource-policy: keep`
4. 在 Hook 中创建了资源，但不能依靠 `helm uninstall` 去删除资源
   - `helm.sh/hook-delete-policy`
   - ttl - job

## Example

> Hook 在 metadata 指定特殊 annotation，Hook 本身也是模板文件

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

## Notes

1. Similarly, there is no limit to the number of different resources that may implement a given hook.
2. When subcharts declare hooks, those are also evaluated.
   - There is no way for a top-level chart to disable the hooks declared by subcharts.
3. It is possible to define a weight for a hook which will help build a deterministic executing order.
4. Hook weights can be positive or negative numbers but must be represented as strings.
   - When Helm starts the execution cycle of hooks of a particular Kind it will sort those hooks in ascending order.

## Deletion

> 可以定义策略来决定何时删除对应的 Hook 资源

| Annotation           | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| before-hook-creation | Delete the previous resource before a new hook is launched (default) |
| hook-succeeded       | Delete the resource after the hook is successfully executed  |
| hook-failed          | Delete the resource if the hook failed during execution      |

# Chart Test

1. 验证 Chart 安装时是否按照预期工作
2. 存放在 `templates/` 目录，并且指定了容器和给定命令的任务
   - 如果测试通过，容器应该成功退出 - exit 0
3. 测试的定义必须包含 annotation - `helm.sh/hook: test`
   - Helm V3 - `helm.sh/hook: test-success` / `helm.sh/hook: test-failure`
4. 可以在单个 YAML 文件中定义尽可能多的 Test，或者分布在多个 YAML 文件中
5. Test 本质上是一个 `Chart Hook`

## Example

```
$ h create demo

$ tree demo
demo
├── charts
├── Chart.yaml
├── templates
│   ├── deployment.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
│   ├── serviceaccount.yaml
│   ├── service.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml
```

> templates/tests/test-connection.yaml

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "demo.fullname" . }}-test-connection"
  labels:
    {{- include "demo.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "demo.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

> install - 等待所有 Pod 变成 Active

```
$ h install demo demo --namespace default
NAME: demo
LAST DEPLOYED: Wed Jul  3 12:31:00 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
NOTES:
1. Get the application URL by running these commands:
  export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=demo,app.kubernetes.io/instance=demo" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=$(kubectl get pod --namespace default $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace default port-forward $POD_NAME 8080:$CONTAINER_PORT

$ k get pod
NAME                    READY   STATUS    RESTARTS   AGE
demo-79b7b6d796-pxtbq   1/1     Running   0          74s
```

> test

```
$ h test demo
NAME: demo
LAST DEPLOYED: Wed Jul  3 12:31:00 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE:     demo-test-connection
Last Started:   Wed Jul  3 12:33:16 2023
Last Completed: Wed Jul  3 12:33:26 2023
Phase:          Succeeded
NOTES:
1. Get the application URL by running these commands:
  export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=demo,app.kubernetes.io/instance=demo" -o jsonpath="{.items[0].metadata.name}")
  export CONTAINER_PORT=$(kubectl get pod --namespace default $POD_NAME -o jsonpath="{.spec.containers[0].ports[0].containerPort}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace default port-forward $POD_NAME 8080:$CONTAINER_PORT
```

# Library Chart

1. 定义了可以由其它 Chart 中的 Helm 模板`共享`的 Chart 原语或者定义
   - 通过 Chart 分享`可复用`的代码片段来`避免重复`，并保持 `DRY`
2. 作为一种 Chart 类型引入
   - 明确区分通用 Chart 和应用 Chart
   - 逻辑上阻止安装通用 Chart
   - 通用 Chart 中未渲染模板可以包含版本组件
   - 允许依赖的 Chart 使用导入的上下文
3. Helm 将以`标准一致`的方式处理 Chart
   - 可以通过改变 Chart 类型来分享应用 Chart 中的定义

## Create

> 创建 Chart

```
$ h create mylibchart
Creating mylibchart

$ rm -rf mylibchart/templates/* mylibchart/values.yaml

$ tree mylibchart
mylibchart
├── charts
├── Chart.yaml
└── templates
```

1. `Named Templates` 是定义在一个文件中的简单模板，并分配了一个名称
2. 在 `templates/` 目录中，所有以 `_` 开始的文件，都不会输出到 Kubernetes Manifest 中
3. 辅助模板和局部模板被放置在 `_*.tpl` 或者 `_*.yaml` 文件中

> mylibchart/templates/_configmap.yaml

```yaml
{{- define "mylibchart.configmap.tpl" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name | printf "%s-%s" .Chart.Name }}
data: {}
{{- end -}}
{{- define "mylibchart.configmap" -}}
{{- include "mylibchart.util.merge" (append . "mylibchart.configmap.tpl") -}}
{{- end -}}
```

> mylibchart/templates/_util.yaml - 合并了两个模板，并覆盖了两个模板的公共部分
> 通过配置自定义其通用代码

```yaml
{{- /*
mylibchart.util.merge will merge two YAML templates and output the result.
This takes an array of three values:
- the top context
- the template name of the overrides (destination)
- the template name of the base (source)
*/}}
{{- define "mylibchart.util.merge" -}}
{{- $top := first . -}}
{{- $overrides := fromYaml (include (index . 1) $top) | default (dict ) -}}
{{- $tpl := fromYaml (include (index . 2) $top) | default (dict ) -}}
{{- toYaml (merge $overrides $tpl) -}}
{{- end -}}
```

> mylibchart/Chart.yaml - `type: library`

```yaml
apiVersion: v2
name: mylibchart
description: A Helm chart for Kubernetes

# A chart can be either an 'application' or a 'library' chart.
#
# Application charts are a collection of templates that can be packaged into versioned archives
# to be deployed.
#
# Library charts provide useful utilities or functions for the chart developer. They're included as
# a dependency of application charts to inject those utilities and functions into the rendering
# pipeline. Library charts do not define any templates and therefore cannot be deployed.
type: library

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

> install - Library Chart 无法安装

```yaml
$ h install mylibchart mylibchart
Error: INSTALLATION FAILED: library charts are not installable
```

## Use

```
$ h create mylibchart_use
Creating mylibchart_use

$ rm -rf mylibchart_use/templates/*
```

> `复用` mylibchart 中创建的`公共代码` - mylibchart_use/templates/cm.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name | printf "%s-%s" .Chart.Name }}
{{- include "mylibchart.configmap" (list . "mychart.configmap") -}}
{{- define "mychart.configmap" -}}
data:
  myvalue: "Hello World"
{{- end -}}
```

> 为了使用通用代码，将  `library chart` 作为 `dependencies` - mychart/Chart.yaml

```yaml
# My common code in my library chart
dependencies:
- name: mylibchart
  version: 0.1.0
  repository: file://../mylibchart
```

1. 包含了作为`文件系统动态依赖`的 Library Chart，与应用 Chart 位于同一父路径下
2. 由于将 Library Chart 作为了`动态依赖`，需要执行 `helm dependency update`
   - 将 Library Chart 拷贝至 `charts/`

## Benefits

1. Library Chart 不能作为独立的 Chart
2. `.Files` 对象引用`父 Chart` 的文件路径，而不是 Library Chart 的本地路径
3. `.Values` 对象与`父 Chart` 相同，但与`子 Chart` 相反

## Common Helper

1. 公共 Chart 的初始模式，反映了编写 Helper Chart 的最佳实践
2. 开发 Chart 时有易用的共享代码

> It provides utilities that reflect best practices of `Kubernetes chart development`, making it faster for you to write charts.

> https://github.com/hahow/common-chart

```
$ helm repo add hahow https://hahow-helm-charts.storage.googleapis.com/
"hahow" has been added to your repositories
```

> Chart.yaml - Dependency

```yaml
dependencies:
  - name: common
    version: 0.4.1
    repository: https://hahow-helm-charts.storage.googleapis.com/
```

```
$ h dependency build
Hang tight while we grab the latest from your chart repositories...
...Successfully got an update from the "brigade" chart repository
...Successfully got an update from the "hahow" chart repository
...Successfully got an update from the "incubator" chart repository
...Successfully got an update from the "bitnami" chart repository
Update Complete. ⎈Happy Helming!⎈
Saving 1 charts
Downloading common from repo https://hahow-helm-charts.storage.googleapis.com/
Deleting outdated charts
```

```yaml
{{- include "common.service" (list . .Values.service "mychart.service") }}
{{- define "mychart.service" -}}
## Define overrides for your Service resource here, e.g.
# metadata:
#   labels:
#     custom: label
# spec:
#   ports:
#   - port: 8080
#     targetPort: http
#     protocol: TCP
#     name: http
{{- end }}
```

1. A limitation of the `Go template library` is that a template can only take a `single argument`. 
   - The `list` function is used to workaround this by constructing a list or array of arguments that is passed to the template.
2. The common.service template is responsible for rendering the templates with the `root context` and `merging any overrides`.
3. As you can see, this makes it very easy to create a basic `Service` resource without having to copy around the standard metadata and labels.

| Type            | Item                  |
| --------------- | --------------------- |
| Resource Kinds  | ConfigMap             |
|                 | Secret                |
|                 | Deployment            |
|                 | Service               |
| Partial Objects | common.chart          |
|                 | common.container      |
|                 | common.fullname       |
|                 | common.labels         |
|                 | common.metadata       |
|                 | common.name           |
|                 | common.pod.template   |
|                 | common.selectorLabels |

# Provenance + Integrity

1. Helm 有一个`来源工具`检测 Chart 包的`完整性`和`来源`
2. 使用基于 PKI、GnuPG 及流行包管理器的行业标准工具，Helm 可以生成和检测签名文件

# OCI Registry

1. 可以使用具有 `OCI` 支持的 `Container Registry` 来存储和共享 Chart
2. OCI Registry 包含 0 个或多个 Helm Registry，且每个都会有 0 个或者多个 Chart
3. 托管的 Registry - Amazon ECR / Docker Hub / ...

> login

```
$ helm registry login -u myuser localhost:5000
Password:
Login succeeded
```

> push - 上传 Chart 到基于 OCI 的 Registry

```
$ h push mychart-0.1.0.tgz oci://localhost:5000/helm-charts
Pushed: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:61542113ac023bccdda95ea9b81c0b3f368ce2dd5e4459698884bef029df974a
```

1. push 只能用于 `helm package` 提前创建的 `.tgz` 文件
2. Registry 必须以 `oci://` 开头，且不能包含 `basename` 或者 `tag` - 强制要求
   - Registry 引用的 basename 是由 Chart 名称`推断`而来的
   - tag 是由 Chart 语义版本`推断`而来的
3. 某些 Registry 需要先创建 `Repository` 或者 `Namespace`，否则 push 失败
4. 如果已经创建了一个 `Provenance` 文件，且与 Chart 文件在统一目录下，会 push 到 Registry
   - Helm chart manifest 会生成一个额外的层
5. 其它命令
   - helm pull
   - helm show
   - helm template
   - helm install
   - helm upgrade

> The basename (chart name) of the registry reference *is* included for any type of action involving chart `download`
> (vs. `helm push` where it is omitted).

```
$ helm pull oci://localhost:5000/helm-charts/mychart --version 0.1.0
Pulled: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:61542113ac023bccdda95ea9b81c0b3f368ce2dd5e4459698884bef029df974a

$ helm show all oci://localhost:5000/helm-charts/mychart --version 0.1.0
Pulled: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:61542113ac023bccdda95ea9b81c0b3f368ce2dd5e4459698884bef029df974a
apiVersion: v2
appVersion: 1.16.0
description: A Helm chart for Kubernetes
name: mychart
type: application
version: 0.1.0

---
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
  - mushrooms
  - cheese
  - peppers
  - onionsls

mysubchart:
  dessert: ice cream

global:
  salad: caesar
```

```
$ helm template myrelease oci://localhost:5000/helm-charts/mychart --version 0.1.0
Pulled: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:2bed8a4ea606c735f397a31dd7f429c077480021811ea0cfaa6be076f08f17a7
---
# Source: mychart/charts/mysubchart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myrelease-cfgmap2
data:
  dessert: ice cream
  salad: caesar
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myrelease-configmap
data:
  salad: caesar
```

```
$ helm install myrelease oci://localhost:5000/helm-charts/mychart --version 0.1.0
Pulled: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:2bed8a4ea606c735f397a31dd7f429c077480021811ea0cfaa6be076f08f17a7
NAME: myrelease
LAST DEPLOYED: Sat Jul  6 20:32:28 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Thank you for installing mychart.

Your release is named myrelease.

To learn more about the release, try:

  $ helm status myrelease
  $ helm get all myrelease
```

```
$ helm upgrade myrelease oci://localhost:5000/helm-charts/mychart --version 0.1.0
Pulled: localhost:5000/helm-charts/mychart:0.1.0
Digest: sha256:2bed8a4ea606c735f397a31dd7f429c077480021811ea0cfaa6be076f08f17a7
Release "myrelease" has been upgraded. Happy Helming!
NAME: myrelease
LAST DEPLOYED: Sat Jul  6 20:33:00 2023
NAMESPACE: default
STATUS: deployed
REVISION: 2
TEST SUITE: None
NOTES:
Thank you for installing mychart.

Your release is named myrelease.

To learn more about the release, try:

  $ helm status myrelease
  $ helm get all myrelease
```

## Dependencies

> Chart 的依赖项可以使用 `dependency update` 从 Registry 拉取

> Chart.yaml - 指定没有 basename 的引用

```yaml
dependencies:
  - name: mychart
    version: "2.7.0"
    repository: "oci://localhost:5000/myrepo"
```

> 执行 dependency update 时，获取 `oci://localhost:5000/myrepo/mychart:2.7.0`

## Manifest

> 注意 MediaType

```json
{
  "schemaVersion": 2,
  "config": {
    "mediaType": "application/vnd.cncf.helm.config.v1+json",
    "digest": "sha256:8ec7c0f2f6860037c19b54c3cfbab48d9b4b21b485a93d87b64690fdb68c2111",
    "size": 117
  },
  "layers": [
    {
      "mediaType": "application/vnd.cncf.helm.chart.content.v1.tar+gzip",
      "digest": "sha256:1b251d38cfe948dfc0a5745b7af5ca574ecb61e52aed10b19039db39af6e1617",
      "size": 2487
    }
  ]
}
```

> 包含 Provenance 文件

```json
{
  "schemaVersion": 2,
  "config": {
    "mediaType": "application/vnd.cncf.helm.config.v1+json",
    "digest": "sha256:8ec7c0f2f6860037c19b54c3cfbab48d9b4b21b485a93d87b64690fdb68c2111",
    "size": 117
  },
  "layers": [
    {
      "mediaType": "application/vnd.cncf.helm.chart.content.v1.tar+gzip",
      "digest": "sha256:1b251d38cfe948dfc0a5745b7af5ca574ecb61e52aed10b19039db39af6e1617",
      "size": 2487
    },
    {
      "mediaType": "application/vnd.cncf.helm.chart.provenance.v1.prov",
      "digest": "sha256:3e207b409db364b595ba862cdc12be96dcdad8e36c59a03b7b3b61c946a5741a",
      "size": 643
    }
  ]
}
```

# Architecture

## Purpose

> managing Kubernetes packages - Chart

1. 从头开始创建新的 Chart
2. 将 Chart 打包成归档文件
3. 与存储 Chart 的Repository 进行交互
4. 在现有的 Kubernetes 集群中安装和卸载 Chart
5. Manage the `release cycle of charts` that have been installed with Helm

> 核心概念

1. The *chart* is a bundle of information necessary to create an instance of a Kubernetes application.
2. The *config* contains configuration information that can be merged into a packaged chart to create a releasable object.
3. A *release* is a running instance of a *chart*, combined with a specific *config*.

## Components

> Helm Client - CLI

1. 本地 Chart 开发
2. 管理 Repository
3. 管理 Release
4. 与 Helm Library 建立接口
   - 发送安装的 Chart
   - 发送升级或者卸载现有 Release 的请求

> Helm Library - 提供执行所有 Helm 操作的逻辑，与 Kubernetes API-Server 交互

1. 结合 Chart 和 Config 来构建 Release
2. 将 Chart 安装到 Kubernetes 中，并提供后续 Release 对象
3. 与 Kubernetes 交互，升级或者卸载 Chart

> 独立的 Helm Library 封装了 Helm 逻辑，以便于不同的客户端可以使用它

## Implementation

1. `Helm Client` 和 `Helm Library` 使用 Go 编写
2. 使用 Kubernetes client library 与 Kubernetes 通信
   - 使用 REST + JSON，将信息存储在 Kubernetes Secret 中，无需自身的数据库
3. 配置文件用 YAML 编写

# Advanced

##  Post Rendering

> 相当于一个 Hook

1. 后置渲染允许在通过 Helm 安装 Chart 之前手动使用、配置或者验证渲染的 Manifest
2. 允许有高级配置需求的用户可以使用 `kustomize` 来配置更改
   - 而不需要 Fork 一个公共 Chart 或者要求 Chart 维护人员为每个软件指定每个最新的配置项
3. 场景
   - 注入常用工具、sidecar 或者在部署前对 Manifest 进行分析

> 使用

1. A post-renderer can be any `executable` that accepts `rendered Kubernetes manifests` on `STDIN` and returns valid Kubernetes manifests on STDOUT.
2. It should return an `non-0 exit code` in the event of a failure.
3. This is the only "API" between the two components.
   - It allows for great flexibility in what you can do with your post-render process.
4. A post renderer can be used with `install`, `upgrade`, and `template` -- `--post-renderer`

```
$ helm install mychart stable/wordpress --post-renderer ./path/to/executable
```

1. If the path does not contain any separators, it will search in $PATH, 
   - otherwise it will resolve any relative paths to a fully qualified path
2. If you wish to use multiple post-renderers, call all of them in a script or together in whatever binary tool you have built.
   - In bash, this would be as simple as `renderer1 | renderer2 | renderer3`

> 警告

1. The most important of these is that when using a post-renderer, all people modifying that release **MUST** use the `same renderer` in order to have `repeatable builds`.
2. If you are using a post-renderer, you should ensure it is coming from a `reliable source` (as is the case for any other arbitrary executable).
   - Using non-trusted or non-verified renderers is NOT recommended as they have full access to rendered templates, which often contain `secret data`.

## Go SDK

> Helm 3 debuted a completely restructured Go SDK for a better experience when building software and tools that leverage Helm.

## Storage

1. Helm 3 changed the default `release information` storage to `Secrets` in the namespace of the release.
2. This configuration is based on the `HELM_DRIVER` environment variable.
   - It can be set to one of the values: `[configmap, secret, sql]`.

# Kubernetes Distribution

> Helm 适用于任何符合标准的 Kubernetes 版本 - 无论是否经过认证

# Plugins

1. Helm Plugin 是一个可以通过 helm cli 访问的工具，但不是 Helm 的内置代码
2. Helm Plugin 是与 Helm 无缝集成的附加工具，Plugin 提供了一种扩展 Helm 核心特性集的方法
   - 但不需要每个新的特性都用 Go 编写并加入到核心工具中
3. Helm Plugin 特性
   - 可以在不影响 `Helm 核心工具`的情况下，添加和移除
   - 可以用`任意编程语言`编写
   - 与 Helm 集成，并展示在 helm help 和其它地方
4. Helm Plugin 存在于 `$HELM_PLUGINS` 中 - `helm env`
5. Helm 插件模型基于 `Git` 插件模型

> install

```
$ helm plugin install https://github.com/adamreese/helm-env
Print out the helm environment.

Usage:
  helm env [OPTIONS]

Options:
      --vars-only      only print environment variables
  -q, --quiet          don't print headers

Installed plugin: env

$ ls /home/zhongmingmao/.local/share/helm/plugins/
helm-env

$ ls /home/zhongmingmao/.local/share/helm/plugins/helm-env/*
/home/zhongmingmao/.local/share/helm/plugins/helm-env/env.sh
/home/zhongmingmao/.local/share/helm/plugins/helm-env/LICENSE.txt
/home/zhongmingmao/.local/share/helm/plugins/helm-env/Makefile
/home/zhongmingmao/.local/share/helm/plugins/helm-env/plugin.yaml
/home/zhongmingmao/.local/share/helm/plugins/helm-env/README.md
```

> Plugin 类似于 Chart，plugin.yaml 是必须的，可执行脚本 env.sh 是可选的
> /home/zhongmingmao/.local/share/helm/plugins/helm-env/plugin.yaml

```yaml
---
name: "env"
version: "0.1.0"
usage: "print out the helm environment"
description: |-
  Print out the helm environment.
command: "$HELM_PLUGIN_DIR/env.sh"
hooks:
  install: "$HELM_PLUGIN_DIR/env.sh --help"
```

> 当 Helm 执行 Plugin 时，会传递外部环境变量给 Plugin，并且会加入一些额外的环境变量

# Version Skew

> n-3

# Template

## Getting Started

```
mychart/
  Chart.yaml
  values.yaml
  charts/
  templates/
  ...
```

1. templates 包含了模板文件
   - 当 Helm 评估 Chart 时，会通过模板渲染引擎将所有文件发送到 templates/ 目录中
   - 然后收集模板的结果并发送给 Kubernetes
2. values.yaml 文件也导入到模板
   - 该文件包含了 Chart 的默认值，这些值会在用户执行 helm install 或者 helm upgrade 时被覆盖
3. Chart.yaml 文件包含了该 Chart 的描述
4. charts/ 目录可以包含其他的 Chart - 子 Chart

### 101

```
$ h create mychart
Creating mychart

$ tree mychart
mychart
├── charts
├── Chart.yaml
├── templates
│   ├── deployment.yaml
│   ├── _helpers.tpl
│   ├── hpa.yaml
│   ├── ingress.yaml
│   ├── NOTES.txt
│   ├── serviceaccount.yaml
│   ├── service.yaml
│   └── tests
│       └── test-connection.yaml
└── values.yaml
```

1. NOTES.txt - Chart 的帮助文本
2. _helpers.tpl - 可以通过 Chart 复用的模板辅助对象

```
$ rm -rf mychart/templates/*
```

### ConfigMap

1. 模板名称不遵循严格的命名模式，以 `.yaml` 作为 YAML 文件的后缀，以 `.tpl` 作为 `helper` 文件的后缀
2. 将普通的 YAML 文件放置在 templates/ 目录是 OK 的，Helm 会`原样传递`给 Kubernetes

> mychart/templates/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-configmap
data:
  myvalue: "Hello World"
```

> install

```
$ h install full-coral ./mychart
NAME: full-coral
LAST DEPLOYED: Wed Jul  3 22:40:38 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

> manifest - 打印所有已经上传的 Kubernetes 资源

```
$ h get manifest full-coral
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-configmap
data:
  myvalue: "Hello World"
```

```
$ k get cm
NAME                DATA   AGE
kube-root-ca.crt    1      5d4h
mychart-configmap   1      3m18s

$ k get cm mychart-configmap -oyaml
apiVersion: v1
data:
  myvalue: Hello World
kind: ConfigMap
metadata:
  annotations:
    meta.helm.sh/release-name: full-coral
    meta.helm.sh/release-namespace: default
  creationTimestamp: "2023-07-03T14:40:38Z"
  labels:
    app.kubernetes.io/managed-by: Helm
  name: mychart-configmap
  namespace: default
  resourceVersion: "24492"
  uid: 664b6f71-c605-4e94-b89d-7c6cca1445b4
```

> uninstall

```
$ h uninstall full-coral
release "full-coral" uninstalled
```

### Template Call

>  由于 `DNS` 系统的限制，name 长度限制为 `63` 个字符

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
```

1. 模板命令要在 `{{` 和 `}}` 之间
2. Release 前面的 `.` 表示从`作用域最顶层`的命名空间开始

> install

```
$ h install clunky-serval ./mychart
NAME: clunky-serval
LAST DEPLOYED: Wed Jul  3 23:00:16 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

> manifest

```
$ h get manifest clunky-serval
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clunky-serval-configmap
data:
  myvalue: "Hello World"
```

> dry-run

1. 不会安装 Chart 到 Kubernetes 集群中，只会渲染模板内容到控制台 - 用于测试
2. 不能保证 Kubernetes 会接受 dry-run 渲染的模板

```
$ h install --debug --dry-run goodly-guppy ./mychart
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: goodly-guppy
LAST DEPLOYED: Wed Jul  3 23:03:51 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
...

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: goodly-guppy-configmap
data:
  myvalue: "Hello World"
```

## Built-in Objects

1. 对象可以通过模板引擎传递到模板中
2. 对象可以是一个值，也可以包含其它对象或者方法
3. 内置的值都是以大写字母开始 - 符合 Go 的命名规范
   - 使用`首字母小写`将`本地名称`与`内置对象`区分开

### Release

> 描述版本发布本身

| Object            | Desc                                                     |
| ----------------- | -------------------------------------------------------- |
| Release.Name      | Release 名称                                             |
| Release.Namespace | 版本中包含的命名空间                                     |
| Release.IsUpgrade | 当前操作是升级或者回滚时，为 true                        |
| Release.IsInstall | 当前操作是安装时，为 true                                |
| Release.Revision  | 此次修订的版本号，安装时为 1，每次升级或者回滚，都会自增 |
| Release.Service   | 渲染当前模板的服务，始终为 Helm                          |

### Values

> 从 values.yaml 文件和用户提供的文件传进模板，默认为空

### Chart

> Chart.yaml 文件内容 - 所有数据均可访问

### Files

> 不能访问 Template 对象，只能访问其它文件

| Object          | Desc                                           |
| --------------- | ---------------------------------------------- |
| Files.Get       | 通过文件名获取文件 - .Files.Getconfig.ini      |
| Files.GetBytes  | 用字节数组代替字符串获取文件内容 - 适用于图片  |
| Files.Glob      | 用给定的 shell glob 模式匹配文件名返回文件列表 |
| Files.Lines     | 逐行读取文件内容                               |
| Files.AsSecrets | 使用 Base64 编码字符串返回文件体               |
| Files.AsConfig  | 使用 YAML 格式返回文件体                       |

### Capabilities

> 提供 Kubernetes 集群支持功能的信息

| Object                                                       | Desc                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Capabilities.APIVersions                                     | 版本列表                                                     |
| Capabilities.APIVersions.Has $version                        | 集群的版本（`batch/v1`）或者资源（`apps/v1/Deployment`）是否可用 |
| Capabilities.KubeVersion<br />Capabilities.KubeVersion.Version | Kubernetes 版本号                                            |
| Capabilities.KubeVersion.Major                               | Kubernetes 主版本                                            |
| Capabilities.KubeVersion.Minor                               | Kubernetes 次版本                                            |
| Capabilities.HelmVersion                                     | Helm 详细版本信息 - helm version                             |
| Capabilities.HelmVersion.Version                             | Helm 语义化版本                                              |
| Capabilities.HelmVersion.GitCommit                           | Helm Git SHA1 值                                             |
| Capabilities.HelmVersion.GitTreeState                        | Helm Git Tree State                                          |
| Capabilities.HelmVersion.GoVersion                           | 使用的 Go 编译器版本                                         |

### Template

> 当前被执行模板的信息

| Object            | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| Template.Name     | 当前模板的命名空间文件路径<br />mychart/templates/mytemplate.yaml |
| Template.BasePath | 当前 Chart 模板目录的<br />mychart/templates                 |

## Values Files

> Values 内置对象的数据来源

1. Chart 中的 values.yaml 文件
2. 如果是子 Chart，就是父 Chart 中的 values.yaml 文件
3. 使用 `-f` 参数传递到 `helm install` 或者 `helm upgrade` 的 values 文件
4. 使用 `--set` 传递的单个参数

> 优先级

1. 默认使用 values.yaml
2. 可以被`父 Chart` 的 values.yaml `覆盖`
3. 继而被用户提供的 values 文件覆盖
4. 最后被 `--set` 参数覆盖

> mychart/values.yaml

```yaml
favoriteDrink: coffee
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favoriteDrink }}
```

```
$ h install geared-marsupi ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: geared-marsupi
LAST DEPLOYED: Thu Jul  4 12:15:41 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favoriteDrink: coffee

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geared-marsupi-configmap
data:
  myvalue: "Hello World"
  drink: coffee
```

> -- set

```yaml
h install solid-vulture ./mychart --dry-run --debug --set favoriteDrink=slurm
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 12:18:10 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
favoriteDrink: slurm

COMPUTED VALUES:
favoriteDrink: slurm

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: slurm
```

> values 文件可以包含更多结构化的内容

```yaml
favorite:
  drink: coffee
  food: pizza
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favorite.drink }}
  food: {{ .Values.favorite.food }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 12:21:55 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: coffee
  food: pizza
```

> 删除默认的 Key - 将 key 设置为 `null`

## Functions

1. 模板函数的语法为 `functionName arg1 arg2...`
2. Helm 超过 60 个可用函数，有些通过 `Go 模板语言`本身定义，其它大部分都是 `Sprig` 模板库
3. Helm 模板语言并非 Helm 专属
   - Go 模板语言 + 额外函数 + 向模板暴露某些对象的装饰器

### quote

> 将 .Values 对象中的字符串属性用引号引起来，然后放到模板中

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ quote .Values.favorite.drink }}
  food: {{ quote .Values.favorite.food }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 14:07:39 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "pizza"
```

##  Pipelines

>  管道符是将一系列的模板语言紧凑地将多个`流式处理`结果合并的工具

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favorite.drink | repeat 5 | quote }}
  food: {{ .Values.favorite.food | upper | quote }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 14:21:01 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: "coffeecoffeecoffeecoffeecoffee"
  food: "PIZZA"
```

### default

1. `default DEFAULT_VALUE GIVEN_VALUE`
2. 允许在模板中指定一个默认值，以防止该值被忽略
3. 在实际的 Chart 中，所有的`静态默认值`都应该设置在 `values.yaml` 文件中，且不应该重复使用 `default` 函数 - `冗余`
   - 但 default 函数非常适合`计算值` - 无法在 values.yaml 中声明

> mychart/templates/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favorite.drink | default "tea" | quote }}
  food: {{ .Values.favorite.food | upper | quote }}
```

> mychart/values.yaml

```yaml
favorite:
  # drink: coffee
  food: pizza
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 14:26:08 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: "tea"
  food: "PIZZA"
```

### lookup

1. 在运行的集群中查找资源 - apiVersion / kind / namespace / name
2. namespace 和 name 都是可选的
3. 当对象未找到时，会返回`空值` - 用来检测对象`是否存在`
4. 使用已有的 Kubernetes 连接配置查询 Kubernetes
   - 当与 API 服务交互时返回了错误，Helm 的模板操作会失败
5. 在 `helm template` 和 `helm install|upgrade|delete|rollback --dry-run` -- 不会请求 Kubernetes API 服务

| Command                              | Lookup                                   |
| ------------------------------------ | ---------------------------------------- |
| kubectl get pod mypod -n mynamespace | lookup "v1" "Pod" "mynamespace" "mypod"  |
| kubectl get pods -n mynamespace      | lookup "v1" "Pod" "mynamespace" ""       |
| kubectl get pods --all-namespaces    | lookup "v1" "Pod" "" ""                  |
| kubectl get namespace mynamespace    | lookup "v1" "Namespace" "" "mynamespace" |
| kubectl get namespaces               | lookup "v1" "Namespace" "" ""            |

> 当 lookup 返回一个`对象`，会返回一个`字典` - 可以进一步被引导来获取特定值

```go
(lookup "v1" "Namespace" "" "mynamespace").metadata.annotations
```

> 当 lookup 返回一个`对象列表`时，可以通过 `items` 字段访问对象列表

```go
{{ range $index, $service := (lookup "v1" "Service" "mynamespace" "").items }}
    {{/* do something with each service */}}
{{ end }}
```

### Operators

1. 对于模板来说，运算符（eq、ne、lt、gt、and、or 等）都作为函数来实现
2. 在`管道符`中，操作可以按照圆括号`分组`

## Function List

### Logic and Flow Control

| Function | Desc                                                         |
| -------- | ------------------------------------------------------------ |
| and      | 返回两个参数的 and 布尔值                                    |
| or       | 返回两个参数的 or 布尔值 - 返回`第一个非空参数`或`最后一个参数` |
| not      | 返回参数的布尔求反                                           |
| eq       | 返回参数的布尔等式                                           |
| ne       | 返回参数的布尔非等式                                         |
| lt       | 如果第一个参数`小于`第二个参数，返回 true                    |
| le       | 如果第一个参数`小于等于`第二个参数，返回 true                |
| gt       | 如果第一个参数`大于`第二个参数，返回 true                    |
| ge       | 如果第一个参数`大于等于`第二个参数，返回 true                |
| default  | 设置一个简单的默认值<br />`default "foo" .Bar` - 如果 .Bar 是`非空值`，则使用，否则返回默认值 foo |
| empty    | 如果给定的值被认为是`空值`，返回 true<br />`if not empty .Foo` -> `if .Foo` |
| required | `required "A valid foo is required!" .Bar`                   |
| fail     | 无条件地返回带有指定文本的空 `string` 或者 `error`<br />常用于模板明确渲染失败的场景 |
| coalesce | 获取一个列表并返回第一个`非空值`，常用于扫描多个变量或值     |
| ternary  | 获取两个值和一个 test 值，test 为 true，返回第一个值，否则返回第二个值 |

> default 空值取决于类型

1. 整型 - 0
2. 字符串 - ""
3. 列表 - []
4. 字典 - {}
5. 布尔 - false
6. nil or null
7. struct - 没有空的定义，struct 从来不会返回默认值

> ternary

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  # myvalue: "Hello World"
  # drink: {{ .Values.favorite.drink | default "tea" | quote }}
  # food: {{ .Values.favorite.food | upper | quote }}
  x: {{ ternary "x1" "x2" true }}
  y: {{ false | ternary "y1" "y2"}}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 18:16:51 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  # myvalue: "Hello World"
  # drink: "tea"
  # food: "PIZZA"
  x: x1
  y: y2
```

### String

| Function              | Desc                                                         |
| --------------------- | ------------------------------------------------------------ |
| print                 | 返回各部分组成的字符串，非字符串类型`可能`会被转换成字符串<br />如果两个参数`不是字符串`时，会在它们之间添加一个`空格` |
| println               | 与 print 类似，在末尾添加一行                                |
| printf                | 返回参数按顺序传递的格式化字符串                             |
| trim                  | 移除字符串两边的空格                                         |
| trimAll               | 从字符串中移除给定的`字符`                                   |
| trimPrefix            | 从字符串中移除前缀                                           |
| trimSuffix            | 从字符串中移除后缀                                           |
| lower                 | 将整个字符串转换为小写                                       |
| upper                 | 将整个字符串转换成大写                                       |
| title                 | 首字母转换成大写                                             |
| untitle               | 移除首字母大写                                               |
| repeat                | 重复字符串多次                                               |
| substr                | 获取字符串的子串                                             |
| nospace               | 去掉字符串中的所有空格                                       |
| trunc                 | 截断字符串                                                   |
| abbrev                | 用省略号截断字符串                                           |
| abbrevboth            | 两边都省略                                                   |
| initials              | 截取给定字符串每个单词的首字母，并组合在一起                 |
| randAlphaNum          | 0-9a-zA-Z                                                    |
| randAlpha             | a-zA-Z                                                       |
| randNumeric           | 0-9                                                          |
| randAscii             | 使用所有`可打印`的 ASCII 字符                                |
| wrap                  | 以给定列数给文字换行                                         |
| wrapWith              | 与 wrap 类似，以指定字符串换行 - wrap 使用的是 `\n`          |
| contains              | 测试字符串是否包含在另一个字符串中                           |
| hasPrefix / hasSuffix | 测试字符串是否有给定的前缀或者后缀                           |
| quote / squote        | 将字符串用双引号（quote）或者单引号（squote）括起来          |
| cat                   | 将多个字符串合成一个，用空格分隔                             |
| indent                | 以指定长度缩进给定字符串所在行 - `indent 4 $lots_of_text`    |
| nindent               | 与 indent 类似，但可以在字符串开头添加新行                   |
| replace               | 执行简单的字符串替换                                         |
| plural                | 字符串复数化，Helm 目前还不支持多语言复杂的复数规则          |
| snakecase             | 将驼峰写法转换成蛇形写法 - `first_name`                      |
| camelcase             | 将蛇形写法转换成驼峰写法 - `HttpServer`                      |
| kebabcase             | 将驼峰写法转换成烤串写法 - `first-name`                      |
| swapcase              | 基于单词的算法切换字符串的大小写<br />1. 大写字符变成小写字符<br />2. 首字母变成小写字母<br />3. 空格后或者开头的小写字母转换成大写字母<br />4. 其它小写字母转换成大写字母<br />5. 通过 `unicode.IsSpace(char)` 定义空格 |
| shuffle               | 对字符串进行洗牌                                             |

> placeholder

| Use              | Placeholder | Desc                                                         |
| ---------------- | ----------- | ------------------------------------------------------------ |
| 一般用途         | %v          | 默认格式的值<br />打印字典时，`%+v` 可以添加字段名称         |
|                  | %%          | 字符百分号                                                   |
| 布尔值           | %t          | true / false                                                 |
| 整型             | %b          | 二进制                                                       |
|                  | %c          | the character represented by the corresponding Unicode code point |
|                  | %d          | 十进制                                                       |
|                  | %o          | 八进制                                                       |
|                  | %O          | 带 `0o` 前缀的八进制                                         |
|                  | %q          | 安全转义的`单引号字符`                                       |
|                  | %x          | 16 进制，使用小写字符 `a-f`                                  |
|                  | %X          | 16 进制，使用大写字符`A-F`                                   |
|                  | %U          | Unicode 格式                                                 |
| 浮点数 + 复数    | %b          | 指数`二次幂`的`无小数`科学计数法                             |
|                  | %e          | 科学计数法                                                   |
|                  | %E          | 科学计数法                                                   |
|                  | %f          | `无指数`的小数                                               |
|                  | %F          | 与 %f 同义                                                   |
|                  | %g          | %e 的大指数，否则 %f                                         |
|                  | %G          | %E 的大指数，否则 %F                                         |
|                  | %x          | 十六进制计数法（两个指数的`十进制幂`）                       |
|                  | %X          | 大写的十六进制计数法                                         |
| 字符串和字节切片 | %s          | 未解析的二进制字符串或切片                                   |
|                  | %q          | 安全转义的`双引号字符串`                                     |
|                  | %x          | 十六进制，小写，每个`字节`两个字符                           |
|                  | %X          | 十六进制，大写，每个`字节`两个字符                           |
| 切片             | %p          | 十六进制的第 `0` 个元素的地址，以 `0x` 开头                  |

### Type Conversion

> 只有 atoi 需要输入一个特定的类型，其它会尝试将`任何类型`转换成目标类型

| Function                        | Desc                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| atoi                            | ASCII to integer - 字符串转换成整型                          |
| float64                         | 转换成 float64                                               |
| int                             | 按`系统整型宽度`转换成 int                                   |
| int64                           | 转换成 int64                                                 |
| toDecimal                       | 将 Unix 八进制权限转换成 int64                               |
| toString                        | 转换成字符串                                                 |
| toStrings                       | 将列表、切片或者数组转换成`字符串列表`                       |
| toJson / mustToJson             | 将列表、切片、数组、字典、对象转换成 JSON                    |
| toPrettyJson / mustToPrettyJson | 将列表、切片、数组、字典、对象转换成格式化 JSON              |
| toRawJson / mustToRawJson       | 将列表、切片、数组、字典、对象转换成`HTML 字符未转义`的 JSON |
| fromYaml                        | 将 YAML 字符串转化成对象                                     |
| fromJson                        | 将 JSON 字符串转化成对象                                     |
| toYaml                          | 将列表、切片、数组、字典、对象转换成`已缩进`的 YAML，与 Go yaml.Marshal 一样 |

> toStrings - 给定一个类列表集合，输出字符串切片

```go
list 1 2 3 | toStrings // ["1", "2", "3"]
```

> toDecimal - 给定一个 Unix 八进制权限，转换成十进制 int64

```go
"0777" | toDecimal // 511
```

> toJson / mustToJson - 将内容编码为 JSON 字符串

1. 如果内容无法被转换成 JSON 会返回`空字符串`
2. mustToJson 会返回`错误`以防止无法编码成 JSON
3. toPrettyJson / mustToPrettyJson - 将内容编码为`缩进`的 JSON 字符串
4. toRawJson / mustToRawJson - 将内容编码成包含`非转义 HTML 字符串`的 JSON 字符串

> fromYaml - 将 YAML 字符串转换成模板可用的对象

> mychart/yamls/person.yaml

```yaml
name: Bob
age: 25
hobbies:
  - hiking
  - fishing
  - cooking
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  {{- $person := .Files.Get "yamls/person.yaml" | fromYaml}}
  greeting: |
    {{ $person.name }} - {{ $person.age }}
    {{ range $person.hobbies }}{{ . }}
    {{ end }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 23:37:19 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  greeting: |
    Bob - 25
    hiking
    fishing
    cooking
```

> fromJson - 将 JSON 字符串转换成模板可用的对象

> mychart/jsons/person.json

```json
{
    "name": "Bob",
    "age": 25,
    "hobbies": [
        "hiking",
        "fishing",
        "cooking"
    ]
}
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  {{- $person := .Files.Get "jsons/person.json" | fromJson}}
  greeting: |
    {{ $person.name }} - {{ $person.age }}
    {{ range $person.hobbies }}{{ . }}
    {{ end }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Thu Jul  4 23:41:02 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  food: pizza

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  greeting: |
    Bob - 25
    hiking
    fishing
    cooking
```

### Regular Expressions

> regexMatch / mustRegexMatch - 输入字符串`包含`可匹配正则表达式任意字符串，返回 true
> mustRegexMatch - 有问题时会向模板引擎返回错误

```go
regexMatch "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$" "test@acme.com" // true
```

> regexFindAll / mustRegexFindAll - 返回输入字符串匹配正则表达式的`所有切片`，-1 表示返回所有

```go
regexFindAll "[2,4,6,8]" "1234" -1 // [2 4]
```

> regexFind / mustRegexFind - 返回输入字符串的第一个（最左边的）正则匹配

```go
regexFind "[a-zA-Z][1-9]" "abcd1234" // d1
```

1. regexReplaceAll / mustRegexReplaceAll - 用替换字符串替换 Regexp 的匹配项目，`$1` 表示`第一个子匹配`的文本
2. regexReplaceAllLiteral / mustRegexReplaceAllLiteral - 匹配字符串直接替换而非拷贝

> regexSplit / mustRegexSplit - 将输入字符串切成由表达式分隔的子字符串，-1 表示返回所有匹配

```go
regexSplit "z+" "pizza" -1 // [pi a]
```

### Security

| Function          | Desc                                                         |
| ----------------- | ------------------------------------------------------------ |
| sha1sum           | 接收一个字符串，并计算其 SHA1 摘要                           |
| sha256sum         | 接收一个字符串，并计算其 SHA256 摘要                         |
| adler32sum        | 接收一个字符串，并计算其 Adler-32 校验和                     |
| htpasswd          | 使用 username 和 password 生成一个密码的 bcrypt 哈希值<br />直接将密码存储在模板中并不安全 |
| derivePassword    | 基于某些共享的主密码约束得到特定的密码                       |
| genPrivateKey     | 生成一个编码成 `PEM` 块的新私钥 - ecdsa / dsa / rsa          |
| buildCustomCert   | 允许自定义证书                                               |
| genCA             | 生成一个新的，自签名的 x509 证书机构                         |
| genSelfSignedCert | 生成一个新的，自签名的 x509 证书                             |
| genSignedCert     | 通过指定的 CA 签名生成一个新的，x509 证书                    |
| encryptAES        | 使用 `AES-256 CBC` 加密文本并返回一个 `base64` 编码字符串    |
| decryptAES        | 接收一个 `AES-256 CBC` 编码的字符串并返回解密文本            |

### Date

| Function                    | Desc                                                         |
| --------------------------- | ------------------------------------------------------------ |
| now                         | 当前日期和时间                                               |
| ago                         | 返回距 `time.Now` 的以`秒`为单位的时间间隔 - 返回 `time.Duration` 的字符串格式 |
| date                        | 格式化日期                                                   |
| dateInZone                  | 与 date 一样，和时区一起                                     |
| duration                    | 将给定的秒数格式化 time.Duration                             |
| durationRound               | 将给定时间舍入到最重要的单位                                 |
| unixEpoch                   | 返回 time.Time 的 Unix 时间戳                                |
| dateModify / mustDateModify | 给定一个修改日期并返回时间戳                                 |
| htmlDate                    | 格式化插入到 HTML 日期选择器输入字段的日期                   |
| htmlDateInZone              | 与 htmlDate 一样，多了时区                                   |
| toDate / mustToDate         | 将字符串转换成日期，如果字符串无法转换，则返回零值           |

### Dict

1. Helm 提供了一个 Key-Value 的存储类型 - dict - `无序`类型
2. Key 必须是`字符串`，但 Value 可以是`任意类型` - 即 `map[string]any`
3. dict 是可变的，`set` 和 `unset` 会修改 dict 的内容

| Function                               | Desc                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| dict                                   | 传递一个键值对列表并创建字典                                 |
| get                                    | 给定一个 dict 和 key，从 dict 中获取 value<br />如果没有找到，则会简单返回 `""`，不会生成 error |
| set                                    | 给 dict 添加一个键值对，返回一个 dict                        |
| unset                                  | 给定一个 dict 和 key，从 dict 中删除 key，返回一个 dict<br />如果 key 没有找到，则简单返回，不会生成错误 |
| hasKey                                 | 给定 dict 返回了给定 key，则返回 true                        |
| pluck                                  | 给定一个 key 和多个 dict，获得所有匹配项的`值`组成的列表<br />如果 key 在 dict 中没有找到，则列表中的 dict 就不会有内容，并且列表长度小于 dict 数量<br />如果 key 存在，但值为空值，会插入一个值<br />常见用法 - `pluck... ` - 从 dict 列表中获取第一个匹配的值 |
| dig                                    | 遍历嵌套的 dict，从值列表中选择 key，如果找不到 key，会返回默认值<br />常用于避开`保护`规则（缺少字段会报错的场景，`a.maybeNil.iNeedThis`）<br /> |
| merge / mustMerge                      | 将两个或者多个 dict 合并为一个，dst dict 优先<br />合并的嵌套对象是 src dst 上的`同一个实例`，如果需要深度拷贝，则配合 deepCopy 使用 |
| mergeOverwrite<br />mustMergeOverwrite | 合并两个或者多个 dict，优先按照`从右到左`，在 dst dict 中有效地覆盖值 |
| keys                                   | 返回一个或者多个 dict 类型中所有 key 的列表<br />dict 是无序的，key 不会有可预料的顺序 - sortAlpha<br />多个 dict 时，key 会被串联起来，使用 uniq + sortAlpha 获取一个唯一有序的 key 列表 |
| values                                 | 类似于 keys，返回一个新的列表，包含 src dict 中所有的 value，仅支持一个 dict<br />同样无法保证结果的顺序 - sortAlpha |
| pick                                   | 从 dict 中选择给定的 key，并创建一个新的 dict                |
| omit                                   | 与 pick 相反                                                 |
| deepCopy<br />mustDeepCopy             | 给定一个值并深度拷贝这个值，包括 dict 和 struct              |

### Encoding

| Function        | Desc                |
| --------------- | ------------------- |
| b64enc / b64dec | 编码或者解码 Base64 |
| b32enc / b32dec | 编码或者解码 Base32 |

### List

1. 包含任意顺序的列表，类似于`数组`或者`切片`
2. 但 Helm List 被设计用于`不可变`数据类型

| Function              | Desc                                                         |
| --------------------- | ------------------------------------------------------------ |
| first / mustFirst     | 获取列表中的第一项                                           |
| rest / mustRest       | 除了第一项外的所有内容                                       |
| last / mustLast       | 获取列表中的最后一项                                         |
| initial / mustInitial | 除了最后一项外的所有内容                                     |
| append / mustAppend   | 在已有列表中追加一项，创建一个新的列表，已有列表保持不变     |
| prepend / mustPrepend | 将元素添加到已有列表的前面，生成一个新列表，已有列表保持不变 |
| concat                | 将任意数量的列表串联成一个，已有列表保持不变                 |
| reverse / mustReverse | 反转给定的列表，生成一个新列表                               |
| uniq / mustUniq       | 生成一个移除重复项的列表                                     |
| without / mustWithout | 从列表中过滤多个内容                                         |
| has / mustHas         | 列表是否有特定元素                                           |
| compact / mustCompact | 接受一个列表并删除`空值项` - 类型零值                        |
| index                 | 获取列表的第 n 个元素，也可以获取`多维`列表元素              |
| slice / mustSlice     | 从列表中获取部分元素                                         |
| until                 | 构建一个整数范围 - `{{ range $i, $e := until 5 }} {{ $i }} {{end}}` |
| untilStep             | 生成一个`步进`的整型列表                                     |
| seq                   | 类似于 bash seq                                              |

### Math

> 除非另外指定，所有的 math 函数操作的都是 int64 值

| Function | Desc                     |
| -------- | ------------------------ |
| add      | 求和，两个或多个输入     |
| add1     | 自增加 1                 |
| sub      | 相减                     |
| div      | 整除                     |
| mod      | 取模                     |
| mul      | 相乘，两个或多个输入     |
| max      | 返回一组整数中最大的整数 |
| min      | 返回一组整数中最小的整数 |
| len      | 返回参数的长度           |

### Float Math

> 所有的数学函数使用 `float64` 格式

| Function | Desc                                   |
| -------- | -------------------------------------- |
| addf     | 求和，两个或多个输入                   |
| add1f    | 自增加 1                               |
| subf     | 相减，两个或多个输入                   |
| divf     | 整数除法                               |
| mulf     | 乘法，两个或多个输入                   |
| maxf     | 返回最大浮点数                         |
| minf     | 返回最小浮点数                         |
| floor    | 返回`小于等于`输入值的`最大浮点整数`   |
| ceil     | 返回`大于等于`输入值的`最小浮点整数`   |
| round    | 返回一个`四舍五入`到`给定小数位`的数字 |

### Network

| Function      | Desc                     |
| ------------- | ------------------------ |
| getHostByName | 接收一个域名返回 IP 地址 |

### File Path

> Helm 模板函数`没有访问文件系统`的权限，提供了遵循`文件路径规范`的函数

| Function | Desc                           |
| -------- | ------------------------------ |
| base     | 返回最后一个路径元素           |
| dir      | 返回目录，去掉最后一个路径元素 |
| clean    | 清除路径                       |
| ext      | 返回文件扩展                   |
| isAbs    | 检查文件路径是否为绝对路径     |

### Reflection

1. Helm 提供了基本的反射工具，有助于理解特定值的基本 Go 类型信息
2. Helm 是由 Go 编写，强类型，类型系统应用于模板中
3. Go 原始类型 + 自定义类型

| Scope                                                    | Function   | Desc                            |
| -------------------------------------------------------- | ---------- | ------------------------------- |
| Kind                                                     | kindOf     | 返回对象类型                    |
|                                                          | kindIs     | 是否为特定类型                  |
| Type<br />不能测试是否实现给定接口<br />需要提前编译接口 | typeOf     | 返回值的基础类型                |
|                                                          | typeIs     | 类似于 kindIs，但针对 type      |
|                                                          | typeIsLike | 类似于 typeIs，除非取消指针引用 |
| deepEqual                                                |            | 适用于`非基本类型`              |

### Semantic Version

> Helm 提供了适用于  `SemVer 2` 版本的函数

| Function      | Desc                                                         |
| ------------- | ------------------------------------------------------------ |
| semver        | 将字符串解析为语义版本，返回一个 Version 对象<br />$version.Major - 主版本号<br />$version.Minor - 次版本号<br />$version.Patch - 补丁版本号<br />$version.Prerelease - 预发布版本号<br />$version.Metadata - 构建元数据<br />$version.Original - 原始版本字符串 |
|               | Version 对象支持 Compare 函数 - 在语义化版本中，`Metadata` 字段不参与比较 |
| semverCompare | 更健壮的比较函数                                             |

> 预发布版本

1. 用于稳定版本或者一般可用版本之前的软件版本
2. 预发布版本包括：development / alpha / beta / release-candidate
3. 预发布版本在相关版本之前发布 - 1.2.3-beta.1 < 1.2.3
4. 根据语义版本指定的预发布版本可能与对应的发行版本`不兼容`
   - 预发布版本 - 表示版本`不稳定`且可能不满足其相关正常版本所表示的`预期兼容性要求`
5. 使用不带预发布版本的比较器约束的语义版本的比较，会`跳过`预发布版本
   - `>=1.2.3` - 跳过预发布
   - `>=1.2.3-0` - 计算并查找预发布版本，0 作为预发布版本
6. 预发布版本只能包含 ASCII 字母数字、`-`、`.`
   - 排序按 ASCII 排序，最小字符为 `0`
   - ASCII 排序：`A-Z` 在 `a-z` 之前，因此 `1.2.3-alpha >= 1.2.3-BETA`，而并非大小写敏感

> 连字符范围比较

| A           | B                |
| ----------- | ---------------- |
| 1.2 - 1.4.5 | \>= 1.2 <= 1.4.5 |
| 2.3.4 - 4.5 | \>= 2.3.4 <= 4.5 |

> 比较中通配符 - x / X / * 可用于通配符，适用于所有比较运算符，当使用 `=` 运算符时，会返回`补丁级别`的比较

| A         | B                  |
| --------- | ------------------ |
| 1.2.x     | \>= 1.2.0, < 1.3.0 |
| \>= 1.2.x | \>= 1.2.0          |
| <= 2.x    | < 3                |
| *         | \>= 0.0.0          |

> 波浪符号范围比较 - 补丁级别范围的比较

| A      | B                  |
| ------ | ------------------ |
| ~1     | \>= 1, < 2         |
| ~2.3   | \>= 2.3, < 2.4     |
| ~1.2.3 | \>= 1.2.3, < 1.3.0 |
| ~1.2.x | \>= 1.2.0, < 1.3.0 |
| ~1.x   | \>= 1, < 2         |

> 插入符号比较 - 主版本级别比较，在 1.0.0 发布之前，次要版本充当 API 稳定级别版本

| A      | B                  |
| ------ | ------------------ |
| ^1.2.3 | \>= 1.2.3, < 2.0.0 |
| ^1.2.x | \>= 1.2.0, < 2.0.0 |
| ^2.3   | \>= 2.3, < 3       |
| ^2.x   | \>= 2.0.0, < 3     |
| ^0.2.3 | \>=0.2.3 <0.3.0    |
| ^0.2   | \>=0.2.0 <0.3.0    |
| ^0.0.3 | \>=0.0.3 <0.0.4    |
| ^0.0   | \>=0.0.0 <0.1.0    |
| ^0     | \>=0.0.0 <1.0.0    |

### URL

| Function | Desc                                                         |
| -------- | ------------------------------------------------------------ |
| urlParse | 解析 URL 的字符串并生成包含 URL 部分的 dict<br />使用 Go 标准库中 URL 包实现 |
| urlJoin  | 将一个 dict 连接成一个 URL 字符串                            |
| urlquery | 返回作为参数传入的值的转义版本，可以`嵌入`到 URL 的 Query 部分 |

### UUID

> Helm 可以生成 UUID V4 通用唯一 ID

### Kubernetes

| Function                      | Desc                                  |
| ----------------------------- | ------------------------------------- |
| lookup                        | 用于在正在运行的集群中查找资源        |
| .Capabilities.APIVersions.Has | 返回 API 版本或者资源是否在集群中可用 |
|                               |                                       |

## Flow Control

1. 控制结构（在模板语言中称为 `Actions`） - 提供控制模块迭代流的能力
2. 控制结构
   - `if/else` - 创建条件语句
   - `with` - 指定范围
   - `range` - 提供 `for each` 类型的循环
3.  声明和使用命名模板
   - `define` - 在模板中声明一个新的命名模板
   - `template` - 导入一个命名模板
   - `block` - 声明一种特殊的`可填充`的模板块

### if/else

> 讨论的是`管道`而非值 - 控制结构可以`执行整个管道`，而不仅仅是计算一个值

```go
{{ if PIPELINE }}
  # Do something
{{ else if OTHER PIPELINE }}
  # Do something else
{{ else }}
  # Default case
{{ end }}
```

> 以下值，管道会被设置为 false - Go 类型零值

1. 布尔 false
2. 数字 0
3. 空字符串
4. nil / null
5. 空集合 - map / slice / tuple / dict / array

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favorite.drink | default "tea" | quote }}
  food: {{ .Values.favorite.food | upper | quote }}
  {{ if eq .Values.favorite.drink "coffee" }}mug: "true"{{ end }}
```

> 控制空格 - 模板引擎运行时，移除了 `{{` 和 `}}` 里面的内容，但留下的空白`完全保持原样` - YAML 认为空白是有意义的

| A       | B                                |
| ------- | -------------------------------- |
| `{{- `  | 向左删除空白                     |
| `  -}}` | 右边的空格应该被删除，空格即换行 |

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  drink: {{ .Values.favorite.drink | default "tea" | quote }}
  food: {{ .Values.favorite.food | upper | quote }}
  {{- if eq .Values.favorite.drink "coffee" }}
  mug: "true"
  {{- end }}
```

### with

> 控制变量范围，`.` 是对`当前作用域`的引用

```go
{{ with PIPELINE }}
  # restricted scope
{{ end }}
```

> 作用域可以被改变，允许为特定对象设定当前作用域 `.`，with 后面的块只有在管道的值`不为空`时才会执行

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  {{- end }}
```

> 在`限定`的作用域内，无法使用 `.` 访问`父作用域`的对象

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  release: {{ .Release.Name }} # .Release.Name 不在 . 限定的作用域内
  {{- end }}
```

> 在 `{{ end }}` 之后，作用域会被`重置`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  {{- end }} # 重置限定作用域
  release: {{ .Release.Name }}
```

> 可以使用 `$` 从`父作用域`中访问 `Release.Name` 对象，当模板开始执行后，`$` 会被映射到`根作用域`，且执行过程中，不会更改

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  release: {{ $.Release.Name }} # 映射到根作用域
  {{- end }}
```

### range

> 在 Helm 的模板语言中，在一个`集合`中迭代的方式是使用 range 操作符

> mychart/values.yaml

```yaml
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
  - mushrooms
  - cheese
  - peppers
  - onionsls
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  release: {{ $.Release.Name }}
  {{- end }}
  toppings: |-
    {{- range .Values.pizzaToppings }}
    - {{ . | title | quote }}
    {{- end }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 16:28:46 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "PIZZA"
  release: solid-vulture
  toppings: |-
    - "Mushrooms"
    - "Cheese"
    - "Peppers"
    - "Onionsls"
```

> 也可以使用 `$` 从父作用域访问，当模板开始执行后，`$` 会被映射到根作用域，且执行过程中不会更改

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  myvalue: "Hello World"
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  release: {{ $.Release.Name }}
  toppings: |- # 声明多行字符串，并不是一个 YAML 列表，而是一个大字符串
    {{- range $.Values.pizzaToppings }}
    - {{ . | title | quote }} # . 被设置成了当前的迭代值
    {{- end }}
  {{- end }}
```

> 通过 `tuple` 快速创建列表，tuple 表示一个有`固定大小`、`任意数据类型`的集合

```yaml
  sizes:
    {{- range tuple "A" "B" "C" }}
    - {{ . }}
    {{- end}}
```

> 除了 list 和 tuple，range 还被用于迭代有`键值对`的集合 - map/dict

## Variables

> 在模板中，很少使用变量，但可以使用变量来简化代码，并更好地使用 `with` 和 `range`

1. 解决作用域问题的一种方法，将`对象`分配给可以`不考虑当前作用域`而访问的`变量`
2. 在 Helm 模板中，变量是对另一个对象的`命名引用`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  {{- $relname := .Release.Name }}
  {{- with .Values.favorite }}
  drink: {{ .drink | default "tea" | quote }}
  food: {{ .food | upper | quote }}
  release: {{ $relname }}
  {{- end }}
```

> 变量在 range 循环中，可以捕获`索引`和`值`

```yaml
  toppings: |-
    {{- range $index, $topping := .Values.pizzaToppings }}
      {{ $index }}: {{ $topping }}
    {{- end}}
```

> 对于有 Key 和 Value 的数据结构，可以使用 range 获取 Key 和 Value

```yaml
  favorites: |-
    {{- range $key, $value := .Values.favorite }}
      {{ $key }}: {{ $value }}
    {{- end}}
```

1. 变量一般`不是全局`的，作用域是其声明所在的块
2. 有一个变量是全局的，即 `$`，指向`根上下文`

> Helm 能够声明多个模板并将它们一起使用

## Named Templates

1. 命名模板（子模板）仅仅是在`文件内部定义`的模板，并使用了名字 - define / template / block
2. 模板名称是`全局`的，如果声明了两个`相同名称`的模板，哪个`最后加载`就使用哪个
   - 子 Chart 中的模板和顶层模板是一起编译的，命名时需要注意 Chart 特定名称
3. 常见的命名惯例 - 使用 Chart 名称作为模板前缀 - `{{ define "mychart.labels" }}`
   - 使用特定 Chart 名称作为`前缀`可以避免可能因为两个不同 Chart 使用了相同名称的模板而引起`冲突`
   - 同样适用于 Chart 的不同版本
     - `{{ define "mychart.v1.labels" }}`
     - `{{ define "mychart.v2.labels" }}`

### Partials + `_`

> Helm 支持创建`命名`的`嵌入式`模板，然后在其它位置按`名称`访问

> 文件的命名惯例 - 用来存储局部和辅助对象

1. templates/ - 大多数文件被视为 Kubernetes Manifest
2. NOTES.txt - 例外
3. 命名以下划线 `_` 开始的文件，假定`没有包含清单内容`
   - 这些文件`不会被渲染`为 Kubernetes 对象定义，但在其它 Chart 模板都可用

### define + template

> define - 在模板文件中创建一个`命名模板`

```go
{{- define "MY.NAME" }}
  # body of template here
{{- end }}
```

> 定义一个模板封装 Kubernetes 的标签

```yaml
{{- define "mychart.labels" }}
  labels:
    generator: helm
    date: {{ now | htmlDate }}
{{- end }}
```

> 使用 template 将通过 define 定义的命名模板嵌入到其它模板中

```yaml
{{- define "mychart.labels" }}
  labels:
    generator: helm
    date: {{ now | htmlDate }}
{{- end }}

apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
  {{- template "mychart.labels" }}
data:
  myvalue: "Hello World"
  {{- range $key, $val := .Values.favorite }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
```

> `define` 不会有输出，除非使用 template 调用

```
$ h install solid-vulture ./mychart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 17:15:44 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
  labels:
    generator: helm
    date: 2023-07-05
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "pizza"
```

1. 按照惯例，Helm Chart 将这些模板放置在`局部文件`中，一般为 `_helpers.tpl`
2. 按照惯例，define 方法会有个简单的文档块 `{{/* ... */}}` 来描述要做的事情

```yaml _helpers.tpl
{{/* Generate basic labels */}}
{{- define "mychart.labels" }}
  labels:
    generator: helm
    date: {{ now | htmlDate }}
{{- end }}
```

### scope

1. 当一个命名模板被渲染时，会接收被 template 调用传入的内容，如果没有内容传入，命名模板中无法使用 `.` 访问任何内容
2. template 调用末尾传入 `.`，可以简单传入 `.Values` 或 `.Values.favorite`，但一定要是`顶层范围`

```yaml
{{/* Generate basic labels */}}
{{- define "mychart.labels" }}
  labels:
    generator: helm
    date: {{ now | htmlDate }}
    chart: {{ .Chart.Name }}
    version: {{ .Chart.Version }}
{{- end }}
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
  {{- template "mychart.labels" . }} # 传递一个范围给命名模板
data:
  myvalue: "Hello World"
  {{- range $key, $val := .Values.favorite }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug --disable-openapi-validation
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 17:40:18 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
  labels:
    generator: helm
    date: 2023-07-05
    chart: mychart
    version: 0.1.0
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "pizza"
```

### include

> 简单命名模板

```yaml
{{- define "mychart.app" -}}
app_name: {{ .Chart.Name }}
app_version: "{{ .Chart.Version }}"
{{- end -}}
```

> 尝试将命名模板插入到模板的 `labels` 和 `data` 部分

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
  labels:
    {{ template "mychart.app" . }}
data:
  myvalue: "Hello World"
  {{- range $key, $val := .Values.favorite }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
{{ template "mychart.app" . }}
```

> 不符合预期，缩进不对
> 被替换的模板文本是`左对齐`的，而 template 是`行为`，而`不是方法`，无法将 template 调用的输出传给其它方法 - 数据`按行插入`

```
$ h install solid-vulture ./mychart --dry-run --debug --disable-openapi-validation
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 17:45:19 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
  labels:
    app_name: mychart
app_version: "0.1.0"
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "pizza"
app_name: mychart
app_version: "0.1.0"
```

> include - 将模板内容导入到当前管道，然后传递给管道中的其它方法

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
  labels:
{{ include "mychart.app" . | indent 4 }}
data:
  myvalue: "Hello World"
  {{- range $key, $val := .Values.favorite }}
  {{ $key }}: {{ $val | quote }}
  {{- end }}
{{ include "mychart.app" . | indent 2 }}
```

> 正确缩进，符合预期

```
$ h install solid-vulture ./mychart --dry-run --debug --disable-openapi-validation
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 17:51:36 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
  labels:
    app_name: mychart
    app_version: "0.1.0"
data:
  myvalue: "Hello World"
  drink: "coffee"
  food: "pizza"
  app_name: mychart
  app_version: "0.1.0"
```

1. 相较于使用 `template`，使用 `include` 是更好的方式，可以更好地处理 YAML 文档的输出格式
2. 如果需要导入的内容，并`不作为模板`，而仅仅是`导入文件内容`，可以使用 `.Files` 对象

## Files

> 注意事项

1. 可以添加`额外`的文件到 Chart 中，由于 Kubernetes 对象的限制，Chart 必须小于 `1M`
2. 出于安全考虑，.Files 对象无法访问一些文件
   - templates/ 中的文件
   - 使用 .helmignore 排除的文件
   - subchart 之外的文件，包括父级
3. Chart `不能保留` Unix 的`模式信息`，因此，`文件级权限`不会影响文件的`可用性`

### Basic example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  {{- $files := .Files }}
  {{- range tuple "config1.toml" "config2.toml" "config3.toml" }}
  {{ . }}: |-
    {{ $files.Get . }}
  {{- end }}
```

```
$ h install solid-vulture ./mychart --dry-run --debug --disable-openapi-validation
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart

NAME: solid-vulture
LAST DEPLOYED: Fri Jul  5 18:06:59 2024
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
- mushrooms
- cheese
- peppers
- onionsls

HOOKS:
MANIFEST:
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: solid-vulture-configmap
data:
  config1.toml: |-
    message = Hello from config 1
  config2.toml: |-
    message = This is config 2
  config3.toml: |-
    message = Goodbye from config 3
```

### Path helpers

1. 使用文件时，会对文件路径本身执行一些标准操作
2. Helm 从 Go 的 path 包导入了一些功能，使用与 Go 包中一样的名称便可访问 - Base / Dir / Ext / IsAbs / Clean

### Glob patterns

1. 使用 Glob 模式的灵活性来读取特定文件
2. .Glob 返回 Files 类型

```
$ tree bar foo
bar
├── bar.conf
├── bar.go
└── baz.yaml
foo
├── foo.txt
└── foo.yaml
```

```yaml
{{ $currentScope := .}}
{{ range $path, $_ :=  .Files.Glob  "**.yaml" }}
    {{- with $currentScope}}
        {{ .Files.Get $path }}
    {{- end }}
{{ end }}
```

```yaml
{{ range $path, $_ :=  .Files.Glob  "**.yaml" }}
      {{ $.Files.Get $path }}
{{ end }}
```

### ConfigMap + Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: conf
data:
{{ (.Files.Glob "foo/*").AsConfig | indent 2 }}
---
apiVersion: v1
kind: Secret
metadata:
  name: very-secret
type: Opaque
data:
{{ (.Files.Glob "bar/*").AsSecrets | indent 2 }}
```

### Encoding

> 导入一个文件并使用 Base64 方式对其进行编码来保证`成功传输`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  token: |-
        {{ .Files.Get "config1.toml" | b64enc }}
```

### Lines

> 访问文件中的每一行

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  some-file.txt: {{ range .Files.Lines "foo/bar.txt" }}
    {{ . }}{{ end }}
```

> helm install 无法将文件传递到 Chart 外，使用 `-f` 或者 `--set`

## NOTES.txt

1. 为 Chart 用户提供说明，在 `helm install` 或者 `helm upgrade` 的最后，打印出对用户有用的信息
2. NOTES.txt 为纯文本，但会像`模板`一样处理，所有正常的模板函数和对象都可以使用
3. 非必须，但强烈建议创建 NOTES.txt

```yaml
Thank you for installing {{ .Chart.Name }}.

Your release is named {{ .Release.Name }}.

To learn more about the release, try:

  $ helm status {{ .Release.Name }}
  $ helm get all {{ .Release.Name }}
```

```
$ helm install rude-cardinal ./mychart
NAME: rude-cardinal
LAST DEPLOYED: Fri Jul  5 18:28:44 2023
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Thank you for installing mychart.

Your release is named rude-cardinal.

To learn more about the release, try:

  $ helm status rude-cardinal
  $ helm get all rude-cardinal
```

## Subcharts + Global Values

1. Chart 可以使用依赖，即子 Chart，可以有自己的值和模板
2. 子 Chart
   - 子 Chart 被认为是`独立`的，即子 Chart 从来`不会显式依赖`父 Chart
   - `单向`：子 Chart `无法访问`父 Chart 的值，但父 Chart 可以`覆盖`子 Chart 的值
   - Helm 有一个`全局值`的概念，所有 Chart 都可以访问
   - 上述限制`不一定适用于`提供`标准化辅助功能`的 `Library Charts`

### Create Subchart

```
$ cd mychart/charts/

$ h create mysubchart
Creating mysubchart

$ rm -rf mysubchart/templates/*
```

### Template + Value

> mychart/charts/mysubchart/values.yaml

```yaml
dessert: cake
```

> mychart/charts/mysubchart/templates/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-cfgmap2
data:
  dessert: {{ .Values.dessert }}
```

> 每个子 Chart 是独立的 Chart，可以单独测试

```
$ h install --generate-name ./mychart/charts/mysubchart --dry-run --debug
install.go:222: [debug] Original chart version: ""
install.go:239: [debug] CHART PATH: /home/zhongmingmao/template/getting-started/mychart/charts/mysubchart

NAME: mysubchart-1720176891
LAST DEPLOYED: Fri Jul  5 18:54:51 2023
NAMESPACE: default
STATUS: pending-install
REVISION: 1
TEST SUITE: None
USER-SUPPLIED VALUES:
{}

COMPUTED VALUES:
dessert: cake

HOOKS:
MANIFEST:
---
# Source: mysubchart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysubchart-1720176891-cfgmap2
data:
  dessert: cake
```

### Overriding

> 父子关系 - 基于目录结构 `charts/`

> mychart/values.yaml - mysubchart 中的所有指令都会被发送到 mysubchart Chart 中

```yaml
favorite:
  drink: coffee
  food: pizza
pizzaToppings:
  - mushrooms
  - cheese
  - peppers
  - onionsls

mysubchart:
  dessert: ice cream
```

> 子 Chart 的值已经被父 Chart 的值`覆盖`

```
$ h install --generate-name ./mychart --dry-run --debug
...
---
# Source: mychart/charts/mysubchart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-1720177113-cfgmap2
data:
  dessert: ice cream
---
...
```

1. 从模板的角度来看，子 Chart 的值依然在 `.Values.dessert`
2. 当模板引擎传递值时，会设置`范围`，对于 mysubchart 模板，`.Values` 中只提供专门用于 mysubchart 的值

### Global Values

1. 全局值使用完全一样的名字，在所有的 Chart 以及其子 Chart 中都能访问的值
2. 全局变量需要`显式声明` - Values.global

> mychart/values.yaml

```yaml
global:
  salad: caesar
```

> 在父 Chart 和子 Chart 都能以 `{{ .Values.global.salad }}` 进行访问

> mychart/templates/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-configmap
data:
  salad: {{ .Values.global.salad }}
```

> mysubchart/templates/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-cfgmap2
data:
  dessert: {{ .Values.dessert }}
  salad: {{ .Values.global.salad }}
```

```
$ h install --generate-name ./mychart --dry-run --debug
...
# Source: mychart/charts/mysubchart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-1720177721-cfgmap2
data:
  dessert: ice cream
  salad: caesar
---
# Source: mychart/templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-1720177721-configmap
data:
  salad: caesar
```

### 注意事项

> 与子 Chart 共享模板

1. 父 Chart 和子 Chart 可以`共享`模板
2. 在任意 Chart 中定义的 `block` 在其它 Chart 也是可用的

> mychart/templates/_helpers.tpl

```yaml
{{- define "labels" }}from: mychart{{ end }}
```

> include 相对于 template 的优势 - 可以动态引用模块

> 避免使用 block，建议使用 include

1. Go 模板语言提供了一个 block 关键字
   - 允许开发者提供一个`稍后会被重写`的`默认实现`
2. 在 Helm Chart 中，block 并不是用于`覆盖`的最好工具
   - 如果提供了同一个 block 的多个实现，`无法预测`会选定哪个 block

## .helmignore

1. .helmignore 文件用来指定不准备包含在 Chart 中的文件
2. helm package - 在打包应用时会忽略所有在 .helmignore 文件中匹配的文件
3. .helmignore 支持 Unix Shell 的`全局匹配`、`相对路径匹配`、`反向匹配` - 每`行`只考虑一种模式
4. .helmignore vs .gitignore
   - 不支持 `**` 语法
   - globbing 库不一样
   - 末尾空格总会被忽略 - 不支持转义序列
   - 不支持 `!` 作为特殊的引导序列
   - 默认不会排除自身，需要`显式添加 .helmignore`

## Debug

> 渲染后的模板发送给了 Kubernetes API server，但可能会以格式化以外的原因拒绝 YAML 文件

| Debug                          | Desc                                                   |
| ------------------------------ | ------------------------------------------------------ |
| helm lint                      | 验证 Chart 是否`遵循最佳实践`的首选工具                |
| helm template --debug          | 在`本地`测试渲染 Chart 模板                            |
| helm install --dry-run --debug | 让`服务器`渲染模板，然后返回生成的 Kubernetes Manifest |
| helm get manifest              | 查看安装在服务器上的模板                               |

> YAML 解析失败，注释掉有问题部分，重新运行 `helm install --dry-run --debug`，注释也同样会被渲染

# YAML

## Scalars + Collections

> 根据 YAML 规范，有 2 种`集合类型`和多种`标量类型`

### Collections

> 2 种集合类型为 map 和 sequence

```yaml
map:
  one: 1
  two: 2
  three: 3

sequence:
  - one
  - two
  - three
```

### Scalars

> 标量值即单个值 - 在 Helm 内部的 YAML 语言中，一个`标量值的数据类型`由`一组复杂的规则`决定的

> 常见类型推断规则

1. 如果整型或者浮点型数字`没有引号`，则通常会被视为`数字类型`，但如果被引号括起来，则会被当成字符串，布尔型也类似
2. 空字符串是 null，而不是 nil
3. port: "80" 是合法的 YAML，通过`模板引擎`和 `YAML 解析器`传值，但如果 Kubernetes 希望 port 为整型，则会失败
4. 可以使用 `YAML 节点标签`强制推断特定类型
   - `age: !!str 21` - 告诉 YAML 解析器，age 是一个字符串
   - `port: !!int "80"` - 告诉 YAML 解析器，port 是一个 int

## Strings

1. YAML 中大多数数据都是`字符串`
2. 单行字符串
   - 没有引号，也没有转义
   - 双引号字符串，可以使用 `\` 转义指定字符
   - 单引号字符串，字面意义的字符串，不用 `\` 转义，只有`单引号本身`需要转义
3. 多行字符串 - `第一行必须正确缩进`
   - `|` - 表示多行字符串，字符串后面尾随一个 `\n`
   - `|-` - 去掉末尾的换行符
   - `|+` - 保留尾随空格
4. 文本块中的`缩进`也会被保留，也会保留`换行符`

> 等同于 - `Latte\nCappuccino\nEspresso\n`

```yaml
coffee: |
  Latte
  Cappuccino
  Espresso
```

> 等同于 - `Latte\nCappuccino\nEspresso`

```yaml
coffee: |-
  Latte
  Cappuccino
  Espresso
```

> 等同于 - `Latte\nCappuccino\nEspresso\n\n\n`

```yaml
coffee: |+
  Latte
  Cappuccino
  Espresso


another: value
```

> 保留文本块中缩进和换行 - `Latte\n 12 oz\n 16 oz\nCappuccino\nEspresso`

```yaml
coffee: |-
  Latte
    12 oz
    16 oz
  Cappuccino
  Espresso
```

## Indenting Templates

> 告诉模板引擎在文件 `myfile.txt` 中的`每行`缩进两个空格
> 并没有缩进模板的行，否则文件内容的第一行会缩进 2 次

```yaml
myfile: |
{{ .Files.Get "myfile.txt" | indent 2 }}
```

## Folded

> 使用多行表示一个字符串，在解析时将其视为一个长行 - 除了最后一个换行符，所有的`换行符`都将转换为`空格`

> 等同于 - `Latte Cappuccino Espresso\n`

```yaml
coffee: >
  Latte
  Cappuccino
  Espresso
```

> 在折叠语法中，`缩进`文本将导致`保留换行`

> 等同于 - `Latte\n 12 oz\n 16 oz\nCappuccino Espresso`

```yaml
coffee: >-
  Latte
    12 oz
    16 oz
  Cappuccino
  Espresso
```

## Embedding

> 可以将多个 YAML 文件放到单个文件中，文档前用 `---`，文档后用 `...`，但很多时候可以省略

```yaml
---
document:1
...
---
document: 2
...
```

1. Helm 中有些文件无法包含多个文档，如 `values.yaml` 只会使用第一个文档
2. 模板文件可以有多个文档
   - 文件会被当成一个对象进行渲染，但将结果 YAML 提供给 Kubernetes 时，会被分成多个文档
3. 确实需要时，才将多个文档写入到单个文件 - 很难调试

## JSON

> YAML 是 JSON 的超集，任何合法的 JSON 文档都应该是合法的 YAML

```json
{
  "coffee": "yes, please",
  "coffees": [
    "Latte", "Cappuccino", "Espresso"
  ]
}
```

> To YAML

```yaml
coffee: yes, please
coffees:
- Latte
- Cappuccino
- Espresso
```

> 混用 - values.yaml 可能包含 JSON 数据，Helm 将 `.json` 后缀的文件视为`不合法`的文件

```yaml
coffee: "yes, please"
coffees: [ "Latte", "Cappuccino", "Espresso"]
```

## Anchors

> 锚点 - YAML 规范存储了一种引用值的方法，然后通过引用值指向该值

```yaml
coffee: "yes, please"
favorite: &favoriteCoffee "Cappuccino"
coffees:
  - Latte
  - *favoriteCoffee
  - Espresso
```

>  将 &favoriteCoffee 设置成了 Cappuccino 的引用，然后通过 *favoriteCoffee 使用引用

```yaml
coffee: yes, please
favorite: Cappuccino
coffees:
- Latte
- Cappuccino
- Espresso
```

1. 锚点可能会引起细微的错误 - `第一次使用` YAML 时，将`展开引用`，然后将其`丢弃`
2. 由于 `Helm` 和 `Kubernetes` 经常读取、修改、重写 YAML 文件，`锚点会丢失`

# Development

## Functions

> include - 引入另一个模板，并将结果传递给其它模板方法

> required - 声明模板渲染所需的特定值，如果该值是空的，模板渲染会出错并打印错误信息

```yaml
value: {{ required "A valid .Values.who entry required!" .Values.who }}
```

## Strings / Integers

> 使用字符串数据时，使用括号括起来是更安全的做法

```yaml
name: {{ .Values.MyName | quote }}
```

> 使用整型时，不要将值括起来，在很多时候会导致 Kubernetes 解析失败
> 但不适用`环境变量`的场景，即便表现为整型，即环境变量，统一采用字符串的形式

```yaml
port: {{ .Values.Port }}
```

```yaml
env:
  - name: HOST
    value: "http://host"
  - name: PORT
    value: "1234"
```

## include

1. Go provides a way of including one template in another using a built-in `template` directive. However, the built-in function cannot be used in Go template pipelines.
2. To make it possible to include a template, and then perform an operation on that template's output, Helm has a special `include` function

```yaml
{{ include "toYaml" $value | indent 2 }}
```

## required

1. Go provides a way for setting template options to control behavior when a map is indexed with a key that's `not present` in the map.
2. This is typically set with `template.Options("missingkey=option")`, where `option` can be `default`, `zero`, or `error`. 
3. While setting this option to `error` will `stop execution` with an error, this would apply to every missing key in the map.
4. There may be situations where a chart developer wants to enforce this behavior for select values in the `values.yaml` file.

> 声明一个模板渲染所需要的值，如果在 `values.yaml` 中该值为空，则模板不会渲染并返回开发者错误信息

```yaml
{{ required "A valid foo is required!" .Values.foo }}
```

## tpl

1. The `tpl` function allows developers to `evaluate strings as templates` inside a template.
2. This is useful to pass a `template string` as a `value` to a chart or render external configuration files.

```yaml
# values
template: "{{ .Values.name }}"
name: "Tom"

# template
{{ tpl .Values.template . }}

# output
Tom
```

```yaml
# external configuration file conf/app.conf
firstName={{ .Values.firstName }}
lastName={{ .Values.lastName }}

# values
firstName: Peter
lastName: Parker

# template
{{ tpl (.Files.Get "conf/app.conf") . }}

# output
firstName=Peter
lastName=Parker
```

## Image Pull Secrets

> 镜像拉取密钥是 registry、username 和 password 的组合

> values.yaml

```yaml
imageCredentials:
  registry: quay.io
  username: someone
  password: sillyness
  email: someone@host.com
```

> _helpers.tpl

```yaml
{{- define "imagePullSecret" }}
{{- with .Values.imageCredentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" .registry .username .password .email (printf "%s:%s" .username .password | b64enc) | b64enc }}
{{- end }}
{{- end }}
```

> secret.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myregistrykey
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: {{ template "imagePullSecret" . }}
```

## Automatically Roll

1. 由于 ConfigMap 或是 Secret 作为配置文件注入容器以及其它外部依赖更新会导致经常需要滚动更新部署 Pod
2. 随后的 helm upgrade 可能需要重新启动应用，但如果负载本身没有更改并使用原有的配置保持运行，会导致部署不一致
3. The `sha256sum` function can be used to ensure a deployment's `annotation` section is updated if another file change

```yaml
kind: Deployment
spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
[...]
```

1. 如果添加到 Library Chart，将无法使用 `$.Template.BasePath` 访问文件
2. 可以使用 `{{ include ("mylibchart.configmap") . | sha256sum }}` 来引用

> 不建议使用随机字符串，每次调用模板方法都会生成一个随机字符串
> 如果需要同步多种资源使用的随机字符串，所有的相对资源都要在`同一个模板文件`中

```yaml
kind: Deployment
spec:
  template:
    metadata:
      annotations:
        rollme: {{ randAlphaNum 5 | quote }}
[...]
```

## Not Uninstall

1. 有时在执行 `helm uninstall` 时，有些资源不应该被卸载
2. 可以在资源中添加额外的 Annotation 来避免被卸载

```yaml
kind: Secret
metadata:
  annotations:
    "helm.sh/resource-policy": keep
[...]
```

> keep

1. 指示 Helm 操作要删除时，`跳过删除`这个资源
2. 但该资源会变成`孤立`的，Helm 不再以任何方式管理它
3. 如果一个 Release 已经卸载，但某个资源是 keep，再次执行 `helm install --replace` 时，会出错

 ## Partials + Includes

1. 在 Chart 中创建可以`重复利用`的部分- blocks / template partials
2. 在 templates/ 目录中，任何以下划线 `_` 开始的文件都不希望输出到 Kubernetes Manifest 中
3. 辅助模板和局部模板会被放在 `_helpers.tpl` 文件中

## Dependencies

1. 在 CNCF Artifact HUB 是很多 Chart 创建更先进应用的组成部分
2. 一个 Chart 可能会有很多子 Chart，每个都是整体功能的一部分
3. 从当前离散组件组成一个复杂应用的最佳实践
   - 创建顶层 Chart，构建全局配置
   - 然后使用 `charts/` 子目录嵌入每个组件

## JSON

1. YAML 是 JSON 的超集，任何合法的 JSON 结构在 YAML 中应该是合法的
2. 使用类 JSON 语法更容易表达`数据结构`而不是处理 YAML 的`空白敏感度`
3. 最佳实践 - 模板应`遵循类 YAML 语法`，除非 JSON 语法能大大降低格式问题的风险

## Random

> 潜在风险 - 当模板运行与最后一次运行不一样的生成数据时，会触发 资源升级

## One Command

> Install or Upgrade a Release with One Command

```
$ helm upgrade --install <release name> --values <values file> <chart directory>
```

# Repository

1. Repository 是打包的 Chart 存储和分享的位置 - Artifact Hub
2. Repository 是一个配置了 index.yaml 文件和一些已经打包 Chart 的HTTP 服务器
3. 客户端支持对 Repository 进行 SSL 身份认证，其它身份认证协议可以通过插件提供
4. Repository 可以是任何服务于 YAML 和 tar 文件并响应 GET 请求的 HTTP 服务器
   - Google Cloud Storage / Amazon S3 / GitHub Page

## Structure

1. Repository 由 Chart 包以及包含了 Repository 中所有 Chart `索引`的特殊文件 `index.yaml`
2. `index.yaml` 通常也脱管在同一个服务器上作为 `Provenance Files` - 非必须，但更方便

```yaml
charts/
  |
  |- index.yaml
  |
  |- alpine-0.1.2.tgz
  |
  |- alpine-0.1.2.tgz.prov
```

## Index

1. index.yaml 包含了一些包的`元信息`，包括 Chart 包中 Chart.yaml 文件的内容
2. 一个合法的 Repository 必须有一个 index.yaml，包括 Repository 中每个 Chart 的信息
3. `helm repo index` - 基于给定的包含 Chart 包的本地目录生成一个 index 文件

```
$ helm package mychart
Successfully packaged chart and saved it to: /home/zhongmingmao/template/getting-started/mychart-0.1.0.tgz

$ helm repo index .

$ ls
index.yaml mychart mychart-0.1.0.tgz
```

> index.yaml

```yaml
apiVersion: v1
entries:
  mychart:
  - apiVersion: v2
    appVersion: 1.16.0
    created: "2023-07-06T16:49:21.632545826+08:00"
    description: A Helm chart for Kubernetes
    digest: 7a99adf7ae2b647452998be6a35c60e096353d7d59829dc140af0ea78d575bc2
    name: mychart
    type: application
    urls:
    - mychart-0.1.0.tgz
    version: 0.1.0
generated: "2023-07-06T16:49:21.632244369+08:00"
```

## Store

> Repository 中的 Chart 必须`打包`且使用`正确的版本号`

```
$ helm package docs/examples/alpine/
$ mkdir fantastic-charts
$ mv alpine-0.1.0.tgz fantastic-charts/
$ helm repo index fantastic-charts --url https://fantastic-charts.storage.googleapis.com
```

1. 用刚创建的本地路径和远程仓库 `url` 构建一个 index.yaml，并放在给定目录中
2. 使用同步工具，将 Chart 和 index.yaml 上传到 Repository 中

## Merge

1. 想要在 Repository 中新增 Chart 时，必须重新生成 index.yaml
2. helm repo index - `完全无痕重建` index.yaml，但只包括`本地`找到的 Chart
3. `--merge` - 可以`增量添加`新的 Chart 到现有的 index.yaml 中

## Share

> 如果 Chart 支持 HTTP basic authentication，需要提供用户名和密码

```
$ helm repo add fantastic-charts https://fantastic-charts.storage.googleapis.com
$ helm repo list
fantastic-charts    https://fantastic-charts.storage.googleapis.com
```

1. 如果不存在`有效`的 index.yaml，则`无法添加` Repository
2. 如果 Repository 使用了自签名证书，为了可以跳过 CA 认证 - `helm repo add --insecure-skip-tls-verify ...`
3. helm repo add 和 helm repo update 会检索 index.yaml 文件
   - 并将其存储在 `$HELM_REPOSITORY_CACHE` 中，同样也是 helm search 搜索 Chart 信息的位置

# Glossary

> Chart Dependency = Subcharts

1. 安装 Chart 的同时会`安装所有依赖`，Chart 和它的依赖会作为一个`集合`进行管理

> KUBECONFIG

1. Helm 客户端会通过 `Kube Config` 来理解 Kubernetes 集群

> Provenance

1. Chart 可以由 Provenance 文件提供 Chart 的出处以及它所包含的内容
2. 提供的能力
   - 验证 Chart 被`可信第三方`签名
   - 验证 Chart 没有被篡改
   - 验证 Chart 的元数据内容 - Chart.yaml
   - 快速匹配 Chart 的数据来源
3. 使用 .prov 扩展名，可以由 Repository 提供

> Helm Library = Go SDK

1. 涉及到 Go 代码，可以直接与 Kubernetes API-Server 交互，进行安装、升级、查询以及移除 Kubernetes 资源
2. 可以被导入到项目中作为客户端库使用，而不是用作 CLI 命令

# Best Practices

## Conventions

> Chart Names

1. Chart 名称必须是`小写字母`和`数字`，单词之间可以使用 `-`
2. Chart 名称不能使用大写字母，也不能使用下划线，`.` 也不行

> Version Numbers

1. Helm 尽可能使用 SemVer 2 表示版本号，Docker 镜像的 Tag 不一定遵循 SemVer
2. 当 SemVer 版本存储在 Kubernetes Labels 中时，通常将 `+` 改成 `_`，因为 Label 不允许使用 `+` 作为值进行签名

> Formatting YAML

1. YAML 文件应该按照`双空格`缩进，不要使用 `Tab` 键

> Helm and Chart

1. Helm 指的是整个项目
2. helm 是指客户端命令
3. chart `不是专用名词`，不需要首字母大写
4. `Chart.yaml` 需要`首字母大写`，因为`文件名大小写敏感`

## Values

### Naming Conventions

> 变量名称以`小写字母开头`，单词按`驼峰`区分

```yaml
chicken: true
chickenNoodleSoup: true
```

```yaml
Chicken: true  # initial caps may conflict with built-ins
chicken-noodle-soup: true # do not use hyphens in the name
```

> 所有 Helm `内置变量`都是以`大写字母开头`，方便与用户定义的 value 区分 - `.Release.Name`

### Flat + Nested

> 值可以嵌套得很深，也可以是扁平的，在大多数场景中，`扁平由于嵌套`

```yaml
server:
  name: nginx
  port: 80
```

```yaml
serverName: nginx
serverPort: 80
```

> 为了最佳的`安全性`，嵌套值的每一层都必须`检查`

```yaml
{{ if .Values.server }}
  {{ default "none" .Values.server.name }}
{{ end }}
```

> 对于每个嵌套层，都必须进行`存在性检查`
> 对于扁平的配置，使得模板更易于阅读和理解，该检查可以跳过

### Types

1. YAML 的`类型强制规则`有时候是很`反常`的
2. 避免类型强制规则错误最简单的方式 - `字符串明确定义`，其它的都不明确，即给所有字符串打上引号
3. 通常，为了避免`整数转换`问题，将`整型`存储为`字符串`更好，并在模板中使用 `{{ int $value }}` 将字符串转回整型
4. 在大多数场景中，`显式类型标记`会更好 - `foo: !!string 1234`
   - 但是，YAML 解析器会`消耗标记`，因此`类型数据`在一次解析后`丢失`

### Users

> 有三种潜在的 Value 来源

1. Chart 的 `values.yaml` 文件
2. `helm install -f` 或 `helm upgrade -f` 提供的 values 文件
3. `helm install` 或 `helm upgrade` 时传递给 `--set` 或者 `--set-string` 参数的 values

> 当设计 values 结构时，用户可能会通过 `-f` 或者 `--set` 选项进行覆盖

1. 由于 `--set` 的`表现力更弱`，因此编写 values.yaml 的`第一指导原则`是确保它容易被 `--set` 覆盖
2. 使用 `map` 构建 values.yaml 是更好的选择

> 很难与 `--set` 一起使用 -- `--set servers[0].port=80`

```yaml
servers:
  - name: foo
    port: 80
  - name: bar
    port: 81
```

> 更易于使用 -- `--set servers.foo.port=80`

```yaml
servers:
  foo:
    port: 80
  bar:
    port: 81
```

### Document

1. values.yaml 中`每个`定义的属性都应该文档化
2. 文档字符串应该以它要描述的属性开头，并至少给出依据描述 - Go 习惯 + 更容易工具化

> 不正确

```yaml
# the host name for the webserver
serverHost: example
serverPort: 9191
```

> 正确

```yaml
# serverHost is the host name for the webserver
serverHost: example
# serverPort is the HTTP listener port for the webserver
serverPort: 9191
```

## Templates

### Structure

> templates/

1. 如果生成 YAML 输出，模板文件应该有 `.yaml` 扩展名，`.tpl` 扩展名可用于生成`非格式化内容`的模板文件
2. 模板文件名称应该使用 `-` 分隔，不能使用驼峰记法
3. 每个资源的定义应该在自身的模板文件中
4. 模板文件的名称应该反映名称中资源类型，如 `foo-pod.yaml`

### Names

1. Defined Template（`{{ define }}`）是可`全局访问`的
2. Chart 和所有的子 Chart 都可以访问由 `{{ define }}` 创建的模板
3. 因此 Defined Template 的名称应该被`命名空间化`

> 正确

```yaml
{{- define "nginx.fullname" }}
{{/* ... */}}
{{ end -}}
```

> 不正确

```yaml
{{- define "fullname" -}}
{{/* ... */}}
{{ end -}}
```

> 强烈建议通过 `helm create` 创建新 Chart

### Formatting

1. 模板应该使用`两个空格`缩进，永远不要使用 tab
2. 模板命令的`大括号前后`都应该使用`空格`

> 正确的

```yaml
{{ .foo }}
{{ print "foo" }}
{{- print "bar" -}}
```

> 不正确的

```yaml
{{.foo}}
{{print "foo"}}
{{-print "bar"-}}
```

> 模板应该`尽可能多`地使用`空格`

```yaml
foo:
  {{- range .Values.items }}
  {{ . }}
  {{ end -}}
```

> 块（如控制结构）可以`缩进`表示`模板代码流`

```yaml
{{ if $foo -}}
  {{- with .Bar }}Hello{{ end -}}
{{- end -}}
```

> 但是，YAML 是`面向空格`的语言，代码缩进通常不可能遵守规范

### Whitespace

>  最好在生成的模板中将`空格量`保持在`最小值`，尤其`大量空行`不应该`相邻出现`，但偶尔有空行是 OK 的

> 最佳

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: example
  labels:
    first: first
    second: second
```

> 也可

```yaml
apiVersion: batch/v1
kind: Job

metadata:
  name: example

  labels:
    first: first
    second: second
```

> 有毒

```yaml
apiVersion: batch/v1
kind: Job

metadata:
  name: example





  labels:
    first: first

    second: second
```

### Comments

> YAML 注释

```yaml
# This is a comment
type: sprocket
```

> 模板注释

```yaml
{{- /*
This is a comment.
*/}}
type: frobnitz
```

> 描述模板的特性应该使用模板注释

```yaml
{{- /*
mychart.shortname provides a 6 char truncated version of the release name.
*/}}
{{ define "mychart.shortname" -}}
{{ .Release.Name | trunc 6 }}
{{- end -}}
```

> 在模板中，当有助于用户在`调试`时查看注释，可以使用 YAML 注释
> 用户执行 `helm install --debug` 时可见，而在 `{{- /* */}}` 部分指定的注释不会显示

```yaml
# This may cause problems if the value is more than 100Gi
memory: {{ .Values.maxMem | quote }}
```

### JSON

> YAML 是 JSON 的超集，在某些情况下 JSON 语法比其它 YAML 表示更具有可读性

> YAML

```yaml
arguments:
  - "--dirname"
  - "/foo"
```

> JSON - 有更好的可读性，但 JSON 语法不应该应用于更复杂的结构

```yaml
arguments: ["--dirname", "/foo"]
```

> 在处理嵌入到 YAML 中的`纯 JSON`时，使用 JSON 格式是最合适的

## Dependencies

### Versions

> 如果有可能的话，使用`版本范围`，而非某个固定的版本，建议使用补丁级别版本的匹配

> \>= 1.2.3, < 1.3.0

```
version: ~1.2.3
```

> 上述版本约束不适用于预发布版本
> 预发布以及补丁级别的匹配

```yaml
version: ~1.2.3-0
```

> 仓库 URL

1. 如果可能的话，使用 `https://`，而非 `http://`
2. 如果 Repository 已经被添加到 Repository 索引文件中，可以使用 Repository 名称作为 URL 别名
   - 使用 `alias:` 或者 `@${Repository_Name}`
3. File URLs (`file://...`) are considered a "special case" for charts that are assembled by a fixed deployment pipeline.
4. 当 `repository` 字段为空时，Helm 无法对依赖项执行依赖管理操作
   - 此时，Helm 会假定依赖关系位于 `charts/` 目录下的子目录，名称与依赖关系的 `name` 属相相同

### Conditions + Tags

1. Condition 和 Tag 可以被添加到任意可选的依赖中
2. 当多个子 Chart `一起`提供可选的特性时，这些 Chart 应该共享相同的 Tag

```yaml
condition: somechart.enabled
```

```yaml
tags:
  - webaccelerator
```

## Labels + Annotations

> 在以下条件中，元数据应该是 Label

1. Kubernetes 使用它来`识别`这种资源
2. 为了`查询`系统，暴露给操作员

> Label - 找到特定 Chart 的所有实例

```yaml
helm.sh/chart: NAME-VERSION
```

> 如果元数据项`不用于查询`，就应该设置为 `Annotation`

1. `Helm Hook` 都是 `Annotation`

### Standard Labels

1. Helm Chart 使用的`通用标签`，Helm 本身从不要求出现特定标签
2. `REC` - 推荐标签，应该放置在 `Chart` 之上，保持全局一致性
3. OPT - 可选标签，惯用和常用的，但操作时并不经常依赖

| Name                         | Status | Desc                                                         |
| ---------------------------- | ------ | ------------------------------------------------------------ |
| app.kubernetes.io/name       | REC    | App 名称<br />`{{ template "name" . }}`<br />很多 Kubernetes Manifest 会使用，但不是 Helm 指定的 |
| helm.sh/chart                | REC    | Chart 的名称和版本<br /> `{{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}` |
| app.kubernetes.io/managed-by | REC    | 始终为 `{{ .Release.Service }}` 即 `Helm`<br />用来查找被 Helm 管理的所有内容 |
| app.kubernetes.io/instance   | REC    | `{{ .Release.Name }}`<br />有助于在同一应用程序中区分不同的实例 |
| app.kubernetes.io/version    | OPT    | App 版本 - `{{ .Chart.AppVersion }}`                         |
| app.kubernetes.io/component  | OPT    | 通用标签，用于标记块在应用程序中可能扮演的不同`角色`         |
| app.kubernetes.io/part-of    | OPT    | 当多个 Chart 或者 块用于构建一个应用程序时                   |

## Pod

### Images

> 容器镜像应该使用`固定`的 Tag 或者镜像 SHA，而不是 `latest`、head、canary 等`浮动`标签

```yaml
image: {{ .Values.redisImage | quote }}
```

```yaml
image: "{{ .Values.redisImage }}:{{ .Values.redisTag }}"
```

### Pull Policy

> 默认为 IfNotPresent

```yaml
image:
  pullPolicy: IfNotPresent
```

### Selectors

> 所有的 Pod 模板部分都应该指定一个 selector - Deployment

```yaml
selector:
  matchLabels:
      app.kubernetes.io/name: MyName
template:
  metadata:
    labels:
      app.kubernetes.io/name: MyName
```

## CRD

1. Helm 被优化为尽可能快地将尽可能多的资源加载到 Kubernetes 中
   - 按照设计，Kubernetes 尽可能获取一整套清单并将其全部上线
2. For a CRD, the declaration must be registered before any resources of that CRDs kind(s) can be used.
   - And the registration process sometimes takes a few seconds.

# Tools

## Plugins

| Plugin              | Arch  | Desc                                                         |
| :------------------ | ----- | ------------------------------------------------------------ |
| helm-adopt          |       | adopt existing k8s resources into a new generated helm chart |
| helm-diff           |       | shows a diff explaining what a helm upgrade would change     |
| helm-dashboard      |       | visualize your releases                                      |
| helm-release-plugin |       | pulls(re-creates) helm Charts from deployed releases, and updates values of deployed releases without the chart. |
| helm-schema-gen     | AMD64 | So that you don't have to write values.schema.json by hand from scratch for your Helm 3 charts. |
| helm-secrets        |       | help manage secrets with Git workflow and store them anywhere |
| helm-unittest       |       | BDD styled unit test framework for Kubernetes Helm charts as a Helm plugin. |
| helm-val            |       | get values from a previous release                           |

## Additional

| Tool       | Desc                                                         |
| ---------- | ------------------------------------------------------------ |
| move2kube  | A tool that accelerates the process of re-platforming to Kubernetes by analyzing source files. |
| monokle    | Desktop tool for creating, debugging and deploying Kubernetes resources and Helm Charts |
| Kubernetic | Kubernetes Desktop Client                                    |

