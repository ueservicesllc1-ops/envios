package com.vibe.pos

import android.annotation.SuppressLint
import android.app.Application
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.vibe.pos.data.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import java.util.UUID

data class UiState(
    val staffList: List<Staff> = listOf(Staff("vendedor", "Vendedor", "advisor")),
    val staffError: String? = null,
    val session: PosSession? = null,
    val locked: Boolean = false,
    val loggingIn: Boolean = false,
    val loginError: String? = null,
    val selectedLocation: PosLocation = PosLocation.LOCAL,
    val products: List<Product> = emptyList(),
    val catalogLoaded: Boolean = false,
    val query: String = "",
    val cart: List<CartLine> = emptyList(),
    val message: String? = null,
    val processingSale: Boolean = false,
    val saleError: String? = null,
    val lastSale: SaleResult? = null,
    val selectedClient: com.vibe.pos.data.PosClient? = null,
    val saleNote: String = "",
    val clientsList: List<com.vibe.pos.data.PosClient> = emptyList(),
    val loadingClients: Boolean = false,
    val isDarkMode: Boolean = false,
    val fontScale: Float = 1.0f,
    val salesHistory: List<com.vibe.pos.data.PosSaleRecord> = emptyList(),
    val loadingSales: Boolean = false,
    val reports: com.vibe.pos.data.PosReports? = null,
    val loadingReports: Boolean = false,
    val emailStatus: com.vibe.pos.data.EmailConfigStatus? = null,
    val testingEmail: Boolean = false,
    val receipts: List<com.vibe.pos.data.LocalReceipt> = emptyList(),
    val loadingReceipts: Boolean = false,
    /** Último resultado de escaneo: (mensaje, ok) */
    val receiptScanFeedback: Pair<String, Boolean>? = null,
) {
    val subtotal: Double get() = cart.sumOf { it.total }
    val filtered: List<Product>
        get() {
            val byLocation = when (selectedLocation) {
                PosLocation.BODEGA_EC -> products.filter { it.stockBodegaEc > 0 }
                PosLocation.BODEGA_USA -> products.filter { it.stockBodegaUsa > 0 }
                PosLocation.LOCAL -> products.filter { it.stockLocal > 0 }
            }
            val q = query.trim().lowercase()
            if (q.isEmpty()) return byLocation
            return byLocation.filter {
                it.name.lowercase().contains(q) || it.brand.lowercase().contains(q) ||
                    it.sku.lowercase().contains(q) || it.barcode.contains(q)
            }
        }
}

class PosViewModel(app: Application) : AndroidViewModel(app) {
    private val api = PosApi()
    private val catalog = CatalogRepository()
    private val auth = FirebaseAuth.getInstance()

