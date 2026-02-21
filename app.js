const mediaItems = [
  {
    source: 'Forbes',
    quote:
      '“Derivative exchange American-based Cryptolly believes they will continue to grow in 2026.”',
  },
  {
    source: 'CoinDesk',
    quote:
      '“Cryptolly continues to set benchmarks in security and usability for new crypto investors.”',
  },
  {
    source: 'Bloomberg',
    quote:
      '“A steady product roadmap and global expansion put Cryptolly among standout exchanges.”',
  },
];

const sourceNode = document.getElementById('media-source');
const quoteNode = document.getElementById('media-quote');
const cardNode = document.getElementById('media-card');
const prevBtn = document.getElementById('media-prev');
const nextBtn = document.getElementById('media-next');

let mediaIndex = 0;

function renderMedia() {
  if (!sourceNode || !quoteNode || !cardNode) {
    return;
  }

  cardNode.classList.add('is-switching');
  window.setTimeout(() => {
    const item = mediaItems[mediaIndex];
    sourceNode.textContent = item.source;
    quoteNode.textContent = item.quote;
    cardNode.classList.remove('is-switching');
  }, 140);
}

function moveMedia(step) {
  mediaIndex = (mediaIndex + step + mediaItems.length) % mediaItems.length;
  renderMedia();
}

if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => moveMedia(-1));
  nextBtn.addEventListener('click', () => moveMedia(1));
}

const tabButtons = document.querySelectorAll('.tabs button');
if (tabButtons.length) {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
}

const revealNodes = document.querySelectorAll('.section, .cta, .footer, .hero .market-board, .tracker');
revealNodes.forEach((node) => node.classList.add('reveal'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
    rootMargin: '0px 0px -80px 0px',
  }
);

revealNodes.forEach((node) => observer.observe(node));

renderMedia();

const monthLabel = document.getElementById('month-label');
const calendarGrid = document.getElementById('calendar-grid');
const monthPrev = document.getElementById('month-prev');
const monthNext = document.getElementById('month-next');

const modal = document.getElementById('day-modal');
const modalDate = document.getElementById('modal-date');
const modalResult = document.getElementById('modal-result');
const modalDeposit = document.getElementById('modal-deposit');
const modalError = document.getElementById('modal-error');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

const yellowPath = document.getElementById('result-path');
const bluePath = document.getElementById('deposit-path');
const yellowPathGlow = document.getElementById('result-path-glow');
const bluePathGlow = document.getElementById('deposit-path-glow');
const disciplineScore = document.getElementById('discipline-score');
const bestGreenStreakNode = document.getElementById('best-green-streak');
const bestRedStreakNode = document.getElementById('best-red-streak');
const aiAdviceText = document.getElementById('ai-advice-text');

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

let selectedDateKey = '';
const dayData = {};
const now = new Date();
let viewYear = now.getFullYear();
let viewMonth = now.getMonth();
const STORAGE_KEY = 'tracker-day-data-v1';

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function openDayModal(dateKey) {
  selectedDateKey = dateKey;
  const current = dayData[dateKey] || { result: 1, variant: '', deposit: '' };
  modalDate.textContent = dateKey;
  modalResult.value =
    current.variant === 'neg' || current.variant === 'pos' || current.variant === 'pos-outline'
      ? current.variant
      : '';
  modalDeposit.value = current.deposit;
  if (modalError) {
    modalError.textContent = '';
  }
  modalResult.closest('.field')?.classList.remove('error');
  modalDeposit.closest('.field')?.classList.remove('error');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeDayModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function buildPath(values, minY, maxY, bounds = { left: 20, right: 500, top: 30, bottom: 230 }) {
  if (!values.length) {
    return '';
  }

  const { left, right, top, bottom } = bounds;
  const width = right - left;
  const height = bottom - top;
  const steps = values.length > 1 ? values.length - 1 : 1;

  const points = values.map((value, index) => {
    const x = left + (width * index) / steps;
    const safeRange = maxY - minY || 1;
    const ratio = (value - minY) / safeRange;
    const y = bottom - ratio * height;
    return { x, y };
  });

  if (points.length < 3) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
  }

  // Catmull-Rom to cubic Bezier conversion for smooth rounded curves.
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

function saveDayData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dayData));
  } catch (_error) {
    // Ignore storage failures (private mode / quota).
  }
}

