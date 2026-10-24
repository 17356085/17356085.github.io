---
title: "WSL 下的 Hadoop 入门笔记（二）：HDFS 文件操作、分块与副本机制"
published: 2026-10-18
updated: 2026-10-18
description: "本篇继续启动完整的 HDFS 伪分布式服务，通过文件上传、下载和数据块检查，理解 HDFS 的基本存储原理。"
image: "https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/images/posts/cf840fe914a9c390a09a7c4c79867079.jpg"
author: mio
tags: [Linux, WSL, Hadoop, 学习笔记]
category: 学习笔记
draft: false
lang: zh_CN
---


在上一篇《WSL 下的 Hadoop 入门笔记（一）：环境准备与 NameNode 启动》中，已经在 WSL Ubuntu 中配置了 Hadoop 3.4.3，完成了 NameNode 的初始化和启动。本篇继续启动完整的 HDFS 伪分布式服务，通过 Shell 命令完成文件上传、读取和下载，并进一步观察 Hadoop 的数据存储方式。

最开始只是在跟着教程执行命令，对 HDFS 的工作原理并不熟悉，尤其容易将 Block（数据块）与 Replication（副本）混为一谈。因此，除了记录操作步骤，本篇还使用实际文件验证分块机制，并通过示意图和练习题整理相关概念。

## 一、恢复 Hadoop 环境与启动 HDFS

本次继续使用上一篇配置的环境：

|项目|环境|
|---|---|
|操作系统|Windows 11 + WSL Ubuntu 24.04.5 LTS|
|Java|OpenJDK 11|
|Hadoop|3.4.3|
|Linux 用户|mio|
|部署模式|单节点伪分布式|
|NameNode RPC|localhost:9000|
|NameNode Web UI|localhost:9870|

重新进入 Ubuntu 后，执行：

```
command -v hadoop
```

没有得到输出，起初以为 Hadoop 没有安装，或者之前下载到了 Windows、VMware 虚拟机等其他环境中。

通过 `find` 搜索后，在家目录中找到了之前解压的 Hadoop：

```
find /home/mio /opt /usr/local \
  -maxdepth 5 \
  -iname '*hadoop*' \
  -print 2>/dev/null | head -60
```

主要文件如下：

```
/home/mio/hadoop-learning/
├── hadoop-3.4.3/
├── hadoop-3.4.3.tar.gz
├── hadoop-3.4.3.tar.gz.sha512
└── ...
```

原来 Hadoop 一直存在，只是当前 Shell 没有将其可执行程序目录加入 `PATH`。

临时设置环境变量：

```
export HADOOP_HOME="$HOME/hadoop-learning/hadoop-3.4.3"
export PATH="$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$PATH"

hadoop version
```

成功输出：

```
Hadoop 3.4.3
```

这里需要区分：程序没有安装和 Shell 找不到程序并不是一回事。`command -v` 只能反映当前命令搜索路径中的结果，并不能证明磁盘上不存在程序。

### 1.1 检查 HDFS 配置

上一篇已经配置过 `core-site.xml` 和 `hdfs-site.xml`。

`core-site.xml` 中的核心配置为：

```
<property>
    <name>fs.defaultFS</name>
    <value>hdfs://localhost:9000</value>
</property>
```

它指定 Hadoop 客户端默认访问的文件系统。

`hdfs-site.xml` 中设置：

```
<property>
    <name>dfs.replication</name>
    <value>1</value>
</property>
```

并分别将 NameNode、DataNode 的本地存储目录指定为：

```
/home/mio/hadoop-data/namenode
/home/mio/hadoop-data/datanode
```

NameNode 的目录主要保存文件系统元数据，DataNode 的目录用于保存实际的数据块。

由于目录中已有之前初始化的内容，本次不需要重新执行 `hdfs namenode -format`。

`**format**` **是初始化操作，不是普通的启动命令。** 对已经使用过的 HDFS 重新格式化，可能导致已有数据无法访问。

### 1.2 启动 HDFS

首先确认 SSH 连接正常：

```
ssh localhost 'echo SSH_OK'
```

输出：

```
SSH_OK
```

然后启动 HDFS：

```
start-dfs.sh
```

