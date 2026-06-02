const api = {
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Base headers
    const headers = {
      ...options.headers,
    };

    // If body is NOT FormData, default to application/json
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method: options.method || 'GET',
      headers,
      ...options,
    };

    // Handle body serialization correctly
    if (options.body) {
      config.body = options.body instanceof FormData ? options.body : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle Rate Limiting (Too Many Requests)
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again after a few minutes.');
        }

        // If expired or unauthorized, try refresh token once
        if (response.status === 401 && !options._retry && localStorage.getItem('refreshToken')) {
          options._retry = true;
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            // Re-call original request with new token
            return this.request(endpoint, options);
          }
        }
        
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err.message);
      throw err;
    }
  },

  async refreshTokens() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        return true;
      } else {
        this.clearAuth();
        return false;
      }
    } catch (e) {
      this.clearAuth();
      return false;
    }
  },

  clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
};

export default api;
