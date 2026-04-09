import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

function RoleManagement() {
  const { token, hasPermission } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    role_code: '',
    role_name: '',
    description: '',
    permission_ids: [],
  });

  const canList = hasPermission('system:role:list');
  const canCreate = hasPermission('system:role:create');
  const canUpdate = hasPermission('system:role:update');
  const canDelete = hasPermission('system:role:delete');
  const canAssignPermissions = hasPermission('system:role:assign-permissions');

  useEffect(() => {
    if (canList) {
      fetchRoles();
      fetchPermissions();
    }
  }, [canList]);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.items || []);
      } else {
        throw new Error('Failed to fetch roles');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/permissions/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      role_code: '',
      role_name: '',
      description: '',
      permission_ids: [],
    });
    setShowModal(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      role_code: role.role_code,
      role_name: role.role_name,
      description: role.description || '',
      permission_ids: role.permissions ? role.permissions.map(p => p.id) : [],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingRole
        ? `${API_BASE}/roles/${editingRole.id}`
        : `${API_BASE}/roles`;
      const method = editingRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Operation failed');
      }

      setShowModal(false);
      fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`${API_BASE}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete role');
      }

      fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignPermissions = async (roleId, currentPermissions) => {
    const permIds = prompt(
      'Enter permission IDs separated by commas (available IDs: ' +
      permissions.map(p => `${p.id}=${p.permission_code}`).join(', ') + '):'
    );

    if (!permIds) return;

    try {
      const response = await fetch(`${API_BASE}/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permission_ids: permIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign permissions');
      }

      fetchRoles();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!canList) {
    return <div className="permission-denied">You don't have permission to view roles.</div>;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="role-management">
      <div className="management-header">
        <h3>角色管理</h3>
        {canCreate && (
          <button className="btn-primary" onClick={handleCreate}>
            创建角色
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>角色代码</th>
            <th>角色名称</th>
            <th>描述</th>
            <th>权限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {roles.map(role => (
            <tr key={role.id}>
              <td>{role.id}</td>
              <td>{role.role_code}</td>
              <td>{role.role_name}</td>
              <td>{role.description || '-'}</td>
              <td>
                {role.permissions && role.permissions.length > 0
                  ? role.permissions.map(p => p.permission_name).join(', ')
                  : '-'}
              </td>
              <td>
                {canUpdate && (
                  <button className="btn-small" onClick={() => handleEdit(role)}>
                    编辑
                  </button>
                )}
                {canAssignPermissions && (
                  <button
                    className="btn-small"
                    onClick={() => handleAssignPermissions(role.id, role.permissions)}
                  >
                    分配权限
                  </button>
                )}
                {canDelete && role.role_code !== 'admin' && (
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDelete(role.id)}
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
            <h4>{editingRole ? '编辑角色' : '创建角色'}</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>角色代码</label>
                <input
                  type="text"
                  value={formData.role_code}
                  onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                  required
                  disabled={!!editingRole}
                />
              </div>

              <div className="form-group">
                <label>角色名称</label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>权限</label>
                <select
                  multiple
                  value={formData.permission_ids}
                  onChange={(e) => setFormData({
                    ...formData,
                    permission_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value))
                  })}
                  style={{ height: '150px' }}
                >
                  {permissions.map(perm => (
                    <option key={perm.id} value={perm.id}>
                      {perm.permission_name} ({perm.permission_code})
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

export default RoleManagement;
