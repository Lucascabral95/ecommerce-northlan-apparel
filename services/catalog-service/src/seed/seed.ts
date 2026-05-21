import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { createSlug } from '../catalog/slug';

const prisma = new PrismaClient();

type SeedProduct = Readonly<{
  brand: string;
  categoryName: string;
  collection: string;
  colors: readonly Readonly<{ hex: string; name: string }>[];
  compareAtPrice?: number;
  composition: string;
  description: string;
  fit: 'OVERSIZED' | 'REGULAR' | 'RELAXED' | 'SLIM';
  genderTarget: 'KIDS' | 'MEN' | 'UNISEX' | 'WOMEN';
  isBestSeller?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  material: string;
  price: number;
  productType:
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
  season: 'ALL_SEASON' | 'MID_SEASON' | 'SUMMER' | 'WINTER';
  shortDescription: string;
  sizes: readonly string[];
  skuBase: string;
  stockBase: number;
  tags: readonly string[];
  title: string;
  weightInGrams: number;
}>;

const brands = ['Northlane', 'Urban Forge', 'Aurea Studio', 'Black River', 'Minimal Co.', 'Vanta Wear'];

const collections = [
  'Core Essentials',
  'Urban Winter',
  'Denim Lab',
  'Summer Edit',
  'Street Utility',
  'Premium Knitwear',
];

const categoryNames = [
  'Remeras',
  'Camisas',
  'Buzos',
  'Camperas',
  'Jeans',
  'Pantalones',
  'Vestidos',
  'Zapatillas',
  'Accesorios',
];

