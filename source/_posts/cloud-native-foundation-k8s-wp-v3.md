---
title: Kubernetes - 3rd example
mathjax: false
date: 2022-11-07 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/1_VpxbX3hVaUuz9jDNjBLUiQ-8148201.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - Kubernetes
tags:
  - Cloud Native
  - Kubernetes
---

# 架构

![image-20230701083936908](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230701083936908.png)

<!-- more -->

# MariaDB

> ConfigMap

```yaml maria-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maria-cm

data:
  DATABASE: 'db'
  USER: 'wp'
  PASSWORD: '123'
  ROOT_PASSWORD: '123'
```

```
$ k apply -f maria-cm.yaml
configmap/maria-cm created
```

> StatefulSet

```yaml maria-sts.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: maria-sts
  labels:
    app: maria-sts

spec:
  # headless svc
  serviceName: maria-svc

  # pvc
  volumeClaimTemplates:
  - metadata:
      name: maria-100m-pvc
    spec:
      storageClassName: nfs-client
      accessModes:
      - ReadWriteMany
      resources:
        requests:
          storage: 100Mi

  replicas: 1
  selector:
    matchLabels:
      app: maria-sts

  template:
    metadata:
      labels:
        app: maria-sts
    spec:
      containers:
      - image: mariadb:10
        name: mariadb
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3306

        envFrom:
        - prefix: 'MARIADB_'
          configMapRef:
            name: maria-cm

        volumeMounts:
        - name: maria-100m-pvc
          mountPath: /var/lib/mysql
```

```
$ k apply -f maria-sts.yaml
statefulset.apps/maria-sts created

$ k get po -owide
NAME          READY   STATUS    RESTARTS   AGE   IP             NODE         NOMINATED NODE   READINESS GATES
maria-sts-0   1/1     Running   0          88s   10.10.47.195   mac-master   <none>           <none>

$ k get sc -owide
NAME         PROVISIONER                                   RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
nfs-client   k8s-sigs.io/nfs-subdir-external-provisioner   Delete          Immediate           false                  4d7h

$ k get pv -owide
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                   STORAGECLASS   REASON   AGE     VOLUMEMODE
pvc-d4ffb060-5e83-4dd6-b75f-27e0430bd48c   100Mi      RWX            Delete           Bound    default/maria-100m-pvc-maria-sts-0      nfs-client              2m47s   Filesystem

$ k get pvc -owide
NAME                            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE     VOLUMEMODE
maria-100m-pvc-maria-sts-0      Bound    pvc-d4ffb060-5e83-4dd6-b75f-27e0430bd48c   100Mi      RWX            nfs-client     3m16s   Filesystem
```

> NFS Server

```
$ pwd
/tmp/nfs/default-maria-100m-pvc-maria-sts-0-pvc-d4ffb060-5e83-4dd6-b75f-27e0430bd48c

$ ls
aria_log.00000001  db                ib_buffer_pool  ibdata1  multi-master.info  mysql_upgrade_info  sys
aria_log_control   ddl_recovery.log  ib_logfile0     ibtmp1   mysql              performance_schema
```

> Service

```yaml maria-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: maria-svc

spec:
  selector:
    app: maria-sts
  ports:
  - port: 3306
    protocol: TCP
    targetPort: 3306
```

```
$ k apply -f maria-svc.yaml
service/maria-svc created

$ k describe svc maria-svc
Name:              maria-svc
Namespace:         default
Labels:            <none>
Annotations:       <none>
Selector:          app=maria-sts
Type:              ClusterIP
IP Family Policy:  SingleStack
IP Families:       IPv4
IP:                10.98.233.175
IPs:               10.98.233.175
Port:              <unset>  3306/TCP
TargetPort:        3306/TCP
Endpoints:         10.10.47.195:3306
Session Affinity:  None
Events:            <none>
```

# WordPress

> ConfigMap -- `maria-sts-0.maria-svc`

```yaml wp-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm

data:
  HOST: 'maria-sts-0.maria-svc'
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'
```

```
$ k apply -f wp-cm.yaml
configmap/wp-cm created
```

> Deployment

```yaml wp-deploy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-deploy
  labels:
    app: wp-deploy

spec:
  replicas: 2
  selector:
    matchLabels:
      app: wp-deploy
  template:
    metadata:
      labels:
        app: wp-deploy
    spec:
      containers:
      - name: wp
        image: wordpress:5
        ports:
        - containerPort: 80
        envFrom:
        - prefix: 'WORDPRESS_DB_'
          configMapRef:
            name: wp-cm
```