执行：

```
jps -l
```

可以看到三个主要进程：

```
org.apache.hadoop.hdfs.server.namenode.NameNode
org.apache.hadoop.hdfs.server.datanode.DataNode
org.apache.hadoop.hdfs.server.namenode.SecondaryNameNode
```

三者承担不同的职责：

- **NameNode**：管理 HDFS 命名空间、文件目录、数据块信息及其存储位置等元数据。
    
- **DataNode**：保存实际数据块，处理数据读写，并向 NameNode 报告块信息。
    
- **SecondaryNameNode**：辅助完成 NameNode 元数据检查点工作，并非实时备用 NameNode。
    

继续检查：

```
hdfs dfsadmin -report
```

实际结果显示：

```
Live datanodes (1):

Name: 127.0.0.1:9866 (localhost)
Hostname: mio.localdomain
Decommission Status : Normal
```

表明当前有一个 DataNode 正常在线。

随后在 Windows 浏览器中访问：

```
http://localhost:9870
```

成功打开 NameNode Web UI。

需要注意，Web 页面能够打开，只能说明相应的 HTTP 服务能够访问，并不能单独证明 HDFS 的文件读写功能已经正常。还需要检查 DataNode 和实际读写结果。

## 二、HDFS 与普通文件系统有什么区别？

在操作 HDFS 之前，首先需要理解它为什么存在。

NTFS、ext4 等普通文件系统主要负责文件、目录和底层存储空间的管理。它们可以工作在本地磁盘或其他逻辑存储设备之上，但自身并不包含 HDFS 这种跨多台服务器协调分块、保存副本和处理节点故障的完整机制。

假设有三台服务器，每台拥有 2 TB 的可用存储空间。

虽然总容量达到 6 TB，但仅仅把三台服务器连接起来，并不会自动形成一个能够透明存储单个 5 TB 文件的统一文件系统。

普通 ext4 文件系统并不会仅凭自身知道其他服务器的存储情况、某一部分文件应该保存在哪台机器，以及机器损坏之后如何恢复丢失的数据。

HDFS 正是为大规模分布式数据存储设计的文件系统。

它通过 NameNode 管理文件和数据块的元数据，通过 DataNode 保存实际内容，使用户能够通过统一的文件路径访问分布在不同节点上的数据。

例如：

```
example.dat
    |
    +-- Block 0 --> DataNode A
    |
    +-- Block 1 --> DataNode B
    |
    +-- Block 2 --> DataNode C
```

不过，HDFS 并不是取代 ext4、NTFS 等本地文件系统。

DataNode 最终依然要把数据块保存到服务器的本地文件系统中。

在本次实验中，可以将其理解为：

```
HDFS 逻辑文件
     |
     v
NameNode 管理文件与数据块元数据
     |
     v
DataNode 保存实际数据块
     |
     v
Ubuntu 本地文件系统
     |
     v
WSL 虚拟磁盘及 Windows 宿主存储
```

因此，HDFS 提供的是建立在底层存储设施之上的分布式文件管理能力。

另外，HDFS 并不是唯一的分布式存储方案。NFS、SMB、Ceph 等技术也能够提供不同形式的网络文件访问或分布式存储，只是设计方式与适用场景有所区别。

HDFS 主要面向大规模数据的高吞吐量访问和批量处理，不以频繁修改大量小文件、低延迟随机写入为主要目标。

## 三、HDFS Shell 文件操作

参考厦门大学数据库实验室的 HDFS 编程实践教程，先使用 Shell 完成目录创建、文件上传、读取和下载。

### 3.1 创建 HDFS 用户目录

执行：

```
hdfs dfs -ls /
```

发现 HDFS 根目录中已有此前创建的 `/chenqian`，但不存在 `/user` 目录。

因此建立独立的实验路径：

```
hdfs dfs -mkdir -p /user/mio/xmu-hdfs-lab/input
```

其中：

- `hdfs dfs`：调用 HDFS 文件系统 Shell。
    
- `-mkdir`：创建目录。
    
- `-p`：允许同时创建尚不存在的父目录。
    

查看：

```
hdfs dfs -ls /user/mio/xmu-hdfs-lab
```

