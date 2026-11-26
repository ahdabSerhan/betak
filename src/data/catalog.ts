// The Betak catalog, taken from betak.co.il.
import type { Lang } from "../i18n/text";
import { asset } from "../lib/asset";

export type CategoryId = "sofas" | "sofa-beds" | "sideboards" | "armchairs" | "dining" | "beds" | "mattresses" | "rugs";
export type Localized = Record<Lang, string>;

export interface Category extends Localized {
  id: CategoryId;
  h1: Localized;
}

export interface Product {
  id: number;
  category: CategoryId;
  type: ProductType;
  model: string;
  name: Localized;
  price: number;
  listPrice: number;
  sku: string;
  featured: boolean;
  image: string;
}

export const CATEGORIES: Category[] = [
  { id: "sofas", he: "ספות", en: "Sofas", h1: { he: "ספות לסלון", en: "Living room sofas" } },
  { id: "sofa-beds", he: "ספות נפתחות למיטה", en: "Sofa beds", h1: { he: "ספות נפתחות למיטה", en: "Sofa beds" } },
  { id: "sideboards", he: "מזנונים ושולחנות סלון", en: "Sideboards & coffee tables", h1: { he: "מזנונים ושולחנות סלון", en: "Sideboards and coffee tables" } },
  { id: "armchairs", he: "כורסאות", en: "Armchairs", h1: { he: "כורסאות", en: "Armchairs" } },
  { id: "dining", he: "פינות אוכל וכיסאות", en: "Dining sets & chairs", h1: { he: "פינות אוכל וכיסאות", en: "Dining sets and chairs" } },
  { id: "beds", he: "מיטות והדומים", en: "Beds & ottomans", h1: { he: "מיטות והדומים", en: "Beds and ottomans" } },
  { id: "mattresses", he: "מזרונים", en: "Mattresses", h1: { he: "מזרונים", en: "Mattresses" } },
  { id: "rugs", he: "שטיחים לסלון", en: "Living room rugs", h1: { he: "שטיחים לסלון", en: "Living room rugs" } },
];

// Product type: Hebrew prefix and English suffix of the product name.
const TYPES = {
  corner: ["ספה פינתית", "corner sofa"], cornerlux: ["ספה פינתית מפוארת", "luxury corner sofa"],
  three: ["ספה תלת מושבית", "3-seater sofa"], two: ["ספה דו מושבית", "2-seater sofa"],
  lounge: ["ספה רביצה", "lounge sofa"], sofa: ["ספה", "sofa"],
  set32: ["מערכת ישיבה 3+2", "3+2 seating set"], sofaotto: ["ספה והדום", "sofa with ottoman"],
  chairbed: ["כורסא נפתחת למיטה", "chair bed"], twobed: ["ספה דו מושבית נפתחת למיטה", "2-seater sofa bed"],
  sofabed: ["ספה נפתחת למיטה", "sofa bed"],
  consolewall: ["קונסולה מעוצבת לתלייה", "wall-mounted console"], console: ["קונסולה", "console"],
  dresser: ["קומודה", "dresser"], sideboard: ["מזנון", "sideboard"],
  sbtable: ["מזנון + שולחן", "sideboard + coffee table"], tables: ["סט שולחנות", "coffee table set"],
  armchair: ["כורסא", "armchair"], tv: ["כורסת טלוויזיה", "TV armchair"], tantra: ["כורסת טנטרה / יוגה", "yoga chair"],
  diningset: ["פינת אוכל", "dining set"], set6: ["פינת אוכל ו-6 כיסאות", "dining table with 6 chairs"],
  table: ["שולחן אוכל", "dining table"], dchair: ["כיסא פינת אוכל", "dining chair"], chair: ["כיסא", "chair"],
  dbed: ["מיטה זוגית", "double bed"], bed: ["מיטה", "bed"], bench: ["ספסל", "bench"], ottoman: ["הדום", "ottoman"],
  mattress: ["מזרן", "mattress"], rug: ["שטיח לסלון", "living room rug"],
} satisfies Record<string, [he: string, en: string]>;

export type ProductType = keyof typeof TYPES;

type Row = [imageId: number, type: ProductType, he: string, en: string, listPrice: number, salePrice?: number, sku?: string, featured?: number];

