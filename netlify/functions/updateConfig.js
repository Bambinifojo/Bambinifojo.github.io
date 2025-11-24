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
      CONFIG_FILE = "app_config.json",
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
    const newConfig = JSON.stringify(body, null, 2);

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // Helper function: Dosya güncelle veya oluştur
    const updateFile = async (filePath, content, message) => {
      let sha = null;
      
      // Eski dosyanın sha değerini al (varsa)
      try {
        const { data: fileData } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: filePath,
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
        path: filePath,
        message: message,
        content: Buffer.from(content).toString("base64"),
        sha: sha, // null ise yeni dosya oluşturulur
      });
    };

    // 1. app_config.json dosyasını güncelle
    await updateFile(
      CONFIG_FILE,
      newConfig,
      `Bildirim ayarları güncellendi - ${new Date().toLocaleString('tr-TR')}`
    );

    // 2. version.json dosyasını oluştur/güncelle (sadece güncelleme bilgileri)
    const versionJson = {
      latest_version: body.latest_version || "1.0.0",
      update_message: body.update_message || "Yeni sürüm mevcut!",
      force_update: body.force_update || false,
      play_store_url: body.play_store_url || "https://play.google.com/store/apps/details?id=com.taskcosmos.app"
    };
    
    await updateFile(
      "task-cosmos/version.json",
      JSON.stringify(versionJson, null, 2),
      `Version.json güncellendi - ${new Date().toLocaleString('tr-TR')}`
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        success: true,
        message: "Config başarıyla güncellendi"
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

