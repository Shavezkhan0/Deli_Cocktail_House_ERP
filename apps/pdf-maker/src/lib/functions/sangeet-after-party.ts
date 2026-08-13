import type { FunctionTemplate } from "./types";

export const sangeetAfterParty: FunctionTemplate = {
  id: "sangeet-after-party",
  name: "Sangeet Followed By After Party",
  category: "EVENT",
  blocks: [
    { id: "sap-uniform", type: "simple", title: "Bartenders Uniform", value: "As Per Theme" },
    { id: "sap-barsetup", type: "simple", title: "Bar Setup", value: "As Per Theme" },
    { id: "sap-icecubes", type: "simple", title: "Personalized Ice Cubes", value: "" },
    { id: "sap-ipad", type: "simple", title: "I-Pad Menu Presentation", value: "" },
    {
      id: "sap-espressomartini", type: "text_with_items", title: "Espresso Martini Bar",
      description: "Where Coffee Meets Cocktail Culture — This one-of-a-kind live station designed exclusively for espresso martini lovers, offering freshly pulled shots of espresso shaken to perfection with premium spirits and coffee liqueurs.",
      items: ["Tiramisu Martini", "Cold Brew Affogato", "Salted Caramel Martini"],
    },
    {
      id: "sap-picante", type: "text_with_items", title: "Picante Bar",
      description: "A Picante Bar brings fiery Latin-inspired energy with bold flavors, spicy cocktails, and vibrant décor. It's designed for guests who enjoy a lively, adventurous drinking experience with a modern twist.\n\nVarieties:-",
      items: ["Mango Picante", "Peach Picante", "Spiced Passion Fruit Picante"],
    },
    {
      id: "sap-shotsbar", type: "list", title: "Shots Bar Pop-Up",
      items: [
        "Shots Served In Jager & Patron Miniatures",
        "Jager Mascot Serving Shots",
        "Drink Games: Claw Machine",
        "Jager Bomb Cart Station Near The Dance Stage",
        "Shots Presented With LED Strobe Lights & Welcome Boards",
      ],
    },
    {
      id: "sap-smokedshow", type: "text", title: "Smoked Cocktail Show",
      description: "A theatrical cocktail experience featuring hand crafted smoked drinks infused with rich aromas and bold flavors. Served fresh at a stylish live station by the mixologist.",
    },
    {
      id: "sap-fruitherb", type: "text_with_items", title: "Fruit & Herb Mocktails",
      description: "A refreshing mocktail experience featuring 6 unique varieties crafted with fresh fruits, aromatic herbs, and vibrant flavors served live for a healthy, colorful, and interactive beverage experience:-",
      items: ["Guava Mint Cooler", "Watermelon Basil Fizz", "Passion Fruit Thyme", "Kiwi Coriander Twist", "Pineapple Rosemary Spritz", "Blueberry Sage Refresher"],
    },
    {
      id: "sap-indianflavours", type: "list", title: "Mocktails Curated From Flavours Across India",
      items: ["Raw Mango & Curry Leaf", "Banarasi Paan Spritz", "Gur Margarita", "Kokum Spritz"],
    },
  ],
};