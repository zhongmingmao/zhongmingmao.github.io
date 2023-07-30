---
title: Kubernetes - CRI
mathjax: false
date: 2022-12-07 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/kubernetes-trends_k8s_container_runtime_popularity.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
---

# 概述

> `Container Runtime` 位于 `Node` 上，负责`容器的整个生命周期`，其中 `Docker` 应用最为广泛

![image-20230726235313869](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726235313869.png)

<!-- more -->

> `CRI` 是 Kubernetes 定义的一组 `gRPC` 服务

> 1. `Dockershim` 支持 `CRI`，代码`耦合`在 `kubelet` 中
> 2. 而 `Docker` 本身是不支持 `CRI` 的，但 Docker 内部的 `containerd` 是支持 `CRI` 的

![image-20230726235627377](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230726235627377.png)

1. Kubelet 作为客户端，基于 `gRPC` 框架，通过 `Socket` 和 Container Runtime 通信
2. Container Runtime 提供 `gRPC` 服务
   - `Image Service` - 下载、检查和删除镜像
   - `Runtime Service` - 容器生命周期管理 + 与容器交互
     - 区分了 `SandBox` + `Container`

> `Push Image` 并不在 `CRI` 中 -- 开发环境用 `Docker`，生产环境用 `containerd`

![image-20230727003001485](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230727003001485.png)

> 运行时分层

| Runtime                   | Impl                              |
| ------------------------- | --------------------------------- |
| `CRI - High-level` - gRPC | `Dockershim / containerd / CRI-O` |
| `OCI - Low-level`         | `runC` / kata-runtime / gVisor    |

> `OCI` = `Image` Specification + `Runtime` Specification

1.  `Image` Specification
    - 定义了 `OCI 镜像`的标准
    - `高层级运行时`下载一个 `OCI 镜像`，并把它解压成 `OCI 运行时文件系统包`（Filesystem bundle）
2.  `Runtime` Specification - 区分了 `SandBox` 和 `Container`
    - 描述如何从 `OCI 运行时文件系统包`运行容器程序，并且定义它的配置、运行环境和生命周期
    - 另外为新容器设置 `Namespace` 和 `Cgroups`，以及挂载 `RootFS`

![image-20230727002131671](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230727002131671.png)

# crictl

```
$ sudo crictl -h
NAME:
   crictl - client for CRI

USAGE:
   crictl [global options] command [command options] [arguments...]

VERSION:
   v1.26.0

COMMANDS:
   attach              Attach to a running container
   create              Create a new container
   exec                Run a command in a running container
   version             Display runtime version information
   images, image, img  List images
   inspect             Display the status of one or more containers
   inspecti            Return the status of one or more images
   imagefsinfo         Return image filesystem info
   inspectp            Display the status of one or more pods
   logs                Fetch the logs of a container
   port-forward        Forward local port to a pod
   ps                  List containers
   pull                Pull an image from a registry
   run                 Run a new container inside a sandbox
   runp                Run a new pod
   rm                  Remove one or more containers
   rmi                 Remove one or more images
   rmp                 Remove one or more pods
   pods                List pods
   start               Start one or more created containers
   info                Display information of the container runtime
   stop                Stop one or more running containers
   stopp               Stop one or more running pods
   update              Update one or more running containers
   config              Get and set crictl client configuration options
   stats               List container(s) resource usage statistics
   statsp              List pod resource usage statistics
   completion          Output shell completion code
   checkpoint          Checkpoint one or more running containers
   help, h             Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --config value, -c value            Location of the client config file. If not specified and the default does not exist, the program's directory is searched as well (default: "/etc/crictl.yaml") [$CRI_CONFIG_FILE]
   --debug, -D                         Enable debug mode (default: false)
   --image-endpoint value, -i value    Endpoint of CRI image manager service (default: uses 'runtime-endpoint' setting) [$IMAGE_SERVICE_ENDPOINT]
   --runtime-endpoint value, -r value  Endpoint of CRI container runtime service (default: uses in order the first successful one of [unix:///var/run/dockershim.sock unix:///run/containerd/containerd.sock unix:///run/crio/crio.sock unix:///var/run/cri-dockerd.sock]). Default is now deprecated and the endpoint should be set instead. [$CONTAINER_RUNTIME_ENDPOINT]
   --timeout value, -t value           Timeout of connecting to the server in seconds (e.g. 2s, 20s.). 0 or less is set to default (default: 2s)
   --help, -h                          show help (default: false)
   --version, -v                       print the version (default: false)
```

