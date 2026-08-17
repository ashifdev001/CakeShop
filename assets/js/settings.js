/**
 * settings.js
 * General Settings Controller: Live Core PHP API Key-Value Store Management
 */

window.CakeSettings = (function () {

    let originalSettings = {};

    async function loadSettings() {
        const res = await CakeApi.settings.get();

        if (res.success && res.settings) {
            originalSettings = res.settings;

            $('#setting_site_name').val(originalSettings.site_name || 'Cakino');
            $('#setting_tagline').val(originalSettings.tagline || 'The Cake Art');
            $('#setting_currency_symbol').val(originalSettings.currency_symbol || '₹');
            $('#setting_phone').val(originalSettings.phone || '');
            $('#setting_email').val(originalSettings.email || '');
            $('#setting_address').val(originalSettings.address || '');
            $('#setting_tax_rate').val(originalSettings.tax_rate || '5');
            $('#setting_receipt_footer').val(originalSettings.receipt_footer || '');
        } else {
            console.error('Failed to load settings:', res.message);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const siteName = $('#setting_site_name').val().trim();
        if (!siteName) {
            alert('Shop / Brand Name is required!');
            $('#setting_site_name').focus();
            return;
        }

        const settingsPayload = {
            site_name: siteName,
            tagline: $('#setting_tagline').val().trim(),
            currency_symbol: $('#setting_currency_symbol').val().trim() || '₹',
            phone: $('#setting_phone').val().trim(),
            email: $('#setting_email').val().trim(),
            address: $('#setting_address').val().trim(),
            tax_rate: $('#setting_tax_rate').val() || '5',
            receipt_footer: $('#setting_receipt_footer').val().trim()
        };

        const saveBtn = $('#saveSettingsBtn');
        saveBtn.prop('disabled', true).addClass('opacity-50');

        try {
            const res = await CakeApi.settings.update(settingsPayload);

            if (res.success) {
                originalSettings = { ...originalSettings, ...settingsPayload };

                // Update sidebar brand name live if modified
                $('.font-display.font-bold.text-lg.text-white').first().text(settingsPayload.site_name);

                if (window.CakeApp && typeof window.CakeApp.showToast === 'function') {
                    window.CakeApp.showToast('General Settings updated successfully!', 'success');
                } else {
                    alert('General Settings updated successfully!');
                }
            } else {
                alert(res.message || 'Failed to update settings.');
            }
        } catch (err) {
            console.error('Settings update error:', err);
            alert('An error occurred while updating settings.');
        } finally {
            saveBtn.prop('disabled', false).removeClass('opacity-50');
        }
    }

    function init() {
        loadSettings();

        // Form Submit
        $(document).off('submit', '#settingsForm').on('submit', '#settingsForm', function (e) {
            handleFormSubmit(e);
        });

        // Reset Button
        $(document).off('click', '#reloadSettingsBtn').on('click', '#reloadSettingsBtn', function () {
            loadSettings();
        });
    }

    return {
        init,
        loadSettings
    };

})();
