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
            const userQuestion = req.data.question;

            try {
                mLogs.info(INFO.SEND_REQUEST);

                const payload = {
                    question: userQuestion
                };

                const res = await executePOSTDestination(reqAction, payload);

                await INSERT.into(ChatbotData).entries({
                    ID: res.session_id,
                    chatbotQuestion: userQuestion,
                    chatbotAnswer: res.answer
                });

                mLogs.info(SUCCESS.REQUEST_RECEIVED);
                return SUCCESS.REQUEST_RECEIVED;

            } catch (error) {
                mLogs.error(ERROR.REQUEST_ERROR, error);
                return {
                    statusCode: STATUS_CODE.SERVER_ERROR,
                    MESSAGE: ERROR.REQUEST_ERROR
                };
            }
        });

        this.on('READ', ChatbotData, async () => {
            try {
                const data = await SELECT.from(ChatbotData);
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