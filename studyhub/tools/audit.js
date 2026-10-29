// 审计：找出数据文本里所有「字母紧跟数字」的平铺写法（应为下标）
const s = require('fs').readFileSync('D:/learninglist-app/studyhub/resources/index.html','utf8');
const dataM = s.match(/const COURSE_DATA = \[([\s\S]*?)\n\];/);
const COURSE_DATA = eval('[' + dataM[1] + ']');
const dictM = s.match(/const CONCEPT_DETAILS = \{([\s\S]*?)\n\};/);
const DICT = eval('({' + dictM[1] + '})');

const texts = [];
for(const c of COURSE_DATA) for(const ch of c.chapters) for(const l of ch.lessons){
  (l.blocks||[]).forEach((b,i)=>{
    const w = l.id+'#b'+i;
    if(b.x) texts.push([w, b.x]);
    if(b.title) texts.push([w+'/title', b.title]);
    if(b.items) b.items.forEach((it,k)=>texts.push([w+'/list'+k, it]));
    if(b.q) texts.push([w+'/q', b.q]);
    if(b.a) texts.push([w+'/a', b.a]);
  });
}
for(const [k,v] of Object.entries(DICT)) texts.push(['dict:'+k, v]);

let n = 0;
for(const [w, t] of texts){
  // 排除已是 ^{} / _{} / unicode 上下标的：找裸的 字母+数字
  const re = /[A-Za-z][0-9]+/g;
  let m;
  while((m = re.exec(t))){
    const before = t.slice(Math.max(0, m.index-12), m.index);
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 10);
    // 排除代码块标记、BV号、日期、id 类（上下文含中文的才算数学文本——这里全部都是中文语境，直接列出由人审）
    console.log(`[${w}] …${before}【${m[0]}】${after}…`);
    n++;
  }
}
console.log('---- 共', n, '处 ----');
