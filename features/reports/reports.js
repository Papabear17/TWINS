/* admin-only/features/reports/reports.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["reports"] = {
    init() {
        if (typeof renderReports === "function") renderReports();
    }
};
