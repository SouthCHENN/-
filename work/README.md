# 走哲Pro — APK 复现构建

在原版「走着」APK（`com.zouzhe.app`）基础上，通过**构建期 JS 注入**扩展为多行程管理版
`走哲Pro`（`com.zouzhe.pro`），不改动任何 Java 编译产物。

## 文件

| 文件 | 说明 |
|---|---|
| `multi_trip_v3.js` | 唯一 JS 源（约 100KB）：多行程/地图/主题/餐厅预定注入层 |
| `rebuild_apk.py` | 构建脚本：注入 → 改包名 → V2+V3 签名 → 校验 |
| `zouzhe_key.pem` / `zouzhe_cert.pem` | 签名用私钥/证书（**不入库**，见下） |
| `venv/` | 带可用 `cryptography` 的 Python 环境（**不入库**） |

原版 APK 取自仓库内 `../dist/zouzhe-v1.2.2.apk`（4,978,012 bytes，`com.zouzhe.app`）。

## 构建流程

脚本 `rebuild_apk.py` 完成以下步骤：

1. 从原版 APK 解出 `assets/index.html`；
2. 在 `<!--ZZ_ADDON_END-->` 标记之后注入 `multi_trip_v3.js`（若无标记则回退到 `</body>` 前）；
3. 将 `AndroidManifest.xml` 与 `resources.arsc` 中的包名 `com.zouzhe.app` → `com.zouzhe.pro`（UTF‑16LE 原地等长替换）；
4. 逐条目复制并**保留原压缩方式**（`resources.arsc` 等为 STORED），丢弃旧的 `META-INF/`（v1 JAR 签名）；
5. 用纯 Python 的 [`sign-apk-py`](https://github.com/adityatelange/sign-apk-py) 做 **APK Signature Scheme V2+V3** 签名；
6. 构建后自检：关键函数签名、注入次数=1、新包名存在、签名有效。

## 在本环境复现

系统自带的 `cryptography` 的 Rust 绑定不可用，因此单独建一个 venv：

```bash
# 1) 准备签名器
git clone --depth 1 https://github.com/adityatelange/sign-apk-py /tmp/sign-apk-py

# 2) 准备一个 cryptography 可用的 Python 环境
python3 -m venv work/venv
work/venv/bin/pip install cryptography

# 3) 从仓库密钥库导出私钥/证书（口令 zouzhe2026）
openssl pkcs12 -in keystore/zouzhe.keystore -passin pass:zouzhe2026 -nocerts  -nodes    -out work/zouzhe_key.pem
openssl pkcs12 -in keystore/zouzhe.keystore -passin pass:zouzhe2026 -clcerts -nokeys    -out work/zouzhe_cert.pem
# （去掉 openssl 的 Bag Attributes，仅保留 PEM 块）

# 4) 构建（用 venv 的 python，脚本以 sys.executable 调用签名器）
cd work && ../work/venv/bin/python rebuild_apk.py 9.5.0
# 产物: outputs/走哲Pro_v9.5.0.apk
```

## 校验结果（v9.5.0）

```
VALID (APK Signature Scheme v2+v3)
  v2/v3 signer: CN=Zouzhe Travel,OU=Zouzhe,O=Zouzhe,C=CN
  OK TRIP_DATA / switchMapSystem / tagSheetElement / injectNodeInfo / patchTitleBar / injectReservationButton
  Injection count: 1
  Package com.zouzhe.pro: OK
  APK size: 5,002,410 bytes
```

另经独立核验：ZIP 完整、无 `META-INF/`、`resources.arsc` 为 STORED、全部 STORED 条目 4 字节对齐、
新旧包名替换到位、注入脚本紧随 `<!--ZZ_ADDON_END-->`。

## 签名密钥说明

私钥/证书 PEM 与 venv 不纳入版本库（见 `.gitignore`）。签名密钥即仓库内
`keystore/zouzhe.keystore`（口令 `zouzhe2026`，仅供个人侧载），可随时按上文重新导出。
