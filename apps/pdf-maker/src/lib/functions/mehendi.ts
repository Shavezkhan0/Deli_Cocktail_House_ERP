import type { FunctionTemplate } from "./types";

export const mehendi: FunctionTemplate = {
  id: "mehendi",
  name: "Mehendi",
  category: "EVENT",
  blocks: [
    { id: "m-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "m-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "m-ice", type: "simple", title: "Fruit Infused Ice Cubes", value: "" },
    { id: "m-mascot", type: "simple", title: "Aperol Mascot", value: "Serving Aperol Spritz" },
    { id: "m-games", type: "list", title: "Drink Games", items: ["Beer Pong", "Amalfi Spritz Window"] },
    {
      id: "m-slushy", type: "text_with_subitems", title: "Slushy Margarita Bar",
      description: "Indulge in frozen margaritas crafted made with exotic fruits like:-",
      items: [
        { name: "Frozen Mango Margarita", description: "A tropical frozen blend of ripe mangoes, tequila, triple sec, fresh lime juice, and ice for a smooth, refreshing sip." },
        { name: "Frozen Berry Margarita", description: "A vibrant icy mix of mixed berries, tequila, triple sec, fresh lime juice, and ice with a sweet tangy finish." },
      ],
    },
    { id: "m-mimosa", type: "text", title: "Mimosa On Wheels", description: "Indulge in a Mimosa Extravaganza! Our mobile mimosa bar offers fresh berries, a variety of juices, and a variety for to create your own unique mimosa." },
    { id: "m-bloodymary", type: "text", title: "Bloody Mary Pass Around", description: "Bartenders and dedicated butlers, dressed in a Spanish countryside-inspired theme, serving multiple variations of Bloody Mary." },
    {
      id: "m-fusion", type: "text_with_items", title: "Fusion Mocktails",
      description: "Innovative blends of global flavors and contemporary techniques, fusion mocktails combine fruits, herbs, spices, and exotic ingredients to create refreshing, multi-layered, and visually striking beverages. For modern events, they deliver bold taste experiences without alcohol.",
      items: ["Virgin Popcorn Spritz", "Bubblegum Spritz", "Activated Charcoal Margarita", "Espresso Tonic", "Hibiscus Twist"],
    },
  ],
};
