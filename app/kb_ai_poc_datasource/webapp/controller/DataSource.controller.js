sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/ObjectStatus",
    "sap/ui/model/type/DateTime"
], (Controller, JSONModel, MessageToast, MessageBox, ObjectStatus, DateTime) => {
    "use strict";

    // Backend index job status → status text and ObjectStatus state
    const STATUS = {
        queued: ["dataSource.status.processing", "Warning"],
        running: ["dataSource.status.processing", "Warning"],
        complete: ["dataSource.status.uploaded", "Success"],
        failed: ["dataSource.status.failed", "Error"]
    };

    return Controller.extend("com.takeda.kbaipoc.controller.DataSource", {
        onInit() {
            const oFilesModel = new JSONModel({
                files: []
            });
            this.getView().setModel(oFilesModel, "files");
            this.byId("idDataSourceTable").bindItems({
                path: "files>/files",
                template: this._getItemTemplate()
            });

            this._loadFiles();
        },

        _getItemTemplate() {
            return new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({ text: "{files>fileName}" }),
                    new sap.m.Text({ text: { path: "files>uploadedOn", type: new DateTime({ style: "medium" }) } }),
                    new sap.m.Text({ text: "{files>uploadedBy}" }),
                    new ObjectStatus({ text: "{files>statusText}", state: "{files>statusState}" })
                ]
            });
        },

        onExit() {
            clearTimeout(this._iStatusTimer);
        },

        _loadFiles() {
            fetch("/odata/v4/kb-ai-chatbot/readFiles()")
            .then((oResponse) => oResponse.json())
            .then((oData) => {
                const aRawFiles = oData.value?.[0]?.files || [];
                const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                const aFiles = aRawFiles.map((oFile) => {
                    const [sStatusKey, sStatusState] = STATUS[oFile.status] || STATUS.complete;

                    return {
                        fileName: oFile.filename || "",
                        // a Date, so the DateTime type shows it in the user's timezone
                        uploadedOn: oFile.uploaded_at ? new Date(oFile.uploaded_at) : null,
                        uploadedBy: oFile.uploaded_by || "anonymous@email.com",
                        statusText: oBundle.getText(sStatusKey),
                        statusState: sStatusState
                    };
                });

                this.getView().getModel("files").setProperty("/files", aFiles);

                // Re-check while files are still being indexed so their status updates without a reload
                clearTimeout(this._iStatusTimer);
                if (aRawFiles.some((oFile) => ["queued", "running"].includes(oFile.status))) {
                    this._iStatusTimer = setTimeout(() => this._loadFiles(), 5000);
                }
            })
            .catch((oError) => {
                console.error("Error loading files:", oError);
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
        },

        onRefreshFiles() {
            this._loadFiles();
        },

        onSelectionChange(oEvent) {
            const oTable = oEvent.getSource();
            const bHasSelection = oTable.getSelectedItems().length > 0;

            this.byId("idDeleteFilesBtn").setEnabled(bHasSelection);
        },

        onDeleteFiles: function () {
            const oTable = this.byId("idDataSourceTable");
            const aSelectedItems = oTable.getSelectedItems();
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            
            MessageBox.confirm(oBundle.getText("dataSource.delete.confirm"),
            {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                
                onClose: (sAction) => {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    
                    const aFileNames = aSelectedItems.map((oItem) =>
                        oItem.getBindingContext("files").getObject().fileName
                    );
                    fetch("/odata/v4/kb-ai-chatbot/deleteFile", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            filenames: aFileNames
                                })
                            })
                            .then((oResponse) =>
                                oResponse.json().then((oResult) => ({
                                    ok: oResponse.ok,
                                    result: oResult
                                }))
                            )
                        .then(({ ok, result }) => {
                            if (!ok || result.statusCode >= 400) {
                                throw new Error(
                                    result?.message ||
                                    oBundle.getText("dataSource.delete.error")
                                );
                            }
                    
                            MessageToast.show(oBundle.getText("dataSource.delete.success"));
                    
                            oTable.removeSelections(true);
                            this.byId("idDeleteFilesBtn").setEnabled(false);
                    
                            this._loadFiles();
                        })
                        .catch((oError) => {
                            console.error("Delete Error:", oError);
                    
                            MessageBox.error(
                                oError.message ||
                                oBundle.getText("dataSource.delete.error")
                            );
                        });
                    }
                }
            );
        },

        handleUploadPress() {
            const oUploader = this.byId("fileUploader");
            const oDomRef = oUploader.getFocusDomRef();
            const oBundle = this.getView().getModel("i18n").getResourceBundle();
            
            if (!oDomRef || !oDomRef.files.length) {MessageToast.show(oBundle.getText("dataSource.upload.selectFile"));
                return;
            }
            
            const oFile = oDomRef.files[0];
            
            if (!oFile) {MessageToast.show(oBundle.getText("dataSource.upload.selectFile"));
                return;
            }
            
            const oFilesModel = this.getView().getModel("files");
            const aExistingFiles = oFilesModel.getProperty("/files") || [];

            const bFileAlreadyExists = aExistingFiles.some((oExistingFile) =>
                oExistingFile.fileName === oFile.name
            );

            if (bFileAlreadyExists) {MessageBox.error(oBundle.getText("dataSource.upload.fileExists", [oFile.name]));
            return;
            }

            const oReader = new FileReader();
            oReader.onload = async (oEvent) => {
                try {
                    const sBase64 = oEvent.target.result.split(",")[1];
                    const oPayload = {
                        file: sBase64,
                        fileName: oFile.name
                    };
                    const oResponse = await fetch("/odata/v4/kb-ai-chatbot/uploadFile", 
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(oPayload)
                        });

                    const oResult = await oResponse.json();

                    if (!oResponse.ok || oResult.statusCode >= 400) {
                        const sErrorMessage =
                            oResult?.detail ||
                            oResult?.message ||
                            oResult?.data?.detail ||
                            oResult?.error?.message ||
                            oBundle.getText("dataSource.upload.failed");

                        throw new Error(sErrorMessage);
                    }

                    MessageToast.show(oBundle.getText("dataSource.upload.success"));
                    oUploader.clear();
                    this._loadFiles();
                } catch (oError) {
                    console.error("Upload Error:", oError);

                    MessageBox.error(
                        oError.message || oBundle.getText("dataSource.upload.error")
                    );
                }
            };
            oReader.readAsDataURL(oFile);
        }

    });
});