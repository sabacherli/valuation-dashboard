import { useEffect, useMemo, useRef, useState } from 'react'

export type PriceTick = { symbol: string; price: number; ts: string }

export function usePriceStream(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceTick>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const query = useMemo(() => symbols.filter(Boolean).join(','), [symbols])

  useEffect(() => {
    if (!query) {
      // Cleanup any existing stream
      if (esRef.current) { esRef.current.close(); esRef.current = null }
      setIsConnected(false)
      return
    }

    // Close any existing connection first
    if (esRef.current) { esRef.current.close(); esRef.current = null }

    try {
      const url = `/api/price-stream?symbols=${encodeURIComponent(query)}`
      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => { setIsConnected(true); setError(null) }

      es.onerror = () => {
        setIsConnected(false)
        setError(new Error('Price stream connection error'))
      }

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          // Skip non-tick ack messages
          if (data && data.symbol && typeof data.price === 'number') {
            const tick = data as PriceTick
            setPrices(prev => {
              const existing = prev[tick.symbol]
              if (!existing || existing.price !== tick.price) {
                return { ...prev, [tick.symbol]: tick }
              }
              return prev
            })
          }
        } catch { /* ignore parse errors */ }
      }

      return () => { es.close(); esRef.current = null; setIsConnected(false) }
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error('Failed to open price stream'))
      setIsConnected(false)
    }
  }, [query])

  return { prices, isConnected, error }
}
