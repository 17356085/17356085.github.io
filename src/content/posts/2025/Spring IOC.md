---
title: Spring IOC
published: 2025-08-20
updated: 2025-08-20
description: Spring IOC
author: mio
tags:
  - Spring框架
  - 项目学习
category: 后端
---
> Spring IOC（Inversion of Control，**控制反转**），也被称为依赖注入（Dependency Injection，DI）。
> **核心概念**：**控制反转**将对象的创建、依赖关系的管理等（例如对象的创建、维护权）控制权从应用程序代码转移给外部容器（Spring容器）的设计模式。

## 1. 依赖注入

依赖注入用于实现对象之间的解耦。通过依赖注入，对象不在自己创建或查找依赖对象，而是由外部容器负责将依赖的对象注入进来。
```java
// UserDao
public class UserDao {

    public void insert(){
        System.out.println("正在保存用户数据。");
    }
}


// UserService
public class UserService {

    private UserDao userDao;
    
    // 使用构造器注入，必须提供构造方法
    public UserService(UserDao userDao) {
	    this.userDao = userDao;
    } 
    
    // 使用set方式注入，必须提供set方法。
    // 反射机制要调用这个方法给属性赋值的。
    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }

    public void save(){
        userDao.insert();
    }
}
```
在Spring中依赖注入主要有以下三种方式：

1️⃣ 构造器注入
```xml
<bean id="userDaoBean" class="com.powernode.spring6.dao.UserDao"/>
<bean id="userServiceBean" class="com.powernode.spring6.service.UserService">
  <!--index="0"表示构造方法的第一个参数，将userDaoBean对象传递给构造方法的第一个参数。-->
  <constructor-arg index="0" ref="userDaoBean"/>
</bean>
```

2️⃣ setter注入

**实现原理**
- 通过property标签获取到属性名：userDao
- 通过属性名推断出set方法名：setUserDao
- 通过反射机制调用setUserDao()方法给属性赋值
- property标签的name是属性名。
- property标签的ref是要注入的bean对象的id。**(通过ref属性来完成bean的装配，这是bean最简单的一种装配方式。装配指的是：创建系统组件之间关联的动作)**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="userDaoBean" class="com.powernode.spring6.dao.UserDao"/>

    <bean id="userServiceBean" class="com.powernode.spring6.service.UserService">
        <property name="userDao" ref="userDaoBean"/>
    </bean>

</beans>
```

3️⃣ 字段注入
```java
public class UserService {
	
	@Autowired
    private UserDao userDao;
    
    // 使用构造器注入，必须提供构造方法
    public UserService(UserDao userDao) {
	    this.userDao = userDao;
    } 
    
    // 使用set方式注入，必须提供set方法。
    // 反射机制要调用这个方法给属性赋值的。
    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }

    public void save(){
        userDao.insert();
    }
}
```

## 2. Bean

> Bean是由Spring IOC容器管理的对象，构成应用程序骨干并由Spring IOC容器管理的对象。Bean是一个被思力华、组装和管理的对象

### 2.1 配置方式

1️⃣ XML配置
```xml
<bean id="userService" class="com.example.UserService">
    <property name="userDao" ref="userDao"/>
</bean>
```

2️⃣ 注解配置
```java
@Component
@Service
@Repository
@Controller
```

3️⃣ Java配置类
```java
@Configuration
public class AppConfig {
    @Bean
    public UserService userService() {
        return new UserService();
    }
}
```

### 2.2 Bean的作用域

> 你可以通过在bean标签中指定scope属性值的方式，指定Bean的作用范围。

**scope属性**：
- **singleton**（默认）：每个IoC容器只有一个Bean实例。
- **prototype**：每次获取都创建新实例。
- **request**：Web环境下，每个HTTP请求一个实例。
- **session**：Web环境下，每个HTTP Session一个实例。
- **application**：Web环境下，每个ServletContext一个实例。
- **websocket**：一个websocket生命周期对应一个Bean。
- **global session**：**portlet应用中专用的**。如果在Servlet的WEB应用中使用global session的话，和session一个效果。（portlet和servlet都是规范。servlet运行在servlet容器中，例如Tomcat。portlet运行在portlet容器中。）
- 自定义scope：了解即可
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="sb" class="com.powernode.spring6.beans.SpringBean" scope="prototype" />

</beans>
```

### 2.3 Bean的生命周期

