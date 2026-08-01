


const  = require('../dashboard');




/**
 * Unit tests for the `init` method in admin-only/features/dashboard/dashboard.js
 * The tests cover both happy paths and edge cases to ensure maximum coverage.
 */

describe('init() init method', () => {
    const originalAdminFeatureModules = window.adminFeatureModules;
    const originalRenderDashboard = window.renderDashboard;

    afterEach(() => {
        window.adminFeatureModules = originalAdminFeatureModules;
        window.renderDashboard = originalRenderDashboard;
        jest.restoreAllMocks();
    });

    describe('Happy paths', () => {
        test('should call renderDashboard when renderDashboard is defined as a function', () => {
            const mockRenderDashboard = jest.fn();
            window.renderDashboard = mockRenderDashboard;

            jest.resetModules();
            require("../dashboard.js").init();

            expect(mockRenderDashboard).toHaveBeenCalledTimes(1);
        });

        test('should not throw if renderDashboard is defined as a function', () => {
            window.renderDashboard = jest.fn();

            jest.resetModules();
            expect(() => {
                require("../dashboard.js").init();
            }).not.toThrow();
        });
    });

    describe('Edge cases', () => {
        test('should not throw or call anything if renderDashboard is undefined', () => {
            delete window.renderDashboard;

            jest.resetModules();
            expect(() => {
                require("../dashboard.js").init();
            }).not.toThrow();
        });

        test('should not call renderDashboard if it is not a function (e.g., a string)', () => {
            window.renderDashboard = "notAFunction";
            const spy = jest.spyOn(window, 'renderDashboard', 'get');

            jest.resetModules();
            require("../dashboard.js").init();

            expect(spy).not.toHaveBeenCalled();
        });

        test('should not call renderDashboard if it is null', () => {
            window.renderDashboard = null;

            jest.resetModules();
            require("../dashboard.js").init();

            // No error should be thrown and nothing should be called
            // (No assertion needed, test will fail if error is thrown)
        });

        test('should not call renderDashboard if it is an object', () => {
            window.renderDashboard = {};

            jest.resetModules();
            require("../dashboard.js").init();

            // No error should be thrown and nothing should be called
        });

        test('should not throw if window.adminFeatureModules is undefined before init', () => {
            delete window.adminFeatureModules;
            window.renderDashboard = jest.fn();

            jest.resetModules();
            expect(() => {
                require("../dashboard.js").init();
            }).not.toThrow();
        });
    });
});