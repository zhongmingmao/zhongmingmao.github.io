---
title: Security - OPA Gatekeeper
mathjax: false
date: 2022-12-25 00:06:25
cover: https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/opa-gatekeeper.png
categories:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
tags:
  - Cloud Native
  - Cloud Native Foundation
  - OPA
---

# Overview & Architecture

> In Kubernetes, *Admission Controllers* enforce policies on objects during *create*, *update*, and *delete* operations.
> *Admission control* is fundamental to *policy enforcement* in Kubernetes.

> For example, by deploying OPA as an admission controller you can

1. Require specific labels on all resources.
2. Require container images come from the corporate image registry.
3. Require all Pods specify resource requests and limits.
4. Prevent conflicting Ingress objects from being created.

<!-- more -->

> Admission controllers can also *mutate* incoming objects. By deploying OPA as a *mutating admission controller* you can:

1. *Inject sidecar containers* into Pods.
2. *Set specific annotations* on all resources.
3. *Rewrite container images* to point at the corporate image registry.
4. Include node and pod *(anti-)affinity* selectors on Deployments.

> These are just examples of policies you can enforce with *admission controllers* and *OPA*.
> There are dozens of other policies you will want to enforce in your Kubernetes clusters for *security*, *cost*, and *availability* reasons.

# What is OPA Gatekeeper?

> OPA Gatekeeper is a specialized project providing *first-class integration* between *OPA* and *Kubernetes*.

> OPA Gatekeeper adds the following on top of plain OPA:

1. An *extensible*, *parameterized* policy library.
2. Native Kubernetes *CRDs* for *instantiating* the *policy library* (aka “constraints”).
3. Native Kubernetes *CRDs* for *extending* the *policy library* (aka “constraint templates”).
4. *Audit* functionality.

> Recommendation

1. OPA Gatekeeper is **the go-to project** for using OPA for *Kubernetes admission control*.
2. *Plain OPA* and *Kube-mgmt* (see below) are *alternatives* that can be reached for if you want to use the *management features* of OPA
   - such as *status logs*, *decision logs*, and *bundles*.

# How Does It Work With Plain OPA and Kube-mgmt?

> Admission Control Flow

![image-20231016225135528](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231016225135528.png)

> The *Kubernetes API Server* is configured to *query OPA* for *admission control decisions* when objects (e.g., Pods, Services, etc.) are *created*, *updated*, or *deleted*.

1. The API Server sends the *entire Kubernetes object* in the *webhook request* to *OPA*.
2. OPA evaluates the policies it has loaded using the *admission review* as `input`.

> For example, the following policy denies objects that include container images referring to illegal registries:

```shell
package kubernetes.admission

deny[reason] {
  some container
  input_containers[container]
  not startswith(container.image, "hooli.com/")
  reason := "container image refers to illegal registry (must be hooli.com)"
}

input_containers[container] {
  container := input.request.object.spec.containers[_]
}

input_containers[container] {
  container := input.request.object.spec.template.spec.containers[_]
}
```

> The `input` document contains the following fields:

| Field                   | Desc                                                         |
| ----------------------- | ------------------------------------------------------------ |
| input.request.kind      | specifies the type of the object (e.g., `Pod`, `Service`, etc.) |
| input.request.operation | specifies the type of the operation, i.e., `CREATE`, `UPDATE`, `DELETE`, `CONNECT`. |
| input.request.userInfo  | specifies the identity of the caller.                        |
| input.request.object    | contains the entire Kubernetes object.                       |
| input.request.oldObject | specifies the previous version of the Kubernetes object on `UPDATE` and `DELETE`. |

```json
{
  "kind": "AdmissionReview",
  "apiVersion": "admission.k8s.io/v1",
  "request": {
    "kind": {
      "group": "",
      "version": "v1",
      "kind": "Pod"
    },
    "resource": {
      "group": "",
      "version": "v1",
      "resource": "pods"
    },
    "namespace": "opa-test",
    "operation": "CREATE",
    "userInfo": {
      "username": "system:serviceaccount:kube-system:replicaset-controller",
      "uid": "439dea65-3e4e-4fa8-b5f8-8fdc4bc7cf53",
      "groups": [
        "system:serviceaccounts",
        "system:serviceaccounts:kube-system",
        "system:authenticated"
      ]
    },
    "object": {
      "apiVersion": "v1",
      "kind": "Pod",
      "metadata": {
        "creationTimestamp": "2019-08-13T16:01:54Z",
        "generateName": "nginx-7bb7cd8db5-",
        "labels": {
          "pod-template-hash": "7bb7cd8db5",
          "run": "nginx"
        },
        "name": "nginx-7bb7cd8db5-dbplk",
        "namespace": "opa-test",
        "ownerReferences": [
          {
            "apiVersion": "apps/v1",
            "blockOwnerDeletion": true,
            "controller": true,
            "kind": "ReplicaSet",
            "name": "nginx-7bb7cd8db5",
            "uid": "7b6a307f-d9b4-4b65-a916-5d0b96305e87"
          }
        ],
        "uid": "266d2c8b-e43e-42d9-a19c-690bb6103900"
      },
      "spec": {
        "containers": [
          {
            "image": "nginx",
            "imagePullPolicy": "Always",
            "name": "nginx",
            "resources": {},
            "terminationMessagePath": "/dev/termination-log",
            "terminationMessagePolicy": "File",
            "volumeMounts": [
              {
                "mountPath": "/var/run/secrets/kubernetes.io/serviceaccount",
                "name": "default-token-6h4dn",
                "readOnly": true
              }
            ]
          }
        ],
        "dnsPolicy": "ClusterFirst",
        "enableServiceLinks": true,
        "priority": 0,
        "restartPolicy": "Always",
        "schedulerName": "default-scheduler",
        "securityContext": {},
        "serviceAccount": "default",
        "serviceAccountName": "default",
        "terminationGracePeriodSeconds": 30,
        "tolerations": [
          {
            "effect": "NoExecute",
            "key": "node.kubernetes.io/not-ready",
            "operator": "Exists",
            "tolerationSeconds": 300
          },
          {
            "effect": "NoExecute",
            "key": "node.kubernetes.io/unreachable",
            "operator": "Exists",
            "tolerationSeconds": 300
          }
        ],
        "volumes": [
          {
            "name": "default-token-6h4dn",
            "secret": {
              "secretName": "default-token-6h4dn"
            }
          }
        ]
      },
      "status": {
        "phase": "Pending",
        "qosClass": "BestEffort"
      }
    },
    "oldObject": null
  }
}
```

> The policies you give to OPA ultimately generate an *admission review response* that is sent back to the *API Server*.

```json
{
  "kind": "AdmissionReview",
  "apiVersion": "admission.k8s.io/v1",
  "response": {
    "allowed": false,
    "status": {
      "message": "container image refers to illegal registry (must be hooli.com)"
    }
  }
}
```

> The API Server implements a *deny overrides* conflict resolution strategy.
> If any *admission controller* denies the request, the request is *denied* (even if one of the later admission controllers were to allow the request.)

> Policy and Data Caching

![image-20231016231308687](https://cnf-1253868755.cos.ap-guangzhou.myqcloud.com/opa/image-20231016231308687.png)

1. Policies can be loaded into OPA dynamically via *ConfigMap* objects using the *kube-mgmt sidecar container*.
2. The *kube-mgmt sidecar container* can also load *any other Kubernetes object* into OPA as *JSON* under *data*.
   - This lets you enforce policies that rely on an *eventually consistent snapshot* of the Kubernetes cluster as context.

