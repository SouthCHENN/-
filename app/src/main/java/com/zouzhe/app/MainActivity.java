package com.zouzhe.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.DialogInterface;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * 「走着」离线行程 App 的 WebView 壳。
 * 承载 assets/index.html（自包含离线单文件：字体、运行时、数据全内置）。
 *
 * 职责（见 design/README.md 路径 A）：
 *  - file:///android_asset 内部加载，localStorage 持久化（domStorageEnabled）
 *  - 拦截 tel: 转系统拨号盘
 *  - 拦截外部 http(s)（Google Maps 等）转外部浏览器/地图 App；
 *    页面用 window.open(url,'_blank') 唤起地图，WebView 默认会静默拦截它，
 *    故注入 window.open → ZouzheBridge.openUrl 桥接，另设 onCreateWindow 兜底
 *  - file:// 是非安全上下文，navigator.clipboard 不可用：注入桥接
 *    （ZouzheBridge.copy → 系统剪贴板），保证「复制地址/电话」可用
 */
public class MainActivity extends Activity {

    private static final int BG = Color.parseColor("#0A0F1C");
    private static final int BG_LIGHT = Color.parseColor("#F2F5F9");
    private static final String JS_SHIM =
            "(function(){" +
            "if(!window.ZouzheBridge)return;" +
            // navigator.clipboard 桥接
            "var w=function(t){try{window.ZouzheBridge.copy(String(t));return Promise.resolve();}" +
            "catch(e){return Promise.reject(e);}};" +
            "try{var c=navigator.clipboard;" +
            "if(c&&c.writeText){c.writeText=w;}" +
            "else{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:w}});}}" +
            "catch(e){try{navigator.clipboard.writeText=w;}catch(_){}}" +
            // window.open 桥接（在线地图等外链交给系统打开）
            "try{window.open=function(u){if(u){window.ZouzheBridge.openUrl(String(u));}return null;};}catch(e){}" +
            "})();";

