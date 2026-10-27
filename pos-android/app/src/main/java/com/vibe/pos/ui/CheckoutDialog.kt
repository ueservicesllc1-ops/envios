package com.vibe.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.vibe.pos.UiState
import com.vibe.pos.data.PayMethod
import com.vibe.pos.data.PaymentInput
import com.vibe.pos.data.SaleResult
import com.vibe.pos.data.money
import kotlin.math.max

private fun round2(v: Double) = Math.round(v * 100.0) / 100.0

@Composable
fun CheckoutDialog(
    state: UiState,
    maxDiscountPct: Double,
    onConfirm: (discountPct: Double, payment: PaymentInput, customer: String?) -> Unit,
    onDismiss: () -> Unit,
) {
    var discount by remember { mutableStateOf(0.0) }
    var method by remember { mutableStateOf(PayMethod.CASH) }
    var cashText by remember { mutableStateOf("") }
    var cardText by remember { mutableStateOf("") }
    var transferText by remember { mutableStateOf("") }
    var reference by remember { mutableStateOf("") }
    var customer by remember { mutableStateOf("") }

    val subtotal = state.subtotal
    val total = round2(subtotal - subtotal * discount / 100.0)
    val cash = cashText.toDoubleOrNull() ?: 0.0
    val card = cardText.toDoubleOrNull() ?: 0.0
    val transfer = transferText.toDoubleOrNull() ?: 0.0
    val needsRef = method == PayMethod.CARD || method == PayMethod.TRANSFER || (method == PayMethod.MIXED && (card > 0 || transfer > 0))
    val paid = when (method) { PayMethod.CASH -> cash; PayMethod.MIXED -> cash + card + transfer; else -> total }
    val change = max(0.0, round2(paid - total))
    val canPay = !state.processingSale && paid + 0.0001 >= total && (!needsRef || reference.isNotBlank())

    Dialog(onDismissRequest = { if (!state.processingSale) onDismiss() }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.widthIn(max = 940.dp).fillMaxWidth(0.94f).heightIn(max = 640.dp), shape = RoundedCornerShape(28.dp), color = Palette.Surface) {
            Row(Modifier.padding(28.dp), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                // ---------- Izquierda: resumen ----------
                Column(Modifier.weight(0.9f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("Cobrar", style = MaterialTheme.typography.headlineMedium)
                    Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text("Subtotal", color = Palette.Muted); Text(subtotal.money())
                    }
                    val options = listOf(0.0, 5.0, 10.0, 15.0).filter { it <= maxDiscountPct }
                    if (options.size > 1) {
                        Text("Descuento", color = Palette.Muted)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            options.forEach { d ->
                                FilterChip(selected = discount == d, onClick = { discount = d }, label = { Text(if (d == 0.0) "Ninguno" else "${d.toInt()}%") })
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                    Text("TOTAL", color = Palette.Muted, letterSpacing = 3.sp)
                    Text(total.money(), fontSize = 54.sp, fontWeight = FontWeight.Bold, color = Palette.Gold)
                    if (method == PayMethod.CASH || method == PayMethod.MIXED) {
                        Text("Vuelto", color = Palette.Muted)
                        Text(change.money(), fontSize = 30.sp, fontWeight = FontWeight.SemiBold, color = if (paid >= total) Palette.Ok else Palette.Muted)
                    }
                    Spacer(Modifier.weight(1f))
                    OutlinedTextField(
                        value = customer, onValueChange = { customer = it.take(80) }, label = { Text("Cliente (opcional)") },
                        singleLine = true, modifier = Modifier.fillMaxWidth(),
                    )
                    state.saleError?.let { Text(it, color = Palette.Danger) }
                }

                // ---------- Derecha: pago ----------
                Column(Modifier.weight(1.1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PayMethod.values().forEach { m ->
                            FilterChip(selected = method == m, onClick = { method = m }, label = { Text(m.label, fontSize = 15.sp) }, modifier = Modifier.height(44.dp))
                        }
                    }

                    when (method) {
                        PayMethod.CASH -> {
                            Text("Efectivo recibido", color = Palette.Muted)
                            Text(if (cashText.isEmpty()) "$0.00" else "$$cashText", fontSize = 36.sp, fontWeight = FontWeight.Bold)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(onClick = { cashText = String.format(java.util.Locale.US, "%.2f", total) }) { Text("Exacto") }
                                listOf(5, 10, 20, 50, 100).forEach { b ->
                                    OutlinedButton(onClick = { cashText = b.toString() }, contentPadding = PaddingValues(horizontal = 10.dp)) { Text("$$b") }
                                }
                            }
                            NumPad(onKey = { k -> cashText = editNumber(cashText, k) })
                        }
                        PayMethod.CARD, PayMethod.TRANSFER -> {
                            Text(if (method == PayMethod.CARD) "Cobra en el datáfono y registra el voucher" else "Verifica el comprobante antes de confirmar", color = Palette.Muted)
                        }
                        PayMethod.MIXED -> {
                            MoneyField("Efectivo", cashText) { cashText = it }
                            MoneyField("Tarjeta", cardText) { cardText = it }
                            MoneyField("Transferencia", transferText) { transferText = it }
                        }
                    }
                    if (needsRef) {
                        OutlinedTextField(
                            value = reference, onValueChange = { reference = it.take(60) },
                            label = { Text(if (method == PayMethod.CARD) "Nº de voucher / autorización" else "Referencia del pago") },
                            singleLine = true, modifier = Modifier.fillMaxWidth(),
                        )
                    }

                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = onDismiss, enabled = !state.processingSale, modifier = Modifier.weight(1f).height(60.dp), shape = RoundedCornerShape(16.dp)) { Text("Volver") }
                        Button(
                            onClick = {
                                onConfirm(
                                    discount,
                                    PaymentInput(method, cashReceived = if (method == PayMethod.MIXED || method == PayMethod.CASH) cash else 0.0, cardAmount = card, transferAmount = transfer, reference = reference.trim()),
                                    customer.trim().ifEmpty { null },
                                )
                            },
                            enabled = canPay, modifier = Modifier.weight(2f).height(60.dp), shape = RoundedCornerShape(16.dp),
                        ) {
                            if (state.processingSale) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 3.dp, color = Palette.Bg)
                            else Text("Confirmar venta", fontSize = 18.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun editNumber(current: String, key: String): String = when (key) {
    "⌫" -> current.dropLast(1)
    "." -> if (current.contains('.')) current else (if (current.isEmpty()) "0." else "$current.")
    else -> {
        val next = current + key
        val dec = next.substringAfter('.', "")
        if (dec.length > 2 || next.length > 9) current else next
    }
}

@Composable
private fun NumPad(onKey: (String) -> Unit) {
    val rows = listOf(listOf("7", "8", "9"), listOf("4", "5", "6"), listOf("1", "2", "3"), listOf(".", "0", "⌫"))
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { k -> KeyButton(k, w = 96.dp) { onKey(k) } }
            }
        }
    }
}

@Composable
private fun MoneyField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value, onValueChange = { v -> if (v.matches(Regex("^\\d{0,7}(\\.\\d{0,2})?$"))) onChange(v) },
        label = { Text(label) }, prefix = { Text("$") }, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(),
    )
}

