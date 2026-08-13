import type { FunctionTemplate } from "./types";

export const haldi: FunctionTemplate = {
  id: "haldi",
  name: "Haldi",
  category: "EVENT",
  blocks: [
    { id: "hd-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "hd-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "hd-ice", type: "simple", title: "Fruit Infused Ice Cubes", value: "" },
    { id: "hd-limoncello", type: "simple", title: "Limoncello Pass Around Served In Jute Basket", value: "" },
    {
      id: "hd-banta", type: "text_with_subitems", title: "Banta Bar",
      description: "",
      items: [
        { name: "Masala Cola Banta", description: "Spicy, Citrusy, Fizzy" },
        { name: "Fanta Banta", description: "Tart, Tangy, Refreshing" },
        { name: "Jamun Banta", description: "Sweet, Citrusy, Fizzy" },
      ],
    },
    {
      id: "hd-silbatta", type: "list", title: "Traditional Freshly Hand Crafted Silbatta Drinks On Mini Cart Pass Around",
      items: ["Taaza Aam Panna", "Pudina Shikanji Ehsaas", "Kokum Jeera-E-Khaas"],
    },
    {
      id: "hd-matka", type: "text_with_subitems", title: "Matka Bar",
      description: "Rooted in Indian tradition with touch of grandeur, our Matka Bar presents beverages like:-",
      items: [
        { name: "Amritsari Lassi", description: "" },
        { name: "Mohabbatein Sharbat", description: "Delhi6 Legendary Rooh Afza Paired With Watermelon Chunks And Skimmed Milk" },
        { name: "Masala Chaanch", description: "" },
        { name: "Baadam Thandai", description: "" },
      ],
    },
    {
      id: "hd-buckets", type: "text_with_subitems", title: "Bucket Brews",
      description: "A playful twist on beer service — refreshing beer cocktails served chilled in mini metal buckets, perfect for casual, high-energy settings.",
      items: [
        { name: "Citrus Smash (Wheat Beer)", description: "Wheat beer | Fresh orange juice | Lemon wedges | Dash of honey | Mint leaves. A zesty, cloudy refresher with bright citrus notes and a smooth finish." },
        { name: "Spicy Lager Michelada (Lager Beer)", description: "Lager beer | Tomato juice | Lime juice | Tabasco | Worcestershire sauce | Salted rim. A bold, tangy Mexican-style cocktail with just the right heat." },
      ],
    },
    {
      id: "hd-virgin-mary", type: "text_with_items", title: "Virgin Mary Bar",
      description: "A sophisticated, non-alcoholic twist on the classic Bloody Mary, blending fresh tomato juice, zesty spices, and savory herbs for a bold, tangy, and refreshingly complex mocktail experience.",
      items: ["Spicy Citrus Virgin Mary", "Garden Herb Virgin Mary", "Tropical Virgin Mary"],
    },
    {
      id: "hd-detox-water", type: "text_with_items", title: "Detox Water",
      description: "Refresh your guests with our Detox Water Station — a vibrant blend of infused fruits, herbs, and botanicals. Light, revitalizing, and beautifully presented, it's the perfect wellness touch for any elegant gathering.",
      items: ["Kesar", "Rose Water", "Cucumber"],
    },
  ],
};