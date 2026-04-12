---
title: Authorization - Casbin Use Cases
mathjax: true
date: 2026-04-12 21:22:37
cover: https://cn-security-1253868755.cos.ap-guangzhou.myqcloud.com/iam/authorization/rbac/casbin/image-20260412212722917.png
categories:
  - Security
  - IAM
  - Authorization
  - RBAC
tags:
  - Security
  - IAM
  - Authorization
  - RBAC
  - Casbin
---

# Data Permissions（数据权限）

## Implicit Roles & Permissions（隐式角色与权限）

> RBAC 中权限有两种获取方式：

| 方式     | 说明                         | 对应 API                                                    |
| -------- | ---------------------------- | ----------------------------------------------------------- |
| 直接赋予 | 直接把角色/权限分配给用户    | GetRolesForUser() / GetPermissionsForUser()                 |
| 隐式继承 | 通过**角色继承链**传递下来的 | GetImplicitRolesForUser() / GetImplicitPermissionsForUser() |

<!-- more -->

> 示例：

```
g, alice, admin
g, admin, superuser
```

1. `GetRolesForUser(alice)` → 只返回 `[admin]`（直接分配）
2. `GetImplicitRolesForUser(alice)` → 返回 `[admin, superuser]`（含**继承链**）

> 如果你要做数据过滤（比如"用户能看哪些数据行"），必须用**隐式版本**，否则**继承**来的权限会**被漏掉**

## BatchEnforce()（批量鉴权）

> 一次调用传入多个 `[subject, object, action]` 请求，返回 `[]bool`

```go
boolArray, err := e.BatchEnforce(requests)
```

> 适用场景：

1. **列表页过滤**：一次检查 N 行数据，哪些用户能看
2. **批量权限校验**：比如渲染一张数据表，每行都需要鉴权

# Menu Permissions（菜单权限）

> 这是 **jCasbin** 的一个具体应用场景：基于**角色**的**层级菜单可见性**控制

## Policy 文件的三类规则

| 前缀 | 含义                               | 示例                                  |
| ---- | ---------------------------------- | ------------------------------------- |
| p    | **角色**对**菜单**的**权限规则**   | p, ROLE_ROOT, SystemMenu, read, allow |
| g    | **用户→角色** / **角色→角色 继承** | g, ROLE_ADMIN, ROLE_USER              |
| g2   | **菜单父子层级关系**               | g2, UserSubMenu_allow, UserMenu       |

## 核心继承规则（最重要）

> <u>菜单父子继承</u>：

1. **父允许 → 子默认允许**（除非**子有显式 deny**）
2. **子有 allow → 父被推导为 allow**（让用户能**导航**到子菜单）

> **角色继承**中的 **deny**：

1. **显式 deny** 会沿**继承链**传递，**不被覆盖**
2. **隐式 deny（没有 allow 规则）**可以**被更高权限角色的 allow 覆盖**

## 结合示例表格理解

| 菜单              | ROOT | ADMIN | USER |
| ----------------- | ---- | ----- | ---- |
| SystemMenu        | ✅    | ❌     | ❌    |
| UserMenu          | ❌    | ✅     | ❌    |
| UserSubMenu_allow | ❌    | ✅     | ✅    |
| AdminSubMenu_deny | ✅    | ❌     | ❌    |

## 关键推导

1. **ROLE_ADMIN 继承 ROLE_USER**，所以 **ADMIN** 也有 **UserSubMenu_allow** 的权限
2. **ROOT** 对 **UserMenu** 是**显式 deny**，虽然**权限最高**，但 **deny 不被继承链覆盖**
3. **AdminSubMenu_deny** 对 **ADMIN** 是**显式 deny**，**ROOT 没有此规则**所以**默认继承父菜单 AdminMenu 的 allow**

## 代码层面

> MenuService 提供两个方法

1. **findAccessibleMenus**(user) - 返回用户能看到的所有菜单
2. **checkMenuAccess**(user, menu) - 检查用户对某个菜单的访问权

> 两者底层都走 jCasbin Enforcer 的 enforce() 逻辑

## 核心思路

1. 菜单权限要解决一个问题：**不同角色的用户**，登录后**看到的菜单不一样**
2. Casbin 用三张"表"来描述这件事

```
谁能看哪个菜单    →  p 规则
谁是什么角色      →  g 规则
菜单的父子关系    →  g2 规则
```

## 先看菜单结构（g2）

```
SystemMenu          ← 顶级菜单（无父）

UserMenu            ← 顶级菜单
  ├── UserSubMenu_allow
  │     └── UserSubSubMenu
  └── UserSubMenu_deny

AdminMenu           ← 顶级菜单
  ├── AdminSubMenu_allow
  └── AdminSubMenu_deny
```

## 再看角色继承（g）

> 权限从低到高：ROLE_USER < ROLE_ADMIN < ROLE_ROOT

```
root  →  ROLE_ROOT
admin →  ROLE_ADMIN  →  ROLE_USER（ADMIN 继承 USER 的权限）
user  →  ROLE_USER
```

