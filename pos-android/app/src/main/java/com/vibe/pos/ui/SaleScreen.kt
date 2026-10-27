package com.vibe.pos.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vibe.pos.UiState
import com.vibe.pos.data.CartLine
import com.vibe.pos.data.PaymentInput
import com.vibe.pos.data.PosClient
import com.vibe.pos.data.PosLocation
import com.vibe.pos.data.Product
import com.vibe.pos.data.money

@Composable
fun SaleScreen(
    state: UiState,
    onQuery: (String) -> Unit,
    onSetLocation: (PosLocation) -> Unit,
    onAdd: (Product) -> Unit,
    onDec: (Product) -> Unit,
    onRemove: (Product) -> Unit,
    onClear: () -> Unit,
    onBarcode: (String) -> Boolean,
    onCheckout: (Double, PaymentInput, String?) -> Unit,
    onDismissSale: () -> Unit,
    onLock: () -> Unit,
    onLogout: () -> Unit,
    onMessageShown: () -> Unit,
    onSelectClient: (PosClient?) -> Unit,
    onSaveClient: (PosClient, (PosClient) -> Unit) -> Unit,
    onLoadClients: (String) -> Unit,
    onSetNote: (String) -> Unit,
    onHoldSale: () -> Unit,
    onToggleTheme: (Boolean) -> Unit = {},
    onSetFontScale: (Float) -> Unit = {},
    onLoadSales: () -> Unit = {},
    onLoadReports: () -> Unit = {},
    onLoadEmailStatus: () -> Unit = {},
    onResendReceiptEmail: (saleId: String, email: String, onDone: (Boolean, String) -> Unit) -> Unit = { _, _, _ -> },
    onTestEmail: (email: String, onDone: (Boolean, String) -> Unit) -> Unit = { _, _ -> },
    onLoadReceipts: () -> Unit = {},
    onScanReceipt: (receiptId: String, barcode: String, productId: String?) -> Unit = { _, _, _ -> },
    onClearReceiptFeedback: () -> Unit = {},
    onCloseReceipt: (receiptId: String, reason: String) -> Unit = { _, _ -> },
) {
    var showScanner by remember { mutableStateOf(false) }
    var showPhotoRecognition by remember { mutableStateOf(false) }
    var showCheckout by remember { mutableStateOf(false) }
    var confirmClear by remember { mutableStateOf(false) }
    var showClientDialog by remember { mutableStateOf(false) }
    var showNoteDialog by remember { mutableStateOf(false) }

    var selectedNav by remember { mutableStateOf("inicio") }
    var selectedBrandFilter by remember { mutableStateOf("Todos") }
    var scannedProduct by remember { mutableStateOf<Product?>(null) }
    val session = state.session ?: return

    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current

    LaunchedEffect(state.lastSale) { if (state.lastSale != null) showCheckout = false }

    Box(
        Modifier
            .fillMaxSize()
            .background(Palette.Bg)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
            ) {
                focusManager.clearFocus()
                keyboardController?.hide()
            }
    ) {
        Row(Modifier.fillMaxSize()) {
            // 1. BARRA LATERAL OSCURA ELEGANTE (SIN MONTARSE)
            SidebarPane(
                selectedNav = selectedNav,
                onSelectNav = { nav ->
                    if (nav == "productos") {
                        onSetLocation(PosLocation.LOCAL)
                        selectedNav = "productos"
                    } else if (nav == "bodegas") {
                        if (state.selectedLocation == PosLocation.LOCAL) {
                            onSetLocation(PosLocation.BODEGA_EC)
                        }
                        selectedNav = "bodegas"
                    } else {
                        selectedNav = nav
                    }
                },
            )

            // 2. CONTENIDO PRINCIPAL DEPENDIENDO DE LA PESTAÑA SELECCIONADA
            when (selectedNav) {
                "ventas" -> {
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        SalesHistoryView(
                            state = state,
                            onRefresh = onLoadSales,
                            onResendEmail = onResendReceiptEmail,
                            onBackToPos = { selectedNav = "inicio" }
                        )
                    }
                }
                "reportes" -> {
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        ReportsView(
                            state = state,
                            onRefresh = onLoadReports,
                            onBackToPos = { selectedNav = "inicio" }
                        )
                    }
                }
                "clientes" -> {
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        ClientsDirectoryView(
                            state = state,
                            onLoadClients = onLoadClients,
                            onSaveClient = onSaveClient,
                            onSelectClientForSale = { client ->
                                onSelectClient(client)
                                selectedNav = "inicio"
                            },
                            onBackToPos = { selectedNav = "inicio" }
                        )
                    }
                }
                "ingreso" -> {
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        ReceiptsView(
                            state = state,
                            onRefresh = onLoadReceipts,
                            onScan = onScanReceipt,
                            onClearFeedback = onClearReceiptFeedback,
                            onClose = onCloseReceipt,
                            onBackToPos = { selectedNav = "inicio" }
                        )
                    }
                }
                "ajustes" -> {
                    Box(Modifier.weight(1f).fillMaxHeight()) {
                        SettingsView(
                            state = state,
                            onToggleTheme = onToggleTheme,
                            onSetFontScale = onSetFontScale,
                            onLoadEmailStatus = onLoadEmailStatus,
                            onTestEmail = onTestEmail,
                            onBackToPos = { selectedNav = "inicio" }
                        )
                    }
                }
                "productos" -> {
                    // PESTAÑA PRODUCTOS: Muestra SOLO los perfumes de Tienda Local
                    Column(
                        Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TopSearchBar(
                            state = state,
                            onQuery = onQuery,
                            onScan = { showScanner = true },
                            onPhotoScan = { showPhotoRecognition = true },
                            onLock = onLock,
                            onLogout = onLogout,
                        )

                        WarehouseTabsRow(
                            state = state,
                            locations = listOf(PosLocation.LOCAL),
                            titleBadge = "📍 Stock Tienda Local",
                            onSetLocation = onSetLocation,
                        )

                        BrandChipsRow(
                            selectedBrand = selectedBrandFilter,
                            onSelectBrand = { brand ->
                                selectedBrandFilter = brand
                                if (brand == "Todos") {
                                    onQuery("")
                                } else {
                                    onQuery(brand)
                                }
                            }
                        )

                        Row(
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CatalogPane(
                                state = state,
                                onAdd = onAdd,
                                onOpenBodegas = {
                                    onSetLocation(PosLocation.BODEGA_EC)
                                    selectedNav = "bodegas"
                                },
                                modifier = Modifier.weight(1f)
                            )
                            TicketPane(
                                state = state,
                                onAdd = onAdd,
                                onDec = onDec,
                                onRemove = onRemove,
                                onClear = { confirmClear = true },
                                onPay = { showCheckout = true },
                                onOpenClient = {
                                    onLoadClients("")
                                    showClientDialog = true
                                },
                                onOpenNote = { showNoteDialog = true },
                                onHoldSale = onHoldSale,
                                onRemoveClient = { onSelectClient(null) },
                                modifier = Modifier.width(360.dp)
                            )
                        }
                    }
                }
                "bodegas" -> {
                    // PESTAÑA BODEGAS: Muestra Bodega EC y Bodega USA
                    Column(
                        Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TopSearchBar(
                            state = state,
                            onQuery = onQuery,
                            onScan = { showScanner = true },
                            onPhotoScan = { showPhotoRecognition = true },
                            onLock = onLock,
                            onLogout = onLogout,
                        )

                        WarehouseTabsRow(
                            state = state,
                            locations = listOf(PosLocation.BODEGA_EC, PosLocation.BODEGA_USA),
                            onSetLocation = onSetLocation,
                        )

                        BrandChipsRow(
                            selectedBrand = selectedBrandFilter,
                            onSelectBrand = { brand ->
                                selectedBrandFilter = brand
                                if (brand == "Todos") {
                                    onQuery("")
                                } else {
                                    onQuery(brand)
                                }
                            }
                        )

                        Row(
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CatalogPane(
                                state = state,
                                onAdd = onAdd,
                                modifier = Modifier.weight(1f)
                            )
                            TicketPane(
                                state = state,
                                onAdd = onAdd,
                                onDec = onDec,
                                onRemove = onRemove,
                                onClear = { confirmClear = true },
                                onPay = { showCheckout = true },
                                onOpenClient = {
                                    onLoadClients("")
                                    showClientDialog = true
                                },
                                onOpenNote = { showNoteDialog = true },
                                onHoldSale = onHoldSale,
                                onRemoveClient = { onSelectClient(null) },
                                modifier = Modifier.width(360.dp)
                            )
                        }
                    }
                }
                else -> {
                    // PESTAÑA INICIO: Pantalla limpia con logo de Falconi o producto escaneado / buscado EN GRANDE
                    Column(
                        Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TopSearchBar(
                            state = state,
                            onQuery = { q ->
                                onQuery(q)
                                if (q.isBlank()) scannedProduct = null
                            },
                            onScan = { showScanner = true },
                            onPhotoScan = { showPhotoRecognition = true },
                            onLock = onLock,
                            onLogout = onLogout,
                        )

                        Row(
                            Modifier
                                .weight(1f)
                                .fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            HomeSpotlightPane(
                                state = state,
                                scannedProduct = scannedProduct,
                                onAdd = onAdd,
                                onAddWithQty = { p, qty -> repeat(qty) { onAdd(p) } },
                                onClearSpotlight = {
                                    scannedProduct = null
                                    onQuery("")
                                },
                                onOpenProductsCatalog = {
                                    onSetLocation(PosLocation.LOCAL)
                                    selectedNav = "productos"
                                },
                                onOpenBodegas = { loc ->
                                    onSetLocation(loc)
                                    selectedNav = "bodegas"
                                },
                                onScanCamera = { showScanner = true },
                                onScanPhoto = { showPhotoRecognition = true },
                                modifier = Modifier.weight(1f)
                            )
                            TicketPane(
                                state = state,
                                onAdd = onAdd,
                                onDec = onDec,
                                onRemove = onRemove,
                                onClear = { confirmClear = true },
                                onPay = { showCheckout = true },
                                onOpenClient = {
                                    onLoadClients("")
                                    showClientDialog = true
                                },
                                onOpenNote = { showNoteDialog = true },
                                onHoldSale = onHoldSale,
                                onRemoveClient = { onSelectClient(null) },
                                modifier = Modifier.width(360.dp)
                            )
                        }
                    }
                }
            }
        }

        // Aviso flotante
        state.message?.let { msg ->
            LaunchedEffect(msg) { kotlinx.coroutines.delay(2400); onMessageShown() }
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp),
                shape = RoundedCornerShape(12.dp),
                color = Palette.Text,
                shadowElevation = 8.dp,
            ) {
                Text(
                    msg, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                )
            }
        }
    }

    if (showScanner) {
        ScannerDialog(
            lastMessage = state.message,
            onCode = { code ->
                val clean = code.trim()
                val p = state.products.firstOrNull { it.barcode == clean || it.sku.equals(clean, ignoreCase = true) }
                if (p != null) scannedProduct = p
                onBarcode(code)
            },
            onClose = { showScanner = false }
        )
    }
    if (showPhotoRecognition) {
        PhotoRecognitionDialog(
            products = state.products,
            onSelect = { prod ->
                scannedProduct = prod
                onAdd(prod)
            },
            onClose = { showPhotoRecognition = false },
        )
    }
    if (showCheckout && state.cart.isNotEmpty()) {
        CheckoutDialog(state, session.maxDiscountPct, onCheckout) { showCheckout = false }
    }
    state.lastSale?.let { SaleDoneDialog(it, onDismissSale) }
    if (confirmClear) {
        AlertDialog(
            onDismissRequest = { confirmClear = false },
            title = { Text("¿Vaciar el ticket?") },
            confirmButton = { TextButton(onClick = { onClear(); confirmClear = false }) { Text("Vaciar", color = Palette.Danger) } },
            dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("Cancelar") } },
        )
    }

    // DIÁLOGO DE CLIENTE (Búsqueda y Creación directa en Firestore)
    if (showClientDialog) {
        ClientManagementDialog(
            state = state,
            onClose = { showClientDialog = false },
            onSelect = { client ->
                onSelectClient(client)
                showClientDialog = false
            },
            onSaveNew = { newClient ->
                onSaveClient(newClient) { saved ->
                    showClientDialog = false
                }
            },
            onSearch = onLoadClients,
        )
    }

    // DIÁLOGO DE NOTA DEL PEDIDO
    if (showNoteDialog) {
        NoteInputDialog(
            currentNote = state.saleNote,
            onClose = { showNoteDialog = false },
            onSave = { note ->
                onSetNote(note)
                showNoteDialog = false
            }
        )
    }
}

