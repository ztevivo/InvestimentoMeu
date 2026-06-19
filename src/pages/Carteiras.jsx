import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, Briefcase, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const emptyForm = { 
  name: "", 
  description: "", 
  currency: "BRL", 
  is_active: true 
};

export default function Carteiras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCarteiras() {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("investment_portfolios")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      
      if (err) throw err;
      setItems(data || []);
    } catch (err) {
      console.error(err);
      setError("Erro ao obter lista de carteiras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    loadCarteiras(); 
  }, []);

  function openCreate() { 
    setForm(emptyForm); 
    setEditId(null); 
    setError(""); 
    setModal("create"); 
  }

  function openEdit(item) {
    setForm({ 
      name: item.name, 
      description: item.description || "", 
      currency: item.currency || "BRL", 
      is_active: !!item.is_active 
    });
    setEditId(item.id); 
    setError(""); 
    setModal("edit");
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("O campo Nome da Carteira é obrigatório.");
      return;
    }

    setSaving(true);
    setError("");

    // O payload garante o envio apenas do código ISO de 3 letras (Ex: "BRL")
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      currency: form.currency.trim().toUpperCase(),
      is_active: !!form.is_active,
      updated_at: new Date().toISOString()
    };

    try {
      if (editId) {
        const { error: err } = await supabase
          .from("investment_portfolios")
          .update(payload)
          .eq("id", editId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("investment_portfolios")
          .insert([{ ...payload, is_deleted: false }]);
        if (err) throw err;
      }
      setModal(null);
      loadCarteiras();
    } catch (err) {
      console.error(err);
      setError(err.message || "Falha na transação com a tabela investment_portfolios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja deletar esta carteira?")) return;
    try {
      const { error: err } = await supabase
        .from("investment_portfolios")
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (err) throw err;
      loadCarteiras();
    } catch (err) {
      alert("Não foi possível excluir a carteira.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-base font-bold text-slate-900">Carteiras Cadastradas</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie os agrupadores de ativos para realizar testes operacionais.</p>
        </div>
        <button 
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md transition"
        >
          <Plus size={16} /> Nova Carteira
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Carregando carteiras...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm text-slate-400">
          Nenhuma carteira configurada. Toque no botão acima para adicionar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Briefcase size={20} /></div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {item.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {item.is_active ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">{item.name}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-2">{item.description || "Sem descrição registrada."}</p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
                <span className="text-xs font-bold text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded">Moeda: {item.currency}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={editId ? "Editar Carteira" : "Criar Nova Carteira"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome da Carteira</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Carteira de Longo Prazo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                placeholder="Estratégia ou objetivos desta carteira"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Moeda Core</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {/* Corrigido: o value agora é puramente a sigla curta exigida pelo Supabase */}
                  <option value="BRL">BRL (Real)</option>
                  <option value="USD">USD (Dólar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                >
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 font-semibold hover:text-slate-800">Cancelar</button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-lg transition"
              >
                {saving ? "Salvando..." : "Salvar Carteira"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