```
$ k apply -f wp-deploy.yaml
deployment.apps/wp-deploy created

$ k get po -owide
NAME                         READY   STATUS    RESTARTS   AGE   IP              NODE         NOMINATED NODE   READINESS GATES
maria-sts-0                  1/1     Running   0          17m   10.10.47.195    mac-master   <none>           <none>
wp-deploy-6bdb6f69bf-bvlnd   1/1     Running   0          47s   10.10.47.196    mac-master   <none>           <none>
wp-deploy-6bdb6f69bf-n6ms2   1/1     Running   0          47s   10.10.151.130   mac-worker   <none>           <none>
```

> Service

```yaml wp-svc.yaml
apiVersion: v1
kind: Service
metadata:
  name: wp-svc
  labels:
    app: wp-deploy

spec:
  ports:
  - name: http80
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30088
  selector:
    app: wp-deploy
  type: NodePort
```

```
$ k apply -f wp-svc.yaml
service/wp-svc created

$ k get svc -owide
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE   SELECTOR
kubernetes   ClusterIP   10.96.0.1       <none>        443/TCP        13d   <none>
maria-svc    ClusterIP   10.98.233.175   <none>        3306/TCP       12m   app=maria-sts
wp-svc       NodePort    10.109.42.80    <none>        80:30088/TCP   18s   app=wp-deploy

$ k describe svc wp-svc
Name:                     wp-svc
Namespace:                default
Labels:                   app=wp-deploy
Annotations:              <none>
Selector:                 app=wp-deploy
Type:                     NodePort
IP Family Policy:         SingleStack
IP Families:              IPv4
IP:                       10.109.42.80
IPs:                      10.109.42.80
Port:                     http80  80/TCP
TargetPort:               80/TCP
NodePort:                 http80  30088/TCP
Endpoints:                10.10.151.130:80,10.10.47.196:80
Session Affinity:         None
External Traffic Policy:  Cluster
Events:                   <none>

$ k get no -owide
NAME         STATUS   ROLES                  AGE   VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
mac-master   Ready    control-plane,master   13d   v1.23.3   192.168.191.144   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://24.0.2
mac-worker   Ready    <none>                 13d   v1.23.3   192.168.191.146   <none>        Ubuntu 22.04.2 LTS   5.15.0-75-generic   docker://20.10.24
```

![image-20230701091648942](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230701091648942.png)

> IngressClass

```yaml wp-ink.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: wp-ink

spec:
  controller: nginx.org/ingress-controller
```

```
$ k apply -f  wp-ink.yaml
ingressclass.networking.k8s.io/wp-ink created

$ k get ingressclasses.networking.k8s.io -owide
NAME     CONTROLLER                     PARAMETERS   AGE
wp-ink   nginx.org/ingress-controller   <none>       33s
```

> Ingress

```yaml wp-ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wp-ing

spec:
  ingressClassName: wp-ink
  rules:
  - host: wp.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wp-svc
            port:
              number: 80
```

```
$ k apply -f wp-ing.yaml
ingress.networking.k8s.io/wp-ing created

$ k get ingress -owide
NAME     CLASS    HOSTS     ADDRESS   PORTS   AGE
wp-ing   wp-ink   wp.test             80      41s
```

> IngressController

```yaml wp-ing-ctl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-ing-ctl
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: wp-ing-ctl
  template:
    metadata:
      labels:
        app: wp-ing-ctl
    spec:
      serviceAccountName: nginx-ingress
      hostNetwork: true
      containers:
      - name: ctl
        image: nginx/nginx-ingress:2.2-alpine
        args:
        - -ingress-class=wp-ink
```

```
$ k apply -f  wp-ing-ctl.yaml
deployment.apps/wp-ing-ctl created

$ k get po -n nginx-ingress -owide
NAME                         READY   STATUS    RESTARTS   AGE   IP                NODE         NOMINATED NODE   READINESS GATES
wp-ing-ctl-56cf95f74-2t7t8   1/1     Running   0          10s   192.168.191.144   mac-master   <none>           <none>

$ ping wp.test -c1
PING wp.test (192.168.191.144): 56 data bytes
64 bytes from 192.168.191.144: icmp_seq=0 ttl=64 time=1.208 ms

--- wp.test ping statistics ---
1 packets transmitted, 1 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 1.208/1.208/1.208/nan ms
```

