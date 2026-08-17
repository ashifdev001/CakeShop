/**
 * api.js
 * Central Live API Client for CakeShop
 * Handles all async communication with Core PHP backend.
 * Zero LocalStorage or static JSON dependency.
 */

window.CakeApi = (function () {

    const BASE_URL = 'api/';

    // Generic Request Helper
    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const defaultHeaders = {
            'Accept': 'application/json'
        };

        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (response.status === 401) {
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = 'login.html';
                }
                return { success: false, message: data.message || 'Unauthorized access' };
            }

            return data;
        } catch (error) {
            console.error(`API Request Error [${endpoint}]:`, error);
            return {
                success: false,
                message: 'Network error or server unreachable. Please check your connection.'
            };
        }
    }

    // Format Currency (INR)
    function formatMoney(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    // Format Date to YYYY-MM-DD
    function formatDateStr(dateObj = new Date()) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return {
        formatMoney,
        formatDateStr,

        // Auth Endpoints
        auth: {
            login: (username, password) => request('auth.php?action=login', {
                method: 'POST',
                body: { username, password }
            }),
            check: () => request('auth.php?action=check', { method: 'GET' }),
            logout: () => request('auth.php?action=logout', { method: 'POST' })
        },

        // Settings Endpoints
        settings: {
            get: () => request('settings.php?action=get', { method: 'GET' }),
            update: (settingsMap) => request('settings.php?action=update', {
                method: 'POST',
                body: settingsMap
            })
        },

        // Products Catalog Endpoints
        products: {
            list: (query = '', limit = 25) => {
                const qParam = query ? '&q=' + encodeURIComponent(query) : '';
                const lParam = limit ? '&limit=' + encodeURIComponent(limit) : '';
                return request(`products.php?action=list${qParam}${lParam}`, { method: 'GET' });
            },
            create: (productData) => request('products.php?action=create', {
                method: 'POST',
                body: productData
            }),
            update: (productData) => request('products.php?action=update', {
                method: 'POST',
                body: productData
            }),
            delete: (id) => request('products.php?action=delete', {
                method: 'POST',
                body: { id }
            })
        },

        // Orders Endpoints
        orders: {
            previewId: (dateStr = '') => request(`orders.php?action=preview_id${dateStr ? '&date=' + encodeURIComponent(dateStr) : ''}`, { method: 'GET' }),
            create: (orderPayload) => request('orders.php?action=create', {
                method: 'POST',
                body: orderPayload
            }),
            list: (params = {}) => {
                const queryParams = new URLSearchParams();
                if (params.search) queryParams.append('q', params.search);
                if (params.fromDate) queryParams.append('from_date', params.fromDate);
                if (params.toDate) queryParams.append('to_date', params.toDate);
                if (params.sort) queryParams.append('sort', params.sort);
                if (params.page) queryParams.append('page', params.page);
                if (params.limit) queryParams.append('limit', params.limit);
                return request(`orders.php?action=list&${queryParams.toString()}`, { method: 'GET' });
            },
            getDetails: (orderId) => request(`orders.php?action=details&id=${encodeURIComponent(orderId)}`, { method: 'GET' })
        },

        // Dashboard Analytics Endpoints
        dashboard: {
            getMetrics: () => request('dashboard.php', { method: 'GET' })
        }
    };

})();