> Bean生命周期可大致分为如下七步：
> 1. 实例化：容器创建Bean实例子
> 2. Bean属性注入：设置Bean的属性值和依赖
> 3. *初始化前处理：BeanPostProcessor.postProcessBeforeInitialization()*
> 4. 初始化：调用初始化方法（@PostConstruct或init-method）
> 5. *初始化后处理：BeanPostProcessor.postProcessAfterInitialization()*
> 6. 使用：Bean可以被应用程序使用
> 7. 销毁：容器关闭是调用销毁方法（@PreDestroy或destroy-method）
> 
> **注意**：如果你还想在初始化前和初始化后添加代码，可以加入“Bean后处理器”。 编写一个类实现BeanPostProcessor类，并且重写before和after方法：

![Spring IOC 容器示意图](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-01.png)
#### 2.3.1 代码示例
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">

    <!--
    init-method属性指定初始化方法。
    destroy-method属性指定销毁方法。
    -->
    <bean id="userBean" class="com.powernode.spring6.bean.User" init-method="initBean" destroy-method="destroyBean">
        <property name="name" value="zhangsan"/>
    </bean>

</beans>
```

```java
package com.powernode.spring6.bean;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;

/**
 * @author 动力节点
 * @version 1.0
 * @className LogBeanPostProcessor
 * @since 1.0
 **/
public class LogBeanPostProcessor implements BeanPostProcessor {
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("Bean后处理器的before方法执行，即将开始初始化");
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("Bean后处理器的after方法执行，已完成初始化");
        return bean;
    }
}
```
**一定要注意，在Spring.xml文件中配置的Bean后处理器将作用于所有的Bean。**
```xml
<!--配置Bean后处理器。这个后处理器将作用于当前配置文件中所有的bean。-->
<bean class="com.powernode.spring6.bean.LogBeanPostProcessor"/>
```

#### 2.3.2 Bean生命周期的“十步”
![Spring Bean 生命周期](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-02.png)Aware相关的接口包括：BeanNameAware、BeanClassLoaderAware、BeanFactoryAware

- 当Bean实现了BeanNameAware，Spring会将Bean的名字传递给Bean。    
- 当Bean实现了BeanClassLoaderAware，Spring会将加载该Bean的类加载器传递给Bean。
- 当Bean实现了BeanFactoryAware，Spring会将Bean工厂对象传递给Bean。

可以让User类实现五个接口，并实现所有方法：

- BeanNameAware
- BeanClassLoaderAware
- BeanFactoryAware
- InitializingBean
- DisposableBean

示例代码
```java
package com.powernode.spring6.bean;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.*;

public class User implements BeanNameAware, BeanClassLoaderAware, BeanFactoryAware, InitializingBean, DisposableBean {
    private String name;

    public User() {
        System.out.println("1.实例化Bean");
    }

    public void setName(String name) {
        this.name = name;
        System.out.println("2.Bean属性赋值");
    }

    public void initBean(){
        System.out.println("6.初始化Bean");
    }

    public void destroyBean(){
        System.out.println("10.销毁Bean");
    }

    @Override
    public void setBeanClassLoader(ClassLoader classLoader) {
        System.out.println("3.类加载器：" + classLoader);
    }

    @Override
    public void setBeanFactory(BeanFactory beanFactory) throws BeansException {
        System.out.println("3.Bean工厂：" + beanFactory);
    }

    @Override
    public void setBeanName(String name) {
        System.out.println("3.bean名字：" + name);
    }

    @Override
    public void destroy() throws Exception {
        System.out.println("9.DisposableBean destroy");
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        System.out.println("5.afterPropertiesSet执行");
    }
}
```

```java
package com.powernode.spring6.bean;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;

public class LogBeanPostProcessor implements BeanPostProcessor {
    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("4.Bean后处理器的before方法执行，即将开始初始化");
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        System.out.println("7.Bean后处理器的after方法执行，已完成初始化");
        return bean;
    }
}