/**
 * 1. Barra lateral vertical oscura con iconos y espaciado proporcional (nunca se montan)
 */
@Composable
private fun SidebarPane(
    selectedNav: String,
    onSelectNav: (String) -> Unit,
) {
    Surface(
        modifier = Modifier
            .width(74.dp)
            .fillMaxHeight(),
        color = Palette.SidebarBg,
        shadowElevation = 4.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(vertical = 10.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            // Icono Menú Hamburguesa
            IconButton(onClick = {}, modifier = Modifier.size(36.dp)) {
                Icon(
                    Icons.Filled.Menu,
                    contentDescription = "Menú",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(Modifier.height(2.dp))

            // Items de Navegación con tamaño compacto de 44dp
            val items = listOf(
                Triple("inicio", "Inicio", Icons.Filled.Home),
                Triple("productos", "Productos", Icons.Filled.Inventory2),
                Triple("bodegas", "Bodegas", Icons.Filled.Storefront),
                Triple("ingreso", "Ingreso", Icons.Filled.LocalShipping),
                Triple("ventas", "Ventas", Icons.Filled.ShoppingCart),
                Triple("reportes", "Reportes", Icons.AutoMirrored.Filled.Assignment),
                Triple("clientes", "Clientes", Icons.Filled.People),
                Triple("ajustes", "Ajustes", Icons.Filled.Settings),
            )

            items.forEach { (id, label, icon) ->
                val isSelected = selectedNav == id
                val activeBrush = Brush.verticalGradient(
                    listOf(Color(0xFFC5A059), Color(0xFF8C6D2D))
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .then(
                            if (isSelected) Modifier.background(activeBrush)
                            else Modifier
                        )
                        .clickable { onSelectNav(id) },
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            icon,
                            contentDescription = label,
                            tint = if (isSelected) Color.White else Palette.SidebarIcon,
                            modifier = Modifier.size(17.dp)
                        )
                        Spacer(Modifier.height(1.dp))
                        Text(
                            label,
                            fontSize = 7.5.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) Color.White else Palette.SidebarIcon,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                            softWrap = false
                        )
                    }
                }
            }
        }
    }
}

