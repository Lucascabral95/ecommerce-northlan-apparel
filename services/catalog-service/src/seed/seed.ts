import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaClient } from '../generated/prisma';
import { createSlug } from '../catalog/slug';
import {
  legacyBrands,
  legacyColors,
  legacyProductImages,
  legacyProducts,
  type LegacyColorSeed,
  type LegacyProductImageSeed,
  type LegacyProductSeed,
} from './devre-catalog-dataset';

const prisma = new PrismaClient();

const storefrontBaseUrl =
  process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() ||
  `http://localhost:${process.env.WEB_PORT?.trim() || '3000'}`;

const defaultCareInstructions =
  'Lavar con agua fria, usar ciclo suave, no usar secadora y secar a la sombra para preservar color y estructura.';

type CategoryKey =
  | 'camisas'
  | 'camisas-de-vestir'
  | 'camperas'
  | 'chombas'
  | 'jeans'
  | 'pantalones'
  | 'pantalones-de-vestir'
  | 'remeras'
  | 'remeras-manga-larga'
  | 'sacos'
  | 'sobretodos'
  | 'sweaters'
  | 'trajes';

type ProductFit = 'OVERSIZED' | 'REGULAR' | 'RELAXED' | 'SLIM';
type ProductSeason = 'ALL_SEASON' | 'MID_SEASON' | 'SUMMER' | 'WINTER';
type ProductType =
  | 'ACCESSORY'
  | 'DRESS'
  | 'HOODIE'
  | 'JACKET'
  | 'JEANS'
  | 'OTHER'
  | 'PANTS'
  | 'SHIRT'
  | 'SHOES'
  | 'SWEATER'
  | 'T_SHIRT';

type SeedCategoryDefinition = Readonly<{
  description: string;
  imageUrl: string;
  key: CategoryKey;
  name: string;
  parentKey?: CategoryKey;
  slug: string;
}>;

type SeededCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
}>;

type LegacyCategoryMapping = Readonly<{
  categoryKey: CategoryKey;
  collection: string;
  defaultSizes: readonly string[];
  productType: ProductType;
  season: ProductSeason;
  stockBase: number;
  subcategoryKey?: CategoryKey;
  weightInGrams: number;
}>;

const categoryDefinitions: readonly SeedCategoryDefinition[] = [
  {
    description: 'Tejidos y sweaters para capas de invierno con foco en textura y confort.',
    imageUrl:
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    key: 'sweaters',
    name: 'Sweaters',
    slug: 'sweaters',
  },
  {
    description: 'Camperas urbanas y abrigos de media estacion con impronta contemporanea.',
    imageUrl:
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80',
    key: 'camperas',
    name: 'Camperas',
    slug: 'camperas',
  },
  {
    description: 'Sobretodos y abrigos largos para una silueta mas formal durante el invierno.',
    imageUrl:
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
    key: 'sobretodos',
    name: 'Sobretodos',
    slug: 'sobretodos',
  },
  {
    description: 'Remeras y capas livianas para el uso diario con fit limpio y versatil.',
    imageUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    key: 'remeras',
    name: 'Remeras',
    slug: 'remeras',
  },
  {
    description: 'Denim y jeans de corte actual para uso cotidiano.',
    imageUrl:
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80',
    key: 'jeans',
    name: 'Jeans',
    slug: 'jeans',
  },
  {
    description: 'Sacos y sastreria casual para contextos smart casual y formales.',
    imageUrl:
      'https://images.unsplash.com/photo-1593032465171-8bd4c5b6d602?auto=format&fit=crop&w=1200&q=80',
    key: 'sacos',
    name: 'Sacos',
    slug: 'sacos',
  },
  {
    description: 'Camisas de vestir y esenciales de sastreria con foco en fit y estructura.',
    imageUrl:
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1200&q=80',
    key: 'camisas',
    name: 'Camisas',
    slug: 'camisas',
  },
  {
    description: 'Pantalones de vestir y bases formales de uso diario.',
    imageUrl:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    key: 'pantalones',
    name: 'Pantalones',
    slug: 'pantalones',
  },
  {
    description: 'Trajes completos y conjuntos de sastreria para ocasiones formales.',
    imageUrl:
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
    key: 'trajes',
    name: 'Trajes',
    slug: 'trajes',
  },
  {
    description: 'Polos y chombas con construccion premium para climas templados y calidos.',
    imageUrl:
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    key: 'chombas',
    name: 'Chombas',
    slug: 'chombas',
  },
  {
    description: 'Remeras manga larga para capas de media estacion.',
    imageUrl:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    key: 'remeras-manga-larga',
    name: 'Remeras Manga Larga',
    parentKey: 'remeras',
    slug: 'remeras-manga-larga',
  },
  {
    description: 'Camisas pensadas para sastreria, oficina y eventos.',
    imageUrl:
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1200&q=80',
    key: 'camisas-de-vestir',
    name: 'Camisas de Vestir',
    parentKey: 'camisas',
    slug: 'camisas-de-vestir',
  },
  {
    description: 'Pantalones de vestir con fit actual y perfil formal.',
    imageUrl:
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
    key: 'pantalones-de-vestir',
    name: 'Pantalones de Vestir',
    parentKey: 'pantalones',
    slug: 'pantalones-de-vestir',
  },
];

