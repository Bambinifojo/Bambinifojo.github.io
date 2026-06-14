// AI Asistan JavaScript
let aiMessages = [];
let aiCredits = 3;
let aiCurrentType = 'chat'; // Her zaman sohbet modu
let aiLastCreditReset = Date.now();
let appsData = null;
let feedbackData = [];
let votesData = {};
const AI_CREDIT_RESET_TIME = 60 * 60 * 1000; // 1 saat
const AI_WELCOME_MESSAGE = 'Merhaba! Bambinifojo Studio asistanıyım. Uygulamalar, iş birlikleri veya teknik sorular hakkında yardımcı olabilirim.';
const AI_DEMO_FALLBACK_MESSAGE = 'Şu an demo modda çalışıyorum. Uygulamalar ve teknik iş birlikleri hakkında sorularınızı yanıtlayabilirim.';

// Uygulamaları ve site verilerini yükle
async function loadAppsData() {
    try {
        // Apps verisini yükle
        const appsRes = await fetch('data/apps.json');
        const appsDataJson = await appsRes.json();
        
        // Site verisini yükle
        let siteData = null;
        try {
            const siteRes = await fetch('data/site.json');
            if (siteRes.ok) {
                const siteDataJson = await siteRes.json();
                siteData = siteDataJson.site;
            }
        } catch (error) {
            console.warn('Site verisi yüklenirken hata:', error);
        }
        
        // Her iki veriyi de appsData'ya ekle
        appsData = {
            apps: appsDataJson.apps || [],
            site: siteData
        };
        
        return appsData;
    } catch (error) {
        console.error('Uygulamalar yüklenirken hata:', error);
        return null;
    }
}

// Geri bildirim ve oyları yükle
function loadFeedbackAndVotes() {
    const savedFeedback = localStorage.getItem('aiFeedback');
    const savedVotes = localStorage.getItem('aiVotes');
    
    if (savedFeedback) {
        try {
            feedbackData = JSON.parse(savedFeedback);
        } catch (e) {
            feedbackData = [];
        }
    }
    
    if (savedVotes) {
        try {
            votesData = JSON.parse(savedVotes);
        } catch (e) {
            votesData = {};
        }
    }
}

// Geri bildirim ve oyları kaydet
function saveFeedbackAndVotes() {
    localStorage.setItem('aiFeedback', JSON.stringify(feedbackData));
    localStorage.setItem('aiVotes', JSON.stringify(votesData));
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    initializeAIAssistant();
    loadFeedbackAndVotes();
    loadAICredits();
    checkCreditReset();
    updateAITheme();

    loadAppsData().catch((error) => {
        console.warn('AI asistan veri yükleme hatası:', error);
    });

    const themeObserver = new MutationObserver(() => {
        updateAITheme();
    });

    const htmlElement = document.documentElement;
    if (htmlElement) {
        themeObserver.observe(htmlElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });
    }
});

// AI Asistan temasını güncelle
function updateAITheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const modal = document.getElementById('aiAssistantModal');
    
    if (modal) {
        if (theme === 'dark') {
            modal.setAttribute('data-theme', 'dark');
        } else {
            modal.setAttribute('data-theme', 'light');
        }
    }
}