```
$ cat /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
```

> version

```
$ sudo crictl version
Version:  0.1.0
RuntimeName:  containerd
RuntimeVersion:  1.6.21
RuntimeApiVersion:  v1

$ sudo crictl --version
crictl version v1.26.0
```

> imagefsinfo

```json
{
  "status": {
    "timestamp": "1690708414155867149",
    "fsId": {
      "mountpoint": "/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs"
    },
    "usedBytes": {
      "value": "1971908608"
    },
    "inodesUsed": {
      "value": "16668"
    }
  }
}
```

> info

```json
{
  "status": {
    "conditions": [
      {
        "type": "RuntimeReady",
        "status": true,
        "reason": "",
        "message": ""
      },
      {
        "type": "NetworkReady",
        "status": true,
        "reason": "",
        "message": ""
      }
    ]
  },
  "cniconfig": {
    "PluginDirs": [
      "/opt/cni/bin"
    ],
    "PluginConfDir": "/etc/cni/net.d",
    "PluginMaxConfNum": 1,
    "Prefix": "eth",
    "Networks": [
      {
        "Config": {
          "Name": "cni-loopback",
          "CNIVersion": "0.3.1",
          "Plugins": [
            {
              "Network": {
                "type": "loopback",
                "ipam": {},
                "dns": {}
              },
              "Source": "{\"type\":\"loopback\"}"
            }
          ],
          "Source": "{\n\"cniVersion\": \"0.3.1\",\n\"name\": \"cni-loopback\",\n\"plugins\": [{\n  \"type\": \"loopback\"\n}]\n}"
        },
        "IFName": "lo"
      },
      {
        "Config": {
          "Name": "k8s-pod-network",
          "CNIVersion": "0.3.1",
          "Plugins": [
            {
              "Network": {
                "type": "calico",
                "ipam": {
                  "type": "calico-ipam"
                },
                "dns": {}
              },
              "Source": "{\"container_settings\":{\"allow_ip_forwarding\":false},\"datastore_type\":\"kubernetes\",\"ipam\":{\"assign_ipv4\":\"true\",\"assign_ipv6\":\"false\",\"type\":\"calico-ipam\"},\"kubernetes\":{\"k8s_api_root\":\"https://10.96.0.1:443\",\"kubeconfig\":\"/etc/cni/net.d/calico-kubeconfig\"},\"log_file_max_age\":30,\"log_file_max_count\":10,\"log_file_max_size\":100,\"log_file_path\":\"/var/log/calico/cni/cni.log\",\"log_level\":\"Info\",\"mtu\":0,\"nodename_file_optional\":false,\"policy\":{\"type\":\"k8s\"},\"type\":\"calico\"}"
            },
            {
              "Network": {
                "type": "bandwidth",
                "capabilities": {
                  "bandwidth": true
                },
                "ipam": {},
                "dns": {}
              },
              "Source": "{\"capabilities\":{\"bandwidth\":true},\"type\":\"bandwidth\"}"
            },
            {
              "Network": {
                "type": "portmap",
                "capabilities": {
                  "portMappings": true
                },
                "ipam": {},
                "dns": {}
              },
              "Source": "{\"capabilities\":{\"portMappings\":true},\"snat\":true,\"type\":\"portmap\"}"
            }
          ],
          "Source": "{\n\t\t\t  \"name\": \"k8s-pod-network\",\n\t\t\t  \"cniVersion\": \"0.3.1\",\n\t\t\t  \"plugins\": [{\"container_settings\":{\"allow_ip_forwarding\":false},\"datastore_type\":\"kubernetes\",\"ipam\":{\"assign_ipv4\":\"true\",\"assign_ipv6\":\"false\",\"type\":\"calico-ipam\"},\"kubernetes\":{\"k8s_api_root\":\"https://10.96.0.1:443\",\"kubeconfig\":\"/etc/cni/net.d/calico-kubeconfig\"},\"log_file_max_age\":30,\"log_file_max_count\":10,\"log_file_max_size\":100,\"log_file_path\":\"/var/log/calico/cni/cni.log\",\"log_level\":\"Info\",\"mtu\":0,\"nodename_file_optional\":false,\"policy\":{\"type\":\"k8s\"},\"type\":\"calico\"},{\"capabilities\":{\"bandwidth\":true},\"type\":\"bandwidth\"},{\"capabilities\":{\"portMappings\":true},\"snat\":true,\"type\":\"portmap\"}] \n\t\t\t}"
        },
        "IFName": "eth0"
      }
    ]
  },
  "config": {
    "containerd": {
      "snapshotter": "overlayfs",
      "defaultRuntimeName": "runc",
      "defaultRuntime": {
        "runtimeType": "",
        "runtimePath": "",
        "runtimeEngine": "",
        "PodAnnotations": [],
        "ContainerAnnotations": [],
        "runtimeRoot": "",
        "options": {},
        "privileged_without_host_devices": false,
        "baseRuntimeSpec": "",
        "cniConfDir": "",
        "cniMaxConfNum": 0
      },
      "untrustedWorkloadRuntime": {
        "runtimeType": "",
        "runtimePath": "",
        "runtimeEngine": "",
        "PodAnnotations": [],
        "ContainerAnnotations": [],
        "runtimeRoot": "",
        "options": {},
        "privileged_without_host_devices": false,
        "baseRuntimeSpec": "",
        "cniConfDir": "",
        "cniMaxConfNum": 0
      },
      "runtimes": {
        "runc": {
          "runtimeType": "io.containerd.runc.v2",
          "runtimePath": "",
          "runtimeEngine": "",
          "PodAnnotations": [],
          "ContainerAnnotations": [],
          "runtimeRoot": "",
          "options": {
            "BinaryName": "",
            "CriuImagePath": "",
            "CriuPath": "",
            "CriuWorkPath": "",
            "IoGid": 0,
            "IoUid": 0,
            "NoNewKeyring": false,
            "NoPivotRoot": false,
            "Root": "",
            "ShimCgroup": "",
            "SystemdCgroup": true
          },
          "privileged_without_host_devices": false,
          "baseRuntimeSpec": "",
          "cniConfDir": "",
          "cniMaxConfNum": 0
        }
      },
      "noPivot": false,
      "disableSnapshotAnnotations": true,
      "discardUnpackedLayers": false,
      "ignoreRdtNotEnabledErrors": false
    },
    "cni": {
      "binDir": "/opt/cni/bin",
      "confDir": "/etc/cni/net.d",
      "maxConfNum": 1,
      "confTemplate": "",
      "ipPref": ""
    },
    "registry": {
      "configPath": "/etc/containerd/certs.d",
      "mirrors": {},
      "configs": {},
      "auths": {},
      "headers": {
        "User-Agent": [
          "containerd/1.6.21"
        ]
      }
    },
    "imageDecryption": {
      "keyModel": "node"
    },
    "disableTCPService": true,
    "streamServerAddress": "127.0.0.1",
    "streamServerPort": "0",
    "streamIdleTimeout": "4h0m0s",
    "enableSelinux": false,
    "selinuxCategoryRange": 1024,
    "sandboxImage": "registry.aliyuncs.com/google_containers/pause:3.6",
    "statsCollectPeriod": 10,
    "systemdCgroup": false,
    "enableTLSStreaming": false,
    "x509KeyPairStreaming": {
      "tlsCertFile": "",
      "tlsKeyFile": ""
    },
    "maxContainerLogSize": 16384,
    "disableCgroup": false,
    "disableApparmor": false,
    "restrictOOMScoreAdj": false,
    "maxConcurrentDownloads": 3,
    "disableProcMount": false,
    "unsetSeccompProfile": "",
    "tolerateMissingHugetlbController": true,
    "disableHugetlbController": true,
    "device_ownership_from_security_context": false,
    "ignoreImageDefinedVolumes": false,
    "netnsMountsUnderStateDir": false,
    "enableUnprivilegedPorts": false,
    "enableUnprivilegedICMP": false,
    "containerdRootDir": "/var/lib/containerd",
    "containerdEndpoint": "/run/containerd/containerd.sock",
    "rootDir": "/var/lib/containerd/io.containerd.grpc.v1.cri",
    "stateDir": "/run/containerd/io.containerd.grpc.v1.cri"
  },
  "golang": "go1.19.9",
  "lastCNILoadStatus": "OK",
  "lastCNILoadStatus.default": "OK"
}
```

