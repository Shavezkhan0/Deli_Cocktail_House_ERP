import type { FunctionTemplate } from "./types";

export const wedding: FunctionTemplate = {
  id: "wedding",
  name: "Wedding",
  category: "EVENT",
  blocks: [
    { id: "wd-uniform", type: "simple", title: "Bartenders Uniform", value: "As Per Theme" },
    { id: "wd-barsetup", type: "simple", title: "Bar Setup", value: "As Per Theme" },
    { id: "wd-ice", type: "simple", title: "Clear Ice Spheres", value: "" },
    { id: "wd-smokedbubble", type: "simple", title: "Smoked Bubble Welcome Mocktail", value: "" },
    {
      id: "wd-infusedgin", type: "text_with_items", title: "Infused Gin Bar",
      description: "Enriched gins infused with fresh fruits, herbs, and spices. Each pour is crafted into vibrant, aromatic cocktails that bring a refreshing twist of elegance to any celebration.",
      items: ["Genda", "Mogra", "Kesar"],
    },
    {
      id: "wd-japanese", type: "text", title: "Japanese Cocktail Pop-Up",
      description: "Bartenders Dressed In Japanese Costumes, Presenting Japanese Cocktails To Guests.",
    },
    {
      id: "wd-oldfashioned", type: "text_with_items", title: "Old Fashioned & Sour Bar",
      description: "A luxe cocktail experience blending bold Old Fashioned and vibrant handcrafted Sours with smoky, spiced, and aromatic notes inspired by Middle Eastern oud. Crafted for refined palates and unforgettable evenings.",
      items: ["Thai Sour", "Passion Fruit Sour", "Masala Sour", "Saffron Old Fashioned", "Espresso Old Fashioned", "Cinnamon Old Fashioned"],
    },
    {
      id: "wd-indianflavours", type: "list", title: "Mocktails Curated From Flavours Across India",
      items: ["Raw Mango & Curry Leaf", "Banarasi Paan Spritz", "Gur Margarita", "Kokum Spritz", "Aam Panna Fizz", "Guava Chilli Coole"],
    },
    {
      id: "wd-winterdelight", type: "text_with_subitems", title: "Winter Delight",
      description: "",
      items: [
        { name: "Cinnamon Hot Toddy", description: "A comforting blend of warm cinnamon, citrus, and aromatic spices, crafted to deliver a cozy and soothing winter experience." },
        { name: "Kokum Mulled Wine", description: "A unique blend of tangy kokum, citrus, and aromatic spices, served warm for a bold and refreshing winter treat." },
      ],
    },
  ],
};