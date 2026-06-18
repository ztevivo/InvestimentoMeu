import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, Briefcase, CheckCircle, XCircle } from "lucide-react";

const empty = { name: "", description: "", currency: "BRL", is_active: true };

export default function Carteiras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("investment_portfolios")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setError(""); setModal("create"); }
  function openEdit(item) {
    setForm({ name: item.name, description: item.description || "", currency: item.currency || "BRL", is_active: item.is_active });
    setEditId(item.id); setError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditId(null); }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    const payload = { name: form.name.trim(), description: form.description, currency: form.currency, is_active: form.is_active };
    if (modal === "create") {
      await supabase.from("investment_portfolios").insert([payload]);
    } else {
      await supabase.from("investment_portfolios").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
    }
    setSaving(false); closeModal(); load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta carteira?")) return;
    await supabase.from("investment_portfolios").update({ is_deleted: true }).eq("id", id);
    load();
  }

  const active = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 text-sm text-slate-500">
          <span><span className="font-semibold text-slate-700">{active.length}</span> ativas</span>
          <span><span className="font-semibold text-slate-700">{inactive.length}</span> inativas</span>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Plus size={16} /> Nova Carteira
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Nenhuma carteira ainda</p>
          <p className="text-sm mt-1">Crie sua primeira carteira para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3 border-l-4 ${item.is_active ? "border-indigo-500" : "border-slate-300"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {item.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  {item.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                </div>
                <div className="flex gap-2 ml-2 shrink-0">
                  <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-indigo-600 transition"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                <span>Moeda: <span className="font-medium text-slate-600">{item.currency}</span></span>
                <span>{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "Nova Carteira" : "Editar Carteira"} onClose={closeModal}>
          <div className="space-y-4">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Renda Variável Brasil" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Objetivo desta carteira..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Moeda</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="BRL">BRL — Real</option>
                  <option value="USD">USD — Dólar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.is_active ? "true" : "false"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
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
