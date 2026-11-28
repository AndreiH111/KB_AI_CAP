using {kb_chatbot as kb} from '../db/kb_chatbot';

// CAP's default 100kb body limit rejects uploadFile, which sends files as base64 JSON (4/3 of their size).
// shortcut: 100mb caps files at ~75 MB, buffered in memory; stream uploads instead if bigger files are needed
service ChatbotService @(path: 'kb-ai-chatbot', cds.server.body_parser.limit: '100mb') {

    action askChatbot(question: String, sessionId: String) returns String;

    entity ChatbotData as projection on kb.ChatbotData;

    action uploadFile(file: LargeString, fileName: String) returns String;

    function readFiles() returns array of String;

    action deleteFile(filenames: array of String) returns String;


}