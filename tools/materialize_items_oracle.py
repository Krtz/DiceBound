#!/usr/bin/env python3
import base64,json,os,subprocess,urllib.request
from pathlib import Path

repo=os.environ['GITHUB_REPOSITORY'];token=os.environ['GH_TOKEN'];parent=os.environ['GITHUB_SHA'];api=f'https://api.github.com/repos/{repo}/git'
def post(path,payload):
    req=urllib.request.Request(api+path,data=json.dumps(payload).encode(),headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},method='POST')
    with urllib.request.urlopen(req) as r:return json.load(r)
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=ACMRT','HEAD'],text=True).splitlines()
expected=['runtime/build-info.json','runtime/build-manifest.json','runtime/js/dicebound.js','tools/fixtures/items_0_6_6_26.json']
if sorted(changed)!=sorted(expected):
    raise SystemExit(f'unexpected Items oracle diff: {changed}')
entries=[]
for filename in changed:
    blob=post('/blobs',{'content':base64.b64encode(Path(filename).read_bytes()).decode(),'encoding':'base64'})
    entries.append({'path':filename,'mode':'100644','type':'blob','sha':blob['sha']})
tree=post('/trees',{'base_tree':subprocess.check_output(['git','rev-parse','HEAD^{tree}'],text=True).strip(),'tree':entries})
commit=post('/commits',{'message':'test: freeze released 0.6.6.26 Items behavior oracle','tree':tree['sha'],'parents':[parent]})
print('REMOTE_COMMIT_SHA='+commit['sha'])
