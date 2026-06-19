import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Modal from "../components/Modal";
import { Plus, Pencil, Trash2, Search, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

const ASSET_TYPES = ["ACAO","FII","ETF","BDR","STOCK","REIT","CRYPTO","RENDA_FIXA","TESOURO","CRI","CRA","DEBENTURE","OUTRO"];
const CLASSIFICATIONS = ["CORE","SATELITE","OPORTUNIDADE","ESPECULATIVO","ESTUDO"];

const emptyForm = { 
  ticker: "", 
  name: "", 
  asset_type: "ACAO", 
  classification: "ESTUDO", 
  sector: "", 
  subsector: "", 
  segment: "", 
  currency: "BRL", 
  exchange: "SAO", 
  cnpj: "", 
  is_active: true, 
  notes: "" 
};

const typeColors = {
  ACAO: "bg-emerald-100 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-md",
  FII: "bg-amber-100 text-amber-700 font-bold text-xs px-2.5 py-1 rounded-md",
  ETF: "bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-md",
  BDR: "bg-violet-100 text-violet-700 font-bold text-xs px-2.5 py-1 rounded-md",
  STOCK: "bg-cyan-100 text-cyan-700 font-bold text-xs px-2.5 py-1 rounded-md",
  REIT: "bg-orange-100 text-orange-700 font-bold text-xs px-2.5 py-1 rounded-md",
  CRYPTO: "bg-yellow-100 text-yellow-700 font-bold text-xs px-2.5 py-1 rounded-md",
  RENDA_FIXA: "bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-md"
};

export default function Ativos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchingApi, setSearchingApi] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadAtivos() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("investment_tickers")
      .select("*")
      .eq("is_deleted", false)
      .order("ticker", { ascending: true });
    
    if (!err) setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAtivos();
  }, []);

  function openCreate() { 
    setForm(emptyForm); 
    setEditId(null); 
    setError(""); 
    setModal("create"); 
  }

  function openEdit(item) {
    setForm({
      ticker: item.ticker,
      name: item.name,
      asset_type: item.asset_type || "ACAO",
      classification: item.classification || "ESTUDO",
      sector: item.sector || "",
      subsector: item.subsector || "",
      segment: item.segment || "",
      currency: item.currency || "BRL",
      exchange: item.exchange || "",
      cnpj: item.cnpj || "",
      is_active: item.is_active ?? true,
      notes: item.notes || ""
    });
    setEditId(item.id);
    setError("");
    setModal("edit");
  }

  // MOTOR DE AUTO-PREENCHIMENTO VIA YAHOO FINANCE API
  async function handleAutoFetchData() {
    if (!form.ticker) {
      setError("Por favor, digite um Ticker primeiro.");
      return;
    }

    setSearchingApi(true);
    setError("");

    let rawTicker = form.ticker.toUpperCase().trim();
    // Regra prática para ações brasileiras
    if ((rawTicker.length === 5 || rawTicker.length === 6 || rawTicker.length === 4) && !rawTicker.includes(".")) {
      rawTicker = `${rawTicker}.SA`;
    }

    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${rawTicker}?interval=1d&range=1d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Ativo não localizado no banco de dados do Yahoo Finance.");
      
      const resData = await res.json();
      const meta = resData?.chart?.result?.[0]?.meta;

      if (!meta) {
        throw new Error("Não foi possível encontrar as propriedades estruturadas para este ticker.");
      }

      // Tentativa de adivinhar o tipo de ativo baseado em sufixo comum
      let guessedType = "ACAO";
      if (form.ticker.toUpperCase().endsWith("11") && !form.ticker.toUpperCase().startsWith("IVVB")) {
        guessedType = "FII"; // Padrão brasileiro para Fundos Imobiliários
      } else if (meta.instrumentType === "ETF") {
        guessedType = "ETF";
      }

      // Atualiza o formulário automaticamente com os dados descobertos
      setForm(prev => ({
        ...prev,
        ticker: prev.ticker.toUpperCase().trim(),
        name: meta.longName || meta.shortName || prev.name || "Empresa Encontrada",
        currency: meta.currency || "BRL",
        exchange: meta.exchangeName || "SAO",
        asset_type: guessedType,
        sector: prev.sector || (guessedType === "FII" ? "Imobiliário" : "Financeiro/Industrial")
      }));

    } catch (err) {
      console.error(err);
      setError("Falha ao buscar automaticamente. Verifique se o ticker está correto ou preencha manualmente.");
    } finally {
      setSearchingApi(false);
    }
  }

  async function handleSave() {
    if (!form.ticker || !form.name) {
      setError("Os campos Ticker e Nome da Empresa são obrigatórios.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ticker: form.ticker.toUpperCase().trim(),
      name: form.name.trim(),
      asset_type: form.asset_type,
      classification: form.classification,
      sector: form.sector.trim(),
      subsector: form.subsector.trim(),
      segment: form.segment.trim(),
      currency: form.currency,
      exchange: form.exchange.trim(),
      cnpj: form.cnpj.trim(),
      is_active: form.is_active,
      notes: form.notes.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      if (editId) {
        const { error: err } = await supabase
          .from("investment_tickers")
          .update(payload)
          .eq("id", editId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("investment_tickers")
          .insert([{ ...payload, is_deleted: false }]);
        if (err) throw err;
      }
      setModal(null);
      loadAtivos();
    } catch (err) {
      setError(err.message || "Erro ao salvar o registro no banco.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Deseja realmente remover este ativo do sistema?")) return;
    const { error: err } = await supabase
      .from("investment_tickers")
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!err) loadAtivos();
  }

  const filteredItems = items.filter(item => 
    item.ticker.toUpperCase().includes(searchQuery.toUpperCase()) ||
    item.name.toUpperCase().includes(searchQuery.toUpperCase())
  );

  return (
    <div className="space-y-6">
      {/* Topo de Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 gap-4">
        <div className="relative w-full sm:max-w-xs flex items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
          <Search size={18} className="text-slate-400 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Buscar por Ticker ou Nome..." 
            className="bg-transparent text-sm text-slate-700 w-full focus:outline-none placeholder-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={openCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition"
        >
          <Plus size={16} /> Cadastrar Novo Ativo
        </button>
      </div>

      {/* Grid Principal ou Tabela */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Carregando catálogo de ativos...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm text-slate-400">
          Nenhum ativo localizado. Clique em "Cadastrar Novo Ativo" para começar seu teste.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Ticker</th>
                  <th className="px-6 py-4">Nome da Empresa</th>
                  <th className="px-6 py-4">Classe</th>
                  <th className="px-6 py-4">Setor</th>
                  <th className="px-6 py-4">Moeda</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-extrabold text-slate-900 tracking-wide">{item.ticker}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className={typeColors[item.asset_type] || "bg-slate-100 text-slate-600 font-bold text-xs px-2.5 py-1 rounded-md"}>
                        {item.asset_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{item.sector || "—"}</td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">{item.currency}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE INTERAÇÃO COM FORMULÁRIO */}
      {modal && (
        <Modal title={editId ? "Editar Detalhes do Ativo" : "Cadastrar Ativo Inteligente"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Linha do Ticker + Botão de Captura Inteligente */}
            <div className="flex items-end gap-3 bg-slate-50 p-3 rounded-xl border border-indigo-100">
              <div className="flex-1">
                <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1">Ticker Comercial</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase font-bold"
                  placeholder="Ex: WEGE3, SANB11"
                  value={form.ticker}
                  onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                  disabled={!!editId}
                />
              </div>
              {!editId && (
                <button
                  type="button"
                  onClick={handleAutoFetchData}
                  disabled={searchingApi}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:text-indigo-400 border border-indigo-200 text-xs font-bold rounded-lg flex items-center gap-1.5 h-[38px] transition"
                >
                  {searchingApi ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {searchingApi ? "Buscando..." : "Buscar Dados"}
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo da Empresa</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Razão social ou nome de mercado"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Classe de Ativo</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.asset_type}
                  onChange={(e) => setForm({ ...form, asset_type: e.target.value })}
                >
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Classificação Interna</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.classification}
                  onChange={(e) => setForm({ ...form, classification: e.target.value })}
                >
                  {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Setor Econômico</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Utilidade Pública"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Moeda Transacional</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observações (Notas)</label>
              <textarea 
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2} 
                value={form.notes} 
                onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                placeholder="Anotações adicionais sobre o ativo..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-slate-600 font-semibold hover:text-slate-800">Cancelar</button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-lg transition"
              >
                {saving ? "Salvando..." : "Confirmar Cadastro"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
