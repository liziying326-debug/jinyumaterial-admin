import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ArrowLeft, Save, CheckCircle2, Eye } from 'lucide-react';

type FaqItem = {
  id: string;
  tab: string;
  index: number;
  question: string;
  answer: string;
};

// Tab 显示名映射
const TAB_LABELS: Record<string, string> = {
  products: 'Products',
  ordering: 'Ordering & Payment',
  shipping: 'Shipping & Delivery',
  quality: 'Quality & Certification',
};

const TAB_OPTIONS = Object.entries(TAB_LABELS).map(([value, label]) => ({ value, label }));

const API_BASE = '/api/faqs';

export default function FAQ() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'edit' | 'details'>('list');
  const [toastMsg, setToastMsg] = useState('');
  const [deleteModal, setDeleteModal] = useState<FaqItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<FaqItem | null>(null);

  // Tab 切换状态
  const [activeTab, setActiveTab] = useState<string>('products');

  // 编辑表单状态
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [faqTab, setFaqTab] = useState('products');

  // 当前 tab 下过滤后的 FAQ
  const filteredFaqs = faqs.filter(f => f.tab === activeTab);

  // 加载 FAQ 列表
  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.success) setFaqs(json.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFaqs(); }, []);

  // 加载选中项到编辑表单
  useEffect(() => {
    if (selectedItem) {
      setQuestion(selectedItem.question || '');
      setAnswer(selectedItem.answer || '');
      setFaqTab(selectedItem.tab || 'products');
    } else {
      setQuestion('');
      setAnswer('');
      setFaqTab('products');
    }
  }, [selectedItem]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!question.trim()) { showToast('问题不能为空'); return; }
    if (!answer.trim()) { showToast('答案不能为空'); return; }

    try {
      const body: any = { question: question.trim(), answer: answer.trim(), tab: faqTab };
      let url, method;

      if (selectedItem) {
        // 更新：PUT /api/faqs/:id
        url = `${API_BASE}/${selectedItem.id}`;
        method = 'PUT';
        body.index = selectedItem.index;
      } else {
        // 新增：POST /api/faqs
        url = API_BASE;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        showToast(selectedItem ? 'FAQ 保存成功' : 'FAQ 创建成功');
        // 新增成功后更新 selectedItem，保持编辑视图不跳转
        if (!selectedItem && json.id) {
          const newItem: FaqItem = { id: json.id, tab: faqTab, index: json.index || 0, question: question.trim(), answer: answer.trim() };
          setSelectedItem(newItem);
          setFaqTab(faqTab);
        }
        fetchFaqs();
      } else {
        showToast(json.error || '保存失败');
      }
    } catch { showToast('网络错误'); }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      const res = await fetch(`${API_BASE}/${deleteModal.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('FAQ 删除成功');
        setDeleteModal(null);
        fetchFaqs();
      } else {
        showToast(json.error || '删除失败');
      }
    } catch { showToast('网络错误'); }
  };

  /* ========== 编辑 / 详情视图 ========== */
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

        {/* 头部 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={() => setView('list')} className="mr-4 p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{isReadOnly ? 'FAQ 详情' : '编辑 FAQ'}</h1>
              <p className="text-sm text-gray-500 mt-1">{isReadOnly ? '查看常见问题内容。' : '编辑问题和答案。'}</p>
            </div>
          </div>
          {!isReadOnly && (
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
              <Save className="w-4 h-4 mr-2" />
              保存 FAQ
            </button>
          )}
        </div>

        {/* 编辑卡片 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 space-y-5 max-w-3xl">
            {/* 分类选择（仅新增时可选） */}
            {!selectedItem && !isReadOnly && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">分类 (Category)</label>
                <select
                  value={faqTab}
                  onChange={(e) => setFaqTab(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                >
                  {TAB_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedItem && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">分类 (Category)</label>
                <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg border border-blue-200">
                  {TAB_LABELS[selectedItem.tab] || selectedItem.tab}
                </div>
              </div>
            )}

            {/* 问题 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">问题 (Question) <span className="text-red-500">*</span></label>
              <input
                type="text"
                disabled={isReadOnly}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${isReadOnly ? 'text-gray-500 cursor-not-allowed' : 'focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                placeholder="输入问题..."
              />
            </div>

            {/* 答案 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">答案 (Answer) <span className="text-red-500">*</span></label>
              <textarea
                disabled={isReadOnly}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={8}
                className={`w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none resize-y ${isReadOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
                placeholder="输入答案..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ========== 列表视图 ========== */
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ 管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理网站的常见问题与解答（数据来源：translations.json）。</p>
        </div>
        <button onClick={() => { setSelectedItem(null); setFaqTab(activeTab); setView('edit'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          添加 FAQ
        </button>
      </div>

      {/* Tab 切换栏 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TAB_OPTIONS.map(opt => {
            const count = faqs.filter(f => f.tab === opt.value).length;
            const isActive = activeTab === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setActiveTab(opt.value)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-all relative ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
                <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-semibold rounded-full ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* FAQ 表格 */}
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">加载中...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">#</th>
                <th className="px-6 py-4 font-semibold">问题</th>
                <th className="px-6 py-4 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredFaqs.map((faq, idx) => (
                <tr key={faq.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{faq.question || '(无标题)'}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{faq.answer.substring(0, 80)}{faq.answer.length > 80 ? '...' : ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => { setSelectedItem(faq); setView('details'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelectedItem(faq); setView('edit'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteModal(faq)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFaqs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 text-sm">
                    该分类下暂无 FAQ 数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除 FAQ？</h3>
              <p className="text-sm text-gray-500">
                您确定要删除问题 "<span className="font-semibold text-gray-900">{deleteModal.question}</span>" 吗？此操作无法撤销。
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
