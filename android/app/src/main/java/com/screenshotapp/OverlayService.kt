package com.screenshotapp

import android.app.*
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.*
import android.provider.MediaStore
import android.util.DisplayMetrics
import android.view.*
import android.widget.ImageView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class OverlayService : Service() {

    companion object {
        private const val CHANNEL_ID = "screenshot_overlay_channel"
        private const val NOTIFICATION_ID = 1
        private const val VIRTUAL_DISPLAY_NAME = "ScreenCapture"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var screenWidth = 0
    private var screenHeight = 0
    private var screenDensity = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val metrics = DisplayMetrics()
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        wm.defaultDisplay.getRealMetrics(metrics)
        screenWidth = metrics.widthPixels
        screenHeight = metrics.heightPixels
        screenDensity = metrics.densityDpi
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Handle stop action from notification
        if (intent?.action == "STOP") {
            stopSelf()
            return START_NOT_STICKY
        }

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        val resultCode = intent?.getIntExtra("resultCode", Activity.RESULT_CANCELED)
            ?: Activity.RESULT_CANCELED
        val data = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra("data", Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra("data")
        }

        if (resultCode == Activity.RESULT_OK && data != null) {
            val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            mediaProjection = projectionManager.getMediaProjection(resultCode, data)
            setupImageReader()
            showOverlayButton()
        } else {
            stopSelf()
        }

        return START_NOT_STICKY
    }

    private fun setupImageReader() {
        imageReader = ImageReader.newInstance(
            screenWidth, screenHeight,
            PixelFormat.RGBA_8888, 2
        )
    }

    private fun showOverlayButton() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        // Create the floating button
        val button = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_camera)
            setBackgroundResource(android.R.drawable.btn_default)
            setPadding(24, 24, 24, 24)
            alpha = 0.85f
            elevation = 12f
        }

        // Create a custom circular background
        val buttonSize = 140
        val params = WindowManager.LayoutParams(
            buttonSize,
            buttonSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenWidth - buttonSize - 40
            y = screenHeight / 2
        }

        // Track touch for drag vs tap
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false

        button.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isDragging = true
                    }
                    params.x = initialX + dx.toInt()
                    params.y = initialY + dy.toInt()
                    windowManager?.updateViewLayout(view, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isDragging) {
                        // It's a tap — take screenshot
                        captureScreen(view, params)
                    }
                    true
                }
                else -> false
            }
        }

        overlayView = button
        windowManager?.addView(button, params)
    }

    private fun captureScreen(buttonView: View, buttonParams: WindowManager.LayoutParams) {
        // Hide the button so it doesn't appear in the screenshot
        buttonView.visibility = View.INVISIBLE

        // Small delay to let the button disappear before capture
        Handler(Looper.getMainLooper()).postDelayed({
            performCapture {
                // Show the button again after capture
                buttonView.visibility = View.VISIBLE
            }
        }, 150)
    }

    private fun performCapture(onComplete: () -> Unit) {
        val reader = imageReader ?: run {
            onComplete()
            return
        }

        virtualDisplay = mediaProjection?.createVirtualDisplay(
            VIRTUAL_DISPLAY_NAME,
            screenWidth, screenHeight, screenDensity,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader.surface, null, null
        )

        reader.setOnImageAvailableListener({ imgReader ->
            val image = imgReader.acquireLatestImage()
            if (image != null) {
                try {
                    val planes = image.planes
                    val buffer = planes[0].buffer
                    val pixelStride = planes[0].pixelStride
                    val rowStride = planes[0].rowStride
                    val rowPadding = rowStride - pixelStride * screenWidth

                    val bitmap = Bitmap.createBitmap(
                        screenWidth + rowPadding / pixelStride,
                        screenHeight,
                        Bitmap.Config.ARGB_8888
                    )
                    bitmap.copyPixelsFromBuffer(buffer)

                    // Crop to actual screen size (remove padding)
                    val croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
                    if (croppedBitmap != bitmap) {
                        bitmap.recycle()
                    }

                    saveBitmap(croppedBitmap)
                    croppedBitmap.recycle()

                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(this, "Screenshot saved!", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(this, "Screenshot failed: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                } finally {
                    image.close()
                    virtualDisplay?.release()
                    virtualDisplay = null
                }
            }

            // Remove listener after capture
            imgReader.setOnImageAvailableListener(null, null)

            Handler(Looper.getMainLooper()).post {
                onComplete()
            }
        }, Handler(Looper.getMainLooper()))
    }

    private fun saveBitmap(bitmap: Bitmap) {
        val filename = "Screenshot_${System.currentTimeMillis()}.png"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ use MediaStore
            val contentValues = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Screenshots")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }

            val uri = contentResolver.insert(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues
            )

            uri?.let {
                val outputStream: OutputStream? = contentResolver.openOutputStream(it)
                outputStream?.use { stream ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
                }
                contentValues.clear()
                contentValues.put(MediaStore.Images.Media.IS_PENDING, 0)
                contentResolver.update(it, contentValues, null, null)
            }
        } else {
            // Older Android — save to file
            val dir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                "Screenshots"
            )
            if (!dir.exists()) dir.mkdirs()
            val file = File(dir, filename)
            FileOutputStream(file).use { stream ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screenshot Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows floating screenshot button"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        // Create a stop intent
        val stopIntent = Intent(this, OverlayService::class.java).apply {
            action = "STOP"
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Screenshot Ready")
            .setContentText("Tap the floating button to capture. Drag to reposition.")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop",
                stopPendingIntent
            )
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        overlayView?.let {
            windowManager?.removeView(it)
        }
        overlayView = null
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
    }
}
