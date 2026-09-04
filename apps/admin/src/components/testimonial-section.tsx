import "../app/gradient-hero.css";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
};

const featured: Testimonial = {
  quote:
    "Deli Cocktail House transformed our events completely. The catering team was flawless — every detail was perfect, the food was extraordinary, and our guests are still talking about it months later.",
  name: "Sarah Mitchell",
  role: "CEO, Tech Ventures",
  initials: "SM",
};

const secondary: Testimonial[] = [
  {
    quote:
      "Exceptional service from start to finish. The attention to detail and professionalism exceeded every expectation we had for our corporate gala.",
    name: "James Okafor",
    role: "Events Director, NovaCorp",
    initials: "JO",
  },
  {
    quote:
      "Our wedding reception was an absolute dream. The cocktail menu was creative, unique, and perfectly tailored to our vision.",
    name: "Priya & Daniel",
    role: "Wedding Clients",
    initials: "PD",
  },
];

export function TestimonialSection() {
  return (
    <section className="gradient-hero">
      <h2 className="gradient-hero__heading">Hear it from our customers.</h2>

      <div className="gradient-hero__cards">
        {/* Large Featured Card */}
        <div className="glass-card">
          <div className="glass-card__quote">
            <p className="glass-card__text">{featured.quote}</p>
          </div>
          <div className="glass-card__author">
            <div className="glass-card__avatar" aria-hidden="true">
              {featured.initials}
            </div>
            <div>
              <p className="glass-card__name">{featured.name}</p>
              <p className="glass-card__role">{featured.role}</p>
            </div>
          </div>
        </div>

        {/* Row of Smaller Cards */}
        <div className="gradient-hero__row">
          {secondary.map((t) => (
            <div key={t.name} className="glass-card glass-card--sm">
              <div className="glass-card__quote">
                <p className="glass-card__text">{t.quote}</p>
              </div>
              <div className="glass-card__author">
                <div className="glass-card__avatar" aria-hidden="true">
                  {t.initials}
                </div>
                <div>
                  <p className="glass-card__name">{t.name}</p>
                  <p className="glass-card__role">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
