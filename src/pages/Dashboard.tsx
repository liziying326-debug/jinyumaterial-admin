import React, { useState, useEffect } from 'react';
import { Package, Layers, Newspaper, Eye, TrendingUp, Users, MessageSquare, CheckCircle, Clock, ChevronRight, X, Phone, Mail, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Stats {
  products: number;
  categories: number;
  news: number;
  contacts: number;
  unreadContacts: number;
  todayContacts: number;
  todayVisits: number;
  monthlyVisits: { name: string; visits: number; inquiries: number }[];
  weeklyVisits: { name: string; visits: number }[];
}

interface Contact {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
  subject?: string;
  product?: string;
  message: string;
  date: string;
  isRead?: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inquiryTab, setInquiryTab] = useState<'unread' | 'read'>('unread');
  const [selectedInquiry, setSelectedInquiry] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statsRes, contactsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/contacts'),
      ]);
      const statsData = await statsRes.json();
      const contactsData = await contactsRes.json();
      setStats(statsData);
      // contacts 按日期倒序排列
      const sorted = (Array.isArray(contactsData) ? contactsData : []).sort(
        (a: Contact, b: Contact) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setContacts(sorted);
    } catch (e) {
      console.error('Dashboard fetchData error:', e);
    } finally {
      setLoading(false);
    }
  }

  // 标记已读
  async function markAsRead(contact: Contact) {
    try {
      await fetch(`/api/contacts/${contact.id}/read`, { method: 'PATCH' });
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, isRead: true } : c));
      if (selectedInquiry?.id === contact.id) {
        setSelectedInquiry({ ...contact, isRead: true });
      }
    } catch (e) {
      // 如果接口不存在，静默处理
    }
  }

  const filteredContacts = contacts.filter(c =>
    inquiryTab === 'unread' ? !c.isRead : c.isRead
  );
  const unreadCount = contacts.filter(c => !c.isRead).length;
  const readCount = contacts.filter(c => c.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">控制台总览</h1>
        <p className="text-sm text-gray-500 mt-1">欢迎回来，这里是金昱广告材料独立站的实时数据概览。</p>
      </div>

      {/* 统计卡片 - 全部读取真实数据 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总产品数"
          value={String(stats?.products ?? '—')}
          sub={`共 ${stats?.categories ?? 0} 个分类`}
          icon={Package}
          color="bg-blue-600"
        />
        <StatCard
          title="新闻文章"
          value={String(stats?.news ?? '—')}
          sub="篇已发布"
          icon={Newspaper}
          color="bg-indigo-600"
        />
        <StatCard
          title="收到询盘"
          value={String(stats?.contacts ?? '—')}
          sub={`${unreadCount} 条未读`}
          icon={MessageSquare}
          color="bg-purple-600"
          highlight={unreadCount > 0}
        />
        <StatCard
          title="今日访问"
          value={stats?.todayVisits ? stats.todayVisits.toLocaleString() : '0'}
          sub="来自前台网站"
          icon={Eye}
          color="bg-emerald-600"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 月度访问量 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">访问与询盘统计</h2>
              <p className="text-xs text-gray-400 mt-0.5">最近 6 个月真实数据</p>
            </div>
          </div>
          <div className="h-72">
            {stats?.monthlyVisits && stats.monthlyVisits.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyVisits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="visits" name="访问量" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="inquiries" name="询盘量" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm flex-col gap-2">
                <Eye className="w-8 h-8 opacity-30" />
                <span>暂无访问统计数据</span>
                <span className="text-xs text-gray-300">前台访问后将自动记录</span>
              </div>
            )}
          </div>
        </div>

        {/* 近7天访问 */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">本周访问趋势</h2>
            <p className="text-xs text-gray-400 mt-0.5">最近 7 天真实数据</p>
          </div>
          <div className="h-72">
            {stats?.weeklyVisits && stats.weeklyVisits.some(d => d.visits > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyVisits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="visits" name="访问量" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm flex-col gap-2">
                <TrendingUp className="w-8 h-8 opacity-30" />
                <span>本周暂无访问记录</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 咨询记录 - 真实数据 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              客户询盘记录
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-1">来自独立站 Contact 页面的真实询盘，共 {contacts.length} 条。</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setInquiryTab('unread')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center ${inquiryTab === 'unread' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              未读 ({unreadCount})
            </button>
            <button
              onClick={() => setInquiryTab('read')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center ${inquiryTab === 'read' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              已读 ({readCount})
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredContacts.length > 0 ? (
            filteredContacts.slice(0, 10).map(contact => (
              <div key={contact.id} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{contact.name || '匿名'}</span>
                    {contact.company && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{contact.company}</span>
                    )}
                    {contact.country && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center">
                        <Globe className="w-3 h-3 mr-1" />{contact.country}
                      </span>
                    )}
                    {!contact.isRead && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="未读" />}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1 mb-2">{contact.message}</p>
                  <div className="flex items-center text-xs text-gray-400 gap-4 flex-wrap">
                    {contact.email && (
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{contact.email}</span>
                    )}
                    {contact.subject && (
                      <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{contact.subject}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{contact.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setSelectedInquiry(contact); markAsRead(contact); }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    查看详情 <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <MessageSquare className="w-10 h-10 text-gray-200" />
              <p className="text-gray-400 text-sm">暂无{inquiryTab === 'unread' ? '未读' : '已读'}询盘记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 咨询详情弹窗 */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">询盘详情</h3>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">客户姓名</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedInquiry.name || '未填写'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">联系邮箱</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedInquiry.email || '未填写'}</p>
                </div>
                {selectedInquiry.phone && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">联系电话</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedInquiry.phone}</p>
                  </div>
                )}
                {selectedInquiry.company && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">公司名称</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedInquiry.company}</p>
                  </div>
                )}
                {selectedInquiry.country && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">所在国家</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedInquiry.country}</p>
                  </div>
                )}
                {selectedInquiry.subject && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">主题</p>
                    <p className="text-sm font-semibold text-indigo-600">{selectedInquiry.subject}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">询盘时间</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedInquiry.date}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">留言内容</p>
                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-gray-100 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedInquiry(null)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                关闭
              </button>
              {selectedInquiry.email && (
                <a
                  href={`mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject || 'Your inquiry'}`}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  回复邮件
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title, value, sub, icon: Icon, color, highlight
}: {
  title: string; value: string; sub: string; icon: any; color: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${highlight ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className="text-gray-400">{sub}</span>
      </div>
    </div>
  );
}
