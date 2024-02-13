const csrfLsKey = "csrfLsKey";
const sessionLsKey = 'sessionLsKey';

const llmFunctionUrl = 'https://resumatch-rqthba6dyq-zf.a.run.app';
const resumeBuilderUrl = "https://magenta-pavlova-ea3c8a.netlify.app";

const jobBlockClass = 'job-info-list';

let accessData;
let currentJobDescription;
let currentJobId;

chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === 'loadJob') {
        // Update job Info on card
        if(accessData[csrfLsKey]){
            currentJobId = updateJobInfo(request);
        }
        // Wait until job page will load
        setTimeout(function () {
            // Add Resume Generator Button
            if(accessData[sessionLsKey]){
                addGenerateResumeButton(jobBlockClass);
                // Copy Job description
                copyJobDescription();
                // Summerise job description and check for matching to CV
                if(accessData['resumeContent']){
                    updateApplicationSummery();
                }
            }            
        }, 1000); // Adjust the delay as needed        
    }
});

// Get Job Extra Info
function getJobInfo(request) {
    return new Promise((resolve, reject) => {
        fetch(request.url + "&replay=true", {
            "headers": {
                "accept": "application/vnd.linkedin.normalized+json+2.1",
                "cache-control": "no-cache",
                "csrf-token": accessData[csrfLsKey],
            },
            "referrer": request.url,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        }).then(response => response.json())
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            reject('Error while fetching  job Info');
        });
    });
}

// Function to calculate the number of days passed from a given timestamp
function calculateDaysPassed(timestamp) {
    var now = new Date();
    var postedDate = new Date(timestamp);
    var difference = now.getTime() - postedDate.getTime();
    var daysPassed = Math.floor(difference / (1000 * 60 * 60 * 24));
    return daysPassed;
}

// Helper function to get local storage value with Promise
async function updateJobInfo(request) {
    const jobInfo = await getJobInfo(request);
    currentJobId = jobInfo.data.jobPostingId;
    refreshJobStatBlock(jobInfo);
}

// Updata statistic card in job info panel
function refreshJobStatBlock(jobInfo) {
    const topCard = document.querySelector('.jobs-unified-top-card');
    if (!topCard) {
        console.log('Job block element not found on the page');
        return;
    }

    const extraInfo = document.querySelector('.extra-info');
    if (extraInfo) {
        extraInfo.remove();
    }

    const createListItem = (label, value) => {
        const li = document.createElement("li");
        li.innerHTML = `<b>${label}: </b>${value}`;
        return li;
    };

    const createAndAppendListItems = (ul, items) => {
        items.forEach(item => {
            const li = createListItem(item.label, item.value);
            ul.appendChild(li);
        });
    };

    const createAndAppendSpinner = (container) => {
        const hr = document.createElement("hr");
        hr.className = 'extra-info-separator';
        container.appendChild(hr);

        const spinner = document.createElement('img');
        spinner.src = "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif";
        spinner.alt = 'Loading...';
        spinner.style.height = '40px';
        spinner.classList.add('spinner');
        container.appendChild(spinner);
    };

    const createExtraInfoContainer = () => {
        const extraInfo = document.createElement('div');
        extraInfo.className = 'extra-info';
        extraInfo.style.padding = "20px";
        extraInfo.style.fontSize = "13px";
        extraInfo.style.border = "1px solid #efefef";
        extraInfo.style.borderRadius = "10px";
        extraInfo.style.margin = "0px 20px 20px";
        return extraInfo;
    };

    if (jobInfo) {
        const ul = document.createElement("ul");
        ul.className = "job-info-list";
        ul.style.listStyle = "none";
        ul.style.margin = "6px";

        const items = [
            { label: 'Job Function', value: jobInfo.data.formattedJobFunctions },
            { label: 'Industry', value: jobInfo.data.formattedIndustries },
            { label: 'Original posted At', value: `${calculateDaysPassed(jobInfo.data.originalListedAt)} days ago` },
            { label: 'Last Update', value: `${calculateDaysPassed(jobInfo.data.listedAt)} days ago` },
            { label: 'Job Views', value: jobInfo.data.views },
            { label: 'Applicants', value: jobInfo.data.applies },
            { label: 'Popularity Score', value: `${((jobInfo.data.applies / jobInfo.data.views) * 100).toFixed(2)}/100`, style: 'color:red' }
        ];

        createAndAppendListItems(ul, items);

        if (accessData['resumeContent']) {
            createAndAppendSpinner(ul);
        }

        const extraInfo = createExtraInfoContainer();
        extraInfo.appendChild(document.createElement("h4")).textContent = "Job Information and Statistics";
        extraInfo.appendChild(ul);

        topCard.parentNode.insertBefore(extraInfo, topCard.nextSibling);
    }
}

