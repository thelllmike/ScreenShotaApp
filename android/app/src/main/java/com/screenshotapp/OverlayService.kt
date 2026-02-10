package com.screenshotapp

import android.app.*
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioAttributes
import android.media.ImageReader
import android.media.MediaActionSound
import android.media.SoundPool
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.*
import android.provider.MediaStore
import android.util.DisplayMetrics
import android.util.TypedValue
import android.view.*
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class OverlayService : Service() {

    companion object {
        private const val CHANNEL_ID = "screenshot_overlay_channel"
        private const val NOTIFICATION_ID = 1
        private const val VIRTUAL_DISPLAY_NAME = "ScreenCapture"
        private const val PREFS_NAME = "screenshot_prefs"
        var isRunning = false
            private set
    }

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var trashView: View? = null
    private var previewView: View? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var screenWidth = 0
    private var screenHeight = 0
    private var screenDensity = 0
    private var isCapturing = false
    private var mediaActionSound: MediaActionSound? = null
    private var soundEnabled = true
    private var lastCapturedUri: Uri? = null
    private var lastCapturedFile: File? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()

        val metrics = DisplayMetrics()
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        @Suppress("DEPRECATION")
        wm.defaultDisplay.getRealMetrics(metrics)
        screenWidth = metrics.widthPixels
        screenHeight = metrics.heightPixels
        screenDensity = metrics.densityDpi

        // Initialize shutter sound
        mediaActionSound = MediaActionSound()
        mediaActionSound?.load(MediaActionSound.SHUTTER_CLICK)

        // Load sound preference
        loadSoundPreference()
    }

    private fun loadSoundPreference() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        soundEnabled = prefs.getBoolean("soundEnabled", true)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == "STOP") {
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == "UPDATE_SOUND") {
            soundEnabled = intent.getBooleanExtra("soundEnabled", true)
            return START_STICKY
        }

        if (intent?.action == "TIMER_CAPTURE") {
            // Timer mode: show countdown then auto-capture
            val timerSeconds = intent.getIntExtra("timerSeconds", 3)
            soundEnabled = intent.getBooleanExtra("soundEnabled", true)

            val resultCode = intent.getIntExtra("resultCode", Activity.RESULT_CANCELED)
            val data = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                intent.getParcelableExtra("data", Intent::class.java)
            } else {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra("data")
            }

            if (resultCode == Activity.RESULT_OK && data != null && mediaProjection == null) {
                val notification = createNotification()
                startForeground(NOTIFICATION_ID, notification)
                val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                mediaProjection = projectionManager.getMediaProjection(resultCode, data)
            }

            showCountdownAndCapture(timerSeconds)
            return START_NOT_STICKY
        }

        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        // Check for sound setting
        soundEnabled = intent?.getBooleanExtra("soundEnabled", true) ?: true

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

    private var countdownView: View? = null

    private fun showCountdownAndCapture(totalSeconds: Int) {
        if (windowManager == null) {
            windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        }

        val circleSize = dpToPx(120)
        val container = FrameLayout(this)
        container.background = createCircleDrawable(Color.parseColor("#CC000000"), circleSize / 2)

        val numberText = TextView(this).apply {
            text = totalSeconds.toString()
            setTextColor(Color.WHITE)
            textSize = 56f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        container.addView(numberText, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        val params = WindowManager.LayoutParams(
            circleSize, circleSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        countdownView = container
        try { windowManager?.addView(container, params) } catch (_: Exception) {}

        // Start scale-in animation
        container.scaleX = 1.5f
        container.scaleY = 1.5f
        container.alpha = 0f
        container.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(300).start()

        val handler = Handler(Looper.getMainLooper())
        var remaining = totalSeconds

        val tick = object : Runnable {
            override fun run() {
                remaining--
                if (remaining > 0) {
                    // Update number with animation
                    numberText.animate().scaleX(0.5f).scaleY(0.5f).alpha(0f).setDuration(150)
                        .withEndAction {
                            numberText.text = remaining.toString()
                            numberText.scaleX = 1.5f
                            numberText.scaleY = 1.5f
                            numberText.alpha = 0f
                            numberText.animate().scaleX(1f).scaleY(1f).alpha(1f).setDuration(200).start()
                        }.start()
                    handler.postDelayed(this, 1000)
                } else {
                    // Countdown done — remove overlay IMMEDIATELY then capture after delay
                    hideCountdown()
                    // Wait 400ms to ensure overlay is fully gone from screen before capture
                    handler.postDelayed({ performTimerCapture() }, 400)
                }
            }
        }
        handler.postDelayed(tick, 1000)
    }

    private fun hideCountdown() {
        countdownView?.let {
            // Remove immediately — no animation — so it doesn't appear in screenshot
            try { windowManager?.removeView(it) } catch (_: Exception) {}
        }
        countdownView = null
    }

    private fun performTimerCapture() {
        // Play shutter sound
        if (soundEnabled) {
            try { mediaActionSound?.play(MediaActionSound.SHUTTER_CLICK) } catch (_: Exception) {}
        }

        performCapture { savedUri, savedFile ->
            Handler(Looper.getMainLooper()).post {
                if (savedUri != null || savedFile != null) {
                    lastCapturedUri = savedUri
                    lastCapturedFile = savedFile
                    showPreview(savedUri, savedFile)
                }

                // Timer mode: always stop service after preview auto-hides (6s + 1s buffer)
                if (overlayView == null) {
                    Handler(Looper.getMainLooper()).postDelayed({ stopSelf() }, 7000)
                }
            }
        }
    }

    private fun setupImageReader() {
        imageReader?.close()
        imageReader = ImageReader.newInstance(
            screenWidth, screenHeight,
            PixelFormat.RGBA_8888, 2
        )
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    private fun createCircleDrawable(color: Int, radiusPx: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
            setSize(radiusPx * 2, radiusPx * 2)
        }
    }

    private fun createRoundRectDrawable(color: Int, cornerRadius: Float): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(color)
            this.cornerRadius = cornerRadius
        }
    }

    private fun showOverlayButton() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val buttonSizeDp = 56
        val buttonSize = dpToPx(buttonSizeDp)
        val container = FrameLayout(this)

        // Blue circle
        val blueColor = Color.parseColor("#3366CC")
        container.background = createCircleDrawable(blueColor, buttonSize / 2)
        container.elevation = dpToPx(8).toFloat()

        // Camera icon
        val icon = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_camera)
            setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN)
            val pad = dpToPx(14)
            setPadding(pad, pad, pad, pad)
        }
        container.addView(icon, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        val params = WindowManager.LayoutParams(
            buttonSize, buttonSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenWidth - buttonSize - dpToPx(16)
            y = screenHeight / 2
        }

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var isDragging = false
        var isOverTrash = false

        container.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    isOverTrash = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        if (!isDragging) {
                            isDragging = true
                            showTrashZone()
                        }
                    }
                    params.x = initialX + dx.toInt()
                    params.y = initialY + dy.toInt()
                    try { windowManager?.updateViewLayout(view, params) } catch (_: Exception) {}

                    val buttonCenterX = params.x + buttonSize / 2
                    val buttonCenterY = params.y + buttonSize / 2
                    val trashZoneTop = screenHeight - dpToPx(120)
                    val trashZoneLeft = screenWidth / 2 - dpToPx(60)
                    val trashZoneRight = screenWidth / 2 + dpToPx(60)
                    val newOverTrash = buttonCenterY > trashZoneTop &&
                            buttonCenterX > trashZoneLeft &&
                            buttonCenterX < trashZoneRight

                    if (newOverTrash != isOverTrash) {
                        isOverTrash = newOverTrash
                        updateTrashHighlight(isOverTrash)
                        view.scaleX = if (isOverTrash) 0.6f else 1f
                        view.scaleY = if (isOverTrash) 0.6f else 1f
                        view.alpha = if (isOverTrash) 0.4f else 1f
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    hideTrashZone()
                    if (isOverTrash) {
                        stopSelf()
                    } else if (!isDragging) {
                        if (!isCapturing) {
                            captureScreen(view, params)
                        }
                    }
                    view.scaleX = 1f
                    view.scaleY = 1f
                    view.alpha = 1f
                    true
                }
                else -> false
            }
        }

        overlayView = container
        try {
            windowManager?.addView(container, params)
        } catch (e: Exception) {
            e.printStackTrace()
            stopSelf()
        }
    }

    private fun showTrashZone() {
        if (trashView != null) return

        val trashSize = dpToPx(64)
        val trashContainer = FrameLayout(this)
        trashContainer.background = createCircleDrawable(Color.parseColor("#40FF0000"), trashSize / 2)

        val trashIcon = ImageView(this).apply {
            setImageResource(android.R.drawable.ic_menu_delete)
            setColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN)
            val pad = dpToPx(16)
            setPadding(pad, pad, pad, pad)
        }
        trashContainer.addView(trashIcon, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        val params = WindowManager.LayoutParams(
            trashSize, trashSize,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenWidth / 2 - trashSize / 2
            y = screenHeight - trashSize - dpToPx(48)
        }

        trashView = trashContainer
        try { windowManager?.addView(trashContainer, params) } catch (_: Exception) {}
    }

    private fun updateTrashHighlight(highlighted: Boolean) {
        trashView?.let { view ->
            val trashSize = dpToPx(64)
            if (highlighted) {
                view.background = createCircleDrawable(Color.parseColor("#CCFF0000"), trashSize / 2)
                view.scaleX = 1.4f
                view.scaleY = 1.4f
            } else {
                view.background = createCircleDrawable(Color.parseColor("#40FF0000"), trashSize / 2)
                view.scaleX = 1f
                view.scaleY = 1f
            }
        }
    }

    private fun hideTrashZone() {
        trashView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
        }
        trashView = null
    }

    private fun captureScreen(buttonView: View, buttonParams: WindowManager.LayoutParams) {
        if (isCapturing) return
        isCapturing = true

        // Play shutter sound
        if (soundEnabled) {
            try { mediaActionSound?.play(MediaActionSound.SHUTTER_CLICK) } catch (_: Exception) {}
        }

        // Hide button during capture
        try { buttonView.visibility = View.INVISIBLE } catch (_: Exception) {}

        // Also hide any existing preview
        hidePreview()

        // Safety timeout: if capture doesn't complete in 3 seconds, force-show button
        val safetyHandler = Handler(Looper.getMainLooper())
        var captureCompleted = false
        val safetyRunnable = Runnable {
            if (!captureCompleted) {
                captureCompleted = true
                try { buttonView.visibility = View.VISIBLE } catch (_: Exception) {}
                isCapturing = false
            }
        }
        safetyHandler.postDelayed(safetyRunnable, 3000)

        Handler(Looper.getMainLooper()).postDelayed({
            performCapture { savedUri, savedFile ->
                Handler(Looper.getMainLooper()).post {
                    if (!captureCompleted) {
                        captureCompleted = true
                        safetyHandler.removeCallbacks(safetyRunnable)
                    }
                    try {
                        buttonView.visibility = View.VISIBLE
                    } catch (_: Exception) {}
                    isCapturing = false

                    if (savedUri != null || savedFile != null) {
                        lastCapturedUri = savedUri
                        lastCapturedFile = savedFile
                        showPreview(savedUri, savedFile)
                    }
                }
            }
        }, 250)
    }

    private fun performCapture(onComplete: (Uri?, File?) -> Unit) {
        // IMPORTANT: Recreate ImageReader for each capture to prevent stale surface
        try {
            imageReader?.close()
        } catch (_: Exception) {}
        imageReader = ImageReader.newInstance(
            screenWidth, screenHeight,
            PixelFormat.RGBA_8888, 2
        )

        val reader = imageReader ?: run {
            onComplete(null, null)
            return
        }

        var captured = false
        reader.setOnImageAvailableListener({ imgReader ->
            if (captured) return@setOnImageAvailableListener
            captured = true

            var savedUri: Uri? = null
            var savedFile: File? = null

            val image = try { imgReader.acquireLatestImage() } catch (_: Exception) { null }
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

                    val croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
                    if (croppedBitmap != bitmap) bitmap.recycle()

                    val result = saveBitmap(croppedBitmap)
                    savedUri = result.first
                    savedFile = result.second
                    croppedBitmap.recycle()
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    try { image.close() } catch (_: Exception) {}
                }
            }

            // Release virtual display but keep mediaProjection alive for next capture
            try {
                virtualDisplay?.release()
                virtualDisplay = null
            } catch (_: Exception) {}
            imgReader.setOnImageAvailableListener(null, null)

            Handler(Looper.getMainLooper()).post {
                onComplete(savedUri, savedFile)
            }
        }, Handler(Looper.getMainLooper()))

        try {
            virtualDisplay = mediaProjection?.createVirtualDisplay(
                VIRTUAL_DISPLAY_NAME,
                screenWidth, screenHeight, screenDensity,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface, null, null
            )
        } catch (e: Exception) {
            e.printStackTrace()
            onComplete(null, null)
        }
    }

    private fun showPreview(uri: Uri?, file: File?) {
        hidePreview()

        val panelWidth = dpToPx(280)
        val panelHeight = dpToPx(56)
        val cornerRadius = dpToPx(28).toFloat()

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = createRoundRectDrawable(Color.parseColor("#E8FFFFFF"), cornerRadius)
            elevation = dpToPx(12).toFloat()
            setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4))
        }

        // "Saved ✓" text
        val savedText = TextView(this).apply {
            text = "✓ Saved"
            setTextColor(Color.parseColor("#2E7D32"))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            lp.marginStart = dpToPx(8)
            layoutParams = lp
        }
        container.addView(savedText)

        // Share button
        val shareBtn = TextView(this).apply {
            text = "📤 Share"
            setTextColor(Color.parseColor("#3366CC"))
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            val pad = dpToPx(10)
            setPadding(pad, dpToPx(6), pad, dpToPx(6))
            background = createRoundRectDrawable(Color.parseColor("#203366CC"), dpToPx(16).toFloat())
            setOnClickListener { shareScreenshot(uri, file) }
        }
        container.addView(shareBtn)

        // Spacer
        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(6), 1)
        }
        container.addView(spacer)

        // Edit button
        val editBtn = TextView(this).apply {
            text = "✏️ Edit"
            setTextColor(Color.parseColor("#E68A00"))
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            val pad = dpToPx(10)
            setPadding(pad, dpToPx(6), pad, dpToPx(6))
            background = createRoundRectDrawable(Color.parseColor("#20E68A00"), dpToPx(16).toFloat())
            setOnClickListener { editScreenshot(uri, file) }
        }
        container.addView(editBtn)

        // Spacer
        val spacer2 = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(dpToPx(6), 1)
        }
        container.addView(spacer2)

        // Close button
        val closeBtn = TextView(this).apply {
            text = "✕"
            setTextColor(Color.parseColor("#999999"))
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            val pad = dpToPx(8)
            setPadding(pad, dpToPx(4), pad, dpToPx(4))
            setOnClickListener { hidePreview() }
        }
        container.addView(closeBtn)

        val params = WindowManager.LayoutParams(
            panelWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = dpToPx(48)
        }

        previewView = container
        try {
            windowManager?.addView(container, params)
            // Slide-in animation
            container.translationY = -dpToPx(80).toFloat()
            container.animate()
                .translationY(0f)
                .setDuration(350)
                .setInterpolator(OvershootInterpolator(0.8f))
                .start()
        } catch (_: Exception) {}

        // Auto-hide after 6 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            hidePreview()
        }, 6000)
    }

    private fun hidePreview() {
        previewView?.let {
            try {
                it.animate()
                    .translationY(-dpToPx(80).toFloat())
                    .alpha(0f)
                    .setDuration(200)
                    .withEndAction {
                        try { windowManager?.removeView(it) } catch (_: Exception) {}
                    }
                    .start()
            } catch (_: Exception) {
                try { windowManager?.removeView(it) } catch (_: Exception) {}
            }
        }
        previewView = null
    }

    private fun shareScreenshot(uri: Uri?, file: File?) {
        hidePreview()
        try {
            val shareUri = uri ?: file?.let {
                FileProvider.getUriForFile(this, "${packageName}.fileprovider", it)
            } ?: return

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, shareUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(Intent.createChooser(shareIntent, "Share Screenshot").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            })
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to share: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun editScreenshot(uri: Uri?, file: File?) {
        hidePreview()
        try {
            val editUri = uri ?: file?.let {
                FileProvider.getUriForFile(this, "${packageName}.fileprovider", it)
            } ?: return

            val editIntent = Intent(Intent.ACTION_EDIT).apply {
                setDataAndType(editUri, "image/png")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            if (editIntent.resolveActivity(packageManager) != null) {
                startActivity(Intent.createChooser(editIntent, "Edit Screenshot").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                })
            } else {
                // Fallback: open in gallery/viewer
                val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(editUri, "image/png")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                startActivity(viewIntent)
            }
        } catch (e: Exception) {
            Toast.makeText(this, "No editor found: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveBitmap(bitmap: Bitmap): Pair<Uri?, File?> {
        val filename = "Screenshot_${System.currentTimeMillis()}.png"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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

            return Pair(uri, null)
        } else {
            val dir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES),
                "Screenshots"
            )
            if (!dir.exists()) dir.mkdirs()
            val file = File(dir, filename)
            FileOutputStream(file).use { stream ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            }
            return Pair(null, file)
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
        val stopIntent = Intent(this, OverlayService::class.java).apply { action = "STOP" }
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Screenshot Ready")
            .setContentText("Tap floating button to capture • Drag to 🗑 to dismiss")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopPendingIntent)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        hideTrashZone()
        hidePreview()
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
        }
        overlayView = null
        virtualDisplay?.release()
        virtualDisplay = null
        imageReader?.close()
        imageReader = null
        mediaProjection?.stop()
        mediaProjection = null
        mediaActionSound?.release()
        mediaActionSound = null
    }
}
