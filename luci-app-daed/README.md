# luci-app-daede

OpenWrt LuCI 管理界面，用于 **dae** 和 **daed** 透明代理后端。

## 安装

### 一键安装

```bash
wget -O - https://raw.githubusercontent.com/kenzok8/luci-app-daede/refs/heads/main/scripts/install.sh | ash
```

大陆网络加速：

```bash
wget --no-check-certificate -O - https://ghfast.top/https://raw.githubusercontent.com/kenzok8/luci-app-daede/refs/heads/main/scripts/install.sh | ash
```

### 卸载

```bash
wget -O - https://raw.githubusercontent.com/kenzok8/luci-app-daede/refs/heads/main/scripts/uninstall.sh | ash
```

## 使用

1. 安装后进入 LuCI「服务 → DAEd」
2. 选择后端（dae 或 daed）
3. 导入配置文件并启动

## 依赖

| 包名 | 说明 |
|------|------|
| `luci-app-daede` | LuCI 管理界面 |
| `dae` 或 `daed` | 透明代理后端（二选一） |
| `luci` | OpenWrt Web 框架 |

## 系统要求

- OpenWrt 24.10+（推荐 25.x）

## 致谢

- [dae](https://github.com/daeuniverse/dae) — 高性能透明代理
- [daed](https://github.com/daeuniverse/daed) — dae 的 Dashboard 增强版

## 许可证

见仓库内 LICENSE 文件。