![image-20230701093305560](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230701093305560.png)

# Dashboard

> https://raw.githubusercontent.com/kubernetes/dashboard/v2.6.0/aio/deploy/recommended.yaml

```
$ k apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.6.0/aio/deploy/recommended.yaml

$ k get po -n kubernetes-dashboard -owide
NAME                                         READY   STATUS    RESTARTS   AGE   IP             NODE         NOMINATED NODE   READINESS GATES
dashboard-metrics-scraper-6f669b9c9b-q8g5c   1/1     Running   0          71s   10.10.47.197   mac-master   <none>           <none>
kubernetes-dashboard-67b9478795-gbjpf        1/1     Running   0          71s   10.10.47.198   mac-master   <none>           <none>

$ k get svc -n kubernetes-dashboard -owide
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE   SELECTOR
dashboard-metrics-scraper   ClusterIP   10.103.69.73     <none>        8000/TCP   25m   k8s-app=dashboard-metrics-scraper
kubernetes-dashboard        ClusterIP   10.101.237.165   <none>        443/TCP    25m   k8s-app=kubernetes-dashboard
```

> 生成证书

```
$ openssl req -x509 -days 365 -out k8s.test.crt -keyout k8s.test.key \
  -newkey rsa:2048 -nodes -sha256 \
    -subj '/CN=k8s.test' -extensions EXT -config <( \
       printf "[dn]\nCN=k8s.test\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:k8s.test\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
       
$ ls
k8s.test.crt  k8s.test.key
```

> 将生成的`证书`和`私钥`通过 Kubernetes 的 `Secret` 来存储

