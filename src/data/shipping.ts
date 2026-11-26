// The shipping policy (מדיניות משלוחים), copied from the store's previous site (betak.co.il/מדיניות-משלוחים).
import type { Lang } from "../i18n/text";
import type { Statement } from "./accessibility";

const UPDATED = { he: "עודכנה לאחרונה: 26 בנובמבר 2026", en: "Last updated: 26 November 2026" };

export const SHIPPING: Record<Lang, Statement> = {
  he: {
    title: "מדיניות משלוחים",
    updated: UPDATED.he,
    sections: [
      {
        title: "עלויות הובלה",
        paragraphs: ["עלויות ההובלה, משלוחים והרכבות מופיעות מתחת לכל מוצר."],
      },
      {
        title: "החרגות והערות",
        items: [
          "כל מוצר נוסף בתוספת 200 ₪ (כורסא או הדום בלי תוספת כסף).",
          "הובלה לאזורים שמעבר לקו הירוק תוספת 150 ₪ וכמו כן מצריכה אישור מהחברה.",
          "הובלות לאזור מצפה רמון, אילת תהיה תוספת 400 ₪ למשלוח וייתכן עיכוב של 10 ימי עסקים נוספים.",
          "קומה 3 ומעלה בבניין ללא מעלית או שהמוצר אינו נכנס במעלית: תוספת לעלות הובלה רגילה: 50 ₪ לכל קומה לתשלום מול המוביל.",
          "בכל מקרה של צורך בשירותי מנוף חיצוניים או בפירוק והרכבה, החיוב יחול על הלקוח.",
          "ההובלות מתבצעות על ידי חברה חיצונית.",
        ],
      },
    ],
  },
  en: {
    title: "Shipping policy",
    updated: UPDATED.en,
    sections: [
      {
        title: "Delivery costs",
        paragraphs: [
          "This is an English translation for convenience. If it differs from the Hebrew policy, the Hebrew policy applies.",
          "Delivery, shipping and assembly costs are shown under each product.",
        ],
      },
      {
        title: "Exclusions and notes",
        items: [
          "Each additional product costs ₪200 more (an armchair or ottoman at no extra charge).",
          "Delivery beyond the Green Line costs ₪150 more and needs the company's approval.",
          "Delivery to Mitzpe Ramon and Eilat costs ₪400 more, and may take up to 10 more business days.",
          "3rd floor and up in a building without a lift, or when the product does not fit in the lift: ₪50 per floor on top of the regular delivery cost, paid to the delivery crew.",
          "Whenever an external crane or disassembly and reassembly is needed, the customer pays for it.",
          "Deliveries are made by an outside company.",
        ],
      },
    ],
  },
};
