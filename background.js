const linkedinJobPage = "https://www.linkedin.com/voyager/api/jobs/jobPostings/*";
const linkedinCookieDomain = "https://www.linkedin.com";
const linkedInCookieName = "JSESSIONID";
const csrfLsKey = "linkdinCsrfToken";

const openaiDomain = "https://chat.openai.com"
const openaiCookieName = '__Secure-next-auth.session-token';
const sessionLsKey = 'secureSessionToken';
const conversationIdKey = 'conversationId';
const loginSessionUrl = 'https://chat.openai.com/api/auth/session';

const llmFunctionUrl = 'https://resumatch-rqthba6dyq-zf.a.run.app';
let sessionToken, conversationId, csrfKey;

// Listen to job pages web requests
chrome.webRequest.onCompleted.addListener(
    function(details) {
        if (
            details.type === "xmlhttprequest" &&
            !details.url.includes("replay=true")
        ) {
        // Post message to the relevant tab
        chrome.tabs.sendMessage(details.tabId, { action: 'loadJob', url: details.url });
        }
    },
    {urls: [linkedinJobPage]}
);

// Listen to login action in chat gpt
chrome.webRequest.onCompleted.addListener(
    function(details) {
        console.log('Initialize');
        initialize();
    },
    {urls: [loginSessionUrl]}
);

// Helper function to get local storage value with Promise
function getLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key],function(result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

// Helper function to get local storage value with Promise
function getLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function(result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result[key]);
            }
        });
    });
}

// Helper function to update conversation ID
function updateConversationId() {
    if (sessionToken) {
        fetch(llmFunctionUrl + '/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "session_token": sessionToken }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.data.conversation_id !== undefined) {
                chrome.storage.local.set({ 'conversationId': data.data.conversation_id }, function() {
                    console.log('Conversation Id updated successfully');
                });
            }
        })
        .catch(error => console.error('Error sending to server:', error));
    } else {
        console.log('Cannot set conversation Id. Session token is missing.');
    } 
}

// Helper function to get cookie
function getCookie(cookieName, domain) {
    return new Promise((resolve, reject) => {
        const queryInfo = { url: domain, name: cookieName };
        chrome.cookies.get(queryInfo, function(result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                console.log(result);
                resolve(result);
            }
        });
    });
}

// Helper function to truncate local storage
function truncateLocalStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function() {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        }); 
    });
}

async function initialize() {
    try {
        // Truncate old data in local storage
        await truncateLocalStorage();
        
        // Get chatGPT cookie
        const cookie = await getCookie(openaiCookieName, openaiDomain);
        console.log(cookie);
        
        // Get token from cookie and set in local storage
        if (cookie && cookie.value) {
            const currentToken = await getLocalStorage(sessionLsKey);
            if (currentToken !== cookie.value) {
                // Update local storage
                chrome.storage.local.set({ sessionLsKey: cookie.value }, function() {
                    console.log('Session Token set in Local Storage');
                });
            }
            sessionToken = cookie.value;
        } else {
            // If cookie does not exist, remove the current session token from LS
            chrome.storage.local.remove([sessionLsKey]);
        }
        
        // Set conversation Id
        const conversationIdLs = await getLocalStorage(conversationIdKey);
        if (conversationId !== undefined) {
            conversationId = conversationIdLs;
        } else {
            updateConversationId();
        }
        
        // Update CSRF Token
        const csrfCookie = await getCookie(linkedInCookieName, linkedinCookieDomain);
        if (csrfCookie && csrfCookie.value) {
            const currentCsrf = await getLocalStorage(csrfLsKey);
            const csrfToken = csrfCookie.value.replace(/"/g, '');
            if (currentCsrf !== csrfToken) {
                // Update local storage
                chrome.storage.local.set({ csrfLsKey: csrfToken }, function() {
                    console.log('Csrf set in Local Storage');
                });
            }
            csrfKey = csrfCookie.value;
        } else {
            // If cookie does not exist, remove the current session token from LS
            chrome.storage.local.remove([csrfLsKey]);
        }
    } catch (error) {
        console.error(error);
    }
}

initialize();
