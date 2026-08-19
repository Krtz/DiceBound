#!/usr/bin/env python3
"""Materialize deterministic DiceBound runtime build metadata before packaging."""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

EXTENSIONS={'.html','.css','.js','.png','.ico','.ogg','.mp3','.wav','.webm'}
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]); ns=ap.parse_args()
    root=ns.root.resolve(); runtime=root/'runtime' if (root/'runtime').is_dir() else root
    info_path=runtime/'build-info.json'; manifest_path=runtime/'build-manifest.json'
    payload=sorted((p for p in runtime.rglob('*') if p.is_file() and p not in {info_path,manifest_path} and p.suffix.lower() in EXTENSIONS),key=lambda p:p.relative_to(runtime).as_posix())
    h=hashlib.sha256()
    for p in payload:
        h.update(p.relative_to(runtime).as_posix().encode()); h.update(b'\0'); h.update(sha(p).encode()); h.update(b'\n')
    digest=h.hexdigest(); build_id=f'dicebound-0.6-dev-{digest[:16]}'
    scripts=['js/assets.js','js/rng.js','js/native-http-host.js','js/wrapper-contract.js','js/platform.js','js/storage.js','js/save-system.js','js/dicebound.js']
    info={
      'assetCount':sum(p.relative_to(runtime).as_posix().startswith('assets/') for p in payload),
      'browserContentHash':digest,'buildId':build_id,'channel':'Beta','contentFileCount':len(payload)+1,
      'developmentState':'Unreleased','entrypoint':'index.html','format':2,'gameBundle':'js/dicebound.js','name':'Dicebound',
      'notes':'Materialized Unreleased Git development after Beta 0.6; includes issue #29 granular runtime asset architecture.',
      'reproducible':True,'runtimeScripts':scripts,'saveSchemaVersion':2,'sourceHash':digest,
      'timestampPolicy':'none; materialized development identity is content-derived from runtime-loadable HTML/CSS/JS/image/audio payloads',
      'version':'0.6','wrapperContractVersion':1,'wrapperPayload':'dist/browser'}
    info_path.write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')
    core=['build-info.json','index.html','css/dicebound.css',*scripts]
    manifest={'format':3,'version':'0.6','developmentState':'Unreleased','buildId':build_id,'browserContentHash':digest,'assetRegistryVersion':8,
      'payloadFileCount':len(payload),'assetPayloadCount':info['assetCount'],'files':{rel:sha(runtime/rel) for rel in core},
      'validation':'python tools/validate_asset_architecture.py',
      'hashPolicy':'browserContentHash authenticates every runtime-loadable HTML/CSS/JS/image/audio payload; files carries per-file hashes for build-info and core runtime entrypoints/scripts.'}
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'buildId':build_id,'browserContentHash':digest,'payloadFiles':len(payload),'assetPayloads':info['assetCount']},indent=2))
if __name__=='__main__': main()
