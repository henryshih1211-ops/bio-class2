import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, activeCourses, courseTime, winterPeriods } from '../lib/courses.ts';

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
  for (let week=1; week<=20; week++) {
    const occupied=new Set();
    for (const c of activeCourses(week)) {
      assert.ok(c.day>=1 && c.day<=7 && c.start>=1 && c.end<=10);
      for (let period=c.start; period<=c.end; period++) {
        const key=`${c.day}-${period}`;
        assert.ok(!occupied.has(key), `第${week}周 ${key}课程重叠`);
        occupied.add(key);
      }
    }
    assert.equal(activeCourses(week).some(c => c.name==='教师职业技能训练'), [8,10,12,16].includes(week));
  }
});
