export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  sector?: string;
  assetClass?: string;
  currency?: string;
}

export interface RiskMetrics {
  var1d95?: number;
  var10d95?: number;
  expectedShortfall95?: number;
  volatility1y?: number;
  beta?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  trackingError?: number;
  informationRatio?: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn?: number;
  ytdReturn?: number;
  monthlyReturn?: number;
  quarterlyReturn?: number;
  annualReturn?: number;
}

export interface PortfolioUpdate {
  id?: string;
  timestamp: string;
  totalValue: number;
  cashBalance: number;
  positions: Position[];
  dailyChange: {
    amount: number;
    percent: number;
  };
  riskMetrics?: RiskMetrics;
  performanceMetrics?: PerformanceMetrics;
  lastUpdated?: string;
}

export interface PortfolioSummary {
  id?: string;
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  dailyChange: {
    amount: number;
    percent: number;
  };
  assetAllocation: Array<{
    assetClass: string;
    value: number;
    percentage: number;
  }>;
  sectorAllocation?: Array<{
    sector: string;
    value: number;
    percentage: number;
  }>;
}
