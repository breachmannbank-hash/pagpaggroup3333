const reviewerText = document.getElementById("reviewerText");
const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const questionsList = document.getElementById("questionsList");
const savedQuestionsList = document.getElementById("savedQuestionsList");
const message = document.getElementById("message");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const generatedTab = document.getElementById("generatedTab");
const savedTab = document.getElementById("savedTab");
const generatedPanel = document.getElementById("generatedPanel");
const savedPanel = document.getElementById("savedPanel");

const TEXT_KEY = "textToReviewer.savedText";
const QUESTIONS_KEY = "textToReviewer.savedQuestions";
const HISTORY_KEY = "textToReviewer.savedQuestionHistory";


function updateOnlineStatus() {
  if (navigator.onLine) {
    statusText.textContent = "You are online, so you can generate questions!";
    statusDot.className = "status-dot online";
  } else {
    statusText.textContent = "You are offline, see the past questions and answers below the reviewer chat box.";
    statusDot.className = "status-dot offline";
  }
}

function isSentenceEnding(text, index) {
  const punctuation = text[index];

  if (punctuation === "!" || punctuation === "?") {
    return true;
  }

  const before = text.slice(0, index).trim();
  const after = text.slice(index + 1).trim();
  const lastWord = before.split(/\s+/).pop() || "";
  const lowerBefore = before.toLowerCase();

  if (
    lastWord.toLowerCase() === "e" ||
    lastWord.toLowerCase() === "i" ||
    lowerBefore.endsWith("e.g") ||
    lowerBefore.endsWith("i.e") ||
    ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "etc", "vs"].includes(lastWord.toLowerCase())
  ) {
    return false;
  }

  if (after && /^[a-z,)]/.test(after)) {
    return false;
  }

  return true;
}

function splitIntoSentences(text) {
  const sentences = [];
  let currentSentence = "";

  for (let index = 0; index < text.length; index++) {
    currentSentence += text[index];

    if (/[.!?]/.test(text[index]) && isSentenceEnding(text, index)) {
      sentences.push(currentSentence);
      currentSentence = "";
    }
  }

  if (currentSentence.trim()) {
    sentences.push(currentSentence);
  }

  return sentences
    .map(sentence => cleanSentence(sentence))
    .filter(sentence => sentence.length > 8);
}

function cleanSentence(sentence) {
  return sentence
    .replace(/\[[^\]]+\]/g, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(analysis|analyses|research|qualitative|quantitative|and)(to|involves|structure|research)/gi, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseImportantSentences(sentences) {
  const important = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return /\bis\b/i.test(sentence) ||
      /\bare\b/i.test(sentence) ||
      lowerSentence.includes("refers to") ||
      lowerSentence.includes("because") ||
      lowerSentence.includes("used for") ||
      lowerSentence.includes("involves") ||
      lowerSentence.includes("include") ||
      lowerSentence.includes("includes") ||
      hasImportanceWord(sentence);
  });

  const backup = sentences.filter(sentence => !important.includes(sentence));
  return important.concat(backup).slice(0, 5);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeAnswer(sentence) {
  const lowerSentence = sentence.toLowerCase();
  const populationMatch = sentence.match(/population of ([\d,]+ people)/i);
  const populousMatch = sentence.match(/most populous city in ([a-z\s]+region)/i);

  if (populationMatch && populousMatch) {
    return `The population is ${populationMatch[1]}, and it is the most populous city in ${populousMatch[1]}.`;
  }

  if (lowerSentence.includes("refers to")) {
    const meaning = sentence.slice(lowerSentence.indexOf("refers to") + "refers to".length).trim();
    return meaning || sentence;
  }

  if (lowerSentence.includes("used for")) {
    const use = sentence.slice(lowerSentence.indexOf("used for") + "used for".length).trim();
    return use ? `It is used for ${use}.` : sentence;
  }

  if (lowerSentence.includes("involves")) {
    const answerPart = sentence.slice(lowerSentence.indexOf("involves") + "involves".length).trim();
    return removeEndingPeriod(answerPart) || sentence;
  }

  if (/\bincludes?\b/i.test(sentence)) {
    const answerPart = sentence.split(/\bincludes?\b/i).slice(1).join(" include ").trim();
    return removeEndingPeriod(answerPart) || sentence;
  }

  if (lowerSentence.includes("because")) {
    const reason = sentence.slice(lowerSentence.indexOf("because") + "because".length).trim();
    return reason ? `It happens because ${removeEndingPeriod(reason)}.` : sentence;
  }

  if (/\bis\b/i.test(sentence)) {
    const answerPart = sentence.split(/\bis\b/i).slice(1).join(" is ").trim();
    return answerPart || sentence;
  }

  if (/\bare\b/i.test(sentence)) {
    const answerPart = sentence.split(/\bare\b/i).slice(1).join(" are ").trim();
    return answerPart || sentence;
  }

  if (/^they\s+generate\s+/i.test(sentence)) {
    return removeEndingPeriod(sentence.replace(/^they\s+generate\s+/i, ""));
  }

  if (/^(they|it|this|these|those)\s+/i.test(sentence)) {
    return removeEndingPeriod(sentence.replace(/^(they|it|this|these|those)\s+/i, ""));
  }

  return removeEndingPeriod(sentence);
}

