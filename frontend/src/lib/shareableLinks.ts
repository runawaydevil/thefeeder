import type { Collection } from './collections';

export function encodeCollection(collection: Collection): string {
  const data = JSON.stringify(collection);
  // Base64 encode
  return btoa(encodeURIComponent(data));
}

export function decodeCollection(encoded: string): Collection | null {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding collection:', error);
    return null;
  }
}

export function generateShareUrl(collection: Collection): string {
  const encoded = encodeCollection(collection);
  return `${window.location.origin}/#/shared/${encoded}`;
}

export function getCollectionFromUrl(): Collection | null {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  const match = hash.match(/^#\/shared\/(.+)$/);
  
  if (match && match[1]) {
    return decodeCollection(match[1]);
  }
  
  return null;
}

// Share card generation helpers
export function extractCollectionData(collection: Collection, items: any[]) {
  const collectionItems = collection.itemIds
    .map(id => items.find(item => item.id === id))
    .filter(Boolean);
  
  return {
    name: collection.name,
    count: collectionItems.length,
    items: collectionItems.slice(0, 3), // First 3 items for preview
    color: collection.color || '#3b82f6',
  };
}




