using {kb_chatbot as kb} from '../db/kb_chatbot';

service ChatbotService @(path: 'kb-ai-chatbot') {

    action askChatbot(question: String, sessionId: String) returns String;

    entity ChatbotData as projection on kb.ChatbotData;

    action uploadFile(file: LargeString, fileName: String) returns String;

    function readFiles() returns array of String;

    action deleteFile(filenames: array of String) returns String;


}