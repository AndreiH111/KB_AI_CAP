sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("com.takeda.kbaipoc.controller.DataSource", {
        onInit() {
            const oMockData = {
                DataSourceSet: [
                    {
                        fileName: "UserGuide.xlsx",
                        uploadedOn: "2026-06-10",
                        uploadedBy: "andrei-kyle.hidalgo@takeda.com",
                        status: "Upload Complete"
                    },
                    {
                        fileName: "Tutorial_A.xlsx",
                        uploadedOn: "2026-06-11",
                        uploadedBy: "john.doe@takeda.com",
                        status: "Upload Failed"
                    },
                    {
                        fileName: "Tutorial_B.xlsx",
                        uploadedOn: "2026-06-12",
                        uploadedBy: "jane.smith@takeda.com",
                        status: "Processing"
                    },
                    {
                        fileName: "TrainingMaterial.xlsx",
                        uploadedOn: "2026-06-13",
                        uploadedBy: "dora.chung@takeda.com",
                        status: "Upload Complete"
                    }
                ]
            };

            const oModel = new JSONModel(oMockData);
            this.getView().setModel(oModel);

            // Bind table manually
            this.byId("idDataSourceTable").bindItems({
                path: "/DataSourceSet",
                template: this._getItemTemplate()
            });
        },

        _getItemTemplate() {
            return new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({ text: "{fileName}" }),
                    new sap.m.Text({ text: "{uploadedOn}" }),
                    new sap.m.Text({ text: "{uploadedBy}" }),
                    new sap.m.Text({ text: "{status}" })
                ]
            });
        },

        _updateTableTitle(iCount) {
            const oTitle = this.byId("idDataSourceTableTitle");
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            oTitle.setText(oBundle.getText("dataSource.tableTitle", [iCount]));
        },
        
        onUpdateFinished(oEvent) {
        const iCount = oEvent.getSource().getItems().length;
        this._updateTableTitle(iCount);
        }

    });
});