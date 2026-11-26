import { StatementView } from "../components/StatementView";
import { ACCESSIBILITY } from "../data/accessibility";
import { useShop } from "../state/ShopContext";

// The accessibility statement (הצהרת נגישות).
export function Accessibility() {
  const { lang } = useShop();
  return <StatementView statement={ACCESSIBILITY[lang]} />;
}
