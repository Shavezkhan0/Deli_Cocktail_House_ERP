import type { FunctionTemplate } from "./types";

export const sufiNight: FunctionTemplate = {
  id: "sufi-night",
  name: "Sufi Night",
  category: "EVENT",
  blocks: [
    { id: "sn-uniform", type: "simple", title: "Bartenders Uniform", value: "As Per Theme" },
    { id: "sn-barsetup", type: "simple", title: "Bar Setup", value: "As Per Theme" },
    {
      id: "sn-oldfashioned", type: "text_with_items", title: "Old Fashioned & Oud Bar",
      description: "A bold and luxurious bar experience where timeless Old Fashioned craftsmanship meets deep, smoky oud-inspired notes.",
      items: ["Smoked Clove & Orange Old Fashioned", "Star Anise & Brown Sugar Old Fashioned", "Cinnamon Black Pepper Old Fashioned"],
    },
    {
      id: "sn-moroccantea", type: "text_with_items", title: "Moroccan Tea Cocktail Bar",
      description: "Inspired by the rich traditions of Moroccan tea culture, this cocktail bar blends exotic spices, fresh herbs, and premium spirits into captivating concoctions.",
      items: ["Casablanca Mint Julep", "Spiced Citrus Gin Tonic", "Rose & Cardamom Vodka Tea"],
    },
    {
      id: "sn-sherbet", type: "list", title: "Sherbet Inspired Mocktails",
      items: ["Khus Sherbet", "Rose Sherbet", "Lemon Pudina Sherbet", "Saffron & Rosewater Lemonade Sherbet"],
    },
    {
      id: "sn-fusion", type: "text_with_items", title: "Fusion Mocktails",
      description: "Innovative blends of global flavors and contemporary techniques, fusion mocktails combine fruits, herbs, spices, and exotic ingredients to create refreshing, multi-layered, and visually striking beverages.",
      items: ["Virgin Popcorn Spritz", "Bubblegum Spritz", "Activated Charcoal Margarita", "Espresso Tonic", "Hibiscus Twist"],
    },
    {
      id: "sn-winterdelight", type: "text_with_subitems", title: "Winter Delight",
      description: "",
      items: [
        { name: "Saffron Hot Toddy", description: "Aged whiskey, saffron strands, honey, clove, and cinnamon—slow brewed and citrus-zested." },
        { name: "Mulled Wine", description: "Red wine infused with orange peel, star anise, nutmeg, and spiced hibiscus reduction." },
      ],
    },
  ],
};