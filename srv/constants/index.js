const SUCCESS = {
    REQUEST_RECEIVED: 'Received response from AI Chatbot.',
    INSERT_SUCCESS: 'Successfully uploaded file and inserted file details into the database.',
    DELETE_SUCCESS: 'Successfully deleted files from the database.'

}

const INFO = {
    SEND_REQUEST: 'Sending a question to the AI Chatbot...',
    UPLOADING_FILE: 'Uploading file...',
    DELETING_FILE: 'Deleting file...'

}

const ERROR = {
    REQUEST_ERROR: 'Error occurred while sending question to AI Chatbot.'
}

const STATUS_CODE = {
    SUCCESS: 200,
    SERVER_ERROR: 500
}

const FILE_TYPE = {
    PDF: 'pdf',
    EXCEL: 'excel'
}

module.exports = {
    SUCCESS,
    INFO,
    ERROR,
    STATUS_CODE,
    FILE_TYPE
}