/**
 * orders.js
 * Order list page controller: Live Core PHP API Search, Date Filter, Sorting, 15-record Pagination, Details Modal
 */

window.CakeOrders = (function () {

    const RECORDS_PER_PAGE = 15;
    let currentPage = 1;
    let currentOrderData = null;

    function formatMoney(amount) {
        return CakeApi.formatMoney(amount);
    }

    async function showOrderModal(orderId) {
        const res = await CakeApi.orders.getDetails(orderId);
        if (!res.success || !res.order) {
            alert(res.message || 'Order details not found!');
            return;
        }

        const order = res.order;
        currentOrderData = order;

        $('#modalOrderId').text(order.order_number || order.order_id);
        $('#modalOrderDateTime').text(`${order.order_date} at ${order.order_time || 'N/A'}`);
        $('#modalCustName').text(order.customer_name || 'Walk-in Customer');
        $('#modalCustPhone').text(order.customer_phone || 'N/A');

        // Items body
        const itemsHtml = (order.items || []).map(item => `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="py-2.5 px-3 font-semibold text-slate-800">${item.cake_name}</td>
                <td class="py-2.5 px-3 text-right text-slate-600">${formatMoney(item.price)}</td>
                <td class="py-2.5 px-3 text-center font-bold text-slate-800">${item.qty}</td>
                <td class="py-2.5 px-3 text-right font-bold text-slate-900">${formatMoney(item.total)}</td>
            </tr>
        `).join('');

        $('#modalItemsBody').html(itemsHtml || '<tr><td colspan="4" class="p-3 text-center text-slate-400">No items recorded.</td></tr>');

        $('#modalTotalItems').text(order.total_items || (order.items ? order.items.length : 0));
        $('#modalTotalQty').text(order.total_qty || 0);
        $('#modalSubtotal').text(formatMoney(order.subtotal || 0));

        if (order.discount > 0) {
            $('#modalDiscount').text(`- ${formatMoney(order.discount)}`);
            $('#modalDiscountRow').removeClass('hidden');
        } else {
            $('#modalDiscountRow').addClass('hidden');
        }

        if (order.tax_amount > 0) {
            $('#modalTaxLabel').text(`GST (${order.tax_rate || 5}%):`);
            $('#modalTax').text(formatMoney(order.tax_amount));
            $('#modalTaxRow').removeClass('hidden');
        } else {
            $('#modalTaxRow').addClass('hidden');
        }

        $('#modalGrandTotal').text(formatMoney(order.grand_total || order.subtotal));

        $('#orderDetailsModal').removeClass('hidden');
    }

    function closeModal() {
        $('#orderDetailsModal').addClass('hidden');
        currentOrderData = null;
    }

    async function loadOrders() {
        const query = $('#orderSearchInput').val().trim();
        const fromDate = $('#filterFromDate').val();
        const toDate = $('#filterToDate').val();
        const sort = $('#sortOrdersSelect').val() || 'date_desc';

        $('#ordersTableBody').html(`
            <tr>
                <td colspan="8" class="py-8 text-center text-slate-400">
                    <div class="flex items-center justify-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-rose-500 text-lg"></i>
                        <span class="text-xs">Loading orders from server...</span>
                    </div>
                </td>
            </tr>
        `);

        const res = await CakeApi.orders.list({
            search: query,
            fromDate: fromDate,
            toDate: toDate,
            sort: sort,
            page: currentPage,
            limit: RECORDS_PER_PAGE
        });

        if (!res.success) {
            $('#ordersTableBody').html(`
                <tr>
                    <td colspan="8" class="py-8 text-center text-red-500 text-xs">
                        Failed to load orders: ${res.message || 'Server error'}
                    </td>
                </tr>
            `);
            return;
        }

        const totalRecords = res.total || 0;
        const totalPages = res.total_pages || 1;
        const orders = res.orders || [];

        $('#totalOrdersCountBadge').text(totalRecords);

        if (orders.length === 0) {
            $('#ordersTableBody').html(`
                <tr>
                    <td colspan="8" class="py-12 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i class="fa-solid fa-folder-open text-3xl text-slate-300"></i>
                            <span class="text-xs font-semibold">No orders matched your search or filter criteria.</span>
                        </div>
                    </td>
                </tr>
            `);
            $('#paginationInfo').text('Showing 0–0 of 0 orders');
            $('#paginationControls').html('');
            return;
        }

        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        const endIndex = Math.min(startIndex + orders.length, totalRecords);

        // Render Table Rows
        const rowsHtml = orders.map((order, idx) => {
            const slNo = startIndex + idx + 1;
            const orderNum = order.order_number || order.order_id;
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-3 px-4 text-center font-bold text-slate-400">${slNo}</td>
                    <td class="py-3 px-4 font-mono font-bold text-rose-600">${orderNum}</td>
                    <td class="py-3 px-4 text-slate-700">${order.order_date}</td>
                    <td class="py-3 px-4 text-slate-500 font-mono">${order.order_time || 'N/A'}</td>
                    <td class="py-3 px-4 text-center font-bold text-slate-800">${order.total_items}</td>
                    <td class="py-3 px-4 text-center font-bold text-slate-800">${order.total_qty}</td>
                    <td class="py-3 px-4 text-right font-bold text-slate-900">${formatMoney(order.grand_total || order.subtotal)}</td>
                    <td class="py-3 px-4 text-center">
                        <button type="button" class="view-order-btn px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition" data-id="${order.id || orderNum}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $('#ordersTableBody').html(rowsHtml);

        // Update Pagination Info
        $('#paginationInfo').text(`Showing ${startIndex + 1}–${endIndex} of ${totalRecords} orders`);

        // Render Pagination Controls
        let paginationHtml = '';
        const prevDisabled = currentPage === 1 ? 'disabled opacity-40 cursor-not-allowed' : '';
        paginationHtml += `
            <button type="button" class="page-btn px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition ${prevDisabled}" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i> Previous
            </button>
        `;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === currentPage
                ? 'bg-rose-600 text-white font-bold border-rose-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100';

            paginationHtml += `
                <button type="button" class="page-btn px-3 py-1.5 text-xs border rounded-lg transition ${activeClass}" data-page="${p}">
                    ${p}
                </button>
            `;
        }

        const nextDisabled = currentPage === totalPages ? 'disabled opacity-40 cursor-not-allowed' : '';
        paginationHtml += `
            <button type="button" class="page-btn px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition ${nextDisabled}" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''}>
                Next <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        $('#paginationControls').html(paginationHtml);
    }

    function init() {
        currentPage = 1;
        loadOrders();

        // Search Input (Realtime typing with debounce)
        let debounceTimer = null;
        $(document).off('input', '#orderSearchInput').on('input', '#orderSearchInput', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                currentPage = 1;
                loadOrders();
            }, 300);
        });

        // Apply Filter Button
        $(document).off('click', '#applyFilterBtn').on('click', '#applyFilterBtn', function () {
            currentPage = 1;
            loadOrders();
        });

        // Reset Filter Button
        $(document).off('click', '#resetFilterBtn').on('click', '#resetFilterBtn', function () {
            $('#orderSearchInput').val('');
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#sortOrdersSelect').val('date_desc');
            currentPage = 1;
            loadOrders();
        });

        // Sorting Change
        $(document).off('change', '#sortOrdersSelect').on('change', '#sortOrdersSelect', function () {
            currentPage = 1;
            loadOrders();
        });

        // Pagination Click
        $(document).off('click', '.page-btn').on('click', '.page-btn', function () {
            if ($(this).attr('disabled')) return;
            const targetPage = parseInt($(this).data('page'));
            if (targetPage && targetPage !== currentPage) {
                currentPage = targetPage;
                loadOrders();
            }
        });

        // View Modal Opener Click
        $(document).off('click', '.view-order-btn').on('click', '.view-order-btn', function () {
            const orderId = $(this).data('id');
            showOrderModal(orderId);
        });

        // Modal Close Clicks
        $(document).off('click', '#closeModalBtn, #modalCloseFooterBtn').on('click', '#closeModalBtn, #modalCloseFooterBtn', function () {
            closeModal();
        });

        // Modal Backdrop Click
        $(document).off('click', '#orderDetailsModal').on('click', '#orderDetailsModal', function (e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // Modal Print Receipt Button
        $(document).off('click', '#modalPrintReceiptBtn').on('click', '#modalPrintReceiptBtn', function () {
            if (currentOrderData && window.CakeBilling && typeof window.CakeBilling.printThermalReceipt === 'function') {
                window.CakeBilling.printThermalReceipt(currentOrderData);
            } else {
                window.print();
            }
        });
    }

    return {
        init,
        showOrderModal,
        closeModal,
        loadOrders
    };

})();
