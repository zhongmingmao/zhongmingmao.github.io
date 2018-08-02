#!/bin/bash
gitbook_path='source/gitbook/'
rm -rf $gitbook_path
mkdir -p $gitbook_path

repository_names=('linear-algebra' 'machine-learning')
for repository_name in ${repository_names[*]}; do
	rm -rf $repository_name
    repository='https://github.com/zhongmingmao/'$repository_name
	git clone $repository
	cd $repository_name
	gitbook install && gitbook build
	cp -r _book '../'$gitbook_path$repository_name
	cd ..
	rm -rf $repository_name
done
