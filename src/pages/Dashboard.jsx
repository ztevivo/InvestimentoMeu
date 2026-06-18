import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { DollarSign, Briefcase, TrendingUp, BarChart2, TrendingDown, Minus } from "lucide-react";

function fmt(val, currency = "BRL") {
  return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency });
}
function pct(val) {
  const n = Number(val || 0);
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [portfolios, setPortfolios] = useState([]);
  const [positions, setPositions] = useState([]);
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  const totalMarket = positions.reduce((s, p) => s + Number(p.market_value || 0), 0);
  const totalCost = positions.reduce((s, p) => s + Number(p.cost_basis || 0), 0);
  const totalPnl = positions.reduce((s, p) => s + Number(p.unrealized_pnl || 0), 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  function tickerOf(id) { return tickers.find(t => t.id === id); }

  // Top gainers/losers
  const posWithPnl = positions.filter(p => p.unrealized_pnl_pct != null);
  const gainers = [...posWithPnl].sort((a, b) => Number(b.unrealized_pnl_pct) - Number(a.unrealized_pnl_pct)).slice(0, 3);
  const losers = [...posWithPnl].sort((a, b) => Number(a.unrealized_pnl_pct) - Number(b.unrealized_pnl_pct)).slice(0, 3);

  if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Carregando dados...</div>;

  const cards = [
    { label: "Patrimônio Total", value: fmt(totalMarket), icon: DollarSign, color: "bg-indigo-50 text-indigo-600" },
    { label: "Resultado", value: fmt(totalPnl), sub: pct(totalPnlPct), icon: totalPnl >= 0 ? TrendingUp : TrendingDown, color: totalPnl >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500" },
    { label: "Carteiras Ativas", value: portfolios.length, icon: Briefcase, color: "bg-violet-50 text-violet-600" },
    { label: "Posições", value: positions.length, icon: BarChart2, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${c.color}`}><Icon size={22} /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{c.value}</p>
                {c.sub && <p className={`text-xs font-semibold mt-0.5 ${totalPnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>{c.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posições */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Posições</h3>
            <span className="text-xs text-slate-400">{positions.length} ativos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-5 py-2 text-left">Ativo</th>
                  <th className="px-5 py-2 text-right">Valor</th>
                  <th className="px-5 py-2 text-right">P&L</th>
                  <th className="px-5 py-2 text-right">Peso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {positions.slice(0, 8).map((pos) => {
                  const tk = tickerOf(pos.ticker_id);
                  const pnl = Number(pos.unrealized_pnl || 0);
                  return (
                    <tr key={pos.id} className="hover:bg-slate-50">
                      <td className="px-5 py-2.5">
                        <span className="font-bold text-slate-800">{tk?.ticker || "—"}</span>
                        <span className="text-xs text-slate-400 ml-2">{tk?.asset_type}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-slate-700">{fmt(pos.market_value)}</td>
                      <td className={`px-5 py-2.5 text-right text-xs font-semibold ${pnl >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                      </td>
                      <td className="px-5 py-2.5 text-right text-xs text-slate-500">
                        {Number(pos.portfolio_weight_pct || 0).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {positions.length === 0 && (
              <p className="text-center py-8 text-slate-400 text-sm">Nenhuma posição registrada</p>
            )}
          </div>
        </div>

        {/* Gainers & Losers */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500" /> Maiores Altas</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {gainers.length === 0 ? <p className="px-5 py-4 text-sm text-slate-400">Sem dados</p> : gainers.map((pos) => {
                const tk = tickerOf(pos.ticker_id);
                return (
                  <div key={pos.id} className="px-5 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{tk?.ticker || "—"}</span>
                      <span className="text-xs text-slate-400 ml-2">{tk?.sector || ""}</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{pct(pos.unrealized_pnl_pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2"><TrendingDown size={16} className="text-red-400" /> Maiores Baixas</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {losers.length === 0 ? <p className="px-5 py-4 text-sm text-slate-400">Sem dados</p> : losers.map((pos) => {
                const tk = tickerOf(pos.ticker_id);
                return (
                  <div key={pos.id} className="px-5 py-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{tk?.ticker || "—"}</span>
                      <span className="text-xs text-slate-400 ml-2">{tk?.sector || ""}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500">{pct(pos.unrealized_pnl_pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
