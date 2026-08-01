/* admin-only/features/dashboard/dashboard.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["dashboard"] = {
    init() {
        if (typeof renderDashboard === "function") renderDashboard();
    }
};