结果：

```
drwxr-xr-x - mio supergroup 0 ... /user/mio/xmu-hdfs-lab/input
```

说明目录创建成功。

### 3.2 创建并上传文件

先在 Ubuntu 本地创建测试文件：

```
mkdir -p ~/hadoop-learning/hdfs-exercises

printf 'Hadoop\nSpark\nXMU DBLAB\n' \
  > ~/hadoop-learning/hdfs-exercises/myLocalFile.txt
```

文件内容：

```
Hadoop
Spark
XMU DBLAB
```

然后上传至 HDFS：

```
hdfs dfs -put \
  ~/hadoop-learning/hdfs-exercises/myLocalFile.txt \
  /user/mio/xmu-hdfs-lab/input/
```

查看文件：

```
hdfs dfs -ls /user/mio/xmu-hdfs-lab/input/
```

实际输出：

```
-rw-r--r-- 1 mio supergroup 23 ... myLocalFile.txt
```

这里的 `23` 是文件大小，单位为字节；`1` 是 HDFS 文件的目标副本数量。

使用 `-cat` 读取：

```
hdfs dfs -cat \
  /user/mio/xmu-hdfs-lab/input/myLocalFile.txt
```

成功输出原来的三行文本。

### 3.3 下载文件并验证内容

使用 `-get` 将 HDFS 文件下载回 Ubuntu：

```
mkdir -p ~/hadoop-learning/hdfs-exercises/download

hdfs dfs -get \
  /user/mio/xmu-hdfs-lab/input/myLocalFile.txt \
  ~/hadoop-learning/hdfs-exercises/download/
```

再使用 Linux 的 `cmp` 命令逐字节比较：

```
cmp \
  ~/hadoop-learning/hdfs-exercises/myLocalFile.txt \
  ~/hadoop-learning/hdfs-exercises/download/myLocalFile.txt \
  && echo "HDFS 文件传输验证成功"
```

实际输出：

```
HDFS 文件传输验证成功
```

这说明上传前和下载后的文件内容一致。

常用命令整理如下：

|命令|作用|
|---|---|
|`hdfs dfs -ls`|查看 HDFS 文件和目录|
|`hdfs dfs -mkdir`|创建 HDFS 目录|
|`hdfs dfs -put`|本地文件上传至 HDFS|
|`hdfs dfs -get`|从 HDFS 下载文件|
|`hdfs dfs -cat`|从 HDFS 读取文件内容|
|`hdfs dfs -cp`|在 HDFS 内复制文件|
|`hdfs dfs -rm`|删除 HDFS 文件|

这里最重要的是区分本地文件系统和 HDFS。

`-put` 是将文件数据写入 HDFS，并不是建立一个指向 Ubuntu 本地文件的映射。

因此，上传完成后，本地原文件与 HDFS 文件可以独立存在。删除本地文件，不会自动删除已经成功上传的 HDFS 数据。

## 四、Block：HDFS 为什么需要分块？

HDFS 使用 Block（数据块）作为文件的基本存储和管理单位。

一个较大的文件可以按照配置的 Block Size 划分成多个数据块。

这里的 Block 是逻辑上的数据分块，并不等同于磁盘扇区或 ext4 文件系统中的磁盘块。

假设有一个 10 MiB 的文件，Block Size 设置为 4 MiB。

那么：

```
example.dat（10 MiB）
       |
       +-- Block 0：4 MiB
       |
       +-- Block 1：4 MiB
       |
       +-- Block 2：2 MiB
```

所以一共需要三个 Block。

最后一个 Block 不需要填满配置的 4 MiB，实际只保存剩余的 2 MiB 数据。

而且，HDFS 是按照字节范围划分文件，并不保证文本文件恰好在某一行的结尾断开。

### 4.1 用图理解分块

下面用一个 10 MiB 文件展示这一过程。