function isWeakTopic(topic) {
  const cleanTopic = cleanSentence(topic).toLowerCase();
  return ["it", "this", "that", "they", "these", "those"].includes(cleanTopic);
}

function getFallbackSubject(sentence) {
  const cleanText = removeEndingPeriod(cleanSentence(sentence));
  const commaSubject = cleanText.split(",")[0].trim();
  const words = commaSubject.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "this";
  }

  return words[0];
}

function makeFallbackQuestion(sentence) {
  const subject = getFallbackSubject(sentence);
  const words = removeEndingPeriod(cleanSentence(sentence)).split(/\s+/).filter(Boolean);
  const action = words[1] || "do";

  if (isWeakTopic(subject)) {
    return subject.toLowerCase() === "they"
      ? `What do ${subject.toLowerCase()} ${action.toLowerCase()}?`
      : `What does ${subject.toLowerCase()} ${action.toLowerCase()}?`;
  }

  return `What is stated about ${subject}?`;
}

function getArticleDefinitionMatch(sentence) {
  return sentence.match(/^(a|an)\s+(.+?)\s+is\s+(a|an)\s+(.+)$/i);
}

function makeArticleDefinitionQuestion(sentence) {
  const match = getArticleDefinitionMatch(sentence);

  if (!match) {
    return null;
  }

  return {
    type: "Question",
    question: `What is ${removeEndingPeriod(match[3] + " " + match[4])}?`,
    answer: match[2].trim()
  };
}

function shortenDescription(text) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const commaPart = cleanText.split(",")[0].trim();
  const wordLimit = commaPart.split(" ").slice(0, 14).join(" ");
  return wordLimit || cleanText;
}

function removeEndingPeriod(text) {
  return text.replace(/[.]+$/g, "").trim();
}

function hasImportanceWord(sentence) {
  return /\b(important|importance|significant|essential|valuable|necessary|vital|crucial)\b/i.test(sentence);
}

function getTopicBeforePhrase(sentence, phrase) {
  return cleanSentence(sentence.slice(0, sentence.toLowerCase().indexOf(phrase))).trim();
}

function getImportanceTopic(sentence) {
  const lowerSentence = sentence.toLowerCase();
  const importancePattern = /\b(is|are)\s+(important|significant|essential|valuable|necessary|vital|crucial)\b/i;
  const importanceMatch = sentence.match(importancePattern);

  if (importanceMatch) {
    const topic = cleanSentence(sentence.slice(0, importanceMatch.index)).trim();
    return isWeakTopic(topic) || isWeakImportanceTopic(topic) ? "this information" : topic;
  }

  if (lowerSentence.includes("importance of")) {
    return sentence.slice(lowerSentence.indexOf("importance of") + "importance of".length).split(/,|\.| because /i)[0].trim();
  }

  const firstWords = sentence.split(/\s+/).slice(0, 4).join(" ");
  return isWeakImportanceTopic(firstWords) ? "this information" : removeEndingPeriod(firstWords);
}

function isWeakImportanceTopic(topic) {
  return /^(you|it|this|that|these|those|they|we)\b/i.test(topic) ||
    /\b(want|need|should|must|can|could|may|might|indicate|show|explain|describe)\b/i.test(topic);
}


function chooseBlankWord(sentence) {
  const stopWords = [
    "the", "and", "that", "this", "with", "from", "into", "also", "only",
    "because", "where", "when", "what", "which", "their", "there", "about",
    "research", "study", "data", "people", "city"
  ];

  const words = sentence.match(/[A-Za-z][A-Za-z-]{3,}/g) || [];
  const usefulWords = words.filter(word => !stopWords.includes(word.toLowerCase()));

  if (usefulWords.length === 0) {
    return "";
  }

  return usefulWords.sort((first, second) => second.length - first.length)[0];
}

