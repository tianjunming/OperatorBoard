import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import PermissionList from './PermissionList';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>系统管理</h2>
        <div className="admin-user-info">
          <span>欢迎, {user?.full_name || user?.username}</span>
          <button className="btn-small" onClick={logout}>
            退出登录
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          用户管理
        </button>
        <button
          className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          角色管理
        </button>
        <button
          className={`admin-tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          权限管理
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'roles' && <RoleManagement />}
        {activeTab === 'permissions' && <PermissionList />}
      </div>
    </div>
  );
}

export default AdminDashboard;
