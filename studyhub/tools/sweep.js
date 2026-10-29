// 全量格式审查 v2
const s = require('fs').readFileSync('D:/learninglist-app/studyhub/resources/index.html','utf8');
const fnM = s.match(/function mathify\(escapedHtml\)\{[\s\S]*?\n\}/);
eval(fnM[0]);
const dataM = s.match(/const COURSE_DATA = \[([\s\S]*?)\n\];/);
const COURSE_DATA = eval('[' + dataM[1] + ']');
const dictM = s.match(/const CONCEPT_DETAILS = \{([\s\S]*?)\n\};/);
const DICT = eval('({' + dictM[1] + '})');
const esc = t => t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
let bad = 0, checked = 0;
function check(where, raw){
  checked++;
  const out = mathify(esc(raw));
  const issues = [];
  if(/&lt;\/?(sup|sub|i|mark|span|div)/i.test(out)) issues.push('标签被转义显示');
  if(/\^\{|_\{/.test(out)) issues.push('未转换的 ^{} 记号');
  if(/(^|[^<\/])sup>/.test(out)) issues.push('游离 sup>');
  const open = (out.match(/<sup>/g)||[]).length, close = (out.match(/<\/sup>/g)||[]).length;
  if(open !== close) issues.push('sup 不配对 ' + open + '/' + close);
  const o2 = (out.match(/<sub>/g)||[]).length, c2 = (out.match(/<\/sub>/g)||[]).length;
  if(o2 !== c2) issues.push('sub 不配对 ' + o2 + '/' + c2);
  if(/<i>[^<]*<(sup|sub|span)/.test(out)) issues.push('斜体嵌套异常');
  if(issues.length){ bad++; console.log('[' + where + '] ' + issues.join('; ')); console.log('  原: ' + raw.slice(0,80)); console.log('  出: ' + out.slice(0,150)); }
}
for(const c of COURSE_DATA) for(const ch of c.chapters) for(const l of ch.lessons){
  (l.blocks||[]).forEach((b,i)=>{
    const w = l.id+'#b'+i;
    if(b.x) check(w+'/p', b.x);
    if(b.title) check(w+'/title', b.title);
    if(b.items) b.items.forEach((it,k)=>check(w+'/list'+k, it));
    if(b.q) check(w+'/q', b.q);
    if(b.a) check(w+'/a', b.a);
  });
}
for(const [k,v] of Object.entries(DICT)) check('dict:'+k, v);
console.log('---- 共检查 ' + checked + ' 段文本，发现 ' + bad + ' 处问题 ----');