const legacyCategoryMappings = new Map<string, LegacyCategoryMapping>([
  [
    '1a2b3c4d-5e6f-4789-a012-123456789abc',
    {
      categoryKey: 'sweaters',
      collection: 'Tejidos de Invierno',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'SWEATER',
      season: 'WINTER',
      stockBase: 12,
      weightInGrams: 620,
    },
  ],
  [
    '2b3c4d5e-6f7a-4890-b123-23456789abcd',
    {
      categoryKey: 'camperas',
      collection: 'Abrigos Urbanos',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'JACKET',
      season: 'WINTER',
      stockBase: 8,
      weightInGrams: 900,
    },
  ],
  [
    '5e6f7a8b-9c0d-4123-e456-56789abcdef0',
    {
      categoryKey: 'sobretodos',
      collection: 'Abrigos Urbanos',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'JACKET',
      season: 'WINTER',
      stockBase: 6,
      weightInGrams: 1400,
    },
  ],
  [
    '3c4d5e6f-7a8b-4901-c234-3456789abcde',
    {
      categoryKey: 'remeras',
      collection: 'Capas Esenciales',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'T_SHIRT',
      season: 'MID_SEASON',
      stockBase: 14,
      subcategoryKey: 'remeras-manga-larga',
      weightInGrams: 280,
    },
  ],
  [
    '6f7a8b9c-0d1e-32432-f567-6789abcdef01',
    {
      categoryKey: 'jeans',
      collection: 'Denim Diario',
      defaultSizes: ['40', '42', '44', '46', '48'],
      productType: 'JEANS',
      season: 'ALL_SEASON',
      stockBase: 9,
      weightInGrams: 760,
    },
  ],
  [
    '6fddfssdf-0d1e-4234-f567-6789abcdef01',
    {
      categoryKey: 'sacos',
      collection: 'Sastreria Contemporanea',
      defaultSizes: ['48', '50', '52', '54'],
      productType: 'JACKET',
      season: 'MID_SEASON',
      stockBase: 7,
      weightInGrams: 980,
    },
  ],
  [
    '6f7a8b9c-0d1e-4234-2222-6789abcdef01',
    {
      categoryKey: 'camisas',
      collection: 'Sastreria Contemporanea',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'SHIRT',
      season: 'ALL_SEASON',
      stockBase: 10,
      subcategoryKey: 'camisas-de-vestir',
      weightInGrams: 360,
    },
  ],
  [
    '6f7a8b9c-0d1e-4234-f567-6789abcdef01',
    {
      categoryKey: 'pantalones',
      collection: 'Sastreria Contemporanea',
      defaultSizes: ['40', '42', '44', '46', '48'],
      productType: 'PANTS',
      season: 'ALL_SEASON',
      stockBase: 10,
      subcategoryKey: 'pantalones-de-vestir',
      weightInGrams: 650,
    },
  ],
  [
    '6f7a8b9c-0q23d1e-4234-2222-6789abcdef82',
    {
      categoryKey: 'trajes',
      collection: 'Sastreria Contemporanea',
      defaultSizes: ['48', '50', '52', '54'],
      productType: 'OTHER',
      season: 'ALL_SEASON',
      stockBase: 5,
      weightInGrams: 1450,
    },
  ],
  [
    '6f7a8b9c-uygw7u83-4234-2222-6789abcdes83',
    {
      categoryKey: 'chombas',
      collection: 'Polos de Verano',
      defaultSizes: ['S', 'M', 'L', 'XL'],
      productType: 'T_SHIRT',
      season: 'SUMMER',
      stockBase: 14,
      weightInGrams: 260,
    },
  ],
]);

