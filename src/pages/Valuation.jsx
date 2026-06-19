import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { Search, BarChart2, Sparkles } from "lucide-react";

// ⚠️ Atualizar com enum method_enum real quando confirmado
const METHODS = ["BAZIN", "GORDON", "GRAHAM", "LYNCH"];
const methodLabel = { BAZIN: "Bazin", GORDON: "Gordon", GRAHAM: "Graham", LYNCH: "Peter Lynch" };
const methodColor = { BAZIN: "bg-indigo-100 text-indigo-700", GORDON: "bg-violet-100 text-violet-700", GRAHAM: "bg-amber-100 text-amber-700", LYNCH: "bg-emerald-100 text-emerald-700" };

function fmt(val) { return val == null ? "—" : Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(val) { return val == null ? "—" : `${Number(val) >= 0 ? "+" : ""}${Number(val).toFixed(2)}%`; }

export default function Valuation() {
  const [tab, setTab] = useState("metodos"); // metodos | fundamentals | magic
  const [results, setResults] = useState([]);
  const [fundamentals, setFundamentals] = useState([]);
  const [magicNumbers, setMagicNumbers] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  async function load() {
    setLoading(true);
    const [res, fund, magic, tick] = await Promise.all([
      supabase.from("investment_method_results").select("*").order("calculation_date", { ascending: false }),
      supabase.from("investment_fundamentals").select("*").order("reference_date", { ascending: false }),
      supabase.from("investment_magic_number_history").select("*").order("calculation_date", { ascending: false }),
      supabase.from("investment_tickers").select("id, ticker, name, sector").eq("is_deleted", false).order("ticker"),
    ]);
    setResults(res.data || []);
    setFundamentals(fund.data || []);
    setMagicNumbers(magic.data || []);
    setTickers(tick.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function tickerOf(id) { return tickers.find(t => t.id === id); }

  const filteredResults = results.filter(r => {
    const tk = tickerOf(r.ticker_id);
    const q = search.toLowerCase();
    const matchSearch = !q || (tk?.ticker || "").toLowerCase().includes(q) || (tk?.name || "").toLowerCase().includes(q);
    const matchMethod = !methodFilter || r.method === methodFilter;
    return matchSearch && matchMethod;
  });

  const filteredFundamentals = fundamentals.filter(f => {
    const tk = tickerOf(f.ticker_id);
    const q = search.toLowerCase();
    return !q || (tk?.ticker || "").toLowerCase().includes(q) || (tk?.name || "").toLowerCase().includes(q);
  });

  const filteredMagic = magicNumbers.filter(m => {
    const tk = tickerOf(m.ticker_id);
    const q = search.toLowerCase();
    return !q || (tk?.ticker || "").toLowerCase().includes(q);
  });

  const tabs = [
    { id: "metodos", label: "Metodologias", icon: BarChart2 },
    { id: "fundamentals", label: "Fundamentos", icon: Sparkles },
    { id: "magic", label: "Magic Number", icon: Sparkles },
  ];

  function indicatorBadge(val, low, high, inverse = false) {
    if (val == null) return <span className="text-slate-400">—</span>;
    const good = inverse ? val >= high : val <= low;
    const warn = inverse ? (val >= low && val < high) : (val > low && val <= high);
    const color = good ? "text-emerald-600 font-semibold" : warn ? "text-amber-600" : "text-red-500";
    return <span className={color}>{val}</span>;
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Todas as metodologias aparecem sempre — o sistema sugere, a decisão é sua.
      </p>

      <div className="flex gap-2 mb-5 border-b border-slate-200">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab === "metodos" && (
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
            <option value="">Todos os métodos</option>
            {METHODS.map(m => <option key={m} value={m}>{methodLabel[m]}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : tab === "metodos" ? (
        filteredResults.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">Nenhum resultado de metodologia calculado ainda</p>
            <p className="text-sm mt-1">Os valores de Bazin, Gordon, Graham e Lynch são gerados pelo motor de cálculo do sistema</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Ativo</th>
                    <th className="px-5 py-3 text-left">Método</th>
                    <th className="px-5 py-3 text-right">Preço Justo</th>
                    <th className="px-5 py-3 text-right">Preço Teto</th>
                    <th className="px-5 py-3 text-right">Preço Atual</th>
                    <th className="px-5 py-3 text-right">Upside</th>
                    <th className="px-5 py-3 text-left">Adequado p/ Setor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((r) => {
                    const tk = tickerOf(r.ticker_id);
                    const upside = Number(r.upside_pct || 0);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-800">{tk?.ticker || "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${methodColor[r.method] || "bg-slate-100 text-slate-600"}`}>{methodLabel[r.method] || r.method}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(r.fair_price)}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fmt(r.ceiling_price)}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fmt(r.current_price_ref)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${upside >= 0 ? "text-emerald-600" : "text-red-500"}`}>{pct(r.upside_pct)}</td>
                        <td className="px-5 py-3 text-xs">
                          {r.is_recommended_for_sector
                            ? <span className="text-emerald-600 font-medium">Sim</span>
                            : <span className="text-slate-400">Verificar</span>}
                          {r.warning_message && <p className="text-amber-600 text-xs mt-0.5">{r.warning_message}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : tab === "fundamentals" ? (
        filteredFundamentals.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">Nenhum fundamento registrado ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Ativo</th>
                    <th className="px-5 py-3 text-right">P/L</th>
                    <th className="px-5 py-3 text-right">P/VP</th>
                    <th className="px-5 py-3 text-right">ROE</th>
                    <th className="px-5 py-3 text-right">ROA</th>
                    <th className="px-5 py-3 text-right">DY</th>
                    <th className="px-5 py-3 text-right">Payout</th>
                    <th className="px-5 py-3 text-left">Data Ref.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFundamentals.map((f) => {
                    const tk = tickerOf(f.ticker_id);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-800">{tk?.ticker || "—"}</td>
                        <td className="px-5 py-3 text-right">{indicatorBadge(f.pl, 10, 20)}</td>
                        <td className="px-5 py-3 text-right">{indicatorBadge(f.pvp, 1, 2)}</td>
                        <td className="px-5 py-3 text-right">{f.roe != null ? `${f.roe}%` : "—"}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{f.roa != null ? `${f.roa}%` : "—"}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{f.dy != null ? `${f.dy}%` : "—"}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{f.payout != null ? `${f.payout}%` : "—"}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">{f.reference_date ? new Date(f.reference_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        filteredMagic.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="font-medium">Nenhum Magic Number calculado ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Ativo</th>
                    <th className="px-5 py-3 text-right">Magic Number</th>
                    <th className="px-5 py-3 text-right">Preço Atual</th>
                    <th className="px-5 py-3 text-right">Yield on Cost</th>
                    <th className="px-5 py-3 text-right">Dividendos Recebidos</th>
                    <th className="px-5 py-3 text-left">Data Cálculo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMagic.map((m) => {
                    const tk = tickerOf(m.ticker_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-800">{tk?.ticker || "—"}</td>
                        <td className="px-5 py-3 text-right text-xl font-bold text-indigo-600">{m.magic_number ?? "—"}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fmt(m.current_price)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{m.dividend_yield_on_cost != null ? `${m.dividend_yield_on_cost}%` : "—"}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fmt(m.total_dividends_received)}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">{m.calculation_date ? new Date(m.calculation_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
              Magic Number indica quantas ações são necessárias para que os dividendos recebidos comprem 1 nova ação ao ano.
            </p>
          </div>
        )
      )}
    </div>
  );
}