```
$ k create secret tls dash-tls -n kubernetes-dashboard --cert=k8s.test.crt --key=k8s.test.key --dry-run=client -oyaml
apiVersion: v1
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURERENDQWZTZ0F3SUJBZ0lVQTFzSE9YbnczdnAyMmhCWGllUFNaQTNac1dFd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0V6RVJNQThHQTFVRUF3d0lhemh6TG5SbGMzUXdIaGNOTWpNd056QXhNREUxTVRRNFdoY05NalF3TmpNdwpNREUxTVRRNFdqQVRNUkV3RHdZRFZRUUREQWhyT0hNdWRHVnpkRENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFECmdnRVBBRENDQVFvQ2dnRUJBTUtyMnVnWE4vc1VxUlRVSGM3UCtEYVVPSGU3TkUrTXU4d0JuVGZUcG8xdjg1WEkKSis4b3FIRFpXMkxSVzhRUWZMMG5za2pTTWlIU0U4VnhHdnNJb1U5RGg0aUZ2S3ZJeUZYVVFxdWtVQ3QxWVo2QQpDRk9UTnVnZkcwOGIxVmExT2tiNHFkNEF3TmlwT2ZUbEV3SlRMdEtraEI2RnFHWW5mbkJVbzl6VXVXYTlZWDZWClIzYm5lUWMrVjRibnJDRGwxTWtCWjdXK2JqeStvamwzeDNJMiswWlBlZUFRU2lNT1pYdXdTeWt2TlI3Q2xwd0kKdVlMOFk2MnRtaFhDYkdoUjBxQmJ3Y3NuWVBYZDl3SFM1NkZEVFlRa0ljTEt6NDJGSEhod29USU9MbWVKNDZtTgpNOVVDY2VBZVQyK0Q3S3B4UlRRcmRjZUltMUlEcmZkY0I4R0x2ekVDQXdFQUFhTllNRll3RXdZRFZSMFJCQXd3CkNvSUlhemh6TG5SbGMzUXdDd1lEVlIwUEJBUURBZ2VBTUJNR0ExVWRKUVFNTUFvR0NDc0dBUVVGQndNQk1CMEcKQTFVZERnUVdCQlRxZDlicGJtVS9GbnhpRzFTTC9SV214M0gzampBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQQpZcitoNkFYQVJUVzJ5U3JjSDh3Z2V0bTBhcmVVYUdqV3hSbUJETmpadndVQWJoMitSZFVjdm5CV3RLTStjU2NiCnZjVSswYkR0TkgxNzFyblZYYVFyNjJmYzRQb0xPazdLcDhKbjhsM1pGcjZLVGk4ZjFRdk05eHB1a2hPT04yRlkKOXVzTVFOb0hCTjhmWTZ5Zy9haEt1Q3ZKL1ZuS2tKcUZyRThjYzliRjBWTm0rWXlXWFNqQ2dRalcvdC9oZENRVAovRGovM2ZPUE5jUTBpTCtHcDBzbDNwN1lUUmF4YUwrVXM4Q09tOE5MQitzbVluTWFGZ29vdkZNU0ZoVUZHenlkCldTTVltVVZYelhOWEpXNEZKTm9SWWdydjZCZUptbHZ5QWxLWW5VZ1VRWUQwU2E4MXNaZDZ2aG9KOFQ1eGFxeGkKV2hpcnd3d1RiK0ppTDN0bVdnaWsyQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
  tls.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRENxOXJvRnpmN0ZLa1UKMUIzT3ovZzJsRGgzdXpSUGpMdk1BWjAzMDZhTmIvT1Z5Q2Z2S0todzJWdGkwVnZFRUh5OUo3SkkwakloMGhQRgpjUnI3Q0tGUFE0ZUloYnlyeU1oVjFFS3JwRkFyZFdHZWdBaFRremJvSHh0UEc5Vld0VHBHK0tuZUFNRFlxVG4wCjVSTUNVeTdTcElRZWhhaG1KMzV3VktQYzFMbG12V0YrbFVkMjUza0hQbGVHNTZ3ZzVkVEpBV2Uxdm00OHZxSTUKZDhkeU52dEdUM25nRUVvakRtVjdzRXNwTHpVZXdwYWNDTG1DL0dPdHJab1Z3bXhvVWRLZ1c4SExKMkQxM2ZjQgowdWVoUTAyRUpDSEN5cytOaFJ4NGNLRXlEaTVuaWVPcGpUUFZBbkhnSGs5dmcreXFjVVUwSzNYSGlKdFNBNjMzClhBZkJpNzh4QWdNQkFBRUNnZ0VBT1VWVzV2M2h0Y2ZMd0hsdzlZV0FtQW4rSE5kaDJkOWs1bTA1SkJIcngyTisKclh1UHFBLzFraEdZRFpmYkgvRGJ5Y2hTYnBNTU5aLzR1aGIrNFlpVjhGeEZGTmlIZTZCYnM4aDQvc2NkNE5NdApMM1NxUG5BcWNKcXFMWmxhSjZLMGJPbStDN1o4QmFHdmo4a08wUm5JeGlhcFNkTjNpZW9uakFPU202YW5qcjQzCjNPRjdWSCs4OExya2V1YkxOd1I2b0pPczBsdXFyZGprdFg0NXIrZ2szM1h0Y21Ob3NXTXpPdjNZdW5rUVhvTGcKa2RjdzJyeWZXYTBIUVZjWEJnbXJGbTllbmE4ckNSUGplWnMzYk5OM09VZUtOdHlQNEMyTURoOW51ZC9BTVJHNApaVFovOHVOOW5ZT3hWcHdhOVN4QmlGcmIvMUg1YjRLVzNvU29wbGNLY3dLQmdRRFVvcWRPZEtubi9BUitiNmNTCkI5NUliMGNqWldVd2dzUGNtcldFb0dhWkxmUWNoWmdieVBVWDBiYUZzZ3FlNlEwb0tBY3hIOE5SUjZqRHBLbzgKeXRRYTFtZmVJVlA3dFJUdDFYNThIeVdvVDhzK0JEN1EvblNWVm52Y0ZJaVU3d25rT0FkeHFVZi9GQlFXeStDKwp4S09TTGVQVmJ4VzRweVlQSXJ6STZSYnd6d0tCZ1FEcVgxUFE4MGFSMCtGWHk3RXg2c1l2NEtHY2tEdjJuOWtoCjJ0NGc0VSt2aXRpZ20zSVVNcGxsNkF3M3ZmU1l3OGJGWVE0b1FHcDAvT05Sc1lVTzJkSitnRU1oTmhaVStsLzIKVzlrVlZEcktCU3NPSW5OeWpLRVBEQlRxenBFSmpuWmc3Yzg0dmVqWTRDb3V1dVRjN1VHT3R4ejNtT2ZUTm1NVwowQStRenY1UC93S0JnQURJTEZkVWhIOXU1TkZXTmNZU00xWU8yck1kbjFhalZIY09OcGFyUkZWUjN2RHY2TlJKClUrVm5od1ZNMTA4b1NqMFlrSlkwcUxJMjBqOE43dlpVUkoxb3BtOGhyajVodHhiOHp2OUQyZzZaWklUdzNRNUYKc1VZUFVGdEoxQXJBS2tnbGtKbHhadXRnTm9heTd6dWtXM21oSTVKWVd6c1hta001L0htOHFiSHZBb0dBZks0Wgp1SjZ5ZkFGcmIzazgyb0U2elYyQ20vZGU3dVE2Ym5nd2t1MUpwdWtHTk9wODFhSFZXUkVJN3Q1dXNKWDF1Q3JaCmpUQTNjZVRXU1M5V3lYKzNLdlN3d1lvMGR5QjZ6R1F3SjlpWExjRnlGaUxkcDZLSVM2anh0N2dNRURscFlFY2kKWmQwaGNiNU9zbTFhTXUxRVl0ZW00VkRHZ3VYNzhMYmVrUHFNNzZFQ2dZRUF0TWhVYmo3eG5nV0pCNGRBWUpCdgpnSFdDOS8zVGhEanYvaC8wb2ZJRGJDVnU0L2hyK0pIWkRPUGs0M1pVejh1eE01K1ZGc0lwcnJGZDJuRjhWUmExClkwSzZpVFZDbDYyM1BROUJuVi8vdkJJKzlaWEt2MVRqQlFjOHg4U1JudVpBQ1BpbVp1d0JvQmprMjMwcEdRRFcKOVRCT1U5L2JWOXU5ZWJ3TUMvVzN3RXM9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K
kind: Secret
metadata:
  creationTimestamp: null
  name: dash-tls
  namespace: kubernetes-dashboard
type: kubernetes.io/tls
```

