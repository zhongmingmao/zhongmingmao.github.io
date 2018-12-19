---
title: JVM基础 -- 基本类型
date: 2018-12-15 10:53:06
categories:
    - JVM
tags:
    - JVM
---

## boolean类型

### Java代码
```java
public class Foo {
    public static void main(String[] args) {
        boolean flag = true;
        if (flag) System.out.println("Hello, Java!");
        if (flag == true) System.out.println("Hello, JVM!");
    }
}
```

### 编译运行
```bash
$ javac Foo.java

$ java Foo
Hello, Java!
Hello, JVM!
```

### 修改字节码运行
```
# jasm与javap的输出比较类似
$ java -cp ./asmtools.jar org.openjdk.asmtools.jdis.Main Foo.class > Foo.jasm.bak
```

<!-- more -->

```
$ tail -n 23 Foo.jasm.bak | head -n 21
public static Method main:"([Ljava/lang/String;)V"
	stack 2 locals 2
{
		iconst_1;
		istore_1;
		iload_1;
		ifeq	L14; # 出栈int，如果等于0时跳转；实际为1，无需跳转
		getstatic	Field java/lang/System.out:"Ljava/io/PrintStream;";
		ldc	String "Hello, Java!";
		invokevirtual	Method java/io/PrintStream.println:"(Ljava/lang/String;)V";
	L14:	stack_frame_type append;
		locals_map int;
		iload_1;
		iconst_1;
		if_icmpne	L27; # 出栈2个int，如果不相等时跳转；实际为1和1，无需跳转
		getstatic	Field java/lang/System.out:"Ljava/io/PrintStream;";
		ldc	String "Hello, JVM!";
		invokevirtual	Method java/io/PrintStream.println:"(Ljava/lang/String;)V";
	L27:	stack_frame_type same;
		return;
}
```
使用awk命令修改字节码
```
$ awk 'NR==1,/iconst_1/{sub(/iconst_1/, "iconst_2")} 1' Foo.jasm.bak > Foo.jasm

$ tail -n 23 Foo.jasm.bak | head -n 21
public static Method main:"([Ljava/lang/String;)V"
	stack 2 locals 2
{
		iconst_2; # iconst_1 -> iconst_2
		istore_1;
		iload_1;
		ifeq	L14; # 出栈int，如果等于0时跳转；实际为1，无需跳转
		getstatic	Field java/lang/System.out:"Ljava/io/PrintStream;";
		ldc	String "Hello, Java!";
		invokevirtual	Method java/io/PrintStream.println:"(Ljava/lang/String;)V";
	L14:	stack_frame_type append;
		locals_map int;
		iload_1;
		iconst_1;
		if_icmpne	L27; # 出栈2个int，如果不相等时跳转；实际为1和2，需跳转
		getstatic	Field java/lang/System.out:"Ljava/io/PrintStream;";
		ldc	String "Hello, JVM!";
		invokevirtual	Method java/io/PrintStream.println:"(Ljava/lang/String;)V";
	L27:	stack_frame_type same;
		return;
}
```

```
$ java -cp ./asmtools.jar org.openjdk.asmtools.jasm.Main Foo.jasm

$ java Foo
Hello, Java!
```

### Java语言规范+Java虚拟机规范
1. Java语言规范：boolean类型只有两个取值：**true**和**false**，显然这两个符号是不能被虚拟机直接使用的
2. Java虚拟机规范：**boolean类型被映射成int类型**，true被映射成1，false被映射成0
    - 这个编码规则约束了**Java字节码的具体实现**
        - 例如对于存储boolean数组的字节码，JVM需要保证实际存入的值为整数1或0
    - 要求**Java编译器**也遵守这个编码规则，并且用**整数相关的字节码**来实现**逻辑运算**，以及boolean类型的**条件跳转**
        - 因此，编译而成的class文件中，除了**字段**和**入参**外，基本看不出boolean类型的痕迹

## 基本类型
<img src="https://jvm-1253868755.cos.ap-guangzhou.myqcloud.com/basic/jvm-basic-native-type.png" />

1. 默认值看起来不一样，但在内存中都是**0**
2. boolean和char是**无符号类型**，通常我们可以认定char类型是非负数，可以作为数组索引

