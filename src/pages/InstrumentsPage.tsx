import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import * as d3 from "d3";

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
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [days, setDays] = useState(1);
  const [history, setHistory] = useState<Array<{ timestamp: string; price: number }>>([]);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    // default to first instrument when list loads
    if (!selectedSymbol && instruments.length > 0) {
      setSelectedSymbol(instruments[0].symbol);
    }
  }, [instruments, selectedSymbol]);

  const fetchHistory = async (sym: string, d: number) => {
    try {
      const res = await fetch(`/api/instruments/${encodeURIComponent(sym)}/history?days=${d}`);
      if (!res.ok) throw new Error(`Failed to load history: ${res.status}`);
      const data = (await res.json()) as Array<{ timestamp: string; price: number }>;
      setHistory(data);
    } catch (e: any) {
      toast({ title: "Failed to load price history", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  useEffect(() => {
    if (selectedSymbol) {
      fetchHistory(selectedSymbol, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol, days]);

  // D3 chart
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    // Prepare data: ensure we always include the latest price and confine to selected time span
    let data = history.map(h => ({ date: new Date(h.timestamp), price: h.price }));
    const nowUtcPrep = new Date();
    const spanMsPrep = days * 24 * 60 * 60 * 1000;
    const startPrep = new Date(nowUtcPrep.getTime() - spanMsPrep);
    // Filter data to the visible range (helps avoid drawing long horizontal segments outside range)
    data = data.filter(d => d.date >= startPrep && d.date <= nowUtcPrep);
    // Append the latest current price as the last point so the chart always reflects the latest value
    const ins = selectedSymbol ? instruments.find(i => i.symbol === selectedSymbol) : undefined;
    if (ins) {
      const last = data[data.length - 1];
      const nearlySameTime = last ? Math.abs(nowUtcPrep.getTime() - last.date.getTime()) < 500 : false;
      if (!nearlySameTime || last.price !== ins.price) {
        data.push({ date: nowUtcPrep, price: ins.price });
      }
    }
    if (data.length === 0) {
      // Fallback seed if still empty
      const now = nowUtcPrep;
      const prev = new Date(now.getTime() - 60 * 1000);
      const p = ins?.price ?? 1;
      data = [
        { date: prev, price: p },
        { date: now, price: p },
      ];
    }

    // Clear previous svg
    el.innerHTML = "";

    const { width: bw, height: bh } = el.getBoundingClientRect();
    const width = Math.max(300, Math.floor(bw || el.clientWidth || 600));
    const height = Math.max(260, Math.floor(bh || el.clientHeight || 320));
    const margin = { top: 16, right: 24, bottom: 28, left: 48 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3
      .select(el)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("background", "#ffffff");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Define clip path to keep drawings within the chart's inner area
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "plot-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH);

    const plot = g.append("g").attr("clip-path", "url(#plot-clip)");

    // Scales
    // Fix the x-domain to the selected timespan so the entire range is always visible
    const nowUtc = nowUtcPrep;
    const spanMs = spanMsPrep;
    const start = startPrep;
    const end = nowUtc;
    const x = d3
      .scaleUtc()
      .domain([start, end])
      .range([0, innerW]);

    const [minP, maxP] = d3.extent(data, (d: { date: Date; price: number }) => d.price) as [number, number];
    const pad = (maxP - minP || 1) * 0.05;
    const y = d3
      .scaleLinear()
      .domain([minP - pad, maxP + pad])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    const yAxisGrid = d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(() => "");
    g.append("g")
      .attr("class", "grid grid-y")
      .attr("stroke", "#e5e7eb")
      .call(yAxisGrid as any)
      .selectAll(".tick line")
      .attr("opacity", 1);

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6);
    const yAxis = d3.axisLeft(y).ticks(5).tickFormat((d: d3.NumberValue, _i: number) => `$${(+d).toFixed(2)}` as unknown as string);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .attr("color", "#6b7280")
      .call(xAxis as any);

    g.append("g")
      .attr("color", "#6b7280")
      .call(yAxis as any);

    // Line
    const line = d3
      .line<{ date: Date; price: number }>()
      .x((d: { date: Date; price: number }) => x(d.date))
      .y((d: { date: Date; price: number }) => y(d.price))
      // Use step curve for 90-degree angles between points
      .curve(d3.curveStepAfter);

    plot.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 2)
      .attr("d", line as any);

    // Points at price changes
    type Pt = { date: Date; price: number; prev?: number };
    const points: Pt[] = data
      .map((d, i) => ({ ...d, prev: i > 0 ? data[i - 1].price : undefined }))
      .filter((d, i) => i > 0 && d.prev !== undefined && d.price !== d.prev);

    const circles = plot
      .selectAll<SVGCircleElement, Pt>("circle.change-point")
      .data(points)
      .enter()
      .append("circle")
      .attr("class", "change-point")
      .attr("r", 3.5)
      .attr("cx", (d: Pt) => x(d.date))
      .attr("cy", (d: Pt) => y(d.price))
      .attr("fill", "#2563eb")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // Tooltip (SVG-based)
    const tooltip = g.append("g").attr("class", "tooltip").style("pointer-events", "none").style("display", "none");
    const tipBg = tooltip
      .append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#111827")
      .attr("opacity", 0.95);
    const tipText = tooltip
      .append("text")
      .attr("font-size", 12)
      .attr("font-family", "ui-sans-serif, system-ui")
      .attr("fill", "#e5e7eb");
    const tipLine1 = tipText.append("tspan").attr("x", 0).attr("dy", "1em");
    const tipLine2 = tipText.append("tspan").attr("x", 0).attr("dy", "1.2em");

    function showTooltip(d: Pt) {
      const delta = d.prev !== undefined ? d.price - d.prev : 0;
      const isUp = delta >= 0;
      const arrow = isUp ? "▲" : "▼";
      const color = isUp ? "#16a34a" : "#dc2626"; // green/red

      tipLine1.text(`$${d.price.toFixed(2)}`);
      tipLine2.text(`${arrow} $${Math.abs(delta).toFixed(2)}`).attr("fill", color);

      // measure and position
      const padding = 8;
      const bbox = (tipText.node() as SVGGraphicsElement).getBBox();
      const w = bbox.width + padding * 2;
      const h = bbox.height + padding * 2;

      tipBg.attr("width", w).attr("height", h);
      tipText.attr("transform", `translate(${padding},${padding - 2})`);

      let tx = x(d.date) + margin.left + 10;
      let ty = y(d.price) + margin.top - h - 10;
      // keep within chart bounds
      tx = Math.max(margin.left, Math.min(margin.left + innerW - w, tx));
      ty = Math.max(margin.top, Math.min(margin.top + innerH - h, ty));

      tooltip.attr("transform", `translate(${tx - margin.left},${ty - margin.top})`).style("display", null as any);
    }

    function hideTooltip() {
      tooltip.style("display", "none");
      tipLine2.attr("fill", "#e5e7eb");
    }

    circles
      .on("mouseenter", function (_event: any, d: Pt) {
        showTooltip(d);
      })
      .on("mousemove", function (_event: any, d: Pt) {
        showTooltip(d);
      })
      .on("mouseleave", function () {
        hideTooltip();
      });

    // Handle resize
    const ro = new ResizeObserver(() => {
      // Re-run effect on size change by updating a key via state would be ideal; simplest: redraw now
      // Trigger redraw by setting innerHTML then calling the effect again
      // We can't directly re-run effect here; rely on layout changes from user interactions.
      // No-op; keeping observer in case container size changes between tab switches.
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [history, selectedSymbol, instruments, days]);

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
      // Refresh chart if we updated the selected symbol
      const justSaved = symbol.toUpperCase();
      if (selectedSymbol && justSaved === selectedSymbol) {
        await fetchHistory(selectedSymbol, days);
      }
    } catch (e: any) {
      toast({ title: "Failed to save instrument", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (sym: string) => {
    try {
      const res = await fetch(`/api/instruments/${encodeURIComponent(sym)}`, { method: "DELETE" });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({} as any));
        toast({
          title: "Cannot delete instrument",
          description: body?.error ?? "Instrument has open positions. Close positions before deleting.",
          variant: "destructive",
        });
        return;
      }
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
      // Refresh chart if we edited the selected symbol
      if (selectedSymbol && editingSymbol === selectedSymbol) {
        await fetchHistory(selectedSymbol, days);
      }
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

      {/* Two-column split */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Add/Update + Universe */}
        <div className="space-y-6">
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
                      <tr
                        key={ins.symbol}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedSymbol === ins.symbol ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                        onClick={() => setSelectedSymbol(ins.symbol)}
                      >
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
                                onClick={(e) => { e.stopPropagation(); startEdit(ins); }}
                                className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDelete(ins.symbol); }}
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

        {/* Right: Price history chart */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="px-4 py-5 sm:px-6 flex items-center gap-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Price History</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedSymbol ?? '—'}</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white p-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                title="Range"
              >
                <option value={1}>1D</option>
                <option value={5}>5D</option>
                <option value={30}>1M</option>
                <option value={90}>3M</option>
                <option value={365}>1Y</option>
              </select>
            </div>
          </div>
          <div className="px-4 pb-6 sm:px-6">
            {selectedSymbol ? (
              <div ref={chartContainerRef} className="h-80 w-full" />
            ) : (
              <div className="h-80 w-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">Select a symbol to view history</div>
            )}
            {selectedSymbol && history.length === 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">No history for selected range.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
