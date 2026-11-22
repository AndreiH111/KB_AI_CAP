namespace kb_chatbot;

entity ChatbotData {
    key ID: String;
    sessionId: String; // groups a chat's turns; rows saved before it existed use ID as their session
    chatbotQuestion: String;
    chatbotAnswer: String;
    createdAt: Timestamp @cds.on.insert: $now;
}