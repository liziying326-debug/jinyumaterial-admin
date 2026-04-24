/**
 * 批量补录产品翻译到 translations.json
 * 
 * 读取 products.json 中所有产品的 name_en，翻译为 zh/vi/tl，
 * 以 prod_{id}_name 格式写入 translations.json
 * 
 * 用法：node batch-product-translations.js
 * 需要在 admin 目录下运行（因为依赖 server.js 的 translateText）
 */

const path = require('path');
const fs = require('fs');

const DATA_DIR = __dirname;

// 复用 server.js 的数据读写函数
function readDataFile(file, fallback) {
  const fp = path.join(DATA_DIR, 'data', file);
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch (e) { return fallback; }
}
function writeDataFile(file, data) {
  const fp = path.join(DATA_DIR, 'data', file);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

// ============ 翻译函数（与 server.js 一致） ============

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
  _msTokenExpiry = Date.now() + 9 * 60 * 1000;
  return _msToken;
}

async function translateText(text, from, to) {
  const msLangMap = { 'en': 'en', 'zh': 'zh-Hans', 'vi': 'vi', 'fil': 'fil', 'ph': 'fil' };
  const myLangMap = { 'en': 'en', 'zh': 'zh-CN', 'vi': 'vi', 'tl': 'tl', 'fil': 'tl', 'ph': 'ph' };

  // 微软 Edge 翻译
  try {
    const token = await getMsToken();
    const msFrom = msLangMap[from] || from;
    const msTo = msLangMap[to] || to;
    const msUrl = `https://api-edge.cognitive.microsofttranslator.com/translate?from=${msFrom}&to=${msTo}&api-version=3.0&textType=plain`;
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
    if (!msRes.ok) throw new Error(`MS translate HTTP ${msRes.status}`);
    const msData = await msRes.json();
    const result = msData?.[0]?.translations?.[0]?.text;
    if (result && result.trim()) return result.trim();
    throw new Error('MS returned empty');
  } catch (err1) {
    console.warn(`  [${from}->${to}] MS failed: ${err1.message}, trying MyMemory...`);
    // MyMemory fallback
    try {
      const sl = myLangMap[from] || from;
      const tl = myLangMap[to] || to;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${tl}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000)
      });
      const data = await response.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        let result = data.responseData.translatedText;
        // 垃圾检测
        const isGarbage = (
          result === result.toUpperCase() && result.length > 20 && text !== text.toUpperCase()
        ) || /[\w.-]+@[\w.-]+\.\w+/.test(result)
          || /^https?:\/\//i.test(result)
          || (result.match && result.match < 0.5);
        if (isGarbage) {
          console.warn(`  [${from}->${to}] Garbage detected, using original`);
          return text;
        }
        return result;
      }
      throw new Error(`MyMemory status ${data.responseStatus}`);
    } catch (err2) {
      console.error(`  [${from}->${to}] ALL failed: ${err1.message} | ${err2.message}`);
      return null; // 返回 null 表示完全失败
    }
  }
}

async function translateBatch(texts, from, to) {
  const msLangMap = { 'en': 'en', 'zh': 'zh-Hans', 'vi': 'vi', 'fil': 'fil', 'ph': 'fil' };
  const BATCH_SIZE = 50;
  let allResults = [];

  try {
    const token = await getMsToken();
    const msFrom = msLangMap[from] || from;
    const msTo = msLangMap[to] || to;
    
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const body = batch.map(t => ({ Text: t }));
      const msUrl = `https://api-edge.cognitive.microsofttranslator.com/translate?from=${msFrom}&to=${msTo}&api-version=3.0&textType=plain`;
      const msRes = await fetch(msUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      });
      if (!msRes.ok) throw new Error(`Batch MS HTTP ${msRes.status}`);
      const msData = await msRes.json();
      const batchResults = msData.map(item => item?.translations?.[0]?.text?.trim() || '');
      allResults = allResults.concat(batchResults);
    }
    return allResults;
  } catch (err) {
    console.warn(`[batch ${from}->${to}] MS batch failed:`, err.message);
    // fallback 逐条翻译
    console.log(`[batch ${from}->${to}] Falling back to individual calls...`);
    const results = [];
    for (const t of texts) {
      const r = await translateText(t, from, to);
      results.push(r || t); // null 时用原文
    }
    return results;
  }
}

// ============ 主逻辑 ============

async function main() {
  console.log('=== 批量产品翻译补录 ===\n');

  // 1. 读取产品数据
  const products = readDataFile('products.json', []);
  console.log(`产品总数: ${products.length}`);

  // 2. 收集需要翻译的文本（以 name_en 为源）
  const targetLangs = ['zh', 'vi', 'tl'];
  const translations = readDataFile('translations.json', {});

  // 初始化语言命名空间
  targetLangs.forEach(lang => {
    if (!translations[lang]) translations[lang] = {};
  });

  let totalTranslated = 0;
  let totalSkipped = 0;

  for (const lang of targetLangs) {
    // 收集需要翻译的产品名
    const toTranslate = {};   // key -> sourceText
    const keyOrder = [];      // 保持顺序

    for (const p of products) {
      const i18nKey = 'prod_' + p.id + '_name';
      const existingName = p['name_' + lang];  // products.json 原字段
      const cachedName = translations[lang][i18nKey]; // 已有缓存
      
      // 如果原字段已有有效值且不是空字符串，跳过（但检查是否是之前清空的垃圾）
      if (existingName && existingName.trim()) {
        // 同步到 translations.json（确保一致）
        if (!cachedName || cachedName !== existingName.trim()) {
          translations[lang][i18nKey] = existingName.trim();
        }
        totalSkipped++;
        continue;
      }

      // 如果 i18n 缓存已有，也跳过
      if (cachedName && cachedName.trim()) {
        totalSkipped++;
        continue;
      }

      // 需要翻译
      const srcText = (p.name_en || p.name || '').trim();
      if (!srcText) continue;
      
      toTranslate[i18nKey] = srcText;
      keyOrder.push(i18nKey);
    }

    console.log(`\n[${lang.toUpperCase()}] 需要翻译: ${Object.keys(toTranslate).length} 个, 跳过(已有): ${totalSkipped}`);

    if (Object.keys(toTranslate).length === 0) {
      console.log(`[${lang.toUpperCase()}] 全部已就绪 ✓`);
      continue;
    }

    // 3. 批量调用翻译 API
    const values = keyOrder.map(k => toTranslate[k]);
    console.log(`[${lang.toUpperCase()}] 调用批量翻译 API (${values.length} 条)...`);
    
    try {
      const results = await translateBatch(values, 'en', lang);
      let successCount = 0;

      for (let i = 0; i < keyOrder.length; i++) {
        const k = keyOrder[i];
        const result = results[i];
        if (result && result !== toTranslate[k]) {
          translations[lang][k] = result;
          successCount++;
          totalTranslated++;
        } else {
          console.log(`  ⚠ ${k} ("${toTranslate[k]}") 翻译失败或无变化，跳过`);
        }
      }
      console.log(`[${lang.toUpperCase()}] ✅ 成功: ${successCount}/${keyOrder.length}`);
    } catch (err) {
      console.error(`[${lang.toUpperCase()}] ❌ 批量翻译失败:`, err.message);
    }
  }

  // 4. 保存
  writeDataFile('translations.json', translations);
  console.log(`\n=== 完成 ===`);
  console.log(`总计新增/更新翻译: ${totalTranslated} 条`);
  console.log(`已存在跳过: ${totalSkipped} 条`);
  console.log(`已保存到 translations.json`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
