# zhongmingmao.github.io[![Build Status](https://travis-ci.org/zhongmingmao/zhongmingmao.github.io.svg?branch=blog_source)](https://travis-ci.org/zhongmingmao/zhongmingmao.github.io)

## 1. Description

Hexo Blog integrated with Travis CI.

## 2. Travis CI Strategy

- hexo blog source on branch `blog_source`
- hexo output (`github-pages`) on branch `master`
- `blog_source` -> `Travis CI` -> `master`

```yaml .travis.yml https://github.com/zhongmingmao/zhongmingmao.github.io/blob/blog_source/.travis.yml .travis.yml
language: node_js
node_js: stable

# S: Build Lifecycle
install:
  - npm install

script:
  - hexo g

after_script:
  - cd ./public
  - git init
  - git config user.name "zhongmingmao"
  - git config user.email "zhongmingmao0625@gmail.com"
  - git add .
  - git commit -m "Update Hexo Blog"
  - git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:master
# E: Build LifeCycle

branches:
  only:
    - blog_source
env:
 global:
   - GH_REF: github.com/zhongmingmao/zhongmingmao.github.io.git

notifications:
  email:
    recipients:
      - zhongmingmao0625@gmail.com
```

## 3. Hexo Plugins

1. [hexo-filter-indicate-the-source](https://github.com/JamesPan/hexo-filter-indicate-the-source)
2. [hexo-generator-seo-friendly-sitemap](https://github.com/ludoviclefevre/hexo-generator-seo-friendly-sitemap)

## 4. Blog List

### 4.1 [Git++](http://zhongmingmao.me/categories/Git/)

* [x] [Git++ - 有趣的命令](http://zhongmingmao.me/2017/04/14/git-basic)
* [x] [Git++ - 分支](http://zhongmingmao.me/2017/04/15/git-branch)
* [x] [Git++ - 引用和提交区间](http://zhongmingmao.me/2017/04/15/git-ref)
* [x] [Git++ - Stash](http://zhongmingmao.me/2017/04/16/git-stash)
* [x] [Git++ - 重写提交历史](http://zhongmingmao.me/2017/04/17/git-rewrite-commit)
* [x] [Git++ - Reset](http://zhongmingmao.me/2017/04/17/git-reset)
* [x] [Git++ - 合并](http://zhongmingmao.me/2017/04/18/git-merge)
* [x] [Git++ - 对象](http://zhongmingmao.me/2017/04/19/git-object)
* [x] [Git++ - 仓库瘦身](http://zhongmingmao.me/2017/04/19/git-reduce)
* [x] [Git++ - Git Flow](http://zhongmingmao.me/2017/04/20/git-flow)

### 4.2 [InnoDB备忘录](http://zhongmingmao.me/categories/MySQL/InnoDB/)

* [x] [InnoDB备忘录 - 逻辑存储](http://zhongmingmao.me/2017/05/06/innodb-table-logical-structure/)
* [x] [InnoDB备忘录 - 行记录格式](http://zhongmingmao.me/2017/05/07/innodb-table-row-format/)
* [x] [InnoDB备忘录 - 数据页格式](http://zhongmingmao.me/2017/05/09/innodb-table-page-structure/)
* [x] [InnoDB备忘录 - B+Tree索引](http://zhongmingmao.me/2017/05/13/innodb-btree-index/)
* [x] [InnoDB备忘录 - Next-Key Lock](http://zhongmingmao.me/2017/05/19/innodb-next-key-lock/)
* [x] [InnoDB备忘录 - 事务隔离级别](http://zhongmingmao.me/2017/05/22/innodb-isolation-level/)

### 4.3 [Java 8小记](http://zhongmingmao.me/categories/Java-8/)

* [x] [Java 8小记 - 行为参数化](http://zhongmingmao.me/2017/05/29/java8-behavioral-parameterization/)
* [x] [Java 8小记 - Lambda](http://zhongmingmao.me/2017/05/30/java8-lambda/)
* [x] [Java 8小记 - Stream](http://zhongmingmao.me/2017/06/01/java8-stream/)
* [x] [Java 8小记 - Default Method](http://zhongmingmao.me/2017/06/02/java8-default/)
* [x] [Java 8小记 - Optional](http://zhongmingmao.me/2017/06/03/java8-optional/)

### 4.4 [Java 并发](http://zhongmingmao.me/categories/Concurrent/)

* [x] [并发 - synchronized与锁优化](http://zhongmingmao.me/2016/08/01/concurrent-synchronized/)
* [x] [并发 - volatile的可见性](http://zhongmingmao.me/2016/08/04/concurrent-volatile/)
* [x] [并发 - Unsafe类的简单使用](http://zhongmingmao.me/2016/08/05/concurrent-unsafe/)
* [x] [并发 - JUC - Atomic包 - 源码剖析](http://zhongmingmao.me/2016/08/06/concurrent-atomic/)
* [x] [并发 - JUC - LockSupport - 源码析](http://zhongmingmao.me/2016/08/07/concurrent-locksupport/)
* [x] [并发 - JUC - ReentrantLock - 源码剖析](http://zhongmingmao.me/2016/08/09/concurrent-reentrantlock/)
* [x] [并发 - JUC - ConditionObject - 源码剖析](http://zhongmingmao.me/2016/08/12/concurrent-conditionobject/)
* [x] [并发 - JUC - CountDownLatch - 源码剖析](http://zhongmingmao.me/2016/08/16/concurrent-countdownlatch/)
* [x] [并发 - JUC - CyclicBarrier - 源码剖析](http://zhongmingmao.me/2016/08/18/concurrent-cyclicbarrier/)
* [x] [并发 - JUC - Semaphore - 源码剖析](http://zhongmingmao.me/2016/08/19/concurrent-semaphore/)
* [x] [并发 - JUC - ConcurrentHashMap(JDK1.7) - 源码剖析](http://zhongmingmao.me/2016/08/23/concurrent-concurrenthashmap-7/)
* [x] [并发 - JUC - FutureTask - 源码剖析](http://zhongmingmao.me/2016/08/24/concurrent-futuretask/)
* [x] [并发 - JUC - ArrayBlockingQueue - 源码剖析](http://zhongmingmao.me/2016/08/25/concurrent-arrayblockingqueue/)
* [x] [并发 - JUC - PriorityBlockingQueue - 源码剖析](http://zhongmingmao.me/2016/08/28/concurrent-priorityblockingqueue/)

### 4.5 [JVM](http://zhongmingmao.me/categories/JVM/)

* [x] [VirtualMachineError实例](http://zhongmingmao.me/2016/06/25/jvm-virtualmachineerror/)
* [x] [对象内存布局 - Instrumentation + sa-jdi 工具构建](http://zhongmingmao.me/2016/06/27/jvm-object-layout-1/)
* [x] [对象内存布局 - Instrumentation + sa-jdi 实例分析](http://zhongmingmao.me/2016/06/29/jvm-object-layout-2/)
* [x] [对象内存布局 - JOL使用教程 1](http://zhongmingmao.me/2016/07/02/jvm-jol-tutorial-1/)
* [x] [对象内存布局 - JOL使用教程 2](http://zhongmingmao.me/2016/07/03/jvm-jol-tutorial-2/)
* [x] [对象内存布局 - JOL使用教程 3](http://zhongmingmao.me/2016/07/04/jvm-jol-tutorial-3/)
* [x] [字节码 - JVM字节码执行过程](http://zhongmingmao.me/2016/07/06/jvm-bytecode-execution/)
* [x] [字节码 - 方法重载 + 方法重写](http://zhongmingmao.me/2016/07/07/jvm-overload-override/)
* [x] [字节码 - 伪泛型](http://zhongmingmao.me/2016/07/08/jvm-fake-generic/)
* [x] [垃圾回收 - 晋升规则](http://zhongmingmao.me/2016/07/10/jvm-gc-promotion/)
* [x] [类加载 - 类初始化](http://zhongmingmao.me/2016/07/15/jvm-class-initialization/)

### 4.6 [Zookeeper](http://zhongmingmao.me/categories/Zookeeper/)

* [x] [Zookeeper - Paxos协议小记](http://zhongmingmao.me/2017/07/05/zk-paxos/)
* [x] [Zookeeper - ZAB协议小记](http://zhongmingmao.me/2017/07/09/zk-zab/)
* [x] [分布式互斥锁InterProcessMutex代码剖析](http://zhongmingmao.me/2017/07/14/interprocessmutex/)

### 4.7 [Vim小记](http://zhongmingmao.me/categories/Vim/)

* [x] [Vim小记 - 命令.](http://zhongmingmao.me/2015/11/02/vim-commandpoint/)
* [x] [Vim小记 - 普通模式](http://zhongmingmao.me/2015/11/04/vim-commonmode/)
* [x] [Vim小记 - 插入模式](http://zhongmingmao.me/2015/11/05/vim-insertmode/)
* [x] [Vim小记 - 可视模式](http://zhongmingmao.me/2015/11/07/vim-visualmode/)
* [x] [Vim小记 - 命令行模式](http://zhongmingmao.me/2015/11/10/vim-commandlinemode/)
* [x] [Vim小记 - 文件](http://zhongmingmao.me/2015/11/12/vim-file/)
