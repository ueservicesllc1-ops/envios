package com.vibe.pos.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.vibe.pos.R
import com.vibe.pos.UiState
import com.vibe.pos.data.PosLocation
import com.vibe.pos.data.Product
import com.vibe.pos.data.money

@Composable
fun HomeSpotlightPane(
    state: UiState,
    scannedProduct: Product?,
    onAdd: (Product) -> Unit,
    onAddWithQty: (Product, Int) -> Unit,
    onClearSpotlight: () -> Unit,
    onOpenProductsCatalog: () -> Unit,
    onOpenBodegas: (PosLocation) -> Unit = {},
    onScanCamera: () -> Unit,
    onScanPhoto: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val query = state.query.trim()
    val filtered = state.filtered

    Box(modifier = modifier.fillMaxSize()) {
        when {
            // Caso 1: Hay un producto escaneado o el query coincide con exactamente 1 perfume
            scannedProduct != null -> {
                SingleProductSpotlight(
                    product = scannedProduct,
                    location = state.selectedLocation,
                    onAddWithQty = onAddWithQty,
                    onClose = onClearSpotlight,
                )
            }
            query.isNotEmpty() && filtered.size == 1 -> {
                SingleProductSpotlight(
                    product = filtered.first(),
                    location = state.selectedLocation,
                    onAddWithQty = onAddWithQty,
                    onClose = onClearSpotlight,
                )
            }
            // Caso 2: El usuario buscó un término y hay múltiples resultados -> Mostrar en GRANDE (2 por fila)
            query.isNotEmpty() && filtered.size > 1 -> {
                MultipleProductsSpotlight(
                    products = filtered,
                    location = state.selectedLocation,
                    onAdd = onAdd,
                    onClose = onClearSpotlight,
                )
            }
            // Caso 3: El usuario buscó y no hubo coincidencias
            query.isNotEmpty() && filtered.isEmpty() -> {
                EmptySearchSpotlight(
                    query = query,
                    onClear = onClearSpotlight,
                    onScanPhoto = onScanPhoto,
                )
            }
            // Caso 4: INICIO LIMPIO -> Logo oficial Falconi Perfumes, elegante y listo para escanear
            else -> {
                FalconiLogoStandbyScreen(
                    state = state,
                    onScanCamera = onScanCamera,
                    onScanPhoto = onScanPhoto,
                    onOpenProductsCatalog = onOpenProductsCatalog,
                    onOpenBodegas = onOpenBodegas,
                )
            }
        }
    }
}

/**
 * Pantalla de bienvenida limpia en Inicio con el logo de Falconi de lujo
 */
@Composable
private fun FalconiLogoStandbyScreen(
    state: UiState,
    onScanCamera: () -> Unit,
    onScanPhoto: () -> Unit,
    onOpenProductsCatalog: () -> Unit,
    onOpenBodegas: (PosLocation) -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(20.dp)),
        color = Palette.Surface,
        border = BorderStroke(1.dp, Palette.Border),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo Falconi grande y refinado
            Image(
                painter = painterResource(id = R.drawable.logo_falconi),
                contentDescription = "Falconi Perfumes",
                colorFilter = ColorFilter.tint(Palette.Gold),
                modifier = Modifier.size(190.dp)
            )

            Spacer(Modifier.height(10.dp))

            Text(
                "FALCONI PERFUMES",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 3.sp,
                color = Palette.Gold,
                textAlign = TextAlign.Center
            )

            Text(
                "PUNTO DE VENTA OFICIAL",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
                color = Palette.Muted,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(20.dp))

            // Tarjeta de estado y sugerencia para escanear
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Palette.SurfaceHigh,
                border = BorderStroke(1.dp, Palette.Border),
                modifier = Modifier.widthIn(max = 520.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Filled.QrCodeScanner, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(20.dp))
                        Text(
                            "Escanea un código de barras o escribe en el buscador",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Palette.Text
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onScanCamera,
                            colors = ButtonDefaults.buttonColors(containerColor = Palette.Surface),
                            border = BorderStroke(1.dp, Palette.Border),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Escanear", fontSize = 11.sp, color = Palette.Text, maxLines = 1, softWrap = false)
                        }

                        Button(
                            onClick = onScanPhoto,
                            colors = ButtonDefaults.buttonColors(containerColor = Palette.Surface),
                            border = BorderStroke(1.dp, Palette.Border),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Filled.PhotoCamera, contentDescription = null, tint = Palette.Gold, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Por Foto", fontSize = 11.sp, color = Palette.Text, maxLines = 1, softWrap = false)
                        }

                        Button(
                            onClick = onOpenProductsCatalog,
                            colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.weight(1.15f)
                        ) {
                            Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Productos", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold, maxLines = 1, softWrap = false)
                        }
                    }
                }
            }

            Spacer(Modifier.height(18.dp))

            // Contador de inventario en almacenes
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Palette.SurfaceHigh,
                    border = BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.clickable { onOpenProductsCatalog() }
                ) {
                    Text(
                        "📍 Local: ${state.products.sumOf { it.stockLocal }} perfumes",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Palette.Text,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Palette.SurfaceHigh,
                    border = BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.clickable { onOpenBodegas(PosLocation.BODEGA_EC) }
                ) {
                    Text(
                        "🇪🇨 Bodega EC: ${state.products.sumOf { it.stockBodegaEc }} perfumes",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Palette.Text,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }

                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Palette.SurfaceHigh,
                    border = BorderStroke(1.dp, Palette.Border),
                    modifier = Modifier.clickable { onOpenBodegas(PosLocation.BODEGA_USA) }
                ) {
                    Text(
                        "🇺🇸 Bodega USA: ${state.products.sumOf { it.stockBodegaUsa }} perfumes",
                        fontSize = 11.5.sp,
                        fontWeight = FontWeight.Medium,
                        color = Palette.Text,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    )
                }
            }
        }
    }
}