<div style="background:#1d1f27;border:1px solid #3a3d49;border-radius:16px;padding:20px;margin:18px 0;color:#f8fafc;"> <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:14px;"> <strong style="color:#ffffff;">bigfile.bin</strong> <span style="color:#cbd5e1;">10 MiB</span> </div> <div style="display:flex;gap:4px;overflow:hidden;border-radius:12px;"> <div style="flex:4;background:#2563eb;text-align:center;padding:18px 3px;min-width:0;"> <strong style="color:white;">Block 0</strong> <div style="color:white;">4 MiB</div> </div> <div style="flex:4;background:#0d9488;text-align:center;padding:18px 3px;min-width:0;"> <strong style="color:white;">Block 1</strong> <div style="color:white;">4 MiB</div> </div> <div style="flex:2;background:#8b5cf6;text-align:center;padding:18px 3px;min-width:0;"> <strong style="color:white;">Block 2</strong> <div style="color:white;">2 MiB</div> </div> </div> <p style="margin:14px 0 0;text-align:center;color:#e2e8f0;font-size:14px;">一个文件被划分为 3 个不同的逻辑 Block</p> </div>

分块并不意味着三个 Block 必须分别位于三台机器上。

同一个 DataNode 可以保存同一个文件的多个不同 Block。

### 4.2 检查 23 字节文件的数据块

运行：

```
hdfs fsck \
  /user/mio/xmu-hdfs-lab/input/myLocalFile.txt \
  -files -blocks -locations
```

参数说明：

|参数|作用|
|---|---|
|`fsck`|检查指定 HDFS 路径的健康状态|
|`-files`|显示文件信息|
|`-blocks`|显示数据块|
|`-locations`|显示块所在位置|

实际结果中的关键内容：

```
myLocalFile.txt 23 bytes, replicated:
replication=1, 1 block(s): OK

0. BP-...:blk_1073741825_1001
   len=23 Live_repl=1

Status: HEALTHY
```

这表示：

- 文件大小为 23 字节。
    
- 文件只有一个 Block。
    
- 这个 Block 的长度为 23 字节。
    
- 当前有一份在线副本。
    
- 数据块检查状态正常。
    

其中，`blk_1073741825` 是数据块 ID，后面的 `1001` 是 Generation Stamp，用于数据块版本管理。

由于文件过小，这次还无法直观地观察多个 Block，因此需要重新设计实验。

## 五、使用 10 MiB 文件观察真实分块

为了观察 HDFS 实际产生多个 Block 的情况，本次创建一个 10 MiB 文件，并将 Block Size 设置为 4 MiB。

### 5.1 创建测试文件

执行：

```
mkdir -p ~/hadoop-learning/hdfs-exercises/block-lab

dd if=/dev/urandom \
  of=~/hadoop-learning/hdfs-exercises/block-lab/bigfile.bin \
  bs=1M count=10 status=progress
```

命令参数：

- `dd`：用于复制字节数据。
    
- `if=/dev/urandom`：输入来自伪随机字节流。
    
- `of=...`：指定输出文件。
    
- `bs=1M`：每次处理 1 MiB。
    
- `count=10`：总共处理十次。
    

实际输出：

```
10+0 records in
10+0 records out
10485760 bytes (10 MB, 10 MiB) copied
```

因此文件大小为：

```
10 × 1024 × 1024 = 10485760 字节
```

这里的 MiB 与 MB 不完全相同，MiB 使用 1024 作为换算基数。

### 5.2 指定 Block Size 并上传

先创建 HDFS 目录：

```
hdfs dfs -mkdir -p /user/mio/xmu-hdfs-lab/block-lab
```

上传文件：

```
hdfs dfs -D dfs.blocksize=4194304 \
  -put ~/hadoop-learning/hdfs-exercises/block-lab/bigfile.bin \
  /user/mio/xmu-hdfs-lab/block-lab/
```

这里的：

```
-D dfs.blocksize=4194304
```

表示为本次操作提供一个 4 MiB 的 Block Size 配置。

```
4194304 字节 = 4 MiB
```

没有必要为了实验修改整个集群的默认 Block Size。

### 5.3 通过 fsck 检查

执行：

```
hdfs fsck \
  /user/mio/xmu-hdfs-lab/block-lab/bigfile.bin \
  -files -blocks -locations
```

实际结果：

