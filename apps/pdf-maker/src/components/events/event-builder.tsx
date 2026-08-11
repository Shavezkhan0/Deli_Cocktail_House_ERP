"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X, Plus, Trash2, RotateCcw, ArrowUp, ArrowDown, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LIBRARY } from "@/lib/functions";
import { createEventProposal } from "@/app/(app)/events/actions";

const clone = (v: any) => JSON.parse(JSON.stringify(v));

function BlockEditor({ block, onChange }: { block: any; onChange: (b: any) => void }) {
  const update = (patch: any) => onChange({ ...block, ...patch });

  if (block.type === "simple") {
    return (
      <div className="space-y-2">
        <Input value={block.title} onChange={(e) => update({ title: e.target.value })} />
        <Input placeholder="Value (optional)" value={block.value || ""} onChange={(e) => update({ value: e.target.value })} />
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <div className="space-y-2">
        <Input value={block.title} onChange={(e) => update({ title: e.target.value })} />
        {block.items.map((item: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = e.target.value;
                update({ items });
              }}
            />
            <Button variant="ghost" size="icon" onClick={() => update({ items: block.items.filter((_: any, idx: number) => idx !== i) })}>
              <Trash2 className="text-red-500 h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="link" onClick={() => update({ items: [...block.items, ""] })} className="p-0 h-auto">
          <Plus className="h-3 w-3 mr-1" /> Add item
        </Button>
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div className="space-y-2">
        <Input value={block.title} onChange={(e) => update({ title: e.target.value })} />
        <Textarea rows={4} value={block.description} onChange={(e) => update({ description: e.target.value })} />
      </div>
    );
  }

  if (block.type === "text_with_items") {
    return (
      <div className="space-y-2">
        <Input value={block.title} onChange={(e) => update({ title: e.target.value })} />
        <Textarea rows={3} value={block.description} onChange={(e) => update({ description: e.target.value })} />
        {block.items.map((item: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = e.target.value;
                update({ items });
              }}
            />
            <Button variant="ghost" size="icon" onClick={() => update({ items: block.items.filter((_: any, idx: number) => idx !== i) })}>
              <Trash2 className="text-red-500 h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="link" onClick={() => update({ items: [...block.items, ""] })} className="p-0 h-auto">
          <Plus className="h-3 w-3 mr-1" /> Add item
        </Button>
      </div>
    );
  }

  if (block.type === "text_with_subitems") {
    return (
      <div className="space-y-3">
        <Input value={block.title} onChange={(e) => update({ title: e.target.value })} />
        <Textarea rows={2} value={block.description} onChange={(e) => update({ description: e.target.value })} />
        <div className="space-y-2 rounded-md bg-stone-50 p-2 dark:bg-zinc-900 border">
          {block.items.map((item: any, i: number) => (
            <div key={i} className="space-y-2 rounded-md border bg-card p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...items[i], name: e.target.value };
                    update({ items });
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => update({ items: block.items.filter((_: any, idx: number) => idx !== i) })}>
                  <Trash2 className="text-red-500 h-4 w-4" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={item.description}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...items[i], description: e.target.value };
                  update({ items });
                }}
              />
            </div>
          ))}
          <Button variant="link" onClick={() => update({ items: [...block.items, { name: "", description: "" }] })} className="p-0 h-auto">
            <Plus className="h-3 w-3 mr-1" /> Add sub-item
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function BlockPreview({ block }: { block: any }) {
  if (block.type === "simple") {
    return (
      <p className="text-sm">
        <span className="font-semibold">{block.title}</span>
        {block.value ? `: ${block.value}` : ""}
      </p>
    );
  }
  if (block.type === "list") {
    return (
      <div>
        <p className="text-sm font-semibold">{block.title}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {block.items.map((it: string, i: number) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    );
  }
  if (block.type === "text") {
    return (
      <div>
        <p className="text-sm font-semibold">{block.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>
      </div>
    );
  }
  if (block.type === "text_with_items") {
    return (
      <div>
        <p className="text-sm font-semibold">{block.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
          {block.items.map((it: string, i: number) => <li key={i}>{it}</li>)}
        </ul>
      </div>
    );
  }
  if (block.type === "text_with_subitems") {
    return (
      <div>
        <p className="text-sm font-semibold">{block.title}</p>
        {block.description && <p className="mt-1 text-sm text-muted-foreground">{block.description}</p>}
        <div className="mt-2 space-y-2">
          {block.items.map((it: any, i: number) => (
            <div key={i}>
              <p className="text-sm font-semibold text-primary">{it.name}</p>
              <p className="text-sm text-muted-foreground">{it.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function FunctionPicker({
  category,
  selectedIds,
  toggleSelect,
  moveFunction,
  openEditor,
  isCustomized,
  overrides,
}: {
  category: "EVENT" | "STANDARD";
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  moveFunction: (index: number, dir: number) => void;
  openEditor: (id: string) => void;
  isCustomized: (id: string) => boolean;
  overrides: any;
}) {
  const fns = LIBRARY.filter((f) => f.category === category);
  const selectedOfCategory = selectedIds.filter((id) => fns.some((f) => f.id === id));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold">1. Select {category === "EVENT" ? "functions" : "sections"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tap a card to add it to the proposal. Tap again to remove.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fns.map((fn) => {
            const selected = selectedIds.includes(fn.id);
            return (
              <button
                key={fn.id}
                onClick={() => toggleSelect(fn.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                <div>
                  <p className="font-medium">{fn.name}</p>
                  <p className="text-xs text-muted-foreground">{fn.blocks.length} content block{fn.blocks.length !== 1 ? "s" : ""}</p>
                </div>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                  }`}
                >
                  <Check className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">2. Your proposal</h2>
        <p className="mt-1 text-sm text-muted-foreground">Edit any function's content, or leave it as the default.</p>

        {selectedOfCategory.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No items selected yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {selectedOfCategory.map((id, index) => {
              const fn = fns.find((f) => f.id === id)!;
              const globalIndex = selectedIds.indexOf(id);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-medium">{fn.name}</p>
                      {isCustomized(id) && (
                        <span className="text-xs font-medium text-amber-600">Edited</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveFunction(globalIndex, -1)} disabled={globalIndex === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveFunction(globalIndex, 1)} disabled={globalIndex === selectedIds.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditor(id)} className="ml-2 gap-1">
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleSelect(id)} className="text-muted-foreground hover:text-red-500">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function EventBuilder({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"INFO" | "FUNCTIONS" | "TERMS">("INFO");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [info, setInfo] = useState({
    eventName: "",
    clientName: "",
    venue: "",
    startDate: "",
    endDate: "",
    guestCount: "",
  });

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await createEventProposal({
        eventName: info.eventName,
        clientName: info.clientName,
        venue: info.venue,
        eventDate: info.startDate,
        guestCount: Number(info.guestCount) || 0,
        functions: selectedIds.map((id, index) => ({
          functionId: id,
          sortOrder: index,
          overrideJson: overrides[id] || null,
        })),
      });
      router.push(`/events/${res.id}/pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getBlocks = (id: string) => overrides[id] || LIBRARY.find((f) => f.id === id)!.blocks;
  const isCustomized = (id: string) => Boolean(overrides[id]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const moveFunction = (index: number, dir: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const openEditor = (id: string) => {
    setEditingId(id);
    setDraft(clone(getBlocks(id)));
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEditor = () => {
    setOverrides((prev) => ({ ...prev, [editingId!]: draft }));
    closeEditor();
  };

  const resetToDefault = () => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[editingId!];
      return next;
    });
    setDraft(clone(LIBRARY.find((f) => f.id === editingId)!.blocks));
  };

  const updateDraftBlock = (index: number, updatedBlock: any) => {
    setDraft((prev: any) => {
      const next = [...prev];
      next[index] = updatedBlock;
      return next;
    });
  };

  const editingFunction = editingId ? LIBRARY.find((f) => f.id === editingId) : null;

  return (
    <div className="flex flex-col gap-6 w-full pb-20">
      {/* Tab Navigation */}
      <div className="flex border-b border-border">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "INFO" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("INFO")}
        >
          PDF Info
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "FUNCTIONS" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("FUNCTIONS")}
        >
          Functions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "TERMS" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("TERMS")}
        >
          Please Note & Terms
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Active Tab Content */}
        <div>
          {activeTab === "INFO" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Event Name</label>
                <Input value={info.eventName} onChange={(e) => setInfo({ ...info, eventName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Client Name</label>
                <Input value={info.clientName} onChange={(e) => setInfo({ ...info, clientName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Venue</label>
                <Input value={info.venue} onChange={(e) => setInfo({ ...info, venue: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Event Start Date</label>
                  <Input type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Event End Date</label>
                  <Input type="date" value={info.endDate} onChange={(e) => setInfo({ ...info, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Guest Count</label>
                <Input type="number" value={info.guestCount} onChange={(e) => setInfo({ ...info, guestCount: e.target.value })} />
              </div>
              <Button className="w-full mt-4" onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Proposal"}
              </Button>
            </div>
          )}

          {activeTab === "FUNCTIONS" && (
            <FunctionPicker
              category="EVENT"
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              moveFunction={moveFunction}
              openEditor={openEditor}
              isCustomized={isCustomized}
              overrides={overrides}
            />
          )}

          {activeTab === "TERMS" && (
            <FunctionPicker
              category="STANDARD"
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              moveFunction={moveFunction}
              openEditor={openEditor}
              isCustomized={isCustomized}
              overrides={overrides}
            />
          )}
        </div>

        {/* Right Side: Live Preview */}
        <div className="rounded-lg border bg-card p-6 sticky top-6 shadow-sm min-h-[500px]">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>
          {selectedIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Select functions to see preview.</p>
          ) : (
            <div className="space-y-8">
              {selectedIds.map((id) => {
                const fn = LIBRARY.find((f) => f.id === id)!;
                return (
                  <div key={id}>
                    <h3 className="mb-2 border-b pb-1 font-serif text-lg font-semibold uppercase tracking-wide">
                      {fn.name}
                    </h3>
                    <div className="space-y-4 mt-4">
                      {getBlocks(id).map((block: any) => (
                        <BlockPreview key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal Overlay */}
      {editingId && editingFunction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="flex w-full max-w-2xl flex-col rounded-lg bg-card shadow-xl max-h-[85vh]">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h3 className="font-semibold text-lg">Edit — {editingFunction.name}</h3>
              <Button variant="ghost" size="icon" onClick={closeEditor}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              {draft.map((block: any, i: number) => (
                <div key={block.id} className="border-b pb-4 last:border-0">
                  <BlockEditor block={block} onChange={(b) => updateDraftBlock(i, b)} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3 bg-muted/20">
              <Button variant="ghost" onClick={resetToDefault} className="text-sm gap-1">
                <RotateCcw className="h-3 w-3" /> Reset to default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={closeEditor}>Cancel</Button>
                <Button onClick={saveEditor}>Save changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