const categoryCodeByKey: Readonly<Record<CategoryKey, string>> = {
  camisas: 'CMS',
  'camisas-de-vestir': 'CMDV',
  camperas: 'CMP',
  chombas: 'CHM',
  jeans: 'JNS',
  pantalones: 'PNT',
  'pantalones-de-vestir': 'PDV',
  remeras: 'RMR',
  'remeras-manga-larga': 'RML',
  sacos: 'SCO',
  sobretodos: 'SBT',
  sweaters: 'SWT',
  trajes: 'TRJ',
};

const colorAliases = [
  { aliases: ['azul marino'], colorName: 'Azul Marino' },
  { aliases: ['verde oscuro'], colorName: 'Verde Oscuro' },
  { aliases: ['gris oscuro'], colorName: 'Gris Oscuro' },
  { aliases: ['gris claro'], colorName: 'Gris Claro' },
  { aliases: ['celeste claro'], colorName: 'Celeste Claro' },
  { aliases: ['verde oliva'], colorName: 'Verde Oliva' },
  { aliases: ['verde claro'], colorName: 'Verde Claro' },
  { aliases: ['verde malva'], colorName: 'Verde Malva' },
  { aliases: ['azul stone'], colorName: 'Azul Stone' },
  { aliases: ['azul claro'], colorName: 'Azul Claro' },
  { aliases: ['azulino'], colorName: 'Azulino' },
  { aliases: ['borravino'], colorName: 'Borravino' },
  { aliases: ['terracota'], colorName: 'Terracota' },
  { aliases: ['petroleo'], colorName: 'Petroleo' },
  { aliases: ['cemento'], colorName: 'Cemento' },
  { aliases: ['tostado'], colorName: 'Tostado' },
  { aliases: ['marron oscuro', 'marron'], colorName: 'Marron' },
  { aliases: ['beige'], colorName: 'Beige' },
  { aliases: ['crudo'], colorName: 'Crudo' },
  { aliases: ['arena'], colorName: 'Arena' },
  { aliases: ['tiza'], colorName: 'Tiza' },
  { aliases: ['acero'], colorName: 'Acero' },
  { aliases: ['celeste'], colorName: 'Celeste' },
  { aliases: ['bordeau', 'bordo'], colorName: 'Bordo' },
  { aliases: ['rosa'], colorName: 'Rosa' },
  { aliases: ['gris'], colorName: 'Gris' },
  { aliases: ['verde'], colorName: 'Verde' },
  { aliases: ['azul'], colorName: 'Azul' },
  { aliases: ['blanca', 'blanco'], colorName: 'Blanco' },
  { aliases: ['negra', 'negro'], colorName: 'Negro' },
] as const;

const normalizedColorAliases = [...colorAliases].sort((left, right) => {
  const leftSize = Math.max(...left.aliases.map((alias) => alias.length));
  const rightSize = Math.max(...right.aliases.map((alias) => alias.length));

  return rightSize - leftSize;
});

