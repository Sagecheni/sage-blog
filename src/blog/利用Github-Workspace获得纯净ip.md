---
slug: "利用Github-Workspace获得纯净ip"
title: "利用Github Workspace获得纯净ip"
description: "利用Github Workspace获得纯净ip"
date: 2025-11-14
author: "Sage"
tags: ["network"]
---

## 动机

一开始是在给自己的tg应用注册tg api的时候老是遇到ip风控问题,于是就想能不能搞到一个比较纯净的境外ip,所以就盯上了GitHub Codespace的主意.

核心是**利用 GitHub Codespace（微软 Azure 的纯净 IP）+ Cloudflare WARP（进一步清洗 IP）+ 端口转发，欺骗 Telegram 的服务器。**

## 步骤

### 第一步：启动 GitHub Codespace

1. 打开任意一个你的 GitHub 仓库（或者新建一个空的）。
2. 点击 **Code** 按钮 -> **Codespaces** 标签页 -> **Create codespace on main**。
3. 等待网页版 VS Code 加载完成，打开下方的 **Terminal (终端)**。

### 第二步：在 Codespace 中安装并配置 WARP

在终端中依次执行以下命令（可以直接复制粘贴）：

1. **添加 Cloudflare GPG 密钥和源：**

```bash
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list

```

1. **更新并安装 WARP：**

```bash
sudo apt-get update && sudo apt-get install cloudflare-warp -y

```

1. **注册并配置 WARP 为 SOCKS5 代理模式：**
*这是关键步骤，我们要让 WARP 监听本地的一个端口（比如 1080），把流量通过 WARP 隧道发出去。*

```bash

# 启动wrap服务
sudo systemctl start warp-svc


# 注册客户端
warp-cli registration new

# 设置模式为代理模式 (Proxy Mode)
warp-cli mode proxy

# 设置代理端口为 1080
warp-cli proxy port 1080

# 连接 WARP
warp-cli connect

```

1. **验证连接：**
输入 `curl -x socks5://127.0.0.1:1080 ifconfig.me`。
如果返回了一个 IP 地址（通常是 Cloudflare 的 IP），说明代理已经通了。

### 第三步：VS Code 端口转发 (Port Forwarding)

我们要把 Codespace 里的 `1080` 端口映射到你本地电脑的 `1080` 端口。

1. 在网页版 VS Code 底部面板，找到 **PORTS (端口)** 标签页。
2. 点击 **Add Port (添加端口)**。
3. 输入 `1080` 并回车。
4. 此时你应该能看到 Port 1080 的状态是 Green (Active)，并且 Visibility 是 Private。
5. **关键点**：VS Code 会把这个远程端口映射到你本地的 `localhost:1080`。

### 第四步：本地浏览器连接代理

现在电脑上有了一个 `localhost:1080` 的 SOCKS5 代理，它的出口是 Azure 上的 WARP 节点。使用自己的代理软件或者SwitchyOmega之类的插件就能实现代理了.