```
bigfile.bin 10485760 bytes, replicated:
replication=1, 3 block(s): OK

0. blk_1073741826_1002 len=4194304 Live_repl=1
1. blk_1073741827_1003 len=4194304 Live_repl=1
2. blk_1073741828_1004 len=2097152 Live_repl=1

Status: HEALTHY
```

其中省略了较长的 Block Pool ID 和 DataNode 存储标识。

整理后的结果为：

|Block|长度|实际大小|在线副本数|
|---|---|---|---|
|Block 0|4194304 B|4 MiB|1|
|Block 1|4194304 B|4 MiB|1|
|Block 2|2097152 B|2 MiB|1|
|合计|10485760 B|10 MiB|3 份块副本|

结果与此前的预测完全一致。

另外，三个不同 Block 的实际存储位置都指向：

```
127.0.0.1:9866
```

因为当前的 HDFS 集群只有一个 DataNode。

这进一步说明：**分块不等于分机器。**

### 5.4 查询文件的基本属性

可以使用 `-stat`：

```
hdfs dfs -stat \
  'Size=%b BlockSize=%o Replication=%r' \
  /user/mio/xmu-hdfs-lab/block-lab/bigfile.bin
```

其中：

- `%b`：文件逻辑大小，单位为字节。
    
- `%o`：文件的 Block Size，单位为字节。
    
- `%r`：文件目标副本数。
    

本次实际尝试使用中文标签时，中文字符被输出为问号，但数值仍然正确。问题可能与 Java 进程的字符编码处理有关，尚未进一步定位，因此暂时使用英文标签。

## 六、Replication：分块与副本有什么区别？

最初学习 HDFS 时，容易混淆两个概念：

**分块是把文件的不同内容拆开；副本是为每个数据块保存多份相同的内容。**

它们不是同一件事。

继续使用刚才的 10 MiB 文件：

- 文件大小：10 MiB。
    
- Block Size：4 MiB。
    
- 假设副本数设置为 3。
    

### 6.1 第一步：分块

文件首先被划分为：

```
Block 0：4 MiB
Block 1：4 MiB
Block 2：2 MiB
```

注意，此时只有三个不同的逻辑 Block。

### 6.2 第二步：复制

假设设置：

```
replication = 3
```

意味着每个 Block 总共需要保存三份相同的数据。

<div style="background:#1d1f27;border:1px solid #3a3d49;border-radius:16px;padding:20px;margin:18px 0;color:#f8fafc;"> <div style="font-weight:700;color:#ffffff;margin-bottom:14px;">Block 与副本的关系</div> <div style="overflow-x:auto;"> <div style="min-width:480px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;align-items:center;"> <div style="color:#aeb4c2;font-size:13px;">逻辑块</div> <div style="text-align:center;color:#aeb4c2;font-size:13px;">副本 1</div> <div style="text-align:center;color:#aeb4c2;font-size:13px;">副本 2</div> <div style="text-align:center;color:#aeb4c2;font-size:13px;">副本 3</div> <div style="font-weight:600;color:#ffffff;">Block 0</div> <div style="background:#2563eb;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="background:#2563eb;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="background:#2563eb;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="font-weight:600;color:#ffffff;">Block 1</div> <div style="background:#0d9488;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="background:#0d9488;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="background:#0d9488;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">4 MiB</div> <div style="font-weight:600;color:#ffffff;">Block 2</div> <div style="background:#8b5cf6;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">2 MiB</div> <div style="background:#8b5cf6;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">2 MiB</div> <div style="background:#8b5cf6;border-radius:10px;padding:18px 4px;text-align:center;color:#ffffff;">2 MiB</div> </div> </div> <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;border-top:1px solid #3a3d49;margin-top:20px;padding-top:16px;"> <div> <div style="font-size:13px;color:#aeb4c2;">不同的逻辑 Block</div> <div style="font-size:28px;font-weight:700;color:#ffffff;">3 个</div> </div> <div> <div style="font-size:13px;color:#aeb4c2;">实际需要保存的块副本</div> <div style="font-size:28px;font-weight:700;color:#ffffff;">9 份</div> </div> </div> <p style="font-size:13px;color:#cbd5e1;margin:12px 0 0;">示意图假设有足够的 DataNode，且所有副本均成功建立；并非本次单节点环境的实际结果。</p> </div>

