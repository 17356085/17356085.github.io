---
title: Java泛型的设计和使用
published: 2025-08-20
updated: 2025-08-20
description: API响应会涉及到泛型类的设计……
author: mio
tags:
  - 项目学习
  - 后端开发
  - Java
category: 后端
draft: true
---

> 泛型的核心思想是参数化类型，即**将类型作为参数传递**。这样可以创建能够处理多种数据类型的类、接口和方法，同时保持类型安全。

## 1. 基本语法

1️⃣ 泛型类
```java
public class Box<T> {
    private T content;
    
    public void set(T content) {
        this.content = content;
    }
    
    public T get() {
        return content;
    }
}

// 使用
Box<String> stringBox = new Box<>();
stringBox.set("Hello");
String value = stringBox.get();
```

2️⃣ 泛型接口
```java
public interface Comparable<T> {
    int compareTo(T other);
}

public class Person implements Comparable<Person> {
    private String name;
    
    @Override
    public int compareTo(Person other) {
        return this.name.compareTo(other.name);
    }
}
```

3️⃣ 泛型方法
```java
public class Utility {
    public static <T> void swap(T[] array, int i, int j) {
        T temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

// 使用
String[] names = {"Alice", "Bob", "Charlie"};
Utility.swap(names, 0, 2);
```

## 2. 泛型有什么用？

1️⃣类型安全
```java
// 没有泛型的情况 - 容易出错
List list = new ArrayList();
list.add("Hello");
list.add(123);
String str = (String) list.get(1); // 运行时ClassCastException!

// 使用泛型 - 编译时检查
List<String> stringList = new ArrayList<>();
stringList.add("Hello");
// stringList.add(123); // 编译错误！
String str = stringList.get(0); // 不需要强制转换
```

2️⃣消除强制类型转换
```java
// 泛型前
Map map = new HashMap();
map.put("name", "张三");
String name = (String) map.get("name"); // 需要强制转换

// 泛型后
Map<String, String> userMap = new HashMap<>();
userMap.put("name", "张三");
String name = userMap.get("name"); // 直接获取，无需转换
```

3️⃣ 更好的代码重用性
```java
// 一个泛型类可以处理多种类型
Box<Integer> intBox = new Box<>();
Box<String> stringBox = new Box<>();
Box<Person> personBox = new Box<>();
```
## 3. 通配符

> 为什么要把通配符设计成‘上下无’这三种？有什么实际意义吗？
> 答：三种通配符的设计其实解决了泛型中的一个核心问题：**如何在保证类型安全的前提下，实现灵活的类型关系**。

### 3.1 通配符的设计（核心问题：泛型的不变性）

首先要理解一个重要概念：Java的泛型默认是**不变的**（invariant）：
```java
List<Object> objectList = new ArrayList<String>(); // 编译错误！

// 即使 String 是 Object 的子类，
// List<String> 也不是 List<Object> 的子类

// 假如java中容许下面这样赋值
// List<String> strList = new ArrayList<>(); 
// List<Object> objList = strList;
// `strList` 指向的容器里本该只放 `String`，结果里面混进了 `Integer`，
// 一旦取出就会导致ClassCastException。这就破坏了泛型的编译期类型安全保证。
// objList.add(123); 
```

1️⃣ 上界通配符`<? extends T`-解决“协变”需求

**场景**：我想读取数据，但我不关心具体是哪个类
```java
// 没有通配符的问题
public static double sumNumbers(List<Number> numbers) {
    return numbers.stream().mapToDouble(Number::doubleValue).sum();
}

// 这样调用会出错：
List<Integer> integers = Arrays.asList(1, 2, 3);
// sumNumbers(integers); // 编译错误！List<Integer> 不是 List<Number>

// 使用上界通配符解决：
public static double sumNumbers(List<? extends Number> numbers) {
    return numbers.stream().mapToDouble(Number::doubleValue).sum();
}

// 现在可以接受Number的任何子类：
List<Integer> integers = Arrays.asList(1, 2, 3);
List<Double> doubles = Arrays.asList(1.1, 2.2, 3.3);
List<BigDecimal> decimals = Arrays.asList(new BigDecimal("1"), new BigDecimal("2"));

sumNumbers(integers);  // ✓ 正常工作
sumNumbers(doubles);   // ✓ 正常工作  
sumNumbers(decimals);  // ✓ 正常工作
```

