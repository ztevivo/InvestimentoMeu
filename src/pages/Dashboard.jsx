export default function Dashboard() {
return ( <div> <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"> <div className="bg-white rounded-xl shadow-sm p-5"> <h3 className="text-slate-500 text-sm">
Patrimônio Total </h3>

```
      <p className="text-3xl font-bold mt-2">
        R$ 0,00
      </p>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-slate-500 text-sm">
        Dividendos
      </h3>

      <p className="text-3xl font-bold mt-2">
        R$ 0,00
      </p>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-slate-500 text-sm">
        Ativos
      </h3>

      <p className="text-3xl font-bold mt-2">
        0
      </p>
    </div>

    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-slate-500 text-sm">
        Carteiras
      </h3>

      <p className="text-3xl font-bold mt-2">
        0
      </p>
    </div>
  </div>

  <div className="bg-white rounded-xl shadow-sm p-6">
    <h3 className="text-lg font-semibold mb-4">
      Bem-vindo ao InvestimentoMEU
    </h3>

    <p className="text-slate-600">
      Conexão com Supabase será realizada no próximo passo.
    </p>
  </div>
</div>
```

);
}

