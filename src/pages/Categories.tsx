import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, GripVertical, Eye, X, Sparkles } from 'lucide-react';

type Category = {
  _seqId: number;
  id: string;
  name: string;   // 英文名称（显示用）
  count: number;
  desc: string;
};

const defaultInitial: Category[] = [
  { _seqId: 1, id: 'advertising-media', name: 'Advertising Media', count: 0, desc: '' },
  { _seqId: 2, id: 'advertising-panel', name: 'Advertising Panel', count: 0, desc: '' },
  { _seqId: 3, id: 'display-stand',     name: 'Display Stand',     count: 0, desc: '' },
  { _seqId: 4, id: 'accessory-tools',   name: 'Accessory',         count: 0, desc: '' },
];

function apiToComponent(apiCat: any, seqId: number): Category {
  return {
    _seqId: seqId,
    id: String(apiCat.id),
    name: apiCat.name_en || apiCat.name || '',
    count: 0,
    desc: apiCat.desc_en || apiCat.desc || '',
  };
}

let _nextSeq = 10;

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>(defaultInitial);
  const [isLoading, setIsLoading] = useState(true);
  const [viewModal, setViewModal] = useState<Category | null>(null);
  const [editModal, setEditModal] = useState<Category | null>(null);
  const [deleteModal, setDeleteModal] = useState<Category | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // 编辑表单字段
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  React.useEffect(() => {
    async function loadFromAPI() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/products'),
        ]);
        let cats: Category[] = [];
        if (catRes.ok) {
          const apiCats = await catRes.json();
          const list = Array.isArray(apiCats) ? apiCats : (apiCats.data || []);
          cats = list.map((c: any, i: number) => apiToComponent(c, i + 1));
          _nextSeq = list.length + 10;
        }
        let countMap: Record<string, number> = {};
        if (prodRes.ok) {
          const prods = await prodRes.json();
          for (const p of (Array.isArray(prods) ? prods : [])) {
            const catId = String(p.category_id || '');
            countMap[catId] = (countMap[catId] || 0) + 1;
          }
        }
        if (cats.length > 0) {
          cats = cats.map(c => ({ ...c, count: countMap[c.id] || 0 }));
        }
        setCategories(cats.length > 0 ? cats : defaultInitial);
      } catch (e) {
        console.error('Failed to load categories from API:', e);
        setCategories(defaultInitial);
      } finally {
        setIsLoading(false);
      }
    }
    loadFromAPI();
  }, []);

  // 打开编辑/查看时同步表单
  React.useEffect(() => {
    if (editModal) {
      setEditName(editModal.name);
      setEditDesc(editModal.desc);
    }
  }, [editModal]);

  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of categories) map[c.id] = c.count;
    return map;
  }, [categories]);

  const getCount = (cat: Category) => categoryCountMap[cat.id] || 0;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!editModal) return;
    if (!editName.trim()) { showToast('请填写英文名称'); return; }

    const payload = {
      name_en: editName.trim(),
      desc_en: editDesc.trim(),
    };

    try {
      let savedCat: any;
      if (editModal._seqId === 0) {
        // 新建
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        savedCat = await res.json();
        const newItem: Category = {
          _seqId: _nextSeq++,
          id: savedCat.id || String(Date.now()),
          name: editName.trim(),
          count: 0,
          desc: editDesc.trim(),
        };
        setCategories(prev => [...prev, newItem]);
        setEditModal(null);
        showToast('分类保存成功');
      } else {
        // 更新
        const res = await fetch(`/api/categories/${editModal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Update failed');
        const updated: Category = {
          ...editModal,
          name: editName.trim(),
          desc: editDesc.trim(),
        };
        setCategories(prev => prev.map(c => c.id === editModal.id ? updated : c));
        setEditModal(null);
        showToast('分类保存成功');
      }
    } catch (e: any) {
      console.error('handleSave error:', e);
      showToast('保存失败: ' + e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      const res = await fetch(`/api/categories/${deleteModal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const result = await res.json();
      setCategories(prev => prev.filter(c => c.id !== deleteModal.id));
      setDeleteModal(null);
      localStorage.removeItem('jinyu_material_products');
      const msg = result.deletedProducts > 0
        ? `分类 "${deleteModal.name}" 删除成功，同时删除了 ${result.deletedProducts} 个产品`
        : `分类 "${deleteModal.name}" 删除成功`;
      showToast(msg);
    } catch (e: any) {
      console.error('handleDelete error:', e);
      showToast('删除失败: ' + e.message);
    }
  };

  const newCategoryTemplate: Category = { _seqId: 0, id: '', name: '', count: 0, desc: '' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {toastMsg && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center z-[60] animate-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-emerald-400 mr-2" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品分类</h1>
          <p className="text-sm text-gray-500 mt-1">管理产品目录结构，支持拖拽排序。</p>
        </div>
        <button onClick={() => setEditModal(newCategoryTemplate)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          添加分类
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">加载中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-4 w-12"></th>
                  <th className="px-6 py-4 font-semibold">分类名称</th>
                  <th className="px-6 py-4 font-semibold">ID</th>
                  <th className="px-6 py-4 font-semibold">产品数量</th>
                  <th className="px-6 py-4 font-semibold">操作</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-4 text-gray-300 cursor-move hover:text-gray-500">
                    <GripVertical className="w-5 h-5" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{cat.name}</div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400">{cat.id}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                      {getCount(cat)} 个产品
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setViewModal(cat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="查看详情">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditModal(cat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteModal(cat)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">分类详情</h3>
              <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">分类名称</p>
                <p className="text-base font-semibold text-gray-900">{viewModal.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">描述</p>
                <p className="text-base text-gray-900">{viewModal.desc || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">ID</p>
                <p className="text-sm font-mono text-gray-500">{viewModal.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">产品数量</p>
                <p className="text-base text-gray-900">{viewModal.count} 个</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button onClick={() => setViewModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editModal._seqId === 0 ? '添加分类' : '编辑分类'}</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">分类名称</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Advertising Media"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">描述</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  placeholder="Optional description..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                ></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleSave} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除分类？</h3>
              <p className="text-sm text-gray-500">
                您确定要删除分类 <span className="font-semibold text-gray-900">"{deleteModal.name}"</span> 吗？此操作无法撤销。
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