/**
 * 2. Barra Superior: Buscador corregido (sin corte de letras), Por foto, Escanear y Perfil
 */
@Composable
private fun TopSearchBar(
    state: UiState,
    onQuery: (String) -> Unit,
    onScan: () -> Unit,
    onPhotoScan: () -> Unit,
    onLock: () -> Unit,
    onLogout: () -> Unit,
) {
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var showUserMenu by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // Buscador blanco flotante con altura suficiente y texto centrado (sin corte)
        Surface(
            modifier = Modifier
                .weight(1f)
                .height(48.dp),
            shape = RoundedCornerShape(14.dp),
            color = Palette.Surface,
            shadowElevation = 1.dp,
            border = BorderStroke(1.dp, Palette.Border),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = "Buscar",
                    tint = Palette.Muted,
                    modifier = Modifier.size(20.dp)
                )

                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                    if (state.query.isEmpty()) {
                        Text(
                            "Buscar por perfume, marca o código...",
                            fontSize = 13.sp,
                            color = Palette.Muted,
                            maxLines = 1,
                        )
                    }
                    BasicTextField(
                        value = state.query,
                        onValueChange = onQuery,
                        singleLine = true,
                        textStyle = TextStyle(
                            fontSize = 13.sp,
                            color = Palette.Text,
                            fontWeight = FontWeight.Medium
                        ),
                        cursorBrush = SolidColor(Palette.Gold),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = {
                            focusManager.clearFocus()
                            keyboardController?.hide()
                        }),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                if (state.query.isNotEmpty()) {
                    IconButton(
                        onClick = { onQuery(""); focusManager.clearFocus(); keyboardController?.hide() },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Filled.Close, "Limpiar", tint = Palette.Muted, modifier = Modifier.size(16.dp))
                    }
                }

                Icon(
                    Icons.Filled.ViewWeek,
                    contentDescription = "Código",
                    tint = Palette.Muted,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // Botón [📷 Por foto]
        Surface(
            modifier = Modifier
                .height(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .clickable { onPhotoScan() },
            shape = RoundedCornerShape(12.dp),
            color = Palette.Surface,
            shadowElevation = 1.dp,
            border = BorderStroke(1.dp, Palette.Border),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = Palette.Text, modifier = Modifier.size(18.dp))
                Text("Por foto", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
            }
        }

        // Botón Dorado [𝄃𝄃𝄃 Escanear]
        Box(
            modifier = Modifier
                .height(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(Palette.GoldLight, Palette.GoldDark)
                    )
                )
                .clickable { onScan() }
                .padding(horizontal = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(Icons.Filled.QrCodeScanner, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Text("Escanear", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }

        // Widget de Usuario con Dropdown
        Box {
            Surface(
                modifier = Modifier
                    .height(48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { showUserMenu = true },
                shape = RoundedCornerShape(12.dp),
                color = Palette.Surface,
                shadowElevation = 1.dp,
                border = BorderStroke(1.dp, Palette.Border),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Palette.Text),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Filled.Person, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                    Column {
                        Text(
                            state.session?.staff?.name.orEmpty().ifEmpty { "Vendedor" },
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Palette.Text
                        )
                        Text(
                            state.session?.location.orEmpty().ifEmpty { "Bodega Principal" },
                            fontSize = 9.5.sp,
                            color = Palette.Muted
                        )
                    }
                    Icon(Icons.Filled.KeyboardArrowDown, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(18.dp))
                }
            }

            DropdownMenu(
                expanded = showUserMenu,
                onDismissRequest = { showUserMenu = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Bloquear terminal") },
                    onClick = { showUserMenu = false; onLock() },
                    leadingIcon = { Icon(Icons.Filled.Lock, contentDescription = null) }
                )
                DropdownMenuItem(
                    text = { Text("Cerrar sesión", color = Palette.Danger) },
                    onClick = { showUserMenu = false; onLogout() },
                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = Palette.Danger) }
                )
            }
        }
    }
}