```yaml cert.yml
apiVersion: v1
kind: Secret
metadata:
  name: dash-tls
  namespace: kubernetes-dashboard
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURERENDQWZTZ0F3SUJBZ0lVQTFzSE9YbnczdnAyMmhCWGllUFNaQTNac1dFd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0V6RVJNQThHQTFVRUF3d0lhemh6TG5SbGMzUXdIaGNOTWpNd056QXhNREUxTVRRNFdoY05NalF3TmpNdwpNREUxTVRRNFdqQVRNUkV3RHdZRFZRUUREQWhyT0hNdWRHVnpkRENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFECmdnRVBBRENDQVFvQ2dnRUJBTUtyMnVnWE4vc1VxUlRVSGM3UCtEYVVPSGU3TkUrTXU4d0JuVGZUcG8xdjg1WEkKSis4b3FIRFpXMkxSVzhRUWZMMG5za2pTTWlIU0U4VnhHdnNJb1U5RGg0aUZ2S3ZJeUZYVVFxdWtVQ3QxWVo2QQpDRk9UTnVnZkcwOGIxVmExT2tiNHFkNEF3TmlwT2ZUbEV3SlRMdEtraEI2RnFHWW5mbkJVbzl6VXVXYTlZWDZWClIzYm5lUWMrVjRibnJDRGwxTWtCWjdXK2JqeStvamwzeDNJMiswWlBlZUFRU2lNT1pYdXdTeWt2TlI3Q2xwd0kKdVlMOFk2MnRtaFhDYkdoUjBxQmJ3Y3NuWVBYZDl3SFM1NkZEVFlRa0ljTEt6NDJGSEhod29USU9MbWVKNDZtTgpNOVVDY2VBZVQyK0Q3S3B4UlRRcmRjZUltMUlEcmZkY0I4R0x2ekVDQXdFQUFhTllNRll3RXdZRFZSMFJCQXd3CkNvSUlhemh6TG5SbGMzUXdDd1lEVlIwUEJBUURBZ2VBTUJNR0ExVWRKUVFNTUFvR0NDc0dBUVVGQndNQk1CMEcKQTFVZERnUVdCQlRxZDlicGJtVS9GbnhpRzFTTC9SV214M0gzampBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQQpZcitoNkFYQVJUVzJ5U3JjSDh3Z2V0bTBhcmVVYUdqV3hSbUJETmpadndVQWJoMitSZFVjdm5CV3RLTStjU2NiCnZjVSswYkR0TkgxNzFyblZYYVFyNjJmYzRQb0xPazdLcDhKbjhsM1pGcjZLVGk4ZjFRdk05eHB1a2hPT04yRlkKOXVzTVFOb0hCTjhmWTZ5Zy9haEt1Q3ZKL1ZuS2tKcUZyRThjYzliRjBWTm0rWXlXWFNqQ2dRalcvdC9oZENRVAovRGovM2ZPUE5jUTBpTCtHcDBzbDNwN1lUUmF4YUwrVXM4Q09tOE5MQitzbVluTWFGZ29vdkZNU0ZoVUZHenlkCldTTVltVVZYelhOWEpXNEZKTm9SWWdydjZCZUptbHZ5QWxLWW5VZ1VRWUQwU2E4MXNaZDZ2aG9KOFQ1eGFxeGkKV2hpcnd3d1RiK0ppTDN0bVdnaWsyQT09Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
  tls.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRENxOXJvRnpmN0ZLa1UKMUIzT3ovZzJsRGgzdXpSUGpMdk1BWjAzMDZhTmIvT1Z5Q2Z2S0todzJWdGkwVnZFRUh5OUo3SkkwakloMGhQRgpjUnI3Q0tGUFE0ZUloYnlyeU1oVjFFS3JwRkFyZFdHZWdBaFRremJvSHh0UEc5Vld0VHBHK0tuZUFNRFlxVG4wCjVSTUNVeTdTcElRZWhhaG1KMzV3VktQYzFMbG12V0YrbFVkMjUza0hQbGVHNTZ3ZzVkVEpBV2Uxdm00OHZxSTUKZDhkeU52dEdUM25nRUVvakRtVjdzRXNwTHpVZXdwYWNDTG1DL0dPdHJab1Z3bXhvVWRLZ1c4SExKMkQxM2ZjQgowdWVoUTAyRUpDSEN5cytOaFJ4NGNLRXlEaTVuaWVPcGpUUFZBbkhnSGs5dmcreXFjVVUwSzNYSGlKdFNBNjMzClhBZkJpNzh4QWdNQkFBRUNnZ0VBT1VWVzV2M2h0Y2ZMd0hsdzlZV0FtQW4rSE5kaDJkOWs1bTA1SkJIcngyTisKclh1UHFBLzFraEdZRFpmYkgvRGJ5Y2hTYnBNTU5aLzR1aGIrNFlpVjhGeEZGTmlIZTZCYnM4aDQvc2NkNE5NdApMM1NxUG5BcWNKcXFMWmxhSjZLMGJPbStDN1o4QmFHdmo4a08wUm5JeGlhcFNkTjNpZW9uakFPU202YW5qcjQzCjNPRjdWSCs4OExya2V1YkxOd1I2b0pPczBsdXFyZGprdFg0NXIrZ2szM1h0Y21Ob3NXTXpPdjNZdW5rUVhvTGcKa2RjdzJyeWZXYTBIUVZjWEJnbXJGbTllbmE4ckNSUGplWnMzYk5OM09VZUtOdHlQNEMyTURoOW51ZC9BTVJHNApaVFovOHVOOW5ZT3hWcHdhOVN4QmlGcmIvMUg1YjRLVzNvU29wbGNLY3dLQmdRRFVvcWRPZEtubi9BUitiNmNTCkI5NUliMGNqWldVd2dzUGNtcldFb0dhWkxmUWNoWmdieVBVWDBiYUZzZ3FlNlEwb0tBY3hIOE5SUjZqRHBLbzgKeXRRYTFtZmVJVlA3dFJUdDFYNThIeVdvVDhzK0JEN1EvblNWVm52Y0ZJaVU3d25rT0FkeHFVZi9GQlFXeStDKwp4S09TTGVQVmJ4VzRweVlQSXJ6STZSYnd6d0tCZ1FEcVgxUFE4MGFSMCtGWHk3RXg2c1l2NEtHY2tEdjJuOWtoCjJ0NGc0VSt2aXRpZ20zSVVNcGxsNkF3M3ZmU1l3OGJGWVE0b1FHcDAvT05Sc1lVTzJkSitnRU1oTmhaVStsLzIKVzlrVlZEcktCU3NPSW5OeWpLRVBEQlRxenBFSmpuWmc3Yzg0dmVqWTRDb3V1dVRjN1VHT3R4ejNtT2ZUTm1NVwowQStRenY1UC93S0JnQURJTEZkVWhIOXU1TkZXTmNZU00xWU8yck1kbjFhalZIY09OcGFyUkZWUjN2RHY2TlJKClUrVm5od1ZNMTA4b1NqMFlrSlkwcUxJMjBqOE43dlpVUkoxb3BtOGhyajVodHhiOHp2OUQyZzZaWklUdzNRNUYKc1VZUFVGdEoxQXJBS2tnbGtKbHhadXRnTm9heTd6dWtXM21oSTVKWVd6c1hta001L0htOHFiSHZBb0dBZks0Wgp1SjZ5ZkFGcmIzazgyb0U2elYyQ20vZGU3dVE2Ym5nd2t1MUpwdWtHTk9wODFhSFZXUkVJN3Q1dXNKWDF1Q3JaCmpUQTNjZVRXU1M5V3lYKzNLdlN3d1lvMGR5QjZ6R1F3SjlpWExjRnlGaUxkcDZLSVM2anh0N2dNRURscFlFY2kKWmQwaGNiNU9zbTFhTXUxRVl0ZW00VkRHZ3VYNzhMYmVrUHFNNzZFQ2dZRUF0TWhVYmo3eG5nV0pCNGRBWUpCdgpnSFdDOS8zVGhEanYvaC8wb2ZJRGJDVnU0L2hyK0pIWkRPUGs0M1pVejh1eE01K1ZGc0lwcnJGZDJuRjhWUmExClkwSzZpVFZDbDYyM1BROUJuVi8vdkJJKzlaWEt2MVRqQlFjOHg4U1JudVpBQ1BpbVp1d0JvQmprMjMwcEdRRFcKOVRCT1U5L2JWOXU5ZWJ3TUMvVzN3RXM9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K
```