const products: readonly SeedProduct[] = [
  {
    brand: 'Northlane',
    categoryName: 'Remeras',
    collection: 'Core Essentials',
    colors: [
      { hex: '#111111', name: 'Black' },
      { hex: '#F2EFE8', name: 'Off White' },
    ],
    compareAtPrice: 59,
    composition: '100% cotton jersey, 240 GSM',
    description:
      'Remera oversized de algodón pesado con caída premium, cuello reforzado y terminaciones limpias para uso diario.',
    fit: 'OVERSIZED',
    genderTarget: 'UNISEX',
    isBestSeller: true,
    isFeatured: true,
    material: 'Heavy cotton jersey',
    price: 45,
    productType: 'T_SHIRT',
    season: 'ALL_SEASON',
    shortDescription: 'Remera oversized de algodón pesado con silueta minimalista.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    skuBase: 'NLA-TEE-ESS',
    stockBase: 18,
    tags: ['essential', 'oversized', 'cotton', 'streetwear'],
    title: 'Remera Oversized Essential',
    weightInGrams: 260,
  },
  {
    brand: 'Urban Forge',
    categoryName: 'Buzos',
    collection: 'Urban Winter',
    colors: [
      { hex: '#202124', name: 'Graphite' },
      { hex: '#6A7059', name: 'Olive' },
    ],
    compareAtPrice: 129,
    composition: '80% cotton, 20% recycled polyester fleece',
    description:
      'Hoodie heavyweight con interior frizado, capucha doble y bolsillo canguro. Diseñado para capas urbanas de invierno.',
    fit: 'RELAXED',
    genderTarget: 'UNISEX',
    isFeatured: true,
    material: 'Heavyweight fleece',
    price: 99,
    productType: 'HOODIE',
    season: 'WINTER',
    shortDescription: 'Hoodie premium pesado con interior frizado.',
    sizes: ['S', 'M', 'L', 'XL'],
    skuBase: 'UFG-HDY-HVY',
    stockBase: 14,
    tags: ['hoodie', 'winter', 'fleece', 'premium'],
    title: 'Hoodie Urban Heavyweight',
    weightInGrams: 780,
  },
  {
    brand: 'Black River',
    categoryName: 'Jeans',
    collection: 'Denim Lab',
    colors: [{ hex: '#1E3656', name: 'Dark Blue' }],
    composition: '98% cotton, 2% elastane',
    description:
      'Jean slim fit con denim oscuro, elasticidad moderada y costuras reforzadas para uso intensivo.',
    fit: 'SLIM',
    genderTarget: 'MEN',
    isBestSeller: true,
    material: 'Stretch denim',
    price: 112,
    productType: 'JEANS',
    season: 'ALL_SEASON',
    shortDescription: 'Jean slim fit en denim azul oscuro con elasticidad cómoda.',
    sizes: ['28', '30', '32', '34', '36'],
    skuBase: 'BRV-JNS-SLIM',
    stockBase: 12,
    tags: ['denim', 'slim', 'blue', 'everyday'],
    title: 'Jean Slim Fit Dark Blue',
    weightInGrams: 620,
  },
  {
    brand: 'Vanta Wear',
    categoryName: 'Camperas',
    collection: 'Urban Winter',
    colors: [{ hex: '#050505', name: 'Black' }],
    compareAtPrice: 189,
    composition: '100% recycled nylon shell, polyester lining',
    description:
      'Campera bomber negra con exterior satinado, forro interno liviano y puños acanalados.',
    fit: 'REGULAR',
    genderTarget: 'UNISEX',
    isFeatured: true,
    material: 'Recycled nylon',
    price: 149,
    productType: 'JACKET',
    season: 'MID_SEASON',
    shortDescription: 'Bomber negra minimalista con terminación satinada.',
    sizes: ['S', 'M', 'L', 'XL'],
    skuBase: 'VNT-JKT-BMB',
    stockBase: 9,
    tags: ['bomber', 'jacket', 'black', 'outerwear'],
    title: 'Campera Bomber Black',
    weightInGrams: 680,
  },
  {
    brand: 'Minimal Co.',
    categoryName: 'Camisas',
    collection: 'Core Essentials',
    colors: [
      { hex: '#FFFFFF', name: 'White' },
      { hex: '#9FB1C8', name: 'Sky Blue' },
    ],
    composition: '100% oxford cotton',
    description:
      'Camisa Oxford regular fit con estructura suave, cuello clásico y botones nacarados.',
    fit: 'REGULAR',
    genderTarget: 'MEN',
    material: 'Oxford cotton',
    price: 82,
    productType: 'SHIRT',
    season: 'ALL_SEASON',
    shortDescription: 'Camisa Oxford clásica de algodón con fit regular.',
    sizes: ['S', 'M', 'L', 'XL'],
    skuBase: 'MCO-SHT-OXF',
    stockBase: 15,
    tags: ['shirt', 'oxford', 'classic', 'minimal'],
    title: 'Camisa Oxford Regular',
    weightInGrams: 340,
  },
  {
    brand: 'Urban Forge',
    categoryName: 'Zapatillas',
    collection: 'Street Utility',
    colors: [
      { hex: '#E8E5DF', name: 'Bone' },
      { hex: '#2A2B2E', name: 'Charcoal' },
    ],
    composition: 'Mesh upper, rubber outsole, EVA midsole',
    description:
      'Zapatillas urbanas con suela liviana, upper respirable y silueta limpia para uso cotidiano.',
    fit: 'REGULAR',
    genderTarget: 'UNISEX',
    isNewArrival: true,
    material: 'Technical mesh and rubber',
    price: 138,
    productType: 'SHOES',
    season: 'ALL_SEASON',
    shortDescription: 'Zapatillas streetwear livianas con diseño técnico.',
    sizes: ['38', '39', '40', '41', '42', '43', '44'],
    skuBase: 'UFG-SHO-RUN',
    stockBase: 10,
    tags: ['sneakers', 'street', 'runner', 'new'],
    title: 'Zapatillas Street Runner',
    weightInGrams: 890,
  },
  {
    brand: 'Aurea Studio',
    categoryName: 'Vestidos',
    collection: 'Summer Edit',
    colors: [
      { hex: '#EFE7D8', name: 'Sand' },
      { hex: '#161616', name: 'Black' },
    ],
    composition: '70% viscose, 30% linen',
    description:
      'Vestido minimal de verano con mezcla de lino, caída fluida y breteles regulables.',
    fit: 'RELAXED',
    genderTarget: 'WOMEN',
    isFeatured: true,
    isNewArrival: true,
    material: 'Linen viscose blend',
    price: 96,
    productType: 'DRESS',
    season: 'SUMMER',
    shortDescription: 'Vestido liviano de lino y viscosa con estética minimal.',
    sizes: ['XS', 'S', 'M', 'L'],
    skuBase: 'AUR-DRS-MIN',
    stockBase: 11,
    tags: ['dress', 'summer', 'linen', 'minimal'],
    title: 'Vestido Minimal Summer',
    weightInGrams: 310,
  },
  {
    brand: 'Black River',
    categoryName: 'Pantalones',
    collection: 'Street Utility',
    colors: [
      { hex: '#6F735F', name: 'Olive' },
      { hex: '#2E2C28', name: 'Washed Black' },
    ],
    composition: '100% cotton ripstop',
    description:
      'Pantalón cargo relaxed con bolsillos funcionales, tela ripstop y ajuste con cordón interno.',
    fit: 'RELAXED',
    genderTarget: 'UNISEX',
    material: 'Cotton ripstop',
    price: 118,
    productType: 'PANTS',
    season: 'MID_SEASON',
    shortDescription: 'Cargo relaxed de ripstop con bolsillos utilitarios.',
    sizes: ['S', 'M', 'L', 'XL'],
    skuBase: 'BRV-PNT-CRG',
    stockBase: 13,
    tags: ['cargo', 'utility', 'ripstop', 'relaxed'],
    title: 'Pantalón Cargo Relaxed',
    weightInGrams: 590,
  },
  {
    brand: 'Minimal Co.',
    categoryName: 'Buzos',
    collection: 'Premium Knitwear',
    colors: [
      { hex: '#D4C8B0', name: 'Oatmeal' },
      { hex: '#3C3A35', name: 'Taupe' },
    ],
    composition: '60% cotton, 30% wool, 10% nylon',
    description:
      'Sweater knit premium con textura suave, cuello redondo y construcción de punto medio.',
    fit: 'REGULAR',
    genderTarget: 'UNISEX',
    isBestSeller: true,
    material: 'Cotton wool knit',
    price: 124,
    productType: 'SWEATER',
    season: 'WINTER',
    shortDescription: 'Sweater de punto premium con mezcla de algodón y lana.',
    sizes: ['S', 'M', 'L', 'XL'],
    skuBase: 'MCO-SWT-KNT',
    stockBase: 8,
    tags: ['sweater', 'knitwear', 'wool', 'premium'],
    title: 'Sweater Knit Premium',
    weightInGrams: 520,
  },
  {
    brand: 'Northlane',
    categoryName: 'Accesorios',
    collection: 'Core Essentials',
    colors: [
      { hex: '#111111', name: 'Black' },
      { hex: '#F2EFE8', name: 'Off White' },
    ],
    composition: '100% cotton twill',
    description:
      'Gorra clásica de seis paneles con logo bordado tonal, hebilla metálica y visera curva.',
    fit: 'REGULAR',
    genderTarget: 'UNISEX',
    material: 'Cotton twill',
    price: 38,
    productType: 'ACCESSORY',
    season: 'ALL_SEASON',
    shortDescription: 'Gorra clásica con logo tonal y ajuste metálico.',
    sizes: ['OS'],
    skuBase: 'NLA-CAP-CLS',
    stockBase: 22,
    tags: ['cap', 'accessory', 'logo', 'classic'],
    title: 'Gorra Classic Logo',
    weightInGrams: 120,
  },
];

