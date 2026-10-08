export type Course = {id:string;name:string;day:number;start:number;end:number;from:number;to:number;room:string;teacher:string;odd:boolean;weeks?:number[];kind:string;pending?:boolean};
type Row = [string,number,number,number,number,number,string,string,boolean?,number[]?];
// 廊坊师范学院冬季作息：10月1日至次年4月30日。
export const winterPeriods = [
  ['08:00', '08:45'], ['08:55', '09:40'],
  ['10:00', '10:45'], ['10:55', '11:40'],
  ['14:00', '14:45'], ['14:55', '15:40'],
  ['16:00', '16:45'], ['16:55', '17:40'],
  ['19:00', '19:45'], ['19:55', '20:40'],
] as const;
export function courseTime(start:number,end:number){
  const first = winterPeriods[start - 1];
  const last = winterPeriods[end - 1];
  return first && last ? `${first[0]}–${last[1]}` : '';
}
const rows: Row[] = [
['国家安全教育',1,1,2,4,11,'笃行楼1教室','刘娟'],
['有机化学',1,1,2,13,16,'综合楼A314','李美茹'],
['人工智能导论与大模型应用',2,1,2,4,19,'综合楼A701','吴欣明'],
['高等数学',3,1,2,4,11,'笃行楼6教室','刘军丽'],
['有机化学',4,1,2,4,19,'人文楼101','李美茹'],
['高等数学',5,1,2,4,19,'笃行楼6教室','刘军丽'],
['植物学(一)*',1,3,4,4,19,'综合楼A314','杜立新'],
['动物学(一)*',2,3,4,4,19,'综合楼A302','李晓燕'],
['思想道德与法治',3,3,4,4,19,'人文楼303','孙崇梅'],
['大学英语一（读写）',5,3,4,4,19,'综合楼A303','丛伟丽'],
['无机及分析化学',2,5,6,4,19,'笃行楼6教室','褚卓栋'],
['应用文写作',4,5,6,4,19,'笃行楼11教室','张亚南'],
['劳动教育',5,5,6,4,4,'笃行楼6教室','林童'],
['教师职业技能训练',5,5,6,8,16,'教师职业能力训练中心（109、111、113、114、115、116、117、119、121、123、205、206、207、208、209，按分组通知）','时晓雨',false,[8,10,12,16]],
['人工智能导论与大模型应用',1,7,8,4,11,'笃行楼7教室','吴欣明'],
['思想道德与法治',1,7,8,12,15,'人文楼303','孙崇梅'],
['思想道德与法治',1,7,8,16,19,'人文楼303','孙崇梅'],
['中国共产党历史',2,7,8,4,11,'人文楼101','张志红'],
['大学英语一（视听说）',3,7,8,4,19,'综合楼A303','丛伟丽',true],
['无机及分析化学',4,7,8,5,19,'笃行楼6教室','褚卓栋',true],
['职业生涯规划指导（一）——学业规划',5,7,8,5,8,'笃行楼6教室','宋胜云'],
['军事理论',1,9,10,4,19,'笃行楼5教室','刘贺'],
['无机及分析化学',2,9,10,5,19,'生化实验室（二）','褚卓栋'],
['形势与政策(一)',3,9,10,6,9,'人文楼401','毛志鹏'],
['动物学实验',4,9,10,5,19,'动物实验室','李晓燕'],
['植物学实验',5,9,10,5,19,'植物学实验室','杜立新'],
];
export const courses:Course[]=rows.map((r,i)=>({id:'course-'+(i+1),name:r[0],day:r[1],start:r[2],end:r[3],from:r[4],to:r[5],room:r[6],teacher:r[7],odd:!!r[8],weeks:r[9],kind:/实验/.test(r[6])?'lab':/动物|植物|化学|数学/.test(r[0])?'science':'general'}));
// 原表只给出了体育板块的节次。第4—19周展示为待确认占位，不代表已确认的开课周次。
courses.push({id:'course-pe',name:'大学体育',day:4,start:3,end:4,from:4,to:19,room:'分班、地点待确认',teacher:'教师待确认',odd:false,kind:'sport',pending:true});
export const activeCourses=(week:number)=>courses.filter(c=>(c.weeks?c.weeks.includes(week):week>=c.from&&week<=c.to&&(!c.odd||week%2===1))).sort((a,b)=>a.day-b.day||a.start-b.start);
export function weekDate(week:number,day=0){const date=new Date(Date.UTC(2026,8,7+(week-1)*7+day));return (date.getUTCMonth()+1)+'月'+date.getUTCDate()+'日';}
export function currentWeek(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const part=(t:string)=>parts.find(p=>p.type===t)!.value;return Math.max(1,Math.min(20,Math.floor((Date.UTC(+part('year'),+part('month')-1,+part('day'))-Date.UTC(2026,8,7))/604800000)+1));}
