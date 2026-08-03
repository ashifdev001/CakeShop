/**
 * app.js
 * Main Dashboard Application Controller
 * Handles SPA page loading, sidebar navigation, mobile toggle, and toasts.
 */

window.CakeApp = (function () {

    let currentPageName = 'dashboard';

    const pageTitleMap = {
        'dashboard': 'Dashboard',
        'billing': 'Billing System',
        'orders': 'Order Management'
    };

    function showToast(message, type = 'success') {
        const toast = $('#toast');
        $('#toastMessage').text(message);

        if (type === 'error') {
            $('#toastIcon').removeClass('fa-circle-check text-emerald-400').addClass('fa-circle-exclamation text-red-400');
        } else {
            $('#toastIcon').removeClass('fa-circle-exclamation text-red-400').addClass('fa-circle-check text-emerald-400');
        }

        toast.removeClass('hidden-toast');

        setTimeout(function () {
            toast.addClass('hidden-toast');
        }, 3500);
    }

    function loadPage(pageName) {
        if (!['dashboard', 'billing', 'orders'].includes(pageName)) {
            pageName = 'dashboard';
        }

        currentPageName = pageName;

        // Highlight Active Sidebar Link
        $('.nav-link').removeClass('bg-rose-600 text-white font-bold shadow-sm').addClass('text-slate-300 hover:bg-slate-800 hover:text-white font-semibold');
        $(`.nav-link[data-page="${pageName}"]`).removeClass('text-slate-300 hover:bg-slate-800').addClass('bg-rose-600 text-white font-bold shadow-sm');

        // Update Page Title Header
        $('#headerTitle').text(pageTitleMap[pageName] || 'Dashboard');

        // Load Page HTML from pages/[pageName].html
        const pagePath = `pages/${pageName}.html`;

        $('#mainContent').addClass('opacity-50');

        $.ajax({
            url: pagePath,
            type: 'GET',
            dataType: 'html',
            success: function (htmlContent) {
                $('#mainContent').html(htmlContent).removeClass('opacity-50');

                // Initialize corresponding module JS
                if (pageName === 'dashboard' && window.CakeDashboard) {
                    window.CakeDashboard.init();
                } else if (pageName === 'billing' && window.CakeBilling) {
                    window.CakeBilling.init();
                } else if (pageName === 'orders' && window.CakeOrders) {
                    window.CakeOrders.init();
                }

                // Close mobile sidebar after navigating
                if ($(window).width() < 1024) {
                    closeMobileSidebar();
                }
            },
            error: function (xhr, status, error) {
                console.error(`Failed to load page ${pagePath}:`, error);
                $('#mainContent').html(`
                    <div class="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
                        <h3 class="font-bold text-lg">Error Loading Page</h3>
                        <p class="text-xs text-slate-600 mt-1">Unable to load pages/${pageName}.html. Please verify browser permissions.</p>
                    </div>
                `).removeClass('opacity-50');
            }
        });
    }

    function toggleMobileSidebar() {
        $('#sidebar').toggleClass('-translate-x-full');
        $('#sidebarBackdrop').toggleClass('hidden');
    }

    function closeMobileSidebar() {
        $('#sidebar').addClass('-translate-x-full');
        $('#sidebarBackdrop').addClass('hidden');
    }

    function init() {
        // Guard check auth session
        if (!CakeAuth.checkAuth()) return;

        // Update logged in user name display
        $('#loggedInUserDisplay').text(CakeAuth.getUsername());

        // Sidebar Navigation click
        $('.nav-link').click(function (e) {
            e.preventDefault();
            const page = $(this).data('page');
            if (page) {
                loadPage(page);
            }
        });

        // Mobile Hamburger Toggle
        $('#sidebarToggleBtn, #sidebarBackdrop').click(function () {
            toggleMobileSidebar();
        });

        // Logout Click
        $('#logoutBtn').click(function (e) {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                CakeAuth.logout();
            }
        });

        // Initial default page load
        loadPage('dashboard');
    }

    return {
        init,
        loadPage,
        showToast
    };

})();

// Initialize on DOM Ready
$(document).ready(function () {
    CakeApp.init();
});
