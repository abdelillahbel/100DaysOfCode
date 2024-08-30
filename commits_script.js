const simpleGit = require('simple-git');
const randomstring = require('randomstring'); // Install this library: npm install randomstring
const fs = require('fs');

const git = simpleGit();

async function shouldCreateCommit(probability) {
    // Generate a random number between 0 and 1
    const randomValue = Math.random();
    // Check if the random number is less than the given probability
    return randomValue < probability;
}

async function createCommits() {
    const remote = 'origin'; // Change this to match your remote name
    const branch = 'main'; // Change this to your desired branch
    const startYear = 2024; // Start year
    const endYear = 2024;   // End year
    const months = Array.from({ length: 8 }, (_, i) => i + 4); // Months 1-12
    const days = Array.from({ length: 28 }, (_, i) => i + 1); // Days 1-31
    const minCommitsPerDay = 60; // Minimum number of commits per day
    const maxCommitsPerDay = 200; // Maximum number of commits per day
    const skipProbability = 0.9; // Probability of skipping a day (adjust as needed)
    let fileName = 'config.txt'; // Use the same file for all commits
    const commits = [];

    // Create the initial empty file
    fs.writeFileSync(fileName, '');

    for (let year = startYear; year <= endYear; year++) {
        for (const month of months) {
            for (const day of days) {
                // Determine whether to create a commit for this day
                const shouldCommit = await shouldCreateCommit(1 - skipProbability);

                if (shouldCommit || commits.length < minCommitsPerDay) {
                    // Generate a random commit message
                    const commitMessage = `Commit ${randomstring.generate()}`;

                    // Determine the number of commits for this day
                    const numberOfCommits = Math.min(maxCommitsPerDay, Math.max(minCommitsPerDay, commits.length + 1));

                    // Create and add the commits with the same message
                    for (let i = 0; i < numberOfCommits; i++) {
                        commits.push({ fileName, commitMessage, year, month, day });
                    }

                    // Limit the number of commits per day
                    if (commits.length >= maxCommitsPerDay) {
                        await createAndPushCommits(commits, remote, branch);
                        commits.length = 0; // Clear the commits array
                    }
                }
            }
        }
    }

    // Create and push any remaining commits
    if (commits.length > 0) {
        await createAndPushCommits(commits, remote, branch);
    }
}

async function createAndPushCommits(commits, remote, branch) {
    for (const commit of commits) {
        try {
            // Update the content of the existing file
            fs.appendFileSync(commit.fileName, `\n${commit.commitMessage}`);

            //   await git.raw(['checkout', '-b', branch]);
            //  await git.raw(['checkout', branch]);
            await git.add(commit.fileName);
            await git.commit(commit.commitMessage, null, { '--date': `${commit.year}-${commit.month}-${commit.day}` });
            console.log(`Commit created on ${commit.year}-${commit.month}-${commit.day}: ${commit.commitMessage}`);
        } catch (error) {
            console.error(`Error creating commit: ${error}`);
        }
    }

    // Push all commits at once
    await git.push(remote, branch);
    console.log('All commits pushed to the remote repository.');
}

createCommits();