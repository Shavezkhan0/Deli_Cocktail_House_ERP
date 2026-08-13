import type { FunctionTemplate } from "./types";

export const welcomeLunch: FunctionTemplate = {
  id: "welcome-lunch",
  name: "Welcome Lunch",
  category: "EVENT",
  blocks: [
    { id: "w-uniform", type: "simple", title: "Bartenders Uniform", value: "As per theme" },
    { id: "w-barsetup", type: "simple", title: "Bar Setup", value: "As per theme" },
    { id: "w-mascot", type: "simple", title: "Aperol Mascot", value: "Serving Aperol Spritz" },
    { id: "w-bloodymary", type: "text", title: "Bloody Mary Pass Around", description: "Bartenders and dedicated butlers, dressed in a Spanish countryside-inspired theme, serving multiple variations of Bloody Mary." },
    { id: "w-games", type: "list", title: "Drink Games", items: ["Beer Pong", "Amalfi Spritz Window"] },
    { id: "w-mimosa", type: "text", title: "Mimosa On Wheels", description: "Indulge in a Mimosa Extravaganza! Our mobile mimosa bar offers fresh berries, a variety of juices, and a variety for to create your own unique mimosa." },
    {
      id: "w-cola", type: "text_with_subitems", title: "Vintage Cola Bottle Bar",
      description: "A perfect blend of retro charm and modern flavors, these eye-catching mocktails are served chilled in iconic cola bottles wrapped in vintage style napkins — invoking memories.",
      items: [
        { name: "Kala Khatta Fizz", description: "Classic street-style kala khatta with lemon, cumin salt, and soda." },
        { name: "Citrus Punch", description: "Fresh orange, lemon juice, mint, and a splash of soda." },
        { name: "Spiced Cola Refresher", description: "Cola base with chaat masala, lime, and a hint of black salt." },
      ],
    },
  ],
};