> stats

```
$ sudo crictl stats
CONTAINER           CPU %               MEM                 DISK                INODES
053271e88c086       0.27                18.48MB             12.29kB             7
2dba506d8859e       0.00                13.53MB             94.21kB             25
311fe197dc860       0.16                31.01MB             49.15kB             16
31e6e9e4e6dc7       0.31                13.06MB             45.06kB             14
5047e03048a4b       4.17                54.32MB             73.73kB             21
5427ea6a4c67e       0.16                19.15MB             57.34kB             18
711b90ec6cbbe       0.15                13.71MB             45.06kB             14
8062467827d14       0.19                14.23MB             65.54kB             19
84b3edfddbec4       0.18                31.48MB             49.15kB             15
c0c4f851a53bb       1.05                89.09MB             864.3kB             203
e179d884842e5       0.00                4.997MB             57.34kB             15
e559dfdc8a723       1.67                31.09MB             49.15kB             16
e8368ffed5039       13.64               374.3MB             53.25kB             15
e9b168211a83a       1.95                37.25MB             36.86kB             11
f18a6adf5b23c       0.00                3.846MB             32.77kB             8

$ sudo crictl statsp
POD                                        POD ID              CPU %               MEM
kube-scheduler-mac-k8s                     1165bab25ae21       0.75                19.25MB
coredns-7f6cbbb7b8-rr9dr                   14994dea79206       0.21                13.98MB
calico-apiserver-5bc5cf4559-l7m8r          6cdce974ca5b8       0.14                31.76MB
calico-kube-controllers-6f6579ddff-sq7hz   704b36894705f       0.00                14.91MB
csi-node-driver-j62g7                      7d6e14cf214eb       0.00                9.638MB
tigera-operator-84469c6b57-62x2b           88103cf807ae5       0.19                32.32MB
kube-controller-manager-mac-k8s            95fb6fc590c28       2.30                55.23MB
coredns-7f6cbbb7b8-78bwt                   a31bfee878b49       0.30                13.73MB
kube-proxy-tfxn8                           a732a1530dd18       0.01                14.87MB
calico-typha-64bcb7cddc-mgdnz              bc8c16a440f5c       0.08                19.86MB
calico-node-tsjrx                          c1d2f125b07f6       1.65                178.6MB
kube-apiserver-mac-k8s                     d115ca9d37d81       10.70               375.2MB
etcd-mac-k8s                               d69c146236495       1.53                50.41MB
calico-apiserver-5bc5cf4559-9d6dq          ecddecbd8bb0b       0.24                31.93MB
```

