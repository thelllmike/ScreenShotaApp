package com.screenshotapp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenshotModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        const val NAME = "ScreenshotModule"
        const val MEDIA_PROJECTION_REQUEST = 1001
    }

    private var pendingSoundEnabled = true
    private var pendingTimerSeconds = 0  // 0 = normal mode, >0 = timer mode

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == MEDIA_PROJECTION_REQUEST) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val serviceIntent = Intent(reactApplicationContext, OverlayService::class.java).apply {
                    putExtra("resultCode", resultCode)
                    putExtra("data", data)
                    putExtra("soundEnabled", pendingSoundEnabled)
                    if (pendingTimerSeconds > 0) {
                        action = "TIMER_CAPTURE"
                        putExtra("timerSeconds", pendingTimerSeconds)
                    }
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    reactApplicationContext.startForegroundService(serviceIntent)
                } else {
                    reactApplicationContext.startService(serviceIntent)
                }

                sendEvent("onCaptureStarted", null)
                pendingTimerSeconds = 0
            } else {
                pendingTimerSeconds = 0
                sendEvent("onCaptureError", Arguments.createMap().apply {
                    putString("error", "User denied screen capture permission")
                })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(OverlayService.isRunning)
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactApplicationContext.packageName}")
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun startScreenCapture(soundEnabled: Boolean, promise: Promise) {
        pendingSoundEnabled = soundEnabled
        pendingTimerSeconds = 0

        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        if (!Settings.canDrawOverlays(reactApplicationContext)) {
            promise.reject("NO_OVERLAY_PERMISSION", "Overlay permission not granted")
            return
        }

        val mediaProjectionManager = activity.getSystemService(
            Context.MEDIA_PROJECTION_SERVICE
        ) as MediaProjectionManager

        val captureIntent = mediaProjectionManager.createScreenCaptureIntent()
        activity.startActivityForResult(captureIntent, MEDIA_PROJECTION_REQUEST)
        promise.resolve(true)
    }

    @ReactMethod
    fun startTimerCapture(seconds: Int, soundEnabled: Boolean, promise: Promise) {
        pendingSoundEnabled = soundEnabled
        pendingTimerSeconds = seconds

        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        if (!Settings.canDrawOverlays(reactApplicationContext)) {
            promise.reject("NO_OVERLAY_PERMISSION", "Overlay permission not granted")
            return
        }

        val mediaProjectionManager = activity.getSystemService(
            Context.MEDIA_PROJECTION_SERVICE
        ) as MediaProjectionManager

        val captureIntent = mediaProjectionManager.createScreenCaptureIntent()
        activity.startActivityForResult(captureIntent, MEDIA_PROJECTION_REQUEST)
        promise.resolve(true)
    }

    @ReactMethod
    fun updateSoundSetting(soundEnabled: Boolean) {
        if (OverlayService.isRunning) {
            val intent = Intent(reactApplicationContext, OverlayService::class.java).apply {
                action = "UPDATE_SOUND"
                putExtra("soundEnabled", soundEnabled)
            }
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopScreenCapture() {
        val serviceIntent = Intent(reactApplicationContext, OverlayService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        sendEvent("onCaptureStopped", null)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
