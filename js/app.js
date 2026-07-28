// ============================================================
//  奶咖育儿工作台 —— 核心逻辑
//  localStorage 持久化 | 响应式 | 4周感统循环
// ============================================================

const STORE_KEY = 'baby_dashboard_v1';

// ==================== 状态管理 ====================
function getDateKey(offset) {
  const d = new Date();
  if (offset) d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    showToast('已保存 ✓');
  } catch (e) { console.warn('保存失败', e); }
}

function getTodayData() {
  const key = getDateKey(0);
  if (!state[key]) state[key] = {};
  if (!state[key].todos) state[key].todos = {};
  if (!state[key].feeding) state[key].feeding = {};
  if (!state[key].sensory) state[key].sensory = {};
  if (!state[key].baby) state[key].baby = {};
  return state[key];
}

function getDayData(offset) {
  const key = getDateKey(offset);
  if (!state[key]) state[key] = {};
  if (!state[key].sensory) state[key].sensory = {};
  if (!state[key].feeding) state[key].feeding = {};
  if (!state[key].todos) state[key].todos = {};
  if (!state[key].baby) state[key].baby = {};
  return state[key];
}

let state = loadState();

// ==================== 工具函数 ====================
function showToast(msg) {
  const t = document.getElementById('saveToast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 1500);
}

function getTodayInfo() {
  const now = new Date();
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    dateStr: `${now.getMonth() + 1}月${now.getDate()}日`,
    dayName: days[now.getDay()],
    dayIndex: now.getDay(), // 0=周日, 1=周一...
    month: now.getMonth() + 1,
    date: now.getDate()
  };
}

// 获取当前是4周计划的第几天（0-27）
// 从用户首次使用日开始计算循环
function getPlanIndex() {
  if (!state._startDate) {
    state._startDate = getDateKey(0);
    saveState();
  }
  const start = new Date(state._startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - start) / 86400000);
  return ((diff % 28) + 28) % 28; // 0~27
}

function getCurrentWeek() {
  return Math.floor(getPlanIndex() / 7) + 1; // 1~4
}

function getCurrentDayInWeek() {
  return getPlanIndex() % 7; // 0~6, 0=周一
}

function getCurrentWeekData() {
  return SENSORY_WEEKS[getCurrentWeek() - 1];
}

function getTodaySensoryData() {
  const weekData = getCurrentWeekData();
  const dayIdx = getCurrentDayInWeek();
  return weekData.days[dayIdx];
}

