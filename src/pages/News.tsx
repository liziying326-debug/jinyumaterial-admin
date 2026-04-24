import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, ArrowLeft, Sparkles, Save, CheckCircle2, X } from 'lucide-react';
import ImageUploader from '@/src/components/ImageUploader';

// Markdown 转 HTML（处理 **粗体** 和换行）
function markdownToHtml(text: string): string {
  if (!text) return '';
  // 1. 先转义 HTML 特殊字符（防止 XSS）
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  // 2. 段落：多个换行或双换行 → </p><p>
  html = '<p>' + html.replace(/\n{2,}/g, '</p><p>') + '</p>';
  // 3. 单换行 → <br>
  html = html.replace(/\n/g, '<br>');
  // 4. **粗体** → <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 5. 清理空段落
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<br>)+/g, '<p>');
  html = html.replace(/(<br>)+<\/p>/g, '</p>');
  return html;
}

type NewsLangData = { seoTitle: string; title: string; slug: string; alt: string; content: string };
type NewsItem = {
  id: number;
  date: string;
  status: string;
  views: number;
  images: string[];   // 新闻封面图（多图，第一张为主封面）
  langData: Record<string, NewsLangData>;
};

const defaultNews: NewsItem[] = [];

// API calls
async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch('/api/news');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch { /* ignore */ }
  return defaultNews;
}

// 获取真实浏览量（从 news-views.json，按 slug 统计）
async function fetchNewsViews(): Promise<Record<string, number>> {
  try {
    const res = await fetch('/api/news-views');
    if (res.ok) {
      return await res.json();
    }
  } catch { /* ignore */ }
  return {};
}

// 根据 slug 获取新闻对应的浏览量（优先用 slug，没有则用 news-{id}）
function getNewsViewsBySlug(news: NewsItem, viewsMap: Record<string, number>): number {
  const slug = news.langData?.en?.slug || '';
  // 优先用英文 slug
  if (slug && viewsMap[slug] !== undefined) {
    return viewsMap[slug];
  }
  // 没有 slug 则用 news-{id} 作为 fallback（前台 normalizePost 的逻辑）
  const fallbackSlug = 'news-' + news.id;
  return viewsMap[fallbackSlug] || 0;
}

async function createNewsAPI(item: NewsItem): Promise<NewsItem | null> {
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return null;
}

