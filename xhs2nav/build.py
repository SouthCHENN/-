#!/usr/bin/env python3
"""把 src/ 打包成单文件 xhs2nav/index.html。

顺序有意义：net.js 必须在 vision.js / geocode.js 之前（后者取 window.ZZNet），
app.js 最后（它依赖前面全部模块挂到 window 上）。
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'index.html'
ORDER = ['parse.js', 'links.js', 'net.js', 'vision.js', 'geocode.js', 'app.js']


def main():
    tpl = (SRC / 'index.template.html').read_text(encoding='utf-8')
    css = (SRC / 'style.css').read_text(encoding='utf-8')

    parts = []
    for name in ORDER:
        p = SRC / name
        if not p.exists():
            sys.exit(f'缺少 {p}')
        parts.append(f'/* ===== {name} ===== */\n' + p.read_text(encoding='utf-8'))
    js = '\n;\n'.join(parts)

    # 内联 JS 里若出现 </script> 会提前终结标签，防御性转义（与 走着 的 inject_addon.py 同策略）
    js = js.replace('</script', '<\\/script')

    html = tpl.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
    OUT.write_text(html, encoding='utf-8')
    print(f'打包完成 -> {OUT}  ({len(html) // 1024} KB)')


if __name__ == '__main__':
    main()