// ==================== Tab 切换 ====================
function switchTab(tabName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + tabName).classList.add('active');
  document.querySelector(`.tab-item[data-tab="${tabName}"]`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== 渲染：顶部栏 ====================
function renderTopbar() {
  const info = getTodayInfo();
  document.getElementById('topbarDate').textContent = `${info.dateStr} ${info.dayName}`;
  document.getElementById('topbarWeek').textContent = `第${getCurrentWeek()}周 · ${getCurrentWeekData().theme}`;
}

// ==================== 渲染：今日必做清单 ====================
function renderTodoList() {
  const today = getTodayData();
  const dayIdx = getCurrentDayInWeek();
  const isWeekend = dayIdx >= 5;

  const todos = [];

  // 喂养打卡
  todos.push({ id: 'feed_breakfast', text: '早餐打卡', tag: 'feeding', tagText: '喂养' });
  todos.push({ id: 'feed_lunch', text: '午餐打卡', tag: 'feeding', tagText: '喂养' });
  todos.push({ id: 'feed_dinner', text: '晚餐打卡', tag: 'feeding', tagText: '喂养' });
  todos.push({ id: 'feed_water', text: '饮水量记录', tag: 'feeding', tagText: '喂养' });

  // 早教
  todos.push({ id: 'edu_done', text: '今日早教15分钟', tag: 'edu', tagText: '早教' });

  // 感统
  if (isWeekend) {
    todos.push({ id: 'sensory_outdoor', text: '🌳 户外感统训练', tag: 'sensory', tagText: '感统' });
  } else {
    todos.push({ id: 'sensory_p1', text: '本体训练①', tag: 'sensory', tagText: '感统' });
    todos.push({ id: 'sensory_p2', text: '本体训练②', tag: 'sensory', tagText: '感统' });
    todos.push({ id: 'sensory_v1', text: '前庭训练①', tag: 'sensory', tagText: '感统' });
    todos.push({ id: 'sensory_v2', text: '前庭训练②', tag: 'sensory', tagText: '感统' });
  }

  // 复盘（周末提示）
  if (dayIdx >= 5) {
    todos.push({ id: 'review_done', text: '📋 本周复盘', tag: 'review', tagText: '复盘' });
  }

  const list = document.getElementById('todoList');
  list.innerHTML = '';
  let doneCount = 0;

  todos.forEach(todo => {
    if (!today.todos) today.todos = {};
    const isDone = today.todos[todo.id] === true;
    if (isDone) doneCount++;

    const li = document.createElement('li');
    li.className = 'todo-item' + (isDone ? ' done' : '');
    li.innerHTML = `
      <div class="todo-check ${isDone ? 'done' : ''}"></div>
      <span class="todo-text">${todo.text}</span>
      <span class="todo-tag ${todo.tag}">${todo.tagText}</span>
    `;
    li.addEventListener('click', () => {
      today.todos[todo.id] = !today.todos[todo.id];
      saveState();
      renderTodoList();
      renderWeekProgress();
    });
    list.appendChild(li);
  });

  document.getElementById('todoCount').textContent = `${doneCount}/${todos.length}`;
}

// ==================== 渲染：本周训练进度 ====================
function renderWeekProgress() {
  const weekData = getCurrentWeekData();
  let totalItems = 0;
  let doneItems = 0;

  for (let i = 0; i < 7; i++) {
    const dayData = getDayData(i - getCurrentDayInWeek());
    const dayInfo = weekData.days[i];

    if (dayInfo.tag === '户外') {
      totalItems++;
      if (dayData.todos && dayData.todos['sensory_outdoor']) doneItems++;
    } else {
      totalItems += 4;
      ['sensory_p1', 'sensory_p2', 'sensory_v1', 'sensory_v2'].forEach(key => {
        if (dayData.todos && dayData.todos[key]) doneItems++;
      });
    }
  }

  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  document.getElementById('weekProgressText').textContent = `${doneItems} / ${totalItems}`;
  document.getElementById('weekProgressBar').style.width = pct + '%';
  document.getElementById('weekProgressBadge').textContent = `第${getCurrentWeek()}周`;
}

// ==================== 渲染：宝宝数据卡片 ====================
function renderBabyData() {
  const today = getTodayData();
  if (!today.baby) today.baby = {};

  const fields = [
    { id: 'babyWakeTime', key: 'wakeTime' },
    { id: 'babyNapTime', key: 'napTime' },
    { id: 'babyMood', key: 'mood' },
    { id: 'babyFocus', key: 'focus' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (today.baby[f.key]) el.value = today.baby[f.key];
    el.addEventListener('change', () => {
      today.baby[f.key] = el.value;
      saveState();
    });
  });
}

// ==================== 渲染：喂养系统 ====================
function renderFeeding() {
  const today = getTodayData();
  if (!today.feeding) today.feeding = {};
  const f = today.feeding;
  const info = getTodayInfo();
  document.getElementById('feedingDate').textContent = `${info.dateStr} ${info.dayName}`;

  const inputs = [
    { id: 'breakfastMain', key: 'breakfastMain' },
    { id: 'breakfastState', key: 'breakfastState' },
    { id: 'morningSnack', key: 'morningSnack' },
    { id: 'morningSnackState', key: 'morningSnackState' },
    { id: 'lunchMain', key: 'lunchMain' },
    { id: 'lunchState', key: 'lunchState' },
    { id: 'afternoonSnack', key: 'afternoonSnack' },
    { id: 'afternoonSnackState', key: 'afternoonSnackState' },
    { id: 'dinnerMain', key: 'dinnerMain' },
    { id: 'dinnerState', key: 'dinnerState' },
    { id: 'waterIntake', key: 'waterIntake' },
    { id: 'milkIntake', key: 'milkIntake' }
  ];

  inputs.forEach(inp => {
    const el = document.getElementById(inp.id);
    if (f[inp.key]) el.value = f[inp.key];
    el.addEventListener('change', () => {
      f[inp.key] = el.value;
      saveState();
    });
  });

  // 餐次完成状态
  const doneFields = [
    { id: 'breakfastDone', key: 'breakfastDone', todoId: 'feed_breakfast' },
    { id: 'morningSnackDone', key: 'morningSnackDone', todoId: null },
    { id: 'lunchDone', key: 'lunchDone', todoId: 'feed_lunch' },
    { id: 'afternoonSnackDone', key: 'afternoonSnackDone', todoId: null },
    { id: 'dinnerDone', key: 'dinnerDone', todoId: 'feed_dinner' }
  ];

  doneFields.forEach(df => {
    const el = document.getElementById(df.id);
    const isDone = f[df.key] === true;
    if (isDone) el.classList.add('done');
    el.addEventListener('click', () => {
      f[df.key] = !f[df.key];
      if (df.todoId) {
        if (!today.todos) today.todos = {};
        today.todos[df.todoId] = f[df.key];
      }
      saveState();
      el.classList.toggle('done');
      renderTodoList();
      renderWeekProgress();
    });
  });

  // 饮水量联动
  document.getElementById('waterIntake').addEventListener('change', () => {
    if (!today.todos) today.todos = {};
    today.todos['feed_water'] = document.getElementById('waterIntake').value !== '';
    saveState();
    renderTodoList();
  });

  // 喂养贴士
  const tipsList = document.getElementById('feedingTipsList');
  tipsList.innerHTML = '';
  FEEDING_TIPS.forEach(tip => {
    const div = document.createElement('div');
    div.className = 'tip-item';
    div.textContent = tip;
    tipsList.appendChild(div);
  });
}

// ==================== 渲染：早教系统 ====================
function renderEarlyEdu() {
  const today = getTodayData();
  const info = getTodayInfo();
  document.getElementById('eduDateBadge').textContent = `${info.dateStr}`;

  // 今日推荐：按日期取模选3个不重复游戏
  const planIdx = getPlanIndex();
  const todayIndices = [
    planIdx % EARLY_EDU_GAMES.length,
    (planIdx + 1) % EARLY_EDU_GAMES.length,
    (planIdx + 2) % EARLY_EDU_GAMES.length
  ];

  const todayContainer = document.getElementById('todayEduGames');
  todayContainer.innerHTML = '';
  todayIndices.forEach((idx, i) => {
    const game = EARLY_EDU_GAMES[idx];
    const gameKey = `edu_${idx}`;
    const isDone = today.todos && today.todos['edu_done'] && i === 0; // 第一个关联到todo

    const card = document.createElement('div');
    card.className = 'edu-game-card';
    card.innerHTML = `
      <div class="edu-game-header">
        <span class="edu-game-name">${game.name}</span>
        <span class="edu-game-type">${game.type}</span>
        <span class="edu-game-time">${game.time}</span>
      </div>
      <div class="edu-game-detail"><strong>玩法：</strong>${game.steps}</div>
      <div class="edu-game-detail"><strong>道具：</strong>${game.props}</div>
      <div class="game-status">
        <button class="status-btn ${isDone ? 'active completed' : ''}" data-game-key="${gameKey}">✅ 已完成</button>
        <button class="status-btn" data-game-key="${gameKey}" data-status="skip">⏭️ 跳过</button>
      </div>
    `;
    todayContainer.appendChild(card);
  });

  // 绑定完成按钮
  todayContainer.querySelectorAll('.status-btn').forEach(btn => {
    if (btn.dataset.status === 'skip') return;
    btn.addEventListener('click', () => {
      if (!today.todos) today.todos = {};
      today.todos['edu_done'] = !today.todos['edu_done'];
      saveState();
      renderEarlyEdu();
      renderTodoList();
    });
  });

  // 渲染游戏库
  const libContainer = document.getElementById('eduGameLibrary');
  libContainer.innerHTML = '';
  EARLY_EDU_GAMES.forEach(game => {
    const card = document.createElement('div');
    card.className = 'edu-game-card';
    card.innerHTML = `
      <div class="edu-game-header">
        <span class="edu-game-name">${game.name}</span>
        <span class="edu-game-type">${game.type}</span>
        <span class="edu-game-time">${game.time}</span>
      </div>
      <div class="edu-game-detail"><strong>玩法：</strong>${game.steps}</div>
      <div class="edu-game-detail"><strong>道具：</strong>${game.props}</div>
    `;
    libContainer.appendChild(card);
  });
}

// ==================== 渲染：感统日历 ====================
function renderSensoryCalendar() {
  const calendar = document.getElementById('calendarWeek');
  calendar.innerHTML = '';
  const weekData = getCurrentWeekData();
  const currentDayIdx = getCurrentDayInWeek();

  // 表头
  const corner = document.createElement('div');
  corner.className = 'cal-header';
  corner.textContent = '周次';
  calendar.appendChild(corner);

  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
  for (let i = 0; i < 7; i++) {
    const header = document.createElement('div');
    header.className = 'cal-header' + (i >= 5 ? ' weekend' : '');
    header.textContent = dayNames[i];
    calendar.appendChild(header);
  }

  // 行1：本周
  const row1Label = document.createElement('div');
  row1Label.className = 'cal-row-label';
  row1Label.textContent = `第${getCurrentWeek()}周`;
  calendar.appendChild(row1Label);

  for (let i = 0; i < 7; i++) {
    const dayInfo = weekData.days[i];
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (dayInfo.tag === '户外') {
      cell.classList.add('outdoor');
      cell.textContent = '🌳户外';
    } else {
      cell.classList.add('indoor');
      cell.textContent = '本体2+前庭2';
    }
    if (i === currentDayIdx) cell.classList.add('today');

    // 检查完成状态
    const dayData = getDayData(i - currentDayIdx);
    if (dayInfo.tag !== '户外') {
      const allDone = ['sensory_p1', 'sensory_p2', 'sensory_v1', 'sensory_v2'].every(k => dayData.todos && dayData.todos[k]);
      if (allDone) cell.classList.add('completed');
    } else {
      if (dayData.todos && dayData.todos['sensory_outdoor']) cell.classList.add('completed');
    }

    cell.addEventListener('click', () => {
      renderTodaySensory(i);
    });
    calendar.appendChild(cell);
  }

  // 行2~4：其他3周概览
  for (let w = 0; w < 4; w++) {
    if (w + 1 === getCurrentWeek()) continue;
    const wData = SENSORY_WEEKS[w];
    const label = document.createElement('div');
    label.className = 'cal-row-label';
    label.textContent = `第${w + 1}周`;
    calendar.appendChild(label);

    for (let i = 0; i < 7; i++) {
      const dayInfo = wData.days[i];
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      if (dayInfo.tag === '户外') {
        cell.classList.add('outdoor');
        cell.textContent = '🌳';
      } else {
        cell.classList.add('indoor');
        cell.textContent = '●';
      }
      calendar.appendChild(cell);
    }
  }

  document.getElementById('sensoryWeekBadge').textContent = `第${getCurrentWeek()}周`;
}

// ==================== 渲染：今日感统训练 ====================
let selectedDayIdx = null;

function renderTodaySensory(dayIdx) {
  if (dayIdx === null) dayIdx = getCurrentDayInWeek();
  selectedDayIdx = dayIdx;

  const weekData = getCurrentWeekData();
  const dayInfo = weekData.days[dayIdx];
  const dayData = getDayData(dayIdx - getCurrentDayInWeek());
  if (!dayData.sensory) dayData.sensory = {};

  const container = document.getElementById('todaySensoryContent');
  container.innerHTML = '';

  // 日期标题
  const titleCard = document.createElement('div');
  titleCard.className = 'card';
  titleCard.innerHTML = `
    <div class="card-title">
      <span class="emoji">🏃</span>${dayInfo.day} 感统训练
      <span class="badge">${dayInfo.tag === '户外' ? '🌳 户外' : '🏠 室内'}</span>
    </div>
    ${dayInfo.tag === '户外' ? '' : '<div style="font-size:0.78rem;color:var(--c-text-sub);">本体觉 2项 + 前庭觉 2项</div>'}
  `;
  container.appendChild(titleCard);

  if (dayInfo.tag === '户外') {
    // 户外感统
    const outdoorCard = document.createElement('div');
    outdoorCard.className = 'outdoor-card';
    outdoorCard.innerHTML = `
      <div class="outdoor-title">🌳 今日户外自然感统</div>
      <div class="outdoor-desc">${dayInfo.outdoor}</div>
      <div class="game-status" style="max-width:200px;margin:12px auto 0;">
        <button class="status-btn ${dayData.todos && dayData.todos['sensory_outdoor'] ? 'active completed' : ''}" id="outdoorDoneBtn">✅ 已完成</button>
        <button class="status-btn" id="outdoorSkipBtn">⏭️ 今日跳过</button>
      </div>
    `;
    container.appendChild(outdoorCard);

    document.getElementById('outdoorDoneBtn').addEventListener('click', () => {
      if (!dayData.todos) dayData.todos = {};
      dayData.todos['sensory_outdoor'] = !dayData.todos['sensory_outdoor'];
      saveState();
      renderTodaySensory(dayIdx);
      renderSensoryCalendar();
      renderTodoList();
      renderWeekProgress();
    });
  } else {
    // 室内训练：本体2 + 前庭2
    const todoKeys = ['sensory_p1', 'sensory_p2', 'sensory_v1', 'sensory_v2'];

    dayInfo.proprio.forEach((game, i) => {
      const card = createGameCard(game, 'proprio', '本体觉', todoKeys[i], dayData);
      container.appendChild(card);
    });

    dayInfo.vestibular.forEach((game, i) => {
      const card = createGameCard(game, 'vestibular', '前庭觉', todoKeys[i + 2], dayData);
      container.appendChild(card);
    });
  }

  // 观察记录
  const observeCard = document.createElement('div');
  observeCard.className = 'card';
  observeCard.innerHTML = `
    <div class="card-title">
      <span class="emoji">📝</span>每日观察记录
    </div>
    <div class="observe-grid">
      <div class="observe-cell">
        <label>畏晃程度</label>
        <select id="observeDizziness">
          <option value="">选择</option>
          <option value="无">无</option>
          <option value="轻微">轻微</option>
          <option value="明显">明显</option>
          <option value="严重">严重</option>
        </select>
      </div>
      <div class="observe-cell">
        <label>发力状况</label>
        <select id="observeStrength">
          <option value="">选择</option>
          <option value="良好">良好</option>
          <option value="一般">一般</option>
          <option value="较弱">较弱</option>
        </select>
      </div>
      <div class="observe-cell">
        <label>专注度</label>
        <select id="observeFocus">
          <option value="">选择</option>
          <option value="⭐⭐⭐ 良好">⭐⭐⭐ 良好</option>
          <option value="⭐⭐ 一般">⭐⭐ 一般</option>
          <option value="⭐ 较弱">⭐ 较弱</option>
        </select>
      </div>
      <div class="observe-cell">
        <label>触觉接受度</label>
        <select id="observeTactile">
          <option value="">选择</option>
          <option value="接受">接受</option>
          <option value="勉强">勉强</option>
          <option value="抗拒">抗拒</option>
        </select>
      </div>
    </div>
    <div class="observe-cell" style="margin-top:8px;">
      <label>备注（其他观察）</label>
      <textarea id="observeNote" placeholder="如：今天对xx游戏特别感兴趣/抗拒xx…" style="min-height:40px;">${dayData.sensory.note || ''}</textarea>
    </div>
  `;
  container.appendChild(observeCard);

  // 填充观察数据
  const observeFields = [
    { id: 'observeDizziness', key: 'dizziness' },
    { id: 'observeStrength', key: 'strength' },
    { id: 'observeFocus', key: 'focus' },
    { id: 'observeTactile', key: 'tactile' }
  ];
  observeFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (dayData.sensory[f.key]) el.value = dayData.sensory[f.key];
    el.addEventListener('change', () => {
      dayData.sensory[f.key] = el.value;
      saveState();
    });
  });
  document.getElementById('observeNote').addEventListener('change', () => {
    dayData.sensory.note = document.getElementById('observeNote').value;
    saveState();
  });
}

