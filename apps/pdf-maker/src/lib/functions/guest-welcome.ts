import type { FunctionTemplate } from "./types";

export const guestWelcome: FunctionTemplate = {
  id: "guest-welcome",
  name: "Guest Welcome",
  category: "EVENT",
  blocks: [
    { id: "gw-pannacotta", type: "simple", title: "Coconut Panna Cotta Served In Coconut Shells", value: "" },
    {
      id: "gw-sherbet", type: "text_with_subitems", title: "Sherbet Served In Designer Maharaja Styled Glasses",
      description: "Varieties of Sherbets:-",
      items: [
        { name: "Rose Sherbet", description: "Made with rose syrup, chilled water/soda, a dash of lemon, and ice. Garnished with fresh rose petals or mint leaves. Light, fragrant, and elegant." },
        { name: "Khus Sherbet", description: "Prepared with khus (vetiver) syrup, cold water, and crushed ice. Has a natural cooling effect and a soothing green color. Often garnished with lemon slices." },
        { name: "Lemon Pudina Sherbet", description: "A mix of lemon juice, sugar syrup, black salt, and fresh mint. Served chilled with soda or water. Tangy, refreshing, and digestive." },
      ],
    },
  ],
};
