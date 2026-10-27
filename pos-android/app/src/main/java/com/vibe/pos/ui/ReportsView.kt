package com.vibe.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vibe.pos.UiState
import com.vibe.pos.data.money

@Composable
fun ReportsView(
    state: UiState,
    onRefresh: () -> Unit,
    onBackToPos: () -> Unit,
) {
    LaunchedEffect(Unit) {
        onRefresh()
    }

    val reports = state.reports

    Column(
        Modifier
            .fillMaxSize()
            .background(Palette.Bg)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
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
                        "Reportes del Punto de Venta",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text
                    )
                    Text(
                        "Resumen consolidado de ingresos y productos más vendidos",
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

        if (state.loadingReports) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Palette.Gold)
            }
        } else if (reports == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Presiona Actualizar para cargar reportes", color = Palette.Muted)
            }
        } else {
            Row(
                Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Columna Izquierda: Tarjetas KPI y Métodos de Pago
                Column(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 3 Tarjetas KPI Principales
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        KpiCard(
                            title = "Ingresos Totales",
                            value = reports.totalRevenue.money(),
                            icon = Icons.Filled.AttachMoney,
                            iconColor = Palette.Gold,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Ventas Hechas",
                            value = "${reports.totalSalesCount}",
                            icon = Icons.Filled.Receipt,
                            iconColor = Palette.Ok,
                            modifier = Modifier.weight(1f)
                        )
                        KpiCard(
                            title = "Perfumes Vendidos",
                            value = "${reports.totalItemsSold}",
                            icon = Icons.Filled.Inventory2,
                            iconColor = Color(0xFF1E88E5),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    // Desglose por Método de Pago
                    Surface(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = Palette.Surface,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border)
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Ventas por Método de Pago", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            val totalRev = if (reports.totalRevenue > 0) reports.totalRevenue else 1.0

                            val methods = listOf(
                                Triple("Efectivo", reports.byMethod["cash"] ?: reports.byMethod["efectivo"] ?: 0.0, Color(0xFF2E7D32)),
                                Triple("Tarjeta", reports.byMethod["card"] ?: reports.byMethod["tarjeta"] ?: 0.0, Color(0xFF1565C0)),
                                Triple("Transferencia", reports.byMethod["transfer"] ?: reports.byMethod["transferencia"] ?: 0.0, Color(0xFFE65100)),
                                Triple("Mixto", reports.byMethod["mixed"] ?: reports.byMethod["mixto"] ?: 0.0, Color(0xFF6A1B9A))
                            )

                            methods.forEach { (label, amount, color) ->
                                val pct = (amount / totalRev).toFloat().coerceIn(0f, 1f)
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(label, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = Palette.Text)
                                        Text(amount.money(), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
                                    }
                                    LinearProgressIndicator(
                                        progress = { pct },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(8.dp)
                                            .clip(RoundedCornerShape(4.dp)),
                                        color = color,
                                        trackColor = Palette.Border
                                    )
                                }
                            }
                        }
                    }
                }

                // Columna Derecha: Top 10 Perfumes Más Vendidos
                Surface(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    shape = RoundedCornerShape(16.dp),
                    color = Palette.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border)
                ) {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Top Perfumes Más Vendidos", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            Text("Unidades / Total", fontSize = 12.sp, color = Palette.Muted)
                        }

                        HorizontalDivider(color = Palette.Border)

                        if (reports.topPerfumes.isEmpty()) {
                            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text("No hay datos de perfumes vendidos aún", color = Palette.Muted)
                            }
                        } else {
                            LazyColumn(
                                Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                itemsIndexed(reports.topPerfumes) { index, item ->
                                    Row(
                                        Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Palette.SurfaceHigh)
                                            .padding(10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                                            modifier = Modifier.weight(1f)
                                        ) {
                                            Surface(
                                                shape = CircleShape,
                                                color = if (index < 3) Palette.Gold else Palette.Border,
                                                modifier = Modifier.size(24.dp)
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    Text(
                                                        "${index + 1}",
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = if (index < 3) Color.White else Palette.Text
                                                    )
                                                }
                                            }
                                            Text(
                                                item.name,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = Palette.Text,
                                                maxLines = 1
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("${item.qty} uds", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Palette.Gold)
                                            Text(item.total.money(), fontSize = 11.5.sp, color = Palette.Muted)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = Palette.Surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border)
    ) {
        Column(
            Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = iconColor.copy(alpha = 0.12f),
                modifier = Modifier.size(34.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(18.dp))
                }
            }
            Text(title, fontSize = 12.sp, color = Palette.Muted)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
        }
    }
}
