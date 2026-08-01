/* admin-only/features/members/members.js */
window.adminFeatureModules = window.adminFeatureModules || {};
window.adminFeatureModules["members"] = {
    init() {
        if (typeof renderMembers === "function") renderMembers();
    }
};