### 浮点数

### 两个0
```java
private static String floatToHexIntBits(float f) {
    return Integer.toHexString(Float.floatToIntBits(f));
}
```
```java
float z1 = +0.0F; // +0.0F
float z2 = -0.0F; // -0.0F
log.info("{}", floatToHexIntBits(z1)); // 0
log.info("{}", floatToHexIntBits(z2)); // 0x80000000
log.info("{}", z1 == z2); // 两个0对应的内存数值不同，但+0.0F == -0.0F
```

### 两个Infinity
1. 正无穷：**任意正浮点数**（不含+0.0F）除以**+0.0F**得到的值
2. 负无穷：**任意正浮点数**（不含+0.0F）除以**-0.0F**得到的值
3. 正无穷和负无穷都是有**确切**的值的，分别是**0x7F800000**和**0xFF800000**

```java
public static final float POSITIVE_INFINITY = 1.0f / 0.0f;
public static final float NEGATIVE_INFINITY = -1.0f / 0.0f;
log.info("{}", floatToHexIntBits(Float.POSITIVE_INFINITY)); // 0x7F800000
log.info("{}", floatToHexIntBits(Float.NEGATIVE_INFINITY)); // 0XFF800000
```

### NaN(Not-a-Number)
1. NaN：**[0x7F800001, 0x7FFFFFFF] U [0xFF800001, 0xFFFFFFFF]**
2. 标准NaN：**+0.0f/+0.0f，0x7FC00000**
3. 除了**!=** 始终返回**true**之外，其他所有的比较结果都会返回false

```java
float f = 1.0F;
log.info("{}", floatToHexIntBits(NaN)); // 0x7FC00000
log.info("{}", NaN < f);    // false
log.info("{}", NaN >= f);   // false
log.info("{}", NaN != f);   // true
log.info("{}", NaN == f);   // false
log.info("{}", NaN == NaN); // false
```

### 存储
1. JVM每调用一个**Java方法**，都会创建一个**栈帧**
2. 栈帧组成：**局部变量表**+**操作数栈**
    - 局部变量表示广义的，包含实例方法的"this"指针和入参
3. 局部变量表等价于一个**数组**，**long**和**double** 需要用**2个**数组单元来存储，其他基本类型和引用类型均占用1个数组单元
    - boolean、byte、char、short、int、float和reference
        - 32位HotSpot：在栈上占用**4Bytes**
        - 64位HotSpot：在栈上占用**8Bytes**
    - 这种情况**仅存在于局部变量表**中，并不会出现在存储在堆中的字段或者数组元素上
4. 将一个**int类型**的值，存储到**堆中的char**类型字段时，相当于做了一次**隐式的掩码操作**（0xFFFFFFFF -> '\uFFFF'）
5. **boolean数组直接用byte数组来实现**
    - 为了保证堆中的boolean值是合法的，HotSpot在存储时进行**显式的掩码操作**，只取最后一位的值存入boolean字段或数组

```java
@Slf4j
@Data
public class User {
    private boolean sex;

    public static void main(String[] args) throws NoSuchFieldException, IllegalAccessException {
        Field field = Unsafe.class.getDeclaredField("theUnsafe");
        field.setAccessible(true);
        Unsafe unsafe = (Unsafe) field.get(null);

        User user = new User();
        Field sexField = User.class.getDeclaredField("sex");

        unsafe.putByte(user, unsafe.objectFieldOffset(sexField), (byte) 2);
        log.info("{}", user.isSex()); // 10 -> 0 , false

        unsafe.putByte(user, unsafe.objectFieldOffset(sexField), (byte) 3);
        log.info("{}", user.isSex()); // 11 -> 1 , true
    }
}
```
### 加载
1. JVM的算数运算依赖于操作数栈，将堆中的boolean、byte、char以及short加载到操作数栈上，而后将栈上到值**当做int类型**来运算
2. 对于**boolean**和**char**这两个**无符号**类型来说，加载伴随着**零扩展**
3. 对于**byte**和**short**这两个**有符号**类型来说，加载伴随着**符号扩展**

<!-- indicate-the-source -->
