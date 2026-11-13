let manifest,vectors,extractor;let manifestURL;
self.onmessage=async({data})=>{
 const {id,query}=data;
 try{
  if(!manifest){
   const configResponse=await fetch('../data/semantic-config.json',{cache:'no-cache'});
   const config=configResponse.ok?await configResponse.json():{provider:'browser',manifest:'../data/semantic/manifest.json'};
   manifestURL=new URL(config.manifest||'../data/semantic/manifest.json',self.location.href);
   const res=await fetch(manifestURL,{cache:'no-cache'});if(!res.ok)throw Error('语义索引尚未发布');manifest=await res.json();
   const binary=await fetch(new URL(manifest.vectorFile,manifestURL));if(!binary.ok)throw Error('语义向量文件缺失');const buffer=await binary.arrayBuffer();if(buffer.byteLength!==manifest.count*manifest.dimensions*4)throw Error('向量索引尺寸不匹配');vectors=new Float32Array(buffer);
  }
  let queryVector;
  if(manifest.provider==='cloudflare'){
   self.postMessage({id,status:'正在进行云端语义匹配，无需下载模型…'});
   const response=await fetch(manifest.queryEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query.slice(0,1200)}),signal:AbortSignal.timeout(60000)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'云端检索失败');
   if(data.model!==manifest.model||data.indexVersion!==manifest.indexVersion||data.dimensions!==manifest.dimensions)throw Error('云端查询模型与素材索引不一致');
   queryVector=data.vectors?.[0];if(!Array.isArray(queryVector)||queryVector.length!==manifest.dimensions||queryVector.some(n=>!Number.isFinite(n)))throw Error('云端返回无效向量');
  }else{
   if(!extractor){self.postMessage({id,status:'首次加载中文语义模型，下载后浏览器会缓存'});const {pipeline}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');extractor=await pipeline('feature-extraction',manifest.model,{dtype:manifest.dtype,revision:manifest.revision})}
   const result=await extractor('query: '+query,{pooling:'mean',normalize:true});if(result.data.length!==manifest.dimensions)throw Error('查询模型与索引不一致');queryVector=result.data;
  }
  const scores=manifest.entries.map((entry,row)=>{let score=0;for(let j=0;j<manifest.dimensions;j++)score+=vectors[row*manifest.dimensions+j]*queryVector[j];return {id:entry.id,hash:entry.hash,score}});
  self.postMessage({id,scores});
 }catch(error){self.postMessage({id,error:error.message||String(error)})}
};