// AI Asistan'ı başlat
function initializeAIAssistant() {
    const toggleBtn = document.getElementById('aiAssistantToggle');
    const modal = document.getElementById('aiAssistantModal');
    const closeBtn = document.getElementById('aiCloseBtn');
    const minimizeBtn = document.getElementById('aiMinimizeBtn');
    const sendBtn = document.getElementById('aiSendBtn');
    const messageInput = document.getElementById('aiMessageInput');

    // Toggle button
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAIModal();
        });
    }

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAIModal();
        });
    }

    // Minimize button
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeAIModal();
        });
    }

    // Send button
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendAIMessage();
        });
    }

    // Enter tuşu ile gönder
    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });
    }

    // Kategori butonları kaldırıldı - direkt sohbet modu

    if (modal) {
        modal.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// Modal'ı aç/kapat
function toggleAIModal() {
    const modal = document.getElementById('aiAssistantModal');
    
    if (modal) {
        const isActive = modal.classList.contains('active');
        
        if (isActive) {
            // Modal açık - kapat
            closeAIModal();
        } else {
            // Modal kapalı - aç
            openAIModal();
        }
    }
}

function openAIModal() {
    const modal = document.getElementById('aiAssistantModal');
    if (!modal) return;

    try {
        modal.classList.remove('closing');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('ai-assistant-open');

        renderAssistantWelcomeMessage();

        const input = document.getElementById('aiMessageInput');
        if (input) {
            setTimeout(() => input.focus(), 100);
        }
    } catch (error) {
        console.error('AI asistan açılırken hata:', error);
        renderAssistantFallbackMessage();
    }
}

function closeAIModal() {
    const modal = document.getElementById('aiAssistantModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('closing');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ai-assistant-open');

    setTimeout(() => {
        modal.classList.remove('closing');
    }, 300);

    const toggleBtn = document.getElementById('aiAssistantToggle');
    if (toggleBtn) {
        toggleBtn.style.pointerEvents = 'auto';
        toggleBtn.style.visibility = 'visible';
        toggleBtn.style.opacity = '1';
    }
}

function renderAssistantWelcomeMessage() {
    const chatMessages = document.getElementById('aiChatMessages');
    if (!chatMessages) return;

    chatMessages.classList.add('active');

    if (chatMessages.children.length > 0) return;

    if (aiMessages.length > 0) {
        aiMessages.forEach(msg => renderAIMessageToDOM(msg.role, msg.content));
        return;
    }

    const welcome = appsData ? AI_WELCOME_MESSAGE : AI_DEMO_FALLBACK_MESSAGE;
    addAIMessage('assistant', welcome);
}

function renderAssistantFallbackMessage() {
    const chatMessages = document.getElementById('aiChatMessages');
    if (!chatMessages) return;

    chatMessages.classList.add('active');

    if (chatMessages.children.length === 0) {
        renderAIMessageToDOM('assistant', AI_DEMO_FALLBACK_MESSAGE);
    }
}

// Mesaj gönder
function sendAIMessage() {
    const input = document.getElementById('aiMessageInput');
    const message = input?.value.trim();

    if (!message) return;

    // Kredi kontrolü
    if (aiCredits <= 0) {
        showAIError('Mesaj krediniz kalmadı. Lütfen daha sonra tekrar deneyin.');
        return;
    }

    // Mesajı ekle
    addAIMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // Welcome section'ı gizle (zaten HTML'den kaldırıldı)
    const chatMessages = document.getElementById('aiChatMessages');
    if (chatMessages) chatMessages.classList.add('active');

    // Krediyi azalt
    aiCredits--;
    updateAICredits();
    saveAICredits();

    // Typing indicator göster
    showAITyping();

    // AI yanıtını simüle et (gerçek API entegrasyonu için burayı değiştirin)
    setTimeout(() => {
        hideAITyping();
        const response = generateAIResponse(message, aiCurrentType);
        addAIMessage('assistant', response);
        
        // AI yanıtı geldiğinde e-posta gönder
        sendChatToEmail(message, response);
    }, 1000 + Math.random() * 1000);
}

// AI yanıtı oluştur (Akıllı yanıtlar - Sadece sohbet modu)
function generateAIResponse(message, type) {
    const msg = message.toLowerCase();
    
    // Uygulama sorguları
    if (msg.includes('uygulama') || msg.includes('app') || msg.includes('hangi uygulama')) {
        return handleAppQuery(message);
    }
    
    // Geri bildirim
    if (msg.includes('geri bildirim') || msg.includes('feedback') || msg.includes('öneri') || msg.includes('şikayet')) {
        return handleFeedback(message);
    }
    
    // Oy verme
    if (msg.includes('oy') || msg.includes('beğen') || msg.includes('rate') || msg.includes('puan')) {
        return handleVote(message);
    }
    
    // Güncelleme sorguları
    if (msg.includes('güncelleme') || msg.includes('update') || msg.includes('yeni versiyon')) {
        return handleUpdateQuery(message);
    }
    
    // Kategori sorguları
    if (msg.includes('kategori') || msg.includes('tür') || msg.includes('category') || msg.includes('tip')) {
        return handleCategoryQuery();
    }
    
    // Hakkımda sorguları
    if (msg.includes('hakkında') || msg.includes('hakkımda') || msg.includes('yetenek') || msg.includes('skill') || msg.includes('kimsin')) {
        return handleAboutQuery();
    }
    
    // İletişim sorguları
    if (msg.includes('iletişim') || msg.includes('contact') || msg.includes('email') || msg.includes('e-posta') || msg.includes('mail')) {
        return handleContactQuery();
    }
    
    // Genel sohbet
    return handleGeneralChat(message);
}

// Uygulama sorgularını işle - Siteye özel
function handleAppQuery(message) {
    if (!appsData || !appsData.apps) {
        return "Üzgünüm, şu anda uygulama bilgilerine erişemiyorum. Lütfen daha sonra tekrar deneyin.";
    }
    
    const msg = message.toLowerCase().trim();
    const apps = appsData.apps;
    
    // Belirli bir uygulama soruluyor mu?
    for (const app of apps) {
        const appNameLower = app.title.toLowerCase();
        if (msg.includes(appNameLower) || msg.includes(appNameLower.replace(/\s+/g, ''))) {
            return formatAppInfo(app);
        }
    }
    
    // Tüm uygulamaları listele
    if (msg.includes('tüm') || msg.includes('hepsi') || msg.includes('listele') || 
        msg.includes('hangi uygulama') || msg === 'uygulamalar' || msg === 'apps' ||
        msg.includes('kaç uygulama') || msg.includes('toplam')) {
        return formatAllApps(apps);
    }
    
    // En popüler / en yüksek rating
    if (msg.includes('popüler') || msg.includes('en iyi') || msg.includes('en yüksek') || 
        msg.includes('en çok indirilen') || msg.includes('favori')) {
        const sorted = [...apps].sort((a, b) => {
            const ratingA = parseFloat(a.rating) || 0;
            const ratingB = parseFloat(b.rating) || 0;
            return ratingB - ratingA;
        });
        
        let response = `⭐ **En Popüler Uygulamalar**\n\n`;
        sorted.slice(0, 5).forEach((app, index) => {
            const status = (app.details && app.details !== '#') ? '✅' : '⏳';
            response += `${index + 1}. ${status} **${app.title}** ${app.icon}\n`;
            response += `   ⭐ ${app.rating} • 📥 ${app.downloads} • ${app.category}\n\n`;
        });
        response += "Hangi uygulama hakkında daha fazla bilgi almak istersiniz?";
        return response;
    }
    
    // Kategoriye göre filtrele
    const categories = ['üretkenlik', 'hava durumu', 'not', 'sağlık', 'fitness', 'finans', 
                       'müzik', 'fotoğraf', 'eğitim', 'yaşam', 'geliştirici'];
    for (const category of categories) {
        if (msg.includes(category)) {
            const filtered = apps.filter(app => 
                app.category.toLowerCase().includes(category)
            );
            if (filtered.length > 0) {
                return formatAppsByCategory(filtered, category);
            }
        }
    }
    
    // Varsayılan yanıt
    return `Hangi uygulama hakkında bilgi almak istersiniz?\n\n` +
           `**Örnek sorular:**\n` +
           `• "Task Cosmos hakkında bilgi ver"\n` +
           `• "Tüm uygulamaları listele"\n` +
           `• "En popüler uygulamalar"\n` +
           `• "Üretkenlik uygulamalarını göster"\n` +
           `• "Kaç uygulama var?"`;
}

// Uygulama bilgisini formatla - Siteye özel
function formatAppInfo(app) {
    const hasPlayStore = app.details && app.details !== '#';
    const status = hasPlayStore ? '✅ Yayında' : '⏳ Yakında';
    const playStoreLink = hasPlayStore ? `\n\n🔗 **Play Store'da İndir:**\n${app.details}` : '\n\n⏳ Bu uygulama yakında yayınlanacak!';
    
    const features = app.features && app.features.length > 0 
        ? `\n\n✨ **Özellikler:**\n${app.features.map(f => `• ${f}`).join('\n')}`
        : '';
    
    const privacyLink = app.privacy && app.privacy !== '#' 
        ? `\n\n🔒 **Gizlilik Politikası:**\n${app.privacy}`
        : '';
    
    return `📱 **${app.title}** ${app.icon}\n\n` +
           `${app.description}\n\n` +
           `⭐ **Rating:** ${app.rating}/5.0\n` +
           `📥 **İndirme:** ${app.downloads}\n` +
           `📂 **Kategori:** ${app.category}\n` +
           `📊 **Durum:** ${status}${playStoreLink}${features}${privacyLink}\n\n` +
           `Başka bir sorunuz var mı?`;
}

// Tüm uygulamaları formatla - Siteye özel
function formatAllApps(apps) {
    const published = apps.filter(app => app.details && app.details !== '#').length;
    const comingSoon = apps.length - published;
    
    let response = `📱 **Tüm Uygulamalarım**\n\n`;
    response += `📊 **İstatistikler:**\n`;
    response += `• Toplam: ${apps.length} uygulama\n`;
    response += `• Yayında: ${published} uygulama\n`;
    response += `• Yakında: ${comingSoon} uygulama\n\n`;
    response += `**Uygulama Listesi:**\n\n`;
    
    apps.forEach((app, index) => {
        const status = (app.details && app.details !== '#') ? '✅' : '⏳';
        response += `${index + 1}. ${status} **${app.title}** ${app.icon}\n`;
        response += `   📂 ${app.category} • ⭐ ${app.rating} • 📥 ${app.downloads}\n\n`;
    });
    
    response += "Hangi uygulama hakkında daha fazla bilgi almak istersiniz?";
    return response;
}

// Kategoriye göre uygulamaları formatla - Siteye özel
function formatAppsByCategory(apps, category) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    let response = `📂 **${categoryName} Kategorisindeki Uygulamalar**\n\n`;
    response += `Bu kategoride **${apps.length}** uygulama bulunuyor:\n\n`;
    
    apps.forEach((app, index) => {
        const status = (app.details && app.details !== '#') ? '✅' : '⏳';
        response += `${index + 1}. ${status} **${app.title}** ${app.icon}\n`;
        response += `   ${app.description.substring(0, 60)}...\n`;
        response += `   ⭐ ${app.rating} • 📥 ${app.downloads}\n\n`;
    });
    
    response += "Hangi uygulama hakkında daha fazla bilgi almak istersiniz?";
    return response;
}

