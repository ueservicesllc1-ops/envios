package com.vibe.pos.data

data class Staff(val id: String, val name: String, val role: String)

data class PosSession(
    val staff: Staff,
    val location: String,
    val priceField: String,
    val maxDiscountPct: Double,
)

enum class PosLocation(val id: String, val label: String) {
    LOCAL("local", "Local"),
    BODEGA_EC("bodega_ec", "Bodega EC"),
    BODEGA_USA("bodega_usa", "Bodega USA"),
}

/** Producto del catálogo (solo lectura). Stock desglosado por Local, Bodega EC y Bodega USA. */
data class Product(
    val id: String,
    val name: String,
    val brand: String,
    val category: String,
    val sku: String,
    val barcode: String,
    val imageUrl: String?,
    val price: Double,
    val stockLocal: Int = 0,
    val stockBodegaEc: Int = 0,
    val stockBodegaUsa: Int = 0,
) {
    fun stockFor(location: PosLocation): Int = when (location) {
        PosLocation.LOCAL -> stockLocal
        PosLocation.BODEGA_EC -> stockBodegaEc
        PosLocation.BODEGA_USA -> stockBodegaUsa
    }

    val totalStock: Int get() = stockLocal + stockBodegaEc + stockBodegaUsa
    val stock: Int get() = stockLocal
}

data class CartLine(val product: Product, val quantity: Int) {
    val total: Double get() = product.price * quantity
}

enum class PayMethod(val api: String, val label: String) {
    CASH("cash", "Efectivo"),
    CARD("card", "Tarjeta"),
    TRANSFER("transfer", "Transferencia"),
    MIXED("mixed", "Mixto"),
}

data class PaymentInput(
    val method: PayMethod,
    val cashReceived: Double = 0.0,
    val cardAmount: Double = 0.0,
    val transferAmount: Double = 0.0,
    val reference: String = "",
)

data class SaleResult(val saleNumber: String, val total: Double, val change: Double, val duplicate: Boolean)

class ApiException(message: String, val status: Int, val code: String? = null) : Exception(message)

data class PosClient(
    val id: String = "",
    val nombre: String = "",
    val apellido: String = "",
    val telefono: String = "",
    val email: String = "",
    val cedula: String = "",
) {
    val fullName: String get() = "$nombre $apellido".trim().ifEmpty { nombre }
}

data class PosSaleItem(
    val name: String = "",
    val quantity: Int = 1,
    val unitPrice: Double = 0.0,
    val totalPrice: Double = 0.0,
)

data class PosSaleRecord(
    val id: String = "",
    val saleNumber: String = "",
    val total: Double = 0.0,
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val paymentMethod: String = "cash",
    val customerName: String = "",
    val customerCedula: String = "",
    val customerEmail: String = "",
    val staffName: String = "",
    val createdAt: String = "",
    val items: List<PosSaleItem> = emptyList(),
)

data class TopPerfume(
    val name: String = "",
    val qty: Int = 0,
    val total: Double = 0.0,
)

data class PosReports(
    val totalSalesCount: Int = 0,
    val totalRevenue: Double = 0.0,
    val totalItemsSold: Int = 0,
    val byMethod: Map<String, Double> = emptyMap(),
    val topPerfumes: List<TopPerfume> = emptyList(),
)

data class EmailConfigStatus(
    val configured: Boolean = false,
    val user: String = "",
    val instructionsUrl: String = "https://myaccount.google.com/apppasswords",
)

fun Double.money(): String = String.format(java.util.Locale.US, "$%,.2f", this)


data class ReceiptItem(
    val productId: String,
    val name: String,
    val barcode: String,
    val expectedQty: Int,
    val receivedQty: Int,
)

data class LocalReceipt(
    val id: String,
    val number: String,
    val status: String,
    val notes: String,
    val createdAt: String,
    val items: List<ReceiptItem>,
) {
    val expectedTotal: Int get() = items.sumOf { it.expectedQty }
    val receivedTotal: Int get() = items.sumOf { it.receivedQty }
}
