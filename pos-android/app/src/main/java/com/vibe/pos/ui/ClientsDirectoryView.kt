package com.vibe.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
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
import com.vibe.pos.data.PosClient

@Composable
fun ClientsDirectoryView(
    state: UiState,
    onLoadClients: (String) -> Unit,
    onSaveClient: (PosClient, (PosClient) -> Unit) -> Unit,
    onSelectClientForSale: (PosClient) -> Unit,
    onBackToPos: () -> Unit,
) {
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        onLoadClients("")
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
                        "Directorio de Clientes",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text
                    )
                    Text(
                        "${state.clientsList.size} clientes registrados en Firestore",
                        fontSize = 13.sp,
                        color = Palette.Muted
                    )
                }
            }

            Button(
                onClick = { showAddDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                shape = RoundedCornerShape(12.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Icon(Icons.Filled.PersonAdd, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("+ Agregar Cliente", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Buscador de Clientes
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = Palette.Surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Border)
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Filled.Search, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = {
                        searchQuery = it
                        onLoadClients(it)
                    },
                    placeholder = { Text("Buscar por nombre, apellido, cédula/RUC o teléfono...", fontSize = 13.sp, color = Palette.Muted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                    ),
                    modifier = Modifier.weight(1f)
                )
                if (searchQuery.isNotBlank()) {
                    IconButton(onClick = {
                        searchQuery = ""
                        onLoadClients("")
                    }) {
                        Icon(Icons.Filled.Close, contentDescription = "Limpiar", tint = Palette.Muted, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // Lista de Clientes en Cuadrícula de 2 o 3 columnas
        if (state.loadingClients) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Palette.Gold)
            }
        } else if (state.clientsList.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.PersonSearch, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(54.dp))
                    Text(
                        if (searchQuery.isBlank()) "No hay clientes registrados aún" else "No se encontraron clientes para '$searchQuery'",
                        color = Palette.Muted,
                        fontSize = 15.sp
                    )
                    Button(
                        onClick = { showAddDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Registrar Nuevo Cliente")
                    }
                }
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 340.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(state.clientsList, key = { it.id }) { client ->
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .border(1.dp, Palette.Border, RoundedCornerShape(14.dp)),
                        color = Palette.Surface,
                        shadowElevation = 1.dp
                    ) {
                        Column(
                            Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Palette.Gold.copy(alpha = 0.15f),
                                        modifier = Modifier.size(40.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(
                                                client.nombre.take(1).uppercase(),
                                                color = Palette.Gold,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 17.sp
                                            )
                                        }
                                    }
                                    Column {
                                        Text(client.fullName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                                        if (client.cedula.isNotBlank()) {
                                            Text("CI / RUC: ${client.cedula}", fontSize = 12.sp, color = Palette.Muted)
                                        }
                                    }
                                }

                                Button(
                                    onClick = {
                                        onSelectClientForSale(client)
                                        onBackToPos()
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Palette.SurfaceHigh),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Palette.Gold),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Text("Usar en Venta", fontSize = 11.5.sp, color = Palette.Gold, fontWeight = FontWeight.SemiBold)
                                }
                            }

                            HorizontalDivider(color = Palette.Border)

                            // Teléfono y Correo
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Filled.Phone, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(15.dp))
                                    Text(
                                        if (client.telefono.isNotBlank()) client.telefono else "Sin teléfono",
                                        fontSize = 12.5.sp,
                                        color = if (client.telefono.isNotBlank()) Palette.Text else Palette.Muted
                                    )
                                }
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Filled.Email, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(15.dp))
                                    Text(
                                        if (client.email.isNotBlank()) client.email else "Sin correo registrado",
                                        fontSize = 12.5.sp,
                                        color = if (client.email.isNotBlank()) Palette.Gold else Palette.Muted
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddClientDialog(
            onDismiss = { showAddDialog = false },
            onSave = { newClient ->
                onSaveClient(newClient) {
                    showAddDialog = false
                    onLoadClients(searchQuery)
                }
            }
        )
    }
}

@Composable
private fun AddClientDialog(
    onDismiss: () -> Unit,
    onSave: (PosClient) -> Unit,
) {
    var nombre by remember { mutableStateOf("") }
    var apellido by remember { mutableStateOf("") }
    var cedula by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Filled.PersonAdd, contentDescription = null, tint = Palette.Gold)
                Text("Registrar Nuevo Cliente")
            }
        },
        text = {
            Column(Modifier.width(420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Los datos se guardan directamente en Firestore para comprobantes e historial.", fontSize = 12.5.sp, color = Palette.Muted)

                OutlinedTextField(
                    value = nombre,
                    onValueChange = { nombre = it; errorMsg = null },
                    label = { Text("Nombre *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = apellido,
                    onValueChange = { apellido = it },
                    label = { Text("Apellido") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = cedula,
                    onValueChange = { cedula = it },
                    label = { Text("Cédula de Identidad o RUC") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = telefono,
                    onValueChange = { telefono = it },
                    label = { Text("Teléfono / WhatsApp") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Correo Electrónico (para comprobantes)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                errorMsg?.let {
                    Text(it, color = Palette.Danger, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (nombre.trim().isBlank()) {
                        errorMsg = "El nombre es obligatorio"
                    } else {
                        onSave(
                            PosClient(
                                nombre = nombre.trim(),
                                apellido = apellido.trim(),
                                cedula = cedula.trim(),
                                telefono = telefono.trim(),
                                email = email.trim(),
                            )
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold)
            ) {
                Text("Guardar Cliente")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
