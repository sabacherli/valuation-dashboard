import { usePortfolio } from "@/contexts/PortfolioContext"

export default function RiskAnalysisPage() {
  const { portfolio, isLoading, error } = usePortfolio()

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 dark:text-white">Loading risk data...</div>
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
            <h3 className="text-sm font-medium text-red-800">Error loading risk data</h3>
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
          Risk Analysis
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Value at Risk */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Value at Risk (VaR)</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">1-Day 95% VaR</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  -${portfolio?.riskMetrics?.var1d95?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">10-Day 95% VaR</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  -${portfolio?.riskMetrics?.var10d95?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Volatility */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Volatility</h3>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Annualized Volatility</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {(portfolio?.riskMetrics?.volatility1y !== undefined ? (portfolio.riskMetrics.volatility1y * 100).toFixed(2) : '0.00')}%
              </p>
            </div>
          </div>
        </div>

        {/* Beta & Correlations */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Market Correlation</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Beta</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {portfolio?.riskMetrics?.beta?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drawdown */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Drawdown</h3>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Maximum Drawdown</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {(portfolio?.riskMetrics?.maxDrawdown !== undefined ? (portfolio.riskMetrics.maxDrawdown * 100).toFixed(2) : '0.00')}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
