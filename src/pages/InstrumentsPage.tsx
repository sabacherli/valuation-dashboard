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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; description?: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  // no row editing anymore
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

  // Typeahead search for symbols via backend /api/symbols/search
  useEffect(() => {
    // If a symbol is already selected, do not fetch or show suggestions
    if (symbol) {
      setSearchResults([]);
      return;
    }
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(searchQuery.trim())}&exchange=US`, { signal: controller.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({} as any));
          throw new Error(body?.error ? `${res.status}: ${body.error}` : `Failed to search symbols: ${res.status}`);
        }
        const data = (await res.json()) as Array<{ symbol: string; description?: string }>;
        setSearchResults(data);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          toast({ title: "Failed to search symbols", description: e?.message ?? String(e), variant: "destructive" });
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery, symbol, toast]);

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
    const sym = symbol.trim().toUpperCase();
    if (!sym) {
      toast({ title: "Invalid input", description: "Symbol is required", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/instruments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => ({} as any));
        throw new Error(msg?.error ? `${res.status}: ${msg.error}` : `Subscribe failed: ${res.status}`);
      }
      toast({ title: "Subscribed", description: `${sym} added. Live prices will update as trades arrive.` });
      // Switch selection to the newly subscribed symbol and refresh history
      setSelectedSymbol(sym);
      await load();
      await fetchHistory(sym, days);
      setSymbol("");
      setSearchQuery("");
    } catch (e: any) {
      toast({ title: "Failed to subscribe instrument", description: e?.message ?? String(e), variant: "destructive" });
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

  // Removed manual price edit functionality

  const sorted = useMemo(() => [...instruments].sort((a, b) => a.symbol.localeCompare(b.symbol)), [instruments]);

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Instruments
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Subscribe symbols via Finnhub and view their prices and history.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Subscribe card */}
          <div className="overflow-visible rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Subscribe Instrument</h3>
            </div>
            <div className="px-4 pb-6 sm:px-6">
              <form onSubmit={onSubmit}>
                {/* Row: input + button aligned bottom */}
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="relative sm:flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSymbol("");
                      }}
                      placeholder="Type 2+ letters (e.g., AAP, appl)"
                      className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                    />
                    {/* Custom suggestions dropdown */}
                    {!symbol && searchResults.length > 0 && (
                      <ul
                        role="listbox"
                        className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900"
                      >
                        {searchResults.map((s) => (
                          <li
                            key={s.symbol}
                            role="option"
                            aria-selected={false}
                            onMouseDown={(e) => {
                              // onMouseDown to avoid input blur before click
                              e.preventDefault();
                              setSearchQuery(s.symbol);
                              setSymbol(s.symbol);
                              setSearchResults([]);
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={s.description || s.symbol}
                          >
                            <span className="font-medium">{s.symbol}</span>
                            {s.description && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{s.description}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="sm:w-40">
                    <button
                      type="submit"
                      disabled={loading || !symbol}
                      className={`w-full rounded px-4 py-2 text-white ${loading || !symbol ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"}`}
                    >
                      Subscribe
                    </button>
                  </div>
                </div>
                {/* Helper/selection text below, not affecting button alignment */}
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{searchLoading ? "Searching..." : searchResults.length > 0 ? "Click a suggestion to select a symbol" : ""}</div>
                {symbol && <div className="mt-2 text-xs text-gray-500">Selected: {symbol}</div>}
              </form>
            </div>
          </div>

          {/* Universe card */}
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6 flex items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Universe</h3>
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
                          {`$${ins.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(ins.symbol); }}
                            className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700 cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Price history */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="px-4 py-5 sm:px-6 flex items-center gap-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Price History</h3>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedSymbol ?? '—'}</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded border border-gray-300 bg-white p-1 text-sm dark:border-gray-600 dark:bg-gray-900 cursor-pointer"
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
