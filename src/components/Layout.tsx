import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Package, Layers, Briefcase,
  Image as ImageIcon, Building2, Newspaper, Menu, Bell, Search,
  Languages, HelpCircle, LogOut, UserCog, X, ArrowRight, Share2
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: string;
  onLogout: () => void;
  onGlobalSearch: (query: string) => void;
  searchResults: { tab: string; label: string; module: string; icon: string }[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab, currentUser, onLogout, onGlobalSearch, searchResults, searchQuery, onSearchQueryChange }: LayoutProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 获取未读询盘数量
  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, []);

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setUnreadCount(list.filter((c: any) => !c.isRead).length);
    } catch {}
  }

  const navItems = [
    { id: 'dashboard', label: '控制台', icon: LayoutDashboard },
    { id: 'global-lang', label: '全局多语言', icon: Languages },
    { id: 'products', label: '产品管理', icon: Package },
    { id: 'categories', label: '产品分类', icon: Layers },
    { id: 'cases', label: '案例管理', icon: Briefcase },
    { id: 'scenarios', label: '应用场景', icon: ImageIcon },
    { id: 'news', label: '新闻管理', icon: Newspaper },
    { id: 'faq', label: 'FAQ管理', icon: HelpCircle },
    { id: 'company', label: '公司介绍', icon: Building2 },
    { id: 'social-links', label: '社交媒体', icon: Share2 },
  ];

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换页面时关闭搜索
  useEffect(() => {
    setShowSearch(false);
  }, [activeTab]);

  // 关闭移动端侧边栏
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  // 点击菜单项 → 跳转 + 关闭侧边栏
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    closeMobileSidebar();
  };

  // ESC 关闭移动侧边栏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        closeMobileSidebar();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileSidebarOpen]);

  // 防止滚动穿透（移动侧边栏打开时）
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  const handleResultClick = (tab: string) => {
    setActiveTab(tab);
    onSearchQueryChange('');
    onGlobalSearch('');
    setShowSearch(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* =====================
          Mobile Sidebar Overlay
          ===================== */}
      {/* Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 transition-opacity duration-300"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar — PC端固定显示，移动端可折叠 */}
      <aside
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg
          transform transition-transform duration-300 ease-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-lg">J</span>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">金昱广告材料</span>
          {/* 关闭按钮 — 仅移动端显示 */}
          <button
            onClick={closeMobileSidebar}
            className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            管理菜单
          </div>
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.label}
                  </button>
                </li>
              );
            })}
            <li className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => handleNavClick('account')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'account'
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <UserCog className={`w-5 h-5 mr-3 flex-shrink-0 ${activeTab === 'account' ? 'text-blue-600' : 'text-gray-400'}`} />
                账号管理
              </button>
            </li>
          </ul>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold border border-blue-200 flex-shrink-0">
                {currentUser.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser}</p>
                <p className="text-xs text-gray-500">超级管理员</p>
              </div>
            </div>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="退出登录">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* =====================
          Main Content Area
          ===================== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 md:ml-64">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-0 flex-shrink-0">
          <div className="flex items-center text-gray-500">
            {/* 汉堡按钮 — 仅移动端显示 */}
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 mr-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              aria-label="打开菜单"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* 搜索框 */}
            <div className="relative" ref={searchRef}>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  onSearchQueryChange(q);
                  onGlobalSearch(q);
                }}
                onFocus={() => {
                  setShowSearch(true);
                  if (searchQuery.trim()) onGlobalSearch(searchQuery);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleResultClick(searchResults[0].tab);
                  }
                  if (e.key === 'Escape') {
                    onSearchQueryChange('');
                    onGlobalSearch('');
                    setShowSearch(false);
                  }
                }}
                placeholder="搜索产品、分类、案例、新闻..."
                className="pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all w-48 md:w-72"
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchQueryChange(''); onGlobalSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* 搜索结果下拉 */}
              {showSearch && searchQuery.trim() && (
                <div className="absolute top-full left-0 mt-2 w-[90vw] md:w-[420px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <>
                      <div className="px-4 py-2.5 text-xs text-gray-400 font-medium border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                        找到 {searchResults.length} 个结果 · 按 Enter 跳转第一个
                      </div>
                      {searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleResultClick(result.tab)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center min-w-0">
                            <span className="text-blue-500 mr-3 text-base flex-shrink-0">{result.icon}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{result.label}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{result.module}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-400">
                      <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">未找到匹配结果</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 通知 */}
          <div className="flex items-center">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-gray-400 hover:text-gray-600 relative transition-colors"
              title={`${unreadCount} 条未读询盘`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="absolute top-0 right-0 w-2 h-2 bg-gray-300 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
