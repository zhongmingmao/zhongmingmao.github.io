#!/bin/bash
git clone https://github.com/zhongmingmao/linear-algebra
cd linear-algebra
gitbook build
cp -r _book ../source/linear-algebra
cd ..
rm -rf linear-algebra
