const MODEL = "gemini-3.5-flash-lite";

const $ = (selector) => document.getElementById(selector);

let topic = "";
let questions = [];
let currentQuestion = 0;
let answers = [];


function showScreen(name){
    for(let screen of ["input", "loading", "quiz", "result"]){
        const el = $(`screen-${screen}`)
        if(el) el.dataset.active = String(screen === name);
    }
}


function showError(message){
    alert(message)
}

async function fetchQuiz(apiKey, topic, difficulty, count){
    const prompt = `you are a quiz generator
    generate a quiz on the topic : ${topic}
    Difficulty : ${difficulty}
    Number of questions : ${count}
    Return JSON only in this shape :
    {
    "questions" : [
    {
    "question" : "what is the capital of france?",
    "options" : ["Paris","Berlin","London","Madrid"],
    "answer" : "Paris"
    }

    ]

    }
    Each question must have exactly 4 options. the answer must match one of the options
    `

   
    const res = await fetch(

        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{
            method : "POST",
            headers : {

                "Content-Type" : "application/json",
                "x-goog-api-key" : apiKey,
            },

            body : JSON.stringify({
                contents : [{parts : [{text : prompt}]}],
                generationConfig : {
                    responseMimeType : "application/json"
                }
            })
        }
    );

    // handling error

    if(!res.ok){
        const details = await res.text();
        throw new Error(`http error status  : ${res.status} ${details}`)
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if(!text){
    throw new Error("empty model responses")

   }

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    const list = parsed.questions || parsed;
    if(!Array.isArray(list) || list.length === 0){
        throw new Error("No questions returned")
    }

    return list;


}

$("quizForm").addEventListener("submit",async (e) =>{
    e.preventDefault();
    e.stopPropagation();

    const apiKey = $("apiKeyInput").value.trim()
    const quiztopic = $("topicInput").value.trim();
    const difficulty = $("difficultyInput").value.trim();
    const count = $("countInput").value.trim();

    if(!apiKey || !quiztopic){
        showError("please fill all the fields")
        return;
    }

    topic = quiztopic;
    showScreen("loading")

    try{

        questions = await fetchQuiz(apiKey,quiztopic,difficulty,count);
        currentQuestion = 0;
        answers = new Array(questions.length).fill(null)

        showScreen("quiz")
        showQuestion()

    }catch(err){
       console.log(err);
       showError(err.message)
       showScreen("input")
    }
})


function showQuestion(){
    const q = questions[currentQuestion];
    const total = questions.length;
    const letters = ["A","B","C","D"];

    $("quizTopicLabel").textContent = topic;
    $("quizProgress").textContent = `Question ${currentQuestion + 1} of ${total}`;
    $("progressFill").style.width = `${((currentQuestion + 1)/total)* 100}%`
    $("questionText").textContent = q.question;


    const container = $("optionContainer");
    container.innerHTML = "";
    const nextBtn = $("nextBtn");
    nextBtn.disabled = answers[currentQuestion] === null;
    nextBtn.textContent = currentQuestion === total - 1 ? "See results" : "Next";
    $("prevBtn").disabled = currentQuestion === 0;


    q.options.forEach((text ,  i) =>{
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option";
        btn.dataset.selected = String(answers[currentQuestion] === i);
        btn.innerHTML = `<span class="option_letter">${letters[i]}</span> ${text}`

        btn.onclick = () =>{
            answers[currentQuestion] = i;
            [...container.children].forEach((b,j) => {
                b.dataset.selected = String(j === i)
            });

            nextBtn.disabled = false;
        };

        container.appendChild(btn)
    })
}

function showResults(){
    const total = questions.length;
    let score = 0;

    const review = $("resultReview");
    review.innerHTML = "";

    questions.forEach((question, i) => {
        const picked = question.options[answers[i]];
        const correct = picked === question.answer;
        if(correct) score++;

        const item = document.createElement("div");
        item.className = `review-item ${correct ? "is-correct" : "is-wrong"}`;
        item.innerHTML = `<p class="review-question">${i + 1}. ${question.question}</p>
            <p>Your answer: ${picked ?? "No answer"}</p>
            ${correct ? "" : `<p>Correct answer: ${question.answer}</p>`}`;
        review.appendChild(item);
    });

    $("resultTopic").textContent = topic;
    $("resultSummary").textContent = `You scored ${score} of ${total}`;
    $("resultScore").textContent = `${Math.round((score / total) * 100)}%`;
    showScreen("result");
}


$("nextBtn").onclick = () =>{
    if(currentQuestion === questions.length - 1){
        showResults();
    }else{
        currentQuestion++;
        showQuestion();
    }
}


$("prevBtn").onclick = () =>{
    if(currentQuestion === 0) return;
    currentQuestion--;
    showQuestion();
};

$("playAgainBtn").onclick = () =>{
    questions = [];
    answers = [];
    currentQuestion = 0;
    showScreen("input");
};