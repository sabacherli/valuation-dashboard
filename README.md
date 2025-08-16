# Portfolio Valuation Dashboard

A modern web dashboard for visualizing portfolio positions, exposures, and risk metrics using the valuation-service backend.

## Features

- **Real-time Portfolio Visualization** - Interactive charts showing portfolio allocation and exposures
- **Position Management** - Detailed table view of all positions with P&L tracking
- **Risk Analytics** - VaR calculations, volatility metrics, and Greeks analysis
- **Modern UI** - Responsive design with gradient backgrounds and smooth animations
- **Auto-refresh** - Automatic data updates every 30 seconds
- **Export Functionality** - Download portfolio reports as JSON

## Quick Start

### 1. Start the Valuation Service API

```bash
cd ../valuation-service
cargo run --bin web_server
```

The API will be available at `http://localhost:8080`

### 2. Start the Dashboard

```bash
cd valuation-dashboard
npm start
# or
python3 -m http.server 3000
```

The dashboard will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/portfolio` - Get portfolio data with positions and risk metrics
- `GET /api/portfolio?include_greeks=true` - Include Greeks calculations
- `GET /api/portfolio?include_risk=true` - Include detailed risk metrics
- `GET /health` - Health check endpoint

## Dashboard Components

### Header Stats
- Total portfolio value
- Total P&L with color coding
- 1-day Value at Risk (VaR)

### Portfolio Allocation Chart
- Interactive doughnut chart showing position weights
- Hover tooltips with values and percentages

### Positions Table
- Instrument details and types
- Market values and P&L
- Portfolio weights and Delta exposure

### Risk Metrics Panel
- Portfolio volatility
- Sharpe ratio
- Maximum drawdown

### Greeks Summary
- Total Delta, Gamma, Theta, Vega, Rho
- Color-coded cards for easy reading

### Exposure Analysis
- Bar chart showing exposure by instrument type
- Breakdown by underlying assets

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for interactive visualizations
- **Backend**: Rust with Axum web framework
- **Data**: Real-time portfolio valuation from valuation-service

## Development

The dashboard uses mock data by default but will automatically connect to the valuation-service API when available. The frontend is designed to be responsive and works on desktop and mobile devices.

## Customization

- Modify `dashboard.js` to add new charts or metrics
- Update `styles.css` to change the visual theme
- Extend the API in `web_server.rs` for additional endpoints
