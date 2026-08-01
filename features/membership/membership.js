/* admin-only/features/membership/membership.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["membership"] = {
    init() {
        if (typeof renderMembership === "function") renderMembership();
    }
};
