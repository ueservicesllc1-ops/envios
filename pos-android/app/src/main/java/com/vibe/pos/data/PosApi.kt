package com.vibe.pos.data

import com.vibe.pos.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Cliente del API /api/pos del servidor. Es la ÚNICA vía por la que la tablet cambia datos. */
class PosApi {
    private val http = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()
    private val json = "application/json; charset=utf-8".toMediaType()
    private val candidateBases = listOf(
        "http://192.168.1.240:3000/api/pos",
        "http://127.0.0.1:3000/api/pos",
        "http://127.0.0.1:5000/api/pos",
        BuildConfig.POS_API_BASE.trimEnd('/') + "/api/pos",
    )

    private suspend fun call(path: String, method: String, body: JSONObject?, idToken: String?): JSONObject =
        withContext(Dispatchers.IO) {
            var lastError: Exception? = null
            for (base in candidateBases) {
                try {
                    android.util.Log.d("PosApi", "Attempting $method $base$path")
                    val builder = Request.Builder().url(base + path)
                    if (idToken != null) builder.header("Authorization", "Bearer $idToken")
                    if (method == "POST") builder.post((body ?: JSONObject()).toString().toRequestBody(json)) else builder.get()
                    val responseObj = http.newCall(builder.build()).execute().use { resp ->
                        val text = resp.body?.string().orEmpty()
                        val obj = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
                        if (!resp.isSuccessful) {
                            val msg = obj.optString("error", "HTTP ${resp.code}")
                            android.util.Log.w("PosApi", "Failed at $base$path: $msg (HTTP ${resp.code})")
                            throw ApiException(msg, resp.code, obj.optString("code").ifEmpty { null })
                        }
                        android.util.Log.d("PosApi", "Success at $base$path")
                        obj
                    }
                    return@withContext responseObj
                } catch (e: ApiException) {
                    lastError = e
                    // Si el error es 404 o conexión, intentar con la siguiente URL candidata
                    if (e.status == 404 && base != candidateBases.last()) {
                        continue
                    }
                    if (base == candidateBases.last()) throw e
                } catch (e: Exception) {
                    android.util.Log.w("PosApi", "Exception at $base$path: ${e.message}")
                    lastError = e
                }
            }
            throw ApiException("Sin conexión con el servidor (${lastError?.message ?: "error"})", 0)
        }

    suspend fun staff(): List<Staff> {
        val res = call("/staff", "GET", null, null)
        val arr = res.optJSONArray("staff") ?: return emptyList()
        return (0 until arr.length()).mapNotNull {
            val o = arr.optJSONObject(it) ?: return@mapNotNull null
            Staff(o.optString("id"), o.optString("name"), o.optString("role", "advisor"))
        }
    }

    data class AuthResult(val customToken: String, val session: PosSession)

    suspend fun auth(staffId: String, pin: String, deviceId: String): AuthResult {
        val res = call(
            "/auth", "POST",
            JSONObject().put("staffId", staffId).put("pin", pin).put("deviceId", deviceId), null,
        )
        val s = res.getJSONObject("staff")
        val cfg = res.getJSONObject("settings")
        return AuthResult(
            res.getString("customToken"),
            PosSession(
                Staff(s.getString("id"), s.getString("name"), s.optString("role", "advisor")),
                cfg.optString("location", "Bodega Principal"),
                cfg.optString("priceField", "salePrice2"),
                cfg.optDouble("maxDiscountPct", 0.0),
            ),
        )
    }

    suspend fun createSale(
        idToken: String,
        clientSaleId: String,
        deviceId: String,
        lines: List<CartLine>,
        discountPct: Double,
        payment: PaymentInput,
        customerName: String?,
        client: PosClient? = null,
    ): SaleResult {
        val items = JSONArray()
        // Solo productId + cantidad: el servidor decide precios y stock.
        lines.forEach { items.put(JSONObject().put("productId", it.product.id).put("quantity", it.quantity)) }
        val pay = JSONObject()
            .put("method", payment.method.api)
            .put("cashReceived", payment.cashReceived)
            .put("cardAmount", payment.cardAmount)
            .put("transferAmount", payment.transferAmount)
            .put("reference", payment.reference)
        val body = JSONObject()
            .put("clientSaleId", clientSaleId)
            .put("deviceId", deviceId)
            .put("items", items)
            .put("discountPct", discountPct)
            .put("payment", pay)
        if (client != null) {
            body.put("customer", JSONObject()
                .put("id", client.id)
                .put("nombre", client.nombre)
                .put("apellido", client.apellido)
                .put("fullName", client.fullName)
                .put("telefono", client.telefono)
                .put("email", client.email)
                .put("cedula", client.cedula))
            body.put("customerName", client.fullName)
            body.put("customerEmail", client.email)
            body.put("customerPhone", client.telefono)
        } else if (!customerName.isNullOrBlank()) {
            body.put("customerName", customerName)
        }
        val res = call("/sales", "POST", body, idToken)
        return SaleResult(
            res.getString("saleNumber"),
            res.getDouble("total"),
            res.optDouble("change", 0.0),
            res.optBoolean("duplicate", false),
        )
    }

