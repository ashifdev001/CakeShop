/**
 * storage.js
 * Central LocalStorage Data Management for Cake Shop System
 * Handles date-wise JSON storage, unique Order ID generation, and queries.
 */

window.CakeStorage = (function () {

    const DATE_KEY_PREFIX = 'orders-';

    // Format Date to YYYY-MM-DD string
    function formatDateStr(dateObj = new Date()) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Format Time to HH:MM:SS
    function formatTimeStr(dateObj = new Date()) {
        return dateObj.toTimeString().split(' ')[0];
    }

    // Get Storage Key for Date
    function getKeyForDate(dateStr) {
        return `${DATE_KEY_PREFIX}${dateStr}`;
    }

    // Get orders for a specific date
    function getOrdersByDate(dateStr) {
        try {
            const key = getKeyForDate(dateStr);
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading orders from LocalStorage:', e);
            return [];
        }
    }

    // Save orders list for a specific date
    function saveOrdersForDate(dateStr, ordersArr) {
        try {
            const key = getKeyForDate(dateStr);
            localStorage.setItem(key, JSON.stringify(ordersArr));
            return true;
        } catch (e) {
            console.error('Error saving orders to LocalStorage:', e);
            return false;
        }
    }

    // Get all orders across all date keys
    function getAllOrders() {
        let allOrders = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(DATE_KEY_PREFIX)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed)) {
                            allOrders = allOrders.concat(parsed);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error retrieving all orders:', e);
        }

        // Sort by created_at DESC by default
        return allOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Generate daily sequential Order ID (ORD-YYYYMMDD-0001)
    function generateOrderId(dateStr) {
        const cleanDate = dateStr.replace(/-/g, '');
        const existingOrders = getOrdersByDate(dateStr);
        const count = existingOrders.length + 1;
        const seq = String(count).padStart(4, '0');
        return `ORD-${cleanDate}-${seq}`;
    }

    // Save a new order
    function saveOrder(orderPayload) {
        const now = new Date();
        const dateStr = orderPayload.order_date || formatDateStr(now);
        const timeStr = orderPayload.order_time || formatTimeStr(now);
        const orderId = generateOrderId(dateStr);

        const newOrder = {
            order_id: orderId,
            order_date: dateStr,
            order_time: timeStr,
            created_at: `${dateStr}T${timeStr}`,
            customer_name: orderPayload.customer_name || 'Walk-in Customer',
            customer_phone: orderPayload.customer_phone || '',
            items: orderPayload.items || [],
            total_items: orderPayload.items ? orderPayload.items.length : 0,
            total_qty: orderPayload.total_qty || 0,
            subtotal: orderPayload.subtotal || 0,
            discount: orderPayload.discount || 0,
            tax_rate: orderPayload.tax_rate || 0,
            tax_amount: orderPayload.tax_amount || 0,
            grand_total: orderPayload.grand_total || orderPayload.subtotal || 0
        };

        const currentOrders = getOrdersByDate(dateStr);
        currentOrders.push(newOrder);
        saveOrdersForDate(dateStr, currentOrders);

        return newOrder;
    }

    // Get order by Order ID
    function getOrderById(orderId) {
        const allOrders = getAllOrders();
        return allOrders.find(o => o.order_id === orderId) || null;
    }

    // Clear all stored orders from LocalStorage
    function clearAllOrders() {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(DATE_KEY_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        console.log('All orders cleared from LocalStorage.');
    }

    // Return public API
    return {
        formatDateStr,
        formatTimeStr,
        getOrdersByDate,
        getAllOrders,
        getOrderById,
        generateOrderId,
        saveOrder,
        clearAllOrders
    };

})();
