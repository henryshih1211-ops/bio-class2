import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, classCourses, availableClasses, isClassId, activeCourses, courseTime, winterPeriods } from '../lib/courses.ts';

test('冬季节次、五个课段和单节时间', () => {
  assert.equal(winterPeriods.length, 10);
  assert.deepEqual([1,3,5,7,9].map(n => courseTime(n,n+1)), ['08:00–09:40','10:00–11:40','14:00–15:40','16:00–17:40','19:00–20:40']);
  assert.equal(courseTime(5,5), '14:00–14:45');
});
test('二班原表周次与节次，英语保持独立课表', () => {
  assert.equal(courses.length, 27);
  const labor = courses.find(c => c.name === '劳动教育');
  assert.deepEqual([labor.day,labor.start,labor.end,labor.from,labor.to], [5,5,6,4,4]);
  assert.deepEqual(courses.find(c => c.name === '教师职业技能训练').weeks, [8,10,12,16]);
  const pe = courses.find(c => c.id === 'course-pe');
  assert.deepEqual([pe.day,pe.start,pe.end,pe.pending], [4,3,4,true]);
  assert.equal(activeCourses(5).some(c => c.name === '形势与政策(一)'), false);
  assert.equal(activeCourses(6).some(c => c.name === '形势与政策(一)'), true);
  assert.equal(activeCourses(5).some(c => c.name === '大学英语一（视听说）'), true);
  assert.equal(activeCourses(6).some(c => c.name === '大学英语一（视听说）'), false);
  assert.equal(activeCourses(6).some(c => c.name === '无机及分析化学' && c.start === 7), false);
});
test('20周无节次重叠或越界，训练只在指定四周', () => {
 for(const classId of [2,3]) {
  for (let week=1; week<=20; week++) {
    const occupied=new Set();
    for (const c of activeCourses(week,classId)) {
      assert.ok(c.day>=1 && c.day<=7 && c.start>=1 && c.end<=10);
      for (let period=c.start; period<=c.end; period++) {
        const key=`${c.day}-${period}`;
        assert.ok(!occupied.has(key), `第${week}周 ${key}课程重叠`);
        occupied.add(key);
      }
    }
    assert.equal(activeCourses(week,classId).some(c => c.name==='教师职业技能训练'), [8,10,12,16].includes(week));
  }
 }
});
test('仅开放二、三班，课程独立且三班周末课不丢失', () => {
  assert.deepEqual(availableClasses.map(c=>c.id),[2,3]);
  assert.equal(isClassId(1),false);assert.equal(isClassId(6),false);
  assert.equal(classCourses[3].length,28);
  const ai=classCourses[3].find(c=>c.day===2&&c.start===1);
  assert.deepEqual([ai.room,ai.teacher],['综合楼A702','程艳艳']);
  assert.equal(classCourses[2].find(c=>c.day===2&&c.start===1).room,'综合楼A701');
  const policy=classCourses[3].find(c=>c.name==='形势与政策(一)');
  assert.deepEqual([policy.room,policy.teacher],['人文楼403','孙少武']);
  const english=classCourses[3].filter(c=>c.name.startsWith('大学英语'));
  assert.ok(english.every(c=>c.room==='综合楼A404'&&c.teacher==='杜文娟'));
  const saturday=activeCourses(5,3).filter(c=>c.day===6);
  assert.deepEqual(saturday.map(c=>[c.name,c.start,c.end]),[['植物学实验',5,6],['植物学实验',7,8]]);
  assert.equal(activeCourses(4,3).some(c=>c.day===6),false);
  assert.equal(activeCourses(5,2).some(c=>c.day===6),false);
  assert.ok(!classCourses[2].some(c2=>classCourses[3].includes(c2)));
});
