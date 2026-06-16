import {
LayoutDashboard,
Briefcase,
TrendingUp,
Wallet,
Landmark,
Calculator
} from "lucide-react";

const menuItems = [
{
icon: LayoutDashboard,
label: "Dashboard"
},
{
icon: Briefcase,
label: "Carteiras"
},
{
icon: TrendingUp,
label: "Ativos"
},
{
icon: Wallet,
label: "Operações"
},
{
icon: Landmark,
label: "Dividendos"
},
{
icon: Calculator,
label: "Valuation"
}
];

export default function Sidebar() {
return ( <aside className="w-64 bg-slate-900 text-white min-h-screen"> <div className="p-6 border-b border-slate-800"> <h1 className="text-xl font-bold">
InvestimentoMEU </h1>

```
    <p className="text-xs text-slate-400 mt-1">
      Plataforma de Investimentos
    </p>
  </div>

  <nav className="p-4">
    {menuItems.map((item) => {
      const Icon = item.icon;

      return (
        <button
          key={item.label}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition mb-2"
        >
          <Icon size={18} />
          <span>{item.label}</span>
        </button>
      );
    })}
  </nav>
</aside>
```

);
}

