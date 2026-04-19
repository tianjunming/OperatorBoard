import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Check, X, UserCheck, Clock } from 'lucide-react';

function PendingApprovals() {
  const { token, hasPermission, isSuperuser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const canApprove = isSuperuser;

  useEffect(() => {
    if (canApprove) {
      fetchPendingUsers();
    }
  }, [canApprove]);

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/approvals/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.items || []);
      } else {
        throw new Error('Failed to fetch pending users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!confirm('确定要批准该用户吗？批准后用户即可登录。')) return;

    try {
      const response = await fetch(`${API_BASE}/auth/approvals/approve/${userId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '批准失败');
      }

      fetchPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRejectClick = (user) => {
    setRejectingUser(user);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;

    try {
      const response = await fetch(`${API_BASE}/auth/approvals/reject/${rejectingUser.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '拒绝失败');
      }

      setShowRejectModal(false);
      setRejectingUser(null);
      fetchPendingUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!canApprove) {
    return <div className="permission-denied">您没有权限访问此页面。</div>;
  }

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="pending-approvals">
      <div className="management-header">
        <h3>注册审批</h3>
        <span className="pending-count">
          待审批: {pendingUsers.length} 人
        </span>
      </div>

      {error && <div className="error-message">{error}</div>}

      {pendingUsers.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} />
          <p>暂无待审批的用户</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>姓名</th>
              <th>邮箱</th>
              <th>注册时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.full_name || '-'}</td>
                <td>{user.email || '-'}</td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}</td>
                <td>
                  <span className="status-badge status-pending">
                    <Clock size={14} /> 待审批
                  </span>
                </td>
                <td>
                  <button
                    className="btn-small btn-success"
                    onClick={() => handleApprove(user.id)}
                    title="批准"
                  >
                    <Check size={14} /> 批准
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleRejectClick(user)}
                    title="拒绝"
                  >
                    <X size={14} /> 拒绝
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>拒绝用户注册</h4>
            <p>确定要拒绝用户 <strong>{rejectingUser?.username}</strong> 的注册申请吗？</p>
            <div className="form-group">
              <label>拒绝原因（可选）</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                rows={3}
                style={{ width: '100%', padding: '8px', marginTop: '8px' }}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleRejectConfirm}
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;
