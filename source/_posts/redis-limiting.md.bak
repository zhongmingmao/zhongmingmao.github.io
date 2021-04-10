---
title: Redis -- 限流
mathjax: false
date: 2019-10-06 09:42:25
categories:
    - Storage
    - Redis
tags:
    - Storage
    - Redis
---

## 窗口限流
1. 用一个zset记录用户行为历史，_**同一个用户同一种行为用一个zset记录**_
2. 为了节省内存，只需要保留**时间窗口内**的行为记录
    - 如果用户是**冷用户**，滑动窗口内的行为为空记录，可以把对应的zset从内存中移除
3. 通过统计滑动窗口内的行为数量与阈值max_count进行比较，决定当前行为是否允许
4. 该方案不适合类似限定60S内操作不超过100W的场景，因为**消耗大量的存储**

<!-- more -->

```java
@AllArgsConstructor
public class WindowRateLimiter {
    private Jedis jedis;

    public boolean isActionAllowed(String userId, String actionKey, int period, int maxCount) throws IOException {
        String key = String.format("hist:%s:%s", userId, actionKey);
        long nowTs = System.currentTimeMillis();
        // 几个连续的Redis操作都是针对同一个Key，pipeline可以显著提升Redis存取效率
        Pipeline pipe = jedis.pipelined();
        pipe.multi();
        pipe.zadd(key, nowTs, "" + nowTs);
        // 截断窗口
        pipe.zremrangeByScore(key, 0, nowTs - period * 1000);
        Response<Long> count = pipe.zcard(key);
        // 配置窗口过期时间
        pipe.expire(key, period + 1);
        pipe.exec();
        pipe.close();
        return count.get() <= maxCount;
    }

    public static void main(String[] args) throws IOException {
        SimpleRateLimiter limiter = new SimpleRateLimiter(new Jedis("localhost", 16379));
        for (int i = 0; i < 5; i++) {
            System.out.println(limiter.isActionAllowed("zhongmingmao", "reply", 60, 3));
        }
        // true
        // true
        // true
        // false
        // false
    }
}
```

## 漏斗限流
<img src="https://redis-1253868755.cos.ap-guangzhou.myqcloud.com/redis-limiting-funnel.png" width=1000/>

1. 漏斗的**容量是有限**的
    - 如果漏嘴流水的速率大于灌水的速率，那么漏斗永远都装不满
    - 如果漏嘴流水速率小于灌水的速率，一旦漏斗满了，灌水就需要暂停并等待漏斗腾空
2. **漏斗的剩余空间**代表**当前行为可以持续进行的数量**
3. **漏嘴的流水速率**代表着**系统允许该行为的最大频率**

### 单机
```java
public class FunnelRateLimiter {

    static class Funnel {
        int capacity;
        float leakingRate;
        int leftQuota;
        long leakingTs;

        public Funnel(int capacity, float leakingRate) {
            this.capacity = capacity;
            this.leakingRate = leakingRate;
            this.leftQuota = capacity;
            this.leakingTs = System.currentTimeMillis();
        }

        // 漏水
        void makeSpace() {
            long nowTs = System.currentTimeMillis();
            long deltaTs = nowTs - leakingTs;
            int deltaQuota = (int) (deltaTs * leakingRate);
            if (deltaQuota < 0) { // 间隔时间太长，整数数字过大溢出
                this.leftQuota = capacity;
                this.leakingTs = nowTs;
                return;
            }
            if (deltaQuota < 1) { // 腾出空间太小，最小单位是1
                return;
            }
            this.leftQuota += deltaQuota;
            this.leakingTs = nowTs;
            if (this.leftQuota > this.capacity) {
                this.leftQuota = this.capacity;
            }
        }

        // 灌水
        boolean watering(int quota) {
            // 每次灌水前都触发漏水来腾出空间
            makeSpace();
            if (this.leftQuota >= quota) {
                this.leftQuota -= quota;
                return true;
            }
            return false;
        }
    }

    private Map<String, Funnel> funnels = new HashMap<>();

    public boolean isActionAllowed(String userId, String actionKey, int capacity, float leakingRate) {
        String key = String.format("%s:%s", userId, actionKey);
        Funnel funnel = funnels.get(key);
        if (funnel == null) {
            funnel = new Funnel(capacity, leakingRate);
            funnels.put(key, funnel);
        }
        // 需要1个quota
        return funnel.watering(1);
    }
}
```

### Redis-Cell
Redis 4.0提供了限流Redis模块，称为`redis-cell`，该模块也使用了**漏斗算法**，并提供了**原子的限流指令**`cl.throttle`
```bash
# 每60S最多回复30次，漏斗的初始容量为15，一开始可以连续回复15次，然后开始受漏水速率的影响
> cl.throttle zhongmingmao:reply 15 30 60 1
                            ▲     ▲  ▲  ▲  ▲
                            |     |  |  |  └───── need 1 quota (可选参数，默认值也是1)
                            |     |  └──┴─────── 30 operations / 60 seconds 漏水速率
                            |     └───────────── 15 capacity 漏斗容量
                            └─────────────────── key zhongmingmao

127.0.0.1:6379> cl.throttle zhongmingmao:reply 15 30 60 1
1) (integer) 0      # 0表示允许，1表示拒绝
2) (integer) 16     # 漏斗容量capacity
3) (integer) 15     # 漏斗剩余空间left_quota
4) (integer) -1     # 如果拒绝了，需要多长时间后再试，单位为秒
5) (integer) 2      # 多长时间后，漏斗完全空出来（left_quota==capacity），单位秒
```