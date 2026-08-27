package com.zouzhe.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.webkit.JavascriptInterface;
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

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
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

        webView.addJavascriptInterface(new Bridge(this), "ZouzheBridge");

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

        // 兜底：JS 桥注入前/失效时 window.open 落到这里，取出目标 URL 转外部打开
        webView.setWebChromeClient(new WebChromeClient() {
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
        webView.loadUrl("file:///android_asset/index.html");
    }

    /** tel: 转拨号盘，其余（https 地图、mailto 等）交给外部 App。 */
    private void openExternal(String url) {
        if (url == null) return;
        Intent intent = url.startsWith("tel:")
                ? new Intent(Intent.ACTION_DIAL, Uri.parse(url))
                : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, getString(R.string.no_app_found), Toast.LENGTH_SHORT).show();
        }
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

    /** JS 桥：剪贴板 + 外链打开（file:// 下 navigator.clipboard / window.open 的替代实现）。 */
    public static class Bridge {
        private final Context ctx;
        private final Handler main = new Handler(Looper.getMainLooper());

        Bridge(Context ctx) {
            this.ctx = ctx.getApplicationContext();
        }

        @JavascriptInterface
        public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) ctx.getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("走着", text == null ? "" : text));
            }
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null || url.isEmpty()) return;
            main.post(new Runnable() {
                @Override
                public void run() {
                    Intent intent = url.startsWith("tel:")
                            ? new Intent(Intent.ACTION_DIAL, Uri.parse(url))
                            : new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try {
                        ctx.startActivity(intent);
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(ctx, ctx.getString(R.string.no_app_found),
                                Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }
    }
}
