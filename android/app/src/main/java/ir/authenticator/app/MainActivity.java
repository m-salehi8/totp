package ir.authenticator.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import java.io.InputStream;
import java.net.URLConnection;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "KelidbanApp";
    private static final int CAMERA_PERMISSION_CODE = 101;
    private static final int FILE_CHOOSER_CODE = 102;

    private WebView webView;
    private PermissionRequest pendingPermissionRequest;
    private ValueCallback<Uri[]> fileUploadCallback;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Global crash protection to prevent force-close crashes
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught exception in " + thread.getName(), throwable);
            try {
                runOnUiThread(() -> {
                    new AlertDialog.Builder(MainActivity.this)
                            .setTitle("خطای برنامه کلیدبان")
                            .setMessage("خطایی رخ داد:\n" + throwable.getMessage())
                            .setPositiveButton("بستن", (d, w) -> finish())
                            .setCancelable(false)
                            .show();
                });
            } catch (Exception ignored) {
                finish();
            }
        });

        super.onCreate(savedInstanceState);

        try {
            // Crimson and cream theme matching landing page
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#5a1414"));
            window.setNavigationBarColor(Color.parseColor("#fffcfc"));
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                window.getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
            }

            webView = new WebView(this);
            webView.setBackgroundColor(Color.parseColor("#fffcfc"));
            setContentView(webView);

            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (uri != null) {
                        String host = uri.getHost();
                        if ("appassets.androidplatform.net".equals(host) || "localhost".equals(host)) {
                            String path = uri.getPath();
                            if (path == null || path.isEmpty() || "/".equals(path)) {
                                path = "index.html";
                            }
                            while (path.startsWith("/")) {
                                path = path.substring(1);
                            }
                            try {
                                InputStream is = getAssets().open(path);
                                String mime = getMimeType(path);
                                String encoding = isTextMime(mime) ? "UTF-8" : null;
                                Map<String, String> headers = new HashMap<>();
                                headers.put("Access-Control-Allow-Origin", "*");
                                headers.put("Cache-Control", "no-cache");
                                return new WebResourceResponse(mime, encoding, 200, "OK", headers, is);
                            } catch (Exception e) {
                                // Fallback for SPA routing: serve index.html if file doesn't have an extension
                                if (!path.contains(".")) {
                                    try {
                                        InputStream is = getAssets().open("index.html");
                                        Map<String, String> headers = new HashMap<>();
                                        headers.put("Access-Control-Allow-Origin", "*");
                                        headers.put("Cache-Control", "no-cache");
                                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK", headers, is);
                                    } catch (Exception ignored) {}
                                }
                                Log.w(TAG, "Asset not found: " + path);
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }
            });

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    Log.d(TAG, "[JS " + consoleMessage.messageLevel() + "] " +
                            consoleMessage.message() + " (" +
                            consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                    return true;
                }

                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                            } else {
                                pendingPermissionRequest = request;
                                requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_CODE);
                            }
                            return;
                        }
                    }
                    request.deny();
                }

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (fileUploadCallback != null) {
                        fileUploadCallback.onReceiveValue(null);
                    }
                    fileUploadCallback = filePathCallback;
                    try {
                        Intent intent = fileChooserParams != null ? fileChooserParams.createIntent() : new Intent(Intent.ACTION_GET_CONTENT);
                        if (intent.getType() == null) {
                            intent.setType("image/*");
                        }
                        startActivityForResult(intent, FILE_CHOOSER_CODE);
                        return true;
                    } catch (ActivityNotFoundException e) {
                        try {
                            Intent fallbackIntent = new Intent(Intent.ACTION_GET_CONTENT);
                            fallbackIntent.setType("image/*");
                            startActivityForResult(fallbackIntent, FILE_CHOOSER_CODE);
                            return true;
                        } catch (Exception ex) {
                            fileUploadCallback = null;
                            return false;
                        }
                    }
                }
            });

            // Load entry index.html#app via safe https virtual origin
            webView.loadUrl("https://appassets.androidplatform.net/index.html#app");

        } catch (Throwable t) {
            Log.e(TAG, "Fatal error initializing WebView", t);
            TextView errorView = new TextView(this);
            errorView.setPadding(40, 80, 40, 40);
            errorView.setTextColor(Color.WHITE);
            errorView.setBackgroundColor(Color.parseColor("#020617"));
            errorView.setTextSize(16);
            errorView.setText("خطا در بارگذاری برنامه:\n" + t.getMessage() + "\n\nلطفاً اطمینان حاصل کنید که Android System WebView فعال است.");
            setContentView(errorView);
        }
    }

    private boolean isTextMime(String mime) {
        if (mime == null) return false;
        return mime.startsWith("text/") ||
                mime.equals("application/javascript") ||
                mime.equals("application/json") ||
                mime.equals("image/svg+xml");
    }

    private String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".ico")) return "image/x-icon";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".ttf")) return "font/ttf";
        String guessed = URLConnection.guessContentTypeFromName(path);
        return guessed != null ? guessed : "application/octet-stream";
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    pendingPermissionRequest = null;
                }
            } else {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_CODE) {
            if (fileUploadCallback != null) {
                Uri[] results = null;
                if (resultCode == RESULT_OK && data != null) {
                    if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    } else if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                    }
                }
                fileUploadCallback.onReceiveValue(results);
                fileUploadCallback = null;
            }
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
}
