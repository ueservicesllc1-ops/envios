package com.vibe.pos.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashlightOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import coil.compose.AsyncImage
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.vibe.pos.data.Product
import com.vibe.pos.data.money
import java.util.concurrent.Executors

/**
 * Reconocimiento inteligente de perfumes por foto:
 * Analiza el frasco o caja con OCR on-device, identifica marca y nombre de perfume,
 * y propone las mejores coincidencias con fotos reales del catálogo.
 */
@Composable
fun PhotoRecognitionDialog(
    products: List<Product>,
    onSelect: (Product) -> Unit,
    onClose: () -> Unit,
) {
    val ctx = LocalContext.current
    var granted by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted = it }
    LaunchedEffect(Unit) { if (!granted) launcher.launch(Manifest.permission.CAMERA) }

    var torch by remember { mutableStateOf(false) }
    var analyzing by remember { mutableStateOf(false) }
    var detectedText by remember { mutableStateOf("") }
    var matches by remember { mutableStateOf<List<Product>>(emptyList()) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }

    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = Palette.Bg) {
            Box(Modifier.fillMaxSize()) {
                if (granted) {
                    PhotoCameraPreview(
                        torch = torch,
                        onImageCaptureReady = { imageCapture = it },
                        modifier = Modifier.fillMaxSize(),
                    )
                }

                // Guía de encuadre elegante
                Box(
                    Modifier.align(Alignment.Center).size(width = 340.dp, height = 440.dp)
                        .border(2.dp, Palette.Gold.copy(alpha = 0.8f), RoundedCornerShape(28.dp)),
                ) {
                    Text(
                        "Encuadra el frasco o caja aquí",
                        color = Palette.GoldSoft,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.align(Alignment.TopCenter).padding(top = 16.dp)
                            .clip(RoundedCornerShape(12.dp)).background(Palette.Bg.copy(alpha = 0.7f))
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                    )
                }

                // Barra superior
                Row(
                    Modifier.fillMaxWidth().padding(24.dp).align(Alignment.TopCenter),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(Palette.Bg.copy(alpha = 0.75f)).padding(horizontal = 18.dp, vertical = 10.dp)
                    ) {
                        Icon(Icons.Filled.CameraAlt, null, tint = Palette.Gold)
                        Text("Reconocer Perfume", color = Palette.Text, style = MaterialTheme.typography.titleLarge)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        FilledTonalIconButton(onClick = { torch = !torch }, modifier = Modifier.size(56.dp)) {
                            Icon(Icons.Filled.FlashlightOn, "Linterna")
                        }
                        FilledTonalIconButton(onClick = onClose, modifier = Modifier.size(56.dp)) {
                            Icon(Icons.Filled.Close, "Cerrar")
                        }
                    }
                }

                // Panel inferior de resultados o botón de captura
                Column(
                    Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (matches.isNotEmpty()) {
                        Text(
                            "Perfumes identificados (${matches.size}) — Toca para agregar:",
                            color = Palette.Gold,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                            modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(Palette.Bg.copy(alpha = 0.85f)).padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            items(matches, key = { it.id }) { p ->
                                MatchCard(product = p, onSelect = { onSelect(p); onClose() })
                            }
                        }
                    } else if (detectedText.isNotEmpty() && !analyzing) {
                        Text(
                            "Texto detectado: \"$detectedText\" — No se encontraron coincidencias directas",
                            color = Palette.Warn,
                            fontSize = 13.sp,
                            modifier = Modifier.clip(RoundedCornerShape(10.dp)).background(Palette.Bg.copy(alpha = 0.85f)).padding(horizontal = 14.dp, vertical = 6.dp)
                        )
                    }

                    // Botón de captura y análisis
                    Button(
                        onClick = {
                            val cap = imageCapture ?: return@Button
                            analyzing = true
                            cap.takePicture(
                                ContextCompat.getMainExecutor(ctx),
                                object : ImageCapture.OnImageCapturedCallback() {
                                    override fun onCaptureSuccess(imageProxy: ImageProxy) {
                                        val media = imageProxy.image
                                        if (media != null) {
                                            val input = InputImage.fromMediaImage(media, imageProxy.imageInfo.rotationDegrees)
                                            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                                            recognizer.process(input)
                                                .addOnSuccessListener { visionText ->
                                                    val raw = visionText.text.lowercase()
                                                    detectedText = visionText.text.take(60)
                                                    matches = rankProductsByText(products, raw)
                                                }
                                                .addOnCompleteListener {
                                                    imageProxy.close()
                                                    analyzing = false
                                                }
                                        } else {
                                            imageProxy.close()
                                            analyzing = false
                                        }
                                    }

                                    override fun onError(exception: ImageCaptureException) {
                                        analyzing = false
                                    }
                                }
                            )
                        },
                        enabled = !analyzing,
                        modifier = Modifier.height(64.dp).widthIn(min = 280.dp),
                        shape = RoundedCornerShape(20.dp),
                    ) {
                        if (analyzing) {
                            CircularProgressIndicator(Modifier.size(26.dp), color = Palette.Bg, strokeWidth = 3.dp)
                            Spacer(Modifier.width(12.dp))
                            Text("Analizando perfume…", fontSize = 17.sp)
                        } else {
                            Icon(Icons.Filled.Search, null)
                            Spacer(Modifier.width(10.dp))
                            Text("Identificar Perfume", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

/** Compara el texto extraído contra nombres, marcas y SKUs */
private fun rankProductsByText(products: List<Product>, query: String): List<Product> {
    if (query.isBlank()) return emptyList()
    val words = query.split(Regex("[^a-zA-Z0-9]+")).filter { it.length >= 3 }
    if (words.isEmpty()) return emptyList()

    return products.mapNotNull { p ->
        var score = 0
        val pName = p.name.lowercase()
        val pBrand = p.brand.lowercase()
        val pSku = p.sku.lowercase()

        for (w in words) {
            if (pBrand.contains(w)) score += 5
            if (pName.contains(w)) score += 4
            if (pSku.contains(w)) score += 6
        }
        if (score > 0) p to score else null
    }
    .sortedByDescending { it.second }
    .take(4)
    .map { it.first }
}

@Composable
private fun MatchCard(product: Product, onSelect: () -> Unit) {
    Row(
        Modifier.width(280.dp).clip(RoundedCornerShape(18.dp))
            .background(Palette.SurfaceHigh)
            .border(2.dp, Palette.Gold, RoundedCornerShape(18.dp))
            .clickable(onClick = onSelect)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).background(Palette.Surface)) {
            if (product.imageUrl != null) {
                AsyncImage(product.imageUrl, product.name, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().padding(4.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            if (product.brand.isNotEmpty()) Text(product.brand.uppercase(), color = Palette.Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            Text(product.name, color = Palette.Text, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium)
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(product.price.money(), color = Palette.Text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("Stock: ${product.stock}", color = if (product.stock > 0) Palette.Ok else Palette.Danger, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun PhotoCameraPreview(
    torch: Boolean,
    onImageCaptureReady: (ImageCapture) -> Unit,
    modifier: Modifier,
) {
    val ctx = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var camera by remember { mutableStateOf<Camera?>(null) }

    LaunchedEffect(torch, camera) { camera?.cameraControl?.enableTorch(torch) }

    AndroidView(
        modifier = modifier,
        factory = { c ->
            val previewView = PreviewView(c)
            val future = ProcessCameraProvider.getInstance(c)
            future.addListener({
                val provider = future.get()
                val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()
                onImageCaptureReady(capture)
                val selector = if (provider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA)) CameraSelector.DEFAULT_BACK_CAMERA
                else CameraSelector.DEFAULT_FRONT_CAMERA
                provider.unbindAll()
                camera = provider.bindToLifecycle(lifecycleOwner, selector, preview, capture)
            }, ContextCompat.getMainExecutor(c))
            previewView
        },
    )
}
