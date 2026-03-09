export interface SellerSession {
    id: 'vilma' | 'maria' | 'annabel';
    name: string;
    isAdmin: boolean;
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
        pin: '1619',
        isAdmin: false,
        gradient: 'from-purple-500 to-violet-700',
        lightText: 'text-purple-100',
        badge: 'Vendedora',
        avatar: '✨',
        route: '/app/annabel',
    },
];
// Fin de archivo
