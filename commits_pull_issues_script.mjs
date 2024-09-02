import simpleGit from 'simple-git';
import randomstring from 'randomstring';
import fs from 'fs';
import { Octokit } from '@octokit/rest';

const git = simpleGit();
const octokit = new Octokit({
    auth: 'token', // Replace with your GitHub token
});

const owner = 'username'; // Replace with your GitHub username
const repo = 'repo';  // Replace with your repository name

async function shouldCreateTask(probability) {
    return Math.random() < probability;
}

async function createCommitsAndPRs() {
    const remote = 'origin';
    const baseBranch = 'main';
    const startYear = 2022;
    const endYear = 2023;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    const minCommitsPerDay = 60;
    const maxCommitsPerDay = 200;
    const skipProbability = 0.9;
    const fileName = 'es.txt';
    const tasks = [];

    fs.writeFileSync(fileName, '');

    for (let year = startYear; year <= endYear; year++) {
        for (const month of months) {
            for (const day of days) {
                const shouldTask = await shouldCreateTask(1 - skipProbability);

                if (shouldTask || tasks.length < minCommitsPerDay) {
                    const commitMessage = `Commit ${randomstring.generate()}`;
                    const branchName = `feature-${year}-${month}-${day}-${randomstring.generate(5)}`;

                    tasks.push({ branchName, fileName, commitMessage, year, month, day });

                    if (tasks.length >= maxCommitsPerDay) {
                        await createPushPRMergeClose(tasks, remote, baseBranch);
                        tasks.length = 0;
                    }
                }
            }
        }
    }

    if (tasks.length > 0) {
        await createPushPRMergeClose(tasks, remote, baseBranch);
    }
}

async function createPushPRMergeClose(tasks, remote, baseBranch) {
    for (const task of tasks) {
        try {
            const branchName = task.branchName;

            // Create a new branch
            await git.checkoutLocalBranch(branchName);

            // Make a commit
            fs.appendFileSync(task.fileName, `\n${task.commitMessage}`);
            await git.add(task.fileName);
            await git.commit(task.commitMessage, null, { '--date': `${task.year}-${task.month}-${task.day}` });

            console.log(`Commit on branch ${branchName} created: ${task.commitMessage}`);

            // Push the branch
            await git.push(remote, branchName);

            // Create an issue
            const { data: issue } = await octokit.rest.issues.create({
                owner,
                repo,
                title: `Issue related to ${branchName}`,
                body: `This issue was created to track the pull request from branch ${branchName}.`,
            });

            console.log(`Issue #${issue.number} created: ${issue.html_url}`);

            // Create a pull request
            const { data: pullRequest } = await octokit.rest.pulls.create({
                owner,
                repo,
                title: `Auto PR from ${branchName} to ${baseBranch}`,
                head: branchName,
                base: baseBranch,
                body: `This PR was automatically generated from branch ${branchName}.`,
            });

            console.log(`Pull Request #${pullRequest.number} created: ${pullRequest.html_url}`);

            // Merge the pull request
            await octokit.rest.pulls.merge({
                owner,
                repo,
                pull_number: pullRequest.number,
                commit_title: `Merged PR #${pullRequest.number} from branch ${branchName}`,
            });

            console.log(`Pull Request #${pullRequest.number} merged.`);

            // Close the issue
            await octokit.rest.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                state: 'closed',
            });

            console.log(`Issue #${issue.number} closed.`);

            // Delete the branch
            await octokit.rest.git.deleteRef({
                owner,
                repo,
                ref: `heads/${branchName}`,
            });

            console.log(`Branch ${branchName} deleted.`);

            // Checkout the base branch for the next task
            await git.checkout(baseBranch);

        } catch (error) {
            console.error(`Error processing task: ${error.message}`);
        }
    }

    console.log('All tasks completed for this batch.');
}

createCommitsAndPRs();
