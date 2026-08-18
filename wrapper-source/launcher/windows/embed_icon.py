from pathlib import Path
import argparse, struct

def align(n,a=4): return (n+a-1)//a*a

def parse_ico(path):
    b=Path(path).read_bytes()
    reserved,typ,count=struct.unpack_from('<HHH',b,0)
    if reserved!=0 or typ!=1 or count<1: raise ValueError('invalid ico')
    imgs=[]
    for i in range(count):
        off=6+i*16
        w,h,cc,res,planes,bpp,size,img_off=struct.unpack_from('<BBBBHHII',b,off)
        imgs.append({'w':w,'h':h,'cc':cc,'res':res,'planes':planes,'bpp':bpp,'size':size,'data':b[img_off:img_off+size]})
    return imgs

def _u16z(text): return str(text).encode('utf-16le')+b'\0\0'

def _block(key, value=b'', value_length=0, value_type=1, children=()):
    out=bytearray(b'\0'*6); out+=_u16z(key)
    out+=b'\0'*(align(len(out),4)-len(out))
    out+=value
    out+=b'\0'*(align(len(out),4)-len(out))
    for child in children:
        out+=b'\0'*(align(len(out),4)-len(out)); out+=child
    struct.pack_into('<HHH',out,0,len(out),value_length,value_type)
    return bytes(out)

def _string(key,value):
    raw=_u16z(value)
    return _block(key,raw,len(str(value))+1,1)

def build_version_info(file_version='0.4.0.0', product_version='Beta 0.4', original_filename='Dicebound_Beta_0_4.exe'):
    nums=[]
    for part in str(file_version).split('.'):
        try: nums.append(max(0,min(65535,int(part))))
        except ValueError: nums.append(0)
    nums=(nums+[0,0,0,0])[:4]
    ms=(nums[0]<<16)|nums[1]; ls=(nums[2]<<16)|nums[3]
    fixed=struct.pack('<13I',
        0xFEEF04BD,0x00010000,ms,ls,ms,ls,0x3F,0,
        0x00040004, # VOS_NT_WINDOWS32
        0x00000001, # VFT_APP
        0,0,0)
    strings={
        'CompanyName':'Dicebound',
        'FileDescription':'Dicebound',
        'FileVersion':file_version,
        'InternalName':'Dicebound',
        'LegalCopyright':'Copyright © 2026',
        'OriginalFilename':original_filename,
        'ProductName':'Dicebound',
        'ProductVersion':product_version,
        'Comments':'Dicebound native WebView2 Windows game',
    }
    string_table=_block('040904B0',children=[_string(k,v) for k,v in strings.items()])
    string_file_info=_block('StringFileInfo',children=[string_table])
    translation=_block('Translation',struct.pack('<HH',0x0409,1200),4,0)
    var_file_info=_block('VarFileInfo',children=[translation])
    return _block('VS_VERSION_INFO',fixed,len(fixed),0,[string_file_info,var_file_info])

def build_rsrc(imgs, section_rva, version_blob):
    n=len(imgs)
    root_off=0
    cursor=16+3*8
    type3_off=cursor; cursor+=16+n*8
    icon_id_dirs=[]
    for _ in imgs: icon_id_dirs.append(cursor);cursor+=16+8
    type14_off=cursor;cursor+=16+8
    group_id_dir=cursor;cursor+=16+8
    type16_off=cursor;cursor+=16+8
    version_id_dir=cursor;cursor+=16+8
    data_entries=[]
    for _ in range(n+2): data_entries.append(cursor);cursor+=16
    cursor=align(cursor,4)

    group=bytearray(struct.pack('<HHH',0,1,n))
    for idx,img in enumerate(imgs,1):
        group+=struct.pack('<BBBBHHIH',img['w'],img['h'],img['cc'],img['res'],img['planes'],img['bpp'],img['size'],idx)

    raw_offsets=[]
    for img in imgs:
        raw_offsets.append(cursor);cursor+=len(img['data']);cursor=align(cursor,4)
    group_raw=cursor;cursor+=len(group);cursor=align(cursor,4)
    version_raw=cursor;cursor+=len(version_blob);cursor=align(cursor,4)
    out=bytearray(cursor)

    def dir_header(off,idcount): struct.pack_into('<IIHHHH',out,off,0,0,0,0,0,idcount)
    def entry(off,nameid,target,isdir): struct.pack_into('<II',out,off,nameid,(target | (0x80000000 if isdir else 0)))

    dir_header(root_off,3)
    entry(root_off+16,3,type3_off,True)
    entry(root_off+24,14,type14_off,True)
    entry(root_off+32,16,type16_off,True)

    dir_header(type3_off,n)
    for i,d in enumerate(icon_id_dirs,1): entry(type3_off+16+(i-1)*8,i,d,True)
    for i,d in enumerate(icon_id_dirs):
        dir_header(d,1);entry(d+16,1033,data_entries[i],False)

    dir_header(type14_off,1);entry(type14_off+16,1,group_id_dir,True)
    dir_header(group_id_dir,1);entry(group_id_dir+16,1033,data_entries[n],False)

    dir_header(type16_off,1);entry(type16_off+16,1,version_id_dir,True)
    dir_header(version_id_dir,1);entry(version_id_dir+16,1033,data_entries[n+1],False)

    for i,img in enumerate(imgs): struct.pack_into('<IIII',out,data_entries[i],section_rva+raw_offsets[i],len(img['data']),0,0)
    struct.pack_into('<IIII',out,data_entries[n],section_rva+group_raw,len(group),0,0)
    struct.pack_into('<IIII',out,data_entries[n+1],section_rva+version_raw,len(version_blob),1200,0)

    for off,img in zip(raw_offsets,imgs): out[off:off+len(img['data'])]=img['data']
    out[group_raw:group_raw+len(group)]=group
    out[version_raw:version_raw+len(version_blob)]=version_blob
    return bytes(out)

