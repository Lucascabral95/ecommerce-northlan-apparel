const marqueeItems = [
  'Free shipping across Argentina on orders over ARS 110,000',
  'Store pickup available in Buenos Aires',
  '4 to 6 interest-free installments on selected tailoring',
  'Winter tailoring, premium knitwear and daily layers',
] as const;

export function HomeMarquee() {
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