/**
 * 3. Fila de Pestañas de Bodega (Local, Bodega EC, Bodega USA), Filtros y Selectores de Vista
 */
@Composable
private fun WarehouseTabsRow(
    state: UiState,
    locations: List<PosLocation> = listOf(PosLocation.BODEGA_EC, PosLocation.BODEGA_USA),
    titleBadge: String? = null,
    onSetLocation: (PosLocation) -> Unit,
) {
    var isGridView by remember { mutableStateOf(true) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Pestañas o Indicador de Almacén
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (titleBadge != null) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Palette.Surface,
                    border = BorderStroke(1.dp, Palette.Border)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            titleBadge,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Palette.Gold
                        )
                        val countInStock = state.products.count { it.stockLocal > 0 }
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (countInStock > 0) Color(0xFF1B5E20) else Palette.SurfaceHigh,
                            border = BorderStroke(1.dp, if (countInStock > 0) Color(0xFF2E7D32) else Palette.Border)
                        ) {
                            Text(
                                "$countInStock perfumes",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (countInStock > 0) Color(0xFF81C784) else Palette.Muted,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            } else {
                locations.forEach { loc ->
                    val selected = state.selectedLocation == loc
                    val countInStock = state.products.count { it.stockFor(loc) > 0 }

                    val tabBrush = if (selected) {
                        Brush.horizontalGradient(listOf(Color(0xFF8C6D2B), Color(0xFFB48E3D)))
                    } else null

                    Surface(
                        modifier = Modifier
                            .height(38.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onSetLocation(loc) },
                        shape = RoundedCornerShape(10.dp),
                        color = if (selected) Color.Transparent else Palette.Surface,
                        shadowElevation = if (selected) 2.dp else 1.dp,
                        border = if (selected) null else BorderStroke(1.dp, Palette.Border),
                    ) {
                        Box(
                            modifier = Modifier
                                .then(if (tabBrush != null) Modifier.background(tabBrush) else Modifier)
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    loc.label,
                                    fontSize = 12.5.sp,
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold,
                                    color = if (selected) Color.White else Palette.Text
                                )
                                Text(
                                    "$countInStock",
                                    fontSize = 11.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selected) Color.White.copy(alpha = 0.9f) else Palette.Muted
                                )
                            }
                        }
                    }
                }
            }
        }

        // Conmutador de Vista (Cuadrícula / Lista) + Botón Filtros
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { isGridView = true },
                shape = RoundedCornerShape(8.dp),
                color = if (isGridView) Color(0xFFEAD8AF) else Palette.Surface,
                border = BorderStroke(1.dp, Palette.Border),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Filled.GridView,
                        contentDescription = "Cuadrícula",
                        tint = if (isGridView) Color(0xFF8C6D2D) else Palette.Muted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            Surface(
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { isGridView = false },
                shape = RoundedCornerShape(8.dp),
                color = if (!isGridView) Color(0xFFEAD8AF) else Palette.Surface,
                border = BorderStroke(1.dp, Palette.Border),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.AutoMirrored.Filled.FormatListBulleted,
                        contentDescription = "Lista",
                        tint = if (!isGridView) Color(0xFF8C6D2D) else Palette.Muted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }

            // Botón [ ⛛ Filtros ]
            Surface(
                modifier = Modifier
                    .height(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { },
                shape = RoundedCornerShape(10.dp),
                color = Palette.Surface,
                border = BorderStroke(1.dp, Palette.Border),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Filled.FilterAlt, contentDescription = null, tint = Palette.Text, modifier = Modifier.size(16.dp))
                    Text("Filtros", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
                }
            }
        }
    }
}