> push - `Push` 并非 `CRI` 规范

```
$ sudo crictl push
No help topic for 'push'
```

# 主流 Runtime

> 一开始 `Dockershim` 的代码`耦合`在 `Kubelet` 中

![image-20230727003529992](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230727003529992.png)

> `Docker` vs `containerd`

1. Docker 关于 `Container Runtime` 的核心组件为 `containerd`
   - 后来 `containerd` 也实现了 `CRI`（可以直接对接 `Kubelet`）
   - Kubernetes `1.24` 后，`Kubelet` 移除 `Dockershim` 代码，直接对接同样支持 `CRI` 的 `containerd`
2. 优势
   - `架构简化` - containerd 减少了 Docker 所需的处理模块 `Dockerd` 和 `Dockershim`
   - `性能更优` - 对 Docker 支持的`存储`进行了优化
3. 劣势 - `瑕不掩瑜`
   - 不支持 `zfs` 存储驱动
   - 不支持对`日志`的`大小`和`数量`进行限制

> `Docker` 和 `containerd` 的`镜像管理`是`分开`的，所以从 Docker 切换到 containerd 后，镜像需要`重新拉取`

![image-20230727004037371](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230727004037371.png)

> containerd 和 CRI-O 都符合 `CRI` 和 `OCI` 标准，`containerd` 在`稳定性`和`性能`上更优

![image-20230727004408319](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230727004408319.png)

|        | containerd | CRI-O |                          |
| ------ | ---------- | ----- | ------------------------ |
| `性能` | `更优`     | 优    |                          |
| `功能` | 优         | 优    | 符合 `CRI` 和 `OCI` 标准 |
| `稳定` | `稳定`     | 未知  |                          |

