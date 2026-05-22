import process from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dirname, '..', '..');

const { PrismaClient: CatalogPrismaClient } = await import(
  pathToFileURL(
    resolve(repoRoot, 'services', 'catalog-service', 'src', 'generated', 'prisma', 'index.js'),
  ).href,
);
const { PrismaClient: InventoryPrismaClient } = await import(
  pathToFileURL(
    resolve(repoRoot, 'services', 'inventory-service', 'src', 'generated', 'prisma', 'index.js'),
  ).href,
);

const catalogPrisma = new CatalogPrismaClient();
const inventoryPrisma = new InventoryPrismaClient();

try {
  const variants = await catalogPrisma.productVariant.findMany({
    select: {
      id: true,
      isActive: true,
      productId: true,
      reservedStock: true,
      sku: true,
      stock: true,
    },
    where: {
      isActive: true,
      product: {
        isActive: true,
      },
    },
  });

  if (variants.length === 0) {
    throw new Error('Catalog seed did not produce active variants for inventory bootstrap.');
  }

  const activeSkus = variants.map((variant) => variant.sku);
  let deletedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;

  const deleteResult = await inventoryPrisma.inventoryItem.deleteMany({
    where: {
      sku: {
        notIn: activeSkus,
      },
    },
  });
  deletedCount = deleteResult.count;

  for (const variant of variants) {
    const existingItem = await inventoryPrisma.inventoryItem.findFirst({
      select: { id: true, sku: true, variantId: true },
      where: {
        OR: [{ sku: variant.sku }, { variantId: variant.id }],
      },
    });

    if (!existingItem) {
      await inventoryPrisma.inventoryItem.create({
        data: {
          isActive: variant.isActive,
          productId: variant.productId,
          reservedStock: variant.reservedStock,
          sku: variant.sku,
          stockOnHand: variant.stock,
          variantId: variant.id,
        },
      });
      createdCount += 1;
      continue;
    }

    await inventoryPrisma.inventoryItem.update({
      data: {
        isActive: variant.isActive,
        productId: variant.productId,
        reservedStock: variant.reservedStock,
        sku: variant.sku,
        stockOnHand: variant.stock,
        variantId: variant.id,
      },
      where: { id: existingItem.id },
    });
    updatedCount += 1;
  }

  process.stdout.write(
    `Synchronized ${variants.length} inventory items from seeded catalog variants (${createdCount} created, ${updatedCount} updated, ${deletedCount} deleted).\n`,
  );
} finally {
  await Promise.all([catalogPrisma.$disconnect(), inventoryPrisma.$disconnect()]);
}
