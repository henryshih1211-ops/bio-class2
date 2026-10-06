import { activeCourses, weekDate } from './courses';
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
type Context={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function registerWeekTool(changeWeek:(week:number)=>void){
 const context=(document as Document&{modelContext?:Context}).modelContext;
 if(!context?.registerTool)return;
 const lifecycle=new AbortController();
 try{void Promise.resolve(context.registerTool({
 name:'show_teaching_week',title:'查看教学周课表',
 description:'切换生科2班当前可见的课表周次并返回该周已确定的课程。体育安排未确认，不包含在课程列表中。',
 inputSchema:{type:'object',properties:{week:{type:'integer',minimum:1,maximum:20}},required:['week'],additionalProperties:false},
 annotations:{readOnlyHint:false,untrustedContentHint:false},
 execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='week'))throw Error('请输入week字段。');const week=(input as {week:unknown}).week;if(typeof week!=='number'||!Number.isInteger(week)||week<1||week>20)throw Error('教学周必须为1至20的整数。');changeWeek(week);return {week,start:weekDate(week),courses:activeCourses(week),militaryTraining:week===2||week===3,pending:'体育的分班、周次及地点待确认'};}
 },{signal:lifecycle.signal})).catch(()=>console.warn('课表辅助接口暂不可用，仍可手动切换周次。'));}catch{console.warn('课表辅助接口暂不可用，仍可手动切换周次。');}
 return ()=>lifecycle.abort();
}
