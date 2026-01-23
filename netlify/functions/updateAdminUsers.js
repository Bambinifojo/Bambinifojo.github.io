const { Octokit } = require("@octokit/rest");

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
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

    // CORS preflight request
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: "",
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

    const body = JSON.parse(event.body);
    const newUsersData = JSON.stringify(body, null, 2);

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    let sha = null;
    
    // Eski dosyanın sha değerini al (varsa)
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: ADMIN_USERS_FILE,
      });
      
      if (fileData && fileData.sha) {
        sha = fileData.sha;
      }
    } catch (error) {
      // Dosya yoksa sha null kalır (yeni dosya oluşturulacak)
      if (error.status !== 404) {
        throw error;
      }
    }

    // Dosyayı güncelle veya oluştur
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: ADMIN_USERS_FILE,
      message: `Admin kullanıcıları güncellendi - ${new Date().toLocaleString('tr-TR')}`,
      content: Buffer.from(newUsersData).toString("base64"),
      sha: sha, // null ise yeni dosya oluşturulur
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        success: true,
        message: "Admin kullanıcıları başarıyla GitHub'a kaydedildi"
      }),
    };
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
