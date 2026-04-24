import React, { useState, useEffect, useMemo } from 'react';
import { Save, CheckCircle2, Search, RefreshCw } from 'lucide-react';
import { i18nApi } from '../api';

type LangKey = 'en' | 'zh' | 'vi' | 'tl';

const LANGS: { id: LangKey; label: string; placeholder: string }[] = [
  { id: 'en', label: 'English (EN)', placeholder: 'EN' },
  { id: 'zh', label: '中文 (ZH)', placeholder: 'ZH' },
  { id: 'vi', label: 'Tiếng Việt (VI)', placeholder: 'VI' },
  { id: 'tl', label: 'Filipino (TL)', placeholder: 'TL' },
];

// 按模块分组
function groupByModule(flatKeys: string[]) {
  const groups: Record<string, string[]> = {};
  for (const key of flatKeys) {
    const module = key.split('.')[0]; // nav, footer, about_page, etc.
    if (!groups[module]) groups[module] = [];
    groups[module].push(key);
  }
  // 排序分组内的键
  for (const mod of Object.keys(groups)) {
    groups[mod].sort();
  }
  return groups;
}

const MODULE_LABELS: Record<string, string> = {
  'nav': '导航 (Navigation)',
  'hero': '首页横幅 (Hero)',
  'home': '首页内容 (Home)',
  'products': '产品 (Products)',
  'products_page': '产品页 (Products Page)',
  'productDetail': '产品详情 (Product Detail)',
  'applications': '应用场景 (Applications)',
  'app_page': '应用场景页 (App Page)',
  'caseStudies': '案例研究 (Case Studies)',
  'case_page': '案例研究页 (Case Page)',
  'about': '关于我们 (About)',
  'about_page': '关于我们页 (About Page)',
  'contact': '联系 (Contact)',
  'contact_page': '联系页 (Contact Page)',
  'blog_page': '博客/新闻页 (Blog Page)',
  'news_page': '新闻页 (News Page)',
  'quoteForm': '报价表单 (Quote Form)',
  'faq': 'FAQ',
  'cta': 'CTA 横幅',
  'successModal': '成功弹窗 (Success Modal)',
  'trust': '信任标识 (Trust)',
  'footer': '页脚 (Footer)',
};

function getModuleLabel(mod: string): string {
  return MODULE_LABELS[mod] || mod;
}

export default function GlobalLangConfig() {
  const [translations, setTranslations] = useState<Record<LangKey, Record<string, string>>>({
    en: {}, zh: {}, vi: {}, tl: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModule, setActiveModule] = useState<string>('all');

  // 从后台加载翻译数据
  const loadTranslations = async () => {
    setLoading(true);
    try {
      const [en, zh, vi, tl] = await Promise.all([
        i18nApi.get('en'),
        i18nApi.get('zh'),
        i18nApi.get('vi'),
        i18nApi.get('tl'),
      ]);
      setTranslations({ en: en || {}, zh: zh || {}, vi: vi || {}, tl: tl || {} });
    } catch (err) {
      console.error('Failed to load translations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranslations();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // 保存到后台
  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        i18nApi.save('en', translations.en),
        i18nApi.save('zh', translations.zh),
        i18nApi.save('vi', translations.vi),
        i18nApi.save('tl', translations.tl),
      ]);
      showToast('翻译数据已保存成功！');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 获取所有键（取 en 的键作为主键集）
  const allKeys = useMemo(() => {
    return Object.keys(translations.en).sort();
  }, [translations.en]);

  // 按模块分组
  const grouped = useMemo(() => groupByModule(allKeys), [allKeys]);

  // 过滤
  const filteredKeys = useMemo(() => {
    let keys = allKeys;
    if (activeModule !== 'all') {
      keys = keys.filter(k => k.startsWith(activeModule + '.'));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      keys = keys.filter(k => {
        if (k.toLowerCase().includes(q)) return true;
        for (const lang of LANGS) {
          const val = translations[lang.id]?.[k] || '';
          if (val.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }
    return keys;
  }, [allKeys, activeModule, searchQuery, translations]);

  const handleChange = (key: string, lang: LangKey, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: { ...prev[lang], [key]: value },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">加载翻译数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center z-50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">全局多语言配置</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadTranslations}
            className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重新加载
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm disabled:opacity-60"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存全部'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索键名或翻译内容..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={activeModule}
          onChange={(e) => setActiveModule(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部模块</option>
          {Object.keys(grouped).sort().map(mod => (
            <option key={mod} value={mod}>
              {getModuleLabel(mod)} ({grouped[mod].length})
            </option>
          ))}
        </select>
      </div>

      {/* Translation Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-left w-64">翻译键</th>
                {LANGS.map(l => (
                  <th key={l.id} className="px-3 py-3 font-semibold">{l.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredKeys.map((key) => (
                <tr key={key} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2 text-xs font-mono text-gray-700 break-all">
                    {key}
                  </td>
                  {LANGS.map(l => (
                    <td key={l.id} className="px-3 py-2">
                      <input
                        type="text"
                        value={translations[l.id]?.[key] ?? ''}
                        onChange={(e) => handleChange(key, l.id, e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        placeholder={translations.en?.[key] || ''}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {filteredKeys.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    没有匹配的翻译键
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
