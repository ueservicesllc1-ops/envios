package com.vibe.pos.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vibe.pos.UiState
import com.vibe.pos.data.LocalReceipt
import com.vibe.pos.data.ReceiptItem

/**
 * Ingreso de mercadería: el local recibe, perfume por perfume, lo que el admin pasó desde Bodega Ecuador.
 * Cada código escaneado suma 1 recibido y 1 al stock del local (lo valida y escribe el servidor).
 */
@Composable
fun ReceiptsView(
    state: UiState,
    onRefresh: () -> Unit,
    onScan: (receiptId: String, barcode: String, productId: String?) -> Unit,
    onClearFeedback: () -> Unit,
    onClose: (receiptId: String, reason: String) -> Unit,
    onBackToPos: () -> Unit,
) {
    LaunchedEffect(Unit) { onRefresh() }

    var openId by remember { mutableStateOf<String?>(null) }
    var scanning by remember { mutableStateOf(false) }
    var assignProductId by remember { mutableStateOf<String?>(null) }
    var confirmClose by remember { mutableStateOf(false) }

    val receipt = state.receipts.firstOrNull { it.id == openId }
    // La nota se completa y desaparece de pendientes -> volver a la lista
    LaunchedEffect(receipt, scanning) {
        if (openId != null && receipt == null && !scanning) openId = null
    }
    val canClose = state.session?.staff?.role.let { it == "manager" || it == "owner" }

    Column(Modifier.fillMaxSize().background(Palette.Bg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                IconButton(onClick = { if (receipt != null) openId = null else onBackToPos() }) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver", tint = Palette.Text)
                }
                Column {
                    Text(
                        if (receipt == null) "Ingreso de Mercadería" else receipt.number,
                        fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Palette.Text,
                    )
                    Text(
                        if (receipt == null) "Notas enviadas desde Bodega Ecuador pendientes de recibir"
                        else "Escanea cada perfume para recibirlo en el local",
                        fontSize = 13.sp, color = Palette.Muted,
                    )
                }
            }
            Button(
                onClick = onRefresh,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Surface),
                border = BorderStroke(1.dp, Palette.Border),
            ) { Icon(Icons.Filled.Refresh, null, tint = Palette.Text); Spacer(Modifier.width(6.dp)); Text("Actualizar", color = Palette.Text) }
        }

        if (receipt == null) {
            if (state.loadingReceipts) {
                Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Palette.Gold) }
            } else if (state.receipts.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
                    Text("No hay notas de ingreso pendientes", color = Palette.Muted, fontSize = 16.sp)
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(state.receipts, key = { it.id }) { r -> ReceiptCard(r) { openId = r.id } }
                }
            }
        } else {
            val total = receipt.expectedTotal
            val done = receipt.receivedTotal
            LinearProgressIndicator(
                progress = { if (total == 0) 0f else done.toFloat() / total },
                modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(5.dp)),
                color = Palette.Ok, trackColor = Palette.Border,
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Recibido $done de $total", color = Palette.Text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (canClose && done < total) {
                        OutlinedButton(onClick = { confirmClose = true }) { Text("Cerrar con faltantes") }
                    }
                    Button(
                        onClick = { assignProductId = null; onClearFeedback(); scanning = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                    ) { Icon(Icons.Filled.QrCodeScanner, null); Spacer(Modifier.width(8.dp)); Text("Escanear") }
                }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(receipt.items, key = { it.productId }) { item ->
                    ReceiptItemRow(item, onAssign = {
                        assignProductId = item.productId; onClearFeedback(); scanning = true
                    })
                }
            }
        }
    }

    if (scanning && receipt != null) {
        val target = assignProductId
        ScannerDialog(
            lastMessage = null,
            onCode = { code -> onScan(receipt.id, code, target); true },
            onClose = { scanning = false; assignProductId = null; onClearFeedback() },
            externalFeedback = state.receiptScanFeedback,
            externalMode = true,
            title = if (target != null) "Escanea el código del perfume a asociar"
            else "Recibido ${receipt.receivedTotal}/${receipt.expectedTotal} · apunta al código de barras",
        )
        // Tras asociar un código, el escaneo normal continúa
        LaunchedEffect(state.receiptScanFeedback) {
            if (target != null && state.receiptScanFeedback?.second == true) assignProductId = null
        }
    }

    if (confirmClose && receipt != null) {
        AlertDialog(
            onDismissRequest = { confirmClose = false },
            title = { Text("Cerrar con faltantes") },
            text = { Text("Lo no recibido (${receipt.expectedTotal - receipt.receivedTotal} uds) volverá al stock de Bodega Ecuador.") },
            confirmButton = {
                TextButton(onClick = { confirmClose = false; onClose(receipt.id, "Cierre con faltantes desde POS") }) { Text("Cerrar nota") }
            },
            dismissButton = { TextButton(onClick = { confirmClose = false }) { Text("Cancelar") } },
        )
    }
}

@Composable
private fun ReceiptCard(r: LocalReceipt, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Palette.Surface)
            .border(1.dp, Palette.Border, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(r.number, color = Palette.Text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text("${r.items.size} perfumes · ${r.createdAt.take(10)}", color = Palette.Muted, fontSize = 13.sp)
            if (r.notes.isNotBlank()) Text(r.notes, color = Palette.Muted, fontSize = 12.sp)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text("${r.receivedTotal}/${r.expectedTotal}", color = Palette.Gold, fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Text(if (r.status == "partial") "En recepción" else "Pendiente", color = Palette.Muted, fontSize = 12.sp)
        }
    }
}

@Composable
private fun ReceiptItemRow(item: ReceiptItem, onAssign: () -> Unit) {
    val complete = item.receivedQty >= item.expectedQty
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(if (complete) Palette.Ok.copy(alpha = 0.12f) else Palette.Surface)
            .border(1.dp, if (complete) Palette.Ok else Palette.Border, RoundedCornerShape(12.dp)).padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(item.name, color = Palette.Text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            Text(
                if (item.barcode.isBlank()) "Sin código de barras" else item.barcode,
                color = if (item.barcode.isBlank()) Palette.Danger else Palette.Muted, fontSize = 12.sp,
            )
        }
        if (item.barcode.isBlank()) {
            TextButton(onClick = onAssign) { Text("Asignar código") }
        }
        Spacer(Modifier.width(8.dp))
        if (complete) Icon(Icons.Filled.CheckCircle, null, tint = Palette.Ok)
        else Text("${item.receivedQty}/${item.expectedQty}", color = Palette.Gold, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}
