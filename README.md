# zhongmingmao.github.io[![Build Status](https://travis-ci.org/zhongmingmao/zhongmingmao.github.io.svg?branch=blog_source)](https://travis-ci.org/zhongmingmao/zhongmingmao.github.io)

## 1. Description

Hexo Blog integrated with Travis CI.

## 2. Travis CI Strategy

- hexo blog source on branch `blog_source`
- hexo output (`github-pages`) on branch `master`
- `blog_source` -> `Travis CI` -> `master`

[.travis.yml](https://github.com/zhongmingmao/zhongmingmao.github.io/blob/blog_source/.travis.yml)

## 3. Hexo Plugins

1. [hexo-filter-indicate-the-source](https://github.com/JamesPan/hexo-filter-indicate-the-source)
2. [hexo-generator-seo-friendly-sitemap](https://github.com/ludoviclefevre/hexo-generator-seo-friendly-sitemap)
