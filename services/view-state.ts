// 视图状态管理服务
// 用于在不同页面之间保持视图模式（卡片/列表）的一致性

// 视图模式类型
export type ViewMode = 'card' | 'list' | 'group';

// 页面类型
export type PageType = 'dashboard' | 'server-management';

// 从localStorage获取视图模式
export function getViewMode(pageType: PageType): ViewMode {
  if (typeof window === 'undefined') {
    // 服务器端渲染时返回默认值
    return pageType === 'dashboard' ? 'card' : 'card';
  }
  
  const storedValue = localStorage.getItem(`${pageType}-view-mode`);
  if (!storedValue) {
    // 如果没有存储值，返回默认值
    return pageType === 'dashboard' ? 'card' : 'card';
  }
  
  return storedValue as ViewMode;
}

// 保存视图模式到localStorage
export function saveViewMode(pageType: PageType, viewMode: ViewMode): void {
  if (typeof window === 'undefined') {
    return; // 服务器端渲染时不执行
  }
  
  localStorage.setItem(`${pageType}-view-mode`, viewMode);
}
