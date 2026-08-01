/* admin-only/features/orgchart/orgchart.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["orgchart"] = {
    init() {
        if (typeof renderOrgChart === "function") renderOrgChart();
    }
};
