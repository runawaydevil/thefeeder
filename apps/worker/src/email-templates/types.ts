import type { Item, Feed } from "../types/prisma.js";

/**
 * Options for generating HTML digest email
 */
export interface DigestHtmlOptions {
  name: string;
  items: (Item & { feed: Feed })[];
  siteUrl: string;
  logoUrl: string;
  unsubscribeUrl: string;
  viewInBrowserUrl?: string;
  timezone: string;
}

/**
 * Options for generating plain text digest email
 */
export interface DigestTextOptions {
  name: string;
  items: (Item & { feed: Feed })[];
  siteUrl: string;
  unsubscribeUrl: string;
  timezone: string;
}
