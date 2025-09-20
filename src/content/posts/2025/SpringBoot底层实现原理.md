---
title: SpringBoot底层实现原理
published: 2025-09-05
updated: 2025-09-05
description: SpringBoot底层实现原理
author: mio
tags:
  - 编程学习
  - 后端开发
category: 后端
---
## 自动配置的核心机制

### 1. @SpringBootApplication注解

这是自动配置的起点，它实际上是三个注解的组合：

```java
@SpringBootConfiguration  // 标识为配置类
@EnableAutoConfiguration  // 启用自动配置
@ComponentScan           // 组件扫描
```

### 2. @EnableAutoConfiguration的工作原理

这个注解是自动配置的关键，它通过`@Import`导入了`AutoConfigurationImportSelector`：

```java
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
    // ...
}
```

### 3. AutoConfigurationImportSelector的实现

这个类负责选择并加载自动配置类：

```java
public class AutoConfigurationImportSelector implements ImportSelector {
    
    @Override
    public String[] selectImports(AnnotationMetadata annotationMetadata) {
        // 获取所有自动配置类
        List<String> configurations = getCandidateConfigurations(annotationMetadata, attributes);
        // 去重、排除、过滤
        configurations = removeDuplicates(configurations);
        configurations = getExcluded(configurations);
        configurations = filter(configurations, autoConfigurationMetadata);
        // 返回需要导入的配置类
        return configurations.toArray(new String[0]);
    }
}
```

### 4. 加载自动配置类的过程

Spring Boot通过`SpringFactoriesLoader`加载配置：

```java
protected List<String> getCandidateConfigurations(AnnotationMetadata metadata, AnnotationAttributes attributes) {
    List<String> configurations = SpringFactoriesLoader.loadFactoryNames(
        getSpringFactoriesLoaderFactoryClass(), 
        getBeanClassLoader()
    );
    return configurations;
}
```

它会扫描所有jar包下的`META-INF/spring.factories`文件，查找key为`org.springframework.boot.autoconfigure.EnableAutoConfiguration`的配置。

### 5. 条件注解的使用

自动配置类通常使用条件注解来决定是否生效：

- **@ConditionalOnClass**: 当classpath中存在指定类时
    
- **@ConditionalOnMissingBean**: 当容器中不存在指定Bean时
    
- **@ConditionalOnProperty**: 当配置文件中有指定属性时
    
- **@ConditionalOnWebApplication**: 当是Web应用时
    

示例：

```java
@Configuration
@ConditionalOnClass(DataSource.class)
@ConditionalOnProperty(prefix = "spring.datasource", name = "url")
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource() {
        // 创建数据源
    }
}
```

### 6. 配置属性绑定

通过`@ConfigurationProperties`将配置文件中的属性绑定到Java对象：

```java
@ConfigurationProperties(prefix = "spring.datasource")
public class DataSourceProperties {
    private String url;
    private String username;
    private String password;
    // getters and setters
}
```

### 7. 自动配置的执行顺序

使用以下注解控制加载顺序：

- **@AutoConfigureAfter**: 在指定配置类之后配置
    
- **@AutoConfigureBefore**: 在指定配置类之前配置
    
- **@AutoConfigureOrder**: 指定配置顺序
    

### 8. 自动配置报告

可以通过以下方式查看哪些自动配置生效了：

- 启动时添加`--debug`参数
    
- 在配置文件中设置`debug=true`
    
- 使用Actuator的`/conditions`端点
    

## 自动配置的完整流程

1. **启动应用** → SpringApplication.run()
    
2. **解析@SpringBootApplication** → 发现@EnableAutoConfiguration
    
3. **导入AutoConfigurationImportSelector** → 执行selectImports()
    
4. **加载spring.factories** → 获取所有自动配置类列表
    
5. **应用条件过滤** → 根据@Conditional注解决定是否加载
    
6. **创建配置Bean** → 将符合条件的配置类注册到容器
    
7. **属性绑定** → 将配置文件中的值绑定到配置类
    

## Web自动配置的核心组件

### 1. WebMvcAutoConfiguration

