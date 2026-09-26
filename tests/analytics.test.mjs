import test from 'node:test';
import assert from 'node:assert/strict';
import { analytics } from '../src/lib/analytics.ts';
test('empty data never divides by zero',()=>{assert.deepEqual(analytics([],new Set()),{total:0,score:[],jobType:[],location:[]})});
test('pending and rejected drafts do not dilute submitted interview rates',()=>{
 const rows=[
  {id:'a',status:'pending_review',submitted_at:null,matches:{score:95},jobs:{job_type:'remote',location:'Delhi'}},
  {id:'b',status:'submitted',submitted_at:'2026-01-01',matches:{score:88},jobs:{job_type:'remote',location:'Delhi'}},
  {id:'c',status:'rejected',submitted_at:'2026-01-01',matches:{score:75},jobs:{job_type:'onsite',location:'Noida'}},
  {id:'d',status:'viewed',submitted_at:'2026-01-01',matches:{score:88},jobs:{job_type:'remote',location:'Delhi'}}
 ];
 const result=analytics(rows,new Set(['b']));
 assert.equal(result.total,3);assert.deepEqual(result.score.find(x=>x.name==='80–89'),{name:'80–89',total:2,responses:2,interviews:1,rate:100,interviewRate:50});
 assert.equal(result.jobType.find(x=>x.name==='onsite').rate,0);
});
test('missing score and location are grouped without crashing',()=>{const result=analytics([{id:'x',status:'interview',submitted_at:null,matches:null,jobs:null}],new Set());assert.equal(result.score[0].name,'Unknown');assert.equal(result.location[0].interviewRate,100)});
