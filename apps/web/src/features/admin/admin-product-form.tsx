'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type {
  ProductDto,
  ProductFit,
  ProductGenderTarget,
  ProductSeason,
  ProductType,
} from '@northlane/contracts';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../shared/ui/button';
import { useCreateAdminProduct, useUpdateAdminProduct } from './admin-hooks';

const productTypes = [
  'ACCESSORY',
  'DRESS',
  'HOODIE',
  'JACKET',
  'JEANS',
  'OTHER',
  'PANTS',
  'SHIRT',
  'SHOES',
  'SWEATER',
  'T_SHIRT',
] as const satisfies readonly ProductType[];
const productFits = ['OVERSIZED', 'REGULAR', 'RELAXED', 'SLIM'] as const satisfies readonly ProductFit[];
const productSeasons = ['ALL_SEASON', 'MID_SEASON', 'SUMMER', 'WINTER'] as const satisfies readonly ProductSeason[];
const genderTargets = ['KIDS', 'MEN', 'UNISEX', 'WOMEN'] as const satisfies readonly ProductGenderTarget[];

const optionalText = z.string().trim().optional();
const optionalUrl = z
  .union([z.literal(''), z.url('Use a valid public URL.')])
  .optional();
const optionalNonNegativeNumber = z.number().min(0, 'Use zero or a positive value.').optional();

