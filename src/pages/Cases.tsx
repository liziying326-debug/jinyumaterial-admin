import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Save, CheckCircle2, Eye, Video } from 'lucide-react';
import ImageUploader from '@/src/components/ImageUploader';
import VideoUploader from '@/src/components/VideoUploader';

type CaseItem = {
  id: number;
  region: string;
  category: string;
  title: string;
  client: string;
  date: string;
  images: string[];
  desc: string;
  video?: string;
  langData: Record<string, { title: string; seoTitle: string; h1Title: string; slug: string; alt: string; content: string }>;
};

const initialCases: CaseItem[] = [];

const emptyLangData = () => ({
  en: { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
  zh: { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
  vi: { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
  ph: { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
});

// API calls
async function fetchCases(): Promise<CaseItem[]> {
  try {
    const res = await fetch('/api/cases');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch { /* ignore */ }
  return initialCases;
}

async function saveAllCases(cases: CaseItem[]): Promise<boolean> {
  try {
    // Use bulk save: PUT /api/cases with full array
    await fetch('/api/cases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cases),
    });
    return true;
  } catch { return false; }
}

async function createCase(newCase: CaseItem): Promise<CaseItem | null> {
  try {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCase),
    });
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return null;
}

async function updateCase(updated: CaseItem): Promise<boolean> {
  try {
    const res = await fetch('/api/cases/' + updated.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    return res.ok;
  } catch { return false; }
}

async function deleteCase(id: number): Promise<boolean> {
  try {
    const res = await fetch('/api/cases/' + id, { method: 'DELETE' });
    return res.ok;
  } catch { return false; }
}

export default function Cases() {
  const [cases, setCases] = useState<CaseItem[]>(initialCases);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'details'>('list');
  const [toastMsg, setToastMsg] = useState('');
  const [deleteModal, setDeleteModal] = useState<CaseItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<CaseItem | null>(null);
  const [regionFilter, setRegionFilter] = useState<'All' | 'Vietnam' | 'Philippines'>('All');
  const [editRegion, setEditRegion] = useState<string>('Vietnam');
  const [editCategory, setEditCategory] = useState<string>('Outdoor Billboards (户外围挡)');
  const [editTitle, setEditTitle] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editDesc, setEditDesc] = useState('');
  const [editVideo, setEditVideo] = useState('');
  // 已移除旧的 editImage（单图 URL）字段，统一使用 editImages（多图数组）

  // 从 API 加载数据
  useEffect(() => {
    fetchCases().then(data => {
      setCases(data);
      setLoading(false);
    });
  }, []);

  const [caseDataByLang, setCaseDataByLang] = useState<Record<string, { title: string; seoTitle: string; h1Title: string; slug: string; alt: string; content: string }>>(emptyLangData());

  // Initialize data when editing an item
  React.useEffect(() => {
    if (selectedItem) {
      setEditRegion(selectedItem.region || 'Vietnam');
      setEditCategory(selectedItem.category || 'Outdoor Billboards (户外围挡)');
      setEditTitle(selectedItem.title);
      setEditClient(selectedItem.client);
      setEditDate(selectedItem.date);
      setEditImages(selectedItem.images || []);
      setEditDesc(selectedItem.desc);
      setEditVideo(selectedItem.video || '');
      const ld = selectedItem.langData || {};
      setCaseDataByLang({
        en: ld.en || { title: selectedItem.title, seoTitle: selectedItem.title, h1Title: selectedItem.title, slug: selectedItem.title.toLowerCase().replace(/\s+/g, '-'), alt: selectedItem.title, content: selectedItem.desc },
        zh: ld.zh || { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
        vi: ld.vi || { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
        ph: ld.ph || { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' },
      });
    } else {
      setEditRegion('Vietnam');
      setEditCategory('Outdoor Billboards (户外围挡)');
      setEditTitle('');
      setEditClient('');
      setEditDate('');
      setEditImages([]);
      setEditDesc('');
      setEditVideo('');
      setCaseDataByLang(emptyLangData());
    }
  }, [selectedItem]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    // 只同步空语言槽（确保 en/zh/vi/ph 都有对象），不填充其他语言的 title
    // 让其他语言保持为空，由前台自动翻译
    const syncedData = { ...caseDataByLang };
    (['en', 'zh', 'vi', 'ph'] as const).forEach(l => {
      if (!syncedData[l]) syncedData[l] = { title: '', seoTitle: '', h1Title: '', slug: '', alt: '', content: '' };
      // 不再自动填充 title，让前台自动翻译
    });

    if (selectedItem) {
      // 更新已有案例
      const updated: CaseItem = {
        ...selectedItem,
        region: editRegion,
        category: editCategory,
        title: syncedData.en?.title || editTitle,
        client: editClient,
        date: editDate,
        images: editImages,
        desc: editDesc,
        video: editVideo,
        langData: syncedData,
      };
      const ok = await updateCase(updated);
      if (ok) {
        setCases(prev => prev.map(c => c.id === selectedItem.id ? updated : c));
        showToast('保存成功 ✓');
      } else {
        showToast('保存失败，请重试');
      }
    } else {
      // 新增案例
      const newCase: CaseItem = {
        id: Date.now(),
        region: editRegion,
        category: editCategory,
        title: syncedData.en?.title || editTitle,
        client: editClient,
        date: editDate,
        images: editImages,
        desc: editDesc,
        video: editVideo,
        langData: syncedData,
      };
      const created = await createCase(newCase);
      if (created) {
        setCases(prev => [created, ...prev]);
        showToast('案例发布成功');
        setView('list');
        setSelectedItem(null);
      } else {
        showToast('发布失败，请重试');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    const ok = await deleteCase(deleteModal.id);
    if (ok) {
      setCases(prev => prev.filter(c => c.id !== deleteModal.id));
      showToast('案例删除成功');
    } else {
      showToast('删除失败，请重试');
    }
    setDeleteModal(null);
  };

  const filteredCases = regionFilter === 'All'
    ? cases
    : cases.filter(c => c.region === regionFilter);

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
              <h1 className="text-2xl font-bold text-gray-900">{isReadOnly ? '案例/视频详情' : '编辑案例/视频'}</h1>
              <p className="text-sm text-gray-500 mt-1">{isReadOnly ? '查看案例内容、视频与多语言 SEO 配置。' : '编辑案例/视频的多语言详细信息。'}</p>
            </div>
          </div>
          {!isReadOnly && (
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
              <Save className="w-4 h-4 mr-2" />
              保存
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-7xl mx-auto">
          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm px-4 py-3 rounded-lg flex items-start">
              <div className="font-medium">
                只编辑英文版本，其他语言由前台自动翻译。
              </div>
            </div>

            {/* 案例图片：详情模式展示，编辑模式在表单中 */}
            {isReadOnly && selectedItem && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">案例图片</label>
                {selectedItem.images && selectedItem.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {selectedItem.images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <img src={img} alt={`案例图片 ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && (
                          <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm">主图</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 py-6 text-center">暂无图片</div>
                )}
              </div>
            )}

            {/* 案例视频：详情模式展示 */}
            {isReadOnly && selectedItem && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">案例视频</label>
                {selectedItem.video ? (
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-900">
                    <video
                      src={selectedItem.video}
                      controls
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 py-6 text-center">暂无视频</div>
                )}
              </div>
            )}

            {/* Basic info fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">SEO 标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={caseDataByLang['en']?.seoTitle || ''}
                  onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, seoTitle: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                  placeholder="SEO title for search engines..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">H1 标题 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={caseDataByLang['en']?.h1Title || ''}
                  onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, h1Title: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                  placeholder="Page main heading..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Slug <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={caseDataByLang['en']?.slug || ''}
                  onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, slug: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                  placeholder="e.g. vietnam-outdoor-billboard"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">图片 Alt <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={caseDataByLang['en']?.alt || ''}
                  onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, alt: e.target.value } }))}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                  placeholder="Image alt text description..."
                />
              </div>
              {!isReadOnly && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">地区 <span className="text-red-500">*</span></label>
                    <select
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="Vietnam">Vietnam</option>
                      <option value="Philippines">Philippines</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">分类 <span className="text-red-500">*</span></label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="Outdoor Billboards (户外围挡)">Outdoor Billboards</option>
                      <option value="Store Signage (门店招牌)">Store Signage</option>
                      <option value="Traffic Reflection (交通反光)">Traffic Reflection</option>
                      <option value="Car Wraps (车身广告)">Car Wraps</option>
                      <option value="Mall Lightboxes (商场灯箱)">Mall Lightboxes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">客户</label>
                    <input
                      type="text"
                      value={editClient}
                      onChange={(e) => setEditClient(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      placeholder="Client name..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">日期</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUploader
                      images={editImages}
                      onChange={setEditImages}
                      max={6}
                      label="案例图片"
                      showPrimary={true}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <VideoUploader
                      value={editVideo}
                      onChange={setEditVideo}
                      label="案例视频"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1.5">标题 <span className="text-xs text-gray-400 font-normal ml-1">(EN)</span></label>
                    <input
                      type="text"
                      value={caseDataByLang['en']?.title || ''}
                      onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, title: e.target.value } }))}
                      disabled={isReadOnly}
                      className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                      placeholder="案例标题..."
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">内容 <span className="text-red-500">*</span></label>
              <div className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${isReadOnly ? 'opacity-70' : 'focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500'}`}>
                <textarea
                  value={caseDataByLang['en']?.content || ''}
                  onChange={(e) => setCaseDataByLang(prev => ({ ...prev, en: { ...prev.en, content: e.target.value } }))}
                  disabled={isReadOnly}
                  rows={10}
                  className={`w-full bg-white px-4 py-3 text-sm outline-none resize-y ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : ''}`}
                  placeholder="Enter detailed content here..."
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
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center z-50 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">案例/视频</h1>
          <p className="text-sm text-gray-500 mt-1">管理广告工程案例和视频，展示防水耐用的解决方案。</p>
        </div>
        <button onClick={() => { setSelectedItem(null); setView('edit'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          新增案例
        </button>
      </div>

      {/* Region Filter */}
      <div className="flex space-x-2">
        {(['All', 'Vietnam', 'Philippines'] as const).map((region) => (
          <button
            key={region}
            onClick={() => setRegionFilter(region)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              regionFilter === region
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {region === 'All' ? '全部地区' : region}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto max-w-7xl mx-auto">
        <div className="min-w-[600px]">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{width: '88px'}} />
              <col style={{width: '220px'}} />
              <col style={{width: '130px'}} />
              <col style={{width: '100px'}} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 py-4 font-semibold">图片</th>
                <th className="px-4 py-4 font-semibold">标题</th>
                <th className="px-4 py-4 font-semibold">地区</th>
                <th className="px-4 py-4 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCases.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-4">
                    {item.images?.[0] ? (
                      <img src={item.images[0]} alt={item.title} className="w-16 h-12 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="w-16 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-300 text-xs">无图</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-bold text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{item.client}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {item.region}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => { setSelectedItem(item); setView('details'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelectedItem(item); setView('edit'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteModal(item)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                    该地区暂无案例
                  </td>
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除案例？</h3>
              <p className="text-sm text-gray-500">
                确定要删除 <span className="font-semibold text-gray-900">"{deleteModal.title}"</span> 吗？此操作不可撤销。
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-center gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleDelete} className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
