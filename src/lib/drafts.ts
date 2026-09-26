export function validateDraft(value:unknown):value is {tailored_resume:string;cover_letter:string}{
 if(!value||typeof value!=='object')return false;
 const item=value as Record<string,unknown>;
 return typeof item.tailored_resume==='string'&&item.tailored_resume.length<=20000&&typeof item.cover_letter==='string'&&item.cover_letter.trim().length>0&&item.cover_letter.length<=10000;
}
