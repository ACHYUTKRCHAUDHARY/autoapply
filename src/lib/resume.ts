export type ResumeKind='pdf'|'docx';
export function resumeKind(name:string,mime:string,size:number,header:Uint8Array):ResumeKind|undefined {
 if(size<1||size>5*1024*1024)return;
 const lower=name.toLowerCase();
 if((mime==='application/pdf'||(!mime&&lower.endsWith('.pdf')))&&lower.endsWith('.pdf')&&Buffer.from(header.subarray(0,5)).toString()==='%PDF-')return 'pdf';
 if((mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||(!mime&&lower.endsWith('.docx')))&&lower.endsWith('.docx')&&header[0]===0x50&&header[1]===0x4b)return 'docx';
}
