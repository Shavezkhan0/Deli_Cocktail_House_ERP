import type { FunctionTemplate } from "./types";

export const pleaseNote: FunctionTemplate = {
  id: "please-note",
  name: "Please Note",
  category: "STANDARD",
  blocks: [
    {
      id: "pn-list", type: "list", title: "Please Note",
      items: [
        "Bar structure by decorator",
        "Liquor by client",
        "Glassware by hotel",
        "Beverages by hotel",
        "Staff travel & stay is all inclusive of the package",
      ],
    },
  ],
};
