sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "../model/markdown"
], function (Controller, JSONModel, MessageBox, markdown) {
    "use strict";

    return Controller.extend("com.takeda.kbaipocchatbot.controller.Chatbot", {
        formatMarkdown: function (sText) {
            // sap.ui.core.HTML needs a single root node; the view sanitizes the result
            return "<div class=\"kbMarkdown\">" + markdown.toHtml(sText) + "</div>";
        },

        onInit: function () {
            const oChatModel = new JSONModel({
                selectedChatKey: "",
                busy: false,
                dataSource: "Guide.xlsx",
                aiModel: "gpt-5.4-mini",
                dataSources: [],
                aiModels: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"],
                draft: {},
                title: "",
                messages: [],
                chatHistory: []
            });

            this.getView().setModel(oChatModel, "chat");
            this._loadChatHistory();
        },

        _loadChatHistory: function () {
            const oModel = this.getView().getModel("chat");
            const oListBinding = this.getOwnerComponent().getModel().bindList("/ChatbotData", null, null, null, {
                $select: "ID,chatbotQuestion,chatbotAnswer"
            });

            oListBinding.requestContexts(0, Infinity).then((aContexts) => {
                const aChatHistory = aContexts.map((oContext) => {
                    const oChat = oContext.getObject();

                    return {
                        key: oChat.ID,
                        title: oChat.chatbotQuestion,
                        messages: [
                            { role: "user", text: oChat.chatbotQuestion },
                            { role: "assistant", htmlText: oChat.chatbotAnswer }
                        ]
                    };
                });

                oModel.setProperty("/chatHistory", aChatHistory);
                oModel.setProperty("/selectedChatKey", aChatHistory[0]?.key || "");
                this._loadSelectedChat();
            }).catch(() => {
                const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oBundle.getText("chatHistoryLoadError"));
            });
        },

        onAfterRendering: function () {
            this._scrollConversationToBottom();
        },

        onChatHistorySelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            const oContext = oSelectedItem.getBindingContext("chat");
            const sSelectedKey = oContext.getProperty("key");
            const oModel = this.getView().getModel("chat");

            oModel.setProperty("/selectedChatKey", sSelectedKey);
            this._loadSelectedChat();
        },

        onPost: function (oEvent) {
            const sMessage = oEvent.getParameter("value");
            const oModel = this.getView().getModel("chat");
            const sSelectedChatKey = oModel.getProperty("/selectedChatKey");
            const aChatHistory = oModel.getProperty("/chatHistory");
            const sTime = this._getCurrentTime();

            if (!sMessage || !sMessage.trim()) {
                return;
            }

            const oSelectedChat = aChatHistory.find(function (oChat) {
                return oChat.key === sSelectedChatKey;
            });

            if (!oSelectedChat) {
                return;
            }

            oSelectedChat.messages.push({
                role: "user",
                timestamp: sTime,
                text: sMessage
            });

            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            const oAnswer = {
                role: "assistant",
                timestamp: sTime,
                htmlText: oBundle.getText("assistantThinking")
            };

            oSelectedChat.messages.push(oAnswer);

            oSelectedChat.description = "Today, " + sTime;

            if (oSelectedChat.title === "New Chat" && oSelectedChat.messages.length === 2) {
                oSelectedChat.title = sMessage;
            }

            oModel.setProperty("/chatHistory", aChatHistory);
            oModel.setProperty("/title", oSelectedChat.title);
            oModel.setProperty("/messages", oSelectedChat.messages);

            this.byId("chatFeedInputId").setValue("");
            this._delayedScrollToBottom();
            this._askChatbot(sMessage, oAnswer);
        },

        _askChatbot: function (sQuestion, oAnswer) {
            const oModel = this.getView().getModel("chat");
            const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            const oAction = this.getOwnerComponent().getModel().bindContext("/askChatbot(...)");

            oModel.setProperty("/busy", true);
            oAction.setParameter("question", sQuestion);

            oAction.invoke().then(() => {
                oAnswer.htmlText = oAction.getBoundContext().getProperty("value");
            }).catch(() => {
                oAnswer.htmlText = oBundle.getText("assistantError");
            }).finally(() => {
                oAnswer.timestamp = this._getCurrentTime();
                oModel.setProperty("/busy", false);
                oModel.refresh(true);
                this._delayedScrollToBottom();
            });
        },

        onEditChatSettings: function () {
            const oModel = this.getView().getModel("chat");

            oModel.setProperty("/draft", {
                dataSource: oModel.getProperty("/dataSource"),
                aiModel: oModel.getProperty("/aiModel")
            });

            this._pChatSettingsDialog = this._pChatSettingsDialog || this.loadFragment({
                name: "com.takeda.kbaipocchatbot.view.ChatSettingsDialog"
            });
            this._pChatSettingsDialog.then(function (oDialog) {
                oDialog.open();
            });

            this._loadDataSources();
        },

        onSaveChatSettings: function () {
            const oModel = this.getView().getModel("chat");

            oModel.setProperty("/dataSource", oModel.getProperty("/draft/dataSource"));
            oModel.setProperty("/aiModel", oModel.getProperty("/draft/aiModel"));
            this.byId("chatSettingsDialogId").close();
        },

        onCancelChatSettings: function () {
            this.byId("chatSettingsDialogId").close();
        },

        _loadDataSources: function () {
            const oModel = this.getView().getModel("chat");
            const oFunction = this.getOwnerComponent().getModel().bindContext("/readFiles(...)");

            oFunction.invoke().then(() => {
                // readFiles reports backend failures inside value instead of as an HTTP error
                const aFiles = oFunction.getBoundContext().getObject("value")[0]?.files;

                if (!aFiles) {
                    throw new Error("readFiles returned no files");
                }

                oModel.setProperty("/dataSources", aFiles);
            }).catch(() => {
                const oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                MessageBox.error(oBundle.getText("dataSourcesLoadError"));
            });
        },

        onNewChat: function () {
            const oModel = this.getView().getModel("chat");
            const aChatHistory = oModel.getProperty("/chatHistory");
            const sKey = "chat" + Date.now();
            const sTime = this._getCurrentTime();
            const oNewChat = {
                key: sKey,
                title: "New Chat",
                description: "Today, " + sTime,
                messages: []
            };

            aChatHistory.unshift(oNewChat);

            oModel.setProperty("/chatHistory", aChatHistory);
            oModel.setProperty("/selectedChatKey", sKey);
            oModel.setProperty("/title", oNewChat.title);
            oModel.setProperty("/messages", oNewChat.messages);

            this.byId("chatFeedInputId").setValue("");
            this._delayedScrollToBottom();
        },

        _loadSelectedChat: function () {
            const oModel = this.getView().getModel("chat");
            const sSelectedChatKey = oModel.getProperty("/selectedChatKey");
            const aChatHistory = oModel.getProperty("/chatHistory");
            const oSelectedChat = aChatHistory.find(function (oChat) {
                return oChat.key === sSelectedChatKey;
            });

            if (!oSelectedChat) {
                oModel.setProperty("/title", "New Chat");
                oModel.setProperty("/messages", []);
                return;
            }

            oModel.setProperty("/title", oSelectedChat.title);
            oModel.setProperty("/messages", oSelectedChat.messages);
            this._delayedScrollToBottom();
        },

        _delayedScrollToBottom: function () {
            setTimeout(function () {
                this._scrollConversationToBottom();
            }.bind(this), 0);
        },

        _scrollConversationToBottom: function () {
            const oScrollContainer = this.byId("conversationScrollContainerId");

            if (oScrollContainer) {
                oScrollContainer.scrollTo(0, 9999999, 0);
            }
        },

        _getCurrentTime: function () {
            return new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });
        }
    });
});