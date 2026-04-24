import React, { useState, useEffect } from 'react';
import { User, Lock, Edit2, Save, X, Plus, Trash2, CheckCircle2, AlertCircle, Shield, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api';

interface Account {
  id: number;
  username: string;
  role: 'admin' | 'editor';
  createdAt: string;
}

interface AccountManagerProps {
  currentUser: string;
}

export default function AccountManager({ currentUser }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', role: 'admin' as 'admin' | 'editor' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', password: '', role: 'admin' as 'admin' | 'editor' });
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [deleteModal, setDeleteModal] = useState<Account | null>(null);
  const [resetModal, setResetModal] = useState<Account | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await authApi.getAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      showToast('加载账号失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleSaveEdit = async () => {
    if (!editForm.username.trim()) {
      showToast('用户名不能为空', 'error');
      return;
    }
    if (accounts.some(a => a.username === editForm.username && a.id !== editingId)) {
      showToast('用户名已存在', 'error');
      return;
    }

    try {
      if (editingId && editForm.password) {
        await authApi.updateAccount(editingId, { password: editForm.password, role: editForm.role });
      } else if (editingId) {
        await authApi.updateAccount(editingId, { role: editForm.role });
      }
      await loadAccounts();
      setEditingId(null);
      showToast('账号更新成功');
    } catch (error) {
      showToast('更新失败', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ username: '', password: '', role: 'admin' });
  };

  const handleAdd = async () => {
    if (!addForm.username.trim()) {
      showToast('用户名不能为空', 'error');
      return;
    }
    if (!addForm.password || addForm.password.length < 6) {
      showToast('密码至少6位', 'error');
      return;
    }
    if (accounts.some(a => a.username === addForm.username)) {
      showToast('用户名已存在', 'error');
      return;
    }

    try {
      await authApi.register({ username: addForm.username, password: addForm.password, role: addForm.role });
      await loadAccounts();
      setShowAddForm(false);
      setAddForm({ username: '', password: '', role: 'admin' });
      showToast('账号创建成功');
    } catch (error) {
      showToast('创建失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.username === currentUser) {
      showToast('不能删除当前登录账号', 'error');
      setDeleteModal(null);
      return;
    }
    try {
      await authApi.deleteAccount(deleteModal.id);
      await loadAccounts();
      setDeleteModal(null);
      showToast('账号删除成功');
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal) return;
    if (!resetPassword || resetPassword.length < 6) {
      showToast('密码至少6位', 'error');
      return;
    }
    if (resetPassword !== resetConfirm) {
      showToast('两次密码不一致', 'error');
      return;
    }
    try {
      await authApi.updateAccount(resetModal.id, { password: resetPassword });
      setResetModal(null);
      setResetPassword('');
      setResetConfirm('');
      showToast('密码重置成功');
    } catch (error) {
      showToast('重置失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      {toastMsg && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl flex items-center z-50 animate-in slide-in-from-top-4 ${
          toastType === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
        }`}>
          {toastType === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" /> : <AlertCircle className="w-5 h-5 text-white mr-2" />}
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">账号管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统用户账号与权限</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            添加账号
          </button>
        )}
      </div>

      {/* 添加账号表单 */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-600" />
              添加新账号
            </h2>
            <button onClick={() => { setShowAddForm(false); setAddForm({ username: '', password: '', role: 'admin' }); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="输入用户名"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="至少6位"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as 'admin' | 'editor' })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              >
                <option value="admin">管理员</option>
                <option value="editor">编辑</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => { setShowAddForm(false); setAddForm({ username: '', password: '', role: 'admin' }); }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
              取消
            </button>
            <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
              创建账号
            </button>
          </div>
        </div>
      )}

      {/* 账号列表 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold text-left whitespace-nowrap">用户</th>
                <th className="px-6 py-4 font-semibold text-left whitespace-nowrap">角色</th>
                <th className="px-6 py-4 font-semibold text-left whitespace-nowrap">创建时间</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  {editingId === account.id ? (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                          className="w-40 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                      </div>
                      {editForm.password !== '' && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已修改</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold mr-3">
                        {account.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{account.username}</p>
                        {account.username === currentUser && (
                          <p className="text-xs text-blue-600">当前登录</p>
                        )}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === account.id ? (
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'editor' })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    >
                      <option value="admin">管理员</option>
                      <option value="editor">编辑</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${
                      account.role === 'admin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {account.role === 'admin' ? (
                        <><Shield className="w-3 h-3 mr-1" />管理员</>
                      ) : '编辑'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(account.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    {editingId === account.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="保存">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={handleCancelEdit} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="取消">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(account.id); setEditForm({ username: account.username, password: '', role: account.role }); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="编辑">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { setResetModal(account); setResetPassword(''); setResetConfirm(''); setShowResetPass(false); setShowResetConfirm(false); setOldPassword(null); try { const res = await authApi.getPassword(account.id); setOldPassword(res.password); } catch(e) { setOldPassword('(获取失败)'); } }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="重置密码">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal(account)}
                          className={`p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${account.username === currentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="删除"
                          disabled={account.username === currentUser}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除账号？</h3>
              <p className="text-sm text-gray-500">
                确定要删除账号 <span className="font-semibold text-gray-900">"{deleteModal.username}"</span> 吗？此操作不可撤销。
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

      {/* 重置密码弹窗 */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                  <RotateCcw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">重置密码</h3>
                  <p className="text-sm text-gray-500">账号：{resetModal.username}</p>
                </div>
              </div>
              <div className="space-y-4">
                {/* 旧密码显示 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">当前密码</label>
                  <p className="text-sm text-gray-900 font-mono break-all">
                    {oldPassword === null ? (
                      <span className="text-gray-400 animate-pulse">加载中...</span>
                    ) : oldPassword}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">新密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showResetPass ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="至少6位"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
                    />
                    <button type="button" onClick={() => setShowResetPass(!showResetPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showResetConfirm ? 'text' : 'password'}
                      value={resetConfirm}
                      onChange={(e) => setResetConfirm(e.target.value)}
                      placeholder="再次输入新密码"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500"
                    />
                    <button type="button" onClick={() => setShowResetConfirm(!showResetConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showResetConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-center gap-3">
              <button onClick={() => setResetModal(null)} className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                取消
              </button>
              <button onClick={handleResetPassword} className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm">
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
