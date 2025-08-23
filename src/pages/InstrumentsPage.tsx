import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface Instrument {
  symbol: string;
  price: number;
}

export default function InstrumentsPage() {
  const { toast } = useToast();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [symbol, setSymbol] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number | "">("");
  const [rowSaving, setRowSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/instruments");
      if (!res.ok) throw new Error(`Failed to load instruments: ${res.status}`);
      const data = (await res.json()) as Instrument[];
      setInstruments(data);
    } catch (e: any) {
      toast({ title: "Failed to load instruments", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || price === "" || Number(price) <= 0) {
      toast({ title: "Invalid input", description: "Symbol and positive price are required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), price: Number(price) }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      toast({ title: "Instrument saved", description: `${symbol.toUpperCase()} @ $${Number(price).toFixed(2)}` });
      setSymbol("");
      setPrice("");
      await load();
    } catch (e: any) {
      toast({ title: "Failed to save instrument", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (sym: string) => {
    try {
      const res = await fetch(`/api/instruments/${encodeURIComponent(sym)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      toast({ title: "Instrument removed", description: sym });
      await load();
    } catch (e: any) {
      toast({ title: "Failed to delete instrument", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const startEdit = (ins: Instrument) => {
    setEditingSymbol(ins.symbol);
    setEditPrice(ins.price);
  };

  const cancelEdit = () => {
    setEditingSymbol(null);
    setEditPrice("");
  };

  const saveEdit = async () => {
    if (!editingSymbol || editPrice === "" || Number(editPrice) <= 0) {
      toast({ title: "Invalid input", description: "Enter a positive price", variant: "destructive" });
      return;
    }
    try {
      setRowSaving(editingSymbol);
      const res = await fetch("/api/instruments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: editingSymbol, price: Number(editPrice) }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      toast({ title: "Price updated", description: `${editingSymbol} @ $${Number(editPrice).toFixed(2)}` });
      setEditingSymbol(null);
      setEditPrice("");
      await load();
    } catch (e: any) {
      toast({ title: "Failed to update price", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRowSaving(null);
    }
  };

  const sorted = useMemo(() => [...instruments].sort((a, b) => a.symbol.localeCompare(b.symbol)), [instruments]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Instruments
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Define tradable symbols and their prices.</p>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Add / Update Instrument</h3>
        </div>
        <div className="px-4 pb-6 sm:px-6">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                type="number"
                step="any"
                min="0"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className={`w-full rounded px-4 py-2 text-white ${loading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="px-4 py-5 sm:px-6 flex items-center">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Universe</h3>
          <button
            onClick={load}
            className="ml-auto rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Symbol</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">No instruments defined</td>
                </tr>
              ) : (
                sorted.map((ins) => (
                  <tr key={ins.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{ins.symbol}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
                      {editingSymbol === ins.symbol ? (
                        <input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          type="number"
                          step="any"
                          min="0"
                          className="w-32 rounded-md border border-gray-300 p-1 text-right dark:border-gray-600 dark:bg-gray-900"
                          autoFocus
                        />
                      ) : (
                        `$${ins.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm space-x-2">
                      {editingSymbol === ins.symbol ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={rowSaving === ins.symbol}
                            className={`rounded px-3 py-1 text-white ${rowSaving === ins.symbol ? 'bg-green-600/50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded bg-gray-200 px-3 py-1 dark:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(ins)}
                            className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(ins.symbol)}
                            className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