// Geri bildirim işle
function handleFeedback(message) {
    // Geri bildirim mesajını kaydet
    const feedback = {
        message: message,
        timestamp: Date.now(),
        type: 'feedback'
    };
    
    feedbackData.push(feedback);
    saveFeedbackAndVotes();
    
    return `✅ Geri bildiriminiz kaydedildi! Teşekkür ederiz.\n\n` +
           `"${message}"\n\n` +
           `Geri bildiriminiz değerlendirilecek ve uygulamalarımızı geliştirmek için kullanılacaktır. Başka bir şey sormak ister misiniz?`;
}

// Oy verme işle - Siteye özel
function handleVote(message) {
    if (!appsData || !appsData.apps) {
        return "Üzgünüm, şu anda oy veremiyorum. Lütfen daha sonra tekrar deneyin.";
    }
    
    const msg = message.toLowerCase();
    const apps = appsData.apps;
    
    // Hangi uygulamaya oy veriliyor?
    for (const app of apps) {
        const appNameLower = app.title.toLowerCase();
        if (msg.includes(appNameLower)) {
            // Oy sayısını artır
            if (!votesData[app.title]) {
                votesData[app.title] = { upvotes: 0, downvotes: 0 };
            }
            
            // Pozitif veya negatif oy?
            const positiveWords = ['beğen', 'güzel', 'harika', 'sev', 'like', 'mükemmel', 'süper', 'iyi', 'başarılı'];
            const negativeWords = ['beğenme', 'kötü', 'dislike', 'berbat', 'kötü', 'yetersiz'];
            
            if (positiveWords.some(word => msg.includes(word))) {
                votesData[app.title].upvotes++;
                saveFeedbackAndVotes();
                const total = votesData[app.title].upvotes + votesData[app.title].downvotes;
                const percent = total > 0 ? Math.round((votesData[app.title].upvotes / total) * 100) : 100;
                
                return `👍 **${app.title}** için oyunuz kaydedildi! Teşekkür ederiz.\n\n` +
                       `📊 **Oy Durumu:**\n` +
                       `👍 Beğeni: ${votesData[app.title].upvotes}\n` +
                       `👎 Beğenmeme: ${votesData[app.title].downvotes}\n` +
                       `📈 Olumlu: %${percent}\n\n` +
                       `Başka bir konuda yardımcı olabilir miyim?`;
            } else if (negativeWords.some(word => msg.includes(word))) {
                votesData[app.title].downvotes++;
                saveFeedbackAndVotes();
                const total = votesData[app.title].upvotes + votesData[app.title].downvotes;
                const percent = total > 0 ? Math.round((votesData[app.title].upvotes / total) * 100) : 0;
                
                return `👎 **${app.title}** için oyunuz kaydedildi. Geri bildiriminiz için teşekkürler.\n\n` +
                       `📊 **Oy Durumu:**\n` +
                       `👍 Beğeni: ${votesData[app.title].upvotes}\n` +
                       `👎 Beğenmeme: ${votesData[app.title].downvotes}\n` +
                       `📈 Olumlu: %${percent}\n\n` +
                       `Geri bildiriminiz uygulamayı geliştirmem için değerli. Başka bir konuda yardımcı olabilir miyim?`;
            }
        }
    }
    
    return "Hangi uygulamaya oy vermek istersiniz? Örneğin:\n" +
           "• \"Task Cosmos beğendim\"\n" +
           "• \"Weather Pro güzel\"\n" +
           "• \"FitTracker harika\"";
}