可以发现，设置三个副本后，文件并没有变成九个不同的 Block。

仍然只有三个逻辑 Block，只是每一块都分别保存了三份。

因此：

```
3 个逻辑 Block × 每块 3 份副本 = 9 份块副本
```

文件的逻辑大小仍然是 10 MiB。

不考虑元数据和其他额外开销，三副本所需的数据存储空间约为：

```
10 MiB × 3 = 30 MiB
```

这也是分块与副本最核心的区别。

### 6.3 副本为什么能够提高可靠性？

假设一个 Block 的三份副本分别保存在三个 DataNode 上：

```
Block 0
    |
    +-- DataNode A：副本 1
    |
    +-- DataNode B：副本 2
    |
    +-- DataNode C：副本 3
```

当 DataNode A 故障时，DataNode B 和 C 仍然保存相同的数据。

只要至少存在一份健康副本，HDFS 就仍然有机会完成该数据块的读取。

NameNode 可以监测副本数量不足的情况，并在存在可用节点及存储空间时安排恢复副本数量。

但如果某个 Block 的所有副本都彻底丢失，仅凭 NameNode 保存的元数据无法恢复原始文件内容。

### 6.4 单节点能否真正实现多副本容错？

当前实验只有一个 DataNode：

```
127.0.0.1:9866
```

目标副本数为：

```
dfs.replication = 1
```

即使将目标副本数设置为 3，也不能凭空得到三台独立服务器。

HDFS 正常的副本放置机制不会通过在同一个 DataNode 上重复保存同一 Block 来冒充跨节点容错。

因此，单节点伪分布式模式适合学习分块与基本存储机制，却无法完整验证多机容错。

本次并未实际调整副本数量，三副本的演示属于理论分析。

## 七、HDFS 如何读取被拆开的文件？

现在还有一个问题：

既然 HDFS 把文件拆成了多个 Block，为什么客户端下载时仍然能够获得完整文件？

原因在于 NameNode 保存了文件与数据块之间的元数据，而 HDFS 客户端能够按照逻辑顺序读取各个 Block。

基本过程如下：

1. 客户端向 NameNode 请求打开指定文件。
    
2. NameNode 提供数据块及其位置。
    
3. 客户端联系对应的 DataNode。
    
4. DataNode 向客户端传输实际数据。
    
5. 客户端按正确顺序读取各个 Block，对应用程序提供连续的字节流。
    

例如，10 MiB 文件被划分为：

```
Block 0：前 4 MiB
Block 1：中间 4 MiB
Block 2：最后 2 MiB
```

客户端通过读取这三个 Block，便能向应用程序提供完整文件内容。

需要注意，普通文件数据通常不经过 NameNode 转发，而是由客户端直接与 DataNode 传输。

NameNode 负责元数据管理，而不是承担所有实际数据传输。

另外，客户端读取多个 Block，也不意味着 HDFS 必须先在某台服务器上生成一个完整的临时文件。客户端可以通过输入流按需读取，让应用程序看到连续的文件内容。

本次已经通过 `fsck` 验证 10 MiB 文件被划分为三个 Block。后续还可以下载这个文件，并通过 SHA-256 哈希比较原文件和下载文件，进一步验证多 Block 文件的完整性。

## 八、实验中的几个易错点

### 8.1 找不到 Hadoop 命令不代表没有安装

本次程序已经解压在：

```
/home/mio/hadoop-learning/hadoop-3.4.3
```

但未出现在当前 Shell 的 `PATH` 中。

因此应先检查安装位置和环境变量，而不是直接重新下载。

### 8.2 NameNode 未启动时客户端可能连接超时

最初执行：

```
hdfs dfsadmin -report
```

出现连接 `localhost:9000` 超时的问题。

随后运行 `start-dfs.sh`，再检查便成功返回集群状态。

排查此类问题时，可以优先检查进程、服务地址和端口。

### 8.3 HEALTHY 不代表拥有多机容错能力

本次 `fsck` 显示：

```
Status: HEALTHY
Under-replicated blocks: 0
Missing blocks: 0
Corrupt blocks: 0
```

说明被检查文件的数据块在当时满足相关健康要求。