# containerd

>  将 `Docker` 切换成 `containerd`

> `containerd` 是符合 `CRI` 规范的 Runtime，`crictl pods - SandBox`，`crictl ps - Container`

```
$ sudo systemctl stop kubelet
$ sudo systemctl stop docker
$ sudo systemctl stop containerd
```

```
$ sudo mkdir -p /etc/containerd
$ containerd config default | sudo tee /etc/containerd/config.toml
```

```
$ sudo sed -i s#registry.k8s.io/pause:3.6#registry.aliyuncs.com/google_containers/pause:3.6#g /etc/containerd/config.toml
$ sudo sed -i s#'SystemdCgroup = false'#'SystemdCgroup = true'#g /etc/containerd/config.toml
```

```toml /etc/containerd/config.toml
disabled_plugins = []
imports = []
oom_score = 0
plugin_dir = ""
required_plugins = []
root = "/var/lib/containerd"
state = "/run/containerd"
temp = ""
version = 2

[cgroup]
  path = ""

[debug]
  address = ""
  format = ""
  gid = 0
  level = ""
  uid = 0

[grpc]
  address = "/run/containerd/containerd.sock"
  gid = 0
  max_recv_message_size = 16777216
  max_send_message_size = 16777216
  tcp_address = ""
  tcp_tls_ca = ""
  tcp_tls_cert = ""
  tcp_tls_key = ""
  uid = 0

[metrics]
  address = ""
  grpc_histogram = false

[plugins]

  [plugins."io.containerd.gc.v1.scheduler"]
    deletion_threshold = 0
    mutation_threshold = 100
    pause_threshold = 0.02
    schedule_delay = "0s"
    startup_delay = "100ms"

  [plugins."io.containerd.grpc.v1.cri"]
    device_ownership_from_security_context = false
    disable_apparmor = false
    disable_cgroup = false
    disable_hugetlb_controller = true
    disable_proc_mount = false
    disable_tcp_service = true
    enable_selinux = false
    enable_tls_streaming = false
    enable_unprivileged_icmp = false
    enable_unprivileged_ports = false
    ignore_image_defined_volumes = false
    max_concurrent_downloads = 3
    max_container_log_line_size = 16384
    netns_mounts_under_state_dir = false
    restrict_oom_score_adj = false
    sandbox_image = "registry.aliyuncs.com/google_containers/pause:3.6"
    selinux_category_range = 1024
    stats_collect_period = 10
    stream_idle_timeout = "4h0m0s"
    stream_server_address = "127.0.0.1"
    stream_server_port = "0"
    systemd_cgroup = false
    tolerate_missing_hugetlb_controller = true
    unset_seccomp_profile = ""

    [plugins."io.containerd.grpc.v1.cri".cni]
      bin_dir = "/opt/cni/bin"
      conf_dir = "/etc/cni/net.d"
      conf_template = ""
      ip_pref = ""
      max_conf_num = 1

    [plugins."io.containerd.grpc.v1.cri".containerd]
      default_runtime_name = "runc"
      disable_snapshot_annotations = true
      discard_unpacked_layers = false
      ignore_rdt_not_enabled_errors = false
      no_pivot = false
      snapshotter = "overlayfs"

      [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.default_runtime.options]

      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes]

        [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
          base_runtime_spec = ""
          cni_conf_dir = ""
          cni_max_conf_num = 0
          container_annotations = []
          pod_annotations = []
          privileged_without_host_devices = false
          runtime_engine = ""
          runtime_path = ""
          runtime_root = ""
          runtime_type = "io.containerd.runc.v2"

          [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
            BinaryName = ""
            CriuImagePath = ""
            CriuPath = ""
            CriuWorkPath = ""
            IoGid = 0
            IoUid = 0
            NoNewKeyring = false
            NoPivotRoot = false
            Root = ""
            ShimCgroup = ""
            SystemdCgroup = true

      [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime]
        base_runtime_spec = ""
        cni_conf_dir = ""
        cni_max_conf_num = 0
        container_annotations = []
        pod_annotations = []
        privileged_without_host_devices = false
        runtime_engine = ""
        runtime_path = ""
        runtime_root = ""
        runtime_type = ""

        [plugins."io.containerd.grpc.v1.cri".containerd.untrusted_workload_runtime.options]

    [plugins."io.containerd.grpc.v1.cri".image_decryption]
      key_model = "node"

    [plugins."io.containerd.grpc.v1.cri".registry]
      config_path = "/etc/containerd/certs.d"

      [plugins."io.containerd.grpc.v1.cri".registry.auths]

      [plugins."io.containerd.grpc.v1.cri".registry.configs]

      [plugins."io.containerd.grpc.v1.cri".registry.headers]

      [plugins."io.containerd.grpc.v1.cri".registry.mirrors]

    [plugins."io.containerd.grpc.v1.cri".x509_key_pair_streaming]
      tls_cert_file = ""
      tls_key_file = ""

  [plugins."io.containerd.internal.v1.opt"]
    path = "/opt/containerd"

  [plugins."io.containerd.internal.v1.restart"]
    interval = "10s"

  [plugins."io.containerd.internal.v1.tracing"]
    sampling_ratio = 1.0
    service_name = "containerd"

  [plugins."io.containerd.metadata.v1.bolt"]
    content_sharing_policy = "shared"

  [plugins."io.containerd.monitor.v1.cgroups"]
    no_prometheus = false

  [plugins."io.containerd.runtime.v1.linux"]
    no_shim = false
    runtime = "runc"
    runtime_root = ""
    shim = "containerd-shim"
    shim_debug = false

  [plugins."io.containerd.runtime.v2.task"]
    platforms = ["linux/arm64/v8"]
    sched_core = false

  [plugins."io.containerd.service.v1.diff-service"]
    default = ["walking"]

  [plugins."io.containerd.service.v1.tasks-service"]
    rdt_config_file = ""

  [plugins."io.containerd.snapshotter.v1.aufs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.btrfs"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.devmapper"]
    async_remove = false
    base_image_size = ""
    discard_blocks = false
    fs_options = ""
    fs_type = ""
    pool_name = ""
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.native"]
    root_path = ""

  [plugins."io.containerd.snapshotter.v1.overlayfs"]
    root_path = ""
    upperdir_label = false

  [plugins."io.containerd.snapshotter.v1.zfs"]
    root_path = ""

  [plugins."io.containerd.tracing.processor.v1.otlp"]
    endpoint = ""
    insecure = false
    protocol = ""

[proxy_plugins]

[stream_processors]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar"

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    args = ["--decryption-keys-path", "/etc/containerd/ocicrypt/keys"]
    env = ["OCICRYPT_KEYPROVIDER_CONFIG=/etc/containerd/ocicrypt/ocicrypt_keyprovider.conf"]
    path = "ctd-decoder"
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"

[timeouts]
  "io.containerd.timeout.bolt.open" = "0s"
  "io.containerd.timeout.shim.cleanup" = "5s"
  "io.containerd.timeout.shim.load" = "5s"
  "io.containerd.timeout.shim.shutdown" = "3s"
  "io.containerd.timeout.task.state" = "2s"

[ttrpc]
  address = ""
  gid = 0
  uid = 0
```

