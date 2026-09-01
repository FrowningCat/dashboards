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
  errorTooManyAttempts: 'Слишком много попыток. Попробуйте через {minutes} мин',
  errorUnknown: 'Не удалось войти',

  back: 'Назад',
  articles: '{count} артикулов',
  cardStock: 'пар на складе',
  cardSold: 'продано, 30 дней',
  cardRevenue: 'выручка, ₽',

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

  adsSpend: 'Расход',
  adsDrr: 'ДРР',
  adsDrrExplain: 'ДРР — какую часть выручки съела реклама:',
  adsDrrFormula: 'расход {spend} ÷ выручка с рекламы {revenue} = {drr}',
  percentPoints: 'п.п.',
  adsFunnel: 'Воронка',
  adsImpressions: 'Показы',
  adsBoughtOut: 'Выкуплено',
  adsCtr: 'CTR',
  adsToOrder: 'В заказ',
  adsBuyout: 'Выкуп',
  adsOfImpressions: 'от показов',
  adsOfClicks: 'от кликов',
  adsOfOrders: 'от заказов',
  adsUnitCosts: '{cpc} за клик · {cpo} за выкуп',
  adsCampaigns: 'Кампании',
  adsCampaignSearch: 'Поиск по названию кампании',
  adsCampaignNothing: 'Кампания не найдена',
  adsCampaignSpend: 'Затраты {spend} · {clicks} кликов',
  adsCampaignArticles: 'Товары',

  reportFinance: 'Финансовый отчёт',
  reportDownload: 'Скачать',
  reportSaved: 'Сохранён {name}',
  errorNotImplemented: 'Выгрузка ещё не подключена',
  errorNoData: 'Данных пока нет: выгрузка ещё не запускалась',
  errorCannotSave: 'Это устройство не умеет сохранять файлы',

  moreSections: 'Разделы',
  reportWeek: 'за неделю {from} — {to}',
  reportWeekNote: 'Wildberries закрывает отчёт раз в неделю, по понедельникам за прошедшую',
  periodPlain: 'Период {from} — {to}',
  sectionSupplies: 'Поставки',
  sectionSuppliesHint: 'Принятые и планируемые',
  sectionStocks: 'Остатки',
  sectionStocksHint: 'Склады Wildberries, по артикулам',
  sectionStocksFbs: 'Остатки ФБС',
  sectionStocksFbsHint: 'Свой склад продавца',
  stocksOnHand: 'На складах',
  stocksInWay: 'В пути',
  stocksBothWays: 'к клиентам и обратно',
  stocksArticleCount: '{count} артикулов',
  stocksArticles: 'Артикулы',
  stocksSearch: 'Найти артикул по номеру',
  stocksNothing: 'Артикул не найден',
  stocksAsOf: 'Остатки на {date}',
  stocksSizeCode: 'Код размера {code}',
  stocksNoName: 'Название неизвестно',
  stocksHidden: 'Ещё {count} артикулов — уточните поиском',
  suppliesPlanned: 'Планируемые',
  suppliesAccepted: 'Принятые',
  suppliesSummary: '{count} · {pairs} пар',
  suppliesNone: 'За период поставок не было',
  loading: 'Загрузка…',
  retry: 'Повторить',

  tabAds: 'Реклама',
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
  errorTooManyAttempts: '尝试次数过多，请在 {minutes} 分钟后重试',
  errorUnknown: '登录失败',

  back: '返回',
  articles: '{count} 个商品',
  cardStock: '双 · 在库',
  cardSold: '30天销量',
  cardRevenue: '营收, ₽',

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

  adsSpend: '广告花费',
  adsDrr: '广告费占比',
  adsDrrExplain: '广告费占比 — 广告吃掉了多少营收：',
  adsDrrFormula: '花费 {spend} ÷ 广告带来的营收 {revenue} = {drr}',
  percentPoints: '个百分点',
  adsFunnel: '漏斗',
  adsImpressions: '展示',
  adsBoughtOut: '已签收',
  adsCtr: '点击率',
  adsToOrder: '转化下单',
  adsBuyout: '签收率',
  adsOfImpressions: '占展示',
  adsOfClicks: '占点击',
  adsOfOrders: '占订单',
  adsUnitCosts: '每次点击 {cpc} · 每单签收 {cpo}',
  adsCampaigns: '广告活动',
  adsCampaignSearch: '按名称查找广告活动',
  adsCampaignNothing: '未找到广告活动',
  adsCampaignSpend: '花费 {spend} · {clicks} 次点击',
  adsCampaignArticles: '商品',

  reportFinance: '财务报表',
  reportDownload: '下载',
  reportSaved: '已保存 {name}',
  errorNotImplemented: '数据导出尚未接入',
  errorNoData: '暂无数据：导出尚未运行',
  errorCannotSave: '此设备无法保存文件',

  moreSections: '板块',
  reportWeek: '{from} — {to} 当周',
  reportWeekNote: 'Wildberries 每周一结算上一周的报表',
  periodPlain: '周期 {from} — {to}',
  sectionSupplies: '发货',
  sectionSuppliesHint: '已入库与计划中',
  sectionStocks: '库存',
  sectionStocksHint: 'Wildberries 仓库，按商品',
  sectionStocksFbs: 'FBS 库存',
  sectionStocksFbsHint: '自有仓库',
  stocksOnHand: '在库',
  stocksInWay: '在途',
  stocksBothWays: '发出与退回',
  stocksArticleCount: '{count} 个商品',
  stocksArticles: '商品',
  stocksSearch: '按编号查找商品',
  stocksNothing: '未找到商品',
  stocksAsOf: '{date} 的库存',
  stocksSizeCode: '尺码编号 {code}',
  stocksNoName: '名称未知',
  stocksHidden: '还有 {count} 个商品 — 请用搜索缩小范围',
  suppliesPlanned: '计划中',
  suppliesAccepted: '已入库',
  suppliesSummary: '{count} · {pairs} 双',
  suppliesNone: '本期没有发货',
  loading: '加载中…',
  retry: '重试',

  tabAds: '广告',
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
