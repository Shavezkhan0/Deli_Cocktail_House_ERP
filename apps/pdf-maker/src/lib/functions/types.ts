export type BlockType = "simple" | "list" | "text" | "text_with_items" | "text_with_subitems";

export type Block = {
  id: string;
  type: BlockType;
  title: string;
  value?: string;
  description?: string;
  items?: any[];
};

export type FunctionTemplate = {
  id: string;
  name: string;
  category: "EVENT" | "STANDARD" | "DELIVERABLES";
  blocks: Block[];
};
