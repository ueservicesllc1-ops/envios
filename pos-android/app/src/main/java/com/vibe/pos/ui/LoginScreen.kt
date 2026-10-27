package com.vibe.pos.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vibe.pos.UiState
import com.vibe.pos.data.Staff

/** Pantalla de bloqueo / ingreso del asesor con PIN táctil. */
@Composable
fun LoginScreen(
    state: UiState,
    onLogin: (staffId: String, pin: String) -> Unit,
    onRetryStaff: () -> Unit,
) {
    var selected by remember { mutableStateOf<Staff?>(null) }
    var pin by remember { mutableStateOf("") }

    // Si está bloqueado por inactividad, solo puede volver a entrar el mismo asesor
    val lockedStaff = if (state.locked) state.session?.staff else null
    val staff = lockedStaff ?: selected ?: state.staffList.firstOrNull() ?: Staff("vendedor", "Vendedor", "advisor")

    // Limpia el PIN tras un error
    LaunchedEffect(state.loginError) { if (state.loginError != null) pin = "" }

    // Si hay un solo asesor o ninguno seleccionado, seleccionarlo automáticamente
    LaunchedEffect(state.staffList) {
        if (selected == null && state.staffList.isNotEmpty()) {
            selected = state.staffList.first()
        }
    }

    Box(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Palette.Surface, Color(0xFFE8ECF2)))),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            Modifier.widthIn(max = 980.dp).padding(32.dp),
            horizontalArrangement = Arrangement.spacedBy(48.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Marca Falconi Perfumes (logo centrado y grande) + selector de asesor
            Column(
                Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = com.vibe.pos.R.drawable.logo_falconi),
                    contentDescription = "Logo Falconi Perfumes",
                    colorFilter = androidx.compose.ui.graphics.ColorFilter.tint(Palette.Gold),
                    modifier = Modifier.size(190.dp),
                )
                Text(
                    if (state.locked) "Sesión bloqueada" else "Punto de Venta",
                    style = MaterialTheme.typography.headlineLarge,
                    textAlign = TextAlign.Center,
                )
                Text(
                    if (state.locked) "Ingresa tu PIN para continuar" else "Digita tu PIN para comenzar a vender",
                    color = Palette.Muted,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(6.dp))
                if (lockedStaff != null) {
                    StaffChip(lockedStaff, true) {}
                } else if (state.staffList.isEmpty()) {
                    Text(state.staffError ?: "Cargando asesores…", color = if (state.staffError != null) Palette.Danger else Palette.Muted)
                    if (state.staffError != null) TextButton(onClick = onRetryStaff) { Text("Reintentar") }
                } else {
                    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        state.staffList.forEach { s -> StaffChip(s, staff?.id == s.id) { selected = s; pin = "" } }
                    }
                }
            }

            // Teclado PIN
            Column(Modifier.width(320.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.height(28.dp)) {
                    repeat(4) { i ->
                        Box(
                            Modifier.size(20.dp).clip(CircleShape)
                                .background(if (i < pin.length) Palette.Gold else Color.Transparent)
                                .border(2.dp, if (i < pin.length) Palette.Gold else Palette.Muted, CircleShape),
                        )
                    }
                }
                Text(
                    state.loginError ?: if (staff == null) "Elige un usuario" else staff.name,
                    color = if (state.loginError != null) Palette.Danger else Palette.Muted,
                    textAlign = TextAlign.Center, modifier = Modifier.height(24.dp),
                )
                PinPad(
                    enabled = staff != null && !state.loggingIn,
                    onDigit = { digit ->
                        if (pin.length < 4) {
                            val newPin = pin + digit
                            pin = newPin
                            if (newPin.length == 4 && staff != null) {
                                onLogin(staff.id, newPin)
                            }
                        }
                    },
                    onBackspace = { pin = pin.dropLast(1) },
                )
                Button(
                    onClick = { staff?.let { onLogin(it.id, pin) } },
                    enabled = staff != null && pin.length == 4 && !state.loggingIn,
                    modifier = Modifier.fillMaxWidth().height(60.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    if (state.loggingIn) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 3.dp, color = Palette.Bg)
                    else Text("Ingresar", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private val Color0F0F18 = Color(0xFF0F0F18)

@Composable
private fun StaffChip(staff: Staff, selected: Boolean, onClick: () -> Unit) {
    val roleLabel = when (staff.role) { "manager" -> "Gerente"; "owner" -> "Dueño"; else -> "Asesor" }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
            .background(if (selected) Palette.SurfaceHigh else Palette.Surface)
            .border(BorderStroke(if (selected) 2.dp else 1.dp, if (selected) Palette.Gold else MaterialTheme.colorScheme.outline), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(Modifier.size(44.dp).clip(CircleShape).background(Palette.Gold), contentAlignment = Alignment.Center) {
            Text(staff.name.take(1).uppercase(), color = Palette.Bg, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }
        Column {
            Text(staff.name, style = MaterialTheme.typography.titleMedium)
            Text(roleLabel, color = Palette.Muted, fontSize = 13.sp)
        }
    }
}

@Composable
fun PinPad(enabled: Boolean, onDigit: (String) -> Unit, onBackspace: () -> Unit) {
    val rows = listOf(listOf("1", "2", "3"), listOf("4", "5", "6"), listOf("7", "8", "9"), listOf("", "0", "⌫"))
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        rows.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { key ->
                    if (key.isEmpty()) Spacer(Modifier.size(88.dp, 68.dp))
                    else KeyButton(key, enabled) { if (key == "⌫") onBackspace() else onDigit(key) }
                }
            }
        }
    }
}

@Composable
fun KeyButton(label: String, enabled: Boolean = true, w: androidx.compose.ui.unit.Dp = 88.dp, onClick: () -> Unit) {
    Box(
        Modifier.size(w, 68.dp).clip(RoundedCornerShape(18.dp))
            .background(Palette.Surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(18.dp))
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (label == "⌫") Icon(Icons.AutoMirrored.Filled.Backspace, null, tint = if (enabled) Palette.Text else Palette.Muted)
        else Text(label, fontSize = 26.sp, fontWeight = FontWeight.Medium, color = if (enabled) Palette.Text else Palette.Muted)
    }
}
