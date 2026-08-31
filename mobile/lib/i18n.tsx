import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const LANGUAGES = ['ru', 'zh'] as const;

export type Language = (typeof LANGUAGES)[number];

/** Подпись каждого языка на нём самом: так свой пункт находят, не читая чужой. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  ru: 'RU',
  zh: '中文',
};

const ru = {
  title: 'Вход в дашборд',
  subtitle: 'Доступ по корпоративной учётной записи',
  identifierLabel: 'Логин или почта',
  passwordLabel: 'Пароль',
  submit: 'Войти',
  helper: 'Забыли пароль? Напишите администратору',
  mailSubject: 'Доступ к дашборду',
  mailFailed: 'Не удалось открыть почту. Адрес: {email}',
  errorInvalidCredentials: 'Неверный логин или пароль',
  errorUnreachable: 'Сервер недоступен: {url}',
  errorServer: 'Сервер ответил ошибкой ({status})',
  errorNotConfigured: 'Приложение собрано без адреса сервера — обратитесь к администратору',
  errorUnknown: 'Не удалось войти',

  back: 'Назад',
  articles: '{count} артикулов',
  inStock: 'на складе',
  netProfit: 'чистая прибыль за 7 дней',

  adsIcon: 'РК',
  adsTitle: 'Реклама',
  adsHint: 'Показы, клики, CTR, расход',
  adsCaption: 'CTR 7 дней',

  salesIcon: 'ПР',
  salesTitle: 'Продажи',
  salesHint: 'Заказы, выкупы, возвраты',
  salesCaption: 'к неделе',

  stockIcon: 'ОС',
  stockTitle: 'Остатки',
  stockHint: 'Склады {name} и склады продавца',
  stockCaption: 'пар на складах',

  suppliesIcon: 'ПС',
  suppliesTitle: 'Поставки',
  suppliesHint: 'В пути и на приёмке',
  suppliesCaption: 'в пути',

  reportIcon: 'ФО',
  reportTitle: 'Финансовый отчёт',
  reportHint: 'Еженедельный, с выгрузкой',

  articleSearch: 'Артикул или название',
  categoryLabel: 'Категория',
  seasonLabel: 'Сезон',
  filterAll: 'Все',
  articleHint: 'Найдите товар по артикулу или названию',
  articleNothing: 'Ничего не найдено',
  backToList: 'К списку',
  totalPairs: 'пар',
  stockBySize: 'Остатки по размерам',
  warehousesTitle: 'Склады',
  sizeLabel: 'Размер',
  sizeSelected: 'Размер {size}',
  inWayFromClient: 'В пути на склад',
  inWayToClient: 'В пути к клиентам',
  reviews: '{count} отзывов',
  warehouseSearch: 'Найти склад',
  warehouseNothing: 'Склад не найден',
  sold: 'Продано',
  soldUnits: 'Продано шт.',
  soldMoney: 'Продано руб.',
  periodMetrics: 'За период',
  perCard: 'по карточке',
  soldBySize: 'Продано по размерам',
  periodDay: '1 день',
  periodWeek: '7 дней',
  periodMonth: '30 дней',
  periodAll: 'Всего',
  claimsTitle: 'Претензии',
  claimsWaiting: 'ждут ответа',
  claimsNone: 'Претензий нет',
  claimOpen: 'Ждёт ответа',
  claimResolved: 'Решена',
  stockUpdated: 'Остатки обновлены {hours} ч назад',

  periodQuarter: '90 дней',
  metricViews: 'Просмотры',
  metricClicks: 'Клики',
  metricOrders: 'Заказы',
  metricRevenue: 'Выручка',
  metricReturns: 'Возвраты',
  metricStock: 'Остатки',
  byDays: 'по дням',
  byWeeks: 'по неделям',
  periodRange: 'Период {from} — {to} · сравнение с предыдущими {days} днями',
  periodSingle: 'Период {date} · сравнение с {previous}',
  // Списком одной строкой: двенадцать отдельных ключей на месяцы и семь
  // на дни недели раздули бы словарь ради двух подписей в календаре.
  monthNames: 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь',
  weekdayNames: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
  pickDate: 'Выбрать дату',
  wasBefore: 'было {value}',
  currencyRuble: '₽',
  dataUpdated: 'Данные обновлены {hours} ч назад',

  sectionEmpty: 'Раздел ещё не собран',

  tabDashboard: 'Дашборд',
  tabArticle: 'Артикул',
  tabHistory: 'История',
  tabMore: 'Ещё',
} as const;

export type TranslationKey = keyof typeof ru;

/** Набор ключей задаёт русский словарь: забытый перевод не соберётся. */
type Dictionary = Record<TranslationKey, string>;

