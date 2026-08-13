import type { FunctionTemplate } from "./types";

export const afterParty: FunctionTemplate = {
  id: "after-party",
  name: "After Party",
  category: "EVENT",
  blocks: [
    { id: "ap-uniform", type: "simple", title: "Bartenders Uniform", value: "White Coat + Wide Lab Shades" },
    { id: "ap-barsetup", type: "simple", title: "Bar Setup", value: "Lab Equipment" },
    {
      id: "ap-molecular-shots", type: "text_with_subitems", title: "Molecular Shots",
      description: "",
      items: [
        { name: "Jello Shots", description: "Fruity flavored jelly made with premium syrups, fresh citrus and vibrant flavors, served chilled in bite-sized shot cups." },
        { name: "Popcorn Shots", description: "A smooth buttery popcorn-inspired shot blended with vanilla, caramel and creamy flavors, finished with a light popcorn garnish." },
        { name: "Magic Pop Shots", description: "A vibrant fruit-flavored shot crafted with premium syrups, citrus and popping candy for a playful burst of flavor and texture." },
        { name: "Flaming Marshmallow", description: "Creamy vanilla and caramel flavors topped with a freshly toasted marshmallow, creating a rich, smoky and indulgent shot experience." },
      ],
    },
  ],
};