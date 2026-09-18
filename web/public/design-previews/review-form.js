/* Isolated design study. No API calls or persistence; all interaction stays in this page. */
const icons = {
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2-4.5-4.4 6.3-.9L12 3Z"/>',
  buy: '<path d="M7 10v11H3V10h4Zm0 0 4-8a3 3 0 0 1 3 3v4h5a2 2 0 0 1 2 2.5l-2 7A3 3 0 0 1 16 21H7"/>',
  neutral: '<path d="M5 12h14"/>',
  never: '<path d="M7 14V3H3v11h4Zm0 0 4 8a3 3 0 0 0 3-3v-4h5a2 2 0 0 0 2-2.5l-2-7A3 3 0 0 0 16 3H7"/>',
  camera: '<path d="M9 5 7 8H3v12h18V8h-4l-2-3H9Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  bag: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M4 12h16m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};
const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${extra}">${icons[name]}</svg>`;
const descriptions = {
  balanced: 'Основне — ліворуч, деталі покупки — праворуч. Усе видно одразу, кожен блок має своє місце.',
  compact: 'Одна компактна форма. Фото — у панелі під текстом, деталі покупки розкриваються за бажанням.',
  verdict: 'Спочатку головне: купиш знову? Три виразні картки вердикту задають характер усьому відгуку.',
};
const defaults = () => ({rating: 4, verdict: 'buy_again', visibility: 'public', body: '', store_name: '', city: '', price_paid: '', price_currency: 'UAH', photos: [], detailsOpen: false, closed: false});
const states = {balanced: defaults(), compact: defaults(), verdict: defaults()};
let concept = Object.hasOwn(descriptions, location.hash.slice(1)) ? location.hash.slice(1) : 'balanced';
const shell = document.querySelector('#reviews-shell');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ratingNames = ['Not for me', 'Could be better', 'It’s okay', 'Really good', 'Loved it'];

function rating() {
  const state = states[concept];
  return `<div class="rating-block"><span class="label" id="rating-label">Your rating</span><div class="rating-line"><div class="stars" role="radiogroup" aria-labelledby="rating-label">${[1,2,3,4,5].map(n => `<button type="button" class="star ${n <= state.rating ? 'is-on' : ''}" role="radio" aria-checked="${n === state.rating}" tabindex="${n === state.rating ? 0 : -1}" aria-label="${n} ${n === 1 ? 'star' : 'stars'}" data-rating="${n}">${icon('star')}</button>`).join('')}</div><p class="rating-caption"><strong>${state.rating}/5</strong><span> · ${ratingNames[state.rating-1]}</span></p></div></div>`;
}
function verdicts() {
  const choices = [['buy_again','buy','Buy again','Worth another try'],['neutral','neutral','Neutral','Still on the fence'],['never_again','never','Never again','Once was enough']];
  return `<fieldset class="verdict-field"><legend class="label">Would you buy it again?</legend><div class="verdict-options">${choices.map(([value, glyph, title, subtitle]) => `<button type="button" class="verdict-button" data-verdict="${value}" aria-pressed="${states[concept].verdict === value}">${concept === 'verdict' ? `<span class="choice-icon">${icon(glyph)}</span><span><span class="choice-title">${title}</span><span class="choice-subtitle">${subtitle}</span></span><span class="choice-check">${icon('check')}</span>` : `${icon(glyph)}<span>${title}</span>`}</button>`).join('')}</div></fieldset>`;
}
function writing(withLabel = true) {
  return `${withLabel ? '<label class="label" for="review-body">Your experience</label>' : ''}<textarea id="review-body" class="review-text" name="body" aria-label="Your experience" aria-describedby="body-hint" placeholder="How was it? Tell us what stood out…" minlength="3" required>${escape(states[concept].body)}</textarea><div class="text-hint"><span id="body-hint">A few honest words are all it takes.</span><span data-character-count>${states[concept].body.length} characters</span></div>`;
}
function purchaseFields() {
  const s = states[concept];
  return `<div class="purchase-fields"><label for="store-name">Store<input id="store-name" name="store_name" placeholder="e.g. Silpo" value="${escape(s.store_name)}"></label><label for="city">City<input id="city" name="city" placeholder="e.g. Kyiv" value="${escape(s.city)}"></label><div class="price-field"><label for="price-paid">Price paid</label><div class="price-control"><input id="price-paid" name="price_paid" inputmode="decimal" type="number" min="0" step="0.01" placeholder="0.00" value="${escape(s.price_paid)}"><select name="price_currency" aria-label="Currency">${['UAH','EUR','USD','KZT','GBP'].map(c => `<option ${s.price_currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><p class="price-note">The price you paid, wherever you shop.</p></div></div>`;
}
function photos() {
  return `<div class="photo-section"><button type="button" class="photo-action" data-add-photos>${icon('camera')} Add photos</button><span class="photo-caption">Optional · up to 5</span><input type="file" class="photo-input" accept="image/*" multiple aria-label="Choose review photos"><div class="photo-list">${states[concept].photos.map((photo, i) => `<div class="photo-item"><img src="${photo.url}" alt="Review photo ${i+1}"><button type="button" class="remove-photo" data-remove-photo="${i}" aria-label="Remove photo ${i+1}">${icon('close')}</button></div>`).join('')}</div></div>`;
}
function footer() {
  const isPrivate = states[concept].visibility === 'private';
  return `<footer class="form-footer"><div class="visibility"><span data-visibility-icon>${icon(isPrivate ? 'lock' : 'globe')}</span><div><label for="visibility">Who can see this?</label><select id="visibility" name="visibility"><option value="public" ${!isPrivate ? 'selected' : ''}>Public review</option><option value="private" ${isPrivate ? 'selected' : ''}>Only me</option></select><p class="visibility-copy">${isPrivate ? 'Only visible in your diary' : 'Share your taste with the community'}</p></div></div><button class="primary-button" type="submit">Save review ${icon('arrow')}</button></footer>`;
}
function render() {
  const s = states[concept];
  shell.className = `reviews-shell ${concept}`;
  const header = `<header class="reviews-header"><div><div class="reviews-title"><h2>Reviews</h2><span class="count">0</span></div><p>${concept === 'verdict' ? 'Good finds deserve to be remembered.' : 'A little note for your next shopping trip.'}</p></div><button class="quiet-button" type="button" data-toggle-form>${s.closed ? 'Write review' : `${icon('close')} Cancel`}</button></header>`;
  if (s.closed) {shell.innerHTML = header + '<div class="closed-state">Your next great find starts with a first impression.</div>'; bind(); return;}
  let layout;
  if (concept === 'balanced') {
    layout = `<div class="balanced-grid"><div class="writing-column">${rating()}${verdicts()}${writing()}${photos()}</div><aside class="side-panel"><h3>${icon('bag')} The little details</h3><p class="aside-description">Where you found it. What you paid.<br>All optional.</p>${purchaseFields()}</aside></div>`;
  } else if (concept === 'compact') {
    layout = `<div class="compact-top">${rating()}${verdicts()}</div><div class="writing-surface">${writing(false)}<div class="writing-toolbar">${photos()}</div></div><details class="purchase-disclosure" ${s.detailsOpen ? 'open' : ''}><summary>${icon('bag')} Add purchase details <span class="optional">Optional</span>${icon('chevron','chevron')}</summary>${purchaseFields()}</details>`;
  } else {
    layout = `<div class="verdict-intro"><h3>Would this make your basket again?</h3><p>Your verdict says a lot. Your story says the rest.</p></div>${verdicts()}<div class="verdict-writing">${rating()}<div>${writing()}${photos()}</div></div><div class="purchase-inline"><div class="purchase-heading">${icon('bag')} About your purchase <span class="optional">Optional</span></div>${purchaseFields()}</div>`;
  }
  shell.innerHTML = `${header}<form class="composer" novalidate><div class="form-main">${layout}</div><p class="form-message" role="status" aria-live="polite"></p>${footer()}</form>`;
  bind();
}
function setRating(value) {
  const s = states[concept];
  s.rating = value;
  shell.querySelectorAll('[data-rating]').forEach(button => {
    const n = Number(button.dataset.rating);
    button.classList.toggle('is-on', n <= value);
    button.setAttribute('aria-checked', String(n === value));
    button.tabIndex = n === value ? 0 : -1;
  });
  shell.querySelector('.rating-caption').innerHTML = `<strong>${value}/5</strong><span> · ${ratingNames[value-1]}</span>`;
}
function message(text, kind) {
  const el = shell.querySelector('.form-message');
  if (!el) return;
  el.textContent = text;
  el.className = `form-message ${kind}`;
}
function bind() {
  const s = states[concept];
  shell.querySelector('[data-toggle-form]').addEventListener('click', () => {
    s.closed = !s.closed;
    render();
    shell.querySelector('[data-toggle-form]').focus();
  });
  if (s.closed) return;
  shell.querySelectorAll('[data-rating]').forEach(button => {
    button.addEventListener('click', () => setRating(Number(button.dataset.rating)));
    button.addEventListener('keydown', event => {
      if (!['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 1 : event.key === 'End' ? 5 : ((s.rating - 1 + (['ArrowRight','ArrowUp'].includes(event.key) ? 1 : 4)) % 5) + 1;
      setRating(next);
      shell.querySelector(`[data-rating="${next}"]`).focus();
    });
  });
  shell.querySelectorAll('[data-verdict]').forEach(button => button.addEventListener('click', () => {
    s.verdict = button.dataset.verdict;
    shell.querySelectorAll('[data-verdict]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.verdict === s.verdict)));
  }));
  shell.querySelectorAll('[name]').forEach(input => input.addEventListener('input', () => {
    s[input.name] = input.value;
    message('', '');
    if (input.name === 'body') {
      shell.querySelector('[data-character-count]').textContent = `${input.value.length} characters`;
      input.removeAttribute('aria-invalid');
    }
    if (input.name === 'visibility') {
      shell.querySelector('[data-visibility-icon]').innerHTML = icon(input.value === 'private' ? 'lock' : 'globe');
      shell.querySelector('.visibility-copy').textContent = input.value === 'private' ? 'Only visible in your diary' : 'Share your taste with the community';
    }
  }));
  shell.querySelector('details')?.addEventListener('toggle', event => {s.detailsOpen = event.target.open;});
  shell.querySelector('[data-add-photos]').addEventListener('click', () => shell.querySelector('.photo-input').click());
  shell.querySelector('.photo-input').addEventListener('change', event => {
    const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
    const room = Math.max(0, 5 - s.photos.length);
    files.slice(0,room).forEach(file => s.photos.push({url: URL.createObjectURL(file)}));
    render();
    shell.querySelector('[data-add-photos]').focus();
    if (files.length > room) message('You can add up to 5 photos. Remove one to add another.', 'error');
  });
  shell.querySelectorAll('[data-remove-photo]').forEach(button => button.addEventListener('click', () => {
    const [removed] = s.photos.splice(Number(button.dataset.removePhoto), 1);
    URL.revokeObjectURL(removed.url);
    render();
    shell.querySelector('[data-add-photos]').focus();
  }));
  shell.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (s.body.trim().length < 3) {
      message('Add at least 3 characters about your experience.', 'error');
      const textarea = shell.querySelector('textarea');
      textarea.setAttribute('aria-invalid','true');
      textarea.focus();
      return;
    }
    const priceInput = shell.querySelector('[name="price_paid"]');
    if (!priceInput.checkValidity()) {
      if (shell.querySelector('details')) shell.querySelector('details').open = true;
      message('Enter a valid price, with up to 2 decimal places.', 'error');
      priceInput.focus();
      return;
    }
    message('Demo preview complete. Nothing was published or sent — this is a design mockup.', 'success');
  });
}
function chooseConcept(value, updateHash = true) {
  concept = value;
  document.querySelectorAll('[data-concept]').forEach(button => {
    const selected = button.dataset.concept === value;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('#concept-description').textContent = descriptions[value];
  document.querySelector('#concept-panel').setAttribute('aria-labelledby', `tab-${value}`);
  if (updateHash) history.replaceState(null, '', `#${value}`);
  render();
}
document.querySelectorAll('[data-concept]').forEach(button => {
  button.addEventListener('click', () => chooseConcept(button.dataset.concept));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const values = Object.keys(descriptions);
    const index = values.indexOf(concept);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    chooseConcept(values[next]);
    document.querySelector(`[data-concept="${values[next]}"]`).focus();
  });
});
document.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => {
  document.querySelector('#preview-frame').classList.toggle('mobile', button.dataset.device === 'mobile');
  document.querySelectorAll('[data-device]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}));
window.addEventListener('hashchange', () => {
  if (Object.hasOwn(descriptions, location.hash.slice(1))) chooseConcept(location.hash.slice(1), false);
});
chooseConcept(concept, false);