/**
 * 4. Barra de Chips de Marcas (Todos, Árabes, Lattafa, Hawas, etc.)
 */
@Composable
private fun BrandChipsRow(
    selectedBrand: String,
    onSelectBrand: (String) -> Unit
) {
    val brands = listOf(
        "Todos", "Árabes", "Lattafa", "Hawas", "Club de Nuit", "Maison Alhambra", "Afnan", "Rasasi", "Armaf"
    )

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        brands.forEach { brand ->
            val isSelected = selectedBrand == brand
            Surface(
                modifier = Modifier
                    .height(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .clickable { onSelectBrand(brand) },
                shape = RoundedCornerShape(8.dp),
                color = if (isSelected) Color(0xFF261D13) else Palette.Surface,
                border = BorderStroke(1.dp, if (isSelected) Color(0xFF261D13) else Palette.Border),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (brand == "Todos") {
                        Icon(
                            Icons.Filled.GridView,
                            contentDescription = null,
                            tint = if (isSelected) Color.White else Palette.Muted,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    Text(
                        brand,
                        fontSize = 11.5.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) Color.White else Palette.Text
                    )
                }
            }
        }

        // Flecha de scroll
        Surface(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(8.dp)),
            shape = RoundedCornerShape(8.dp),
            color = Palette.Surface,
            border = BorderStroke(1.dp, Palette.Border),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = Palette.Muted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

/**
 * 5. Catálogo de Perfumes: Grilla de 5 columnas con MEDIDA IDÉNTICA UNIFORME
 */
@Composable
private fun CatalogPane(
    state: UiState,
    onAdd: (Product) -> Unit,
    onOpenBodegas: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Box(modifier.fillMaxSize()) {
        val list = state.filtered
        when {
            !state.catalogLoaded -> CircularProgressIndicator(Modifier.align(Alignment.Center), color = Palette.Gold)
            list.isEmpty() -> {
                Surface(
                    modifier = Modifier.fillMaxWidth().padding(top = 40.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = Palette.Surface,
                    border = BorderStroke(1.dp, Palette.Border),
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Icon(
                            if (state.selectedLocation == PosLocation.LOCAL) Icons.Filled.Storefront else Icons.Filled.Inventory2,
                            null,
                            tint = Palette.Gold,
                            modifier = Modifier.size(44.dp)
                        )
                        Text(
                            if (state.selectedLocation == PosLocation.LOCAL) "Sin perfumes en stock en Tienda Local"
                            else "Sin perfumes en ${state.selectedLocation.label}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = Palette.Text
                        )
                        Text(
                            if (state.selectedLocation == PosLocation.LOCAL)
                                "Las existencias físicas disponibles se encuentran en Bodega EC y Bodega USA."
                            else
                                "No se encontraron perfumes disponibles en este almacén.",
                            color = Palette.Muted,
                            fontSize = 12.5.sp,
                            textAlign = TextAlign.Center
                        )
                        if (state.selectedLocation == PosLocation.LOCAL && onOpenBodegas != null) {
                            Spacer(Modifier.height(6.dp))
                            Button(
                                onClick = onOpenBodegas,
                                colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Filled.Storefront, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Ver Bodegas (EC / USA)", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(5),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 12.dp),
            ) {
                items(list, key = { it.id }) { p ->
                    ProductCard(p, state.selectedLocation) { onAdd(p) }
                }
            }
        }
    }
}

/**
 * Tarjeta de Perfume con MEDIDA FIJA EXACTA (210dp) y letras más refinadas
 */
@Composable
private fun ProductCard(p: Product, location: PosLocation, onClick: () -> Unit) {
    val stock = p.stockFor(location)
    val out = stock <= 0
    val isLow = stock == 1
    var isFavorite by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = Palette.Surface,
        shadowElevation = 1.dp,
        border = BorderStroke(1.dp, Palette.Border),
        modifier = Modifier
            .fillMaxWidth()
            .height(210.dp) // <--- MEDIDA EXACTA UNIFORME PARA TODAS LAS CARTILLAS
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Insignia de Disponibilidad (Top-Left) y Corazón de Favorito (Top-Right)
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val badgeBg = if (out) Palette.StockLowBg else if (isLow) Palette.StockLowBg else Palette.StockOkBg
                val badgeText = if (out) Palette.StockLowText else if (isLow) Palette.StockLowText else Palette.StockOkText
                val label = if (out) "0 disp." else "$stock disp."

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(badgeBg)
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        label,
                        color = badgeText,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }

                IconButton(
                    onClick = { isFavorite = !isFavorite },
                    modifier = Modifier.size(22.dp)
                ) {
                    Icon(
                        if (isFavorite) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = "Favorito",
                        tint = if (isFavorite) Palette.Danger else Palette.Muted,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }

            // Foto del Perfume centrada (altura fija)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(86.dp),
                contentAlignment = Alignment.Center
            ) {
                if (p.imageUrl != null) {
                    AsyncImage(
                        p.imageUrl,
                        p.name,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(
                        Icons.Filled.LocalMall,
                        contentDescription = null,
                        tint = Palette.Muted,
                        modifier = Modifier.size(32.dp)
                    )
                }
            }

            // Marca en mayúsculas (letra más pequeña, altura fija)
            val brandDisplay = if (p.brand.isNotBlank()) p.brand else "LATTAFA"
            Text(
                brandDisplay.uppercase(),
                color = Color(0xFF78716C),
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )

            // Nombre del Perfume (2 líneas con letra más pequeña, altura fija 28dp)
            Text(
                p.name,
                fontSize = 10.5.sp,
                maxLines = 2,
                minLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontWeight = FontWeight.SemiBold,
                color = Palette.Text,
                lineHeight = 13.sp,
                modifier = Modifier.height(28.dp)
            )

            // Fila inferior: Precio + Bandera de Disponibilidad en otra bodega + Tres puntos
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    p.price.money(),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = Palette.Text
                )

                val otherBodegaHint = when (location) {
                    PosLocation.BODEGA_EC -> if (p.stockBodegaUsa > 0) "🇺🇸 USA: ${p.stockBodegaUsa}" else null
                    PosLocation.BODEGA_USA -> if (p.stockBodegaEc > 0) "🇪🇨 EC: ${p.stockBodegaEc}" else null
                    PosLocation.LOCAL -> if (p.stockBodegaEc > 0) "🇪🇨 EC: ${p.stockBodegaEc}" else if (p.stockBodegaUsa > 0) "🇺🇸 USA: ${p.stockBodegaUsa}" else null
                }

                if (otherBodegaHint != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFFF1F5F9))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            otherBodegaHint,
                            fontSize = 8.sp,
                            color = Palette.Muted,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }

                Icon(
                    Icons.Filled.MoreVert,
                    contentDescription = null,
                    tint = Palette.Muted,
                    modifier = Modifier.size(15.dp)
                )
            }
        }
    }
}

