/* admin-only/features/locations/locations.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["locations"] = {
    init() {
        if (typeof renderLocations === "function") renderLocations();
    }
};
