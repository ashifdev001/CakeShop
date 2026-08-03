/**
 * auth.js
 * Frontend Authentication & Session Management
 */

window.CakeAuth = (function () {

    const SESSION_KEY = 'cakeShopLoggedIn';
    const USERNAME_KEY = 'cakeShopUsername';

    function checkAuth() {
        const isLoggedIn = localStorage.getItem(SESSION_KEY) === 'true';
        if (!isLoggedIn) {
            // If on main application page, redirect to login
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            return false;
        }
        return true;
    }

    function checkAlreadyLoggedIn() {
        const isLoggedIn = localStorage.getItem(SESSION_KEY) === 'true';
        if (isLoggedIn && window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
        }
    }

    function login(username, password) {
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem(SESSION_KEY, 'true');
            localStorage.setItem(USERNAME_KEY, username);
            return { success: true };
        } else {
            return { success: false, message: 'Invalid Username or Password!' };
        }
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USERNAME_KEY);
        window.location.href = 'login.html';
    }

    function getUsername() {
        return localStorage.getItem(USERNAME_KEY) || 'Administrator';
    }

    return {
        checkAuth,
        checkAlreadyLoggedIn,
        login,
        logout,
        getUsername
    };

})();
