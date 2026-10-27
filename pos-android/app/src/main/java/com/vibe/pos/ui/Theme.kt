package com.vibe.pos.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.sp

data class AppColors(
    val bg: Color,
    val surface: Color,
    val surfaceHigh: Color,
    val sidebarBg: Color,
    val sidebarIcon: Color,
    val gold: Color,
    val goldLight: Color,
    val goldDark: Color,
    val text: Color,
    val muted: Color,
    val border: Color,
    val danger: Color,
    val ok: Color,
    val warn: Color,
    val stockOkBg: Color,
    val stockOkText: Color,
    val stockLowBg: Color,
    val stockLowText: Color,
    val goldSoft: Color,
)

val LightColors = AppColors(
    bg = Color(0xFFF5F2EB),          // Marfil cálido / crema de lujo
    surface = Color(0xFFFFFFFF),     // Tarjetas, barra y ticket en blanco puro
    surfaceHigh = Color(0xFFF8F9FA), // Fondos suaves para imágenes y stepper
    sidebarBg = Color(0xFF141518),   // Barra lateral oscura charcoal
    sidebarIcon = Color(0xFF94A3B8), // Iconos inactivos de la barra
    gold = Color(0xFF946E26),        // Dorado bronce de lujo
    goldLight = Color(0xFFBE9D52),   // Dorado claro para degradados
    goldDark = Color(0xFF8C6D2D),    // Dorado oscuro para degradados
    text = Color(0xFF0F172A),        // Texto principal oscuro
    muted = Color(0xFF64748B),       // Texto secundario gris pizarra
    border = Color(0xFFE2E8F0),      // Bordes sutiles y definidos
    danger = Color(0xFFDC2626),      // Rojo para vaciar y eliminar
    ok = Color(0xFF15803D),          // Verde para confirmaciones
    warn = Color(0xFFB45309),        // Ámbar para alertas
    stockOkBg = Color(0xFFE6F4EA),   // Verde suave para stock > 1
    stockOkText = Color(0xFF1E7E34), // Texto verde oscuro
    stockLowBg = Color(0xFFFCE8E6),  // Rojo suave para 1 disponible
    stockLowText = Color(0xFFC5221F),// Texto rojo oscuro
    goldSoft = Color(0xFFDFBD5D),    // Dorado suave para bordes/acentos
)

val DarkColors = AppColors(
    bg = Color(0xFF0F1115),          // Negro grafito profundo / lujo noche
    surface = Color(0xFF181B20),     // Tarjetas carbón elegante
    surfaceHigh = Color(0xFF22262E), // Fondos elevados para stepper e imágenes
    sidebarBg = Color(0xFF0D0E11),   // Barra lateral aún más oscura
    sidebarIcon = Color(0xFF8290A3), // Iconos inactivos suaves
    gold = Color(0xFFD4AF37),        // Dorado real brillante sobre oscuro
    goldLight = Color(0xFFE5C158),   // Dorado claro luminoso
    goldDark = Color(0xFFA68523),    // Dorado tostado
    text = Color(0xFFF8FAFC),        // Texto blanco nítido
    muted = Color(0xFF94A3B8),       // Gris pizarra suave
    border = Color(0xFF282D37),      // Bordes refinados en modo noche
    danger = Color(0xFFEF4444),      // Rojo vibrante
    ok = Color(0xFF22C55E),          // Verde esmeralda vibrante
    warn = Color(0xFFF59E0B),        // Ámbar
    stockOkBg = Color(0xFF132B1C),   // Fondo verde profundo
    stockOkText = Color(0xFF4ADE80), // Texto verde menta
    stockLowBg = Color(0xFF381A19),  // Fondo rojo vino
    stockLowText = Color(0xFFF87171),// Texto rojo pastel
    goldSoft = Color(0xFFC5A059),    // Dorado suave acento
)

val LocalColors = staticCompositionLocalOf { LightColors }

object Palette {
    val Bg: Color @Composable @ReadOnlyComposable get() = LocalColors.current.bg
    val Surface: Color @Composable @ReadOnlyComposable get() = LocalColors.current.surface
    val SurfaceHigh: Color @Composable @ReadOnlyComposable get() = LocalColors.current.surfaceHigh
    val SidebarBg: Color @Composable @ReadOnlyComposable get() = LocalColors.current.sidebarBg
    val SidebarIcon: Color @Composable @ReadOnlyComposable get() = LocalColors.current.sidebarIcon
    val Gold: Color @Composable @ReadOnlyComposable get() = LocalColors.current.gold
    val GoldLight: Color @Composable @ReadOnlyComposable get() = LocalColors.current.goldLight
    val GoldDark: Color @Composable @ReadOnlyComposable get() = LocalColors.current.goldDark
    val Text: Color @Composable @ReadOnlyComposable get() = LocalColors.current.text
    val Muted: Color @Composable @ReadOnlyComposable get() = LocalColors.current.muted
    val Border: Color @Composable @ReadOnlyComposable get() = LocalColors.current.border
    val Danger: Color @Composable @ReadOnlyComposable get() = LocalColors.current.danger
    val Ok: Color @Composable @ReadOnlyComposable get() = LocalColors.current.ok
    val Warn: Color @Composable @ReadOnlyComposable get() = LocalColors.current.warn
    val StockOkBg: Color @Composable @ReadOnlyComposable get() = LocalColors.current.stockOkBg
    val StockOkText: Color @Composable @ReadOnlyComposable get() = LocalColors.current.stockOkText
    val StockLowBg: Color @Composable @ReadOnlyComposable get() = LocalColors.current.stockLowBg
    val StockLowText: Color @Composable @ReadOnlyComposable get() = LocalColors.current.stockLowText
    val GoldSoft: Color @Composable @ReadOnlyComposable get() = LocalColors.current.goldSoft
}

private val Type = Typography(
    headlineLarge = TextStyle(fontSize = 26.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.3.sp),
    headlineMedium = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 14.sp),
    bodyMedium = TextStyle(fontSize = 13.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
)

@Composable
fun VibeTheme(
    isDark: Boolean = false,
    fontScale: Float = 1.0f,
    content: @Composable () -> Unit
) {
    val colors = if (isDark) DarkColors else LightColors
    val scheme = if (isDark) {
        darkColorScheme(
            primary = colors.gold,
            onPrimary = Color.Black,
            secondary = colors.goldLight,
            background = colors.bg,
            onBackground = colors.text,
            surface = colors.surface,
            onSurface = colors.text,
            surfaceVariant = colors.surfaceHigh,
            onSurfaceVariant = colors.muted,
            error = colors.danger,
            outline = colors.border,
        )
    } else {
        lightColorScheme(
            primary = colors.gold,
            onPrimary = Color.White,
            secondary = colors.goldLight,
            background = colors.bg,
            onBackground = colors.text,
            surface = colors.surface,
            onSurface = colors.text,
            surfaceVariant = colors.surfaceHigh,
            onSurfaceVariant = colors.muted,
            error = colors.danger,
            outline = colors.border,
        )
    }

    val currentDensity = LocalDensity.current
    val customDensity = Density(
        density = currentDensity.density,
        fontScale = fontScale * currentDensity.fontScale
    )

    CompositionLocalProvider(
        LocalColors provides colors,
        LocalDensity provides customDensity,
    ) {
        MaterialTheme(colorScheme = scheme, typography = Type, content = content)
    }
}