function createGameCard(game, type, typeLabel, todoKey, dayData) {
  const card = document.createElement('div');
  card.className = `game-card ${type}`;

  const status = dayData.sensory[todoKey];
  const isCompleted = status === 'completed';
  const isResisted = status === 'resisted';
  const isBadMood = status === 'bad-mood';

  card.innerHTML = `
    <div class="game-header">
      <span class="game-name">${game.name}</span>
      <span class="game-type-tag ${type}">${typeLabel}</span>
    </div>
    <div class="game-detail"><strong>玩法：</strong>${game.steps}</div>
    <div class="game-detail"><strong>道具：</strong>${game.props}</div>
    <div class="game-taboo">🚫 ${game.taboo}</div>
    <div class="game-status">
      <button class="status-btn ${isCompleted ? 'active completed' : ''}" data-status="completed">✅ 完成</button>
      <button class="status-btn ${isResisted ? 'active resisted' : ''}" data-status="resisted">😟 抗拒</button>
      <button class="status-btn ${isBadMood ? 'active bad-mood' : ''}" data-status="bad-mood">😢 情绪不佳</button>
    </div>
  `;

  card.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      const current = dayData.sensory[todoKey];
      if (current === status) {
        delete dayData.sensory[todoKey];
      } else {
        dayData.sensory[todoKey] = status;
      }
      // 联动todo
      if (!dayData.todos) dayData.todos = {};
      dayData.todos[todoKey] = dayData.sensory[todoKey] === 'completed';
      saveState();
      renderTodaySensory(selectedDayIdx);
      renderSensoryCalendar();
      renderTodoList();
      renderWeekProgress();
    });
  });

  return card;
}

