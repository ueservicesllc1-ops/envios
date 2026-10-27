package com.vibe.pos.data

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Catálogo en SOLO LECTURA: products + inventory (calculado por Local, Bodega EC y Bodega USA).
 * Filtra automáticamente para mostrar ÚNICAMENTE perfumes con existencias físicas en bodegas
 * (excluye catálogo solo para venta por pedido).
 * Usa el Precio de Tienda (salePrice2).
 */
class CatalogRepository(private val db: FirebaseFirestore = FirebaseFirestore.getInstance()) {

    fun observe(location: String = "", priceField: String): Flow<List<Product>> = callbackFlow {
        var products: Map<String, DocumentSnapshot> = emptyMap()
        var stockLocal: Map<String, Int> = emptyMap()
        var stockEc: Map<String, Int> = emptyMap()
        var stockUsa: Map<String, Int> = emptyMap()

        fun publish() {
            val list = products.values.mapNotNull { doc ->
                toProduct(
                    doc,
                    stockLocal[doc.id] ?: 0,
                    stockEc[doc.id] ?: 0,
                    stockUsa[doc.id] ?: 0,
                    priceField,
                )
            }.sortedBy { it.name.lowercase() }
            trySend(list)
        }

        val r1 = db.collection("products").addSnapshotListener { snap, _ ->
            if (snap != null) { products = snap.documents.associateBy { it.id }; publish() }
        }
        val r2 = db.collection("inventory").addSnapshotListener { snap, _ ->
            if (snap != null) {
                val mLocal = HashMap<String, Int>()
                val mEc = HashMap<String, Int>()
                val mUsa = HashMap<String, Int>()

                snap.documents.forEach { d ->
                    val pid = d.getString("productId") ?: return@forEach
                    val loc = (d.getString("location") ?: "").trim().lowercase()
                    val qty = d.getDouble("quantity")?.toInt() ?: 0

                    if (loc.contains("local") || loc.contains("tienda") || loc.contains("mostrador")) {
                        mLocal[pid] = (mLocal[pid] ?: 0) + qty
                    } else if (loc.contains("usa") || loc.contains("eeuu") || loc.contains("estados unidos")) {
                        mUsa[pid] = (mUsa[pid] ?: 0) + qty
                    } else if (loc.contains("ecuador") || loc.contains("babahoyo") || loc.contains("principal") || loc.contains("bodega")) {
                        mEc[pid] = (mEc[pid] ?: 0) + qty
                    }
                }
                stockLocal = mLocal
                stockEc = mEc
                stockUsa = mUsa
                publish()
            }
        }
        awaitClose { r1.remove(); r2.remove() }
    }

    private fun toProduct(
        d: DocumentSnapshot,
        stockLocal: Int,
        stockEc: Int,
        stockUsa: Int,
        priceField: String,
    ): Product? {
        val name = d.getString("name") ?: return null
        val category = d.getString("category").orEmpty()
        // 1. Solo categoría Perfumes
        if (!category.trim().lowercase().contains("perfume")) {
            return null
        }

        // 2. Solo perfumes que estén físicamente en bodegas (excluye venta por pedidos sin stock)
        val totalStock = stockLocal + stockEc + stockUsa
        if (totalStock <= 0) {
            return null
        }

        // 3. Precio de Tienda: salePrice2 estricto (no precio 1 mayorista)
        val price = (d.getDouble("salePrice2")?.takeIf { it > 0 })
            ?: (d.getDouble("pvp")?.takeIf { it > 0 })
            ?: (d.getDouble(priceField)?.takeIf { it > 0 && priceField != "salePrice1" })
            ?: 0.0

        @Suppress("UNCHECKED_CAST")
        val firstImage = (d.get("images") as? List<String>)?.firstOrNull()
        return Product(
            id = d.id,
            name = name,
            brand = d.getString("brand").orEmpty(),
            category = category,
            sku = d.getString("sku").orEmpty(),
            barcode = d.getString("barcode").orEmpty(),
            imageUrl = d.getString("imageUrl") ?: firstImage,
            price = price,
            stockLocal = stockLocal,
            stockBodegaEc = stockEc,
            stockBodegaUsa = stockUsa,
        )
    }
}
