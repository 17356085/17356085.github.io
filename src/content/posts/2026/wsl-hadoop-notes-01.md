---
title: "WSL 下的 Hadoop 入门笔记（一）：环境准备与 NameNode 启动"
published: 2026-10-18
updated: 2026-10-18
description: "在 Ubuntu 24.04 的 WSL 中，以 Java 11 配置 Hadoop 3.4.3 单机伪分布式环境，理解 SSH 本机认证、NameNode 初始化和 Web UI 端口。"
image: "https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/images/posts/a605ca763b48b3428c7e6354e9104475.webp"
author: mio
tags: [Linux, WSL, Hadoop, 学习笔记]
category: 学习笔记
draft: false
lang: zh_CN
---

在 Windows 的 WSL 中运行 Hadoop，可以用一台电脑认识 HDFS 的基本组成和启动过程。本文以 Ubuntu 24.04、Java 11 和 Hadoop 3.4.3 为例，从进入 Linux、安装 Java 开始，配置本机 SSH，初始化 NameNode，并打开它的 Web UI。每一步都结合配置项和命令，解释它们在启动过程中的作用。

## WSL、Ubuntu 与单机伪分布式

WSL 提供了运行 Linux 用户空间的环境，Ubuntu 则是其中的发行版。Windows PowerShell 中可以这样进入本次使用的 Ubuntu：

```powershell
wsl -d Ubuntu-24.04 --cd ~
```

这里假定 WSL 和 Ubuntu 24.04 已经安装。示例用户为 `mio`，家目录是 `/home/mio`；操作时需要把配置中的用户名替换为自己的 Linux 用户名。Windows 的 `C:\Users\...` 在 Ubuntu 中通常通过 `/mnt/c/Users/...` 访问，`/home/mio` 则是 Linux 文件系统中的家目录。先确认位置和用户，再创建专用学习目录：

```bash
pwd
whoami
mkdir -p ~/hadoop-learning
cd ~/hadoop-learning
```

`pwd` 和 `whoami` 也适合在排错时确认命令究竟运行在哪一侧。`wsl --version`、`wsl --list`、`Get-NetTCPConnection` 是 Windows 命令；`java -version`、`bin/hdfs` 和 `jps` 是 Ubuntu 命令。不要把 PowerShell 能找到某个程序，理解成 Ubuntu 的 `PATH` 也已经配置好。

Ubuntu 默认使用 Bash 解释终端里输入的命令。`~` 代表当前用户的家目录，`sudo` 会暂时以管理员权限执行命令。本篇把 Hadoop 程序和数据目录放在自己的家目录下，并分开保存，便于管理权限和查找文件。Windows 盘挂载在 `/mnt` 下可以用于交换文件，Hadoop 的本地服务数据则放在 Linux 文件系统中。

伪分布式的“伪”指的是服务仍然运行在一台机器上，但按分布式系统的角色拆成独立进程。NameNode 管理 HDFS 的命名空间、目录和数据块位置，DataNode 保存实际数据块。单机配置保留了服务间的接口和职责，不能提供多台机器带来的副本冗余和故障隔离。

客户端访问 HDFS 时先向 NameNode 询问文件和块的位置，再由 DataNode 处理实际数据。这个分工解释了为什么 NameNode 的管理页面能够打开，却不能单独代表已经可以读写文件。伪分布式环境的价值在于把这些接口放在一台电脑上观察，等理解了地址、目录和进程之间的关系，再迁移到多节点环境会更顺畅。

## 安装 Java：PATH 与 JAVA_HOME 是两件事

Hadoop 3.4.3 的预编译发行包需要 Java 运行环境，本次使用 Java 11。Ubuntu 中安装无头版 JDK：

```bash
sudo apt update
sudo apt install openjdk-11-jdk-headless
```

安装后可以分别确认命令位置和实际文件：

```bash
java -version
javac -version
command -v java
readlink -f "$(command -v java)"
```