/**
 * 6. Ticket de Venta: con Cliente, Nota, Guardar en Espera y Cobrar
 */
@Composable
private fun TicketPane(
    state: UiState,
    onAdd: (Product) -> Unit,
    onDec: (Product) -> Unit,
    onRemove: (Product) -> Unit,
    onClear: () -> Unit,
    onPay: () -> Unit,
    onOpenClient: () -> Unit,
    onOpenNote: () -> Unit,
    onHoldSale: () -> Unit,
    onRemoveClient: () -> Unit,
    modifier: Modifier,
) {
    Surface(
        modifier = modifier.fillMaxHeight(),
        shape = RoundedCornerShape(18.dp),
        color = Palette.Surface,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, Palette.Border),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Encabezado: 🛒 Ticket de Venta      Vaciar 🗑
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Filled.ShoppingCart,
                        contentDescription = null,
                        tint = Palette.Text,
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        "Ticket de Venta",
                        fontSize = 16.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text
                    )
                }

                if (state.cart.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .clickable { onClear() }
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text("Vaciar", color = Palette.Danger, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        Icon(Icons.Filled.Delete, "Vaciar", tint = Palette.Danger, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Indicador de Cliente Seleccionado (si existe)
            state.selectedClient?.let { c ->
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Palette.SurfaceHigh,
                    border = BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Filled.Person, null, tint = Palette.Gold, modifier = Modifier.size(16.dp))
                            Text("${c.fullName} (${c.cedula.ifEmpty { "Sin CI" }})", fontSize = 11.5.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                        }
                        IconButton(onClick = onRemoveClient, modifier = Modifier.size(20.dp)) {
                            Icon(Icons.Filled.Close, "Quitar cliente", tint = Palette.Muted, modifier = Modifier.size(14.dp))
                        }
                    }
                }
            }

            // Indicador de Nota (si existe)
            if (state.saleNote.isNotBlank()) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFFFEF3C7),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(Icons.Filled.EditNote, null, tint = Color(0xFFB45309), modifier = Modifier.size(16.dp))
                        Text(state.saleNote, fontSize = 11.sp, color = Color(0xFF92400E), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }

            // Lista de productos o aviso de carrito vacío
            if (state.cart.isEmpty()) {
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.ShoppingBag, null, tint = Palette.Muted.copy(alpha = 0.5f), modifier = Modifier.size(46.dp))
                        Text("Toca un perfume para agregarlo al ticket", color = Palette.Muted, fontSize = 12.5.sp)
                    }
                }
            } else {
                LazyColumn(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(state.cart, key = { it.product.id }) { line ->
                        CartRow(line, onAdd, onDec, onRemove)
                    }
                }
            }

            // Pie de página del Ticket: 1 artículo       Subtotal: $35.00
            val totalItems = state.cart.sumOf { it.quantity }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    if (totalItems == 1) "1 artículo" else "$totalItems artículos",
                    color = Palette.Text,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "Subtotal:",
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Palette.Text
                    )
                    Text(
                        state.subtotal.money(),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Gold
                    )
                }
            }

            // Botón Dorado Grande [ 💳 COBRAR            $35.00 > ]
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .then(
                        if (state.cart.isNotEmpty()) {
                            Modifier
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(Color(0xFF8F6E2A), Color(0xFF5A4418))
                                    )
                                )
                                .clickable { onPay() }
                        } else {
                            Modifier.background(Palette.Border)
                        }
                    )
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.CreditCard,
                            contentDescription = null,
                            tint = if (state.cart.isNotEmpty()) Color.White else Palette.Muted,
                            modifier = Modifier.size(20.dp)
                        )
                        Text(
                            "COBRAR",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (state.cart.isNotEmpty()) Color.White else Palette.Muted,
                            letterSpacing = 1.sp
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            state.subtotal.money(),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (state.cart.isNotEmpty()) Color.White else Palette.Muted
                        )
                        Icon(
                            Icons.AutoMirrored.Filled.KeyboardArrowRight,
                            contentDescription = null,
                            tint = if (state.cart.isNotEmpty()) Color.White else Palette.Muted,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // Fila de 3 botones inferiores: [📄 Guardar] [👤 Cliente] [📝 Nota]
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Guardar
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onHoldSale() },
                    shape = RoundedCornerShape(8.dp),
                    color = Palette.Surface,
                    border = BorderStroke(1.dp, Palette.Border),
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Filled.Description, contentDescription = null, tint = Palette.Text, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Guardar", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = Palette.Text)
                    }
                }

                // Cliente
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onOpenClient() },
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.selectedClient != null) Color(0xFFE8F5E9) else Palette.Surface,
                    border = BorderStroke(1.dp, if (state.selectedClient != null) Palette.Ok else Palette.Border),
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Filled.Person, contentDescription = null, tint = if (state.selectedClient != null) Palette.Ok else Palette.Text, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (state.selectedClient != null) "Asignado" else "Cliente", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = if (state.selectedClient != null) Palette.Ok else Palette.Text)
                    }
                }

                // Nota
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onOpenNote() },
                    shape = RoundedCornerShape(8.dp),
                    color = if (state.saleNote.isNotBlank()) Color(0xFFFEF3C7) else Palette.Surface,
                    border = BorderStroke(1.dp, if (state.saleNote.isNotBlank()) Palette.Warn else Palette.Border),
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(Icons.Filled.EditNote, contentDescription = null, tint = if (state.saleNote.isNotBlank()) Palette.Warn else Palette.Text, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (state.saleNote.isNotBlank()) "Con Nota" else "Nota", fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, color = if (state.saleNote.isNotBlank()) Palette.Warn else Palette.Text)
                    }
                }
            }
        }
    }
}

