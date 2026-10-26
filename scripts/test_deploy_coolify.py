import unittest
from unittest.mock import patch
import deploy_coolify as deployment

SHA = 'a' * 40


class DeployTests(unittest.TestCase):
    @patch.object(deployment, 'api')
    def test_wrong_branch_never_triggers_deploy(self, api):
        api.return_value = {'git_branch': 'codex/prorata-coolify', 'build_pack': 'dockercompose'}
        with self.assertRaises(RuntimeError):
            deployment.deploy(SHA)
        self.assertEqual(api.call_count, 1)

    @patch.object(deployment, 'api')
    def test_pins_sha_then_waits_for_result(self, api):
        api.side_effect = [
            {'git_branch': 'master', 'build_pack': 'dockercompose'}, {},
            {'deployments': [{'deployment_uuid': 'test-id'}]},
            {'status': 'finished', 'commit': SHA},
        ]
        deployment.deploy(SHA)
        self.assertEqual(api.call_args_list[1].args,
                         ('PATCH', f'/applications/{deployment.APP}', {'git_commit_sha': SHA}))
        self.assertEqual(api.call_count, 4)

    @patch.object(deployment, 'api')
    def test_wrong_commit_fails(self, api):
        api.side_effect = [
            {'git_branch': 'master', 'build_pack': 'dockercompose'}, {},
            {'deployments': [{'deployment_uuid': 'test-id'}]},
            {'status': 'finished', 'commit': 'b' * 40},
        ]
        with self.assertRaises(RuntimeError):
            deployment.deploy(SHA)

    @patch.object(deployment, 'api')
    def test_failed_deploy_fails_job(self, api):
        api.side_effect = [
            {'git_branch': 'master', 'build_pack': 'dockercompose'}, {},
            {'deployments': [{'deployment_uuid': 'test-id'}]},
            {'status': 'failed'},
        ]
        with self.assertRaises(RuntimeError):
            deployment.deploy(SHA)
