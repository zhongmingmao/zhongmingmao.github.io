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

### 4.1 [Git++](http://zhongmingmao.me/tags/Git/)
  
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

### 4.2 [InnoDB备忘录](http://zhongmingmao.me/tags/InnoDB/)

* [x] [InnoDB备忘录 - 逻辑存储](http://zhongmingmao.me/2017/05/06/innodb-table-logical-structure/)
* [x] [InnoDB备忘录 - 行记录格式](http://zhongmingmao.me/2017/05/07/innodb-table-row-format/)
* [x] [InnoDB备忘录 - 数据页格式](http://zhongmingmao.me/2017/05/09/innodb-table-page-structure/)
* [x] [InnoDB备忘录 - B+Tree索引](http://zhongmingmao.me/2017/05/13/innodb-btree-index/)
* [x] [InnoDB备忘录 - Next-Key Lock](http://zhongmingmao.me/2017/05/19/innodb-next-key-lock/)

### 4.3 [Java 8小记](http://zhongmingmao.me/tags/Java-8/)

* [x] [Java 8小记 - 行为参数化](http://zhongmingmao.me/2017/05/29/java8-behavioral-parameterization/)
* [x] [Java 8小记 - Lambda](http://zhongmingmao.me/2017/05/30/java8-lambda/)
* [x] [Java 8小记 - Stream](http://zhongmingmao.me/2017/06/01/java8-stream/)
* [x] [Java 8小记 - Default Method](http://zhongmingmao.me/2017/06/02/java8-default/)
* [x] [Java 8小记 - Optional](http://zhongmingmao.me/2017/06/03/java8-optional/)