本机 Java 可执行文件位于 `/usr/lib/jvm/java-11-openjdk-amd64/bin/java`，因此在 `~/.bashrc` 中设置 Java 根目录：

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
```

`PATH` 决定 Shell 去哪些目录查找 `java`，`JAVA_HOME` 则明确告诉 Hadoop Java 安装在哪个根目录。把设置写进 `.bashrc` 后，当前终端不会自动获得新值，需要执行 `source ~/.bashrc` 或重新进入 Ubuntu，再检查 `echo "$JAVA_HOME"`。Hadoop 脚本主要依赖 `JAVA_HOME`，所以“java 命令能运行”与“启动脚本能找到正确的 Java”是两个需要分别确认的条件。

选择 JDK 是为了同时获得运行环境和 `jps` 等诊断工具。`javac` 是编译器，本篇运行预编译发行包，不需要用它编译 Hadoop 源码。`openjdk-11-jdk-headless` 省去了 Java 图形界面的相关依赖，适合命令行使用。若存在多个 Java 版本，应分别检查 `java -version` 和 `JAVA_HOME`，确认实际使用的版本。

## 下载 Hadoop 并检查发行目录

学习目录为 `~/hadoop-learning`，Hadoop 根目录最终是 `/home/mio/hadoop-learning/hadoop-3.4.3`。下载前确认架构和磁盘空间：

```bash
uname -m
command -v wget
df -h ~
```

从 Apache 镜像下载压缩包和 SHA-512 文件，再进行校验：

```bash
cd ~/hadoop-learning
wget -c https://downloads.apache.org/hadoop/common/hadoop-3.4.3/hadoop-3.4.3.tar.gz
wget -c https://downloads.apache.org/hadoop/common/hadoop-3.4.3/hadoop-3.4.3.tar.gz.sha512
sha512sum -c hadoop-3.4.3.tar.gz.sha512
tar -xzf hadoop-3.4.3.tar.gz
cd hadoop-3.4.3
bin/hadoop version
```

`sha512sum` 用于确认下载内容与发布方提供的摘要一致，不能代替 Java、权限和端口配置检查。解压后的 `bin` 放客户端命令，`sbin` 放服务脚本，`etc/hadoop` 放配置文件，`share/hadoop` 放发行包附带的库。`wget -c` 可以尝试断点续传，但续传结束仍应重新校验。

压缩包的校验文件和程序包必须对应同一个版本；下载了其他版本的摘要文件，校验命令可能直接失败，也可能让人误以为检查的是另一份内容。`tar -xzf` 只会把归档文件释放到当前目录，不会自动注册 systemd 服务，也不会改变默认文件系统。将发行包放在固定的学习目录中，命令中的相对路径就有了稳定的起点，日后查看日志时也容易和系统目录区分开。

## 三个配置文件和本地数据目录

Hadoop 的 XML 配置文件只能有一组 `<configuration>` 根元素。保留 XML 声明时，把它放在文件第一行；配置属性放进原有的根元素内，避免在同一文件中粘贴两份完整文档。下面的内容都位于 `/home/mio/hadoop-learning/hadoop-3.4.3/etc/hadoop`。

在 `hadoop-env.sh` 中设置 Java、本机 SSH 参数和轻量堆上限：

```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export HADOOP_SSH_OPTS="-p 2222 -i /home/mio/.ssh/id_ed25519_hadoop -o IdentitiesOnly=yes -o BatchMode=yes"
export HADOOP_HEAPSIZE_MAX=256
```

`HADOOP_SSH_OPTS` 让 Hadoop 使用指定端口和专用密钥，并在不能无交互认证时立即失败。256 MB 是这台内存紧张的本机练习采用的轻量设置，不能推断其他负载也足够；它限制 Java 堆上限，不等于 Java 进程的全部内存占用。

`core-site.xml` 指定默认文件系统地址：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property>
    <name>fs.defaultFS</name>
    <value>hdfs://localhost:9000</value>
  </property>
</configuration>
```

`hdfs-site.xml` 指定单机副本数以及 NameNode、DataNode 的本地存储位置：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <property>
    <name>dfs.replication</name>
    <value>1</value>
  </property>
  <property>
    <name>dfs.namenode.name.dir</name>
    <value>file:///home/mio/hadoop-data/namenode</value>
  </property>
  <property>
    <name>dfs.datanode.data.dir</name>
    <value>file:///home/mio/hadoop-data/datanode</value>
  </property>
</configuration>
```

单机只有一个 DataNode 时，副本数设为 1 才与节点数量相符。`file:///...` 是本地文件 URI，`hdfs://localhost:9000` 是客户端访问 HDFS 的 RPC 地址。修改后可以让 Hadoop 自己读回关键值：

