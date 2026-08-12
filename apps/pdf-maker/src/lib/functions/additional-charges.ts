import type { FunctionTemplate } from "./types";

export const additionalCharges: FunctionTemplate = {
  id: "additional-charges",
  name: "Additional Charges",
  category: "EVENT",
  blocks: [
    {
      id: "additional-charges-list",
      type: "list",
      title: "Additional Charges",
      items: [],
    },
  ],
};
