#!/usr/bin/env python3
"""Rebuild the zouzhe APK with multi-trip management.
Single source: multi_trip_v3.js injected at build time.
Uses sign-apk-py for V2+V3 signing. Package: com.zouzhe.pro.
Preserves original APK compression (resources.arsc STORED, etc).
Usage: python3 rebuild_apk.py [version]
"""
import os, sys, subprocess, zipfile, io

WORK = os.path.dirname(os.path.abspath(__file__))
ORIG_APK = os.environ.get("ORIG_APK", os.path.join(os.path.dirname(WORK), "dist", "zouzhe-v1.2.2.apk"))
JS_SOURCE = os.path.join(WORK, "multi_trip_v3.js")
KEY_PATH = os.path.join(WORK, "zouzhe_key.pem")
CERT_PATH = os.path.join(WORK, "zouzhe_cert.pem")
OUTPUT_DIR = os.path.join(os.path.dirname(WORK), "outputs")
SIGN_APK_PY = "/tmp/sign-apk-py"
OLD_PKG = "com.zouzhe.app"
NEW_PKG = "com.zouzhe.pro"

def build_unsigned(version):
    orig_zip = zipfile.ZipFile(ORIG_APK, "r")
    orig_html = orig_zip.read("assets/index.html").decode("utf-8", errors="replace")
    with open(JS_SOURCE, "r", encoding="utf-8") as f:
        js_code = f.read()
    injection = chr(10) + "<script>" + chr(10) + js_code + chr(10) + "</script>" + chr(10)
    addon_end = orig_html.find("<!--ZZ_ADDON_END-->")
    if addon_end >= 0:
        insert_pos = addon_end + len("<!--ZZ_ADDON_END-->")
        modified_html = orig_html[:insert_pos] + injection + orig_html[insert_pos:]
    else:
        body_close = orig_html.find("</body>")
        modified_html = orig_html[:body_close] + injection + orig_html[body_close:]
    modified_html_bytes = modified_html.encode("utf-8")
    old_utf16 = OLD_PKG.encode("utf-16-le")
    new_utf16 = NEW_PKG.encode("utf-16-le")
    manifest = bytearray(orig_zip.read("AndroidManifest.xml"))
    p = manifest.find(old_utf16)
    if p >= 0: manifest[p:p+len(old_utf16)] = new_utf16
    arsc = bytearray(orig_zip.read("resources.arsc"))
    p = arsc.find(old_utf16)
    if p >= 0: arsc[p:p+len(old_utf16)] = new_utf16
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    unsigned_path = os.path.join(OUTPUT_DIR, "走哲Pro_unsigned.apk")
    with zipfile.ZipFile(unsigned_path, "w") as z:
        for item in orig_zip.infolist():
            if item.filename.startswith("META-INF/"):
                continue
            if item.filename == "assets/index.html":
                content = modified_html_bytes
            elif item.filename == "AndroidManifest.xml":
                content = bytes(manifest)
            elif item.filename == "resources.arsc":
                content = bytes(arsc)
            else:
                content = orig_zip.read(item.filename)
            zi = zipfile.ZipInfo(item.filename)
            zi.compress_type = item.compress_type
            zi.external_attr = item.external_attr
            zi.internal_attr = item.internal_attr
            zi.create_system = item.create_system
            zi.date_time = item.date_time
            z.writestr(zi, content)
    orig_zip.close()
    return unsigned_path

def sign_apk(unsigned_path, output_path):
    env = os.environ.copy()
    env["PYTHONPATH"] = SIGN_APK_PY
    cmd = [sys.executable, "-m", "sign_apk.cli", "sign",
           "--key", KEY_PATH, "--cert", CERT_PATH,
           "--v2", "--v3",
           unsigned_path, output_path]
    r = subprocess.run(cmd, cwd=SIGN_APK_PY, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        print("SIGN ERROR: " + r.stderr)
        sys.exit(1)
    print(r.stdout.strip())

def verify(apk_path):
    print(chr(10) + "=== POST-BUILD VERIFICATION ===")
    env = os.environ.copy()
    env["PYTHONPATH"] = SIGN_APK_PY
    r = subprocess.run([sys.executable, "-m", "sign_apk.cli", "verify", apk_path],
                       cwd=SIGN_APK_PY, env=env, capture_output=True, text=True)
    print(r.stdout.strip())
    all_ok = r.returncode == 0
    with zipfile.ZipFile(apk_path, "r") as z:
        html = z.read("assets/index.html").decode("utf-8", errors="replace")
        manifest = z.read("AndroidManifest.xml")
    checks = ["TRIP_DATA", "switchMapSystem", "tagSheetElement",
              "injectNodeInfo", "patchTitleBar", "injectReservationButton"]
    for c in checks:
        ok = c in html
        print("  " + ("OK" if ok else "FAIL") + " " + c)
        if not ok: all_ok = False
    count = html.count("Multi-Trip Management Layer")
    print("  Injection count: " + str(count))
    if count != 1: all_ok = False
    pkg_ok = NEW_PKG.encode("utf-16-le") in manifest
    print("  Package " + NEW_PKG + ": " + ("OK" if pkg_ok else "FAIL"))
    if not pkg_ok: all_ok = False
    print("  APK size: " + str(os.path.getsize(apk_path)) + " bytes")
    return all_ok

if __name__ == "__main__":
    version = sys.argv[1] if len(sys.argv) > 1 else "9.4.0"
    print("Building 走哲Pro v" + version + "...")
    unsigned = build_unsigned(version)
    output = os.path.join(OUTPUT_DIR, "走哲Pro_v" + version + ".apk")
    sign_apk(unsigned, output)
    ok = verify(output)
    os.remove(unsigned)
    if ok:
        print(chr(10) + "Build complete and verified.")
    else:
        print("WARNING: Verification failed!")
        sys.exit(1)
