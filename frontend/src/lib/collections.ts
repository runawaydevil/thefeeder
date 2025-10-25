export interface Collection {
  id: string;
  name: string;
  itemIds: number[];
  createdAt: string;
  updatedAt: string;
  color?: string;
  description?: string;
}

const STORAGE_KEY = 'pablo-feeds-collections';

export function getCollections(): Collection[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading collections:', error);
  }
  return [];
}

export function saveCollections(collections: Collection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch (error) {
    console.error('Error saving collections:', error);
  }
}

export function createCollection(name: string, color?: string): Collection {
  const collection: Collection = {
    id: `collection-${Date.now()}`,
    name,
    itemIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    color: color || '#3b82f6',
    description: '',
  };

  const collections = getCollections();
  collections.push(collection);
  saveCollections(collections);

  return collection;
}

export function deleteCollection(id: string): void {
  const collections = getCollections();
  const updated = collections.filter(c => c.id !== id);
  saveCollections(updated);
}

export function addItemToCollection(collectionId: string, itemId: number): void {
  const collections = getCollections();
  const collection = collections.find(c => c.id === collectionId);
  
  if (collection && !collection.itemIds.includes(itemId)) {
    collection.itemIds.push(itemId);
    collection.updatedAt = new Date().toISOString();
    saveCollections(collections);
  }
}

export function removeItemFromCollection(collectionId: string, itemId: number): void {
  const collections = getCollections();
  const collection = collections.find(c => c.id === collectionId);
  
  if (collection) {
    collection.itemIds = collection.itemIds.filter(id => id !== itemId);
    collection.updatedAt = new Date().toISOString();
    saveCollections(collections);
  }
}

export function isItemInCollection(collectionId: string, itemId: number): boolean {
  const collections = getCollections();
  const collection = collections.find(c => c.id === collectionId);
  return collection ? collection.itemIds.includes(itemId) : false;
}

export function getItemCollections(itemId: number): Collection[] {
  const collections = getCollections();
  return collections.filter(c => c.itemIds.includes(itemId));
}

// Favorites (special collection)
const FAVORITES_KEY = 'pablo-feeds-favorites';

export function getFavorites(): number[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading favorites:', error);
  }
  return [];
}

export function saveFavorites(itemIds: number[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(itemIds));
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
}

export function addToFavorites(itemId: number): void {
  const favorites = getFavorites();
  if (!favorites.includes(itemId)) {
    favorites.push(itemId);
    saveFavorites(favorites);
  }
}

export function removeFromFavorites(itemId: number): void {
  const favorites = getFavorites();
  const updated = favorites.filter(id => id !== itemId);
  saveFavorites(updated);
}

export function isFavorite(itemId: number): boolean {
  return getFavorites().includes(itemId);
}

export function toggleFavorite(itemId: number): boolean {
  const isAlreadyFavorite = isFavorite(itemId);
  if (isAlreadyFavorite) {
    removeFromFavorites(itemId);
  } else {
    addToFavorites(itemId);
  }
  return !isAlreadyFavorite;
}




