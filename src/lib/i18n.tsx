'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from './supabase/client';

export type SupportedLanguage = 'en' | 'ru' | 'he';
export type Language = SupportedLanguage;

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', direction: 'rtl' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const DICTIONARY = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.community': 'Community',
    'nav.makers': 'Makers',
    'nav.skills': 'Skills & XP',
    'nav.workspace': 'Ideas & Notes',
    'nav.projects': 'Projects & Tasks',
    'nav.inventory': 'Inventory',
    'nav.admin': 'Admin Hub',
    'nav.settings': 'Settings',
    'nav.feedback': 'Feedback / Bug Report',
    'nav.search': 'Search or jump to...',
    'nav.my_profile': 'My Public Profile',
    'nav.sign_in': 'Sign In',
    'nav.sign_up': 'Join Free',
    'nav.sign_out': 'Sign Out',

    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.subtitle': 'Track builds, complete project tasks, and level up your craft.',
    'dashboard.ideas_notes': 'Ideas & Notes',
    'dashboard.view_projects': 'View Projects',
    'dashboard.mastery_rank': 'Maker Mastery Rank',
    'dashboard.level': 'Level',
    'dashboard.active_streak': 'Active Streak',
    'dashboard.longest_streak': 'Longest Streak',
    'dashboard.days': 'days',
    'dashboard.total_xp': 'Total XP',
    'dashboard.skills_unlocked': 'Skills Unlocked',
    'dashboard.assigned_tasks': 'Assigned Tasks',
    'dashboard.recent_activity': 'Recent Activity',
    'dashboard.no_tasks': 'No tasks currently assigned to you. Pick up work from your projects!',
    'dashboard.no_activity': 'No activity logged yet. Start practicing or finish tasks to build momentum!',

    // Onboarding Quest
    'onboarding.title': 'Starter Workshop Quest',
    'onboarding.subtitle': 'Complete these 4 foundational milestones to master the Workbench operating system.',
    'onboarding.complete': 'Complete',
    'onboarding.dismiss': 'Dismiss Quest',
    'onboarding.step_skills': 'Choose & Level Up Your First Skills',
    'onboarding.step_skills_desc': 'Select craft skills from the catalog and log deliberate practice sessions.',
    'onboarding.step_project': 'Create Your First Project or Idea Blueprint',
    'onboarding.step_project_desc': 'Start a build workflow or jot down an invention note in your workspace.',
    'onboarding.step_tools': 'Explore Lab Calculators & Inventory',
    'onboarding.step_tools_desc': 'Calculate epoxy volumes, perfume notes, or 3D print costs with precision.',
    'onboarding.step_community': 'Say Hello in the Maker Community',
    'onboarding.step_community_desc': 'Share a photo of your bench, ask craft questions, and explore creations.',
    'onboarding.cta_skills': 'Explore Skills',
    'onboarding.cta_project': 'New Project',
    'onboarding.cta_tools': 'Open Lab',
    'onboarding.cta_community': 'Explore Feed',

    // Inventory & Restock
    'inventory.title': 'Maker Inventory',
    'inventory.subtitle': 'Track consumables, raw materials, fasteners, finished goods, and smart restock links.',
    'inventory.est_value': 'Estimated Workshop Value',
    'inventory.restock_cart': 'Restock Cart',
    'inventory.items_in_cart': 'items in cart',
    'inventory.add_item': 'New Item',
    'inventory.all_items': 'All Items',
    'inventory.materials': 'Materials',
    'inventory.equipment': 'Equipment',
    'inventory.finished_goods': 'Finished Goods',
    'inventory.recipes': 'Formulas & Recipes',
    'inventory.calculators': 'Calculators',
    'inventory.search_placeholder': 'Search items, SKU, bin...',
    'inventory.all_folders': 'All Folders',
    'inventory.new_folder': 'New Folder',
    'inventory.in_stock': 'In Stock',
    'inventory.low_stock': 'Low Stock',
    'inventory.out_of_stock': 'Out of Stock',
    'inventory.reorder_online': 'Reorder Online:',
    'inventory.amazon': 'Amazon',
    'inventory.aliexpress': 'AliExpress',
    'inventory.temu': 'Temu',
    'inventory.restock_title': 'Smart Restock Order Sheet',
    'inventory.restock_subtitle': 'Direct search generators for Amazon, AliExpress & Temu with target restocking quantities.',
    'inventory.currency': 'Currency',

    // Tools & Calculators
    'tools.title': 'Free Maker Calculators & Lab Tools',
    'tools.subtitle': 'Precision workshop calculators with 1-click recipe export, unit conversions, and costing.',
    'tools.tab_resin': 'Epoxy Resin Mold',
    'tools.tab_perfume': 'Perfume Dilution',
    'tools.tab_3dprint': '3D Print Costing',
    'tools.tab_crossstitch': 'Cross-Stitch & Fabric',
    'tools.tab_candle': 'Candle & Soap Batch',
    'tools.tab_lasercut': 'Laser & CNC Nesting',

    // Settings
    'settings.title': 'Account & Workshop Settings',
    'settings.subtitle': 'Manage your maker profile, preferences, language, currency, and data backups.',
    'settings.profile_info': 'Profile Information',
    'settings.display_name': 'Display Name',
    'settings.username': 'Username',
    'settings.bio': 'Biography & Maker Craft',
    'settings.support_url': 'Buy Me a Coffee / Tip Link',
    'settings.language': 'Interface Language',
    'settings.preferred_currency': 'Preferred Display Currency',
    'settings.save_changes': 'Save Changes',
    'settings.saved_success': 'Settings updated successfully!',
    'settings.backup_title': 'Data Sovereignty & Backups',
    'settings.backup_desc': 'Export your entire maker history, inventory, recipes, community posts, and tasks into a portable JSON archive (v2.6.0).',
    'settings.export_button': 'Export Complete Maker Archive',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.filter': 'Filter',
  },
  ru: {
    // Navigation
    'nav.dashboard': 'Панель управления',
    'nav.community': 'Сообщество',
    'nav.makers': 'Мейкеры',
    'nav.skills': 'Навыки и XP',
    'nav.workspace': 'Идеи и чертежи',
    'nav.projects': 'Проекты и задачи',
    'nav.inventory': 'Склад и материалы',
    'nav.admin': 'Панель администратора',
    'nav.settings': 'Настройки',
    'nav.feedback': 'Отзыв / Сообщить об ошибке',
    'nav.search': 'Поиск или переход...',
    'nav.my_profile': 'Мой публичный профиль',
    'nav.sign_in': 'Войти',
    'nav.sign_up': 'Регистрация',
    'nav.sign_out': 'Выйти',

    // Dashboard
    'dashboard.welcome': 'С возвращением',
    'dashboard.subtitle': 'Отслеживайте проекты, выполняйте задачи мастерской и повышайте уровень мастерства.',
    'dashboard.ideas_notes': 'Идеи и заметки',
    'dashboard.view_projects': 'Все проекты',
    'dashboard.mastery_rank': 'Ранг мастерства',
    'dashboard.level': 'Уровень',
    'dashboard.active_streak': 'Текущая серия',
    'dashboard.longest_streak': 'Лучшая серия',
    'dashboard.days': 'дн.',
    'dashboard.total_xp': 'Всего XP',
    'dashboard.skills_unlocked': 'Открыто навыков',
    'dashboard.assigned_tasks': 'Назначенные задачи',
    'dashboard.recent_activity': 'Недавняя активность',
    'dashboard.no_tasks': 'У вас пока нет назначенных задач. Выберите задачу в одном из своих проектов!',
    'dashboard.no_activity': 'История активности пуста. Занимайтесь практикой или завершайте задачи!',

    // Onboarding Quest
    'onboarding.title': 'Квест начинающего мастера',
    'onboarding.subtitle': 'Выполните 4 ключевых шага, чтобы освоить возможности операционной системы Workbench.',
    'onboarding.complete': 'Выполнено',
    'onboarding.dismiss': 'Скрыть квест',
    'onboarding.step_skills': 'Выберите и прокачайте первые навыки',
    'onboarding.step_skills_desc': 'Откройте навыки в каталоге и запишите свою первую практическую сессию.',
    'onboarding.step_project': 'Создайте первый проект или чертеж',
    'onboarding.step_project_desc': 'Запустите рабочий проект или запишите идею изобретения в рабочей области.',
    'onboarding.step_tools': 'Изучите калькуляторы и инвентарь',
    'onboarding.step_tools_desc': 'Рассчитывайте пропорции смолы, формулы духов или себестоимость 3D-печати.',
    'onboarding.step_community': 'Поздоровайтесь в сообществе мастеров',
    'onboarding.step_community_desc': 'Поделитесь фото верстака, задайте вопрос и изучите работы коллег.',
    'onboarding.cta_skills': 'Выбрать навыки',
    'onboarding.cta_project': 'Новый проект',
    'onboarding.cta_tools': 'Открыть калькуляторы',
    'onboarding.cta_community': 'Лента сообщества',

    // Inventory & Restock
    'inventory.title': 'Склад мастерской',
    'inventory.subtitle': 'Учет расходников, сырья, инструмента, готовых изделий и ссылки на автопополнение.',
    'inventory.est_value': 'Оценочная стоимость склада',
    'inventory.restock_cart': 'Корзина закупки',
    'inventory.items_in_cart': 'тов. в корзине',
    'inventory.add_item': 'Добавить позицию',
    'inventory.all_items': 'Все позиции',
    'inventory.materials': 'Материалы',
    'inventory.equipment': 'Оборудование',
    'inventory.finished_goods': 'Готовые изделия',
    'inventory.recipes': 'Формулы и рецепты',
    'inventory.calculators': 'Калькуляторы',
    'inventory.search_placeholder': 'Поиск по названию, артикулу, ячейке...',
    'inventory.all_folders': 'Все папки',
    'inventory.new_folder': 'Новая папка',
    'inventory.in_stock': 'В наличии',
    'inventory.low_stock': 'Мало',
    'inventory.out_of_stock': 'Закончилось',
    'inventory.reorder_online': 'Заказать онлайн:',
    'inventory.amazon': 'Amazon',
    'inventory.aliexpress': 'AliExpress',
    'inventory.temu': 'Temu',
    'inventory.restock_title': 'Бланк пополнения запасов',
    'inventory.restock_subtitle': 'Прямой поиск на Amazon, AliExpress и Temu с учетом требуемого количества.',
    'inventory.currency': 'Валюта',

    // Tools & Calculators
    'tools.title': 'Бесплатные калькуляторы и лаборатория мейкера',
    'tools.subtitle': 'Точные расчеты для мастерской с экспортом формул в 1 клик, конвертацией единиц и себестоимостью.',
    'tools.tab_resin': 'Эпоксидная смола',
    'tools.tab_perfume': 'Парфюмерная лаборатория',
    'tools.tab_3dprint': 'Себестоимость 3D печати',
    'tools.tab_crossstitch': 'Вышивка и канва',
    'tools.tab_candle': 'Свечи и мыло',
    'tools.tab_lasercut': 'Лазерная резка и раскрой',

    // Settings
    'settings.title': 'Настройки аккаунта и мастерской',
    'settings.subtitle': 'Управление профилем, языком интерфейса, валютой и экспортом резервных копий.',
    'settings.profile_info': 'Данные профиля',
    'settings.display_name': 'Отображаемое имя',
    'settings.username': 'Имя пользователя',
    'settings.bio': 'Биография и ремесло',
    'settings.support_url': 'Ссылка на поддержку (Buy Me a Coffee)',
    'settings.language': 'Язык интерфейса',
    'settings.preferred_currency': 'Основная валюта отображения',
    'settings.save_changes': 'Сохранить изменения',
    'settings.saved_success': 'Настройки успешно обновлены!',
    'settings.backup_title': 'Резервное копирование данных',
    'settings.backup_desc': 'Экспортируйте полную историю мастерской, инвентарь, рецепты и посты в единый JSON-архив (v2.6.0).',
    'settings.export_button': 'Экспортировать архив мастера',

    // Common
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
    'common.edit': 'Редактировать',
    'common.close': 'Закрыть',
    'common.loading': 'Загрузка...',
    'common.search': 'Поиск',
    'common.filter': 'Фильтр',
  },
  he: {
    // Navigation
    'nav.dashboard': 'לוח בקרה',
    'nav.community': 'קהילה',
    'nav.makers': 'יוצרים',
    'nav.skills': 'מיומנויות ו-XP',
    'nav.workspace': 'רעיונות ושרטוטים',
    'nav.projects': 'פרויקטים ומשימות',
    'nav.inventory': 'מלאי וחומרים',
    'nav.admin': 'ניהול מערכת',
    'nav.settings': 'הגדרות',
    'nav.feedback': 'משוב / דיווח באג',
    'nav.search': 'חיפוש או ניווט מהיר...',
    'nav.my_profile': 'הפרופיל הציבורי שלי',
    'nav.sign_in': 'התחברות',
    'nav.sign_up': 'הרשמה חינם',
    'nav.sign_out': 'התנתקות',

    // Dashboard
    'dashboard.welcome': 'ברוך שובך',
    'dashboard.subtitle': 'עקוב אחר בנייה, השלם משימות ושפר את רמת האומנות שלך.',
    'dashboard.ideas_notes': 'רעיונות ופתקים',
    'dashboard.view_projects': 'לכל הפרויקטים',
    'dashboard.mastery_rank': 'דרגת מומחיות',
    'dashboard.level': 'רמה',
    'dashboard.active_streak': 'רצף פעיל',
    'dashboard.longest_streak': 'רצף שיא',
    'dashboard.days': 'ימים',
    'dashboard.total_xp': 'סה״כ XP',
    'dashboard.skills_unlocked': 'מיומנויות פתוחות',
    'dashboard.assigned_tasks': 'משימות שהוקצו לך',
    'dashboard.recent_activity': 'פעילות אחרונה',
    'dashboard.no_tasks': 'אין משימות פתוחות המוקצות לך כרגע. בחר משימה באחד הפרויקטים!',
    'dashboard.no_activity': 'אין פעילות רשומה עדיין. בצע אימון מודרך או סיים משימה!',

    // Onboarding Quest
    'onboarding.title': 'משימת פתיחה לסדנה',
    'onboarding.subtitle': 'השלם 4 צעדים אלו כדי לשלוט במערכת ההפעלה של Workbench.',
    'onboarding.complete': 'הושלם',
    'onboarding.dismiss': 'הסתר משימה',
    'onboarding.step_skills': 'בחר ושפר את המיומנויות הראשונות',
    'onboarding.step_skills_desc': 'בחר מיומנויות מתוך הקטלוג ותעד את אימון הסדנה הראשון שלך.',
    'onboarding.step_project': 'צור פרויקט או שרטוט ראשון',
    'onboarding.step_project_desc': 'התחל זרימת עבודה לפרויקט או רשום רעיון להמצאה בסביבת העבודה.',
    'onboarding.step_tools': 'חקור מחשבוני מעבדה ומלאי',
    'onboarding.step_tools_desc': 'חשב יחסי אפוקסי, נוסחאות בשמים או עלויות הדפסה בתלת-ממד.',
    'onboarding.step_community': 'אמור שלום בקהילת היוצרים',
    'onboarding.step_community_desc': 'שתף תמונה משולחן העבודה, שאל שאלות וגלה יצירות חדשות.',
    'onboarding.cta_skills': 'חקור מיומנויות',
    'onboarding.cta_project': 'פרויקט חדש',
    'onboarding.cta_tools': 'פתח מעבדה',
    'onboarding.cta_community': 'לפיד הקהילה',

    // Inventory & Restock
    'inventory.title': 'מלאי הסדנה',
    'inventory.subtitle': 'מעקב אחר חומרים מתכלים, ציוד, מוצרים מוגמרים וקישורי חידוש מלאי חכמים.',
    'inventory.est_value': 'שווי סדנה משוער',
    'inventory.restock_cart': 'עגלת חידוש מלאי',
    'inventory.items_in_cart': 'פריטים בעגלה',
    'inventory.add_item': 'פריט חדש',
    'inventory.all_items': 'כל הפריטים',
    'inventory.materials': 'חומרי גלם',
    'inventory.equipment': 'ציוד ומכשירים',
    'inventory.finished_goods': 'מוצרים מוגמרים',
    'inventory.recipes': 'נוסחאות ומתכונים',
    'inventory.calculators': 'מחשבונים',
    'inventory.search_placeholder': 'חיפוש לפי שם, מק״ט, מיקום...',
    'inventory.all_folders': 'כל התיקיות',
    'inventory.new_folder': 'תיקייה חדשה',
    'inventory.in_stock': 'במלאי',
    'inventory.low_stock': 'מלאי נמוך',
    'inventory.out_of_stock': 'אזל מהמלאי',
    'inventory.reorder_online': 'הזמנה מקוונת:',
    'inventory.amazon': 'Amazon',
    'inventory.aliexpress': 'AliExpress',
    'inventory.temu': 'Temu',
    'inventory.restock_title': 'דף הזמנת חידוש מלאי',
    'inventory.restock_subtitle': 'מחוללי חיפוש ישירים ל-Amazon, AliExpress ו-Temu עם כמויות יעד להזמנה.',
    'inventory.currency': 'מטבע',

    // Tools & Calculators
    'tools.title': 'מחשבוני סדנה ומעבדה למייקרים',
    'tools.subtitle': 'מחשבוני סדנה מדויקים עם ייצוא מתכונים בלחיצה אחת, המרות יחידות וחישוב עלויות.',
    'tools.tab_resin': 'יציקת שרף אפוקסי',
    'tools.tab_perfume': 'מהילת בשמים',
    'tools.tab_3dprint': 'עלות הדפסת תלת-ממד',
    'tools.tab_crossstitch': 'רקמת צלב ובד',
    'tools.tab_candle': 'נרות וסבונים',
    'tools.tab_lasercut': 'חיתוך לייזר ו-CNC',

    // Settings
    'settings.title': 'הגדרות חשבון וסדנה',
    'settings.subtitle': 'ניהול פרופיל היוצר, שפת ממשק, מטבע תצוגה וגיבויי מידע.',
    'settings.profile_info': 'פרטי פרופיל',
    'settings.display_name': 'שם תצוגה',
    'settings.username': 'שם משתמש',
    'settings.bio': 'ביוגרפיה ותחום אומנות',
    'settings.support_url': 'קישור לתמיכה (Buy Me a Coffee)',
    'settings.language': 'שפת ממשק',
    'settings.preferred_currency': 'מטבע תצוגה מועדף',
    'settings.save_changes': 'שמור שינויים',
    'settings.saved_success': 'ההגדרות נשמרו בהצלחה!',
    'settings.backup_title': 'ריבונות וגיבוי נתונים',
    'settings.backup_desc': 'ייצוא מלא של היסטוריית הסדנה, המלאי, הנוסחאות והפוסטים לארכיון JSON (גרסה 2.6.0).',
    'settings.export_button': 'ייצוא ארכיון מלא',

    // Common
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.close': 'סגור',
    'common.loading': 'טוען...',
    'common.search': 'חיפוש',
    'common.filter': 'סינון',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY['en'];

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey, fallback?: string) => string;
  dir: 'ltr' | 'rtl';
  currentOption: LanguageOption;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: async () => {},
  t: (key: TranslationKey, fallback?: string) => fallback || key,
  dir: 'ltr',
  currentOption: SUPPORTED_LANGUAGES[0],
});

