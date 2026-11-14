package com.driverfinder.app

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Shows Driver Finder push notifications (FCM) with the full-colour app logo
 * beside the text. Android draws the small icon in one colour only; the colour
 * logo has to be the notification's large icon, which FCM cannot set itself,
 * so the server sends data-only messages (dfTitle, dfBody, ...) and they are
 * built here. Works while the app is closed: FCM starts this service.
 *
 * Replaces React Native Firebase's own service (AndroidManifest, tools:node="remove");
 * everything else (new tokens to JS) still goes through it via super.
 */
class PushService : ReactNativeFirebaseMessagingService() {

  override fun onMessageReceived(message: RemoteMessage) {
    super.onMessageReceived(message)
    val data = message.data
    val title = data["dfTitle"] ?: return
    // While the app is open the live socket already shows it inside the app.
    if (appInForeground()) return
    show(title, data["dfBody"] ?: "", data)
  }

  private fun appInForeground(): Boolean {
    val info = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(info)
    return info.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  private fun show(title: String, body: String, data: Map<String, String>) {
    // A tap opens the app at driverfinder://push?..., read by src/utils/push.ts (Linking).
    val uri = Uri.Builder().scheme("driverfinder").authority("push").apply {
      for (key in listOf("screen", "connectionId", "name", "jobId", "notificationId")) {
        data[key]?.let { appendQueryParameter(key, it) }
      }
    }.build()
    val chat = data["connectionId"]
    // One notification per chat (the newest message replaces the older one); others stack.
    val tag = if (chat != null) "chat-$chat" else data["notificationId"] ?: System.currentTimeMillis().toString()
    val open = Intent(Intent.ACTION_VIEW, uri, this, MainActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val tap = PendingIntent.getActivity(this, tag.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, "default")
      else @Suppress("DEPRECATION") Notification.Builder(this).setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL)
    val notification = builder
      .setSmallIcon(R.drawable.ic_notification)
      .setColor(0xFFE0A800.toInt())
      .setLargeIcon(BitmapFactory.decodeResource(resources, R.drawable.notification_logo))
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setContentIntent(tap)
      .setAutoCancel(true)
      .setShowWhen(true)
      .build()
    try {
      getSystemService(NotificationManager::class.java)?.notify(tag, 1, notification)
    } catch (e: SecurityException) {
      // Notifications turned off for the app (Android 13+ permission): nothing to show.
    }
  }
}
