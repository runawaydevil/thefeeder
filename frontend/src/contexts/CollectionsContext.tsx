import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Collection } from '../lib/collections';
import {
  getCollections,
  createCollection as createCollectionUtil,
  deleteCollection as deleteCollectionUtil,
  addItemToCollection as addItemUtil,
  removeItemFromCollection as removeItemUtil,
  getFavorites,
  toggleFavorite,
} from '../lib/collections';

interface CollectionsContextType {
  collections: Collection[];
  favorites: number[];
  createCollection: (name: string, color?: string) => Collection;
  deleteCollection: (id: string) => void;
  addItemToCollection: (collectionId: string, itemId: number) => void;
  removeItemFromCollection: (collectionId: string, itemId: number) => void;
  isItemInFavorites: (itemId: number) => boolean;
  toggleFavorite: (itemId: number) => boolean;
  refresh: () => void;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>(getCollections());
  const [favorites, setFavorites] = useState<number[]>(getFavorites());

  const refresh = () => {
    setCollections(getCollections());
    setFavorites(getFavorites());
  };

  const createCollection = (name: string, color?: string) => {
    const collection = createCollectionUtil(name, color);
    refresh();
    return collection;
  };

  const deleteCollection = (id: string) => {
    deleteCollectionUtil(id);
    refresh();
  };

  const addItemToCollection = (collectionId: string, itemId: number) => {
    addItemUtil(collectionId, itemId);
    refresh();
  };

  const removeItemFromCollection = (collectionId: string, itemId: number) => {
    removeItemUtil(collectionId, itemId);
    refresh();
  };

  const isItemInFavorites = (itemId: number) => {
    return favorites.includes(itemId);
  };

  const toggleFavoriteWrapper = (itemId: number) => {
    const result = toggleFavorite(itemId);
    refresh();
    return result;
  };

  const value: CollectionsContextType = {
    collections,
    favorites,
    createCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
    isItemInFavorites,
    toggleFavorite: toggleFavoriteWrapper,
    refresh,
  };

  return (
    <CollectionsContext.Provider value={value}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error('useCollections must be used within CollectionsProvider');
  }
  return context;
}