/**
 * Producto individual presentado EN GRANDE con todos sus detalles de bodega y botón prominente
 */
@Composable
private fun SingleProductSpotlight(
    product: Product,
    location: PosLocation,
    onAddWithQty: (Product, Int) -> Unit,
    onClose: () -> Unit,
) {
    var quantity by remember(product.id) { mutableIntStateOf(1) }
    val availableStock = product.stockFor(location)

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(20.dp)),
        color = Palette.Surface,
        border = BorderStroke(1.5.dp, Palette.Gold.copy(alpha = 0.5f)),
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalArrangement = Arrangement.spacedBy(28.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Imagen GRANDE en alta resolución
            Surface(
                modifier = Modifier
                    .size(280.dp)
                    .clip(RoundedCornerShape(18.dp)),
                color = Palette.SurfaceHigh,
                border = BorderStroke(1.dp, Palette.Border)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (!product.imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = product.imageUrl,
                            contentDescription = product.name,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(14.dp)
                        )
                    } else {
                        Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(80.dp))
                    }
                }
            }

            // Datos del Perfume en Grande
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = Palette.Gold.copy(alpha = 0.14f)
                    ) {
                        Text(
                            product.brand.uppercase(),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Palette.Gold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }

                    IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Filled.Close, contentDescription = "Cerrar", tint = Palette.Muted)
                    }
                }

                Text(
                    product.name,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Palette.Text,
                    lineHeight = 30.sp
                )

                if (product.sku.isNotBlank() || product.barcode.isNotBlank()) {
                    Text(
                        listOfNotNull(
                            product.sku.takeIf { it.isNotBlank() }?.let { "SKU: $it" },
                            product.barcode.takeIf { it.isNotBlank() }?.let { "Código: $it" }
                        ).joinToString("  •  "),
                        fontSize = 12.sp,
                        color = Palette.Muted
                    )
                }

                HorizontalDivider(color = Palette.Border)

                // Disponibilidad física por bodega
                Text("Disponibilidad:", fontSize = 12.5.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (product.stockLocal > 0) Palette.StockOkBg else Palette.StockLowBg
                    ) {
                        Text(
                            "Local: ${product.stockLocal} disp.",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (product.stockLocal > 0) Palette.StockOkText else Palette.StockLowText,
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (product.stockBodegaEc > 0) Palette.StockOkBg else Palette.SurfaceHigh
                    ) {
                        Text(
                            "Bodega EC: ${product.stockBodegaEc}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (product.stockBodegaEc > 0) Palette.StockOkText else Palette.Muted,
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (product.stockBodegaUsa > 0) Palette.StockOkBg else Palette.SurfaceHigh
                    ) {
                        Text(
                            "Bodega USA: ${product.stockBodegaUsa}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (product.stockBodegaUsa > 0) Palette.StockOkText else Palette.Muted,
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))

                // Precio de Tienda en Grande
                Column {
                    Text(
                        "PRECIO TIENDA",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.5.sp,
                        color = Palette.Muted
                    )
                    Text(
                        product.price.money(),
                        fontSize = 38.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Gold
                    )
                }

                Spacer(Modifier.height(6.dp))

                // Controles de cantidad y botón Agregar
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Stepper de Cantidad
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Palette.SurfaceHigh,
                        border = BorderStroke(1.dp, Palette.Border)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton(
                                onClick = { if (quantity > 1) quantity -= 1 },
                                modifier = Modifier.size(46.dp)
                            ) {
                                Text("-", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            }
                            Text(
                                "$quantity",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Palette.Text,
                                modifier = Modifier.padding(horizontal = 14.dp)
                            )
                            IconButton(
                                onClick = { quantity += 1 },
                                modifier = Modifier.size(46.dp)
                            ) {
                                Text("+", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
                            }
                        }
                    }

                    // Botón Agregar al Ticket
                    Button(
                        onClick = {
                            onAddWithQty(product, quantity)
                            quantity = 1
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                    ) {
                        Icon(Icons.Filled.AddShoppingCart, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "AGREGAR AL TICKET  •  ${(product.price * quantity).money()}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    }
}

/**
 * Cuando la búsqueda coincide con múltiples perfumes, se muestran en tarjetas GRANDES (2 por fila)
 */
@Composable
private fun MultipleProductsSpotlight(
    products: List<Product>,
    location: PosLocation,
    onAdd: (Product) -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Resultados encontrados: ${products.size} perfumes",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = Palette.Text
            )
            TextButton(onClick = onClose) {
                Icon(Icons.Filled.Close, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Cerrar búsqueda", fontSize = 12.sp, color = Palette.Muted)
            }
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(products, key = { it.id }) { product ->
                LargeProductCard(
                    product = product,
                    location = location,
                    onAdd = { onAdd(product) }
                )
            }
        }
    }
}

/**
 * Tarjeta en formato grande para cuando hay varios resultados en Inicio
 */
@Composable
private fun LargeProductCard(
    product: Product,
    location: PosLocation,
    onAdd: () -> Unit,
) {
    val stock = product.stockFor(location)
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Palette.Border, RoundedCornerShape(16.dp))
            .clickable { onAdd() },
        color = Palette.Surface,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier
                    .size(130.dp)
                    .clip(RoundedCornerShape(12.dp)),
                color = Palette.SurfaceHigh
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (!product.imageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = product.imageUrl,
                            contentDescription = product.name,
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.fillMaxSize().padding(6.dp)
                        )
                    } else {
                        Icon(Icons.Filled.Inventory2, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(40.dp))
                    }
                }
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(product.brand.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Palette.Gold)
                    Text(
                        product.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Palette.Text,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        "Stock: $stock disp. en ${location.label}",
                        fontSize = 11.5.sp,
                        color = if (stock > 0) Palette.StockOkText else Palette.StockLowText,
                        fontWeight = FontWeight.Medium
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(product.price.money(), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Palette.Gold)
                    Button(
                        onClick = onAdd,
                        colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text("+ Agregar", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/**
 * Estado vacío de búsqueda en Inicio
 */
@Composable
private fun EmptySearchSpotlight(
    query: String,
    onClear: () -> Unit,
    onScanPhoto: () -> Unit,
) {
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(20.dp)),
        color = Palette.Surface,
        border = BorderStroke(1.dp, Palette.Border)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(Icons.Filled.SearchOff, contentDescription = null, tint = Palette.Muted, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(12.dp))
            Text("No encontramos perfumes para \"$query\"", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Palette.Text)
            Text("Verifica el nombre o código de barras, o prueba con otra búsqueda.", fontSize = 13.sp, color = Palette.Muted)
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onClear, colors = ButtonDefaults.buttonColors(containerColor = Palette.SurfaceHigh), shape = RoundedCornerShape(10.dp)) {
                    Text("Limpiar búsqueda", color = Palette.Text)
                }
                Button(onClick = onScanPhoto, colors = ButtonDefaults.buttonColors(containerColor = Palette.Gold), shape = RoundedCornerShape(10.dp)) {
                    Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Buscar por foto", color = Color.White)
                }
            }
        }
    }
}