```

### 2.4 Bean的循环依赖问题

#### 2.4.1 什么是循环依赖？

在实例化 A 时需要先创建 B，而在创建 B 时又需要 A，于是无限递归，无法完成。
![Spring 依赖注入流程](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-03.png)
#### 2.4.2 为什么会出现循环依赖问题？

1. **设计不合理的对象关系**  
    例如两个类职责不清，互相调用彼此的服务，而不是通过中间层解耦。
 2.  **过度使用 @Autowired**  
    无论是字段注入还是构造函数注入，如果没有注意对象间的依赖方向，很容易不小心就写成了环。
 3. **层次划分不够清晰**
	比如 Controller → Service → DAO 的分层模式中，Service A 调用 Service B，而 Service B 又反过来调用 Service A。

#### 2.4.3 如何解决循环依赖问题

采用**set注入+singleton模式**可有效解决循环依赖问题，示例代码
```java
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd">

    <bean id="husbandBean" class="com.powernode.spring6.bean.Husband" scope="singleton">
        <property name="name" value="张三"/>
        <property name="wife" ref="wifeBean"/>
    </bean>
    <bean id="wifeBean" class="com.powernode.spring6.bean.Wife" scope="singleton">
        <property name="name" value="小花"/>
        <property name="husband" ref="husbandBean"/>
    </bean>
</beans>
```

**原理**：

这种方式可以做到将“实例化Bean”和“给Bean属性赋值”这两个动作分开去完成。 实例化Bean的时候：调用无参数构造方法来完成。**此时可以先不给属性赋值，可以提前将该Bean对象“曝光”给外界。**

给Bean属性赋值的时候：调用setter方法来完成。 

两个步骤是完全可以分离开去完成的，并且这两步不要求在同一个时间点上完成。 也就是说，Bean都是单例的，我们可以先把所有的单例Bean实例化出来，放到一个集合当中（我们可以称之为缓存），所有的单例Bean全部实例化完成之后，以后我们再慢慢的调用setter方法给属性赋值。这样就解决了循环依赖的问题。

**Spring框架底层实现：**
![Spring BeanFactory 结构](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-04.png)
在以上类中包含三个重要的属性： _

1. **Cache of singleton objects: bean name to bean instance.**_ **单例对象的缓存：key存储bean名称，value存储Bean对象【一级缓存】**
2. **Cache of early singleton objects: bean name to bean instance.**_ **早期单例对象的缓存：key存储bean名称，value存储早期的Bean对象【二级缓存】
3. ** _**Cache of singleton factories: bean name to ObjectFactory.**_ **单例工厂缓存：key存储bean名称，value存储该Bean对应的ObjectFactory对象【三级缓存】** 这三个缓存其实本质上是三个Map集合。

这三个缓存本质上是三个Map集合。
我们再来看，在该类中有这样一个方法addSingletonFactory()，这个方法的作用是：将创建Bean对象的ObjectFactory对象提前曝光。

![Spring ApplicationContext 结构](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-05.png)
再分析下面的源码
![Spring IOC 组件关系](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-ioc/ioc-06.png)
从源码中可以看到，spring会先从一级缓存中获取Bean，如果获取不到，则从二级缓存中获取Bean，如果二级缓存还是获取不到，则从三级缓存中获取之前曝光的ObjectFactory对象，通过ObjectFactory对象获取Bean实例，这样就解决了循环依赖的问题。 

**总结：** 
**Spring只能解决setter方法注入的单例bean之间的循环依赖。ClassA依赖ClassB，ClassB又依赖ClassA，形成依赖闭环。Spring在创建ClassA对象后，不需要等给属性赋值，直接将其曝光到bean缓存当中。在解析ClassA的属性时，又发现依赖于ClassB，再次去获取ClassB，当解析ClassB的属性时，又发现需要ClassA的属性，但此时的ClassA已经被提前曝光加入了正在创建的bean的缓存中，则无需创建新的的ClassA的实例，直接从缓存中获取即可。从而解决循环依赖问题。**

## 3. Spring IOC注解式开发

负责声明Bean的注解，常见的有：

**@Component**
```java
@Target(value = {ElementType.TYPE})
@Retention(value = RetentionPolicy.RUNTIME)
public @interface Component {
    String value();
}
```

**@Controller**
```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component
public @interface Controller {
    @AliasFor(
        annotation = Component.class
    )
    String value() default "";
}
```

**@Service**
```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component
public @interface Service {
    @AliasFor(
        annotation = Component.class
    )
    String value() default "";
}
```

**@Repository**
```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Component
public @interface Repository {
    @AliasFor(
        annotation = Component.class
    )
    String value() default "";
}
```

通过上述源码，我们可以知道@Controller、@Service、@Repository这三个注解都是@Component注解的别名。为了程序的可读性，建议：

- 控制器类上使用：Controller    
- service类上使用：Service
- dao类上使用：Repository

### 3.1 在Spring中使用注解
```xml
<!-- 在配置文件中添加context命名空间 -->
<!-- 配置文件中指定要扫描的包 -->
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">
    <context:component-scan base-package="com.powernode.spring6.bean"/>
