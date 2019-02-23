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
  - npm install && npm install gitbook -g && npm install -g gitbook-cli

script:
  - bash build_gitbook.sh
  - hexo clean && hexo g

after_script:
  - bash push_master.sh
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
