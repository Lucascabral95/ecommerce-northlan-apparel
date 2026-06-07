import type { CartDto } from '@northlane/contracts';
import { useTranslations } from 'next-intl';
import { formatMoney } from '../../shared/format';

export function CheckoutSummary({ cart }: Readonly<{ cart: CartDto }>) {
  const t = useTranslations('checkout');

  return (
    <section className="surface rounded-[2rem] p-6">
      <p className="eyebrow">{t('summary')}</p>
      <h2 className="display-title mt-4 text-4xl">{t('title')}</h2>
      <div className="mt-6 grid gap-3">
        {cart.items.map((item) => (
          <div className="flex justify-between gap-4 text-sm" key={item.id}>
            <span>
              {item.quantity} x {item.titleSnapshot} / {item.selectedSize}
            </span>
            <span className="font-semibold">{formatMoney(item.total, cart.currency)}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between border-t border-[var(--line)] pt-5 text-xl font-semibold">
        <span>{t('subtotal')}</span>
        <span>{formatMoney(cart.subtotal, cart.currency)}</span>
      </div>
    </section>
  );
}
