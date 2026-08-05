type StoredValue = {
  value: string;
  expiresAt: number;
};

const store = new Map<string, StoredValue>();

export const redis = {
  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, mode?: "EX", ttlSeconds?: number): Promise<"OK"> {
    const expiresAt =
      mode === "EX" && ttlSeconds !== undefined
        ? Date.now() + ttlSeconds * 1000
        : Number.MAX_SAFE_INTEGER;
    store.set(key, { value, expiresAt });
    return "OK";
  },

  async del(key: string): Promise<number> {
    return store.delete(key) ? 1 : 0;
  },
};