</beans>
```
```java
// 在Bean类上使用注解
@Component(value = "userBean")
public class User {
}
```

### 3.2 选择性实例化Bean

- use-default-filters="true" 表示：使用spring默认的规则，只要有Component、Controller、Service、Repository中的任意一个注解标注，则进行实例化。
- **use-default-filters="false"** 表示：不再spring默认实例化规则，即使有Component、Controller、Service、Repository这些注解标注，也不再实例化。
- <context:include-filter type="annotation" expression="org.springframework.stereotype.Controller"/> 表示只有Controller进行实例化。
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">

    <context:component-scan base-package="com.powernode.spring6.bean3" use-default-filters="false">
        <context:include-filter type="annotation" expression="org.springframework.stereotype.Controller"/>
    </context:component-scan>
    
</beans>
```

### 3.3 负责注入的注解

1️⃣ **@Value**：当属性是简单类型时可使用
```xml
<!-- 不要忘记打开包扫描 -->
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd">
    <context:component-scan base-package="com.powernode.spring6.bean4"/>
</beans>
```
```java
@toString
@Commponent
public class User {
    @Value(value = "zhangsan")
    private String name;
    @Value("20")
    private int age;
}
```

2️⃣ **@Autowired**：可以用来注入非简单类型，单独使用@Autowrite注解时，默认根据类型装配
源码：
```java
@Target({ElementType.CONSTRUCTOR, ElementType.METHOD, ElementType.PARAMETER, ElementType.FIELD, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Autowired {
	/* required属性值默认为true，表示注入的Bean必须存在，否则报错
	 * required属性值为false时，表示注入Bean存不存在都不会报错，存在则注入，不存在也不报错
	 */
	boolean required() default true;
}
```

3️⃣ **@Qualifier**：@Autowired注解和@Qualifier注解联合起来才可以根据名称进行装配，在@Qualifier注解中指定Bean名称。
```java
/*
 * UserDao的子类
 */

@Repository // 这里没有给bean起名，默认名字是：userDaoForOracle
public class UserDaoForOracle implements UserDao{
    @Override
    public void insert() {
        System.out.println("正在向Oracle数据库插入User数据");
    }
}

/*
 * UserService
 */
@Service
public class UserService {

    private UserDao userDao;

    @Autowired
    @Qualifier("userDaoForOracle") // 这个是bean的名字。
    public void setUserDao(UserDao userDao) {
        this.userDao = userDao;
    }

    public void save(){
        userDao.insert();
    }
}
```

4️⃣ **@Resource**：与@Autowired一样可用于完成非简单类型的注解，两者之间的差异
- @Resource注解是JDK的一部分，@Autowired注解是Spring框架，前者比后者更具有通用性
- **@Resource注解默认根据名称装配byName，未指定name时，使用属性名作为name。通过name找不到的话会自动启动通过类型byType装配。**；@Autowired注解默认根据类型装配byType，如果想根据名称装配，需要配合@Qualifier注解一起用。
- @Resource注解用在属性、setter方法上；@Autowrite注解用在属性、setter方法、构造方法、构造方法参数上。

## 4. 全注解开发

使用注解代替配置文件
```java
@Configuration
@ComponentScan({"com.powernode.spring6.dao", "com.powernode.spring6.service"})
public class Spring6Configuration {
}
```

编写测试程序：不在new ClassPathXmlApplicationContext()对象
```java
@Test
public void testNoXml(){
    ApplicationContext applicationContext = new AnnotationConfigApplicationContext(Spring6Configuration.class);
    UserService userService = applicationContext.getBean("userService", UserService.class);
    userService.save();
}
```

## 4. Spring IoC容器底层实现原理

### 4.1 核心架构设计

#### 容器接口层次结构

```java
BeanFactory (顶层接口)
    ├── ListableBeanFactory (可列举Bean)
    ├── HierarchicalBeanFactory (分层Bean工厂)
    ├── ConfigurableBeanFactory (可配置Bean工厂)
    └── ApplicationContext (应用上下文)
            ├── ConfigurableApplicationContext
            └── AbstractApplicationContext (抽象实现)
```

**核心接口职责：**

