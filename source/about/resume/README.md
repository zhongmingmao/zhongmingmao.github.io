# 加密
```
tar -zcvf - md | openssl des3 -salt -k $password -out md.tar.gz
```

# 解密
```
openssl des3 -d -k $password -salt -in md.tar.gz | tar zxf -
```
