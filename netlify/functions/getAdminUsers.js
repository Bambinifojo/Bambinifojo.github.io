const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const {
      GITHUB_TOKEN,
      REPO_OWNER = "Bambinifojo",
      REPO_NAME = "Bambinifojo.github.io",
      ADMIN_USERS_FILE = "data/adminUsers.json",
    } = process.env;

    if (!GITHUB_TOKEN) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "GitHub token not configured" }),
      };
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: ADMIN_USERS_FILE,
      });

      if (fileData && fileData.content) {
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        const users = JSON.parse(content);

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: true,
            users: Array.isArray(users) ? users : []
          }),
        };
      } else {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            users: [],
            message: "Admin kullanıcıları dosyası bulunamadı"
          }),
        };
      }
    } catch (error) {
      if (error.status === 404) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            success: false,
            users: [],
            message: "Admin kullanıcıları dosyası bulunamadı"
          }),
        };
      }
      throw error;
    }
  } catch (error) {
    console.error("Netlify Function Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message || "Internal server error",
        details: error.response?.data || null,
      }),
    };
  }
};
