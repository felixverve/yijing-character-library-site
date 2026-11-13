(function(root){
 'use strict';
 const positive=text=>String(text||'').replace(/(?:禁止|避免|不要|不得|不做|不能|不需要|不是)[^。；;\n]*/g,'');
 const genderValue=value=>({'女性':'女','男性':'男','女':'女','男':'男','儿童':'儿童'})[value]||'';
 function signals(text){return {female:/女性|女生|女孩|少女|女士|女主|千金|御姐|女总裁|\b(?:woman|female|girl)\b/i.test(text),male:/男性|男生|男孩|男士|男主|男人|公子|少爷|\b(?:man|male|boy)\b/i.test(text)}}
 function inferGender(text){const s=signals(positive(text));return s.female!==s.male?(s.female?'女':'男'):'通用'}
 function effective(item,overrides={}){const a=item.attributes||{},m=overrides[item.id]||{};return {...a,...m,age:{...a.age,...m.age},verification:{...a.verification,...m.verification}}}
 function verified(a,field){return a.verification?.verifiedFacets?.includes(field)&&/核验/.test(a.verification?.status||'')&&!/待|冲突/.test(a.verification?.status||'')}
 function gender(item,overrides={}){
  const a=effective(item,overrides),m=overrides[item.id]||{};
  if(genderValue(m.gender)&&m.gender!=='儿童')return genderValue(m.gender);
  if(verified(a,'gender')&&genderValue(a.gender))return genderValue(a.gender);
  if(item.roleMatchExcluded||a.roleMatchExcluded)return '通用';
  const attrs=genderValue(a.gender);if(attrs==='儿童'){const childGender=inferGender(item.promptText+' '+item.title);return childGender==='通用'?'儿童':childGender}if(attrs)return attrs;
  const explicit=(item.tags||[]).map(genderValue).filter(Boolean);if(new Set(explicit).size===1)return explicit[0];
  const fromPrompt=inferGender(item.promptText);if(fromPrompt!=='通用')return fromPrompt;
  return genderValue(item.gender)||inferGender(item.title);
 }
 function ageGroup(a){const n=Number(a.age?.explicitAge);if(n>0)return n<13?'儿童':n<18?'少年':'成年';const band=a.age?.ageBand||'';if(/儿童|幼儿|婴儿/.test(band))return '儿童';if(band==='少年')return '少年';if(/青年|成年|成熟|中年|老年/.test(band))return '成年';return '未知'}
 function constraints(role){const p=role.profile||{},age=Number((String(p.age||'').match(/\d{1,3}/)||[])[0]||0);
  // Relationship descriptions are not evidence about this person's gender.
  let g=genderValue(p.gender)||genderValue(role.gender)||inferGender(role.name);
  if(!g||g==='通用')g=inferGender(p.type);
  if(!g||g==='通用')g=inferGender(p.constraints);
  if(!g||g==='通用'){const declaration=String(role.requirements||'').match(/(?:^|[。；;\n])\s*(?:性别\s*[:：]\s*([男女])|(?:角色为|人物为|设定为)?\s*(?:成年|年轻)?([男女]性))/);if(declaration)g=inferGender(declaration[2]||declaration[1]+'性')}
  const group=p.ageGroup|| (age>0?(age<13?'儿童':age<18?'少年':'成年'):'未知');
  const negative=String(p.constraints||'')+'；'+String(role.requirements||'');const excluded=[];
  for(const match of negative.matchAll(/(?:不要|禁止|不得|不能|不穿|不戴|避免|不需要)([^。；;\n]+)/g))for(const token of ['长裤','短裤','短裙','长裙','裙装','西装','汉服','眼镜','帽子'])if(match[1].includes(token))excluded.push(token);
  return {gender:g||'通用',ageGroup:group,adult:group==='成年',excluded:[...new Set(excluded)]};
 }
 function passes(item,c,overrides={}){
  const a=effective(item,overrides),trusted=verified(a,'gender'),g=gender(item,overrides);
  if(!(item.assetTypes||a.assetTypes||[]).includes('人物'))return false;
  if((item.roleMatchExcluded||a.roleMatchExcluded)&&!trusted)return false;
  if(c.gender!=='通用'&&g!==c.gender)return false;
  if(!trusted){const promptSignals=signals(positive(item.promptText));if(promptSignals.female&&promptSignals.male)return false;if(g==='女'&&promptSignals.male||g==='男'&&promptSignals.female)return false;}
  const ag=ageGroup(a)==='未知'&&(a.gender==='儿童'||item.gender==='儿童')?'儿童':ageGroup(a),wanted=c.ageGroup||(c.adult?'成年':'未知');
  if(wanted==='成年'&&(ag==='儿童'||ag==='少年'||g==='儿童'))return false;
  if((wanted==='儿童'||wanted==='少年')&&ag!==wanted)return false;
  const clothing=[...(a.garments||[]),...(a.accessories||[]),...(a.clothingStyles||[])].join(' ');
  if((c.excluded||[]).some(word=>clothing.includes(word)))return false;
  return true;
 }
 function document(item){const a=item.attributes||{};return [item.title,...(item.tags||[]),...(item.styleCategories||[]),...[a.bodyTypes,a.faceFeatures,a.hair,a.clothingStyles,a.garments,a.accessories,a.visualMood].flatMap(v=>v||[]),positive(item.promptText),...(item.promptVariants||[]).map(v=>positive(v.text))].filter(Boolean).join(' ')}
 function matchRole(role){return role}
 function readiness(role){
  const p=role.profile||{},description=[p.type,p.personality,p.body,p.face,p.hair,p.wardrobe,role.requirements].map(v=>String(v||'').trim()).filter(v=>v&&!/^(待确认|待补充|待设计|未知)$/.test(v)).join('；');
  const meaningful=positive(description).replace(/成年|少年|儿童|女性|男性|女生|男生|女孩|男孩|人物|角色|\d+岁|[男女\s；;，,。]/g,'');
  const missing=[];if(!['男','女'].includes(constraints(role).gender))missing.push('性别');if(meaningful.length<2)missing.push('造型描述');
  return {ready:!missing.length,missing,description,gender:constraints(role).gender};
 }
 const api={positive,effective,gender,ageGroup,constraints,passes,document,matchRole,readiness};root.Retrieval=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
