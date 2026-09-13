#!/usr/bin/env python3
import base64,json,os,subprocess,urllib.request
from pathlib import Path

repo=os.environ['GITHUB_REPOSITORY'];token=os.environ['GH_TOKEN'];parent=os.environ['GITHUB_SHA'];api=f'https://api.github.com/repos/{repo}/git'
def post(path,payload):
    req=urllib.request.Request(api+path,data=json.dumps(payload).encode(),headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req) as response:return json.load(response)
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=ACMRT','HEAD'],text=True).splitlines()
expected=[
 'CHANGELOG.md','runtime/PATCH_NOTES.md','runtime/index.html','runtime/js/version.js',
 'runtime/build-info.json','runtime/build-manifest.json','wrapper-source/config/project.json',
 'wrapper-source/wrappers/webview2/native-go/main.go'
]
if sorted(changed)!=sorted(expected):raise SystemExit(f'unexpected 0.6.6.27 release-prep diff: {changed}')
entries=[]
for filename in changed:
    blob=post('/blobs',{'content':base64.b64encode(Path(filename).read_bytes()).decode(),'encoding':'base64'})
    entries.append({'path':filename,'mode':'100644','type':'blob','sha':blob['sha']})
for filename in ['.github/workflows/items-06627-release-prep.yml','tools/prepare_items_06627_release.py','tools/materialize_items_06627_release.py']:
    entries.append({'path':filename,'mode':'100644','type':'blob','sha':None})
tree=post('/trees',{'base_tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],text=True).strip(),'tree':entries})
commit=post('/commits',{'message':'release: prepare Beta 0.6.6.27 Items architecture wave','tree':tree['sha'],'parents':[parent]})
print('REMOTE_COMMIT_SHA='+commit['sha'])
