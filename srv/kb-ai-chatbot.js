const cds = require('@sap/cds');

const { executePOSTDestination, executeGETDestination, executeDELETEDestination } = require('./handlers/dest.js');
const mLogs = cds.log('logger');
const { SUCCESS, INFO, ERROR, STATUS_CODE } = require('./constants/index');
const { INSERT, DELETE } = require('@sap/cds/lib/ql/cds-ql.js');
class ChatbotService extends cds.ApplicationService {
    init() {

        const { ChatbotData } = this.entities;

        this.on('askChatbot', async (req) => {
            const reqAction = '/ai/chat';
            const { question: userQuestion, sessionId, fileName } = req.data;

            try {
                mLogs.info(INFO.SEND_REQUEST);

                // Send this chat's earlier turns so the API keeps context even after it restarts.
                // Rows saved before sessionId existed are one-turn chats keyed by their ID.
                const history = sessionId ? await SELECT.from(ChatbotData)
                    .columns('chatbotQuestion as question', 'chatbotAnswer as answer')
                    .where`sessionId = ${sessionId} or ID = ${sessionId}`
                    .orderBy('createdAt') : [];

                const payload = {
                    question: userQuestion,
                    session_id: sessionId,
                    history
                };

                // The API rejects an empty filename; leaving it out searches all files.
                if (fileName) {
                    payload.filename = fileName;
                }

                const res = await executePOSTDestination(reqAction, payload);
                // Older API versions send no sources and may send tools_used: null.
                const sources = res.sources || [];

                await INSERT.into(ChatbotData).entries({
                    ID: cds.utils.uuid(),
                    sessionId: res.session_id,
                    chatbotQuestion: userQuestion,
                    chatbotAnswer: res.answer,
                    sources: JSON.stringify(sources)
                });

                mLogs.info(SUCCESS.REQUEST_RECEIVED);
                return { answer: res.answer, sources, toolsUsed: res.tools_used || [] };

            } catch (error) {
                mLogs.error(ERROR.REQUEST_ERROR, error);
                return req.reject(STATUS_CODE.SERVER_ERROR, ERROR.REQUEST_ERROR);
            }
        });

        this.on('READ', ChatbotData, async () => {
            try {
                const data = await SELECT.from(ChatbotData).orderBy('createdAt');
                return data;
            } catch (error) {
                mLogs.error(ERROR.READ_ERROR, error);
                return {
                    statusCode: STATUS_CODE.SERVER_ERROR,
                    MESSAGE: ERROR.READ_ERROR
                };
            }
        });

        this.on('uploadFile', async (req) => {
            const reqAction = '/ai/upload';
            const uploadedFile = req.data.file;
            const fileName = req.data.fileName;

            try {
                mLogs.info(INFO.UPLOADING_FILE);

                const buffer = Buffer.from(uploadedFile, 'base64');
                const payload = new FormData();
                payload.append(
                    'file',
                    new Blob([buffer]),
                    fileName
                );

                const res = await executePOSTDestination(reqAction, payload);
                
                mLogs.info(SUCCESS.REQUEST_RECEIVED);

                mLogs.info(SUCCESS.INSERT_SUCCESS);

                return SUCCESS.INSERT_SUCCESS;

            } catch (error) {
                mLogs.error(ERROR.REQUEST_ERROR, error);

                return {
                    statusCode: STATUS_CODE.SERVER_ERROR,
                    message: ERROR.REQUEST_ERROR
                }
            }
        });

        this.on('readFiles', async () => {
            const reqAction = '/ai/files';

            try {
                const res = await executeGETDestination(reqAction);
                
                return res;
            } catch (error) {
                mLogs.error(ERROR.READ_ERROR, error);
                return {
                    statusCode: STATUS_CODE.SERVER_ERROR,
                    MESSAGE: ERROR.READ_ERROR
                };
            }
        });

        this.on('deleteFile', async (req) => {
            const deletedFiles = req.data.filenames;
            const reqAction = `/ai/files`; 

            try { 
                mLogs.info(INFO.DELETING_FILE);
                
                const payload = {
                    filenames: deletedFiles
                };

                const res = await executeDELETEDestination(reqAction, payload);

                mLogs.info(SUCCESS.DELETE_SUCCESS);

                return SUCCESS.DELETE_SUCCESS;
            } catch (error) {
                mLogs.error(ERROR.REQUEST_ERROR, error);
                return {
                    statusCode: STATUS_CODE.SERVER_ERROR,
                    MESSAGE: ERROR.REQUEST_ERROR
                };
            }
        }); 

        return super.init();
    }
}

module.exports = { ChatbotService };