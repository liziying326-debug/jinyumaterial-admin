import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据文件路径
const DATA_DIR = join(__dirname, 'data');

// 确保数据目录存在
try { mkdirSync(DATA_DIR, { recursive: true }); } catch {}

const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cors());
// 设置 body size limit 为 10MB，支持图片 base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== FAQ API（读写 translations.json 中的 faq 数据，必须在静态文件之前） ==========
const faqTabs = ['products', 'ordering', 'shipping', 'quality'];

// 动态获取某个 tab 下已有的最大 FAQ 索引，用于 GET 列表遍历
function getMaxFaqIndex(t, tab) {
  const numPrefix = tab === 'products' ? '1' : tab === 'ordering' ? '2' : tab === 'shipping' ? '3' : '4';
  let maxIdx = 0;
  for (let i = 1; i <= 50; i++) {
    if (t.en?.[`faq.q${numPrefix}_${i}`]) maxIdx = i;
  }
  return maxIdx;
}

function loadTranslations() {
  try {
    const raw = readFileSync(join(DATA_DIR, 'translations.json'), 'utf8');
    return JSON.parse(raw);
  } catch { return { en: {}, zh: {}, vi: {}, tl: {} }; }
}

function saveTranslations(data) {
  writeFileSync(join(DATA_DIR, 'translations.json'), JSON.stringify(data, null, 2), 'utf8');
}

