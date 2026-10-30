const STORAGE_KEY = 'falconi_advisor_favorites';

export const favoritesService = {
  getFavoriteIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getFavorites(): string[] {
    return this.getFavoriteIds();
  },

  isFavorite(id: string): boolean {
    const list = this.getFavoriteIds();
    return list.includes(id);
  },

  toggleFavorite(id: string): string[] {
    const list = this.getFavoriteIds();
    let updated: string[];

    if (list.includes(id)) {
      updated = list.filter(i => i !== id);
    } else {
      updated = [...list, id];
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving favorite:', e);
    }

    return updated;
  },

  clearFavorites(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing favorites:', e);
    }
  }
};
