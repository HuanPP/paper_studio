const page = document.documentElement.dataset.page || 'landing';
let subjectsCache = null;

async function loadSubjects() {
  if (subjectsCache) return subjectsCache;
  const response = await fetch('data/exams.json');
  if (!response.ok) throw new Error('无法加载试卷数据');
  const data = await response.json();
  subjectsCache = data.subjects ?? [];
  return subjectsCache;
}

function findByKeyword(keyword, dataset) {
  const value = keyword.trim().toLowerCase();
  if (!value) return { subject: null, examIndex: undefined };

  for (const subject of dataset) {
    if (subject.name.toLowerCase().includes(value)) {
      return { subject, examIndex: 0 };
    }
    const idx = subject.exams?.findIndex((exam) => {
      const haystack = `${exam.title} ${exam.year ?? ''} ${exam.season ?? ''} ${exam.note ?? ''}`.toLowerCase();
      return haystack.includes(value);
    });
    if (idx !== undefined && idx > -1) {
      return { subject, examIndex: idx };
    }
  }
  return { subject: null, examIndex: undefined };
}

function initLandingPage() {
  const form = document.querySelector('#landingSearchForm');
  const input = document.querySelector('#homeSearch');
  if (!form || !input) return;

  loadSubjects().catch(() => {});

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const keyword = input.value || '';
    if (!keyword.trim()) {
      window.location.href = 'subjects.html';
      return;
    }
    try {
      const dataset = await loadSubjects();
      const { subject, examIndex } = findByKeyword(keyword, dataset);
      if (!subject) {
        input.setCustomValidity('未找到匹配的科目或试卷');
        input.reportValidity();
        setTimeout(() => input.setCustomValidity(''), 1500);
        return;
      }
      const params = new URLSearchParams({ id: subject.id });
      if (typeof examIndex === 'number') params.set('exam', String(examIndex));
      window.location.href = `subject.html?${params.toString()}`;
    } catch (error) {
      input.setCustomValidity('无法读取科目数据');
      input.reportValidity();
      setTimeout(() => input.setCustomValidity(''), 1500);
    }
  });

  input.addEventListener('input', () => {
    input.setCustomValidity('');
  });
}

function renderSubjectSquares(dataset, grid, template) {
  grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  dataset.forEach((subject) => {
    const node = template.content.cloneNode(true);
    const button = node.querySelector('.subject-square');
    const accent = node.querySelector('.subject-square__accent');
    const name = node.querySelector('.subject-square__name');
    const count = node.querySelector('.subject-square__count');
    button.dataset.subjectId = subject.id;
    accent.style.background = subject.accent ?? 'var(--md-sys-color-primary-container)';
    name.textContent = subject.name;
    count.textContent = `${subject.exams?.length ?? 0} 套试卷`;
    fragment.appendChild(node);
  });
  if (!fragment.childNodes.length) {
    grid.innerHTML = '<p class="error">暂无科目，请在数据文件中添加。</p>';
    return;
  }
  grid.appendChild(fragment);
}

function initSubjectsPage() {
  const grid = document.querySelector('#subjectSquareGrid');
  const template = document.querySelector('#subjectSquareTemplate');
  if (!grid || !template) return;

  loadSubjects()
    .then((dataset) => {
      renderSubjectSquares(dataset, grid, template);
    })
    .catch((error) => {
      grid.innerHTML = `<p class="error">${error.message}</p>`;
    });

  grid.addEventListener('click', (event) => {
    const target = event.target.closest('.subject-square');
    if (!target) return;
    const subjectId = target.dataset.subjectId;
    const params = new URLSearchParams({ id: subjectId });
    window.location.href = `subject.html?${params.toString()}`;
  });
}

function initDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const subjectId = params.get('id');
  const detailTitle = document.querySelector('#detailTitle');
  const detailMeta = document.querySelector('#detailMeta');
  const detailBreadcrumb = document.querySelector('#detailBreadcrumb');
  const detailExamList = document.querySelector('#detailExamList');
  const finderTemplate = document.querySelector('#finderExamTemplate');
  const previewFrame = document.querySelector('#detailPreviewFrame');
  const previewPlaceholder = document.querySelector('#previewPlaceholder');
  const previewInfo = document.querySelector('#previewInfo');
  const previewHeading = document.querySelector('#previewTitle');
  const previewMeta = document.querySelector('#previewMeta');
  const previewDownload = document.querySelector('#previewDownload');

  if (!subjectId || !detailExamList || !finderTemplate) {
    if (detailTitle) detailTitle.textContent = '未指定科目';
    if (detailMeta) detailMeta.textContent = '请从科目列表进入';
    if (detailExamList) {
      detailExamList.innerHTML = '<li class="finder-item finder-item--empty">暂无数据</li>';
    }
    return;
  }

  function showPreviewPlaceholder(text) {
    if (previewFrame) {
      previewFrame.src = '';
      previewFrame.hidden = true;
    }
    if (previewInfo) previewInfo.hidden = true;
    if (previewPlaceholder) {
      previewPlaceholder.hidden = false;
      const textNode = previewPlaceholder.querySelector('p');
      if (textNode) textNode.textContent = text;
    }
    detailExamList
      .querySelectorAll('.finder-item')
      .forEach((item) => item.classList.remove('finder-item--active'));
  }

  function renderDetailList(subject) {
    detailExamList.innerHTML = '';
    if (!subject.exams?.length) {
      const empty = document.createElement('li');
      empty.className = 'finder-item finder-item--empty';
      empty.textContent = '暂无试卷';
      detailExamList.appendChild(empty);
      return;
    }
    subject.exams.forEach((exam, index) => {
      const node = finderTemplate.content.cloneNode(true);
      const item = node.querySelector('.finder-item');
      const title = node.querySelector('.finder-item__title');
      const meta = node.querySelector('.finder-item__meta');
      const metaParts = [`${exam.year ?? ''} ${exam.season ?? ''}`.trim(), exam.note].filter(Boolean);
      title.textContent = exam.title;
      meta.textContent = metaParts.join(' · ');
      item.dataset.examId = `${subject.id}-${index}`;
      item.dataset.file = exam.file;
      item.dataset.meta = meta.textContent;
      item.dataset.title = exam.title;
      detailExamList.appendChild(node);
    });
  }

  function selectExam(examId) {
    const candidate = detailExamList.querySelector(`[data-exam-id="${examId}"]`);
    if (!candidate) {
      showPreviewPlaceholder('在列表左侧选择试卷以预览');
      return;
    }

    detailExamList
      .querySelectorAll('.finder-item')
      .forEach((item) => item.classList.toggle('finder-item--active', item === candidate));

    const { file, title, meta } = candidate.dataset;
    if (previewHeading) previewHeading.textContent = title;
    if (previewMeta) previewMeta.textContent = meta;
    if (previewDownload) {
      previewDownload.href = file;
      previewDownload.setAttribute('aria-label', `${title} 下载`);
    }
    if (previewFrame) {
      previewFrame.hidden = false;
      previewFrame.src = file;
    }
    if (previewInfo) previewInfo.hidden = false;
    if (previewPlaceholder) previewPlaceholder.hidden = true;
  }

  loadSubjects()
    .then((dataset) => {
      const subject = dataset.find((item) => item.id === subjectId);
      if (!subject) throw new Error('未找到该科目，检查链接是否正确');
      if (detailTitle) detailTitle.textContent = subject.name;
      if (detailMeta) detailMeta.textContent = `${subject.description ?? ''} · ${subject.exams?.length ?? 0} 套`;
      if (detailBreadcrumb) detailBreadcrumb.textContent = `Paper Studio / ${subject.name}`;
      renderDetailList(subject);
      const examParam = params.get('exam');
      if (subject.exams?.length) {
        const index = Number.parseInt(examParam ?? '0', 10);
        if (!Number.isNaN(index) && index >= 0 && index < subject.exams.length) {
          selectExam(`${subject.id}-${index}`);
        } else {
          selectExam(`${subject.id}-0`);
        }
      } else {
        showPreviewPlaceholder('该科目暂无试卷');
      }

      detailExamList.addEventListener('click', (event) => {
        const item = event.target.closest('.finder-item');
        if (!item || !item.dataset.examId) return;
        selectExam(item.dataset.examId);
      });
    })
    .catch((error) => {
      if (detailTitle) detailTitle.textContent = '加载失败';
      if (detailMeta) detailMeta.textContent = error.message;
      showPreviewPlaceholder('无法加载该科目');
    });
}

switch (page) {
  case 'subjects':
    initSubjectsPage();
    break;
  case 'detail':
    initDetailPage();
    break;
  default:
    initLandingPage();
}