async function main(): Promise<void> {
  await seedReferenceData();

  const categories = await prisma.category.findMany();
  const categoryByName = new Map(categories.map((category) => [category.name, category]));

  for (const product of products) {
    const category = categoryByName.get(product.categoryName);
    if (!category) {
      throw new Error(`Missing category ${product.categoryName}.`);
    }

    const slug = createSlug(product.title);
    const publicUrl = `https://northlane-apparel.local/products/${slug}`;
    const images = buildImages(product.title, slug, product.colors);
    const variants = buildVariants(product);

    const data = {
      averageRating: 4.6,
      brand: product.brand,
      canonicalUrl: publicUrl,
      careInstructions: 'Machine wash cold, wash inside out, do not tumble dry, iron low if needed.',
      categoryId: category.id,
      categoryName: category.name,
      collection: product.collection,
      compareAtPrice: product.compareAtPrice,
      composition: product.composition,
      costPrice: Math.round(product.price * 0.45),
      currency: 'USD',
      description: product.description,
      discountPercentage: product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0,
      externalUrl: publicUrl,
      fit: product.fit,
      genderTarget: product.genderTarget,
      isActive: true,
      isBestSeller: product.isBestSeller ?? false,
      isFeatured: product.isFeatured ?? false,
      isNewArrival: product.isNewArrival ?? false,
      material: product.material,
      price: product.price,
      productType: product.productType,
      seoDescription: `${product.shortDescription} Shop premium apparel at Northlane Apparel.`,
      seoTitle: `${product.title} | Northlane Apparel`,
      shortDescription: product.shortDescription,
      skuBase: product.skuBase,
      season: product.season,
      slug,
      tags: [...product.tags],
      taxRate: 0.21,
      title: product.title,
      totalReviews: product.isBestSeller ? 42 : 12,
    };

    const existing = await prisma.product.findUnique({ where: { slug } });

    if (!existing) {
      await prisma.product.create({
        data: {
          ...data,
          images: { create: images },
          variants: { create: variants },
        },
      });
      continue;
    }

    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    await prisma.productVariant.deleteMany({ where: { productId: existing.id } });
    await prisma.product.update({
      data: {
        ...data,
        images: { create: images },
        variants: { create: variants },
      },
      where: { id: existing.id },
    });
  }

  console.log(`Seeded ${products.length} catalog products.`);
}

