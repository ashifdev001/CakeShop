/**
 * dashboard.js
 * Dashboard statistics calculations and Top 10 order queries via Live Core PHP API
 */

window.CakeDashboard = (function () {

    function formatMoney(amount) {
        return CakeApi.formatMoney(amount);
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
            const itemsSummary = order.items_summary || 'N/A';
            const truncatedSummary = itemsSummary.length > 35
                ? itemsSummary.substring(0, 35) + '...'
                : itemsSummary;

            const orderNum = order.order_number || order.order_id;

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-2.5 px-3 font-mono font-bold text-rose-600">${orderNum}</td>
                    <td class="py-2.5 px-3 text-slate-500">${order.order_date}</td>
                    <td class="py-2.5 px-3 text-slate-700 font-medium" title="${itemsSummary}">${truncatedSummary}</td>
                    <td class="py-2.5 px-3 text-center font-bold text-slate-800">${order.total_qty || 0}</td>
                    <td class="py-2.5 px-3 text-right font-bold text-slate-900">${formatMoney(order.grand_total)}</td>
                    <td class="py-2.5 px-3 text-center">
                        <button type="button" class="view-order-btn px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md transition" data-id="${order.id || orderNum}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $(`#${targetId}`).html(html);
    }

    async function init() {
        const todayStr = CakeApi.formatDateStr();
        $('#currentDateBadge').text(todayStr);

        // Show loading spinners in cards
        $('#statTodayOrders, #statWeekOrders, #statMonthOrders').html('<i class="fa-solid fa-spinner fa-spin text-slate-400 text-sm"></i>');
        $('#statTodayEarnings, #statWeekEarnings, #statMonthEarnings').html('<i class="fa-solid fa-spinner fa-spin text-slate-400 text-sm"></i>');

        const res = await CakeApi.dashboard.getMetrics();

        if (res.success && res.metrics) {
            const m = res.metrics;
            $('#statTodayOrders').text(m.today_orders);
            $('#statTodayEarnings').text(formatMoney(m.today_earnings));

            $('#statWeekOrders').text(m.week_orders);
            $('#statWeekEarnings').text(formatMoney(m.week_earnings));

            $('#statMonthOrders').text(m.month_orders);
            $('#statMonthEarnings').text(formatMoney(m.month_earnings));

            renderTableRows('todayTopTable', res.today_top_orders || []);
            renderTableRows('monthTopTable', res.month_top_orders || []);
        } else {
            console.error('Failed to load dashboard metrics:', res.message);
        }

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
