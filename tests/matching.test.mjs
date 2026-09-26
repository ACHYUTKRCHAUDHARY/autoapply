import test from 'node:test';import assert from 'node:assert/strict';import {needsWork} from '../src/lib/matching.ts';
test('unscored jobs are selected even when earlier pages are already processed',()=>{
 const seen=new Map(Array.from({length:50},(_,i)=>[`job-${i}`,{id:`m-${i}`,job_id:`job-${i}`,score:40}]));
 const drafted=new Set();assert.equal(needsWork('job-0',seen,drafted),false);assert.equal(needsWork('job-50',seen,drafted),true);
});
test('high match without draft is retried after interrupted generation',()=>{
 const match=new Map([['job',{id:'match',job_id:'job',score:82}]]);
 assert.equal(needsWork('job',match,new Set()),true);assert.equal(needsWork('job',match,new Set(['job'])),false);
});
test('low match never enters draft generation',()=>assert.equal(needsWork('job',new Map([['job',{id:'m',job_id:'job',score:69}]]),new Set()),false));
