/* Local, conservative text extraction. Never executes pasted text or invents missing facts. */
(function(root){
 const aliases={gender:['性别','人物性别'],age:['年龄','年纪'],height:['身高'],identity:['身份','职业','身份 / 岛上职责','身份 / 职责'],type:['形象类型','人物类型','人物风格','气质','形象'],personality:['性格','性格特点'],body:['身材','身材体态','体型'],face:['脸型','面部识别','五官','脸型五官'],hair:['发型','发型方向','头发'],skin:['肤色','皮肤'],wardrobe:['服装','穿着','穿搭','穿搭方向','服装风格','服装方向'],constraints:['限制','禁忌','设计限制','负面提示词'],notes:['备注','补充说明','故事背景','时代背景','画风']};
 const lookup=new Map(Object.entries(aliases).flatMap(([key,names])=>[key,...names].map(name=>[name,key])));
 function parse(text){
  text=String(text||'').trim();if(!text)return {fields:{},warnings:['请先粘贴人物描述。']};if(text.length>20000)return {fields:{},warnings:['文字过长，请控制在 20000 字以内。']};
  const fields={},warnings=[],add=(key,value)=>{value=String(value||'').trim();if(value&&!['未知','待定','待补充','未说明'].includes(value)){const parts=(fields[key]||'').split('；');if(!parts.includes(value))fields[key]=fields[key]?fields[key]+'；'+value:value}};
  try{const data=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));const profile=data.profile||data;for(const [key,value] of Object.entries(profile)){const field=lookup.get(key);if(field&&typeof value==='string')add(field,value)}if(Object.keys(fields).length)return {fields,warnings}}catch{}
  const free=[];let current='';
  const labels=[...lookup.keys()].sort((a,b)=>b.length-a.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const prepared=text.replace(/\r/g,'').replace(new RegExp('[，,]\\s*(?=(?:'+labels+')[：:])','g'),'\n');
  for(const line of prepared.split(/\n|[；;](?![^（]*）)/)){
   const clean=line.trim().replace(/^(?:[-*#]+\s*|\d+[.、)）]\s*)/,'');
   const match=clean.match(/^(?:【([^】]+)】|([^:：]{1,22})[:：])\s*(.*)$/);
   if(match){const key=lookup.get((match[1]||match[2]).trim().replace(/（.*?）/g,''));if(key){current=key;add(key,match[3]);continue}}
   if(clean){current='';free.push(clean)}
  }
  const prose=free.join('；');
  // Keep negative instructions in constraints and out of positive attribute extraction.
  const clauses=prose.split(/[，,。；;\n]+/).map(x=>x.trim()).filter(Boolean),positive=[];
  for(const clause of clauses){if(/(?:不要|避免|禁止|不能|不得|不做|不穿|不戴|无配饰|无首饰)/.test(clause))add('constraints',clause);else positive.push(clause)}
  const affirmative=positive.join('，');
  const genders=[...new Set([...affirmative.matchAll(/女性|男性|女人|男人|女生|男生|少女|少年|女孩|男孩|女主|男主|成年女|成年男/g)].map(m=>/女/.test(m[0])?'女':'男'))];
  if(!fields.gender){if(genders.length===1)add('gender',genders[0]);else if(genders.length>1)warnings.push('同时出现男女描述，性别未自动填写，请确认当前角色形态。')}
  if(!fields.age){const ages=[...new Set([...affirmative.matchAll(/(?:约|大约)?\d{1,2}(?:\s*[-~～至到]\s*\d{1,2})?\s*岁/g)].map(m=>m[0]))];if(ages.length===1)add('age',ages[0]);else if(ages.length>1)warnings.push('出现多个年龄，请手动确认。')}
  if(!fields.height){const heights=[...new Set([...affirmative.matchAll(/\b(?:1\d{2}|2[0-2]\d)\s*(?:cm|厘米|公分)\b|\b1[.．]\d{1,2}\s*米|(?:1\d{2}|2[0-2]\d)\s*(?:厘米|公分)/gi)].map(m=>m[0]))];if(heights.length===1)add('height',heights[0]);else if(heights.length>1)warnings.push('出现多个身高，请手动确认。')}
  const rules={identity:/总裁|秘书|医生|护士|教师|老师|学生|明星|演员|歌手|千金|富家|警察|杀手|保镖|剑修|掌门|公主|皇后|将军/,personality:/性格|温柔|活泼|开朗|寡言|沉默|克制|自尊|任性|依赖|坚韧|果断|善良|冷静|腹黑|傲娇|自信|掌控/,type:/气质|御姐|甜妹|冷艳|酷飒|高冷|雍容|知性|成熟|可爱|清纯|性感|清冷|优雅|少年感/,body:/身材|体型|体态|高挑|纤细|丰满|丰腴|健美|匀称|肩|腰|臀|胸|腿长|娇小|肌肉/,face:/脸|五官|眉|眼|鼻|唇|下巴|下颌|颧骨|中庭/,hair:/发型|头发|长发|短发|卷发|直发|马尾|辫|刘海|盘发|丸子头|寸头/,skin:/肤色|皮肤|白皙|冷白|小麦色|古铜色/,wardrobe:/穿|服装|衣|裙|裤|衬衫|外套|西装|礼服|靴|鞋|袜|JK|洛丽塔|汉服|首饰|项链|耳环|耳饰|手链|发饰|配饰/i,notes:/现代|都市|古装|古代|修仙|仙侠|赛博|民国|写实|3D|二次元|国漫|画风/i};
  for(const clause of positive)for(const [key,pattern] of Object.entries(rules))if(pattern.test(clause))add(key,clause);
  if(!Object.keys(fields).length)warnings.push('没有可靠识别到字段。可使用下方提纲，或直接手动填写。');
  warnings.push('本机按明确字段和词语整理，不推断未写明的年龄、身高或真实职业；请检查预览。');
  return {fields,warnings};
 }
 const api={parse};if(typeof module==='object'&&module.exports)module.exports=api;else root.ProfileImport=api;
})(typeof window==='undefined'?globalThis:window);
