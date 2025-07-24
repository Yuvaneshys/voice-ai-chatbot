let recognition;
let isRecording = false;

function speakText(markdownText) {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  let plainText = markdownText
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold **text** → text
    .replace(/\*(.*?)\*/g, "$1") // Italic *text* → text
    .replace(/`(.*?)`/g, "$1") // Inline code `text` → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links [text](url) → text
    .replace(/#{1,6}\s*(.*)/g, "$1") // Headers # H1 → H1
    .replace(/>\s*(.*)/g, "$1") // Blockquotes > text → text
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images ![alt](url)
    .replace(/[-*_]+/g, "") // Remove horizontal lines
    .replace(/\n+/g, ". "); // Convert newlines to full stops for natural speech

  if (plainText.trim() === "") {
    console.warn("No valid text to speak");
    return;
  }

  let utterance = new SpeechSynthesisUtterance(plainText);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 200);
}

function sendText() {
  let userInput = document.getElementById("user-input").value;
  let chatBox = document.getElementById("chat-box");
  window.speechSynthesis.cancel();

  if (userInput.trim() !== "") {
    let defaultMsg = document.querySelector(".ai-msg");
    if (
      defaultMsg &&
      defaultMsg.textContent.includes("Hi! I'm a voice chatbot")
    ) {
      defaultMsg.remove();
    }

    let userMsg = document.createElement("div");
    userMsg.classList.add("message", "user-msg");
    userMsg.innerHTML = `<i class="fas fa-user"></i><span>${userInput}</span>`;
    chatBox.appendChild(userMsg);

    let loader = document.createElement("div");
    loader.classList.add("message", "ai-msg", "typing");
    loader.innerHTML = `<i class="fas fa-robot"></i> <span>Thinking...</span>`;
    chatBox.appendChild(loader);

    chatBox.scrollTop = chatBox.scrollHeight;

    fetch("/submit", {
      method: "POST",
      body: JSON.stringify({ user_question: userInput }),
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        loader.remove();
        let aiMsg = document.createElement("div");
        aiMsg.classList.add("message", "ai-msg");
        aiMsg.innerHTML = `<i class="fas fa-robot"></i> <span>${marked.parse(
          data.response
        )}</span>`;
        chatBox.appendChild(aiMsg);

        chatBox.scrollTop = chatBox.scrollHeight;
        setTimeout(() => {
          speakText(data.response);
        }, 500);
      })
      .catch((error) => {
        console.error("Error:", error);
        loader.innerHTML = `<span>Error: Unable to fetch response</span>`; // Show error message in loader
      });

    document.getElementById("user-input").value = "";
  }
}

function startRecording() {
  const inputBox = document.getElementById("user-input");
  const micButton = document.querySelector(".fa-microphone");
  window.speechSynthesis.cancel();
  if (!isRecording) {
    if (
      "webkitSpeechRecognition" in window ||
      "SpeechRecognition" in window ||
      "mozSpeechRecognition" in window ||
      "msSpeechRecognition" in window
    ) {
      recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        window.mozSpeechRecognition ||
        window.msSpeechRecognition)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = function () {
        inputBox.disabled = true;
        micButton.style.color = "red";
      };

      recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript;
        inputBox.value = transcript;
      };

      recognition.onerror = function (event) {
        console.error("Voice recognition error:", event.error);
      };

      recognition.onend = function () {
        sendText();
        isRecording = false;
        inputBox.disabled = false;
        micButton.style.color = "";
      };

      recognition.start();
      isRecording = true;
    } else {
      alert("Voice recognition is not supported in this browser");
    }
  } else {
    recognition.stop();
    sendText();
    isRecording = false;
  }
}