const variantSchema = z.object({
  barcode: optionalText,
  colorHex: z.string().trim().regex(/^#[\dA-Fa-f]{6}$/, 'Use a six digit hex color.'),
  colorName: z.string().trim().min(2, 'Color is required.').max(80),
  isActive: z.boolean(),
  priceOverride: optionalNonNegativeNumber,
  reservedStock: z.number().int().min(0),
  size: z.string().trim().min(1, 'Size is required.').max(24),
  sku: z.string().trim().min(3, 'SKU is required.').max(80),
  stock: z.number().int().min(0),
  weightInGrams: z.number().int().min(1, 'Weight must be positive.'),
});

const imageSchema = z.object({
  altText: z.string().trim().min(3, 'Alt text is required.').max(180),
  isPrimary: z.boolean(),
  position: z.number().int().min(0),
  url: z.url('Use a valid image URL.'),
  variantSku: optionalText,
});

const productSchema = z.object({
  brand: z.string().trim().min(2, 'Brand is required.').max(100),
  canonicalUrl: optionalUrl,
  careInstructions: z.string().trim().min(8, 'Care instructions are required.'),
  categoryId: optionalText,
  categoryName: z.string().trim().min(2, 'Category is required.').max(100),
  collection: optionalText,
  compareAtPrice: optionalNonNegativeNumber,
  composition: z.string().trim().min(3, 'Composition is required.'),
  costPrice: optionalNonNegativeNumber,
  currency: z.string().trim().length(3, 'Use an ISO currency code.'),
  description: z.string().trim().min(24, 'Add a useful product description.'),
  discountPercentage: z.number().min(0).max(100),
  externalUrl: optionalUrl,
  fit: z.enum(productFits),
  genderTarget: z.enum(genderTargets),
  images: z.array(imageSchema).max(16),
  isActive: z.boolean(),
  isBestSeller: z.boolean(),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  material: z.string().trim().min(2, 'Material is required.'),
  price: z.number().min(0.01, 'Price must be positive.'),
  productType: z.enum(productTypes),
  seoDescription: optionalText,
  seoTitle: optionalText,
  shortDescription: z.string().trim().min(8, 'Short description is required.').max(260),
  skuBase: z.string().trim().min(3, 'Base SKU is required.').max(80),
  season: z.enum(productSeasons),
  slug: optionalText,
  subcategoryId: optionalText,
  subcategoryName: optionalText,
  tags: z.string().trim(),
  taxRate: z.number().min(0).max(100),
  title: z.string().trim().min(3, 'Title is required.').max(180),
  variants: z.array(variantSchema).min(1, 'At least one sellable variant is required.').max(80),
});

type ProductFormValues = z.infer<typeof productSchema>;

export function AdminProductForm({ product }: Readonly<{ product?: ProductDto }>) {
  const router = useRouter();
  const createMutation = useCreateAdminProduct();
  const updateMutation = useUpdateAdminProduct(product?.id ?? '');
  const form = useForm<ProductFormValues>({
    defaultValues: product ? getProductDefaults(product) : getNewProductDefaults(),
    resolver: zodResolver(productSchema),
  });
  const variants = useFieldArray({ control: form.control, name: 'variants' });
  const images = useFieldArray({ control: form.control, name: 'images' });
  const isPending = createMutation.isPending || updateMutation.isPending;

  function submit(values: ProductFormValues) {
    const payload = toProductPayload(values);
    const mutationOptions = {
      onSuccess: () => router.push('/admin/products'),
    };

    if (product) {
      updateMutation.mutate(payload, mutationOptions);
      return;
    }

    createMutation.mutate(payload, mutationOptions);
  }

  return (
    <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
      <section className="surface grid gap-4 rounded-[2rem] p-5 md:grid-cols-2 xl:grid-cols-3">
        <PanelTitle
          description="Commercial identity, category and merchandising state."
          title="Product core"
        />
        <Field error={form.formState.errors.title?.message} label="Title">
          <input className="field" {...form.register('title')} />
        </Field>
        <Field error={form.formState.errors.skuBase?.message} label="Base SKU">
          <input className="field" {...form.register('skuBase')} />
        </Field>
        <Field label="Slug">
          <input className="field" placeholder="generated if empty" {...form.register('slug')} />
        </Field>
        <Field error={form.formState.errors.brand?.message} label="Brand">
          <input className="field" {...form.register('brand')} />
        </Field>
        <Field error={form.formState.errors.categoryName?.message} label="Category">
          <input className="field" {...form.register('categoryName')} />
        </Field>
        <Field label="Category ID">
          <input className="field" {...form.register('categoryId')} />
        </Field>
        <Field label="Subcategory">
          <input className="field" {...form.register('subcategoryName')} />
        </Field>
        <Field label="Subcategory ID">
          <input className="field" {...form.register('subcategoryId')} />
        </Field>
        <Field label="Collection">
          <input className="field" {...form.register('collection')} />
        </Field>
        <Field error={form.formState.errors.productType?.message} label="Product type">
          <select className="field" {...form.register('productType')}>
            {productTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.genderTarget?.message} label="Audience">
          <select className="field" {...form.register('genderTarget')}>
            {genderTargets.map((target) => (
              <option key={target}>{target}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.fit?.message} label="Fit">
          <select className="field" {...form.register('fit')}>
            {productFits.map((fit) => (
              <option key={fit}>{fit}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.season?.message} label="Season">
          <select className="field" {...form.register('season')}>
            {productSeasons.map((season) => (
              <option key={season}>{season}</option>
            ))}
          </select>
        </Field>
        <Field error={form.formState.errors.material?.message} label="Material">
          <input className="field" {...form.register('material')} />
        </Field>
        <Field error={form.formState.errors.composition?.message} label="Composition">
          <input className="field" {...form.register('composition')} />
        </Field>
        <Field error={form.formState.errors.tags?.message} label="Tags">
          <input className="field" placeholder="premium, hoodie, winter" {...form.register('tags')} />
        </Field>
        <FlagSet form={form} />
      </section>

      <section className="surface grid gap-4 rounded-[2rem] p-5 lg:grid-cols-2">
        <PanelTitle
          description="Prices and public product copy delivered by the catalog service."
          title="Pricing and story"
        />
        <Field error={form.formState.errors.price?.message} label="Price">
          <input className="field" step="0.01" type="number" {...form.register('price', { valueAsNumber: true })} />
        </Field>
        <Field error={form.formState.errors.compareAtPrice?.message} label="Compare at price">
          <input
            className="field"
            step="0.01"
            type="number"
            {...form.register('compareAtPrice', { setValueAs: optionalNumberInput })}
          />
        </Field>
        <Field error={form.formState.errors.costPrice?.message} label="Cost price">
          <input
            className="field"
            step="0.01"
            type="number"
            {...form.register('costPrice', { setValueAs: optionalNumberInput })}
          />
        </Field>
        <Field error={form.formState.errors.currency?.message} label="Currency">
          <input className="field" maxLength={3} {...form.register('currency')} />
        </Field>
        <Field error={form.formState.errors.taxRate?.message} label="Tax rate %">
          <input className="field" step="0.01" type="number" {...form.register('taxRate', { valueAsNumber: true })} />
        </Field>
        <Field error={form.formState.errors.discountPercentage?.message} label="Discount %">
          <input
            className="field"
            step="0.01"
            type="number"
            {...form.register('discountPercentage', { valueAsNumber: true })}
          />
        </Field>
        <Field className="lg:col-span-2" error={form.formState.errors.shortDescription?.message} label="Short description">
          <textarea className="field min-h-28" {...form.register('shortDescription')} />
        </Field>
        <Field className="lg:col-span-2" error={form.formState.errors.description?.message} label="Description">
          <textarea className="field min-h-44" {...form.register('description')} />
        </Field>
        <Field className="lg:col-span-2" error={form.formState.errors.careInstructions?.message} label="Care instructions">
          <textarea className="field min-h-28" {...form.register('careInstructions')} />
        </Field>
      </section>

      <section className="surface grid gap-4 rounded-[2rem] p-5 lg:grid-cols-2">
        <PanelTitle description="SEO and public links owned by catalog." title="Discovery" />
        <Field error={form.formState.errors.externalUrl?.message} label="External URL">
          <input className="field" {...form.register('externalUrl')} />
        </Field>
        <Field error={form.formState.errors.canonicalUrl?.message} label="Canonical URL">
          <input className="field" {...form.register('canonicalUrl')} />
        </Field>
        <Field label="SEO title">
          <input className="field" {...form.register('seoTitle')} />
        </Field>
        <Field label="SEO description">
          <input className="field" {...form.register('seoDescription')} />
        </Field>
      </section>

      <CollectionEditor
        actionLabel="Add variant"
        count={variants.fields.length}
        onAdd={() => variants.append(getVariantDefaults())}
        title="Variants"
      >
        {form.formState.errors.variants?.root?.message ? (
          <p className="text-sm text-red-800">{form.formState.errors.variants.root.message}</p>
        ) : null}
        {variants.fields.map((field, index) => (
          <article className="rounded-[1.5rem] border border-[var(--line)] bg-white/35 p-4" key={field.id}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Variant {index + 1}</p>
              {variants.fields.length > 1 ? (
                <Button intent="quiet" onClick={() => variants.remove(index)} type="button">
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field error={form.formState.errors.variants?.[index]?.sku?.message} label="SKU">
                <input className="field" {...form.register(`variants.${index}.sku`)} />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.size?.message} label="Size">
                <input className="field" {...form.register(`variants.${index}.size`)} />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.colorName?.message} label="Color">
                <input className="field" {...form.register(`variants.${index}.colorName`)} />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.colorHex?.message} label="Color hex">
                <input className="field" {...form.register(`variants.${index}.colorHex`)} />
              </Field>
              <Field label="Barcode">
                <input className="field" {...form.register(`variants.${index}.barcode`)} />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.stock?.message} label="Catalog stock">
                <input className="field" type="number" {...form.register(`variants.${index}.stock`, { valueAsNumber: true })} />
              </Field>
              <Field label="Reserved stock">
                <input
                  className="field"
                  type="number"
                  {...form.register(`variants.${index}.reservedStock`, { valueAsNumber: true })}
                />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.weightInGrams?.message} label="Weight g">
                <input
                  className="field"
                  type="number"
                  {...form.register(`variants.${index}.weightInGrams`, { valueAsNumber: true })}
                />
              </Field>
              <Field error={form.formState.errors.variants?.[index]?.priceOverride?.message} label="Price override">
                <input
                  className="field"
                  step="0.01"
                  type="number"
                  {...form.register(`variants.${index}.priceOverride`, {
                    setValueAs: optionalNumberInput,
                  })}
                />
              </Field>
              <CheckField label="Active">
                <input type="checkbox" {...form.register(`variants.${index}.isActive`)} />
              </CheckField>
            </div>
          </article>
        ))}
      </CollectionEditor>

      <CollectionEditor
        actionLabel="Add image"
        count={images.fields.length}
        onAdd={() => images.append(getImageDefaults(images.fields.length))}
        title="Images"
      >
        {images.fields.length === 0 ? (
          <p className="rounded-[1.4rem] border border-dashed border-[var(--line)] p-5 text-[var(--muted)]">
            Add at least one gallery image for a polished product detail page.
          </p>
        ) : null}
        {images.fields.map((field, index) => (
          <article className="grid gap-4 rounded-[1.5rem] border border-[var(--line)] bg-white/35 p-4 md:grid-cols-2" key={field.id}>
            <Field error={form.formState.errors.images?.[index]?.url?.message} label="Image URL">
              <input className="field" {...form.register(`images.${index}.url`)} />
            </Field>
            <Field error={form.formState.errors.images?.[index]?.altText?.message} label="Alt text">
              <input className="field" {...form.register(`images.${index}.altText`)} />
            </Field>
            <Field label="Variant SKU">
              <input className="field" {...form.register(`images.${index}.variantSku`)} />
            </Field>
            <Field label="Position">
              <input className="field" type="number" {...form.register(`images.${index}.position`, { valueAsNumber: true })} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <CheckField label="Primary image">
                <input type="checkbox" {...form.register(`images.${index}.isPrimary`)} />
              </CheckField>
              <Button intent="quiet" onClick={() => images.remove(index)} type="button">
                Remove image
              </Button>
            </div>
          </article>
        ))}
      </CollectionEditor>

      <div className="surface flex flex-col gap-3 rounded-[2rem] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          Inventory adjustments remain in the dedicated stock workspace after catalog save.
        </p>
        <Button disabled={isPending} type="submit">
          {isPending ? 'Saving' : product ? 'Save product' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}

function FlagSet({ form }: Readonly<{ form: ReturnType<typeof useForm<ProductFormValues>> }>) {
  return (
    <div className="grid content-start gap-2 rounded-[1.4rem] border border-[var(--line)] bg-white/35 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Merchandising</p>
      <CheckField label="Active">
        <input type="checkbox" {...form.register('isActive')} />
      </CheckField>
      <CheckField label="Featured">
        <input type="checkbox" {...form.register('isFeatured')} />
      </CheckField>
      <CheckField label="New arrival">
        <input type="checkbox" {...form.register('isNewArrival')} />
      </CheckField>
      <CheckField label="Best seller">
        <input type="checkbox" {...form.register('isBestSeller')} />
      </CheckField>
    </div>
  );
}

function CollectionEditor({
  actionLabel,
  children,
  count,
  onAdd,
  title,
}: Readonly<{
  actionLabel: string;
  children: React.ReactNode;
  count: number;
  onAdd: () => void;
  title: string;
}>) {
  return (
    <section className="surface grid gap-4 rounded-[2rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{count} configured</p>
          <h2 className="display-title mt-2 text-4xl">{title}</h2>
        </div>
        <Button intent="ghost" onClick={onAdd} type="button">
          {actionLabel}
        </Button>
      </div>
      {children}
    </section>
  );
}

function Field({
  children,
  className = '',
  error,
  label,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  error?: string;
  label: string;
}>) {
  return (
    <label className={`grid gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)] ${className}`}>
      {label}
      {children}
      {error ? <span className="normal-case tracking-normal text-red-800">{error}</span> : null}
    </label>
  );
}

function CheckField({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/45 px-4 text-sm font-semibold">
      {children}
      {label}
    </label>
  );
}

function PanelTitle({ description, title }: Readonly<{ description: string; title: string }>) {
  return (
    <div className="md:col-span-2 xl:col-span-3">
      <p className="eyebrow">{description}</p>
      <h2 className="display-title mt-3 text-4xl">{title}</h2>
    </div>
  );
}

function getNewProductDefaults(): ProductFormValues {
  return {
    brand: 'Northlane',
    canonicalUrl: '',
    careInstructions: '',
    categoryId: '',
    categoryName: '',
    collection: '',
    compareAtPrice: undefined,
    composition: '',
    costPrice: undefined,
    currency: 'USD',
    description: '',
    discountPercentage: 0,
    externalUrl: '',
    fit: 'REGULAR',
    genderTarget: 'UNISEX',
    images: [getImageDefaults(0)],
    isActive: true,
    isBestSeller: false,
    isFeatured: false,
    isNewArrival: true,
    material: '',
    price: 0,
    productType: 'T_SHIRT',
    seoDescription: '',
    seoTitle: '',
    shortDescription: '',
    skuBase: '',
    season: 'ALL_SEASON',
    slug: '',
    subcategoryId: '',
    subcategoryName: '',
    tags: '',
    taxRate: 0,
    title: '',
    variants: [getVariantDefaults()],
  };
}

function getProductDefaults(product: ProductDto): ProductFormValues {
  return {
    ...getNewProductDefaults(),
    ...product,
    canonicalUrl: product.canonicalUrl ?? '',
    categoryId: product.categoryId ?? '',
    collection: product.collection ?? '',
    compareAtPrice: product.compareAtPrice,
    costPrice: product.costPrice,
    externalUrl: product.externalUrl ?? '',
    images: product.images.map((image) => ({
      altText: image.altText,
      isPrimary: image.isPrimary,
      position: image.position,
      url: image.url,
      variantSku: product.variants.find((variant) => variant.id === image.variantId)?.sku ?? '',
    })),
    seoDescription: product.seoDescription ?? '',
    seoTitle: product.seoTitle ?? '',
    subcategoryId: product.subcategoryId ?? '',
    subcategoryName: product.subcategoryName ?? '',
    tags: product.tags.join(', '),
    variants: product.variants.map((variant) => ({
      barcode: variant.barcode ?? '',
      colorHex: variant.colorHex,
      colorName: variant.colorName,
      isActive: variant.isActive,
      priceOverride: variant.priceOverride,
      reservedStock: variant.reservedStock,
      size: variant.size,
      sku: variant.sku,
      stock: variant.stock,
      weightInGrams: variant.weightInGrams,
    })),
  };
}

function getVariantDefaults() {
  return {
    barcode: '',
    colorHex: '#15130F',
    colorName: '',
    isActive: true,
    priceOverride: undefined,
    reservedStock: 0,
    size: '',
    sku: '',
    stock: 0,
    weightInGrams: 250,
  };
}

function getImageDefaults(position: number) {
  return {
    altText: '',
    isPrimary: position === 0,
    position,
    url: '',
    variantSku: '',
  };
}

function optionalNumberInput(value: unknown) {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toProductPayload(values: ProductFormValues) {
  return {
    ...values,
    canonicalUrl: values.canonicalUrl || undefined,
    categoryId: values.categoryId || undefined,
    collection: values.collection || undefined,
    currency: values.currency.toUpperCase(),
    externalUrl: values.externalUrl || undefined,
    images: values.images.map((image) => ({
      ...image,
      variantSku: image.variantSku || undefined,
    })),
    seoDescription: values.seoDescription || undefined,
    seoTitle: values.seoTitle || undefined,
    slug: values.slug || undefined,
    subcategoryId: values.subcategoryId || undefined,
    subcategoryName: values.subcategoryName || undefined,
    tags: splitCsv(values.tags),
    variants: values.variants.map((variant) => ({
      ...variant,
      barcode: variant.barcode || undefined,
    })),
  };
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
