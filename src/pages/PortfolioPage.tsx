import { usePortfolio } from "@/contexts/PortfolioContext"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/components/ui/use-toast"

export default function PortfolioPage() {
  const { portfolio, isLoading, error } = usePortfolio()
  const { toast } = useToast()

  // Add Position form state
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [sellSymbol, setSellSymbol] = useState("")
  const [sellQuantity, setSellQuantity] = useState<number | "">("")
  const [sellPrice, setSellPrice] = useState<number | "">("")

  

  // Local transaction log for this session
  type Transaction = {
    id: string
    type: 'BUY' | 'SELL'
    symbol: string
    quantity: number
    price?: number
    timestamp: string
  }

  const clearTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', { method: 'DELETE' })
      if (!res.ok) throw new Error(`Clear failed: ${res.status}`)
      setTransactions([])
      // Reset sell form after clearing
      setSellSymbol('')
      setSellQuantity('')
      setSellPrice('')
      toast({ title: 'Transactions cleared', description: 'All trades have been removed.' })
    } catch (err: any) {
      toast({ title: 'Failed to clear transactions', description: err.message ?? String(err), variant: 'destructive' })
    }
  }

  // Currently selected aggregated position for the Sell form
  const sellQtyNum = sellQuantity === '' ? 0 : Number(sellQuantity)
  const sellPriceNum = sellPrice === '' ? NaN : Number(sellPrice)
  const isSellValid = Boolean(
    sellSymbol &&
    Number.isFinite(sellQtyNum) && sellQtyNum > 0 &&
    Number.isFinite(sellPriceNum) && sellPriceNum > 0
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Instruments loaded from backend to restrict Buy symbols
  const [instruments, setInstruments] = useState<{ symbol: string; price: number }[]>([])
  useEffect(() => {
    let cancelled = false
    const loadInstruments = async () => {
      try {
        const res = await fetch('/api/instruments')
        if (!res.ok) throw new Error(`Failed to load instruments: ${res.status}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setInstruments(data as { symbol: string; price: number }[])
      } catch (e: any) {
        toast({ title: 'Failed to load instruments', description: e?.message ?? String(e), variant: 'destructive' })
      }
    }
    loadInstruments()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only aggregated view

  // Group positions by symbol and compute aggregated rows + children
  const grouped = useMemo(() => {
    const list = portfolio?.positions ?? []
    type Sums = { symbol: string; qty: number; totalCost: number; marketValue: number; currentValue: number }
    const sums = new Map<string, Sums>()
    const children = new Map<string, typeof list>()
    for (const p of list) {
      const s = sums.get(p.symbol) ?? { symbol: p.symbol, qty: 0, totalCost: 0, marketValue: 0, currentValue: 0 }
      s.qty += p.quantity
      s.totalCost += p.quantity * p.averagePrice
      s.marketValue += p.marketValue
      s.currentValue += p.quantity * p.currentPrice
      sums.set(p.symbol, s)
      const arr = children.get(p.symbol) ?? []
      arr.push(p)
      children.set(p.symbol, arr)
    }
    const groups = Array.from(sums.values()).map((s) => {
      const averagePrice = s.qty > 0 ? s.totalCost / s.qty : 0
      const currentPrice = s.qty > 0 ? s.currentValue / s.qty : 0
      const pnl = s.marketValue - s.totalCost
      const pnlPercent = s.totalCost !== 0 ? (pnl / s.totalCost) * 100 : 0
      const aggregate = {
        id: `agg-${s.symbol}`,
        symbol: s.symbol,
        quantity: s.qty,
        averagePrice,
        currentPrice,
        marketValue: s.marketValue,
        pnl,
        pnlPercent,
      }
      return { symbol: s.symbol, aggregate, children: children.get(s.symbol) ?? [] }
    })
    // Optional: sort by symbol
    groups.sort((a, b) => a.symbol.localeCompare(b.symbol))
    return groups
  }, [portfolio?.positions])

  // Selected aggregated position helper
  const selectedAgg = useMemo(() => grouped.find(g => g.symbol === sellSymbol)?.aggregate, [grouped, sellSymbol])

  // Load transactions from backend on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/transactions')
        if (!res.ok) throw new Error(`Failed to load transactions: ${res.status}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setTransactions(data as Transaction[])
      } catch (e: any) {
        console.warn('Failed to fetch transactions', e)
        toast({ title: 'Failed to load transactions', description: e?.message ?? String(e), variant: 'destructive' })
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !quantity) {
      toast({ title: "Missing fields", description: "Symbol and quantity are required", variant: "destructive" })
      return
    }
    const currentPrice = instruments.find(i => i.symbol === symbol)?.price
    if (currentPrice == null) {
      toast({ title: 'Price unavailable', description: 'Select a valid instrument with a known price', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity: Number(quantity), average_cost: currentPrice })
      })
      if (!res.ok) throw new Error(`Add position failed: ${res.status}`)
      toast({ title: "Bought position", description: `${symbol} x ${quantity}` })
      // Persist transaction to backend
      try {
        const txRes = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'BUY',
            symbol,
            quantity: Number(quantity),
            price: currentPrice,
          }),
        })
        if (txRes.ok) {
          const created = await txRes.json()
          setTransactions(prev => [created as Transaction, ...prev])
        }
      } catch {}
      setSymbol("")
      setQuantity("")
      // SSE will push the updated portfolio; manual refresh remains available via the button
    } catch (err: any) {
      toast({ title: "Failed to buy position", description: err.message ?? String(err), variant: "destructive" })
    }
  }

  

  const handleSell = async (symbolToSell: string, qty: number, price: number, maxQtyForSymbol: number) => {
    try {
      // Persist SELL transaction to backend; SSE will update the portfolio
      const txRes = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SELL',
          symbol: symbolToSell,
          quantity: qty,
          price,
        }),
      })
      if (!txRes.ok) throw new Error(`Sell failed: ${txRes.status}`)
      const created = await txRes.json()
      setTransactions(prev => [created as Transaction, ...prev])

      const full = qty === maxQtyForSymbol
      toast({
        title: full ? 'Sold entire position' : 'Sold shares',
        description: full ? `${symbolToSell}` : `${qty.toLocaleString()} of ${symbolToSell}`,
      })
    } catch (err: any) {
      toast({ title: 'Failed to sell position', description: err.message ?? String(err), variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">Loading portfolio data...</div>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Connecting to server...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading portfolio data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Portfolio Overview
        </h2>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: KPIs + Positions */}
        <div className="space-y-6">

          {/* Positions Table */}
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6 flex items-center gap-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Positions</h3>
              <div className="ml-auto flex items-center gap-2" />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Symbol</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Avg. Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Market Value</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {grouped.map(group => (
                      <tr key={`agg-${group.symbol}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {group.symbol}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          {group.aggregate.quantity.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          ${group.aggregate.averagePrice.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          ${group.aggregate.currentPrice.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100 font-semibold">
                          ${group.aggregate.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                          group.aggregate.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${group.aggregate.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {' '}({group.aggregate.pnlPercent >= 0 ? '+' : ''}{group.aggregate.pnlPercent.toFixed(2)}%)
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Buy/Sell forms + Transactions */}
        <div className="space-y-6">
          {/* Buy Form */}
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Buy Position</h3>
            </div>
            <div className="px-4 pb-6 sm:px-6">
              <form onSubmit={handleBuy} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
                  <select
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="">Select symbol</option>
                    {instruments.map(ins => (
                      <option key={ins.symbol} value={ins.symbol}>{ins.symbol}</option>
                    ))}
                  </select>
                  {symbol && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Current price: $
                      {instruments.find(i => i.symbol === symbol)?.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input
                    value={quantity}
                    onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    type="number"
                    step="1"
                    min="0"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Using current price as average cost: $
                    {symbol ? (instruments.find(i => i.symbol === symbol)?.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '-') : '-' }
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={!symbol || instruments.length === 0}
                    className={`w-full rounded px-4 py-2 text-white ${(!symbol || instruments.length === 0) ? 'bg-green-600/50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    Buy
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sell Form */}
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Sell Position</h3>
            </div>
            <div className="px-4 pb-6 sm:px-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!sellSymbol) {
                    toast({ title: 'Select a symbol', description: 'Choose a position to sell', variant: 'destructive' });
                    return;
                  }
                  const qtyNum = sellQuantity === '' ? 0 : Number(sellQuantity);
                  const maxQty = selectedAgg?.quantity ?? 0;
                  if (!qtyNum || Number.isNaN(qtyNum) || qtyNum <= 0) {
                    toast({ title: 'Invalid quantity', description: 'Enter a valid quantity to sell', variant: 'destructive' });
                    return;
                  }
                  if (qtyNum > maxQty) {
                    toast({ title: 'Quantity exceeds holding', description: `Max available: ${maxQty.toLocaleString()}`, variant: 'destructive' });
                    return;
                  }
                  if (sellPrice === '' || Number.isNaN(Number(sellPrice)) || Number(sellPrice) <= 0) {
                    toast({ title: 'Invalid price', description: 'Enter a positive numeric price', variant: 'destructive' });
                    return;
                  }
                  const priceNum = Number(sellPrice);
                  handleSell(sellSymbol, qtyNum, priceNum, maxQty);
                  setSellSymbol('');
                  setSellQuantity('');
                  setSellPrice('');
                }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
                  <select
                    value={sellSymbol}
                    onChange={e => {
                      const val = e.target.value;
                      setSellSymbol(val);
                      const agg = grouped.find(g => g.symbol === val)?.aggregate;
                      if (agg) {
                        setSellQuantity(agg.quantity);
                        setSellPrice(agg.currentPrice);
                      } else {
                        setSellQuantity('');
                        setSellPrice('');
                      }
                    }}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                  >
                    <option value="">Select symbol</option>
                    {grouped.map(g => (
                      <option key={g.symbol} value={g.symbol}>{g.symbol}</option>
                    ))}
                  </select>
                  {selectedAgg && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Holding: {selectedAgg.quantity.toLocaleString()} @ $
                      {selectedAgg.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                  <input
                    value={sellQuantity}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') { setSellQuantity(''); return; }
                      const num = Number(val);
                      if (Number.isNaN(num) || num < 0) { return; }
                      const max = selectedAgg?.quantity ?? Infinity;
                      if (num > max) {
                        setSellQuantity(max === Infinity ? num : max);
                        if (max !== Infinity) {
                          toast({ title: 'Quantity reduced', description: `Clamped to available ${max.toLocaleString()}`, variant: 'destructive' });
                        }
                      } else {
                        setSellQuantity(num);
                      }
                    }}
                    type="number"
                    step="1"
                    min="0"
                    max={selectedAgg?.quantity}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                    placeholder="Leave blank for full"
                  />
                  {selectedAgg && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Max: {selectedAgg.quantity.toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
                  <input
                    value={sellPrice}
                    onChange={e => setSellPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    type="number"
                    step="any"
                    min="0"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
                    required
                  />
                  {selectedAgg && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Required. Current: $
                      {selectedAgg.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={!isSellValid}
                    className={`w-full rounded px-4 py-2 text-white ${isSellValid ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600/50 cursor-not-allowed'}`}
                  >
                    Sell
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Transactions Log */}
          <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
            <div className="px-4 py-5 sm:px-6 flex items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Transactions</h3>
              <button
                onClick={clearTransactions}
                className="ml-auto rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
              >
                Clear log
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Symbol</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Price</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">No transactions yet</td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {tx.type}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                          {tx.symbol}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                          {tx.quantity.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                          {tx.price != null ? `$${tx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