## 最后看权限规则（p）

> 只列出**显式定义的规则**，没写的就是"没有明确 allow"：

```
ROLE_ROOT:   SystemMenu=allow,  AdminMenu=allow,  UserMenu=deny
ROLE_ADMIN:  UserMenu=allow,    AdminMenu=allow,  AdminSubMenu_deny=deny
ROLE_USER:   UserSubMenu_allow=allow
```

## 逐行推导结果表

### ROLE_USER（最简单）

| 菜单              | 规则                                 | 结论                    |
| ----------------- | ------------------------------------ | ----------------------- |
| UserSubMenu_allow | 直接 allow                           | ✅                       |
| UserMenu          | 子菜单有 allow → 父推导为 allow      | ✅（否则用户根本进不去） |
| UserSubSubMenu    | 父 UserSubMenu_allow 是 allow → 继承 | ✅                       |
| 其余菜单          | 没有任何 allow 规则                  | ❌                       |

### ROLE_ADMIN（继承 ROLE_USER）

> 先继承 ROLE_USER 的所有权限，再叠加自己的规则

| 菜单               | 来源                                                | 结论 |
| ------------------ | --------------------------------------------------- | ---- |
| UserSubMenu_allow  | 继承自 ROLE_USER                                    | ✅    |
| UserSubSubMenu     | 继承自 ROLE_USER                                    | ✅    |
| UserMenu           | 直接 allow                                          | ✅    |
| UserSubMenu_deny   | 父 UserMenu 是 allow → 继承 allow，但没有 deny 规则 | ✅    |
| AdminMenu          | 直接 allow                                          | ✅    |
| AdminSubMenu_allow | 父 AdminMenu 是 allow → 继承                        | ✅    |
| AdminSubMenu_deny  | 显式 deny，优先级最高                               | ❌    |
| SystemMenu         | 没有任何 allow 规则                                 | ❌    |

### ROLE_ROOT（最高权限，但有显式 deny）

| 菜单               | 规则                                       | 结论 |
| ------------------ | ------------------------------------------ | ---- |
| SystemMenu         | 直接 allow                                 | ✅    |
| AdminMenu          | 直接 allow                                 | ✅    |
| AdminSubMenu_allow | 父 allow → 继承                            | ✅    |
| AdminSubMenu_deny  | 父 allow → 继承（ROOT 自己没有 deny 规则） | ✅    |
| UserMenu           | 显式 deny，权限再高也没用                  | ❌    |
| UserSubMenu_allow  | 父 deny → 子继承 deny                      | ❌    |
| UserSubSubMenu     | 祖先 deny → 继承 deny                      | ❌    |

## 两条最关键的规则

> 这两条规则组合起来，就实现了：**精细控制**每个**角色**能看到的**菜单树**，且 **deny 不会被继承或覆盖**

### 规则一：显式 deny > 一切

1. ROOT 权限最高，但 UserMenu=deny → 整棵子树都看不到
2. ADMIN 的 AdminSubMenu_deny=deny → 该菜单看不到

### 规则二：子有 allow → 父自动可见

1. ROLE_USER 只有 UserSubMenu_allow=allow
2. 但 UserMenu 作为父菜单，系统自动推导为可见
3. 否则用户连入口都找不到

## 职责

### Casbin 原生能力边界

1. Casbin 的 `enforce(user, menu, action)` 只回答一件事：<u>这个用户，对这个菜单，此次操作，是 allow 还是 deny？</u>
2. 它不会主动帮你
   - <u>遍历所有菜单，算出哪些可见</u>
   - <u>处理"子有 allow → 父自动可见"的推导</u>
   - <u>返回一棵过滤后的菜单树</u>

### 两条规则的实际归属

| 规则                    | 归属        | 说明                                        |
| ----------------------- | ----------- | ------------------------------------------- |
| 显式 deny > 一切        | Casbin 原生 | policy 中写了 deny，enforce 直接返回 false  |
| 子有 allow → 父自动可见 | 业务层处理  | Casbin 不知道菜单树结构，需要你自己遍历推导 |

### 业务层要做的事

1. 拿到**完整菜单列表**
2. 对每个菜单调用 enforce(user, menu, read)
3. 得到 [可见菜单] 集合
4. 遍历菜单树，把"有可见子孙"的父菜单补充进来
5. 返回最终可见菜单树

> 第 4 步就是"<u>子有 allow → 父自动可见</u>"，**完全是业务逻辑，Casbin 不参与**

### 所以 jCasbin 示例里的 MenuService

```go
findAccessibleMenus(user)   // 业务层：遍历 + 推导父菜单可见性
checkMenuAccess(user, menu) // 直接调用 enforce()，这个是 Casbin 原生
```

> findAccessibleMenus 之所以单独封装，正是因为它包含了 Casbin **无法自动完成**的**树形推导逻辑**

### 一句话总结

> **Casbin** 负责**判断单个节点的权限**，**菜单树的整体可见性推导**是**业务层的责任**







