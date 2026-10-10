package expo.modules.quitterusage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class QuitterUsageModule : Module() {
  // A fixed scope prevents raising a rank by deselecting heavily used apps.
  private val apps = mapOf(
    "com.instagram.android" to "Instagram", "com.instagram.barcelona" to "Threads",
    "com.zhiliaoapp.musically" to "TikTok", "com.ss.android.ugc.trill" to "TikTok",
    "com.google.android.youtube" to "YouTube", "com.facebook.katana" to "Facebook",
    "com.facebook.lite" to "Facebook Lite", "com.twitter.android" to "X",
    "com.reddit.frontpage" to "Reddit", "com.snapchat.android" to "Snapchat",
    "com.pinterest" to "Pinterest", "tv.twitch.android.app" to "Twitch",
    "com.discord" to "Discord"
  )
  private fun context() = requireNotNull(appContext.reactContext)
  private fun allowed(): Boolean {
    val ctx = context()
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.packageName) == AppOpsManager.MODE_ALLOWED
  }
  override fun definition() = ModuleDefinition {
    Name("QuitterUsage")
    AsyncFunction("hasPermission") { allowed() }
    AsyncFunction("openSettings") {
      context().startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("readUsage") {
      check(allowed()) { "Usage access is not granted" }
      val manager = context().getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val now = System.currentTimeMillis()
      val calendar = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        add(Calendar.DATE, -7)
      }
      val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
      val result = mutableListOf<Map<String, Any>>()
      repeat(8) {
        val from = calendar.timeInMillis
        val key = formatter.format(calendar.time)
        calendar.add(Calendar.DATE, 1)
        val to = minOf(calendar.timeInMillis, now)
        // Seed the foreground state from the previous day, then clip every interval.
        val events = manager.queryEvents(from - 86400000L, to)
        val event = UsageEvents.Event()
        val totals = mutableMapOf<String, Long>()
        var foreground: String? = null
        var since = from
        var covered = false
        fun close(at: Long) {
          val pkg = foreground
          if (pkg != null && apps.containsKey(pkg)) {
            totals[pkg] = (totals[pkg] ?: 0L) + maxOf(0L, at - maxOf(from, since))
          }
          foreground = null
        }
        while (events.hasNextEvent()) {
          events.getNextEvent(event)
          if (event.timeStamp >= from) covered = true
          when (event.eventType) {
            UsageEvents.Event.ACTIVITY_RESUMED -> {
              close(event.timeStamp)
              foreground = event.packageName; since = event.timeStamp
            }
            UsageEvents.Event.ACTIVITY_PAUSED -> if (foreground == event.packageName) close(event.timeStamp)
            UsageEvents.Event.SCREEN_NON_INTERACTIVE, UsageEvents.Event.DEVICE_SHUTDOWN -> close(event.timeStamp)
          }
        }
        close(to)
        // No system events means unknown coverage, not an invented zero-minute day.
        if (covered) result.add(mapOf(
          "key" to key, "minutes" to totals.values.sum().toDouble() / 60000.0,
          "apps" to totals.map { (pkg, ms) -> mapOf("name" to apps.getValue(pkg), "minutes" to ms.toDouble() / 60000.0) },
          "source" to "android-usage", "measuredAt" to now
        ))
      }
      result
    }
  }
}
