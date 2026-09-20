---
title: Java反射机制与动态代理
published: 2025-08-18
updated: 2025-08-18
description: 对Spring框架底层实现不理解，回来恶补基础（😭
author: mio
tags:
  - Java
  - 项目学习
  - 后端开发
category: 后端
draft: false
---
> - 如何获取class字节码文件的对象
> - 利用反射如何获取构造方法（创建对象）
> - 利用反射如何获取成员变量（赋值，获取值）
> - 利用反射如何获取成员方法（运行）

## 1. 概述

- **动态获取**：在**运行状态中**，能知道**任意一个类**的***属性和方法***
- **动态调用**：对于任意一个对象，都可以**调用**它的***属性和方法***

## 2. 获取字节码文件对象

> Java文件：自己编写的Java代码
> 字节码文件：编译之后的class文件
> 字节码文件对象：class文件加载到内存后，由虚拟机自动创建的对象。
### 2.1 方式一：类名.class(类字面量)

**特点：**

- 编译时确定，类型安全
- **不会触发类的初始化（静态代码块不执行）**
- 性能最高，推荐使用
- **支持基本数据类型**
```java
public class ClassLiteralExample {
    public static void main(String[] args) {
        // 获取基本类型的Class对象
        Class<Integer> intClass = int.class;
        Class<Double> doubleClass = double.class;
        
        // 获取引用类型的Class对象
        Class<String> stringClass = String.class;
        Class<List> listClass = List.class;
        
        System.out.println("int.class: " + intClass.getName());
        System.out.println("String.class: " + stringClass.getName());
    }
}
```

### 2.2 方式二：对象.getClass()

**特点：**

- 运行时确定，需要先有对象实例
- 会触发类的初始化
- 返回对象的实际类型（多态时很重要）
- 不能获取基本数据类型的Class对象

```java
public class GetClassExample {
    static {
        System.out.println("User类被初始化");
    }
    
    public static void main(String[] args) {
        // 必须先创建对象
        String str = "Hello World";
        User user = new User();
        
        Class<?> stringClass = str.getClass();
        Class<?> userClass = user.getClass();
        
        // 注意：对于继承关系，返回的是实际对象的类型
        Animal animal = new Dog();
        Class<?> animalClass = animal.getClass(); // 返回Dog.class，不是Animal.class
        
        System.out.println("实际类型: " + animalClass.getName()); // 输出: Dog
    }
}

class Animal {}
class Dog extends Animal {}
```
### 2.3 方式三：Class.forName("全限定类名")

**特点：**

- 动态加载，可以根据字符串**动态获取**
- 默认会触发类的初始化
- 需要处理ClassNotFoundException异常
- 支持完整的类加载控制
```java
public class ForNameExample {
    public static void main(String[] args) {
        try {
            // 基本使用
            Class<?> stringClass = Class.forName("java.lang.String");
            
            // 数组类型
            Class<?> arrayClass = Class.forName("[Ljava.lang.String;"); // String[]
            Class<?> intArrayClass = Class.forName("[I"); // int[]
            
            // 内部类
            Class<?> innerClass = Class.forName("com.example.Outer$Inner");
            
            // 控制是否初始化类
            Class<?> clazz1 = Class.forName("com.example.User", true, 
                                          Thread.currentThread().getContextClassLoader());
            Class<?> clazz2 = Class.forName("com.example.User", false, 
                                          Thread.currentThread().getContextClassLoader());
            
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
    }
}
```

### 2.4 选择原则

1. **编译时已知类型** → 使用 `类名.class`
2. **需要获取对象实际类型** → 使用 `对象.getClass()`
3. **动态加载未知类** → 使用 `Class.forName()`

## 3. 获取方法和成员变量

***访问权限对比**

| 方法                   | 访问范围       | 包含继承 | 访问权限    |
| -------------------- | ---------- | ---- | ------- |
| getMethod()          | public方法   | ✅    | 仅public |
| getDeclaredMethod()  | 当前类所有方法    | ❌    | 所有权限    |
| getMethods()         | 所有public方法 | ✅    | 仅public |
| getDeclaredMethods() | 当前类所有方法    | ❌    | 所有权限    |

