import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { ticker_id: "", pl: "", pvp: "", roe: "", dy: "", notes: "" };

export default function Valuation() {
  const [items, setItems] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [vals, tick] = await Promise.all([
      supabase.from("investment_valuations").select("*").order("created_at", { ascending: false }),
      supabase.from("investment_tickers").select("id, ticker, name"),
    ]);
    setItems(vals.data || []);
    setTickers(tick.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setModal("create"); }
  function openEdit(item) {
    setForm({ ticker_id: item.ticker_id || "", pl: item.pl || "", pvp: item.pvp || "", roe: item.roe || "", dy: item.dy || "", notes: item.notes || "" });
    setEditId(item.id); setModal("edit");
  }
  function closeModal() { setModal(null); setForm(empty); setEditId(null); }

  async function handleSave() {
    if (!form.ticker_id) return;
    setSaving(true);
    const payload = { ticker_id: form.ticker_id, pl: form.pl ? Number(form.pl) : null, pvp: form.pvp ? Number(form.pvp) : null, roe: form.roe ? Number(form.roe) : null, dy: form.dy ? Number(form.dy) : null, notes: form.notes };
    if (modal === "create") {
      await supabase.from("investment_valuations").insert([payload]);
    } else {
      await supabase.from("investment_valuations").update(payload).eq("id", editId);
    }
    setSaving(false);
    closeModal();
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta análise?")) return;
    await supabase.from("investment_valuations").delete().eq("id", id);
    load();
  }

  function tickerLabel(id) { const t = tickers.find(t => t.id === id); return t ? t.ticker : id; }

  function badge(val, low, high) {
    if (val == null) return <span className="text-slate-400">-</span>;
    const color = val <= low ? "text-emerald-600 font-semibold" : val <= high ? "text-amber-600" : "text-red-500";
    return <span className={color}>{val}</span>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-slate-500 text-sm">{items.length} análise(s) registrada(s)</p>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Nova Análise
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg font-medium">Nenhuma análise ainda</p>
          <p className="text-sm mt-1">Registre indicadores fundamentalistas dos seus ativos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Ativo</th>
                <th className="px-6 py-3 text-right">P/L</th>
                <th className="px-6 py-3 text-right">P/VP</th>
                <th className="px-6 py-3 text-right">ROE %</th>
                <th className="px-6 py-3 text-right">DY %</th>
                <th className="px-6 py-3 text-left">Notas</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-bold text-slate-800">{tickerLabel(item.ticker_id)}</td>
                  <td className="px-6 py-3 text-right">{badge(item.pl, 10, 20)}</td>
                  <td className="px-6 py-3 text-right">{badge(item.pvp, 1, 2)}</td>
                  <td className="px-6 py-3 text-right">{item.roe != null ? `${item.roe}%` : "-"}</td>
                  <td className="px-6 py-3 text-right">{item.dy != null ? `${item.dy}%` : "-"}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs max-w-xs truncate">{item.notes || "-"}</td>
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
        <Modal title={modal === "create" ? "Nova Análise" : "Editar Análise"} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ativo *</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.ticker_id} onChange={(e) => setForm({ ...form, ticker_id: e.target.value })}>
                <option value="">Selecione</option>
                {tickers.map(t => <option key={t.id} value={t.id}>{t.ticker} — {t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">P/L</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.pl} onChange={(e) => setForm({ ...form, pl: e.target.value })} placeholder="Ex: 8.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">P/VP</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.pvp} onChange={(e) => setForm({ ...form, pvp: e.target.value })} placeholder="Ex: 1.2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ROE (%)</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.roe} onChange={(e) => setForm({ ...form, roe: e.target.value })} placeholder="Ex: 18.3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dividend Yield (%)</label>
                <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.dy} onChange={(e) => setForm({ ...form, dy: e.target.value })} placeholder="Ex: 6.5" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações sobre o ativo..." />
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
