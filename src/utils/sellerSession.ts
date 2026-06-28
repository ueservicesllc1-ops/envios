export interface SellerSession {
    id: 'vilma' | 'maria' | 'annabel' | 'yuri' | 'luis' | 'jemima';
    name: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean; // Solo Luis — ve botón Bodega Luis
}

const SESSION_KEY = 'ce_seller_session';

export const setSellerSession = (session: SellerSession): void => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const getSellerSession = (): SellerSession | null => {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as SellerSession) : null;
    } catch {
        return null;
    }
};

export const clearSellerSession = (): void => {
    localStorage.removeItem(SESSION_KEY);
};

// ─────────────────────────────────────────────────────────────────
// TODOS LOS VENDEDORES — aparecen en pantalla de login y en el menú
// Para entrar a la página de cada uno se necesita su propio PIN
// ─────────────────────────────────────────────────────────────────
export const MAIN_SELLERS = [
    {
        id: 'vilma' as const,
        name: 'Vilma Uchubanda',
        pin: '2014',
        isAdmin: true,
        isSuperAdmin: false,
        gradient: 'from-pink-500 to-rose-600',
        lightText: 'text-pink-100',
        badge: 'Administradora',
        avatar: '👑',
        route: '/app/vilma',
    },
    {
        id: 'maria' as const,
        name: 'Maria E. Castro',
        pin: '2026',
        isAdmin: false,
        isSuperAdmin: false,
        gradient: 'from-teal-500 to-teal-700',
        lightText: 'text-teal-100',
        badge: 'Vendedora',
        avatar: '🌺',
        route: '/app/maria',
    },
    {
        id: 'annabel' as const,
        name: 'Annabel Diaz',
        pin: '1979',
        isAdmin: false,
        isSuperAdmin: false,
        gradient: 'from-purple-500 to-violet-700',
        lightText: 'text-purple-100',
        badge: 'Vendedora',
        avatar: '✨',
        route: '/app/annabel',
    },
    {
        id: 'luis' as const,
        name: 'Luis Uchubanda',
        pin: '1619',
        isAdmin: true,
        isSuperAdmin: true, // Ve botón Bodega Luis
        gradient: 'from-blue-500 to-blue-700',
        lightText: 'text-blue-100',
        badge: 'Super Admin',
        avatar: '👔',
        route: '/app/luis',
    },
    {
        id: 'yuri' as const,
        name: 'Yuri Marquez',
        pin: '1619',
        isAdmin: false,
        isSuperAdmin: false,
        gradient: 'from-indigo-500 to-indigo-700',
        lightText: 'text-indigo-100',
        badge: 'Vendedora',
        avatar: '💫',
        route: '/app/yuri',
    },
    {
        id: 'jemima' as const,
        name: 'Jemima Vergara',
        pin: '1619',
        isAdmin: false,
        isSuperAdmin: false,
        gradient: 'from-orange-400 to-orange-600',
        lightText: 'text-orange-100',
        badge: 'Vendedora',
        avatar: '🌟',
        route: '/app/jemima',
    },
];

// ALL_SELLERS es igual a MAIN_SELLERS — todos son visibles para todos
export const ALL_SELLERS = MAIN_SELLERS;

// ─────────────────────────────────────────────────────────────────
// Helper: TODOS ven a TODOS en el menú
// Para entrar a cada uno se necesita el PIN de esa persona
// ─────────────────────────────────────────────────────────────────
export const getVisibleSellers = (_session: SellerSession | null) => {
    return MAIN_SELLERS;
};
