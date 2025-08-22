import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'betting_house_favorites';
const USAGE_KEY = 'betting_house_usage';

export function useFavoriteHouses() {
  const [favoriteHouses, setFavoriteHouses] = useState<string[]>([]);
  const [houseUsage, setHouseUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load favorites and usage from localStorage
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    const storedUsage = localStorage.getItem(USAGE_KEY);

    if (storedFavorites) {
      try {
        setFavoriteHouses(JSON.parse(storedFavorites));
      } catch (e) {
        console.error('Error parsing stored favorites:', e);
      }
    }

    if (storedUsage) {
      try {
        setHouseUsage(JSON.parse(storedUsage));
      } catch (e) {
        console.error('Error parsing stored usage:', e);
      }
    }
  }, []);

  const trackHouseUsage = (house: string) => {
    if (!house) return;

    setHouseUsage(prev => {
      const newUsage = { ...prev, [house]: (prev[house] || 0) + 1 };
      localStorage.setItem(USAGE_KEY, JSON.stringify(newUsage));
      return newUsage;
    });

    // Auto-add to favorites if used frequently (2+ times)
    if ((houseUsage[house] || 0) >= 1) {
      addToFavorites(house);
    }
  };

  const addToFavorites = (house: string) => {
    setFavoriteHouses(prev => {
      if (prev.includes(house)) return prev;
      const newFavorites = [house, ...prev].slice(0, 5); // Keep top 5 favorites
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const removeFromFavorites = (house: string) => {
    setFavoriteHouses(prev => {
      const newFavorites = prev.filter(h => h !== house);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Get top suggestions based on usage
  const getTopSuggestions = (limit = 5) => {
    return Object.entries(houseUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([house]) => house)
      .filter(house => (houseUsage[house] || 0) >= 2); // Only show houses used 2+ times
  };

  return {
    favoriteHouses,
    houseUsage,
    trackHouseUsage,
    addToFavorites,
    removeFromFavorites,
    getTopSuggestions,
  };
}