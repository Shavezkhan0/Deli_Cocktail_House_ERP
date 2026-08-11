"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cloneItems, type TemplateItem } from "@/lib/function-templates";

function TemplateItemEditor({
  item,
  depth,
  onChange,
  onRemove,
}: {
  item: TemplateItem;
  depth: number;
  onChange: (item: TemplateItem) => void;
  onRemove: () => void;
}) {
  const children = item.items ?? [];

  function updateChildren(next: TemplateItem[]) {
    onChange({ ...item, items: next });
  }

  return (
    <div
      className="rounded-lg border bg-muted/20 p-3"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={item.label}
            onChange={(event) =>
              onChange({ ...item, label: event.target.value })
            }
            placeholder="Label"
          />
          <Textarea
            value={item.description ?? ""}
            onChange={(event) =>
              onChange({ ...item, description: event.target.value })
            }
            placeholder="Description (optional)"
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove item"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>

      {children.map((child, index) => (
        <TemplateItemEditor
          key={index}
          item={child}
          depth={depth + 1}
          onChange={(next) =>
            updateChildren(children.map((entry, i) => (i === index ? next : entry)))
          }
          onRemove={() =>
            updateChildren(children.filter((_, i) => i !== index))
          }
        />
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => updateChildren([...children, { label: "" }])}
      >
        <Plus data-icon="inline-start" />
        Add Sub Item
      </Button>
    </div>
  );
}

export function FunctionDetailsDialog({
  open,
  onOpenChange,
  functionName,
  items,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  functionName: string;
  items: TemplateItem[];
  onSave: (items: TemplateItem[]) => void;
}) {
  const [draft, setDraft] = useState<TemplateItem[]>(() => cloneItems(items));

  function handleSave() {
    onSave(draft);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit {functionName || "Function"} Details
          </DialogTitle>
          <DialogDescription>
            Modify the points for this function only. The shared template is
            never changed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {draft.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              No items yet. Click &quot;Add Item&quot; to add one.
            </p>
          ) : (
            draft.map((item, index) => (
              <TemplateItemEditor
                key={index}
                item={item}
                depth={0}
                onChange={(next) =>
                  setDraft((prev) =>
                    prev.map((entry, i) => (i === index ? next : entry)),
                  )
                }
                onRemove={() =>
                  setDraft((prev) => prev.filter((_, i) => i !== index))
                }
              />
            ))
          )}

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => setDraft((prev) => [...prev, { label: "" }])}
          >
            <Plus data-icon="inline-start" />
            Add Item
          </Button>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