// Güncelleme sorgularını işle - Siteye özel
function handleUpdateQuery(message) {
    if (!appsData || !appsData.apps) {
        return "Üzgünüm, şu anda güncelleme bilgilerine erişemiyorum.";
    }
    
    const msg = message.toLowerCase();
    const apps = appsData.apps;
    
    // Belirli bir uygulama soruluyor mu?
    for (const app of apps) {
        if (msg.includes(app.title.toLowerCase())) {
            const hasPlayStore = app.details && app.details !== '#';
            
            if (!hasPlayStore) {
                return `📱 **${app.title}** ${app.icon}\n\n` +
                       `⏳ Bu uygulama henüz yayınlanmadı.\n\n` +
                       `Yakında Play Store'da olacak! Güncellemeleri takip etmek için siteyi ziyaret edebilirsiniz.`;
            }
            
            // Demo için rastgele tarih (gerçek API'de bu bilgi gelecek)
            const lastUpdate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
            const daysAgo = Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
            const version = (Math.random() * 2 + 1).toFixed(1) + '.' + Math.floor(Math.random() * 10);
            
            return `📱 **${app.title}** ${app.icon} Güncelleme Bilgileri\n\n` +
                   `🕒 **Son Güncelleme:** ${daysAgo} gün önce\n` +
                   `📊 **Versiyon:** ${version}\n` +
                   `✨ Yeni özellikler ve iyileştirmeler eklendi.\n\n` +
                   `🔗 **Play Store'da Güncellemeleri Takip Et:**\n${app.details}\n\n` +
                   `Başka bir sorunuz var mı?`;
        }
    }
    
    // Tüm uygulamaların güncellemeleri
    if (msg.includes('tüm') || msg.includes('hepsi') || msg.includes('güncellemeler')) {
        const publishedApps = apps.filter(app => app.details && app.details !== '#');
        let response = `🔄 **Tüm Uygulama Güncellemeleri**\n\n`;
        response += `Yayında olan ${publishedApps.length} uygulamanın güncellemelerini Play Store'dan takip edebilirsiniz:\n\n`;
        
        publishedApps.forEach((app, index) => {
            response += `${index + 1}. **${app.title}** ${app.icon}\n`;
            response += `   🔗 ${app.details}\n\n`;
        });
        
        return response;
    }
    
    return "Hangi uygulamanın güncelleme bilgilerini öğrenmek istersiniz?\n\n" +
           "Örnek: \"Task Cosmos güncelleme\" veya \"Tüm güncellemeler\"";
}

