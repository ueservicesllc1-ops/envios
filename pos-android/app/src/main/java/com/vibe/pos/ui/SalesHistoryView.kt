package com.vibe.pos.ui

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vibe.pos.UiState
import com.vibe.pos.data.PosSaleRecord
import com.vibe.pos.data.money

@Composable
fun SalesHistoryView(
    state: UiState,
    onRefresh: () -> Unit,
    onResendEmail: (saleId: String, email: String, onDone: (Boolean, String) -> Unit) -> Unit,
    onBackToPos: () -> Unit,
) {
    var selectedSale by remember { mutableStateOf<PosSaleRecord?>(null) }
    var emailDialogOpen by remember { mutableStateOf(false) }
    var emailToSend by remember { mutableStateOf("") }
    var sendingEmail by remember { mutableStateOf(false) }
    var emailStatusMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        onRefresh()
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Palette.Bg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Encabezado
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                IconButton(onClick = onBackToPos) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Palette.Text)
                }
                Column {
                    Text(
                        "Ventas Realizadas",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text
                    )
                    Text(
                        "${state.salesHistory.size} ventas registradas recientemente",
                        fontSize = 13.sp,
                        color = Palette.Muted
                    )
                }
            }

            Button(
                onClick = onRefresh,
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Surface),
                border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Filled.Refresh, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Actualizar", color = Palette.Text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }

        if (state.loadingSales) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Palette.Gold)
            }
        } else if (state.salesHistory.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.ReceiptLong, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(54.dp))
                    Text("No hay ventas registradas todavía", color = Palette.Muted, fontSize = 16.sp)
                }
            }
        } else {
            Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                // Lista de ventas a la izquierda
                LazyColumn(
                    Modifier
                        .weight(1.1f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.salesHistory, key = { it.id }) { sale ->
                        val isSelected = selectedSale?.id == sale.id
                        Surface(
                            onClick = { selectedSale = sale },
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(
                                    1.dp,
                                    if (isSelected) Palette.Gold else Palette.Border,
                                    RoundedCornerShape(14.dp)
                                ),
                            shape = RoundedCornerShape(14.dp),
                            color = if (isSelected) Palette.SurfaceHigh else Palette.Surface,
                            shadowElevation = 1.dp
                        ) {
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(
                                            "#${sale.saleNumber}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = Palette.Gold
                                        )
                                        Surface(
                                            shape = RoundedCornerShape(6.dp),
                                            color = when (sale.paymentMethod.lowercase()) {
                                                "cash", "efectivo" -> Color(0xFFE6F4EA)
                                                "card", "tarjeta" -> Color(0xFFE8F0FE)
                                                "transfer", "transferencia" -> Color(0xFFFEF7E0)
                                                else -> Color(0xFFF1F3F4)
                                            }
                                        ) {
                                            Text(
                                                when (sale.paymentMethod.lowercase()) {
                                                    "cash", "efectivo" -> "Efectivo"
                                                    "card", "tarjeta" -> "Tarjeta"
                                                    "transfer", "transferencia" -> "Transfer"
                                                    else -> sale.paymentMethod.replaceFirstChar { it.uppercase() }
                                                },
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = when (sale.paymentMethod.lowercase()) {
                                                    "cash", "efectivo" -> Color(0xFF137333)
                                                    "card", "tarjeta" -> Color(0xFF1A73E8)
                                                    "transfer", "transferencia" -> Color(0xFFB06000)
                                                    else -> Color(0xFF3C4043)
                                                },
                                                modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                    Text(
                                        "Cliente: ${sale.customerName}",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Palette.Text
                                    )
                                    Text(
                                        "${sale.createdAt} • Asesor: ${sale.staffName}",
                                        fontSize = 11.5.sp,
                                        color = Palette.Muted
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(
                                        sale.total.money(),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 17.sp,
                                        color = Palette.Text
                                    )
                                    Text(
                                        "${sale.items.sumOf { it.quantity }} items",
                                        fontSize = 11.5.sp,
                                        color = Palette.Muted
                                    )
                                }
                            }
                        }
                    }
                }

                // Detalle de la venta seleccionada a la derecha
                Surface(
                    Modifier
                        .weight(0.9f)
                        .fillMaxHeight(),
                    shape = RoundedCornerShape(16.dp),
                    color = Palette.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border)
                ) {
                    val s = selectedSale ?: state.salesHistory.firstOrNull()
                    if (s == null) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Selecciona una venta para ver el recibo", color = Palette.Muted)
                        }
                    } else {
                        Column(
                            Modifier
                                .fillMaxSize()
                                .padding(18.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Comprobante Digital", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                                    Text("Nº ${s.saleNumber}", fontSize = 13.sp, color = Palette.Gold, fontWeight = FontWeight.SemiBold)
                                }
                                Button(
                                    onClick = {
                                        emailToSend = s.customerEmail
                                        emailDialogOpen = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Filled.Mail, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Enviar Recibo", fontSize = 12.sp, color = Color.White)
                                }
                            }

                            HorizontalDivider(color = Palette.Border)

                            // Datos cliente y fecha
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Cliente:", fontSize = 12.sp, color = Palette.Muted)
                                    Text(s.customerName, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
                                }
                                if (s.customerCedula.isNotBlank()) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Cédula / RUC:", fontSize = 12.sp, color = Palette.Muted)
                                        Text(s.customerCedula, fontSize = 12.sp, color = Palette.Text)
                                    }
                                }
                                if (s.customerEmail.isNotBlank()) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Email:", fontSize = 12.sp, color = Palette.Muted)
                                        Text(s.customerEmail, fontSize = 12.sp, color = Palette.Gold)
                                    }
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Fecha:", fontSize = 12.sp, color = Palette.Muted)
                                    Text(s.createdAt, fontSize = 12.sp, color = Palette.Text)
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Atendido por:", fontSize = 12.sp, color = Palette.Muted)
                                    Text(s.staffName, fontSize = 12.sp, color = Palette.Text)
                                }
                            }

                            HorizontalDivider(color = Palette.Border)

                            Text("Artículos", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Palette.Text)

                            // Lista de productos del comprobante
                            LazyColumn(
                                Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(s.items) { item ->
                                    Row(
                                        Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Text(item.name, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Palette.Text)
                                            Text("${item.quantity} x ${item.unitPrice.money()}", fontSize = 11.5.sp, color = Palette.Muted)
                                        }
                                        Text(item.totalPrice.money(), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
                                    }
                                }
                            }

                            HorizontalDivider(color = Palette.Border)

                            // Totales
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Subtotal", fontSize = 13.sp, color = Palette.Muted)
                                    Text(s.subtotal.money(), fontSize = 13.sp, color = Palette.Text)
                                }
                                if (s.discountAmount > 0) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text("Descuento", fontSize = 13.sp, color = Palette.Danger)
                                        Text("-${s.discountAmount.money()}", fontSize = 13.sp, color = Palette.Danger)
                                    }
                                }
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("TOTAL", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                                    Text(s.total.money(), fontSize = 19.sp, fontWeight = FontWeight.Bold, color = Palette.Gold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Diálogo para enviar o reenviar recibo a un correo de Google
    if (emailDialogOpen && selectedSale != null) {
        val sale = selectedSale!!
        AlertDialog(
            onDismissRequest = { if (!sendingEmail) emailDialogOpen = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.MarkEmailRead, contentDescription = null, tint = Palette.Gold)
                    Text("Enviar Comprobante por Correo")
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Se enviará el recibo oficial digital con formato de lujo Falconi de la venta #${sale.saleNumber}.",
                        fontSize = 13.sp,
                        color = Palette.Muted
                    )
                    OutlinedTextField(
                        value = emailToSend,
                        onValueChange = { emailToSend = it },
                        label = { Text("Correo del cliente") },
                        placeholder = { Text("ejemplo@gmail.com") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    emailStatusMessage?.let { msg ->
                        Text(msg, fontSize = 12.sp, color = Palette.Gold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val email = emailToSend.trim()
                        if (email.isNotBlank() && email.contains("@")) {
                            sendingEmail = true
                            emailStatusMessage = "Enviando vía Gmail..."
                            onResendEmail(sale.id, email) { ok, msg ->
                                sendingEmail = false
                                if (ok) {
                                    emailStatusMessage = null
                                    emailDialogOpen = false
                                } else {
                                    emailStatusMessage = msg
                                }
                            }
                        } else {
                            emailStatusMessage = "Ingresa un correo electrónico válido"
                        }
                    },
                    enabled = !sendingEmail,
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold)
                ) {
                    if (sendingEmail) {
                        CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        Spacer(Modifier.width(6.dp))
                    }
                    Text("Enviar Ahora")
                }
            },
            dismissButton = {
                TextButton(onClick = { emailDialogOpen = false }, enabled = !sendingEmail) {
                    Text("Cancelar")
                }
            }
        )
    }
}