// ==================== 渲染：复盘 ====================
function renderReview() {
  const weekNum = getCurrentWeek();
  document.getElementById('reviewWeekBadge').textContent = `第${weekNum}周`;

  const reviewKey = `review_week${weekNum}`;
  if (!state[reviewKey]) state[reviewKey] = {};

  // 评分点
  document.querySelectorAll('.review-scale').forEach(scale => {
    const key = scale.dataset.key;
    const currentVal = state[reviewKey][key] || 0;

    scale.querySelectorAll('.scale-dot').forEach(dot => {
      const val = parseInt(dot.dataset.val);
      if (val === currentVal) dot.classList.add('active');
      dot.addEventListener('click', () => {
        state[reviewKey][key] = val;
        saveState();
        scale.querySelectorAll('.scale-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });
  });

  // 文本框
  const noteFields = [
    { id: 'reviewVestibularNote', key: 'vestibularNote' },
    { id: 'reviewProprioNote', key: 'proprioNote' },
    { id: 'reviewTactileNote', key: 'tactileNote' },
    { id: 'reviewFocusNote', key: 'focusNote' },
    { id: 'reviewWeeklySummary', key: 'weeklySummary' }
  ];

  noteFields.forEach(f => {
    const el = document.getElementById(f.id);
    if (state[reviewKey][f.key]) el.value = state[reviewKey][f.key];
    el.addEventListener('change', () => {
      state[reviewKey][f.key] = el.value;
      saveState();
    });
  });

  // 预警信号
  const warningList = document.getElementById('warningList');
  warningList.innerHTML = '';
  WARNING_SIGNS.forEach(w => {
    const div = document.createElement('div');
    div.className = 'warning-item';
    div.innerHTML = `
      <span class="warning-level">${w.level}</span>
      <div class="warning-content">
        <div class="warning-title">${w.type}</div>
        <div class="warning-desc">${w.desc}</div>
        <div class="warning-action">建议：${w.action}</div>
      </div>
    `;
    warningList.appendChild(div);
  });

  // 本周统计
  const weekData = getCurrentWeekData();
  let completed = 0, resisted = 0, badMood = 0, outdoorDone = 0, outdoorTotal = 0, totalItems = 0;

  for (let i = 0; i < 7; i++) {
    const dayData = getDayData(i - getCurrentDayInWeek());
    const dayInfo = weekData.days[i];

    if (dayInfo.tag === '户外') {
      outdoorTotal++;
      totalItems++;
      if (dayData.todos && dayData.todos['sensory_outdoor']) {
        completed++;
        outdoorDone++;
      }
    } else {
      totalItems += 4;
      ['sensory_p1', 'sensory_p2', 'sensory_v1', 'sensory_v2'].forEach(key => {
        const s = dayData.sensory && dayData.sensory[key];
        if (s === 'completed') completed++;
        if (s === 'resisted') resisted++;
        if (s === 'bad-mood') badMood++;
      });
    }
  }

  const rate = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
  document.getElementById('reviewCompleteRate').textContent = rate + '%';
  document.getElementById('reviewProgressBar').style.width = rate + '%';
  document.getElementById('reviewCompletedCount').textContent = completed;
  document.getElementById('reviewResistedCount').textContent = resisted;
  document.getElementById('reviewBadMoodCount').textContent = badMood;
  document.getElementById('reviewOutdoorCount').textContent = `${outdoorDone}/${outdoorTotal}`;
}

// ==================== 初始化 ====================
function init() {
  renderTopbar();

  // Tab导航
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 快捷入口
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  renderTodoList();
  renderWeekProgress();
  renderBabyData();
  renderFeeding();
  renderEarlyEdu();
  renderSensoryCalendar();
  renderTodaySensory(getCurrentDayInWeek());
  renderReview();

  // URL 参数支持：?tab=sensory 自动打开对应 Tab
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab');
  if (initialTab && ['dashboard', 'feeding', 'edu', 'sensory', 'review'].includes(initialTab)) {
    switchTab(initialTab);
  }

  // 安装提示
  setupInstallPrompt();
}

// ==================== PWA 安装引导 ====================
let deferredPrompt = null;

function setupInstallPrompt() {
  // 检测是否已安装（standalone 模式）
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || window.navigator.standalone === true;

  if (isStandalone) {
    // 已安装，不显示任何安装引导
    return;
  }

  // Chrome/Edge/三星 弹窗安装
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
    showInstallEntry();
  });

  // 已安装
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallBanner();
    hideInstallEntry();
    showToast('已安装到桌面 ✓');
  });

  // iOS 检测：显示手动添加指引
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
    setTimeout(() => showIosInstallTip(), 1500);
    showInstallEntry();
    return;
  }

  // 华为/鸿蒙检测：华为浏览器通常不触发 beforeinstallprompt
  const ua = navigator.userAgent.toLowerCase();
  const isHuawei = /huawei|hon|honor|harmony/.test(ua) 
    || (window.harmony !== undefined)
    || /huawei/.test(navigator.vendor?.toLowerCase() || '');
  
  // 如果 3 秒后还没触发 beforeinstallprompt，说明浏览器不支持自动弹窗
  setTimeout(() => {
    if (!deferredPrompt) {
      showInstallEntry();
      // 华为浏览器特殊引导
      if (isHuawei) {
        showHuaweiInstallGuide();
      }
    }
  }, 3000);
}

