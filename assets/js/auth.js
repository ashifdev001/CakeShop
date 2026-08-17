/**
 * auth.js
 * Frontend Authentication & Session Management with Core PHP Backend
 */

window.CakeAuth = (function () {

    let currentUser = null;

    async function checkAuth() {
        const res = await CakeApi.auth.check();
        if (res.success && res.logged_in) {
            currentUser = res.user;
            if ($('#loggedInUserDisplay').length) {
                $('#loggedInUserDisplay').text(currentUser.full_name || currentUser.username);
            }
            return true;
        } else {
            currentUser = null;
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            return false;
        }
    }

    async function checkAlreadyLoggedIn() {
        const res = await CakeApi.auth.check();
        if (res.success && res.logged_in) {
            if (window.location.pathname.endsWith('login.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    async function login(username, password) {
        const res = await CakeApi.auth.login(username, password);
        if (res.success) {
            currentUser = res.user;
            return { success: true, user: res.user };
        } else {
            return { success: false, message: res.message || 'Invalid credentials' };
        }
    }

    async function logout() {
        await CakeApi.auth.logout();
        currentUser = null;
        window.location.href = 'login.html';
    }

    function getUsername() {
        return currentUser ? (currentUser.full_name || currentUser.username) : 'Administrator';
    }

    function getUser() {
        return currentUser;
    }

    return {
        checkAuth,
        checkAlreadyLoggedIn,
        login,
        logout,
        getUsername,
        getUser
    };

})();
