namespace kb_chatbot;

entity ChatbotData {
    key ID: String;
    sessionId: String; // groups a chat's turns; rows saved before it existed use ID as their session
    chatbotQuestion: LargeString;
    chatbotAnswer: LargeString; // String is NVARCHAR(5000) on HANA, too short for long answers
    sources: LargeString; // the answer's citations as JSON: [{ n, locator }]
    createdAt: Timestamp @cds.on.insert: $now;
}