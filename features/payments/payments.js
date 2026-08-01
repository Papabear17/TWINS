/* admin-only/features/payments/payments.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["payments"] = {
    init() {
        if (typeof renderPayments === "function") renderPayments();
    }
};
