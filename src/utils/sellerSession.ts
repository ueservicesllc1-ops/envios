export interface SellerSession {
    id: 'vilma' | 'maria' | 'annabel' | 'yuri' | 'luis';
    name: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
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

export const MAIN_SELLERS = [
    {
        id: 'vilma' as const,
        name: 'Vilma Uchubanda',
        pin: '2014',
        isAdmin: true,
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
        gradient: 'from-purple-500 to-violet-700',
        lightText: 'text-purple-100',
        badge: 'Vendedora',
        avatar: '✨',
        route: '/app/annabel',
    },
    {
        id: 'yuri' as const,
        name: 'Yuri Marquez',
        pin: '1980',
        isAdmin: false,
        gradient: 'from-indigo-500 to-indigo-700',
        lightText: 'text-indigo-100',
        badge: 'Vendedora',
        avatar: '💫',
        route: '/app/yuri',
    },
    {
        id: 'luis' as const,
        name: 'Luis Uchubanda',
        pin: '1619',
        isAdmin: true,
        gradient: 'from-blue-500 to-blue-700',
        lightText: 'text-blue-100',
        badge: 'Admin',
        avatar: '👔',
        route: '/app/luis',
    },
];
// Alias para compatibilidad con AppLuis (transferencias entre vendedores)
export const ALL_SELLERS = MAIN_SELLERS;
// Fin de archivo
