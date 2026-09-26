export type ResumeKind='pdf'|'docx';
export const MAX_RESUME_BYTES=5*1024*1024;
export function resumePath(userId:string,path:unknown):path is string {
 return typeof path==='string'&&new RegExp(`^${userId}/[0-9a-f-]{36}\\.(pdf|docx)$`,'i').test(path);
}
export function resumeKind(name:string,mime:string,size:number,header:Uint8Array):ResumeKind|undefined {
 if(size<1||size>MAX_RESUME_BYTES)return;
 const lower=name.toLowerCase();
 if((mime==='application/pdf'||(!mime&&lower.endsWith('.pdf')))&&lower.endsWith('.pdf')&&new TextDecoder().decode(header.subarray(0,5))==='%PDF-')return 'pdf';
 if((mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||(!mime&&lower.endsWith('.docx')))&&lower.endsWith('.docx')&&header[0]===0x50&&header[1]===0x4b)return 'docx';
}