function loadDayData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    Object.entries(parsed).forEach(([dateKey, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      const legacyResult = Number(value.result) === -1 ? -1 : 1;
      const variant =
        value.variant === 'neg' || value.variant === 'pos' || value.variant === 'pos-outline'
          ? value.variant
          : legacyResult === -1
            ? 'neg'
            : 'pos';
      const result = variant === 'neg' ? -1 : 1;
      const deposit = Number(value.deposit);
      dayData[dateKey] = {
        result,
        variant,
        deposit: Number.isFinite(deposit) && deposit >= 0 ? deposit : 0,
      };
    });
  } catch (_error) {
    // Ignore invalid JSON and keep app usable.
  }
}

function updateDisciplineScore() {
  if (!disciplineScore || !bestGreenStreakNode || !bestRedStreakNode) {
    return;
  }

  const sortedEntries = Object.entries(dayData).sort(([a], [b]) => a.localeCompare(b));
  const values = sortedEntries.map(([, value]) => value);
  const greens = values.filter((entry) => Number(entry.result) === 1).length;
  const reds = values.filter((entry) => Number(entry.result) === -1).length;
  const total = greens + reds;
  const percent = total > 0 ? Math.round((greens / total) * 100) : 0;
  let bestGreenStreak = 0;
  let bestRedStreak = 0;
  let currentGreenStreak = 0;
  let currentRedStreak = 0;

  values.forEach((entry) => {
    if (Number(entry.result) === 1) {
      currentGreenStreak += 1;
      currentRedStreak = 0;
      if (currentGreenStreak > bestGreenStreak) {
        bestGreenStreak = currentGreenStreak;
      }
    } else {
      currentRedStreak += 1;
      currentGreenStreak = 0;
      if (currentRedStreak > bestRedStreak) {
        bestRedStreak = currentRedStreak;
      }
    }
  });

  const scoreValue = disciplineScore.querySelector('strong');
  const greenStreakValue = bestGreenStreakNode.querySelector('strong');
  const redStreakValue = bestRedStreakNode.querySelector('strong');

  if (scoreValue) {
    scoreValue.textContent = `${percent}%`;
  }
  if (greenStreakValue) {
    greenStreakValue.textContent = String(bestGreenStreak);
  }
  if (redStreakValue) {
    redStreakValue.textContent = String(bestRedStreak);
  }

  if (aiAdviceText) {
    if (total < 5) {
      aiAdviceText.textContent = 'Track at least 5 days to get a practical discipline recommendation.';
    } else if (percent >= 75 && bestGreenStreak >= 4) {
      aiAdviceText.textContent = 'Strong consistency. Keep the same routine and protect your streak by limiting impulsive entries.';
    } else if (bestRedStreak >= 3) {
      aiAdviceText.textContent = 'Red streak is growing. Reduce position size for the next sessions and trade only A+ setups.';
    } else if (percent >= 60) {
      aiAdviceText.textContent = 'Progress is stable. Focus on avoiding single emotional days that break momentum.';
    } else {
      aiAdviceText.textContent = 'Discipline is unstable. Use a strict daily checklist and cap risk until score recovers.';
    }
  }
}

