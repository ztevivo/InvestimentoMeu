import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Dashboard from "../pages/Dashboard";

export default function MainLayout() {
return ( <div className="flex min-h-screen bg-slate-100"> <Sidebar />

  <div className="flex-1">
    <Header />

    <main className="p-6">
      <Dashboard />
    </main>
  </div>
</div>

);
}
