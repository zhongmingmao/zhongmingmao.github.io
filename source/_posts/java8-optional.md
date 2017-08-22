---
title: Java 8小记 - Optional
date: 2017-06-03 00:06:25
categories:
    - Java 8
tags:
    - Netease
    - Java 8
---

{% note info %}
本文主要介绍`Java 8`的 `Optional` 的简单使用
{% endnote %}

<!-- more -->
## Address
```Java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Address {
    private String province;
    private String city;
}
```

# of + ofNullable 
相关代码托管在[java8_demo](https://github.com/zhongmingmao/java8_demo)
```Java
@Test(expected = NoSuchElementException.class)
public void emptyTest() {
   // 声明一个空的Optional对象
   Optional<Address> nameOptional = Optional.empty();
   // java.util.NoSuchElementException: No value present
   nameOptional.get();
}
    
@Test(expected = NullPointerException.class)
public void ofNullTest() {
   // 依据实例创建Optional对象
   Optional.of(new Address("Guangdong", "Zhongshan"));
   
   // Optional.ofNullable(null)返回Optional.empty()
   assertEquals(Optional.empty(), Optional.ofNullable(null));
   // java.lang.NullPointerException
   Optional.of(null);
}
```

# map
1. `Stream.map`的定义：`<R> Stream<R> map(Function<? super T, ? extends R> mapper)`
2. `Optional.map`的定义：`<U> Optional<U> map(Function<? super T, ? extends U> mapper)`
3. 上面两者定义非常类似，`Optional`可看成`最多包含一个元素`的 `Stream`

![java8-optional-map](http://oqsopcxo1.bkt.clouddn.com/java8-optional-map.png?imageView2/0/q/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/240/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/11/dy/11|imageslim)

```Java
@Test
public void mapTest() {
   String province = "Guangdong";
   String city = "Zhongshan";
   Optional<Address> addressOptional = Optional.of(new Address(province, city));
   // mapper : Address -> String
   // Optional<Address> -> Optional<String>
   Optional<String> stringOptional = addressOptional.map(Address::getCity);
   assertTrue(stringOptional.isPresent());
   assertEquals(city, stringOptional.get());
}
```

# flatMap
1. `Stream.flatMap`的定义：`<R> Stream<R> flatMap(Function<? super T, ? extends Stream<? extends R>> mapper)`
2. `Optional.flatMap`的定义：`<U> Optional<U> flatMap(Function<? super T, Optional<U>> mapper)`

![java8-optional-flatmap](http://oqsopcxo1.bkt.clouddn.com/java8-optional-flatmap.png?imageView2/0/q/75|watermark/2/text/QHpob25nbWluZ21hbw==/font/Y291cmllciBuZXc=/fontsize/240/fill/IzAwMDAwMA==/dissolve/100/gravity/SouthEast/dx/11/dy/11|imageslim)

```Java
@Test
public void flatmapTest() {
   String province = "Guangdong";
   String city = "Zhongshan";
   Optional<Address> addressOptional = Optional.of(new Address(province, city));
   // 对于 mapper 为 T -> Optional<U>时，调用Optional.map，生成的是Optional<Optional<U>>
   Optional<Optional<String>> optionalOptional = addressOptional.map(address -> Optional.ofNullable(address.getCity()));
   // 对于 mapper 为 T -> Optional<U>时，调用Optional.map，生成的是Optional<U>,被扁平化
   Optional<String> stringOptional = addressOptional.flatMap(address -> Optional.ofNullable(address.getCity()));
   assertTrue(stringOptional.isPresent());
   assertEquals(city, stringOptional.get());
}
```

# 解引用
```Java
@Test(expected = UnsupportedOperationException.class)
public void dereferenceTest() {
   // get：最简单 + 最不安全
   Address address = addressOptional.get();
   assertNotNull(address);
   
   address = null;
   Optional<Address> emptyAddressOptional = Optional.ofNullable(address);
   
   String defaultValue = "Unknown";
   // orElse：设置默认值
   Address elseAddress = emptyAddressOptional.orElse(new Address(defaultValue, defaultValue));
   assertEquals(defaultValue, elseAddress.getProvince());
   assertEquals(defaultValue, elseAddress.getCity());
   
   // orElseGet：orElse的延迟调用版本
   Address elseGetAddress = emptyAddressOptional.orElseGet(Address::new);
   assertNull(elseGetAddress.getProvince());
   assertNull(elseGetAddress.getCity());
   
   // ifPresent：存在值则运行consumer，否则不进行任何操作
   emptyAddressOptional.ifPresent(System.out::println);
   
   // orElseThrow：不存在时，抛出异常
   emptyAddressOptional.orElseThrow(UnsupportedOperationException::new);
}
```

# filter
```Java
@Test
public void filterTest() {
   assertTrue(addressOptional.filter(address -> address.getCity().contains("Z")).isPresent());
}
```

# 基础类型 + Optional
1. `OptionalInt`、`OptionalLong`、`OptionalDouble`
2. 最多`只有一个`元素，并没有像`StreamInt`那样相对于 `Stream<Integer>` 有性能优势
3. 不支持 `map` 、 `flatmap` 、 `filter`

<!-- indicate-the-source -->


