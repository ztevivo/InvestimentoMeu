import { LayoutDashboard, Briefcase, TrendingUp, ClipboardList, Landmark, Calculator } from "lucide-react";
import { useApp } from "../context/AppContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", page: "dashboard" },
  { icon: Briefcase, label: "Carteiras", page: "carteiras" },
  { icon: TrendingUp, label: "Ativos", page: "ativos" },
  { icon: ClipboardList, label: "Operações", page: "operacoes" },
  { icon: Landmark, label: "Dividendos", page: "dividendos" },
  { icon: Calculator, label: "Valuation", page: "valuation" },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight">InvestimentoMEU</h1>
        <p className="text-xs text-slate-400 mt-1">Plataforma de Investimentos</p>
      </div>
      <nav className="p-3 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <button key={item.page} onClick={() => setCurrentPage(item.page)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 text-sm font-medium ${
                active ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-300 hover:text-white"}`}>
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