***选择原则**
1. **获取public成员且需要包含继承** → 使用 `getMethod()`、`getField()`、`getMethods()`、`getFields()`
2. **获取当前类所有成员** → 使用 `getDeclaredXxx()` 系列方法
3. **需要访问私有成员** → 必须使用 `getDeclaredXxx()` + `setAccessible(true)`
4. **性能敏感场景** → 使用缓存机制
### 3.1 获取单个方法
```java
public class MethodReflectionExample {
    public static void main(String[] args) throws Exception {
        Class<String> stringClass = String.class;
        
        // 方式1：getMethod() - 获取public方法（包括继承的）
        Method method1 = stringClass.getMethod("substring", int.class);
        Method method2 = stringClass.getMethod("length"); // 无参方法
        
        // 方式2：getDeclaredMethod() - 获取当前类声明的方法（所有访问权限）
        Method method3 = stringClass.getDeclaredMethod("substring", int.class);
        
        System.out.println("getMethod获取: " + method1.getName());
        System.out.println("getDeclaredMethod获取: " + method3.getName());
    }
}
```

### 3.2 获取所有方法
```java
public class AllMethodsExample {
    public static void main(String[] args) {
        Class<String> stringClass = String.class;
        
        // 方式1：getMethods() - 获取所有public方法（包括继承的）
        Method[] publicMethods = stringClass.getMethods();
        System.out.println("public方法数量（包括继承）: " + publicMethods.length);
        
        // 方式2：getDeclaredMethods() - 获取当前类声明的所有方法
        Method[] declaredMethods = stringClass.getDeclaredMethods();
        System.out.println("当前类声明的方法数量: " + declaredMethods.length);
        
        // 打印部分方法信息
        System.out.println("\n部分public方法:");
        for (int i = 0; i < Math.min(5, publicMethods.length); i++) {
            Method method = publicMethods[i];
            System.out.println(method.getName() + " - 参数个数: " + method.getParameterCount());
        }
    }
}
```

### 3.3 获取构造方法

***获取构造方法并创建对象**：`newInstance()`

```java
public class ConstructorReflectionExample {
    public static void main(String[] args) throws Exception {
        Class<String> stringClass = String.class;
        
        // 方式1：getConstructor() - 获取指定参数的public构造器
        Constructor<String> constructor1 = stringClass.getConstructor(String.class);
        Constructor<String> constructor2 = stringClass.getConstructor(); // 无参构造器
        
        // 方式2：getDeclaredConstructor() - 获取指定参数的构造器（所有访问权限）
        Constructor<String> constructor3 = stringClass.getDeclaredConstructor(char[].class);
        
        // 方式3：getConstructors() - 获取所有public构造器
        Constructor<?>[] publicConstructors = stringClass.getConstructors();
        System.out.println("public构造器数量: " + publicConstructors.length);
        
        // 方式4：getDeclaredConstructors() - 获取所有构造器
        Constructor<?>[] allConstructors = stringClass.getDeclaredConstructors();
        System.out.println("所有构造器数量: " + allConstructors.length);
        
        // 使用构造器创建对象
        String str1 = constructor1.newInstance("Hello");
        String str2 = constructor3.newInstance("World".toCharArray());
        
        System.out.println("创建的字符串1: " + str1);
        System.out.println("创建的字符串2: " + str2);
    }
}
```

### 3.4 获取成员变量

临时修饰访问权限：`setAccessible(true)`

