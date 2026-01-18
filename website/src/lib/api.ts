const API_BASE_URL = import.meta.env.VITE_API_URL;

interface ApiError {
  error: boolean;
  message: string;
  code: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (token && expiry) {
      const expiryTime = parseInt(expiry);
      if (Date.now() < expiryTime) {
        this.token = token;
        this.tokenExpiry = expiryTime;
      } else {
        // Token expired, clear it
        this.clearToken();
      }
    }
  }

  setToken(token: string | null, expiresInDays: number = 30) {
    this.token = token;
    if (token) {
      const expiry = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
      this.tokenExpiry = expiry;
      localStorage.setItem('token', token);
      localStorage.setItem('tokenExpiry', expiry.toString());
    } else {
      this.clearToken();
    }
  }

  // Refresh session expiry on activity (extends to 30 days from now)
  refreshSessionExpiry() {
    if (this.token) {
      const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
      this.tokenExpiry = expiry;
      localStorage.setItem('tokenExpiry', expiry.toString());
    }
  }

  private clearToken() {
    this.token = null;
    this.tokenExpiry = null;
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  }

  getToken() {
    if (this.token && this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      this.clearToken();
      return null;
    }
    return this.token;
  }

  isTokenValid() {
    return this.token !== null && this.tokenExpiry !== null && Date.now() < this.tokenExpiry;
  }

  getCachedUserRole() {
    return localStorage.getItem('userRole');
  }

  getCachedUserId() {
    return localStorage.getItem('userId');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw data as ApiError;
    }

    return data as T;
  }

  // Auth endpoints
  async login(emailOrPhone: string, password: string) {
    const data = await this.request<{
      user: any;
      token: string;
      refreshToken: string;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    });
    
    // Store token for 30 days
    this.setToken(data.token, 30);
    
    // Store refresh token with expiry (60 days)
    const refreshExpiry = Date.now() + (60 * 24 * 60 * 60 * 1000);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('refreshTokenExpiry', refreshExpiry.toString());
    
    // Store minimal user info (only for UI display, not as source of truth)
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('userId', data.user.id);
    
    return data;
  }

  async getCurrentUser() {
    return this.request<any>('/api/auth/me');
  }

  async refreshTokenRequest(refreshToken: string) {
    const data = await this.request<{ token: string; refreshToken: string }>(
      '/api/auth/refresh-token',
      {
        method: 'POST',
        body: JSON.stringify({ token: refreshToken }),
      }
    );
    
    // Update token with new 30-day expiry
    this.setToken(data.token, 30);
    
    const refreshExpiry = Date.now() + (60 * 24 * 60 * 60 * 1000);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('refreshTokenExpiry', refreshExpiry.toString());
    
    return data;
  }

  async autoRefreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const refreshExpiry = localStorage.getItem('refreshTokenExpiry');
    
    if (!refreshToken || !refreshExpiry) {
      return false;
    }
    
    // Check if refresh token is still valid
    if (Date.now() >= parseInt(refreshExpiry)) {
      this.logout();
      return false;
    }
    
    try {
      await this.refreshTokenRequest(refreshToken);
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  async resetPassword(token: string, password: string) {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  async healthCheck() {
    return this.request<{ status: string; message: string }>('/health');
  }

  // Admin endpoints
  async getDashboard() {
    return this.request<{
      totalOrders: number;
      pendingOrders: number;
      deliveredOrders: number;
      totalRevenue: number;
      totalDeliveryBoys: number;
    }>('/api/admin/dashboard');
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      users: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/users?${query}`);
  }

  async createAdmin(name: string, phone: string) {
    return this.request<any>('/api/admin/users/admin', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    });
  }

  async deleteUser(userId: string) {
    return this.request<{ message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async createOrder(orderData: {
    customerName: string;
    customerPhone: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    deliveryAddress: {
      addressLine: string;
      city: string;
    };
    totalAmount: number;
    paymentMode: string;
  }) {
    console.log('API: Creating order with data:', orderData);
    console.log('API: Using base URL:', this.baseUrl);
    console.log('API: Token available:', !!this.token);
    
    try {
      const result = await this.request<any>('/api/admin/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      console.log('API: Order created successfully:', result);
      return result;
    } catch (error) {
      console.error('API: Create order failed:', error);
      throw error;
    }
  }

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      orders: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/orders?${query}`);
  }

  async getOrder(orderId: string) {
    return this.request<any>(`/api/admin/orders/${orderId}`);
  }

  async getOrderById(id: string) {
    return this.request<any>(`/api/admin/orders/by-id/${id}`);
  }

  async updateOrder(id: string, orderData: {
    customerName?: string;
    customerPhone?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    deliveryAddress?: { addressLine: string; city: string };
    totalAmount?: number;
    paymentMode?: string;
  }) {
    return this.request<any>(`/api/admin/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  }

  async deleteOrder(id: string) {
    return this.request<{ message: string }>(`/api/admin/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async updatePaymentStatus(
    orderId: string,
    data: {
      paymentStatus: string;
      actualPaymentMethod?: string;
      notes?: string;
    }
  ) {
    return this.request<any>(`/api/admin/orders/${orderId}/payment-status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async assignOrder(orderId: string, deliveryBoyId: string) {
    return this.request<any>(`/api/admin/orders/${orderId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ deliveryBoyId }),
    });
  }

  async getDeliveryBoys(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      deliveryBoys: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/delivery-boys?${query}`);
  }

  async createDeliveryBoy(name: string, phone: string) {
    return this.request<any>('/api/admin/delivery-boys', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    });
  }

  async updateDeliveryBoy(deliveryBoyId: string, data: any) {
    return this.request<any>(`/api/admin/delivery-boys/${deliveryBoyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryBoy(deliveryBoyId: string) {
    return this.request<{ message: string }>(
      `/api/admin/delivery-boys/${deliveryBoyId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Request location from all drivers via push notification
  async requestDriverLocations() {
    return this.request<{ message: string; sent: number; total: number }>(
      '/api/admin/request-locations',
      {
        method: 'POST',
      }
    );
  }

  async getLeaderboard(period?: string) {
    const query = period ? `?period=${period}` : '';
    return this.request<{ leaderboard: any[] }>(
      `/api/admin/leaderboard${query}`
    );
  }

  async getRevenue(period?: string) {
    const query = period ? `?period=${period}` : '';
    return this.request<{
      totalRevenue: number;
      period: string;
      paymentMethods: any;
      chartData: any[];
    }>(`/api/admin/revenue${query}`);
  }

  async getTransactions(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      transactions: any[];
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/transactions?${query}`);
  }

  async getHistory(params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    deliveryBoyId?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      orders: any[];
      total: number;
      totalRevenue: number;
      page: number;
      limit: number;
    }>(`/api/admin/history?${query}`);
  }

  async searchAddresses(query: string) {
    return this.request<{ addresses: string[] }>(`/api/admin/addresses/search?q=${encodeURIComponent(query)}`);
  }

  async saveAddress(address: string) {
    return this.request<{ saved: boolean }>('/api/admin/addresses', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  }

  async getAddresses(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{
      addresses: Array<{
        _id: string;
        address: string;
        usageCount: number;
        createdAt: string;
      }>;
    }>(`/api/admin/addresses${query}`);
  }

  async updateAddress(id: string, address: string) {
    return this.request<{ address: any }>(`/api/admin/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ address }),
    });
  }

  async deleteAddress(id: string) {
    return this.request<{ message: string }>(`/api/admin/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer autocomplete
  async searchCustomers(query: string) {
    return this.request<{ customers: Array<{
      _id: string;
      name: string;
      phone: string;
      houseFlatNumber: string;
      address: string;
      orderCount: number;
    }> }>(`/api/admin/customers/search?q=${encodeURIComponent(query)}`);
  }

  async getCustomers(params?: { page?: number; limit?: number; search?: string }) {
    // Filter out undefined values
    const cleanParams: Record<string, string> = {};
    if (params?.page) cleanParams.page = String(params.page);
    if (params?.limit) cleanParams.limit = String(params.limit);
    if (params?.search) cleanParams.search = params.search;
    
    const query = new URLSearchParams(cleanParams).toString();
    return this.request<{
      customers: Array<{
        _id: string;
        name: string;
        phone: string;
        houseFlatNumber: string;
        address: string;
        orderCount: number;
        lastOrderAt: string;
        createdAt: string;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/api/admin/customers${query ? `?${query}` : ''}`);
  }

  async saveCustomer(data: { name: string; phone: string; houseFlatNumber?: string; address?: string }) {
    return this.request<{ saved: boolean }>('/api/admin/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(customerId: string, data: { name?: string; phone?: string; houseFlatNumber?: string; address?: string }) {
    return this.request<{ customer: any }>(`/api/admin/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(customerId: string) {
    return this.request<{ message: string }>(`/api/admin/customers/${customerId}`, {
      method: 'DELETE',
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async syncToSheet(date?: string) {
    return this.request<{
      message: string;
      ordersCount: number;
      rowsAdded?: number;
      synced: boolean;
    }>('/api/admin/sync-to-sheet', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async deleteAllData() {
    return this.request<{
      message: string;
      deleted: {
        orders: number;
        transactions: number;
      };
    }>('/api/admin/delete-all-data', {
      method: 'DELETE',
      body: JSON.stringify({ confirmDelete: 'DELETE_ALL_DATA' }),
    });
  }

  // Debug: Get driver FCM and location status
  async getDriversStatus() {
    return this.request<{
      totalDrivers: number;
      withFcmToken: number;
      withLocation: number;
      drivers: Array<{
        name: string;
        phone: string;
        status: string;
        hasFcmToken: boolean;
        fcmTokenPreview: string | null;
        hasLocation: boolean;
        lastLocation: {
          lat: number;
          lng: number;
          updatedAt: string;
          ageMinutes: number;
        } | null;
      }>;
    }>('/api/admin/drivers-status');
  }

  // Notes API
  async getNotes(params?: { type?: string; resolved?: boolean }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      notes: Array<{
        _id: string;
        title: string;
        content: string;
        type: string;
        amount: number;
        personName: string;
        isResolved: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/api/admin/notes?${query}`);
  }

  async createNote(data: { title: string; content?: string; type?: string; amount?: number; personName?: string }) {
    return this.request<{ note: any }>('/api/admin/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: { title?: string; content?: string; type?: string; amount?: number; personName?: string; isResolved?: boolean }) {
    return this.request<{ note: any }>(`/api/admin/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string) {
    return this.request<{ message: string }>(`/api/admin/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Products API
  async getProducts(params?: { search?: string; active?: boolean }) {
    // Filter out undefined values
    const cleanParams: Record<string, string> = {};
    if (params?.search) cleanParams.search = params.search;
    if (params?.active !== undefined) cleanParams.active = String(params.active);
    
    const query = new URLSearchParams(cleanParams).toString();
    return this.request<{
      products: Array<{
        _id: string;
        product_id: string;
        name: string;
        price_per_kg: number;
        is_active: boolean;
        createdAt: string;
      }>;
    }>(`/api/admin/products${query ? `?${query}` : ''}`);
  }

  async searchProducts(query: string) {
    return this.request<{
      products: Array<{
        _id: string;
        product_id: string;
        name: string;
        price_per_kg: number;
      }>;
    }>(`/api/admin/products/search?q=${encodeURIComponent(query)}`);
  }

  async createProduct(data: { product_id: string; name: string; price_per_kg: number }) {
    return this.request<{ product: any }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: { name?: string; price_per_kg?: number; is_active?: boolean }) {
    return this.request<{ product: any }>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ message: string }>(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Barcode Scanning API
  async scanBarcode(barcode: string) {
    return this.request<{
      product_id: string;
      product_name: string;
      weight_grams: number;
      weight_kg: number;
      price_per_kg: number;
      total_price: number;
      scan_id: string;
    }>('/api/admin/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    });
  }

  logout() {
    this.clearToken();
  }
}

export const api = new ApiClient(API_BASE_URL);
