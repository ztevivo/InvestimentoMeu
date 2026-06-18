import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { ticker_id: "", amount: "", date: "", type: "dividendo" };
const divTypes = ["dividendo", "JCP", "rendimento", "amortização", "outros"];

export default function Dividendos() {
  const [items, setItems] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [divs, tick] = await Promise.all([
      supabase.from("investment_dividends").select("*").order("date", { ascending: false }),
      supabase.from("investment_tickers").select("id, ticker, name"),
    ]);
    setItems(divs.data || []);
    setTickers(tick.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setModal("create"); }
  function openEdit(item) {
    setForm({ ticker_id: item.ticker_id || "", amount: item.amount || "", date: item.date || "", type: item.type || "dividendo" });
    setEditId(item.id); setModal("edit");
  }
  function closeModal() { setModal(null); setForm(empty); setEditId(null); }

  async function handleSave() {
    if (!form.ticker_id || !form.amount) return;
    setSaving(true);
    const payload = { ticker_id: form.ticker_id, amount: Number(form.amount), date: form.date || null, type: form.type };
    if (modal === "create") {
      await supabase.from("investment_dividends").insert([payload]);
    } else {
      await supabase.from("investment_dividends").update(payload).eq("id", editId);
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este registro?")) return;
    await supabase.from("investment_dividends").delete().eq("id", id);
    load();
  }

  function tickerLabel(id) { const t = tickers.find(t => t.id === id); return t ? t.ticker : id; }
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-slate-500 text-sm">{items.length} registro(s)</p>
          <p className="text-sm font-semibold text-emerald-600 mt-0.5">
            Total recebido: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Registrar Dividendo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Nenhum dividendo registrado</p>
          <p className="text-sm mt-1">Registre os proventos recebidos dos seus ativos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Ativo</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Data</th>
                <th className="px-6 py-3 text-right">Valor</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-bold text-slate-800">{tickerLabel(item.ticker_id)}</td>
                  <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{item.type}</span></td>
                  <td className="px-6 py-3 text-slate-500">{item.date ? new Date(item.date).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="px-6 py-3 text-right font-semibold text-emerald-600">{Number(item.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-indigo-600 mr-3 transition"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "Registrar Dividendo" : "Editar Dividendo"} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ativo *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.ticker_id} onChange={(e) => setForm({ ...form, ticker_id: e.target.value })}>
                  <option value="">Selecione</option>
                  {tickers.map(t => <option key={t.id} value={t.id}>{t.ticker}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {divTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$) *</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
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
