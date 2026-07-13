const cds = require('@sap/cds');
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
const mLogs = cds.log('logger');

async function executePOSTDestination(reqAction, payload, headers = {}) {
    const response = await executeHttpRequest(
        { destinationName: 'KB_AI_POC' },
        {
            method: 'POST',
            url: reqAction,
            headers: {
                Accept: 'application/json',
                ...headers
            },
            data: payload
        },
        {
            fetchCsrfToken: false
        }
    );

    return response.data;
}

async function executeGETDestination(reqAction) {
    const response = await executeHttpRequest(
        { destinationName: 'KB_AI_POC' },
        {
            method: 'GET',
            url: reqAction,
            headers: {
                ContentType: 'application/json'
            },
        },
        {
            fetchCsrfToken: false
        }
    );

    return response.data;
}

async function executeDELETEDestination(reqAction, payload, headers = {}) {
    const response = await executeHttpRequest(
        { destinationName: 'KB_AI_POC' },
        {
            method: 'DELETE',
            url: reqAction,
            headers: {
                Accept: 'application/json',
                ...headers
            },
            data: payload
        },
        {
            fetchCsrfToken: false
        }
    );

    return response.data;
}

module.exports = {
    executePOSTDestination,
    executeGETDestination,
    executeDELETEDestination
};