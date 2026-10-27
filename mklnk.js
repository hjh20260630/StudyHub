// 生成 Windows .lnk 快捷方式（实现 MS-SHLLINK 最小格式）
const fs = require('fs');
const os = require('os');
const path = require('path');

const TARGET = 'D:\\learninglist-app\\studyhub\\dist\\StudyHub\\StudyHub-win_x64.exe';
const WORKDIR = 'D:\\learninglist-app\\studyhub\\dist\\StudyHub';
const RELPATH = 'StudyHub\\StudyHub-win_x64.exe';
const OUT = path.join(os.homedir(), 'Desktop', 'StudyHub.lnk');

// ---------- Header (0x4C bytes) ----------
const header = Buffer.alloc(0x4C);
header.writeUInt32LE(0x4C, 0);                                  // HeaderSize
header.write('00021401-0000-0000-C000-000000000046'.replace(/-/g, ''), 4); // 占位，下面按 GUID 真实布局写
// GUID 需要按混合端序写入，重写：
const guid = Buffer.from([
  0x01, 0x14, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46
]);
guid.copy(header, 4);
header.writeUInt32LE(0x0000009A, 20);   // LinkFlags: HasLinkInfo|HasRelativePath|HasWorkingDir|IsUnicode
header.writeUInt32LE(0x00000020, 24);   // FileAttributes: FILE_ATTRIBUTE_ARCHIVE
// 时间戳/文件大小/图标索引全部 0（offset 28..55）
header.writeUInt32LE(0, 56);            // IconIndex
header.writeUInt32LE(1, 60);            // ShowCommand: SW_SHOWNORMAL
header.writeUInt16LE(0, 64);            // HotKey
// Reserved 66..75 已是 0

// ---------- LinkInfo ----------
const label = '';
const volIDSize = 0x10 + Buffer.byteLength(label, 'ascii') + 1; // 0x10 头 + label + '\0'
const basePath = Buffer.from(TARGET, 'ascii');                  // 全 ASCII，安全
const suffix = Buffer.from('', 'ascii');
const localBasePathOffset = 0x28 + volIDSize;
const commonPathSuffixOffset = localBasePathOffset + basePath.length + 1;
const linkInfoSize = commonPathSuffixOffset + suffix.length + 1;

const linkInfo = Buffer.alloc(linkInfoSize);
let p = 0;
linkInfo.writeUInt32LE(linkInfoSize, p); p += 4;                // LinkInfoSize
linkInfo.writeUInt32LE(0x1C, p); p += 4;                        // LinkInfoHeaderSize
linkInfo.writeUInt32LE(0x01, p); p += 4;                        // Flags: VolumeIDAndLocalBasePath
// VolumeID
const volStart = p;
linkInfo.writeUInt32LE(volIDSize, p); p += 4;
linkInfo.writeUInt32LE(3, p); p += 4;                           // DriveType: DRIVE_FIXED
linkInfo.writeUInt32LE(0, p); p += 4;                           // Serial
linkInfo.writeUInt32LE(0x10, p); p += 4;                        // VolumeLabelOffset (相对 VolumeID 起点)
linkInfo.write(label + '\0', volStart + 0x10, 'ascii');         // label（空）
p = volStart + volIDSize;
linkInfo.writeUInt32LE(localBasePathOffset, p); p += 4;
linkInfo.writeUInt32LE(0, p); p += 4;                           // CommonNetworkRelativeLinkOffset
linkInfo.writeUInt32LE(commonPathSuffixOffset, p); p += 4;
basePath.copy(linkInfo, localBasePathOffset);
linkInfo.write('\0', localBasePathOffset + basePath.length, 'ascii');
linkInfo.write('\0', commonPathSuffixOffset, 'ascii');

// ---------- StringData（Unicode） ----------
function uniStr(s) {
  const buf = Buffer.alloc(2 + (s.length + 1) * 2);
  buf.writeUInt16LE(s.length + 1, 0); // 字符数，含结尾 null
  buf.write(s, 2, 'utf16le');
  return buf;
}
const relPathStr = uniStr(RELPATH);
const workDirStr = uniStr(WORKDIR);

// ---------- 组装 ----------
const terminal = Buffer.alloc(4);
const lnk = Buffer.concat([header, linkInfo, relPathStr, workDirStr, terminal]);
fs.writeFileSync(OUT, lnk);
console.log('written:', OUT, lnk.length, 'bytes');

// ---------- 校验 ----------
fs.accessSync(OUT);
console.log('target exists:', fs.existsSync(TARGET));
