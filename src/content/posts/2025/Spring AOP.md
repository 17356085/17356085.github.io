---
title: Spring AOP
published: 2025-08-18
updated: 2025-08-18
description: 敲项目的时候，偶遇切面代码，拼尽全力无法战胜，遂回来恶补基础
author: mio
tags:
  - Spring框架
  - 项目学习
category: 后端
draft: false
---
> **AOP**：AOP（Aspect Oriented Programming）：面向切面编程，面向方面编程。（AOP是一种编程技术） AOP是对OOP的补充延伸。（*AOP底层是通过动态代理来实现的*）
> 
> **Spring的AOP的动态代理**：JDK动态代理+CGLIB动态代理技术。Spring在这两种动态代理中灵活切换，如果是代理接口，会默认使用JDK动态代理，如果要代理某个类，这个类没有实现接口，就会切换使用CGLIB。当然，你也可以强制通过一些配置让Spring只使用CGLIB。

## 1. 为什么要使用AOP？

一般一个系统当中都会有一些系统服务，例如：日志、事务管理、安全等。这些系统服务被称为：**交叉业务** 这些**交叉业务**几乎是通用的，不管你是做银行账户转账，还是删除用户数据。日志、事务管理、安全，这些都是需要做的。 如果在每一个业务处理过程当中，都掺杂这些交叉业务代码进去的话，存在两方面问题：

- 第一：交叉业务代码在多个业务流程中反复出现，显然这个交叉业务代码没有得到复用。并且修改这些交叉业务代码的话，需要修改多处。
- 第二：程序员无法专注核心业务代码的编写，在编写核心业务代码的同时还需要处理这些交叉业务。

使用AOP可以很轻松的解决以上问题。
![Spring AOP 核心概念示意图](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-aop/aop-01.png)
1️⃣ **使用AOP的好处**：
1. 代码复用性增强
2. 代码易维护
3. 使开发者更关注业务逻辑

2️⃣ 总结
**将与核心业务无关的代码独立的抽取出来，形成一个独立的组件，然后以横向交叉的方式应用到业务流程当中的过程被称为AOP。**

## 2. AOP相关概念

### 2.1 术语
![Spring AOP 切面执行流程](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/blog/posts/spring-aop/aop-02.png)

- **连接点 Joinpoint**：在程序的整个执行流程中，**可以织入**切面的位置。方法的执行前后，异常抛出之后等位置。
        
- **切点 Pointcut**：在程序执行流程中，**真正织入**切面的方法。（一个切点对应多个连接点）
        
- **通知 Advice**：通知又叫增强，就是具体你要织入的代码。
	- 包括
        - 前置通知
        - 后置通知
        - 环绕通知
        - 异常通知
        - 最终通知
            
- **切面 Aspect**：**切点 + 通知就是切面。**
        
- 织入 Weaving：把通知应用到目标对象上的过程。
        
- 代理对象 Proxy：一个目标对象被织入通知后产生的新对象。
        
- 目标对象 Target：被织入通知的对象。

### 2.2 切点表达式

> 可以使用切点表达式定义通知（Advice）往哪些方法上切入。

```java
execution([访问控制权限修饰符] 返回值类型 [权限定类名] 方法名 (形式参数列表) [列表])
```

## 3. 在Spring中使用AOP

> Spring对AOP的实现包括以下3种方式：
> 
> **第一种方式：Spring框架结合AspectJ框架实现的AOP，基于注解方式。 
> 
> 第二种方式：Spring框架结合AspectJ框架实现的AOP，基于XML方式。
> 
> 第三种方式：Spring框架自己实现的AOP，基于XML配置方式。（不常用了解即可）

### 3.1 配置

1️⃣使用Spring+Aspectj的AOP需要引入如下依赖：
```xml
<!--spring context依赖-->
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-context</artifactId>
  <version>6.0.0-M2</version>
</dependency>
<!--spring aop依赖-->
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-aop</artifactId>
  <version>6.0.0-M2</version>
</dependency>
<!--spring aspects依赖-->
<dependency>
  <groupId>org.springframework</groupId>
  <artifactId>spring-aspects</artifactId>
  <version>6.0.0-M2</version>
</dependency>
```

2️⃣ Spring配置文件中添加context和aop命名空间
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">

</beans>
```

### 3.2 AOP注解开发

> 使用Spring中的通知：
> 
> 1. 前置通知：@Before 目标方法执行之前的通知
> 2. 后置通知：@AfterReturning 目标方法执行之后的通知
> 3. 环绕通知：@Around 目标方法之前添加通知，同时目标方法执行之后添加通知。
> 4. 异常通知：@AfterThrowing 发生异常之后执行的通知
> 5. 最终通知：@After 放在finally语句块中的通知

#### 3.2.1 实现步骤

1️⃣ 定义目标类以及目标方法
```java
package com.powernode.spring6.service;

// 目标类
public class OrderService {
    // 目标方法
    public void generate(){
        System.out.println("订单已生成！");
    }
}
```

2️⃣ 定义切面类
```java
package com.powernode.spring6.service;

import org.aspectj.lang.annotation.Aspect;

// 切面类
@Aspect
public class MyAspect {
}
```

3️⃣ 目标类和切面类都纳入Spring bean管理

- 在目标类OrderService上添加@Component注解。 
- 在切面类MyAspect类上添加@Component注解。

4️⃣ 在Spring配置文件分钟添加组件扫描
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">
    <!--开启组件扫描-->
    <context:component-scan base-package="com.powernode.spring6.service"/>
</beans>
```

