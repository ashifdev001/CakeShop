/**
 * dashboard.js
 * Dashboard statistics calculations and Top 10 order queries
 */

window.CakeDashboard = (function () {

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    // Check if a date string falls in the current week (Monday to Sunday)
    function isCurrentWeek(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();

        // Get Monday of current week
        const dayOfWeek = now.getDay();
        const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diffToMonday));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return d >= monday && d <= sunday;
    }

    // Check if a date string falls in the current month
    function isCurrentMonth(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }

    function renderEmptyState(targetId, message = 'No orders found.') {
        $(`#${targetId}`).html(`
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center gap-2">
                        <i class="fa-solid fa-inbox text-2xl text-slate-300"></i>
                        <span class="text-xs font-medium">${message}</span>
                    </div>
                </td>
            </tr>
        `);
    }

    function renderTableRows(targetId, ordersArr) {
        if (!ordersArr || ordersArr.length === 0) {
            renderEmptyState(targetId);
            return;
        }

        const html = ordersArr.map(order => {
            const itemsSummary = order.items && order.items.length > 0
                ? order.items.map(i => `${i.cake_name} (${i.qty})`).join(', ')
                : 'N/A';

            const truncatedSummary = itemsSummary.length > 35
                ? itemsSummary.substring(0, 35) + '...'
                : itemsSummary;

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-2.5 px-3 font-mono font-bold text-rose-600">${order.order_id}</td>
                    <td class="py-2.5 px-3 text-slate-500">${order.order_date}</td>
                    <td class="py-2.5 px-3 text-slate-700 font-medium" title="${itemsSummary}">${truncatedSummary}</td>
                    <td class="py-2.5 px-3 text-center font-bold text-slate-800">${order.total_qty || 0}</td>
                    <td class="py-2.5 px-3 text-right font-bold text-slate-900">${formatMoney(order.grand_total || order.subtotal)}</td>
                    <td class="py-2.5 px-3 text-center">
                        <button type="button" class="view-order-btn px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition" data-id="${order.order_id}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $(`#${targetId}`).html(html);
    }

    function init() {
        const todayStr = CakeStorage.formatDateStr();
        $('#currentDateBadge').text(todayStr);

        const allOrders = CakeStorage.getAllOrders();

        // Filter Today Orders
        const todayOrders = allOrders.filter(o => o.order_date === todayStr);
        const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

        // Filter Week Orders
        const weekOrders = allOrders.filter(o => isCurrentWeek(o.order_date));
        const weekEarnings = weekOrders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

        // Filter Month Orders
        const monthOrders = allOrders.filter(o => isCurrentMonth(o.order_date));
        const monthEarnings = monthOrders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

        // Update Stat Cards
        $('#statTodayOrders').text(todayOrders.length);
        $('#statTodayEarnings').text(formatMoney(todayEarnings));

        $('#statWeekOrders').text(weekOrders.length);
        $('#statWeekEarnings').text(formatMoney(weekEarnings));

        $('#statMonthOrders').text(monthOrders.length);
        $('#statMonthEarnings').text(formatMoney(monthEarnings));

        // Render Today's Top 10 Orders (sorted by subtotal DESC)
        const todayTop10 = [...todayOrders]
            .sort((a, b) => (b.grand_total || b.subtotal) - (a.grand_total || a.subtotal))
            .slice(0, 10);
        renderTableRows('todayTopTable', todayTop10);

        // Render Current Month Top 10 Orders (sorted by subtotal DESC)
        const monthTop10 = [...monthOrders]
            .sort((a, b) => (b.grand_total || b.subtotal) - (a.grand_total || a.subtotal))
            .slice(0, 10);
        renderTableRows('monthTopTable', monthTop10);

        // Delegate View Order Modal Click
        $(document).off('click', '.view-order-btn').on('click', '.view-order-btn', function () {
            const orderId = $(this).data('id');
            if (window.CakeOrders && typeof window.CakeOrders.showOrderModal === 'function') {
                window.CakeOrders.showOrderModal(orderId);
            }
        });
    }

    return {
        init,
        formatMoney
    };

})();
