sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.takeda.kbaipocchatbot.controller.Chatbot", {
        onInit: function () {
            const oChatModel = new JSONModel({
                selectedChatKey: "incidentTicket",
                dataSource: "Guide.xlsx",
                aiModel: "gpt-5.4-mini",
                title: "",
                messages: [],
                chatHistory: [
                    {
                        key: "incidentTicket",
                        title: "How to log a Incident Ticket",
                        description: "Today, 10:30 AM",
                        messages: [
                            {
                                role: "user",
                                timestamp: "10:30 AM",
                                text: "How to log an Incident ticket in service now what is the step by step process"
                            },
                            {
                                role: "assistant",
                                timestamp: "10:33 AM",
                                htmlText: "Based on the Takeda Guide, here are the steps to process an incident request:<br/><br/>" +
                                    "1. Log the incident - Record the incident in the tracking system with all relevant details<br/>" +
                                    "2. Categorize and prioritize - Assign appropriate category and priority level based on impact<br/>" +
                                    "3. Assign to appropriate team - Route to the correct resolver group<br/>" +
                                    "4. Monitor and resolve - Track progress and ensure resolution within SLA<br/>" +
                                    "5. Document and close - Update records and close the incident ticket"
                            }
                        ]
                    },
                    {
                        key: "dasProcess",
                        title: "What is DAS Process",
                        description: "Today, 9:30 PM",
                        messages: [
                            {
                                role: "user",
                                timestamp: "9:30 PM",
                                text: "What is DAS Process?"
                            },
                            {
                                role: "assistant",
                                timestamp: "9:31 PM",
                                htmlText: "The DAS process was followed to ensure a structured and comprehensive approach to solution design and implementation.<br/><br/>" +
                                "<b>Define / Design:</b> The requirements were clearly identified and documented, including business needs, system scope, and expected outcomes. Initial design considerations were aligned with existing architecture and standards.<br/><br/>" +
                                "<b>Analyze:</b> A detailed analysis was conducted to evaluate feasibility, dependencies, and potential risks. This included reviewing current processes, identifying gaps, and assessing the impact of proposed changes on both frontend and backend systems.<br/><br/>" +
                                "<b>Solution:</b> Based on the analysis, a solution was designed and implemented to address the identified requirements. The approach ensures scalability, maintainability, and alignment with best practices. Necessary validations, error handling, and system integrations were incorporated to ensure a robust implementation."
                            }
                        ]
                    }
                ]
            });

            this.getView().setModel(oChatModel, "chat");
            this._loadSelectedChat();
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

            oSelectedChat.messages.push({
                role: "assistant",
                timestamp: sTime,
                htmlText: "This is a sample AI response for your message.<br/><br/>" +
                    "Once your backend is ready, this can be replaced by the actual service response."
            });

            oSelectedChat.description = "Today, " + sTime;

            if (oSelectedChat.title === "New Chat" && oSelectedChat.messages.length === 2) {
                oSelectedChat.title = sMessage;
            }

            oModel.setProperty("/chatHistory", aChatHistory);
            oModel.setProperty("/title", oSelectedChat.title);
            oModel.setProperty("/messages", oSelectedChat.messages);

            this.byId("chatFeedInputId").setValue("");
            this._delayedScrollToBottom();
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