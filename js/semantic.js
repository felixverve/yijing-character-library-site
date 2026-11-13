(function(){
 let worker,sequence=0;const pending=new Map();
 const abortError=()=>new DOMException('匹配已取消','AbortError');
 function finish(id,error,scores){const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);p.signal?.removeEventListener('abort',p.abort);error?p.reject(error):p.resolve(scores)}
 window.SemanticSearch={async search(query,onStatus,{signal}={}){
  if(signal?.aborted)throw abortError();
  if(!worker){
   worker=new Worker(new URL('semantic-worker.js?v=20261113-match-state-1',document.currentScript?.src||new URL('js/semantic.js',location.href)));
   worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;if(data.status){p.onStatus?.(data.status);return}finish(data.id,data.error?Error(data.error):null,data.scores)};
   worker.onerror=()=>{for(const id of [...pending.keys()])finish(id,Error('语义检索未能加载，请检查网络后重试'));worker.terminate();worker=null};
  }
  const id=++sequence;return new Promise((resolve,reject)=>{
   const abort=()=>{worker?.postMessage({id,cancel:true});finish(id,abortError())};
   const timer=setTimeout(()=>{worker?.postMessage({id,cancel:true});finish(id,Error('匹配等待超时，请稍后重试'))},90000);
   pending.set(id,{resolve,reject,onStatus,signal,abort,timer});signal?.addEventListener('abort',abort,{once:true});worker.postMessage({id,query});
  });
 }};
})();
