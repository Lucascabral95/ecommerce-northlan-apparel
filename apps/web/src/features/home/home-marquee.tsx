import { getTranslations } from 'next-intl/server';

export async function HomeMarquee() {
  const t = await getTranslations('home');
  const marqueeItems = t.raw('marquee') as string[];
  const trackItems = [...marqueeItems, ...marqueeItems];

  return (
    <section className="border-y border-[var(--line)] bg-[rgba(21,19,15,.96)] py-3 text-[var(--paper-solid)]">
      <div className="marquee">
        <div className="marquee-track">
          {trackItems.map((item, index) => (
            <span className="marquee-item" key={`${item}-${index}`}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
