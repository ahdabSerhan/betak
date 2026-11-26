import { StatementView } from "../components/StatementView";
import { TERMS } from "../data/terms";
import { useShop } from "../state/ShopContext";

// The store's terms and conditions (תקנון).
export function Terms() {
  const { lang } = useShop();
  return <StatementView statement={TERMS[lang]} />;
}
