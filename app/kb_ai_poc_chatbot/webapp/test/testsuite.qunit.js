sap.ui.define(function () {
    "use strict";

    return {
        name: "QUnit test suite for com.takeda.kbaipocchatbot",
        defaults: {
            page: "ui5://test-resources/com/takeda/kbaipocchatbot/Test.qunit.html?testsuite={suite}&test={name}",
            qunit: {
                version: 2
            },
            ui5: {
                theme: "sap_horizon"
            },
            loader: {
                paths: {
                    "com/takeda/kbaipocchatbot": "../"
                }
            }
        },
        tests: {
            "unit/model/markdown": {
                title: "Unit tests for model/markdown"
            }
        }
    };
});