|方法|说明|
|---|---|
|void set(Object obj, Object value）|赋值|
|Object get(Object obj)|获取值|

```java
public class FieldReflectionExample {
    private String privateField = "私有字段";
    public String publicField = "公共字段";
    protected String protectedField = "保护字段";
    String packageField = "包私有字段";
    
    public static void main(String[] args) throws Exception {
        Class<FieldReflectionExample> clazz = FieldReflectionExample.class;
        FieldReflectionExample instance = new FieldReflectionExample();
        
        // 方式1：getField() - 获取public字段（包括继承的）
        Field publicField = clazz.getField("publicField");
        System.out.println("public字段值: " + publicField.get(instance));
        
        // 方式2：getDeclaredField() - 获取当前类声明的字段（所有访问权限）
        Field privateField = clazz.getDeclaredField("privateField");
        privateField.setAccessible(true); // 设置可访问
        System.out.println("private字段值: " + privateField.get(instance));
        
        // 方式3：getFields() - 获取所有public字段（包括继承的）
        Field[] publicFields = clazz.getFields();
        System.out.println("public字段数量: " + publicFields.length);
        
        // 方式4：getDeclaredFields() - 获取当前类声明的所有字段
        Field[] allFields = clazz.getDeclaredFields();
        System.out.println("所有字段数量: " + allFields.length);
        
        // 遍历所有字段
        System.out.println("\n所有字段信息:");
        for (Field field : allFields) {
            field.setAccessible(true);
            System.out.println(field.getName() + " = " + field.get(instance) + 
                             " (类型: " + field.getType().getSimpleName() + ")");
        }
    }
}
```
## 4. 实际应用示例

### 4.1 通用对象复制工具

```java
public class ObjectCopyUtil {
    public static <T> T copyObject(T source, Class<T> targetClass) throws Exception {
        // 创建目标对象
        T target = targetClass.getDeclaredConstructor().newInstance();
        
        // 获取所有字段
        Field[] fields = source.getClass().getDeclaredFields();
        
        for (Field field : fields) {
            field.setAccessible(true);
            
            // 获取源对象字段值
            Object value = field.get(source);
            
            try {
                // 在目标类中查找同名字段
                Field targetField = targetClass.getDeclaredField(field.getName());
                targetField.setAccessible(true);
                
                // 类型匹配则复制
                if (targetField.getType().equals(field.getType())) {
                    targetField.set(target, value);
                }
            } catch (NoSuchFieldException e) {
                // 目标类没有该字段，跳过
                System.out.println("跳过字段: " + field.getName());
            }
        }
        
        return target;
    }
    
    // 测试用例
    public static void main(String[] args) throws Exception {
        User user = new User("张三", 25);
        UserDto userDto = copyObject(user, UserDto.class);
        
        System.out.println("原对象: " + user);
        System.out.println("复制对象: " + userDto);
    }
}

class User {
    private String name;
    private int age;
    
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    @Override
    public String toString() {
        return "User{name='" + name + "', age=" + age + "}";
    }
}

class UserDto {
    private String name;
    private int age;
    
    @Override
    public String toString() {
        return "UserDto{name='" + name + "', age=" + age + "}";
    }
}
```
### 4.2 方法调用拦截器

```java
public class MethodInterceptor {
    public static void interceptAllMethods(Object target) {
        Class<?> clazz = target.getClass();
        
        System.out.println("=== 拦截对象 " + clazz.getSimpleName() + " 的所有方法 ===");
        
        // 获取所有public方法
        Method[] methods = clazz.getMethods();
        
        for (Method method : methods) {
            // 过滤掉Object类的方法
            if (method.getDeclaringClass() == Object.class) {
                continue;
            }
            
            System.out.println("方法: " + method.getName());
            System.out.println("  参数类型: " + Arrays.toString(method.getParameterTypes()));
            System.out.println("  返回类型: " + method.getReturnType().getSimpleName());
            System.out.println("  修饰符: " + Modifier.toString(method.getModifiers()));
            
            // 检查注解
            if (method.isAnnotationPresent(Deprecated.class)) {
                System.out.println("  ⚠️ 此方法已过时");
            }
            
            System.out.println();
        }
    }
    
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();
        interceptAllMethods(list);
    }
}
```
### 4.3 构造器选择器

```java
public class ConstructorSelector {
    public static <T> T createInstance(Class<T> clazz, Object... args) throws Exception {
        Constructor<?>[] constructors = clazz.getDeclaredConstructors();
        
        // 根据参数数量和类型选择合适的构造器
        for (Constructor<?> constructor : constructors) {
            Class<?>[] paramTypes = constructor.getParameterTypes();
            
            if (paramTypes.length == args.length) {
                boolean match = true;
                for (int i = 0; i < paramTypes.length; i++) {
                    if (args[i] != null && !paramTypes[i].isAssignableFrom(args[i].getClass())) {
                        // 检查基本类型包装类
                        if (!isCompatibleType(paramTypes[i], args[i].getClass())) {
                            match = false;
                            break;
                        }
                    }
                }
                
                if (match) {
                    constructor.setAccessible(true);
                    return (T) constructor.newInstance(args);
                }
            }
        }
        
        throw new IllegalArgumentException("没有找到匹配的构造器");
    }
    
    private static boolean isCompatibleType(Class<?> paramType, Class<?> argType) {
        // 处理基本类型和包装类型的兼容性
        if (paramType == int.class && argType == Integer.class) return true;
        if (paramType == long.class && argType == Long.class) return true;
        if (paramType == double.class && argType == Double.class) return true;
        // ... 其他基本类型
        return false;
    }
    
    public static void main(String[] args) throws Exception {
        // 测试创建不同类型的对象
        String str = createInstance(String.class, "Hello World");
        Integer num = createInstance(Integer.class, 42);
        
        System.out.println("创建的字符串: " + str);
        System.out.println("创建的整数: " + num);
    }
}
```

## 5. 面试题练习（重点）

### 5.1 反射和配置文件结合动态获取

求: 利用反射根据文件中的不同类名和方法名，创建不同的对象并调用方法。

分析:

①通过Properties加载配置文件

②得到类名和方法名

③通过类名反射得到Class对象

④通过Class对象创建一个对象

⑤通过Class对象得到方法

⑥调用方法

代码示例：
```java
public class ReflectDemo9 {
    public static void main(String[] args) throws IOException, ClassNotFoundException, 
            NoSuchMethodException, InvocationTargetException, InstantiationException, IllegalAccessException {
        
        // 第1步：读取配置文件信息
        Properties prop = new Properties();
        FileInputStream fis = new FileInputStream("day14-code\\prop.properties");
        prop.load(fis);  // 加载配置文件内容到Properties对象
        fis.close();
        
        System.out.println(prop);  // 打印配置信息
        
        // 从配置中获取类名和方法名
        String classname = prop.get("classname") + "";    // 转换为String
        String methodname = prop.get("methodname") + "";  // 转换为String
        
        // 第2步：获取字节码文件对象
        Class clazz = Class.forName(classname);  // 动态加载类
        
        // 第3步：创建类的实例
        Constructor con = clazz.getDeclaredConstructor();  // 获取无参构造器
        con.setAccessible(true);  // 设置可访问（处理private构造器）
        Object o = con.newInstance();  // 创建实例
        System.out.println(o);
        
        // 第4步：获取方法对象
        Method method = clazz.getDeclaredMethod(methodname);  // 获取指定方法
        method.setAccessible(true);  // 设置可访问（处理private方法）
        
        // 第5步：调用方法
        method.invoke(o);  // 在对象o上调用方法
    }
}

配置文件中的信息：
classname=com.itheima.a02reflectdemo1.Student
methodname=sleep
```

### 5.2 利用发射保存对象中的信息

```java
public class MyReflectDemo {
    public static void main(String[] args) throws IllegalAccessException, IOException {
    /*
        对于任意一个对象，都可以把对象所有的字段名和值，保存到文件中去
    */
       Student s = new Student("小A",23,'女',167.5,"睡觉");
       Teacher t = new Teacher("播妞",10000);
       saveObject(s);
    }

    //把对象里面所有的成员变量名和值保存到本地文件中
    public static void saveObject(Object obj) throws IllegalAccessException, IOException {
        //1.获取字节码文件的对象
        Class clazz = obj.getClass();
        //2. 创建IO流
        BufferedWriter bw = new BufferedWriter(new FileWriter("myreflect\\a.txt"));
        //3. 获取所有的成员变量
        Field[] fields = clazz.getDeclaredFields();
        for (Field field : fields) {
            field.setAccessible(true);
            //获取成员变量的名字
            String name = field.getName();
            //获取成员变量的值
            Object value = field.get(obj);
            //写出数据
            bw.write(name + "=" + value);
            bw.newLine();
        }

        bw.close();

    }
}
```

## 6. 动态代理

>什么是动态代理？
>动态代理是在运行时动态生成代理类的技术，无需事先编写代理类代码。代理对象可以在**不修改目标对象**的情况下，**对目标对象的功能进行增强**。
>它的常见用途包括：
> - **权限控制
> - 日志记录
> - 事务处理
> - 方法调用前后增强

### 6.1 理解代理模式
![Java 动态代理示意图](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/java-reflection/dynamic-proxy.png)

```java
// 抽象主题接口
interface Subject {
    void request();
}

// 真实主题类
class RealSubject implements Subject {
    @Override
    public void request() {
        System.out.println("RealSubject: 处理请求");
    }
}

// 静态代理类
class StaticProxy implements Subject {
    private RealSubject realSubject;
    
    public StaticProxy(RealSubject realSubject) {
        this.realSubject = realSubject;
    }
    
    @Override
    public void request() {
        System.out.println("代理前置处理");
        realSubject.request();
        System.out.println("代理后置处理");
    }
}
```

**静态代理和动态代理**

| 特性    | 静态代理 | 动态代理          |
| ----- | ---- | ------------- |
| 创建时机  | 编译时  | 运行时           |
| 代理类数量 | 一对一  | 一个代理类可代理多个目标类 |
| 维护成本  | 高    | 低             |
| 性能    | 好    | 略差（有反射开销）     |
| 灵活性   | 差    | 好             |

接下来我们需要了解的JDK动态代理和CGLIB动态代理

| 特性          | JDK动态代理 | CGLIB动态代理  |
| ----------- | ------- | ---------- |
| **代理对象**    | 只能代理接口  | 可以代理类和接口   |
| **实现方式**    | 基于反射机制  | 基于ASM字节码生成 |
| **性能**      | 反射调用较慢  | 字节码执行较快    |
| **依赖**      | JDK内置   | 需要额外jar包   |
| **生成代理**    | 运行时生成   | 运行时生成      |
| **final方法** | N/A     | 无法代理       |
| **构造器**     | 无要求     | 需要无参构造器    |
| **包大小**     | 无额外依赖   | 增加包体积      |


### 6.2 JDK动态代理

> JDK动态代理基于接口实现，通过`java.lang.reflect.Proxy`类和`InvocationHandler`接口实现。


#### 6.2.1 `java.lang.reflect.Proxy`类

**1️⃣作用**
- **动态生成代理类**：在运行时为指定接口创建代理对象，而不需要手动编写代理类。
- **方法拦截**：代理对象的方法调用会被转发到一个 **`InvocationHandler`**，由它决定如何处理。
- **应用场景**：AOP（面向切面编程）、事务处理、权限控制、日志记录、RPC 框架（如 Dubbo）。

2️⃣基本结构
```java
public class Proxy implements java.io.Serializable {
    // 生成代理类实例
    public static Object newProxyInstance(
        ClassLoader loader,        // 类加载器
        Class<?>[] interfaces,     // 代理类需要实现的接口
        InvocationHandler h        // 方法调用处理器
    ) throws IllegalArgumentException;

    // 判断某个类是否是代理类
    public static boolean isProxyClass(Class<?> cl);

    // 获取某个代理类的 InvocationHandler
    public static InvocationHandler getInvocationHandler(Object proxy);

    // 获取代理类的 Class 对象
    public static Class<?> getProxyClass(ClassLoader loader, Class<?>... interfaces);
}

```

3️⃣核心组件

1. **`InvocationHandler`接口**

```java
public interface InvocationHandler {
    Object invoke(Object proxy, Method method, Object[] args) throws Throwable;
}
```
- `proxy`：生成的代理对象本身（通常用得少，避免直接调用它的方法导致死循环）。

- `method`：当前调用的方法对象（`java.lang.reflect.Method`），可以获取方法名、参数类型等。

- `args`：调用方法时传进来的实参数组，如果没有参数则为 `null`。

- 返回值：**必须返回一个对象**，这个返回值会作为代理方法调用的返回值。

2. **`Proxy.newProxyInstance`方法**：这是创建代理对象的入口。
	参数说明：
	- `ClassLoader loader`：指定代理对象的类加载器，一般传 `目标类.getClass().getClassLoader()`。
	- `Class<?>[] interfaces`：代理类需要实现的接口数组
	- `InvocationHandler h`：方法调用的处理器，用来定义增强逻辑。

#### 6.2.2 实现

> *困惑点：`Object result = method.invoke(target, args);`这里是如何调用对象的方法？*
> **Java 反射调用** 的核心一行。它的作用等价于**在运行时**对 `target` 这个对象“执行一个名叫 `method` 的方法，参数是 `args`”，就像手写的：`target.foo("abc", 123);`
> ps：假设 method 代表的是接口里的 foo(String x, int y)

**调用链路（重点理解）**：调用方 → 代理对象（`$Proxy0`…）→ **`InvocationHandler.invoke`** →（你自定义的前置/后置/环绕逻辑）→ 反射调用**目标对象**方法（或你自行处理）→ 返回值/异常回传。

```java
import java.lang.reflect.*;

// 1. 定义业务接口
interface UserService {
    void addUser(String name);
    String getUser(int id);
    void deleteUser(int id);
}

// 2. 实现类
class UserServiceImpl implements UserService {
    @Override
    public void addUser(String name) {
        System.out.println("添加用户: " + name);
    }
    
    @Override
    public String getUser(int id) {
        System.out.println("获取用户: " + id);
        return "User-" + id;
    }
    
    @Override
    public void deleteUser(int id) {
        System.out.println("删除用户: " + id);
    }
}

// 3. 调用处理器
class LoggingInvocationHandler implements InvocationHandler {
    private Object target; // 被代理的目标对象
    
    public LoggingInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 前置增强
        System.out.println("=== 方法调用开始 ===");
        System.out.println("调用方法: " + method.getName());
        System.out.println("方法参数: " + java.util.Arrays.toString(args));
        long startTime = System.currentTimeMillis();
        
        try {
            // 调用目标方法
            Object result = method.invoke(target, args);
            
            // 后置增强
            long endTime = System.currentTimeMillis();
            System.out.println("方法执行成功");
            System.out.println("执行耗时: " + (endTime - startTime) + "ms");
            System.out.println("返回结果: " + result);
            System.out.println("=== 方法调用结束 ===\n");
            
            return result;
        } catch (Exception e) {
            System.out.println("方法执行异常: " + e.getMessage());
            throw e;
        }
    }
}

// 4. 测试动态代理
public class JDKProxyDemo {
    public static void main(String[] args) {
        // 创建目标对象
        UserService target = new UserServiceImpl();
        
        // 创建代理对象
        UserService proxy = (UserService) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),    // 类加载器
            target.getClass().getInterfaces(),     // 接口数组
            new LoggingInvocationHandler(target)   // 调用处理器
        );
        
        // 使用代理对象
        proxy.addUser("张三");
        String user = proxy.getUser(1);
        proxy.deleteUser(1);
        
        // 验证代理对象的类型
        System.out.println("代理对象类型: " + proxy.getClass().getName());
        System.out.println("是否为Proxy的实例: " + (proxy instanceof Proxy));
        System.out.println("实现的接口: " + java.util.Arrays.toString(proxy.getClass().getInterfaces()));
    }
}
```

**代理对象执行**：`proxy.addUser("张三")` → 代理类方法调用 → 统一进入 `InvocationHandler.invoke()` → 在 `invoke()` 里通过反射执行目标对象方法 → 返回结果并可做增强逻辑。


#### 6.2.3 JDK动态代理核心API

```java
public class ProxyAPIDemo {
    public static void demonstrateProxyAPI() {
        UserService target = new UserServiceImpl();
        
        // 1. Proxy.newProxyInstance() - 创建代理实例
        UserService proxy = (UserService) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            new Class<?>[]{UserService.class},
            new LoggingInvocationHandler(target)
        );
        
        // 2. Proxy.getProxyClass() - 获取代理类
        Class<?> proxyClass = Proxy.getProxyClass(
            UserService.class.getClassLoader(),
            UserService.class
        );
        System.out.println("代理类: " + proxyClass.getName());
        
        // 3. Proxy.isProxyClass() - 检查是否为代理类
        boolean isProxy = Proxy.isProxyClass(proxy.getClass());
        System.out.println("是否为代理类: " + isProxy);
        
        // 4. Proxy.getInvocationHandler() - 获取调用处理器
        InvocationHandler handler = Proxy.getInvocationHandler(proxy);
        System.out.println("调用处理器: " + handler.getClass().getName());
    }
}
```
#### 6.2.4 高级JDK代理应用

1️⃣通用代理工厂
```java
public class ProxyFactory {
    
    /**
     * 创建带日志功能的代理
     */
    public static <T> T createLoggingProxy(T target) {
        return createProxy(target, new LoggingInvocationHandler(target));
    }
    
    /**
     * 创建带性能监控的代理
     */
    public static <T> T createPerformanceProxy(T target) {
        return createProxy(target, new PerformanceInvocationHandler(target));
    }
    
    /**
     * 创建带事务管理的代理
     */
    public static <T> T createTransactionProxy(T target) {
        return createProxy(target, new TransactionInvocationHandler(target));
    }
    
    /**
     * 创建多重代理（支持多个增强功能）
     */
    public static <T> T createMultiProxy(T target, InvocationHandler... handlers) {
        Object proxy = target;
        
        // 逐层包装
        for (InvocationHandler handler : handlers) {
            proxy = Proxy.newProxyInstance(
                proxy.getClass().getClassLoader(),
                proxy.getClass().getInterfaces(),
                handler
            );
        }
        
        return (T) proxy;
    }
    
    /**
     * 通用代理创建方法
     */
    @SuppressWarnings("unchecked")
    private static <T> T createProxy(T target, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            handler
        );
    }
}

// 性能监控处理器
class PerformanceInvocationHandler implements InvocationHandler {
    private Object target;
    
    public PerformanceInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        long start = System.nanoTime();
        
        Object result = method.invoke(target, args);
        
        long end = System.nanoTime();
        double duration = (end - start) / 1_000_000.0; // 转换为毫秒
        
        System.out.printf("⏱️ 方法 %s 执行耗时: %.2f ms%n", method.getName(), duration);
        
        return result;
    }
}

// 事务管理处理器
class TransactionInvocationHandler implements InvocationHandler {
    private Object target;
    
    public TransactionInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 开启事务
        System.out.println("🔄 开始事务");
        
        try {
            Object result = method.invoke(target, args);
            
            // 提交事务
            System.out.println("✅ 提交事务");
            return result;
            
        } catch (Exception e) {
            // 回滚事务
            System.out.println("❌ 回滚事务");
            throw e;
        }
    }
}
```

2️⃣多层代理示例
```java
public class MultiProxyDemo {
    public static void main(String[] args) {
        // 创建目标对象
        UserService target = new UserServiceImpl();
        
        // 创建多重代理：日志 + 性能监控 + 事务管理
        UserService multiProxy = ProxyFactory.createMultiProxy(
            target,
            new LoggingInvocationHandler(target),
            new PerformanceInvocationHandler(target),
            new TransactionInvocationHandler(target)
        );
        
        System.out.println("=== 多重代理测试 ===");
        multiProxy.addUser("李四");
    }
}
```
### 6.3 CGLIB动态代理

> **CGLIB**（Code Generation Library）是一种基于 **继承** 的动态代理实现方式。  它通过 **字节码生成技术**（ASM 字节码框架）在运行时动态生成一个**目标类的子类**，并在子类中**重写目标类的方法**，从而在方法调用前后插入增强逻辑。

#### 6.3.1 与 **JDK 动态代理** 不同：

-  **JDK 动态代理**：必须有**接口**，生成的代理类实现接口。
- **CGLIB 动态代理**：不需要接口，可以直接代理普通类（但类不能是 `final`、方法不能是 `final`/`static`）。
#### 6.3.2 工作原理

CGLIB 通过 `net.sf.cglib.proxy.Enhancer` 类来创建代理对象：
1. 指定 **要代理的目标类**（不是接口）。
    
2. CGLIB 会生成一个 **目标类的子类**（字节码级别创建）。
    
3. 在子类方法中嵌入调用 **MethodInterceptor 的 intercept 方法**。
    
4. 在 **intercept 方法** 中执行前置/后置逻辑，再通过 `methodProxy.invokeSuper()` 调用父类（目标类）的真实方法。

#### 6.3.3 实现

```java
// 注意：需要添加CGLIB依赖
// <dependency>
//     <groupId>cglib</groupId>
//     <artifactId>cglib</artifactId>
//     <version>3.3.0</version>
// </dependency>

import net.sf.cglib.proxy.*;
import java.lang.reflect.Method;

// 目标类（无需实现接口）
class UserManager {
    public void addUser(String name) {
        System.out.println("UserManager: 添加用户 " + name);
    }
    
    public String getUser(int id) {
        System.out.println("UserManager: 获取用户 " + id);
        return "User-" + id;
    }
    
    // final方法无法被代理
    public final void finalMethod() {
        System.out.println("这是final方法");
    }
    
    // private方法无法被代理
    private void privateMethod() {
        System.out.println("这是private方法");
    }
}

// CGLIB方法拦截器
class UserManagerInterceptor implements MethodInterceptor {
    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        System.out.println("CGLIB前置增强: " + method.getName());
        
        // 调用父类方法（原始方法）
        Object result = proxy.invokeSuper(obj, args);
        
        System.out.println("CGLIB后置增强: " + method.getName());
        return result;
    }
}

// CGLIB代理演示
public class CGLibProxyDemo {
    public static void main(String[] args) {
        // 创建增强器
        Enhancer enhancer = new Enhancer();
        
        // 设置父类
        enhancer.setSuperclass(UserManager.class);
        
        // 设置回调
        enhancer.setCallback(new UserManagerInterceptor());
        
        // 创建代理对象
        UserManager proxy = (UserManager) enhancer.create();
        
        // 使用代理对象
        proxy.addUser("王五");
        String user = proxy.getUser(2);
        
        System.out.println("代理对象类型: " + proxy.getClass().getName());
        System.out.println("父类: " + proxy.getClass().getSuperclass().getName());
    }
}
```

#### 6.3.4 高级特性（了解即可）

```java
// 方法过滤器
class SelectiveMethodInterceptor implements MethodInterceptor {
    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        // 只代理特定方法
        if (method.getName().startsWith("add")) {
            System.out.println("拦截add方法: " + method.getName());
            Object result = proxy.invokeSuper(obj, args);
            System.out.println("add方法执行完成");
            return result;
        }
        
        // 其他方法直接执行
        return proxy.invokeSuper(obj, args);
    }
}

// 回调过滤器
class MyCallbackFilter implements CallbackFilter {
    @Override
    public int accept(Method method) {
        // 根据方法返回不同的回调索引
        if (method.getName().startsWith("add")) {
            return 0; // 使用第一个回调
        } else if (method.getName().startsWith("get")) {
            return 1; // 使用第二个回调
        }
        return 2; // 使用第三个回调（NoOp表示不代理）
    }
}

public class AdvancedCGLibDemo {
    public static void main(String[] args) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(UserManager.class);
        
        // 设置多个回调
        enhancer.setCallbacks(new Callback[]{
            new SelectiveMethodInterceptor(),           // 索引0：add方法的拦截器
            new PerformanceMethodInterceptor(),         // 索引1：get方法的拦截器
            NoOp.INSTANCE                               // 索引2：不做任何处理
        });
        
        // 设置回调过滤器
        enhancer.setCallbackFilter(new MyCallbackFilter());
        
        UserManager proxy = (UserManager) enhancer.create();
        
        proxy.addUser("赵六");    // 会被第一个拦截器处理
        proxy.getUser(3);        // 会被第二个拦截器处理
    }
}

// 性能监控拦截器
class PerformanceMethodInterceptor implements MethodInterceptor {
    @Override
    public Object intercept(Object obj, Method method, Object[] args, MethodProxy proxy) throws Throwable {
        long start = System.currentTimeMillis();
        
        Object result = proxy.invokeSuper(obj, args);
        
        long end = System.currentTimeMillis();
        System.out.println("方法 " + method.getName() + " 执行时间: " + (end - start) + "ms");
        
        return result;
    }
}
```
### 6.4 动态代理在框架中的应用

#### 6.4.1 SpringBootAOP实现

```java
// 切面注解
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface LogExecution {
    String value() default "";
}

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface Transactional {
    boolean readOnly() default false;
}

// 业务服务
class OrderService {
    @LogExecution("订单创建")
    @Transactional
    public void createOrder(String orderId) {
        System.out.println("创建订单: " + orderId);
        // 模拟可能的异常
        if (orderId.equals("ERROR")) {
            throw new RuntimeException("订单创建失败");
        }
    }
    
    @LogExecution("订单查询")
    @Transactional(readOnly = true)
    public String getOrder(String orderId) {
        System.out.println("查询订单: " + orderId);
        return "Order-" + orderId;
    }
}

// AOP代理处理器
class AOPInvocationHandler implements InvocationHandler {
    private Object target;
    
    public AOPInvocationHandler(Object target) {
        this.target = target;
    }
    
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        // 处理@LogExecution注解
        LogExecution logAnnotation = method.getAnnotation(LogExecution.class);
        if (logAnnotation != null) {
            System.out.println("📝 [LOG] 开始执行: " + logAnnotation.value());
        }
        
        // 处理@Transactional注解
        Transactional txAnnotation = method.getAnnotation(Transactional.class);
        boolean inTransaction = false;
        
        if (txAnnotation != null) {
            System.out.println("🔄 [TX] 开启事务 (只读: " + txAnnotation.readOnly() + ")");
            inTransaction = true;
        }
        
        try {
            // 执行目标方法
            Object result = method.invoke(target, args);
            
            // 事务提交
            if (inTransaction) {
                System.out.println("✅ [TX] 事务提交");
            }
            
            // 日志记录
            if (logAnnotation != null) {
                System.out.println("📝 [LOG] 执行成功: " + logAnnotation.value());
            }
            
            return result;
            
        } catch (Exception e) {
            // 事务回滚
            if (inTransaction) {
                System.out.println("❌ [TX] 事务回滚");
            }
            
            // 错误日志
            if (logAnnotation != null) {
                System.out.println("📝 [LOG] 执行失败: " + logAnnotation.value() + " - " + e.getCause().getMessage());
            }
            
            throw e;
        }
    }
}

// 简化版IoC容器
class SimpleContainer {
    public static <T> T getBean(Class<T> clazz) {
        try {
            T target = clazz.getDeclaredConstructor().newInstance();
            
            // 检查是否需要AOP增强
            boolean needAOP = hasAOPAnnotations(clazz);
            
            if (needAOP) {
                // 返回代理对象
                return createAOPProxy(target);
            }
            
            return target;
        } catch (Exception e) {
            throw new RuntimeException("创建Bean失败", e);
        }
    }
    
    private static boolean hasAOPAnnotations(Class<?> clazz) {
        for (Method method : clazz.getDeclaredMethods()) {
            if (method.isAnnotationPresent(LogExecution.class) || 
                method.isAnnotationPresent(Transactional.class)) {
                return true;
            }
        }
        return false;
    }
    
    @SuppressWarnings("unchecked")
    private static <T> T createAOPProxy(T target) {
        // 这里简化处理，实际Spring会根据情况选择JDK或CGLIB
        return (T) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces().length > 0 ? 
                target.getClass().getInterfaces() : 
                new Class[]{target.getClass()},
            new AOPInvocationHandler(target)
        );
    }
}

// 测试简化版AOP
public class SimpleAOPDemo {
    public static void main(String[] args) {
        OrderService orderService = SimpleContainer.getBean(OrderService.class);
        
        System.out.println("=== 正常订单创建 ===");
        orderService.createOrder("ORDER001");
        
        System.out.println("\n=== 订单查询 ===");
        String order = orderService.getOrder("ORDER001");
        
        System.out.println("\n=== 异常订单创建 ===");
        try {
            orderService.createOrder("ERROR");
        } catch (Exception e) {
            System.out.println("捕获异常: " + e.getCause().getMessage());
        }
    }
}
```