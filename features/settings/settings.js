/* admin-only/features/settings/settings.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["settings"] = {
    init() {
        if (typeof renderSettings === "function") renderSettings();
    }
};