function updateChart() {
  const sortedEntries = Object.entries(dayData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);

  if (!sortedEntries.length) {
    yellowPath.setAttribute('d', '');
    bluePath.setAttribute('d', '');
    yellowPathGlow?.setAttribute('d', '');
    bluePathGlow?.setAttribute('d', '');
    updateDisciplineScore();
    return;
  }

  let cumulative = 0;
  const cumulativeSeries = sortedEntries.map((entry) => {
    cumulative += Number(entry.result) || 0;
    return {
      cumulative,
      deposit: Number(entry.deposit) || 0,
    };
  });

  const visibleSeries = cumulativeSeries.slice(-14);
  const resultValues = visibleSeries.map((entry) => entry.cumulative);
  const depositValues = visibleSeries.map((entry) => entry.deposit);

  const minResult = Math.min(...resultValues, 0);
  const maxResult = Math.max(...resultValues, 1);
  const yellowD = buildPath(resultValues, minResult, maxResult);
  yellowPath.setAttribute('d', yellowD);
  yellowPathGlow?.setAttribute('d', yellowD);

  const maxDeposit = Math.max(...depositValues, 1);
  const blueD = buildPath(depositValues, 0, maxDeposit);
  bluePath.setAttribute('d', blueD);
  bluePathGlow?.setAttribute('d', blueD);

  updateDisciplineScore();
}

function dayClass(result, variant, isSelected) {
  if (result === -1) {
    return isSelected ? 'day-btn neg selected' : 'day-btn neg';
  }
  if (variant === 'pos-outline') {
    return isSelected ? 'day-btn pos-outline selected' : 'day-btn pos-outline';
  }
  if (result === 1) {
    return isSelected ? 'day-btn pos selected' : 'day-btn pos';
  }
  return isSelected ? 'day-btn selected' : 'day-btn';
}

function renderCalendar() {
  if (!calendarGrid || !monthLabel) {
    return;
  }

  monthLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;
  calendarGrid.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = 42;

  for (let i = 0; i < cells; i += 1) {
    if (i < firstDay || i >= firstDay + lastDate) {
      const empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'day-btn empty';
      empty.textContent = '';
      calendarGrid.appendChild(empty);
      continue;
    }

    const day = i - firstDay + 1;
    const dateKey = formatDateKey(viewYear, viewMonth, day);
    const result = dayData[dateKey]?.result;
    const variant = dayData[dateKey]?.variant;
    const isSelected = dateKey === selectedDateKey;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = dayClass(result, variant, isSelected);
    btn.textContent = String(day);

    btn.addEventListener('click', () => {
      openDayModal(dateKey);
    });

    calendarGrid.appendChild(btn);
  }
}

if (monthPrev && monthNext) {
  monthPrev.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  monthNext.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });
}

if (modalCancel) {
  modalCancel.addEventListener('click', closeDayModal);
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeDayModal();
    }
  });
}

if (modalSave) {
  modalSave.addEventListener('click', () => {
    if (!selectedDateKey) {
      return;
    }

    const variant =
      modalResult.value === 'neg' || modalResult.value === 'pos' || modalResult.value === 'pos-outline'
        ? modalResult.value
        : '';
    const rawDeposit = String(modalDeposit.value ?? '').trim();
    const result = variant === 'neg' ? -1 : 1;
    const deposit = Number(rawDeposit);
    const hasValidDeposit = rawDeposit !== '' && Number.isFinite(deposit) && deposit >= 0;
    const hasVariant = variant !== '';

    modalResult.closest('.field')?.classList.toggle('error', !hasVariant);
    modalDeposit.closest('.field')?.classList.toggle('error', !hasValidDeposit);

    if (!hasVariant || !hasValidDeposit) {
      if (modalError) {
        if (!hasVariant && !hasValidDeposit) {
          modalError.textContent = 'Choose day type and enter deposit amount.';
        } else if (!hasVariant) {
          modalError.textContent = 'Choose day type.';
        } else {
          modalError.textContent = 'Enter deposit amount.';
        }
      }
      return;
    }

    dayData[selectedDateKey] = {
      result,
      variant,
      deposit,
    };

    saveDayData();
    closeDayModal();
    renderCalendar();
    updateChart();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('open')) {
    closeDayModal();
  }
});

if (modalResult) {
  modalResult.addEventListener('change', () => {
    modalResult.closest('.field')?.classList.remove('error');
    if (modalError) {
      modalError.textContent = '';
    }
  });
}

if (modalDeposit) {
  modalDeposit.addEventListener('input', () => {
    modalDeposit.closest('.field')?.classList.remove('error');
    if (modalError) {
      modalError.textContent = '';
    }
  });
}

loadDayData();
renderCalendar();
updateChart();
