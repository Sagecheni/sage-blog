---
slug: "我的rss构筑"
title: "我的rss构筑"
description: "讲述了我个人在Unraid上构筑的rss系统"
date: 2026-01-06
author: "Sage"
tags: ["rss", "NAS"]
---

## 最终效果

![Reeder图.png](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/Reeder图.png)

![miniflux展示图.png](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/miniflux展示图.png)

## 构筑大概

整个系统由三部分组成：

- [RSSHub](https://github.com/DIYgod/RSSHub)(RSS源)
- [Miniflux](https://miniflux.app/)(RSS订阅器)
- [Reeder5](https://reederapp.com/)(RSS阅读器)



我的所有服务都是在内网构筑的，不怕有入侵，所以安全性可能比较堪忧，**需要对外网开放的可能需要:red[注意下安全性]**。

## RSSHUB

[**RSSHub**](https://github.com/DIYgod/RSSHub)无疑是最佳的开源rss源获取器了，绝大部分的RSS源通过配置或者自己的一些调整都能够成功获取。我个人的rsshub是经过了一些代码上的魔改，和官方的有点出入，但大部分情况下，官方版本的rsshub已经是够用的了。

### X(Twitter)的RSS源获取

由于X的反爬特别严格而且每个帐号每日观看的post是有限的，所以我创了三个号轮流使用。此外，对X的RSS源获取，我并没有使用RSSHub，而是用了[**Nitter**](https://github.com/zedeus/nitter)这个项目。Nitter直接提供了RSS订阅源。

![Nitter示例](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/CleanShot%202026-01-07%20at%2000.19.38%402x.png)

效果还不错。

除此之外，为了规避频繁爬取X以及便捷地添加我想要订阅的X用户，我写了一个聚合服务定时爬取。

![Nitter Aggregator](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/CleanShot%202026-01-07%20at%2000.22.14%402x.png)

## Miniflux

:::cite{.bi}
Miniflux is a minimalist and opinionated feed reader.

Miniflux 是一款简约而有主见的 feed 阅读器。
:::


### 为什么是Miniflux

实际上，我自己就在FreshRss和Miniflux这两个订阅器里面纠结了挺久的。这两个都是开源的rss阅读器。FreshRss功能强大，Miniflux效率够高且简约。最后出于Miniflux是Go写的选择了Miniflux，因为我自己后续需要对Miniflux进行一些魔改，所以选择了更加熟悉的Go。（FreshRss居然是拿PHP写的）。



### 部署

我是在自己的NAS上使用docker compsoe的形式部署的。此处是官方的文档->[Miniflux Installation with Docker](https://miniflux.app/docs/docker.html)

下面的配置都是个人的，可以根据官方文档进行适当的更改。
```yaml
services:
  miniflux:
    image: miniflux/miniflux:latest
    container_name: miniflux
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=
      - RUN_MIGRATIONS=1
      - CREATE_ADMIN=1
      - ADMIN_USERNAME=
      - ADMIN_PASSWORD=
      - BASE_URL=
      - BATCH_SIZE=30
      - MEDIA_PROXY_MODE=all
      - MEDIA_PROXY_RESOURCE_TYPES=image,audio,video
      - MEDIA_PROXY_CUSTOM_URL=
      - MEDIA_PROXY_PRIVATE_KEY=
      - HTTP_CLIENT_USER_AGENT=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
      - POLLING_SCHEDULER=entry_frequency
      - SCHEDULER_ENTRY_FREQUENCY_MAX_INTERVAL=1440
      - HTTP_CLIENT_TIMEOUT=60
      - POLLING_LIMIT_PER_HOST=3
      - CLEANUP_ARCHIVE_READ_DAYS=0
      - CLEANUP_ARCHIVE_UNREAD_DAYS=0
      - DATABASE_MAX_CONNS=50
      - DATABASE_MIN_CONNS=5
      - WORKER_POOL_SIZE=10
    ports:
      - "8091:8080"
    networks:
      - rss_internal

  db:
    image: postgres:15-alpine
    container_name: miniflux-db
    restart: always
    environment:
      - POSTGRES_USER=
      - POSTGRES_PASSWORD=
      - POSTGRES_DB=
    volumes:
      - /mnt/cache/appdata/miniflux/db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U miniflux"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - rss_internal

networks:
  rss_internal:
    external: true
```


### 缓存服务

Miniflux只有图片代理服务(Image Proxy)，这对我一个拿RSS来刷Twitter、抖音、B站的人着实不太友好，于是使用Nginx实现了一个依附于nginx的缓存服务。

```nginx
worker_processes auto;
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    proxy_cache_path /var/cache/nginx/miniflux_media 
                     levels=1:2 
                     keys_zone=miniflux_media_cache:10m 
                     max_size=10g 
                     inactive=7d 
                     use_temp_path=off;
    log_format main '$remote_addr - [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$upstream_cache_status" -> "$target_host" ($upstream_status)';

    access_log /dev/stdout main;
    error_log /dev/stderr warn;

    server {
        listen 80;
        server_name localhost;
        resolver 127.0.0.11 ipv6=off;

        location / {
            valid_referers none blocked miniflux.sagec.fun;
            if ($invalid_referer) {
                return 403;
            }
            set $target_url "";
            set $target_host "";
            access_by_lua_block {
                local req_uri = string.sub(ngx.var.uri, 2)
                if req_uri == "" then return ngx.exit(404) end
                local common_base64 = string.gsub(req_uri, "-", "+")
                common_base64 = string.gsub(common_base64, "_", "/")

                local decoded = ngx.decode_base64(common_base64)
                if not decoded then
                    ngx.log(ngx.ERR, "Base64 error: ", req_uri)
                    return ngx.exit(404)
                end
                ngx.var.target_url = decoded
                -- 匹配 http:// 或 https:// 后面的部分，直到遇到下一个 /
                local host = string.match(decoded, "^https?://([^/]+)")
                
                if not host then
                    ngx.log(ngx.ERR, "No host found in: ", decoded)
                    return ngx.exit(400)
                end
                
                ngx.var.target_host = host
            }
            proxy_pass $target_url;
            proxy_ssl_server_name on;
            proxy_set_header Host $target_host;
            proxy_ssl_name $target_host;
            proxy_cache miniflux_media_cache;
            proxy_cache_valid 200 301 302 7d;
            proxy_cache_valid 404 500 502 10s;
            proxy_ignore_headers Set-Cookie Cache-Control Expires X-Accel-Expires;
            proxy_hide_header Set-Cookie;
            proxy_set_header User-Agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            proxy_set_header Referer "";
            proxy_intercept_errors on;
            error_page 404 500 502 503 504 = @fallback;
        }

        location @fallback {
            return 302 https://http.cat/404.jpg;
        }
    }
}
```





## Reeder5

选择Reeder5的原因很简单，好用而且是买断制。实际上，Mac上也有开源的[NetNewsWire](https://netnewswire.com/)，但由于我个人审美的原因，还是选择了Reeder。

（感觉被Apple统治大脑了....一百多块的东西随手就买了....）

![Apple 订单](https://sageblog-1316665129.cos.ap-guangzhou.myqcloud.com/img/image-20260106211512891.png)



