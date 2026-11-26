// The site's accessibility statement (הצהרת נגישות), following the one on the store's previous site.
import type { Lang } from "../i18n/text";
import { STORE } from "./store";

export interface StatementSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export interface Statement {
  title: string;
  updated?: string;
  sections: StatementSection[];
}

const UPDATED = { he: "עודכנה לאחרונה: 25 בנובמבר 2026", en: "Last updated: 25 November 2026" };
// The mailing address shown on the previous site.
const MAIL = { he: "ת.ד. 1137", en: "P.O. Box 1137" };

export const ACCESSIBILITY: Record<Lang, Statement> = {
  he: {
    title: "הצהרת נגישות",
    updated: UPDATED.he,
    sections: [
      {
        title: "המחויבות שלנו",
        paragraphs: [
          "רהיטי ביתאק רואה חשיבות רבה במתן שירות שוויוני לכל הלקוחות, ופועלת כדי שהאתר יהיה נוח ונגיש גם לאנשים עם מוגבלות, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ\"ח-1998, ולתקנות שהותקנו מכוחו.",
        ],
      },
      {
        title: "רמת הנגישות באתר",
        paragraphs: [
          "האתר הונגש בהתאם לתקנה 35 לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע\"ג-2013, ולתקן הישראלי ת\"י 5568, המבוסס על הנחיות WCAG 2.0 של ארגון W3C, ברמה AA.",
          "האתר נבדק בכלי בדיקה אוטומטי ובבדיקות ידניות בדפדפנים מובילים, במחשב ובטלפון נייד, ואנו ממשיכים לבדוק אותו באופן שוטף.",
        ],
      },
      {
        title: "מה עשינו באתר",
        items: [
          "מבנה עמודים ברור עם כותרות מסודרות, ותפריט ניווט אחיד בכל העמודים.",
          "קישור \"דילוג לתוכן\" בראש כל עמוד, וניווט מלא במקלדת בתפריטים, בקישורים, בכפתורים ובטפסים, עם סימון ברור של הפריט שבפוקוס.",
          "כפתור נגישות בצד המסך בכל עמוד, עם הגדלה והקטנה של הטקסט, ניגודיות כהה ובהירה, מצב שחור לבן, ניווט במקלדת, הדגשת קישורים, גופן קריא, עצירת אנימציות, ביטול כל ההתאמות וקישור להצהרה זו. הבחירה נשמרת לביקורים הבאים.",
          "טקסט חלופי לתמונות המוצרים.",
          "ניגודיות צבעים מספקת בין טקסט לרקע.",
          "תוויות לכל שדות הטפסים.",
          "התאמה לקוראי מסך: שפת העמוד וכיוון הכתיבה מוגדרים, ולרכיבים אינטראקטיביים יש שמות ברורים.",
          "האתר מתאים את עצמו לגודל המסך ותומך בהגדלת טקסט בדפדפן.",
          "האתר מותאם לדפדפנים Chrome, Edge, Firefox, Safari ו-Opera, ולקוראי המסך NVDA, JAWS ו-VoiceOver.",
          "תנועה באתר (קרוסלת ההמלצות, אולם התצוגה) נעצרת אצל מי שהגדיר במכשיר \"הפחתת תנועה\", וקרוסלת ההמלצות נעצרת גם כשמצביעים עליה או מגיעים אליה במקלדת.",
        ],
      },
      {
        title: "ניווט במקלדת",
        items: [
          "Tab: מעבר לפריט הבא. Shift+Tab: חזרה לפריט הקודם.",
          "Enter: הפעלת קישור או כפתור. מקשי החצים: מעבר בין אפשרויות.",
          "Esc: סגירת תפריט או חלון.",
          "בקוראי מסך, המקש H עובר בין כותרות העמוד.",
        ],
      },
      {
        title: "חלקים שאינם נגישים במלואם",
        paragraphs: ["למרות מאמצינו, ייתכן שחלקים מסוימים באתר עדיין אינם נגישים במלואם:"],
        items: [
          "אולם התצוגה בתלת-ממד בדף הבית: הזזת רהיטים וסיבובם נעשים בעכבר או במגע בלבד. כל המוצרים שבו מוצגים גם ברשימות המוצרים הרגילות באתר.",
          "הזזת רהיטים בכלי \"עצבו חדר\" נעשית בעכבר או במגע. הגדלה, סיבוב, החלפה והסרה של פריט אפשריות גם מהכפתורים שלו, ורשימת הפריטים שבחדר מוצגת גם כטקסט.",
          "מודל התלת-ממד של מוצר מסתובב בגרירה בלבד. אותו מוצר מוצג גם בתמונות רגילות.",
          "שיחה עם העוזר הדיגיטלי מבוססת בינה מלאכותית, וייתכן שתשובותיו לא יהיו מדויקות תמיד.",
        ],
      },
      {
        title: "נתקלתם בבעיה? דברו איתנו",
        paragraphs: [
          "אם נתקלתם בקושי בשימוש באתר, או שאתם צריכים מידע או שירות בדרך נגישה אחרת, נשמח לעזור. אפשר להזמין כל מוצר גם בטלפון או בוואטסאפ.",
          `טלפון ווואטסאפ: ${STORE.phone}`,
          `דואר אלקטרוני: ${STORE.email}`,
          `כתובת למכתבים: ${MAIL.he}`,
          "כדי שנוכל לטפל בפנייה, נשמח שתציינו את העמוד שבו נתקלתם בבעיה ומה ניסיתם לעשות.",
        ],
      },
    ],
  },
  en: {
    title: "Accessibility statement",
    updated: UPDATED.en,
    sections: [
      {
        title: "Our commitment",
        paragraphs: [
          "Betak Furniture wants every customer to be served equally, and works to make this site comfortable and accessible for people with disabilities, under Israel's Equal Rights for Persons with Disabilities Law, 1998, and its regulations.",
        ],
      },
      {
        title: "Accessibility level",
        paragraphs: [
          "The site follows Regulation 35 of the Equal Rights for Persons with Disabilities (Accessibility Adjustments for Service) Regulations, 2013, and Israeli Standard 5568, which is based on the W3C's WCAG 2.0 guidelines, at level AA.",
          "The site was checked with an automated testing tool and by hand in leading browsers, on a computer and on a phone, and we keep testing it regularly.",
        ],
      },
      {
        title: "What we did",
        items: [
          "A clear page structure with ordered headings and the same navigation menu on every page.",
          "A \"Skip to content\" link at the top of every page, and full keyboard use of menus, links, buttons and forms, with a clear focus outline.",
          "An accessibility button on the side of every page, with larger and smaller text, dark and light contrast, black and white, keyboard navigation, underlined links, a readable font, stopped animations, a reset for all settings and a link to this statement. The choice is kept for later visits.",
          "Text alternatives for product photos.",
          "Sufficient colour contrast between text and background.",
          "Labels for every form field.",
          "Screen reader support: each page states its language and writing direction, and interactive parts have clear names.",
          "The layout adapts to the screen size and supports text enlarged in the browser.",
          "The site works with the Chrome, Edge, Firefox, Safari and Opera browsers, and with the NVDA, JAWS and VoiceOver screen readers.",
          "Motion (the reviews carousel, the showroom) stops for visitors who set \"reduce motion\" on their device, and the reviews carousel also stops when pointed at or reached with the keyboard.",
        ],
      },
      {
        title: "Keyboard navigation",
        items: [
          "Tab: next item. Shift+Tab: previous item.",
          "Enter: open a link or press a button. Arrow keys: move between options.",
          "Esc: close a menu or window.",
          "With a screen reader, the H key jumps between headings.",
        ],
      },
      {
        title: "Parts that are not fully accessible",
        paragraphs: ["Despite our efforts, some parts of the site may not yet be fully accessible:"],
        items: [
          "The 3D showroom on the home page: moving and turning furniture works with a mouse or touch only. Every product in it also appears in the regular product lists.",
          "Moving furniture in the room designer works with a mouse or touch. Resizing, turning, swapping and removing a piece also work from its buttons, and the list of pieces in the room is shown as text too.",
          "A product's 3D model turns by dragging only. The same product is also shown in regular photos.",
          "The assistant chat is powered by AI, and its answers may not always be accurate.",
        ],
      },
      {
        title: "Found a problem? Talk to us",
        paragraphs: [
          "If something on the site is hard to use, or you need information or service in another accessible way, we will gladly help. Any product can also be ordered by phone or WhatsApp.",
          `Phone and WhatsApp: ${STORE.phone}`,
          `Email: ${STORE.email}`,
          `Mail: ${MAIL.en}`,
          "To help us handle your request, please tell us which page you were on and what you were trying to do.",
        ],
      },
    ],
  },
};