- `BeanFactory`：基础容器，定义了getBean()等基本方法
- `ApplicationContext`：高级容器，提供事件发布、国际化等企业功能
- `ConfigurableApplicationContext`：可配置的应用上下文

### 4.2 底层实现机制

#### 4.2.1 Bean定义注册机制

**BeanDefinition数据结构**

```java
public class GenericBeanDefinition implements BeanDefinition {
    private String beanClassName;           // Bean类名
    private String scope = SCOPE_SINGLETON; // 作用域
    private boolean lazyInit = false;       // 是否懒加载
    private ConstructorArgumentValues constructorArgumentValues; // 构造参数
    private MutablePropertyValues propertyValues; // 属性值
    private String initMethodName;          // 初始化方法
    private String destroyMethodName;       // 销毁方法
}
```

**注册流程**

```java
// DefaultListableBeanFactory核心注册方法
public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition) {
    // 1. 验证BeanDefinition
    if (beanDefinition instanceof AbstractBeanDefinition) {
        ((AbstractBeanDefinition) beanDefinition).validate();
    }
    
    // 2. 检查是否已存在
    BeanDefinition existingDefinition = this.beanDefinitionMap.get(beanName);
    if (existingDefinition != null) {
        // 处理覆盖逻辑
    }
    
    // 3. 注册到容器
    this.beanDefinitionMap.put(beanName, beanDefinition);
    this.beanDefinitionNames.add(beanName);
}
```

#### 4.2.2 Bean实例化核心流程

**AbstractAutowireCapableBeanFactory.createBean()方法**

```java
protected Object createBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    // 1. 解析Bean类型
    Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
    
    // 2. 准备方法覆盖
    mbd.prepareMethodOverrides();
    
    // 3. 给BeanPostProcessor机会返回代理对象
    Object bean = resolveBeforeInstantiation(beanName, mbd);
    if (bean != null) {
        return bean;
    }
    
    // 4. 实际创建Bean
    Object beanInstance = doCreateBean(beanName, mbd, args);
    return beanInstance;
}
```

**doCreateBean()详细实现**

```java
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    BeanWrapper instanceWrapper = null;
    
    // 1. 创建Bean实例
    if (mbd.isSingleton()) {
        instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
    }
    if (instanceWrapper == null) {
        instanceWrapper = createBeanInstance(beanName, mbd, args);
    }
    
    Object bean = instanceWrapper.getWrappedInstance();
    
    // 2. 解决循环依赖 - 提前暴露Bean
    boolean earlySingletonExposure = (mbd.isSingleton() && 
        this.allowCircularReferences && isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }
    
    // 3. 填充属性（依赖注入）
    populateBean(beanName, mbd, instanceWrapper);
    
    // 4. 初始化Bean
    Object exposedObject = initializeBean(beanName, bean, mbd);
    
    return exposedObject;
}
```

#### 4.2.3 三级缓存解决循环依赖

**DefaultSingletonBeanRegistry缓存结构**

```java
public class DefaultSingletonBeanRegistry {
    // 一级缓存：完成初始化的单例Bean
    private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);
    
    // 二级缓存：完成实例化但未完成初始化的Bean
    private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);
    
    // 三级缓存：Bean工厂对象，用于解决循环依赖
    private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
    
    // 正在创建的Bean名称
    private final Set<String> singletonsCurrentlyInCreation = 
        Collections.newSetFromMap(new ConcurrentHashMap<>(16));
}
```

**获取单例Bean流程**

```java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 1. 从一级缓存获取
    Object singletonObject = this.singletonObjects.get(beanName);
    
    // 2. 一级缓存没有且正在创建中
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 从二级缓存获取
        singletonObject = this.earlySingletonObjects.get(beanName);
        
        // 3. 二级缓存也没有且允许早期引用
        if (singletonObject == null && allowEarlyReference) {
            synchronized (this.singletonObjects) {
                // 双重检查
                singletonObject = this.singletonObjects.get(beanName);
                if (singletonObject == null) {
                    singletonObject = this.earlySingletonObjects.get(beanName);
                    if (singletonObject == null) {
                        // 4. 从三级缓存获取ObjectFactory
                        ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                        if (singletonFactory != null) {
                            singletonObject = singletonFactory.getObject();
                            // 移到二级缓存
                            this.earlySingletonObjects.put(beanName, singletonObject);
                            this.singletonFactories.remove(beanName);
                        }
                    }
                }
            }
        }
    }
    return singletonObject;
}
```

#### 4.2.4. 依赖注入实现机制

