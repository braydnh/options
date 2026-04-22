type PriceHandler = (ticker: string, price: number) => void

export class FinnhubSocket {
  private ws: WebSocket | null = null
  private subscriptions = new Set<string>()
  private onPrice: PriceHandler
  private apiKey: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(apiKey: string, onPrice: PriceHandler) {
    this.apiKey = apiKey
    this.onPrice = onPrice
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`)

    this.ws.onopen = () => {
      // Re-subscribe all tickers after reconnect
      for (const ticker of this.subscriptions) {
        this.send({ type: 'subscribe', symbol: ticker })
      }
    }

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'trade' && Array.isArray(msg.data)) {
        for (const trade of msg.data) {
          this.onPrice(trade.s, trade.p)
        }
      }
    }

    this.ws.onclose = () => {
      // Auto-reconnect after 3s if we still have subscriptions
      if (this.subscriptions.size > 0) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  subscribe(ticker: string): void {
    this.subscriptions.add(ticker)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol: ticker })
    } else {
      this.connect()
    }
  }

  unsubscribe(ticker: string): void {
    this.subscriptions.delete(ticker)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbol: ticker })
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.subscriptions.clear()
    this.ws?.close()
    this.ws = null
  }

  private send(msg: object): void {
    this.ws?.send(JSON.stringify(msg))
  }
}