// Match your skill from resume to job description and write summery
function refreshJobSummaryBlock(data) {
    const jobState = document.querySelector('.extra-info-separator');
    if (!jobState) {
        console.log('Job summary separator element not found on the page');
        return;
    }

    const createListItems = (items) => {
        const list = document.createElement("ul");
        list.style.fontSize = '13px';
        list.style.margin = '15px';
        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });
        return list;
    };

    const createAndAppendHeader = (text) => {
        const header = document.createElement("h5");
        header.textContent = text;
        header.style.textDecoration = "underline";
        header.style.marginTop = "10px";
        return header;
    };

    const createAndAppendParagraph = (text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        paragraph.style.fontSize = '13px';
        return paragraph;
    };

    const createSummaryContainer = () => {
        const summary = document.createElement("div");
        summary.id = "JobSummary";

        const div = document.createElement("div");
        div.classList.add("summary");

        const h4 = document.createElement("h4");
        h4.textContent = "Summary and recommendations";
        h4.style.fontWeight = "bold";

        const advantagesHeader = createAndAppendHeader("Advantages");
        const disadvantagesHeader = createAndAppendHeader("Disadvantages");
        const matchSkillsHeader = createAndAppendHeader("Match Skills");

        const advantagesList = createListItems(data.advantages);
        const disadvantagesList = createListItems(data.disadvantages);
        const matchSkillsParagraph = createAndAppendParagraph(data.match_skills.join(", "));

        div.appendChild(h4);
        div.appendChild(advantagesHeader);
        div.appendChild(advantagesList);
        div.appendChild(disadvantagesHeader);
        div.appendChild(disadvantagesList);
        div.appendChild(matchSkillsHeader);
        div.appendChild(matchSkillsParagraph);

        summary.appendChild(div);
        return summary;
    };

    const jobSummaryContainer = createSummaryContainer();
    jobState.parentNode.insertBefore(jobSummaryContainer, jobState.nextSibling);

    const imgElements = document.querySelectorAll('.extra-info img');
    if (imgElements.length > 0) {
        imgElements[0].style.display = "none";
    }
}

// Add Resume generator button
async function addGenerateResumeButton(className){
    var parentElement = document.getElementsByClassName(className);
    if(parentElement.length > 0){
        parentElement = parentElement[0];

        const existResume = await getGeneratedResumeFromStorage();

        // Create new button element
        var generateResumeButton = document.createElement('button');
        generateResumeButton.className = `resume-generate-button artdeco-button artdeco-button--3 mt4 artdeco-button--${existResume ? 'primary': 'premium'}`;
        
        generateResumeButton.type = 'button';
        generateResumeButton.id = 'generateResume';
    
        // Create the span element for button text
        var buttonTextSpan = document.createElement('span');
        buttonTextSpan.setAttribute('aria-hidden', 'true');
        buttonTextSpan.textContent = existResume ? 'View Generated Resume': 'Generate Resume';

        // Append the span element to the button
        generateResumeButton.appendChild(buttonTextSpan);
        parentElement.parentNode.insertBefore(generateResumeButton, parentElement.nextSibling);

        
        if(existResume){
            generateResumeButton.addEventListener('click', function () {
                openGeneratedResume(existResume);
            });
        } else {
            if(!accessData.hasOwnProperty('resumeContent')){
                generateResumeButton.setAttribute('disabled', 'disabled');
                var notice = document.createElement('div');
                notice.textContent = "Please upload your resume onto the extension page first.";
                notice.style.color = '#516dff';
                notice.style.margin = '4px';
                notice.style.fontSize = '12px';
                generateResumeButton.parentNode.insertBefore(notice, generateResumeButton.nextSibling);
            }
    
            generateResumeButton.addEventListener('click', function () {
                generateResume(this);
            });
        }
    } else {
        console.log('Save Button element not found in page');
    }
}

