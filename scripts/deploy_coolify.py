"""Deploy the tested SHA; never print API responses containing app secrets."""
import json
import os
import re
import time
import urllib.error
import urllib.request

BASE = 'https://admin.clement-silvestre.fr/api/v1'
APP = 'q9dnj8bmilarh0oxjqwfoeko'


def api(method, path, body=None):
    request = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Authorization': 'Bearer ' + os.environ['COOLIFY_TOKEN'],
                 'Content-Type': 'application/json', 'Accept': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'Coolify API {method} failed: HTTP {error.code}') from None


def deploy(sha):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise RuntimeError('DEPLOY_SHA must be a full commit SHA')
    app = api('GET', f'/applications/{APP}')
    if app.get('git_branch') != 'master' or app.get('build_pack') != 'dockercompose':
        raise RuntimeError('Configure the Coolify resource on master with Docker Compose first')
    # Pin the commit so a newer push cannot replace the code tested by this run.
    api('PATCH', f'/applications/{APP}', {'git_commit_sha': sha})
    result = api('POST', '/deploy', {'uuid': APP, 'force': False})
    deployments = result.get('deployments', [])
    if len(deployments) != 1 or not deployments[0].get('deployment_uuid'):
        raise RuntimeError('Coolify did not return a single deployment ID; inspect its logs')
    deployment_id = deployments[0]['deployment_uuid']
    print(f'Coolify deployment: {deployment_id}', flush=True)
    deadline = time.monotonic() + 1800
    previous = None
    while time.monotonic() < deadline:
        deployment = api('GET', f'/deployments/{deployment_id}')
        status = deployment.get('status')
        if status != previous:
            print(f'Status: {status}', flush=True)
            previous = status
        if status == 'finished':
            if deployment.get('commit') != sha:
                raise RuntimeError('Deployed commit differs from tested commit; inspect Coolify')
            return
        if status in ('failed', 'cancelled', 'canceled'):
            raise RuntimeError(f'Deployment {status}; inspect Coolify deployment logs')
        time.sleep(10)
    raise RuntimeError('Timed out waiting for Coolify; deployment may still be running')


if __name__ == '__main__':
    if not os.environ.get('COOLIFY_TOKEN'):
        raise SystemExit('Missing GitHub Actions secret COOLIFY_TOKEN')
    deploy(os.environ.get('DEPLOY_SHA', ''))
