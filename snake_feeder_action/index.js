const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    try {
        const token = process.env.GITHUB_TOKEN;
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
        
        const happyGifPath = `snake.svg`;
        const sadGifPath = `sad.gif`;

        // Fetching GIFs from the output branch
        try {
            const happyGifResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: happyGifPath,
                ref: 'output', // Specify the branch name here
            });
            const sadGifResponse = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: sadGifPath,
                ref: 'output', // Specify the branch name here
            });

            const happyGifUrl = happyGifResponse.data.download_url;
            const sadGifUrl = sadGifResponse.data.download_url;

            readmeContent += snakeFed ? happyGifUrl : sadGifUrl;
        } catch (error) {
            core.warning(`Failed to fetch GIFs from branch 'output': ${error.message}`);
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