```
$ k apply -f cert.yml
secret/dash-tls created

$ k describe secrets -n kubernetes-dashboard dash-tls
Name:         dash-tls
Namespace:    kubernetes-dashboard
Labels:       <none>
Annotations:  <none>

Type:  kubernetes.io/tls

Data
====
tls.crt:  1119 bytes
tls.key:  1704 bytes
```

> IngressClass

```yaml dash-ink.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: dash-ink
  namespace: kubernetes-dashboard

spec:
  controller: nginx.org/ingress-controller
```

```
$ k apply -f dash-ink.yaml
ingressclass.networking.k8s.io/dash-ink created

$ k get ingressclasses.networking.k8s.io
NAME       CONTROLLER                     PARAMETERS   AGE
dash-ink   nginx.org/ingress-controller   <none>       52s
wp-ink     nginx.org/ingress-controller   <none>       48m
```

> Ingress

```
$ k create ingress dash-ing --rule='k8s.test/=kubernetes-dashboard:443' --class=dash-ink -n kubernetes-dashboard --dry-run=client -oyaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  creationTimestamp: null
  name: dash-ing
  namespace: kubernetes-dashboard
spec:
  ingressClassName: dash-ink
  rules:
  - host: k8s.test
    http:
      paths:
      - backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
        path: /
        pathType: Exact
status:
  loadBalancer: {}
```

