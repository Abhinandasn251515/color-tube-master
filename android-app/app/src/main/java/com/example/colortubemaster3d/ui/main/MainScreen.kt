package com.example.colortubemaster3d.ui.main

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation3.runtime.NavKey
import com.example.colortubemaster3d.data.DefaultDataRepository

class AndroidBridge(private val context: Context) {
    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun unlockAchievement(achievementId: String) {
        Log.d("AndroidBridge", "Native Play Games Achievement unlocked: $achievementId")
        Toast.makeText(context, "🏆 Achievement Unlocked: $achievementId", Toast.LENGTH_SHORT).show()
    }

    @JavascriptInterface
    fun submitScore(score: Int) {
        Log.d("AndroidBridge", "Native Play Games Submit Score: $score")
        Toast.makeText(context, "🌍 High Score Submitted: $score", Toast.LENGTH_SHORT).show()
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainScreen(
  onItemClick: (NavKey) -> Unit,
  modifier: Modifier = Modifier,
  viewModel: MainScreenViewModel = viewModel { MainScreenViewModel(DefaultDataRepository()) },
) {
  AndroidView(
    factory = { context ->
      WebView(context).apply {
        webViewClient = WebViewClient()
        addJavascriptInterface(AndroidBridge(context), "AndroidBridge")
        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          allowFileAccess = true
          allowContentAccess = true
          databaseEnabled = true
          useWideViewPort = true
          loadWithOverviewMode = true
        }
        loadUrl("file:///android_asset/index.html")
      }
    },
    modifier = modifier.fillMaxSize()
  )
}

