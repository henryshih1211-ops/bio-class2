import { activeCourses, weekDate, courseTime, isClassId, type ClassId } from './courses';
type Tool={name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
type Context={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
export function registerWeekTool(changeWeek:(week:number,classId:ClassId)=>void,selectedClass:ClassId=2){
 const context=(document as Document&{modelContext?:Context}).modelContext;
 if(!context?.registerTool)return;
 const lifecycle=new AbortController();
 try{void Promise.resolve(context.registerTool({
 name:'show_teaching_week',title:'查看教学周课表',
 description:'切换生科2班或3班的教学周课表。省略classId时沿用当前班级；体育板块以pending标记待确认。',
 inputSchema:{type:'object',properties:{week:{type:'integer',minimum:1,maximum:20},classId:{type:'integer',enum:[2,3]}},required:['week'],additionalProperties:false},
 annotations:{readOnlyHint:false,untrustedContentHint:false},
 execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='week'&&k!=='classId'))throw Error('请输入week，可选classId。');const {week,classId=selectedClass}=input as {week:unknown;classId?:unknown};if(typeof week!=='number'||!Number.isInteger(week)||week<1||week>20)throw Error('教学周必须为1至20的整数。');if(!isClassId(classId))throw Error('目前仅开放2班和3班。');changeWeek(week,classId);return {week,classId,start:weekDate(week),schedule:'冬季作息',courses:activeCourses(week,classId).map(c=>({...c,time:courseTime(c.start,c.end)})),militaryTraining:week===2||week===3,pending:'体育的分班、周次及地点待确认'};}
 },{signal:lifecycle.signal})).catch(()=>console.warn('课表辅助接口暂不可用，仍可手动切换周次。'));}catch{console.warn('课表辅助接口暂不可用，仍可手动切换周次。');}
 return ()=>lifecycle.abort();
}