> `nginx.org/ssl-services` 指定后端服务为 `HTTPS` 服务；`tls` 指定`域名`和`证书`

```yaml dash-ing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dash-ing
  namespace: kubernetes-dashboard
  annotations:
    nginx.org/ssl-services: "kubernetes-dashboard"

spec:
  ingressClassName: dash-ink

  tls:
  - hosts:
    - k8s.test
    secretName: dash-tls

  rules:
  - host: k8s.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

```
$ k apply -f dash-ing.yaml
ingress.networking.k8s.io/dash-ing created

$ k get ingress -A -owide
NAMESPACE              NAME       CLASS      HOSTS      ADDRESS   PORTS     AGE
default                wp-ing     wp-ink     wp.test              80        56m
kubernetes-dashboard   dash-ing   dash-ink   k8s.test             80, 443   58s

$ k get po -n kubernetes-dashboard -owide
NAME                                         READY   STATUS    RESTARTS   AGE   IP             NODE         NOMINATED NODE   READINESS GATES
dashboard-metrics-scraper-6f669b9c9b-q8g5c   1/1     Running   0          40m   10.10.47.197   mac-master   <none>           <none>
kubernetes-dashboard-67b9478795-gbjpf        1/1     Running   0          40m   10.10.47.198   mac-master   <none>           <none>

$ k describe ingress -n kubernetes-dashboard dash-ing
Name:             dash-ing
Labels:           <none>
Namespace:        kubernetes-dashboard
Address:
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
TLS:
  dash-tls terminates k8s.test
Rules:
  Host        Path  Backends
  ----        ----  --------
  k8s.test
              /   kubernetes-dashboard:443 (10.10.47.198:8443)