```
$ sudo vim /etc/systemd/system/kubelet.service.d/10-kubeadm.conf
Environment="KUBELET_EXTRA_ARGS=--container-runtime=remote --container-runtime-endpoint=unix:///run/containerd/containerd.sock --pod-infra-container-image=registry.aliyuncs.com/google_containers/pause:3.6"
```

```
$ sudo systemctl daemon-reload
$ sudo systemctl restart containerd
$ sudo systemctl restart kubelet
```

```
$ cat <<EOF | sudo tee /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
EOF
```

> 容器销毁 + 镜像失效

```
$ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES

$ docker images
REPOSITORY                                                        TAG       IMAGE ID       CREATED         SIZE
nginx                                                             latest    2002d33a54f7   3 weeks ago     192MB
quay.io/tigera/operator                                           v1.30.4   ad14f750fd47   5 weeks ago     64.9MB
calico/typha                                                      v3.26.1   1846b2c90378   5 weeks ago     61.9MB
calico/kube-controllers                                           v3.26.1   01cf521462df   5 weeks ago     68.8MB
calico/apiserver                                                  v3.26.1   00af1d6faf68   5 weeks ago     87.9MB
calico/cni                                                        v3.26.1   750dd81f472a   5 weeks ago     199MB
calico/node-driver-registrar                                      v3.26.1   1075da421911   5 weeks ago     23.2MB
calico/csi                                                        v3.26.1   38afdba79f37   5 weeks ago     18.7MB
calico/pod2daemon-flexvol                                         v3.26.1   07cc45ad90a6   5 weeks ago     10.7MB
calico/node                                                       v3.26.1   d5dd9023bb47   5 weeks ago     258MB
registry.aliyuncs.com/google_containers/kube-apiserver            v1.22.2   9789bbb9890f   22 months ago   119MB
registry.aliyuncs.com/google_containers/kube-controller-manager   v1.22.2   e596def24758   22 months ago   113MB
registry.aliyuncs.com/google_containers/kube-proxy                v1.22.2   464a2b742200   22 months ago   97.4MB
registry.aliyuncs.com/google_containers/kube-scheduler            v1.22.2   0e95bd29ff69   22 months ago   49.3MB
registry.aliyuncs.com/google_containers/pause                     3.6       7d46a07936af   23 months ago   484kB
registry.aliyuncs.com/google_containers/etcd                      3.5.0-0   2252d5eb703b   2 years ago     364MB
registry.aliyuncs.com/google_containers/coredns                   v1.8.4    6d3ffc2696ac   2 years ago     44.4MB
registry.aliyuncs.com/google_containers/pause                     3.5       f7ff3c404263   2 years ago     484kB
```

