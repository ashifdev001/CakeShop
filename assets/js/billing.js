/**
 * billing.js
 * Handles billing row calculations, validations, custom searchable product dropdown, and Core PHP API order creation
 */

window.CakeBilling = (function () {

    let cachedProducts = [];
    let cachedSettings = {
        site_name: 'Cakino',
        tagline: 'The Cake Art',
        address: 'Hirdaypur station road hirdaypur, Madhyamgram, Kolkata, West Bengal 700127',
        phone: '+91 093301 21219',
        email: 'faizulislam0087@gmail.com',
        tax_rate: '5',
        currency_symbol: '₹',
        receipt_footer: 'Freshly baked with love. Goods once sold cannot be returned. Thank You!'
    };

    function formatMoney(amount) {
        return CakeApi.formatMoney(amount);
    }

    function formatReceiptMoney(amount) {
        const num = parseFloat(amount) || 0;
        const sym = cachedSettings.currency_symbol || '₹';
        if (num % 1 === 0) {
            return sym + num.toFixed(0);
        }
        return sym + num.toFixed(2);
    }

    function updateRowNumbers() {
        $('.item-row').each(function (index) {
            $(this).find('.row-number').text(index + 1);
        });
    }

    function calculateRow(row) {
        let price = Math.max(0, parseFloat(row.find('.price').val()) || 0);
        let qty = Math.max(1, parseFloat(row.find('.qty').val()) || 0);

        let total = price * qty;
        row.find('.total').text(formatMoney(total));
        return total;
    }

    function calculateAll() {
        let subtotal = 0;

        $('.item-row').each(function () {
            subtotal += calculateRow($(this));
        });

        let discount = Math.max(0, parseFloat($('#discountInput').val()) || 0);
        let subAfterDiscount = Math.max(0, subtotal - discount);

        let taxRate = parseFloat($('#taxSelect').val()) || 0;
        let taxAmount = subAfterDiscount * (taxRate / 100);

        let grandTotal = subAfterDiscount + taxAmount;

        $('#subtotal').text(formatMoney(subtotal));
        $('#grandTotal').text(formatMoney(grandTotal));

        updateRowNumbers();

        return {
            subtotal,
            discount,
            taxRate,
            taxAmount,
            grandTotal
        };
    }

    async function loadSettings() {
        const res = await CakeApi.settings.get();
        if (res.success && res.settings) {
            cachedSettings = { ...cachedSettings, ...res.settings };

            if ($('#billingBrandName').length) $('#billingBrandName').text(cachedSettings.site_name);
            if ($('#billingTagline').length) $('#billingTagline').text(cachedSettings.tagline);
            if ($('#billingAddress').length) $('#billingAddress').text(cachedSettings.address);
            if ($('#billingContact').length) $('#billingContact').text(`Phone: ${cachedSettings.phone} | Email: ${cachedSettings.email}`);

            if ($('#taxSelect').length && cachedSettings.tax_rate) {
                $('#taxSelect').val(cachedSettings.tax_rate);
            }
        }
    }

    async function loadProducts() {
        const res = await CakeApi.products.list();
        if (res.success && Array.isArray(res.products)) {
            cachedProducts = res.products;
        }
    }

    // Render Live Asynchronous Database Search Dropdown Menu
    async function renderProductDropdown(containerEl, query = '') {
        const dropdown = $(containerEl).find('.product-dropdown-menu');
        const q = (query || '').trim();

        // Close other dropdowns and show this one
        $('.product-dropdown-menu').not(dropdown).addClass('hidden');
        dropdown.removeClass('hidden');

        dropdown.html(`
            <div class="p-3 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <i class="fa-solid fa-spinner fa-spin text-rose-500 text-sm"></i>
                <span>Searching database...</span>
            </div>
        `);

        try {
            // Live DB query with limit 20
            const res = await CakeApi.products.list(q, 20);
            const products = (res.success && Array.isArray(res.products)) ? res.products : [];

            if (products.length === 0) {
                dropdown.html(`
                    <div class="p-3 text-center text-slate-400 text-xs">
                        <i class="fa-solid fa-cake-candles text-slate-300 text-base mb-1 block"></i>
                        No matching product found in database.<br>
                        <span class="text-[10px] text-slate-400">Custom cake name accepted.</span>
                    </div>
                `);
            } else {
                const html = products.map((p, idx) => `
                    <div class="product-dropdown-item p-2.5 hover:bg-rose-50 cursor-pointer transition flex items-center justify-between gap-3 text-xs ${idx === 0 ? 'bg-slate-50/50' : ''}"
                        data-id="${p.id}"
                        data-code="${p.code}"
                        data-name="${p.name}"
                        data-price="${p.price}">
                        <div class="flex items-center gap-2 truncate">
                            <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold text-[10px] border border-slate-200 shrink-0">
                                ${p.code}
                            </span>
                            <span class="font-semibold text-slate-800 truncate">${p.name}</span>
                        </div>
                        <span class="font-bold text-rose-600 shrink-0">${formatMoney(p.price)}</span>
                    </div>
                `).join('');

                dropdown.html(html);
            }
        } catch (e) {
            console.error('Live DB search error:', e);
            dropdown.html(`
                <div class="p-2.5 text-center text-red-500 text-xs">
                    Error searching database.
                </div>
            `);
        }
    }

    function selectProduct(containerEl, productData) {
        const row = $(containerEl).closest('.item-row');
        const input = row.find('.cake-name');
        const priceInput = row.find('.price');
        const qtyInput = row.find('.qty');

        input.val(productData.name).attr('data-product-id', productData.id).removeClass('border-red-500');
        priceInput.val(parseFloat(productData.price).toFixed(2)).removeClass('border-red-500');

        $(containerEl).find('.product-dropdown-menu').addClass('hidden');
        calculateAll();

        qtyInput.focus().select();
    }

    async function refreshPreviewOrderId() {
        const todayStr = CakeApi.formatDateStr();
        const res = await CakeApi.orders.previewId(todayStr);
        if (res.success && res.order_number) {
            $('#invoiceNo').val(res.order_number);
        }
    }

    function buildThermalReceiptHtml(orderData = null) {
        let items = [];
        let grandTotal = 0;
        let orderNumber = $('#invoiceNo').val() || 'RECEIPT';
        let orderDate = $('#invoiceDate').val() || CakeApi.formatDateStr();

        if (orderData) {
            items = orderData.items || [];
            grandTotal = orderData.grand_total || orderData.subtotal || 0;
            orderNumber = orderData.order_number || orderData.order_id || orderNumber;
            orderDate = orderData.order_date || orderDate;
        } else {
            const totals = calculateAll();
            grandTotal = totals.grandTotal;

            $('.item-row').each(function () {
                const row = $(this);
                const cakeName = row.find('.cake-name').val().trim();
                const price = Math.max(0, parseFloat(row.find('.price').val()) || 0);
                const qty = Math.max(1, parseInt(row.find('.qty').val()) || 1);
                const total = price * qty;

                if (cakeName || price > 0) {
                    items.push({
                        cake_name: cakeName || 'Item',
                        price: price,
                        qty: qty,
                        total: total
                    });
                }
            });
        }

        if (items.length === 0) {
            items.push({
                cake_name: 'Item',
                price: 0,
                qty: 1,
                total: 0
            });
        }

        const itemsHtml = items.map(item => `
            <div class="receipt-item">
                <div class="receipt-row receipt-row-top">
                    <span class="receipt-item-name">${item.cake_name}</span>
                    <span class="receipt-item-qty">${item.qty}</span>
                </div>
                <div class="receipt-row receipt-row-bottom">
                    <span class="receipt-item-calc">${formatReceiptMoney(item.price)} x ${item.qty}</span>
                    <span class="receipt-item-total">${formatReceiptMoney(item.total)}</span>
                </div>
            </div>
        `).join('');

        const payMode = ((orderData ? orderData.payment_type : getSelectedPaymentType()) || 'cash').toUpperCase();

        return `
            <div class="receipt-container">
                <div class="receipt-header">
                    <div class="receipt-brand">${cachedSettings.site_name.toUpperCase()}</div>
                    <div style="font-size: 11px; margin-top: 2px;">${cachedSettings.tagline}</div>
                    <div style="font-size: 10px; margin-top: 2px; color: #555;">${cachedSettings.address}</div>
                    <div style="font-size: 10px; margin-top: 2px; color: #555;">Ph: ${cachedSettings.phone}</div>
                </div>
                <div class="receipt-divider">----------------------------</div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;">
                    <span>Inv: ${orderNumber}</span>
                    <span>Date: ${orderDate}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
                    <span>Pay Mode: ${payMode}</span>
                    <span>Status: Paid</span>
                </div>
                <div class="receipt-divider">----------------------------</div>
                <div class="receipt-items-list">
                    ${itemsHtml}
                </div>
                <div class="receipt-divider">----------------------------</div>
                <div class="receipt-summary-list">
                    <div class="receipt-row receipt-total-row">
                        <span>TOTAL (${payMode})</span>
                        <span>${formatReceiptMoney(grandTotal)}</span>
                    </div>
                </div>
                <div class="receipt-divider">----------------------------</div>
                <div class="receipt-footer">
                    ${cachedSettings.receipt_footer || 'Thank You!'}
                </div>
            </div>
        `;
    }

    function printThermalReceipt(orderData = null) {
        const receiptHtml = buildThermalReceiptHtml(orderData);

        let printFrame = document.getElementById('receiptPrintFrame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'receiptPrintFrame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            printFrame.style.visibility = 'hidden';
            document.body.appendChild(printFrame);
        }

        const frameDoc = printFrame.contentWindow || printFrame.contentDocument.document || printFrame.contentDocument;
        const doc = frameDoc.document || frameDoc;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Receipt</title>
                <style>
                    @page {
                        size: auto;
                        margin: 0;
                    }
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    html, body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'Courier New', Courier, Consolas, monospace;
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    body {
                        width: 280px;
                        margin: 0 auto;
                        padding: 12px 8px;
                    }
                    .receipt-container { width: 100%; }
                    .receipt-header { text-align: center; margin-bottom: 4px; }
                    .receipt-brand { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
                    .receipt-divider { text-align: center; overflow: hidden; white-space: nowrap; margin: 4px 0; font-weight: bold; }
                    .receipt-items-list { display: flex; flex-direction: column; gap: 8px; margin: 4px 0; }
                    .receipt-item { display: flex; flex-direction: column; gap: 2px; }
                    .receipt-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                    .receipt-row-top { font-weight: bold; font-size: 13px; }
                    .receipt-item-name { text-align: left; word-break: break-word; }
                    .receipt-item-qty { text-align: right; font-weight: bold; margin-left: 6px; }
                    .receipt-row-bottom { font-size: 12px; }
                    .receipt-item-calc { text-align: left; }
                    .receipt-item-total { text-align: right; font-weight: bold; }
                    .receipt-summary-list { display: flex; flex-direction: column; gap: 4px; margin: 4px 0; }
                    .receipt-total-row { font-size: 15px; font-weight: bold; margin-top: 2px; }
                    .receipt-footer { text-align: center; font-size: 12px; margin-top: 8px; }
                </style>
            </head>
            <body>
                ${receiptHtml}
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 250);
    }

    function getSelectedPaymentType() {
        return $('input[name="paymentType"]:checked').val() || 'cash';
    }

    function updatePaymentTypeUI(type = 'cash') {
        $(`input[name="paymentType"][value="${type}"]`).prop('checked', true);
        $('.payment-type-label')
            .removeClass('border-2 border-rose-600 bg-rose-50/70 text-rose-700 font-bold shadow-xs')
            .addClass('border border-slate-300 bg-white text-slate-600 font-semibold');
        $(`.payment-type-label[data-type="${type}"]`)
            .removeClass('border border-slate-300 bg-white text-slate-600 font-semibold')
            .addClass('border-2 border-rose-600 bg-rose-50/70 text-rose-700 font-bold shadow-xs');
    }

    function resetBillingForm() {
        $('#discountInput').val(0);
        $('#taxSelect').val(cachedSettings.tax_rate || 5);
        updatePaymentTypeUI('cash');

        // Keep only first row
        $('.item-row:gt(0)').remove();
        let row = $('.item-row').first();
        row.find('.cake-name').val('').removeAttr('data-product-id');
        row.find('.price').val('');
        row.find('.qty').val(1);
        row.find('.total').text(formatMoney(0));
        row.find('.product-dropdown-menu').addClass('hidden');

        refreshPreviewOrderId();
        calculateAll();
    }

    async function validateAndSaveOrder() {
        const totals = calculateAll();
        let isValid = true;
        let items = [];
        let totalQty = 0;

        $('.cake-name, .price, .qty').removeClass('border-red-500');

        $('.item-row').each(function (idx) {
            const row = $(this);
            const cakeName = row.find('.cake-name').val().trim();
            const price = parseFloat(row.find('.price').val());
            const qty = parseInt(row.find('.qty').val());
            const productId = row.find('.cake-name').attr('data-product-id') || null;

            if (!cakeName) {
                row.find('.cake-name').addClass('border-red-500').focus();
                alert(`Item Row #${idx + 1}: Cake / Item Name is required!`);
                isValid = false;
                return false;
            }

            if (isNaN(price) || price <= 0) {
                row.find('.price').addClass('border-red-500').focus();
                alert(`Item Row #${idx + 1}: Price must be greater than ₹0!`);
                isValid = false;
                return false;
            }

            if (isNaN(qty) || qty < 1) {
                row.find('.qty').addClass('border-red-500').focus();
                alert(`Item Row #${idx + 1}: Quantity must be at least 1!`);
                isValid = false;
                return false;
            }

            const total = price * qty;
            totalQty += qty;

            items.push({
                product_id: productId ? parseInt(productId) : null,
                cake_name: cakeName,
                price: price,
                qty: qty,
                total: total
            });
        });

        if (!isValid) return false;

        const custName = 'Walk-in Customer';
        const custPhone = '';
        const dateStr = $('#invoiceDate').val() || CakeApi.formatDateStr();
        const payType = getSelectedPaymentType();

        const orderPayload = {
            order_date: dateStr,
            customer_name: custName,
            customer_phone: custPhone,
            items: items,
            total_qty: totalQty,
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax_rate: totals.taxRate,
            tax_amount: totals.taxAmount,
            grand_total: totals.grandTotal,
            payment_type: payType
        };

        const saveBtn = $('#saveOrderBtn');
        saveBtn.prop('disabled', true).addClass('opacity-50');

        try {
            const res = await CakeApi.orders.create(orderPayload);

            if (res.success && res.order) {
                if (window.CakeApp && typeof window.CakeApp.showToast === 'function') {
                    window.CakeApp.showToast(`Order ${res.order.order_number} saved (${payType.toUpperCase()})!`, 'success');
                } else {
                    alert(`Order ${res.order.order_number} saved (${payType.toUpperCase()})!`);
                }

                resetBillingForm();
                return true;
            } else {
                alert(res.message || 'Failed to save order. Please try again.');
                return false;
            }
        } catch (e) {
            console.error('Order save error:', e);
            alert('An unexpected error occurred while saving the order.');
            return false;
        } finally {
            saveBtn.prop('disabled', false).removeClass('opacity-50');
        }
    }

    function init() {
        const todayStr = CakeApi.formatDateStr();
        $('#invoiceDate').val(todayStr);

        loadSettings();
        loadProducts();
        refreshPreviewOrderId();
        updatePaymentTypeUI('cash');

        // Payment Method Click Toggle
        $(document).off('click', '.payment-type-label').on('click', '.payment-type-label', function () {
            const type = $(this).data('type') || 'cash';
            updatePaymentTypeUI(type);
        });

        let searchDebounce = null;

        // 1. Focus / Click on Cake Name Input -> Show Dropdown with live DB matches
        $(document).off('focus click', '.cake-name').on('focus click', '.cake-name', function () {
            const container = $(this).closest('.product-search-container');
            clearTimeout(searchDebounce);
            renderProductDropdown(container, $(this).val());
        });

        // 2. Typing in Cake Name Input -> Debounced Live Database search
        $(document).off('input', '.cake-name').on('input', '.cake-name', function () {
            const container = $(this).closest('.product-search-container');
            const val = $(this).val();
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                renderProductDropdown(container, val);
            }, 160);
        });

        // 3. Chevron Dropdown Toggle Button Click
        $(document).off('click', '.toggle-product-dropdown').on('click', '.toggle-product-dropdown', function (e) {
            e.stopPropagation();
            const container = $(this).closest('.product-search-container');
            const dropdown = container.find('.product-dropdown-menu');
            if (dropdown.hasClass('hidden')) {
                renderProductDropdown(container, container.find('.cake-name').val());
            } else {
                dropdown.addClass('hidden');
            }
        });

        // 4. Click Product Item in Dropdown -> Select
        $(document).off('click', '.product-dropdown-item').on('click', '.product-dropdown-item', function (e) {
            e.stopPropagation();
            const container = $(this).closest('.product-search-container');
            const data = {
                id: $(this).data('id'),
                code: $(this).data('code'),
                name: $(this).data('name'),
                price: $(this).data('price')
            };
            selectProduct(container, data);
        });

        // 5. Close dropdown when clicking outside
        $(document).off('click.productDropdown').on('click.productDropdown', function (e) {
            if (!$(e.target).closest('.product-search-container').length) {
                $('.product-dropdown-menu').addClass('hidden');
            }
        });

        // 6. Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
        $(document).off('keydown', '.cake-name').on('keydown', '.cake-name', function (e) {
            const container = $(this).closest('.product-search-container');
            const dropdown = container.find('.product-dropdown-menu');

            if (dropdown.hasClass('hidden')) {
                if (e.key === 'ArrowDown') {
                    renderProductDropdown(container, $(this).val());
                    e.preventDefault();
                }
                return;
            }

            const items = dropdown.find('.product-dropdown-item');
            const activeItem = dropdown.find('.product-dropdown-item.bg-rose-100');
            let index = items.index(activeItem);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items.removeClass('bg-rose-100');
                index = (index + 1) % items.length;
                const nextItem = items.eq(index).addClass('bg-rose-100');
                nextItem[0].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items.removeClass('bg-rose-100');
                index = index <= 0 ? items.length - 1 : index - 1;
                const prevItem = items.eq(index).addClass('bg-rose-100');
                prevItem[0].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeItem.length) {
                    activeItem.click();
                } else if (items.length > 0) {
                    items.first().click();
                }
            } else if (e.key === 'Escape') {
                dropdown.addClass('hidden');
            }
        });

        // Live calculation on input change
        $(document).off('input change', '.price, .qty, #discountInput, #taxSelect')
            .on('input change', '.price, .qty, #discountInput, #taxSelect', function () {
                calculateAll();
            });

        // Calculate All Button
        $(document).off('click', '#calculateAll').on('click', '#calculateAll', function () {
            calculateAll();
        });

        // Add More Item
        $(document).off('click', '#addMore').on('click', '#addMore', function () {
            let firstRow = $('.item-row').first();
            let newRow = firstRow.clone();

            newRow.find('.cake-name').val('').removeAttr('data-product-id').removeClass('border-red-500');
            newRow.find('.price').val('').removeClass('border-red-500');
            newRow.find('.qty').val(1).removeClass('border-red-500');
            newRow.find('.total').text(formatMoney(0));
            newRow.find('.product-dropdown-menu').addClass('hidden');

            $('#itemsContainer').append(newRow);
            calculateAll();

            newRow.find('.cake-name').focus();
        });

        // Remove Item
        $(document).off('click', '.remove-item').on('click', '.remove-item', function () {
            if ($('.item-row').length === 1) {
                let row = $(this).closest('.item-row');
                row.find('.cake-name').val('').removeAttr('data-product-id');
                row.find('.price').val('');
                row.find('.qty').val(1);
                row.find('.total').text(formatMoney(0));
                row.find('.product-dropdown-menu').addClass('hidden');
                calculateAll();
                return;
            }

            $(this).closest('.item-row').remove();
            calculateAll();
        });

        // Reset Button
        $(document).off('click', '#resetBtn').on('click', '#resetBtn', function () {
            if (confirm('Are you sure you want to reset the current invoice?')) {
                resetBillingForm();
            }
        });

        // Save Order Button
        $(document).off('click', '#saveOrderBtn').on('click', '#saveOrderBtn', function () {
            validateAndSaveOrder();
        });

        // Print Invoice Button
        $(document).off('click', '#printBtn').on('click', '#printBtn', function () {
            calculateAll();
            printThermalReceipt();
        });

        calculateAll();
    }

    return {
        init,
        calculateAll,
        buildThermalReceiptHtml,
        printThermalReceipt,
        validateAndSaveOrder,
        resetBillingForm
    };

})();