/**
 * Fila individual del carrito con foto, stepper de cantidad y total
 */
@Composable
private fun CartRow(
    line: CartLine,
    onAdd: (Product) -> Unit,
    onDec: (Product) -> Unit,
    onRemove: (Product) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = Palette.SurfaceHigh,
        border = BorderStroke(1.dp, Palette.Border.copy(alpha = 0.6f)),
    ) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Miniatura del producto
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Palette.Surface),
                    contentAlignment = Alignment.Center
                ) {
                    if (line.product.imageUrl != null) {
                        AsyncImage(
                            line.product.imageUrl,
                            line.product.name,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize().padding(2.dp),
                        )
                    } else {
                        Icon(Icons.Filled.LocalMall, null, tint = Palette.Muted, modifier = Modifier.size(20.dp))
                    }
                }

                // Nombre y precio unitario
                Column(Modifier.weight(1f)) {
                    Text(
                        line.product.name,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.5.sp,
                        color = Palette.Text
                    )
                    Text(
                        line.product.price.money(),
                        color = Palette.Muted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Fila de Controles: Stepper [ − ] 1 [ + ]   Total $XX.00   🗑
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Botón menos
                    Surface(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(CircleShape)
                            .clickable { onDec(line.product) },
                        shape = CircleShape,
                        color = Palette.Surface,
                        border = BorderStroke(1.dp, Palette.Border),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Remove, "Menos", tint = Palette.Text, modifier = Modifier.size(13.dp))
                        }
                    }

                    Text(
                        "${line.quantity}",
                        fontSize = 12.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text,
                        modifier = Modifier.widthIn(min = 14.dp),
                        textAlign = TextAlign.Center
                    )

                    // Botón más
                    Surface(
                        modifier = Modifier
                            .size(26.dp)
                            .clip(CircleShape)
                            .clickable { onAdd(line.product) },
                        shape = CircleShape,
                        color = Palette.Surface,
                        border = BorderStroke(1.dp, Palette.Border),
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Add, "Más", tint = Palette.Text, modifier = Modifier.size(13.dp))
                        }
                    }

                    Text("c/u", fontSize = 10.5.sp, color = Palette.Muted)
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        line.total.money(),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp,
                        color = Palette.Text
                    )

                    IconButton(
                        onClick = { onRemove(line.product) },
                        modifier = Modifier.size(26.dp)
                    ) {
                        Icon(Icons.Filled.Delete, "Quitar", tint = Palette.Danger, modifier = Modifier.size(15.dp))
                    }
                }
            }
        }
    }
}

