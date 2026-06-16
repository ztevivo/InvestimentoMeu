import { supabase } from "./supabase";

export async function getDashboardData() {
try {
const [
portfoliosResult,
tickersResult,
positionsResult
] = await Promise.all([
supabase
.from("investment_portfolios")
.select("*"),

```
  supabase
    .from("investment_tickers")
    .select("*"),

  supabase
    .from("investment_positions")
    .select("*")
]);

return {
  portfolios:
    portfoliosResult.data || [],

  tickers:
    tickersResult.data || [],

  positions:
    positionsResult.data || []
};
```

} catch (error) {
console.error(error);

```
return {
  portfolios: [],
  tickers: [],
  positions: []
};
```

}
}

