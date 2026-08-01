/* admin-only/features/progress/progress.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["progress"] = {
    init() {
        if (typeof renderProgress === "function") renderProgress();
    }
};