function makeFillBlank(sentence) {
  const blankWord = chooseBlankWord(sentence);

  if (!blankWord) {
    return {
      type: "Fill in the blank",
      question: `${removeEndingPeriod(sentence)} ____`,
      answer: sentence
    };
  }

  return {
    type: "Fill in the blank",
    question: sentence.replace(new RegExp(`\\b${blankWord}\\b`, "i"), "_____"),
    answer: blankWord
  };
}

function makeImportanceQuestion(sentence) {
  const topic = getImportanceTopic(sentence);
  const lowerSentence = sentence.toLowerCase();
  let answer = makeAnswer(sentence);

  if (lowerSentence.includes("because")) {
    const reason = sentence.slice(lowerSentence.indexOf("because") + "because".length).trim();
    answer = `Because ${removeEndingPeriod(reason)}.`;
  }

  return {
    type: "Question",
    question: topic === "this information"
      ? "Why is this information important?"
      : `Why is ${topic || "this topic"} important?`,
    answer
  };
}

function makeQuestion(sentence) {
  const lowerSentence = sentence.toLowerCase();
  let question;
  const populationMatch = sentence.match(/population of ([\d,]+ people)/i);
  const articleDefinition = makeArticleDefinitionQuestion(sentence);

  if (articleDefinition) {
    return articleDefinition;
  }

  if (populationMatch) {
    question = "What population is mentioned in the statement?";
  } else if (lowerSentence.includes("refers to")) {
    const topic = sentence.slice(0, lowerSentence.indexOf("refers to")).trim();
    question = `What does ${topic || "this"} refer to?`;
  } else if (lowerSentence.includes("used for")) {
    const topic = sentence.slice(0, lowerSentence.indexOf("used for")).trim();
    question = `What is ${topic || "this"} used for?`;
  } else if (lowerSentence.includes("because")) {
    const topic = sentence.slice(0, lowerSentence.indexOf("because")).trim();
    question = `Why does ${topic || "this"} happen?`;
  } else if (lowerSentence.includes("involves")) {
    const topic = sentence.slice(0, lowerSentence.indexOf("involves")).trim();
    question = `What does ${topic || "this"} involve?`;
  } else if (/\bincludes?\b/i.test(sentence)) {
    const topic = sentence.split(/\bincludes?\b/i)[0].trim();
    const firstWord = topic.split(/\s+/)[0] || "";
    const helperVerb = firstWord.toLowerCase().endsWith("s") ? "do" : "does";
    question = `What ${helperVerb} ${topic || "this"} include?`;
  } else if (/\bis\b/i.test(sentence)) {
    const parts = sentence.split(/\bis\b/i);
    const topic = cleanSentence(parts[0]);
    const description = parts.slice(1).join(" is ").trim();

    if ((!topic || isWeakTopic(topic)) && description.toLowerCase().startsWith("located")) {
      question = `Where is it described as being located?`;
    } else if (!topic || isWeakTopic(topic)) {
      question = `What is described as ${shortenDescription(description)}?`;
    } else {
      question = `What is ${topic}?`;
    }
  } else if (/\bare\b/i.test(sentence)) {
    const parts = sentence.split(/\bare\b/i);
    const topic = cleanSentence(parts[0]);
    const description = parts.slice(1).join(" are ").trim();

    if (!topic || isWeakTopic(topic)) {
      question = `What are described as ${shortenDescription(description)}?`;
    } else {
      question = `What are ${topic}?`;
    }
  } else {
    question = makeFallbackQuestion(sentence);
  }

  return {
    type: "Question",
    question,
    answer: makeAnswer(sentence)
  };
}

function makeStudyItems(sentences) {
  const studyItems = [];

  chooseImportantSentences(sentences).forEach(sentence => {
    if (studyItems.length >= 5) {
      return;
    }

    if (hasImportanceWord(sentence)) {
      studyItems.push(makeImportanceQuestion(sentence));
    } else {
      studyItems.push(makeQuestion(sentence));
    }

    if (studyItems.length < 5) {
      studyItems.push(makeFillBlank(sentence));
    }
  });

  return studyItems.slice(0, 5);
}

function generateQuestions() {
  const text = reviewerText.value.trim();
  const sentences = splitIntoSentences(text);
  const generatedQuestions = makeStudyItems(sentences);

  localStorage.setItem(TEXT_KEY, text);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(generatedQuestions));
  saveQuestionHistory(generatedQuestions);

  renderQuestions(generatedQuestions);
  renderSavedQuestions(loadQuestionHistory());
  showTab("generated");

  if (generatedQuestions.length === 0) {
    message.textContent = "Please paste longer reviewer text before generating questions.";
  } else if (generatedQuestions.length < 5) {
    message.textContent = `Only ${generatedQuestions.length} usable question(s) were created because fewer than 5 usable sentences were found.`;
  } else {
    message.textContent = "5 questions generated and saved.";
  }
}

function loadQuestionHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveQuestionHistory(items) {
  if (!items || items.length === 0) {
    return;
  }

  const history = loadQuestionHistory();
  history.unshift({
    savedAt: new Date().toLocaleString(),
    items
  });

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function showTab(tabName) {
  const showingSaved = tabName === "saved";

  generatedTab.classList.toggle("active", !showingSaved);
  savedTab.classList.toggle("active", showingSaved);
  generatedPanel.classList.toggle("hidden", showingSaved);
  savedPanel.classList.toggle("hidden", !showingSaved);
}

function getSimpleType(item) {
  return item.type === "Fill in the blank" || item.type === "Fill in the blanks"
    ? "Fill in the blank"
    : "Question";
}

function renderQuestions(items) {
  renderQuestionCards(items, questionsList);
}

function renderQuestionCards(items, targetElement, savedAt) {
  targetElement.innerHTML = "";

  if (!items || items.length === 0) {
    targetElement.innerHTML = '<div class="empty-state">No questions saved yet.</div>';
    return;
  }

  items.forEach((item, index) => {
    const itemType = getSimpleType(item);
    const card = document.createElement("article");
    card.className = "question-card";
    card.innerHTML = `
      <span class="type-label">${escapeHtml(itemType)}</span>
      ${savedAt ? `<p class="saved-date">Saved: ${escapeHtml(savedAt)}</p>` : ""}
      <h3>${index + 1}. ${escapeHtml(item.question)}</h3>
      <details>
        <summary>Show answer</summary>
        <p>${escapeHtml(item.answer)}</p>
      </details>
    `;
    targetElement.appendChild(card);
  });
}

function renderSavedQuestions(history) {
  savedQuestionsList.innerHTML = "";

  if (!history || history.length === 0) {
    savedQuestionsList.innerHTML = '<div class="empty-state">No saved questions in localStorage yet.</div>';
    return;
  }

  history.forEach(savedSet => {
    savedSet.items.forEach((item, index) => {
      const itemType = getSimpleType(item);
      const card = document.createElement("article");
      card.className = "question-card";
      card.innerHTML = `
        <span class="type-label">${escapeHtml(itemType)}</span>
        <p class="saved-date">Saved: ${escapeHtml(savedSet.savedAt)}</p>
        <h3>${index + 1}. ${escapeHtml(item.question)}</h3>
        <details>
          <summary>Show answer</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>
      `;
      savedQuestionsList.appendChild(card);
    });
  });
}

function loadSavedData() {
  const savedText = localStorage.getItem(TEXT_KEY) || "";
  let savedQuestions = [];
  let savedHistory = loadQuestionHistory();

  try {
    savedQuestions = JSON.parse(localStorage.getItem(QUESTIONS_KEY) || "[]");
  } catch (error) {
    savedQuestions = [];
  }

  if (savedHistory.length === 0 && savedQuestions.length > 0) {
    savedHistory = [{
      savedAt: "Previous saved data",
      items: savedQuestions
    }];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(savedHistory));
  }

  reviewerText.value = savedText;
  renderQuestions(savedQuestions);
  renderSavedQuestions(savedHistory);

  if (savedQuestions.length > 0) {
    message.textContent = "Saved questions loaded.";
  }
}

function clearData() {
  reviewerText.value = "";
  localStorage.removeItem(TEXT_KEY);
  localStorage.removeItem(QUESTIONS_KEY);
  localStorage.removeItem(HISTORY_KEY);
  message.textContent = "Saved reviewer text and questions were cleared.";
  renderQuestions([]);
  renderSavedQuestions([]);
  showTab("generated");
}

generateBtn.addEventListener("click", generateQuestions);
clearBtn.addEventListener("click", clearData);
generatedTab.addEventListener("click", () => showTab("generated"));
savedTab.addEventListener("click", () => {
  renderSavedQuestions(loadQuestionHistory());
  showTab("saved");
});
reviewerText.addEventListener("input", () => {
  localStorage.setItem(TEXT_KEY, reviewerText.value);
});

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(error => {
    console.log("Service worker registration failed:", error);
  });
}

updateOnlineStatus();
loadSavedData();