但因为目标副本数为 1，实际也只有一份副本，所以即使没有副本不足的问题，也不代表数据具有跨节点容错能力。

需要区分**当前数据健康**与**具备故障恢复冗余**。

### 8.4 文件系统容量不代表实际预留空间

`hdfs dfsadmin -report` 曾显示约 1006.85 GB 的配置容量。

这反映的是 DataNode 底层存储空间的相关统计结果，不代表 Hadoop 已经独占或预留了这么大的物理存储空间。

### 8.5 stat 输出中文乱码

执行带中文标签的 `hdfs dfs -stat` 时，中文字符显示成了问号。

由于数值正常，说明查询本身成功。具体编码原因尚未进一步确认，因此改用英文标签避免干扰：

```
hdfs dfs -stat \
  'Size=%b BlockSize=%o Replication=%r' \
  /user/mio/xmu-hdfs-lab/block-lab/bigfile.bin
```

## 九、知识点练习

下面的练习根据本次学习中容易混淆的知识点整理。

可以先自己计算或判断，再点击对应题目的“查看答案与解析”。

### 练习 1：基本分块计算

假设文件大小为 10 字节，Block Size 为 4 字节。

文件会被划分为几个不同的逻辑 Block？

A. 2 个

B. 3 个

C. 4 个

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：B，3 个。</strong></p> <p>前两个 Block 分别存储 4 字节，最后一个 Block 保存剩下的 2 字节。</p> <p>因此分块结果为 4 + 4 + 2，共三个不同的逻辑 Block。最后一个 Block 不需要填满设定大小。</p> </details>

### 练习 2：计算块副本总数

假设文件大小为 20 MiB，Block Size 为 8 MiB，副本数为 2，且集群有足够的健康 DataNode。

哪种理解正确？

A. 6 个不同的 Block，每块约 3.33 MiB。

B. 3 个不同的 Block，每块各存 2 份，共 6 份块副本。

C. 2 个不同的 Block，每块各存 3 份，共 6 份块副本。

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：B。</strong></p> <p>20 MiB 按照每块最多 8 MiB 划分，得到 8 + 8 + 4，共三个逻辑 Block。</p> <p>每块各保存两份，因此总共需要 3 × 2 = 6 份块副本。</p> <p>文件逻辑大小仍然是 20 MiB，副本数据总量约为 40 MiB，不计算额外开销。</p> </details>

### 练习 3：分块与副本的区别

假设文件大小为 10 MiB，Block Size 为 4 MiB，副本数为 3，且全部副本都已经成功建立。

那么实际情况是：

A. 9 个不同的逻辑 Block。

B. 3 个逻辑 Block，共 9 份块副本。

C. 3 个逻辑 Block，共 3 份块副本。

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：B。</strong></p> <p>文件首先被划分为 4 + 4 + 2 MiB，共三个不同的 Block。</p> <p>Replication = 3 表示每一个 Block 需要保存三份，而不是将文件进一步拆成九个不同的 Block。</p> <p>因此逻辑 Block 数量为 3，块副本总数为 9。</p> </details>

### 练习 4：本地文件与 HDFS 文件

通过 `hdfs dfs -put` 将文件上传到 HDFS 后，如果删除 Ubuntu 本地的原始文件，HDFS 中的文件会怎样？

A. 同时消失。

B. 只要 HDFS 数据仍然完好，就可以继续读取。

C. NameNode 自动重新上传本地文件。

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：B。</strong></p> <p>put 操作是将数据上传到 HDFS，而不是创建一个指向本地文件的快捷方式或软链接。</p> <p>因此，上传完成后的 HDFS 文件与 Ubuntu 本地原文件能够独立存在。删除本地文件不会自动删除 HDFS 中的数据。</p> </details>

### 练习 5：NameNode 故障

如果 NameNode 停止运行，而 DataNode 仍然正常工作，一个新的普通 HDFS 客户端请求读取文件，会发生什么？

A. 完全不受影响。

B. 通常无法正常打开文件，因为不能从 NameNode 获取必要的元数据。

