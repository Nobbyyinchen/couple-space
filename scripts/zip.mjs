import fs from 'node:fs';
import path from 'node:path';

const table = Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function walkFiles(directory, prefix='') {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>{
    if(item.isSymbolicLink())return [];
    const relative=prefix?`${prefix}/${item.name}`:item.name;
    return item.isDirectory()?walkFiles(path.join(directory,item.name),relative):[relative];
  });
}
export function makeZip(directory, destination) {
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const files=walkFiles(directory);if(files.length>65535)throw Error('文件数量超过当前 ZIP 格式上限');
  const fd=fs.openSync(destination,'w'),entries=[];let offset=0;
  const write=buffer=>{fs.writeSync(fd,buffer);offset+=buffer.length;};
  try{
    for(const relative of files){
      const filename=path.join(directory,relative),size=fs.statSync(filename).size;
      if(size>0xffffffff||offset>0xffffffff)throw Error('归档超过 4GB，请分批导出');
      const name=Buffer.from(relative.replaceAll('\\','/'),'utf8'),start=offset;
      const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x808,6);header.writeUInt16LE(33,12);header.writeUInt16LE(name.length,26);
      write(header);write(name);
      const input=fs.openSync(filename,'r'),chunk=Buffer.alloc(1024*1024);let crc=0xffffffff;
      try{let count;while((count=fs.readSync(input,chunk,0,chunk.length,null))>0){for(let i=0;i<count;i++)crc=table[(crc^chunk[i])&255]^(crc>>>8);write(chunk.subarray(0,count));}}finally{fs.closeSync(input);}
      crc=(crc^0xffffffff)>>>0;
      const descriptor=Buffer.alloc(16);descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,4);descriptor.writeUInt32LE(size,8);descriptor.writeUInt32LE(size,12);write(descriptor);
      const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x808,8);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(size,20);central.writeUInt32LE(size,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(start,42);
      entries.push(Buffer.concat([central,name]));
    }
    const centralOffset=offset;for(const entry of entries)write(entry);
    const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(offset-centralOffset,12);end.writeUInt32LE(centralOffset,16);write(end);
  }catch(error){fs.closeSync(fd);fs.unlinkSync(destination);throw error;}
  fs.closeSync(fd);return destination;
}