const zh: Dictionary = {
  title: '登录仪表板',
  subtitle: '使用企业账户登录',
  identifierLabel: '账号或邮箱',
  passwordLabel: '密码',
  submit: '登录',
  helper: '忘记密码？请联系管理员',
  mailSubject: '仪表板访问权限',
  mailFailed: '无法打开邮件应用。地址：{email}',
  errorInvalidCredentials: '账号或密码错误',
  errorUnreachable: '无法连接服务器：{url}',
  errorServer: '服务器返回错误（{status}）',
  errorNotConfigured: '应用打包时未配置服务器地址，请联系管理员',
  errorUnknown: '登录失败',

  back: '返回',
  articles: '{count} 个商品',
  inStock: '库存',
  netProfit: '近7天净利润',

  adsIcon: '广告',
  adsTitle: '广告',
  adsHint: '展示、点击、点击率、花费',
  adsCaption: '近7天点击率',

  salesIcon: '销售',
  salesTitle: '销售',
  salesHint: '订单、买断、退货',
  salesCaption: '较上周',

  stockIcon: '库存',
  stockTitle: '库存',
  stockHint: '{name} 仓库与卖家仓库',
  stockCaption: '双 · 在库',

  suppliesIcon: '供货',
  suppliesTitle: '供货',
  suppliesHint: '在途与验收中',
  suppliesCaption: '在途',

  reportIcon: '财报',
  reportTitle: '财务报表',
  reportHint: '每周，可导出',

  articleSearch: '商品编号或名称',
  categoryLabel: '类目',
  seasonLabel: '季节',
  filterAll: '全部',
  articleHint: '按编号或名称查找商品',
  articleNothing: '未找到',
  backToList: '返回列表',
  totalPairs: '双',
  stockBySize: '各尺码库存',
  warehousesTitle: '仓库',
  sizeLabel: '尺码',
  sizeSelected: '尺码 {size}',
  inWayFromClient: '在途入库',
  inWayToClient: '在途发往客户',
  reviews: '{count} 条评价',
  warehouseSearch: '查找仓库',
  warehouseNothing: '未找到仓库',
  sold: '销量',
  soldUnits: '销售数量',
  soldMoney: '销售额',
  periodMetrics: '本期',
  perCard: '按商品',
  soldBySize: '各尺码销量',
  periodDay: '1天',
  periodWeek: '7天',
  periodMonth: '30天',
  periodAll: '全部',
  claimsTitle: '客诉',
  claimsWaiting: '待回复',
  claimsNone: '暂无客诉',
  claimOpen: '待回复',
  claimResolved: '已解决',
  stockUpdated: '库存 {hours} 小时前更新',

  periodQuarter: '90天',
  metricViews: '浏览',
  metricClicks: '点击',
  metricOrders: '订单',
  metricRevenue: '营收',
  metricReturns: '退货',
  metricStock: '库存',
  byDays: '按天',
  byWeeks: '按周',
  periodRange: '周期 {from} — {to} · 与前 {days} 天对比',
  periodSingle: '周期 {date} · 与 {previous} 对比',
  monthNames: '一月,二月,三月,四月,五月,六月,七月,八月,九月,十月,十一月,十二月',
  weekdayNames: '一,二,三,四,五,六,日',
  pickDate: '选择日期',
  wasBefore: '此前 {value}',
  currencyRuble: '₽',
  dataUpdated: '数据 {hours} 小时前更新',

  sectionEmpty: '该模块尚未开发',

  tabDashboard: '仪表板',
  tabArticle: '商品',
  tabHistory: '历史',
  tabMore: '更多',
};

const DICTIONARIES: Record<Language, Dictionary> = { ru, zh };

const DEFAULT_LANGUAGE: Language = 'ru';
const STORAGE_KEY = 'settings.language';

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translate;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value !== null && (LANGUAGES as readonly string[]).includes(value);
}

function fill(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
    template,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // Пока хранилище отвечает, экран показывается на языке по умолчанию.
    // Задерживать запуск ради подмены десятка строк не стоит.
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isLanguage(stored)) {
          setLanguageState(stored);
        }
      })
      .catch(() => {
        // Недоступное хранилище — не повод не пускать в приложение.
      });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    // Язык переключается сразу, запись идёт фоном: если она не удалась,
    // выбор проживёт до перезапуска, но интерфейс уже переключился.
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = DICTIONARIES[language];
    return {
      language,
      setLanguage,
      t: (key, params) => fill(dictionary[key], params),
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useTranslation вызван вне LanguageProvider');
  }
  return value;
}