5️⃣ 在切面类添加通知
```java
package com.powernode.spring6.service;

import org.springframework.stereotype.Component;
import org.aspectj.lang.annotation.Aspect;

// 切面类
@Aspect
@Component
public class MyAspect {
    // 这就是需要增强的代码（通知）
    public void advice(){
        System.out.println("我是一个通知");
    }
}
```

6️⃣ 在通知上添加切点表达式
```java
package com.powernode.spring6.service;

import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.aspectj.lang.annotation.Aspect;

// 切面类
@Aspect
@Component
public class MyAspect {
    
    // 切点表达式
    @Before("execution(* com.powernode.spring6.service.OrderService.*(..))")
    // 这就是需要增强的代码（通知）
    public void advice(){
        System.out.println("我是一个通知");
    }
}
```

7️⃣ 在Spring配置文件中启用自动代理
- <aop:aspectj-autoproxy proxy-target-class="true"/> 开启自动代理之后，凡事带有@Aspect注解的bean都会生成代理对象。 
- proxy-target-class="true" 表示采用cglib动态代理。 
- proxy-target-class="false" 表示采用jdk动态代理。默认值是false。即使写成false，当没有接口的时候，也会自动选择cglib生成代理类。
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">
    <!--开启组件扫描-->
    <context:component-scan base-package="com.powernode.spring6.service"/>
    <!--开启自动代理-->
    <aop:aspectj-autoproxy proxy-target-class="true"/>
</beans>
```

#### 3.2.2 切面的先后顺序

业务流程当中不一定只有一个切面，可能有的切面控制事务，有的记录日志，有的进行安全控制，如果多个切面的话，顺序如何控制：**可以使用@Order注解来标识切面类，为@Order注解的value指定一个整数型的数字，数字越小，优先级越高**。

#### 3.2.3 提高切面的可复用性

1️⃣**反面示例**
```java
package com.powernode.spring6.service;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

// 切面类
@Component
@Aspect
@Order(2)
public class MyAspect {

    @Around("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void aroundAdvice(ProceedingJoinPoint proceedingJoinPoint) throws Throwable {
        System.out.println("环绕通知开始");
        // 执行目标方法。
        proceedingJoinPoint.proceed();
        System.out.println("环绕通知结束");
    }

    @Before("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void beforeAdvice(){
        System.out.println("前置通知");
    }

    @AfterReturning("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void afterReturningAdvice(){
        System.out.println("后置通知");
    }

    @AfterThrowing("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void afterThrowingAdvice(){
        System.out.println("异常通知");
    }

    @After("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void afterAdvice(){
        System.out.println("最终通知");
    }

}
```

**缺点**：切点表达式重复，如果切点表达式需要维护，需要修改多处。

2️⃣ **应该这么做**

将切点表达式用@Pointcut注解单独的定义出来，在需要的位置引入即可。
```java
package com.powernode.spring6.service;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

// 切面类
@Component
@Aspect
@Order(2)
public class MyAspect {
    
    @Pointcut("execution(* com.powernode.spring6.service.OrderService.*(..))")
    public void pointcut(){}

    @Around("pointcut()")
    public void aroundAdvice(ProceedingJoinPoint proceedingJoinPoint) throws Throwable {
        System.out.println("环绕通知开始");
        // 执行目标方法。
        proceedingJoinPoint.proceed();
        System.out.println("环绕通知结束");
    }

    @Before("pointcut()")
    public void beforeAdvice(){
        System.out.println("前置通知");
    }

    @AfterReturning("pointcut()")
    public void afterReturningAdvice(){
        System.out.println("后置通知");
    }

    @AfterThrowing("pointcut()")
    public void afterThrowingAdvice(){
        System.out.println("异常通知");
    }

    @After("pointcut()")
    public void afterAdvice(){
        System.out.println("最终通知");
    }

}
```

#### 3.2.4 全注解开发AOP

Spring配置类
```java
package com.powernode.spring6.service;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@ComponentScan("com.powernode.spring6.service")
@EnableAspectJAutoProxy(proxyTargetClass = true)
public class Spring6Configuration {
}
```

测试程序
```java
@Test
public void testAOPWithAllAnnotation(){
    ApplicationContext applicationContext = new AnnotationConfigApplicationContext(Spring6Configuration.class);
    OrderService orderService = applicationContext.getBean("orderService", OrderService.class);
    orderService.generate();
}
```

### 3.3 基于XML配置方式的AOP（了解即可）

1️⃣编写目标类（略）

2️⃣ 编写切面类，并编写通知（略）

3️⃣编写Spring配置文件
```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:aop="http://www.springframework.org/schema/aop"
       xsi:schemaLocation="http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans.xsd
                           http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context.xsd
                           http://www.springframework.org/schema/aop http://www.springframework.org/schema/aop/spring-aop.xsd">

    <!--纳入spring bean管理-->
    <bean id="vipService" class="com.powernode.spring6.service.VipService"/>
    <bean id="timerAspect" class="com.powernode.spring6.service.TimerAspect"/>

    <!--aop配置-->
    <aop:config>
        <!--切点表达式-->
        <aop:pointcut id="p" expression="execution(* com.powernode.spring6.service.VipService.*(..))"/>
        <!--切面-->
        <aop:aspect ref="timerAspect">
            <!--切面=通知 + 切点-->
            <aop:around method="time" pointcut-ref="p"/>
        </aop:aspect>
    </aop:config>
</beans>
```