> 为什么只能读不能写？

```java
List<? extends Number> numbers = new ArrayList<Integer>();

// 读取是安全的 - 我们知道取出的一定是Number或其子类
Number num = numbers.get(0); // ✓ 安全

// 写入是危险的 - 我们不知道具体是什么子类型
// numbers.add(3.14); // ✗ 如果实际是List<Integer>，加入Double就出错了
// numbers.add(new BigDecimal("1")); // ✗ 同样的问题
```
> 为什么用 `? extends Number` 就能接受？

 这是一个“元素类型是 Number 或其子类”的 List，但具体是哪种子类，编译器**不知道**。于是你可以安全地 **读取** 元素（它们至少是 `Number`），但不能随便 **写入**。因为写入时，编译器没法确定你放的类型和 List 实际持有的类型是否兼容。
 

2️⃣ 下界通配符 `? super T` - 解决"逆变"需求

**场景**：我想写入数据，但希望能写入到更通用的容器中
```java
// 添加整数到容器中
public static void addIntegers(List<? super Integer> list) {
    list.add(1);
    list.add(2);
    list.add(3);
    // 我们知道容器至少可以装Integer，所以添加Integer是安全的
}

// 可以传入Integer的父类型容器：
List<Integer> intList = new ArrayList<>();
List<Number> numberList = new ArrayList<>();
List<Object> objectList = new ArrayList<>();

addIntegers(intList);    // ✓ 直接匹配
addIntegers(numberList); // ✓ Number是Integer的父类
addIntegers(objectList); // ✓ Object是Integer的父类

// 但不能传入子类或兄弟类：
// List<Double> doubleList = new ArrayList<>();
// addIntegers(doubleList); // ✗ Double不是Integer的父类
```
> 为什么能写但读取受限？
```java
List<? super Integer> list = new ArrayList<Number>();

// 写入是安全的 - 我们知道容器至少能装Integer
list.add(42); // ✓ 安全
list.add(new Integer(100)); // ✓ 安全

// 读取受限 - 我们不知道容器的确切类型
Object obj = list.get(0); // ✓ 只能作为Object读取
// Integer i = list.get(0); // ✗ 不安全，容器可能是List<Object>
```

3️⃣ 无界通配符`?` - 解决"我不关心类型"的需求

**场景**：只使用容器的通用操作，不涉及具体元素
```java
// 比较两个集合的大小
public static int compareSize(Collection<?> c1, Collection<?> c2) {
    return Integer.compare(c1.size(), c2.size());
    // 不需要知道具体类型，只用Collection的基本方法
}

// 清空任何类型的集合
public static void clearCollection(Collection<?> collection) {
    collection.clear(); // 清空操作与具体类型无关
}
```

### 3.2 PECS原则：Producer Extends, Consumer Super

```java
public class Collections {
    
    // Producer场景：从source读取数据，所以用extends
    public static <T> void copy(List<? super T> dest, List<? extends T> src) {
        for (int i = 0; i < src.size(); i++) {
            dest.set(i, src.get(i));
        }
    }
    
    // src是生产者(Producer) - 提供数据，用extends
    // dest是消费者(Consumer) - 接收数据，用super
}

// 实际使用：
List<Number> numbers = new ArrayList<>();
List<Integer> integers = Arrays.asList(1, 2, 3);

Collections.copy(numbers, integers); // ✓ 将Integer复制到Number容器中
```

### 3.3 实际应用：集合框架

```java
// Java集合框架中的实际例子

// 1. addAll方法 - Consumer场景，用super
public boolean addAll(Collection<? extends E> c);

// 2. Comparator接口 - Producer场景，用extends  
public static <T> void sort(List<T> list, Comparator<? super T> c);

// 3. 通用工具方法 - 不关心类型，用无界
public static void shuffle(List<?> list);
public static void reverse(List<?> list);
```

