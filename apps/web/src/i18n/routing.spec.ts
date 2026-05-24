import { describe, expect, it } from 'vitest';
import enMessages from './messages/en.json';
import esMessages from './messages/es.json';
import { routing } from './routing';

describe('i18n routing', () => {
  it('uses Spanish as the default locale and supports English', () => {
    expect(routing.defaultLocale).toBe('es');
    expect(routing.locales).toEqual(['es', 'en']);
  });

  it('keeps the core translation namespaces available in both locales', () => {
    const requiredNamespaces = [
      'account',
      'admin',
      'auth',
      'cart',
      'checkout',
      'common',
      'home',
      'metadata',
      'navigation',
      'products',
      'validation',
    ] as const;

    for (const namespace of requiredNamespaces) {
      expect(esMessages).toHaveProperty(namespace);
      expect(enMessages).toHaveProperty(namespace);
    }
  });
});