```bash
bin/hdfs getconf -confKey fs.defaultFS
bin/hdfs getconf -confKey dfs.namenode.name.dir
```

这一步能尽早发现 XML 结构或路径拼写错误，也能确认命令使用的是当前 Hadoop 根目录下的配置。

配置文件看似只是几行 XML，却决定了客户端把请求送往哪里，以及服务把元数据写到哪里。`fs.defaultFS` 是没有显式 URI 时使用的默认目标；`dfs.namenode.name.dir` 保存 fsimage 等 NameNode 元数据，`dfs.datanode.data.dir` 预留给 DataNode 保存块文件。目录的父级需要由当前用户创建并保持可写，服务启动时如果无法创建或写入这些目录，日志通常会出现权限或路径错误。

XML 中的 `name` 和 `value` 是成对出现的属性，缩进只是为了阅读，真正重要的是标签闭合和根节点唯一。配置修改后用 `getconf` 读回，比只在编辑器中检查更可靠；如果返回空值或报 XML 错误，应先回到文件结构和当前工作目录排查。所有路径都写成 `/home/mio`，是因为 Hadoop 运行在 Ubuntu 用户空间，不能把 Windows 的 `C:\Users\...` 直接当作 Linux 家目录。

## 给 Ubuntu 配置 SSH 监听端口

Hadoop 的 `start-dfs.sh` 等脚本通过 SSH 到各节点启动服务，在伪分布式环境中也会连接本机。先安装 SSH 服务端：

```bash
sudo apt install openssh-server
```

本机 WSL 配置了镜像网络模式，Windows 的 `sshd` 已占用 22 端口，Ubuntu 因此遇到 `Address already in use`。Ubuntu 中的监听列表看不到 Windows 进程，需要分别查看两边。Ubuntu 中使用：

```bash
sudo ss -ltnp 'sport = :22'
```

Windows PowerShell 中使用：

```powershell
Get-NetTCPConnection -LocalPort 22 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

这里保留 Windows 的 22，把 Ubuntu 改为已确认空闲的 2222。这个选择用于解决本机的冲突；其他环境如果没有冲突，可以保留默认端口，并相应调整后文的 SSH 参数。

在 Ubuntu 的 `/etc/ssh/sshd_config.d/99-hadoop-port.conf` 中写入：

```text
Port 2222
```

Ubuntu 24.04 使用 socket 激活时，修改端口后需要让 systemd 重新读取配置并重启监听 socket：

```bash
sudo systemctl daemon-reload
sudo systemctl restart ssh.socket
sudo systemctl status ssh.socket --no-pager -l
```

重启后，这个 `ssh.socket` 在 2222 成功监听，Hadoop 的 SSH 参数也统一使用这个端口。

## 使用专用密钥登录本机

为 Hadoop 准备专用的 Ed25519 密钥，并把公钥安装到本机账户。下面的 `-N ''` 明确指定空的私钥保护口令，适用于本篇的本机专用练习密钥。如果目标密钥文件已存在，应先检查用途，保留原文件。

```bash
ssh-keygen -t ed25519 -N '' -f ~/.ssh/id_ed25519_hadoop -C "hadoop-local"
ssh-copy-id -i ~/.ssh/id_ed25519_hadoop.pub -p 2222 mio@localhost
ssh -p 2222 -i ~/.ssh/id_ed25519_hadoop \
  -o IdentitiesOnly=yes -o BatchMode=yes mio@localhost 'whoami'
