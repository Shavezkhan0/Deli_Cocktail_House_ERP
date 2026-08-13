import type { FunctionTemplate } from "./types";

export const jaimalaPheras: FunctionTemplate = {
  id: "jaimala-pheras",
  name: "Jaimala & Pheras",
  category: "EVENT",
  blocks: [
    { id: "jp-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "jp-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "jp-ice", type: "simple", title: "Clear Ice Spheres", value: "" },
    {
      id: "jp-cola", type: "text_with_subitems", title: "Vintage Cola Bottle Bar",
      description: "A perfect blend of retro charm and modern flavors, these eye-catching mocktails are served chilled in iconic cola bottles wrapped in vintage style napkins — invoking memories.",
      items: [
        { name: "Kala Khatta Fizz", description: "Classic street-style kala khatta with lemon, cumin salt, and soda." },
        { name: "Citrus Punch", description: "Fresh orange, lemon juice, mint, and a splash of soda." },
        { name: "Spiced Cola Refresher", description: "Cola base with chaat masala, lime, and a hint of black salt." },
      ],
    },
    {
      id: "jp-boba", type: "text_with_items", title: "Boba Tea Mocktails",
      description: "Flavours:-",
      items: [
        "Thai Tea With Tapioca Pearls",
        "Passion Fruit Iced Tea With Tapioca Pearls",
        "Butterscotch Milk With Tapioca Pearls",
        "Mango Milk With Tapioca Pearls",
      ],
    },
    {
      id: "jp-sherbet-mocktail-bar", type: "text", title: "Sherbet-Inspired Mocktail Bar",
      description: "A celebration of centuries-old cordial craft, our Sherbet-Inspired Mocktail Bar revives flavors of rose, sandalwood, hibiscus, zesty lime, and aam panna with a modern twist. Served chilled over ice and garnished with mint or floral accents, these fragrant, refreshing mocktails honor tradition while delighting the senses. Each sip is a timeless story, reimagined.",
    },
    {
      id: "jp-fruit-herb", type: "text_with_items", title: "Fruit & Herb Mocktails",
      description: "A refreshing mocktail experience featuring 6 unique varieties crafted with fresh fruits, aromatic herbs, and vibrant flavors served live for a healthy, colorful, and interactive beverage experience:-",
      items: [
        "Guava Mint Cooler",
        "Watermelon Basil Fizz",
        "Passion Fruit Thyme",
        "Kiwi Coriander Twist",
        "Pineapple Rosemary Spritz",
        "Blueberry Sage Refresher",
      ],
    },
    {
      id: "jp-fusion", type: "text_with_items", title: "Fusion Mocktails",
      description: "Innovative blends of global flavors and contemporary techniques, fusion mocktails combine fruits, herbs, spices, and exotic ingredients to create refreshing, multi-layered, and visually striking beverages. For modern events, they deliver bold taste experiences without alcohol.",
      items: [
        "Virgin Popcorn Spritz",
        "Bubblegum Spritz",
        "Activated Charcoal Margarita",
        "Espresso Tonic",
        "Hibiscus Twist",
      ],
    },
  ],
};