C. DataNode 自动成为 NameNode。

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：B。</strong></p> <p>普通 HDFS 客户端需要通过 NameNode 查询文件对应的数据块和存储位置。NameNode 不可用时，新客户端通常无法正常完成文件打开和读取流程。</p> <p>不过，已经打开文件且缓存了必要块位置的客户端，可能继续读取部分数据。因此不能简单理解为所有已经建立的数据传输都会立即停止。</p> </details>

### 练习 6：单节点副本与故障恢复

当前只有一个 DataNode，且一个文件的每个 Block 都只有一份副本。

如果该 DataNode 的存储数据彻底损坏，能否依靠 HDFS 副本机制恢复？

A. 可以，因为 SecondaryNameNode 会保存完整文件。

B. 可以，因为 NameNode 保存完整的数据块。

C. 不可以，因为没有其他可用副本。

<details> <summary>查看答案与解析</summary> <p><strong>正确答案：C。</strong></p> <p>NameNode 管理文件系统元数据，SecondaryNameNode 辅助创建元数据检查点，都不能代替数据块副本。</p> <p>如果唯一的数据副本彻底损坏，且没有其他备份或恢复来源，仅凭 NameNode 保存的文件名和块位置等信息无法恢复原始文件内容。</p> <p>需要区分永久数据损坏与 DataNode 暂时停止运行。如果只是进程停止而底层数据完好，服务恢复后仍有可能正常读取数据。</p> </details>

## 十、本次学习总结

本次实验完成了从 Hadoop 环境恢复到 HDFS 文件操作，再到数据块存储原理的学习过程。

首先在 WSL Ubuntu 中恢复已有 Hadoop 3.4.3 环境，启动 NameNode、DataNode 和 SecondaryNameNode，并通过 `dfsadmin -report` 与 Web UI 确认服务运行正常。

随后通过 HDFS Shell 创建目录、上传与下载文件，并使用 `cmp` 验证了一个 23 字节文本文件的传输完整性。

最后，通过 `dd` 创建 10 MiB 的测试文件，使用 4 MiB Block Size 上传到 HDFS，再通过 `fsck` 真实观察到文件被划分为三个 Block，大小分别为 4 MiB、4 MiB 和 2 MiB。

本次最重要的收获不是记住了多少条 Hadoop 命令，而是理解了 HDFS 的几个核心概念：

- **NameNode 管理元数据，DataNode 保存实际数据。**
    
- **Block 决定文件如何被划分。**
    
- **Replication 决定每个 Block 保存多少份相同数据。**
    
- **分块不等于分机器，块副本数量也不等于逻辑块数量。**
    
- **HDFS 客户端可以按顺序读取分散的数据块，向应用程序提供完整文件内容。**
    

其中，分块与副本的区别是本次学习中比较容易混淆的部分。通过实际分块实验和不同副本数的示意，进一步明确了两者之间的关系。

当前集群只有一个 DataNode，因此仍然没有观察到真正的跨机器副本放置和故障恢复。10 MiB 多 Block 文件的下载哈希验证、HDFS Java API、MapReduce 与 YARN 也留待后续学习。

## 参考资料

1. [WSL 下的 Hadoop 入门笔记（一）：环境准备与 NameNode 启动](https://17356085.github.io/posts/2026/wsl-hadoop-notes-01/)
    
2. [厦门大学数据库实验室：HDFS 编程实践（Hadoop 3.3.5）](https://dblab.xmu.edu.cn/blog/4230/)
    
3. [Apache Hadoop 3.4.3 — HDFS Architecture](https://hadoop.apache.org/docs/r3.4.3/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)
    
4. [Apache Hadoop 3.4.3 — FileSystem Shell](https://hadoop.apache.org/docs/r3.4.3/hadoop-project-dist/hadoop-common/FileSystemShell.html)
    
5. [Apache Hadoop 3.4.3 — HDFS Commands Guide](https://hadoop.apache.org/docs/r3.4.3/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
    
6. [Shirone：Markdown 基础语法](https://docs.shirone.mysqil.com/guide/writing/markdown/basic/)

![9.jpg](https://pub-1d883de109ca4cc6b2cd88abca8c4330.r2.dev/images/posts/5d452f554cf7463fc9cc0ca6a7ef0bd1.jpg)

