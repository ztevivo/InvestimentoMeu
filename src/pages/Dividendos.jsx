import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, Search, Wallet, History, TrendingUp } from "lucide-react";

const DIV_TYPES = ["DIVIDENDO", "JCP", "RENDIMENTO", "IOF", "AMORTIZACAO", "BONIFICACAO", "DIREITO_SUBSCRICAO"];

const empty = {
  ticker_id: "", dividend_type: "DIVIDENDO", ex_date: "", payment_date: "",
  amount_per_share: "", currency: "BRL", is_extraordinary: false, source: "", notes: ""
};

function fmt(val, currency = "BRL") {
  return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency });
}
function fmtDate(d) { return d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—"; }

export default function Dividendos() {
  const [tab, setTab] = useState("historico"); // historico | caixa | perfil
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState([]);
  const [cashRows, setCashRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const [hist, summ, cash, prof, tick, port] = await Promise.all([
      supabase.from("investment_dividend_history").select("*").order("payment_date", { ascending: false }),
      supabase.from("v_dividend_summary").select("*"),
      supabase.from("investment_dividend_cash").select("*"),
      supabase.from("investment_dividend_profile").select("*"),
      supabase.from("investment_tickers").select("id, ticker, name").eq("is_deleted", false).order("ticker"),
      supabase.from("investment_portfolios").select("id, name").eq("is_deleted", false).eq("is_active", true),
    ]);
    setItems(hist.data || []);
    setSummary(summ.data || []);
    setCashRows(cash.data || []);
    setProfiles(prof.data || []);
    setTickers(tick.data || []);
    setPortfolios(port.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setError(""); setModal("create"); }
  function openEdit(item) {
    setForm({
      ticker_id: item.ticker_id, dividend_type: item.dividend_type || "DIVIDENDO",
      ex_date: item.ex_date || "", payment_date: item.payment_date || "",
      amount_per_share: item.amount_per_share || "", currency: item.currency || "BRL",
      is_extraordinary: item.is_extraordinary || false, source: item.source || "", notes: item.notes || ""
    });
    setEditId(item.id); setError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditId(null); }

  async function handleSave() {
    if (!form.ticker_id || !form.ex_date || !form.amount_per_share) {
      setError("Ativo, Data Ex e Valor por Ação são obrigatórios."); return;
    }
    setSaving(true); setError("");
    const payload = {
      ticker_id: form.ticker_id, dividend_type: form.dividend_type,
      ex_date: form.ex_date, payment_date: form.payment_date || null,
      amount_per_share: Number(form.amount_per_share), currency: form.currency,
      is_extraordinary: form.is_extraordinary, source: form.source || null, notes: form.notes || null
    };
    if (modal === "create") {
      await supabase.from("investment_dividend_history").insert([payload]);
    } else {
      await supabase.from("investment_dividend_history").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
    }
    setSaving(false); closeModal(); load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este registro de dividendo?")) return;
    await supabase.from("investment_dividend_history").delete().eq("id", id);
    load();
  }

  function tickerLabel(id) { const t = tickers.find(t => t.id === id); return t ? t.ticker : "—"; }
  function tickerName(id) { const t = tickers.find(t => t.id === id); return t ? t.name : ""; }
  function portfolioLabel(id) { const p = portfolios.find(p => p.id === id); return p ? p.name : "—"; }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || tickerLabel(i.ticker_id).toLowerCase().includes(q) || (i.dividend_type || "").toLowerCase().includes(q);
  });

  const totalRecebidoHist = items.reduce((s, i) => s + Number(i.amount_per_share || 0), 0);
  const totalCaixa = cashRows.reduce((s, c) => s + Number(c.balance || 0), 0);
  const totalRecebidoCaixa = cashRows.reduce((s, c) => s + Number(c.total_received || 0), 0);

  const typeStyle = {
    DIVIDENDO: "bg-emerald-100 text-emerald-700", JCP: "bg-blue-100 text-blue-700",
    RENDIMENTO: "bg-amber-100 text-amber-700", IOF: "bg-red-100 text-red-600",
    AMORTIZACAO: "bg-cyan-100 text-cyan-700", BONIFICACAO: "bg-violet-100 text-violet-700",
    DIREITO_SUBSCRICAO: "bg-rose-100 text-rose-700"
  };

  const tabs = [
    { id: "historico", label: "Histórico", icon: History },
    { id: "caixa", label: "Caixa de Dividendos", icon: Wallet },
    { id: "perfil", label: "Perfil por Ativo", icon: TrendingUp },
  ];

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-slate-500">Total Recebido (Histórico)</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(totalRecebidoHist)} / ação</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-slate-500">Saldo em Caixa (todos ativos)</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{fmt(totalCaixa)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-slate-500">Total Já Recebido (Caixa)</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{fmt(totalRecebidoCaixa)}</p>
        </div>
      </div>

      {/* Tabs */}
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

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : tab === "historico" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Buscar ativo, tipo..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0">
              <Plus size={16} /> Registrar Dividendo
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="font-medium">{search ? "Nenhum resultado" : "Nenhum dividendo registrado ainda"}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                    <tr>
                      <th className="px-5 py-3 text-left">Ativo</th>
                      <th className="px-5 py-3 text-left">Tipo</th>
                      <th className="px-5 py-3 text-left">Data Ex</th>
                      <th className="px-5 py-3 text-left">Pagamento</th>
                      <th className="px-5 py-3 text-right">Valor/Ação</th>
                      <th className="px-5 py-3 text-left">Extraordinário</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-800">{tickerLabel(item.ticker_id)}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle[item.dividend_type] || "bg-slate-100 text-slate-600"}`}>{item.dividend_type}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(item.ex_date)}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{fmtDate(item.payment_date)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{fmt(item.amount_per_share, item.currency)}</td>
                        <td className="px-5 py-3 text-xs">{item.is_extraordinary ? <span className="text-amber-600 font-medium">Sim</span> : <span className="text-slate-400">Não</span>}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-indigo-600 mr-3 transition"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : tab === "caixa" ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {cashRows.length === 0 ? (
            <p className="text-center py-16 text-slate-400">Nenhum caixa de dividendos registrado ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Ativo</th>
                    <th className="px-5 py-3 text-left">Carteira</th>
                    <th className="px-5 py-3 text-right">Saldo Atual</th>
                    <th className="px-5 py-3 text-right">Total Recebido</th>
                    <th className="px-5 py-3 text-right">Total Reinvestido</th>
                    <th className="px-5 py-3 text-left">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashRows.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-bold text-slate-800">{tickerLabel(c.ticker_id)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{portfolioLabel(c.portfolio_id)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-indigo-600">{fmt(c.balance)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{fmt(c.total_received)}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{fmt(c.total_reinvested)}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{c.updated_at ? new Date(c.updated_at).toLocaleDateString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
            O saldo de caixa é atualizado automaticamente pelo motor de cálculo do sistema a partir dos pagamentos registrados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {profiles.length === 0 ? (
            <p className="text-center py-16 text-slate-400">Nenhum perfil de dividendos calculado ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 text-left">Ativo</th>
                    <th className="px-5 py-3 text-left">Frequência</th>
                    <th className="px-5 py-3 text-right">Anos Pagando</th>
                    <th className="px-5 py-3 text-right">Consistência</th>
                    <th className="px-5 py-3 text-right">DY 12m</th>
                    <th className="px-5 py-3 text-right">DY 5a</th>
                    <th className="px-5 py-3 text-left">Próx. Estimado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-bold text-slate-800">{tickerLabel(p.ticker_id)}</td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{p.frequency || "—"}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.years_paying ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.consistency_score != null ? `${p.consistency_score}%` : "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600">{p.avg_yield_12m != null ? `${p.avg_yield_12m}%` : "—"}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{p.avg_yield_5y != null ? `${p.avg_yield_5y}%` : "—"}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{fmtDate(p.next_estimated_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
            Perfis são recalculados automaticamente com base no histórico de pagamentos de cada ativo.
          </p>
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "Registrar Dividendo" : "Editar Dividendo"} onClose={closeModal}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ativo *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.ticker_id} onChange={(e) => setForm({ ...form, ticker_id: e.target.value })}>
                  <option value="">Selecione</option>
                  {tickers.map(t => <option key={t.id} value={t.id}>{t.ticker} — {t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.dividend_type} onChange={(e) => setForm({ ...form, dividend_type: e.target.value })}>
                  {DIV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Ex *</label>
                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.ex_date} onChange={(e) => setForm({ ...form, ex_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Pagamento</label>
                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor por Ação *</label>
                <input type="number" step="0.0001" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.amount_per_share} onChange={(e) => setForm({ ...form, amount_per_share: e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moeda</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fonte</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex: Yahoo Finance, RI da empresa..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_extraordinary} onChange={(e) => setForm({ ...form, is_extraordinary: e.target.checked })} />
              Dividendo extraordinário
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition">
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
