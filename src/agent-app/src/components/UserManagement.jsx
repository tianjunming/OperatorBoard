import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

function UserManagement() {
  const { token, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    is_active: true,
    role_ids: [],
  });

  const canList = hasPermission('system:user:list');
  const canCreate = hasPermission('system:user:create');
  const canUpdate = hasPermission('system:user:update');
  const canDelete = hasPermission('system:user:delete');
  const canAssignRoles = hasPermission('system:user:assign-roles');

  useEffect(() => {
    if (canList) {
      fetchUsers();
      fetchRoles();
    }
  }, [canList]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.items || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      is_active: true,
      role_ids: [],
    });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      full_name: user.full_name || '',
      is_active: user.is_active,
      role_ids: user.roles ? user.roles.map(r => r.id) : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingUser
        ? `${API_BASE}/users/${editingUser.id}`
        : `${API_BASE}/users`;
      const method = editingUser ? 'PUT' : 'POST';

      const body = { ...formData };
      if (!body.password) {
        delete body.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Operation failed');
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignRoles = async (userId, currentRoles) => {
    const roleIds = prompt(
      'Enter role IDs separated by commas (available IDs: ' +
      roles.map(r => `${r.id}=${r.role_code}`).join(', ') + '):'
    );

    if (!roleIds) return;

    try {
      const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_ids: roleIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign roles');
      }

      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!canList) {
    return <div className="permission-denied">You don't have permission to view users.</div>;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="user-management">
      <div className="management-header">
        <h3>用户管理</h3>
        {canCreate && (
          <button className="btn-primary" onClick={handleCreate}>
            创建用户
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>全名</th>
            <th>邮箱</th>
            <th>激活</th>
            <th>超级管理员</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.full_name || '-'}</td>
              <td>{user.email || '-'}</td>
              <td>{user.is_active ? '是' : '否'}</td>
              <td>{user.is_superuser ? '是' : '否'}</td>
              <td>{user.roles ? user.roles.map(r => r.role_name).join(', ') : '-'}</td>
              <td>
                {canUpdate && (
                  <button className="btn-small" onClick={() => handleEdit(user)}>
                    编辑
                  </button>
                )}
                {canAssignRoles && (
                  <button
                    className="btn-small"
                    onClick={() => handleAssignRoles(user.id, user.roles)}
                  >
                    分配角色
                  </button>
                )}
                {canDelete && (
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(user.id)}
                  >
                    删除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>{editingUser ? '编辑用户' : '创建用户'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required={!editingUser}
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                </div>
              )}

              <div className="form-group">
                <label>全名</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  激活
                </label>
              </div>

              <div className="form-group">
                <label>角色</label>
                <select
                  multiple
                  value={formData.role_ids}
                  onChange={(e) => setFormData({
                    ...formData,
                    role_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value))
                  })}
                  style={{ height: '100px' }}
                >
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.role_name} ({role.role_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
