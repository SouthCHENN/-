import json
d=json.load(open('italy.json'))
days=d['days']
L=[]
A=L.append

A("# 意大利 13 日行程 · 文字版\n")
A("> **2026.09.24（周四）– 10.06（周二）**　罗马 / 索伦托 / 卡普里 / 佛罗伦萨 / 威尼斯 / 米兰  ")
A(f"> 共 {len(days)} 天 · {sum(len(x.get('nodes',[])) for x in days)} 个行程节点  ")
A("> 数据取自 走哲Pro v9.5.2（`com.zouzhe.pro`）内置意大利行程  ")
A("> **用途**：核对 / 调整细节。改完发我，我同步回 App。\n")
A("---\n")

# ---------- 总览 ----------
A("## 一、行程总览\n")
A("| 日 | 日期 | 城市 | 当日概要 | 节点 | 行李 |")
A("|---|---|---|---|---:|---|")
for x in days:
    bag='🧳 携行李' if x.get('bag') else ''
    A(f"| **D{x['n']}** | {x['date']} 周{x['wk']} | {x['city']} | {x['sum']} | {len(x.get('nodes',[]))} | {bag} |")
A("")
A("**住宿一览**（按住宿夜归并）\n")
A("| 住宿夜 | 城市 | 住宿 | 地址 | 电话 |")
A("|---|---|---|---|---|")
CITY={'Roma':'罗马','Sorrento':'索伦托','Firenze':'佛罗伦萨','Venezia':'威尼斯','Milano':'米兰'}
groups=[]
for x in days:
    s=x.get('stay') or {}
    nm=s.get('name')
    if not nm: continue
    if groups and groups[-1][0]==nm: groups[-1][1].append(x)
    else: groups.append([nm,[x],s])
for nm,ds,s in groups:
    rng=f"D{ds[0]['n']}" if len(ds)==1 else f"D{ds[0]['n']}–D{ds[-1]['n']}"
    addr=max((g.get('stay') or {}).get('addr','') for g in ds)  # longest = most detailed
    city=next((v for k,v in CITY.items() if k in addr),'')
    A(f"| **{rng}**（{len(ds)} 晚） | {city} | {nm} | {addr} | {s.get('tel','—')} |")
A("")
A("> D13（10.6）当晚航班回北京，无住宿。")
A("> ⚠ **D11（10.4）白天在威尼斯，但当晚住米兰** —— 傍晚 18:50 取箱后乘车赴米兰。\n")

# ---------- 清单 ----------
A("## 二、出发前准备（{} 项）\n".format(len(d['pre'])))
for i,x in enumerate(d['pre'],1): A(f"{i}. [ ] {x}")
A("")
A("## 三、餐厅 / 门票预订待办（{} 项）\n".format(len(d['book'])))
for i,x in enumerate(d['book'],1): A(f"{i}. [ ] {x}")
A("")
A("## 四、应急电话与领事保护\n")
for x in d['emg']: A(f"- **{x['label']}**：`{x['num']}`")
A("")
for x in d['cons']: A(f"- **{x['label']}**：`{x['num']}`")
A("\n---\n")
A("# 每日详情\n")

for x in days:
    A(f"## D{x['n']} · {x['date']}（周{x['wk']}）· {x['city']}\n")
    A(f"**{x['sum']}**\n")
    A(f"- **路线**：{x.get('route','—')}")
    if x.get('bagLine'): A(f"- **行李**：{x['bagLine']}")
    dep=x.get('deposit')
    if dep: A(f"- **寄存（{dep.get('tag','')}）**：{dep.get('line','')}　<sub>{dep.get('sub','')}</sub>")
    s=x.get('stay') or {}
    if s: A(f"- **住宿**：{s.get('name','')}　{s.get('addr','')}　☎ {s.get('tel','—')}")
    dn=x.get('dinner') or {}
    if dn: A(f"- **晚餐**：{dn.get('name','')}　<sub>{dn.get('info','')}</sub>")
    if x.get('tip'): A(f"- **⚠ 当日提示**：{x['tip']}")
    A("")
    if x.get('daily'):
        A("**当日清单**\n")
        for it in x['daily']: A(f"- [ ] {it}")
        A("")
    A("**时间线**\n")
    for n in x.get('nodes',[]):
        tag=f" `{n['tag']}`" if n.get('tag') else ""
        A(f"**{n['t']}　{n['title']}**{tag}  ")
        if n.get('sub'):  A(f"　说明：{n['sub']}  ")
        if n.get('note'): A(f"　备注：{n['note']}  ")
        if n.get('alt'):  A(f"　备选：{n['alt']}  ")
        if n.get('addr') or n.get('tel'):
            bits=[]
            if n.get('addr'): bits.append(n['addr'])
            if n.get('tel'):  bits.append("☎ "+n['tel'])
            A("　地址："+"　".join(bits)+"  ")
        meta=[]
        if n.get('wc'):     meta.append("厕所 "+n['wc'])
        if n.get('rating') and n['rating']!='—': meta.append("评分 "+n['rating'])
        if meta: A("　"+" ｜ ".join(meta)+"  ")
        if n.get('tip'):  A(f"　提示：{n['tip']}  ")
        A("")
    A("---\n")

open('意大利13日行程.md','w',encoding='utf-8').write("\n".join(L))
print("written, lines:", len(L))

# ---------- 附录：需要确认的点 ----------
L2=[]
B=L2.append
dup=[];default=[]
for x in days:
    for n in x.get('nodes',[]):
        tip=(n.get('tip') or '').replace(' ','').replace('·','')
        base=((n.get('sub') or '')+(n.get('note') or '')).replace(' ','').replace('·','')
        if tip and base and (tip in base or base.startswith(tip[:8])):
            dup.append((x['n'],n['t'],n['title'],n.get('tip')))
        if n.get('wc')=='有' and n.get('rating')=='4.0' and not n.get('tip'):
            default.append((x['n'],n['t'],n['title']))
B("# 附录：建议确认 / 调整的点\n")
B("以下是我从数据里发现的可疑处，**不是行程本身的问题**，而是数据录入痕迹。你确认后我一并改掉。\n")
B(f"## A. 「提示」与「说明」重复（{len(dup)} 处）\n")
B("这些节点的「提示」几乎是「说明」的复述，App 里会显示两遍。建议**删掉提示**或改写成真正的提醒。\n")
B("| 日 | 时间 | 节点 | 重复的提示 |")
B("|---|---|---|---|")
for n_,t,ti,tp in dup: B(f"| D{n_} | {t} | {ti} | {tp} |")
B("")
B(f"## B. 疑似默认填充的「厕所 / 评分」（{len(default)} 处）\n")
B("原始行程数据里这些节点**没有**厕所与评分信息，是构建时统一补成「厕所 有 / 评分 4.0」的，**未经核实**。建议逐条确认或改成「—」。\n")
B("| 日 | 时间 | 节点 |")
B("|---|---|---|")
for n_,t,ti in default: B(f"| D{n_} | {t} | {ti} |")
B("")
B("## C. 其他\n")
B("1. **准备清单第 2 条**标着「已作废：补 10.1 坎帕尼亚快线车票」——既然已作废，建议直接删除。")
B("2. **D11（10.4）**白天在威尼斯、当晚住米兰，住宿表已标注；确认是否符合预期。")
B("3. **D13（10.6）**当晚飞机回北京，无住宿。")
B("4. 交通类节点的评分统一为「—」，属正常（不评分）。")
open('意大利13日行程.md','a',encoding='utf-8').write("\n"+"\n".join(L2))
print("appendix appended")
