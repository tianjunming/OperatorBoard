import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

export function useAuthAPI() {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = async (url, options = {}) => {
    setLoading(true);
    setError(null);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Request failed');
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { request, loading, error };
}

// ============== Auth API ==============

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  return await response.json();
}

export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return await response.json();
}

export async function refreshToken(refreshToken) {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  return await response.json();
}

// ============== User API ==============

export async function getUsers(token) {
  const response = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return await response.json();
}

export async function createUser(token, data) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create user');
  }

  return await response.json();
}

export async function updateUser(token, id, data) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user');
  }

  return await response.json();
}

export async function deleteUser(token, id) {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }

  return await response.json();
}

export async function assignUserRoles(token, userId, roleIds) {
  const response = await fetch(`${API_BASE}/users/${userId}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role_ids: roleIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to assign roles');
  }

  return await response.json();
}

// ============== Role API ==============

export async function getRoles(token) {
  const response = await fetch(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }

  return await response.json();
}

export async function createRole(token, data) {
  const response = await fetch(`${API_BASE}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create role');
  }

  return await response.json();
}

export async function updateRole(token, id, data) {
  const response = await fetch(`${API_BASE}/roles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update role');
  }

  return await response.json();
}

export async function deleteRole(token, id) {
  const response = await fetch(`${API_BASE}/roles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to delete role');
  }

  return await response.json();
}

export async function getRolePermissions(token, roleId) {
  const response = await fetch(`${API_BASE}/roles/${roleId}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch role permissions');
  }

  return await response.json();
}

export async function assignRolePermissions(token, roleId, permissionIds) {
  const response = await fetch(`${API_BASE}/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ permission_ids: permissionIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to assign permissions');
  }

  return await response.json();
}

// ============== Permission API ==============

export async function getPermissions(token) {
  const response = await fetch(`${API_BASE}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch permissions');
  }

  return await response.json();
}

export async function getPermissionTree(token) {
  const response = await fetch(`${API_BASE}/permissions/tree`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch permission tree');
  }

  return await response.json();
}

// ============== Original API functions (unchanged) ==============

const API_BASE_ORIG = '/api';

export async function sendMessage(message, options = {}) {
  const { onChunk, onComplete, onError, locale = 'zh' } = options;

  try {
    const response = await fetch(`${API_BASE_ORIG}/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Locale': locale,
      },
      body: JSON.stringify({
        input: message,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            onComplete?.();
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk?.(parsed.content);
            }
          } catch {
            if (data) {
              onChunk?.(data);
            }
          }
        } else if (line.trim()) {
          onChunk?.(line);
        }
      }
    }
  } catch (error) {
    onError?.(error.message || 'Failed to connect to agent');
  }
}

export async function fetchAgentStatus() {
  try {
    const response = await fetch(`${API_BASE_ORIG}/agent/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return await response.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

export async function fetchCapabilities() {
  try {
    const response = await fetch(`${API_BASE_ORIG}/agent/capabilities`);
    if (!response.ok) {
      throw new Error('Failed to fetch capabilities');
    }
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

// ============== Band Indicator API ==============

export async function fetchBandIndicator(params) {
  const query = new URLSearchParams();
  if (params.operatorId) query.append('operatorId', params.operatorId);
  if (params.operatorName) query.append('operatorName', params.operatorName);
  if (params.band) query.append('band', params.band);
  if (params.networkType) query.append('networkType', params.networkType);

  const response = await fetch(`${API_BASE_ORIG}/nl2sql/indicators/band?${query}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch band indicator');
  }

  return await response.json();
}

// ============== Operator Metrics API ==============

export async function fetchOperatorMetrics(params) {
  const query = new URLSearchParams();
  if (params.operatorId) query.append('operatorId', params.operatorId);
  if (params.operatorName) query.append('operatorName', params.operatorName);
  if (params.dataMonth) query.append('dataMonth', params.dataMonth);

  const response = await fetch(`${API_BASE_ORIG}/nl2sql/indicators/metrics?${query}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch operator metrics');
  }

  return await response.json();
}