这是Spring MVC的核心自动配置类：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass({ Servlet.class, DispatcherServlet.class, WebMvcConfigurer.class })
@ConditionalOnMissingBean(WebMvcConfigurationSupport.class)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
@AutoConfigureAfter({ DispatcherServletAutoConfiguration.class, TaskExecutionAutoConfiguration.class,
        ValidationAutoConfiguration.class })
public class WebMvcAutoConfiguration {
    // Web MVC相关配置
}
```

### 2. 内嵌服务器的自动配置

#### ServletWebServerFactoryAutoConfiguration

负责配置内嵌的Servlet容器：

```java
@Configuration(proxyBeanMethods = false)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnClass(ServletRequest.class)
@ConditionalOnWebApplication(type = Type.SERVLET)
@EnableConfigurationProperties(ServerProperties.class)
@Import({ ServletWebServerFactoryAutoConfiguration.BeanPostProcessorsRegistrar.class,
        ServletWebServerFactoryConfiguration.EmbeddedTomcat.class,
        ServletWebServerFactoryConfiguration.EmbeddedJetty.class,
        ServletWebServerFactoryConfiguration.EmbeddedUndertow.class })
public class ServletWebServerFactoryAutoConfiguration {
    
    @Bean
    public ServletWebServerFactoryCustomizer servletWebServerFactoryCustomizer(
            ServerProperties serverProperties) {
        return new ServletWebServerFactoryCustomizer(serverProperties);
    }
}
```

#### 内嵌Tomcat的配置

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass({ Servlet.class, Tomcat.class, UpgradeProtocol.class })
@ConditionalOnMissingBean(value = ServletWebServerFactory.class, search = SearchStrategy.CURRENT)
static class EmbeddedTomcat {
    
    @Bean
    TomcatServletWebServerFactory tomcatServletWebServerFactory(
            ObjectProvider<TomcatConnectorCustomizer> connectorCustomizers,
            ObjectProvider<TomcatContextCustomizer> contextCustomizers,
            ObjectProvider<TomcatProtocolHandlerCustomizer<?>> protocolHandlerCustomizers) {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        // 配置Tomcat
        return factory;
    }
}
```

### 3. DispatcherServlet的自动配置

```java
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass(DispatcherServlet.class)
@AutoConfigureAfter(ServletWebServerFactoryAutoConfiguration.class)
public class DispatcherServletAutoConfiguration {
    
    @Configuration(proxyBeanMethods = false)
    @Conditional(DefaultDispatcherServletCondition.class)
    @ConditionalOnClass(ServletRegistration.class)
    @EnableConfigurationProperties({ HttpProperties.class, WebMvcProperties.class })
    protected static class DispatcherServletConfiguration {
        
        @Bean(name = DEFAULT_DISPATCHER_SERVLET_BEAN_NAME)
        public DispatcherServlet dispatcherServlet(HttpProperties httpProperties, 
                WebMvcProperties webMvcProperties) {
            DispatcherServlet dispatcherServlet = new DispatcherServlet();
            dispatcherServlet.setDispatchOptionsRequest(webMvcProperties.isDispatchOptionsRequest());
            dispatcherServlet.setDispatchTraceRequest(webMvcProperties.isDispatchTraceRequest());
            // 其他配置...
            return dispatcherServlet;
        }
    }
    
    @Configuration(proxyBeanMethods = false)
    @Conditional(DispatcherServletRegistrationCondition.class)
    @ConditionalOnClass(ServletRegistration.class)
    @EnableConfigurationProperties(WebMvcProperties.class)
    @Import(DispatcherServletConfiguration.class)
    protected static class DispatcherServletRegistrationConfiguration {
        
        @Bean(name = DEFAULT_DISPATCHER_SERVLET_REGISTRATION_BEAN_NAME)
        @ConditionalOnBean(value = DispatcherServlet.class, name = DEFAULT_DISPATCHER_SERVLET_BEAN_NAME)
        public DispatcherServletRegistrationBean dispatcherServletRegistration(
                DispatcherServlet dispatcherServlet, WebMvcProperties webMvcProperties,
                ObjectProvider<MultipartConfigElement> multipartConfig) {
            DispatcherServletRegistrationBean registration = new DispatcherServletRegistrationBean(
                    dispatcherServlet, webMvcProperties.getServlet().getPath());
            registration.setName(DEFAULT_DISPATCHER_SERVLET_BEAN_NAME);
            registration.setLoadOnStartup(webMvcProperties.getServlet().getLoadOnStartup());
            multipartConfig.ifAvailable(registration::setMultipartConfig);
            return registration;
        }
    }
}
```

