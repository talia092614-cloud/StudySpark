(function () {
  'use strict';
  var KEY = 'studyspark-v1', GOAL = 3;
  var $ = function (id) { return document.getElementById(id); };
  var today = function () { return new Date().toISOString().slice(0, 10); };

  // ---------- State (saved in localStorage) ----------
  var defaults = {
    cards: [
      { id: 1, topic: 'Biology', q: 'What is the powerhouse of the cell?', a: 'The mitochondria' },
      { id: 2, topic: 'Math', q: 'What is the value of pi (to 2 decimals)?', a: '3.14' },
      { id: 3, topic: 'History', q: 'Who was the first U.S. president?', a: 'George Washington' }
    ],
    quiz: { topic: 'Sample: Science Basics', questions: [
      { q: 'Which planet is closest to the Sun?', o: ['Venus', 'Mercury', 'Mars', 'Earth'], c: 1 },
      { q: 'Water is made of hydrogen and what?', o: ['Oxygen', 'Carbon', 'Helium', 'Nitrogen'], c: 0 },
      { q: 'What gas do plants take in?', o: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], c: 2 }
    ] },
    tasks: [
      { id: 1, title: 'Review chapter notes', subj: 'Science', due: '', done: false },
      { id: 2, title: 'Practice 10 math problems', subj: 'Math', due: '', done: false }
    ],
    results: [], activity: [], created: 0, nextId: 10
  };
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { S = null; }
  if (!S) S = JSON.parse(JSON.stringify(defaults));
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function log(text) { S.activity.unshift({ t: text, d: today() }); S.activity = S.activity.slice(0, 30); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function setBar(id, done, total) { $(id).firstElementChild.style.width = (total ? Math.min(100, done / total * 100) : 0) + '%'; $(id).setAttribute('aria-valuenow', total ? Math.round(done / total * 100) : 0); }
  function emptyMsg(t) { return el('p', 'empty', t); }

  // ---------- Navigation ----------
  function show(v) {
    document.querySelectorAll('.view').forEach(function (s) { s.hidden = s.id !== 'v-' + v; });
    document.querySelectorAll('.nav').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    render(); window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-view]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });

  // ---------- Home ----------
  function renderHome() {
    $('h-quiz').textContent = S.results.length;
    $('h-task').textContent = S.tasks.filter(function (t) { return t.done; }).length;
    $('h-card').textContent = S.created;
    var n = S.activity.filter(function (a) { return a.d === today(); }).length;
    $('goal-text').textContent = n >= GOAL ? 'Goal reached today. Nice work! ✨' : n + ' of ' + GOAL + ' study actions today';
    setBar('goal-bar', n, GOAL);
    var ul = $('activity'); ul.textContent = '';
    if (!S.activity.length) {
      ['Example: finished a quiz', 'Example: checked off a task'].forEach(function (t) {
        var li = el('li', 'sample'); li.appendChild(el('span', 'grow', '✧ ' + t)); li.appendChild(el('span', 'pill', 'sample')); ul.appendChild(li);
      });
    }
    S.activity.slice(0, 5).forEach(function (a) {
      var li = el('li'); li.appendChild(el('span', 'grow', '✧ ' + a.t)); li.appendChild(el('span', 'pill pk', a.d)); ul.appendChild(li);
    });
  }

  // ---------- Flashcards ----------
  var idx = 0, flipped = false;
  function renderCards() {
    var area = $('deck-area'); area.textContent = '';
    $('deck-count').textContent = S.cards.length + (S.cards.length === 1 ? ' card' : ' cards');
    if (!S.cards.length) { area.appendChild(emptyMsg('Your deck is empty. Add your first flashcard to get started.')); return; }
    if (idx >= S.cards.length) idx = S.cards.length - 1;
    var c = S.cards[idx];
    var f = el('button', 'flip' + (flipped ? ' back' : ''));
    f.setAttribute('aria-label', flipped ? 'Answer shown. Flip to see the question.' : 'Question shown. Flip to see the answer.');
    f.appendChild(el('small', '', c.topic + ' · ' + (flipped ? 'Answer' : 'Question')));
    f.appendChild(el('span', '', flipped ? c.a : c.q));
    f.appendChild(el('small', '', 'Tap to flip'));
    f.onclick = function () { flipped = !flipped; renderCards(); };
    area.appendChild(f);
    area.appendChild(el('p', 'muted', 'Card ' + (idx + 1) + ' of ' + S.cards.length));
    var row = el('div', 'btns');
    [['← Previous', function () { idx = (idx - 1 + S.cards.length) % S.cards.length; flipped = false; renderCards(); }, 'btn ghost sm'],
     ['Next →', function () { idx = (idx + 1) % S.cards.length; flipped = false; renderCards(); }, 'btn sm'],
     ['Delete card', function () { S.cards.splice(idx, 1); flipped = false; save(); renderCards(); }, 'btn ghost sm']
    ].forEach(function (b) { var x = el('button', b[2], b[0]); x.type = 'button'; x.onclick = b[1]; row.appendChild(x); });
    area.appendChild(row);
  }
  $('card-form').addEventListener('submit', function (e) {
    e.preventDefault();
    S.cards.push({ id: S.nextId++, topic: $('c-topic').value.trim(), q: $('c-q').value.trim(), a: $('c-a').value.trim() });
    S.created++; log('Added a flashcard: ' + $('c-topic').value.trim());
    idx = S.cards.length - 1; flipped = false; save();
    $('c-q').value = ''; $('c-a').value = ''; renderCards();
  });

  // ---------- Quiz ----------
  var graded = null;
  function renderQuiz() {
    var area = $('quiz-area'); area.textContent = '';
    var qz = S.quiz;
    area.appendChild(el('h2', '', qz.topic || 'Your quiz'));
    if (!qz.questions.length) { area.appendChild(emptyMsg('No questions yet. Add one using the form.')); return; }
    area.appendChild(el('p', 'muted', qz.questions.length + ' question' + (qz.questions.length === 1 ? '' : 's')));
    if (graded) {
      var pts = 0; graded.forEach(function (g, i) { if (g === qz.questions[i].c) pts++; });
      area.appendChild(el('p', 'score', pts + ' / ' + qz.questions.length));
    }
    var form = el('form');
    qz.questions.forEach(function (q, i) {
      var blk = el('fieldset', 'q-block'); blk.appendChild(el('legend', '', (i + 1) + '. ' + q.q));
      q.o.forEach(function (opt, j) {
        var lab = el('label'), r = el('input'); r.type = 'radio'; r.name = 'q' + i; r.value = j;
        if (graded) { r.disabled = true; r.checked = graded[i] === j; if (j === q.c) lab.classList.add('right'); else if (graded[i] === j) lab.classList.add('wrong'); }
        lab.appendChild(r); lab.appendChild(el('span', '', opt + (graded && j === q.c ? ' ✓ correct' : (graded && graded[i] === j ? ' ✗ your answer' : ''))));
        blk.appendChild(lab);
      });
      if (!graded) { var rm = el('button', 'icon', 'Remove question'); rm.type = 'button'; rm.onclick = function () { qz.questions.splice(i, 1); save(); renderQuiz(); }; blk.appendChild(rm); }
      form.appendChild(blk);
    });
    var btn = el('button', 'btn', graded ? 'Retake quiz' : 'Submit answers'); btn.type = 'submit'; form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (graded) { graded = null; renderQuiz(); return; }
      var ans = qz.questions.map(function (q, i) { var c = form.querySelector('input[name=q' + i + ']:checked'); return c ? +c.value : -1; });
      if (ans.indexOf(-1) > -1) { alert('Please answer every question first.'); return; }
      var s = 0; ans.forEach(function (a, i) { if (a === qz.questions[i].c) s++; });
      graded = ans; S.results.push({ topic: qz.topic, score: s, total: qz.questions.length, d: today() });
      log('Finished quiz "' + qz.topic + '": ' + s + '/' + qz.questions.length); save(); renderQuiz();
    });
    area.appendChild(form);
  }
  $('quiz-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, texts = f.querySelectorAll('.opt input:not([type=radio])');
    var topic = $('q-topic').value.trim();
    if (S.quiz.topic !== topic && S.quiz.topic.indexOf('Sample') === 0) S.quiz.questions = [];
    S.quiz.topic = topic;
    S.quiz.questions.push({ q: $('q-q').value.trim(), o: Array.prototype.map.call(texts, function (t) { return t.value.trim(); }), c: +f.querySelector('input[name=correct]:checked').value });
    graded = null; save(); $('q-q').value = ''; texts.forEach(function (t) { t.value = ''; }); renderQuiz();
  });

  // ---------- Checklist ----------
  function renderTasks() {
    var ul = $('task-list'); ul.textContent = '';
    var d = S.tasks.filter(function (t) { return t.done; }).length;
    $('task-text').textContent = d + ' of ' + S.tasks.length + ' tasks complete';
    setBar('task-bar', d, S.tasks.length);
    if (!S.tasks.length) { ul.appendChild(emptyMsg('No tasks yet. Add one to plan your study time.')); return; }
    S.tasks.forEach(function (t, i) {
      var li = el('li', t.done ? 'done' : ''), cb = el('input'); cb.type = 'checkbox'; cb.checked = t.done; cb.setAttribute('aria-label', 'Mark "' + t.title + '" complete');
      cb.onchange = function () { t.done = cb.checked; if (t.done) log('Completed task: ' + t.title); save(); renderTasks(); };
      var g = el('span', 'grow', t.title); if (t.subj) g.appendChild(el('span', 'pill', t.subj)); if (t.due) g.appendChild(el('span', 'pill pk', 'Due ' + t.due));
      var ed = el('button', 'icon', 'Edit'); ed.onclick = function () { var n = prompt('Edit task:', t.title); if (n && n.trim()) { t.title = n.trim(); save(); renderTasks(); } };
      var dl = el('button', 'icon', 'Delete'); dl.setAttribute('aria-label', 'Delete ' + t.title); dl.onclick = function () { S.tasks.splice(i, 1); save(); renderTasks(); };
      [cb, g, ed, dl].forEach(function (n) { li.appendChild(n); }); ul.appendChild(li);
    });
  }
  $('task-form').addEventListener('submit', function (e) {
    e.preventDefault();
    S.tasks.push({ id: S.nextId++, title: $('t-title').value.trim(), subj: $('t-subj').value.trim(), due: $('t-due').value, done: false });
    save(); e.target.reset(); renderTasks();
  });

  // ---------- Progress ----------
  function renderProgress() {
    var st = $('p-stats'); st.textContent = '';
    var done = S.tasks.filter(function (t) { return t.done; }).length;
    [['Flashcards created', S.created], ['Quizzes completed', S.results.length], ['Tasks completed', done]].forEach(function (x) {
      var d = el('div', 'card stat'); d.appendChild(el('b', '', x[1])); d.appendChild(el('span', '', x[0])); st.appendChild(d);
    });
    var sc = $('p-scores'); sc.textContent = '';
    if (!S.results.length) sc.appendChild(emptyMsg('No quizzes completed yet. Take one to see your scores here.'));
    S.results.slice(-6).reverse().forEach(function (r) {
      sc.appendChild(el('p', 'muted small', r.topic + ' · ' + r.d + ' · ' + r.score + '/' + r.total));
      var b = el('div', 'bar'); b.appendChild(el('i')); b.firstChild.style.width = (r.score / r.total * 100) + '%'; sc.appendChild(b);
    });
    var bars = $('p-bars'); bars.textContent = '';
    var avg = S.results.length ? Math.round(S.results.reduce(function (a, r) { return a + r.score / r.total; }, 0) / S.results.length * 100) : 0;
    [['Average quiz score: ' + (S.results.length ? avg + '%' : 'no quizzes yet'), avg], ['Tasks done: ' + done + ' of ' + S.tasks.length, S.tasks.length ? done / S.tasks.length * 100 : 0], ['Today\'s goal', Math.min(100, S.activity.filter(function (a) { return a.d === today(); }).length / GOAL * 100)]].forEach(function (x) {
      bars.appendChild(el('p', 'muted small', x[0])); var b = el('div', 'bar'); b.appendChild(el('i')); b.firstChild.style.width = x[1] + '%'; bars.appendChild(b);
    });
  }
  $('reset-all').addEventListener('click', function () {
    if (confirm('Delete all your StudySpark data and start fresh?')) { localStorage.removeItem(KEY); location.reload(); }
  });

  function render() { renderHome(); renderCards(); renderQuiz(); renderTasks(); renderProgress(); }
  render();
})();
