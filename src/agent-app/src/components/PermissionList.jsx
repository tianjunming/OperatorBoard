import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

function PermissionList() {
  const { token, hasPermission } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canList = hasPermission('system:permission:list');

  useEffect(() => {
    if (canList) {
      fetchPermissions();
    }
  }, [canList]);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/permissions/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.items || []);
      } else {
        throw new Error('Failed to fetch permissions');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!canList) {
    return <div className="permission-denied">You don't have permission to view permissions.</div>;
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Build tree structure
  const permissionMap = {};
  const rootPermissions = [];

  permissions.forEach(perm => {
    permissionMap[perm.id] = { ...perm, children: [] };
  });

  permissions.forEach(perm => {
    if (perm.parent_id === 0 || perm.parent_id === null) {
      rootPermissions.push(permissionMap[perm.id]);
    } else if (permissionMap[perm.parent_id]) {
      permissionMap[perm.parent_id].children.push(permissionMap[perm.id]);
    }
  });

  const renderPermission = (perm, level = 0) => (
    <React.Fragment key={perm.id}>
      <tr style={{ paddingLeft: level * 20 }}>
        <td style={{ paddingLeft: level * 20 }}>{perm.permission_code}</td>
        <td>{perm.permission_name}</td>
        <td>{perm.permission_type}</td>
        <td>{perm.resource_path || '-'}</td>
        <td>{perm.sort_order}</td>
      </tr>
      {perm.children && perm.children.map(child => renderPermission(child, level + 1))}
    </React.Fragment>
  );

  return (
    <div className="permission-list">
      <div className="management-header">
        <h3>权限列表</h3>
      </div>

      {error && <div className="error-message">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>权限代码</th>
            <th>权限名称</th>
            <th>类型</th>
            <th>资源路径</th>
            <th>排序</th>
          </tr>
        </thead>
        <tbody>
          {rootPermissions.map(perm => renderPermission(perm))}
        </tbody>
      </table>
    </div>
  );
}

export default PermissionList;
