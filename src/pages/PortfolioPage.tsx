import { usePortfolio } from "@/contexts/PortfolioContext"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"

export default function PortfolioPage() {
  const { portfolio, isLoading, error, refresh } = usePortfolio()
  const { toast } = useToast()

  // Add Position form state
  const [symbol, setSymbol] = useState("")
  const [quantity, setQuantity] = useState<number | "">("")
  const [averageCost, setAverageCost] = useState<number | "">("")

  // Per-row price edit state: symbol -> input value
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({})

  // Local transaction log for this session
  type Transaction = {
    id: string
    type: 'BUY' | 'SELL'
    symbol: string
    quantity: number
    price?: number
    timestamp: string
  }
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!symbol || !quantity) {
      toast({ title: "Missing fields", description: "Symbol and quantity are required", variant: "destructive" })
      return
    }
    try {
      const res = await fetch("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, quantity: Number(quantity), average_cost: averageCost === "" ? undefined : Number(averageCost) })
      })
      if (!res.ok) throw new Error(`Add position failed: ${res.status}`)
      toast({ title: "Bought position", description: `${symbol} x ${quantity}` })
      // Log transaction (use provided average cost as price if available)
      setTransactions(prev => [
        {
          id: crypto.randomUUID(),
          type: 'BUY',
          symbol,
          quantity: Number(quantity),
          price: averageCost === '' ? undefined : Number(averageCost),
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
      setSymbol("")
      setQuantity("")
      setAverageCost("")
      // SSE will push the updated portfolio; offer manual refresh as well
      refresh?.()
    } catch (err: any) {
      toast({ title: "Failed to buy position", description: err.message ?? String(err), variant: "destructive" })
    }
  }

  const handlePriceChangeInput = (sym: string, val: string) => {
    setPriceEdits(prev => ({ ...prev, [sym]: val }))
  }

  const handleUpdatePrice = async (sym: string) => {
    const val = priceEdits[sym]
    const price = Number(val)
    if (!val || Number.isNaN(price)) {
      toast({ title: "Invalid price", description: "Enter a numeric price", variant: "destructive" })
      return
    }
    try {
      const res = await fetch("/api/update-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, price })
      })
      if (!res.ok) throw new Error(`Update price failed: ${res.status}`)
      toast({ title: "Price updated", description: `${sym} → ${price.toFixed(2)}` })
      refresh?.()
    } catch (err: any) {
      toast({ title: "Failed to update price", description: err.message ?? String(err), variant: "destructive" })
    }
  }

  const handleSell = async (idOrSymbol: string, qty?: number, price?: number) => {
    try {
      const res = await fetch(`/api/portfolio/positions/${encodeURIComponent(idOrSymbol)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      const data = await res.json().catch(() => ({} as any))
      const status = data?.status ?? "sold"
      toast({ title: `Position ${status}`, description: idOrSymbol })
      // Log transaction (full position sell assumed)
      setTransactions(prev => [
        {
          id: crypto.randomUUID(),
          type: 'SELL',
          symbol: idOrSymbol,
          quantity: qty ?? 0,
          price,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ])
      refresh?.()
    } catch (err: any) {
      toast({ title: "Failed to sell position", description: err.message ?? String(err), variant: "destructive" })
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Portfolio Summary Card */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Portfolio Value</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${portfolio?.totalValue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </p>
              {portfolio?.dailyChange && (
                <span className={`ml-2 text-sm font-medium ${
                  portfolio.dailyChange.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {portfolio.dailyChange.amount >= 0 ? '+' : ''}
                  {portfolio.dailyChange.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({portfolio.dailyChange.percent >= 0 ? '+' : ''}{portfolio.dailyChange.percent.toFixed(2)}%)
                </span>
              )}
              <button
                className="ml-auto rounded bg-gray-200 px-3 py-1 text-sm dark:bg-gray-700"
                onClick={() => refresh?.()}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Add Position */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 lg:col-span-2">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Buy Position</h3>
          </div>
          <form onSubmit={handleBuy} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
              <input
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                type="number"
                step="any"
                min="0"
                placeholder="10"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Average Cost (optional)</label>
              <input
                value={averageCost}
                onChange={e => setAverageCost(e.target.value === '' ? '' : Number(e.target.value))}
                type="number"
                step="any"
                min="0"
                placeholder="150.00"
                className="mt-1 w-full rounded-md border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </div>
            <div className="sm:col-span-6">
              <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Buy</button>
            </div>
          </form>
        </div>

        {/* Positions Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 lg:col-span-3">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Positions</h3>
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Update Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {portfolio?.positions?.map((position) => (
                  <tr key={position.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {position.symbol}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                      {position.quantity.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                      ${position.averagePrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                      ${position.currentPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                      ${position.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium ${
                      position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${position.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' '}({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          value={priceEdits[position.symbol] ?? ''}
                          onChange={e => handlePriceChangeInput(position.symbol, e.target.value)}
                          type="number"
                          step="any"
                          placeholder="New price"
                          className="w-28 rounded-md border border-gray-300 p-1 text-right dark:border-gray-600 dark:bg-gray-900"
                        />
                        <button
                          className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                          onClick={() => handleUpdatePrice(position.symbol)}
                        >
                          Set
                        </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                      onClick={() => handleSell(position.symbol, position.quantity, position.currentPrice)}
                    >
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Log */}
      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800 lg:col-span-3">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Transactions</h3>
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
)
}
