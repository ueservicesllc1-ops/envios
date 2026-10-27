package com.vibe.pos.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vibe.pos.UiState

@Composable
fun SettingsView(
    state: UiState,
    onToggleTheme: (Boolean) -> Unit,
    onSetFontScale: (Float) -> Unit,
    onLoadEmailStatus: () -> Unit,
    onTestEmail: (String, (Boolean, String) -> Unit) -> Unit,
    onBackToPos: () -> Unit,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    var testEmailInput by remember { mutableStateOf("") }
    var testResultMsg by remember { mutableStateOf<String?>(null) }
    var copiedUrl by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        onLoadEmailStatus()
    }

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
                        "Ajustes del Sistema",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text
                    )
                    Text(
                        "Personalización de tema, tamaño de texto y envío de correos Google",
                        fontSize = 13.sp,
                        color = Palette.Muted
                    )
                }
            }
        }

        Row(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Columna Izquierda: Tema y Tipografía
            Column(
                Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. Selector de Tema Día / Noche
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Palette.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Filled.Palette, contentDescription = null, tint = Palette.Gold)
                            Text("Tema de la Aplicación", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                        }
                        Text(
                            "Alterna entre el tema claro marfil Falconi y el modo noche de lujo para menor fatiga visual.",
                            fontSize = 12.5.sp,
                            color = Palette.Muted
                        )

                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Opción Día
                            Surface(
                                onClick = { onToggleTheme(false) },
                                modifier = Modifier
                                    .weight(1f)
                                    .border(
                                        2.dp,
                                        if (!state.isDarkMode) Palette.Gold else Palette.Border,
                                        RoundedCornerShape(12.dp)
                                    ),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFF5F2EB)
                            ) {
                                Row(
                                    Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(Icons.Filled.LightMode, contentDescription = null, tint = Color(0xFFB45309))
                                    Column {
                                        Text("Tema Día", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                                        Text("Marfil Claro", fontSize = 11.5.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }

                            // Opción Noche
                            Surface(
                                onClick = { onToggleTheme(true) },
                                modifier = Modifier
                                    .weight(1f)
                                    .border(
                                        2.dp,
                                        if (state.isDarkMode) Palette.Gold else Palette.Border,
                                        RoundedCornerShape(12.dp)
                                    ),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF181B20)
                            ) {
                                Row(
                                    Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(Icons.Filled.DarkMode, contentDescription = null, tint = Color(0xFFD4AF37))
                                    Column {
                                        Text("Tema Noche", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF8FAFC))
                                        Text("Charcoal Oscuro", fontSize = 11.5.sp, color = Color(0xFF94A3B8))
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Selector de Tamaño de Fuentes
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Palette.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Filled.FormatSize, contentDescription = null, tint = Palette.Gold)
                            Text("Tamaño de Fuentes", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                        }
                        Text(
                            "Ajusta el tamaño global del texto en tarjetas, comprobantes y menús.",
                            fontSize = 12.5.sp,
                            color = Palette.Muted
                        )

                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            val options = listOf(
                                Triple(0.88f, "Pequeño", "Compacto"),
                                Triple(1.0f, "Normal", "Estándar"),
                                Triple(1.15f, "Grande", "Accesibilidad")
                            )

                            options.forEach { (scale, title, subtitle) ->
                                val selected = kotlin.math.abs(state.fontScale - scale) < 0.05f
                                Surface(
                                    onClick = { onSetFontScale(scale) },
                                    modifier = Modifier
                                        .weight(1f)
                                        .border(
                                            2.dp,
                                            if (selected) Palette.Gold else Palette.Border,
                                            RoundedCornerShape(12.dp)
                                        ),
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (selected) Palette.SurfaceHigh else Palette.Surface
                                ) {
                                    Column(
                                        Modifier.padding(12.dp),
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(2.dp)
                                    ) {
                                        Text(title, fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = if (selected) Palette.Gold else Palette.Text)
                                        Text(subtitle, fontSize = 11.sp, color = Palette.Muted)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Columna Derecha: Sistema de Correos Google / Gmail
            Column(
                Modifier.weight(1.2f),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Palette.Surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.Mail, contentDescription = null, tint = Palette.Gold)
                                Text("Comprobantes por Correo (Gmail)", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            }

                            val isConfigured = state.emailStatus?.configured == true
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = if (isConfigured) Color(0xFFE6F4EA) else Color(0xFFFEF7E0)
                            ) {
                                Text(
                                    if (isConfigured) "Activo (${state.emailStatus?.user})" else "Clave Pendiente",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isConfigured) Color(0xFF137333) else Color(0xFFB06000),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        // Enlace oficial de Google App Passwords
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Palette.SurfaceHigh,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Gold.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Filled.VpnKey, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(18.dp))
                                    Text("Link para crear la Contraseña de Aplicación de Google:", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                                }
                                Text(
                                    "https://myaccount.google.com/apppasswords",
                                    fontSize = 12.sp,
                                    color = Palette.Gold,
                                    fontWeight = FontWeight.SemiBold
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = {
                                            clipboard.setText(AnnotatedString("https://myaccount.google.com/apppasswords"))
                                            copiedUrl = true
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Surface),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Filled.ContentCopy, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text(if (copiedUrl) "¡Copiado!" else "Copiar Link", fontSize = 11.5.sp, color = Palette.Text)
                                    }

                                    Button(
                                        onClick = {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://myaccount.google.com/apppasswords"))
                                            context.startActivity(intent)
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Icon(Icons.Filled.OpenInBrowser, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Abrir en Navegador", fontSize = 11.5.sp, color = Color.White)
                                    }
                                }
                            }
                        }

                        // Pasos explicativos
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("¿Cómo generar la clave de Google (App Password)?", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            Text("1. Activa la 'Verificación en dos pasos' en tu cuenta de Google.", fontSize = 12.sp, color = Palette.Muted)
                            Text("2. Ingresa al link de arriba: https://myaccount.google.com/apppasswords", fontSize = 12.sp, color = Palette.Muted)
                            Text("3. En 'Nombre de la aplicación' escribe: Falconi POS", fontSize = 12.sp, color = Palette.Muted)
                            Text("4. Haz clic en 'Crear' y Google te dará una contraseña de 16 letras.", fontSize = 12.sp, color = Palette.Muted)
                            Text("5. Esa clave se coloca en las variables de entorno del servidor (GMAIL_APP_PASSWORD).", fontSize = 12.sp, color = Palette.Muted)
                        }

                        HorizontalDivider(color = Palette.Border)

                        // Probar envío de correo
                        Text("Probar Envío de Comprobante", fontSize = 13.5.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedTextField(
                                value = testEmailInput,
                                onValueChange = { testEmailInput = it },
                                placeholder = { Text("Escribe tu correo para la prueba...") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )

                            Button(
                                onClick = {
                                    val email = testEmailInput.trim()
                                    if (email.isNotBlank() && email.contains("@")) {
                                        testResultMsg = "Enviando correo de prueba..."
                                        onTestEmail(email) { ok, msg ->
                                            testResultMsg = if (ok) "✅ ¡Correo enviado exitosamente a $email!" else "❌ Error: $msg"
                                        }
                                    } else {
                                        testResultMsg = "Ingresa un correo electrónico válido"
                                    }
                                },
                                enabled = !state.testingEmail,
                                colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                if (state.testingEmail) {
                                    CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                    Spacer(Modifier.width(6.dp))
                                }
                                Text("Enviar Prueba")
                            }
                        }

                        testResultMsg?.let {
                            Text(it, fontSize = 12.sp, color = if (it.startsWith("✅")) Palette.Ok else Palette.Danger)
                        }
                    }
                }
            }
        }
    }
}