// Update Summery info to Job card
async function updateApplicationSummery(){
    const recommendation = await getApplicationRecommendation();
    console.log(recommendation);
    refreshJobSummaryBlock(recommendation);
}

// Helper function to get local storage value with Promise
function getGeneratedResume() {
    return new Promise((resolve, reject) => {
        fetch(llmFunctionUrl + "/generate", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({"conversation_id": accessData['conversationId'], 
                                "session_token": accessData['sessionLsKey'], 
                                "resume": accessData['resumeContent'],
                                "job_description": currentJobDescription})
        }).then(response => response.json())
        .then(data => {
            if(data.data != null){
                const minifiedJsonString = JSON.stringify(JSON.parse(data.data), null, 0);
                const encodedTextData = encodeURIComponent(minifiedJsonString);
                storeGeneratedResume(encodedTextData);
                resolve(encodedTextData);
            } else {
                alert(data.message);
                resolve("{}");
            }
            
        })
        .catch(error => {
            console.log(error);
            reject('Error while fetching generated resume');
        });
    });
}


async function getApplicationRecommendation() {
    try {
        const response = await fetch(llmFunctionUrl + "/apply", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "conversation_id": accessData['conversationId'],
                "session_token": accessData['sessionLsKey'],
                "resume": accessData['resumeContent'],
                "job_description": currentJobDescription
            })
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`Failed to fetch: ${response.status} - ${errorMessage}`);
        }

        const data = await response.json();
        if (data.data !== null) {
            return JSON.parse(data.data);
        } else {
            alert(data.message);
            return {};
        }
    } catch (error) {
        console.error(error);
        throw new Error('Error while fetching generated resume');
    }
}


async function generateResume(btn) {
    const requiredFields = ['sessionLsKey', 'conversationId', 'resumeContent'];
    const errors = requiredFields.filter(field => accessData[field] === undefined);
    
    if (errors.length > 0 || !currentJobDescription) {
        alert('There are missing fields. Please check logs in console for more info');
        console.log('Missing fields:', errors);
        return;
    }

    try {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
        const generatedResume = await getGeneratedResume();
        btn.innerHTML = '<span aria-hidden="true">Generate Resume</span>';
        openGeneratedResume(generatedResume);
    } catch (error) {
        console.error('Error generating resume:', error);
        btn.innerHTML = '<span aria-hidden="true">Generate Resume</span>';
        alert('Failed to generate resume. Please check console for more information.');
    }
}

function storeGeneratedResume(encodedData) {
    chrome.storage.local.get(['myJobsResume'], function(result) {
        let myJobsResume = result.myJobsResume || {};
        myJobsResume[currentJobId] = encodedData;
        chrome.storage.local.set({ 'myJobsResume': myJobsResume }, function() {
            console.log('Generated job stored');
        });   
    });  
}

function getGeneratedResumeFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['myJobsResume'], function(result) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                const generatedResume = result.myJobsResume?.[currentJobId] || false;
                resolve(generatedResume);
            }
        }); 
    });
}

function openGeneratedResume(encodedTextData) {
    const url = `${resumeBuilderUrl}?configData=${encodedTextData}`;
    window.open(url, 'PopupWindow', 'width=1024, height=620');
}

function copyJobDescription() {
    const jobDescriptionElement = document.querySelector('.jobs-description-content');
    if (jobDescriptionElement) {
        currentJobDescription = jobDescriptionElement.innerText;
    } else {
        console.log('Job description not found');
    }
}

function initialize() {
    chrome.storage.local.get(function(result) {
        accessData = result;
        console.log(accessData);
    });  
}

initialize();
