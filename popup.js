// Set initial indicator state
let allIndicatorsGreen = true;

// URL for the function
const llmFunctionUrl = 'https://resumatch-rqthba6dyq-zf.a.run.app';

// Function to lock window
function lockWindow() {
  const overlay = document.getElementById('overlay');
  overlay.classList.add('lock');
}

// Function to update indicator
function updateIndicator(elementId, key, callback = null) {
  const indicator = document.getElementById(elementId);
  chrome.storage.local.get([key], function(result) {
    if (result[key] !== undefined) {
      indicator.classList.add('indicator-green');
    } else {
      indicator.classList.add('indicator-red');
      allIndicatorsGreen = false;
      if (callback !== null) {
        callback();
      }
    }
  });
}

// Function to check if resume exists
function checkExistResume() {
  const uploadSection = document.getElementById('upload-section');
  const resumeElement = document.getElementById('resume-card');
  chrome.storage.local.get(['resumeContent'], function(result) {
    if (result['resumeContent'] !== undefined) {
      uploadSection.style.display = 'none';
      resumeElement.style.display = 'flex';
      const spanElement = resumeElement.querySelector('span');
      if (spanElement) {
        spanElement.textContent = result.resumeContent.contact.full_name + ' Resume';
      }
    }
  });
}

// Document ready event listener
document.addEventListener("DOMContentLoaded", function() {
  setTimeout(function () {
    updateIndicator('openai-token-indicator', 'sessionLsKey', lockWindow);
    updateIndicator('conversation-id-indicator', 'conversationId');
    checkExistResume();
  }, 100);
});

// Event listener for file input change
document.getElementById('pdfInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadText = document.getElementById('uploadText');

  if (file) {
    uploadText.textContent = file.name;
    uploadBtn.disabled = false;
    const removeLink = document.createElement('a');
    removeLink.textContent = ' Remove ';
    removeLink.className = 'remove-link';
    removeLink.href = '#';
    removeLink.addEventListener('click', function(e) {
      e.preventDefault();
      uploadText.textContent = 'Choose Resume PDF File';
      uploadBtn.disabled = true;
      document.getElementById('pdfInput').value = '';
      removeLink.remove();
      uploadBtn.removeAttribute("disabled");
      uploadBtn.classList.add("disabled");
    });
    uploadText.appendChild(removeLink);

    if (allIndicatorsGreen) {
      uploadBtn.removeAttribute("disabled");
      uploadBtn.classList.remove("disabled");
    }
  } else {
    uploadText.textContent = 'Choose Resume PDF File';
    uploadBtn.disabled = true;
  }
});

// Event listener for upload button click
document.getElementById('uploadBtn').addEventListener('click', function() {
  const fileName = document.getElementById('uploadText').textContent;
  if (fileName === 'Choose PDF File') {
    showMessage('Please select a PDF file.');
    return;
  }
  const fileInput = document.getElementById('pdfInput');
  const file = fileInput.files[0];
  if (!file) {
    showMessage('Please select a PDF file.');
    return;
  }
  uploadFile(file, this);
});

// Function to upload file
function uploadFile(file, btn) {
  chrome.storage.local.get(['sessionLsKey'], function(result) {
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...Dont close the window.';
    const sessionToken = result.sessionLsKey;
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('session_token', sessionToken);
    formData.append('json', true);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', llmFunctionUrl + '/upload');
    xhr.onload = function() {
      btn.innerHTML = '<span aria-hidden="true">Upload</span>';
      if (xhr.status === 200) {
        const resp = JSON.parse(xhr.response);
        const resumeJson =  JSON.parse(resp.data.content);
        chrome.storage.local.set({ 'resumeContent': resumeJson }, function() {
          showMessage('File uploaded successfully');
          const uploadForm = document.getElementById('upload-form');
          uploadForm.style.display = 'none';
          btn.innerHTML = '<span aria-hidden="true">Go To Linkedin -></span>';
          btn.style.background = "#0a66c2";
          btn.onclick = function() {
            window.open('https://www.linkedin.com/jobs/', '_blank');
          };
        });
      } else {
        showMessage('Error uploading file.');
      }
    };
    xhr.onerror = function() {
      showMessage('Error uploading file.');
    };
    xhr.send(formData);
  });
}

// Function to display message
function showMessage(message) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
}

// Event listener for "removeResume" element
document.addEventListener('DOMContentLoaded', function() {
  const removeResumeButton = document.getElementById('removeResume');
  if (removeResumeButton) {
    removeResumeButton.addEventListener('click', function(event) {
      const resumeCard = document.getElementById('resume-card');
      if (resumeCard) {
        resumeCard.style.display = 'none';
      }
      const uploadSection = document.getElementById('upload-section');
      if (uploadSection) {
        uploadSection.style.display = 'block';
      }
    });
  }
});