async function main(): Promise<void> {
  const deduplicatedProducts = deduplicateLegacyProducts(legacyProducts);
  const imagesByLegacyProductId = groupImagesByLegacyProductId(legacyProductImages);

  await resetCatalog();
  const brandNameById = await seedBrands();
  const categoryByKey = await seedCategories();
  await seedCollections();

  const usedSlugs = new Set<string>();

  for (const [productIndex, legacyProduct] of deduplicatedProducts.entries()) {
    const legacyCategory = legacyCategoryMappings.get(legacyProduct.categoryId);
    if (!legacyCategory) {
      throw new Error(`Unsupported legacy category ${legacyProduct.categoryId} for product ${legacyProduct.legacyId}.`);
    }

    const category = categoryByKey.get(legacyCategory.categoryKey);
    if (!category) {
      throw new Error(`Missing category ${legacyCategory.categoryKey}.`);
    }

    const subcategory = legacyCategory.subcategoryKey
      ? categoryByKey.get(legacyCategory.subcategoryKey)
      : undefined;

    const title = legacyProduct.name.trim();
    const slug = buildUniqueSlug(legacyProduct.slug || title, legacyProduct.legacyId, usedSlugs);
    const color = deriveColor(title, legacyProduct.description);
    const composition = extractComposition(legacyProduct.description);
    const material = deriveMaterial(title, legacyProduct.description, composition, legacyCategory.categoryKey);
    const fit = deriveFit(title, legacyProduct.description);
    const isActive = legacyProduct.status === 'ACTIVE';
    const compareAtPrice = deriveCompareAtPrice(legacyProduct.basePrice, legacyProduct.legacyId);
    const publicUrl = `${storefrontBaseUrl.replace(/\/$/, '')}/products/${slug}`;
    const skuBase = buildSkuBase(legacyCategory.categoryKey, legacyProduct.legacyId);
    const flags = deriveFeatureFlags(legacyProduct.legacyId, legacyCategory.categoryKey, legacyProduct.basePrice);
    const images = buildProductImages(
      title,
      slug,
      imagesByLegacyProductId.get(legacyProduct.legacyId) ?? [],
      color,
    );
    const variants = buildProductVariants({
      color,
      legacyId: legacyProduct.legacyId,
      mapping: legacyCategory,
      productIndex,
      skuBase,
    });
    const rating = deriveAverageRating(legacyProduct.legacyId);
    const totalReviews = deriveTotalReviews(legacyProduct.legacyId);

    await prisma.product.create({
      data: {
        averageRating: rating,
        brand: brandNameById.get(legacyProduct.brandId) ?? legacyBrands[0]?.name ?? 'Northlane Apparel',
        canonicalUrl: publicUrl,
        careInstructions: deriveCareInstructions(material, legacyCategory.categoryKey),
        categoryId: category.id,
        categoryName: category.name,
        collection: legacyCategory.collection,
        compareAtPrice,
        composition,
        costPrice: roundCurrency(legacyProduct.basePrice * 0.48),
        currency: 'ARS',
        description: normalizeSentenceSpacing(legacyProduct.description),
        discountPercentage:
          compareAtPrice && compareAtPrice > legacyProduct.basePrice
            ? roundPercentage(((compareAtPrice - legacyProduct.basePrice) / compareAtPrice) * 100)
            : 0,
        externalUrl: publicUrl,
        fit,
        genderTarget: 'MEN',
        images: {
          create: images,
        },
        isActive,
        isBestSeller: flags.isBestSeller,
        isFeatured: flags.isFeatured,
        isNewArrival: flags.isNewArrival,
        material,
        price: legacyProduct.basePrice,
        productType: legacyCategory.productType,
        seoDescription: buildSeoDescription(title, legacyProduct.description),
        seoTitle: `${title} | Northlane Apparel`,
        season: legacyCategory.season,
        shortDescription: buildShortDescription(legacyProduct.description),
        skuBase,
        slug,
        subcategoryId: subcategory?.id,
        subcategoryName: subcategory?.name,
        tags: [
          ...buildTags({
            category,
            color,
            composition,
            fit,
            material,
            productType: legacyCategory.productType,
            season: legacyCategory.season,
            subcategory,
            title,
          }),
        ],
        taxRate: 0.21,
        title,
        totalReviews,
        variants: {
          create: variants,
        },
      },
    });
  }

  console.log(
    `Seeded ${deduplicatedProducts.length} catalog products, ${categoryDefinitions.length} categories and ${legacyBrands.length} brands.`,
  );
}

async function resetCatalog(): Promise<void> {
  await prisma.$transaction([
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.brand.deleteMany(),
  ]);
}

async function seedBrands(): Promise<ReadonlyMap<string, string>> {
  const brandNameById = new Map<string, string>();

  for (const brand of legacyBrands) {
    const createdBrand = await prisma.brand.create({
      data: {
        isActive: true,
        name: brand.name,
        slug: createSlug(brand.slug || brand.name),
      },
    });

    brandNameById.set(brand.id, createdBrand.name);
  }

  return brandNameById;
}