def patch(exe,ico,outpath,file_version='0.4.0.0',product_version='Beta 0.4',original_filename=None):
    b=bytearray(Path(exe).read_bytes()); imgs=parse_ico(ico)
    original_filename=original_filename or Path(outpath).name
    version_blob=build_version_info(file_version,product_version,original_filename)
    pe=struct.unpack_from('<I',b,0x3c)[0]
    if b[pe:pe+4]!=b'PE\0\0': raise ValueError('not PE')
    coff=pe+4; nsec=struct.unpack_from('<H',b,coff+2)[0]; opt_size=struct.unpack_from('<H',b,coff+16)[0]; opt=coff+20
    magic=struct.unpack_from('<H',b,opt)[0]
    if magic!=0x20b: raise ValueError(f'need PE32+, got {magic:x}')
    sec_align=struct.unpack_from('<I',b,opt+32)[0]; file_align=struct.unpack_from('<I',b,opt+36)[0]; size_headers=struct.unpack_from('<I',b,opt+60)[0]
    sec_table=opt+opt_size; new_hdr=sec_table+nsec*40
    if new_hdr+40>size_headers: raise ValueError('no section-header room')
    max_end=0
    for i in range(nsec):
        s=sec_table+i*40; vs,va,rawsz=struct.unpack_from('<III',b,s+8)
        max_end=max(max_end,va+max(vs,rawsz))
    new_rva=align(max_end,sec_align)
    blob=build_rsrc(imgs,new_rva,version_blob)
    raw_ptr=align(len(b),file_align); raw_size=align(len(blob),file_align)
    if len(b)<raw_ptr:b.extend(b'\0'*(raw_ptr-len(b)))
    b.extend(blob); b.extend(b'\0'*(raw_size-len(blob)))
    name=b'.rsrc\0\0\0'; chars=0x40000040
    sh=struct.pack('<8sIIIIIIHHI',name,len(blob),new_rva,raw_size,raw_ptr,0,0,0,0,chars)
    b[new_hdr:new_hdr+40]=sh
    struct.pack_into('<H',b,coff+2,nsec+1)
    old_init=struct.unpack_from('<I',b,opt+8)[0];struct.pack_into('<I',b,opt+8,old_init+raw_size)
    struct.pack_into('<I',b,opt+56,align(new_rva+len(blob),sec_align))
    struct.pack_into('<II',b,opt+112+2*8,new_rva,len(blob))
    Path(outpath).write_bytes(b)
    return {'sections':nsec+1,'rva':hex(new_rva),'raw':hex(raw_ptr),'size':len(blob),'icons':len(imgs),'versionBytes':len(version_blob),'fileVersion':file_version,'productVersion':product_version}

if __name__=='__main__':
    ap=argparse.ArgumentParser(description='Embed Dicebound icon + Windows VERSIONINFO into a PE32+ launcher.')
    ap.add_argument('exe');ap.add_argument('ico');ap.add_argument('out')
    ap.add_argument('--file-version',default='0.4.0.0');ap.add_argument('--product-version',default='Beta 0.4');ap.add_argument('--original-filename',default=None)
    a=ap.parse_args();print(patch(a.exe,a.ico,a.out,a.file_version,a.product_version,a.original_filename))