/**
 * MODAL DE CLIENTE: Búsqueda y creación con nombre, apellido, teléfono, email, cédula o RUC
 */
@Composable
private fun ClientManagementDialog(
    state: UiState,
    onClose: () -> Unit,
    onSelect: (PosClient) -> Unit,
    onSaveNew: (PosClient) -> Unit,
    onSearch: (String) -> Unit,
) {
    var isCreatingNew by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    // Campos de nuevo cliente
    var nombre by remember { mutableStateOf("") }
    var apellido by remember { mutableStateOf("") }
    var telefono by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var cedula by remember { mutableStateOf("") }
    var validationError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onClose,
        modifier = Modifier.widthIn(min = 520.dp, max = 600.dp),
        title = {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    if (isCreatingNew) "Nuevo Cliente (Guardar en Firestore)" else "Seleccionar Cliente",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = Palette.Text
                )
                IconButton(onClick = onClose) {
                    Icon(Icons.Filled.Close, "Cerrar", tint = Palette.Muted)
                }
            }
        },
        text = {
            if (isCreatingNew) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    validationError?.let {
                        Text(it, color = Palette.Danger, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = nombre,
                            onValueChange = { nombre = it; validationError = null },
                            label = { Text("Nombre *") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = apellido,
                            onValueChange = { apellido = it },
                            label = { Text("Apellido") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = cedula,
                        onValueChange = { cedula = it; validationError = null },
                        label = { Text("Cédula de Identidad o RUC *") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = telefono,
                            onValueChange = { telefono = it },
                            label = { Text("Teléfono / Celular") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            label = { Text("Email") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            } else {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(max = 380.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Barra de búsqueda de clientes
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = {
                            searchQuery = it
                            onSearch(it)
                        },
                        placeholder = { Text("Buscar por nombre, apellido, cédula o teléfono...") },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Palette.Muted) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Botón para crear cliente
                    Button(
                        onClick = { isCreatingNew = true },
                        modifier = Modifier.fillMaxWidth().height(42.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold)
                    ) {
                        Icon(Icons.Filled.PersonAdd, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("+ Crear Nuevo Cliente en Firestore", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }

                    // Lista de clientes
                    if (state.loadingClients) {
                        Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Palette.Gold)
                        }
                    } else if (state.clientsList.isEmpty()) {
                        Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                            Text("No se encontraron clientes registrados en Firestore", color = Palette.Muted, fontSize = 12.sp)
                        }
                    } else {
                        LazyColumn(
                            Modifier.fillMaxWidth().weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(state.clientsList, key = { it.id.ifEmpty { it.cedula } }) { client ->
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable { onSelect(client) },
                                    shape = RoundedCornerShape(8.dp),
                                    color = Palette.SurfaceHigh,
                                    border = BorderStroke(1.dp, Palette.Border)
                                ) {
                                    Row(
                                        Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Text(client.fullName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Palette.Text)
                                            Text("CI/RUC: ${client.cedula.ifEmpty { "N/A" }} · Tel: ${client.telefono.ifEmpty { "N/A" }}", fontSize = 11.sp, color = Palette.Muted)
                                        }
                                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Palette.Gold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (isCreatingNew) {
                Button(
                    onClick = {
                        if (nombre.isBlank()) {
                            validationError = "El nombre es obligatorio"
                            return@Button
                        }
                        if (cedula.isBlank()) {
                            validationError = "La cédula o RUC es obligatoria"
                            return@Button
                        }
                        onSaveNew(
                            PosClient(
                                nombre = nombre.trim(),
                                apellido = apellido.trim(),
                                telefono = telefono.trim(),
                                email = email.trim(),
                                cedula = cedula.trim(),
                            )
                        )
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold)
                ) {
                    Text("Guardar en Firestore", fontWeight = FontWeight.Bold)
                }
            }
        },
        dismissButton = {
            if (isCreatingNew) {
                TextButton(onClick = { isCreatingNew = false }) {
                    Text("Volver a Lista")
                }
            } else {
                TextButton(onClick = onClose) {
                    Text("Cancelar")
                }
            }
        }
    )
}

/**
 * MODAL DE NOTA: Guardar observaciones del pedido
 */
@Composable
private fun NoteInputDialog(
    currentNote: String,
    onClose: () -> Unit,
    onSave: (String) -> Unit,
) {
    var note by remember { mutableStateOf(currentNote) }

    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Nota del Pedido", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Escribe alguna indicación, empaque de regalo u observación para este ticket:", fontSize = 12.sp, color = Palette.Muted)
                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    placeholder = { Text("Ej: Para regalo con moño dorado, cliente retira tarde...") },
                    modifier = Modifier.fillMaxWidth().height(110.dp),
                    maxLines = 4,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(note.trim()) },
                colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold)
            ) {
                Text("Guardar Nota", fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onClose) {
                Text("Cancelar")
            }
        }
    )
}
