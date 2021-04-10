---
title: Redis -- 分布式锁
mathjax: false
date: 2019-10-02 09:57:23
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 方案
### setnx + del
```bash
> setnx lock:user true
OK
# 执行业务逻辑
> del lock:user
(integer) 1
```
存在的问题：如果逻辑执行过程中出现异常，可能会导致**del**指令没有被调用，陷入**死锁**，锁永远不会被释放

<!-- more -->

### setnx + expire + del
```bash
> setnx lock:user true
OK
> expire lock:user 10
(integer) 1
# 执行业务逻辑
> del lock:user
(integer) 1
```
存在的问题：如果**setnx**和**expire**之间的服务器进程突然挂掉，会导致**expire**无法执行，也会造成**死锁**
问题根源：**setnx**和**expire**是两条独立的指令，而**不是原子指令**

### set扩展参数
```bash
> set lock:user true ex 5 nx # setnx和expire是组合在一起的原子指令
OK
# 执行业务逻辑
> del lock:user
(integer) 1
```

## 超时问题
Redis的分布式锁**不能解决超时问题**，因此Redis分布式锁**不要用于较长时间的任务**

### Lua脚本
Lua脚本可以保证**连续多个指令**的**原子性**执行，但该方案并不完美，只是**相对安全一点**
```python
tag = random.nextint()  # 随机数
if redis.set(key, tag, nx=True, ex=5):
    do_something()
    # 释放锁时先匹配随机数是否一致，然后再删除Key
    # 这样可以确保当前线程占有的锁不会被其它线程释放，除非这个锁是过期了被服务器自动释放
    # 如果真的超时，当前线程的逻辑没有执行完成，其它线程也会趁虚而入
    redis.delifequals(key, tag)

# delifequals
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end
```

## 可重入性
Redis分布式锁如果要支持可重入，需要对客户端的**set**方法进行**包装**，使用线程的**ThreadLocal**变量存储当前持有锁的计数
**不推荐使用可重入锁**，因为**加重了客户端的复杂性**，可以通过在**业务层面**调整来避免使用可重入的Redis分布式锁
```java
public class RedisWithReentrantLock {
    private final ThreadLocal<Map<String, Integer>> lockers = new ThreadLocal<>();
    private Jedis jedis;

    public RedisWithReentrantLock(Jedis jedis) {
        this.jedis = jedis;
    }

    private boolean doLock(String key) {
        // TODO 可以进一步细化考虑过期时间，代码复杂度将进一步提升
        return jedis.set(key, "", "nx", "ex", 5L) != null;
    }

    private void doUnlock(String key) {
        jedis.del(key);
    }

    private Map<String, Integer> currentLockers() {
        Map<String, Integer> refs = lockers.get();
        if (refs != null) {
            return refs;
        }
        lockers.set(Maps.<String, Integer>newHashMap());
        return lockers.get();
    }

    public boolean lock(String key) {
        Map<String, Integer> refs = currentLockers();
        Integer refCnt = refs.get(key);
        if (refCnt != null) {
            refs.put(key, refCnt + 1);
            return true;
        }
        boolean ok = this.doLock(key);
        if (!ok) {
            return false;
        }
        refs.put(key, 1);
        return true;
    }

    public boolean unlock(String key) {
        Map<String, Integer> refs = currentLockers();
        Integer refCnt = refs.get(key);
        if (refCnt == null) {
            return false;
        }
        refCnt -= 1;
        if (refCnt > 0) {
            refs.put(key, refCnt);
        } else {
            refs.remove(key);
            this.doUnlock(key);
        }
        return true;
    }

    public static void main(String[] args) {
        String lockName = "zhongmingmao";
        RedisWithReentrantLock redis = new RedisWithReentrantLock(new Jedis("localhost", 16379));
        System.out.println(redis.lock(lockName));
        System.out.println(redis.lock(lockName));
        System.out.println(redis.unlock(lockName));
        System.out.println(redis.unlock(lockName));
    }
}
```
