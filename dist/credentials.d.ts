/**
 * Provider credentials store — saves API keys + emails for upstream LLM
 * providers (Anthropic, OpenAI, Grok, DeepSeek, Kimi/Moonshot, Perplexity).
 *
 * Storage: /media/knight2/EDS2/virtualpc-state/credentials.json (gitignored)
 * Reading: returns *masked* values (show first 4 + last 4 chars only).
 * Writing: replaces a single provider's record at a time.
 *
 * Loaded into process.env on startup so VirtualPC's LM Studio router and any
 * cloud-fallback wrappers can see them without restarts.
 */
export interface ProviderRecord {
    provider: string;
    email: string;
    api_key: string;
    base_url?: string;
    notes?: string;
    updated_at: string;
}
export interface ProviderMeta {
    id: string;
    label: string;
    default_base_url: string;
    /** Env var name we expose so the rest of the app finds the key without changes. */
    env_var: string;
    docs_url: string;
}
export declare const PROVIDER_CATALOG: ProviderMeta[];
export declare function loadCredentials(): void;
export declare function listMasked(): {
    configured: boolean;
    email: string;
    api_key_masked: string;
    base_url: string;
    notes: string;
    updated_at: string | null;
    id: string;
    label: string;
    default_base_url: string;
    /** Env var name we expose so the rest of the app finds the key without changes. */
    env_var: string;
    docs_url: string;
}[];
export declare function setProvider(provider: string, fields: {
    email?: string;
    api_key?: string;
    base_url?: string;
    notes?: string;
}): {
    provider: string;
    email: string;
    api_key_masked: string;
};
export declare function deleteProvider(provider: string): {
    removed: boolean;
};
//# sourceMappingURL=credentials.d.ts.map