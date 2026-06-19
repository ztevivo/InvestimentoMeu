import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { Search, BarChart2, Sparkles, RefreshCw } from "lucide-react";

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
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadValuationData() {
    setLoading(true);
    const [resData, fundData, magicData, tickData, posData] = await Promise.all([
      supabase.from("investment_valuation_results").select("*"),
      supabase.from("investment_fundamentals").select("*"),
      supabase.from("investment_magic_numbers").select("*"),
      supabase.from("investment_tickers").select("id, ticker, name").eq("is_deleted", false),
      supabase.from("investment_positions").select("ticker_id, current_price, average_price")
    ]);

    setResults(resData.data || []);
    setFundamentals(fundData.data || []);
    setMagicNumbers(magicData.data || []);
    setTickers(tickData.data || []);
    setPositions(posData.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadValuationData();
  }, []);

  function tickerOf(id) {
    return tickers.find((t) => t.id === id);
  }

  function getLivePrice(tickerId) {
    const pos = positions.find(p => p.ticker_id === tickerId);
    return pos ? Number(pos.current_price) : null;
  }

  const filteredResults = results.filter(r => {
    const tk = tickerOf(r.ticker_id);
    return tk?.ticker.toUpperCase().includes(search.toUpperCase()) || tk?.name?.toUpperCase().includes(search.toUpperCase());
  });

  const filteredMagic = magicNumbers.filter(m => {
    const tk = tickerOf(m.ticker_id);
    return tk?.ticker.toUpperCase().includes(search.toUpperCase());
  });

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-slate-500 font-medium">
        Calculando precificação justa e premissas fundamentalistas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navegação de Abas internas */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-xl shadow-sm">
        <button onClick={() => setTab("metodos")} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${tab === "metodos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Metodologias Clássicas
        </button>
        <button onClick={() => setTab("fundamentals")} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${tab === "fundamentals" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Múltiplos e Fundamentos
        </button>
        <button onClick={() => setTab("magic")} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${tab === "magic" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          Magic Number (Barsi)
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <Search size={18} className="text-slate-400" />
        <input
          type="text"
          className="w-full text-sm text-slate-700 focus:outline-none placeholder-slate-400"
          placeholder="Filtrar por Ticker ou Empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* CONTEÚDO DA ABA: MÉTODOS DE VALUATION */}
      {tab === "metodos" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Ticker</th>
                  <th className="px-6 py-4">Metodologia</th>
                  <th className="px-6 py-4 text-right">Preço Cotação</th>
                  <th className="px-6 py-4 text-right">Preço Justo/Teto</th>
                  <th className="px-6 py-4 text-right">Margem de Segurança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Nenhum cálculo disponível.</td>
                  </tr>
                ) : (
                  filteredResults.map((r) => {
                    const tk = tickerOf(r.ticker_id);
                    const livePrice = getLivePrice(r.ticker_id) || Number(r.current_price || 0);
                    const fairPrice = Number(r.fair_price || 0);
                    const margin = fairPrice > 0 ? ((fairPrice - livePrice) / livePrice) * 100 : null;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{tk?.ticker || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${methodColor[r.valuation_method] || "bg-slate-100"}`}>
                            {methodLabel[r.valuation_method] || r.valuation_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{fmt(livePrice)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">{fmt(fairPrice)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${margin >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {pct(margin)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: MAGIC NUMBER */}
      {tab === "magic" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Ativo</th>
                  <th className="px-6 py-4 text-right">Magic Number</th>
                  <th className="px-6 py-4 text-right">Preço Atual</th>
                  <th className="px-6 py-4 text-right">Proventos Totais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredMagic.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">Nenhum registro de Magic Number gerado.</td>
                  </tr>
                ) : (
                  filteredMagic.map((m) => {
                    const tk = tickerOf(m.ticker_id);
                    const livePrice = getLivePrice(m.ticker_id) || Number(m.current_price || 0);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-bold text-slate-900">{tk?.ticker || "—"}</td>
                        <td className="px-6 py-4 text-right text-lg font-extrabold text-indigo-600">{m.magic_number ?? "—"}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-600">{fmt(livePrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">{fmt(m.total_dividends_received)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
