/**
 * products.js
 * Product Management Controller: Live Core PHP API CRUD, Search, and Modal Handlers
 */

window.CakeProducts = (function () {

    let allProducts = [];

    function formatMoney(amount) {
        return CakeApi.formatMoney(amount);
    }

    async function loadProducts(searchQuery = '') {
        $('#productsTableBody').html(`
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400">
                    <div class="flex items-center justify-center gap-2">
                        <i class="fa-solid fa-spinner fa-spin text-rose-500 text-lg"></i>
                        <span class="text-xs">Loading products...</span>
                    </div>
                </td>
            </tr>
        `);

        const res = await CakeApi.products.list(searchQuery);

        if (!res.success) {
            $('#productsTableBody').html(`
                <tr>
                    <td colspan="6" class="py-8 text-center text-red-500 text-xs">
                        Failed to load products: ${res.message || 'Server error'}
                    </td>
                </tr>
            `);
            return;
        }

        allProducts = res.products || [];
        $('#totalProductsCountBadge').text(res.total || allProducts.length);

        if (allProducts.length === 0) {
            $('#productsTableBody').html(`
                <tr>
                    <td colspan="6" class="py-12 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <i class="fa-solid fa-box-open text-3xl text-slate-300"></i>
                            <span class="text-xs font-semibold">No products found. Click "Add Product" to create one.</span>
                        </div>
                    </td>
                </tr>
            `);
            return;
        }

        const rowsHtml = allProducts.map((p, idx) => `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="py-3 px-4 text-center font-bold text-slate-400">${idx + 1}</td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px] border border-slate-200">
                        ${p.code}
                    </span>
                </td>
                <td class="py-3 px-4 font-semibold text-slate-800">${p.name}</td>
                <td class="py-3 px-4 text-right font-bold text-rose-600">${formatMoney(p.price)}</td>
                <td class="py-3 px-4 text-center text-slate-500 text-[11px]">${p.created_at ? p.created_at.split(' ')[0] : 'N/A'}</td>
                <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" class="edit-prod-btn px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                            data-id="${p.id}" data-code="${p.code}" data-name="${p.name}" data-price="${p.price}">
                            <i class="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                        <button type="button" class="delete-prod-btn px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                            data-id="${p.id}" data-name="${p.name}">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        $('#productsTableBody').html(rowsHtml);
    }

    function openModal(mode = 'add', data = {}) {
        $('#productForm')[0].reset();
        $('#prodNameErr, #prodPriceErr').addClass('hidden');

        if (mode === 'edit' && data.id) {
            $('#productModalTitle').text('Edit Product');
            $('#prodId').val(data.id);
            $('#prodCode').val(data.code).prop('readonly', false);
            $('#prodName').val(data.name);
            $('#prodPrice').val(data.price);
        } else {
            $('#productModalTitle').text('Add New Product');
            $('#prodId').val('');
            $('#prodCode').val('').prop('readonly', false);
            $('#prodName').val('');
            $('#prodPrice').val('');
        }

        $('#productModal').removeClass('hidden');
        $('#prodName').focus();
    }

    function closeModal() {
        $('#productModal').addClass('hidden');
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const id = $('#prodId').val().trim();
        const code = $('#prodCode').val().trim();
        const name = $('#prodName').val().trim();
        const price = parseFloat($('#prodPrice').val());

        let isValid = true;
        $('#prodNameErr, #prodPriceErr').addClass('hidden');

        if (!name) {
            $('#prodNameErr').removeClass('hidden');
            isValid = false;
        }

        if (isNaN(price) || price < 0) {
            $('#prodPriceErr').removeClass('hidden');
            isValid = false;
        }

        if (!isValid) return;

        const submitBtn = $('#saveProductSubmitBtn');
        submitBtn.prop('disabled', true).addClass('opacity-50');

        try {
            let res;
            if (id) {
                // Update
                res = await CakeApi.products.update({
                    id: parseInt(id),
                    code: code,
                    name: name,
                    price: price
                });
            } else {
                // Create
                res = await CakeApi.products.create({
                    code: code,
                    name: name,
                    price: price
                });
            }

            if (res.success) {
                if (window.CakeApp && typeof window.CakeApp.showToast === 'function') {
                    window.CakeApp.showToast(res.message || 'Product saved successfully!', 'success');
                } else {
                    alert(res.message || 'Product saved successfully!');
                }
                closeModal();
                loadProducts($('#productSearchInput').val().trim());
            } else {
                alert(res.message || 'Failed to save product.');
            }
        } catch (err) {
            console.error('Save product error:', err);
            alert('An error occurred while saving product.');
        } finally {
            submitBtn.prop('disabled', false).removeClass('opacity-50');
        }
    }

    async function deleteProduct(id, name) {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        const res = await CakeApi.products.delete(id);
        if (res.success) {
            if (window.CakeApp && typeof window.CakeApp.showToast === 'function') {
                window.CakeApp.showToast(`Product "${name}" deleted.`, 'success');
            }
            loadProducts($('#productSearchInput').val().trim());
        } else {
            alert(res.message || 'Failed to delete product.');
        }
    }

    function init() {
        loadProducts();

        // Search Input (Realtime typing with debounce)
        let searchTimer = null;
        $(document).off('input', '#productSearchInput').on('input', '#productSearchInput', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                loadProducts($(this).val().trim());
            }, 250);
        });

        // Add Product Button
        $(document).off('click', '#addNewProductBtn').on('click', '#addNewProductBtn', function () {
            openModal('add');
        });

        // Edit Product Button
        $(document).off('click', '.edit-prod-btn').on('click', '.edit-prod-btn', function () {
            const data = {
                id: $(this).data('id'),
                code: $(this).data('code'),
                name: $(this).data('name'),
                price: $(this).data('price')
            };
            openModal('edit', data);
        });

        // Delete Product Button
        $(document).off('click', '.delete-prod-btn').on('click', '.delete-prod-btn', function () {
            const id = $(this).data('id');
            const name = $(this).data('name');
            deleteProduct(id, name);
        });

        // Modal Close Buttons
        $(document).off('click', '#closeProductModalBtn, #cancelProductModalBtn').on('click', '#closeProductModalBtn, #cancelProductModalBtn', function () {
            closeModal();
        });

        // Modal Backdrop Click
        $(document).off('click', '#productModal').on('click', '#productModal', function (e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // Form Submit
        $(document).off('submit', '#productForm').on('submit', '#productForm', function (e) {
            handleFormSubmit(e);
        });
    }

    return {
        init,
        loadProducts,
        openModal,
        closeModal
    };

})();
