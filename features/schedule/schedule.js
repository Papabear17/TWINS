/* admin-only/features/schedule/schedule.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["schedule"] = {
    init() {
        if (typeof renderSchedules === "function") renderSchedules();
    }
};
