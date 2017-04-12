---
title: Hello World
categories:
    - Testing
    - Job
tags:
    - Spring
    - Boot
---


# H1
## H1.1
# H2

```java quick.java http://baidu.com baidu.com
package com.quick;

public class quick {
    public void quick_sort(int[] arrays, int lenght) {
        if (null == arrays || lenght < 1) {
            System.out.println("input error!");
            return;
        }
        _quick_sort(arrays, 0, lenght - 1);
    }

    public void snp(int[] arrays) {
        for (int i = 0; i < arrays.length; i++) {
            System.out.print(arrays[i] + " ");
        }
        System.out.println();
    }

    private void swap(int[] arrays, int i, int j) {
        int temp;
        temp = arrays[i];
        arrays[i] = arrays[j];
        arrays[j] = temp;
    }

    public static void main(String args[]) {
        quick q = new quick();
        int[] a = { 49, 38, 65,12,45,5 };
        q.quick_sort(a,6);
    } 

}
```
