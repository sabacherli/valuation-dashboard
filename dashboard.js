class ValuationDashboard {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8080/api';
        this.portfolioData = null;
        this.charts = {};
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.showLoading();
        await this.loadPortfolioData();
        this.hideLoading();
        this.startSSEConnection();
    }

    setupEventListeners() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportReport();
        });
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    async loadPortfolioData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/portfolio`);
            if (response.ok) {
                this.portfolioData = await response.json();
            } else {
                // Fallback to mock data
                this.portfolioData = await this.getMockPortfolioData();
            }
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading portfolio data:', error);
            // Fallback to mock data for demo
            this.portfolioData = await this.getMockPortfolioData();
            this.updateDashboard();
        }
    }

    startSSEConnection() {
        // Close existing connection if any
        if (this.eventSource) {
            this.eventSource.close();
        }

        try {
            this.eventSource = new EventSource(`${this.apiBaseUrl}/portfolio/stream`);
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.portfolioData = data;
                    this.updateDashboard();
                    console.log('📊 Portfolio data updated via SSE');
                } catch (error) {
                    console.error('Error parsing SSE data:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('SSE connection error:', error);
                // Fallback to polling if SSE fails
                this.startAutoRefresh();
            };

            this.eventSource.onopen = () => {
                console.log('🔗 SSE connection established');
                // Stop polling since SSE is working
                this.stopAutoRefresh();
            };

        } catch (error) {
            console.error('Failed to establish SSE connection:', error);
            // Fallback to polling
            this.startAutoRefresh();
        }
    }

    async getMockPortfolioData() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            totalValue: 17583.75,
            totalPnL: 28.75,
            totalVaR: 356.11,
            portfolioVolatility: 20.0,
            sharpeRatio: 1.25,
            maxDrawdown: 8.5,
            positions: [
                {
                    instrumentId: 'AAPL-STOCK',
                    instrumentType: 'Stock',
                    symbol: 'AAPL',
                    quantity: 100,
                    marketValue: 17550.00,
                    pnl: 50.00,
                    weight: 99.8,
                    delta: 1.00,
                    gamma: 0,
                    theta: 0,
                    vega: 0,
                    rho: 0
                },
                {
                    instrumentId: 'AAPL-CALL-180',
                    instrumentType: 'Option',
                    symbol: 'AAPL Call $180',
                    quantity: 10,
                    marketValue: 33.75,
                    pnl: -21.25,
                    weight: 0.2,
                    delta: 0.395,
                    gamma: 0.012,
                    theta: -0.85,
                    vega: 0.25,
                    rho: 0.08
                }
            ],
            greeks: {
                totalDelta: 103.95,
                totalGamma: 0.12,
                totalTheta: -8.5,
                totalVega: 2.5,
                totalRho: 0.8
            },
            exposures: {
                byInstrumentType: {
                    'Stock': 17550.00,
                    'Option': 33.75
                },
                byUnderlying: {
                    'AAPL': 17583.75
                }
            }
        };
    }

    updateDashboard() {
        this.updateHeaderStats();
        this.updatePositionsTable();
        this.updateRiskMetrics();
        this.updateGreeks();
        this.createCharts();
    }

    updateHeaderStats() {
        const data = this.portfolioData;
        
        document.getElementById('totalValue').textContent = this.formatCurrency(data.total_value || 0);
        
        const pnlElement = document.getElementById('totalPnL');
        pnlElement.textContent = this.formatCurrency(data.total_pnl || 0);
        pnlElement.className = `stat-value ${(data.total_pnl || 0) >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('totalVaR').textContent = this.formatCurrency(data.total_var || 0);
    }

    updatePositionsTable() {
        const tbody = document.getElementById('positionsBody');
        tbody.innerHTML = '';

        this.portfolioData.positions.forEach(position => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${position.symbol || 'Unknown'}</strong></td>
                <td>${position.instrument_type || 'Unknown'}</td>
                <td>${this.formatNumber(position.quantity || 0)}</td>
                <td>${this.formatCurrency(position.market_value || 0)}</td>
                <td class="${(position.pnl || 0) >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(position.pnl || 0)}
                </td>
                <td>${(position.weight || 0).toFixed(1)}%</td>
                <td>${(position.delta || 0).toFixed(3)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateRiskMetrics() {
        const data = this.portfolioData;
        document.getElementById('portfolioVol').textContent = `${(data.portfolio_volatility || 0).toFixed(1)}%`;
        document.getElementById('sharpeRatio').textContent = (data.sharpe_ratio || 0).toFixed(2);
        document.getElementById('maxDrawdown').textContent = `${(data.max_drawdown || 0).toFixed(1)}%`;
    }

    updateGreeks() {
        const greeks = this.portfolioData.greeks || {};
        document.getElementById('totalDelta').textContent = (greeks.total_delta || 0).toFixed(2);
        document.getElementById('totalGamma').textContent = (greeks.total_gamma || 0).toFixed(3);
        document.getElementById('totalTheta').textContent = (greeks.total_theta || 0).toFixed(2);
        document.getElementById('totalVega').textContent = (greeks.total_vega || 0).toFixed(2);
        document.getElementById('totalRho').textContent = (greeks.total_rho || 0).toFixed(2);
    }

    createCharts() {
        this.createAllocationChart();
        this.createExposureChart();
    }

    createAllocationChart() {
        const ctx = document.getElementById('allocationChart').getContext('2d');
        
        if (this.charts.allocation) {
            this.charts.allocation.destroy();
        }

        const positions = this.portfolioData.positions;
        const labels = positions.map(p => p.symbol);
        const values = positions.map(p => p.market_value || 0);
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

        this.charts.allocation = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createExposureChart() {
        const ctx = document.getElementById('exposureChart').getContext('2d');
        
        if (this.charts.exposure) {
            this.charts.exposure.destroy();
        }

        const exposures = this.portfolioData.exposures?.by_instrument_type || {};
        const labels = Object.keys(exposures);
        const values = Object.values(exposures);

        this.charts.exposure = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Exposure ($)',
                    data: values,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    async refreshData() {
        this.showLoading();
        await this.loadPortfolioData();
        this.hideLoading();
    }

    startAutoRefresh() {
        // Fallback polling every 30 seconds if SSE fails
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    cleanup() {
        // Clean up SSE connection
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.stopAutoRefresh();
    }

    exportReport() {
        const data = this.portfolioData;
        const timestamp = new Date().toISOString();
        
        const report = {
            timestamp,
            portfolio: {
                totalValue: data.totalValue,
                totalPnL: data.totalPnL,
                totalVaR: data.totalVaR,
                portfolioVolatility: data.portfolioVolatility,
                sharpeRatio: data.sharpeRatio,
                maxDrawdown: data.maxDrawdown
            },
            positions: data.positions,
            greeks: data.greeks,
            exposures: data.exposures
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-report-${timestamp.split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value);
    }

    formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ValuationDashboard();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.cleanup();
    }
});
