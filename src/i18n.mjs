export const DEFAULT_LANGUAGE = "ru";
export const SUPPORTED_LANGUAGES = ["ru", "en"];

const L = {
  ru: {
    nav: { city: "ГОРОД", map: "КАРТА", quests: "КВЕСТЫ", inventory: "ИНВЕНТАРЬ", profile: "ПРОФИЛЬ", family: "СЕМЬЯ", settings: "НАСТРОЙКИ" },
    menu: { play: "ИГРАТЬ", continue: "ПРОДОЛЖИТЬ", profile: "ПРОФИЛЬ", settings: "НАСТРОЙКИ", create: "Создать персонажа", enter: "Войти в город" },
    settings: {
      title: "Настройки",
      language: "Язык",
      save: "Сохранить настройки",
      graphics: "Графика",
      controls: "Чувствительность управления",
      camera: "Чувствительность камеры",
      sound: "Звук",
      music: "Музыка",
      mute: "Без звука",
      sfxVolume: "Громкость SFX",
      musicVolume: "Громкость музыки",
      ambientVolume: "Громкость окружения"
    },
    common: { on: "ВКЛ", off: "ВЫКЛ", map: "Карта", travel: "Поездка", save: "Сохранить", weather: "Погода", day: "ДЕНЬ", time: "ВРЕМЯ", season: "Сезон" },
    weather: { clear: "ЯСНО", cloudy: "ОБЛАЧНО", rain: "ДОЖДЬ", fog: "ТУМАН" },
    pause: {
      title: "ПАУЗА",
      resume: "Продолжить",
      map: "Карта",
      quests: "Квесты",
      inventory: "Инвентарь",
      profile: "Профиль",
      family: "Семья",
      business: "Бизнес",
      vehicles: "Транспорт",
      settings: "Настройки",
      save: "Сохранить",
      exit: "В меню"
    },
    hud: { camera: "КАМЕРА", run: "БЕГ", interact: "ВЗАИМОДЕЙСТВИЕ", action: "ДЕЙСТВИЕ", enter: "ВОЙТИ", weather: "ПОГОДА", day: "ДЕНЬ", time: "ВРЕМЯ" },
    prompt: {
      explore: "Исследуйте город...",
      tapInteract: "Нажмите ВЗАИМОДЕЙСТВИЕ",
      keyboardInteract: "[E] или ВЗАИМОДЕЙСТВИЕ",
      exploreHint: "Изучайте город и подходите к отмеченным точкам"
    },
    notices: {
      saved: "Прогресс сохранён.",
      createFirst: "Сначала создайте персонажа, чтобы открыть профиль.",
      uiError: "Произошла ошибка интерфейса. Вы можете продолжить через главное меню.",
      actionFailed: "Последнее действие безопасно отменено. Попробуйте снова.",
      worldUnavailable: "3D-мир недоступен в этом браузере. Используйте карту, квесты, инвентарь и профиль.",
      resetConfirm: "Сбросить весь прогресс?",
      setupHint: "Создайте персонажа и войдите в NARCOS CITY."
    },
    family: {
      title: "Семья и поколения",
      profile: "Профиль семьи",
      tree: "Семейное древо",
      events: "Семейные события",
      finances: "Семейные финансы",
      history: "История семьи",
      pregnancy: "Беременность",
      noActivePregnancy: "Активной беременности нет",
      generation: "Поколение",
      wealth: "Семейное богатство",
      reputation: "Семейная репутация",
      mainResidence: "Основной дом",
      income: "Доход",
      expenses: "Расходы",
      housing: "Жильё",
      food: "Еда",
      education: "Образование",
      healthcare: "Здравоохранение",
      childcare: "Дети",
      luxury: "Роскошь",
      progress: "Прогресс",
      health: "Здоровье",
      mood: "Настроение",
      noMembers: "Семейные связи пока не сформированы.",
      noEvents: "Пока нет семейных событий.",
      noHistory: "Пока нет семейной истории.",
      actions: { talk: "Поговорить", visit: "Навестить", call: "Позвонить", dinner: "Семейный ужин", gift: "Подарок", comfort: "Поддержать", apologize: "Извиниться", reconcile: "Примириться" }
    },
    stage4: {
      status: "Статус этапа 4",
      wealth: "Богатство",
      businessPortfolio: "Бизнес-портфель",
      gangRank: "Ранг банды",
      familyWealth: "Семейное богатство",
      garage: "Гараж",
      netWorth: "Капитал",
      transferFamily: "Перевод семье",
      transferBusiness: "Перевод бизнесу",
      territories: "Территории",
      contacts: "Контакты",
      join: "Вступить",
      leave: "Покинуть",
      scout: "Разведка",
      buildInfluence: "Усилить влияние",
      support: "Поддержать",
      challenge: "Бросить вызов",
      hire: "Нанять",
      fire: "Уволить",
      security: "Охрана",
      sell: "Продать",
      repair: "Ремонт",
      store: "В гараж",
      engineUp: "Двигатель+",
      luxuryUp: "Люкс+",
      vip: "VIP казино",
      bet: "Ставки",
      net: "Итог",
      creditRep: "Кредитная репутация"
    }
  },
  en: {
    nav: { city: "CITY", map: "MAP", quests: "QUESTS", inventory: "INVENTORY", profile: "PROFILE", family: "FAMILY", settings: "SETTINGS" },
    menu: { play: "PLAY", continue: "CONTINUE", profile: "PROFILE", settings: "SETTINGS", create: "Create Character", enter: "Enter City" },
    settings: {
      title: "Settings",
      language: "Language",
      save: "Save Settings",
      graphics: "Graphics Quality",
      controls: "Controls Sensitivity",
      camera: "Camera Sensitivity",
      sound: "Sound",
      music: "Music",
      mute: "Mute",
      sfxVolume: "SFX Volume",
      musicVolume: "Music Volume",
      ambientVolume: "Ambient Volume"
    },
    common: { on: "ON", off: "OFF", map: "Map", travel: "Travel", save: "Save", weather: "Weather", day: "DAY", time: "TIME", season: "Season" },
    weather: { clear: "CLEAR", cloudy: "CLOUDY", rain: "RAIN", fog: "FOG" },
    pause: {
      title: "PAUSED",
      resume: "Resume",
      map: "Map",
      quests: "Quests",
      inventory: "Inventory",
      profile: "Profile",
      family: "Family",
      business: "Business",
      vehicles: "Vehicles",
      settings: "Settings",
      save: "Save",
      exit: "Exit Menu"
    },
    hud: { camera: "CAMERA", run: "RUN", interact: "INTERACT", action: "ACTION", enter: "ENTER", weather: "WEATHER", day: "DAY", time: "TIME" },
    prompt: {
      explore: "Explore the city...",
      tapInteract: "Tap INTERACT",
      keyboardInteract: "[E] or Tap INTERACT",
      exploreHint: "Explore and approach highlighted points"
    },
    notices: {
      saved: "Progress saved.",
      createFirst: "Create a character first to view the full profile.",
      uiError: "A UI error occurred. You can continue by returning to the main menu.",
      actionFailed: "The last action failed safely. Please try again.",
      worldUnavailable: "3D world unavailable in this browser. Use map, quests, inventory, and profile panels.",
      resetConfirm: "Reset all progress?",
      setupHint: "Create your character and enter NARCOS CITY."
    },
    family: {
      title: "Family & Generations",
      profile: "Family Profile",
      tree: "Family Tree",
      events: "Family Events",
      finances: "Family Finances",
      history: "Family History",
      pregnancy: "Pregnancy",
      noActivePregnancy: "No active pregnancy",
      generation: "Generation",
      wealth: "Family Wealth",
      reputation: "Family Reputation",
      mainResidence: "Main Residence",
      income: "Income",
      expenses: "Expenses",
      housing: "Housing",
      food: "Food",
      education: "Education",
      healthcare: "Healthcare",
      childcare: "Childcare",
      luxury: "Luxury",
      progress: "Progress",
      health: "Health",
      mood: "Mood",
      noMembers: "No family members yet.",
      noEvents: "No family events yet.",
      noHistory: "No family history yet.",
      actions: { talk: "Talk", visit: "Visit", call: "Call", dinner: "Family Dinner", gift: "Gift", comfort: "Comfort", apologize: "Apologize", reconcile: "Reconcile" }
    },
    stage4: {
      status: "Stage 4 Status",
      wealth: "Wealth",
      businessPortfolio: "Business Portfolio",
      gangRank: "Gang Rank",
      familyWealth: "Family Wealth",
      garage: "Garage",
      netWorth: "Net Worth",
      transferFamily: "Transfer Family",
      transferBusiness: "Transfer Business",
      territories: "Territories",
      contacts: "Contacts",
      join: "Join",
      leave: "Leave",
      scout: "Scout",
      buildInfluence: "Build Influence",
      support: "Support",
      challenge: "Challenge",
      hire: "Hire",
      fire: "Fire",
      security: "Security",
      sell: "Sell",
      repair: "Repair",
      store: "Store",
      engineUp: "Engine+",
      luxuryUp: "Luxury+",
      vip: "Casino VIP",
      bet: "Bet",
      net: "Net",
      creditRep: "Credit Reputation"
    }
  }
};

function atPath(obj, path) {
  return String(path || "")
    .split(".")
    .reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj);
}

export function getLanguage(state) {
  const lang = state?.settings?.language;
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

export function t(state, key, fallback = "") {
  const lang = getLanguage(state);
  return atPath(L[lang], key) ?? atPath(L.en, key) ?? fallback ?? key;
}

export function cityWorldText(state) {
  const entries = [
    "weather.clear",
    "weather.cloudy",
    "weather.rain",
    "weather.fog",
    "pause.title",
    "pause.resume",
    "pause.map",
    "pause.quests",
    "pause.inventory",
    "pause.profile",
    "pause.family",
    "pause.business",
    "pause.vehicles",
    "pause.settings",
    "pause.save",
    "pause.exit",
    "hud.camera",
    "hud.run",
    "hud.interact",
    "hud.action",
    "hud.enter",
    "hud.weather",
    "hud.day",
    "hud.time",
    "prompt.explore",
    "prompt.tapInteract",
    "prompt.keyboardInteract",
    "prompt.exploreHint"
  ];
  return Object.fromEntries(entries.map((key) => [key, t(state, key)]));
}
