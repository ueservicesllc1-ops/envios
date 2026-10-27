package com.vibe.pos

import android.os.Bundle
import android.view.MotionEvent
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.vibe.pos.ui.LoginScreen
import com.vibe.pos.ui.SaleScreen
import com.vibe.pos.ui.VibeTheme
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private val vm: PosViewModel by viewModels()
    private var lastTouch = System.currentTimeMillis()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Mantener pantalla encendida permanentemente en la tienda
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            val state by vm.state.collectAsStateWithLifecycle()

            VibeTheme(isDark = state.isDarkMode, fontScale = state.fontScale) {
                // Bloqueo por inactividad prolongada (1 hora sin uso)
                LaunchedEffect(state.session?.staff?.id, state.locked) {
                    while (state.session != null && !state.locked) {
                        delay(10_000)
                        if (System.currentTimeMillis() - lastTouch > INACTIVITY_MS) vm.lock()
                    }
                }

                if (state.session == null || state.locked) {
                    LoginScreen(state, onLogin = vm::login, onRetryStaff = vm::loadStaff)
                } else {
                    SaleScreen(
                        state = state,
                        onQuery = vm::setQuery, onSetLocation = vm::setLocation,
                        onAdd = { vm.add(it) }, onDec = vm::decrement, onRemove = vm::remove,
                        onClear = vm::clearCart, onBarcode = vm::onBarcode, onCheckout = vm::checkout,
                        onDismissSale = vm::dismissSale, onLock = vm::lock, onLogout = vm::logout,
                        onMessageShown = vm::consumeMessage,
                        onSelectClient = vm::selectClient,
                        onSaveClient = vm::saveClient,
                        onLoadClients = vm::loadClients,
                        onSetNote = vm::setSaleNote,
                        onHoldSale = vm::saveTicketOnHold,
                        onToggleTheme = vm::toggleTheme,
                        onSetFontScale = vm::setFontScale,
                        onLoadSales = vm::loadSales,
                        onLoadReports = vm::loadReports,
                        onLoadEmailStatus = vm::loadEmailStatus,
                        onResendReceiptEmail = vm::resendReceiptEmail,
                        onTestEmail = vm::testSendEmail,
                        onLoadReceipts = vm::loadReceipts,
                        onScanReceipt = { id, code, pid -> vm.scanReceipt(id, code, pid) },
                        onClearReceiptFeedback = vm::clearReceiptFeedback,
                        onCloseReceipt = vm::closeReceipt,
                    )
                }
            }
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        lastTouch = System.currentTimeMillis()
        return super.dispatchTouchEvent(ev)
    }

    private companion object { const val INACTIVITY_MS = 60 * 60 * 1000L } // 1 hora de sesión continua
}
