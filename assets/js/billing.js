/**
 * billing.js
 * Handles billing row calculations, validations, reset, and LocalStorage order creation
 */

window.CakeBilling = (function () {

    function formatMoney(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
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

    function resetBillingForm() {
        $('#custName').val('');
        $('#custPhone').val('');
        $('#discountInput').val(0);
        $('#taxSelect').val(5);

        // Keep only first row
        $('.item-row:gt(0)').remove();
        let row = $('.item-row').first();
        row.find('.cake-name').val('');
        row.find('.price').val('');
        row.find('.qty').val(1);

        // Update preview Order ID for next order
        const todayStr = CakeStorage.formatDateStr();
        const nextId = CakeStorage.generateOrderId(todayStr);
        $('#invoiceNo').val(nextId);

        calculateAll();
    }

    function validateAndSaveOrder() {
        const totals = calculateAll();
        let isValid = true;
        let items = [];
        let totalQty = 0;

        // Reset previous input highlight errors
        $('.cake-name, .price, .qty').removeClass('border-red-500');

        $('.item-row').each(function (idx) {
            const row = $(this);
            const cakeName = row.find('.cake-name').val().trim();
            const price = parseFloat(row.find('.price').val());
            const qty = parseInt(row.find('.qty').val());

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
                cake_name: cakeName,
                price: price,
                qty: qty,
                total: total
            });
        });

        if (!isValid) return false;

        const custName = $('#custName').val().trim() || 'Walk-in Customer';
        const custPhone = $('#custPhone').val().trim();
        const dateStr = $('#invoiceDate').val() || CakeStorage.formatDateStr();

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
            grand_total: totals.grandTotal
        };

        const savedOrder = CakeStorage.saveOrder(orderPayload);

        if (savedOrder) {
            // Show toast notification
            if (window.CakeApp && typeof window.CakeApp.showToast === 'function') {
                window.CakeApp.showToast(`Order ${savedOrder.order_id} saved successfully!`, 'success');
            } else {
                alert(`Order ${savedOrder.order_id} saved successfully!`);
            }

            resetBillingForm();
            return true;
        } else {
            alert('Failed to save order. Please try again.');
            return false;
        }
    }

    function init() {
        const todayStr = CakeStorage.formatDateStr();
        $('#invoiceDate').val(todayStr);

        // Preview generated ID
        const nextId = CakeStorage.generateOrderId(todayStr);
        $('#invoiceNo').val(nextId);

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

            newRow.find('.cake-name').val('').removeClass('border-red-500');
            newRow.find('.price').val('').removeClass('border-red-500');
            newRow.find('.qty').val(1).removeClass('border-red-500');
            newRow.find('.total').text(formatMoney(0));

            $('#itemsContainer').append(newRow);
            calculateAll();

            newRow.find('.cake-name').focus();
        });

        // Remove Item
        $(document).off('click', '.remove-item').on('click', '.remove-item', function () {
            if ($('.item-row').length === 1) {
                let row = $(this).closest('.item-row');
                row.find('.cake-name').val('');
                row.find('.price').val('');
                row.find('.qty').val(1);
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
            window.print();
        });

        calculateAll();
    }

    return {
        init,
        calculateAll,
        validateAndSaveOrder,
        resetBillingForm
    };

})();
