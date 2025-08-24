import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [hasWebhookSecret, setHasWebhookSecret] = useState<boolean | null>(null);
  const [apiKeyUpdatedAt, setApiKeyUpdatedAt] = useState<string | null>(null);
  const [webhookUpdatedAt, setWebhookUpdatedAt] = useState<string | null>(null);
  const [apiKeyReadOnly, setApiKeyReadOnly] = useState(true);
  const [webhookReadOnly, setWebhookReadOnly] = useState(true);
  // Style to mask text inputs like a password field without using type="password"
  const maskedStyle: any = { WebkitTextSecurity: 'disc' };

  // Randomized names to avoid password manager heuristics
  const apiKeyFieldName = useMemo(() => `api_key_${Math.random().toString(36).slice(2)}`, []);
  const webhookFieldName = useMemo(() => `webhook_secret_${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/provider-config");
        if (!res.ok) throw new Error(`Failed to load config (${res.status})`);
        const cfg = await res.json();
        if (typeof cfg.has_api_key === 'boolean') setHasApiKey(cfg.has_api_key);
        if (typeof cfg.has_webhook_secret === 'boolean') setHasWebhookSecret(cfg.has_webhook_secret);
        if (typeof cfg.api_key_updated_at === 'string' || cfg.api_key_updated_at === null) setApiKeyUpdatedAt(cfg.api_key_updated_at ?? null);
        if (typeof cfg.webhook_secret_updated_at === 'string' || cfg.webhook_secret_updated_at === null) setWebhookUpdatedAt(cfg.webhook_secret_updated_at ?? null);
        // Do not prefill secrets into inputs for safety
      } catch (e: any) {
        toast({ title: "Failed to load settings", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const payload: Record<string, string> = {};
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      if (webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();
      if (Object.keys(payload).length === 0) {
        toast({ title: "Nothing to update", description: "Enter a secret to update.", variant: "default" });
        return;
      }
      const res = await fetch("/api/admin/provider-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to save (${res.status})`);
      toast({ title: "Settings saved", description: "Provider configuration updated" });
      // Clear sensitive inputs after save
      setApiKey("");
      setWebhookSecret("");
      // Refresh timestamps after save
      try {
        const res = await fetch("/api/admin/provider-config");
        if (res.ok) {
          const cfg = await res.json();
          if (typeof cfg.api_key_updated_at === 'string' || cfg.api_key_updated_at === null) setApiKeyUpdatedAt(cfg.api_key_updated_at ?? null);
          if (typeof cfg.webhook_secret_updated_at === 'string' || cfg.webhook_secret_updated_at === null) setWebhookUpdatedAt(cfg.webhook_secret_updated_at ?? null);
          if (typeof cfg.has_api_key === 'boolean') setHasApiKey(cfg.has_api_key);
          if (typeof cfg.has_webhook_secret === 'boolean') setHasWebhookSecret(cfg.has_webhook_secret);
        }
      } catch {}
    } catch (e: any) {
      toast({ title: "Failed to save settings", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Settings
        </h2>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Market Data Provider: Finnhub</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure Finnhub secrets (API key and webhook secret). Values are stored securely on the server.
              </p>
            </div>

            <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="border-t border-gray-200 pt-4 dark:border-gray-700">
              {/* Honeypot fields to discourage autofill */}
              <div aria-hidden className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
                <input type="text" name="username" autoComplete="username" tabIndex={-1} />
                <input type="password" name="password" autoComplete="new-password" tabIndex={-1} />
              </div>
              <div className="space-y-4">

                <div>
                  <label htmlFor="finnhub-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Finnhub API Key
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="finnhub-api-key"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      inputMode="text"
                      name={apiKeyFieldName}
                      aria-autocomplete="none"
                      data-lpignore="true"
                      data-bwignore="true"
                      data-bitwarden-watching="false"
                      data-1p-ignore
                      readOnly={apiKeyReadOnly}
                      onFocus={() => setApiKeyReadOnly(false)}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter to update; left blank will keep existing"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                      style={maskedStyle}
                    />
                  </div>
                  {hasApiKey !== null && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Status: {hasApiKey ? <span className="text-green-600">Configured</span> : <span className="text-red-600">Not set</span>}
                      {apiKeyUpdatedAt && (
                        <span> · Last updated: {new Date(apiKeyUpdatedAt).toLocaleString()}</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="webhook-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Webhook Secret (for /price-stream)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="webhook-secret"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      inputMode="text"
                      name={webhookFieldName}
                      aria-autocomplete="none"
                      data-lpignore="true"
                      data-bwignore="true"
                      data-bitwarden-watching="false"
                      data-1p-ignore
                      readOnly={webhookReadOnly}
                      onFocus={() => setWebhookReadOnly(false)}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Enter to update; left blank will keep existing"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                      style={maskedStyle}
                    />
                  </div>
                  {hasWebhookSecret !== null && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Status: {hasWebhookSecret ? <span className="text-green-600">Configured</span> : <span className="text-red-600">Not set</span>}
                      {webhookUpdatedAt && (
                        <span> · Last updated: {new Date(webhookUpdatedAt).toLocaleString()}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </form>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || loading}
                className={`ml-3 inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${saving || loading ? 'bg-indigo-600/60 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {saving ? 'Saving…' : loading ? 'Loading…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

