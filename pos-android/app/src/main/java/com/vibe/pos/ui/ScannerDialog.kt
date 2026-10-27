package com.vibe.pos.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * Escáner continuo por cámara (ML Kit, on-device). Cada lectura válida suma 1 unidad al ticket
 * y el diálogo sigue abierto para escanear el siguiente producto.
 */
@Composable
fun ScannerDialog(
    lastMessage: String?,
    onCode: (String) -> Boolean,
    onClose: () -> Unit,
    /** Si no es null, el resultado lo informa el llamador (p. ej. validación del servidor) y se muestra aquí. */
    externalFeedback: Pair<String, Boolean>? = null,
    title: String = "Escaneando… apunta al código de barras",
    externalMode: Boolean = false,
) {
    val ctx = LocalContext.current
    var granted by remember { mutableStateOf(ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    LaunchedEffect(Unit) { if (!granted) launcher.launch(Manifest.permission.CAMERA) }

    var torch by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<Pair<String, Boolean>?>(null) }
    var lastCode by remember { mutableStateOf("" to 0L) }

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = Palette.Bg) {
            Box(Modifier.fillMaxSize()) {
                if (granted) {
                    CameraPreview(
                        torch = torch,
                        onCode = { code ->
                            val now = System.currentTimeMillis()
                            // Anti-rebote: el mismo código no se vuelve a leer en 1.5 s
                            if (code == lastCode.first && now - lastCode.second < 1500) return@CameraPreview
                            lastCode = code to now
                            val ok = onCode(code)
                            if (!externalMode) feedback = (if (ok) "Agregado: $code" else "No registrado: $code") to ok
                        },
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Se necesita permiso de cámara para escanear", color = Palette.Text)
                        Button(onClick = { launcher.launch(Manifest.permission.CAMERA) }) { Text("Permitir cámara") }
                    }
                }

                // Marco de enfoque
                Box(
                    Modifier.align(Alignment.Center).size(width = 520.dp, height = 240.dp)
                        .border(3.dp, Palette.Gold, RoundedCornerShape(24.dp)),
                )

                Row(
                    Modifier.fillMaxWidth().padding(24.dp).align(Alignment.TopCenter),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(title, color = Palette.Text, style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.clip(RoundedCornerShape(14.dp)).background(Palette.Bg.copy(alpha = 0.7f)).padding(horizontal = 18.dp, vertical = 10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FilledTonalIconButton(onClick = { torch = !torch }, modifier = Modifier.size(56.dp)) { Icon(Icons.Filled.FlashlightOn, "Linterna") }
                        FilledTonalIconButton(onClick = onClose, modifier = Modifier.size(56.dp)) { Icon(Icons.Filled.Close, "Cerrar") }
                    }
                }

                (if (externalMode) externalFeedback else feedback)?.let { (text, ok) ->
                    Text(
                        text, color = Palette.Bg, style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 96.dp)
                            .clip(RoundedCornerShape(16.dp)).background(if (ok) Palette.Ok else Palette.Danger)
                            .padding(horizontal = 24.dp, vertical = 14.dp),
                    )
                }
                Button(
                    onClick = onClose, modifier = Modifier.align(Alignment.BottomCenter).padding(24.dp).height(56.dp).width(240.dp),
                    shape = RoundedCornerShape(16.dp),
                ) { Text("Listo") }
            }
        }
    }
}

@OptIn(ExperimentalGetImage::class)
@Composable
private fun CameraPreview(torch: Boolean, onCode: (String) -> Unit, modifier: Modifier) {
    val ctx = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val scanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder().setBarcodeFormats(
                Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E,
                Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39, Barcode.FORMAT_QR_CODE,
            ).build(),
        )
    }
    var camera by remember { mutableStateOf<Camera?>(null) }
    val currentOnCode by rememberUpdatedState(onCode)

    LaunchedEffect(torch, camera) { camera?.cameraControl?.enableTorch(torch) }

    DisposableEffect(Unit) {
        onDispose {
            runCatching { ProcessCameraProvider.getInstance(ctx).get().unbindAll() }
            scanner.close()
            executor.shutdown()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { c ->
            val previewView = PreviewView(c)
            val future = ProcessCameraProvider.getInstance(c)
            future.addListener({
                val provider = future.get()
                val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST).build()
                analysis.setAnalyzer(executor) { proxy ->
                    val media = proxy.image
                    if (media == null) { proxy.close(); return@setAnalyzer }
                    val image = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
                    scanner.process(image)
                        .addOnSuccessListener { codes -> codes.firstOrNull()?.rawValue?.let { currentOnCode(it) } }
                        .addOnCompleteListener { proxy.close() }
                }
                val selector = if (provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) CameraSelector.DEFAULT_BACK_CAMERA
                else CameraSelector.DEFAULT_FRONT_CAMERA
                provider.unbindAll()
                camera = provider.bindToLifecycle(lifecycleOwner, selector, preview, analysis)
            }, ContextCompat.getMainExecutor(c))
            previewView
        },
    )
}