async function seedCategories(): Promise<ReadonlyMap<CategoryKey, SeededCategory>> {
  const categories = new Map<CategoryKey, SeededCategory>();

  for (const definition of categoryDefinitions) {
    const parentId = definition.parentKey ? categories.get(definition.parentKey)?.id : undefined;
    const category = await prisma.category.create({
      data: {
        description: definition.description,
        imageUrl: definition.imageUrl,
        isActive: true,
        name: definition.name,
        parentId,
        slug: definition.slug,
      },
    });

    categories.set(definition.key, {
      id: category.id,
      name: category.name,
      slug: category.slug,
    });
  }

  return categories;
}

async function seedCollections(): Promise<void> {
  const collectionNames = uniqueSorted(
    [...legacyCategoryMappings.values()].map((mapping) => mapping.collection),
  );

  for (const collectionName of collectionNames) {
    await prisma.collection.create({
      data: {
        description: `Coleccion ${collectionName} cargada desde el seed curado del catalogo.`,
        isActive: true,
        name: collectionName,
        slug: createSlug(collectionName),
      },
    });
  }
}

function deduplicateLegacyProducts(products: readonly LegacyProductSeed[]): readonly LegacyProductSeed[] {
  const fingerprints = new Set<string>();

  return products.filter((product) => {
    const fingerprint = [
      createSlug(stripDuplicateSuffix(product.name)),
      normalizeForMatch(product.description),
      product.basePrice,
      product.categoryId,
    ].join('|');

    if (fingerprints.has(fingerprint)) {
      return false;
    }

    fingerprints.add(fingerprint);
    return true;
  });
}

function groupImagesByLegacyProductId(
  images: readonly LegacyProductImageSeed[],
): ReadonlyMap<string, readonly LegacyProductImageSeed[]> {
  const groupedImages = new Map<string, LegacyProductImageSeed[]>();

  for (const image of images) {
    const productImages = groupedImages.get(image.legacyProductId) ?? [];
    productImages.push(image);
    groupedImages.set(image.legacyProductId, productImages);
  }

  return groupedImages;
}

function buildUniqueSlug(baseValue: string, legacyId: string, usedSlugs: Set<string>): string {
  const baseSlug = createSlug(baseValue) || `producto-${createSlug(legacyId)}`;
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  const candidate = `${baseSlug}-${buildShortHash(legacyId, 6)}`;
  usedSlugs.add(candidate);
  return candidate;
}

function buildSkuBase(categoryKey: CategoryKey, legacyId: string): string {
  return `DEV-${categoryCodeByKey[categoryKey]}-${buildShortHash(legacyId, 6).toUpperCase()}`;
}

function buildProductImages(
  title: string,
  slug: string,
  images: readonly LegacyProductImageSeed[],
  color: LegacyColorSeed,
) {
  if (images.length === 0) {
    return [
      {
        altText: `${title} - vista principal`,
        isPrimary: true,
        position: 0,
        url: `https://placehold.co/1200x1600/${color.hex.replace('#', '')}/FFFFFF?text=${encodeURIComponent(slug)}`,
      },
    ];
  }

  return images.map((image, index) => ({
    altText: image.alt || `${title} - vista ${index + 1}`,
    isPrimary: index === 0,
    position: index,
    url: image.url,
  }));
}

function buildProductVariants(input: {
  color: LegacyColorSeed;
  legacyId: string;
  mapping: LegacyCategoryMapping;
  productIndex: number;
  skuBase: string;
}) {
  const colorCode = compactToken(input.color.name);

  return input.mapping.defaultSizes.map((size, sizeIndex) => ({
    barcode: buildBarcode(input.legacyId, size),
    colorHex: input.color.hex,
    colorName: input.color.name,
    isActive: true,
    reservedStock: 0,
    size,
    sku: `${input.skuBase}-${colorCode}-${compactToken(size)}`,
    stock: input.mapping.stockBase + ((input.productIndex + sizeIndex) % 5),
    weightInGrams: input.mapping.weightInGrams,
  }));
}