Annotations:  nginx.org/ssl-services: kubernetes-dashboard
Events:       <none>
```

> IngressController

```yaml dash-ing-ctl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dash-ing-ctl
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: dash-ing-ctl
  template:
    metadata:
      labels:
        app: dash-ing-ctl
    spec:
      serviceAccountName: nginx-ingress
      hostNetwork: true
      containers:
      - name: ctl
        image: nginx/nginx-ingress:2.2-alpine
        args:
        - -ingress-class=dash-ink
```

```
$ k apply -f dash-ing-ctl.yaml
deployment.apps/dash-ing-ctl created

$ k get po -n nginx-ingress -owide
NAME                           READY   STATUS    RESTARTS   AGE   IP                NODE         NOMINATED NODE   READINESS GATES
dash-ing-ctl-866f76866-4zqmz   1/1     Running   0          32s   192.168.191.146   mac-worker   <none>           <none>
wp-ing-ctl-56cf95f74-2t7t8     1/1     Running   0          52m   192.168.191.144   mac-master   <none>           <none>

$ ping k8s.test -c1
PING k8s.test (192.168.191.146): 56 data bytes
64 bytes from 192.168.191.146: icmp_seq=0 ttl=64 time=0.663 ms

--- k8s.test ping statistics ---
1 packets transmitted, 1 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.663/0.663/0.663/nan ms
```

![image-20230701102503818](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230701102503818.png)

> 使用 Kubernetes 的 `RBAC` 机制，创建用户

```
$ k get clusterrole cluster-admin -owide
NAME            CREATED AT
cluster-admin   2022-06-17T08:56:07Z
```

```yaml dash-user.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard

---

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
```

```
$ k apply -f dash-user.yaml
serviceaccount/admin-user created
clusterrolebinding.rbac.authorization.k8s.io/admin-user created

$ k get sa -n kubernetes-dashboard -owide
NAME                   SECRETS   AGE
admin-user             1         22s
default                1         62m
kubernetes-dashboard   1         62m

$ k get secrets -n kubernetes-dashboard
NAME                               TYPE                                  DATA   AGE
admin-user-token-q8qtg             kubernetes.io/service-account-token   3      2m
dash-tls                           kubernetes.io/tls                     2      45m
default-token-dtw5t                kubernetes.io/service-account-token   3      64m
kubernetes-dashboard-certs         Opaque                                0      64m
kubernetes-dashboard-csrf          Opaque                                1      64m
kubernetes-dashboard-key-holder    Opaque                                2      64m
kubernetes-dashboard-token-p8v56   kubernetes.io/service-account-token   3      64m

$ k describe secrets -n kubernetes-dashboard admin-user-token-q8qtg
Name:         admin-user-token-q8qtg
Namespace:    kubernetes-dashboard
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: admin-user
              kubernetes.io/service-account.uid: ec5b1f8c-376c-4318-a932-1886da05bcc4

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1099 bytes
namespace:  20 bytes
token:      eyJhbGciOiJSUzI1NiIsImtpZCI6ImF6ZmJqN1NjSHZhTV8yUlNKZzJQaE5XSkdfUVNsZGs3MmxlWm9NazFERXMifQ.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlcm5ldGVzLWRhc2hib2FyZCIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJhZG1pbi11c2VyLXRva2VuLXE4cXRnIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQubmFtZSI6ImFkbWluLXVzZXIiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC51aWQiOiJlYzViMWY4Yy0zNzZjLTQzMTgtYTkzMi0xODg2ZGEwNWJjYzQiLCJzdWIiOiJzeXN0ZW06c2VydmljZWFjY291bnQ6a3ViZXJuZXRlcy1kYXNoYm9hcmQ6YWRtaW4tdXNlciJ9.vXzym70dSHyPFR7gDEhQ1-A5rQvHKIOrO2YnBsnYCi1iG2nA6rYmAW3_ORXprBrISsyy0NJBHUAFKKygabi1duho3trXZAGuvXGS3uqYBlejGH1_6I5RHLzQC32PGJaA5UrHgohD3u20iBsXuZCoyvkuvdmDdAMut897hs2XtLOFO6F_r2qZi4T_CJ8_6o9MdFoduZqrfnz-yLG6ZN8W1xi8EuJkQUKrP1vg7KiQWjHudfGBWEBsV0-EdNUZfcpPPXC1oX926cXv8ChbnA6OfjmiZMBTSBVrwUdNdk_AE7FFdVJ828relFRBBvr0iyX0l658x2M0p1W0OsQrcpXohg
```

![image-20230701105557088](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/k8s/image-20230701105557088.png)