export function LanguageProvider({
  children,
  initialLanguage,
  userId,
}: {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
  userId?: string;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workbench_lang') as SupportedLanguage;
      if (stored && ['en', 'ru', 'he'].includes(stored)) {
        return stored;
      }
    }
    return initialLanguage || DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workbench_lang') as SupportedLanguage;
      if (stored && stored !== language && ['en', 'ru', 'he'].includes(stored)) {
        setLanguageState(stored);
      }
    }
  }, []);

  const currentOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  async function setLanguage(newLang: SupportedLanguage) {
    setLanguageState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workbench_lang', newLang);
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'he' ? 'rtl' : 'ltr';
    }

    if (userId) {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings_json')
          .eq('id', userId)
          .single();

        const updatedSettings = {
          ...(profile?.settings_json || {}),
          language: newLang,
        };

        await supabase
          .from('profiles')
          .update({ settings_json: updatedSettings })
          .eq('id', userId);
      } catch (err) {
        console.error('Failed to sync language to profile:', err);
      }
    }
  }

  function t(key: TranslationKey, fallback?: string): string {
    const dict = DICTIONARY[language] || DICTIONARY.en;
    const val = (dict as any)[key] || (DICTIONARY.en as any)[key] || fallback || key;
    return val;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir: currentOption.direction,
        currentOption,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
