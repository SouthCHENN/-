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
# The activity is declared with a relative name (".MainActivity"), which resolves
# against the manifest package attribute. Renaming the package to com.zouzhe.pro
# would make it resolve to com.zouzhe.pro.MainActivity, but classes.dex still
# defines com.zouzhe.app.MainActivity -> ClassNotFoundException / crash on launch.
# Rewrite the activity name to the absolute class so it points at the real DEX
# class while the app id stays com.zouzhe.pro.
ACT_OLD = ".MainActivity"
ACT_NEW = OLD_PKG + ".MainActivity"

import struct

def axml_set_string(data, old, new):
    """Replace a full string value in a binary AXML string pool and rebuild the
    chunk (offsets + sizes). Strings are referenced by index elsewhere, so
    changing a value (not the count/order) keeps the rest of the tree valid."""
    data = bytearray(data)
    if struct.unpack_from("<H", data, 0)[0] != 0x0003:
        raise ValueError("not a binary AXML file")
    sp = 8  # string pool chunk starts right after the 8-byte root header
    if struct.unpack_from("<H", data, sp)[0] != 0x0001:
        raise ValueError("string pool not first chunk")
    sp_size = struct.unpack_from("<I", data, sp + 4)[0]
    sc, styc, flags, str_start, sty_start = struct.unpack_from("<IIIII", data, sp + 8)
    if flags & 0x100:
        raise ValueError("UTF-8 string pool not supported")
    if flags & 0x01:
        raise ValueError("sorted string pool not supported")
    if styc != 0:
        raise ValueError("styled string pool not supported")
    ob = sp + 28
    offs = [struct.unpack_from("<I", data, ob + i * 4)[0] for i in range(sc)]
    strbase = sp + str_start
    def readstr(o):
        p = strbase + o
        n = struct.unpack_from("<H", data, p)[0]; p += 2
        if n & 0x8000:
            n = ((n & 0x7fff) << 16) | struct.unpack_from("<H", data, p)[0]; p += 2
        return data[p:p + n * 2].decode("utf-16-le")
    strings = [readstr(o) for o in offs]
    if old not in strings:
        raise ValueError("string %r not found in pool" % old)
    strings[strings.index(old)] = new
    # rebuild string data blob
    newoffs = []
    blob = bytearray()
    for s in strings:
        newoffs.append(len(blob))
        blob += struct.pack("<H", len(s))
        blob += s.encode("utf-16-le")
        blob += b"\x00\x00"
    while len(blob) % 4 != 0:
        blob += b"\x00"
    new_str_start = 28 + sc * 4
    pool = bytearray(28)
    struct.pack_into("<HH", pool, 0, 0x0001, 28)          # type, header size
    struct.pack_into("<IIIII", pool, 8, sc, 0, flags, new_str_start, 0)
    pool += b"".join(struct.pack("<I", o) for o in newoffs)
    pool += blob
    struct.pack_into("<I", pool, 4, len(pool))            # chunk size
    newdata = bytearray(data[:sp]) + pool + data[sp + sp_size:]
    struct.pack_into("<I", newdata, 4, len(newdata))      # root total size
    return bytes(newdata)

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
    # After the package rename, point the (relative) launcher activity at its real
    # absolute class in classes.dex so it is still found under the new package id.
    manifest = bytearray(axml_set_string(bytes(manifest), ACT_OLD, ACT_NEW))
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
