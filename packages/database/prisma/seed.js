const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    id: "mehendi",
    name: "Mehendi",
    category: "EVENT",
    blocks: [
      { id: "m-uniform", type: "SIMPLE", title: "Bartenders Uniform", value: "As per theme" },
      { id: "m-barsetup", type: "SIMPLE", title: "Bar Setup", value: "As per theme" },
      { id: "m-ice", type: "SIMPLE", title: "Fruit Infused Ice Cubes", value: "" },
      { id: "m-mascot", type: "SIMPLE", title: "Aperol Mascot", value: "Serving Aperol Spritz" },
      { id: "m-games", type: "LIST", title: "Drink Games", items: ["Beer Pong", "Amalfi Spritz Window"] },
      {
        id: "m-slushy", type: "TEXT_WITH_SUBITEMS", title: "Slushy Margarita Bar",
        description: "Indulge in frozen margaritas crafted made with exotic fruits like:-",
        items: [
          { name: "Frozen Mango Margarita", description: "A tropical frozen blend of ripe mangoes, tequila, triple sec, fresh lime juice, and ice for a smooth, refreshing sip." },
          { name: "Frozen Berry Margarita", description: "A vibrant icy mix of mixed berries, tequila, triple sec, fresh lime juice, and ice with a sweet tangy finish." },
        ],
      },
      { id: "m-mimosa", type: "TEXT", title: "Mimosa On Wheels", description: "Indulge in a Mimosa Extravaganza! Our mobile mimosa bar offers fresh berries, a variety of juices, and a variety for to create your own unique mimosa." },
      { id: "m-bloodymary", type: "TEXT", title: "Bloody Mary Pass Around", description: "Bartenders and dedicated butlers, dressed in a Spanish countryside-inspired theme, serving multiple variations of Bloody Mary." },
      {
        id: "m-fusion", type: "TEXT_WITH_ITEMS", title: "Fusion Mocktails",
        description: "Innovative blends of global flavors and contemporary techniques, fusion mocktails combine fruits, herbs, spices, and exotic ingredients to create refreshing, multi-layered, and visually striking beverages. For modern events, they deliver bold taste experiences without alcohol.",
        items: ["Virgin Popcorn Spritz", "Bubblegum Spritz", "Activated Charcoal Margarita", "Espresso Tonic", "Hibiscus Twist"],
      },
    ],
  },
  {
    id: "welcome-lunch",
    name: "Welcome Lunch",
    category: "EVENT",
    blocks: [
      { id: "w-uniform", type: "SIMPLE", title: "Bartenders Uniform", value: "As per theme" },
      { id: "w-barsetup", type: "SIMPLE", title: "Bar Setup", value: "As per theme" },
      { id: "w-mascot", type: "SIMPLE", title: "Aperol Mascot", value: "Serving Aperol Spritz" },
      { id: "w-bloodymary", type: "TEXT", title: "Bloody Mary Pass Around", description: "Bartenders and dedicated butlers, dressed in a Spanish countryside-inspired theme, serving multiple variations of Bloody Mary." },
      { id: "w-games", type: "LIST", title: "Drink Games", items: ["Beer Pong", "Amalfi Spritz Window"] },
      { id: "w-mimosa", type: "TEXT", title: "Mimosa On Wheels", description: "Indulge in a Mimosa Extravaganza! Our mobile mimosa bar offers fresh berries, a variety of juices, and a variety for to create your own unique mimosa." },
      {
        id: "w-cola", type: "TEXT_WITH_SUBITEMS", title: "Vintage Cola Bottle Bar",
        description: "A perfect blend of retro charm and modern flavors, these eye-catching mocktails are served chilled in iconic cola bottles wrapped in vintage style napkins \u2014 invoking memories.",
        items: [
          { name: "Kala Khatta Fizz", description: "Classic street-style kala khatta with lemon, cumin salt, and soda." },
          { name: "Citrus Punch", description: "Fresh orange, lemon juice, mint, and a splash of soda." },
          { name: "Spiced Cola Refresher", description: "Cola base with chaat masala, lime, and a hint of black salt." },
        ],
      },
    ],
  },
  {
    id: "guest-welcome",
    name: "Guest Welcome",
    category: "EVENT",
    blocks: [
      { id: "gw-pannacotta", type: "SIMPLE", title: "Coconut Panna Cotta Served In Coconut Shells", value: "" },
      {
        id: "gw-sherbet", type: "TEXT_WITH_SUBITEMS", title: "Sherbet Served In Designer Maharaja Styled Glasses",
        description: "Varieties of Sherbets:-",
        items: [
          { name: "Rose Sherbet", description: "Made with rose syrup, chilled water/soda, a dash of lemon, and ice. Garnished with fresh rose petals or mint leaves. Light, fragrant, and elegant." },
          { name: "Khus Sherbet", description: "Prepared with khus (vetiver) syrup, cold water, and crushed ice. Has a natural cooling effect and a soothing green color. Often garnished with lemon slices." },
          { name: "Lemon Pudina Sherbet", description: "A mix of lemon juice, sugar syrup, black salt, and fresh mint. Served chilled with soda or water. Tangy, refreshing, and digestive." },
        ],
      },
    ],
  },
  {
    id: "sangeet",
    name: "Sangeet",
    category: "EVENT",
    blocks: [
      { id: "s-uniform", type: "SIMPLE", title: "Bartenders Uniform", value: "As per theme" },
      { id: "s-barsetup", type: "SIMPLE", title: "Bar Setup", value: "As per theme" },
      { id: "s-ice", type: "SIMPLE", title: "Personalized Ice Cubes", value: "" },
      { id: "s-ipad", type: "SIMPLE", title: "I-Pad Menu Presentation", value: "" },
      {
        id: "s-espresso", type: "TEXT_WITH_ITEMS", title: "Espresso Martini Bar",
        description: "Where Coffee Meets Cocktail Culture \u2014 This one-of-a-kind live station designed exclusively for espresso martini lovers, offering freshly pulled shots of espresso shaken to perfection with premium spirits and coffee liqueurs.",
        items: ["Tiramisu Martini", "Cold Brew Affogato", "Salted Caramel Martini"],
      },
      {
        id: "s-picante", type: "TEXT_WITH_ITEMS", title: "Picante Bar",
        description: "A Picante Bar brings fiery Latin-inspired energy with bold flavors, spicy cocktails, and vibrant decor. It's designed for guests who enjoy a lively, adventurous drinking experience with a modern twist.",
        items: ["Mango Picante", "Peach Picante", "Spiced Passion Fruit Picante"],
      },
      {
        id: "s-oldfashioned", type: "TEXT_WITH_ITEMS", title: "Old Fashioned & Sour Bar",
        description: "A luxe cocktail experience blending bold Old Fashioned and vibrant handcrafted Sours with smoky, spiced, and aromatic notes inspired by Middle Eastern oud. Crafted for refined palates and unforgettable evenings.",
        items: ["Thai Sour", "Passion Fruit Sour", "Masala Sour", "Saffron Old Fashioned", "Espresso Old Fashioned", "Cinnamon Old Fashioned"],
      },
      {
        id: "s-shots", type: "LIST", title: "Shots Bar Pop Up",
        items: ["Shots Served In Jager & Patron Miniatures", "Jager Mascot Serving Shots", "Drink Games: Claw Machine", "Jager Bomb Cart Station Near The Dance Stage", "Shots Presented With LED Strobe Lights & Welcome Boards"],
      },
      {
        id: "s-dessert", type: "TEXT_WITH_SUBITEMS", title: "Dessert Mocktails",
        description: "",
        items: [
          { name: "Lotus Biscoff", description: "A creamy and smooth shake blended with Lotus Biscoff spread, biscuit crumbs, and caramel notes for a rich dessert-style treat." },
          { name: "Acai Berry", description: "A refreshing blend of a\u00e7a\u00ed berries, mixed fruits, and creamy textures, offering a fruity and premium shake experience." },
          { name: "Tiramisu Frost", description: "A smooth coffee-based shake with creamy layers and cocoa notes, inspired by the classic Italian dessert." },
          { name: "Chocolate Baklava Shake", description: "A rich chocolate shake blended with nutty baklava flavors and hints of honey for a sweet Arabic-inspired touch." },
        ],
      },
      {
        id: "s-winterdelight", type: "TEXT_WITH_SUBITEMS", title: "Winter Delight",
        description: "",
        items: [
          { name: "Apple Cider Hot Toddy", description: "A comforting blend of warm apple cider, whisky, honey, fresh lemon juice, and seasonal spices, creating a rich and soothing winter warmer." },
          { name: "Rose Infused Mulled Wine", description: "A fragrant mix of red wine gently simmered with rose petals, citrus fruits, cinnamon, cloves, and aromatic spices for an elegant twist on the classic mulled wine." },
        ],
      },
    ],
  },
  {
    id: "lunch",
    name: "Lunch",
    category: "EVENT",
    blocks: [
      { id: "l-uniform", type: "SIMPLE", title: "Bartenders Uniform", value: "As per theme" },
      { id: "l-barsetup", type: "SIMPLE", title: "Bar Setup", value: "As per theme" },
      { id: "l-ice", type: "SIMPLE", title: "Fruit Infused Ice Cubes", value: "" },
      {
        id: "l-banta", type: "TEXT_WITH_SUBITEMS", title: "Banta Bar",
        description: "Signature Serves:-",
        items: [
          { name: "Masala Cola Banta", description: "Spicy, Citrusy, Fizzy" },
          { name: "Fanta Banta", description: "Tart, Tangy, Refreshing" },
          { name: "Jamun Banta", description: "Sweet, Citrusy, Fizzy" },
        ],
      },
      {
        id: "l-matka", type: "TEXT_WITH_SUBITEMS", title: "Matka Bar",
        description: "Rooted in Indian tradition with touch of grandeur, our Matka Bar presents beverages like:- Signature Serves:-",
        items: [
          { name: "Amritsari Lassi", description: "" },
          { name: "Mohabbatein Sharbat", description: "Delhi6 Legendary Rooh Afza Paired With Watermelon Chunks And Skimmed Milk" },
          { name: "Masala Chaanch", description: "" },
          { name: "Baadam Thandai", description: "" },
        ],
      },
      {
        id: "l-silbatta", type: "LIST", title: "Traditional Freshly Handcrafted Silbatta Drinks On Mini Cart Pass Around",
        items: ["Taaza Aam Panna", "Pudina Shikanji Ehsaas", "Kokum Jeera-E-Khaas"],
      },
      {
        id: "l-bucketbrews", type: "TEXT_WITH_SUBITEMS", title: "Bucket Brews",
        description: "A playful twist on beer service \u2014 refreshing beer cocktails served chilled in mini metal buckets, perfect for casual, high-energy settings.",
        items: [
          { name: "Citrus Smash (Wheat Beer)", description: "Wheat beer | Fresh orange juice | Lemon wedges | Dash of honey | Mint leaves. A zesty, cloudy refresher with bright citrus notes and a smooth finish." },
          { name: "Spicy Lager Michelada (Lager Beer)", description: "Lager beer | Tomato juice | Lime juice | Tabasco | Worcestershire sauce | Salted rim. A bold, tangy Mexican-style cocktail with just the right heat." },
        ],
      },
    ],
  },
  {
    id: "baraat",
    name: "Baraat",
    category: "EVENT",
    blocks: [
      {
        id: "b-baraat", type: "LIST", title: "Baraat",
        items: ["Baraat Cart", "50 Personalised Hip Flasks", "Vodka & Gin Personalised Pet Bottles", "Jagermeister Miniatures", "Patron Miniatures", "Shots Served On Toy Remote Control Cars"],
      },
    ],
  },
  {
    id: "please-note",
    name: "Please Note",
    category: "STANDARD",
    blocks: [
      {
        id: "pn-list", type: "LIST", title: "Please Note",
        items: [
          "Bar structure by decorator",
          "Liquor by client",
          "Glassware by hotel",
          "Beverages by hotel",
          "Staff travel & stay is all inclusive of the package",
        ],
      },
    ],
  },
  {
    id: "terms-conditions",
    name: "Terms & Conditions",
    category: "STANDARD",
    blocks: [
      { id: "tc-size", type: "TEXT", title: "Bar Size & Setup Requirement", description: "To ensure the smooth functioning and overall success of the event, it is imperative that the size and setup of the bars strictly adhere to the specifications and recommendations provided by DCH. These guidelines are based on an assessment of the event's requirements and are designed to optimize service efficiency and guest satisfaction. Failure to comply may result in compromised event quality and shall be addressed as per the terms outlined in this agreement." },
      { id: "tc-alcohol", type: "TEXT", title: "Alcohol Supply Requirements", description: "The client agrees to stock and supply the bar with alcohol as specifically outlined and recommended by DCH. These recommendations are made to ensure a high level of service quality and to meet the preferences and expectations of event attendees. It is the client's responsibility to ensure that an adequate supply of the agreed-upon types and quantities of alcohol is available at the event to avoid any disruption in service." },
      { id: "tc-attendance", type: "TEXT", title: "Attendance & Preparation", description: "For DCH to adequately prepare for the event and ensure sufficient staffing, equipment, and supplies, the client must provide a clear and final guest count no later than three days prior to the event. This information is critical for effective execution and the overall success of the event. Failure to provide accurate and timely details may impact service quality and will be addressed as per the terms outlined in this agreement." },
    ],
  },
];

async function main() {
  for (let index = 0; index < TEMPLATES.length; index++) {
    const template = TEMPLATES[index];

    await prisma.proposalFunctionTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        category: template.category,
        sortOrder: index,
      },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        sortOrder: index,
      },
    });

    await prisma.proposalBlockTemplate.deleteMany({
      where: { functionId: template.id },
    });

    await prisma.proposalBlockTemplate.createMany({
      data: template.blocks.map((block, blockIndex) => ({
        id: block.id,
        functionId: template.id,
        type: block.type,
        sortOrder: blockIndex,
        title: block.title,
        value: block.value ?? null,
        description: block.description ?? null,
        items: block.items ?? null,
      })),
    });
  }

  console.log(`Seeded ${TEMPLATES.length} proposal function templates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