// 从 translations.json 提取 FAQ 列表（支持 lang 参数 + i18n 缓存）
app.get('/api/faqs', (req, res) => {
  try {
    const t = loadTranslations();
    // 支持语言参数：en/zh/vi/tl，默认 en
    const reqLang = req.query.lang || 'en';
    const langMap = { tl: 'tl', fil: 'tl', ph: 'tl', vi: 'vi', zh: 'zh', en: 'en' };
    const resolvedLang = langMap[reqLang] || 'en';
    const src = t.en || {};           // 源语言 fallback
    const dict = t[resolvedLang] || src;
    const faqs = [];
    for (const tab of faqTabs) {
      const maxIdx = getMaxFaqIndex(t, tab);
      for (let i = 1; i <= maxIdx; i++) {
        const id = `${tab}_${i}`;
        const numPrefix = tab === 'products' ? '1' : tab === 'ordering' ? '2' : tab === 'shipping' ? '3' : '4';
        const qKey = `faq.q${numPrefix}_${i}`;
        const aKey = `faq.a${numPrefix}_${i}`;
        const qAlt = `home.faq.${tab}.q${i}`;
        const aAlt = `home.faq.${tab}.a${i}`;
        // ── 三层优先级（跟前台 i18n 体系一致）──
        // ① 原始字段翻译（faq.q1_5 等）
        // ② i18n 缓存（faq_products_5_question 等，前端 autoTranslate 写入的）
        // ③ 英文 fallback
        const i18nQKey = `faq_${id}_question`;
        const i18nAKey = `faq_${id}_answer`;
        const question = dict[i18nQKey] || dict[qKey] || src[qKey] || dict[qAlt] || src[qAlt] || '';
        const answer  = dict[i18nAKey] || dict[aKey] || src[aKey] || dict[aAlt] || src[aAlt] || '';
        if (question) {
          faqs.push({ id, tab, index: i, question, answer });
        }
      }
    }
    res.json({ success: true, data: faqs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 更新单个 FAQ
app.put('/api/faqs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, tab, index } = req.body;
    if (!question && !answer) return res.status(400).json({ success: false, error: 'Missing fields' });

    const t = loadTranslations();
    let numPrefix;
    if (tab === 'products') numPrefix = '1';
    else if (tab === 'ordering') numPrefix = '2';
    else if (tab === 'shipping') numPrefix = '3';
    else numPrefix = '4';

    const idx = index || parseInt(id.split('_')[1]) || 1;
    const qKey = `faq.q${numPrefix}_${idx}`;
    const aKey = `faq.a${numPrefix}_${idx}`;
    const qAlt = `home.faq.${tab}.q${idx}`;
    const aAlt = `home.faq.${tab}.a${idx}`;

    if (!t.en) t.en = {};
    t.en[qKey] = question;
    t.en[aKey] = answer;
    t.en[qAlt] = question;
    t.en[aAlt] = answer;

    saveTranslations(t);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 新增 FAQ
app.post('/api/faqs', (req, res) => {
  try {
    const { question, answer, tab = 'products' } = req.body;
    if (!question || !answer) return res.status(400).json({ success: false, error: 'Missing fields' });

    const t = loadTranslations();
    let numPrefix = tab === 'products' ? '1' : tab === 'ordering' ? '2' : tab === 'shipping' ? '3' : '4';
    let maxIdx = 0;
    for (let i = 1; i <= 20; i++) {
      if (t.en?.[`faq.q${numPrefix}_${i}`]) maxIdx = i;
    }
    const newIdx = maxIdx + 1;
    const qKey = `faq.q${numPrefix}_${newIdx}`;
    const aKey = `faq.a${numPrefix}_${newIdx}`;
    const qAlt = `home.faq.${tab}.q${newIdx}`;
    const aAlt = `home.faq.${tab}.a${newIdx}`;

    if (!t.en) t.en = {};
    t.en[qKey] = question;
    t.en[aKey] = answer;
    t.en[qAlt] = question;
    t.en[aAlt] = answer;

    saveTranslations(t);
    res.json({ success: true, id: `${tab}_${newIdx}`, index: newIdx });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 删除 FAQ
app.delete('/api/faqs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const [tab, idxStr] = id.split('_');
    const idx = parseInt(idxStr);
    let numPrefix = tab === 'products' ? '1' : tab === 'ordering' ? '2' : tab === 'shipping' ? '3' : '4';

    const t = loadTranslations();
    const keysToRemove = [
      `faq.q${numPrefix}_${idx}`, `faq.a${numPrefix}_${idx}`,
      `home.faq.${tab}.q${idx}`, `home.faq.${tab}.a${idx}`
    ];
    Object.keys(t).forEach(lang => {
      if (typeof t[lang] === 'object') {
        keysToRemove.forEach(k => { delete t[lang][k]; });
      }
    });
    saveTranslations(t);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ⚠️ 静态文件托管必须放在 API 路由之后
app.use(express.static(join(__dirname, 'dist')));

// 图片上传目录
const UPLOADS_DIR = join(__dirname, 'about-uploads');
try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}

app.use('/about-uploads', express.static(UPLOADS_DIR));

// 案例视频上传目录
const CASE_UPLOADS_DIR = join(__dirname, 'case-uploads');
try { mkdirSync(CASE_UPLOADS_DIR, { recursive: true }); } catch {}
app.use('/case-uploads', express.static(CASE_UPLOADS_DIR));

// 产品图片目录
const PRODUCT_IMAGES_DIR = join(__dirname, 'product-images');
try { mkdirSync(PRODUCT_IMAGES_DIR, { recursive: true }); } catch {}
app.use('/product-images', express.static(PRODUCT_IMAGES_DIR));

// Multer 配置（图片，10MB）
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Multer 配置（视频，50MB）
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CASE_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  },
});
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// 辅助函数：读取数据文件
const readDataFile = (filename, defaultValue = []) => {
  const filepath = join(DATA_DIR, filename);
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
  }
  return defaultValue;
};

// 辅助函数：写入数据文件
const writeDataFile = (filename, data) => {
  const filepath = join(DATA_DIR, filename);
  try {
    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`Error writing ${filename}:`, e);
    throw e; // 抛出异常，让调用方返回真实错误给前端
  }
};

// ============ API 路由 ============

// 获取所有产品
app.get('/api/products', (req, res) => {
  let products = readDataFile('products.json', []);
  // 通过自定义 header X-From-Frontend 区分来源
  // 前台代理会带此 header，前台只返回上架产品；后台管理不带，返回全部
  const isFromFrontend = req.headers['x-from-frontend'] === '1';
  if (isFromFrontend) {
    products = products.filter(p => p.status !== 'inactive');
  }
  const lang = req.query.lang || 'en';
  res.json(products);
});

// 按 slug 查找产品（必须在 /:id 之前注册）
app.get('/api/products/by-slug/:slug', (req, res) => {
  const products = readDataFile('products.json', []);
  const slug = req.params.slug;
  // slug 匹配优先级：product.slug → 产品名称转化 slug
  const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const product = products.find(p =>
    p.status !== 'inactive' &&
    ((p.slug && normalize(p.slug) === normalize(slug)) ||
    normalize(p.name || p.name_en || '') === normalize(slug))
  );
  if (product) {
    res.json({ success: true, data: product });
  } else {
    res.status(404).json({ success: false, error: 'Product not found' });
  }
});

// 获取单个产品
app.get('/api/products/:id', (req, res) => {
  const products = readDataFile('products.json', []);
  const productId = req.params.id;
  const product = products.find(p => String(p.id) === String(productId) && p.status !== 'inactive');
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

// 创建产品（直接保存，不自动翻译）
app.post('/api/products', (req, res) => {
  try {
    const products = readDataFile('products.json', []);
    const newProduct = {
      ...req.body,
      id: Date.now()
    };
    products.push(newProduct);
    writeDataFile('products.json', products);
    res.json(newProduct);
  } catch (err) {
    console.error('[POST /api/products] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新产品（直接保存，不自动翻译）
app.put('/api/products/:id', (req, res) => {
  try {
    const products = readDataFile('products.json', []);
    const productId = String(req.params.id);
    const index = products.findIndex(p => String(p.id) === productId);
    
    if (index !== -1) {
      products[index] = { ...products[index], ...req.body };
      writeDataFile('products.json', products);
      res.json(products[index]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    console.error('[PUT /api/products/:id] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 删除产品
app.delete('/api/products/:id', (req, res) => {
  let products = readDataFile('products.json', []);
  const productId = String(req.params.id);
  products = products.filter(p => String(p.id) !== productId);
  writeDataFile('products.json', products);
  res.json({ success: true });
});

// ============ 翻译接口 ============

// 获取翻译数据
app.get('/api/i18n/:lang', (req, res) => {
  const lang = req.params.lang;
  const translations = readDataFile('translations.json', {});
  res.json(translations[lang] || {});
});

// 保存翻译数据
app.post('/api/i18n', (req, res) => {
  const translations = readDataFile('translations.json', {});
  const { lang, data } = req.body;
  translations[lang] = data;
  writeDataFile('translations.json', translations);
  res.json({ success: true });
});

// 写入/更新单个或多个翻译 key（用于前端翻译缓存持久化）
// PUT /api/i18n/:lang  body: { "key1": "value1", "key2": "value2" }
app.put('/api/i18n/:lang', (req, res) => {
  const lang = req.params.lang;
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Invalid body, expected object' });
  }
  const translations = readDataFile('translations.json', {});
  if (!translations[lang]) translations[lang] = {};
  let count = 0;
  Object.entries(updates).forEach(([key, value]) => {
    if (value && typeof value === 'string' && value.trim()) {
      translations[lang][key] = value.trim();
      count++;
    }
  });
  writeDataFile('translations.json', translations);
  console.log(`[i18n] PUT ${lang}: ${count} keys saved`);
  res.json({ success: true, count });
});

// ============ 翻译代理接口（前端自动翻译用） ============

// 翻译单个文本
app.post('/api/translate', async (req, res) => {
  const { text, from, to } = req.body;
  if (!text || !from || !to) {
    return res.status(400).json({ error: 'Missing text, from, or to' });
  }
  if (from === to) {
    return res.json({ translatedText: text });
  }
  try {
    const translated = await translateText(text, from, to);
    res.json({ translatedText: translated });
  } catch (err) {
    console.error('[translate] error:', err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// 批量翻译：接收 { from, to, texts: { key1: text1, key2: text2 } }
// 返回 { translations: { key1: translated1, key2: translated2 } } 并自动保存到 translations.json
app.post('/api/translate/batch', async (req, res) => {
  const { from, to, texts } = req.body;
  if (!from || !to || !texts || typeof texts !== 'object') {
    return res.status(400).json({ error: 'Missing from, to, or texts' });
  }
  if (from === to) {
    return res.json({ translations: texts });
  }

  try {
    const keys = Object.keys(texts);
    const values = Object.values(texts);
    const translations = {};

    // 微软 API 支持单次请求传多个文本，效率最高
    // 分批处理（每批最多 100 条，防止请求体过大）
    const BATCH_SIZE = 50;
    const allResults = [];

    for (let i = 0; i < values.length; i += BATCH_SIZE) {
      const batchValues = values.slice(i, i + BATCH_SIZE);
      const batchResult = await translateBatch(batchValues, from, to);
      allResults.push(...batchResult);
    }

    for (let i = 0; i < keys.length; i++) {
      const translated = allResults[i];
      if (translated && translated.trim()) {
        translations[keys[i]] = translated.trim();
      } else {
        translations[keys[i]] = values[i]; // fallback 原文
      }
    }

    // 自动保存翻译结果到 translations.json
    const allTranslations = readDataFile('translations.json', {});
    if (!allTranslations[to]) allTranslations[to] = {};
    Object.entries(translations).forEach(([key, value]) => {
      if (value && value !== key) {
        allTranslations[to][key] = value;
      }
    });
    writeDataFile('translations.json', allTranslations);

    console.log(`[translate] batch: ${from} → ${to}, ${keys.length} keys saved`);
    // 返回有序数组（供脚本使用）+ key-value 对象（自动保存用）
    res.json({ translations, ordered: keys.map(k => translations[k]) });
  } catch (err) {
    console.error('[translate] batch error:', err.message);
    res.status(500).json({ error: 'Batch translation failed' });
  }
});

// 翻译函数：优先微软 Edge 翻译（国内可访问、免费、支持中越菲英），备选 MyMemory
// 微软 Edge Translate 无需密钥，动态获取 token
let _msToken = null;
let _msTokenExpiry = 0;

async function getMsToken() {
  if (_msToken && Date.now() < _msTokenExpiry) return _msToken;
  const res = await fetch('https://edge.microsoft.com/translate/auth', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`MS token HTTP ${res.status}`);
  const token = await res.text();
  _msToken = token.trim();
  _msTokenExpiry = Date.now() + 9 * 60 * 1000; // token 有效约10分钟，提前1分钟刷新
  return _msToken;
}

async function translateText(text, from, to) {
  // 语言代码映射：微软 API 用 zh-Hans，菲律宾语用 fil（注意：前台传 tl，需映射为 fil）
  const msLangMap = { 'en': 'en', 'zh': 'zh-Hans', 'vi': 'vi', 'tl': 'fil', 'fil': 'fil', 'ph': 'fil' };
  const myLangMap = { 'en': 'en', 'zh': 'zh-CN', 'vi': 'vi', 'tl': 'tl', 'fil': 'tl', 'ph': 'ph' };

  // ── 方法1：微软 Edge 翻译（国内可直接访问，无配额限制）──
  try {
    const token = await getMsToken();
    const msFrom = msLangMap[from] || from;
    const msTo   = msLangMap[to]   || to;

    const msUrl = `https://api-edge.cognitive.microsofttranslator.com/translate?from=${msFrom}&to=${msTo}&api-version=3.0&textType=plain`;
    console.log(`[translate] MS request: from=${msFrom} to=${msTo} text="${text.substring(0,20)}" tokenLen=${token.length}`);
    const msRes = await fetch(msUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(10000)
    });
    console.log(`[translate] MS response status: ${msRes.status}`);

    if (!msRes.ok) throw new Error(`MS translate HTTP ${msRes.status}`);
    const msData = await msRes.json();
    const result = msData?.[0]?.translations?.[0]?.text;
    if (result && result.trim()) {
      return result.trim();
    }
    throw new Error('MS returned empty result');
  } catch (err1) {
    console.warn('[translate] MS Edge failed:', err1.message, '- trying MyMemory fallback');

    // ── 方法2：MyMemory（备选，有每日配额限制）──
    try {
      const sl = myLangMap[from] || from;
      const tl = myLangMap[to]   || to;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        let result = data.responseData.translatedText;
        // 质量检测：过滤 MyMemory 社区脏数据（邮箱、URL、过短匹配）
        const isGarbage = (
          result === result.toUpperCase() && result.length > 20 && text !== text.toUpperCase()
        ) || /[\w.-]+@[\w.-]+\.\w+/.test(result)  // 包含邮箱
          || /^https?:\/\//i.test(result)           // 以 URL 开头
          || (result.match && result.match < 0.5);   // 匹配度过低（MyMemory matches 数据）
        if (isGarbage) {
          console.warn('[translate] MyMemory garbage detected, falling back to original:', result.substring(0, 40));
          return text; // 返回原文，不用翻译
        }
        if (data.responseDetails?.includes('AVAILABLE FREE TRANSLATIONS')) {
          throw new Error('MYMEMORY_QUOTA');
        }
        return result;
      }
      throw new Error(`MyMemory status ${data.responseStatus}`);
    } catch (err2) {
      console.error('[translate] all methods failed:', err1.message, '|', err2.message);
      throw new Error('All translation APIs failed');
    }
  }
}

// 批量翻译多个文本（利用微软 API 原生多文本请求，效率最高）
// 返回与输入数组等长的翻译结果数组
async function translateBatch(texts, from, to) {
  // 微软 API 语言代码：菲律宾语用 fil（前台传 tl，需映射为 fil）
  const msLangMap = { 'en': 'en', 'zh': 'zh-Hans', 'vi': 'vi', 'tl': 'fil', 'fil': 'fil', 'ph': 'fil' };
  const myLangMap = { 'en': 'en', 'zh': 'zh-CN', 'vi': 'vi', 'tl': 'tl', 'fil': 'tl', 'ph': 'tl' };

  // ── 方法1：微软 Edge 翻译，一次请求多个文本 ──
  try {
    const token = await getMsToken();
    const msFrom = msLangMap[from] || from;
    const msTo   = msLangMap[to]   || to;

    const msUrl = `https://api-edge.cognitive.microsofttranslator.com/translate?from=${msFrom}&to=${msTo}&api-version=3.0&textType=plain`;
    const msRes = await fetch(msUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify(texts.map(t => ({ Text: t || '' }))),
      signal: AbortSignal.timeout(15000)
    });

    if (!msRes.ok) throw new Error(`MS batch HTTP ${msRes.status}`);
    const msData = await msRes.json();

    if (Array.isArray(msData)) {
      return msData.map((item, i) => item?.translations?.[0]?.text || texts[i] || '');
    }
    throw new Error('MS batch returned unexpected format');
  } catch (err1) {
    console.warn('[translate] MS batch failed:', err1.message, '- falling back to single translate');
    // 备选：逐条翻译（性能稍低但保证正确性）
    const results = [];
    for (const text of texts) {
      try {
        results.push(await translateText(text, from, to));
      } catch {
        results.push(text); // 失败时保留原文
      }
    }
    return results;
  }
}

// ============ 产品自动翻译辅助函数 ============
// 当只提供英文字段时，自动翻译生成其他语言版本
async function autoTranslateProductFields(product) {
  const targetLangs = ['zh', 'vi', 'tl'];
  const result = { ...product };

  // 翻译 name（如果英文有值但目标语言没有）
  if (product.name_en) {
    for (const lang of targetLangs) {
      if (!product[`name_${lang}`] && !product[`name_ph`] && lang !== 'tl') {
        try {
          const translated = await translateText(product.name_en, 'en', lang);
          result[`name_${lang}`] = translated;
        } catch (e) {
          console.warn(`[auto-translate] name failed: ${lang}`, e.message);
        }
      }
    }
    // tl 用 ph 字段
    if (!product.name_tl && !product.name_ph) {
      try {
        result.name_tl = await translateText(product.name_en, 'en', 'tl');
      } catch (e) {
        console.warn('[auto-translate] name_tl failed:', e.message);
      }
    }
  }

  // 翻译 description
  if (product.description_en) {
    for (const lang of targetLangs) {
      const langKey = lang === 'tl' ? 'ph' : lang;
      if (!product[`description_${langKey}`]) {
        try {
          const translated = await translateText(product.description_en, 'en', lang);
          result[`description_${langKey}`] = translated;
        } catch (e) {
          console.warn(`[auto-translate] description failed: ${lang}`, e.message);
        }
      }
    }
  }

  // 翻译 features
  if (product.features_en && Array.isArray(product.features_en)) {
    const featuresMap = { zh: 'features_zh', vi: 'features_vi', tl: 'features_ph' };
    for (const lang of targetLangs) {
      const targetKey = featuresMap[lang];
      if (!product[targetKey] || product[targetKey].length === 0) {
        try {
          const translated = await translateBatch(product.features_en, 'en', lang);
          result[targetKey] = translated;
        } catch (e) {
          console.warn(`[auto-translate] features failed: ${lang}`, e.message);
        }
      }
    }
    if (!product.features_tl && !product.features_ph) {
      try {
        result.features_tl = await translateBatch(product.features_en, 'en', 'tl');
      } catch (e) {
        console.warn('[auto-translate] features_tl failed:', e.message);
      }
    }
  }

  // 翻译 specs
  if (product.specs && Array.isArray(product.specs)) {
    const specsMap = { zh: 'specs_zh', vi: 'specs_vi', tl: 'specs_ph' };
    for (const lang of targetLangs) {
      const targetKey = specsMap[lang];
      if (!product[targetKey] || product[targetKey].length === 0) {
        try {
          const specNames = product.specs.map(s => s.k_en || '');
          const specValues = product.specs.map(s => s.v_en || '');
          const translatedNames = await translateBatch(specNames, 'en', lang);
          const translatedValues = await translateBatch(specValues, 'en', lang);
          result[targetKey] = product.specs.map((s, i) => ({
            k: translatedNames[i] || '',
            v: translatedValues[i] || ''
          }));
        } catch (e) {
          console.warn(`[auto-translate] specs failed: ${lang}`, e.message);
        }
      }
    }
    // tl specs
    if (!product.specs_tl && !product.specs_ph) {
      try {
        const specNames = product.specs.map(s => s.k_en || '');
        const specValues = product.specs.map(s => s.v_en || '');
        const translatedNames = await translateBatch(specNames, 'en', 'tl');
        const translatedValues = await translateBatch(specValues, 'en', 'tl');
        result.specs_tl = product.specs.map((s, i) => ({
          k: translatedNames[i] || '',
          v: translatedValues[i] || ''
        }));
      } catch (e) {
        console.warn('[auto-translate] specs_tl failed:', e.message);
      }
    }
  }

  return result;
}

// ============ 设置接口 ============

// 获取设置
app.get('/api/settings', (req, res) => {
  const settings = readDataFile('settings.json', {
    site_name: 'Jinyu Material',
    seo_title: 'Jinyu Advertising Material',
    seo_description: 'Professional advertising material manufacturer'
  });
  res.json(settings);
});

// 保存设置
app.post('/api/settings', (req, res) => {
  const settings = req.body;
  writeDataFile('settings.json', settings);
  res.json({ success: true });
});

// ============ 社交媒体链接接口 ============

// ============ 社交媒体链接接口 ============

app.get('/api/social-links', (req, res) => {
  const links = readDataFile('social-links.json', []);
  res.json(links);
});

app.post('/api/social-links', (req, res) => {
  try {
    const links = readDataFile('social-links.json', []);
    const { name, icon, url, sort_order, enabled } = req.body;
    if (!name || !icon || !url) return res.status(400).json({ error: 'Missing name, icon, or url' });
    const newId = links.length > 0 ? Math.max(...links.map(l => l.id || 0)) + 1 : 1;
    const newLink = { id: newId, name, icon, url, sort_order: sort_order ?? newId, enabled: enabled !== false };
    links.push(newLink);
    writeDataFile('social-links.json', links);
    res.json({ success: true, data: newLink });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/social-links', (req, res) => {
  try {
    const links = Array.isArray(req.body) ? req.body : [req.body];
    writeDataFile('social-links.json', links);
    res.json({ success: true, data: links });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/social-links/:id', (req, res) => {
  try {
    const links = readDataFile('social-links.json', []);
    const id = parseInt(req.params.id);
    const idx = links.findIndex(l => l.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    links[idx] = { ...links[idx], ...req.body, id };
    writeDataFile('social-links.json', links);
    res.json({ success: true, data: links[idx] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/social-links/:id', (req, res) => {
  try {
    let links = readDataFile('social-links.json', []);
    const id = parseInt(req.params.id);
    links = links.filter(l => l.id !== id);
    writeDataFile('social-links.json', links);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ 联系表单接口 ============

// 提交联系表单
app.post('/api/contact', (req, res) => {
  const contacts = readDataFile('contacts.json', []);
  const now = new Date();
  const newContact = {
    ...req.body,
    id: Date.now(),
    date: now.toISOString().slice(0, 10),      // 确保 date 字段存在（YYYY-MM-DD）
    createdAt: now.toISOString(),
    isRead: false,
  };
  contacts.push(newContact);
  writeDataFile('contacts.json', contacts);
  console.log('New contact:', newContact);
  res.json({ success: true, message: 'Thank you for your message!' });
});

// 获取所有联系人
app.get('/api/contacts', (req, res) => {
  const contacts = readDataFile('contacts.json', []);
  res.json(contacts);
});

// 标记联系人已读
app.patch('/api/contacts/:id/read', (req, res) => {
  let contacts = readDataFile('contacts.json', []);
  const idx = contacts.findIndex(c => String(c.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  contacts[idx].isRead = true;
  writeDataFile('contacts.json', contacts);
  res.json({ success: true });
});

// ============ 新闻接口 ============

app.get('/api/news', (req, res) => {
  const news = readDataFile('news.json', []);
  res.json(news);
});

app.post('/api/news', (req, res) => {
  const news = readDataFile('news.json', []);
  const newItem = {
    ...req.body,
    id: Date.now()
  };
  news.push(newItem);
  writeDataFile('news.json', news);
  res.json(newItem);
});

app.put('/api/news/:id', (req, res) => {
  const news = readDataFile('news.json', []);
  const index = news.findIndex(n => n.id === parseInt(req.params.id));
  if (index !== -1) {
    news[index] = { ...news[index], ...req.body };
    writeDataFile('news.json', news);
    res.json(news[index]);
  } else {
    res.status(404).json({ error: 'News not found' });
  }
});

app.delete('/api/news/:id', (req, res) => {
  let news = readDataFile('news.json', []);
  news = news.filter(n => n.id !== parseInt(req.params.id));
  writeDataFile('news.json', news);
  res.json({ success: true });
});

// 新闻真实浏览量（从前台写的 news-views.json 读取）
app.get('/api/news-views', (req, res) => {
  const viewsFile = join(__dirname, 'data', 'news-views.json');
  try {
    if (existsSync(viewsFile)) {
      const data = JSON.parse(readFileSync(viewsFile, 'utf-8'));
      res.json(data);
    } else {
      res.json({});
    }
  } catch {
    res.json({});
  }
});

// 前台兼容：/api/blog → 返回 {success, data} 格式（与 /api/news 相同数据）
app.get('/api/blog', (req, res) => {
  const news = readDataFile('news.json', []);
  res.json({ success: true, data: news });
});

// 前台兼容：/api/blog/:slug → 按 slug 查找单条新闻
app.get('/api/blog/:slug', (req, res) => {
  const news = readDataFile('news.json', []);
  const slug = req.params.slug;
  // 先按所有语言的 slug 匹配（en/zh/vi/ph）
  const langKeys = ['en', 'zh', 'vi', 'ph', 'tl', 'fil'];
  let item = news.find(n => {
    if (!n.langData) return false;
    return langKeys.some(lang => n.langData[lang] && n.langData[lang].slug === slug);
  });
  // 如果没找到，按 id 匹配（支持 id 或 'news-{id}' 格式）
  if (!item) {
    const numericId = parseInt(slug.replace('news-', ''));
    if (!isNaN(numericId)) {
      item = news.find(n => n.id === numericId);
    }
  }
  if (item) {
    res.json({ success: true, data: item });
  } else {
    res.status(404).json({ success: false, message: 'News not found' });
  }
});

// ============ 案例研究接口 ============

app.get('/api/cases', (req, res) => {
  const cases = readDataFile('cases.json', []);
  res.json(cases);
});

app.post('/api/cases', (req, res) => {
  const cases = readDataFile('cases.json', []);
  const newItem = {
    ...req.body,
    id: Date.now()
  };
  cases.push(newItem);
  writeDataFile('cases.json', cases);
  res.json(newItem);
});

app.put('/api/cases/:id', (req, res) => {
  const cases = readDataFile('cases.json', []);
  const index = cases.findIndex(c => c.id === parseInt(req.params.id));
  if (index !== -1) {
    cases[index] = { ...cases[index], ...req.body };
    writeDataFile('cases.json', cases);
    res.json(cases[index]);
  } else {
    res.status(404).json({ error: 'Case not found' });
  }
});

app.delete('/api/cases/:id', (req, res) => {
  let cases = readDataFile('cases.json', []);
  cases = cases.filter(c => c.id !== parseInt(req.params.id));
  writeDataFile('cases.json', cases);
  res.json({ success: true });
});

// 前台兼容：/api/case-studies → 返回 {success, data} 格式（与 /api/cases 相同数据）
app.get('/api/case-studies', (req, res) => {
  const cases = readDataFile('cases.json', []);
  res.json({ success: true, data: cases });
});

// ============ 视频上传接口 ============

app.post('/api/upload/video', uploadVideo.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '未检测到视频文件' });
  }
  const url = `/case-uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// ============ 分类接口 ============

app.get('/api/categories', (req, res) => {
  const categories = readDataFile('categories.json', []);
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const categories = readDataFile('categories.json', []);
  // id 优先用前端传来的，否则由 name_en 生成 slug，确保是字符串格式
  const rawId = req.body.id;
  let id;
  if (rawId && typeof rawId === 'string' && rawId.trim()) {
    id = rawId.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  } else if (req.body.name_en) {
    id = req.body.name_en.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  } else {
    id = 'category-' + Date.now();
  }
  const newItem = {
    ...req.body,
    id,
  };
  categories.push(newItem);
  writeDataFile('categories.json', categories);
  res.json(newItem);
});

app.put('/api/categories/:id', (req, res) => {
  const categories = readDataFile('categories.json', []);
  // id 可能是数字或字符串，统一用字符串比较
  const index = categories.findIndex(c => String(c.id) === String(req.params.id));
  if (index !== -1) {
    categories[index] = { ...categories[index], ...req.body };
    writeDataFile('categories.json', categories);
    res.json(categories[index]);
  } else {
    res.status(404).json({ error: 'Category not found' });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  const catId = String(req.params.id);
  let categories = readDataFile('categories.json', []);
  const cat = categories.find(c => String(c.id) === catId);
  if (!cat) {
    return res.status(404).json({ error: 'Category not found' });
  }
  const before = categories.length;
  categories = categories.filter(c => String(c.id) !== catId);
  if (categories.length === before) {
    return res.status(404).json({ error: 'Category not found' });
  }
  writeDataFile('categories.json', categories);

  // 同步删除该分类下的所有产品（匹配 category_id 或 category 字段）
  let products = readDataFile('products.json', []);
  const beforeProducts = products.length;
  products = products.filter(p => String(p.category_id) !== catId && String(p.category) !== catId);
  const deletedCount = beforeProducts - products.length;
  if (deletedCount > 0) {
    writeDataFile('products.json', products);
  }

  res.json({ success: true, deletedProducts: deletedCount });
});

// ============ 应用场景接口 ============

app.get('/api/scenarios', (req, res) => {
  const scenarios = readDataFile('scenarios.json', []);
  // 返回前台需要的扁平格式：name_en/_zh/_vi/_tl + description_en/_zh/_vi/_tl + materials
  const flat = scenarios.map(s => ({
    id: s.id,
    slug: s.slug || s.name?.toLowerCase().replace(/\s+/g, '-') || '',
    image: Array.isArray(s.images) ? s.images[0] : s.image || '',
    images: s.images || [],
    name_en:  s.langData?.en?.name  || s.name  || '',
    name_zh:  s.langData?.zh?.name  || '',
    name_vi:  s.langData?.vi?.name  || '',
    name_tl:  s.langData?.ph?.name  || s.langData?.tl?.name || '',
    description_en:  s.langData?.en?.desc  || s.desc || '',
    description_zh:  s.langData?.zh?.desc  || '',
    description_vi:  s.langData?.vi?.desc  || '',
    description_tl:  s.langData?.ph?.desc  || s.langData?.tl?.desc || '',
    // 推荐材料（扁平化）
    materials: Array.isArray(s.materials) ? s.materials.map(m => ({
      id: m.id,
      name: m.langData?.en?.name || m.name || '',
      name_en:  m.langData?.en?.name  || m.name  || '',
      name_zh:  m.langData?.zh?.name  || '',
      name_vi:  m.langData?.vi?.name  || '',
      name_tl:  m.langData?.ph?.name  || '',
      desc: m.langData?.en?.desc || m.desc || '',
      description_en:  m.langData?.en?.desc  || m.desc || '',
      description_zh:  m.langData?.zh?.desc  || '',
      description_vi:  m.langData?.vi?.desc  || '',
      description_tl:  m.langData?.ph?.desc  || '',
    })) : []
  }));
  res.json({ success: true, data: flat });
});

// 统一保存格式：扁平 key → nested langData
function normalizeScenario(body) {
  return {
    id: body.id || Date.now(),
    name: body.name_en || body.name || '',
    desc: body.description_en || body.desc || '',
    slug: body.slug || '',
    image: body.image || '',
    images: body.images || [],
    langData: {
      en: { name: body.name_en || body.name || '', desc: body.description_en || body.desc || '' },
      zh: { name: body.name_zh || '', desc: body.description_zh || '' },
      vi: { name: body.name_vi || '', desc: body.description_vi || '' },
      ph: { name: body.name_tl || body.name_ph || '', desc: body.description_tl || body.description_ph || '' },
    },
    // 保留推荐材料
    materials: Array.isArray(body.materials) ? body.materials.map(m => ({
      id: m.id || String(Date.now()),
      name: m.name || m.name_en || '',
      desc: m.desc || m.description_en || '',
      langData: {
        en:  { name: m.name_en  || m.name || '', desc: m.description_en  || m.desc || '' },
        zh:  { name: m.name_zh  || '', desc: m.description_zh  || '' },
        vi:  { name: m.name_vi  || '', desc: m.description_vi  || '' },
        ph:  { name: m.name_tl  || m.name_ph || '', desc: m.description_tl  || m.description_ph || '' },
      }
    })) : []
  };
}

app.post('/api/scenarios', (req, res) => {
  const scenarios = readDataFile('scenarios.json', []);
  const newItem = normalizeScenario(req.body);
  scenarios.push(newItem);
  writeDataFile('scenarios.json', scenarios);
  res.json({ success: true, data: newItem });
});

app.put('/api/scenarios/:id', (req, res) => {
  const scenarios = readDataFile('scenarios.json', []);
  const index = scenarios.findIndex(s => s.id === parseInt(req.params.id));
  if (index !== -1) {
    const updated = normalizeScenario({ ...scenarios[index], ...req.body });
    scenarios[index] = updated;
    writeDataFile('scenarios.json', scenarios);
    res.json({ success: true, data: updated });
  } else {
    res.status(404).json({ error: 'Scenario not found' });
  }
});


app.delete('/api/scenarios/:id', (req, res) => {
  let scenarios = readDataFile('scenarios.json', []);
  scenarios = scenarios.filter(s => s.id !== parseInt(req.params.id));
  writeDataFile('scenarios.json', scenarios);
  res.json({ success: true });
});

// ============ 公司信息接口 ============

app.get('/api/company', (req, res) => {
  const company = readDataFile('company.json', {
    name: 'Jinyu Advertising Material Co., Ltd.',
    description: '',
    established: 2009,
    address: '',
    phone: '',
    email: '',
    website: ''
  });
  res.json(company);
});

app.post('/api/company', (req, res) => {
  const company = req.body;
  writeDataFile('company.json', company);
  res.json({ success: true });
});

// ============ About Us 接口（前台 about.html 使用） ============

app.get('/api/about', (_req, res) => {
  const about = readDataFile('about.json', {});
  res.json({ success: true, data: about });
});

app.put('/api/about', (req, res) => {
  const about = req.body;
  writeDataFile('about.json', about);
  res.json({ success: true, message: 'About data saved' });
});

// About 图片上传
app.post('/api/about/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ success: true, url: `/about-uploads/${req.file.filename}` });
});

// About 图片列表
app.get('/api/about/images', (_req, res) => {
  try {
    const files = readdirSync(UPLOADS_DIR);
    const images = files.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
      .map(f => ({ name: f, url: `/about-uploads/${f}` }));
    res.json(images);
  } catch { res.json([]); }
});

// 删除 About 图片
app.delete('/api/about/images/:name', (req, res) => {
  const filePath = join(UPLOADS_DIR, req.params.name);
  try { unlinkSync(filePath); res.json({ success: true }); }
  catch { res.status(404).json({ error: 'File not found' }); }
});

// ============ 账号接口 ============

app.get('/api/auth', (req, res) => {
  const accounts = readDataFile('accounts.json', [
    {
      id: 1,
      username: 'admin',
      password: btoa('admin123'), // base64 encoded
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ]);
  // 返回不包含密码的账号列表
  const safeAccounts = accounts.map(({ password, ...rest }) => rest);
  res.json(safeAccounts);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const accounts = readDataFile('accounts.json', []);
  
  // 如果没有账号，创建一个默认的
  if (accounts.length === 0) {
    const defaultAccount = {
      id: 1,
      username: 'admin',
      password: btoa('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    writeDataFile('accounts.json', [defaultAccount]);
    
    if (username === 'admin' && password === 'admin123') {
      return res.json({ success: true, user: { id: 1, username: 'admin', role: 'admin' } });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  const account = accounts.find(a => a.username === username && a.password === btoa(password));
  if (account) {
    const { password: _, ...safeUser } = account;
    res.json({ success: true, user: safeUser });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, role = 'editor' } = req.body;
  const accounts = readDataFile('accounts.json', []);
  
  if (accounts.find(a => a.username === username)) {
    return res.status(400).json({ success: false, error: 'Username already exists' });
  }
  
  const newAccount = {
    id: Date.now(),
    username,
    password: btoa(password),
    role,
    createdAt: new Date().toISOString()
  };
  accounts.push(newAccount);
  writeDataFile('accounts.json', accounts);
  
  const { password: _, ...safeUser } = newAccount;
  res.json({ success: true, user: safeUser });
});

// 获取账号密码（仅用于管理页面显示旧密码）
app.get('/api/auth/accounts/:id/password', (req, res) => {
  const accounts = readDataFile('accounts.json', []);
  const account = accounts.find(a => a.id === parseInt(req.params.id));
  if (account) {
    try {
      res.json({ password: atob(account.password || '') });
    } catch (e) {
      res.json({ password: '(无法解码)' });
    }
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

app.put('/api/auth/accounts/:id', (req, res) => {
  const accounts = readDataFile('accounts.json', []);
  const index = accounts.findIndex(a => a.id === parseInt(req.params.id));
  if (index !== -1) {
    if (req.body.password) {
      accounts[index].password = btoa(req.body.password);
    }
    if (req.body.role) {
      accounts[index].role = req.body.role;
    }
    writeDataFile('accounts.json', accounts);
    const { password: _, ...safeUser } = accounts[index];
    res.json({ success: true, user: safeUser });
  } else {
    res.status(404).json({ error: 'Account not found' });
  }
});

app.delete('/api/auth/accounts/:id', (req, res) => {
  let accounts = readDataFile('accounts.json', []);
  accounts = accounts.filter(a => a.id !== parseInt(req.params.id));
  writeDataFile('accounts.json', accounts);
  res.json({ success: true });
});

// ============ 统计汇总接口 ============

// GET /api/stats - 返回真实统计数据
app.get('/api/stats', (req, res) => {
  const products = readDataFile('products.json', []);
  const categories = readDataFile('categories.json', []);
  const news = readDataFile('news.json', []);
  const contacts = readDataFile('contacts.json', []);

  // 今日日期
  const today = new Date().toISOString().slice(0, 10);
  const todayContacts = contacts.filter(c => c.date && c.date.startsWith(today));
  const unreadContacts = contacts.filter(c => !c.isRead);

  // 访问量统计 - 前台 server.js 写入格式: { daily: {YYYY-MM-DD: count}, monthly: {YYYY-MM: count} }
  const rawPageviews = readDataFile('pageviews.json', {});
  // 兼容两种格式：带 daily 嵌套 或 直接 {date: count}
  const dailyData = (rawPageviews.daily && typeof rawPageviews.daily === 'object')
    ? rawPageviews.daily
    : rawPageviews;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 按月聚合访问量（从 daily 数据汇总）
  const monthlyVisits = {};
  Object.entries(dailyData).forEach(([date, count]) => {
    if (typeof count === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date) >= sixMonthsAgo) {
      const month = date.slice(0, 7); // YYYY-MM
      monthlyVisits[month] = (monthlyVisits[month] || { visits: 0, inquiries: 0 });
      monthlyVisits[month].visits += count;
    }
  });

  // 将询盘按月统计，确保即使没有访问量数据也能显示询盘柱状图
  contacts.forEach(c => {
    if (c.date && /^\d{4}-\d{2}/.test(c.date)) {
      const month = c.date.slice(0, 7);
      if (new Date(month + '-01') >= sixMonthsAgo) {
        if (!monthlyVisits[month]) monthlyVisits[month] = { visits: 0, inquiries: 0 };
        monthlyVisits[month].inquiries = (monthlyVisits[month].inquiries || 0) + 1;
      }
    }
  });

  // 按周聚合（最近7天）
  const weeklyVisits = {};
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = `周${dayNames[d.getDay()]}`;
    weeklyVisits[dayName] = dailyData[dateStr] || 0;
  }

  // 今日访问量
  const todayVisits = dailyData[today] || 0;

  res.json({
    products: products.length,
    categories: categories.length,
    news: news.length,
    contacts: contacts.length,
    unreadContacts: unreadContacts.length,
    todayContacts: todayContacts.length,
    todayVisits,
    monthlyVisits: Object.entries(monthlyVisits)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        name: month.slice(5) + '月', // MM月
        visits: typeof data === 'number' ? data : (data.visits || 0),
        inquiries: typeof data === 'number'
          ? contacts.filter(c => c.date && c.date.startsWith(month)).length
          : (data.inquiries || 0)
      })),
    weeklyVisits: Object.entries(weeklyVisits).map(([name, visits]) => ({ name, visits })),
  });
});

// SPA fallback - 所有未匹配的路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
