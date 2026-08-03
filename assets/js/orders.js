/**
 * orders.js
 * Order list page controller: Search, Date Filter, Sorting, 15-record Pagination, and Details Modal
 */

window.CakeOrders = (function () {

    const RECORDS_PER_PAGE = 15;
    let currentPage = 1;
    let filteredOrders = [];

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }

    function showOrderModal(orderId) {
        const order = CakeStorage.getOrderById(orderId);
        if (!order) {
            alert('Order details not found!');
            return;
        }

        $('#modalOrderId').text(order.order_id);
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

        $('#modalItemsBody').html(itemsHtml);

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
    }

    function applyFiltersAndSort() {
        let orders = CakeStorage.getAllOrders();

        // 1. Search Query (Order ID or Cake Name)
        const query = $('#orderSearchInput').val().trim().toLowerCase();
        if (query) {
            orders = orders.filter(o => {
                const matchId = o.order_id && o.order_id.toLowerCase().includes(query);
                const matchCake = o.items && o.items.some(item => item.cake_name && item.cake_name.toLowerCase().includes(query));
                const matchCust = o.customer_name && o.customer_name.toLowerCase().includes(query);
                return matchId || matchCake || matchCust;
            });
        }

        // 2. Date Range Filter
        const fromDate = $('#filterFromDate').val();
        const toDate = $('#filterToDate').val();

        if (fromDate) {
            orders = orders.filter(o => o.order_date >= fromDate);
        }
        if (toDate) {
            orders = orders.filter(o => o.order_date <= toDate);
        }

        // 3. Sorting
        const sortType = $('#sortOrdersSelect').val();
        switch (sortType) {
            case 'date_asc':
                orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'amount_desc':
                orders.sort((a, b) => (b.grand_total || b.subtotal) - (a.grand_total || a.subtotal));
                break;
            case 'amount_asc':
                orders.sort((a, b) => (a.grand_total || a.subtotal) - (b.grand_total || b.subtotal));
                break;
            case 'date_desc':
            default:
                orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
        }

        filteredOrders = orders;
        currentPage = 1;
        renderTablePage();
    }

    function renderTablePage() {
        const totalRecords = filteredOrders.length;
        $('#totalOrdersCountBadge').text(totalRecords);

        if (totalRecords === 0) {
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

        const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
        const endIndex = Math.min(startIndex + RECORDS_PER_PAGE, totalRecords);
        const pageOrders = filteredOrders.slice(startIndex, endIndex);

        // Render Table Rows
        const rowsHtml = pageOrders.map((order, idx) => {
            const slNo = startIndex + idx + 1;
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="py-3 px-4 text-center font-bold text-slate-400">${slNo}</td>
                    <td class="py-3 px-4 font-mono font-bold text-rose-600">${order.order_id}</td>
                    <td class="py-3 px-4 text-slate-700">${order.order_date}</td>
                    <td class="py-3 px-4 text-slate-500 font-mono">${order.order_time || 'N/A'}</td>
                    <td class="py-3 px-4 text-center font-bold text-slate-800">${order.total_items || (order.items ? order.items.length : 0)}</td>
                    <td class="py-3 px-4 text-center font-bold text-slate-800">${order.total_qty || 0}</td>
                    <td class="py-3 px-4 text-right font-bold text-slate-900">${formatMoney(order.grand_total || order.subtotal)}</td>
                    <td class="py-3 px-4 text-center">
                        <button type="button" class="view-order-btn px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition" data-id="${order.order_id}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        $('#ordersTableBody').html(rowsHtml);

        // Update Pagination Info
        $('#paginationInfo').text(`Showing ${startIndex + 1}–${endIndex} of ${totalRecords} orders`);

        // Render Pagination Buttons
        let paginationHtml = '';

        // Previous button
        const prevDisabled = currentPage === 1 ? 'disabled opacity-40 cursor-not-allowed' : '';
        paginationHtml += `
            <button type="button" class="page-btn px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition ${prevDisabled}" data-page="${currentPage - 1}" ${prevDisabled ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i> Previous
            </button>
        `;

        // Page Numbers
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

        // Next button
        const nextDisabled = currentPage === totalPages ? 'disabled opacity-40 cursor-not-allowed' : '';
        paginationHtml += `
            <button type="button" class="page-btn px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition ${nextDisabled}" data-page="${currentPage + 1}" ${nextDisabled ? 'disabled' : ''}>
                Next <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        $('#paginationControls').html(paginationHtml);
    }

    function init() {
        applyFiltersAndSort();

        // Search Input (Realtime typing)
        $(document).off('input', '#orderSearchInput').on('input', '#orderSearchInput', function () {
            applyFiltersAndSort();
        });

        // Apply Filter Button
        $(document).off('click', '#applyFilterBtn').on('click', '#applyFilterBtn', function () {
            applyFiltersAndSort();
        });

        // Reset Filter Button
        $(document).off('click', '#resetFilterBtn').on('click', '#resetFilterBtn', function () {
            $('#orderSearchInput').val('');
            $('#filterFromDate').val('');
            $('#filterToDate').val('');
            $('#sortOrdersSelect').val('date_desc');
            applyFiltersAndSort();
        });

        // Sorting Change
        $(document).off('change', '#sortOrdersSelect').on('change', '#sortOrdersSelect', function () {
            applyFiltersAndSort();
        });

        // Pagination Click
        $(document).off('click', '.page-btn').on('click', '.page-btn', function () {
            if ($(this).attr('disabled')) return;
            const targetPage = parseInt($(this).data('page'));
            if (targetPage && targetPage !== currentPage) {
                currentPage = targetPage;
                renderTablePage();
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
    }

    return {
        init,
        showOrderModal,
        closeModal
    };

})();
