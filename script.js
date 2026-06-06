const STORAGE_KEY = "test-site-state-v1";

const statusEl = document.getElementById("status");
const quizEl = document.getElementById("quiz");
const questionTextEl = document.getElementById("question-text");
const answersEl = document.getElementById("answers");
const showResultsButton = document.getElementById("show-results");
const resetProgressButton = document.getElementById("reset-progress");
const resultsOutputEl = document.getElementById("results-output");

let questions = [];
let currentQuestion = null;
let state = loadState();

function loadState() {
  const fallback = { seen: [], answers: [] };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.seen) || !Array.isArray(parsed.answers)) {
      return fallback;
    }

    return parsed;
  } catch (_) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateStatus(text) {
  statusEl.textContent = text;
}

function renderQuestion(question) {
  currentQuestion = question;
  questionTextEl.textContent = question.tx;
  answersEl.innerHTML = "";

  for (let i = 0; i < 4; i += 1) {
    const key = `a${i}`;
    const text = question[key] || "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.textContent = `${i + 1}. ${text}`;
    button.addEventListener("click", () => submitAnswer(i.toString()));
    answersEl.appendChild(button);
  }
}

function pickNextQuestion() {
  const seenSet = new Set(state.seen);
  const unseen = questions.filter((_, idx) => !seenSet.has(idx));

  if (unseen.length === 0) {
    currentQuestion = null;
    quizEl.classList.add("hidden");
    updateStatus("Все вопросы уже пройдены.");
    return;
  }

  const nextQuestion = unseen[Math.floor(Math.random() * unseen.length)];
  renderQuestion(nextQuestion);
  quizEl.classList.remove("hidden");
  updateStatus(`Осталось вопросов: ${unseen.length}`);
}

function submitAnswer(score) {
  if (!currentQuestion) {
    return;
  }

  const questionIndex = questions.indexOf(currentQuestion);
  if (questionIndex < 0) {
    return;
  }

  if (!state.seen.includes(questionIndex)) {
    state.seen.push(questionIndex);
  }

  const answerItem = { tx: currentQuestion.tx, sc: score };
  const existingIndex = state.answers.findIndex((item) => item.tx === answerItem.tx);
  if (existingIndex >= 0) {
    state.answers[existingIndex] = answerItem;
  } else {
    state.answers.push(answerItem);
  }

  saveState();
  pickNextQuestion();
}

function showResults() {
  resultsOutputEl.textContent = JSON.stringify(state.answers, null, 2);
  resultsOutputEl.classList.remove("hidden");
}

function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  state = { seen: [], answers: [] };
  resultsOutputEl.classList.add("hidden");
  resultsOutputEl.textContent = "";
  pickNextQuestion();
}

async function loadQuestions() {
  updateStatus("Загрузка вопросов...");

  const response = await fetch("./data.jsonl", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить data.jsonl: ${response.status}`);
  }

  const raw = await response.text();
  questions = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

showResultsButton.addEventListener("click", showResults);
resetProgressButton.addEventListener("click", resetProgress);

loadQuestions()
  .then(() => {
    if (questions.length === 0) {
      updateStatus("Нет вопросов в data.jsonl.");
      return;
    }

    pickNextQuestion();
  })
  .catch((error) => {
    quizEl.classList.add("hidden");
    updateStatus(`Ошибка: ${error.message}`);
  });