    @SuppressLint("HardwareIds")
    private val deviceId: String = Settings.Secure.getString(app.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"

    private val prefs = app.getSharedPreferences("vibe_pos_prefs", android.content.Context.MODE_PRIVATE)

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    // Un UUID por intento de venta: si la red falla y se reintenta, el servidor no duplica.
    private var pendingSaleId: String? = null
    private var catalogJob: Job? = null

    init {
        val savedDark = prefs.getBoolean("is_dark_mode", false)
        val savedFont = prefs.getFloat("font_scale", 1.0f)
        _state.update { it.copy(isDarkMode = savedDark, fontScale = savedFont) }
        loadStaff()
    }

    fun loadStaff() = viewModelScope.launch {
        _state.update { it.copy(staffError = null) }
        try {
            val list = api.staff()
            _state.update { it.copy(staffList = list) }
        } catch (e: Exception) {
            _state.update { it.copy(staffError = e.message ?: "Sin conexión con el servidor") }
        }
    }

    fun login(staffId: String, pin: String) = viewModelScope.launch {
        android.util.Log.d("PosViewModel", "login() called for staffId=$staffId")
        _state.update { it.copy(loggingIn = true, loginError = null) }
        try {
            val res = api.auth(staffId, pin, deviceId)
            android.util.Log.d("PosViewModel", "api.auth succeeded, signing in with customToken...")
            auth.signInWithCustomToken(res.customToken).await()
            android.util.Log.d("PosViewModel", "signInWithCustomToken succeeded! uid=${auth.currentUser?.uid}")
            val previous = _state.value.session?.staff?.id
            _state.update {
                it.copy(
                    session = res.session, locked = false, loggingIn = false,
                    // Si otro asesor entra, no hereda el carrito del anterior.
                    cart = if (previous == res.session.staff.id) it.cart else emptyList(),
                )
            }
            startCatalog(res.session)
        } catch (e: ApiException) {
            android.util.Log.e("PosViewModel", "ApiException during login: ${e.message}", e)
            _state.update { it.copy(loggingIn = false, loginError = e.message) }
        } catch (e: Exception) {
            android.util.Log.e("PosViewModel", "General Exception during login: ${e.message}", e)
            _state.update { it.copy(loggingIn = false, loginError = e.message ?: "No se pudo iniciar sesión") }
        }
    }

    private fun startCatalog(s: PosSession) {
        catalogJob?.cancel()
        catalogJob = viewModelScope.launch {
            catalog.observe(s.location, s.priceField).collect { list ->
                _state.update { st ->
                    // Mantener el carrito sincronizado con precio/stock vigentes
                    val byId = list.associateBy { p -> p.id }
                    st.copy(
                        products = list, catalogLoaded = true,
                        cart = st.cart.mapNotNull { l -> byId[l.product.id]?.let { p -> l.copy(product = p) } },
                    )
                }
            }
        }
    }

    /** Bloqueo por inactividad: conserva el carrito, exige PIN de nuevo. */
    fun lock() { if (_state.value.session != null) _state.update { it.copy(locked = true, loginError = null) } }

    fun logout() {
        catalogJob?.cancel()
        val token = auth.currentUser
        viewModelScope.launch {
            token?.getIdToken(false)?.await()?.token?.let { api.audit(it, deviceId, "LOGOUT") }
            auth.signOut()
        }
        pendingSaleId = null
        _state.update { UiState(staffList = it.staffList) }
    }

    fun setQuery(q: String) = _state.update { it.copy(query = q) }
    fun setLocation(loc: PosLocation) = _state.update { it.copy(selectedLocation = loc) }
    fun consumeMessage() = _state.update { it.copy(message = null) }

    // ----- Carrito -----
    fun add(product: Product, qty: Int = 1) {
        _state.update { st ->
            val loc = st.selectedLocation
            val available = product.stockFor(loc)
            val existing = st.cart.find { it.product.id == product.id }
            val newQty = (existing?.quantity ?: 0) + qty
            when {
                available <= 0 -> {
                    val hints = mutableListOf<String>()
                    if (product.stockBodegaEc > 0) hints.add("Bodega EC: ${product.stockBodegaEc}")
                    if (product.stockBodegaUsa > 0) hints.add("Bodega USA: ${product.stockBodegaUsa}")
                    val extra = if (hints.isNotEmpty()) " (Hay en " + hints.joinToString(", ") + ")" else ""
                    st.copy(message = "Sin stock en ${loc.label}: ${product.name}$extra")
                }
                newQty > available -> st.copy(message = "Stock máximo en ${loc.label}: $available")
                existing != null -> st.copy(cart = st.cart.map { if (it.product.id == product.id) it.copy(quantity = newQty) else it })
                else -> st.copy(cart = st.cart + CartLine(product, newQty))
            }
        }
        pendingSaleId = null
    }

    fun decrement(product: Product) {
        _state.update { st ->
            st.copy(cart = st.cart.mapNotNull {
                if (it.product.id != product.id) it else if (it.quantity <= 1) null else it.copy(quantity = it.quantity - 1)
            })
        }
        pendingSaleId = null
    }

    fun remove(product: Product) {
        _state.update { st -> st.copy(cart = st.cart.filter { it.product.id != product.id }) }
        pendingSaleId = null
    }

    fun clearCart() {
        _state.update { it.copy(cart = emptyList()) }
        pendingSaleId = null
    }

    /** Resuelve un código escaneado contra el catálogo local. Retorna true si lo agregó. */
    fun onBarcode(code: String): Boolean {
        val clean = code.trim()
        val p = _state.value.products.firstOrNull { it.barcode == clean || it.sku.equals(clean, ignoreCase = true) }
        if (p == null) {
            _state.update { it.copy(message = "Código no registrado: $clean") }
            viewModelScope.launch {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                api.audit(token, deviceId, "UNKNOWN_BARCODE", JSONObject().put("code", clean))
            }
            return false
        }
        add(p)
        return true
    }

    // ----- Cobro -----
    fun checkout(discountPct: Double, payment: PaymentInput, customerName: String?) {
        val st = _state.value
        if (st.cart.isEmpty() || st.processingSale) return
        val saleId = pendingSaleId ?: UUID.randomUUID().toString().also { pendingSaleId = it }
        viewModelScope.launch {
            _state.update { it.copy(processingSale = true, saleError = null) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token
                    ?: throw ApiException("Sesión expirada, vuelve a ingresar", 401)
                val result = api.createSale(
                    idToken = token,
                    clientSaleId = saleId,
                    deviceId = deviceId,
                    lines = st.cart,
                    discountPct = discountPct,
                    payment = payment,
                    customerName = customerName,
                    client = st.selectedClient,
                )
                pendingSaleId = null
                _state.update { it.copy(processingSale = false, lastSale = result, cart = emptyList(), selectedClient = null, saleNote = "") }
            } catch (e: ApiException) {
                _state.update { it.copy(processingSale = false, saleError = e.message) }
            }
        }
    }

    fun toggleTheme(isDark: Boolean) {
        prefs.edit().putBoolean("is_dark_mode", isDark).apply()
        _state.update { it.copy(isDarkMode = isDark) }
    }

    fun setFontScale(scale: Float) {
        prefs.edit().putFloat("font_scale", scale).apply()
        _state.update { it.copy(fontScale = scale) }
    }

    fun loadSales() {
        viewModelScope.launch {
            _state.update { it.copy(loadingSales = true) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val list = api.getSales(token)
                _state.update { it.copy(salesHistory = list, loadingSales = false) }
            } catch (e: Exception) {
                _state.update { it.copy(loadingSales = false, message = "Error al cargar historial de ventas: ${e.message}") }
            }
        }
    }

    fun loadReports() {
        viewModelScope.launch {
            _state.update { it.copy(loadingReports = true) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val rep = api.getReports(token)
                _state.update { it.copy(reports = rep, loadingReports = false) }
            } catch (e: Exception) {
                _state.update { it.copy(loadingReports = false, message = "Error al cargar reportes: ${e.message}") }
            }
        }
    }

    fun loadReceipts() {
        viewModelScope.launch {
            _state.update { it.copy(loadingReceipts = true) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val list = api.getReceipts(token)
                _state.update { it.copy(receipts = list, loadingReceipts = false) }
            } catch (e: Exception) {
                _state.update { it.copy(loadingReceipts = false, message = "Error al cargar notas de ingreso: ${e.message}") }
            }
        }
    }

    /** Escanea 1 unidad contra una nota de ingreso. Si [productId] viene, primero asocia el código a ese perfume. */
    fun scanReceipt(receiptId: String, barcode: String, productId: String? = null) {
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val r = api.scanReceipt(token, receiptId, barcode, java.util.UUID.randomUUID().toString(), deviceId, productId)
                _state.update { s ->
                    val updated = if (r.receipt.status == "received") s.receipts.filter { it.id != receiptId }
                    else s.receipts.map { if (it.id == receiptId) r.receipt else it }
                    val msg = if (r.receipt.status == "received") "✔ Nota completa recibida" else "✔ ${r.productName}"
                    s.copy(receipts = updated, receiptScanFeedback = msg to true)
                }
            } catch (e: Exception) {
                _state.update { it.copy(receiptScanFeedback = (e.message ?: "Error") to false) }
            }
        }
    }

    fun clearReceiptFeedback() = _state.update { it.copy(receiptScanFeedback = null) }

    fun closeReceipt(receiptId: String, reason: String) {
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                api.closeReceipt(token, receiptId, reason)
                _state.update { s -> s.copy(receipts = s.receipts.filter { it.id != receiptId }, message = "Nota cerrada con faltantes") }
            } catch (e: Exception) {
                _state.update { it.copy(message = e.message ?: "No se pudo cerrar la nota") }
            }
        }
    }

    fun loadEmailStatus() {
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val status = api.getEmailStatus(token)
                _state.update { it.copy(emailStatus = status) }
            } catch (_: Exception) {}
        }
    }

    fun resendReceiptEmail(saleId: String, email: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token
                    ?: throw ApiException("Sesión expirada", 401)
                val msg = api.sendReceiptEmail(token, saleId, email)
                _state.update { it.copy(message = "Comprobante digital enviado a $email") }
                onDone(true, msg)
            } catch (e: Exception) {
                _state.update { it.copy(message = "Error enviando comprobante: ${e.message}") }
                onDone(false, e.message ?: "Error al enviar correo")
            }
        }
    }

    fun testSendEmail(email: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(testingEmail = true) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token
                    ?: throw ApiException("Sesión expirada", 401)
                val msg = api.testEmail(token, email)
                _state.update { it.copy(testingEmail = false, message = "¡Correo de prueba enviado con éxito a $email!") }
                onDone(true, msg)
            } catch (e: Exception) {
                _state.update { it.copy(testingEmail = false, message = "Error: ${e.message}") }
                onDone(false, e.message ?: "Error al enviar correo")
            }
        }
    }

    fun selectClient(client: com.vibe.pos.data.PosClient?) {
        _state.update { it.copy(selectedClient = client) }
    }

    fun setSaleNote(note: String) {
        _state.update { it.copy(saleNote = note) }
    }

    fun loadClients(query: String = "") {
        viewModelScope.launch {
            _state.update { it.copy(loadingClients = true) }
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val list = api.getClients(token, query)
                _state.update { it.copy(clientsList = list, loadingClients = false) }
            } catch (e: Exception) {
                _state.update { it.copy(loadingClients = false) }
            }
        }
    }

    fun saveClient(client: com.vibe.pos.data.PosClient, onSuccess: (com.vibe.pos.data.PosClient) -> Unit) {
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                val saved = api.saveClient(token, client)
                _state.update { it.copy(selectedClient = saved, message = "Cliente guardado en Firestore: ${saved.fullName}") }
                loadClients()
                onSuccess(saved)
            } catch (e: Exception) {
                _state.update { it.copy(message = "Error al guardar cliente: ${e.message}") }
            }
        }
    }

    fun saveTicketOnHold() {
        val st = _state.value
        if (st.cart.isEmpty()) {
            _state.update { it.copy(message = "Agrega productos antes de guardar el ticket") }
            return
        }
        viewModelScope.launch {
            try {
                val token = auth.currentUser?.getIdToken(false)?.await()?.token ?: return@launch
                api.holdSale(token, st.cart, st.subtotal, st.selectedClient, st.saleNote)
                _state.update { it.copy(cart = emptyList(), selectedClient = null, saleNote = "", message = "Ticket guardado en espera correctamente") }
            } catch (e: Exception) {
                _state.update { it.copy(message = "Error al guardar ticket: ${e.message}") }
            }
        }
    }

    fun dismissSale() = _state.update { it.copy(lastSale = null, saleError = null) }
    fun dismissSaleError() = _state.update { it.copy(saleError = null) }
}
