import { useApp } from "../context/AppContext";

const titles = { dashboard: "Dashboard", carteiras: "Carteiras", ativos: "Ativos", operacoes: "Operações", dividendos: "Dividendos", valuation: "Valuation" };

export default function Header() {
  const { currentPage } = useApp();
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
      <h2 className="text-xl font-bold text-slate-800">{titles[currentPage] || "Dashboard"}</h2>
    </header>
  );
}
