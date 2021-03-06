/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useState } from 'react';
import { useAsyncRetry } from 'react-use';
import { Build } from './BuildListTable';
import { githubActionsApiRef } from '../../api/GithubActionsApi';
import { useApi, githubAuthApiRef } from '@backstage/core';
import { ActionsListWorkflowRunsForRepoResponseData } from '@octokit/types';

export function useBuilds({ repo, owner }: { repo: string; owner: string }) {
  const api = useApi(githubActionsApiRef);
  const auth = useApi(githubAuthApiRef);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const restartBuild = async () => {};

  const { loading, value: builds, retry } = useAsyncRetry<Build[]>(async () => {
    const token = await auth.getAccessToken(['repo', 'user']);

    return (
      api
        // GitHub API pagination count starts from 1
        .listWorkflowRuns({ token, owner, repo, pageSize, page: page + 1 })
        .then(
          (allBuilds: ActionsListWorkflowRunsForRepoResponseData): Build[] => {
            setTotal(allBuilds.total_count);
            // Transformation here
            return allBuilds.workflow_runs.map(run => ({
              buildName: run.head_commit.message,
              id: `${run.id}`,
              onRestartClick: () => {
                api.reRunWorkflow({
                  token,
                  owner,
                  repo,
                  runId: run.id,
                });
              },
              source: {
                branchName: run.head_branch,
                commit: {
                  hash: run.head_commit.id,
                  url: run.head_repository.branches_url.replace(
                    '{/branch}',
                    run.head_branch,
                  ),
                },
              },
              status: run.status,
              buildUrl: run.url,
            }));
          },
        )
    );
  }, [page, pageSize]);

  const projectName = `${owner}/${repo}`;
  return [
    {
      page,
      pageSize,
      loading,
      builds,
      projectName,
      total,
    },
    {
      builds,
      setPage,
      setPageSize,
      restartBuild,
      retry,
    },
  ] as const;
}
