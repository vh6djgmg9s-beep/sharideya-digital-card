const status = document.querySelector('#status');
const shareButton = document.querySelector('#share');
const canonical = document.querySelector('link[rel="canonical"]');
const shareUrl = canonical?.href || location.origin + location.pathname;
const manual = document.querySelector('#manual-copy');
const input = document.querySelector('#card-url');
async function copyLink() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(shareUrl);
    status.textContent = 'Ссылка скопирована. Отправьте её близким!';
  } catch {
    input.value = shareUrl;
    manual.hidden = false;
    input.focus();
    input.select();
    status.textContent = 'Выделите и скопируйте ссылку вручную.';
  }
}
shareButton.addEventListener('click', async () => {
  shareButton.disabled = true;
  status.textContent = '';
  try {
    if (navigator.share) {
      try {
        await navigator.share({title:'SHARIDEYA · Воздушные шары в Астане',text:'Сохраним немного праздника ✧',url:shareUrl});
        status.textContent = 'Визитка передана в меню «Поделиться».';
      } catch (error) {
        if (error.name !== 'AbortError') await copyLink();
      }
    } else await copyLink();
  } finally { shareButton.disabled = false; }
});
document.querySelector('#select-url').addEventListener('click', () => { input.focus(); input.select(); });