const ROWS: Record<CategoryId, Row[]> = {
  sofas: [
    [1682, "corner", "קאמילה", "Camila", 5990, 4990, "sh91030", 1], [1897, "corner", "קאנבירה", "Canberra", 4290, 3990, "sh21965"],
    [1686, "three", "קאמילה", "Camila", 4290, 3880, "sh61203", 1], [1672, "corner", "רויאל", "Royal", 4699, 0, "sh4912"],
    [1873, "corner", "לימנוס", "Limnos", 5290, 4490, "sh68754", 1], [1856, "set32", "מוריה", "Moria", 5300],
    [1702, "corner", "לבנדר", "Lavender", 4300, 3990], [1838, "corner", "פיקנטו", "Picanto", 4599],
    [1859, "corner", "מדיסון", "Madison", 3890, 0, "sh51879"], [1861, "corner", "סופיה", "Sofia", 4299],
    [1865, "lounge", "לורן", "Loren", 3900, 0, "", 1], [1837, "three", "ספיידר", "Spider", 4199, 3990],
    [1881, "three", "קולודיה", "Colodia", 3990, 0, "sh00123"], [1876, "corner", "ברלין", "Berlin", 4180, 0, "sh32546"],
    [1870, "lounge", "סמאתרה", "Samatra", 4400, 3890, "sh56778", 1], [2065, "corner", "ביג מאמא", "Big Mama", 3880, 0, "sh46213"],
    [1884, "corner", "רונס", "Rones", 3990, 0, "sh3458"], [1887, "corner", "ווסטון", "Weston", 3990, 0, "sh67521", 1],
    [1890, "three", "מאריסה", "Marisa", 3990, 0, "sh7346"], [1789, "sofaotto", "בולו", "Bolo", 2890, 0, "sh5674", 1],
    [1674, "sofa", "לוקס", "Lux", 4290, 0, "sh7395"], [1893, "lounge", "מנסטון", "Manston", 4200, 0, "", 1],
    [1895, "corner", "תוליפ", "Tulip", 4490, 0, "sh67021"], [1900, "corner", "אדריאן", "Adrian", 3970, 0, "sh51132"],
    [1903, "sofa", "קיארה", "Kiara", 3790, 0, "sh78012"], [1907, "sofa", "לואנדה", "Luanda", 2890, 0, "sh54101"],
    [1908, "three", "אלמה", "Alma", 4160, 0, "", 1], [1920, "sofa", "ליאם", "Liam", 3890, 0, "sh16542", 1],
    [1916, "three", "מוריה", "Moria", 3990], [1943, "two", "ספיר", "Sapir", 2190], [1948, "three", "ספיר", "Sapir", 2990],
    [1923, "corner", "רפאייל", "Rafael", 4990, 0, "sh02713"], [1821, "three", "קומפורט", "Comfort", 3990, 0, "sh26785"],
    [1926, "three", "לורינה", "Lorina", 3990], [1929, "corner", "סאנדרה", "Sandra", 4990, 0, "sh01093"],
    [1932, "cornerlux", "מרדין", "Mardin", 3940, 0, "sh45673", 1], [1935, "three", "נאיה", "Naya", 4250, 0, "", 1],
    [1938, "three", "סילינה", "Selina", 4860],
  ],
  "sofa-beds": [
    [643, "chairbed", "דאליה", "Dalia", 1490], [640, "chairbed", "ג'ומבה", "Jumba", 1490], [636, "twobed", "דאליה", "Dalia", 2000],
    [631, "twobed", "ג'ומבה", "Jumba", 2000], [623, "sofabed", "דאליה", "Dalia", 2890], [620, "sofabed", "ג'ומבה", "Jumba", 2890],
    [614, "sofabed", "טריבקה", "Tribeca", 2750], [613, "sofabed", "אמארה", "Amara", 2990], [610, "sofabed", "הודסון", "Hudson", 2890],
    [599, "sofabed", "קליאו", "Cleo", 2880], [594, "sofabed", "אוקטבה", "Octava", 3890], [585, "sofabed", "אלקסיס", "Alexis", 2880],
    [579, "sofabed", "אוריאה", "Oria", 2910], [571, "sofabed", "פיבו", "Pivo", 2890], [563, "sofabed", "אלנדה", "Alanda", 2790],
    [559, "sofabed", "טורטלו", "Tortello", 2880], [555, "sofabed", "גרנד", "Grand", 2890],
  ],
  sideboards: [
    [2027, "consolewall", "סילינה", "Selina", 1983], [2044, "dresser", "פנדה", "Panda", 2880], [2028, "sbtable", "לינהר", "Linear", 3899],
    [2031, "sbtable", "מונוליט", "Monolith", 3899], [2033, "sbtable", "אנפיניטי", "Infinity", 3899], [2037, "sbtable", "וינציה", "Venezia", 2990],
    [2039, "sbtable", "אורבאן", "Urban", 2990], [2040, "sbtable", "לאנא", "Lana", 2990], [2038, "sbtable", "מג'ק", "Magic", 2990],
    [2041, "sbtable", "פלאש", "Flash", 2990], [2042, "sbtable", "סאנדרין", "Sandrine", 2990], [2046, "sbtable", "קאבריו", "Cabrio", 2690, 0, "mz00654"],
    [2045, "sbtable", "רובירט", "Robert", 2690, 0, "mz0102"], [2035, "sideboard", "לנהור", "Lenhor", 3690], [2043, "console", "לוקס", "Lux", 1790],
    [2052, "tables", "ולנטין", "Valentin", 3490], [2053, "tables", "אריאנה", "Ariana", 3290], [2054, "tables", "קיארא", "Kiara", 3288],
    [2056, "tables", "אליאנה", "Eliana", 2290], [2057, "tables", "מאליזיה", "Malaysia", 3290], [2055, "tables", "בראג", "Prague", 2390],
    [2059, "tables", "אלמוס", "Almos", 1990], [2062, "tables", "פלורדה", "Florida", 1990], [2061, "tables", "לוקס", "Lux", 2340],
    [2060, "tables", "אליס", "Alice", 2340], [2058, "tables", "ליאל", "Liel", 1499], [2051, "tables", "לוגן", "Logan", 1990],
    [2050, "tables", "אליסון", "Alison", 1490],
  ],
  armchairs: [
    [1829, "armchair", "קאמילה", "Camila", 2190, 0, "kr80211"], [1955, "armchair", "טורינו", "Torino", 1899, 0, "kr03214"],
    [1941, "armchair", "בוקסי", "Boxy", 1970], [1824, "armchair", "סאלי", "Sally", 2470], [1951, "armchair", "מילאנו", "Milano", 2180, 0, "kr5865"],
    [1953, "armchair", "ויקטוריה", "Victoria", 1690], [1965, "armchair", "רומא", "Roma", 1899], [1961, "armchair", "בולו", "Bolo", 1490, 0, "kr97163"],
    [1841, "tantra", "", "", 2480], [1967, "tv", "אלכס", "Alex", 1890], [1970, "tv", "אוליבר", "Oliver", 2499],
    [1958, "tv", "דוד", "David", 1890], [1962, "tv", "ג'סי", "Jesse", 1990],
  ],
  dining: [
    [1831, "diningset", "איזביל", "Isabel", 2857], [1805, "table", "קלאין", "Klein", 2990, 0, "fr7032"], [1803, "table", "בראנדון", "Brandon", 2490, 0, "fr1235"],
    [1850, "set6", "דאליה", "Dalia", 4890], [1832, "table", "תיראנה", "Tirana", 3419, 0, "fr9872"], [1847, "dchair", "אוסלו", "Oslo", 430],
    [1852, "chair", "סיינה בצבע אגוז", "Siena Walnut", 489], [1811, "chair", "אוגסטין", "Augustin", 459, 0, "fr5114"],
    [1809, "chair", "קאלין", "Kalin", 459, 0, "fr3487"], [1813, "chair", "קירה", "Kira", 459, 0, "fr3102"],
  ],
  beds: [
    [1715, "dbed", "לונה", "Luna", 2790], [2020, "dbed", "קאמילה", "Camila", 2990], [2002, "dbed", "גורגיא", "Georgia", 2990, 0, "md13152", 1],
    [1997, "dbed", "ליאן", "Lian", 3290], [1991, "dbed", "ליין", "Line", 2690], [1994, "dbed", "נובל", "Noble", 2701],
    [2004, "dbed", "אופל", "Opal", 2770], [2007, "dbed", "רומיו", "Romeo", 2990], [2067, "bed", "גולדין", "Golden", 2890],
    [1975, "bench", "ריביירה", "Riviera", 1490], [1986, "ottoman", "נובה", "Nova", 1290], [1983, "ottoman", "ליז", "Liz", 690],
    [1980, "ottoman", "ג'וי", "Joy", 690], [2009, "bed", "דמבו", "Dumbo", 2990], [2014, "bed", "מוסקו (חשמלית)", "Moscow Electric", 3390],
    [2017, "bed", "טוקיו", "Tokyo", 2680],
  ],
  mattresses: [
    [2022, "mattress", "פיקאסו", "Picasso", 1980], [2023, "mattress", "גאגואר", "Jaguar", 1590], [2024, "mattress", "היי סטאר", "Hi Star", 999],
    [2025, "mattress", "ונטילאט", "Ventilat", 1390], [2026, "mattress", "ליון", "Lyon", 2360],
  ],
  rugs: [
    [871, "rug", "לוסי", "Lucy", 419], [870, "rug", "גרייס", "Grace", 419], [869, "rug", "מאדיסון", "Madison", 417], [868, "rug", "איליאן", "Ilian", 419],
    [867, "rug", "סקארלית", "Scarlett", 419], [866, "rug", "גיאנא", "Gianna", 399], [865, "rug", "סופיה", "Sofia", 399], [1450, "rug", "מיא", "Mia", 399],
    [863, "rug", "מוריה", "Moria", 365], [862, "rug", "סאנתיא", "Cynthia", 365], [861, "rug", "סנטייגו", "Santiago", 365],
  ],
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function toProduct(category: CategoryId, [id, type, he, en, listPrice, salePrice, sku, featured]: Row): Product {
  const [typeHe, typeEn] = TYPES[type];
  return {
    id, category, type, listPrice,
    model: en,
    name: { he: he ? `${typeHe} דגם ${he}` : typeHe, en: en ? `${en} ${typeEn}` : capitalize(typeEn) },
    price: salePrice || listPrice,
    sku: sku ?? "",
    featured: Boolean(featured),
    image: asset(`img/p${id}.webp`),
  };
}

export const PRODUCTS: Product[] = (Object.keys(ROWS) as CategoryId[]).flatMap((category) =>
  ROWS[category].map((row) => toProduct(category, row)),
);

export const productById = (id: number) => PRODUCTS.find((product) => product.id === id);
export const productsIn = (category: CategoryId) => PRODUCTS.filter((product) => product.category === category);
export const isOnSale = (product: Product) => product.listPrice > product.price;
