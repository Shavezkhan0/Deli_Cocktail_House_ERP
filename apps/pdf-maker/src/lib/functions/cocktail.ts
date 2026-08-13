import type { FunctionTemplate } from "./types";

export const cocktail: FunctionTemplate = {
  id: "cocktail",
  name: "Cocktail",
  category: "EVENT",
  blocks: [
    { id: "ck-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "ck-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "ck-ice", type: "simple", title: "Personalized Ice Cubes", value: "" },
    { id: "ck-ipad", type: "simple", title: "I-Pad Menu Presentation", value: "" },
    {
      id: "ck-espresso-martini", type: "text_with_items", title: "Espresso Martini Bar",
      description: "Where Coffee Meets Cocktail Culture — This one-of-a-kind live station designed exclusively for espresso martini lovers, offering freshly pulled shots of espresso shaken to perfection with premium spirits and coffee liqueurs.",
      items: ["Tiramisu Martini", "Cold Brew Affogato", "Salted Caramel Martini"],
    },
    {
      id: "ck-picante", type: "text_with_items", title: "Picante Bar",
      description: "A Picante Bar brings fiery Latin-inspired energy with bold flavors, spicy cocktails, and vibrant decor. It's designed for guests who enjoy a lively, adventurous drinking experience with a modern twist.",
      items: ["Mango Picante", "Peach Picante", "Spiced Passion Fruit Picante"],
    },
    {
      id: "ck-smoked-show", type: "text", title: "Smoked Cocktail Show",
      description: "A theatrical cocktail experience featuring hand crafted smoked drinks infused with rich aromas and bold flavors. Served fresh at a stylish live station by the mixologist.",
    },
    {
      id: "ck-shotsbar", type: "list", title: "Shots Bar Pop Up",
      items: [
        "Shots Served In Jager & Patron Miniatures",
        "Jager Mascot Serving Shots",
        "Drink Games: Claw Machine",
        "Shots Served With Welcome Boards & Strobe Lights",
        "Jagermeister Booth Cart Near The Dance Stage",
      ],
    },
    {
      id: "ck-fruit-herb", type: "text_with_items", title: "Fruit & Herb Mocktails",
      description: "A refreshing mocktail experience featuring 6 unique varieties crafted with fresh fruits, aromatic herbs, and vibrant flavors — served live for a healthy, colorful, and interactive beverage experience:-",
      items: ["Guava Mint Cooler", "Watermelon Basil Fizz", "Passion Fruit Thyme", "Kiwi Coriander Twist", "Pineapple Rosemary Spritz", "Blueberry Sage Refresher"],
    },
    {
      id: "ck-india-mocktails", type: "list", title: "Mocktails Curated From Flavours Across India",
      items: ["Raw Mango & Curry Leaf", "Banarasi Paan Spritz", "Gur Margarita", "Kokum Spritz", "Aam Panna Fizz", "Guava Chilli Cooler"],
    },
    {
      id: "ck-winter", type: "text_with_subitems", title: "Winter Delight",
      description: "",
      items: [
        { name: "Apple Cider Hot Toddy", description: "A comforting blend of warm apple cider, whisky, honey, fresh lemon juice, and seasonal spices, creating a rich and soothing winter warmer." },
        { name: "Rose Infused Mulled Wine", description: "A fragrant mix of red wine gently simmered with rose petals, citrus fruits, cinnamon, cloves, and aromatic spices for an elegant twist on the classic mulled wine." },
      ],
    },
  ],
};