## 4. 泛型在实际开发中的应用

1️⃣ 集合框架
```java
// 用户列表
List<User> users = new ArrayList<>();
users.add(new User("张三", 25));
users.add(new User("李四", 30));

// 配置映射
Map<String, String> config = new HashMap<>();
config.put("database.url", "jdbc:mysql://localhost:3306/test");
config.put("database.username", "root");

// 响应结果
Set<Long> processedIds = new HashSet<>();
processedIds.add(1001L);
processedIds.add(1002L);
```

2️⃣ API响应封装
```java
// 通用响应类
public class ApiResponse<T> {
    private int code;
    private String message;
    private T data;
    
    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.code = 200;
        response.message = "成功";
        response.data = data;
        return response;
    }
    
    public static <T> ApiResponse<T> error(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.code = 500;
        response.message = message;
        return response;
    }
    
    // getter/setter...
}

// 使用示例
@RestController
public class UserController {
    
    @GetMapping("/user/{id}")
    public ApiResponse<User> getUser(@PathVariable Long id) {
        User user = userService.findById(id);
        return ApiResponse.success(user);
    }
    
    @GetMapping("/users")
    public ApiResponse<List<User>> getUsers() {
        List<User> users = userService.findAll();
        return ApiResponse.success(users);
    }
}
```

3️⃣ DAO层泛型基类
```java
// 通用DAO接口
public interface BaseDao<T, ID> {
    T save(T entity);
    T findById(ID id);
    List<T> findAll();
    void deleteById(ID id);
    List<T> findByExample(T example);
}

// 具体实现
@Repository
public class UserDao implements BaseDao<User, Long> {
    
    @Override
    public User save(User user) {
        // 保存逻辑
        return entityManager.merge(user);
    }
    
    @Override
    public User findById(Long id) {
        return entityManager.find(User.class, id);
    }
    
    // 其他方法实现...
}

// Service层使用
@Service
public class UserService {
    @Autowired
    private UserDao userDao;
    
    public User createUser(User user) {
        return userDao.save(user);
    }
}
```

## 5. 实际业务场景

1️⃣ 分页查询结果

```java
public class PageResult<T> {
    private List<T> data;        // 当前页数据
    private long total;          // 总记录数
    private int page;            // 当前页码
    private int size;            // 每页大小
    private int totalPages;      // 总页数
    
    public PageResult(List<T> data, long total, int page, int size) {
        this.data = data;
        this.total = total;
        this.page = page;
        this.size = size;
        this.totalPages = (int) Math.ceil((double) total / size);
    }
    
    // getter/setter...
}

// 使用示例
@Service
public class ProductService {
    
    public PageResult<Product> getProducts(int page, int size) {
        List<Product> products = productDao.findByPage(page, size);
        long total = productDao.count();
        return new PageResult<>(products, total, page, size);
    }
}
```

2️⃣ Builder模式与泛型
```java
public class QueryBuilder<T> {
    private StringBuilder sql = new StringBuilder();
    private List<Object> parameters = new ArrayList<>();
    
    public QueryBuilder<T> select(String fields) {
        sql.append("SELECT ").append(fields);
        return this;
    }
    
    public QueryBuilder<T> from(String table) {
        sql.append(" FROM ").append(table);
        return this;
    }
    
    public QueryBuilder<T> where(String condition, Object value) {
        sql.append(" WHERE ").append(condition);
        parameters.add(value);
        return this;
    }
    
    public QueryBuilder<T> and(String condition, Object value) {
        sql.append(" AND ").append(condition);
        parameters.add(value);
        return this;
    }
    
    public String build() {
        return sql.toString();
    }
    
    public List<Object> getParameters() {
        return parameters;
    }
}

// 使用示例
QueryBuilder<User> userQuery = new QueryBuilder<User>()
    .select("*")
    .from("users")
    .where("age > ?", 18)
    .and("status = ?", "ACTIVE");

String sql = userQuery.build();
List<Object> params = userQuery.getParameters();
```