    suspend fun getSales(idToken: String): List<PosSaleRecord> {
        val res = call("/sales", "GET", null, idToken)
        val arr = res.optJSONArray("sales") ?: return emptyList()
        val list = mutableListOf<PosSaleRecord>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val itemsArr = o.optJSONArray("items") ?: JSONArray()
            val itemsList = mutableListOf<PosSaleItem>()
            for (j in 0 until itemsArr.length()) {
                val it = itemsArr.optJSONObject(j) ?: continue
                itemsList.add(
                    PosSaleItem(
                        name = it.optString("name", "Perfume"),
                        quantity = it.optInt("quantity", 1),
                        unitPrice = it.optDouble("unitPrice", 0.0),
                        totalPrice = it.optDouble("totalPrice", 0.0),
                    )
                )
            }
            list.add(
                PosSaleRecord(
                    id = o.optString("id"),
                    saleNumber = o.optString("saleNumber"),
                    total = o.optDouble("total", 0.0),
                    subtotal = o.optDouble("subtotal", 0.0),
                    discountAmount = o.optDouble("discountAmount", 0.0),
                    paymentMethod = o.optString("paymentMethod", "cash"),
                    customerName = o.optString("customerName", "Consumidor Final"),
                    customerCedula = o.optString("customerCedula", ""),
                    customerEmail = o.optString("customerEmail", ""),
                    staffName = o.optString("staffName", "Asesor"),
                    createdAt = o.optString("createdAt", ""),
                    items = itemsList,
                )
            )
        }
        return list
    }

    suspend fun getReports(idToken: String): PosReports {
        val res = call("/reports", "GET", null, idToken)
        val byMethodObj = res.optJSONObject("byMethod") ?: JSONObject()
        val byMethod = mutableMapOf<String, Double>()
        byMethodObj.keys().forEach { k -> byMethod[k] = byMethodObj.optDouble(k, 0.0) }

        val topArr = res.optJSONArray("topPerfumes") ?: JSONArray()
        val topList = mutableListOf<TopPerfume>()
        for (i in 0 until topArr.length()) {
            val o = topArr.optJSONObject(i) ?: continue
            topList.add(
                TopPerfume(
                    name = o.optString("name", "Perfume"),
                    qty = o.optInt("qty", 0),
                    total = o.optDouble("total", 0.0),
                )
            )
        }
        return PosReports(
            totalSalesCount = res.optInt("totalSalesCount", 0),
            totalRevenue = res.optDouble("totalRevenue", 0.0),
            totalItemsSold = res.optInt("totalItemsSold", 0),
            byMethod = byMethod,
            topPerfumes = topList,
        )
    }

    suspend fun sendReceiptEmail(idToken: String, saleId: String, email: String): String {
        val body = JSONObject().put("email", email)
        val res = call("/sales/$saleId/email", "POST", body, idToken)
        return res.optString("message", "Correo enviado correctamente")
    }

    suspend fun getEmailStatus(idToken: String): EmailConfigStatus {
        val res = call("/email/status", "GET", null, idToken)
        return EmailConfigStatus(
            configured = res.optBoolean("configured", false),
            user = res.optString("user", "No configurado"),
            instructionsUrl = res.optString("instructionsUrl", "https://myaccount.google.com/apppasswords"),
        )
    }

    suspend fun testEmail(idToken: String, email: String): String {
        val body = JSONObject().put("email", email)
        val res = call("/email/test", "POST", body, idToken)
        return res.optString("message", "Correo de prueba enviado")
    }

    suspend fun getClients(idToken: String, query: String = ""): List<PosClient> {
        val q = if (query.isNotBlank()) "?q=${java.net.URLEncoder.encode(query, "UTF-8")}" else ""
        val res = call("/clients$q", "GET", null, idToken)
        val arr = res.optJSONArray("clients") ?: return emptyList()
        val list = mutableListOf<PosClient>()
        for (i in 0 until arr.length()) {
            val obj = arr.getJSONObject(i)
            list.add(
                PosClient(
                    id = obj.optString("id"),
                    nombre = obj.optString("nombre"),
                    apellido = obj.optString("apellido"),
                    telefono = obj.optString("telefono"),
                    email = obj.optString("email"),
                    cedula = obj.optString("cedula"),
                )
            )
        }
        return list
    }

    suspend fun saveClient(idToken: String, client: PosClient): PosClient {
        val body = JSONObject()
            .put("nombre", client.nombre)
            .put("apellido", client.apellido)
            .put("telefono", client.telefono)
            .put("email", client.email)
            .put("cedula", client.cedula)
        if (client.id.isNotBlank()) body.put("id", client.id)
        val res = call("/clients", "POST", body, idToken)
        val obj = res.optJSONObject("client") ?: body
        return PosClient(
            id = obj.optString("id", client.id),
            nombre = obj.optString("nombre", client.nombre),
            apellido = obj.optString("apellido", client.apellido),
            telefono = obj.optString("telefono", client.telefono),
            email = obj.optString("email", client.email),
            cedula = obj.optString("cedula", client.cedula),
        )
    }

    suspend fun holdSale(
        idToken: String,
        lines: List<CartLine>,
        subtotal: Double,
        customer: PosClient?,
        note: String
    ): String {
        val items = JSONArray()
        lines.forEach { items.put(JSONObject().put("productId", it.product.id).put("name", it.product.name).put("quantity", it.quantity).put("price", it.product.price)) }
        val body = JSONObject()
            .put("items", items)
            .put("subtotal", subtotal)
            .put("note", note)
        if (customer != null) {
            body.put("customer", JSONObject().put("id", customer.id).put("nombre", customer.nombre).put("apellido", customer.apellido).put("telefono", customer.telefono).put("cedula", customer.cedula))
        }
        val res = call("/sales/hold", "POST", body, idToken)
        return res.optString("id")
    }

    suspend fun audit(idToken: String, deviceId: String, type: String, data: JSONObject? = null) {
        runCatching {
            call(
                "/audit", "POST",
                JSONObject().put("type", type).put("deviceId", deviceId).apply { if (data != null) put("data", data) },
                idToken,
            )
        }
    }

    // ---- Ingreso de mercadería (notas Bodega Ecuador -> Local) ----
    private fun parseReceipt(o: JSONObject): LocalReceipt {
        val arr = o.optJSONArray("items") ?: JSONArray()
        val items = (0 until arr.length()).mapNotNull {
            val i = arr.optJSONObject(it) ?: return@mapNotNull null
            ReceiptItem(
                productId = i.optString("productId"),
                name = i.optString("name", "Perfume"),
                barcode = i.optString("barcode", ""),
                expectedQty = i.optInt("expectedQty", 0),
                receivedQty = i.optInt("receivedQty", 0),
            )
        }
        return LocalReceipt(
            id = o.optString("id"),
            number = o.optString("number"),
            status = o.optString("status", "pending"),
            notes = o.optString("notes", ""),
            createdAt = o.optString("createdAt", ""),
            items = items,
        )
    }

    suspend fun getReceipts(idToken: String): List<LocalReceipt> {
        val res = call("/receipts", "GET", null, idToken)
        val arr = res.optJSONArray("receipts") ?: return emptyList()
        return (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(::parseReceipt) }
    }

    data class ScanResult(val receipt: LocalReceipt, val productName: String, val duplicate: Boolean)

    /** Registra 1 unidad recibida. Si [productId] viene, asocia además el código al perfume. */
    suspend fun scanReceipt(
        idToken: String, receiptId: String, barcode: String, scanId: String, deviceId: String, productId: String? = null,
    ): ScanResult {
        val body = JSONObject().put("barcode", barcode).put("scanId", scanId).put("deviceId", deviceId)
        if (productId != null) body.put("productId", productId)
        val res = call("/receipts/$receiptId/scan", "POST", body, idToken)
        return ScanResult(
            parseReceipt(res.getJSONObject("receipt")),
            res.optString("productName", ""),
            res.optBoolean("duplicate", false),
        )
    }

    suspend fun closeReceipt(idToken: String, receiptId: String, reason: String) {
        call("/receipts/$receiptId/close", "POST", JSONObject().put("reason", reason), idToken)
    }
}

