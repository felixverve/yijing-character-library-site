(function(){
 let worker,sequence=0;const pending=new Map();
 window.SemanticSearch={async search(query,onStatus){
  if(!worker){worker=new Worker(new URL('semantic-worker.js?v=cloudflare-1',document.currentScript?.src||new URL('js/semantic.js',location.href)));worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;if(data.status){p.onStatus?.(data.status);return}pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.scores)};worker.onerror=()=>{for(const p of pending.values())p.reject(Error('语义模型未能加载，请检查网络后重试'));pending.clear();worker.terminate();worker=null}}
  const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,onStatus});worker.postMessage({id,query})});
 }};
})();
