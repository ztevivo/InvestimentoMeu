import { supabase } from "./supabase";

/**
 * Normaliza o ticker para o formato do Yahoo Finance (.SA para ativos brasileiros)
 */
function normalizeTicker(ticker) {
  if (!ticker) return "";
  const t = ticker.toUpperCase().trim();
  if ((t.length === 5 || t.length === 6 || t.length === 4) && !t.includes(".")) {
    return `${t}.SA`;
  }
  return t;
}

/**
 * Busca a cotação ao vivo via Yahoo Finance usando um proxy público de fallback
 */
export async function fetchLiveQuote(ticker) {
  const yahooTicker = normalizeTicker(ticker);
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m&range=1d`;
  // Proxy público para evitar erros de CORS diretamente no navegador do investidor
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Erro na requisição ao proxy");
    
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) return null;

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.previousClose;
    const changePct = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

    return {
      ticker: ticker,
      currentPrice: currentPrice || 0,
      changePct: changePct || 0
    };
  } catch (error) {
    console.error(`Erro ao buscar cotação de ${ticker}:`, error);
    return null;
  }
}

/**
 * Executa o fluxo completo do Motor Principal do InvestimentoMEU:
 * Coleta do Yahoo -> Atualiza Posições atuais -> Fornece a base de dados
 */
export async function syncPortfolioQuotes() {
  try {
    // 1. Obtém todas as posições em aberto
    const { data: positions, error: posError } = await supabase
      .from("investment_positions")
      .select("id, ticker_id");

    if (posError) throw posError;
    if (!positions || positions.length === 0) return { success: true, updated: 0 };

    // 2. Coleta os tickers cadastrados correspondentes
    const { data: tickers, error: tickError } = await supabase
      .from("investment_tickers")
      .select("id, ticker")
      .eq("is_deleted", false);

    if (tickError) throw tickError;

    let updatedCount = 0;

    // 3. Varre e atualiza o preço de mercado de cada item individualmente
    for (const pos of positions) {
      const currentTicker = tickers.find(t => t.id === pos.ticker_id);
      if (!currentTicker) continue;

      const quote = await fetchLiveQuote(currentTicker.ticker);
      if (quote && quote.currentPrice > 0) {
        // Calcula novos campos estimados para sincronização imediata
        const { error: updateError } = await supabase
          .from("investment_positions")
          .update({
            current_price: quote.currentPrice,
            updated_at: new Date().toISOString()
          })
          .eq("id", pos.id);

        if (!updateError) updatedCount++;
      }
    }

    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error("Erro no ciclo de atualização do Motor de Cotações:", error);
    return { success: false, error: error.message };
  }
}
