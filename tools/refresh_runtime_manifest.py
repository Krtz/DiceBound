#!/usr/bin/env python3
"""Materialize deterministic DiceBound runtime build metadata before packaging."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from dicebound_version import require_supported_version

EXTENSIONS={'.html','.css','.js','.png','.ico','.jpg','.jpeg','.webp','.ogg','.mp3','.wav','.webm'}


def sha(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()


def default_version_channel(root: Path, runtime: Path) -> tuple[str | None, str | None]:
    project = root/'wrapper-source'/'config'/'project.json'
    if project.is_file():
        value=json.loads(project.read_text(encoding='utf-8'))
        return value.get('version'), value.get('channel')
    info = runtime/'build-info.json'
    if info.is_file():
        value=json.loads(info.read_text(encoding='utf-8'))
        return value.get('version'), value.get('channel')
    return None, None


def asset_registry_version(runtime: Path) -> int:
    source = (runtime/'js'/'assets.js').read_text(encoding='utf-8')
    match = re.search(r'const\s+manifest\s*=\s*Object\.freeze\(\{version:(\d+),', source)
    if not match:
        raise SystemExit('Could not determine asset registry version from runtime/js/assets.js')
    return int(match.group(1))


def runtime_scripts(runtime: Path) -> list[str]:
    manifest_path=runtime/'js'/'module-manifest.json'
    if not manifest_path.is_file():
        raise SystemExit(f'Could not find runtime module manifest: {manifest_path}')
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    modules={str(module.get('id')):module for module in manifest.get('modules',[])}
    scripts=[]
    for module_id in manifest.get('loadOrder',[]):
        module=modules.get(str(module_id))
        if not module:
            raise SystemExit(f'Runtime load order references unknown module: {module_id}')
        rel=str(module.get('path') or '')
        if not rel.startswith('js/') or not rel.endswith('.js'):
            raise SystemExit(f'Runtime module {module_id} has invalid script path: {rel!r}')
        if not (runtime/rel).is_file():
            raise SystemExit(f'Runtime module {module_id} points to missing script: {rel}')
        scripts.append(rel)
    if not scripts:
        raise SystemExit('Runtime module manifest has an empty load order')
    return scripts


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    ap.add_argument('--version')
    ap.add_argument('--channel')
    ap.add_argument('--development-state',choices=('Unreleased','Release'),default='Unreleased')
    ap.add_argument('--notes')
    ns=ap.parse_args()

    root=ns.root.resolve()
    runtime=root/'runtime' if (root/'runtime').is_dir() else root
    info_path=runtime/'build-info.json'
    manifest_path=runtime/'build-manifest.json'
    if not (runtime/'index.html').is_file():
        raise SystemExit(f'Could not find runtime index.html under {runtime}')

    scripts=runtime_scripts(runtime)

    default_version,default_channel=default_version_channel(root,runtime)
    version=(ns.version or default_version or '').strip()
    channel=(ns.channel or default_channel or '').strip()
    if not version or not channel:
        raise SystemExit('Could not determine version/channel; pass --version and --channel.')
    try:
        version=require_supported_version(version)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    payload=sorted(
        (p for p in runtime.rglob('*')
         if p.is_file()
         and p not in {info_path,manifest_path}
         and p.suffix.lower() in EXTENSIONS),
        key=lambda p:p.relative_to(runtime).as_posix()
    )
    h=hashlib.sha256()
    for p in payload:
        h.update(p.relative_to(runtime).as_posix().encode())
        h.update(b'\0')
        h.update(sha(p).encode())
        h.update(b'\n')
    digest=h.hexdigest()
    suffix=f'dev-{digest[:16]}' if ns.development_state=='Unreleased' else digest[:16]
    build_id=f'dicebound-{version}-{suffix}'

    notes=ns.notes or (
        f'Materialized Unreleased Git development for {channel} {version}.'
        if ns.development_state=='Unreleased'
        else f'DiceBound {channel} {version} packaged release payload.'
    )
    info={
      'assetCount':sum(p.relative_to(runtime).as_posix().startswith('assets/') for p in payload),
      'browserContentHash':digest,
      'buildId':build_id,
      'channel':channel,
      'contentFileCount':len(payload)+1,
      'developmentState':ns.development_state,
      'entrypoint':'index.html',
      'format':2,
      'gameBundle':'js/dicebound.js',
      'name':'Dicebound',
      'notes':notes,
      'reproducible':True,
      'runtimeScripts':scripts,
      'saveSchemaVersion':2,
      'sourceHash':digest,
      'timestampPolicy':'none; materialized identity is content-derived from runtime-loadable HTML/CSS/JS/image/audio payloads',
      'version':version,
      'wrapperContractVersion':1,
      'wrapperPayload':'dist/browser'
    }
    info_path.write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')

    core=['build-info.json','index.html','css/dicebound.css',*scripts]
    manifest={
      'format':3,
      'version':version,
      'channel':channel,
      'developmentState':ns.development_state,
      'buildId':build_id,
      'browserContentHash':digest,
      'assetRegistryVersion':asset_registry_version(runtime),
      'payloadFileCount':len(payload),
      'assetPayloadCount':info['assetCount'],
      'files':{rel:sha(runtime/rel) for rel in core},
      'reproducible':True,
      'validation':'python tools/validate_asset_architecture.py',
      'hashPolicy':'browserContentHash authenticates every runtime-loadable HTML/CSS/JS/image/audio payload; files carries per-file hashes for build-info and core runtime entrypoints/scripts.'
    }
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

    print(json.dumps({
      'version':version,
      'channel':channel,
      'developmentState':ns.development_state,
      'buildId':build_id,
      'browserContentHash':digest,
      'payloadFiles':len(payload),
      'assetPayloads':info['assetCount']
    },indent=2))


if __name__=='__main__':
    main()
