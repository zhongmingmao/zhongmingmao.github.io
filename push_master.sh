#!/bin/bash
git init
git config user.name "zhongmingmao"
git config user.email "zhongmingmao0625@gmail.com"
git add .
git commit -m "Update Hexo Blog"
git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:master
