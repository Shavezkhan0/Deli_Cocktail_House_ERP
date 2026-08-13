import type { FunctionTemplate } from "./types";

export const lunch: FunctionTemplate = {
  id: "lunch",
  name: "Lunch",
  category: "EVENT",
  blocks: [
    { id: "l-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "l-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "l-ice", type: "simple", title: "Fruit Infused Ice Cubes", value: "" },
    {
      id: "l-banta", type: "text_with_subitems", title: "Banta Bar",
      description: "Signature Serves:-",
      items: [
        { name: "Masala Cola Banta", description: "Spicy, Citrusy, Fizzy" },
        { name: "Fanta Banta", description: "Tart, Tangy, Refreshing" },
        { name: "Jamun Banta", description: "Sweet, Citrusy, Fizzy" },
      ],
    },
    {
      id: "l-matka", type: "text_with_subitems", title: "Matka Bar",
      description: "Rooted in Indian tradition with touch of grandeur, our Matka Bar presents beverages like:- Signature Serves:-",
      items: [
        { name: "Amritsari Lassi", description: "" },
        { name: "Mohabbatein Sharbat", description: "Delhi6 Legendary Rooh Afza Paired With Watermelon Chunks And Skimmed Milk" },
        { name: "Masala Chaanch", description: "" },
        { name: "Baadam Thandai", description: "" },
      ],
    },
    {
      id: "l-silbatta", type: "list", title: "Traditional Freshly Handcrafted Silbatta Drinks On Mini Cart Pass Around",
      items: ["Taaza Aam Panna", "Pudina Shikanji Ehsaas", "Kokum Jeera-E-Khaas"],
    },
    {
      id: "l-bucketbrews", type: "text_with_subitems", title: "Bucket Brews",
      description: "A playful twist on beer service — refreshing beer cocktails served chilled in mini metal buckets, perfect for casual, high-energy settings.",
      items: [
        { name: "Citrus Smash (Wheat Beer)", description: "Wheat beer | Fresh orange juice | Lemon wedges | Dash of honey | Mint leaves. A zesty, cloudy refresher with bright citrus notes and a smooth finish." },
        { name: "Spicy Lager Michelada (Lager Beer)", description: "Lager beer | Tomato juice | Lime juice | Tabasco | Worcestershire sauce | Salted rim. A bold, tangy Mexican-style cocktail with just the right heat." },
      ],
    },
  ],
};
