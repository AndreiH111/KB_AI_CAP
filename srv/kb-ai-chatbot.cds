using {kb_chatbot as kb} from '../db/kb_chatbot';

service ChatbotService @(path: 'kb-ai-chatbot') {

    type ChatbotAnswer {
        answer: LargeString;
        sources: many { n: Integer; locator: String; }; // the answer's [n] citations
        toolsUsed: many String;
    }

    // fileName pins retrieval to one file; empty searches all files
    action askChatbot(question: String, sessionId: String, fileName: String) returns ChatbotAnswer;

    entity ChatbotData as projection on kb.ChatbotData;

    action uploadFile(file: LargeString, fileName: String) returns String;

    function readFiles() returns array of String;

    action deleteFile(filenames: array of String) returns String;


}