function deriveColor(title: string, description: string): LegacyColorSeed {
  const haystack = normalizeForMatch(`${title} ${description}`);

  for (const colorAlias of normalizedColorAliases) {
    if (colorAlias.aliases.some((alias) => haystack.includes(alias))) {
      const matchingColor = legacyColors.find((color) => color.name === colorAlias.colorName);
      if (matchingColor) {
        return matchingColor;
      }
    }
  }

  const fallbackColor = legacyColors.find((color) => color.name === 'Negro') ?? legacyColors[0];
  if (!fallbackColor) {
    throw new Error('Legacy color catalog is empty.');
  }

  return fallbackColor;
}

function extractComposition(description: string): string {
  const percentageSentence = description.match(/(\d+%[^.]+)/i);
  if (!percentageSentence) {
    return 'Composicion no especificada';
  }

  const composition = percentageSentence[1];
  if (!composition) {
    return 'Composicion no especificada';
  }

  return normalizeSentenceSpacing(composition);
}

function deriveMaterial(
  title: string,
  description: string,
  composition: string,
  categoryKey: CategoryKey,
): string {
  const haystack = normalizeForMatch(`${title} ${description}`);

  if (haystack.includes('denim') || haystack.includes('jean')) {
    return 'Denim stretch';
  }

  if (haystack.includes('pique')) {
    return 'Pique premium';
  }

  if (haystack.includes('jersey')) {
    return 'Jersey de algodon';
  }

  if (haystack.includes('gabardina')) {
    return 'Gabardina elastizada';
  }

  if (haystack.includes('corderoy')) {
    return 'Corderoy';
  }

  if (haystack.includes('pana')) {
    return 'Pana lisa';
  }

  if (haystack.includes('velour')) {
    return 'Velour fantasia';
  }

  if (haystack.includes('polera') || haystack.includes('sweater')) {
    return 'Tejido de punto';
  }

  if (categoryKey === 'camperas') {
    return 'Poliamida tecnica';
  }

  if (categoryKey === 'sobretodos') {
    return 'Pano tecnico';
  }

  if (categoryKey === 'sacos' || categoryKey === 'trajes') {
    return 'Sastreria texturada';
  }

  const normalizedComposition = normalizeForMatch(composition);
  if (normalizedComposition.includes('algodon')) {
    return 'Algodon';
  }
  if (normalizedComposition.includes('viscosa')) {
    return 'Viscosa';
  }
  if (normalizedComposition.includes('poliester')) {
    return 'Poliester';
  }

  return 'Textil premium';
}

function deriveFit(title: string, description: string): ProductFit {
  const haystack = normalizeForMatch(`${title} ${description}`);

  if (haystack.includes('oversized')) {
    return 'OVERSIZED';
  }

  if (haystack.includes('relaxed')) {
    return 'RELAXED';
  }

  if (haystack.includes('ultra slim') || haystack.includes('slim fit') || haystack.includes('slim')) {
    return 'SLIM';
  }

  return 'REGULAR';
}

function deriveCareInstructions(material: string, categoryKey: CategoryKey): string {
  const materialKey = normalizeForMatch(material);

  if (materialKey.includes('denim')) {
    return 'Lavar del reves con agua fria, no usar blanqueador y secar a la sombra para conservar el tono del denim.';
  }

  if (materialKey.includes('pique') || materialKey.includes('jersey') || materialKey.includes('algodon')) {
    return 'Lavar con agua fria, no usar secadora y planchar del reves a baja temperatura.';
  }

  if (categoryKey === 'camperas' || categoryKey === 'sobretodos' || categoryKey === 'sacos' || categoryKey === 'trajes') {
    return 'Limpieza profesional recomendada o lavado suave en frio segun composicion. No usar secadora.';
  }

  return defaultCareInstructions;
}

function deriveCompareAtPrice(basePrice: number, legacyId: string): number | undefined {
  const hash = buildNumericHash(legacyId);
  if (hash % 4 !== 0) {
    return undefined;
  }

  return roundCurrency(basePrice * 1.18);
}

function deriveFeatureFlags(legacyId: string, categoryKey: CategoryKey, basePrice: number) {
  const hash = buildNumericHash(legacyId);
  const premiumCategory = categoryKey === 'sobretodos' || categoryKey === 'sacos' || categoryKey === 'trajes';

  return {
    isBestSeller:
      hash % 5 === 0 &&
      ['sweaters', 'camperas', 'remeras', 'jeans', 'chombas'].includes(categoryKey),
    isFeatured: premiumCategory || basePrice >= 120000 || hash % 7 === 0,
    isNewArrival:
      hash % 6 === 0 &&
      ['remeras', 'camisas', 'chombas', 'camperas'].includes(categoryKey),
  };
}

