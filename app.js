const sb = supabase.createClient('https://yreowkknamoofmvzgifb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW93a2tuYW1vb2ZtdnpnaWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTI4MzksImV4cCI6MjEwNjI4ODgzOX0.R_zyAjj5nK-RTiLlhmsB2isw1V0V7CbAXVVLUpHSKvY');

const root = document.documentElement;
const themeButton = document.querySelector('[data-theme-toggle]');
const menuButtons = document.querySelectorAll('[data-menu-toggle]');
const sidebar = document.querySelector('.sidebar');
const menuBackdrop = document.querySelector('.menu-backdrop');

const prices = { corte: 35, barba: 30, pintura: 50 };
const names = { corte: 'Corte', barba: 'Barba', pintura: 'Pintura' };
const selectedServices = new Set();
let currentStep = 1;

function updateSteps() {
  document.querySelectorAll('[data-step]').forEach(step => {
    const number = Number(step.dataset.step);
    step.classList.toggle('active', number === currentStep);
    step.classList.toggle('current', number === currentStep);
    step.classList.toggle('done', number < currentStep);
  });
}

function calculateStep() {
  const hasService = selectedServices.size > 0;
  const hasTime = Boolean(form?.elements.horario.value && form?.elements.barbeiro.value);
  const hasName = Boolean(form?.elements.nome.value.trim());
  const hasPhone = Boolean(form?.elements.whatsapp.value.trim());

  currentStep = hasService && !hasTime ? 2 : (hasService && hasTime && (!hasName || !hasPhone) ? 3 : 1);
  updateSteps();
}

const form = document.querySelector('#booking-form');
const serviceTotal = document.querySelector('[data-total]');
const serviceSummary = document.querySelector('[data-summary]');
const formMessage = document.querySelector('[data-form-message]');
const bookingSuccess = document.querySelector('.booking-success');
const newBookingButton = document.querySelector('[data-new-booking]');

const timesBox = document.querySelector('[data-times]');
const barbersBox = document.querySelector('[data-barbers]');
const barberTitle = document.querySelector('[data-barber-title]');
const dateInput = form.elements.data;
dateInput.min = new Date().toLocaleDateString('en-CA');
let slots = [];
let loadId = 0;

const hint = t => `<p class="text-sm text-[var(--color-muted)]">${t}</p>`;

async function loadSlots() {
  const id = ++loadId;
  form.elements.horario.value = '';
  form.elements.barbeiro.value = '';
  barbersBox.innerHTML = '';
  barberTitle.hidden = true;
  slots = [];
  if (!selectedServices.size || !dateInput.value) {
    timesBox.innerHTML = hint('Escolha o serviço e o dia.');
    return updateSummary();
  }
  timesBox.innerHTML = hint('Carregando...');
  const { data, error } = await sb.rpc('get_horarios', { p_data: dateInput.value, p_servicos: [...selectedServices] });
  if (id !== loadId) return;
  if (error) { timesBox.innerHTML = hint('Erro ao carregar horários.'); return; }
  slots = data;
  const hours = [...new Set(slots.map(s => s.hora.slice(0, 5)))];
  timesBox.innerHTML = hours.length ? '' : hint('Sem horários livres nesse dia.');
  hours.forEach(h => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'time-button';
    b.textContent = h;
    b.addEventListener('click', () => pickTime(h, b));
    timesBox.appendChild(b);
  });
  updateSummary();
}

function pickTime(h, btn) {
  timesBox.querySelectorAll('.time-button').forEach(i => i.classList.remove('selected'));
  btn.classList.add('selected');
  form.elements.horario.value = h;
  form.elements.barbeiro.value = '';
  barbersBox.innerHTML = '';
  barberTitle.hidden = false;
  const opts = slots.filter(s => s.hora.startsWith(h));
  opts.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'time-button';
    b.textContent = s.nome;
    b.addEventListener('click', () => pickBarber(s.barbeiro_id, b));
    barbersBox.appendChild(b);
  });
  if (opts.length === 1) barbersBox.firstChild.click();
  formMessage.textContent = '';
  updateSummary();
}

function pickBarber(id, btn) {
  barbersBox.querySelectorAll('.time-button').forEach(i => i.classList.remove('selected'));
  btn.classList.add('selected');
  form.elements.barbeiro.value = id;
  updateSummary();
}

dateInput.addEventListener('change', loadSlots);


