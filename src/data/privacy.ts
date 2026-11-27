// The privacy policy (מדיניות פרטיות), copied from the one the store's previous site linked to,
// plus what this site itself stores and sends (marked "באתר זה" / "On this site").
import type { Lang } from "../i18n/text";
import type { Statement } from "./accessibility";
import { STORE } from "./store";

const UPDATED = { he: "עודכנה לאחרונה: 26 בנובמבר 2026", en: "Last updated: 26 November 2026" };

export const PRIVACY: Record<Lang, Statement> = {
  he: {
    title: "מדיניות פרטיות",
    updated: UPDATED.he,
    sections: [
      {
        title: "1. כללי",
        paragraphs: [
          "באתרנו אנו מכבדים את פרטיותך, כמו גם את פרטיותם של כלל לקוחותינו והמשתמשים בשירותינו (להלן: \"המשתמשים\"), באתר ובשירותים הדיגיטליים שלנו (להלן ביחד: \"השירותים\").",
          "מדיניות זו מפרטת כיצד אנו אוספים, משתמשים, מעבדים ומגנים על מידע אישי בעת שימוש בשירותים, בהתאם לחוק הגנת הפרטיות, התשמ\"א-1981 (כולל תיקון מס' 13).",
          "השימוש באתרנו מהווה הסכמה למדיניות פרטיות זו. אם אינך מסכים, אנא הימנע מהשימוש באתר.",
          "מדיניות זו עשויה להתעדכן מעת לעת. עדכונים מהותיים יפורסמו באתרנו לפחות 30 יום לפני כניסתם לתוקף. המשך שימוש באתר מהווה הסכמה למדיניות המעודכנת.",
        ],
      },
      {
        title: "2. המידע שאנו אוספים",
        paragraphs: ["אינך חייב למסור מידע זה על פי חוק. עם זאת, ללא מסירת פרטים מסוימים ייתכן שלא נוכל לספק שירותים מסוימים."],
        items: [
          "מידע שנמסר על ידך: שם מלא, דוא\"ל, טלפון, כתובת מגורים, כתובת למשלוח וחשבונית, פרטי תשלום (מעובדים ע\"י ספקי סליקה חיצוניים, לא נשמרים באתרנו), ופניות, הודעות, תגובות או תוכן שאתה יוצר באתר.",
          "באתר זה, כשמתחילים למלא את טופס ההזמנה ומזינים טלפון או דוא\"ל, נשמרים אצלנו השם, הטלפון, הדוא\"ל, העיר ותוכן העגלה, כדי שנוכל לחזור אליך אם ההזמנה לא הושלמה. הם נמחקים כשההזמנה נשלחת, או אחרי 30 יום.",
          "מידע שנאסף אוטומטית: נתונים טכניים (כתובת IP, סוג דפדפן, מערכת הפעלה, מכשיר קצה), נתוני שימוש וגלישה (עמודים בהם ביקרת, משך שהייה, מקורות הגעה), נתוני מיקום כלליים (מדינה/עיר) על ידי גוגל ופייסבוק, ועוגיות (Cookies) ומזהים דיגיטליים אחרים.",
          "מידע מצדדים שלישיים: אם תבחר להתחבר באמצעות רשתות חברתיות (כגון Google או Facebook), נקבל מידע בהתאם להרשאות שקבעת בחשבונך.",
        ],
      },
      {
        title: "3. מטרות השימוש במידע",
        items: [
          "אספקת השירותים ותפעולם.",
          "טיפול בהזמנות ותשלומים.",
          "מתן שירות לקוחות ותמיכה.",
          "התאמת חוויית הגלישה ותוכן מותאם אישית.",
          "ניתוח נתוני שימוש ושיפור השירותים.",
          "מניעת הונאות ועמידה בחובות חוקיות.",
          "שליחת עדכונים, הצעות ותוכן שיווקי – בכפוף להסכמתך ובכפוף לחוק התקשורת (בזק ושידורים), התשמ\"ב-1982.",
        ],
      },
      {
        title: "4. עוגיות (Cookies) וטכנולוגיות דומות",
        paragraphs: [
          "באתרנו נעשה שימוש בעוגיות למטרות: תפקוד חיוני של האתר, ניתוח ואנליטיקה (כגון Google Analytics), התאמת פרסום (כגון Facebook Pixel, Google Ads) ושיתוף ברשתות חברתיות.",
          "באתר זה, עגלת הקניות, הרשימה שלי, השפה, הגדרות הנגישות ואישור הודעת העוגיות נשמרים בדפדפן שלך בלבד (Local Storage), ואינם נשלחים אלינו, מלבד העגלה בזמן מילוי טופס ההזמנה כמתואר בסעיף 2.",
          "באפשרותך לנהל את העדפות העוגיות שלך באמצעות הבאנר באתר או דרך הגדרות הדפדפן. חסימת עוגיות מסוימות עלולה לפגוע בפעילות חלק מהשירותים.",
        ],
      },
      {
        title: "5. שיתוף מידע עם צדדים שלישיים",
        paragraphs: ["אנו עשויים לשתף מידע במקרים הבאים:"],
        items: [
          "בהסכמתך המפורשת.",
          "עם ספקי שירותים חיצוניים (שילוח, סליקה, ענן, אנליטיקה).",
          "באתר זה, הטקסט והתמונות שנשלחים למעצב החדרים ולעוזר הבינה המלאכותית מועברים לעיבוד ב-Google Cloud (Vertex AI).",
          "לצורך עמידה בדרישות חוק או צווי בית משפט.",
          "לשם מניעת הונאה, פעילות לא חוקית או נזק אפשרי.",
          "במסגרת שינוי מבנה עסקי (מיזוג, רכישה) – בכפוף להתחייבות הצד הרוכש למדיניות זו.",
          "מסירת מידע סטטיסטי שלא מזהה משתמשים באופן אישי.",
        ],
      },
      {
        title: "6. אבטחת מידע",
        items: [
          "אנו מיישמים אמצעי אבטחה מתקדמים, כולל הצפנה, בקרת גישה ומעקב אחר פעילות.",
          "ספק הסליקה מאובטח לפי תקן PCI DSS לעיבוד תשלומים.",
          "עם זאת, אין אפשרות להבטיח הגנה מוחלטת.",
          "במידה שתתגלה פגיעה או חשש לאירוע אבטחה – ניתן לדווח לנו באמצעות פרטי הקשר המפורטים באתרנו.",
        ],
      },
      {
        title: "7. משך שמירת המידע",
        paragraphs: [
          "המידע האישי יישמר כל עוד נדרש לצורך מתן השירותים, עמידה בדרישות חוק או צורך עסקי לגיטימי. לאחר מכן – המידע יימחק או יעבור אנונימיזציה, אלא אם נדרש לשמרו לצורך הגנה משפטית או מחלוקות.",
        ],
      },
      {
        title: "8. זכויות המשתמש",
        paragraphs: ["בהתאם לחוק הגנת הפרטיות, עומדות לך הזכויות הבאות:"],
        items: [
          "עיון במידע שנאסף עליך.",
          "תיקון או עדכון מידע שאינו נכון.",
          "בקשת מחיקה של מידע אישי (בכפוף לחובות חוקיות).",
          "ביטול הסכמה לקבלת דיוור שיווקי.",
          "למימוש זכויותיך ניתן לפנות אלינו באמצעים המפורטים באתרנו.",
        ],
      },
      {
        title: "9. העברת מידע לחו\"ל",
        paragraphs: [
          "ייתכן שהמידע ישמר או יעובד מחוץ לישראל (כגון באירופה או ארה\"ב) אצל ספקי שירותים צד ג, לדוגמה גוגל, פייסבוק, אינסטגרם, טיקטוק וכו'. אנו דואגים כי כל העברה תעשה ברמת הגנה הולמת.",
        ],
      },
      {
        title: "10. יצירת קשר",
        paragraphs: [
          `לשאלות, בקשות או מימוש זכויות – ניתן לפנות אלינו בטלפון ${STORE.phone} או בדוא"ל ${STORE.email}.`,
          "אנו מתחייבים להשיב תוך פרק זמן סביר, ובכל מקרה לא יאוחר מ-30 יום ממועד הפנייה.",
        ],
      },
      {
        title: "11. הצהרות נוספות",
        items: [
          "האתר עשוי לכלול קישורים לאתרים חיצוניים – מדיניות זו אינה חלה עליהם.",
          "במקרה של שינוי מבני (מכירה, מיזוג, העברת פעילות) – המידע יועבר לגוף החדש בכפוף למדיניות זו.",
          "מדיניות זו כפופה לדיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט בישראל.",
          "מדיניות זו נוסחה בלשון זכר מטעמי נוחות בלבד, אך מתייחסת באופן שווה לכל המגדרים.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: UPDATED.en,
    sections: [
      {
        title: "1. General",
        paragraphs: [
          "This is an English translation for convenience. If it differs from the Hebrew policy, the Hebrew policy applies.",
          "We respect your privacy and the privacy of all our customers and users (\"users\") on our site and digital services (together, the \"services\").",
          "This policy explains how we collect, use, process and protect personal information when you use the services, under the Protection of Privacy Law, 5741-1981 (including Amendment 13).",
          "Using our site means you agree to this privacy policy. If you do not agree, please do not use the site.",
          "This policy may be updated from time to time. Material changes will be published on the site at least 30 days before they take effect. Continuing to use the site means you agree to the updated policy.",
        ],
      },
      {
        title: "2. Information we collect",
        paragraphs: ["You are not required by law to give this information. Without some details, however, we may not be able to provide some services."],
        items: [
          "Information you give us: full name, email, phone, home address, delivery and invoice address, payment details (processed by external payment providers and not stored on our site), and enquiries, messages, comments or content you create on the site.",
          "On this site, once you start the order form and type a phone or email, we keep your name, phone, email, city and cart, so we can get back to you if the order is not finished. They are deleted when the order is sent, or after 30 days.",
          "Information collected automatically: technical data (IP address, browser, operating system, device), usage and browsing data (pages visited, time spent, where you came from), general location (country/city) via Google and Facebook, and cookies and other digital identifiers.",
          "Information from third parties: if you choose to sign in with a social network (such as Google or Facebook), we receive information according to the permissions set in your account.",
        ],
      },
      {
        title: "3. How we use information",
        items: [
          "Providing and operating the services.",
          "Handling orders and payments.",
          "Customer service and support.",
          "Personalising your browsing experience and content.",
          "Analysing usage and improving the services.",
          "Preventing fraud and meeting legal obligations.",
          "Sending updates, offers and marketing content, with your consent and subject to the Communications (Bezeq and Broadcasts) Law, 5742-1982.",
        ],
      },
      {
        title: "4. Cookies and similar technologies",
        paragraphs: [
          "Our site uses cookies for: essential site functions, analytics (such as Google Analytics), ad personalisation (such as Facebook Pixel and Google Ads) and social sharing.",
          "On this site, your cart, your saved list, language, accessibility settings and your acceptance of the cookie notice are kept in your browser only (local storage) and are not sent to us, except the cart while you fill in the order form, as described in section 2.",
          "You can manage your cookie preferences with the banner on the site or in your browser settings. Blocking some cookies may stop parts of the services from working.",
        ],
      },
      {
        title: "5. Sharing information with third parties",
        paragraphs: ["We may share information:"],
        items: [
          "With your explicit consent.",
          "With external service providers (delivery, payments, cloud, analytics).",
          "On this site, the text and photos you send to the room designer and the AI assistant are processed on Google Cloud (Vertex AI).",
          "To comply with the law or court orders.",
          "To prevent fraud, illegal activity or possible harm.",
          "In a business change (merger, acquisition), provided the acquirer commits to this policy.",
          "As statistical information that does not identify users personally.",
        ],
      },
      {
        title: "6. Information security",
        items: [
          "We use advanced security measures, including encryption, access control and activity monitoring.",
          "Our payment provider is secured to the PCI DSS standard for processing payments.",
          "Even so, absolute protection cannot be guaranteed.",
          "If you discover a breach or suspect a security incident, please report it using the contact details on our site.",
        ],
      },
      {
        title: "7. How long we keep information",
        paragraphs: [
          "Personal information is kept as long as needed to provide the services, meet legal requirements or for a legitimate business need. After that it is deleted or anonymised, unless it must be kept for legal protection or disputes.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: ["Under the Protection of Privacy Law, you have the right to:"],
        items: [
          "See the information collected about you.",
          "Correct or update information that is wrong.",
          "Ask for your personal information to be deleted (subject to legal obligations).",
          "Withdraw consent to marketing mail.",
          "To use these rights, contact us using the details on our site.",
        ],
      },
      {
        title: "9. Transfers abroad",
        paragraphs: [
          "Information may be stored or processed outside Israel (such as in Europe or the US) by third-party service providers, for example Google, Facebook, Instagram and TikTok. We make sure every transfer has an adequate level of protection.",
        ],
      },
      {
        title: "10. Contact",
        paragraphs: [
          `For questions, requests or to use your rights, call ${STORE.phone} or email ${STORE.email}.`,
          "We will answer within a reasonable time, and in any case within 30 days.",
        ],
      },
      {
        title: "11. Further statements",
        items: [
          "The site may link to external sites; this policy does not apply to them.",
          "In a structural change (sale, merger, transfer of activity), information will pass to the new body subject to this policy.",
          "This policy is governed by Israeli law, and Israeli courts have exclusive jurisdiction.",
        ],
      },
    ],
  },
};
