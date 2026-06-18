import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, TrendingUp, Search } from "lucide-react";

const ASSET_TYPES = ["ACAO","FII","ETF","BDR","STOCK","REIT","CRYPTO","RENDA_FIXA","TESOURO","CRI","CRA","DEBENTURE","OUTRO"];
const CLASSIFICATIONS = ["CORE","SATELITE","OPORTUNIDADE","ESPECULATIVO","ESTUDO"];
const empty = { ticker: "", name: "", asset_type: "ACAO", classification: "ESTUDO", sector: "", subsector: "", segment: "", currency: "BRL", exchange: "", cnpj: "", is_active: true, notes: "" };

const typeColors = {
  ACAO: "bg-emerald-100 text-emerald-700", FII: "bg-amber-100 text-amber-700",
  ETF: "bg-blue-100 text-blue-700", BDR: "bg-violet-100 text-violet-700",
  STOCK: "bg-cyan-100 text-cyan-700", REIT: "bg-orange-100 text-orange-700",
  CRYPTO: "bg-yellow-100 text-yellow-700", RENDA_FIXA: "bg-slate-100 text-slate-600",
  TESOURO: "bg-green-100 text-green-700", CRI: "bg-pink-100 text-pink-700",
  CRA: "bg-rose-100 text-rose-700", DEBENTURE: "bg-indigo-100 text-indigo-700", OUTRO: "bg-gray-100 text-gray-600"
};
const classColors = {
  CORE: "bg-indigo-600 text-white", SATELITE: "bg-violet-100 text-violet-700",
  OPORTUNIDADE: "bg-amber-100 text-amber-700", ESPECULATIVO: "bg-red-100 text-red-600", ESTUDO: "bg-slate-100 text-slate-500"
};

export default function Ativos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("investment_tickers")
      .select("*")
      .eq("is_deleted", false)
      .order("ticker");
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setError(""); setModal("create"); }
  function openEdit(item) {
    setForm({
      ticker: item.ticker, name: item.name, asset_type: item.asset_type, classification: item.classification || "ESTUDO",
      sector: item.sector || "", subsector: item.subsector || "", segment: item.segment || "",
      currency: item.currency || "BRL", exchange: item.exchange || "", cnpj: item.cnpj || "",
      is_active: item.is_active, notes: item.notes || ""
    });
    setEditId(item.id); setError(""); setModal("edit");
  }
  function closeModal() { setModal(null); setEditId(null); }

  async function handleSave() {
    if (!form.ticker.trim() || !form.name.trim()) { setError("Ticker e Nome são obrigatórios."); return; }
    setSaving(true); setError("");
    const payload = {
      ticker: form.ticker.trim().toUpperCase(), name: form.name.trim(),
      asset_type: form.asset_type, classification: form.classification,
      sector: form.sector || null, subsector: form.subsector || null, segment: form.segment || null,
      currency: form.currency, exchange: form.exchange || null, cnpj: form.cnpj || null,
      is_active: form.is_active, notes: form.notes || null
    };
    if (modal === "create") {
      await supabase.from("investment_tickers").insert([payload]);
    } else {
      await supabase.from("investment_tickers").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId);
    }
    setSaving(false); closeModal(); load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este ativo?")) return;
    await supabase.from("investment_tickers").update({ is_deleted: true }).eq("id", id);
    load();
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.ticker.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.sector || "").toLowerCase().includes(q);
    const matchType = !filterType || i.asset_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar ticker, nome, setor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0">
          <Plus size={16} /> Novo Ativo
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3">{filtered.length} de {items.length} ativos</p>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">{search || filterType ? "Nenhum resultado" : "Nenhum ativo ainda"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-5 py-3 text-left">Ticker</th>
                  <th className="px-5 py-3 text-left">Nome</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-left">Classificação</th>
                  <th className="px-5 py-3 text-left">Setor</th>
                  <th className="px-5 py-3 text-left">Moeda</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50 ${!item.is_active ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3 font-bold text-slate-800">{item.ticker}</td>
                    <td className="px-5 py-3 text-slate-600 max-w-[200px] truncate">{item.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.asset_type] || "bg-gray-100 text-gray-600"}`}>{item.asset_type}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classColors[item.classification] || "bg-slate-100 text-slate-500"}`}>{item.classification || "ESTUDO"}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{item.sector || "-"}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{item.currency || "BRL"}</td>
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
        <Modal title={modal === "create" ? "Novo Ativo" : `Editar — ${form.ticker}`} onClose={closeModal}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ticker *</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value })} placeholder="Ex: PETR4" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Petróleo Brasileiro S.A." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Classificação</label>
                <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                  {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Setor</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Ex: Energia" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subsetor</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.subsector} onChange={(e) => setForm({ ...form, subsector: e.target.value })} placeholder="Ex: Petróleo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Segmento</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} placeholder="Ex: E&P" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bolsa</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.exchange} onChange={(e) => setForm({ ...form, exchange: e.target.value })} placeholder="Ex: B3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
              <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.is_active ? "true" : "false"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
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
