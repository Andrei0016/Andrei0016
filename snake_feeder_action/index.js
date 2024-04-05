const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function run() {
    try {
        const token = core.getInput('repo-token');
        const octokit = github.getOctokit(token);

        const { owner, repo } = github.context.repo;
        const commits = await octokit.rest.repos.listCommits({ owner, repo });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCommits = commits.data.filter(commit => {
            const commitDate = new Date(commit.commit.author.date);
            commitDate.setHours(0, 0, 0, 0);
            return commitDate.getTime() === today.getTime();
        });

        const snakeFed = todayCommits.length > 0;
        core.setOutput('snake-fed', snakeFed);

        let readmeContent = `
        # My Repository

        ![Snake](`;
        
        const branchName = core.getInput('branch-name');
        const happyGifPath = `snake.gif`;
        const sadGifPath = `sad.gif`;

        // Fetching GIFs from the specified branch
        try {
            const happyGifResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: happyGifPath,
                ref: branchName,
            });
            const sadGifResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: sadGifPath,
                ref: branchName,
            });

            const happyGifUrl = happyGifResponse.data.download_url;
            const sadGifUrl = sadGifResponse.data.download_url;

            readmeContent += snakeFed ? happyGifUrl : sadGifUrl;
        } catch (error) {
            core.warning(`Failed to fetch GIFs from branch ${branchName}: ${error.message}`);
            // Use default GIFs
            readmeContent += snakeFed ? happyGifPath : sadGifPath;
        }

        readmeContent += `)\n`;

        // Update README.md file
        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: 'README.md',
            message: 'Update README.md',
            content: Buffer.from(readmeContent).toString('base64'),
            sha: github.context.sha,
        });
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