/** Confirmación tras una venta registrada por el servidor. */
@Composable
fun SaleDoneDialog(result: SaleResult, onNew: () -> Unit) {
    Dialog(onDismissRequest = onNew) {
        Surface(shape = RoundedCornerShape(28.dp), color = Palette.Surface) {
            Column(Modifier.padding(36.dp).widthIn(min = 380.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(Icons.Filled.CheckCircle, null, tint = Palette.Ok, modifier = Modifier.size(72.dp))
                Text("Venta registrada", style = MaterialTheme.typography.headlineMedium)
                Text(result.saleNumber, color = Palette.Gold, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
                Text(result.total.money(), fontSize = 44.sp, fontWeight = FontWeight.Bold)
                if (result.change > 0) {
                    Text("Vuelto", color = Palette.Muted)
                    Text(result.change.money(), fontSize = 32.sp, color = Palette.Ok, fontWeight = FontWeight.SemiBold)
                }
                if (result.duplicate) Text("(Venta ya registrada anteriormente)", color = Palette.Warn, textAlign = TextAlign.Center)
                Spacer(Modifier.height(8.dp))
                Button(onClick = onNew, modifier = Modifier.fillMaxWidth().height(60.dp), shape = RoundedCornerShape(16.dp)) { Text("Nueva venta", fontSize = 18.sp) }
            }
        }
    }
}
