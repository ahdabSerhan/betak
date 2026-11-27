// The terms of use (תקנון), copied from the store's previous site (betak.co.il/תקנון).
import type { Lang } from "../i18n/text";
import type { Statement } from "./accessibility";
import { STORE } from "./store";

const UPDATED = { he: "עודכן לאחרונה: 26 בנובמבר 2026", en: "Last updated: 26 November 2026" };

export const TERMS: Record<Lang, Statement> = {
  he: {
    title: "תקנון",
    updated: UPDATED.he,
    sections: [
      {
        title: "כללי",
        items: [
          "ביתאק היא חנות אינטרנטית (להלן: \"החנות ו/או האתר\") תוכלו לרכוש מגוון רהיטים בדרך נוחה, קלה ומהירה ובמחירים נוחים לכל כיס.",
          "מחירי המוצרים בחנות כוללים מע\"מ.",
          "גיל המינימום לביצוע הזמנה דרך האתר הוא 18 שנים.",
          "הוראות תקנון זה יחולו על כל שימוש ורכישה שיעשו על ידך בחנות זאת, התקנון מהווה חוזה התקשרות מחייב בינך לבין החנות, לכל דבר ועניין.",
          "הנך מתבקש לקרוא תקנון זה במלואו ובעיון, כתנאי מוקדם להתקשרות בין הצדדים גלישה בחנות ו/או רכישת המוצר ו/או שירות המוצעים למכירה בו, מהווה את הסכמתך לנהוג על פי הוראות התקנון וכל שימוש בשירותי החנות כפוף להוראות התקנון.",
          "החברה רשאית לשנות את תנאי תקנון מעת לעת ולפי שיקול החברה הבלעדיים.",
          "תמונות המוצרים בחנות תואמות למוצר המקורי ואולם בחלק מן המקרים התמונות הינן להמחשה בלבד.",
          "במוצרים מעץ, בבדים ובעורות ישנם הבדלים של גוון וטקסטורה. כמו כן, עלולה להיות סטייה קלה מהמידות הנקובות במפרט הטכני של המוצע וכד'. הלקוח מסכים לקבלת מוצרים בהם חלו סטיות קלות.",
          "האתר מקיים בקרה שוטפת על מלאי המוצרים המוצעים למכירה. כאשר המלאי עומד בפני סיום יידע מפעיל האתר את הצרכנים על כך, או יעדכן את מספר המוצרים שנותרו במלאי במקום בולט באתר. אם לאחר ביצוע ההזמנה יתברר כי המוצר אזל, החנות תודיע על כך ללקוח תוך שני ימי עסקים ותאפשר לו לבחור בין קבלת מוצר חלופי ושווה ערך לבין השבת מלוא הסכום ששולם על ידו.",
          "השימוש באתר מותר לצרכים אישיים ובלתי מסחריים ובאופן ובהיקף המותר על פי כללי השימוש ההוגן והוראות כל דין.",
          "האתר משמש כאתר מכירות לצורך רכישת מוצרי ריהוט בהזמנה אישית ומיוחדת.",
          "לבית משפט השלום נוף הגליל תהיה הסמכות הייחודית והבלעדית לדון בכל תובענה הקשורה בהזמנת מוצרים מאיתנו ו/או בקשר עם שימוש באתר.",
          `ניתן לבצע בירורים ולקבל כל מידע נוסף בטלפון או בווטסאפ מס ${STORE.phone} בין השעות 9:00 - 19:00 או בדוא"ל ${STORE.email}`,
        ],
      },
      {
        title: "אופן הזמנת המוצרים בחנות",
        items: [
          "מילוי כל הפרטים מהווה תנאי מוקדם לביצוע ההזמנה. לשם הבטחת ביצוע ההזמנה ביעילות וללא תקלות יש להקפיד על מסירת כל הפרטים במדויק.",
          "לרשות לקוחות החנות מספר אפשרויות לתשלום: באמצעות כרטיס אשראי - התשלום בכרטיס אשראי בכפוף לתנאי חברת האשראי.",
          "ניתן למסור את פרטי כרטיס האשראי בטופס הזמנה מאובטח באתר או בטלפון לנציג שירות.",
          "לידיעתכם, פרטי כרטיס האשראי אינם נשמרים.",
          "ניתן לשלם בכרטיס האשראי בתשלום אחד או עד 12 תשלומים, בתשלומים שווים ללא ריבית והצמדה או בקרדיט.",
          "מיד לאחר ביצוע ההזמנה, תיערך בדיקה של פרטי כרטיס האשראי ועם אישור ההזמנה ע\"י חברת האשראי.",
          "חיוב המזמין בגין עלות המוצר ו/או השירות שהוזמן על ידו, יתבצע באמצעות כרטיס האשראי, לאחר אישור העסקה ע\"י חברת האשראי.",
          "הפרטים כפי שהוזנו בהליך ההרשמה וכן רישום העסקה במחשבי החנות יהוו ראיה חלוטה לנכונות הפעולות.",
          "הגשת פרטים כוזבים הינה עבירה פלילית והעושה כן, צפוי להליכים משפטיים פליליים ואזרחיים.",
          "באחריות הלקוח לבדוק שהמידות שהוזמנו מתאימות לביתו כולל כניסה ומעבר ולוודא שהסחורה תיכנס לביתו, אי כניסה של הסחורה יחוייב הלקוח בתשלום הובלה נוסף, בנוסף יחוייב הלקוח על ייצור פריט ו/או חלק נוסף שיותאמו לבית הלקוח.",
          "לפרטים נוספים ובירורים, ניתן לפנות ישירות אלינו בטלפון ו/או באמצעות דואר אלקטרוני כפי שאלה מופיעים בקישור \"צור קשר\" בחנות.",
        ],
      },
      {
        title: "ביטול עסקאות",
        paragraphs: [
          "זכות ביטול בהתאם לחוק הגנת הצרכן, התשמ\"א-1981, רשאי הצרכן לבטל עסקה בתוך 14 ימים ממועד קבלת המוצר, בתנאי שהמוצר חדש, לא נעשה בו שימוש, לא הורכב והוא באריזתו המקורית.",
          "לשים לב שהמוצר שיוצר בייצור אישי עבורך אינו ניתן לביטול (רשום מתחת לכל מוצר בהחרגות והערות אם המוצר מיוצר במיוחד עבורך/מוצר שמחזיקים במלאי). אם הנך אזרח ותיק, עולה חדש או אדם עם מוגבלות כהגדרתם בחוק הגנת הצרכן וההתקשרות בעסקה כללה שיחה בינך ובין החברה (לרבות שיחה באמצעות תקשורת אלקטרונית) הנך רשאי לבטל את העסקה בתוך ארבעה חודשים ממועד קבלת המוצר או מיום קבלת מסמך גילוי (לפי המאוחר מביניהם) אך יהיה עליך להציג תעודה המעידה על השתייכותך לאחת מאוכלוסיות אלה, על פי הקבוע בחוק הגנת הצרכן.",
          "זכות הביטול לא תחול כאשר המוצר מיוצר במיוחד עבורך, החל ממועד תחילת ייצורו. בהתאם להוראות חוק הגנת הצרכן והתקנות אשר הותקנו בעקבותיו, זכות הביטול לא תחול לגבי מוצר שיוצר במיוחד בעבור הצרכן לפי מידות/צבעים/סוגי בדים ו/או דרישות מיוחדות של המזמין ו/או מוצר אשר אינו מוחזק במלאי באופן שוטף.",
        ],
        items: [
          "מוצר שהורכב בבית הלקוח, בין אם על ידו או על ידי מרכיב מוסמך, לא יהיה ניתן לביטול עסקה.",
          "החזרת המוצר היא באחריותך ועל חשבונך ועליך לוודא כי לא ייגרם לו נזק במהלך ההובלה. אם יתברר כי במוצר שהוחזר נגרם פגם או נזק, נהיה רשאים לתבוע ממך פיצוי בגין כך. אם תבקש כי החזרת המוצר תיעשה על ידינו הדבר כרוך בתשלום דמי הובלה בסך 350 ₪ בצירוף תוספת עבור הובלה מאזורים מרוחקים, לפי הפירוט במדיניות המשלוחים.",
          "כספך יוחזר לך בתוך 14 ימים מיום קבלת ההודעה על הביטול, למעט דמי ביטול בשיעור של 5% ממחיר המוצר ועד 100 ₪.",
          "במקרה של פגם במוצר רשאית החברה לתקן את הפגם או לספק מוצר חדש זהה וכל זאת בהתאם לשיקול החברה.",
          "סעיף יסוד - ביתאק תהיה רשאית לבטל כל עסקה במידה והדגם השתנה, נגמר מהמלאי/לא ניתן להשיג אותו עוד. במידה ואירוע מסוג זה מתרחש מבצע ההזמנה מצהיר כי הוא מודע לכך כי יהיה איחור בזמן האספקה או ביטול העסקה ללא פיצוי ותמורה כלשהי.",
          "התמונות של המוצרים המוצעים באתר הם להמחשה בלבד.",
          "שים לב: בחלק מן המוצרים עשוי להיות שוני בין המוצר המוצג לבין המוצר שיתקבל כתוצאה מתכונות המוצר.",
          "שים לב: בחלק מן המוצרים צפויים להיווצר שינויים מסויימים כתוצאה מן השימוש, כגון שינויים בתפרים, שקיעה או התרוככות במידה סבירה של רכיבים רכים כגון כריות וחומרי ריפוד, קימוט של הבד ושינוי גוון בבדי מיקרופייבר קטיפתיים. שינויים אלה נובעים מתכונותיו הטבעיות של החומר, אינם מהווים אי התאמה, פגם או תקלה ולא תינתן אחריות בגינם. מובהר, כי הריהיטים מיוצרים באופן אשר לוקח בחשבון את השפעת השימוש על הרהיט, במידה מסויימת של התרוככות או כיו\"ב.",
          "כל פנייה לבקשה לביטול עסקה/תלונה על המוצר ייעשה בכתב בלבד, באמצעות הדואר האלקטרוני לרהיטי ביתאק כאשר על מבצע הפעולה מוטלת האחריות לוודא את קבלת ההודעה.",
        ],
      },
      {
        title: "אחריות ושירות",
        items: [
          "אנו עושים כמיטב יכולתנו לשרת אתכם נאמנה. בכל שאלה בנוגע למוצר עצמו, מפרט טכני.",
          "אנו נעשה את המיטב לתת מענה לכל שאלה או בעיה.",
          "האחריות למערכת הישיבה, סלונים ומיטות לשנה אחת.",
          "האחריות לא תחול במקרה של נזק פיזי, פגיעת ברק, השחתות שונות, שריפה, רטיבות או שימוש בלתי סביר במוצר.",
          "במקרה של פגם קל במוצר הניתן לתיקון מיידי נשמרת לחנות הזכות לתקן את המוצר לשביעות רצונו המלאה של המזמין תוך 14 ימי עסקים. אם לא ניתן לתקנו יוחלף המוצר במוצר חדש או שכספו של המזמין יושב לו.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of use",
    updated: UPDATED.en,
    sections: [
      {
        title: "General",
        paragraphs: ["This is an English translation for convenience. If it differs from the Hebrew terms, the Hebrew terms apply."],
        items: [
          "Betak is an online store (the \"store\" and/or the \"site\") where you can buy a range of furniture easily, quickly and at prices for every budget.",
          "Prices in the store include VAT.",
          "You must be at least 18 years old to order through the site.",
          "These terms apply to every use of and purchase from this store, and form a binding contract between you and the store.",
          "Please read these terms fully and carefully before doing business with us. Browsing the store and/or buying a product or service offered in it means you agree to these terms, and every use of the store is subject to them.",
          "The company may change these terms from time to time at its sole discretion.",
          "Product photos match the original product, but in some cases they are for illustration only.",
          "Wood, fabric and leather products vary in shade and texture. There may also be slight deviations from the dimensions in the product's specifications. The customer agrees to receive products with slight deviations.",
          "The site monitors the stock of products on sale. When stock is running out, the site operator will tell customers or show the number of items left in a prominent place on the site. If a product turns out to be out of stock after an order is placed, the store will tell the customer within two business days and let them choose between an equivalent alternative product and a full refund of what they paid.",
          "The site may be used for personal, non-commercial purposes, within fair use and the law.",
          "The site is a store for buying furniture made to personal, special order.",
          "The Nof HaGalil Magistrates' Court has sole and exclusive jurisdiction over any claim about ordering products from us and/or about using the site.",
          `For questions and more information, call or WhatsApp ${STORE.phone} between 9:00 and 19:00, or email ${STORE.email}.`,
        ],
      },
      {
        title: "How to order",
        items: [
          "All details must be filled in before an order can be placed. To make sure your order goes smoothly, please give all details accurately.",
          "Payment is by credit card, subject to the card company's terms.",
          "Card details can be given in a secure order form on the site or by phone to a service representative.",
          "Please note that card details are not stored.",
          "You can pay by card in one payment or up to 12 equal payments without interest or linkage, or by credit.",
          "Right after the order is placed, the card details are checked and the order is approved by the card company.",
          "The customer is charged for the product and/or service ordered by credit card, after the card company approves the transaction.",
          "The details entered when ordering and the record of the transaction in the store's computers are conclusive evidence of the transactions.",
          "Giving false details is a criminal offence and may lead to criminal and civil proceedings.",
          "The customer is responsible for checking that the ordered dimensions suit their home, including entrances and passageways, and that the goods will fit in. If the goods do not fit, the customer will be charged for an additional delivery and for making an additional item and/or part to fit their home.",
          "For more details and questions, contact us by phone and/or email, as listed on the \"Contact\" page.",
        ],
      },
      {
        title: "Cancelling a purchase",
        paragraphs: [
          "Under the Consumer Protection Law, 5741-1981, a consumer may cancel a purchase within 14 days of receiving the product, provided it is new, unused, unassembled and in its original packaging.",
          "Please note that a product made specially for you cannot be cancelled (each product's exclusions and notes say whether it is made to order or held in stock). If you are a senior citizen, a new immigrant or a person with a disability as defined in the Consumer Protection Law, and the purchase included a conversation between you and the company (including by electronic means), you may cancel within four months of receiving the product or the disclosure document (whichever is later), on showing a certificate that you belong to one of these groups, as the law sets out.",
          "The right to cancel does not apply to a product made specially for you, from the time production starts. Under the Consumer Protection Law and its regulations, it does not apply to a product made to the customer's dimensions, colours, fabrics and/or special requests, and/or a product that is not regularly held in stock.",
        ],
        items: [
          "A product assembled in the customer's home, by the customer or by a qualified installer, cannot be cancelled.",
          "Returning the product is your responsibility and at your cost, and you must make sure it is not damaged in transport. If the returned product turns out to be damaged, we may claim compensation from you. If you ask us to collect the product, there is a delivery charge of ₪350 plus a supplement for remote areas, as set out in the shipping policy.",
          "Your money will be refunded within 14 days of receiving the cancellation notice, less a cancellation fee of 5% of the product's price, up to ₪100.",
          "If a product is faulty, the company may repair it or supply an identical new product, at its discretion.",
          "Fundamental clause: Betak may cancel any purchase if the model has changed, is out of stock or can no longer be obtained. If this happens, the customer confirms they know that delivery may be delayed or the purchase cancelled without any compensation.",
          "Photos of the products on the site are for illustration only.",
          "Please note: some products may differ from the one shown because of the product's properties.",
          "Please note: some products will change somewhat with use, such as changes in stitching, reasonable settling or softening of soft parts like cushions and padding, creasing of the fabric and changes of shade in velvety microfiber fabrics. These come from the natural properties of the material, are not a defect or fault and are not covered by the warranty. The furniture is made to allow for the effect of use, including some softening.",
          "Any request to cancel a purchase or complaint about a product must be made in writing only, by email to Betak Furniture, and the sender is responsible for making sure it was received.",
        ],
      },
      {
        title: "Warranty and service",
        items: [
          "We do our best to serve you faithfully, with any question about the product itself or its specifications.",
          "We will do our best to answer every question or problem.",
          "Seating systems, living room sets and beds have a one-year warranty.",
          "The warranty does not cover physical damage, lightning, vandalism, fire, moisture or unreasonable use of the product.",
          "If a product has a minor fault that can be fixed right away, the store may repair it to the customer's full satisfaction within 14 business days. If it cannot be repaired, the product will be replaced with a new one or the customer's money will be refunded.",
        ],
      },
    ],
  },
};
