import { useEffect, useState } from "react";
import { getDashboardData } from "../services/dashboardService";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    portfolios: [],
    tickers: [],
    positions: []
  });

  useEffect(() => {
    async function load() {
      const result = await getDashboardData();
      setData(result);
      setLoading(false);
    }

    load();
  }, []);

  const patrimonio = data.positions.reduce(
    (total, item) => total + Number(item.market_value || 0),
    0
  );

  if (loading) {
    return <div className="text-center py-20">Carregando...</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-slate-500 text-sm">Patrimônio Total</h3>
          <p className="text-3xl font-bold mt-2">
            {patrimonio.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-slate-500 text-sm">Carteiras</h3>
          <p className="text-3xl font-bold mt-2">{data.portfolios.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-slate-500 text-sm">Ativos</h3>
          <p className="text-3xl font-bold mt-2">{data.tickers.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-slate-500 text-sm">Posições</h3>
          <p className="text-3xl font-bold mt-2">{data.positions.length}</p>
        </div>
      </div>
    </div>
  );
}