// Kategori sorgularını işle - Siteye özel
function handleCategoryQuery() {
    if (!appsData || !appsData.apps) {
        return "Üzgünüm, şu anda kategori bilgilerine erişemiyorum.";
    }
    
    const apps = appsData.apps;
    const categories = {};
    
    apps.forEach(app => {
        const cat = app.category || 'Diğer';
        categories[cat] = (categories[cat] || 0) + 1;
    });
    
    const totalCategories = Object.keys(categories).length;
    const totalApps = apps.length;
    
    let response = `📂 **Uygulama Kategorileri**\n\n`;
    response += `Toplam **${totalCategories}** kategori ve **${totalApps}** uygulama bulunuyor:\n\n`;
    
    // Kategorileri uygulama sayısına göre sırala
    const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    
    sortedCategories.forEach(([cat, count]) => {
        const icon = count > 2 ? '🔥' : count === 1 ? '📱' : '⭐';
        response += `${icon} **${cat}**: ${count} uygulama\n`;
    });
    
    response += `\nHangi kategorideki uygulamaları görmek istersiniz?\n`;
    response += `Örnek: "Üretkenlik uygulamalarını göster" veya "Sağlık & Fitness kategorisi"`;
    
    return response;
}

// Genel sohbet - Siteye özel
function handleGeneralChat(message) {
    const greetings = ['merhaba', 'selam', 'hey', 'hi', 'hello', 'günaydın', 'iyi günler'];
    const questions = ['nasıl', 'neden', 'ne zaman', 'nerede', 'kim', 'hangi', 'ne', 'nedir'];
    const helpWords = ['yardım', 'help', 'ne yapabilir', 'ne sorabilir', 'nasıl kullanılır'];
    
    const msg = message.toLowerCase().trim();
    
    // Selamlama
    if (greetings.some(g => msg === g || msg.startsWith(g + ' ') || msg.endsWith(' ' + g))) {
        return `Merhaba! 👋\n\n` +
               `Ben Bambinifojo'nun AI Asistanıyım. Size şu konularda yardımcı olabilirim:\n\n` +
               `📱 **Uygulamalarım** hakkında bilgi\n` +
               `💬 **Geri bildirim** alabilirim\n` +
               `⭐ **Oy verme** işlemleri\n` +
               `🔄 **Güncelleme** bilgileri\n` +
               `👤 **Hakkımda** bilgileri\n` +
               `✉️ **İletişim** bilgileri\n\n` +
               `Nasıl yardımcı olabilirim?`;
    }
    
    // Yardım istekleri
    if (helpWords.some(h => msg.includes(h))) {
        return `Tabii ki! Size nasıl yardımcı olabilirim:\n\n` +
               `**Uygulamalar hakkında:**\n` +
               `• "Task Cosmos hakkında bilgi ver"\n` +
               `• "Hangi uygulamalar var?"\n` +
               `• "Üretkenlik uygulamalarını göster"\n\n` +
               `**Oy verme:**\n` +
               `• "Task Cosmos beğendim"\n` +
               `• "Weather Pro güzel"\n\n` +
               `**Geri bildirim:**\n` +
               `• "Geri bildirim: Çok güzel uygulamalar"\n\n` +
               `**Diğer:**\n` +
               `• "Hakkında bilgi ver"\n` +
               `• "İletişim bilgileri"\n` +
               `• "Kategorileri göster"`;
    }
    
    // Soru kelimeleri
    if (questions.some(q => msg.includes(q))) {
        return `İyi bir soru! 🤔\n\n` +
               `Site ve uygulamalarım hakkında sorular sorabilirsiniz. Örneğin:\n\n` +
               `• "Task Cosmos nedir?"\n` +
               `• "Hangi uygulamalar var?"\n` +
               `• "Kaç uygulama var?"\n` +
               `• "En popüler uygulama hangisi?"\n\n` +
               `Başka bir sorunuz var mı?`;
    }
    
    // Varsayılan yanıt
    return `Anladım! 😊\n\n` +
           `Site ve uygulamalarım hakkında sorular sorabilir, geri bildirim verebilir veya oy kullanabilirsiniz.\n\n` +
           `**Örnek sorular:**\n` +
           `• "Tüm uygulamaları listele"\n` +
           `• "Task Cosmos hakkında bilgi ver"\n` +
           `• "Geri bildirim: Çok güzel uygulamalar"\n` +
           `• "Weather Pro beğendim"\n` +
           `• "Hakkında bilgi ver"\n` +
           `• "İletişim bilgileri"`;
}