**AutowiredAnnotationBeanPostProcessor核心逻辑**

```java
public PropertyValues postProcessPropertyValues(PropertyValues pvs, 
    PropertyDescriptor[] pds, Object bean, String beanName) {
    
    // 1. 查找需要注入的元数据
    InjectionMetadata metadata = findAutowiringMetadata(beanName, bean.getClass(), pvs);
    
    // 2. 执行注入
    metadata.inject(bean, beanName, pvs);
    return pvs;
}

// 字段注入实现
private class AutowiredFieldElement extends InjectionMetadata.InjectedElement {
    protected void inject(Object bean, String beanName, PropertyValues pvs) {
        Field field = (Field) this.member;
        Object value;
        
        // 解析依赖
        DependencyDescriptor desc = new DependencyDescriptor(field, this.required);
        value = beanFactory.resolveDependency(desc, beanName, autowiredBeanNames, typeConverter);
        
        // 反射设置字段值
        if (value != null) {
            ReflectionUtils.makeAccessible(field);
            field.set(bean, value);
        }
    }
}
```

#### 4.2.5 Bean生命周期管理

**AbstractAutowireCapableBeanFactory.initializeBean()方法**

```java
protected Object initializeBean(String beanName, Object bean, RootBeanDefinition mbd) {
    // 1. 调用Aware接口方法
    if (System.getSecurityManager() != null) {
        AccessController.doPrivileged(() -> {
            invokeAwareMethods(beanName, bean);
            return null;
        });
    } else {
        invokeAwareMethods(beanName, bean);
    }
    
    Object wrappedBean = bean;
    if (mbd == null || !mbd.isSynthetic()) {
        // 2. 调用BeanPostProcessor的postProcessBeforeInitialization
        wrappedBean = applyBeanPostProcessorsBeforeInitialization(wrappedBean, beanName);
    }
    
    // 3. 调用初始化方法
    invokeInitMethods(beanName, wrappedBean, mbd);
    
    if (mbd == null || !mbd.isSynthetic()) {
        // 4. 调用BeanPostProcessor的postProcessAfterInitialization
        wrappedBean = applyBeanPostProcessorsAfterInitialization(wrappedBean, beanName);
    }
    
    return wrappedBean;
}
```

#### 4.2.6 容器启动流程

**AbstractApplicationContext.refresh()方法**

```java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // 1. 准备刷新上下文
        prepareRefresh();
        
        // 2. 获取BeanFactory
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        
        // 3. 准备BeanFactory
        prepareBeanFactory(beanFactory);
        
        try {
            // 4. 允许子类对BeanFactory进行后处理
            postProcessBeanFactory(beanFactory);
            
            // 5. 调用BeanFactoryPostProcessor
            invokeBeanFactoryPostProcessors(beanFactory);
            
            // 6. 注册BeanPostProcessor
            registerBeanPostProcessors(beanFactory);
            
            // 7. 初始化MessageSource
            initMessageSource();
            
            // 8. 初始化事件多播器
            initApplicationEventMulticaster();
            
            // 9. 子类特定的刷新操作
            onRefresh();
            
            // 10. 注册事件监听器
            registerListeners();
            
            // 11. 实例化所有非懒加载的单例Bean
            finishBeanFactoryInitialization(beanFactory);
            
            // 12. 完成刷新
            finishRefresh();
        } catch (BeansException ex) {
            destroyBeans();
            cancelRefresh(ex);
            throw ex;
        }
    }
}
```

### 4.3 关键技术实现

#### 1. 反射机制运用

- 使用`Class.forName()`加载类
- 通过`Constructor.newInstance()`创建实例
- 使用`Method.invoke()`调用方法
- 通过`Field.set()`设置字段值

#### 2. 工厂模式实现

- BeanFactory作为顶层工厂接口
- 不同实现提供不同的Bean创建策略
- ObjectFactory用于延迟创建和解决循环依赖

#### 3. 策略模式应用

- InstantiationStrategy：实例化策略
- AutowireCapableBeanFactory：自动装配策略
- BeanPostProcessor：Bean后处理策略

#### 4. 观察者模式

- ApplicationEvent事件机制
- ApplicationListener监听器
- ApplicationEventMulticaster事件多播器

Spring IoC容器的底层实现充分体现了面向对象设计原则，通过精巧的架构设计和多种设计模式的综合运用，实现了高度灵活和可扩展的依赖注入容器。