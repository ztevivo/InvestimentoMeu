import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const ORDER_TYPES = ["COMPRA","VENDA","BONIFICACAO","DESDOBRAMENTO","GRUPAMENTO","TRANSFERENCIA"];

const empty = {
  portfolio_id: "", ticker_id: "", order_type: "COMPRA",
  quantity: "", price: "", brokerage_fee: "0", other_fees: "0",
  order_date: "", order_time: "", broker: "", notes: ""
};

function fmt(val) { return Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function Operacoes() {
  const [items, setItems] = useState([]);
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
    const [orders, tick, port] = await Promise.all([
      supabase.from("investment_orders").select("*").eq("is_deleted", false).order("order_date", { ascending: false }),
      supabase.from("investment_tickers").select("id, ticker, name").eq("is_deleted", false).order("ticker"),
      supabase.from("investment_portfolios").select("id, name").eq("is_deleted", false).eq("is_active", true),
    ]);
    setItems(orders.data || []);
    setTickers(tick.data || []);
    setPortfolios(port.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setError(""); setModal("create"); }
  function openEdit(item) {
    setForm({
      portfolio_id: item.portfolio_id || "", ticker_id: item.ticker_id || "",
      order_type: item.order_type || "COMPRA", quantity: item.quantity || "",
      price: item.price || "", brokerage_fee: item.brokerage_fee ?? "0",
      other_fees: item.other_fees ?? "0", order_date: item.order_date || "",
      order_time: item.order_time || "", broker: item.broker || "", notes: item.notes || ""
    });
    setEditId(item.id); setError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditId(null); }

  const totalAmount = () => {
    const qty = Number(form.quantity || 0);
    const price = Number(form.price || 0);
    const fee = Number(form.brokerage_fee || 0) + Number(form.other_fees || 0);
    return qty * price + fee;
  };

  async function handleSave() {
    if (!form.ticker_id || !form.portfolio_id || !form.quantity || !form.order_date) {
      setError("Carteira, Ativo, Quantidade e Data são obrigatórios."); return;
    }
    setSaving(true); setError("");
    const total = totalAmount();
    const payload = {
      portfolio_id: form.portfolio_id, ticker_id: form.ticker_id,
      order_type: form.order_type, quantity: Number(form.quantity),
      price: form.price ? Number(form.price) : null,
      total_amount: total, brokerage_fee: Number(form.brokerage_fee || 0),
      other_fees: Number(form.other_fees || 0), order_date: form.order_date,
      order_time: form.order_time || null, broker: form.broker || null,
      notes: form.notes || null,
    };
    if (modal === "create") {
      await supabase.from("investment_orders").insert([payload]);
    } else {
      await supabase.from("investment_orders").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
    }
    setSaving(false); closeModal(); load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta ordem?")) return;
    await supabase.from("investment_orders").update({ is_deleted: true }).eq("id", id);
    load();
  }

  function tickerLabel(id) { const t = tickers.find(t => t.id === id); return t ? t.ticker : "—"; }
  function portfolioLabel(id) { const p = portfolios.find(p => p.id === id); return p ? p.name : "—"; }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return !q || tickerLabel(i.ticker_id).toLowerCase().includes(q)
      || portfolioLabel(i.portfolio_id).toLowerCase().includes(q)
      || (i.broker || "").toLowerCase().includes(q)
      || (i.order_type || "").toLowerCase().includes(q);
  });

  const typeStyle = { COMPRA: "bg-emerald-100 text-emerald-700", VENDA: "bg-red-100 text-red-600" };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar por ativo, carteira, corretora..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0">
          <Plus size={16} /> Nova Ordem
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3">{filtered.length} de {items.length} ordens</p>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">{search ? "Nenhum resultado" : "Nenhuma ordem ainda"}</p>
          <p className="text-sm mt-1">{!search && "Registre sua primeira compra ou venda"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Data</th>
                  <th className="px-5 py-3 text-left">Ativo</th>
                  <th className="px-5 py-3 text-left">Carteira</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-right">Qtd</th>
                  <th className="px-5 py-3 text-right">Preço</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-left">Corretora</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {item.order_date ? new Date(item.order_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-800">{tickerLabel(item.ticker_id)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{portfolioLabel(item.portfolio_id)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeStyle[item.order_type] || "bg-slate-100 text-slate-600"}`}>
                        {item.order_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">{Number(item.quantity).toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{fmt(item.price)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(item.total_amount)}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{item.broker || "—"}</td>
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

      {modal && (
        <Modal title={modal === "create" ? "Nova Ordem" : "Editar Ordem"} onClose={closeModal}>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Carteira *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.portfolio_id} onChange={(e) => setForm({ ...form, portfolio_id: e.target.value })}>
                  <option value="">Selecione</option>
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ativo *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.ticker_id} onChange={(e) => setForm({ ...form, ticker_id: e.target.value })}>
                  <option value="">Selecione</option>
                  {tickers.map(t => <option key={t.id} value={t.id}>{t.ticker} — {t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.order_type} onChange={(e) => setForm({ ...form, order_type: e.target.value })}>
                  {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data *</label>
                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade *</label>
                <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.order_time} onChange={(e) => setForm({ ...form, order_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Corretagem (R$)</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.brokerage_fee} onChange={(e) => setForm({ ...form, brokerage_fee: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Outras Taxas (R$)</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.other_fees} onChange={(e) => setForm({ ...form, other_fees: e.target.value })} />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs font-medium text-slate-500 mb-1">Total estimado</label>
                <p className="text-base font-bold text-slate-800 py-2">{fmt(totalAmount())}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Corretora</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="Ex: XP, Clear, Rico..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre esta ordem..." />
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
