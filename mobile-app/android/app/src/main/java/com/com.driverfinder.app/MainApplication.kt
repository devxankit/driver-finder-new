package com.driverfinder.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    loadReactNative(this)
  }

  /**
   * The "default" channel that push notifications use (backend push.service.js and
   * firebase.json). High importance: they pop up on screen with sound, like a chat app.
   */
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel("default", "Jobs, chats and updates", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "New applicants, hiring requests, chat messages, KYC and plan updates"
      enableVibration(true)
    }
    getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }
}
