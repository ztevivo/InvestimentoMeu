import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { syncPortfolioQuotes } from "../services/quotesService";
import { DollarSign, Briefcase, TrendingUp, BarChart2, TrendingDown, RefreshCw } from "lucide-react";

function fmt(val, currency = "BRL") {
  return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency });
}

function pct(val) {
  const n = Number(val || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolios, setPortfolios] = useState([]);
  const [positions, setPositions] = useState([]);
  const [tickers, setTickers] = useState([]);

  async function loadDashboardData() {
    setLoading(true);
    const [port, pos, tick] = await Promise.all([
      supabase.from("investment_portfolios").select("*").eq("is_deleted", false).eq("is_active", true),
      supabase.from("investment_positions").select("*"),
      supabase.from("investment_tickers").select("id, ticker, name, asset_type, sector").eq("is_deleted", false),
    ]);
    
    setPortfolios(port.data || []);
    setPositions(pos.data || []);
    setTickers(tick.data || []);
    setLoading(false);
  }

  async function handleForceRefresh() {
    setRefreshing(true);
    await syncPortfolioQuotes();
    await loadDashboardData();
    setRefreshing(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Cálculos dinâmicos baseados no preço atualizado obtido pelo motor do Yahoo Finance
  const totalMarket = positions.reduce((acc, p) => acc + (Number(p.quantity || 0) * Number(p.current_price || 0)), 0);
  const totalCost = positions.reduce((acc, p) => acc + Number(p.total_cost || 0), 0);
  const globalPnl = totalMarket - totalCost;
  const globalPnlPct = totalCost > 0 ? (globalPnl / totalCost) * 100 : 0;

  function tickerOf(id) {
    return tickers.find((t) => t.id === id);
  }

  // Ordenações para exibir Maiores Altas e Baixas baseadas na cotação do momento
  const sortedPositions = [...positions].map(pos => {
    const costPerShare = Number(pos.average_price || 0);
    const currPrice = Number(pos.current_price || 0);
    const pnlPct = costPerShare > 0 ? ((currPrice - costPerShare) / costPerShare) * 100 : 0;
    return { ...pos, computed_pnl_pct: pnlPct };
  });

  const gainers = [...sortedPositions]
    .sort((a, b) => b.computed_pnl_pct - a.computed_pnl_pct)
    .slice(0, 5);

  const losers = [...sortedPositions]
    .sort((a, b) => a.computed_pnl_pct - b.computed_pnl_pct)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-500 font-medium">
        <div className="animate-pulse flex space-x-2 items-center">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
          <span>Carregando Informações Patrimoniais...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Topo estratégico com gatilho do motor principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Painel Consolidado Estratégico</h1>
          <p className="text-xs text-slate-500 mt-0.5">Acompanhamento Previdenciário baseado na Filosofia Luiz Barsi</p>
        </div>
        <button
          onClick={handleForceRefresh}
          disabled={refreshing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Conectando ao Yahoo Finance..." : "Sincronizar Cotações"}
        </button>
      </div>

      {/* Grid de KPIs Financeiros de Alta Relevância */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600"><Briefcase size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Patrimônio de Mercado</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{fmt(totalMarket)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-slate-50 text-slate-600"><DollarSign size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capital Total Investido</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mt-0.5">{fmt(totalCost)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5">
          <div className={`p-3.5 rounded-xl ${globalPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}><BarChart2 size={24} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evolução Patrimonial</p>
            <h3 className={`text-2xl font-bold tracking-tight mt-0.5 ${globalPnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {fmt(globalPnl)} <span className="text-xs font-bold bg-white/40 px-1.5 py-0.5 rounded ml-1">{pct(globalPnlPct)}</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Listagem de Extremidades (Maiores Altas e Baixas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Altas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-emerald-500" /> Maiores Desempenhos da Carteira
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {gainers.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Nenhum ativo ou cotação registrada no momento.</p>
            ) : (
              gainers.map((pos) => {
                const tk = tickerOf(pos.ticker_id);
                return (
                  <div key={pos.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/60 transition">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm tracking-wide">{tk?.ticker || "—"}</span>
                      <span className="text-xs font-medium text-slate-400 block mt-0.5">{tk?.name || "Empresa Não Listada"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{fmt(pos.current_price)}</p>
                      <span className="text-xs font-bold text-emerald-600">{pct(pos.computed_pnl_pct)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card Baixas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
              <TrendingDown size={16} className="text-rose-400" /> Menores Desempenhos da Carteira
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {losers.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">Nenhum ativo ou cotação registrada no momento.</p>
            ) : (
              losers.map((pos) => {
                const tk = tickerOf(pos.ticker_id);
                return (
                  <div key={pos.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/60 transition">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm tracking-wide">{tk?.ticker || "—"}</span>
                      <span className="text-xs font-medium text-slate-400 block mt-0.5">{tk?.name || "Empresa Não Listada"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{fmt(pos.current_price)}</p>
                      <span className="text-xs font-bold text-rose-500">{pct(pos.computed_pnl_pct)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