    private static final int REQ_FILE_CHOOSER = 7001;

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCb;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            webView = new WebView(this);
        } catch (Throwable t) {
            // 个别精简 ROM 没有 WebView 组件，优雅退出而非崩溃
            Toast.makeText(this, getString(R.string.no_webview), Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        webView.setBackgroundColor(BG);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);      // localStorage 持久化（勾选/进度）必需
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);        // file:///android_asset 加载
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setTextZoom(100);                // 忽略系统字体缩放，保持像素级设计稿布局
        s.setSupportZoom(false);
        s.setDisplayZoomControls(false);
        s.setBuiltInZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(true); // window.open 走 onCreateWindow 兜底而非被静默丢弃

        webView.addJavascriptInterface(new Bridge(this, this), "ZouzheBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null || url.startsWith("file://")) return false; // 内部页面
                openExternal(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript(JS_SHIM, null);
            }
        });

        // 兜底：JS 桥注入前/失效时 window.open 落到这里，取出目标 URL 转外部打开；
        // onShowFileChooser 支撑页面 <input type="file">（票根上传拉起相册/文件选择器）
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCb != null) fileChooserCb.onReceiveValue(null);
                fileChooserCb = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileChooserCb = null;
                    Toast.makeText(MainActivity.this, getString(R.string.no_app_found),
                            Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                WebView popup = new WebView(view.getContext());
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(final WebView v, String url) {
                        openExternal(url);
                        v.post(new Runnable() {
                            @Override
                            public void run() {
                                v.destroy();
                            }
                        });
                        return true;
                    }
                });
                ((WebView.WebViewTransport) resultMsg.obj).setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });

        setContentView(webView);

        // 页面运行时用到 ?? 等语法，需 Chromium 80+（2020 年后更新过的
        // Android System WebView 均满足）；内核过旧时提示更新而非白屏报错
        int chrome = chromeMajor(this);
        if (chrome > 0 && chrome < 80) {
            showOldWebViewDialog(chrome);
        } else {
            loadApp();
        }
    }

    private void loadApp() {
        webView.loadUrl("file:///android_asset/index.html");
    }

    /** 从 WebView 默认 UA 解析 Chromium 主版本号；解析不出返回 -1（按可用处理）。 */
    private static int chromeMajor(Context ctx) {
        try {
            String ua = WebSettings.getDefaultUserAgent(ctx);
            int i = ua.indexOf("Chrome/");
            if (i < 0) return -1;
            int j = i + 7, k = j;
            while (k < ua.length() && Character.isDigit(ua.charAt(k))) k++;
            return Integer.parseInt(ua.substring(j, k));
        } catch (Throwable t) {
            return -1;
        }
    }

    private void showOldWebViewDialog(int chrome) {
        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.webview_old_title))
                .setMessage(getString(R.string.webview_old_msg, chrome))
                .setCancelable(false)
                .setPositiveButton(R.string.webview_old_try, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface d, int w) {
                        loadApp();
                    }
                })
                .setNegativeButton(R.string.webview_old_exit, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface d, int w) {
                        finish();
                    }
                })
                .show();
    }

    private void openExternal(String url) {
        openExternal(this, url);
    }

    /**
     * tel: 转拨号盘；Google Maps 链接转本机地图 App deeplink（国内访问不了
     * google.com/maps 网页版）；其余（mailto 等）交给外部 App。
     */
    static void openExternal(Context ctx, String url) {
        if (url == null || url.isEmpty()) return;
        Intent intent;
        if (url.startsWith("tel:")) {
            intent = new Intent(Intent.ACTION_DIAL, Uri.parse(url));
        } else {
            String q = mapsQuery(url);
            if (q != null && launchMapApp(ctx, q)) return;
            intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(ctx, ctx.getString(R.string.no_app_found), Toast.LENGTH_SHORT).show();
        }
    }

    /** 从 Google Maps 链接提取搜索关键词（页面用 /maps/search/?api=1&query=…）。 */
    private static String mapsQuery(String url) {
        if (!url.contains("google.") || !url.contains("/maps")) return null;
        try {
            Uri u = Uri.parse(url);
            String q = u.getQueryParameter("query");
            if (q == null) q = u.getQueryParameter("q");
            return (q == null || q.trim().isEmpty()) ? null : q.trim();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 逐级尝试拉起本机地图 App：
     *  1. geo: —— 系统弹地图应用选择器（高德/百度/Google Maps 都注册了该协议），
     *     用户可选「始终」记住偏好
     *  2. 高德 androidamap:// 关键词搜索
     *  3. 百度 baidumap:// 地点搜索
     * 全部未安装则返回 false，回落到浏览器打开原链接。
     */
    private static boolean launchMapApp(Context ctx, String query) {
        String enc = Uri.encode(query);
        String[] uris = {
                "geo:0,0?q=" + enc,
                "androidamap://poi?sourceApplication=zouzhe&keywords=" + enc + "&dev=0",
                "baidumap://map/place/search?query=" + enc + "&src=zouzhe",
        };
        for (String u : uris) {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(u));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                ctx.startActivity(i);
                return true;
            } catch (ActivityNotFoundException e) {
                // 试下一个
            }
        }
        return false;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE_CHOOSER) {
            if (fileChooserCb != null) {
                fileChooserCb.onReceiveValue(
                        WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileChooserCb = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /** 深浅主题切换时同步系统栏颜色与图标明暗（插件层 JS 调用）。 */
    void applyNativeTheme(boolean light) {
        int bg = light ? BG_LIGHT : BG;
        Window w = getWindow();
        w.setStatusBarColor(bg);
        w.setNavigationBarColor(bg);
        View dv = w.getDecorView();
        int vis = dv.getSystemUiVisibility();
        if (light) vis |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        else vis &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        // SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR = 0x10（API 26+，编译基线 23 无此常量）
        if (Build.VERSION.SDK_INT >= 26) {
            if (light) vis |= 0x10;
            else vis &= ~0x10;
        }
        dv.setSystemUiVisibility(vis);
        if (webView != null) webView.setBackgroundColor(bg);
    }

    /** JS 桥：剪贴板 + 外链打开 + 主题同步（file:// 非安全上下文的原生替代实现）。 */
    public static class Bridge {
        private final Context ctx;
        private final MainActivity act;
        private final Handler main = new Handler(Looper.getMainLooper());

        Bridge(Context ctx, MainActivity act) {
            this.ctx = ctx.getApplicationContext();
            this.act = act;
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) ctx.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("走着", text == null ? "" : text));
            }
        }

        @JavascriptInterface
        public void setTheme(final String mode) {
            main.post(new Runnable() {
                @Override
                public void run() {
                    if (act != null && !act.isFinishing()) {
                        act.applyNativeTheme("light".equals(mode));
                    }
                }
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null || url.isEmpty()) return;
            main.post(new Runnable() {
                @Override
                public void run() {
                    MainActivity.openExternal(ctx, url);
                }
            });
        }
    }
}