// 固定的「添加到桌面」入口按钮（仪表盘页面）
function showInstallEntry() {
  if (document.getElementById('installEntry')) return;
  if (localStorage.getItem('install_entry_hidden') === '1') return;

  const entry = document.createElement('div');
  entry.id = 'installEntry';
  entry.className = 'install-entry';
  entry.innerHTML = `
    <div class="install-entry-icon">📲</div>
    <div class="install-entry-text">
      <strong>添加到桌面</strong>
      <span>像 App 一样使用，离线也能打卡</span>
    </div>
    <button class="install-entry-btn" id="installEntryBtn">安装</button>
  `;
  
  // 插入到仪表盘的安全横幅后面
  const dashboard = document.getElementById('page-dashboard');
  const safety = dashboard.querySelector('.safety-banner');
  if (safety && safety.nextSibling) {
    dashboard.insertBefore(entry, safety.nextSibling);
  } else {
    dashboard.insertBefore(entry, dashboard.firstChild);
  }

  document.getElementById('installEntryBtn').addEventListener('click', () => {
    if (deferredPrompt) {
      // 支持 prompt 的浏览器
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(({ outcome }) => {
        if (outcome === 'accepted') showToast('安装中…');
        deferredPrompt = null;
      });
    } else {
      // 不支持 prompt 的浏览器，显示手动引导
      showManualInstallGuide();
    }
  });
}