```

本机配置完成后，最后一条命令输出 `mio`。`BatchMode=yes` 禁止临时弹出密码或口令提示，`IdentitiesOnly=yes` 限制 SSH 只使用指定身份，避免 agent 中其他密钥干扰。

排查 SSH 时最好按层次进行：先确认目标端口确实有监听，再用账户密码做一次普通登录，最后才用指定私钥和 `BatchMode` 测试自动化登录。端口写错会在连接阶段失败，账户密码错误属于用户认证问题，私钥口令错误则发生在客户端解锁私钥时。把这些情况分开，日志中的 `Connection refused`、`Permission denied` 和口令提示就不容易混在一起。

SSH 中有几种容易混淆的凭据。账户密码用于交互式登录；私钥口令用于解锁本地私钥；`known_hosts` 保存客户端认可的服务器主机身份；`authorized_keys` 保存服务器允许登录该账户的公钥。SSH 诊断日志出现 `Server accepts key`，表示服务端认可了公钥，客户端还要用私钥完成签名，认证才算完成。

如果已经生成的练习密钥带有保护口令，可以在输入旧口令后，将新口令明确设为空：

```bash
ssh-keygen -p -N '' -f ~/.ssh/id_ed25519_hadoop
```

空口令是为了让这台本机在没有人工输入的情况下启动 Hadoop 的取舍，不适合推广为所有环境都裸存私钥。生产或共享机器应使用有口令的密钥，并通过合适的 SSH agent 或其他凭据管理方式提供解锁能力。

首次连接时，还应对照本机主机公钥的指纹，再确认是否信任该服务端。公钥追加到 `authorized_keys` 后，客户端仍然需要对应的私钥才能登录。私钥用于在本地完成签名，不会被复制给服务端。

## 内存、首次 format 与 NameNode 启动

WSL 中 `free -h` 显示的可用内存，不等于 Windows 此刻可以继续分配的物理内存；同时运行浏览器、IDE 和容器时尤其要留出余量。轻量堆设置只能降低 Java 堆需求，不能消除所有进程的内存消耗。

先创建本地存储目录，并且只在全新目录上初始化 NameNode：

```bash
mkdir -p ~/hadoop-data/namenode ~/hadoop-data/datanode
bin/hdfs namenode -format
```

`format` 会在 NameNode 目录中建立文件系统元数据，本次初始化顺利完成。它是首次初始化操作；已有数据后不要为了重新启动而重复执行，否则会使原有命名空间失效。命令正常结束时看到 `Storage directory ... successfully formatted`，随后出现的 `SHUTDOWN_MSG` 表示一次性初始化进程主动退出。

NameNode 的 format 不是把硬盘做成某种特殊分区，而是为 HDFS 建立新的命名空间和存储标识。它只针对 `dfs.namenode.name.dir` 指向的目录，不能代替备份，也不能修复权限、端口或 Java 配置。开始前确认目录用途和内容，尤其不要把已有的重要 HDFS 元数据目录当作临时目录清空。DataNode 的目录虽然同时创建出来，但在本文范围内只作为配置的一部分保留。

启动 NameNode 守护进程并查看 Java 进程：

```bash
bin/hdfs --daemon start namenode
jps -l
```

启动后，`jps -l` 中出现 `org.apache.hadoop.hdfs.server.namenode.NameNode`，说明相应 Java 进程正在运行。浏览器打开 [http://localhost:9870/](http://localhost:9870/)，可以进入 NameNode Web UI。

一次启动中，脚本第一行曾误写成 `\#`，反斜杠让 `#` 失去注释含义，Shell 因而报出 `line 1: #: command not found`。处理这类错误时，应把首行改回普通的 `#`，再检查命令输出。`bash -n` 只检查语法，未必能发现“语法合法但尝试执行不存在命令”的问题。

本篇出现了三个端口，它们对应不同的服务：

| 端口 | 本篇用途 | 使用者 |
| --- | --- | --- |
| 2222 | Ubuntu 的 SSH 登录入口 | SSH 客户端、Hadoop 启动脚本 |
| 9000 | 配置的 NameNode RPC 地址 | Hadoop 客户端 |
| 9870 | NameNode Web UI | 浏览器 |

NameNode 提供目录和数据块位置等元数据服务，实际文件内容交给 DataNode 保存。本篇从环境准备讲到 NameNode 启动，后续再介绍数据节点和 HDFS 文件操作。

## 参考资料

- [Microsoft Learn：WSL 基本命令](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [Apache Hadoop 3.4.3：单节点集群](https://hadoop.apache.org/docs/r3.4.3/hadoop-project-dist/hadoop-common/SingleCluster.html)
- [Apache Hadoop Wiki：Hadoop Java 版本](https://cwiki.apache.org/confluence/spaces/HADOOP/pages/100827883/Hadoop%2BJava%2BVersions)
- [Ubuntu foundations：SSH socket 激活相关问题记录](https://lists.ubuntu.com/archives/foundations-bugs/2024-June/517043.html)
- [Microsoft Learn：WSL 网络](https://learn.microsoft.com/en-us/windows/wsl/networking)
- [OpenBSD manual：ssh-keygen](https://man.openbsd.org/ssh-keygen)
- [OpenBSD manual：ssh_config](https://man.openbsd.org/ssh_config)