// Hakkımda sorgularını işle - Siteye özel
function handleAboutQuery() {
    if (!appsData || !appsData.site) {
        return "Üzgünüm, şu anda hakkımda bilgilerine erişemiyorum.";
    }
    
    const site = appsData.site;
    const about = site.about || {};
    const skills = site.skills || {};
    const header = site.header || {};
    
    let response = `👤 **Hakkımda**\n\n`;
    
    if (header.tagline) {
        response += `**${header.tagline}**\n\n`;
    }
    
    if (about.texts && about.texts.length > 0) {
        about.texts.forEach(text => {
            response += `${text}\n\n`;
        });
    }
    
    if (about.technologies && about.technologies.length > 0) {
        response += `**Kullandığım Teknolojiler:**\n`;
        about.technologies.forEach(tech => {
            response += `${tech.icon} ${tech.name}\n`;
        });
        response += `\n`;
    }
    
    if (skills.items && skills.items.length > 0) {
        response += `**Yeteneklerim:**\n`;
        skills.items.forEach(skill => {
            const bar = '█'.repeat(Math.floor(skill.level / 10));
            response += `${skill.icon} **${skill.name}** - %${skill.level} ${bar}\n`;
        });
    }
    
    response += `\nBaşka bir sorunuz var mı?`;
    
    return response;
}

// İletişim sorgularını işle - Siteye özel
function handleContactQuery() {
    if (!appsData || !appsData.site) {
        return "Üzgünüm, şu anda iletişim bilgilerine erişemiyorum.";
    }
    
    const site = appsData.site;
    const contact = site.contact || {};
    
    let response = `✉️ **İletişim Bilgileri**\n\n`;
    
    if (contact.subtitle) {
        response += `${contact.subtitle}\n\n`;
    }
    
    if (contact.items && contact.items.length > 0) {
        contact.items.forEach((item, index) => {
            response += `${item.icon} **${item.title}**\n`;
            response += `📧 ${item.value}\n`;
            if (item.description) {
                response += `💡 ${item.description}\n`;
            }
            if (item.link) {
                response += `🔗 ${item.link}\n`;
            }
            if (index < contact.items.length - 1) {
                response += `\n`;
            }
        });
    }
    
    response += `\nSize nasıl yardımcı olabilirim?`;
    
    return response;
}