function hideInstallEntry() {
  const entry = document.getElementById('installEntry');
  if (entry) entry.remove();
}

// 底部自动弹出的横幅
function showInstallBanner() {
  if (document.getElementById('installBanner')) return;
  if (localStorage.getItem('install_banner_closed') === '1') return;

  const banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.className = 'install-banner';
  banner.innerHTML = `
    <div class="install-icon">📲</div>
    <div class="install-text">
      <strong>安装到桌面</strong>
      <span>每天一键打卡，像 App 一样使用</span>
    </div>
    <button class="install-btn" id="installBtn">安装</button>
    <button class="install-close" id="closeInstall">✕</button>
  `;
  document.body.appendChild(banner);

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('安装中…');
    }
    deferredPrompt = null;
  });

  document.getElementById('closeInstall').addEventListener('click', () => {
    hideInstallBanner();
    localStorage.setItem('install_banner_closed', '1');
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('installBanner');
  if (banner) banner.remove();
}

// 华为/鸿蒙专属安装引导
function showHuaweiInstallGuide() {
  if (document.getElementById('huaweiGuide')) return;
  if (localStorage.getItem('huawei_guide_closed') === '1') return;

  const guide = document.createElement('div');
  guide.id = 'huaweiGuide';
  guide.className = 'install-modal-overlay';
  guide.innerHTML = `
    <div class="install-modal">
      <div class="modal-close" id="closeHuaweiGuide">✕</div>
      <div class="modal-icon">📱</div>
      <h3>华为手机安装指引</h3>
      <p class="modal-subtitle">华为浏览器需手动添加到桌面，30秒搞定</p>
      <div class="modal-steps">
        <div class="modal-step">
          <div class="step-num">1</div>
          <div class="step-content">
            <strong>点击浏览器底部「⋮」菜单</strong>
            <span>页面右下角或右上角的三个点图标</span>
          </div>
        </div>
        <div class="modal-step">
          <div class="step-num">2</div>
          <div class="step-content">
            <strong>选择「添加到主屏幕」</strong>
            <span>或「添加至桌面」「创建快捷方式」</span>
          </div>
        </div>
        <div class="modal-step">
          <div class="step-num">3</div>
          <div class="step-content">
            <strong>确认添加</strong>
            <span>桌面出现「奶咖育儿」图标，点击即用</span>
          </div>
        </div>
      </div>
      <div class="modal-note">
        💡 如果菜单里找不到，换用 <strong>Chrome 浏览器</strong> 打开本页面，会自动弹出安装提示
      </div>
      <button class="modal-ok-btn" id="huaweiGuideOk">我知道了</button>
    </div>
  `;
  document.body.appendChild(guide);

  const close = () => {
    guide.remove();
    localStorage.setItem('huawei_guide_closed', '1');
  };
  document.getElementById('closeHuaweiGuide').addEventListener('click', close);
  document.getElementById('huaweiGuideOk').addEventListener('click', close);
}

// 通用手动安装引导（非 iOS、非华为，但不支持 prompt 时）
function showManualInstallGuide() {
  if (document.getElementById('manualGuide')) return;

  const guide = document.createElement('div');
  guide.id = 'manualGuide';
  guide.className = 'install-modal-overlay';
  
  // 判断浏览器类型给出对应指引
  const ua = navigator.userAgent.toLowerCase();
  let browserName = '你的浏览器';
  let steps = `
    <div class="modal-step">
      <div class="step-num">1</div>
      <div class="step-content">
        <strong>点击浏览器「⋮」菜单</strong>
        <span>页面右上角的三个点图标</span>
      </div>
    </div>
    <div class="modal-step">
      <div class="step-num">2</div>
      <div class="step-content">
        <strong>选择「添加到主屏幕」</strong>
        <span>或「安装应用」</span>
      </div>
    </div>
    <div class="modal-step">
      <div class="step-num">3</div>
      <div class="step-content">
        <strong>确认添加</strong>
        <span>桌面出现图标，点击即用</span>
      </div>
    </div>
  `;

  if (/huawei|hon|honor|harmony/.test(ua)) {
    browserName = '华为浏览器';
  } else if (/miui|redmi/.test(ua)) {
    browserName = '小米浏览器';
  } else if (/qq/.test(ua)) {
    browserName = 'QQ浏览器';
    steps = `
      <div class="modal-step">
        <div class="step-num">1</div>
        <div class="step-content">
          <strong>点击底部「⋮」菜单</strong>
          <span>页面下方的菜单按钮</span>
        </div>
      </div>
      <div class="modal-step">
        <div class="step-num">2</div>
        <div class="step-content">
          <strong>选择「添加书签」→「添加到主屏幕」</strong>
          <span>或「工具箱」→「添加到桌面」</span>
        </div>
      </div>
      <div class="modal-step">
        <div class="step-num">3</div>
        <div class="step-content">
          <strong>用系统浏览器打开更佳</strong>
          <span>建议复制链接到 Chrome 打开，可一键安装</span>
        </div>
      </div>
    `;
  } else if (/micromessenger/.test(ua)) {
    browserName = '微信内置浏览器';
    steps = `
      <div class="modal-step">
        <div class="step-num">1</div>
        <div class="step-content">
          <strong>点击右上角「⋯」</strong>
          <span>微信页面右上角的三个点</span>
        </div>
      </div>
      <div class="modal-step">
        <div class="step-num">2</div>
        <div class="step-content">
          <strong>选择「在浏览器打开」</strong>
          <span>用系统浏览器或 Chrome 打开</span>
        </div>
      </div>
      <div class="modal-step">
        <div class="step-num">3</div>
        <div class="step-content">
          <strong>在浏览器中添加到主屏幕</strong>
          <span>浏览器菜单 → 添加到主屏幕</span>
        </div>
      </div>
    `;
  }

  guide.innerHTML = `
    <div class="install-modal">
      <div class="modal-close" id="closeManualGuide">✕</div>
      <div class="modal-icon">📲</div>
      <h3>添加到桌面</h3>
      <p class="modal-subtitle">${browserName} 手动安装指引</p>
      <div class="modal-steps">
        ${steps}
      </div>
      <div class="modal-note">
        💡 推荐用 <strong>Chrome 浏览器</strong> 打开本页面，可自动弹出一键安装提示
      </div>
      <button class="modal-ok-btn" id="manualGuideOk">我知道了</button>
    </div>
  `;
  document.body.appendChild(guide);

  const close = () => guide.remove();
  document.getElementById('closeManualGuide').addEventListener('click', close);
  document.getElementById('manualGuideOk').addEventListener('click', close);
}

function showIosInstallTip() {
  if (document.getElementById('iosInstallTip')) return;
  if (localStorage.getItem('ios_tip_closed') === '1') return;

  const tip = document.createElement('div');
  tip.id = 'iosInstallTip';
  tip.className = 'install-banner ios';
  tip.innerHTML = `
    <div class="install-icon">🍎</div>
    <div class="install-text">
      <strong>添加到主屏幕</strong>
      <span>点击 Safari 底部分享按钮，选择「添加到主屏幕」</span>
    </div>
    <button class="install-close" id="closeIosTip">✕</button>
  `;
  document.body.appendChild(tip);
  document.getElementById('closeIosTip').addEventListener('click', () => {
    tip.remove();
    localStorage.setItem('ios_tip_closed', '1');
  });
}

document.addEventListener('DOMContentLoaded', init);
