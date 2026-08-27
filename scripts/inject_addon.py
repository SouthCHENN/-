#!/usr/bin/env python3
"""把 addon/ 下的插件脚本幂等注入 app/src/main/assets/index.html。

按文件名排序拼接 addon/*.js，包在标记注释之间插入最外层 </body> 之前；
再次运行会先移除旧块再插入新块（幂等，可反复执行）。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / 'app/src/main/assets/index.html'
ADDON_DIR = ROOT / 'addon'
BEGIN, END = '<!--ZZ_ADDON_BEGIN-->', '<!--ZZ_ADDON_END-->'

def main():
    parts = sorted(ADDON_DIR.glob('*.js'))
    if not parts:
        sys.exit('addon/*.js 不存在')
    js = '\n;\n'.join(p.read_text(encoding='utf-8') for p in parts)
    # </script> 出现在内联 JS 字符串里会提前终结 script 标签，防御性转义
    js = js.replace('</script', '<\\/script')
    block = f'{BEGIN}\n<script id="zz-addon">\n{js}\n</script>\n{END}'

    html = HTML.read_text(encoding='utf-8')
    html = re.sub(re.escape(BEGIN) + r'.*?' + re.escape(END), '', html, flags=re.S)
    idx = html.rfind('</body>')
    if idx < 0:
        sys.exit('index.html 缺少 </body>')
    html = html[:idx] + block + '\n' + html[idx:]
    HTML.write_text(html, encoding='utf-8')
    print(f'注入完成：{len(parts)} 个插件文件，共 {len(js)//1024} KB -> {HTML}')

if __name__ == '__main__':
    main()