function formatAIMessageContent(content) {
    let formattedContent = content
        .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.1rem; font-weight: 700; margin: 12px 0 8px 0; color: inherit;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.2rem; font-weight: 700; margin: 14px 0 10px 0; color: inherit;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.3rem; font-weight: 700; margin: 16px 0 12px 0; color: inherit;">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
        .replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 6px; overflow-x: auto; margin: 8px 0;"><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color: #667eea; text-decoration: underline;">$1</a>')
        .replace(/\n\n/g, '</p><p style="margin: 8px 0;">')
        .replace(/\n/g, '<br>');

    return '<p style="margin: 0;">' + formattedContent + '</p>';
}

function renderAIMessageToDOM(role, content) {
    const chatMessages = document.getElementById('aiChatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'ai-message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';

    const messageContent = document.createElement('div');
    messageContent.className = 'ai-message-content';
    messageContent.innerHTML = formatAIMessageContent(content);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);

    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

function addAIMessage(role, content) {
    renderAIMessageToDOM(role, content);
    aiMessages.push({ role, content, timestamp: Date.now() });
    saveAIMessages();
}

// Typing indicator göster
function showAITyping() {
    const chatMessages = document.getElementById('aiChatMessages');
    if (!chatMessages) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message assistant';
    typingDiv.id = 'aiTypingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'ai-message-avatar';
    avatar.textContent = '🤖';

    const typingContent = document.createElement('div');
    typingContent.className = 'ai-message-typing';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'ai-typing-dot';
        typingContent.appendChild(dot);
    }

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Typing indicator gizle
function hideAITyping() {
    const typingIndicator = document.getElementById('aiTypingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Hata göster
function showAIError(message) {
    const chatMessages = document.getElementById('aiChatMessages');
    if (!chatMessages) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-message assistant';
    errorDiv.style.opacity = '0';
    errorDiv.style.animation = 'fadeIn 0.3s ease forwards';

    const avatar = document.createElement('div');
    avatar.className = 'ai-message-avatar';
    avatar.textContent = '⚠️';

    const messageContent = document.createElement('div');
    messageContent.className = 'ai-message-content';
    messageContent.style.background = '#fef3c7';
    messageContent.style.color = '#92400e';
    messageContent.style.borderColor = '#fbbf24';
    messageContent.textContent = message;

    errorDiv.appendChild(avatar);
    errorDiv.appendChild(messageContent);
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Kredileri güncelle
function updateAICredits() {
    const creditsEl = document.getElementById('aiCredits');
    const badgeEl = document.getElementById('aiBadge');
    const sendBtn = document.getElementById('aiSendBtn');

    if (creditsEl) {
        creditsEl.textContent = aiCredits;
    }

    if (badgeEl) {
        badgeEl.textContent = aiCredits;
        badgeEl.title = 'Demo kredi';
        if (aiCredits === 0) {
            badgeEl.style.background = '#ef4444';
        } else {
            badgeEl.style.background = '';
        }
    }

    if (sendBtn) {
        sendBtn.disabled = aiCredits <= 0;
    }
}

// Kredileri kaydet
function saveAICredits() {
    const data = {
        credits: aiCredits,
        lastReset: aiLastCreditReset
    };
    localStorage.setItem('aiCredits', JSON.stringify(data));
}

// Kredileri yükle
function loadAICredits() {
    const saved = localStorage.getItem('aiCredits');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            aiCredits = data.credits || 3;
            aiLastCreditReset = data.lastReset || Date.now();
        } catch (e) {
            aiCredits = 3;
            aiLastCreditReset = Date.now();
        }
    }
    updateAICredits();
}

// Kredi reset kontrolü
function checkCreditReset() {
    const now = Date.now();
    const timeSinceReset = now - aiLastCreditReset;

    if (timeSinceReset >= AI_CREDIT_RESET_TIME) {
        aiCredits = 3;
        aiLastCreditReset = now;
        saveAICredits();
        updateAICredits();
    }

    // Her dakika kontrol et
    setTimeout(checkCreditReset, 60 * 1000);
}

// Mesajları kaydet
function saveAIMessages() {
    // Demo modda sadece session'da tut (sayfa yenilenince kaybolur)
    sessionStorage.setItem('aiMessages', JSON.stringify(aiMessages));
}

// Mesajları yükle
function loadAIMessages() {
    const saved = sessionStorage.getItem('aiMessages');
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        aiMessages = Array.isArray(parsed) ? parsed : [];

        aiMessages.forEach(msg => {
            renderAIMessageToDOM(msg.role, msg.content);
        });

        if (aiMessages.length > 0) {
            document.getElementById('aiChatMessages')?.classList.add('active');
        }
    } catch (e) {
        console.warn('AI mesajları yüklenemedi:', e);
        aiMessages = [];
    }
}

// Sayfa yüklendiğinde mesajları yükle
window.addEventListener('load', () => {
    loadAIMessages();
});

// ==================== API ENTEGRASYONU İÇİN HAZIR ====================
// Gerçek API entegrasyonu için bu fonksiyonu kullanabilirsiniz
async function sendToAIAPI(message, type) {
    // Örnek: OpenAI API entegrasyonu
    /*
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: getSystemPrompt(type) },
                { role: 'user', content: message }
            ]
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
    */
    
    // Şimdilik demo yanıt döndür
    return generateAIResponse(message, type);
}

function getSystemPrompt(type) {
    const prompts = {
        chat: 'Sen yardımcı bir AI asistanısın.',
        meta: 'Sen meta etiket oluşturma konusunda uzmansın.',
        description: 'Sen meta açıklama yazma konusunda uzmansın.',
        content: 'Sen sayfa içeriği yazma konusunda uzmansın.',
        product: 'Sen ürün açıklaması yazma konusunda uzmansın.',
        blog: 'Sen blog yazısı yazma konusunda uzmansın.',
        code: 'Sen kod yazma konusunda uzmansın.'
    };
    return prompts[type] || prompts.chat;
}

// Chat mesajlarını e-posta ile gönder
async function sendChatToEmail(userMessage, aiResponse) {
    try {
        // EmailJS ayarlarını kontrol et
        const emailjsConfig = getEmailJSConfig();
        if (!emailjsConfig || !emailjsConfig.enabled) {
            console.log('📧 EmailJS aktif değil, e-posta gönderilmedi');
            return;
        }
        if (!emailjsConfig.serviceId || !emailjsConfig.templateId || !emailjsConfig.publicKey) {
            console.log('📧 EmailJS yapılandırılmamış, e-posta gönderilmedi');
            return;
        }
        
        // EmailJS'i başlat
        if (typeof emailjs !== 'undefined') {
            emailjs.init(emailjsConfig.publicKey);
        } else {
            console.warn('📧 EmailJS yüklenmemiş');
            return;
        }
        
        // E-posta içeriğini hazırla
        const chatHistory = aiMessages.slice(-5).map(msg => {
            const role = msg.role === 'user' ? 'Kullanıcı' : 'AI Asistan';
            const time = new Date(msg.timestamp).toLocaleString('tr-TR');
            return `[${time}] ${role}: ${msg.content}`;
        }).join('\n\n');
        
        const emailContent = {
            to_email: emailjsConfig.toEmail || 'bambinifojo@gmail.com',
            from_name: 'AI Asistan Chat',
            subject: `AI Asistan Sohbet - ${new Date().toLocaleString('tr-TR')}`,
            message: `Yeni bir sohbet mesajı alındı:\n\n${chatHistory}\n\n---\n\nBu mesaj otomatik olarak gönderilmiştir.`,
            user_message: userMessage,
            ai_response: aiResponse || 'Yanıt bekleniyor...',
            timestamp: new Date().toLocaleString('tr-TR'),
            site_url: window.location.href
        };
        
        // E-posta gönder
        await emailjs.send(
            emailjsConfig.serviceId,
            emailjsConfig.templateId,
            emailContent
        );
        
        console.log('✅ Chat mesajı e-postaya gönderildi');
    } catch (error) {
        console.error('❌ E-posta gönderme hatası:', error);
        // Hata olsa bile chat devam etsin, sessizce log'la
    }
}

// EmailJS yapılandırmasını al (localStorage'dan veya varsayılan)
function getEmailJSConfig() {
    // Önce localStorage'dan kontrol et
    const saved = localStorage.getItem('emailjsConfig');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('EmailJS config parse hatası:', e);
        }
    }
    
    // Varsayılan config (kullanıcı admin panelinden ayarlayacak)
    return {
        enabled: false,
        serviceId: '',
        templateId: '',
        publicKey: '',
        toEmail: 'bambinifojo@gmail.com'
    };
}