```
$ sudo crictl pods
POD ID              CREATED              STATE               NAME                                       NAMESPACE           ATTEMPT             RUNTIME
6cdce974ca5b8       About a minute ago   Ready               calico-apiserver-5bc5cf4559-l7m8r          calico-apiserver    1                   (default)
a31bfee878b49       About a minute ago   Ready               coredns-7f6cbbb7b8-78bwt                   kube-system         1                   (default)
704b36894705f       About a minute ago   Ready               calico-kube-controllers-6f6579ddff-sq7hz   calico-system       1                   (default)
14994dea79206       About a minute ago   Ready               coredns-7f6cbbb7b8-rr9dr                   kube-system         1                   (default)
7d6e14cf214eb       About a minute ago   Ready               csi-node-driver-j62g7                      calico-system       1                   (default)
ecddecbd8bb0b       About a minute ago   Ready               calico-apiserver-5bc5cf4559-9d6dq          calico-apiserver    1                   (default)
a732a1530dd18       5 minutes ago        Ready               kube-proxy-tfxn8                           kube-system         0                   (default)
88103cf807ae5       5 minutes ago        Ready               tigera-operator-84469c6b57-62x2b           tigera-operator     0                   (default)
bc8c16a440f5c       5 minutes ago        Ready               calico-typha-64bcb7cddc-mgdnz              calico-system       0                   (default)
c1d2f125b07f6       5 minutes ago        Ready               calico-node-tsjrx                          calico-system       0                   (default)
95fb6fc590c28       7 minutes ago        Ready               kube-controller-manager-mac-k8s            kube-system         0                   (default)
1165bab25ae21       7 minutes ago        Ready               kube-scheduler-mac-k8s                     kube-system         0                   (default)
d69c146236495       7 minutes ago        Ready               etcd-mac-k8s                               kube-system         0                   (default)
d115ca9d37d81       7 minutes ago        Ready               kube-apiserver-mac-k8s                     kube-system         0                   (default)

$ sudo crictl ps
CONTAINER           IMAGE               CREATED             STATE               NAME                      ATTEMPT             POD ID              POD
e559dfdc8a723       00af1d6faf684       3 seconds ago       Running             calico-apiserver          1                   ecddecbd8bb0b       calico-apiserver-5bc5cf4559-9d6dq
84b3edfddbec4       ad14f750fd47c       4 minutes ago       Running             tigera-operator           3                   88103cf807ae5       tigera-operator-84469c6b57-62x2b
2dba506d8859e       464a2b7422007       4 minutes ago       Running             kube-proxy                1                   a732a1530dd18       kube-proxy-tfxn8
5427ea6a4c67e       1846b2c903785       4 minutes ago       Running             calico-typha              1                   bc8c16a440f5c       calico-typha-64bcb7cddc-mgdnz
053271e88c086       0e95bd29ff690       5 minutes ago       Running             kube-scheduler            4                   1165bab25ae21       kube-scheduler-mac-k8s
5047e03048a4b       e596def247585       6 minutes ago       Running             kube-controller-manager   3                   95fb6fc590c28       kube-controller-manager-mac-k8s
e9b168211a83a       2252d5eb703b0       6 minutes ago       Running             etcd                      1                   d69c146236495       etcd-mac-k8s
e8368ffed5039       9789bbb9890f7       6 minutes ago       Running             kube-apiserver            2                   d115ca9d37d81       kube-apiserver-mac-k8s

$ sudo crictl images
IMAGE                                                             TAG                 IMAGE ID            SIZE
docker.io/calico/apiserver                                        v3.26.1             00af1d6faf684       36.4MB
docker.io/calico/cni                                              v3.26.1             750dd81f472ae       85.5MB
docker.io/calico/csi                                              v3.26.1             38afdba79f37f       9.5MB
docker.io/calico/kube-controllers                                 v3.26.1             01cf521462df2       29.2MB
docker.io/calico/node                                             v3.26.1             d5dd9023bb474       84.7MB
docker.io/calico/pod2daemon-flexvol                               v3.26.1             07cc45ad90a68       5.58MB
docker.io/calico/typha                                            v3.26.1             1846b2c903785       25.8MB
quay.io/tigera/operator                                           v1.30.4             ad14f750fd47c       19.1MB
registry.aliyuncs.com/google_containers/coredns                   v1.8.4              6d3ffc2696ac2       12.3MB
registry.aliyuncs.com/google_containers/etcd                      3.5.0-0             2252d5eb703b0       158MB
registry.aliyuncs.com/google_containers/kube-apiserver            v1.22.2             9789bbb9890f7       28.4MB
registry.aliyuncs.com/google_containers/kube-controller-manager   v1.22.2             e596def247585       27MB
registry.aliyuncs.com/google_containers/kube-proxy                v1.22.2             464a2b7422007       34.4MB
registry.aliyuncs.com/google_containers/kube-scheduler            v1.22.2             0e95bd29ff690       13.5MB
registry.aliyuncs.com/google_containers/pause                     3.6                 7d46a07936af9       254kB

$ k get po -A
NAMESPACE          NAME                                       READY   STATUS    RESTARTS        AGE
calico-apiserver   calico-apiserver-5bc5cf4559-9d6dq          1/1     Running   1               3d5h
calico-apiserver   calico-apiserver-5bc5cf4559-l7m8r          1/1     Running   1               3d5h
calico-system      calico-kube-controllers-6f6579ddff-sq7hz   1/1     Running   1               3d5h
calico-system      calico-node-tsjrx                          1/1     Running   1               3d5h
calico-system      calico-typha-64bcb7cddc-mgdnz              1/1     Running   1               3d5h
calico-system      csi-node-driver-j62g7                      2/2     Running   2               3d5h
kube-system        coredns-7f6cbbb7b8-78bwt                   1/1     Running   1               3d5h
kube-system        coredns-7f6cbbb7b8-rr9dr                   1/1     Running   1               3d5h
kube-system        etcd-mac-k8s                               1/1     Running   1               3d5h
kube-system        kube-apiserver-mac-k8s                     1/1     Running   2 (10m ago)     3d5h
kube-system        kube-controller-manager-mac-k8s            1/1     Running   3               3d5h
kube-system        kube-proxy-tfxn8                           1/1     Running   1               3d5h
kube-system        kube-scheduler-mac-k8s                     1/1     Running   4 (9m16s ago)   3d5h
tigera-operator    tigera-operator-84469c6b57-62x2b           1/1     Running   3               3d5h

$ sudo crictl pull nginx
Image is up to date for sha256:2002d33a54f72d1333751d4d1b4793a60a635eac6e94a98daf0acea501580c4f

$ k apply -f deployment.yaml
deployment.apps/nginx-deployment created

$ k get deployments.apps
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   1/1     1            1           72s

$ k get po -owide
NAME                                READY   STATUS    RESTARTS   AGE   IP               NODE      NOMINATED NODE   READINESS GATES
nginx-deployment-6799fc88d8-hlsdg   1/1     Running   0          89s   192.168.185.15   mac-k8s   <none>           <none>
```

