import type { FunctionTemplate } from "./types";

export const sangeet: FunctionTemplate = {
  id: "sangeet",
  name: "Sangeet",
  category: "EVENT",
  blocks: [
    { id: "s-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "s-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "s-ice", type: "simple", title: "Personalized Ice Cubes", value: "" },
    { id: "s-ipad", type: "simple", title: "I-Pad Menu Presentation", value: "" },
    {
      id: "s-espresso", type: "text_with_items", title: "Espresso Martini Bar",
      description: "Where Coffee Meets Cocktail Culture — This one-of-a-kind live station designed exclusively for espresso martini lovers, offering freshly pulled shots of espresso shaken to perfection with premium spirits and coffee liqueurs.",
      items: ["Tiramisu Martini", "Cold Brew Affogato", "Salted Caramel Martini"],
    },
    {
      id: "s-picante", type: "text_with_items", title: "Picante Bar",
      description: "A Picante Bar brings fiery Latin-inspired energy with bold flavors, spicy cocktails, and vibrant decor. It's designed for guests who enjoy a lively, adventurous drinking experience with a modern twist.",
      items: ["Mango Picante", "Peach Picante", "Spiced Passion Fruit Picante"],
    },
    {
      id: "s-oldfashioned", type: "text_with_items", title: "Old Fashioned & Sour Bar",
      description: "A luxe cocktail experience blending bold Old Fashioned and vibrant handcrafted Sours with smoky, spiced, and aromatic notes inspired by Middle Eastern oud. Crafted for refined palates and unforgettable evenings.",
      items: ["Thai Sour", "Passion Fruit Sour", "Masala Sour", "Saffron Old Fashioned", "Espresso Old Fashioned", "Cinnamon Old Fashioned"],
    },
    {
      id: "s-shots", type: "list", title: "Shots Bar Pop Up",
      items: ["Shots Served In Jager & Patron Miniatures", "Jager Mascot Serving Shots", "Drink Games: Claw Machine", "Jager Bomb Cart Station Near The Dance Stage", "Shots Presented With LED Strobe Lights & Welcome Boards"],
    },
    {
      id: "s-dessert", type: "text_with_subitems", title: "Dessert Mocktails",
      description: "",
      items: [
        { name: "Lotus Biscoff", description: "A creamy and smooth shake blended with Lotus Biscoff spread, biscuit crumbs, and caramel notes for a rich dessert-style treat." },
        { name: "Acai Berry", description: "A refreshing blend of açaí berries, mixed fruits, and creamy textures, offering a fruity and premium shake experience." },
        { name: "Tiramisu Frost", description: "A smooth coffee-based shake with creamy layers and cocoa notes, inspired by the classic Italian dessert." },
        { name: "Chocolate Baklava Shake", description: "A rich chocolate shake blended with nutty baklava flavors and hints of honey for a sweet Arabic-inspired touch." },
      ],
    },
    {
      id: "s-winterdelight", type: "text_with_subitems", title: "Winter Delight",
      description: "",
      items: [
        { name: "Apple Cider Hot Toddy", description: "A comforting blend of warm apple cider, whisky, honey, fresh lemon juice, and seasonal spices, creating a rich and soothing winter warmer." },
        { name: "Rose Infused Mulled Wine", description: "A fragrant mix of red wine gently simmered with rose petals, citrus fruits, cinnamon, cloves, and aromatic spices for an elegant twist on the classic mulled wine." },
      ],
    },
  ],
};
