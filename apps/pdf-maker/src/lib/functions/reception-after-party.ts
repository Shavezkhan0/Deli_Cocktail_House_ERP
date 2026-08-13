import type { FunctionTemplate } from "./types";

export const receptionAfterParty: FunctionTemplate = {
  id: "reception-after-party",
  name: "Reception + After Party",
  category: "EVENT",
  blocks: [
    { id: "rap-uniform", type: "simple", title: "Bartenders Uniform", value: "As Per Theme" },
    { id: "rap-barsetup", type: "simple", title: "Bar Setup", value: "As Per Theme" },
    { id: "rap-ice", type: "simple", title: "Clear Ice Spheres", value: "" },
    { id: "rap-smokedbubble", type: "simple", title: "Smoked Bubble Welcome Mocktail", value: "" },
    {
      id: "rap-infusedgin", type: "text_with_items", title: "Infused Gin Bar",
      description: "Enriched gins infused with fresh fruits, herbs, and spices. Each pour is crafted into vibrant, aromatic cocktails that bring a refreshing twist of elegance to any celebration.",
      items: ["Genda", "Mogra", "Kesar"],
    },
    {
      id: "rap-japanese", type: "text", title: "Japanese Cocktail Pop-Up",
      description: "Bartenders Dressed In Japanese Costumes, Presenting Japanese Cocktails To Guests.",
    },
    {
      id: "rap-oldfashioned", type: "text_with_items", title: "Old Fashioned & Sour Bar",
      description: "A luxe cocktail experience blending bold Old Fashioned and vibrant handcrafted Sours with smoky, spiced, and aromatic notes inspired by Middle Eastern oud. Crafted for refined palates and unforgettable evenings.",
      items: ["Thai Sour", "Passion Fruit Sour", "Masala Sour", "Saffron Old Fashioned", "Espresso Old Fashioned", "Hazelnut Old Fashioned"],
    },
    {
      id: "rap-shotsbar", type: "list", title: "Shots Bar Pop-Up",
      items: [
        "Shots Served In Jager & Patron Miniatures",
        "Jager Mascot Serving Shots",
        "Drink Games: Claw Machine",
        "Shots Served With Welcome Boards & Strobe Lights",
        "Jagermeister Booth Cart near The Dance Stage",
      ],
    },
    {
      id: "rap-dessertmocktails", type: "text_with_subitems", title: "Dessert Mocktails",
      description: "",
      items: [
        { name: "Lotus Biscoff", description: "A creamy and smooth shake blended with Lotus Biscoff spread, biscuit crumbs, and caramel notes for a rich dessert-style treat." },
        { name: "Acai Berry", description: "A refreshing blend of açaí berries, mixed fruits, and creamy textures, offering a fruity and premium shake experience." },
        { name: "Tiramisu Frost", description: "A smooth coffee-based shake with creamy layers and cocoa notes, inspired by the classic Italian dessert." },
        { name: "Chocolate Baklava Shake", description: "A rich chocolate shake blended with nutty baklava flavors and hints of honey for a sweet Arabic-inspired touch." },
      ],
    },
    {
      id: "rap-winterdelight", type: "text_with_subitems", title: "Winter Delight",
      description: "",
      items: [
        { name: "Cinnamon Hot Toddy", description: "A comforting blend of warm cinnamon, citrus, and aromatic spices, crafted to deliver a cozy and soothing winter experience." },
        { name: "Kokum Mulled Wine", description: "A unique blend of tangy kokum, citrus, and aromatic spices, served warm for a bold and refreshing winter treat." },
      ],
    },
  ],
};