async function seedReferenceData(): Promise<void> {
  for (const brand of brands) {
    await prisma.brand.upsert({
      create: { name: brand, slug: createSlug(brand) },
      update: { name: brand },
      where: { slug: createSlug(brand) },
    });
  }

  for (const collection of collections) {
    await prisma.collection.upsert({
      create: { name: collection, slug: createSlug(collection) },
      update: { name: collection },
      where: { slug: createSlug(collection) },
    });
  }

  for (const category of categoryNames) {
    await prisma.category.upsert({
      create: {
        description: `Indumentaria premium de la categoría ${category}.`,
        imageUrl: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80`,
        name: category,
        slug: createSlug(category),
      },
      update: {
        description: `Indumentaria premium de la categoría ${category}.`,
        imageUrl: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80`,
        name: category,
      },
      where: { slug: createSlug(category) },
    });
  }
}

function buildVariants(product: SeedProduct) {
  return product.colors.flatMap((color, colorIndex) =>
    product.sizes.map((size, sizeIndex) => ({
      colorHex: color.hex,
      colorName: color.name,
      isActive: true,
      reservedStock: 0,
      size,
      sku: `${product.skuBase}-${slugSku(color.name)}-${slugSku(size)}`,
      stock: product.stockBase + colorIndex * 2 + sizeIndex,
      weightInGrams: product.weightInGrams,
    })),
  );
}

function buildImages(title: string, slug: string, colors: SeedProduct['colors']) {
  return colors.map((color, index) => ({
    altText: `${title} in ${color.name}`,
    isPrimary: index === 0,
    position: index,
    url: `https://placehold.co/1200x1600/${color.hex.replace('#', '')}/FFFFFF?text=${encodeURIComponent(slug)}`,
  }));
}

function slugSku(value: string): string {
  return createSlug(value).replaceAll('-', '').toUpperCase();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
