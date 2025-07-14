# MSTewart's Cozy Home Blog

This is a cozy and comfortable blog template, built with Eleventy (11ty) and Netlify CMS, designed for easy deployment on Netlify.

## Local Development

1.  **Navigate to the project directory:**
    ```bash
    cd cozy-home-blog
    ```
2.  **Start the Eleventy development server:**
    ```bash
    npm run dev
    ```
    This will build your site and start a local server, usually at `http://localhost:8080/`.

## Deployment to Netlify

1.  **Initialize Git and push to a new GitHub/GitLab/Bitbucket repository:**
    ```bash
    git init
    git add .
    git commit -m "Initial cozy blog template"
    # Follow instructions from your Git provider to add remote and push
    # Example for GitHub:
    # git remote add origin https://github.com/your-username/your-repo-name.git
    # git branch -M main
    # git push -u origin main
    ```
2.  **Connect to Netlify:**
    *   Go to [Netlify App](https://app.netlify.com/).
    *   Click "Add new site" -> "Import an existing project."
    *   Connect to your Git provider and select your repository.
    *   Netlify should auto-detect the build settings from `netlify.toml` (`npm run build`, publish `public`).
    *   Click "Deploy site."
3.  **Enable Netlify Identity & Git Gateway (for Netlify CMS):**
    *   In your Netlify site dashboard, go to **Site settings** -> **Identity**.
    *   Click "Enable Identity."
    *   Under "Services," click "Git Gateway" and enable it.
    *   Under "Registration," choose "Invite only" (recommended) or "Open." If "Invite only," invite yourself from the Identity tab.
4.  **Access the Netlify CMS Admin:**
    *   Once deployed, go to your site URL (e.g., `https://your-site-name.netlify.app`).
    *   Append `/admin/` to the URL: `https://your-site-name.netlify.app/admin/`.
    *   Log in using your Netlify Identity credentials.
5.  **Connect Your Custom Domain (`mstewarts3.fun`):**
    *   In your Netlify site dashboard, go to **Site settings** -> **Domain management**.
    *   Click "Add custom domain" and follow the instructions to point `mstewarts3.fun` to Netlify.

Enjoy your cozy home on the web!
