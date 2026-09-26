import test from 'node:test';
import assert from 'node:assert/strict';
import {parseJobLink,portalName} from '../src/lib/portals.ts';
test('only direct HTTPS job links are saved',()=>{
 assert.equal(parseJobLink('https://www.linkedin.com/jobs/view/123#tracking'),'https://www.linkedin.com/jobs/view/123');
 for(const value of ['javascript:alert(1)','http://indeed.com/job','https://user:pass@linkedin.com/jobs','https://localhost/jobs','https://127.0.0.1/job','/jobs','https://[::1]/job'])
  assert.equal(parseJobLink(value),null);
});
test('portal labels require exact hostname or subdomain',()=>{
 const domains=[['myworkmyday.com','MyWorkMyDay'],['level.ph','Level'],['www.naukri.com','Naukri'],['in.indeed.com','Indeed'],['careers.oracle.com','Oracle Careers'],['foo.oraclecloud.com','Oracle Recruiting'],['www.linkedin.com','LinkedIn'],['internshala.com','Internshala']];
 for(const [host,label] of domains)assert.equal(portalName('https://'+host+'/job'),label);
 assert.equal(portalName('https://linkedin.com.attacker.example/job'),'Employer site');
 assert.equal(portalName('https://example.com/redirect?to=naukri.com'),'Employer site');
});