async function updateNewsAPI(item: NewsItem): Promise<boolean> {
  try {
    const res = await fetch('/api/news/' + item.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return res.ok;
  } catch { return false; }
}

async function deleteNewsAPI(id: number): Promise<boolean> {
  try {
    const res = await fetch('/api/news/' + id, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

let nextNewsId = 10;

export default function News() {
  const [newsList, setNewsList] = useState<NewsItem[]>(defaultNews);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'details'>('list');
  const [activeLang] = useState('en');
  const [toastMsg, setToastMsg] = useState('');
  const [deleteModal, setDeleteModal] = useState<NewsItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newsDataByLang, setNewsDataByLang] = useState<Record<string, NewsLangData>>({
    en: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
    zh: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
    vi: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
    ph: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
  });

  // 从 API 加载数据（新闻列表 + 真实浏览量）
  useEffect(() => {
    Promise.all([fetchNews(), fetchNewsViews()]).then(([data, viewsMap]) => {
      // 合并真实浏览量到新闻列表
      const merged = data.map(news => ({
        ...news,
        views: getNewsViewsBySlug(news, viewsMap),
      }));
      setNewsList(merged);
      // 计算下一个 ID
      const maxId = merged.reduce((max, n) => Math.max(max, n.id || 0), 0);
      nextNewsId = maxId + 1;
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    if (selectedItem) {
      const allLangs: Record<string, NewsLangData> = {
        en: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        zh: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        vi: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        ph: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
      };
      if (selectedItem.langData) {
        (['en','zh','vi','ph'] as const).forEach(l => {
          if (selectedItem.langData[l]) allLangs[l] = { ...selectedItem.langData[l] };
        });
      }
      setNewsDataByLang(allLangs);
      setEditImages(selectedItem.images || []);
    } else {
      setNewsDataByLang({
        en: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        zh: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        vi: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
        ph: { seoTitle: '', title: '', slug: '', alt: '', content: '' },
      });
      setEditImages([]);
    }
  }, [selectedItem]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    // 保存前将 Markdown 转为 HTML
    const processedData: Record<string, NewsLangData> = {};
    for (const [lang, data] of Object.entries(newsDataByLang)) {
      processedData[lang] = {
        ...data,
        content: markdownToHtml(data.content),
      };
    }

    if (selectedItem) {
      const updated: NewsItem = {
        ...selectedItem,
        images: editImages,
        langData: { ...selectedItem.langData, ...processedData },
      };
      const ok = await updateNewsAPI(updated);
      if (ok) {
        setNewsList(prev => prev.map(n => n.id === selectedItem.id ? updated : n));
        showToast('新闻保存成功');
      } else {
        showToast('保存失败，请重试');
      }
    } else {
      const newId = nextNewsId++;
      const today = new Date().toISOString().slice(0, 10);
      const newItem: NewsItem = {
        id: newId,
        date: today,
        status: '已发布',
        views: 0,
        images: editImages,
        langData: { ...processedData },
      };
      const created = await createNewsAPI(newItem);
      if (created) {
        setNewsList(prev => [...prev, created]);
        setSelectedItem(created);
        showToast('新闻创建成功');
      } else {
        showToast('创建失败，请重试');
      }
    }
  };

  const handleDelete = async () => {
    if (deleteModal) {
      const ok = await deleteNewsAPI(deleteModal.id);
      if (ok) {
        setNewsList(prev => prev.filter(n => n.id !== deleteModal.id));
        showToast('新闻删除成功');
      } else {
        showToast('删除失败，请重试');
      }
      setDeleteModal(null);
    }
  };

  const getDisplayTitle = (news: NewsItem) => {
    return news.langData?.en?.title || news.langData?.zh?.title || '(无标题)';
  };

  if (view === 'edit' || view === 'details') {
    const isReadOnly = view === 'details';
    return (
      <div className="space-y-6 animate-in fade-in duration-500 relative">
        {toastMsg && (
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center z-50 animate-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
            <span>{toastMsg}</span>
          </div>
        )}


        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => setView('list')} className="mr-4 p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isReadOnly ? '新闻详情' : '编辑新闻'}</h1>
              <p className="text-sm text-gray-500 mt-1">{isReadOnly ? '查看新闻内容及多语言SEO配置。' : '配置新闻内容及多语言SEO信息。'}</p>
            </div>
          </div>
          {!isReadOnly && (
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
              <Save className="w-4 h-4 mr-2" />
              保存新闻
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {/* 新闻封面图 */}
            {isReadOnly ? (
              selectedItem && (selectedItem.images?.length ?? 0) > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">新闻封面图</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {selectedItem.images!.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <img src={img} alt={`封面 ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm">主图</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <ImageUploader
                images={editImages}
                onChange={setEditImages}
                max={6}
                label="新闻封面图"
                showPrimary={true}
              />
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">SEO标题 (SEO Title) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  disabled={isReadOnly} 
                  value={newsDataByLang['en']?.seoTitle || ''}
                  onChange={(e) => setNewsDataByLang(prev => ({ ...prev, en: { ...prev.en, seoTitle: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`} 
                  placeholder="用于搜索引擎优化的标题..." 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">H1大标题 (H1 Title) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  disabled={isReadOnly} 
                  value={newsDataByLang['en']?.title || ''}
                  onChange={(e) => setNewsDataByLang(prev => ({ ...prev, en: { ...prev.en, title: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`} 
                  placeholder="页面主标题..." 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">独立网址别名 (Slug) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  disabled={isReadOnly} 
                  value={newsDataByLang['en']?.slug || ''}
                  onChange={(e) => setNewsDataByLang(prev => ({ ...prev, en: { ...prev.en, slug: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`} 
                  placeholder="例如: iso-9001-certification" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">独立图片Alt文案 (Image Alt) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  disabled={isReadOnly} 
                  value={newsDataByLang['en']?.alt || ''}
                  onChange={(e) => setNewsDataByLang(prev => ({ ...prev, en: { ...prev.en, alt: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`} 
                  placeholder="描述图片的替代文本..." 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">正文详情 (Content) <span className="text-red-500">*</span></label>
              <div className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${isReadOnly ? 'opacity-70' : 'focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500'}`}>
                <textarea 
                  disabled={isReadOnly} 
                  value={newsDataByLang['en']?.content || ''}
                  onChange={(e) => setNewsDataByLang(prev => ({ ...prev, en: { ...prev.en, content: e.target.value } }))}
                  rows={10} 
                  className={`w-full bg-white px-4 py-3 text-sm outline-none resize-y ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : ''}`} 
                  placeholder="在此输入独立的正文详情内容（支持富文本）..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新闻管理</h1>
          <p className="text-sm text-gray-500 mt-1">发布公司动态、行业资讯及展会信息。</p>
        </div>
        <button onClick={() => { setSelectedItem(null); setView('edit'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          发布新闻
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-7xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{width: '80px'}} />
              <col style={{width: '300px'}} />
              <col style={{width: '110px'}} />
              <col style={{width: '90px'}} />
              <col style={{width: '90px'}} />
              <col style={{width: '130px'}} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 py-4 font-semibold">封面</th>
                <th className="px-4 py-4 font-semibold">新闻标题</th>
                <th className="px-4 py-4 font-semibold">发布日期</th>
                <th className="px-4 py-4 font-semibold">浏览量</th>
                <th className="px-4 py-4 font-semibold">状态</th>
                <th className="px-4 py-4 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {newsList.map((news) => (
                <tr key={news.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-4">
                    {news.images?.[0] ? (
                      <img src={news.images[0]} alt={getDisplayTitle(news)} className="w-14 h-10 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-14 h-10 bg-gray-100 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs">无图</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-gray-900 truncate">{getDisplayTitle(news)}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {news.date}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <div className="flex items-center"><Eye className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />{news.views}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${news.status === '已发布' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {news.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => { setSelectedItem(news); setView('details'); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setSelectedItem(news); setView('edit'); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteModal(news)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {newsList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">暂无新闻数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除新闻？</h3>
              <p className="text-sm text-gray-500">
                您确定要删除新闻 <span className="font-semibold text-gray-900">"{getDisplayTitle(deleteModal)}"</span> 吗？此操作无法撤销。
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-center gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleDelete} className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
