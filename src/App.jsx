import { AppProvider, useApp } from "./context/AppContext";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Carteiras from "./pages/Carteiras";
import Ativos from "./pages/Ativos";
import Operacoes from "./pages/Operacoes";

function PageRouter() {
  const { currentPage } = useApp();
  const pages = { dashboard: <Dashboard />, carteiras: <Carteiras />, ativos: <Ativos />, operacoes: <Operacoes /> };
  return <MainLayout>{pages[currentPage] || <Dashboard />}</MainLayout>;
}

export default function App() {
  return <AppProvider><PageRouter /></AppProvider>;
}
