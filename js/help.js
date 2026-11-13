let toastTimer;
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
 const text=document.getElementById(button.dataset.copy).textContent.trim(),notice=document.getElementById('copyToast');
 try{await navigator.clipboard.writeText(text);notice.textContent='已复制，粘贴到 Codex / WorkBuddy 即可';button.textContent='已复制';setTimeout(()=>button.textContent='复制指令',1800)}
 catch{const range=document.createRange();range.selectNodeContents(document.getElementById(button.dataset.copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);notice.textContent='已选中指令，请按 Ctrl+C 复制'}
 notice.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>notice.hidden=true,3000);
}));
