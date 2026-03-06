package com.salah.app
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  private companion object {
    const val NEW_INTENT_DELAY_MS = 1000L
    const val STARTUP_GRACE_MS = 2500L
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private var pendingNewIntentRunnable: Runnable? = null
  private var createdAtRealtime = 0L

  /**
   * Defers onNewIntent briefly at startup to avoid "context is not ready" in Bridgeless.
   * After startup grace period, delivers intents immediately.
   */
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    val elapsed = SystemClock.elapsedRealtime() - createdAtRealtime
    if (elapsed > STARTUP_GRACE_MS) {
      pendingNewIntentRunnable?.let { mainHandler.removeCallbacks(it) }
      pendingNewIntentRunnable = null
      super.onNewIntent(intent)
      return
    }
    pendingNewIntentRunnable?.let { mainHandler.removeCallbacks(it) }
    val intentToDeliver = intent
    pendingNewIntentRunnable = Runnable {
      pendingNewIntentRunnable = null
      super.onNewIntent(intentToDeliver)
    }.also { mainHandler.postDelayed(it, NEW_INTENT_DELAY_MS) }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    createdAtRealtime = SystemClock.elapsedRealtime()
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