function formatBRL(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function renderIcons() {
  if (window.lucide) lucide.createIcons();
}

function updateThemeIcon() {
  const icon = themeButton?.querySelector('i');
  if (icon) icon.setAttribute('data-lucide', root.classList.contains('light') ? 'moon' : 'sun');
  renderIcons();
}

if (localStorage.getItem('barber-theme') === 'light') root.classList.add('light');

themeButton?.addEventListener('click', () => {
  root.classList.toggle('light');
  localStorage.setItem('barber-theme', root.classList.contains('light') ? 'light' : 'dark');
  updateThemeIcon();
});

function toggleMenu() {
  const open = !sidebar?.classList.contains('open');
  sidebar?.classList.toggle('open', open);
  menuBackdrop?.classList.toggle('show', open);
}

function closeMenu() {
  sidebar?.classList.remove('open');
  menuBackdrop?.classList.remove('show');
}

menuButtons.forEach(button => button.addEventListener('click', toggleMenu));
menuBackdrop?.addEventListener('click', closeMenu);
document.querySelectorAll('.nav-link, .sidebar a[href^="#"]').forEach(link => link.addEventListener('click', closeMenu));
document.querySelector('[data-instagram-link]')?.addEventListener('click', event => {
  if (event.currentTarget.getAttribute('href') === '#') event.preventDefault();
});

function updateSummary() {
  const total = [...selectedServices].reduce((sum, item) => sum + prices[item], 0);
  const serviceNames = [...selectedServices].map(item => names[item]);

  if (serviceTotal) serviceTotal.textContent = formatBRL(total);
  if (serviceSummary) serviceSummary.textContent = serviceNames.length ? serviceNames.join(' + ') : 'Nenhum serviço selecionado';

  const sideServices = document.querySelector('[data-side-services]');
  const sideTotal = document.querySelector('[data-side-total]');
  const sideName = document.querySelector('[data-side-name]');
  const sideTime = document.querySelector('[data-side-time]');
  if (sideServices) sideServices.textContent = serviceNames.length ? serviceNames.join(' + ') : 'Nenhum selecionado';
  if (sideTotal) sideTotal.textContent = formatBRL(total);
  if (sideName) sideName.textContent = form?.elements.nome.value.trim() || 'Ainda não informado';
  if (sideTime) sideTime.textContent = form?.elements.horario.value ? `${dateInput.value.split('-').reverse().join('/')} ${form.elements.horario.value}` : 'Não escolhido';
  const sideBarber = document.querySelector('[data-side-barber]');
  if (sideBarber) sideBarber.textContent = barbersBox?.querySelector('.selected')?.textContent || 'Não escolhido';
  calculateStep();
}

document.querySelectorAll('[data-service]').forEach(card => {
  card.addEventListener('click', () => {
    const service = card.dataset.service;
    if (selectedServices.has(service)) {
      selectedServices.delete(service);
      card.classList.remove('selected');
    } else {
      selectedServices.add(service);
      card.classList.add('selected');
    }
    formMessage.textContent = '';
    updateSummary();
    loadSlots();
  });
});

form?.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', () => {
    input.classList.remove('invalid');
    if (formMessage) formMessage.textContent = '';
    updateSummary();
  });
});

function validateForm() {
  let valid = true;
  const name = form.elements.nome;
  const phone = form.elements.whatsapp;
  const time = form.elements.horario.value;

  [name, phone].forEach(input => input.classList.remove('invalid'));

  if (!selectedServices.size) {
    formMessage.textContent = 'Escolha pelo menos um serviço para continuar.';
    valid = false;
  }

  if (!dateInput.value || !time || !form.elements.barbeiro.value) {
    formMessage.textContent = 'Escolha dia, horário e barbeiro.';
    valid = false;
  }

  if (!name.value.trim()) {
    name.classList.add('invalid');
    formMessage.textContent = 'Informe seu nome.';
    valid = false;
  }

  if (!phone.value.trim() || phone.value.replace(/\D/g, '').length < 10) {
    phone.classList.add('invalid');
    formMessage.textContent = 'Informe um WhatsApp válido.';
    valid = false;
  }

  return valid;
}

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validateForm()) return;

  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  const { error } = await sb.rpc('criar_agendamento', {
    p_barbeiro: form.elements.barbeiro.value,
    p_data: dateInput.value,
    p_hora: form.elements.horario.value,
    p_servicos: [...selectedServices],
    p_nome: form.elements.nome.value.trim(),
    p_whatsapp: form.elements.whatsapp.value.trim()
  });
  btn.disabled = false;
  if (error) { formMessage.textContent = error.message; loadSlots(); return; }

  const bookingName = form.elements.nome.value.trim();
  const bookingTime = `${dateInput.value.split('-').reverse().join('/')} às ${form.elements.horario.value}`;

  document.querySelector('[data-booking-name]').textContent = bookingName;
  document.querySelector('[data-booking-time]').textContent = bookingTime;

  form.classList.add('hidden');
  document.querySelector('.booking-panel')?.classList.add('hidden');
  bookingSuccess?.classList.remove('hidden');

  currentStep = 3;
  updateSteps();
  bookingSuccess?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  renderIcons();
});

newBookingButton?.addEventListener('click', () => {
  selectedServices.clear();
  document.querySelectorAll('[data-service]').forEach(card => card.classList.remove('selected'));
  form?.reset();
  loadSlots();
  form?.classList.remove('hidden');
  document.querySelector('.booking-panel')?.classList.remove('hidden');
  bookingSuccess?.classList.add('hidden');
  formMessage.textContent = '';
  currentStep = 1;
  updateSummary();
  document.querySelector('#agendamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.nav-link')];

const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
}, { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.2, 0.5] });

sections.forEach(section => observer.observe(section));

updateSummary();
updateSteps();
updateThemeIcon();
renderIcons();