function deriveAverageRating(legacyId: string): number {
  const hash = buildNumericHash(legacyId);
  return Number((4.2 + (hash % 7) * 0.1).toFixed(2));
}

function deriveTotalReviews(legacyId: string): number {
  const hash = buildNumericHash(legacyId);
  return 12 + (hash % 37);
}

function buildShortDescription(description: string): string {
  const [firstSentence] = description.split('.');
  const normalizedSentence = normalizeSentenceSpacing(firstSentence || description);

  return normalizedSentence.length <= 160
    ? normalizedSentence
    : `${normalizedSentence.slice(0, 157).trimEnd()}...`;
}

function buildSeoDescription(title: string, description: string): string {
  const baseDescription = `${title}. ${buildShortDescription(description)} Disponible en Northlane Apparel.`;
  return baseDescription.length <= 160 ? baseDescription : `${baseDescription.slice(0, 157).trimEnd()}...`;
}

function buildTags(input: {
  category: SeededCategory;
  color: LegacyColorSeed;
  composition: string;
  fit: ProductFit;
  material: string;
  productType: ProductType;
  season: ProductSeason;
  subcategory?: SeededCategory;
  title: string;
}): readonly string[] {
  const normalizedText = normalizeForMatch(`${input.title} ${input.material} ${input.composition}`);
  const tags = new Set<string>([
    input.category.slug,
    createSlug(input.color.name),
    createSlug(input.fit.replaceAll('_', ' ')),
    createSlug(input.material),
    createSlug(input.productType.replaceAll('_', ' ')),
    createSlug(input.season.replaceAll('_', ' ')),
  ]);

  if (input.subcategory) {
    tags.add(input.subcategory.slug);
  }

  if (normalizedText.includes('algodon')) {
    tags.add('algodon');
  }
  if (normalizedText.includes('poliester')) {
    tags.add('poliester');
  }
  if (normalizedText.includes('viscosa')) {
    tags.add('viscosa');
  }
  if (normalizedText.includes('rayon')) {
    tags.add('rayon');
  }
  if (normalizedText.includes('poliamida')) {
    tags.add('poliamida');
  }
  if (normalizedText.includes('elastano') || normalizedText.includes('spandex')) {
    tags.add('elastano');
  }
  if (normalizedText.includes('lana')) {
    tags.add('lana');
  }
  if (normalizedText.includes('jersey')) {
    tags.add('jersey');
  }
  if (normalizedText.includes('pique')) {
    tags.add('pique');
  }
  if (normalizedText.includes('gabardina')) {
    tags.add('gabardina');
  }
  if (normalizedText.includes('denim') || normalizedText.includes('jean')) {
    tags.add('denim');
  }
  if (normalizedText.includes('fantasia')) {
    tags.add('fantasia');
  }

  if (['camisas', 'pantalones', 'sacos', 'trajes'].includes(input.category.slug)) {
    tags.add('formal');
  } else {
    tags.add('casual');
  }

  return uniqueSorted([...tags].filter(Boolean));
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeSentenceSpacing(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripDuplicateSuffix(value: string): string {
  return value.replace(/\s+ii$/i, '');
}

function compactToken(value: string): string {
  return createSlug(value).replace(/-/g, '').toUpperCase();
}

function buildShortHash(value: string, size: number): string {
  return createHash('sha1').update(value).digest('hex').slice(0, size);
}

function buildNumericHash(value: string): number {
  return Number.parseInt(createHash('sha1').update(value).digest('hex').slice(0, 8), 16);
}

function buildBarcode(legacyId: string, size: string): string {
  const digits = createHash('sha1')
    .update(`${legacyId}:${size}`)
    .digest('hex')
    .replace(/[a-f]/g, '')
    .slice(0, 13);

  return digits.padEnd(13, '0');
}

function roundCurrency(value: number): number {
  return Math.round(value / 10) * 10;
}

function roundPercentage(value: number): number {
  return Number(value.toFixed(2));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