### 4. Web MVC核心组件的配置

#### 视图解析器配置

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnMissingBean(name = "viewResolver", value = ContentNegotiatingViewResolver.class)
public static class WebMvcAutoConfigurationAdapter implements WebMvcConfigurer {
    
    @Bean
    @ConditionalOnBean(ViewResolver.class)
    @ConditionalOnMissingBean(name = "viewResolver", value = ContentNegotiatingViewResolver.class)
    public ContentNegotiatingViewResolver viewResolver(BeanFactory beanFactory) {
        ContentNegotiatingViewResolver resolver = new ContentNegotiatingViewResolver();
        resolver.setContentNegotiationManager(beanFactory.getBean(ContentNegotiationManager.class));
        resolver.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return resolver;
    }
}
```

#### 静态资源处理

```java
@Override
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    if (!this.resourceProperties.isAddMappings()) {
        logger.debug("Default resource handling disabled");
        return;
    }
    // 配置静态资源路径
    addResourceHandler(registry, "/webjars/**", "classpath:/META-INF/resources/webjars/");
    addResourceHandler(registry, this.mvcProperties.getStaticPathPattern(), 
        this.resourceProperties.getStaticLocations());
}
```

### 5. HttpMessageConverters自动配置

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(HttpMessageConverter.class)
@Conditional(NotReactiveWebApplicationCondition.class)
@AutoConfigureAfter({ GsonAutoConfiguration.class, JacksonAutoConfiguration.class })
@Import({ JacksonHttpMessageConvertersConfiguration.class,
        GsonHttpMessageConvertersConfiguration.class })
public class HttpMessageConvertersAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public HttpMessageConverters messageConverters(ObjectProvider<HttpMessageConverter<?>> converters) {
        return new HttpMessageConverters(converters.orderedStream().collect(Collectors.toList()));
    }
}
```

### 6. Web服务器启动流程

```java
// SpringApplication.run() 最终会调用
private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();
    if (webServer == null && servletContext == null) {
        // 获取ServletWebServerFactory
        ServletWebServerFactory factory = getWebServerFactory();
        // 创建WebServer
        this.webServer = factory.getWebServer(getSelfInitializer());
    }
}

// Tomcat的实现
@Override
public WebServer getWebServer(ServletContextInitializer... initializers) {
    Tomcat tomcat = new Tomcat();
    File baseDir = (this.baseDirectory != null) ? this.baseDirectory : createTempDir("tomcat");
    tomcat.setBaseDir(baseDir.getAbsolutePath());
    Connector connector = new Connector(this.protocol);
    connector.setThrowOnFailure(true);
    tomcat.getService().addConnector(connector);
    customizeConnector(connector);
    tomcat.setConnector(connector);
    tomcat.getHost().setAutoDeploy(false);
    configureEngine(tomcat.getEngine());
    prepareContext(tomcat.getHost(), initializers);
    return getTomcatWebServer(tomcat);
}
```

### 7. 自动配置的属性配置

通过`application.properties`或`application.yml`配置：

```yaml
server:
  port: 8080
  servlet:
    context-path: /app
  tomcat:
    max-threads: 200
    connection-timeout: 20000

spring:
  mvc:
    view:
      prefix: /WEB-INF/views/
      suffix: .jsp
    static-path-pattern: /static/**
```

## Web自动配置的完整流程

1. **应用启动** → 检测到Web环境（通过classpath中的Servlet类）
    
2. **加载Web相关自动配置** → ServletWebServerFactoryAutoConfiguration等
    
3. **创建内嵌服务器工厂** → 如TomcatServletWebServerFactory
    
4. **配置DispatcherServlet** → 通过DispatcherServletAutoConfiguration
    
5. **配置Web MVC组件** → 视图解析器、消息转换器、静态资源等
    
6. **创建并启动Web服务器** → 调用factory.getWebServer()
    
7. **注册Servlet和Filter** → 通过ServletContextInitializer
    
8. **服务器就绪** → 开始接收HTTP请求
    